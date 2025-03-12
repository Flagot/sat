const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("./middleware/mongoSanitize");
const welcome = require("./models/welcom");
// Ensure all models are loaded before routes
require("./models/questionsModel");
require("./models/examModel");
require("./models/sectionModel");
require("./models/moduleModel");
require("./models/examSectionModuleModel");
require("./models/userSessionModel");
const authRoutes = require("./routes/auth");
const flagsRoutes = require("./routes/flags");
const examsRoutes = require("./routes/exams");
const sectionsRoutes = require("./routes/sections");
const modulesRoutes = require("./routes/modules");
const questionsRoutes = require("./routes/questions");
const examSessionsRoutes = require("./routes/examSessions");
const examPurchasesRoutes = require("./routes/examPurchases");
const testRoutes = require("./routes/test");
const aiRoutes = require("./routes/ai");
const flashcardsRoutes = require("./routes/flashcards");
const examSectionModulesRoutes = require("./routes/examSectionModules");

const app = express();

// Security middleware - Helmet for HTTP headers protection
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
  })
);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser with size limit
app.use(express.json({ limit: "10mb" })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies

// Data sanitization against NoSQL injection attacks (Express 5 compatible)
app.use(mongoSanitize);

// Auth routes
app.use("/api/auth", authRoutes);

// Flags routes
app.use("/api/flags", flagsRoutes);

// Exam routes
app.use("/api/exams", examsRoutes);

// Section routes
app.use("/api/sections", sectionsRoutes);

// Module routes
app.use("/api/modules", modulesRoutes);

// Question routes
app.use("/api/questions", questionsRoutes);

// Exam session routes
app.use("/api/exam-sessions", examSessionsRoutes);

// Exam purchase routes
app.use("/api/exam-purchases", examPurchasesRoutes);
console.log("✅ Exam purchases routes registered at /api/exam-purchases");

// AI routes (Groq)
app.use("/api/ai", aiRoutes);
console.log("✅ AI routes registered at /api/ai");

// Flashcards routes
app.use("/api/flashcards", flashcardsRoutes);
console.log("✅ Flashcards routes registered at /api/flashcards");

// Exam Section Module routes
app.use("/api/exam-section-modules", examSectionModulesRoutes);
console.log("✅ Exam Section Module routes registered at /api/exam-section-modules");

// Test routes (for debugging - remove in production)
app.use("/api/test", testRoutes);

app.get("/api", async (req, res) => {
  const mssg = await welcome.find({});
  res.json(mssg);
});

app.post("/api/post", async (req, res) => {
  try {
    let welcomData = req.body;
    const welcom = await welcome.create(welcomData);
    res.status(201).json({
      message: " welcom created successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler for API routes (must be before error handler, but after all routes)
app.use((req, res, next) => {
  // Only handle API routes that weren't matched
  if (req.path.startsWith("/api/")) {
    console.log("404 - Route not found:", req.method, req.originalUrl);
    return res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  }
  next();
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("connected to db & Listining on port 4000:");
    });
  })
  .catch((err) => {
    console.log(err);
  });
