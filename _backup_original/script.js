// ================================
// MOCK DATA
// ================================

const STORAGE_KEY = "fleetflow-store";

const defaultVehicles = [
  { id: "FL-101", make: "Tata", model: "Prima 4025", plate: "AP09AB1234", year: 2023, odometer: 84210, fuelType: "Diesel", status: "Active", driverId: "D001", lastService: "2026-06-12", nextService: "2026-09-12" },
  { id: "FL-102", make: "Ashok Leyland", model: "4825", plate: "AP09CD4521", year: 2022, odometer: 121450, fuelType: "Diesel", status: "Active", driverId: "D002", lastService: "2026-05-20", nextService: "2026-08-20" },
  { id: "FL-103", make: "Mahindra", model: "Bolero Pickup", plate: "AP09EF6712", year: 2024, odometer: 31890, fuelType: "Diesel", status: "Active", driverId: "D003", lastService: "2026-07-02", nextService: "2026-10-02" },
  { id: "FL-104", make: "Tata", model: "Ace", plate: "AP09GH8890", year: 2021, odometer: 156780, fuelType: "Diesel", status: "Offline", driverId: "D004", lastService: "2026-04-18", nextService: "2026-07-18" },
  { id: "FL-105", make: "Force", model: "Traveller", plate: "AP09JK3421", year: 2023, odometer: 67440, fuelType: "Diesel", status: "Active", driverId: "D005", lastService: "2026-06-28", nextService: "2026-09-28" },
  { id: "FL-106", make: "Tata", model: "Ultra", plate: "AP09LM7865", year: 2022, odometer: 98420, fuelType: "Diesel", status: "In Shop", driverId: "D006", lastService: "2026-03-10", nextService: "2026-08-10" },
  { id: "FL-107", make: "Mahindra", model: "Furio", plate: "AP09NP9182", year: 2024, odometer: 22910, fuelType: "Diesel", status: "Active", driverId: "D007", lastService: "2026-07-22", nextService: "2026-10-22" },
  { id: "FL-108", make: "Isuzu", model: "D-Max", plate: "AP09QR5523", year: 2023, odometer: 54120, fuelType: "Diesel", status: "Idle", driverId: "D008", lastService: "2026-06-05", nextService: "2026-09-05" }
];

const defaultDrivers = [
  { id: "D001", name: "Sarah Johnson", license: "TG09 2021001456", phone: "9876543210", status: "Active", safety: 96, vehicleId: "FL-101" },
  { id: "D002", name: "Michael Brown", license: "AP07 2019008832", phone: "9848012345", status: "Active", safety: 91, vehicleId: "FL-102" },
  { id: "D003", name: "David Wilson", license: "TS08 2022011098", phone: "9012345678", status: "Active", safety: 88, vehicleId: "FL-103" },
  { id: "D004", name: "Priya Sharma", license: "TG09 2018012234", phone: "9988776655", status: "Off-Duty", safety: 93, vehicleId: "FL-104" },
  { id: "D005", name: "Rahul Kumar", license: "AP09 2020007761", phone: "9123456780", status: "Active", safety: 85, vehicleId: "FL-105" },
  { id: "D006", name: "Ananya Reddy", license: "TS10 2023014450", phone: "9000011122", status: "Off-Duty", safety: 97, vehicleId: "FL-106" },
  { id: "D007", name: "James Anderson", license: "KA03 2017003344", phone: "8899001122", status: "Active", safety: 82, vehicleId: "FL-107" },
  { id: "D008", name: "Arjun Patel", license: "GJ01 2021005566", phone: "9765432109", status: "Active", safety: 90, vehicleId: "FL-108" }
];

