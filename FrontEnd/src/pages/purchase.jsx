import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const Purchase = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const token = useAppSelector((state) => state.auth.token);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId || !token) return;

      try {
        // Fetch exam details
        const examRes = await fetch(`/api/exams/${examId}`);
        if (examRes.ok) {
          const examData = await examRes.json();
          setExam(examData);

          // Check if already purchased
          const purchaseRes = await fetch(`/api/exam-purchases/check/${examId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (purchaseRes.ok) {
            const purchaseData = await purchaseRes.json();
            if (purchaseData.purchased && purchaseData.purchase?.unlocked) {
              // Already purchased and unlocked, redirect to exam
              navigate(`/exam/${examId}`);
            }
          }
        } else {
          setError("Exam not found");
        }
      } catch (err) {
        console.error("Failed to fetch exam:", err);
        setError("Failed to load exam details");
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, token, navigate]);

  const handlePurchase = async () => {
    if (!token || !examId) {
      setError("Please login to purchase");
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const res = await fetch("/api/exam-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ examId }),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      let responseData;

      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json();
      } else {
        // If not JSON, read as text to see what we got
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError(`Server error: ${res.status} ${res.statusText}`);
        setPurchasing(false);
        return;
      }
      
      if (res.ok) {
        setSuccess(true);
        // Redirect to exam page after 2 seconds
        setTimeout(() => {
          navigate(`/exam/${examId}`);
        }, 2000);
      } else {
        // Show detailed error message
        const errorMessage = responseData.error || responseData.message || "Failed to purchase exam";
        setError(errorMessage);
        console.error("Purchase failed:", responseData);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      if (err.message.includes("JSON")) {
        setError("Server returned an invalid response. Please check your connection.");
      } else {
        setError("An error occurred during purchase: " + err.message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading exam details...</div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Purchase Exam</h1>
          <p className="text-blue-100">Unlock access to this exam</p>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-bold">Purchase Successful!</p>
                <p>Your exam has been unlocked. Redirecting to exam...</p>
              </div>
            </div>
          ) : (
            <>
              {exam && (
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-4">{exam.title}</h2>
                  {exam.description && (
                    <p className="text-gray-600 mb-4">{exam.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-500 mb-1">Category</p>
                      <p className="font-semibold">{exam.category || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-500 mb-1">Difficulty</p>
                      <p className="font-semibold">{exam.difficulty || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-500 mb-1">Duration</p>
                      <p className="font-semibold">
                        {exam.duration ? `${exam.duration} minutes` : "N/A"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm text-gray-500 mb-1">Questions</p>
                      <p className="font-semibold">
                        {exam.totalQuestions || exam.questionsCount || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                  <h3 className="font-semibold text-lg mb-2">Payment Method</h3>
                  <p className="text-gray-600">
                    For now, purchases are processed automatically. Click "Purchase" to unlock this exam.
                  </p>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {exam?.unlocked ? "Free" : "$0.00"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      (Payment integration coming soon)
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="flex-1 bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {purchasing ? "Processing..." : "Purchase & Unlock"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Purchase;
