import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const Score = () => {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/exam-sessions/completed?limit=200", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || "Failed to load score history.");
        setSessions(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load score history.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const attempts = useMemo(() => {
    return sessions.map((s) => {
      const score = s.score || {};
      const sectionScores = Array.isArray(score.sectionScores) ? score.sectionScores : [];

      // Get section name or title for filtering
      const getSectionName = (ss) => {
        if (ss?.sectionId) {
          // sectionId is populated (object)
          return (ss.sectionId.name || ss.sectionId.title || "").toLowerCase();
        }
        return "";
      };

      const isMath = (name) => name === "math" || name.includes("math");

      const englishScores = sectionScores.filter((ss) => {
        const name = getSectionName(ss);
        return name && !isMath(name);
      });
      const mathScores = sectionScores.filter((ss) => {
        const name = getSectionName(ss);
        return name && isMath(name);
      });

      const sumTotals = (arr) =>
        arr.reduce(
          (acc, x) => {
            const totalQ =
              typeof x.totalQuestions === "number"
                ? x.totalQuestions
                : (x.correct || 0) + (x.incorrect || 0) + (x.unanswered || 0);
            return {
              correct: acc.correct + (x.correct || 0),
              total: acc.total + totalQ,
            };
          },
          { correct: 0, total: 0 }
        );

      const eng = sumTotals(englishScores);
      const math = sumTotals(mathScores);

      return {
        id: s._id,
        examTitle: s.examId?.title || "Exam",
        completedAt: s.completedAt,
        percentage: score.percentage ?? 0,
        correct: score.correctAnswers ?? 0,
        incorrect: score.incorrectAnswers ?? 0,
        unanswered: score.unanswered ?? 0,
        total: score.totalQuestions ?? 0,
        englishCorrect: eng.total > 0 ? eng.correct : null,
        englishTotal: eng.total > 0 ? eng.total : null,
        mathCorrect: math.total > 0 ? math.correct : null,
        mathTotal: math.total > 0 ? math.total : null,
      };
    });
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="text-slate-600">Loading your score history...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Score Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every completed attempt is saved. Retaking the same exam creates a new score card.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {attempts.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
            <div className="text-lg font-semibold text-slate-900">No scores yet</div>
            <div className="mt-1 text-sm text-slate-500">
              Complete an exam to see your results here.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {attempts.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-slate-900">
                      {a.examTitle}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {a.completedAt ? new Date(a.completedAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 px-3 py-2 text-white text-right">
                    <div className="text-xs font-semibold text-slate-200">Total</div>
                    <div className="text-lg font-extrabold">
                      {a.correct}/{a.total}
                    </div>
                    <div className="text-[11px] text-slate-300">{a.percentage}%</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">English</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {a.englishCorrect === null
                        ? "—"
                        : `${a.englishCorrect}/${a.englishTotal}`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">Math</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {a.mathCorrect === null ? "—" : `${a.mathCorrect}/${a.mathTotal}`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">Questions</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {a.correct} right • {a.incorrect} wrong • {a.unanswered} blank
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{a.total} total</div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/score/${a.id}`)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Score;
