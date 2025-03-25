const mongoose = require("mongoose");

const flashcardSchema = new mongoose.Schema(
  {
    front: {
      type: String,
      required: true,
      trim: true,
    },
    back: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      enum: ["English", "Math", "Strategy", "Other"],
      default: "Other",
    },
    category: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.flashcards || mongoose.model("flashcards", flashcardSchema);

