const mongoose = require("mongoose");

// Section is now a standalone entity (not tied to a specific exam)
// There are only 2 sections: "English" and "Math"
const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Section name is required"],
      trim: true,
      unique: true,
      enum: ["English", "Math"], // Only 2 sections allowed
    },
    title: {
      type: String,
      required: [true, "Section title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    order: {
      type: Number,
      required: true,
      min: [1, "Order must be at least 1"],
      max: [2, "Order cannot exceed 2"], // Only 2 sections
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
sectionSchema.index({ order: 1 });
sectionSchema.index({ isActive: 1 });

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.sections || mongoose.model("sections", sectionSchema);
