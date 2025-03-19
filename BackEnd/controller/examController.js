const Exam = require("../models/examModel");
const mongoose = require("mongoose");

// get all exams
const getexams = async (req, res) => {
  const exams = await Exam.find({}).sort({ createdAt: -1 });

  res.status(200).json(exams);
};

// get a single exam
const getexam = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such exam" });
  }

  const exam = await exam.findById(id);

  if (!exam) {
    return res.status(404).json({ error: "No such exam" });
  }

  res.status(200).json(exam);
};

const createexam = async (req, res) => {
  try {
    let examsData = req.body;

    if (!Array.isArray(examsData)) {
      examsData = [examsData];
    }
    const invalid = examsData.find((e) => !e.title);
    if (invalid) {
      return res.status(400).json({ error: "Exam should have a title" });
    }
    const exams = await Exam.insertMany(examsData);

    res.status(201).json({
      message: " exams created successfully",
      exams,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// delete a exam
const deleteexam = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExam = await Exam.findByIdAndDelete(id);

    if (!deletedExam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    res.status(200).json({ message: "Exam deleted successfully." });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Failed to delete exam." });
  }
};

// update a exam
const updateexam = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "No such workout" });
  }

  const workout = await Workout.findOneAndUpdate(
    { _id: id },
    {
      ...req.body,
    }
  );

  if (!workout) {
    return res.status(400).json({ error: "No such workout" });
  }

  res.status(200).json(workout);
};

module.exports = {
  createexam,
  getexams,
  getexam,
  deleteexam,
  updateexam,
};
