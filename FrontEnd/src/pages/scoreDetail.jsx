import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const ScoreDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("wrong"); // wrong | correct | all

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/exam-sessions/${sessionId}/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load score details.");
        setData(json);
      } catch (e) {
        setError(e?.message || "Failed to load score details.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sessionId, token]);

  const questions = useMemo(() => {
    const list = data?.questions || [];
    if (filter === "all") return list;
    if (filter === "correct") return list.filter((q) => q.isCorrect === true);
    if (filter === "wrong")
      return list.filter((q) => q.userAnswerIndex !== null && q.isCorrect !== true);
    return list;
  }, [data, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="text-slate-600">Loading score details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="text-red-700">{error}</div>
            <button
              type="button"
              onClick={() => navigate("/score")}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to Score Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = data?.summary?.total ?? 0;
  const correct = data?.summary?.correct ?? 0;
  const wrong = data?.summary?.wrong ?? 0;
  const unanswered = data?.summary?.unanswered ?? 0;
  const pct = data?.score?.percentage ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Score Details
            </h1>
            <div className="mt-1 text-sm text-slate-500">
              {data?.exam?.title || "Exam"} •{" "}
              {data?.completedAt ? new Date(data.completedAt).toLocaleString() : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/score")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Back
          </button>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Total score</div>
              <div className="mt-1 text-3xl font-extrabold text-slate-900">
                {pct}%
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {correct} correct • {wrong} wrong • {unanswered} unanswered • {total} total
              </div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setFilter("wrong")}
                className={`rounded-full px-3 py-1 transition ${
                  filter === "wrong" ? "bg-slate-900 text-white" : "hover:bg-slate-200"
                }`}
              >
                Wrong
              </button>
              <button
                type="button"
                onClick={() => setFilter("correct")}
                className={`rounded-full px-3 py-1 transition ${
                  filter === "correct"
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-200"
                }`}
              >
                Right
              </button>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1 transition ${
                  filter === "all" ? "bg-slate-900 text-white" : "hover:bg-slate-200"
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.questionId} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500">
                        {q.section?.title || "Section"} • Q{q.order ?? ""}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {q.questionText}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        q.userAnswerIndex === null
                          ? "bg-slate-100 text-slate-700"
                          : q.isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {q.userAnswerIndex === null
                        ? "Unanswered"
                        : q.isCorrect
                        ? "Correct"
                        : "Wrong"}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-600">Your answer</div>
                        <div className="mt-1 text-sm text-slate-900">
                          {q.userChoiceText ?? "—"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-600">Correct answer</div>
                        <div className="mt-1 text-sm text-slate-900">
                          {q.correctChoiceText ?? "—"}
                        </div>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-600">Explanation</div>
                        <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                          {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No questions found for this filter.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScoreDetail;

