const jwt = require("jsonwebtoken");
const User = require("../models/user");
const UserSession = require("../models/userSessionModel");

const requireAuth = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ 
          error: "Token expired. Please login again.",
          code: "TOKEN_EXPIRED"
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          error: "Invalid token. Please login again.",
          code: "INVALID_TOKEN"
        });
      }
      throw error; // Re-throw unexpected errors
    }

    // Check if session exists and is active
    const session = await UserSession.findOne({
      token,
      userId: decoded.id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({ 
        error: "Session expired or revoked. Please login again.",
        code: "SESSION_INVALID"
      });
    }

    // Update session activity
    await session.updateActivity();

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: "Account is inactive" });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Not authorized" });
  }
};

module.exports = { requireAuth };