const defaultFuel = [
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

const defaultMaintenance = [
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

const defaultRoutes = [
  { id: "R-201", vehicleId: "FL-101", start: "Hyderabad", end: "Vijayawada", distance: 275, duration: "5h 20m", status: "Completed" },
  { id: "R-202", vehicleId: "FL-102", start: "Hyderabad", end: "Warangal", distance: 148, duration: "3h 10m", status: "Completed" },
  { id: "R-203", vehicleId: "FL-101", start: "Vijayawada", end: "Guntur", distance: 36, duration: "55m", status: "Completed" },
  { id: "R-204", vehicleId: "FL-105", start: "Hyderabad", end: "Bengaluru", distance: 569, duration: "9h 40m", status: "On Time" },
  { id: "R-205", vehicleId: "FL-107", start: "Secunderabad", end: "Nizamabad", distance: 175, duration: "3h 45m", status: "On Time" },
  { id: "R-206", vehicleId: "FL-103", start: "Hyderabad", end: "Karimnagar", distance: 162, duration: "3h 20m", status: "Delayed" },
  { id: "R-207", vehicleId: "FL-108", start: "Hyderabad", end: "Khammam", distance: 193, duration: "4h 05m", status: "Idle" },
  { id: "R-208", vehicleId: "FL-101", start: "Hyderabad", end: "Visakhapatnam", distance: 620, duration: "11h 15m", status: "On Time" },
  { id: "R-209", vehicleId: "FL-102", start: "Warangal", end: "Hyderabad", distance: 148, duration: "3h 05m", status: "Completed" },
  { id: "R-210", vehicleId: "FL-106", start: "Hyderabad", end: "Nagpur", distance: 501, duration: "8h 50m", status: "Cancelled" }
];

const defaultActivities = [
  { icon: "🔧", text: "Vehicle FL-104 checked into the garage", time: "12 min ago", status: "Alert" },
  { icon: "✅", text: "Sarah Johnson completed Route R-203", time: "28 min ago", status: "On-Time" },
  { icon: "🚚", text: "Vehicle FL-101 started Route R-208", time: "45 min ago", status: "Active" },
  { icon: "⚠️", text: "Maintenance reminder generated for FL-106", time: "1 hr ago", status: "Warning" },
  { icon: "👤", text: "Driver Michael Brown was assigned to FL-102", time: "2 hr ago", status: "Info" },
  { icon: "⛽", text: "Fuel entry added for FL-102", time: "3 hr ago", status: "Info" },
  { icon: "⏸️", text: "Vehicle FL-108 marked as idle", time: "4 hr ago", status: "Idle" }
];

const weeklyFuel = [
  { day: "Mon", liters: 82 },
  { day: "Tue", liters: 95 },
  { day: "Wed", liters: 74 },
  { day: "Thu", liters: 108 },
  { day: "Fri", liters: 91 },
  { day: "Sat", liters: 120 },
  { day: "Sun", liters: 87 }
];

const notifications = [
  { id: "n1", title: "2 maintenance services are overdue", detail: "FL-104 and FL-106 need attention", section: "maintenance" },
  { id: "n2", title: "FL-104 is offline", detail: "Vehicle checked into garage", section: "vehicles" },
  { id: "n3", title: "Driver Sarah completed Route R-203", detail: "Vijayawada → Guntur", section: "routes" },
  { id: "n4", title: "Fuel spending increased this week", detail: "Saturday was the highest day at 120 L", section: "fuel" }
];

let vehicles = [];
let drivers = [];
let fuelEntries = [];
let maintenance = [];
let routes = [];
let activities = [];
let currentSection = "dashboard";
let driverFilter = "all";
let modalMode = "";

const pageCopy = {
  dashboard: ["Fleet Command Center", "Monitor your fleet, drivers, routes and maintenance in real time."],
  vehicles: ["Vehicle Records", "Search, filter and manage every unit in the fleet."],
  drivers: ["Driver Assignments", "Track licenses, safety scores and vehicle assignments."],
  fuel: ["Fuel & Cost Control", "Record fill-ups, costs and kilometre efficiency."],
  maintenance: ["Maintenance Schedules", "Keep overdue, upcoming and completed work in view."],
  routes: ["Route History", "Review completed trips and live corridor tracking."]
};

// ================================
// INITIALIZATION
// ================================

document.addEventListener("DOMContentLoaded", function () {
  loadStore();
  bindEvents();
  renderAll();
  showSection("dashboard");
});

function loadStore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      vehicles = data.vehicles || clone(defaultVehicles);
      drivers = data.drivers || clone(defaultDrivers);
      fuelEntries = data.fuelEntries || clone(defaultFuel);
      maintenance = data.maintenance || clone(defaultMaintenance);
      routes = data.routes || clone(defaultRoutes);
      activities = data.activities || clone(defaultActivities);
      return;
    }
  } catch (err) {
    console.warn("Could not read saved data, using defaults.");
  }
  resetToDefaults();
}

function resetToDefaults() {
  vehicles = clone(defaultVehicles);
  drivers = clone(defaultDrivers);
  fuelEntries = clone(defaultFuel);
  maintenance = clone(defaultMaintenance);
  routes = clone(defaultRoutes);
  activities = clone(defaultActivities);
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    vehicles: vehicles,
    drivers: drivers,
    fuelEntries: fuelEntries,
    maintenance: maintenance,
    routes: routes,
    activities: activities
  }));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showSection(btn.getAttribute("data-section"));
      closeSidebar();
    });
  });

  document.getElementById("menu-toggle").addEventListener("click", toggleSidebar);
  document.getElementById("sidebar-backdrop").addEventListener("click", closeSidebar);

  document.getElementById("vehicle-search").addEventListener("input", renderVehicles);
  document.getElementById("vehicle-status-filter").addEventListener("change", renderVehicles);
  document.getElementById("add-vehicle-btn").addEventListener("click", function () {
    openModal("add-vehicle");
  });

  document.getElementById("driver-search").addEventListener("input", renderDrivers);
  document.getElementById("add-driver-btn").addEventListener("click", function () {
    openModal("add-driver");
  });
  document.querySelectorAll("[data-driver-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      driverFilter = chip.getAttribute("data-driver-filter");
      document.querySelectorAll("[data-driver-filter]").forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });
      renderDrivers();
    });
  });

  document.getElementById("fuel-search").addEventListener("input", renderFuel);
  document.getElementById("fuel-vehicle-filter").addEventListener("change", renderFuel);
  document.getElementById("fuel-date-filter").addEventListener("change", renderFuel);
  document.getElementById("fuel-date-clear").addEventListener("click", function () {
    document.getElementById("fuel-date-filter").value = "";
    renderFuel();
  });
  document.getElementById("add-fuel-btn").addEventListener("click", function () {
    openModal("add-fuel");
  });

  document.getElementById("add-maintenance-btn").addEventListener("click", function () {
    openModal("add-maintenance");
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", function (event) {
    if (event.target.id === "modal-overlay") {
      closeModal();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
      closePopovers();
      closeSidebar();
    }
  });

  document.getElementById("notify-btn").addEventListener("click", function (event) {
    event.stopPropagation();
    togglePanel("notify-panel", "notify-btn");
  });
  document.getElementById("user-btn").addEventListener("click", function (event) {
    event.stopPropagation();
    togglePanel("user-menu", "user-btn");
  });
  document.addEventListener("click", closePopovers);
  document.querySelector(".search-wrap").addEventListener("click", function (event) {
    event.stopPropagation();
  });
  document.getElementById("notify-panel").addEventListener("click", function (event) {
    event.stopPropagation();
  });
  document.getElementById("user-menu").addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.getElementById("user-menu").addEventListener("click", function (event) {
    const action = event.target.getAttribute("data-user-action");
    if (!action) return;
    if (action === "logout") {
      showToast("Logged out of this demo session", "info");
    } else if (action === "profile") {
      showToast("Profile is a frontend-only preview", "info");
    } else {
      showToast("Settings panel is not connected to a backend", "info");
    }
    closePopovers();
  });

  const search = document.getElementById("global-search");
  search.addEventListener("input", runGlobalSearch);
  search.addEventListener("focus", runGlobalSearch);

  document.getElementById("notify-list").innerHTML = notifications.map(function (item) {
    return '<button type="button" class="notify-item" data-section="' + item.section + '"><strong>' +
      escapeHtml(item.title) + "</strong><span>" + escapeHtml(item.detail) + "</span></button>";
  }).join("");
  document.getElementById("notify-list").addEventListener("click", function (event) {
    const btn = event.target.closest(".notify-item");
    if (!btn) return;
    showSection(btn.getAttribute("data-section"));
    closePopovers();
  });
  document.getElementById("notify-count").textContent = String(notifications.length);
}

