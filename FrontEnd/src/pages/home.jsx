import { useState, useEffect } from "react";
import Card from "../components/cards";
import logo from "../assets/sat_logo-removebg-preview.png";
import { useAppSelector } from "../store/hooks";

const Home = () => {
  const [isActive, setIsActive] = useState(true); // Start with true so "Active" tab shows
  const [isPast, setIsPast] = useState(false);
  const [all, setAll] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [exams, setExams] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [pastExams, setPastExams] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  // Handle All/Unlocked filter buttons
  const handleAll = () => {
    setAll(true);
    setIsUnlocked(false);
  };

  const handleUnlocked = () => {
    setAll(false);
    setIsUnlocked(true);
  };

  // Fetch active sessions - always fetch when logged in, not just when tab is active
  useEffect(() => {
    const fetchActiveSessions = async () => {
      if (!token) {
        setActiveSessions([]);
        setActiveExams([]);
        return;
      }

      try {
        const res = await fetch("/api/exam-sessions/active", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          try {
            const data = await res.json();
            setActiveSessions(data || []);
            // Process active exams (dedupe by examId to avoid duplicate cards)
            const sessions = Array.isArray(data) ? data : [];
            const getSessionTime = (s) => {
              const t =
                s?.updatedAt ||
                s?.startedAt ||
                s?.createdAt ||
                s?.created_at ||
                s?.startTime;
              const ms = t ? Date.parse(t) : NaN;
              return Number.isFinite(ms) ? ms : 0;
            };

            const byExamId = new Map();
            for (const session of sessions) {
              const examObjOrId = session?.examId;
              const examId = examObjOrId?._id || examObjOrId;
              if (!examId) continue;
              const examIdStr = examId.toString();

              const existing = byExamId.get(examIdStr);
              if (
                !existing ||
                getSessionTime(session) > getSessionTime(existing)
              ) {
                byExamId.set(examIdStr, session);
              }
            }

            const examData = Array.from(byExamId.values()).map((session) => {
              const exam = session.examId?._id
                ? session.examId
                : session.examId;
              return {
                ...exam,
                sessionId: session._id,
                isActive: true,
              };
            });

            setActiveExams(examData);
          } catch (err) {
            console.error("Failed to parse active sessions:", err);
            setActiveSessions([]);
            setActiveExams([]);
          }
        } else {
          setActiveSessions([]);
          setActiveExams([]);
        }
      } catch (error) {
        console.error("Failed to fetch active sessions:", error);
        setActiveSessions([]);
        setActiveExams([]);
      }
    };

    fetchActiveSessions();
  }, [token]);

  // Fetch completed sessions - always fetch when logged in, not just when tab is active
  useEffect(() => {
    const fetchCompletedSessions = async () => {
      if (!token) {
        setCompletedSessions([]);
        setPastExams([]);
        return;
      }

      try {
        const res = await fetch("/api/exam-sessions/completed", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          try {
            const data = await res.json();
            setCompletedSessions(data || []);
            // Process past exams
            const examData = (data || [])
              .filter((session) => session.examId)
              .map((session) => {
                const exam = session.examId?._id
                  ? session.examId
                  : session.examId;
                return {
                  ...exam,
                  sessionId: session._id,
                  score: session.score,
                  completedAt: session.completedAt,
                  isPast: true,
                };
              });
            setPastExams(examData);
          } catch (err) {
            console.error("Failed to parse completed sessions:", err);
            setCompletedSessions([]);
            setPastExams([]);
          }
        } else {
          setCompletedSessions([]);
          setPastExams([]);
        }
      } catch (error) {
        console.error("Failed to fetch completed sessions:", error);
        setCompletedSessions([]);
        setPastExams([]);
      }
    };

    fetchCompletedSessions();
  }, [token]);

  // Fetch exams from API for All/Unlocked section
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);

        // Always fetch full exam catalog so "All" can include locked exams too
        let catalog = [];
        try {
          const catalogRes = await fetch("/api/exams");
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json();
            catalog = Array.isArray(catalogData) ? catalogData : [];
          }
        } catch (err) {
          console.error("Failed to fetch exam catalog:", err);
          catalog = [];
        }

        // If logged in, also fetch "available" exams to mark purchased/unlocked correctly
        let available = [];
        if (token) {
          try {
            const availableRes = await fetch("/api/exam-purchases/available", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (availableRes.ok) {
              const availableData = await availableRes.json();
              available = Array.isArray(availableData) ? availableData : [];
            }
          } catch (err) {
            console.error("Failed to fetch available exams:", err);
            available = [];
          }
        }

        const availableById = new Map(
          available.filter((e) => e && e._id).map((e) => [e._id.toString(), e]),
        );

        // Map active sessions by examId for quick lookup
        const activeSessionByExamId = new Map();
        for (const s of activeSessions || []) {
          const examId = s?.examId?._id || s?.examId;
          if (!examId) continue;
          activeSessionByExamId.set(examId.toString(), s?._id);
        }

        // Merge catalog + availability + active-session info
        let merged = catalog.map((exam) => {
          const idStr = exam?._id?.toString();
          const avail = idStr ? availableById.get(idStr) : undefined;

          const unlocked = exam?.unlocked === true || avail?.unlocked === true;
          const purchased =
            avail?.purchased === true ||
            (!unlocked && !!avail) ||
            exam?.purchased === true;

          const sessionId = idStr
            ? activeSessionByExamId.get(idStr)
            : undefined;

          return {
            ...exam,
            // If backend already provides these, keep them; otherwise derive from availability
            unlocked,
            purchased,
            sessionId,
            isActive: !!sessionId,
          };
        });

        // Apply filter for "Unlocked" tab in this section
        if (!all && isUnlocked) {
          if (token) {
            merged = merged.filter(
              (e) => e?.unlocked === true || e?.purchased === true,
            );
          } else {
            merged = merged.filter((e) => e?.unlocked === true);
          }
        }

        setExams(merged);
      } catch (error) {
        console.error("Failed to fetch exams:", error);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [all, isUnlocked, activeSessions, token]);

  if (loading) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl">Loading exams...</div>
        </div>
      </div>
    );
  }

  // Helper function to render exam cards
  const renderExamCards = (examList, showActive = false, showPast = false) => {
    if (examList.length === 0) {
      return (
        <div className="w-full text-center py-12">
          <p className="text-gray-500 text-lg">No exams available</p>
        </div>
      );
    }

    return examList.map((exam) => {
      let description = "Locked";
      const isPastExam = exam.isPast || showPast;
      // Only treat as active if it's not a past exam
      const hasActiveSession = !isPastExam && !!exam.sessionId;

      if (hasActiveSession) {
        description = "In Progress";
      } else if (isPastExam) {
        const pct = exam.score?.percentage ?? null;
        description = pct !== null ? `Done - ${pct}%` : "Done";
      } else if (exam.purchased) {
        description = "Purchased";
      } else if (exam.unlocked) {
        description = "Free";
      }

      return (
        <Card
          key={exam._id}
          title={exam.title}
          description={description}
          image={logo}
          examId={exam._id}
          sessionId={exam.sessionId}
          isActive={hasActiveSession}
          score={exam.score}
          unlocked={exam.unlocked}
          purchased={exam.purchased}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Resume active tests or start a new full-length SAT practice exam.
            </p>
          </div>
        </header>

        {/* Active / Past section */}
        <section className="mb-10 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Your exam activity
              </h2>
              <p className="text-xs text-slate-500">
                Quickly jump back into active tests or review your past results.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-600">
              <button
                className={`rounded-full px-3 py-1 transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "hover:bg-slate-200"
                }`}
                onClick={() => {
                  setIsActive(true);
                  setIsPast(false);
                }}
              >
                Active
              </button>
              <button
                className={`rounded-full px-3 py-1 transition ${
                  isPast
                    ? "bg-slate-900 text-white shadow-sm"
                    : "hover:bg-slate-200"
                }`}
                onClick={() => {
                  setIsActive(false);
                  setIsPast(true);
                }}
              >
                Past
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            {isActive && renderExamCards(activeExams, true, false)}
            {isPast && renderExamCards(pastExams, false, true)}
          </div>
        </section>

        {/* Full length tests section */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Full-length SAT practice tests
              </h2>
              <p className="text-xs text-slate-500">
                Choose from all available exams. Locked tests can be purchased
                or unlocked.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-600">
              <button
                className={`rounded-full px-3 py-1 transition ${
                  all
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-blue-100 text-blue-700"
                }`}
                onClick={handleAll}
              >
                All
              </button>
              <button
                className={`rounded-full px-3 py-1 transition ${
                  isUnlocked
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:bg-blue-100 text-blue-700"
                }`}
                onClick={handleUnlocked}
              >
                Unlocked
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            {renderExamCards(exams)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
