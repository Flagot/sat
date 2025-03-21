const ExamPurchase = require("../models/examPurchaseModel");
const Exam = require("../models/examModel");

// Get all purchased exams for a user
const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user._id;

    const purchases = await ExamPurchase.find({
      userId,
      isActive: true,
    })
      .populate("examId", "title description category difficulty unlocked duration")
      .sort({ purchaseDate: -1 });

    // Filter out expired purchases
    const validPurchases = purchases.filter((purchase) => {
      if (purchase.expiresAt && purchase.expiresAt < new Date()) {
        return false;
      }
      return true;
    });

    res.status(200).json(validPurchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if user has purchased an exam and if it's unlocked
const checkPurchase = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    const purchase = await ExamPurchase.findOne({
      userId,
      examId,
      isActive: true,
    });

    // Get exam to check global unlocked status
    const exam = await Exam.findById(examId);

    if (!purchase && !exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // If no purchase record, check global unlocked status
    if (!purchase) {
      return res.status(200).json({
        purchased: false,
        unlocked: exam?.unlocked || false,
        accessible: exam?.unlocked || false,
      });
    }

    // Check if expired
    if (purchase.expiresAt && purchase.expiresAt < new Date()) {
      return res.status(200).json({
        purchased: true,
        unlocked: false,
        accessible: false,
        expired: true,
      });
    }

    // User-specific unlocked status takes precedence
    const isUnlocked = purchase.unlocked;
    const isAccessible = purchase.isValid && isUnlocked;

    res.status(200).json({
      purchased: true,
      unlocked: isUnlocked,
      accessible: isAccessible,
      purchase,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Purchase an exam (create purchase record)
const purchaseExam = async (req, res) => {
  try {
    console.log("Purchase request received:", { examId: req.body.examId, userId: req.user?._id });
    const { examId } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" });
    }

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Check if purchase already exists (including inactive ones due to unique index)
    let existingPurchase = await ExamPurchase.findOne({
      userId,
      examId,
    });

    if (existingPurchase) {
      // If already purchased and active, return success
      if (existingPurchase.isActive) {
        // Check if expired
        if (existingPurchase.expiresAt && existingPurchase.expiresAt < new Date()) {
          // Reactivate purchase
          existingPurchase.isActive = true;
          existingPurchase.unlocked = true;
          existingPurchase.purchaseDate = new Date();
          existingPurchase.activatedAt = new Date();
          await existingPurchase.save();
          return res.status(200).json({
            message: "Purchase reactivated and unlocked",
            purchase: existingPurchase,
          });
        }
        
        // If already unlocked, return success
        if (existingPurchase.unlocked) {
          return res.status(200).json({
            message: "Exam already purchased and unlocked",
            purchase: existingPurchase,
          });
        }
        
        // If purchased but not unlocked, unlock it
        existingPurchase.unlocked = true;
        existingPurchase.activatedAt = new Date();
        await existingPurchase.save();
        return res.status(200).json({
          message: "Exam unlocked successfully",
          purchase: existingPurchase,
        });
      } else {
        // Reactivate inactive purchase
        existingPurchase.isActive = true;
        existingPurchase.unlocked = true;
        existingPurchase.purchaseDate = new Date();
        existingPurchase.activatedAt = new Date();
        existingPurchase.deactivatedAt = undefined;
        await existingPurchase.save();
        return res.status(200).json({
          message: "Purchase reactivated and unlocked",
          purchase: existingPurchase,
        });
      }
    }

    // Create new purchase
    // Automatically unlock the exam for the user when purchased
    const purchase = await ExamPurchase.create({
      userId,
      examId,
      purchaseMethod: exam.unlocked ? "free" : "paid",
      purchaseDate: new Date(),
      unlocked: true, // Always unlock when purchased
      activatedAt: new Date(),
      isActive: true,
    });

    res.status(201).json({
      message: "Exam purchased and unlocked successfully",
      purchase,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Exam already purchased" });
    }
    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: errors.join(", ") });
    }
    res.status(500).json({ error: error.message || "Failed to purchase exam" });
  }
};

// Get exams available to user (purchased or free) - with user-specific access
const getAvailableExams = async (req, res) => {
  try {
    const userId = req.user._id;
    const { unlocked } = req.query;

    // Get all active exams
    const allExams = await Exam.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`Found ${allExams.length} active exams`);

    // Get user's purchases with user-specific access
    const purchases = await ExamPurchase.find({
      userId,
      isActive: true,
    })
      .populate("examId")
      .lean();

    console.log(`Found ${purchases.length} purchases for user ${userId}`);

    // Create maps for quick lookup
    const purchaseMap = new Map();
    const unlockedExamIds = new Set();
    const purchasedExamIds = new Set();

    purchases.forEach((p) => {
      // Filter out expired purchases
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) {
        console.log(`Purchase expired for exam ${p.examId?._id || p.examId}`);
        return;
      }

      const examId = (p.examId?._id || p.examId)?.toString();
      if (!examId) {
        console.log("Purchase has no valid examId");
        return;
      }

      purchaseMap.set(examId, p);
      purchasedExamIds.add(examId);

      // Check if unlocked for this user
      if (p.unlocked) {
        unlockedExamIds.add(examId);
        console.log(`Exam ${examId} is unlocked for user`);
      }
    });

    // Filter exams based on user-specific access
    let availableExams = allExams.filter((exam) => {
      const examId = exam._id.toString();
      const purchase = purchaseMap.get(examId);

      // If user has purchase record
      if (purchase) {
        console.log(`Exam ${examId} has purchase record - showing`);
        // Always show if user has a purchase record (even if not unlocked, they can see it)
        return true;
      }

      // No purchase record - check global unlocked status (for free exams)
      if (exam.unlocked) {
        console.log(`Exam ${examId} is globally unlocked - showing`);
        return true; // Free exam, available to all
      }

      console.log(`Exam ${examId} is locked and not purchased - hiding`);
      return false; // Locked and not purchased
    });

    console.log(`After filtering: ${availableExams.length} exams available`);

    // Filter by unlocked status if requested
    if (unlocked !== undefined) {
      const isUnlocked = unlocked === "true";
      const beforeFilter = availableExams.length;
      availableExams = availableExams.filter((exam) => {
        const examId = exam._id.toString();
        const purchase = purchaseMap.get(examId);

        if (purchase) {
          // Use user-specific unlocked status
          return purchase.unlocked === isUnlocked;
        }
        // Use global unlocked status
        return exam.unlocked === isUnlocked;
      });
      console.log(`After unlocked filter (${isUnlocked}): ${availableExams.length} exams (was ${beforeFilter})`);
    }

    // Add purchase and access info to each exam
    const examsWithPurchaseInfo = availableExams.map((exam) => {
      const examId = exam._id.toString();
      const purchase = purchaseMap.get(examId);

      const examData = {
        ...exam.toObject(),
        purchased: !!purchase,
        unlocked: purchase ? purchase.unlocked : exam.unlocked, // User-specific or global
        purchaseDate: purchase?.purchaseDate,
        activatedAt: purchase?.activatedAt,
      };

      return examData;
    });

    console.log(`Returning ${examsWithPurchaseInfo.length} exams to frontend`);
    res.status(200).json(examsWithPurchaseInfo);
  } catch (error) {
    console.error("Error in getAvailableExams:", error);
    res.status(500).json({ error: error.message });
  }
};

