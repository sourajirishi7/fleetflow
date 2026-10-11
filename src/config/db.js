const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");

/**
 * Mask MongoDB URI credentials for safe logging
 */
const maskUri = (uri) => {
  if (!uri) return "[NOT CONFIGURED]";
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, "$1******$3");
  } catch {
    return "[MASKED]";
  }
};

/**
 * Connect to MongoDB Atlas / persistent database
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ [Database] ERROR: MONGODB_URI environment variable is not defined!");
    console.error("👉 Please set MONGODB_URI in your .env file or environment.");
    return false;
  }

  try {
    const masked = maskUri(uri);
    console.log(`📡 [Database] Connecting to MongoDB: ${masked}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ [Database] MongoDB Connected: host=${conn.connection.host}, database=${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`❌ [Database] Connection failed: ${error.message}`);
    console.error("👉 Check your network, Atlas IP Whitelist (0.0.0.0/0 or current IP), and credentials.");
    return false;
  }
};

/**
 * Handle graceful shutdown
 */
const handleGracefulShutdown = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("🔒 [Database] Mongoose connection closed due to app termination");
    }
  } catch (err) {
    console.error("Error closing Mongoose connection:", err);
  }
};

process.on("SIGINT", async () => {
  await handleGracefulShutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await handleGracefulShutdown();
  process.exit(0);
});

module.exports = {
  connectDB,
  maskUri,
  handleGracefulShutdown
};
