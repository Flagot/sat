const Question = require("../models/questionsModel");
const mongoose = require("mongoose");

// Get all questions
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 });
    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Failed to fetch questions." });
  }
};

// Get a single question
// const getQuestion = async (req, res) => {
//   const { examId, sectionId, moduleId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(404).json({ error: "No such question" });
//   }

//   const question = await Question.findById(id);

//   if (!question) {
//     return res.status(404).json({ error: "No such question" });
//   }

//   res.status(200).json(question);
// };
const getQuestion = async (req, res) => {
  const { examId, sectionId, moduleId } = req.params;

  try {
    // validate IDs first
    if (
      !mongoose.Types.ObjectId.isValid(examId) ||
      !mongoose.Types.ObjectId.isValid(sectionId) ||
      !mongoose.Types.ObjectId.isValid(moduleId)
    ) {
      return res.status(400).json({ error: "Invalid IDs provided" });
    }

    // find questions matching those IDs
    const questions = await Question.find({
      examId,
      sectionId,
      moduleId,
    });

    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: "No questions found" });
    }

    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// create new question
const createQuestions = async (req, res) => {
  try {
    const { examId, sectionId, moduleId } = req.params;
    let questionsData = req.body;

    if (!Array.isArray(questionsData)) {
      questionsData = [questionsData];
    }
    const invalid = questionsData.find(
      (q) => !q.description || !q.questionText || !q.choices
    );
    if (invalid) {
      return res.status(400).json({ error: "Section should have a title" });
    }

    // Add examId, sectionId, moduleId to each question
    const questionsWithRefs = questionsData.map((q) => ({
      ...q,
      examId,
      sectionId,
      moduleId,
    }));

    const createdQuestions = await Question.insertMany(questionsWithRefs);

    res.status(201).json({
      message: " Questions created successfully",
      count: createdQuestions.length,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("Error creating questions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found." });
    }

    res.status(200).json({ message: "Question deleted successfully." });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: "Failed to delete question." });
  }
};

// Update a question
const updateQuestion = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid question ID" });
  }

  const question = await Question.findOneAndUpdate(
    { _id: id },
    { ...req.body },
    { new: true }
  );

  if (!question) {
    return res.status(404).json({ error: "No such question" });
  }

  res.status(200).json(question);
};

module.exports = {
  createQuestions,
  getQuestions,
  getQuestion,
  deleteQuestion,
  updateQuestion,
};
