const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  startExamSession,
  getActiveSessions,
  getCompletedSessions,
  getSession,
  getSessionByExamId,
  saveAnswer,
  updateProgress,
  completeExam,
  getSessionDetails,
} = require("../controller/examSessionController");

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Start a new exam session
router.post("/start", startExamSession);

// Get all active sessions for the current user
router.get("/active", getActiveSessions);

// Get all completed sessions for the current user
router.get("/completed", getCompletedSessions);

// Get session by examId
router.get("/exam/:examId", getSessionByExamId);

// Get detailed results for a session
router.get("/:sessionId/details", getSessionDetails);

// Get a specific session
router.get("/:sessionId", getSession);

// Save an answer
router.patch("/:sessionId/answer", saveAnswer);

// Update progress (section, module, question, time)
router.patch("/:sessionId/progress", updateProgress);

// Complete exam and calculate score
router.post("/:sessionId/complete", completeExam);

module.exports = router;

