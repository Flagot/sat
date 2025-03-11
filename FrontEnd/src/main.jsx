import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { verifyToken } from "./store/slices/authSlice";

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
