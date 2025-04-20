import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { verifyToken } from "./store/slices/authSlice";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// In production deployments (e.g., Vercel), route relative /api calls to backend host.
if (import.meta.env.PROD && apiBaseUrl && typeof window !== "undefined") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(`${apiBaseUrl}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

// Component to verify token on app load
const AuthInitializer = () => {
  useEffect(() => {
    store.dispatch(verifyToken());
  }, []);

  return null;
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthInitializer />
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
