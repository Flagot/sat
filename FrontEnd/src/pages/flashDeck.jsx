import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const demoCards = [
  {
    id: "1",
    front: 'What does "ubiquitous" mean?',
    back: '"Found everywhere" or "very common".\nExample: Smartphones are ubiquitous in modern society.',
    tag: "English",
    category: "vocabulary",
  },
  {
    id: "2",
    front: 'What does "meticulous" mean?',
    back: '"Very careful and precise; paying great attention to detail."',
    tag: "English",
    category: "vocabulary",
  },
  {
    id: "3",
    front: "SAT Reading: Main Idea",
    back: "Identify the author’s central claim by looking for repeated themes and the thesis sentence in the introduction or conclusion.",
    tag: "English",
    category: "reading",
  },
  {
    id: "4",
    front: "SAT Math: Linear Function",
    back: "A linear function has the form y = mx + b. m is the slope (rate of change) and b is the y‑intercept (value when x = 0).",
    tag: "Math",
    category: "math",
  },
  {
    id: "5",
    front: "SAT Strategy: Elimination",
    back: "Cross out answer choices that clearly contradict information in the passage or question. Often you can narrow to 2 choices before reading in detail.",
    tag: "Strategy",
    category: "strategy",
  },
];

const CATEGORY_CONFIG = {
  vocabulary: {
    id: "vocabulary",
    title: "Vocabulary",
    description: "Review high‑value SAT vocabulary words and their meanings.",
    defaultTag: "English",
  },
  reading: {
    id: "reading",
    title: "Reading Skills",
    description: "Practice comprehension skills like main idea and inference.",
    defaultTag: "English",
  },
  math: {
    id: "math",
    title: "Math Basics",
    description: "Key formulas and concepts for SAT Math.",
    defaultTag: "Math",
  },
  strategy: {
    id: "strategy",
    title: "Test Strategy",
    description: "General strategies to save time and avoid traps.",
    defaultTag: "all",
  },
};

const FlashDeck = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const isBuiltInCategory = !!CATEGORY_CONFIG[categoryId];
  const config = CATEGORY_CONFIG[categoryId] || {
    id: "all",
    title: "Flashcards",
    description: "Flip the card to see the explanation.",
    defaultTag: "all",
  };

  const [remoteCards, setRemoteCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setRemoteCards([]);
        setError("Please log in to load your flashcards.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (categoryId && categoryId !== "all") {
          params.append("category", categoryId);
        }
        const query = params.toString() ? `?${params.toString()}` : "";

        const res = await fetch(`/api/flashcards${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || "Failed to load flashcards.");
        setRemoteCards(Array.isArray(data) && data.length > 0 ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load flashcards. Using built-in set.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [categoryId, token]);

  const cards = useMemo(() => {
    const source = remoteCards.length ? remoteCards : demoCards;

    // Limit to this category if present on demo data.
    const byCategory =
      categoryId && categoryId !== "all"
        ? source.filter((c) => (c.category || "all") === categoryId)
        : source;

    // For now we don't filter by tag on the detail page – just show all cards in the deck.
    return byCategory;
  }, [remoteCards, categoryId]);

  const current = cards[index] || null;

  const handleNext = () => {
    if (!cards.length) return;
    setFlipped(false);
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    if (!cards.length) return;
    setFlipped(false);
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    if (!cards.length) return;
    setFlipped(false);
    const random = Math.floor(Math.random() * cards.length);
    setIndex(random);
  };

  const progressText = cards.length ? `${index + 1} of ${cards.length}` : "0 of 0";

  const handleCreate = async () => {
    // Only allow creating cards in custom (non built‑in) sets
    if (isBuiltInCategory) {
      setCreateError("You can only add cards to your own custom sets.");
      return;
    }
    const trimmedFront = newFront.trim();
    const trimmedBack = newBack.trim();
    if (!trimmedFront || !trimmedBack) {
      setCreateError("Please fill in both the front and back.");
      return;
    }
    if (!token) {
      setCreateError("Please log in to save custom flashcards.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          front: trimmedFront,
          back: trimmedBack,
          tag: config.defaultTag === "all" ? "Other" : config.defaultTag,
          category: categoryId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save flashcard.");
      }

      // Append new card to current list
      setRemoteCards((prev) => [...prev, data]);
      setNewFront("");
      setNewBack("");
      setIndex(cards.length); // jump to the new card
      setFlipped(false);
    } catch (e) {
      setCreateError(e?.message || "Failed to save flashcard.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {config.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{config.description}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/flash")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Back to categories
          </button>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Loading flashcards...
            </div>
          ) : cards.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <p className="mb-2">No flashcards found for this deck.</p>
              {!isBuiltInCategory && (
                <p className="text-xs text-slate-400">
                  Add your first flashcard below to get started.
                </p>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  {error}
                </div>
              )}
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <span>{current?.tag}</span>
                <span>{progressText}</span>
              </div>

              <button
                type="button"
                onClick={() => setFlipped((prev) => !prev)}
                className="relative flex h-64 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-900 px-6 text-left text-slate-50 shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none"
              >
                {!flipped ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Question
                    </div>
                    <div className="text-lg font-semibold leading-relaxed">
                      {current?.front}
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                      Click card to flip
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                      Answer
                    </div>
                    <div className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                      {current?.back}
                    </div>
                  </div>
                )}
              </button>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 text-xs text-slate-500" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Next
                  </button>
                </div>
              </div>

            </>
          )}
          {/* Add custom card – only for custom sets */}
          {!isBuiltInCategory && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">
                Add your own flashcard
              </div>
              {createError && (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {createError}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Front (question / word)
                  </label>
                  <textarea
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                    rows={3}
                    placeholder='e.g. What does "ubiquitous" mean?'
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Back (answer / explanation)
                  </label>
                  <textarea
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                    rows={3}
                    placeholder='e.g. "Found everywhere" or "very common".'
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Saving..." : "Save flashcard"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FlashDeck;