function renderAll() {
  renderDashboard();
  renderVehicles();
  renderDrivers();
  renderFuelFilters();
  renderFuel();
  renderMaintenance();
  renderRoutes();
}

// ================================
// NAVIGATION
// ================================

function showSection(name) {
  currentSection = name;
  document.querySelectorAll(".page").forEach(function (page) {
    const match = page.id === "page-" + name;
    page.hidden = !match;
    page.classList.toggle("is-visible", match);
    page.setAttribute("aria-hidden", match ? "false" : "true");
  });
  document.querySelectorAll(".nav-item").forEach(function (btn) {
    const active = btn.getAttribute("data-section") === name;
    btn.classList.toggle("is-active", active);
    if (active) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });
  const copy = pageCopy[name];
  document.getElementById("page-title").textContent = copy[0];
  document.getElementById("page-subtitle").textContent = copy[1];
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const open = !sidebar.classList.contains("is-open");
  sidebar.classList.toggle("is-open", open);
  document.getElementById("sidebar-backdrop").hidden = !open;
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebar-backdrop").hidden = true;
}

function togglePanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  const willOpen = panel.hidden;
  closePopovers();
  panel.hidden = !willOpen;
  document.getElementById(btnId).setAttribute("aria-expanded", String(willOpen));
}

function closePopovers() {
  document.getElementById("notify-panel").hidden = true;
  document.getElementById("user-menu").hidden = true;
  document.getElementById("search-results").hidden = true;
  document.getElementById("notify-btn").setAttribute("aria-expanded", "false");
  document.getElementById("user-btn").setAttribute("aria-expanded", "false");
}

// ================================
// HELPERS
// ================================

function getDriverById(id) {
  return drivers.find(function (d) { return d.id === id; });
}

function getVehicleById(id) {
  return vehicles.find(function (v) { return v.id === id; });
}

function getDriverName(id) {
  const driver = getDriverById(id);
  return driver ? driver.name : "Unassigned";
}

function getVehicleName(id) {
  const vehicle = getVehicleById(id);
  return vehicle ? vehicle.id + " · " + vehicle.make + " " + vehicle.model : "Unassigned";
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-IN");
}

function formatMoney(n) {
  return "₹" + formatNumber(Math.round(n));
}

