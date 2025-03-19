const mongoose = require("mongoose");

// Junction table for many-to-many relationship between Exam, Section, and Module
// This allows the same section/module combination to be used across different exams
const examSectionModuleSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: [true, "Exam ID is required"],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
      required: [true, "Section ID is required"],
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "modules",
      required: [true, "Module ID is required"],
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, "Order cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index to ensure one exam-section-module combination per exam
examSectionModuleSchema.index(
  { examId: 1, sectionId: 1, moduleId: 1 },
  { unique: true }
);

// Indexes for efficient queries
examSectionModuleSchema.index({ examId: 1, order: 1 });
examSectionModuleSchema.index({ isActive: 1 });

// Virtual to populate section and module details
examSectionModuleSchema.virtual("section", {
  ref: "sections",
  localField: "sectionId",
  foreignField: "_id",
  justOne: true,
});

examSectionModuleSchema.virtual("module", {
  ref: "modules",
  localField: "moduleId",
  foreignField: "_id",
  justOne: true,
});

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.examSectionModules ||
  mongoose.model("examSectionModules", examSectionModuleSchema);
