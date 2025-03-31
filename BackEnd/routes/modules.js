const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
} = require("../controller/moduleController");

const router = express.Router();

// Get all modules (standalone) - can filter by sectionName query param
router.get("/", getModules);

// Get single module by ID
router.get("/:id", getModule);

// Create module (requires auth)
router.post("/", requireAuth, createModule);

// Update module (requires auth)
router.patch("/:id", requireAuth, updateModule);

// Delete module (requires auth)
router.delete("/:id", requireAuth, deleteModule);

module.exports = router;