function statusBadge(status) {
  const map = {
    Active: "badge-green",
    "On-Time": "badge-green",
    "On Time": "badge-green",
    Completed: "badge-green",
    Idle: "badge-gray",
    "In Shop": "badge-blue",
    Offline: "badge-red",
    Alert: "badge-red",
    Warning: "badge-yellow",
    Overdue: "badge-red",
    Upcoming: "badge-yellow",
    Delayed: "badge-yellow",
    Cancelled: "badge-gray",
    "Off-Duty": "badge-gray",
    Info: "badge-blue",
    "Below Average": "badge-yellow",
    "Above Average": "badge-green"
  };
  return '<span class="badge ' + (map[status] || "badge-gray") + '">' + escapeHtml(status) + "</span>";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nextId(prefix, list, field) {
  const nums = list.map(function (item) {
    const raw = String(item[field || "id"]).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max.apply(null, nums) : 0;
  const n = max + 1;
  if (prefix === "FL-") {
    return "FL-" + String(n).padStart(3, "0");
  }
  if (prefix === "D") {
    return "D" + String(n).padStart(3, "0");
  }
  return prefix + String(n).padStart(2, "0");
}

function addActivity(icon, text, status) {
  activities.unshift({ icon: icon, text: text, time: "Just now", status: status });
  if (activities.length > 12) activities.pop();
}

// ================================
// DASHBOARD
// ================================

function renderDashboard() {
  const active = vehicles.filter(function (v) { return v.status === "Active"; }).length;
  const overdue = maintenance.filter(function (m) { return classifyMaintenance(m) === "overdue"; }).length;
  const spend = monthlyFuelSpend();

  document.getElementById("kpi-grid").innerHTML =
    kpiCard("blue", "🚚", vehicles.length, "Vehicles", "Total Fleet", "up", "+1 vs last month") +
    kpiCard("green", "🛣️", active, "Currently active", "Active on Route", "up", "On-time operations") +
    kpiCard("red", "🔧", overdue, "Overdue", "Maintenance Alerts", overdue ? "warn" : "up", overdue ? "Needs attention" : "All clear") +
    kpiCard("indigo", "⛽", formatMoney(spend), "This month", "Fuel Spend", "down", "Tracked in real time");

  renderFuelChart();
  renderStatusDonut();
  renderActivity();
}

function kpiCard(color, icon, value, label, title, trendClass, trendText) {
  return '<article class="kpi"><div class="kpi-icon ' + color + '">' + icon +
    '</div><div><p>' + escapeHtml(title) + '</p><h3>' + value + '</h3><p>' +
    escapeHtml(label) + '</p><div class="trend ' + trendClass + '">' + escapeHtml(trendText) +
    "</div></div></article>";
}

function monthlyFuelSpend() {
  return fuelEntries.reduce(function (sum, entry) {
    return entry.date.indexOf("2026-08") === 0 ? sum + Number(entry.cost) : sum;
  }, 0);
}

function renderFuelChart() {
  const max = Math.max.apply(null, weeklyFuel.map(function (d) { return d.liters; }));
  const chart = document.getElementById("fuel-chart");
  chart.innerHTML = weeklyFuel.map(function (d) {
    const pct = Math.round((d.liters / max) * 100);
    return '<div class="bar-col"><strong>' + d.liters + ' L</strong><div class="bar" data-height="' + pct +
      '%"></div><span>' + d.day + "</span></div>";
  }).join("");
  requestAnimationFrame(function () {
    chart.querySelectorAll(".bar").forEach(function (bar) {
      bar.style.height = bar.getAttribute("data-height");
    });
  });
}

function renderStatusDonut() {
  const counts = { "On Route": 0, Idle: 0, "In Shop": 0 };
  vehicles.forEach(function (v) {
    if (v.status === "Active") counts["On Route"] += 1;
    else if (v.status === "Idle" || v.status === "Offline") counts.Idle += 1;
    else counts["In Shop"] += 1;
  });
  const total = vehicles.length || 1;
  const p1 = (counts["On Route"] / total) * 100;
  const p2 = (counts.Idle / total) * 100;
  const donut = document.getElementById("status-donut");
  donut.style.background =
    "conic-gradient(#16a34a 0 " + p1 + "%, #64748b " + p1 + "% " + (p1 + p2) + "%, #2563eb " + (p1 + p2) + "% 100%)";

  document.getElementById("status-legend").innerHTML =
    legendItem("#16a34a", "On Route", p1) +
    legendItem("#64748b", "Idle", p2) +
    legendItem("#2563eb", "In Shop", 100 - p1 - p2);
}

function legendItem(color, label, pct) {
  return '<li><span class="swatch" style="background:' + color + '"></span>' +
    escapeHtml(label) + " · " + Math.round(pct) + "%</li>";
}

function renderActivity() {
  document.getElementById("activity-feed").innerHTML = activities.map(function (item) {
    return '<div class="activity"><div class="activity-icon">' + item.icon +
      "</div><div>" + escapeHtml(item.text) + '</div><span class="when">' +
      escapeHtml(item.time) + "</span>" + statusBadge(item.status) + "</div>";
  }).join("");
}

// ================================
// VEHICLES
// ================================

function renderVehicles() {
  const q = document.getElementById("vehicle-search").value.toLowerCase();
  const status = document.getElementById("vehicle-status-filter").value;
  const rows = vehicles.filter(function (v) {
    const hay = (v.id + " " + v.make + " " + v.model + " " + v.plate).toLowerCase();
    const matchQ = hay.indexOf(q) !== -1;
    const matchS = status === "all" || v.status === status;
    return matchQ && matchS;
  });

  document.getElementById("vehicle-table-body").innerHTML = rows.map(function (v) {
    return '<tr class="row-click" data-vehicle="' + v.id + '">' +
      "<td>" + escapeHtml(v.id) + "</td>" +
      "<td>" + escapeHtml(v.make + " " + v.model) + "</td>" +
      "<td>" + escapeHtml(v.plate) + "</td>" +
      "<td>" + v.year + "</td>" +
      "<td>" + formatNumber(v.odometer) + " km</td>" +
      "<td>" + statusBadge(v.status) + "</td>" +
      "<td>" + escapeHtml(getDriverName(v.driverId)) + "</td>" +
      '<td><button type="button" class="link-btn" data-view="' + v.id + '">View</button></td></tr>';
  }).join("") || emptyRow(8, "No vehicles match the current filters.");

  document.getElementById("vehicle-table-body").onclick = function (event) {
    const view = event.target.getAttribute("data-view");
    const row = event.target.closest("tr");
    const id = view || (row && row.getAttribute("data-vehicle"));
    if (id) openModal("vehicle-details", id);
  };
}

function emptyRow(cols, text) {
  return '<tr><td colspan="' + cols + '">' + escapeHtml(text) + "</td></tr>";
}

// ================================
// DRIVERS
// ================================

function renderDrivers() {
  const q = document.getElementById("driver-search").value.toLowerCase();
  const rows = drivers.filter(function (d) {
    const hay = (d.name + " " + d.license + " " + d.phone).toLowerCase();
    const matchQ = hay.indexOf(q) !== -1;
    const matchS = driverFilter === "all" || d.status === driverFilter;
    return matchQ && matchS;
  });

  document.getElementById("driver-table-body").innerHTML = rows.map(function (d) {
    return "<tr><td>" + escapeHtml(d.name) + "</td><td>" + escapeHtml(d.license) +
      "</td><td>" + escapeHtml(d.phone) + "</td><td>" + statusBadge(d.status) +
      "</td><td>" + d.safety + "</td><td>" + escapeHtml(d.vehicleId || "Unassigned") +
      '</td><td><button type="button" class="link-btn" data-reassign="' + d.id +
      '">Reassign</button></td></tr>';
  }).join("") || emptyRow(7, "No drivers match the current filters.");

  document.getElementById("driver-table-body").onclick = function (event) {
    const id = event.target.getAttribute("data-reassign");
    if (id) openModal("reassign", id);
  };
}

// ================================
// FUEL
// ================================

function calculateFleetAverage() {
  const values = fuelEntries.map(calculateFuelEfficiency).filter(function (n) { return n !== null; });
  if (!values.length) return 0;
  return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
}

function calculateFuelEfficiency(entry) {
  const previous = fuelEntries
    .filter(function (e) {
      return e.vehicleId === entry.vehicleId && e.odometer < entry.odometer;
    })
    .sort(function (a, b) { return b.odometer - a.odometer; })[0];
  if (!previous || !entry.liters) return null;
  const distance = entry.odometer - previous.odometer;
  if (distance <= 0) return null;
  return distance / entry.liters;
}

function renderFuelFilters() {
  const select = document.getElementById("fuel-vehicle-filter");
  const current = select.value || "all";
  select.innerHTML = '<option value="all">All vehicles</option>' + vehicles.map(function (v) {
    return '<option value="' + v.id + '">' + v.id + "</option>";
  }).join("");
  select.value = current;
  if (!select.value) select.value = "all";
}

function renderFuel() {
  const q = document.getElementById("fuel-search").value.toLowerCase();
  const vehicleId = document.getElementById("fuel-vehicle-filter").value;
  const date = document.getElementById("fuel-date-filter").value;
  const avg = calculateFleetAverage();

  const rows = fuelEntries
    .slice()
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
    .filter(function (e) {
      const driver = getDriverName(getVehicleById(e.vehicleId) ? getVehicleById(e.vehicleId).driverId : "");
      const hay = (e.date + " " + e.vehicleId + " " + driver).toLowerCase();
      const matchQ = hay.indexOf(q) !== -1;
      const matchV = vehicleId === "all" || e.vehicleId === vehicleId;
      const matchD = !date || e.date === date;
      return matchQ && matchV && matchD;
    });

  document.getElementById("fuel-table-body").innerHTML = rows.map(function (e) {
    const vehicle = getVehicleById(e.vehicleId);
    const driver = vehicle ? getDriverName(vehicle.driverId) : "—";
    const kmpl = calculateFuelEfficiency(e);
    const text = kmpl === null ? "—" : kmpl.toFixed(1) + " km/L";
    const below = kmpl !== null && kmpl < avg;
    return "<tr><td>" + e.date + "</td><td>" + escapeHtml(e.vehicleId) + "</td><td>" +
      escapeHtml(driver) + "</td><td>" + e.liters + " L</td><td>" + formatMoney(e.cost) +
      "</td><td>" + formatNumber(e.odometer) + " km</td><td>" + text + "</td><td>" +
      (kmpl === null ? statusBadge("Info") : statusBadge(below ? "Below Average" : "Above Average")) +
      "</td></tr>";
  }).join("") || emptyRow(8, "No fuel records found.");
}

// ================================
// MAINTENANCE
// ================================

function classifyMaintenance(item) {
  if (item.status === "Completed") return "completed";
  const today = "2026-08-23";
  if (item.date < today) return "overdue";
  const soon = new Date("2026-08-23");
  soon.setDate(soon.getDate() + 7);
  const due = new Date(item.date);
  if (due <= soon) return "upcoming";
  return "upcoming";
}

function renderMaintenance() {
  const groups = { overdue: [], upcoming: [], completed: [] };
  maintenance.forEach(function (item) {
    groups[classifyMaintenance(item)].push(item);
  });

  document.getElementById("maintenance-board").innerHTML =
    kanbanColumn("Overdue", "overdue", groups.overdue, "OVERDUE") +
    kanbanColumn("Upcoming — Next 7 Days", "upcoming", groups.upcoming, "DUE SOON") +
    kanbanColumn("Completed", "completed", groups.completed, "COMPLETED");
}

function kanbanColumn(title, key, items, badge) {
  const cards = items.map(function (m) {
    const warn = key === "overdue" ? " ⚠️" : "";
    return '<article class="ticket ' + key + '"><h4>' + escapeHtml(m.vehicleId) + " · " +
      escapeHtml(m.type) + warn + "</h4><p>Scheduled: " + m.date + "</p><p>Est. cost: " +
      formatMoney(m.cost) + "</p><p>Priority: " + escapeHtml(m.priority) + "</p>" +
      statusBadge(badge) + "</article>";
  }).join("") || "<p class='muted'>No tickets in this column.</p>";

  return '<div class="kanban-col"><h3>' + title + " <span>" + items.length +
    "</span></h3>" + cards + "</div>";
}

// ================================
// ROUTES
// ================================

function renderRoutes() {
  document.getElementById("route-table-body").innerHTML = routes.map(function (r) {
    const vehicle = getVehicleById(r.vehicleId);
    const driver = vehicle ? getDriverName(vehicle.driverId) : "—";
    return "<tr><td>" + escapeHtml(r.id) + "</td><td>" + escapeHtml(r.vehicleId) +
      "</td><td>" + escapeHtml(driver) + "</td><td>" + escapeHtml(r.start) +
      "</td><td>" + escapeHtml(r.end) + "</td><td>" + r.distance + " km</td><td>" +
      escapeHtml(r.duration) + "</td><td>" + statusBadge(r.status) + "</td></tr>";
  }).join("");
}

// ================================
// SEARCH & FILTER
// ================================

function runGlobalSearch() {
  const box = document.getElementById("search-results");
  const q = document.getElementById("global-search").value.trim().toLowerCase();
  if (!q) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  const hits = [];
  vehicles.forEach(function (v) {
    const hay = (v.id + " " + v.make + " " + v.model + " " + v.plate).toLowerCase();
    if (hay.indexOf(q) !== -1) {
      hits.push({ section: "vehicles", title: v.id + " — " + v.make + " " + v.model, meta: "Vehicle · " + v.plate });
    }
  });
  drivers.forEach(function (d) {
    const hay = (d.name + " " + d.license + " " + d.phone).toLowerCase();
    if (hay.indexOf(q) !== -1) {
      hits.push({ section: "drivers", title: d.name, meta: "Driver · " + d.license });
    }
  });
  routes.forEach(function (r) {
    const hay = (r.id + " " + r.start + " " + r.end).toLowerCase();
    if (hay.indexOf(q) !== -1) {
      hits.push({ section: "routes", title: r.id, meta: "Route · " + r.start + " → " + r.end });
    }
  });

  box.hidden = false;
  if (!hits.length) {
    box.innerHTML = '<div class="search-empty">No matching records found.</div>';
    return;
  }
  box.innerHTML = hits.slice(0, 10).map(function (h) {
    return '<button type="button" class="search-item" data-section="' + h.section + '">' +
      escapeHtml(h.title) + "<small>" + escapeHtml(h.meta) + "</small></button>";
  }).join("");
  box.onclick = function (event) {
    const btn = event.target.closest(".search-item");
    if (!btn) return;
    showSection(btn.getAttribute("data-section"));
    box.hidden = true;
    document.getElementById("global-search").value = "";
  };
}

// ================================
// MODALS
// ================================

function openModal(mode, id) {
  modalMode = mode;
  const title = document.getElementById("modal-title");
  const body = document.getElementById("modal-body");
  const overlay = document.getElementById("modal-overlay");

  if (mode === "add-vehicle") {
    title.textContent = "Add Vehicle";
    body.innerHTML = vehicleFormHtml();
  } else if (mode === "add-driver") {
    title.textContent = "Add Driver";
    body.innerHTML = driverFormHtml();
  } else if (mode === "add-fuel") {
    title.textContent = "Add Fuel Entry";
    body.innerHTML = fuelFormHtml();
  } else if (mode === "add-maintenance") {
    title.textContent = "Schedule Service";
    body.innerHTML = maintenanceFormHtml();
  } else if (mode === "vehicle-details") {
    title.textContent = "Vehicle Details";
    body.innerHTML = vehicleDetailsHtml(id);
  } else if (mode === "reassign") {
    title.textContent = "Reassign Driver";
    body.innerHTML = reassignFormHtml(id);
  }

  overlay.hidden = false;
  overlay.classList.add("is-open");
  const form = body.querySelector("form");
  if (form) {
    form.addEventListener("submit", handleModalSubmit);
    form.addEventListener("click", function (event) {
      if (event.target.hasAttribute("data-cancel")) closeModal();
    });
  }
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("is-open");
  overlay.hidden = true;
  document.getElementById("modal-body").innerHTML = "";
}

function optionList(items, selected) {
  return items.map(function (item) {
    const sel = item.value === selected ? " selected" : "";
    return '<option value="' + escapeHtml(item.value) + '"' + sel + ">" + escapeHtml(item.label) + "</option>";
  }).join("");
}

function field(name, label, type, extra) {
  extra = extra || {};
  return '<div class="field ' + (extra.full ? "full" : "") + '"><label for="' + name + '">' + label +
    '</label><input id="' + name + '" name="' + name + '" type="' + type + '" ' +
    (extra.required ? "required " : "") + (extra.value ? 'value="' + extra.value + '" ' : "") +
    (extra.min ? 'min="' + extra.min + '" ' : "") + (extra.placeholder ? 'placeholder="' + extra.placeholder + '" ' : "") +
    '><div class="error" data-error-for="' + name + '"></div></div>';
}

function selectField(name, label, optionsHtml, full, isRequired) {
  const req = isRequired === false ? "" : "required";
  return '<div class="field ' + (full ? "full" : "") + '"><label for="' + name + '">' + label +
    '</label><select id="' + name + '" name="' + name + '" ' + req + ">" + optionsHtml +
    '</select><div class="error" data-error-for="' + name + '"></div></div>';
}

function formActions(submitLabel) {
  return '<div class="modal-actions full"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button>' +
    '<button type="submit" class="btn btn-primary">' + submitLabel + "</button></div>";
}

function vehicleFormHtml() {
  const driverOpts = '<option value="">Unassigned</option>' + optionList(drivers.map(function (d) {
    return { value: d.id, label: d.name };
  }));
  return '<form id="modal-form" class="form-grid" novalidate>' +
    field("id", "Vehicle ID", "text", { required: true, placeholder: "FL-109" }) +
    field("make", "Make", "text", { required: true, placeholder: "Tata" }) +
    field("model", "Model", "text", { required: true, placeholder: "Prima" }) +
    field("plate", "License Plate", "text", { required: true, placeholder: "AP09XX0000" }) +
    field("year", "Year", "number", { required: true, min: "1990" }) +
    field("odometer", "Odometer (km)", "number", { required: true, min: "0" }) +
    selectField("fuelType", "Fuel Type", optionList([
      { value: "Diesel", label: "Diesel" },
      { value: "Petrol", label: "Petrol" },
      { value: "CNG", label: "CNG" }
    ])) +
    selectField("status", "Status", optionList([
      { value: "Active", label: "Active" },
      { value: "Idle", label: "Idle" },
      { value: "In Shop", label: "In Shop" },
      { value: "Offline", label: "Offline" }
    ])) +
    selectField("driverId", "Assign Driver", driverOpts, true, false) +
    formActions("Add Vehicle") + "</form>";
}

function driverFormHtml() {
  const vehicleOpts = '<option value="">Unassigned</option>' + optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id + " — " + v.make + " " + v.model };
  }));
  return '<form id="modal-form" class="form-grid" novalidate>' +
    field("name", "Driver Name", "text", { required: true }) +
    field("license", "License Number", "text", { required: true }) +
    field("phone", "Phone", "tel", { required: true, placeholder: "10-digit number" }) +
    field("safety", "Safety Score (70-100)", "number", { required: true, min: "70" }) +
    selectField("status", "Shift Status", optionList([
      { value: "Active", label: "Active" },
      { value: "Off-Duty", label: "Off-Duty" }
    ])) +
    selectField("vehicleId", "Assigned Vehicle", vehicleOpts, false, false) +
    formActions("Add Driver") + "</form>";
}