// Unlock/activate exam for a user
const unlockExamForUser = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Find or create purchase record
    let purchase = await ExamPurchase.findOne({
      userId,
      examId,
    });

    if (!purchase) {
      // Create purchase record if it doesn't exist
      purchase = await ExamPurchase.create({
        userId,
        examId,
        purchaseMethod: "admin", // or "free" if it's a free unlock
        unlocked: true,
        activatedAt: new Date(),
      });
    } else {
      // Update existing purchase
      purchase.unlocked = true;
      purchase.isActive = true;
      purchase.activatedAt = new Date();
      purchase.deactivatedAt = undefined;
      await purchase.save();
    }

    res.status(200).json({
      message: "Exam unlocked successfully",
      purchase,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Purchase record already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Lock/deactivate exam for a user
const lockExamForUser = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    const purchase = await ExamPurchase.findOne({
      userId,
      examId,
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase record not found" });
    }

    purchase.unlocked = false;
    purchase.deactivatedAt = new Date();
    await purchase.save();

    res.status(200).json({
      message: "Exam locked successfully",
      purchase,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's unlocked exams
const getUserUnlockedExams = async (req, res) => {
  try {
    const userId = req.user._id;

    const purchases = await ExamPurchase.find({
      userId,
      isActive: true,
      unlocked: true,
    })
      .populate("examId", "title description category difficulty duration")
      .sort({ activatedAt: -1 });

    // Filter out expired purchases
    const validPurchases = purchases.filter((p) => {
      if (p.expiresAt && p.expiresAt < new Date()) return false;
      return true;
    });

    res.status(200).json(validPurchases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserPurchases,
  checkPurchase,
  purchaseExam,
  getAvailableExams,
  unlockExamForUser,
  lockExamForUser,
  getUserUnlockedExams,
};
