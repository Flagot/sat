const mongoose = require("mongoose");

const aiMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
  },
  { _id: false }
);

const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "" },
    messages: { type: [aiMessageSchema], default: [] },
    model: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AiConversation", aiConversationSchema);

