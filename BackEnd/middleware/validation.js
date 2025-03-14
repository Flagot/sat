const { body, validationResult } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return first error message for cleaner response
    const firstError = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg,
    });
  }
  next();
};

// Sanitize string inputs to prevent XSS
const sanitizeString = (value) => {
  if (typeof value !== "string") return value;
  
  // Remove potentially dangerous characters and scripts
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers like onclick=
    .trim();
};

// Custom sanitizer for email
const sanitizeEmail = (value) => {
  if (typeof value !== "string") return value;
  return value.toLowerCase().trim();
};

// Custom sanitizer for name
const sanitizeName = (value) => {
  if (!value) return value; // Allow empty/optional name
  return sanitizeString(value).substring(0, 100); // Max 100 chars
};

// Validation rules for signup
const signupValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .customSanitizer(sanitizeEmail)
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .custom((value) => {
      // Check for common weak passwords
      const weakPasswords = ["password", "123456", "password123", "admin", "qwerty", "12345678"];
      if (weakPasswords.includes(value.toLowerCase())) {
        throw new Error("Password is too common. Please choose a stronger password");
      }
      return true;
    }),

  body("name")
    .optional()
    .trim()
    .customSanitizer(sanitizeName)
    .isLength({ max: 100 })
    .withMessage("Name must not exceed 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage("Name can only contain letters, spaces, hyphens, and apostrophes"),

  handleValidationErrors,
];

// Validation rules for login
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .customSanitizer(sanitizeEmail)
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1, max: 128 })
    .withMessage("Invalid password format"),

  handleValidationErrors,
];

module.exports = {
  signupValidation,
  loginValidation,
  handleValidationErrors,
};
