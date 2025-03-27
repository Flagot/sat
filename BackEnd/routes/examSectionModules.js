const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getExamSectionModules,
  createExamSectionModule,
  updateExamSectionModule,
  deleteExamSectionModule,
  getQuestionsByExamSectionModule,
} = require("../controller/examSectionModuleController");

const router = express.Router();

// Get questions for a specific exam-section-module combination (must come before /:id routes)
router.get("/:examSectionModuleId/questions", getQuestionsByExamSectionModule);

// Get all exam-section-module relationships for a specific exam
router.get("/exam/:examId", getExamSectionModules);

// Create a new exam-section-module relationship (requires auth)
router.post("/", requireAuth, createExamSectionModule);

// Update an exam-section-module relationship (requires auth)
router.patch("/:id", requireAuth, updateExamSectionModule);

// Delete an exam-section-module relationship (requires auth)
router.delete("/:id", requireAuth, deleteExamSectionModule);

module.exports = router;
