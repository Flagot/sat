import { useState } from "react";
import { BsSend } from "react-icons/bs";
import { useAppSelector } from "../store/hooks";

const Ai = () => {
  const token = useAppSelector((state) => state.auth.token);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const fetchHistory = async () => {
    if (!token) {
      setHistoryError("Please log in to view history.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch("/api/ai/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data?.error || "Failed to load history.");
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      setHistoryError(e?.message || "Failed to load history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) await fetchHistory();
  };

  const loadConversation = async (id) => {
    if (!token) return;
    setHistoryError("");
    try {
      const res = await fetch(`/api/ai/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load conversation.");
      setSelectedConversation(data);
      setActiveConversationId(data?._id || id);
    } catch (e) {
      setHistoryError(e?.message || "Failed to load conversation.");
    }
  };

  const startNewChat = () => {
    setSelectedConversation(null);
    setActiveConversationId(null);
    setAnswer("");
    setError("");
    setQuestion("");
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    if (!token) {
      setError("Please log in to use Ask AI.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: q, conversationId: activeConversationId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || "Failed to get an answer.";
        throw new Error(msg);
      }

      setAnswer(data?.answer || "");
      if (data?.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId);
      }
      setQuestion("");
      // refresh history panel if open
      if (showHistory) {
        await fetchHistory();
        const convoId = data?.conversationId || activeConversationId;
        if (convoId) await loadConversation(convoId);
      }
    } catch (e) {
      setError(e?.message || "Failed to get an answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter") return;

    // Enter submits, Shift+Enter creates a new line (chat-style behavior)
    if (!e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight text-slate-900 cursor-pointer"
                onClick={() => setShowHistory(false)}
                title="Click to focus on chat"
              >
                Ask AI
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Get quick explanations, strategies, and step-by-step help for SAT questions.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tip: press <span className="font-semibold">Enter</span> to submit,{" "}
                <span className="font-semibold">Shift + Enter</span> for a new line.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                New chat
              </button>
              <button
                type="button"
                onClick={openHistory}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showHistory ? "Close history" : "History"}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          {showHistory && (
            <aside className="lg:col-span-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Your history</div>
                  <button
                    type="button"
                    onClick={fetchHistory}
                    disabled={historyLoading}
                    className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                {historyError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {historyError}
                  </div>
                )}

                {historyLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Loading...
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-sm text-slate-500">No saved conversations yet.</div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {history.map((h) => (
                      <button
                        key={h._id}
                        type="button"
                        onClick={() => loadConversation(h._id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left hover:bg-slate-50 ${
                          activeConversationId === h._id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {h.title || "AI Chat"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {h.updatedAt ? new Date(h.updatedAt).toLocaleString() : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className={showHistory ? "lg:col-span-8" : "lg:col-span-12"}>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Your question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onKeyDown}
              rows={5}
              placeholder="Example: Explain why the answer is B and show the fastest way to solve it..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Be specific (question + choices + what you tried) for better answers.
              </div>
              <button
                type="button"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BsSend className="text-base" />
                {loading ? "Asking..." : "Ask AI"}
              </button>
            </div>
          </div>

          {(error || answer || loading) && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">
                Answer
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Thinking...
                </div>
              )}

              {!loading && !error && answer && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">
                  {answer}
                </div>
              )}
            </div>
          )}
          {showHistory && selectedConversation?.messages?.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">
                Selected conversation
              </div>
              <div className="space-y-2">
                {selectedConversation.messages.map((m, idx) => (
                  <div
                    key={`${m.role}-${idx}`}
                    className={`rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "border-slate-200 bg-slate-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold text-slate-500">
                      {m.role === "user" ? "You" : m.role === "assistant" ? "AI" : "System"}
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">Explain</div>
            <div className="mt-1 text-xs text-slate-500">
              Ask for a step-by-step explanation and common traps.
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">Strategy</div>
            <div className="mt-1 text-xs text-slate-500">
              Get faster approaches for math and reading questions.
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-sm font-semibold text-slate-900">Check work</div>
            <div className="mt-1 text-xs text-slate-500">
              Paste your solution and ask the AI to find mistakes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ai;
