const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const { connectDB } = require("../config/db");
const User = require("../models/User");

const bootstrapAdmin = async () => {
  console.log("🛠️  [Bootstrap] Starting initial Administrator account creation...");

  const connected = await connectDB();
  if (!connected) {
    console.error("❌ [Bootstrap] Cannot connect to database. Please verify MONGODB_URI in .env.");
    process.exit(1);
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const email = (process.env.ADMIN_EMAIL || "admin@fleetflow.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const name = process.env.ADMIN_NAME || "Administrator";

  try {
    const existing = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existing) {
      console.log(`ℹ️  [Bootstrap] Admin user already exists:`);
      console.log(`   - Username: ${existing.username}`);
      console.log(`   - Email: ${existing.email}`);
      console.log(`   - Role: ${existing.role}`);
      console.log(`   - Status: ${existing.status}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const admin = await User.create({
      username,
      email,
      password,
      name,
      role: "ADMIN",
      status: "Active"
    });

    console.log("✅ [Bootstrap] Administrator account created successfully!");
    console.log(`   - Username: ${admin.username}`);
    console.log(`   - Email: ${admin.email}`);
    console.log(`   - Role: ${admin.role}`);
    console.log(`   - User ID: ${admin._id}`);
    console.log("🔐 [Bootstrap] Password was securely hashed with bcrypt before saving to MongoDB Atlas.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ [Bootstrap] Error creating admin: ${error.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
};

bootstrapAdmin();
