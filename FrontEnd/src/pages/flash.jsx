import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const LOCAL_CATEGORIES = [
  {
    id: "vocabulary",
    title: "Vocabulary",
    description: "Practice important SAT words and their meanings.",
    tag: "English",
  },
  {
    id: "reading",
    title: "Reading Skills",
    description: "Main idea, inference, and other reading skills.",
    tag: "English",
  },
  {
    id: "math",
    title: "Math Basics",
    description: "Core formulas and concepts for SAT Math.",
    tag: "Math",
  },
  {
    id: "strategy",
    title: "Test Strategy",
    description: "Timing, elimination, and other test strategies.",
    tag: "Both", // show for English and Math filters
  },
];

const Flash = () => {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tagFilter, setTagFilter] = useState("all"); // all | English | Math | custom
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const handleCreateAndOpenSet = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "custom-set";
    setNewCategoryName("");
    navigate(`/flash/${slug}`);
  };

  useEffect(() => {
    const loadCategories = async () => {
      if (!token) {
        setCustomCategories([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/flashcards/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load your flashcard sets.");
        }

        const formatted =
          Array.isArray(data) &&
          data
            .filter((cat) => cat.name && cat.name.trim())
            .map((cat) => ({
              id:
                cat.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/gi, "-")
                  .replace(/^-+|-+$/g, "") || "custom",
              title: cat.name
                .split(/[-_\s]+/)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              originalName: cat.name, // Store original name for deletion
              description: `${cat.count} card${cat.count !== 1 ? "s" : ""}`,
              tag: cat.tags && cat.tags.length > 0 ? cat.tags[0] : "Other",
            }));

        setCustomCategories(Array.isArray(formatted) ? formatted : []);
      } catch (e) {
        setError(e?.message || "Using built-in categories.");
        setCustomCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [token]);

  const handleDeleteCategory = async (categoryTitle, originalCategoryName, categoryId, e) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (!window.confirm(`Are you sure you want to delete "${categoryTitle}"? This will delete all flashcards in this set.`)) {
      return;
    }

    if (!token) {
      alert("Please log in to delete flashcard sets.");
      return;
    }

    try {
      setDeletingCategory(categoryId);
      // Use the original category name (as stored in DB) for deletion
      const res = await fetch(`/api/flashcards/category/${encodeURIComponent(originalCategoryName)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete flashcard set.");
      }

      // Reload categories to reflect the deletion
      const reloadRes = await fetch("/api/flashcards/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const reloadData = await reloadRes.json().catch(() => []);
      if (reloadRes.ok && Array.isArray(reloadData)) {
        const formatted =
          reloadData
            .filter((cat) => cat.name && cat.name.trim())
            .map((cat) => ({
              id:
                cat.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/gi, "-")
                  .replace(/^-+|-+$/g, "") || "custom",
              title: cat.name
                .split(/[-_\s]+/)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              originalName: cat.name, // Store original name for deletion
              description: `${cat.count} card${cat.count !== 1 ? "s" : ""}`,
              tag: cat.tags && cat.tags.length > 0 ? cat.tags[0] : "Other",
            }));
        setCustomCategories(formatted);
      } else {
        setCustomCategories([]);
      }
    } catch (error) {
      alert(error?.message || "Failed to delete flashcard set.");
    } finally {
      setDeletingCategory(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Flashcard Sets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose a set (like Vocabulary) to start practicing with interactive flashcards.
            </p>
            {error && (
              <p className="mt-1 text-xs text-amber-700">{error}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {loading && (
              <div className="text-xs text-slate-500">
                Checking available flashcards…
              </div>
            )}
            {/* Filter buttons: All / English / Math / Custom */}
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setTagFilter("all")}
                className={`rounded-full px-3 py-1 transition ${
                  tagFilter === "all" ? "bg-slate-900 text-white" : "hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTagFilter("English")}
                className={`rounded-full px-3 py-1 transition ${
                  tagFilter === "English"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-200"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setTagFilter("Math")}
                className={`rounded-full px-3 py-1 transition ${
                  tagFilter === "Math"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-200"
                }`}
              >
                Math
              </button>
              <button
                type="button"
                onClick={() => setTagFilter("custom")}
                className={`rounded-full px-3 py-1 transition ${
                  tagFilter === "custom"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-200"
                }`}
              >
                Custom
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Built‑in categories - hidden when "custom" filter is selected */}
            {tagFilter !== "custom" &&
              LOCAL_CATEGORIES.filter((cat) => {
                if (tagFilter === "all") return true;
                if (cat.tag === "Both") return true;
                return cat.tag === tagFilter;
              }).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/flash/${cat.id}`)}
                  className="flex flex-col items-start rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {cat.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{cat.description}</div>
                </button>
              ))}

            {/* User's custom categories */}
            {customCategories
              .filter((cat) => {
                if (tagFilter === "all") return true;
                if (tagFilter === "custom") return true; // Show all custom when "custom" filter is selected
                return cat.tag === tagFilter;
              })
              .map((cat) => (
                <div
                  key={cat.id}
                  className="relative flex flex-col items-start rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm hover:border-blue-300 hover:bg-blue-100 hover:shadow-md transition"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/flash/${cat.id}`)}
                    className="flex-1 w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {cat.title}
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        Custom
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{cat.description}</div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(cat.title, cat.originalName, cat.id, e)}
                    disabled={deletingCategory === cat.id}
                    className="absolute top-2 right-2 p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete this flashcard set"
                  >
                    {deletingCategory === cat.id ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
          </div>

          {/* Create custom category */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Create your own flashcard set
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateAndOpenSet();
                  }
                }}
                placeholder="e.g. Geometry formulas, Idioms, Grammar rules"
                className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={handleCreateAndOpenSet}
                className="mt-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:mt-0"
              >
                Create & open set
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              After creating a set, you can add your own flashcards inside it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Flash;
