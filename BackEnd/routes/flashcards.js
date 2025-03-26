const express = require("express");
const Flashcard = require("../models/flashcardModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// List flashcards, optionally filtered by tag and category, including user's own cards
// Require auth so we can include user-specific cards
router.get("/", requireAuth, async (req, res) => {
  try {
    const { tag, category } = req.query;

    // Global cards (no userId) + this user's own cards
    const query = {
      $or: [{ userId: null }, { userId: req.user._id }],
    };
    if (tag && tag !== "all") {
      query.tag = tag;
    }
    if (category && category !== "all") {
      query.category = category;
    }

    const cards = await Flashcard.find(query).sort({ createdAt: -1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories for the current user only (custom sets)
router.get("/categories", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const categories = await Flashcard.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          tags: { $addToSet: "$tag" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
          tags: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed some default SAT flashcards if none exist
router.post("/seed", async (req, res) => {
  try {
    const count = await Flashcard.countDocuments();
    if (count > 0) {
      return res.status(200).json({ message: "Flashcards already exist" });
    }

    const seed = [
      {
        front: "SAT Reading: Main idea questions",
        back: "Focus on the passage as a whole. After a full read, ask: \"What is the author mainly trying to say?\" Avoid answer choices that are too narrow or bring in new ideas.",
        tag: "English",
      },
      {
        front: "SAT Reading: Line reference questions",
        back: "Always read a few lines above and below the referenced line. The correct answer will be supported directly by the text, not by your outside knowledge.",
        tag: "English",
      },
      {
        front: "SAT Math: Linear equations",
        back: "A linear equation in one variable can be written as ax + b = c. Isolate x by undoing addition/subtraction first, then multiplication/division.",
        tag: "Math",
      },
      {
        front: "SAT Math: Slope interpretation",
        back: "In y = mx + b, the slope m tells you the change in y for each +1 change in x. Positive m = increasing line, negative m = decreasing line.",
        tag: "Math",
      },
      {
        front: "Strategy: Plug in numbers",
        back: "If a problem involves variables in the choices, choose simple numbers for the variables and test each answer choice to see which one works.",
        tag: "Strategy",
      },
      {
        front: "Strategy: Work backwards from answer choices",
        back: "For some word problems, it’s faster to plug each answer choice into the problem instead of solving algebraically from scratch.",
        tag: "Strategy",
      },
    ];

    const created = await Flashcard.insertMany(seed);
    res.status(201).json({ message: "Flashcards seeded", count: created.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a custom flashcard for the current user
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { front, back, tag = "Other", category } = req.body || {};

    if (!front || !back) {
      return res.status(400).json({ error: "Both 'front' and 'back' are required" });
    }

    const card = await Flashcard.create({
      front,
      back,
      tag,
      category,
      userId,
    });

    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all flashcards in a custom category for the current user
router.delete("/category/:categoryName", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { categoryName } = req.params;

    if (!categoryName) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Only delete user's own flashcards in this category
    const result = await Flashcard.deleteMany({
      userId,
      category: categoryName,
    });

    res.status(200).json({
      message: "Flashcard set deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