function fuelFormHtml() {
  const vehicleOpts = optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id + " — " + v.make + " " + v.model };
  }));
  return '<form id="modal-form" class="form-grid" novalidate>' +
    selectField("vehicleId", "Vehicle", vehicleOpts, true) +
    field("date", "Date", "date", { required: true, value: "2026-08-23" }) +
    field("liters", "Liters", "number", { required: true, min: "1" }) +
    field("cost", "Cost (₹)", "number", { required: true, min: "1" }) +
    field("odometer", "Current Odometer (km)", "number", { required: true, min: "0", full: true }) +
    formActions("Add Fuel Entry") + "</form>";
}

function maintenanceFormHtml() {
  const vehicleOpts = optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id };
  }));
  return '<form id="modal-form" class="form-grid" novalidate>' +
    selectField("vehicleId", "Vehicle", vehicleOpts) +
    selectField("type", "Service Type", optionList([
      { value: "Oil Change", label: "Oil Change" },
      { value: "Brake Inspection", label: "Brake Inspection" },
      { value: "Tire Rotation", label: "Tire Rotation" },
      { value: "Engine Service", label: "Engine Service" },
      { value: "Battery Replacement", label: "Battery Replacement" },
      { value: "AC Service", label: "AC Service" }
    ])) +
    field("date", "Scheduled Date", "date", { required: true, value: "2026-08-27" }) +
    field("cost", "Estimated Cost (₹)", "number", { required: true, min: "1" }) +
    selectField("priority", "Priority", optionList([
      { value: "Low", label: "Low" },
      { value: "Medium", label: "Medium" },
      { value: "High", label: "High" }
    ])) +
    '<div class="field full"><label for="notes">Notes</label><textarea id="notes" name="notes"></textarea></div>' +
    formActions("Schedule Service") + "</form>";
}

