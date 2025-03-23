import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const Order = () => {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/exam-purchases", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.error || "Failed to load order history.");
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e?.message || "Failed to load order history.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const decorated = useMemo(
    () =>
      orders.map((p) => {
        const exam = p.examId || {};
        const purchaseDate = p.purchaseDate ? new Date(p.purchaseDate) : null;
        const activatedAt = p.activatedAt ? new Date(p.activatedAt) : null;
        const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;

        let status = "Locked";
        if (!p.isActive) {
          status = "Inactive";
        } else if (expiresAt && expiresAt < new Date()) {
          status = "Expired";
        } else if (p.unlocked) {
          status = "Unlocked";
        }

        const statusTone =
          status === "Unlocked"
            ? "bg-green-100 border-green-300 text-green-800"
            : status === "Expired" || status === "Inactive"
            ? "bg-red-100 border-red-300 text-red-800"
            : "bg-slate-100 border-slate-300 text-slate-700";

        return {
          id: p._id,
          examTitle: exam.title || "Exam",
          examCategory: exam.category || "SAT",
          difficulty: exam.difficulty || "Mixed",
          purchaseMethod: p.purchaseMethod || (exam.unlocked ? "free" : "paid"),
          price: typeof p.price === "number" ? p.price : exam.unlocked ? 0 : null,
          purchaseDate,
          activatedAt,
          expiresAt,
          status,
          statusTone,
          unlocked: p.unlocked,
          isActive: p.isActive,
          examId: exam._id || p.examId,
        };
      }),
    [orders]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Order History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              See all exams you&apos;ve unlocked or purchased for this account.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="text-slate-600">Loading your orders...</div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {decorated.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
                <div className="text-lg font-semibold text-slate-900">
                  No orders yet
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Unlock or purchase an exam to see it listed here.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {decorated.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {o.examTitle}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {o.examCategory} • {o.difficulty}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {o.purchaseDate && (
                          <span>
                            Purchased on{" "}
                            {o.purchaseDate.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {o.activatedAt && (
                          <span>
                            {" "}
                            • Activated{" "}
                            {o.activatedAt.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {o.expiresAt && (
                          <span>
                            {" "}
                            • Expires{" "}
                            {o.expiresAt.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${o.statusTone}`}
                      >
                        <span>{o.status}</span>
                        {o.unlocked && <span>• Unlocked</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-semibold">
                          {o.price === null ? "" : o.price === 0 ? "Free" : `$${o.price}`}
                        </span>
                        <span className="uppercase tracking-wide text-[10px]">
                          {o.purchaseMethod}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate("/app")}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Browse exams
                        </button>
                        {o.unlocked && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/exam/${o.examId || ""}`)
                            }
                            className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Go to exam
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Order;
