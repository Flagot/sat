const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    unlocked: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number, // in minutes
      default: 180, // 3 hours default
      min: [1, "Duration must be at least 1 minute"],
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    passingScore: {
      type: Number, // percentage
      default: 60,
      min: [0, "Passing score cannot be negative"],
      max: [100, "Passing score cannot exceed 100"],
    },
    instructions: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      enum: ["SAT", "ACT", "GRE", "GMAT", "TOEFL", "IELTS", "LSAT", "MCAT", "Practice", "Mock", "Other"],
      default: "SAT",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", "Mixed"],
      default: "Medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
examSchema.index({ unlocked: 1, isActive: 1 });
examSchema.index({ category: 1 });
examSchema.index({ createdAt: -1 });
examSchema.index({ title: "text", description: "text" }); // Text search

// Virtual for exam-section-module relationships
examSchema.virtual("examSectionModules", {
  ref: "examSectionModules",
  localField: "_id",
  foreignField: "examId",
});

// Virtual for total questions count
examSchema.virtual("questionsCount", {
  ref: "questions",
  localField: "_id",
  foreignField: "examId",
  count: true,
});

// Method to check if exam is available
examSchema.methods.isAvailable = function () {
  return this.unlocked && this.isActive;
};

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.exams || mongoose.model("exams", examSchema, "exams");
