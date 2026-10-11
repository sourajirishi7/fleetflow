const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const { connectDB } = require("../config/db");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const FuelEntry = require("../models/FuelEntry");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const Activity = require("../models/Activity");

const initialVehicles = [
  { id: "FL-101", make: "Tata", model: "Prima 4025", plate: "AP09AB1234", year: 2023, odometer: 84210, fuelType: "Diesel", status: "Active", driverId: "D001", lastService: "2026-06-12", nextService: "2026-09-12" },
  { id: "FL-102", make: "Ashok Leyland", model: "4825", plate: "AP09CD4521", year: 2022, odometer: 121450, fuelType: "Diesel", status: "Active", driverId: "D002", lastService: "2026-05-20", nextService: "2026-08-20" },
  { id: "FL-103", make: "Mahindra", model: "Bolero Pickup", plate: "AP09EF6712", year: 2024, odometer: 31890, fuelType: "Diesel", status: "Active", driverId: "D003", lastService: "2026-07-02", nextService: "2026-10-02" },
  { id: "FL-104", make: "Tata", model: "Ace", plate: "AP09GH8890", year: 2021, odometer: 156780, fuelType: "Diesel", status: "Offline", driverId: "D004", lastService: "2026-04-18", nextService: "2026-07-18" },
  { id: "FL-105", make: "Force", model: "Traveller", plate: "AP09JK3421", year: 2023, odometer: 67440, fuelType: "Diesel", status: "Active", driverId: "D005", lastService: "2026-06-28", nextService: "2026-09-28" },
  { id: "FL-106", make: "Tata", model: "Ultra", plate: "AP09LM7865", year: 2022, odometer: 98420, fuelType: "Diesel", status: "In Shop", driverId: "D006", lastService: "2026-03-10", nextService: "2026-08-10" },
  { id: "FL-107", make: "Mahindra", model: "Furio", plate: "AP09NP9182", year: 2024, odometer: 22910, fuelType: "Diesel", status: "Active", driverId: "D007", lastService: "2026-07-22", nextService: "2026-10-22" },
  { id: "FL-108", make: "Isuzu", model: "D-Max", plate: "AP09QR5523", year: 2023, odometer: 54120, fuelType: "Diesel", status: "Idle", driverId: "D008", lastService: "2026-06-05", nextService: "2026-09-05" }
];

const initialDrivers = [
  { id: "D001", name: "Sarah Johnson", license: "TG09 2021001456", phone: "9876543210", status: "Active", safety: 96, vehicleId: "FL-101" },
  { id: "D002", name: "Michael Brown", license: "AP07 2019008832", phone: "9848012345", status: "Active", safety: 91, vehicleId: "FL-102" },
  { id: "D003", name: "David Wilson", license: "TS08 2022011098", phone: "9012345678", status: "Active", safety: 88, vehicleId: "FL-103" },
  { id: "D004", name: "Priya Sharma", license: "TG09 2018012234", phone: "9988776655", status: "Off-Duty", safety: 93, vehicleId: "FL-104" },
  { id: "D005", name: "Rahul Kumar", license: "AP09 2020007761", phone: "9123456780", status: "Active", safety: 85, vehicleId: "FL-105" },
  { id: "D006", name: "Ananya Reddy", license: "TS10 2023014450", phone: "9000011122", status: "Off-Duty", safety: 97, vehicleId: "FL-106" },
  { id: "D007", name: "James Anderson", license: "KA03 2017003344", phone: "8899001122", status: "Active", safety: 82, vehicleId: "FL-107" },
  { id: "D008", name: "Arjun Patel", license: "GJ01 2021005566", phone: "9765432109", status: "Active", safety: 90, vehicleId: "FL-108" }
];

