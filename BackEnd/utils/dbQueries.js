/**
 * Common Database Query Helpers
 * Reusable query functions for common database operations
 */

const Exam = require("../models/examModel");
const Section = require("../models/sectionModel");
const Module = require("../models/moduleModel");
const Question = require("../models/questionsModel");
const ExamSession = require("../models/examSessionModel");
const FlaggedQuestion = require("../models/flaggedQuestion");
const User = require("../models/user");

/**
 * Get exam with all related data (sections, modules, questions)
 */
exports.getExamWithDetails = async (examId, options = {}) => {
  const {
    includeInactive = false,
    includeAnswers = false,
    populateQuestions = true,
  } = options;

  const exam = await Exam.findById(examId);

  if (!exam) {
    return null;
  }

  const sectionQuery = { examId };
  if (!includeInactive) {
    sectionQuery.isActive = true;
  }

  const sections = await Section.find(sectionQuery).sort({ order: 1 });

  const sectionsWithModules = await Promise.all(
    sections.map(async (section) => {
      const moduleQuery = { sectionId: section._id, examId };
      if (!includeInactive) {
        moduleQuery.isActive = true;
      }

      const modules = await Module.find(moduleQuery).sort({ order: 1 });

      const modulesWithQuestions = await Promise.all(
        modules.map(async (module) => {
          const questionQuery = { moduleId: module._id };
          if (!includeInactive) {
            questionQuery.isActive = true;
          }

          let questions = [];
          if (populateQuestions) {
            questions = await Question.find(questionQuery)
              .sort({ order: 1 })
              .select(includeAnswers ? "" : "-choices.isCorrect");
          } else {
            questions = await Question.find(questionQuery)
              .select("_id order")
              .sort({ order: 1 });
          }

          return {
            ...module.toObject(),
            questions: questions.map((q) => q._id),
            questionsData: questions,
            questionCount: questions.length,
          };
        })
      );

      return {
        ...section.toObject(),
        modules: modulesWithQuestions,
        moduleCount: modulesWithQuestions.length,
        questionCount: modulesWithQuestions.reduce(
          (sum, m) => sum + m.questionCount,
          0
        ),
      };
    })
  );

  return {
    ...exam.toObject(),
    sections: sectionsWithModules,
    sectionCount: sectionsWithModules.length,
    totalQuestions: sectionsWithModules.reduce(
      (sum, s) => sum + s.questionCount,
      0
    ),
  };
};

/**
 * Get user's active exam sessions
 */
exports.getUserActiveSessions = async (userId) => {
  return await ExamSession.find({
    userId,
    status: "active",
  })
    .populate("examId", "title duration category unlocked")
    .sort({ lastUpdated: -1 });
};

/**
 * Get user's exam history
 */
exports.getUserExamHistory = async (userId, options = {}) => {
  const { limit = 10, skip = 0 } = options;

  return await ExamSession.find({
    userId,
    status: "completed",
  })
    .populate("examId", "title category difficulty")
    .sort({ completedAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get exam statistics
 */
exports.getExamStats = async (examId) => {
  const [exam, sections, modules, questions, sessions, completedSessions] =
    await Promise.all([
      Exam.findById(examId),
      Section.countDocuments({ examId, isActive: true }),
      Module.countDocuments({ examId, isActive: true }),
      Question.countDocuments({ examId, isActive: true }),
      ExamSession.countDocuments({ examId }),
      ExamSession.countDocuments({ examId, status: "completed" }),
    ]);

  const avgScore = await ExamSession.aggregate([
    { $match: { examId: examId, status: "completed" } },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: "$score.percentage" },
      },
    },
  ]);

  return {
    exam,
    counts: {
      sections,
      modules,
      questions,
      totalSessions: sessions,
      completedSessions,
    },
    averageScore: avgScore[0]?.avgPercentage || 0,
  };
};

/**
 * Get user statistics
 */
