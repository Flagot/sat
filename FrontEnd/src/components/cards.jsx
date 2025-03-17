import React from "react";
import { useNavigate } from "react-router-dom";

const Card = ({ title, description, image, examId, sessionId, isActive, score, unlocked, purchased }) => {
  const navigate = useNavigate();

  const handleStartTest = () => {
    // If this is a past exam (Done), go to specific score detail page
    if (description?.toLowerCase().includes("done")) {
      if (sessionId) {
        navigate(`/score/${sessionId}`);
      } else {
        navigate("/score");
      }
      return;
    }

    // If exam is locked (not unlocked and not purchased), go to purchase page
    if (!unlocked && !purchased && description === "Locked") {
      navigate(`/purchase/${examId || "default-exam-id"}`);
      return;
    }
    navigate(`/exam/${examId || "default-exam-id"}`);
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden basis-[calc(33.333%-1rem)]">
      <div className="bg-gray-300">
        <h1 className="p-3 font-semibold">{title || "Exam"}</h1>
      </div>
      <div className="p-4 flex gap-2">
        <span
          className={`border rounded px-2 py-1 text-sm ${
            isActive
              ? "bg-yellow-100 border-yellow-300 text-yellow-800"
              : description?.toLowerCase().includes("done")
              ? "bg-blue-100 border-blue-300 text-blue-800"
              : description === "Purchased" || description === "Free"
              ? "bg-green-100 border-green-300 text-green-800"
              : "bg-gray-100 border-gray-300 text-gray-800"
          }`}
        >
          {description}
        </span>
      </div>
      <div className="flex justify-end p-3">
        <button
          onClick={handleStartTest}
          className={`rounded pl-4 pr-4 pt-1 pb-1 text-white transition-colors cursor-pointer ${
            isActive
              ? "bg-yellow-500 hover:bg-yellow-600"
              : description === "Locked"
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-blue-400 hover:bg-blue-500"
          }`}
        >
          {isActive
            ? "Resume Test"
            : description === "Locked"
            ? "Purchase"
            : description?.toLowerCase().includes("done")
            ? "View Score"
            : "Start Test"}
        </button>
      </div>
    </div>
  );
};

export default Card;
