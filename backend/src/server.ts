import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import subscriptionRoutes from "./routes/subscription";
import {
  ensureDatabaseExists,
  closeConnection,
  setupPeriodicCleanup,
  setupCheckoutSessionMonitoring,
  triggerCheckoutSessionCheck,
} from "./db";

dotenv.config({
  path: ".env",
});

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database and setup
const initializeServer = async () => {
  try {
    await ensureDatabaseExists();
    setupPeriodicCleanup();
    setupCheckoutSessionMonitoring();
    console.log("🚀 Server initialization complete");
  } catch (error) {
    console.error("❌ Server initialization failed:", error);
    process.exit(1);
  }
};

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/subscription", subscriptionRoutes);

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Manual trigger endpoint for testing checkout session cron job
app.post("/api/test/checkout-sessions", async (req: Request, res: Response) => {
  try {
    await triggerCheckoutSessionCheck();
    res.json({
      message: "Checkout session check triggered manually",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error triggering checkout session check:", error);
    res.status(500).json({
      error: "Failed to trigger checkout session check",
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler for API routes
app.use("/api/*", (req: Request, res: Response) => {
  res.status(404).json({ error: "API endpoint not found" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(
    `Manual trigger: http://localhost:${PORT}/api/test/checkout-sessions`
  );
});

// Initialize server after it's listening
initializeServer();

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 ${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log("✅ HTTP server closed");

    try {
      // Close database connections
      await closeConnection();
      console.log("✅ Database connections closed");

      console.log("🚀 Server shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Handle different shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT (Ctrl+C)"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("Uncaught Exception");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("Unhandled Rejection");
});
