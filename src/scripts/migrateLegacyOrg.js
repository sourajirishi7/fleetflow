const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { connectDB } = require("../config/db");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const FuelEntry = require("../models/FuelEntry");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const Activity = require("../models/Activity");

async function migrateLegacyData() {
  console.log("🔄 [Migration] Checking legacy documents for organization assignment...");
  const connected = await connectDB();
  if (!connected) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  // Find or create default organization
  let defaultOrg = await Organization.findOne({ code: "DEFAULT" });
  if (!defaultOrg) {
    defaultOrg = await Organization.create({
      name: "FleetFlow Global Logistics",
      code: "DEFAULT"
    });
    console.log(`✅ [Migration] Created default organization: ${defaultOrg.name} (${defaultOrg._id})`);
  } else {
    console.log(`ℹ️ [Migration] Using existing default organization: ${defaultOrg.name} (${defaultOrg._id})`);
  }

  const orgId = defaultOrg._id;

  // Update legacy documents without organizationId
  const uRes = await User.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const vRes = await Vehicle.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const dRes = await Driver.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const tRes = await Trip.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const fRes = await FuelEntry.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const mRes = await MaintenanceRecord.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });
  const aRes = await Activity.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: orgId } });

  console.log("📊 [Migration] Summary of updated legacy documents:");
  console.log(`   - Users: ${uRes.modifiedCount}`);
  console.log(`   - Vehicles: ${vRes.modifiedCount}`);
  console.log(`   - Drivers: ${dRes.modifiedCount}`);
  console.log(`   - Trips: ${tRes.modifiedCount}`);
  console.log(`   - Fuel Entries: ${fRes.modifiedCount}`);
  console.log(`   - Maintenance Records: ${mRes.modifiedCount}`);
  console.log(`   - Activities: ${aRes.modifiedCount}`);

  await mongoose.connection.close();
  console.log("✅ [Migration] Completed successfully.");
  process.exit(0);
}

migrateLegacyData().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