exports.getUserStats = async (userId) => {
  const [totalSessions, completedSessions, activeSessions, flaggedQuestions] =
    await Promise.all([
      ExamSession.countDocuments({ userId }),
      ExamSession.countDocuments({ userId, status: "completed" }),
      ExamSession.countDocuments({ userId, status: "active" }),
      FlaggedQuestion.countDocuments({ userId, reviewed: false }),
    ]);

  const avgScore = await ExamSession.aggregate([
    { $match: { userId, status: "completed" } },
    {
      $group: {
        _id: null,
        avgPercentage: { $avg: "$score.percentage" },
        bestScore: { $max: "$score.percentage" },
      },
    },
  ]);

  return {
    sessions: {
      total: totalSessions,
      completed: completedSessions,
      active: activeSessions,
    },
    scores: {
      average: avgScore[0]?.avgPercentage || 0,
      best: avgScore[0]?.bestScore || 0,
    },
    flaggedQuestions,
  };
};

/**
 * Search exams
 */
exports.searchExams = async (searchTerm, options = {}) => {
  const { limit = 10, skip = 0, unlocked = null } = options;

  const query = {
    $text: { $search: searchTerm },
    isActive: true,
  };

  if (unlocked !== null) {
    query.unlocked = unlocked;
  }

  return await Exam.find(query)
    .select("title description category difficulty unlocked duration")
    .limit(limit)
    .skip(skip)
    .sort({ score: { $meta: "textScore" } });
};

/**
 * Get questions by module with pagination
 */
exports.getQuestionsByModule = async (moduleId, options = {}) => {
  const { limit = 50, skip = 0, includeAnswers = false } = options;

  const query = { moduleId, isActive: true };
  const select = includeAnswers ? "" : "-choices.isCorrect";

  return await Question.find(query)
    .select(select)
    .sort({ order: 1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get flagged questions for user
 */
exports.getUserFlaggedQuestions = async (userId, options = {}) => {
  const { limit = 50, skip = 0, reviewed = false } = options;

  return await FlaggedQuestion.find({
    userId,
    reviewed,
  })
    .populate("questionId")
    .populate("examId", "title category")
    .populate("sectionId", "title")
    .populate("moduleId", "title")
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Calculate exam score
 */
exports.calculateExamScore = async (sessionId) => {
  const session = await ExamSession.findById(sessionId).populate("examId");

  if (!session || session.status !== "active") {
    throw new Error("Session not found or already completed");
  }

  const questions = await Question.find({
    examId: session.examId._id,
    isActive: true,
  });

  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unanswered = 0;
  let pointsEarned = 0;
  let totalPoints = 0;
  const answersObj = session.answers || {};
  const sectionScores = {};

  for (const question of questions) {
    totalPoints += question.points || 1;
    const userAnswer = answersObj[question._id.toString()];

    if (userAnswer === undefined) {
      unanswered++;
    } else {
      const correctIndices = question.getCorrectAnswerIndices();
      const isCorrect = correctIndices.includes(userAnswer);

      if (isCorrect) {
        correctAnswers++;
        pointsEarned += question.points || 1;
      } else {
        incorrectAnswers++;
      }

      // Track section scores
      const sectionId = question.sectionId.toString();
      if (!sectionScores[sectionId]) {
        sectionScores[sectionId] = {
          sectionId: question.sectionId,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        };
      }

      if (isCorrect) {
        sectionScores[sectionId].correct++;
      } else {
        sectionScores[sectionId].incorrect++;
      }
    }
  }

  const percentage =
    totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0;

  // Calculate section percentages
  const sectionScoresArray = Object.values(sectionScores).map((score) => {
    const total = score.correct + score.incorrect + score.unanswered;
    return {
      ...score,
      percentage: total > 0 ? Math.round((score.correct / total) * 100) : 0,
    };
  });

  return {
    totalQuestions: questions.length,
    correctAnswers,
    incorrectAnswers,
    unanswered,
    percentage,
    pointsEarned,
    totalPoints,
    sectionScores: sectionScoresArray,
  };
};
