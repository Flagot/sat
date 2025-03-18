import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BsChevronRight, BsFlag, BsFlagFill, BsHouseDoor, BsPauseFill, BsPlayFill, BsEye, BsEyeSlash } from "react-icons/bs";
import { useAppSelector } from "../store/hooks";

const Exam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const [timeRemaining, setTimeRemaining] = useState(3 * 60 * 60); // Default 3 hours, will be updated from exam data
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [sections, setSections] = useState([]);
  const [currentModule, setCurrentModule] = useState(0);
  const [examData, setExamData] = useState(null);
  const [currentQuestionData, setCurrentQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [showModuleReview, setShowModuleReview] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Load exam data, sections, modules, and questions
  useEffect(() => {
    const loadExamData = async () => {
      if (!examId) return;

      try {
        setLoading(true);

        // Fetch exam
        const examRes = await fetch(`/api/exams/${examId}`);
        if (!examRes.ok) {
          throw new Error("Failed to load exam");
        }
        const exam = await examRes.json();
        setExamData(exam);
        
        // Set initial time remaining based on exam duration (convert minutes to seconds)
        const examDurationInSeconds = (exam.duration || 180) * 60;
        setTimeRemaining(examDurationInSeconds);

        // Fetch exam-section-module relationships for this exam
        const examSectionModulesRes = await fetch(`/api/exam-section-modules/exam/${examId}`);
        if (!examSectionModulesRes.ok) {
          const errorData = await examSectionModulesRes.json().catch(() => ({}));
          console.error("Failed to load exam-section-modules:", errorData);
        }
        const examSectionModulesData = examSectionModulesRes.ok 
          ? await examSectionModulesRes.json() 
          : [];
        
        console.log("Loaded exam-section-modules:", examSectionModulesData);
        console.log("Exam ID:", examId);

        // Group exam-section-modules by section
        const sectionsMap = new Map();
        
        for (const esm of examSectionModulesData) {
          const section = esm.sectionId;
          const module = esm.moduleId;
          
          if (!section || !module) continue;
          
          const sectionId = section._id || section;
          const moduleId = module._id || module;
          
          if (!sectionsMap.has(sectionId)) {
            sectionsMap.set(sectionId, {
              ...section,
              _id: sectionId,
              modules: [],
            });
          }
          
          // Fetch questions for this exam-section-module combination
          const questionsRes = await fetch(
            `/api/exam-section-modules/${esm._id}/questions`
          );
          const questionsData = questionsRes.ok
            ? await questionsRes.json()
            : [];

          const sectionData = sectionsMap.get(sectionId);
          sectionData.modules.push({
            ...module,
            _id: moduleId,
            examSectionModuleId: esm._id,
            questions: questionsData.map((q) => q._id),
            questionsData: questionsData,
          });
        }

        // Convert map to array and sort by section order, then module order
        const sectionsWithModules = Array.from(sectionsMap.values())
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((section) => ({
            ...section,
            modules: section.modules.sort((a, b) => (a.order || 0) - (b.order || 0)),
          }));

        setSections(sectionsWithModules);

        // Load or create exam session
        if (token) {
          try {
            // Check for existing session (active or completed)
            const sessionRes = await fetch(`/api/exam-sessions/exam/${examId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            let session;
            if (sessionRes.ok) {
              try {
                session = await sessionRes.json();
                
                // If session is completed, reset it (clear flags, answers, start fresh)
                if (session.status === "completed") {
                  const resetRes = await fetch("/api/exam-sessions/start", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ examId, reset: true }),
                  });

                  if (resetRes.ok) {
                    const resetData = await resetRes.json();
                    session = resetData.session;
                    setSessionId(session._id);
                    // Reset local state
                    setAnswers({});
                    setCurrentSection(0);
                    setCurrentModule(0);
                    setCurrentQuestion(0);
                    // Use exam duration for reset (convert minutes to seconds)
                    const examDurationInSeconds = (exam.duration || 180) * 60;
                    setTimeRemaining(examDurationInSeconds);
                    setFlagged(new Set());
                  }
                } else {
                  // Active session - restore saved state
                  setSessionId(session._id);
                  
                  if (session.answers && typeof session.answers === 'object') {
                    const answersObj = {};
                    Object.keys(session.answers).forEach((key) => {
                      answersObj[key] = session.answers[key];
                    });
                    setAnswers(answersObj);
                  } else {
                    setAnswers({});
                  }
                  
                  if (session.currentSection !== undefined) {
                    setCurrentSection(session.currentSection);
                  }
                  if (session.currentModule !== undefined) {
                    setCurrentModule(session.currentModule);
                  }
                  if (session.currentQuestion !== undefined) {
                    setCurrentQuestion(session.currentQuestion);
                  }
                  if (session.timeRemaining !== undefined) {
                    // Resume timer from exactly where it was saved (paused when user left)
                    setTimeRemaining(session.timeRemaining);
                  }
                }
              } catch (err) {
                console.error("Failed to parse session data:", err);
              }
            } else if (sessionRes.status === 404) {
              // No session found, start new one
              const startRes = await fetch("/api/exam-sessions/start", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ examId }),
              });

              if (startRes.ok) {
                try {
                  const startData = await startRes.json();
                  session = startData.session;
                  setSessionId(session._id);
                } catch (err) {
                  console.error("Failed to parse start session data:", err);
                }
              }
            }
          } catch (error) {
            console.error("Failed to load session:", error);
            // Continue without session if not logged in
          }

          // Load flagged questions
          const flagsRes = await fetch("/api/flags", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (flagsRes.ok) {
            const flaggedQuestions = await flagsRes.json();
            const flaggedSet = new Set(
              flaggedQuestions.map((fq) => {
                return (
                  fq.customQuestionId ||
                  fq.questionId?._id?.toString() ||
                  fq.questionId?.toString()
                );
              })
            );
            setFlagged(flaggedSet);
          }
        }
      } catch (error) {
        console.error("Failed to load exam data:", error);
        alert("Failed to load exam. Please try again.");
        navigate("/app");
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId, token, navigate]);

  // Auto-submit function (no confirmation dialog)
  const autoSubmit = useCallback(async () => {
    console.log("Auto-submitting exam - sessionId:", sessionId, "token:", !!token);
    
    if (sessionId && token) {
      try {
        // Complete the exam
        const res = await fetch(`/api/exam-sessions/${sessionId}/complete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          try {
            const data = await res.json();
            console.log("Auto-submit successful:", data);
            // Navigate to specific score detail page for this session
            const completedSessionId = data.session?._id || sessionId;
            if (completedSessionId) {
              navigate(`/score/${completedSessionId}`);
            } else {
              navigate("/score");
            }
          } catch (err) {
            console.error("Failed to parse auto-submit completion data:", err);
            navigate("/score");
          }
        } else {
          const errorText = await res.text().catch(() => "Failed to complete exam");
          console.error("Auto-submit failed:", errorText);
          
          // For auto-submit, still navigate to score page even if submission fails
          alert("Time's up! Your exam has been submitted automatically.");
          navigate("/score");
        }
      } catch (error) {
        console.error("Auto-submit error:", error);
        // For auto-submit, still navigate to score page even if submission fails
        alert("Time's up! There was an issue submitting your exam, but your session has been saved.");
        navigate("/score");
      }
    } else {
      // If not logged in, just navigate
      console.log("Auto-submit: No session or token, navigating to score");
      alert("Time's up!");
      navigate("/score");
    }
  }, [sessionId, token, navigate]);

  // Handle manual exam submission (with confirmation)
  const handleSubmit = useCallback(async () => {
    if (window.confirm("Are you sure you want to submit the exam?")) {
      if (sessionId && token) {
        try {
          // Complete the exam
          const res = await fetch(`/api/exam-sessions/${sessionId}/complete`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            try {
              const data = await res.json();
              // Navigate to specific score detail page for this session
              const completedSessionId = data.session?._id || sessionId;
              if (completedSessionId) {
                navigate(`/score/${completedSessionId}`);
              } else {
                navigate("/score");
              }
            } catch (err) {
              console.error("Failed to parse completion data:", err);
              navigate("/score");
            }
          } else {
            const errorText = await res.text().catch(() => "Failed to complete exam");
            throw new Error(errorText);
          }
        } catch (error) {
          console.error("Failed to submit exam:", error);
          alert("Failed to submit exam. Please try again.");
        }
      } else {
        // If not logged in, just navigate
        navigate("/score");
      }
    }
  }, [sessionId, token, navigate]);

  // Timer countdown and save time remaining
  useEffect(() => {
    // Don't run timer if paused
    if (isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when timer reaches 0
          console.log("Time's up! Auto-submitting exam...");
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Save time remaining every 30 seconds
    const saveTimeInterval = setInterval(() => {
      if (sessionId && token) {
        saveProgress();
      }
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(saveTimeInterval);
    };
  }, [sessionId, token, isPaused, autoSubmit]);

  // Save timer when leaving the page
  useEffect(() => {
    return () => {
      // Save current timer value when component unmounts (user leaves page)
      if (sessionId && token && timeRemaining > 0) {
        // Use a synchronous approach to save immediately
        fetch(`/api/exam-sessions/${sessionId}/progress`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentSection,
            currentModule,
            currentQuestion,
            timeRemaining,
          }),
        }).catch((error) => {
          console.error("Failed to save timer on unmount:", error);
        });
      }
    };
  }, [sessionId, token, timeRemaining, currentSection, currentModule, currentQuestion]);

  // Save progress function
  const saveProgress = async () => {
    if (!sessionId || !token) return;

    try {
      await fetch(`/api/exam-sessions/${sessionId}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentSection,
          currentModule,
          currentQuestion,
          timeRemaining,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  // Toggle pause/resume timer
  const togglePause = async () => {
    setIsPaused((prev) => {
      const newPaused = !prev;
      // Save progress when pausing/resuming
      if (sessionId && token) {
        saveProgress();
      }
      return newPaused;
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = async (questionId, choiceIndex) => {
    const questionIdStr = questionId?.toString();
    setAnswers((prev) => ({
      ...prev,
      [questionIdStr]: choiceIndex,
    }));

    // Save answer to backend
    if (sessionId && token) {
      try {
        await fetch(`/api/exam-sessions/${sessionId}/answer`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: questionIdStr,
            choiceIndex,
          }),
        });
      } catch (error) {
        console.error("Failed to save answer:", error);
      }
    }
  };

  const toggleFlag = async (questionId) => {
    if (!token) {
      alert("Please login to flag questions");
      return;
    }

    if (!examId) {
      console.error("examId is missing, cannot flag question");
      alert("Exam ID is missing. Please reload the page.");
      return;
    }

    const questionIdStr = questionId?.toString();
    
    // Optimistically update UI immediately
    const isCurrentlyFlagged = flagged.has(questionIdStr);
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (isCurrentlyFlagged) {
        newSet.delete(questionIdStr);
      } else {
        newSet.add(questionIdStr);
      }
      return newSet;
    });
    
    setLoadingFlags(true);

    try {
      // Always use POST - backend handles toggling (flags if not flagged, unflags if already flagged)
      const requestBody = {
        examId: examId,
        sectionId: sections[currentSection]?._id || null,
        moduleId: sections[currentSection]?.modules[currentModule]?._id || null,
      };

      const res = await fetch(`/api/flags/${questionIdStr}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const data = await res.json();
        // Update state based on backend response (in case it differs from optimistic update)
        setFlagged((prev) => {
          const newSet = new Set(prev);
          if (data.flagged === false) {
            newSet.delete(questionIdStr);
          } else {
            newSet.add(questionIdStr);
          }
          return newSet;
        });
      } else {
        // Revert optimistic update on error
        setFlagged((prev) => {
          const newSet = new Set(prev);
          if (isCurrentlyFlagged) {
            newSet.add(questionIdStr);
          } else {
            newSet.delete(questionIdStr);
          }
          return newSet;
        });
        
        try {
          const errorData = await res.json().catch(() => ({ error: "Failed to toggle flag" }));
          console.error("Flag error:", errorData);
          alert(errorData.error || "Failed to toggle flag");
        } catch (err) {
          console.error("Error parsing flag response:", err);
          alert("Failed to toggle flag");
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setFlagged((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyFlagged) {
          newSet.add(questionIdStr);
        } else {
          newSet.delete(questionIdStr);
        }
        return newSet;
      });
      
      console.error("Error toggling flag:", error);
      alert("Failed to update flag status");
    } finally {
      setLoadingFlags(false);
    }
  };

  const getCurrentQuestions = () => {
    const questions = sections[currentSection]?.modules[currentModule]?.questions || [];
    return questions;
  };

  // Load current question data
  useEffect(() => {
    const loadCurrentQuestion = async () => {
      const questions = getCurrentQuestions();
      if (questions.length === 0 || currentQuestion >= questions.length) {
        setCurrentQuestionData(null);
        return;
      }

      const currentQId = questions[currentQuestion];
      if (!currentQId) {
        setCurrentQuestionData(null);
        return;
      }

      try {
        const res = await fetch(`/api/questions/${currentQId}`);
        if (res.ok) {
          const question = await res.json();
          setCurrentQuestionData(question);
        }
      } catch (error) {
        console.error("Failed to load question:", error);
      }
    };

    if (sections.length > 0) {
      loadCurrentQuestion();
    }
  }, [currentSection, currentModule, currentQuestion, sections]);

  const handleNext = () => {
    const questions = getCurrentQuestions();
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      if (sessionId && token) {
        setTimeout(() => saveProgress(), 100);
      }
      return;
    }

    // Last question of this module: show module review instead of jumping ahead
    setShowModuleReview(true);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      const prevModuleQuestions = sections[currentSection].modules[currentModule - 1].questions;
      setCurrentQuestion(prevModuleQuestions.length - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      const prevSection = sections[currentSection - 1];
      setCurrentModule(prevSection.modules.length - 1);
      const prevModuleQuestions = prevSection.modules[prevSection.modules.length - 1].questions;
      setCurrentQuestion(prevModuleQuestions.length - 1);
    }
    // Save progress after navigation
    if (sessionId && token) {
      setTimeout(() => saveProgress(), 100);
    }
  };

  const goToNextModuleAfterReview = () => {
    setShowModuleReview(false);

    // Move to next module in same section, then next section, otherwise end of exam
    if (currentModule < sections[currentSection].modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentQuestion(0);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentModule(0);
      setCurrentQuestion(0);
    } else {
      // At the end of the last module/section: submit exam
      handleSubmit();
      return;
    }

    if (sessionId && token) {
      setTimeout(() => saveProgress(), 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading exam...</div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No sections found</h2>
          <p className="text-gray-600 mb-4">This exam doesn't have any sections yet.</p>
          <button
            onClick={() => navigate("/app")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const questions = getCurrentQuestions();
  const currentQuestionId = questions[currentQuestion];
  const currentAnswer = answers[currentQuestionId?.toString()];

  // Use current question data from API or fallback
  const questionData = currentQuestionData
    ? {
        text: currentQuestionData.questionText || currentQuestionData.description || "",
        choices: currentQuestionData.choices?.map((c) => c.text) || [],
        passage:
          currentQuestionData.passage ||
          currentQuestionData.context ||
          currentQuestionData.passageText ||
          currentQuestionData.description ||
          null,
      }
    : {
        text: "Loading question...",
        choices: [],
        passage: null,
      };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app")}
              className="text-gray-600 hover:text-gray-900"
            >
              <BsHouseDoor className="text-2xl" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">
                {examData?.title || "SAT Practice Test"}
              </h1>
              {sections[currentSection] && (
                <p className="text-sm text-gray-600">
                  {sections[currentSection]?.title || sections[currentSection]?.name}
                  {sections[currentSection]?.modules[currentModule] && (
                    <> • {sections[currentSection]?.modules[currentModule]?.title || sections[currentSection]?.modules[currentModule]?.name}</>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {showTimer && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Time Remaining</div>
                <div className={`text-2xl font-bold ${
                  isPaused 
                    ? "text-orange-500" 
                    : timeRemaining < 600 
                      ? "text-red-600" 
                      : "text-gray-900"
                }`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center justify-center w-8 h-8 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title={isPaused ? "Resume timer" : "Pause timer"}
              >
                {isPaused ? (
                  <BsPlayFill className="text-lg" />
                ) : (
                  <BsPauseFill className="text-lg" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowTimer((prev) => !prev)}
                className="flex items-center justify-center w-8 h-8 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title={showTimer ? "Hide timer" : "Show timer"}
              >
                {showTimer ? (
                  <BsEyeSlash className="text-lg" />
                ) : (
                  <BsEye className="text-lg" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Main Content - Question or Module Review */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {!showModuleReview ? (
            <>
              <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  <button
                    onClick={() => toggleFlag(currentQuestionId)}
                    disabled={loadingFlags || !currentQuestionId}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    title={
                      flagged.has(currentQuestionId?.toString())
                        ? "Unflag question"
                        : "Flag question"
                    }
                  >
                    {flagged.has(currentQuestionId?.toString()) ? (
                      <BsFlagFill className="text-yellow-500" />
                    ) : (
                      <BsFlag className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className={`mb-6 grid gap-6 ${questionData.passage ? "md:grid-cols-2" : ""}`}>
                {/* Left column: description / passage - only show if passage exists */}
                {questionData.passage && (
                  <div className="pr-6 border-r-2 border-gray-200">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs leading-snug text-gray-800 whitespace-pre-line">
                      {questionData.passage}
                    </div>
                  </div>
                )}

                {/* Right column: question & choices */}
                <div className={questionData.passage ? "" : "w-full max-w-4xl mx-auto"}>
                  <p className="text-base leading-snug whitespace-pre-line mb-4">
                    {questionData.text}
                  </p>

                  <div className="space-y-3">
                    {questionData.choices.map((choice, index) => (
                      <label
                        key={index}
                        className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors text-sm ${
                          currentAnswer === index
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestionId?.toString()}`}
                          checked={currentAnswer === index}
                          onChange={() =>
                            handleAnswerSelect(currentQuestionId, index)
                          }
                          className="mt-1 mr-3"
                        />
                        <span className="flex-1">{choice}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-5 border-t border-gray-200">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0 && currentModule === 0 && currentSection === 0}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BsHouseDoor />
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-sm text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
                  <BsChevronRight />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Module review
                  </div>
                  <div className="text-xs text-gray-500">
                    {sections[currentSection]?.title || sections[currentSection]?.name} •{" "}
                    {sections[currentSection]?.modules[currentModule]?.title ||
                      sections[currentSection]?.modules[currentModule]?.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModuleReview(false)}
                  className="rounded-lg border border-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Back to questions
                </button>
              </div>

              <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                Review the questions in this module. Green = answered, gray = not answered,
                🚩 = flagged. When you’re ready, continue to the next module.
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-6">
                {sections[currentSection]?.modules[currentModule]?.questions.map(
                  (qId, idx) => {
                    const qStr = qId?.toString();
                    const isAnswered = answers[qStr] !== undefined;
                    const isFlaggedQ = flagged.has(qStr);
                    const isCurrent = qStr === currentQuestionId?.toString();

                    return (
                      <button
                        key={qStr}
                        type="button"
                        onClick={() => {
                          setShowModuleReview(false);
                          setCurrentQuestion(idx);
                          if (sessionId && token) {
                            setTimeout(() => saveProgress(), 100);
                          }
                        }}
                        className={`h-10 w-10 rounded text-sm font-semibold transition-colors ${
                          isCurrent
                            ? "bg-blue-600 text-white ring-2 ring-blue-300"
                            : isAnswered
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } ${isFlaggedQ ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {isFlaggedQ ? "🚩" : idx + 1}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={goToNextModuleAfterReview}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exam;
