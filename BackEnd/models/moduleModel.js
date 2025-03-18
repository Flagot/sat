const mongoose = require("mongoose");

// Module is now a standalone entity (not tied to a specific exam/section)
// There are 4 modules total: 2 for English, 2 for Math
const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Module name is required"],
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    sectionName: {
      type: String,
      required: [true, "Section name is required"],
      enum: ["English", "Math"], // Must belong to one of the 2 sections
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: [1, "Order must be at least 1"],
      max: [2, "Order cannot exceed 2 per section"], // 2 modules per section
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

// Indexes
moduleSchema.index({ sectionName: 1, order: 1 });
moduleSchema.index({ isActive: 1 });

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.modules || mongoose.model("modules", moduleSchema);
