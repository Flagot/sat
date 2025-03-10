import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/landing";

function App() {
  return (
    <div className="flex">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
