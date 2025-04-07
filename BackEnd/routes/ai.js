const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { chatWithAi, listAiHistory, getAiConversation } = require("../controller/aiController");

const router = express.Router();

// POST /api/ai/chat
router.post("/chat", requireAuth, chatWithAi);

// GET /api/ai/history
router.get("/history", requireAuth, listAiHistory);

// GET /api/ai/history/:id
router.get("/history/:id", requireAuth, getAiConversation);

module.exports = router;

