const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/user");
const UserSession = require("../models/userSessionModel");
const { requireAuth } = require("../middleware/auth");
const { signupValidation, loginValidation } = require("../middleware/validation");
const { generateDeviceId, getDeviceInfo, getTokenExpiration } = require("../utils/deviceUtils");

const router = express.Router();

// Rate limiting for auth routes to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for signup to prevent abuse
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signup attempts per hour
  message: {
    error: "Too many signup attempts from this IP, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not set in environment variables!");
  console.error("Please create a .env file with JWT_SECRET=your-secret-key");
}

// Generate JWT token with expiration
// Access token expires in 24 hours for security
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  // Token expires in 24 hours (can be configured via env variable)
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// Constants for session and device limits
const MAX_SESSIONS = 2;
const MAX_DEVICES = 3;

// Signup route with validation and rate limiting
router.post("/signup", signupLimiter, signupValidation, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user (validation already handled by middleware)
    const user = await User.create({ email, password, name });

    // Generate token
    const token = generateToken(user._id);

    // Create initial session for new user
    const deviceId = generateDeviceId(req);
    const deviceInfo = getDeviceInfo(req);
    const expiresAt = getTokenExpiration();

    await UserSession.create({
      userId: user._id,
      token,
      deviceId,
      deviceInfo,
      expiresAt,
      isActive: true,
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({ error: "User already exists" });
    }
    // Handle validation errors from mongoose
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors[0] || "Validation error" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login route with validation and rate limiting
router.post("/login", authLimiter, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field (which is normally excluded)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      // Use generic message to prevent user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    if (!user.password) {
      console.error("User found but password field is missing");
      return res.status(500).json({ error: "Server error: Password field not available" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Use generic message to prevent user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Cleanup expired sessions first
    await UserSession.cleanupExpiredSessions();

    // Get device information
    const deviceId = generateDeviceId(req);
    const deviceInfo = getDeviceInfo(req);
    const expiresAt = getTokenExpiration();

    // Check if this device already has an active session
    const existingDeviceSession = await UserSession.findOne({
      userId: user._id,
      deviceId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existingDeviceSession) {
      // Update existing session with new token
      existingDeviceSession.token = generateToken(user._id);
      existingDeviceSession.expiresAt = expiresAt;
      existingDeviceSession.lastActivity = new Date();
      await existingDeviceSession.save();

      await user.updateLastLogin();

      return res.json({
        token: existingDeviceSession.token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // Check session limits
    const activeSessionsCount = await UserSession.getActiveSessionsCount(user._id);
    const uniqueDevicesCount = await UserSession.getUniqueDevicesCount(user._id);

    // Check if this device is already among active devices
    const deviceHasActiveSession = await UserSession.findOne({
      userId: user._id,
      deviceId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    // If this is a new device and we're at device limit, remove oldest device
    if (!deviceHasActiveSession && uniqueDevicesCount >= MAX_DEVICES) {
      // Find and deactivate oldest device session
      const oldestDeviceSession = await UserSession.getOldestDeviceSession(user._id);
      if (oldestDeviceSession) {
        await oldestDeviceSession.deactivate();
      }
    }

    // Check if we're at session limit (after potential device removal)
    const updatedActiveSessionsCount = await UserSession.getActiveSessionsCount(user._id);
    if (updatedActiveSessionsCount >= MAX_SESSIONS) {
      // Deactivate oldest session
      const oldestSession = await UserSession.getOldestActiveSession(user._id);
      if (oldestSession) {
        await oldestSession.deactivate();
      }
    }

    // Generate new token
    const token = generateToken(user._id);

    // Create new session
    await UserSession.create({
      userId: user._id,
      token,
      deviceId,
      deviceInfo,
      expiresAt,
      isActive: true,
    });

    // Update last login
    await user.updateLastLogin();

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token route
router.get("/verify", requireAuth, async (req, res) => {
  try {
    // Update session activity
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const session = await UserSession.findOne({ token, isActive: true });
      if (session) {
        await session.updateActivity();
      }
    }

    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout route - deactivate current session
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const session = await UserSession.findOne({ token, isActive: true });
      if (session) {
        await session.deactivate();
      }
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active sessions for current user
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const sessions = await UserSession.find({
      userId: req.user._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select("deviceInfo lastActivity createdAt")
      .sort({ lastActivity: -1 });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke a specific session
router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    const session = await UserSession.findOne({
      _id: req.params.sessionId,
      userId: req.user._id,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await session.deactivate();
    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
