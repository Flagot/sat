import { Navigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const ProtectedRoute = ({ children }) => {
  const { user, loading, error } = useAppSelector((state) => state.auth);
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // If token expired, show message and redirect to login
  if (error && error.includes("expired")) {
    return <Navigate to="/login" replace state={{ message: error }} />;
  }

  return isAuthenticated ? children : <Navigate to="/landing" replace />;
};

export default ProtectedRoute;
