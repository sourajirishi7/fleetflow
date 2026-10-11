const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const http = require("http");

const { app } = require("../server");
const { connectDB, maskUri } = require("../src/config/db");
const User = require("../src/models/User");
const Vehicle = require("../src/models/Vehicle");
const Driver = require("../src/models/Driver");
const Trip = require("../src/models/Trip");
const FuelEntry = require("../src/models/FuelEntry");
const MaintenanceRecord = require("../src/models/MaintenanceRecord");
const Activity = require("../src/models/Activity");

let testServer;
let baseUrl;

// Test Statistics
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? "- " + details : ""}`);
    failedTests++;
  }
}

// Helper to make HTTP requests against the test server
function request(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}

        // Extract cookies if any
        const setCookie = res.headers["set-cookie"];
        let cookieToken = null;
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
          const match = cookieStr.match(/fleetflow_token=([^;]+)/);
          if (match) cookieToken = match[1];
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          text: data,
          cookieToken
        });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 FLEETFLOW FULL-STACK AUTOMATED TEST SUITE");
  console.log("=======================================================\n");

  // 1. Database Connection & Masking
  console.log("▶️  Test Group 1: Database Connection & Credential Safety");
  const masked = maskUri("mongodb+srv://adminUser:SuperSecret123@cluster0.abc.mongodb.net/fleetflow");
  assert(!masked.includes("SuperSecret123") && masked.includes("******"), "maskUri securely hides database passwords");

  const connected = await connectDB();
  assert(connected === true, "MongoDB connection established successfully");

  // Start test server on random available port
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`  ℹ️  Test server running on ${baseUrl}`);
      resolve();
    });
  });

  // Health check test
  const healthRes = await request("GET", "/api/health");
  assert(healthRes.status === 200 && healthRes.data.status === "UP", "GET /api/health returns 200 UP status");
  assert(healthRes.data.database.status === "connected", "Health check reports database status as connected");

  // 2. Authentication & JWT Cookie Session Tests
  console.log("\n▶️  Test Group 2: Authentication & Authorization Flow");

  // Nonexistent user login
  const nonExistRes = await request("POST", "/api/auth/login", {}, {
    username: "nonexistent_user_999",
    password: "Password@123"
  });
  assert(nonExistRes.status === 401, "Login with nonexistent username returns 401 Unauthorized");

  // Incorrect password login
  const wrongPassRes = await request("POST", "/api/auth/login", {}, {
    username: "admin",
    password: "WrongPassword@123"
  });
  assert(wrongPassRes.status === 401, "Login with incorrect password returns 401 Unauthorized");

  // Admin successful login
  const adminLoginRes = await request("POST", "/api/auth/login", {}, {
    username: "admin",
    password: "Admin@12345"
  });
  assert(adminLoginRes.status === 200, "Admin login returns 200 OK");
  assert(adminLoginRes.data.user.role === "ADMIN", "Admin login response has role ADMIN");
  assert(adminLoginRes.cookieToken !== null, "Admin login sets secure fleetflow_token cookie");

  const adminCookie = `fleetflow_token=${adminLoginRes.cookieToken}`;
  const adminToken = adminLoginRes.data.token;

  // Verify GET /api/auth/me with cookie
  const meRes = await request("GET", "/api/auth/me", { Cookie: adminCookie });
  assert(meRes.status === 200 && meRes.data.data.username === "admin", "GET /api/auth/me authenticates via HTTP-only cookie");

  // Employee login
  const empLoginRes = await request("POST", "/api/auth/login", {}, {
    username: "employee1",
    password: "Employee@12345"
  });
  assert(empLoginRes.status === 200, "Employee login returns 200 OK");
  assert(empLoginRes.data.user.role === "EMPLOYEE", "Employee user has role EMPLOYEE");
  const empCookie = `fleetflow_token=${empLoginRes.cookieToken}`;

  // Unauthorized access test (no token)
  const unauthRes = await request("GET", "/api/vehicles");
  assert(unauthRes.status === 401, "Accessing protected route without credentials returns 401 Unauthorized");

  // Employee trying to access Admin-only route (POST /api/vehicles)
  const empForbiddenRes = await request("POST", "/api/vehicles", { Cookie: empCookie }, {
    id: "FL-FORBIDDEN",
    make: "Test",
    model: "Test",
    plate: "AP00XX9999",
    year: 2024
  });
  assert(empForbiddenRes.status === 403, "Employee blocked from Admin route with 403 Forbidden");

  // Employee trying to access User Management (GET /api/users)
  const empUsersForbidden = await request("GET", "/api/users", { Cookie: empCookie });
  assert(empUsersForbidden.status === 403, "Employee blocked from User Management with 403 Forbidden");

  // 3. User Management Tests (Admin CRUD & Deactivation)
  console.log("\n▶️  Test Group 3: User Management & Account Deactivation");

  const testEmpUsername = `emp_test_${Date.now()}`;
  const testEmpEmail = `${testEmpUsername}@fleetflow.local`;

  // Create new employee
  const createUserRes = await request("POST", "/api/users", { Cookie: adminCookie }, {
    username: testEmpUsername,
    email: testEmpEmail,
    password: "Password@12345",
    name: "Test Driver",
    role: "EMPLOYEE",
    phone: "9876543210"
  });
  assert(createUserRes.status === 201, "Admin creates new Employee document in MongoDB Atlas");
  const createdUserId = createUserRes.data.data.id || createUserRes.data.data._id;

  // Duplicate username validation
  const dupUserRes = await request("POST", "/api/users", { Cookie: adminCookie }, {
    username: testEmpUsername,
    email: "another@fleetflow.local",
    password: "Password@12345",
    name: "Duplicate User"
  });
  assert(dupUserRes.status === 409, "Duplicate username rejected with 409 Conflict");

  // Duplicate email validation
  const dupEmailRes = await request("POST", "/api/users", { Cookie: adminCookie }, {
    username: `unique_${Date.now()}`,
    email: testEmpEmail,
    password: "Password@12345",
    name: "Duplicate Email User"
  });
  assert(dupEmailRes.status === 409, "Duplicate email rejected with 409 Conflict");

  // Test that new user can log in
  const newLoginRes = await request("POST", "/api/auth/login", {}, {
    username: testEmpUsername,
    password: "Password@12345"
  });
  assert(newLoginRes.status === 200, "Newly created user can immediately authenticate");

  // Deactivate the new user account
  const deactRes = await request("PATCH", `/api/users/${createdUserId}/status`, { Cookie: adminCookie }, {
    status: "Inactive"
  });
  assert(deactRes.status === 200 && deactRes.data.data.status === "Inactive", "Admin successfully deactivates employee account in MongoDB");

  // Test that deactivated user is blocked from logging in
  const deactLoginRes = await request("POST", "/api/auth/login", {}, {
    username: testEmpUsername,
    password: "Password@12345"
  });
  assert(deactLoginRes.status === 403, "Deactivated account rejected at login with 403 Forbidden");

  // Clean up test user
  await User.findByIdAndDelete(createdUserId);

  // 4. Vehicle Management Tests
  console.log("\n▶️  Test Group 4: Vehicle Asset Management");

  const testVehicleId = "FL-TEST-99";
  const testPlate = "AP09TT9999";

  // Clean up any leftover test vehicle
  await Vehicle.findOneAndDelete({ id: testVehicleId });

  // Add vehicle
  const addVRes = await request("POST", "/api/vehicles", { Cookie: adminCookie }, {
    id: testVehicleId,
    make: "BharatBenz",
    model: "3528C",
    plate: testPlate,
    year: 2024,
    odometer: 15400,
    fuelType: "Diesel",
    status: "Active"
  });
  assert(addVRes.status === 201, "Vehicle document saved to MongoDB Atlas");

  // Verify duplicate plate rejected
  const dupPlateRes = await request("POST", "/api/vehicles", { Cookie: adminCookie }, {
    id: "FL-ANOTHER",
    make: "Tata",
    model: "Ace",
    plate: testPlate,
    year: 2023,
    odometer: 5000
  });
  assert(dupPlateRes.status === 409, "Duplicate vehicle license plate rejected with 409 Conflict");

  // Update vehicle
  const updateVRes = await request("PUT", `/api/vehicles/${testVehicleId}`, { Cookie: adminCookie }, {
    status: "Idle",
    odometer: 15800
  });
  assert(updateVRes.status === 200 && updateVRes.data.data.status === "Idle", "Vehicle updated in MongoDB Atlas");

  // Delete vehicle
  const delVRes = await request("DELETE", `/api/vehicles/${testVehicleId}`, { Cookie: adminCookie });
  assert(delVRes.status === 200, "Vehicle deleted from MongoDB Atlas");

  // 5. Driver Management & Two-Way Reassignment
  console.log("\n▶️  Test Group 5: Driver Management & Vehicle Assignment Sync");

  const testDriverId = "D999";
  await Driver.findOneAndDelete({ id: testDriverId });

  // Add Driver
  const addDRes = await request("POST", "/api/drivers", { Cookie: adminCookie }, {
    id: testDriverId,
    name: "Kiran Varma",
    license: "TS09 2024001122",
    phone: "9123456789",
    safety: 94,
    status: "Active"
  });
  assert(addDRes.status === 201, "Driver document created in MongoDB Atlas");

  // Assign driver to vehicle FL-103
  const assignRes = await request("PATCH", `/api/drivers/${testDriverId}/assign`, { Cookie: adminCookie }, {
    vehicleId: "FL-103"
  });
  assert(assignRes.status === 200, "Driver reassigned to FL-103");

  const updatedDriver = await Driver.findOne({ id: testDriverId });
  const updatedVehicle = await Vehicle.findOne({ id: "FL-103" });
  assert(
    updatedDriver.vehicleId === "FL-103" && updatedVehicle.driverId === testDriverId,
    "Two-way synchronization between driver and vehicle verified in database"
  );

  // Clean up test driver
  await Driver.findOneAndDelete({ id: testDriverId });
  await Vehicle.findOneAndUpdate({ id: "FL-103" }, { driverId: "D003" });

  // 6. Fuel & Cost Tracking
  console.log("\n▶️  Test Group 6: Fuel Logs & Odometer Validation");

  const fuelVehicle = await Vehicle.findOne({ id: "FL-101" });
  const currentOdo = fuelVehicle.odometer;

  // Reject lower odometer
  const badFuelRes = await request("POST", "/api/fuel", { Cookie: adminCookie }, {
    vehicleId: "FL-101",
    date: "2026-10-11",
    liters: 50,
    cost: 4700,
    odometer: currentOdo - 100 // Invalid lower reading
  });
  assert(badFuelRes.status === 400, "Fuel entry with lower odometer rejected with 400 Bad Request");

  // Valid fuel entry updates vehicle odometer
  const newOdo = currentOdo + 250;
  const goodFuelRes = await request("POST", "/api/fuel", { Cookie: adminCookie }, {
    vehicleId: "FL-101",
    date: "2026-10-11",
    liters: 45,
    cost: 4230,
    odometer: newOdo
  });
  assert(goodFuelRes.status === 201, "Fuel record saved to MongoDB Atlas");

  const refreshedVehicle = await Vehicle.findOne({ id: "FL-101" });
  assert(refreshedVehicle.odometer === newOdo, "Vehicle odometer in MongoDB automatically synchronized with fuel log");

  // 7-day summary
  const weeklyRes = await request("GET", "/api/fuel/weekly-summary", { Cookie: adminCookie });
  assert(weeklyRes.status === 200 && Array.isArray(weeklyRes.data.data), "GET /api/fuel/weekly-summary returns 7-day array");

  // 7. Maintenance Kanban & Status
  console.log("\n▶️  Test Group 7: Maintenance Kanban & Lifecycle");

  const maintRes = await request("POST", "/api/maintenance", { Cookie: adminCookie }, {
    vehicleId: "FL-102",
    type: "Brake Inspection",
    date: "2026-10-15",
    cost: 5400,
    priority: "High",
    notes: "Pre-trip mountain haul inspection"
  });
  assert(maintRes.status === 201, "Maintenance ticket created in MongoDB Atlas");
  const ticketId = maintRes.data.data.id;

  // Mark ticket as Completed
  const completeTicketRes = await request("PATCH", `/api/maintenance/${ticketId}/status`, { Cookie: adminCookie }, {
    status: "Completed"
  });
  assert(completeTicketRes.status === 200 && completeTicketRes.data.data.status === "Completed", "Maintenance ticket marked Completed in MongoDB Atlas");

  // Clean up
  await MaintenanceRecord.findOneAndDelete({ id: ticketId });

  // 8. Trips & Routes
  console.log("\n▶️  Test Group 8: Trips & Employee Permission Scoping");

  // Employee updates status of route R-203
  const tripStatusRes = await request("PATCH", "/api/trips/R-203/status", { Cookie: empCookie }, {
    status: "Completed"
  });
  assert(tripStatusRes.status === 200 && tripStatusRes.data.data.status === "Completed", "Employee successfully updates trip status");

  // 9. Dashboard Analytics
  console.log("\n▶️  Test Group 9: Dashboard Real-Time KPI Aggregations");

  const dashRes = await request("GET", "/api/dashboard/stats", { Cookie: adminCookie });
  assert(dashRes.status === 200, "GET /api/dashboard/stats returns 200 OK");
  assert(typeof dashRes.data.data.totalVehicles === "number", "Total vehicles count is numeric from database");
  assert(typeof dashRes.data.data.monthlyFuelSpend === "number", "Monthly fuel spend calculated from database");
  assert(typeof dashRes.data.data.statusBreakdown === "object", "Status breakdown percentages calculated");

  // 10. Logout
  console.log("\n▶️  Test Group 10: Session Termination / Logout");

  const logoutRes = await request("POST", "/api/auth/logout", { Cookie: adminCookie });
  assert(logoutRes.status === 200, "POST /api/auth/logout clears authentication session");

  // Teardown
  console.log("\n=======================================================");
  console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=======================================================\n");

  testServer.close();
  await mongoose.connection.close();

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  if (testServer) testServer.close();
  mongoose.connection.close().then(() => process.exit(1));
});
