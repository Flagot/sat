const ExamSession = require("../models/examSessionModel");
const Question = require("../models/questionsModel");
const Section = require("../models/sectionModel");

// Start a new exam session
const startExamSession = async (req, res) => {
  try {
    const { examId, reset = false } = req.body;
    const userId = req.user._id;

    if (!examId) {
      return res.status(400).json({ error: "Exam ID is required" });
    }

    // Get exam data to determine duration
    const Exam = require("../models/examModel");
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Calculate time remaining in seconds (exam duration is in minutes)
    const timeRemainingInSeconds = (exam.duration || 180) * 60;

    // If reset is true, clear any active session for this exam so we can start fresh,
    // but keep completed sessions so score history is preserved.
    if (reset) {
      await ExamSession.deleteMany({
        userId,
        examId,
        status: "active",
      });

      // Also clear all flagged questions for this exam
      const FlaggedQuestion = require("../models/flaggedQuestion");
      await FlaggedQuestion.deleteMany({
        userId,
        examId,
      });
    } else {
      // Check if there's already an active session for this exam
      const existingSession = await ExamSession.findOne({
        userId,
        examId,
        status: "active",
      });

      if (existingSession) {
        return res.status(200).json({
          message: "Resuming existing session",
          session: existingSession,
        });
      }
    }

    // Create new session with exam-specific duration
    const session = await ExamSession.create({
      userId,
      examId,
      status: "active",
      timeRemaining: timeRemainingInSeconds,
      startTime: new Date(),
      lastUpdated: new Date(),
    });

    res.status(201).json({
      message: reset ? "Exam session reset and started" : "Exam session started",
      session,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all active sessions for a user
const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await ExamSession.find({
      userId,
      status: "active",
    })
      .populate("examId", "title unlocked category difficulty")
      .sort({ lastUpdated: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all completed sessions for a user
const getCompletedSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    const sessions = await ExamSession.find({
      userId,
      status: "completed",
    })
      .populate("examId", "title category difficulty unlocked")
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Collect all unique sectionIds from all sessions
    const sectionIds = new Set();
    sessions.forEach((session) => {
      if (session.score?.sectionScores && Array.isArray(session.score.sectionScores)) {
        session.score.sectionScores.forEach((ss) => {
          if (ss.sectionId) {
            sectionIds.add(ss.sectionId.toString());
          }
        });
      }
    });

    // Fetch all sections at once if there are any
    let sectionMap = new Map();
    if (sectionIds.size > 0) {
      const mongoose = require("mongoose");
      const sections = await Section.find({
        _id: { $in: Array.from(sectionIds).map((id) => new mongoose.Types.ObjectId(id)) },
      });
      sectionMap = new Map(sections.map((s) => [s._id.toString(), s]));
    }

    // Populate sectionId in sectionScores
    sessions.forEach((session) => {
      if (session.score?.sectionScores && Array.isArray(session.score.sectionScores)) {
        session.score.sectionScores.forEach((sectionScore) => {
          if (sectionScore.sectionId) {
            const sectionIdStr = sectionScore.sectionId.toString();
            const section = sectionMap.get(sectionIdStr);
            if (section) {
              sectionScore.sectionId = section;
            }
          }
        });
      }
    });

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific session
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
    }).populate("examId", "title unlocked");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get session by examId (returns active or most recent completed session)
const getSessionByExamId = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    // First try to find an active session
    let session = await ExamSession.findOne({
      userId,
      examId,
      status: "active",
    }).populate("examId", "title unlocked");

    // If no active session, get the most recent completed session
    if (!session) {
      session = await ExamSession.findOne({
        userId,
        examId,
        status: "completed",
      })
        .populate("examId", "title unlocked")
        .sort({ completedAt: -1 });
    }

    if (!session) {
      return res.status(404).json({ error: "No session found" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save an answer
const saveAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, choiceIndex } = req.body;
    const userId = req.user._id;

    if (questionId === undefined || choiceIndex === undefined) {
      return res
        .status(400)
        .json({ error: "questionId and choiceIndex are required" });
    }

    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found or completed" });
    }

    // Convert answers Map to object, update, then convert back
    const answersObj = session.answers ? { ...session.answers } : {};
    answersObj[questionId.toString()] = choiceIndex;

    session.answers = answersObj;
    session.markModified('answers'); // Tell Mongoose that answers field has been modified
    session.lastUpdated = new Date();

    await session.save();

    res.status(200).json({
      message: "Answer saved",
      session,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update progress (section, module, question)
const updateProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentSection, currentModule, currentQuestion, timeRemaining } =
      req.body;
    const userId = req.user._id;

    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
      status: "active",
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found or completed" });
    }

    if (currentSection !== undefined) session.currentSection = currentSection;
    if (currentModule !== undefined) session.currentModule = currentModule;
    if (currentQuestion !== undefined)
      session.currentQuestion = currentQuestion;
    if (timeRemaining !== undefined) session.timeRemaining = timeRemaining;

    session.lastUpdated = new Date();

    await session.save();

    res.status(200).json({
      message: "Progress updated",
      session,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Complete exam and calculate score
const completeExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
      status: "active",
    });

    if (!session) {
      return res
        .status(404)
        .json({ error: "Session not found or already completed" });
    }

    // Get all questions for this exam with examSectionModuleId populated
    const questions = await Question.find({ examId: session.examId })
      .populate({
        path: "examSectionModuleId",
        populate: {
          path: "sectionId",
          select: "name title order",
        },
      });

    // Calculate score
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;
    let pointsEarned = 0;
    let totalPoints = 0;
    const answersObj = session.answers || {};
    const sectionStats = new Map(); // sectionId -> { correct, incorrect, unanswered, pointsEarned, totalPoints, totalQuestions }

    for (const question of questions) {
      const userAnswer = answersObj[question._id.toString()];
      // Get sectionId from populated examSectionModuleId
      const sectionId = question.examSectionModuleId?.sectionId?._id || question.examSectionModuleId?.sectionId;
      const sectionIdStr = sectionId?.toString();
      const qPoints = typeof question.points === "number" ? question.points : 1;
      totalPoints += qPoints;

      if (sectionIdStr) {
        if (!sectionStats.has(sectionIdStr)) {
          sectionStats.set(sectionIdStr, {
            sectionId: sectionId,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            pointsEarned: 0,
            totalPoints: 0,
            totalQuestions: 0,
          });
        }
        const s = sectionStats.get(sectionIdStr);
        s.totalPoints += qPoints;
        s.totalQuestions += 1;
      }

      if (userAnswer !== undefined) {
        // Find the correct choice index
        const correctChoiceIndex = question.choices.findIndex(
          (choice) => choice.isCorrect === true
        );

        if (userAnswer === correctChoiceIndex) {
          correctAnswers++;
          pointsEarned += qPoints;
          if (sectionIdStr) sectionStats.get(sectionIdStr).correct += 1;
          if (sectionIdStr) sectionStats.get(sectionIdStr).pointsEarned += qPoints;
        } else {
          incorrectAnswers++;
          if (sectionIdStr) sectionStats.get(sectionIdStr).incorrect += 1;
        }
      } else {
        unanswered++;
        if (sectionIdStr) sectionStats.get(sectionIdStr).unanswered += 1;
      }
    }

    const totalQuestions = questions.length;
    const percentage =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    const sectionScores = Array.from(sectionStats.values()).map((s) => {
      const sectionPct =
        s.totalQuestions > 0 ? Math.round((s.correct / s.totalQuestions) * 100) : 0;
      return {
        sectionId: s.sectionId,
        correct: s.correct,
        incorrect: s.incorrect,
        unanswered: s.unanswered,
        percentage: sectionPct,
        totalQuestions: s.totalQuestions,
      };
    });

    // Update session
    session.status = "completed";
    session.completedAt = new Date();
    session.score = {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      percentage,
      pointsEarned,
      totalPoints,
      sectionScores,
    };
    session.lastUpdated = new Date();

    await session.save();

    res.status(200).json({
      message: "Exam completed",
      session,
      score: session.score,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get detailed results for a completed session (question-by-question)
const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ExamSession.findOne({
      _id: sessionId,
      userId,
    }).populate("examId", "title category difficulty");

    if (!session) return res.status(404).json({ error: "Session not found" });

    // Fetch questions with examSectionModuleId populated to get section info
    const questions = await Question.find({ examId: session.examId?._id || session.examId })
      .populate({
        path: "examSectionModuleId",
        populate: {
          path: "sectionId",
          select: "name title order",
        },
      })
      .sort({ order: 1 });

    const answersObj = session.answers || {};

    const items = questions.map((q) => {
      const userAnswerIndex = answersObj[q._id.toString()];
      const correctIndex = q.choices.findIndex((c) => c.isCorrect === true);
      const isAnswered = userAnswerIndex !== undefined;
      const isCorrect = isAnswered && userAnswerIndex === correctIndex;

      const userChoiceText =
        isAnswered && q.choices?.[userAnswerIndex] ? q.choices[userAnswerIndex].text : null;
      const correctChoiceText = q.choices?.[correctIndex] ? q.choices[correctIndex].text : null;

      const explanation =
        q.choices?.[correctIndex]?.explanation || q.explanation || q.description || "";

      // Get section info from populated examSectionModuleId
      const section = q.examSectionModuleId?.sectionId || null;

      return {
        questionId: q._id,
        order: q.order,
        section: {
          id: section?._id || null,
          title: section?.title || section?.name || "",
        },
        questionText: q.questionText,
        choices: q.choices.map((c) => ({ text: c.text })),
        userAnswerIndex: isAnswered ? userAnswerIndex : null,
        correctAnswerIndex: correctIndex >= 0 ? correctIndex : null,
        userChoiceText,
        correctChoiceText,
        isCorrect,
        explanation,
      };
    });

    const correct = items.filter((i) => i.isCorrect);
    const wrong = items.filter((i) => i.userAnswerIndex !== null && !i.isCorrect);
    const unanswered = items.filter((i) => i.userAnswerIndex === null);

    // Basic English/Math grouping by section title heuristic
    const isMathSection = (title) => (title || "").toLowerCase().includes("math");
    const grouped = {
      english: items.filter((i) => !isMathSection(i.section.title)),
      math: items.filter((i) => isMathSection(i.section.title)),
    };

    return res.json({
      sessionId: session._id,
      exam: session.examId,
      completedAt: session.completedAt,
      score: session.score,
      summary: {
        total: items.length,
        correct: correct.length,
        wrong: wrong.length,
        unanswered: unanswered.length,
      },
      breakdown: {
        english: {
          total: grouped.english.length,
          correct: grouped.english.filter((i) => i.isCorrect).length,
        },
        math: {
          total: grouped.math.length,
          correct: grouped.math.filter((i) => i.isCorrect).length,
        },
      },
      questions: items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  startExamSession,
  getActiveSessions,
  getCompletedSessions,
  getSession,
  getSessionByExamId,
  saveAnswer,
  updateProgress,
  completeExam,
  getSessionDetails,
};
