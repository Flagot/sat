const mongoose = require("mongoose");

const examPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: [true, "Exam ID is required"],
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchaseMethod: {
      type: String,
      enum: ["free", "paid", "subscription", "gift", "admin"],
      default: "free",
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date, // For subscription-based access
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    unlocked: {
      type: Boolean,
      default: false, // User-specific unlock status
    },
    activatedAt: {
      type: Date, // When the exam was activated for this user
    },
    deactivatedAt: {
      type: Date, // When the exam was deactivated for this user
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure a user can only have one active purchase per exam
examPurchaseSchema.index({ userId: 1, examId: 1 }, { unique: true });

// Index for efficient queries
examPurchaseSchema.index({ userId: 1, isActive: 1 });
examPurchaseSchema.index({ userId: 1, unlocked: 1 });
examPurchaseSchema.index({ examId: 1, isActive: 1 });
examPurchaseSchema.index({ expiresAt: 1 });
examPurchaseSchema.index({ userId: 1, examId: 1, unlocked: 1 });

// Virtual to check if purchase is still valid
examPurchaseSchema.virtual("isValid").get(function () {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
});

// Virtual to check if exam is accessible for this user
examPurchaseSchema.virtual("isAccessible").get(function () {
  return this.isValid && this.unlocked;
});

// Method to check if purchase is valid
examPurchaseSchema.methods.checkValidity = function () {
  return this.isValid;
};

// Check if model already exists to prevent overwrite error
module.exports =
  mongoose.models.examPurchases ||
  mongoose.model("examPurchases", examPurchaseSchema);
