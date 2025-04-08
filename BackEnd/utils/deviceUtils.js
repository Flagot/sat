const crypto = require("crypto");

/**
 * Generate a device ID from request information
 * This creates a unique fingerprint for each device
 */
const generateDeviceId = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip || req.connection.remoteAddress || "";
  
  // Create a hash from user agent and IP
  const data = `${userAgent}-${ip}`;
  return crypto.createHash("sha256").update(data).digest("hex");
};

/**
 * Extract device information from request
 */
const getDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ip = req.ip || req.connection.remoteAddress || "Unknown";
  
  // Simple browser/platform detection
  let browser = "Unknown";
  let platform = "Unknown";
  
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";
  
  if (userAgent.includes("Windows")) platform = "Windows";
  else if (userAgent.includes("Mac")) platform = "macOS";
  else if (userAgent.includes("Linux")) platform = "Linux";
  else if (userAgent.includes("Android")) platform = "Android";
  else if (userAgent.includes("iOS")) platform = "iOS";
  
  return {
    userAgent,
    ipAddress: ip,
    browser,
    platform,
  };
};

/**
 * Calculate token expiration date
 */
const getTokenExpiration = () => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  const expirationDate = new Date();
  
  // Parse expiration string (e.g., "24h", "7d", "1h")
  if (expiresIn.endsWith("h")) {
    const hours = parseInt(expiresIn) || 24;
    expirationDate.setHours(expirationDate.getHours() + hours);
  } else if (expiresIn.endsWith("d")) {
    const days = parseInt(expiresIn) || 1;
    expirationDate.setDate(expirationDate.getDate() + days);
  } else if (expiresIn.endsWith("m")) {
    const minutes = parseInt(expiresIn) || 60;
    expirationDate.setMinutes(expirationDate.getMinutes() + minutes);
  } else {
    // Default to 24 hours
    expirationDate.setHours(expirationDate.getHours() + 24);
  }
  
  return expirationDate;
};

module.exports = {
  generateDeviceId,
  getDeviceInfo,
  getTokenExpiration,
};
