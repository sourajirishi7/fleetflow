const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Load environment variables
dotenv.config();

const { connectDB, maskUri } = require("./src/config/db");
const { notFoundHandler, errorHandler } = require("./src/middleware/errorHandler");

// Route imports
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const vehicleRoutes = require("./src/routes/vehicleRoutes");
const driverRoutes = require("./src/routes/driverRoutes");
const tripRoutes = require("./src/routes/tripRoutes");
const fuelRoutes = require("./src/routes/fuelRoutes");
const maintenanceRoutes = require("./src/routes/maintenanceRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve existing static frontend files directly from root
app.use(express.static(__dirname));

// Health check endpoint
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const dbState = mongoose.connection.readyState;
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

  res.status(200).json({
    success: true,
    status: "UP",
    timestamp: new Date().toISOString(),
    database: {
      status: states[dbState] || "unknown",
      readyState: dbState,
      target: maskUri(process.env.MONGODB_URI)
    },
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

// REST API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Root route redirects to login if unauthenticated or serves index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 [Server] FleetFlow backend running on http://localhost:${PORT}`);
    console.log(`📁 [Frontend] Serving index.html, sstyle.css, and script.js`);
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
