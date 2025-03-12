const mongoose = require("mongoose");

/**
 * UserSession Model - Tracks active login sessions and devices
 * Enforces limits: max 2 sessions, max 3 devices per user
 */
const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      // Device fingerprint: combination of user agent + IP hash
    },
    deviceInfo: {
      userAgent: {
        type: String,
        required: true,
      },
      ipAddress: {
        type: String,
        required: true,
      },
      platform: String,
      browser: String,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Index is created via schema.index() below for TTL functionality
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ userId: 1, deviceId: 1 });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

// Static method to get active sessions count for a user
userSessionSchema.statics.getActiveSessionsCount = async function (userId) {
  return await this.countDocuments({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to get unique devices count for a user
userSessionSchema.statics.getUniqueDevicesCount = async function (userId) {
  const devices = await this.distinct("deviceId", {
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  return devices.length;
};

// Static method to get oldest active session for a user
userSessionSchema.statics.getOldestActiveSession = async function (userId) {
  return await this.findOne({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: 1 }); // Oldest first
};

// Static method to get oldest device session for a user
userSessionSchema.statics.getOldestDeviceSession = async function (userId) {
  // Group by deviceId and get the oldest session for each device
  const sessions = await this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: 1 });

  // Group by deviceId and return the oldest session from the device with most sessions
  const deviceMap = new Map();
  sessions.forEach((session) => {
    const deviceId = session.deviceId;
    if (!deviceMap.has(deviceId)) {
      deviceMap.set(deviceId, []);
    }
    deviceMap.get(deviceId).push(session);
  });

  // Find device with most sessions and return its oldest session
  let maxSessions = 0;
  let oldestSession = null;
  deviceMap.forEach((deviceSessions, deviceId) => {
    if (deviceSessions.length > maxSessions) {
      maxSessions = deviceSessions.length;
      oldestSession = deviceSessions[0]; // Already sorted by lastActivity
    }
  });

  return oldestSession || sessions[0]; // Fallback to oldest overall
};

// Static method to deactivate expired sessions
userSessionSchema.statics.cleanupExpiredSessions = async function () {
  return await this.updateMany(
    {
      expiresAt: { $lte: new Date() },
      isActive: true,
    },
    {
      isActive: false,
    }
  );
};

// Method to update last activity
userSessionSchema.methods.updateActivity = function () {
  this.lastActivity = new Date();
  return this.save({ validateBeforeSave: false });
};

// Method to deactivate session
userSessionSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save({ validateBeforeSave: false });
};

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.UserSession || mongoose.model("UserSession", userSessionSchema);
