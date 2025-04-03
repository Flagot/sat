const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getUserPurchases,
  checkPurchase,
  purchaseExam,
  getAvailableExams,
  unlockExamForUser,
  lockExamForUser,
  getUserUnlockedExams,
} = require("../controller/examPurchaseController");

const router = express.Router();

// Log all requests to this router (before auth to see all requests)
router.use((req, res, next) => {
  console.log(`[Exam Purchases Router] ${req.method} ${req.originalUrl || req.path}`);
  next();
});

// All routes require authentication
router.use(requireAuth);

// Get all purchased exams for current user
router.get("/", getUserPurchases);

// Get available exams (purchased or free) - with user-specific access
router.get("/available", getAvailableExams);

// Get user's unlocked exams
router.get("/unlocked", getUserUnlockedExams);

// Check if user has purchased a specific exam
router.get("/check/:examId", checkPurchase);

// Purchase an exam - must be before parameterized routes
router.post("/", (req, res, next) => {
  console.log("✅ Purchase route handler called");
  purchaseExam(req, res, next);
});

// Unlock/activate exam for user
router.post("/:examId/unlock", unlockExamForUser);

// Lock/deactivate exam for user
router.post("/:examId/lock", lockExamForUser);

module.exports = router;
