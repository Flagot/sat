import React, { useState } from "react";

const ToggleButton = ({
  labels = ["On", "Off"],
  initialState = false,
  onToggle,
  className = "",
}) => {
  const [toggled, setToggled] = useState(initialState);

  const handleClick = () => {
    setToggled((prev) => {
      const newState = !prev;
      if (onToggle) onToggle(newState);
      return newState;
    });
  };

  return (
    <button
      className={`p-2 rounded ${
        toggled ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700"
      } ${className}`}
      onClick={handleClick}
    >
      {labels[toggled ? 0 : 1]}
    </button>
  );
};

export default ToggleButton;