function vehicleDetailsHtml(id) {
  const v = getVehicleById(id);
  if (!v) return "<p>Vehicle not found.</p>";
  const trips = routes.filter(function (r) { return r.vehicleId === v.id; }).slice(0, 4);
  return '<dl class="detail-grid">' +
    detail("Vehicle ID", v.id) +
    detail("Make", v.make) +
    detail("Model", v.model) +
    detail("License plate", v.plate) +
    detail("Year", v.year) +
    detail("Odometer", formatNumber(v.odometer) + " km") +
    detail("Fuel type", v.fuelType) +
    detail("Current driver", getDriverName(v.driverId)) +
    detail("Current status", v.status) +
    detail("Last service date", v.lastService) +
    detail("Next service date", v.nextService) +
    "</dl><h3>Recent trip history</h3><ul class='trip-list'>" +
    (trips.map(function (t) {
      return "<li>" + t.id + " · " + t.start + " → " + t.end + " · " + t.status + "</li>";
    }).join("") || "<li>No recent trips.</li>") +
    "</ul>";
}

function detail(label, value) {
  return "<div><dt>" + escapeHtml(String(label)) + "</dt><dd>" + escapeHtml(String(value)) + "</dd></div>";
}

function reassignFormHtml(driverId) {
  const driver = getDriverById(driverId);
  const vehicleOpts = optionList(
    [{ value: "", label: "Unassigned" }].concat(vehicles.map(function (v) {
      return { value: v.id, label: v.id + " — currently " + getDriverName(v.driverId) };
    })),
    driver.vehicleId || ""
  );
  return '<form id="modal-form" class="form-grid" novalidate>' +
    '<input type="hidden" name="driverId" value="' + driver.id + '">' +
    '<div class="field"><label>Driver name</label><input value="' + escapeHtml(driver.name) + '" disabled></div>' +
    '<div class="field"><label>Current vehicle</label><input value="' + escapeHtml(driver.vehicleId || "Unassigned") + '" disabled></div>' +
    selectField("vehicleId", "Available vehicles", vehicleOpts, true) +
    formActions("Confirm") + "</form>";
}

function handleModalSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (modalMode === "add-vehicle") submitVehicle(form);
  else if (modalMode === "add-driver") submitDriver(form);
  else if (modalMode === "add-fuel") submitFuel(form);
  else if (modalMode === "add-maintenance") submitMaintenance(form);
  else if (modalMode === "reassign") submitReassign(form);
}

function setFieldError(form, name, message) {
  const box = form.querySelector('[data-error-for="' + name + '"]');
  const input = form.elements[name];
  if (box) box.textContent = message || "";
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function required(form, names) {
  let ok = true;
  names.forEach(function (name) {
    const value = String(form.elements[name].value || "").trim();
    if (!value) {
      setFieldError(form, name, "This field is required.");
      ok = false;
    } else {
      setFieldError(form, name, "");
    }
  });
  return ok;
}

function submitVehicle(form) {
  if (!required(form, ["id", "make", "model", "plate", "year", "odometer", "fuelType", "status"])) return;
  const id = form.elements.id.value.trim().toUpperCase();
  if (getVehicleById(id)) {
    setFieldError(form, "id", "This vehicle ID already exists.");
    return;
  }
  const driverId = form.elements.driverId.value;
  const vehicle = {
    id: id,
    make: form.elements.make.value.trim(),
    model: form.elements.model.value.trim(),
    plate: form.elements.plate.value.trim().toUpperCase(),
    year: Number(form.elements.year.value),
    odometer: Number(form.elements.odometer.value),
    fuelType: form.elements.fuelType.value,
    status: form.elements.status.value,
    driverId: driverId || "",
    lastService: "2026-08-23",
    nextService: "2026-11-23"
  };
  vehicles.push(vehicle);
  if (driverId) {
    const previous = getDriverById(driverId);
    if (previous && previous.vehicleId && previous.vehicleId !== id) {
      const oldVehicle = getVehicleById(previous.vehicleId);
      if (oldVehicle) oldVehicle.driverId = "";
    }
    if (previous) previous.vehicleId = id;
  }
  addActivity("🚚", "Vehicle " + id + " added to the fleet", "Info");
  afterChange("Vehicle added successfully", "success");
}

function submitDriver(form) {
  if (!required(form, ["name", "license", "phone", "safety", "status"])) return;
  const phone = form.elements.phone.value.trim();
  if (!/^\d{10}$/.test(phone)) {
    setFieldError(form, "phone", "Enter a 10-digit phone number.");
    return;
  }
  const safety = Number(form.elements.safety.value);
  if (safety < 70 || safety > 100) {
    setFieldError(form, "safety", "Safety score must be between 70 and 100.");
    return;
  }
  const driver = {
    id: nextId("D", drivers),
    name: form.elements.name.value.trim(),
    license: form.elements.license.value.trim(),
    phone: phone,
    status: form.elements.status.value,
    safety: safety,
    vehicleId: form.elements.vehicleId.value
  };
  drivers.push(driver);
  if (driver.vehicleId) {
    linkDriverVehicle(driver.id, driver.vehicleId);
  }
  addActivity("👤", "Driver " + driver.name + " was added", "Info");
  afterChange("Driver added successfully", "success");
}

function submitFuel(form) {
  if (!required(form, ["vehicleId", "date", "liters", "cost", "odometer"])) return;
  const vehicleId = form.elements.vehicleId.value;
  const odometer = Number(form.elements.odometer.value);
  const vehicle = getVehicleById(vehicleId);
  if (vehicle && odometer < vehicle.odometer) {
    setFieldError(form, "odometer", "Odometer cannot be lower than the current reading (" + vehicle.odometer + ").");
    return;
  }
  const entry = {
    id: nextId("F", fuelEntries),
    date: form.elements.date.value,
    vehicleId: vehicleId,
    liters: Number(form.elements.liters.value),
    cost: Number(form.elements.cost.value),
    odometer: odometer
  };
  fuelEntries.push(entry);
  if (vehicle) vehicle.odometer = odometer;
  addActivity("⛽", "Fuel entry added for " + vehicleId, "Info");
  afterChange("Fuel entry added successfully", "success");
}

function submitMaintenance(form) {
  if (!required(form, ["vehicleId", "type", "date", "cost", "priority"])) return;
  const ticket = {
    id: nextId("M", maintenance),
    vehicleId: form.elements.vehicleId.value,
    type: form.elements.type.value,
    date: form.elements.date.value,
    cost: Number(form.elements.cost.value),
    priority: form.elements.priority.value,
    status: form.elements.date.value < "2026-08-23" ? "Overdue" : "Upcoming",
    notes: form.elements.notes.value.trim()
  };
  maintenance.push(ticket);
  addActivity("🔧", "Maintenance scheduled for " + ticket.vehicleId, "Warning");
  afterChange("Maintenance scheduled successfully", "success");
}

function submitReassign(form) {
  const driverId = form.elements.driverId.value;
  const vehicleId = form.elements.vehicleId.value;
  linkDriverVehicle(driverId, vehicleId);
  const driver = getDriverById(driverId);
  addActivity("👤", "Driver " + driver.name + " was assigned to " + (vehicleId || "no vehicle"), "Info");
  afterChange("Driver reassigned successfully", "success");
}

function linkDriverVehicle(driverId, vehicleId) {
  const driver = getDriverById(driverId);
  if (!driver) return;

  if (driver.vehicleId) {
    const oldVehicle = getVehicleById(driver.vehicleId);
    if (oldVehicle && oldVehicle.driverId === driverId) {
      oldVehicle.driverId = "";
    }
  }

  if (vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (vehicle && vehicle.driverId && vehicle.driverId !== driverId) {
      const other = getDriverById(vehicle.driverId);
      if (other) other.vehicleId = "";
    }
    if (vehicle) vehicle.driverId = driverId;
    driver.vehicleId = vehicleId;
  } else {
    driver.vehicleId = "";
  }
}

function afterChange(message, type) {
  saveStore();
  renderAll();
  closeModal();
  showToast(message, type);
}

// ================================
// NOTIFICATIONS / TOASTS
// ================================

function showToast(message, type) {
  const stack = document.getElementById("toast-stack");
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "info");
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3200);
}
