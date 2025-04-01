const express = require("express");
const Question = require("../models/questionsModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Get all questions - can filter by examId or examSectionModuleId
router.get("/", async (req, res) => {
  try {
    const { examId, examSectionModuleId } = req.query;
    const query = {};

    if (examId) query.examId = examId;
    if (examSectionModuleId) query.examSectionModuleId = examSectionModuleId;

    const questions = await Question.find(query)
      .populate("examId")
      .populate("examSectionModuleId")
      .sort({ order: 1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single question by ID
router.get("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("examId")
      .populate("examSectionModuleId");

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get questions by exam ID
router.get("/exam/:examId", async (req, res) => {
  try {
    const questions = await Question.find({ examId: req.params.examId })
      .populate("examSectionModuleId")
      .sort({ order: 1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get questions by exam-section-module ID
router.get("/exam-section-module/:examSectionModuleId", async (req, res) => {
  try {
    const questions = await Question.find({
      examSectionModuleId: req.params.examSectionModuleId,
    })
      .populate("examId")
      .populate("examSectionModuleId")
      .sort({ order: 1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create question (requires auth)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { passage, questionText, description, choices, examId, examSectionModuleId } =
      req.body;

    if (!questionText && !description) {
      return res
        .status(400)
        .json({ error: "Question text or description is required" });
    }

    if (!choices || !Array.isArray(choices) || choices.length === 0) {
      return res.status(400).json({ error: "At least one choice is required" });
    }

    if (!examId || !examSectionModuleId) {
      return res
        .status(400)
        .json({ error: "Exam ID and Exam Section Module ID are required" });
    }

    const question = await Question.create({
      passage,
      questionText,
      description,
      choices,
      examId,
      examSectionModuleId,
    });

    res.status(201).json({
      message: "Question created successfully",
      question,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create multiple questions (requires auth)
router.post("/bulk", requireAuth, async (req, res) => {
  try {
    const questionsData = req.body;

    if (!Array.isArray(questionsData)) {
      return res.status(400).json({ error: "Expected an array of questions" });
    }

    // Validate each question
    for (const q of questionsData) {
      if (!q.questionText && !q.description) {
        return res.status(400).json({
          error: "All questions must have questionText or description",
        });
      }
      if (!q.choices || !Array.isArray(q.choices) || q.choices.length === 0) {
        return res.status(400).json({
          error: "All questions must have at least one choice",
        });
      }
      if (!q.examId || !q.examSectionModuleId) {
        return res.status(400).json({
          error: "All questions must have examId and examSectionModuleId",
        });
      }
    }

    const questions = await Question.insertMany(questionsData);

    res.status(201).json({
      message: "Questions created successfully",
      questions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question (requires auth)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { passage, questionText, description, choices, examId, examSectionModuleId } =
      req.body;

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { passage, questionText, description, choices, examId, examSectionModuleId },
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({
      message: "Question updated successfully",
      question,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question (requires auth)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
