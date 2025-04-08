/**
 * Exam Access Helper Functions
 * Utilities to check user access to exams
 */

const Exam = require("../models/examModel");
const ExamPurchase = require("../models/examPurchaseModel");

/**
 * Check if a user has access to an exam
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} examId - Exam ID
 * @returns {Object} Access information
 */
exports.checkUserExamAccess = async (userId, examId) => {
  try {
    // Get exam
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return {
        hasAccess: false,
        unlocked: false,
        purchased: false,
        reason: "Exam not found or inactive",
      };
    }

    // Get user's purchase record
    const purchase = await ExamPurchase.findOne({
      userId,
      examId,
      isActive: true,
    });

    // Check if expired
    if (purchase && purchase.expiresAt && purchase.expiresAt < new Date()) {
      return {
        hasAccess: false,
        unlocked: false,
        purchased: true,
        reason: "Purchase expired",
      };
    }

    // If exam is globally unlocked, user has access
    if (exam.unlocked) {
      return {
        hasAccess: true,
        unlocked: true,
        purchased: false,
        reason: "Exam is free/unlocked",
        globalUnlocked: true,
      };
    }

    // If user has purchase record
    if (purchase) {
      // Check user-specific unlocked status
      if (purchase.unlocked) {
        return {
          hasAccess: true,
          unlocked: true,
          purchased: true,
          reason: "User has unlocked access",
          userUnlocked: true,
        };
      } else {
        return {
          hasAccess: false,
          unlocked: false,
          purchased: true,
          reason: "Purchased but not unlocked",
        };
      }
    }

    // No access
    return {
      hasAccess: false,
      unlocked: false,
      purchased: false,
      reason: "Exam is locked and not purchased",
    };
  } catch (error) {
    console.error("Error checking exam access:", error);
    return {
      hasAccess: false,
      unlocked: false,
      purchased: false,
      reason: "Error checking access",
      error: error.message,
    };
  }
};

/**
 * Get all exams accessible to a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Array of accessible exams
 */
exports.getUserAccessibleExams = async (userId, options = {}) => {
  const { includeLocked = false } = options;

  try {
    // Get all active exams
    const allExams = await Exam.find({ isActive: true });

    // Get user's purchases
    const purchases = await ExamPurchase.find({
      userId,
      isActive: true,
    }).lean();

    const purchaseMap = new Map();
    purchases.forEach((p) => {
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) return;
      const examId = (p.examId?._id || p.examId)?.toString();
      if (examId) purchaseMap.set(examId, p);
    });

    // Filter accessible exams
    const accessibleExams = [];

    for (const exam of allExams) {
      const examId = exam._id.toString();
      const purchase = purchaseMap.get(examId);

      // Check access
      const access = await exports.checkUserExamAccess(userId, examId);

      if (access.hasAccess || (includeLocked && purchase)) {
        accessibleExams.push({
          ...exam.toObject(),
          access,
          purchase: purchase || null,
        });
      }
    }

    return accessibleExams;
  } catch (error) {
    console.error("Error getting accessible exams:", error);
    return [];
  }
};

/**
 * Unlock exam for user (helper function)
 */
exports.unlockExamForUser = async (userId, examId, purchaseMethod = "admin") => {
  try {
    let purchase = await ExamPurchase.findOne({ userId, examId });

    if (!purchase) {
      purchase = await ExamPurchase.create({
        userId,
        examId,
        purchaseMethod,
        unlocked: true,
        activatedAt: new Date(),
      });
    } else {
      purchase.unlocked = true;
      purchase.isActive = true;
      purchase.activatedAt = new Date();
      purchase.deactivatedAt = undefined;
      await purchase.save();
    }

    return purchase;
  } catch (error) {
    throw error;
  }
};

/**
 * Lock exam for user (helper function)
 */
exports.lockExamForUser = async (userId, examId) => {
  try {
    const purchase = await ExamPurchase.findOne({ userId, examId });

    if (!purchase) {
      throw new Error("Purchase record not found");
    }

    purchase.unlocked = false;
    purchase.deactivatedAt = new Date();
    await purchase.save();

    return purchase;
  } catch (error) {
    throw error;
  }
};