const initialFuel = [
  { id: "F01", date: "2026-08-23", vehicleId: "FL-101", liters: 120, cost: 11280, odometer: 84210 },
  { id: "F02", date: "2026-08-22", vehicleId: "FL-102", liters: 140, cost: 13160, odometer: 121450 },
  { id: "F03", date: "2026-08-21", vehicleId: "FL-105", liters: 68, cost: 6392, odometer: 67440 },
  { id: "F04", date: "2026-08-20", vehicleId: "FL-107", liters: 95, cost: 8930, odometer: 22910 },
  { id: "F05", date: "2026-08-19", vehicleId: "FL-103", liters: 42, cost: 3948, odometer: 31890 },
  { id: "F06", date: "2026-08-18", vehicleId: "FL-108", liters: 55, cost: 5170, odometer: 54120 },
  { id: "F07", date: "2026-08-17", vehicleId: "FL-101", liters: 108, cost: 10152, odometer: 83180 },
  { id: "F08", date: "2026-08-16", vehicleId: "FL-106", liters: 90, cost: 8460, odometer: 98420 },
  { id: "F09", date: "2026-08-15", vehicleId: "FL-102", liters: 132, cost: 12408, odometer: 120210 },
  { id: "F10", date: "2026-08-14", vehicleId: "FL-104", liters: 28, cost: 2632, odometer: 156780 },
  { id: "F11", date: "2026-08-12", vehicleId: "FL-105", liters: 61, cost: 5734, odometer: 66890 }
];

const initialMaintenance = [
  { id: "M01", vehicleId: "FL-104", type: "Engine Service", date: "2026-08-10", cost: 18500, priority: "High", status: "Overdue", notes: "Check-in completed at garage" },
  { id: "M02", vehicleId: "FL-106", type: "Brake Inspection", date: "2026-08-12", cost: 6200, priority: "High", status: "Overdue", notes: "Squeal reported on downhill runs" },
  { id: "M03", vehicleId: "FL-102", type: "Oil Change", date: "2026-08-20", cost: 3400, priority: "Medium", status: "Overdue", notes: "Due at 120,000 km" },
  { id: "M04", vehicleId: "FL-101", type: "Tire Rotation", date: "2026-08-25", cost: 2800, priority: "Medium", status: "Upcoming", notes: "Front axle wear" },
  { id: "M05", vehicleId: "FL-105", type: "AC Service", date: "2026-08-26", cost: 4500, priority: "Low", status: "Upcoming", notes: "Cabin cooling check" },
  { id: "M06", vehicleId: "FL-107", type: "Battery Replacement", date: "2026-08-28", cost: 9200, priority: "Medium", status: "Upcoming", notes: "Slow crank in mornings" },
  { id: "M07", vehicleId: "FL-108", type: "Oil Change", date: "2026-08-29", cost: 3100, priority: "Low", status: "Upcoming", notes: "Routine" },
  { id: "M08", vehicleId: "FL-103", type: "Tire Rotation", date: "2026-08-05", cost: 2400, priority: "Low", status: "Completed", notes: "Done at city workshop" },
  { id: "M09", vehicleId: "FL-101", type: "Oil Change", date: "2026-07-22", cost: 3600, priority: "Medium", status: "Completed", notes: "Filter replaced" },
  { id: "M10", vehicleId: "FL-105", type: "Brake Inspection", date: "2026-07-18", cost: 5100, priority: "High", status: "Completed", notes: "Pads replaced" }
];

const initialRoutes = [
  { id: "R-201", vehicleId: "FL-101", driverId: "D001", start: "Hyderabad", end: "Vijayawada", distance: 275, duration: "5h 20m", status: "Completed" },
  { id: "R-202", vehicleId: "FL-102", driverId: "D002", start: "Hyderabad", end: "Warangal", distance: 148, duration: "3h 10m", status: "Completed" },
  { id: "R-203", vehicleId: "FL-101", driverId: "D001", start: "Vijayawada", end: "Guntur", distance: 36, duration: "55m", status: "Completed" },
  { id: "R-204", vehicleId: "FL-105", driverId: "D005", start: "Hyderabad", end: "Bengaluru", distance: 569, duration: "9h 40m", status: "On Time" },
  { id: "R-205", vehicleId: "FL-107", driverId: "D007", start: "Secunderabad", end: "Nizamabad", distance: 175, duration: "3h 45m", status: "On Time" },
  { id: "R-206", vehicleId: "FL-103", driverId: "D003", start: "Hyderabad", end: "Karimnagar", distance: 162, duration: "3h 20m", status: "Delayed" },
  { id: "R-207", vehicleId: "FL-108", driverId: "D008", start: "Hyderabad", end: "Khammam", distance: 193, duration: "4h 05m", status: "Idle" },
  { id: "R-208", vehicleId: "FL-101", driverId: "D001", start: "Hyderabad", end: "Visakhapatnam", distance: 620, duration: "11h 15m", status: "On Time" },
  { id: "R-209", vehicleId: "FL-102", driverId: "D002", start: "Warangal", end: "Hyderabad", distance: 148, duration: "3h 05m", status: "Completed" },
  { id: "R-210", vehicleId: "FL-106", driverId: "D006", start: "Hyderabad", end: "Nagpur", distance: 501, duration: "8h 50m", status: "Cancelled" }
];

