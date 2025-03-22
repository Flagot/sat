const mongoose = require("mongoose");

const flaggedQuestionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "questions",
      required: false, // Made optional to support custom question IDs
    },
    customQuestionId: {
      type: String, // Store numeric or custom question identifiers
      required: false,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "modules",
    },
    notes: {
      type: String,
      default: "",
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Ensure a user can only flag a question once (by questionId or customQuestionId + examId)
// Use partialFilterExpression to only enforce uniqueness when customQuestionId exists
flaggedQuestionSchema.index(
  { userId: 1, examId: 1, customQuestionId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { customQuestionId: { $exists: true } }
  }
);
flaggedQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("FlaggedQuestion", flaggedQuestionSchema);

