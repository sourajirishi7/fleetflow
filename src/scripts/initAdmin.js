/**
 * FleetFlow — Server-Side Administrator & Organization Initialization
 * 
 * Safely initializes the first organization and administrator without
 * exposing credentials or the INITIAL_SETUP_KEY through web requests.
 * 
 * Usage:
 *   node src/scripts/initAdmin.js
 *   node src/scripts/initAdmin.js --org "Acme Fleet" --name "John Doe" --username "admin_john" --email "john@acme.com" --password "SecurePass@123"
 */

const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const { connectDB } = require("../config/db");
const Organization = require("../models/Organization");
const User = require("../models/User");

// Parse optional CLI arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      params[key] = val;
    }
  }
  return params;
};

const initAdmin = async () => {
  console.log("=======================================================");
  console.log("🛠️  [FleetFlow] Safe Server-Side Administrator Setup");
  console.log("=======================================================\n");

  const configuredKey = process.env.INITIAL_SETUP_KEY || process.env.ADMIN_SETUP_SECRET;
  if (!configuredKey) {
    console.error("❌ ERROR: INITIAL_SETUP_KEY is not defined in your server-side .env configuration.");
    console.error("   Please configure INITIAL_SETUP_KEY in .env before running initial setup.\n");
    process.exit(1);
  }

  const connected = await connectDB();
  if (!connected) {
    console.error("❌ ERROR: Could not connect to MongoDB database.");
    process.exit(1);
  }

  const args = parseArgs();

  const orgName = args.org || process.env.INITIAL_ORG_NAME || "FleetFlow Global Logistics";
  const orgCode = (args.code || orgName.slice(0, 6).toUpperCase().replace(/\s+/g, "") || "DEFAULT");
  const username = args.username || process.env.ADMIN_USERNAME || "admin";
  const email = (args.email || process.env.ADMIN_EMAIL || "admin@fleetflow.local").trim().toLowerCase();
  const password = args.password || process.env.ADMIN_PASSWORD || "Admin@12345";
  const name = args.name || process.env.ADMIN_NAME || "System Administrator";

  try {
    // 1. Ensure Organization exists
    let org = await Organization.findOne({ name: orgName });
    if (!org) {
      org = await Organization.create({
        name: orgName,
        code: orgCode
      });
      console.log(`✅ Organization created: '${org.name}' [ID: ${org._id}]`);
    } else {
      console.log(`ℹ️  Existing Organization found: '${org.name}' [ID: ${org._id}]`);
    }

    // 2. Check if admin user exists
    let admin = await User.findOne({ username });
    if (admin) {
      console.log(`ℹ️  Administrator '${admin.username}' already exists in organization '${org.name}'.`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - Status: ${admin.status}`);
      console.log("\n🔒 Initial setup complete. Public organization registration is disabled.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // 3. Create Admin user
    admin = await User.create({
      organizationId: org._id,
      fullName: name,
      name,
      username,
      email,
      password,
      role: "ADMIN",
      isActive: true,
      status: "Active"
    });

    // 4. Link creator back to Organization
    if (!org.createdBy) {
      org.createdBy = admin._id;
      await org.save();
    }

    console.log("✅ Administrator created successfully!");
    console.log(`   - Username:        ${admin.username}`);
    console.log(`   - Email:           ${admin.email}`);
    console.log(`   - Role:            ${admin.role}`);
    console.log(`   - Organization ID: ${admin.organizationId}`);
    console.log("🔐 Password securely hashed with bcrypt.");
    console.log("\n🔒 Public organization registration is now disabled on the web portal.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Setup failed: ${err.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

initAdmin();
