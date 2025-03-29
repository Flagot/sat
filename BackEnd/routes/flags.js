const express = require("express");
const { requireAuth } = require("../middleware/auth");
const FlaggedQuestion = require("../models/flaggedQuestion");
const Question = require("../models/questionsModel");

const router = express.Router();

// Get all flagged questions for the current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const flaggedQuestions = await FlaggedQuestion.find({
      userId: req.user._id,
    })
      .populate("questionId")
      .populate("examId")
      .populate("sectionId")
      .populate("moduleId")
      .sort({ createdAt: -1 });

    // Filter out orphaned flags (where questionId doesn't exist anymore)
    // and transform the data to include customQuestionId in the response
    const transformedQuestions = flaggedQuestions
      .filter((fq) => {
        // Keep flags that have either a valid questionId or a customQuestionId
        return fq.questionId || fq.customQuestionId;
      })
      .map((fq) => ({
        ...fq.toObject(),
        questionIdentifier: fq.questionId ? fq.questionId._id : fq.customQuestionId,
      }));

    res.json(transformedQuestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Flag a question
router.post("/:questionId", requireAuth, async (req, res) => {
  const mongoose = require("mongoose");
  
  try {
    const { questionId } = req.params;
    const { examId, sectionId, moduleId, notes } = req.body;

    if (!examId) {
      return res.status(400).json({ error: "examId is required" });
    }

    // Check if questionId is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(questionId);
    const examIdObj = mongoose.Types.ObjectId.isValid(examId) 
      ? new mongoose.Types.ObjectId(examId) 
      : examId;

    let existingFlag = null;

    // Simple, direct check: if valid ObjectId, check by questionId; otherwise check by customQuestionId + examId
    if (isValidObjectId) {
      const questionIdObj = new mongoose.Types.ObjectId(questionId);
      // Check by questionId (primary method for valid ObjectIds)
      existingFlag = await FlaggedQuestion.findOne({
        userId: req.user._id,
        questionId: questionIdObj,
      });
      
      // If not found, also check by customQuestionId + examId (in case it was flagged differently)
      if (!existingFlag) {
        existingFlag = await FlaggedQuestion.findOne({
          userId: req.user._id,
          examId: examIdObj,
          customQuestionId: questionId,
        });
      }
    } else {
      // Not a valid ObjectId - check by customQuestionId + examId
      existingFlag = await FlaggedQuestion.findOne({
        userId: req.user._id,
        examId: examIdObj,
        customQuestionId: questionId,
      });
    }

    // If already flagged, unflag it (toggle behavior)
    if (existingFlag) {
      await FlaggedQuestion.findByIdAndDelete(existingFlag._id);
      return res.status(200).json({
        message: "Question unflagged successfully",
        flagged: false,
      });
    }

    // Not flagged - create new flag
    // IMPORTANT: Only set questionId OR customQuestionId, never both, and never set customQuestionId to null
    const createData = {
      userId: req.user._id,
      examId: examIdObj,
      sectionId: sectionId || undefined,
      moduleId: moduleId || undefined,
      notes: notes || "",
    };

    if (isValidObjectId) {
      // Valid ObjectId - use questionId only, explicitly omit customQuestionId
      createData.questionId = new mongoose.Types.ObjectId(questionId);
      // Don't set customQuestionId at all - leave it undefined
    } else {
      // Not a valid ObjectId - use customQuestionId only
      createData.customQuestionId = questionId;
      // Don't set questionId
    }

    const flaggedQuestion = await FlaggedQuestion.create(createData);

    return res.status(201).json({
      message: "Question flagged successfully",
      flagged: true,
      flaggedQuestion,
    });
  } catch (error) {
    console.error("Error in flag endpoint:", error);
    
    // If duplicate key error, try to find and delete the existing flag
    if (error.code === 11000) {
      try {
        const { questionId } = req.params;
        const { examId } = req.body;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(questionId);
        const examIdObj = mongoose.Types.ObjectId.isValid(examId) 
          ? new mongoose.Types.ObjectId(examId) 
          : examId;

        let existingFlag = null;
        
        if (isValidObjectId) {
          existingFlag = await FlaggedQuestion.findOne({
            userId: req.user._id,
            questionId: new mongoose.Types.ObjectId(questionId),
          });
          
          if (!existingFlag) {
            existingFlag = await FlaggedQuestion.findOne({
              userId: req.user._id,
              examId: examIdObj,
              customQuestionId: questionId,
            });
          }
        } else {
          existingFlag = await FlaggedQuestion.findOne({
            userId: req.user._id,
            examId: examIdObj,
            customQuestionId: questionId,
          });
        }

        if (existingFlag) {
          await FlaggedQuestion.findByIdAndDelete(existingFlag._id);
          return res.status(200).json({
            message: "Question unflagged successfully",
            flagged: false,
          });
        }
      } catch (unflagError) {
        console.error("Error unflagging after duplicate:", unflagError);
      }
    }
    
    return res.status(500).json({ error: error.message });
  }
});

// Unflag a question
router.delete("/:questionId", requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { examId } = req.query; // Get examId from query params for customQuestionId lookups
    const mongoose = require("mongoose");

    // Try to find and delete by either questionId or customQuestionId + examId
    // Use $or to check both possibilities at once
    const query = {
      userId: req.user._id,
      $or: [],
    };

    // Add questionId check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(questionId)) {
      query.$or.push({ questionId: questionId });
    }

    // Add customQuestionId + examId check if examId is provided
    if (examId) {
      query.$or.push({ examId: examId, customQuestionId: questionId });
    }

    // If no valid conditions, return error
    if (query.$or.length === 0) {
      return res.status(400).json({ error: "Invalid question ID or missing examId" });
    }

    const flaggedQuestion = await FlaggedQuestion.findOneAndDelete(query);

    if (!flaggedQuestion) {
      return res.status(404).json({ error: "Flagged question not found" });
    }

    res.json({ message: "Question unflagged successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if a question is flagged
router.get("/check/:questionId", requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { examId } = req.query;
    const mongoose = require("mongoose");

    // Check both questionId and customQuestionId + examId
    const query = {
      userId: req.user._id,
      $or: [],
    };

    if (mongoose.Types.ObjectId.isValid(questionId)) {
      query.$or.push({ questionId: questionId });
    }

    if (examId) {
      query.$or.push({ examId: examId, customQuestionId: questionId });
    }

    const flaggedQuestion = query.$or.length > 0
      ? await FlaggedQuestion.findOne(query)
      : null;

    res.json({ isFlagged: !!flaggedQuestion, flaggedQuestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get flagged status for multiple questions
router.post("/check-multiple", requireAuth, async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ error: "questionIds must be an array" });
    }

    const flaggedQuestions = await FlaggedQuestion.find({
      userId: req.user._id,
      questionId: { $in: questionIds },
    });

    const flaggedSet = new Set(
      flaggedQuestions.map((fq) => fq.questionId.toString())
    );

    const result = questionIds.reduce((acc, qId) => {
      acc[qId] = flaggedSet.has(qId.toString());
      return acc;
    }, {});

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update notes for a flagged question
router.patch("/:questionId/notes", requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { notes } = req.body;

    const flaggedQuestion = await FlaggedQuestion.findOneAndUpdate(
      {
        userId: req.user._id,
        questionId: questionId,
      },
      { notes: notes || "" },
      { new: true }
    );

    if (!flaggedQuestion) {
      return res.status(404).json({ error: "Flagged question not found" });
    }

    res.json({
      message: "Notes updated successfully",
      flaggedQuestion,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

