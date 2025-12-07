import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import memoryRoutes from "./routes/memories.js";
import imageRoutes from "./routes/images.js";
import searchRoutes from "./routes/search.js";
import statsRoutes from "./routes/stats.js";
import tagRoutes from "./routes/tags.js";
import categoryRoutes from "./routes/categories.js";

dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_SECRET not set in .env file!");
  console.warn(
    "⚠️  Using default development secret. Change this in production!"
  );
  process.env.JWT_SECRET =
    "mid-development-secret-key-change-in-production-2024";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.ALLOWED_ORIGIN ||
  ""
)
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

// Default to localhost for development if no env var is set
if (allowedOrigins.length === 0) {
  allowedOrigins.push(
    "http://localhost:5173",
    "http://localhost:3001",
    "http://localhost:5174"
  );
}

console.log("🔐 CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      }
      // Allow all localhost variants
      else if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      }
      // Allow any local network IP (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
      else if (
        origin.match(
          /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i
        ) ||
        origin.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/)
      ) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - AFTER body parsing
app.use((req, res, next) => {
  console.log(`\n📥 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("   Body:", JSON.stringify(req.body).substring(0, 100));
  }
  next();
});

// Add security headers
app.use((req, res, next) => {
  // Allow API requests from any origin (CORS is already configured above)
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Health check endpoint (for Render deployment monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "MiD API is healthy and ready",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint (for deployment verification)
app.get("/", (req, res) => {
  res.status(200).json({
    message: "MiD API Server",
    version: "1.0.0",
    status: "running",
  });
});

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Handle browser probes and well-known requests
app.get("/.well-known/*", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Routes
console.log("🔌 Mounting routes...");
app.use("/api/auth", authRoutes);
console.log("✅ Auth routes mounted at /api/auth");
app.use("/api/memories", memoryRoutes);
console.log("✅ Memories routes mounted at /api/memories");
app.use("/api/images", imageRoutes);
console.log("✅ Images routes mounted at /api/images");
app.use("/api/search", searchRoutes);
console.log("✅ Search routes mounted at /api/search");
app.use("/api/stats", statsRoutes);
console.log("✅ Stats routes mounted at /api/stats");
app.use("/api/tags", tagRoutes);
console.log("✅ Tags routes mounted at /api/tags");
app.use("/api/categories", categoryRoutes);
console.log("✅ Categories routes mounted at /api/categories");

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "MiD API is running" });
});

// Catch-all 404 handler for debugging
app.use((req, res) => {
  console.error(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

app
  .listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ MiD API Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`\n📡 Access URLs:`);
    console.log(`   Local: http://localhost:${PORT}/api`);
    console.log(`   Network: http://<YOUR_IP>:${PORT}/api`);
    console.log(`\n🔐 CORS: Allowing localhost and all local network origins`);
    console.log(`✨ Ready to accept connections!\n`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(`\nTo fix this:`);
      console.error(`1. Kill the process using port ${PORT}:`);
      console.error(`   Windows: netstat -ano | findstr :${PORT}`);
      console.error(`   Then: taskkill /PID <PID> /F`);
      console.error(
        `\n2. Or change PORT in .env file to a different port (e.g., 3001)`
      );
      console.error(`   Then update API_BASE_URL in src/services/api.js\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });
