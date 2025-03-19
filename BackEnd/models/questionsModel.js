const mongoose = require("mongoose");

// V2 schema:
// - A Question belongs to ONE exam (`examId`)
// - And belongs to ONE exam-section-module link (`examSectionModuleId`)
// - It does NOT store `sectionId` / `moduleId` directly
const questionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: [true, "Exam ID is required"],
      index: true,
    },
    examSectionModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "examSectionModules",
      required: [true, "Exam Section Module ID is required"],
      index: true,
    },

    // Optional reading passage / context (shown on left column in exam UI)
    passage: {
      type: String,
      trim: true,
    },

    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    choices: [
      {
        text: {
          type: String,
          required: [true, "Choice text is required"],
          trim: true,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
        explanation: {
          type: String,
          trim: true,
        },
      },
    ],
    order: {
      type: Number,
      default: 0,
      min: [0, "Order cannot be negative"],
    },
    points: {
      type: Number,
      default: 1,
      min: [0, "Points cannot be negative"],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questionType: {
      type: String,
      enum: ["multiple-choice", "true-false", "fill-in-blank", "essay"],
      default: "multiple-choice",
    },
    explanation: {
      type: String,
      trim: true,
    },
    tags: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
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

// Validation: Ensure at least one correct answer for multiple-choice questions
questionSchema.pre("validate", function (next) {
  if (this.questionType === "multiple-choice" && this.choices.length > 0) {
    const hasCorrectAnswer = this.choices.some((choice) => choice.isCorrect);
    if (!hasCorrectAnswer) {
      return next(new Error("At least one choice must be marked as correct"));
    }
  }
  next();
});

// Validation: Ensure at least 2 choices for multiple-choice
questionSchema.pre("validate", function (next) {
  if (this.questionType === "multiple-choice" && this.choices.length < 2) {
    return next(new Error("Multiple-choice questions must have at least 2 choices"));
  }
  next();
});

// Indexes for efficient queries
questionSchema.index({ examId: 1, examSectionModuleId: 1 });
questionSchema.index({ examSectionModuleId: 1, order: 1 });
questionSchema.index({ examId: 1, order: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ questionText: "text", description: "text" }); // Text search
questionSchema.index({ tags: 1 });

// Virtual to populate exam-section-module details
questionSchema.virtual("examSectionModule", {
  ref: "examSectionModules",
  localField: "examSectionModuleId",
  foreignField: "_id",
  justOne: true,
});

// Virtual for correct answer count
questionSchema.virtual("correctAnswerCount").get(function () {
  return this.choices.filter((choice) => choice.isCorrect).length;
});

// Method to get correct answer indices
questionSchema.methods.getCorrectAnswerIndices = function () {
  return this.choices
    .map((choice, index) => (choice.isCorrect ? index : null))
    .filter((index) => index !== null);
};

// Register and export the model - use exact same pattern as examModel
module.exports =
  mongoose.models.questions || mongoose.model("questions", questionSchema);

