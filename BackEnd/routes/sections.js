const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
} = require("../controller/sectionController");

const router = express.Router();

// Get all sections (standalone)
router.get("/", getSections);

// Get single section by ID
router.get("/:id", getSection);

// Create section (requires auth)
router.post("/", requireAuth, createSection);

// Update section (requires auth)
router.patch("/:id", requireAuth, updateSection);

// Delete section (requires auth)
router.delete("/:id", requireAuth, deleteSection);

module.exports = router;
