/**
 * Custom MongoDB sanitization middleware compatible with Express 5
 * Prevents NoSQL injection attacks by removing MongoDB operators
 */

// MongoDB operators that should be sanitized
const MONGO_OPERATORS = [
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$ne",
  "$nin",
  "$in",
  "$regex",
  "$exists",
  "$size",
  "$mod",
  "$type",
  "$all",
  "$elemMatch",
  "$where",
  "$or",
  "$and",
  "$nor",
  "$not",
  "$text",
  "$expr",
  "$jsonSchema",
  "$geoWithin",
  "$geoIntersects",
  "$near",
  "$nearSphere",
  "$geometry",
  "$maxDistance",
  "$minDistance",
  "$box",
  "$polygon",
  "$center",
  "$centerSphere",
];

/**
 * Recursively sanitize an object by removing MongoDB operators
 * @param {any} obj - The object to sanitize
 * @param {number} depth - Current recursion depth (prevents infinite loops)
 * @returns {any} - Sanitized object
 */
const sanitizeObject = (obj, depth = 0) => {
  // Prevent deep recursion (max 10 levels)
  if (depth > 10) {
    return obj;
  }

  // Handle null/undefined
  if (obj == null) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  if (typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Remove MongoDB operators
        if (MONGO_OPERATORS.includes(key)) {
          continue; // Skip this key
        }

        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
    return sanitized;
  }

  // Return primitives as-is
  return obj;
};

/**
 * Middleware to sanitize request data against NoSQL injection
 */
const mongoSanitize = (req, res, next) => {
  try {
    // Sanitize req.body
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize req.query
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize req.params
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    // If sanitization fails, log and continue (don't break the request)
    console.error("MongoDB sanitization error:", error);
    next();
  }
};

module.exports = mongoSanitize;