const initialActivities = [
  { icon: "🔧", text: "Vehicle FL-104 checked into the garage", time: "12 min ago", status: "Alert" },
  { icon: "✅", text: "Sarah Johnson completed Route R-203", time: "28 min ago", status: "On-Time" },
  { icon: "🚚", text: "Vehicle FL-101 started Route R-208", time: "45 min ago", status: "Active" },
  { icon: "⚠️", text: "Maintenance reminder generated for FL-106", time: "1 hr ago", status: "Warning" },
  { icon: "👤", text: "Driver Michael Brown was assigned to FL-102", time: "2 hr ago", status: "Info" },
  { icon: "⛽", text: "Fuel entry added for FL-102", time: "3 hr ago", status: "Info" },
  { icon: "⏸️", text: "Vehicle FL-108 marked as idle", time: "4 hr ago", status: "Idle" }
];

const seedData = async () => {
  console.log("🌱 [Seed] Connecting to MongoDB...");
  const connected = await connectDB();
  if (!connected) {
    console.error("❌ [Seed] Cannot connect to database.");
    process.exit(1);
  }

  try {
    // 1. Ensure Admin exists
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    let admin = await User.findOne({ username: adminUsername });
    if (!admin) {
      admin = await User.create({
        username: adminUsername,
        email: process.env.ADMIN_EMAIL || "admin@fleetflow.local",
        password: process.env.ADMIN_PASSWORD || "Admin@12345",
        name: process.env.ADMIN_NAME || "Admin User",
        role: "ADMIN",
        status: "Active"
      });
      console.log(`✅ [Seed] Created Admin user: ${admin.username}`);
    }

    // 2. Ensure Employee exists
    let employee = await User.findOne({ username: "employee1" });
    if (!employee) {
      employee = await User.create({
        username: "employee1",
        email: "sarah.driver@fleetflow.local",
        password: "Employee@12345",
        name: "Sarah Johnson",
        role: "EMPLOYEE",
        status: "Active",
        phone: "9876543210",
        driverId: "D001"
      });
      console.log(`✅ [Seed] Created Employee user: ${employee.username} (driverId: D001)`);
    }

    // 3. Vehicles
    for (const v of initialVehicles) {
      await Vehicle.findOneAndUpdate({ id: v.id }, v, { upsert: true, new: true });
    }
    console.log(`✅ [Seed] ${initialVehicles.length} vehicles verified/seeded.`);

    // 4. Drivers
    for (const d of initialDrivers) {
      await Driver.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
    }
    console.log(`✅ [Seed] ${initialDrivers.length} drivers verified/seeded.`);

    // 5. Fuel
    for (const f of initialFuel) {
      await FuelEntry.findOneAndUpdate({ id: f.id }, f, { upsert: true, new: true });
    }
    console.log(`✅ [Seed] ${initialFuel.length} fuel entries verified/seeded.`);

    // 6. Maintenance
    for (const m of initialMaintenance) {
      await MaintenanceRecord.findOneAndUpdate({ id: m.id }, m, { upsert: true, new: true });
    }
    console.log(`✅ [Seed] ${initialMaintenance.length} maintenance records verified/seeded.`);

    // 7. Routes / Trips
    for (const r of initialRoutes) {
      await Trip.findOneAndUpdate({ id: r.id }, r, { upsert: true, new: true });
    }
    console.log(`✅ [Seed] ${initialRoutes.length} trips verified/seeded.`);

    // 8. Activities
    const countAct = await Activity.countDocuments();
    if (countAct === 0) {
      await Activity.insertMany(initialActivities);
      console.log(`✅ [Seed] ${initialActivities.length} activities seeded.`);
    }

    console.log("🎉 [Seed] Seeding completed successfully!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ [Seed] Error seeding data:", err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
