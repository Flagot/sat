import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "./store/hooks";
import SideBar from "./components/sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/home";
import Ai from "./pages/ai";
import Score from "./pages/score";
import ScoreDetail from "./pages/scoreDetail";
import Flash from "./pages/flash";
import FlashDeck from "./pages/flashDeck";
import Order from "./pages/order";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Exam from "./pages/exam";
import Purchase from "./pages/purchase";
import Landing from "./pages/landing";

function AppContent() {
  const isAuthenticated = !!useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const isExamPage = location.pathname.startsWith("/exam");
  const isLandingPage =
    location.pathname === "/" || location.pathname === "/landing";

  return (
    <div className="flex">
      {isAuthenticated && !isExamPage && !isLandingPage && <SideBar />}
      <div className="flex-1">
        <Routes>
          {/* Public landing page (default) */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <Ai />
              </ProtectedRoute>
            }
          />
          <Route
            path="/score"
            element={
              <ProtectedRoute>
                <Score />
              </ProtectedRoute>
            }
          />
          <Route
            path="/score/:sessionId"
            element={
              <ProtectedRoute>
                <ScoreDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flash"
            element={
              <ProtectedRoute>
                <Flash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flash/:categoryId"
            element={
              <ProtectedRoute>
                <FlashDeck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order"
            element={
              <ProtectedRoute>
                <Order />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId"
            element={
              <ProtectedRoute>
                <Exam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase/:examId"
            element={
              <ProtectedRoute>
                <Purchase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />}
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
