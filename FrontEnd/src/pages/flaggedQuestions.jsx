import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { BsFlagFill, BsChevronLeft } from "react-icons/bs";

const FlaggedQuestions = () => {
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFlaggedQuestions = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch("/api/flags", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setFlaggedQuestions(data);
        } else {
          console.error("Failed to load flagged questions");
        }
      } catch (error) {
        console.error("Error loading flagged questions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFlaggedQuestions();
  }, [token, navigate]);

  const handleUnflag = async (questionId) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/flags/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setFlaggedQuestions((prev) =>
          prev.filter((fq) => fq.questionId._id !== questionId)
        );
      } else {
        alert("Failed to unflag question");
      }
    } catch (error) {
      console.error("Error unflagging question:", error);
      alert("Failed to unflag question");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading flagged questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
            >
              <BsChevronLeft className="text-2xl" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BsFlagFill className="text-yellow-500" />
                Flagged Questions
              </h1>
              <p className="text-gray-600 mt-1">
                {flaggedQuestions.length} question{flaggedQuestions.length !== 1 ? "s" : ""} flagged
              </p>
            </div>
          </div>
        </div>

        {/* Flagged Questions List */}
        {flaggedQuestions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <BsFlagFill className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No Flagged Questions
            </h2>
            <p className="text-gray-500">
              Questions you flag during exams will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {flaggedQuestions.map((flaggedQ) => {
              const question = flaggedQ.questionId;
              const exam = flaggedQ.examId;
              const section = flaggedQ.sectionId;
              const module = flaggedQ.moduleId;

              return (
                <div
                  key={flaggedQ._id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <BsFlagFill className="text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {exam?.title || "Exam"} - {section?.title || "Section"} - {module?.title || "Module"}
                        </span>
                      </div>
                      {question?.questionText && (
                        <p className="text-lg font-medium mb-2">
                          {question.questionText}
                        </p>
                      )}
                      {question?.description && (
                        <p className="text-gray-700 whitespace-pre-line mb-4">
                          {question.description}
                        </p>
                      )}
                      {question?.choices && question.choices.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {question.choices.map((choice, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded border ${
                                choice.isCorrect
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + index)}:
                              </span>
                              {choice.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {flaggedQ.notes && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm font-medium text-yellow-800 mb-1">
                            Your Notes:
                          </p>
                          <p className="text-sm text-yellow-700">{flaggedQ.notes}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-4">
                        Flagged on: {new Date(flaggedQ.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnflag(question?._id)}
                      className="ml-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Unflag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlaggedQuestions;

