const Groq = require("groq-sdk");
const AiConversation = require("../models/aiConversationModel");

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("Missing GROQ_API_KEY");
    err.status = 500;
    throw err;
  }
  return new Groq({ apiKey });
}

async function chatWithAi(req, res, next) {
  try {
    const { prompt, messages, model, temperature, maxTokens, conversationId } = req.body || {};

    // Accept either a single prompt or chat-style messages
    let chatMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages;
    } else if (typeof prompt === "string" && prompt.trim()) {
      chatMessages = [
        {
          role: "user",
          content: prompt.trim(),
        },
      ];
    } else {
      return res.status(400).json({ error: "Provide 'prompt' or 'messages'." });
    }

    const groq = getGroqClient();

    // Prefer request model, then env override, then a default.
    // If Groq decommissions a model alias, set GROQ_MODEL in your environment.
    const defaultModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const completion = await groq.chat.completions.create({
      model: model || defaultModel,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful SAT prep tutor. Be concise, explain step-by-step when asked, and highlight common traps.",
        },
        ...chatMessages,
      ],
      temperature:
        typeof temperature === "number" ? Math.min(Math.max(temperature, 0), 2) : 0.3,
      max_tokens:
        typeof maxTokens === "number" ? Math.min(Math.max(maxTokens, 64), 2048) : 600,
    });

    const text = completion?.choices?.[0]?.message?.content || "";
    const usedModel = completion?.model || model || defaultModel;
    let savedConversationId = conversationId || null;

    // Persist conversation
    try {
      const userId = req.user?._id;
      if (userId) {
        const userMsg = chatMessages[chatMessages.length - 1];
        const userContent = userMsg?.content || (typeof prompt === "string" ? prompt : "");

        if (conversationId) {
          const updated = await AiConversation.findOneAndUpdate(
            { _id: conversationId, userId },
            {
              $push: {
                messages: [
                  { role: "user", content: userContent },
                  { role: "assistant", content: text },
                ],
              },
              $set: { model: usedModel },
            },
            { new: true }
          );
          savedConversationId = updated?._id?.toString() || savedConversationId;
        } else {
          const title = (userContent || "AI Chat").slice(0, 80);
          const created = await AiConversation.create({
            userId,
            title,
            model: usedModel,
            messages: [
              { role: "user", content: userContent },
              { role: "assistant", content: text },
            ],
          });
          savedConversationId = created?._id?.toString() || savedConversationId;
        }
      }
    } catch (persistErr) {
      // Don't break the user experience if saving fails
      console.error("Failed to save AI conversation:", persistErr?.message || persistErr);
    }

    return res.json({
      answer: text,
      model: completion?.model,
      usage: completion?.usage,
      conversationId: savedConversationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function listAiHistory(req, res, next) {
  try {
    const userId = req.user?._id;
    const items = await AiConversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt model");
    return res.json(items);
  } catch (err) {
    return next(err);
  }
}

async function getAiConversation(req, res, next) {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const convo = await AiConversation.findOne({ _id: id, userId });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    return res.json(convo);
  } catch (err) {
    return next(err);
  }
}

module.exports = { chatWithAi, listAiHistory, getAiConversation };

