const mongoose = require("mongoose");
const ExamSectionModule = require("../models/examSectionModuleModel");
const Exam = require("../models/examModel");
const Section = require("../models/sectionModel");
const Module = require("../models/moduleModel");
// Ensure Question model schema is loaded (this registers it)
require("../models/questionsModel");

// Get all exam-section-module relationships for a specific exam
const getExamSectionModules = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" });
    }

    const examSectionModules = await ExamSectionModule.find({ examId, isActive: true })
      .populate("sectionId", "name title description order")
      .populate("moduleId", "name title description sectionName order")
      .sort({ order: 1 });

    res.status(200).json(examSectionModules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new exam-section-module relationship
const createExamSectionModule = async (req, res) => {
  try {
    const { examId, sectionId, moduleId, order } = req.body;

    if (!examId || !sectionId || !moduleId) {
      return res.status(400).json({
        error: "Exam ID, Section ID, and Module ID are required",
      });
    }

    // Verify exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Verify section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Check if this combination already exists
    const existing = await ExamSectionModule.findOne({
      examId,
      sectionId,
      moduleId,
    });

    if (existing) {
      return res.status(400).json({
        error: "This exam-section-module combination already exists",
      });
    }

    const examSectionModule = await ExamSectionModule.create({
      examId,
      sectionId,
      moduleId,
      order: order || 0,
    });

    const populated = await ExamSectionModule.findById(examSectionModule._id)
      .populate("sectionId", "name title description order")
      .populate("moduleId", "name title description sectionName order");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an exam-section-module relationship
const updateExamSectionModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { order, isActive } = req.body;

    const examSectionModule = await ExamSectionModule.findById(id);

    if (!examSectionModule) {
      return res.status(404).json({ error: "Exam-section-module relationship not found" });
    }

    if (order !== undefined) examSectionModule.order = order;
    if (isActive !== undefined) examSectionModule.isActive = isActive;

    await examSectionModule.save();

    const populated = await ExamSectionModule.findById(id)
      .populate("sectionId", "name title description order")
      .populate("moduleId", "name title description sectionName order");

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete an exam-section-module relationship
const deleteExamSectionModule = async (req, res) => {
  try {
    const { id } = req.params;

    const examSectionModule = await ExamSectionModule.findById(id);

    if (!examSectionModule) {
      return res.status(404).json({ error: "Exam-section-module relationship not found" });
    }

    await ExamSectionModule.findByIdAndDelete(id);

    res.status(200).json({ message: "Exam-section-module relationship deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get questions for a specific exam-section-module combination
const getQuestionsByExamSectionModule = async (req, res) => {
  try {
    const { examSectionModuleId } = req.params;

    if (!examSectionModuleId) {
      return res.status(400).json({ error: "Exam Section Module ID is required" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(examSectionModuleId)) {
      return res.status(400).json({ error: "Invalid Exam Section Module ID format" });
    }

    // Verify the exam-section-module exists
    const examSectionModule = await ExamSectionModule.findById(examSectionModuleId);
    if (!examSectionModule) {
      return res.status(404).json({ error: "Exam-section-module relationship not found" });
    }

    // Get Question model - try mongoose.model() directly (works if schema is registered)
    let QuestionModel;
    try {
      // First try to get from mongoose.models
      QuestionModel = mongoose.models.questions;
      
      // If not found, try mongoose.model() which will work if schema was registered
      if (!QuestionModel || typeof QuestionModel.find !== "function") {
        QuestionModel = mongoose.model("questions");
      }
    } catch (modelError) {
      // If model doesn't exist, the require above should have registered it
      // Try one more time to get it
      QuestionModel = mongoose.models.questions;
      
      if (!QuestionModel || typeof QuestionModel.find !== "function") {
        console.error("Question model error:");
        console.error("  Error:", modelError.message);
        console.error("  mongoose.models.questions:", mongoose.models.questions);
        console.error("  Available models:", Object.keys(mongoose.models));
        return res.status(500).json({ 
          error: "Question model not registered. Please ensure questionsModel.js is loaded correctly and restart the server." 
        });
      }
    }

    // Convert to ObjectId for query
    const examSectionModuleObjectId = new mongoose.Types.ObjectId(examSectionModuleId);
    
    console.log("🔍 Fetching questions for examSectionModuleId:", examSectionModuleId);
    console.log("🔍 Converted to ObjectId:", examSectionModuleObjectId);
    
    // Query questions
    const questions = await QuestionModel.find({
      examSectionModuleId: examSectionModuleObjectId,
      isActive: { $ne: false }, // Include questions where isActive is true or undefined
    })
      .populate("examId", "title")
      .populate("examSectionModuleId", "examId sectionId moduleId")
      .sort({ order: 1 });

    console.log(`✅ Found ${questions.length} question(s) for examSectionModuleId: ${examSectionModuleId}`);
    
    // Also check if there are any questions with this ID at all (for debugging)
    const allQuestionsCount = await QuestionModel.countDocuments({});
    const questionsWithThisId = await QuestionModel.countDocuments({
      examSectionModuleId: examSectionModuleObjectId,
    });
    console.log(`📊 Total questions in DB: ${allQuestionsCount}`);
    console.log(`📊 Questions with this examSectionModuleId: ${questionsWithThisId}`);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions by exam-section-module:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: error.message, details: error.stack });
  }
};

module.exports = {
  getExamSectionModules,
  createExamSectionModule,
  updateExamSectionModule,
  deleteExamSectionModule,
  getQuestionsByExamSectionModule,
};
