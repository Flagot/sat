const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // questionId -> choiceIndex
    },
    currentSection: {
      type: Number,
      default: 0,
    },
    currentModule: {
      type: Number,
      default: 0,
    },
    currentQuestion: {
      type: Number,
      default: 0,
    },
    timeRemaining: {
      type: Number, // in seconds
      required: true, // Will be set based on exam duration
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    score: {
      totalQuestions: {
        type: Number,
        default: 0,
      },
      correctAnswers: {
        type: Number,
        default: 0,
      },
      incorrectAnswers: {
        type: Number,
        default: 0,
      },
      unanswered: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
        min: [0, "Percentage cannot be negative"],
        max: [100, "Percentage cannot exceed 100"],
      },
      pointsEarned: {
        type: Number,
        default: 0,
      },
      totalPoints: {
        type: Number,
        default: 0,
      },
      sectionScores: [
        {
          sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "sections",
          },
          correct: Number,
          incorrect: Number,
          unanswered: Number,
          percentage: Number,
        },
      ],
    },
    metadata: {
      deviceInfo: String,
      browserInfo: String,
      ipAddress: String,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
examSessionSchema.index({ userId: 1, examId: 1, status: 1 });
examSessionSchema.index({ userId: 1, status: 1 });

// Check if model already exists to prevent overwrite error
module.exports = mongoose.models.examSessions || mongoose.model("examSessions", examSessionSchema);

