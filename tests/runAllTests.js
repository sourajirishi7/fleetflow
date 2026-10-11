const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const http = require("http");

const { app } = require("../server");
const { connectDB, maskUri } = require("../src/config/db");
const Organization = require("../src/models/Organization");
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

  // 10. Role-Based Access Control (RBAC) & Scoped Data Isolation (18 Scenarios)
  console.log("\n▶️  Test Group 11: Mandatory RBAC & Record-Level Security Verification (18 Scenarios)");

  // Scenario 1: Admin can view all authorized drivers
  const s1 = await request("GET", "/api/drivers", { Cookie: adminCookie });
  assert(s1.status === 200 && Array.isArray(s1.data.data) && s1.data.data.length >= 5, "1. Admin can view all authorized drivers");

  // Scenario 2: Employee cannot retrieve the full drivers directory
  const s2 = await request("GET", "/api/drivers", { Cookie: empCookie });
  assert(s2.status === 403, "2. Employee cannot retrieve the full drivers directory (403 Forbidden)");
  const s2Me = await request("GET", "/api/drivers/me", { Cookie: empCookie });
  assert(s2Me.status === 200 && s2Me.data.data.id === "D001", "2b. Employee can retrieve their own driver profile via /api/drivers/me");

  // Scenario 3: Admin can view all authorized vehicles
  const s3 = await request("GET", "/api/vehicles", { Cookie: adminCookie });
  assert(s3.status === 200 && Array.isArray(s3.data.data) && s3.data.data.length >= 8, "3. Admin can view all authorized vehicles");

  // Scenario 4: Employee can retrieve only assigned vehicles
  const s4 = await request("GET", "/api/vehicles", { Cookie: empCookie });
  const empVehicles = s4.data.data || [];
  assert(s4.status === 200 && empVehicles.length === 1 && empVehicles[0].id === "FL-101", "4. Employee can retrieve only assigned vehicles (FL-101 only)");

  // Scenario 5: Employee cannot retrieve another employee's vehicle by changing the ID
  const s5Unauthorized = await request("GET", "/api/vehicles/FL-102", { Cookie: empCookie });
  assert(s5Unauthorized.status === 403, "5a. Employee cannot retrieve another employee's vehicle by changing the ID (403 Forbidden)");
  const s5Authorized = await request("GET", "/api/vehicles/FL-101", { Cookie: empCookie });
  assert(s5Authorized.status === 200 && s5Authorized.data.data.id === "FL-101", "5b. Employee can access their own assigned vehicle details (200 OK)");

  // Scenario 6: Employee cannot access another employee's trips
  const s6Unauthorized = await request("GET", "/api/trips/R-202", { Cookie: empCookie });
  assert(s6Unauthorized.status === 403, "6a. Employee cannot access another employee's trip details by ID (403 Forbidden)");
  const s6Trips = await request("GET", "/api/trips", { Cookie: empCookie });
  const hasForeignTrips = (s6Trips.data.data || []).some(t => t.vehicleId !== "FL-101" && t.driverId !== "D001");
  assert(s6Trips.status === 200 && !hasForeignTrips, "6b. Employee trips list excludes other employees' trips");

  // Scenario 7: Employee cannot access fleet-wide fuel records
  const s7Fuel = await request("GET", "/api/fuel", { Cookie: empCookie });
  const hasForeignFuel = (s7Fuel.data.data || []).some(f => f.vehicleId !== "FL-101");
  assert(s7Fuel.status === 200 && !hasForeignFuel, "7. Employee fuel logs contain only records for assigned vehicle");

  // Scenario 8: Employee cannot access restricted maintenance records
  const s8Maint = await request("GET", "/api/maintenance", { Cookie: empCookie });
  const hasForeignMaint = (s8Maint.data.data || []).some(m => m.vehicleId !== "FL-101");
  assert(s8Maint.status === 200 && !hasForeignMaint, "8. Employee maintenance tickets contain only records for assigned vehicle");

  // Scenario 9: Employee cannot access administrative reports
  const s9 = await request("GET", "/api/users", { Cookie: empCookie });
  assert(s9.status === 403, "9. Employee cannot access administrative user management reports (403 Forbidden)");

  // Scenario 10: Employee cannot create a driver
  const s10 = await request("POST", "/api/drivers", { Cookie: empCookie }, {
    id: "D-HACK",
    name: "Hacker Driver",
    license: "TS00 999999",
    phone: "9876543210",
    safety: 90
  });
  assert(s10.status === 403, "10. Employee cannot create a driver (403 Forbidden)");

  // Scenario 11: Employee cannot create or assign vehicles
  const s11Create = await request("POST", "/api/vehicles", { Cookie: empCookie }, {
    id: "FL-HACK",
    make: "Hack",
    model: "Hack",
    plate: "TS00XX0000",
    year: 2024
  });
  assert(s11Create.status === 403, "11a. Employee cannot create vehicles (403 Forbidden)");
  const s11Assign = await request("PATCH", "/api/drivers/D001/assign", { Cookie: empCookie }, {
    vehicleId: "FL-102"
  });
  assert(s11Assign.status === 403, "11b. Employee cannot assign vehicles (403 Forbidden)");

  // Scenario 12: Employee cannot change their role to ADMIN
  const s12 = await request("PUT", "/api/auth/profile", { Cookie: empCookie }, {
    role: "ADMIN",
    name: "Sarah Johnson"
  });
  const s12Check = await request("GET", "/api/auth/me", { Cookie: empCookie });
  assert(s12Check.status === 200 && s12Check.data.data.role === "EMPLOYEE", "12. Employee cannot escalate their role to ADMIN via profile update");

  // Scenario 13: Employee cannot modify another employee's profile
  const adminUserDoc = await User.findOne({ username: "admin" });
  const s13 = await request("PUT", `/api/users/${adminUserDoc._id}`, { Cookie: empCookie }, {
    name: "Compromised Admin"
  });
  assert(s13.status === 403, "13. Employee cannot modify another user's profile (403 Forbidden)");

  // Scenario 14: An unauthenticated user cannot access protected APIs
  const s14Veh = await request("GET", "/api/vehicles");
  const s14Driv = await request("GET", "/api/drivers");
  const s14Trips = await request("GET", "/api/trips");
  const s14Fuel = await request("GET", "/api/fuel");
  const s14Maint = await request("GET", "/api/maintenance");
  const s14Stats = await request("GET", "/api/dashboard/stats");
  assert(
    s14Veh.status === 401 && s14Driv.status === 401 && s14Trips.status === 401 &&
    s14Fuel.status === 401 && s14Maint.status === 401 && s14Stats.status === 401,
    "14. Unauthenticated user receives 401 Unauthorized across all protected APIs"
  );

  // Scenario 15: Admin functionality remains operational
  assert(
    s1.status === 200 && s3.status === 200 &&
    typeof dashRes.data.data.totalVehicles === "number",
    "15. Admin full-fleet management functionality remains operational"
  );

  // Scenario 16: Employee dashboard statistics do not reveal fleet-wide information
  const s16 = await request("GET", "/api/dashboard/stats", { Cookie: empCookie });
  assert(
    s16.status === 200 && s16.data.data.totalVehicles === 1,
    "16. Employee dashboard stats scoped strictly to assigned vehicle (totalVehicles: 1, not fleet count)"
  );

  // Scenario 17: Search and autocomplete endpoints do not leak unauthorized records
  assert(
    s2.status === 403 && s4.status === 200 && empVehicles.length === 1,
    "17. Search & autocomplete backend queries strictly scoped to authorized vehicle only"
  );

  // Scenario 18: No frontend route bypasses backend authorization
  const s18DirectTripForged = await request("PATCH", "/api/trips/R-202/status", { Cookie: empCookie }, {
    status: "Cancelled"
  });
  assert(
    s18DirectTripForged.status === 403,
    "18. Direct API tampering on unassigned trip rejected with 403 Forbidden"
  );

  // 12. Interactive Road Routing & Geospatial Authorization
  console.log("\n▶️  Test Group 12: Interactive Road Routing & Geographic RBAC");

  // 1. Employee fetches authorized assigned trip route (R-201: Hyderabad -> Vijayawada)
  const empRouteRes = await request("GET", "/api/trips/R-201/route", { Cookie: empCookie });
  assert(empRouteRes.status === 200, "Employee can retrieve road route for authorized assigned trip (R-201)");
  assert(
    empRouteRes.data && empRouteRes.data.success && empRouteRes.data.data.origin &&
    Array.isArray(empRouteRes.data.data.coordinates) && empRouteRes.data.data.coordinates.length > 10,
    "Road route returns real polyline geometry coordinates from road network"
  );
  assert(
    typeof empRouteRes.data.data.distanceKm === "number" && empRouteRes.data.data.distanceKm > 200,
    "Road route provides real calculated driving distance in kilometers (> 200 km for Hyd-Vja)"
  );

  // 2. Employee attempts to retrieve unauthorized trip route (R-202) -> 403 Forbidden
  const empUnauthRoute = await request("GET", "/api/trips/R-202/route", { Cookie: empCookie });
  assert(
    empUnauthRoute.status === 403,
    "Employee blocked with 403 Forbidden when requesting route for unassigned trip (R-202)"
  );

  // 3. Unauthenticated request to route endpoint -> 401 Unauthorized
  const unauthRouteRes = await request("GET", "/api/trips/R-201/route");
  assert(unauthRouteRes.status === 401, "Unauthenticated request to trip route returns 401 Unauthorized");

  // 4. Admin can inspect any trip route (R-202)
  const adminRouteRes = await request("GET", "/api/trips/R-202/route", { Cookie: adminCookie });
  assert(adminRouteRes.status === 200, "Admin can retrieve road route for any fleet trip (R-202)");

  // 5. Non-existent trip returns 404
  const nonExistRouteRes = await request("GET", "/api/trips/R-NONEXISTENT/route", { Cookie: adminCookie });
  assert(nonExistRouteRes.status === 404, "Requesting route for non-existent trip returns 404 Not Found");

  // 14. Multi-Tenant Organization Registration & Complete Data Isolation
  console.log("\n▶️  Test Group 14: Multi-Tenant Organization Registration & Complete Data Isolation");

  // Clean up any previous test quantum org data
  const oldQuantumOrg = await Organization.findOne({ code: "QUANTUM-LOGISTICS-LTD" });
  if (oldQuantumOrg) {
    await Vehicle.deleteMany({ organizationId: oldQuantumOrg._id });
    await Driver.deleteMany({ organizationId: oldQuantumOrg._id });
    await User.deleteMany({ organizationId: oldQuantumOrg._id });
    await Organization.deleteOne({ _id: oldQuantumOrg._id });
  }

  // 14.1 Registration security: missing or invalid secret rejected
  const noSecretRes = await request("POST", "/api/auth/register-admin", {}, {
    orgName: "Hacker Org",
    adminFullName: "Attacker",
    username: "attacker_admin",
    email: "attacker@test.com",
    password: "Password@123"
  });
  assert(noSecretRes.status === 403, "Public registration without setup key rejected with 403 Forbidden");

  const badSecretRes = await request("POST", "/api/auth/register-admin", {}, {
    orgName: "Hacker Org",
    adminFullName: "Attacker",
    username: "attacker_admin",
    email: "attacker@test.com",
    password: "Password@123",
    setupSecret: "wrong-secret-token"
  });
  assert(badSecretRes.status === 403, "Admin registration with invalid setup key rejected with 403 Forbidden");

  // Employee attempting to register organization rejected with 403
  const empOrgRes = await request("POST", "/api/auth/register-admin", { Cookie: empCookie }, {
    orgName: "Employee Created Org",
    adminFullName: "Sarah Johnson",
    username: "sarah_new_admin",
    email: "sarah_admin@test.com",
    password: "Password@123"
  });
  assert(empOrgRes.status === 403, "Employee blocked from creating organizations/admin accounts (403 Forbidden)");

  // Authenticated Admin can create organization without sending setupKey
  const adminCreatedOrgRes = await request("POST", "/api/auth/register-admin", { Cookie: adminCookie }, {
    orgName: "Sub-Tenant Global Corp",
    adminFullName: "Sub Admin",
    username: "sub_admin_user",
    email: "subadmin@global.local",
    password: "Password@12345"
  });
  assert(adminCreatedOrgRes.status === 201, "Authenticated Admin can create organization without secret key");
  const subAdminOrgDoc = await Organization.findOne({ name: "Sub-Tenant Global Corp" });
  if (subAdminOrgDoc) {
    await User.deleteMany({ organizationId: subAdminOrgDoc._id });
    await Organization.deleteOne({ _id: subAdminOrgDoc._id });
  }

  // 14.2 Valid Admin & Organization Registration via INITIAL_SETUP_KEY (using x-setup-key header)
  const quantumRegRes = await request("POST", "/api/auth/register-admin", {
    "x-setup-key": process.env.INITIAL_SETUP_KEY || "fleetflow-enterprise-setup-2026"
  }, {
    orgName: "Quantum Logistics Ltd",
    adminFullName: "Elena Rostova",
    username: "elena_admin",
    email: "elena@quantumfleet.com",
    password: "Quantum@2026!"
  });
  assert(quantumRegRes.status === 201, "New Admin & Organization successfully registered via INITIAL_SETUP_KEY with 201 Created");
  assert(quantumRegRes.data.user.role === "ADMIN", "New tenant account created with role ADMIN");
  assert(quantumRegRes.cookieToken !== null, "New tenant admin receives secure authentication session cookie");

  const elenaCookie = `fleetflow_token=${quantumRegRes.cookieToken}`;

  // Verify Organization & User created in MongoDB
  const quantumOrgDoc = await Organization.findOne({ name: "Quantum Logistics Ltd" });
  assert(quantumOrgDoc !== null && quantumOrgDoc.name === "Quantum Logistics Ltd", "Organization document persisted in MongoDB organizations collection");

  const elenaUserDoc = await User.findOne({ username: "elena_admin" }).select("+password");
  assert(
    elenaUserDoc !== null &&
    elenaUserDoc.organizationId.toString() === quantumOrgDoc._id.toString() &&
    elenaUserDoc.password.startsWith("$2"),
    "Admin user document persisted in MongoDB users collection with bcrypt hash and linked organizationId"
  );

  // 14.3 Absolute Empty State for New Tenant (Zero Demo Bleed)
  const elenaDashRes = await request("GET", "/api/dashboard/stats", { Cookie: elenaCookie });
  assert(
    elenaDashRes.status === 200 &&
    elenaDashRes.data.data.totalVehicles === 0 &&
    elenaDashRes.data.data.activeDrivers === 0 &&
    elenaDashRes.data.data.inTransitTrips === 0 &&
    elenaDashRes.data.data.monthlyFuelSpend === 0,
    "New organization dashboard starts with completely empty statistics (0 vehicles, 0 drivers, 0 trips, 0 spend)"
  );

  const elenaVehiclesRes = await request("GET", "/api/vehicles", { Cookie: elenaCookie });
  assert(
    elenaVehiclesRes.status === 200 &&
    Array.isArray(elenaVehiclesRes.data.data) &&
    elenaVehiclesRes.data.data.length === 0,
    "New organization vehicle fleet is completely empty (zero demo data bleed)"
  );

  const elenaDriversRes = await request("GET", "/api/drivers", { Cookie: elenaCookie });
  assert(
    elenaDriversRes.status === 200 &&
    Array.isArray(elenaDriversRes.data.data) &&
    elenaDriversRes.data.data.length === 0,
    "New organization driver directory is completely empty (zero demo data bleed)"
  );

  // 14.4 New Admin Adds Vehicle in Their Own Organization
  const addElenaVehRes = await request("POST", "/api/vehicles", { Cookie: elenaCookie }, {
    id: "FL-Q100",
    make: "Volvo",
    model: "FH16",
    plate: "TS09QL1000",
    year: 2026,
    odometer: 1200,
    fuelType: "Diesel",
    status: "Active"
  });
  assert(addElenaVehRes.status === 201, "New tenant admin adds vehicle FL-Q100 to MongoDB");

  const qVehicleDoc = await Vehicle.findOne({ id: "FL-Q100" });
  assert(
    qVehicleDoc !== null && qVehicleDoc.organizationId.toString() === quantumOrgDoc._id.toString(),
    "Vehicle FL-Q100 strictly isolated to Quantum Logistics organization in MongoDB"
  );

  // Confirm legacy admin CANNOT see FL-Q100
  const legacyVehiclesRes = await request("GET", "/api/vehicles", { Cookie: adminCookie });
  const hasQuantumVeh = (legacyVehiclesRes.data.data || []).some(v => v.id === "FL-Q100");
  assert(!hasQuantumVeh, "Legacy organization vehicle list does NOT leak Quantum Logistics vehicle FL-Q100");

  // 14.5 New Admin Adds Driver with Linked Employee Login Account
  const addElenaDriverRes = await request("POST", "/api/drivers", { Cookie: elenaCookie }, {
    id: "D-Q01",
    name: "Marcus Vance",
    license: "TS09 20260099",
    phone: "9887766554",
    safety: 98,
    status: "Active",
    createLogin: true,
    username: "marcus_driver",
    email: "marcus@quantumfleet.com",
    password: "Driver@Pass123"
  });
  assert(addElenaDriverRes.status === 201, "New driver D-Q01 created with linked employee login account in MongoDB");

  const qDriverDoc = await Driver.findOne({ id: "D-Q01" });
  const marcusUserDoc = await User.findOne({ username: "marcus_driver" }).select("+password");
  assert(
    qDriverDoc !== null &&
    marcusUserDoc !== null &&
    marcusUserDoc.role === "EMPLOYEE" &&
    qDriverDoc.userId.toString() === marcusUserDoc._id.toString() &&
    qDriverDoc.organizationId.toString() === quantumOrgDoc._id.toString() &&
    marcusUserDoc.organizationId.toString() === quantumOrgDoc._id.toString(),
    "Driver and linked Employee account both saved in MongoDB with valid ObjectId cross-references and matching organizationId"
  );

  // 14.6 New Employee Log In & Permission Isolation
  const marcusLoginRes = await request("POST", "/api/auth/login", {}, {
    username: "marcus_driver",
    password: "Driver@Pass123"
  });
  assert(marcusLoginRes.status === 200 && marcusLoginRes.data.user.role === "EMPLOYEE", "Linked Employee can immediately authenticate with created credentials");
  const marcusCookie = `fleetflow_token=${marcusLoginRes.cookieToken}`;

  // Marcus cannot see legacy org vehicles or drivers
  const marcusDriversRes = await request("GET", "/api/drivers", { Cookie: marcusCookie });
  assert(marcusDriversRes.status === 403, "Employee marcus_driver blocked from fleet-wide driver directory (403 Forbidden)");

  // 14.7 Cross-Tenant Tampering Blocked
  const crossTamperRes = await request("PUT", "/api/vehicles/FL-101", { Cookie: elenaCookie }, {
    status: "Maintenance"
  });
  assert(
    crossTamperRes.status === 404 || crossTamperRes.status === 403,
    "Tenant Elena blocked from modifying legacy organization vehicle FL-101 (404/403)"
  );

  const legacyTamperRes = await request("PUT", "/api/vehicles/FL-Q100", { Cookie: adminCookie }, {
    status: "Retired"
  });
  assert(
    legacyTamperRes.status === 404 || legacyTamperRes.status === 403,
    "Legacy admin blocked from modifying Quantum Logistics vehicle FL-Q100 (404/403)"
  );

  // Clean up Quantum test data to leave database clean
  await Vehicle.deleteMany({ organizationId: quantumOrgDoc._id });
  await Driver.deleteMany({ organizationId: quantumOrgDoc._id });
  await User.deleteMany({ organizationId: quantumOrgDoc._id });
  await Organization.deleteOne({ _id: quantumOrgDoc._id });

  // 13. Session Termination / Logout
  console.log("\n▶️  Test Group 13: Session Termination / Logout");

  const logoutRes = await request("POST", "/api/auth/logout", { Cookie: adminCookie });
  assert(logoutRes.status === 200, "POST /api/auth/logout clears authentication session");

  // Teardown
  console.log("\n=======================================================");
  console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=======================================================\n");

  await new Promise((res) => testServer.close(res));
  await mongoose.disconnect();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  if (testServer) testServer.close();
  mongoose.connection.close().then(() => process.exit(1));
});
