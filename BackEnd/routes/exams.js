const express = require("express");
const Exam = require("../models/examModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Get all exams
router.get("/", async (req, res) => {
  try {
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single exam by ID
router.get("/:id", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create exam (protected - admin only in future)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, unlocked, duration, description, category, difficulty } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const exam = await Exam.create({
      title,
      unlocked: unlocked || false,
      duration: duration || 180, // Default 3 hours
      description,
      category,
      difficulty,
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exam
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { title, unlocked, duration, description, category, difficulty } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (unlocked !== undefined) updateData.unlocked = unlocked;
    if (duration !== undefined) updateData.duration = duration;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (difficulty !== undefined) updateData.difficulty = difficulty;

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    res.json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete exam
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
