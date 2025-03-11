import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  loading: true,
  error: null,
};

// Async thunks for API calls
export const verifyToken = createAsyncThunk(
  "auth/verifyToken",
  async (_, { rejectWithValue }) => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      return null;
    }

    try {
      const res = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        return { user: data.user, token: storedToken };
      } else {
        const errorData = await res.json().catch(() => ({}));
        // Check if token is expired
        if (errorData.code === "TOKEN_EXPIRED" || res.status === 401) {
          localStorage.removeItem("token");
          return rejectWithValue("Session expired. Please login again.");
        }
        localStorage.removeItem("token");
        return null;
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("token");
      return null;
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      return { user: data.user, token: data.token };
    } catch (error) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/signup",
  async ({ email, password, name }, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.error || "Signup failed");
      }

      localStorage.setItem("token", data.token);
      return { user: data.user, token: data.token };
    } catch (error) {
      return rejectWithValue(error.message || "Signup failed");
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      state.user = null;
      state.token = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Verify token
    builder
      .addCase(verifyToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
        } else {
          state.user = null;
          state.token = null;
        }
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        // Set error message if token expired
        if (action.payload) {
          state.error = action.payload;
        }
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;

