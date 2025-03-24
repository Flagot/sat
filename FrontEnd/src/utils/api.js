/**
 * API utility functions with automatic token expiration handling
 */

import store from "../store/store";
import { logout } from "../store/slices/authSlice";

/**
 * Enhanced fetch wrapper that handles token expiration
 * Automatically logs out user if token is expired
 */
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      // If token is expired, clear it and logout
      if (errorData.code === "TOKEN_EXPIRED" || errorData.code === "INVALID_TOKEN") {
        localStorage.removeItem("token");
        store.dispatch(logout());
        
        // Redirect to login if we're not already there
        if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/signup")) {
          window.location.href = "/login";
        }
      }
      
      throw new Error(errorData.error || "Session expired. Please login again.");
    }

    return response;
  } catch (error) {
    // Re-throw the error so calling code can handle it
    throw error;
  }
};

/**
 * Helper to check if error is due to token expiration
 */
export const isTokenExpiredError = (error) => {
  return (
    error?.message?.includes("expired") ||
    error?.message?.includes("Session expired") ||
    error?.code === "TOKEN_EXPIRED"
  );
};
