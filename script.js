// ============================================================================
// SECTION 1: CONSTANTS AND CONFIGURATION
// ============================================================================

const pageCopy = {
  dashboard: ["Fleet Command Center", "Monitor your fleet, drivers, routes and maintenance in real time."],
  vehicles: ["Vehicle Records", "Search, filter and manage every unit in the fleet."],
  drivers: ["Driver Assignments", "Track licenses, safety scores and vehicle assignments."],
  fuel: ["Fuel & Cost Control", "Record fill-ups, costs and kilometre efficiency."],
  maintenance: ["Maintenance Schedules", "Keep overdue, upcoming and completed work in view."],
  routes: ["Route History", "Review completed trips and live corridor tracking."],
  users: ["User Management", "Create employee accounts, manage roles and account access."]
};

// ============================================================================
// SECTION 2: DOM ELEMENT REFERENCES & SELECTORS
// ============================================================================

const DOM = {
  sidebar: function () { return document.getElementById("sidebar"); },
  backdrop: function () { return document.getElementById("sidebar-backdrop"); },
  menuToggle: function () { return document.getElementById("menu-toggle"); },
  pageTitle: function () { return document.getElementById("page-title"); },
  pageSubtitle: function () { return document.getElementById("page-subtitle"); },
  toastStack: function () { return document.getElementById("toast-stack"); },
  modalOverlay: function () { return document.getElementById("modal-overlay"); },
  modalTitle: function () { return document.getElementById("modal-title"); },
  modalBody: function () { return document.getElementById("modal-body"); },
  routeMap: function () { return document.getElementById("route-map"); }
};

// ============================================================================
// SECTION 3: SHARED APPLICATION STATE
// ============================================================================

let vehicles = [];
let drivers = [];
let fuelEntries = [];
let maintenance = [];
let routes = [];
let activities = [];
let users = [];
let weeklyFuel = [];
let dashboardStats = null;
let currentUser = null;

let currentSection = "dashboard";
let driverFilter = "all";
let userRoleFilter = "all";
let userStatusFilter = "all";
let modalMode = "";
let routeMap = null;
let routeLayerGroup = null;
let selectedTripId = null;

// ============================================================================
// SECTION 19: APPLICATION INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  checkAuthAndInit();
});

// ============================================================================
// SECTION 6: AUTHENTICATION AND SESSION HANDLING
// ============================================================================

async function checkAuthAndInit() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      window.location.replace("/login.html");
      return;
    }
    const data = await res.json();
    if (!data.success || !data.data) {
      window.location.replace("/login.html");
      return;
    }

    currentUser = data.data;
    updateUserChip(currentUser);

    // Apply role-based styling and navigation labels
    if (currentUser.role === "EMPLOYEE") {
      document.body.classList.add("role-employee");
      applyEmployeeNavLabels();
    } else {
      document.body.classList.remove("role-employee");
      applyAdminNavLabels();
    }

    bindEvents();
    await loadAllFromBackend();
    showSection("dashboard");
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.replace("/login.html");
  }
}

// ============================================================================
// SECTION 7: NAVIGATION AND ROLE-BASED UI
// ============================================================================

function applyEmployeeNavLabels() {
  const lblDash = document.getElementById("nav-label-dashboard");
  if (lblDash) lblDash.textContent = "My Dashboard";
  const lblVeh = document.getElementById("nav-label-vehicles");
  if (lblVeh) lblVeh.textContent = "My Vehicle";
  const lblFuel = document.getElementById("nav-label-fuel");
  if (lblFuel) lblFuel.textContent = "My Fuel";
  const lblMaint = document.getElementById("nav-label-maintenance");
  if (lblMaint) lblMaint.textContent = "My Maintenance";
  const lblRoutes = document.getElementById("nav-label-routes");
  if (lblRoutes) lblRoutes.textContent = "My Trips";

  pageCopy.dashboard = ["My Operations Dashboard", "Overview of your assigned vehicle, active trips, and fuel logging."];
  pageCopy.vehicles = ["My Assigned Vehicle", "Detailed specifications and status for your assigned vehicle."];
  pageCopy.fuel = ["My Fuel Logs", "Log fuel purchases and track consumption for your assigned vehicle."];
  pageCopy.maintenance = ["My Vehicle Service", "View maintenance tickets and schedule service for your vehicle."];
  pageCopy.routes = ["My Assigned Trips", "Review your upcoming routes and completed assignments."];
}

function applyAdminNavLabels() {
  const lblDash = document.getElementById("nav-label-dashboard");
  if (lblDash) lblDash.textContent = "Dashboard";
  const lblVeh = document.getElementById("nav-label-vehicles");
  if (lblVeh) lblVeh.textContent = "Vehicles";
  const lblFuel = document.getElementById("nav-label-fuel");
  if (lblFuel) lblFuel.textContent = "Fuel";
  const lblMaint = document.getElementById("nav-label-maintenance");
  if (lblMaint) lblMaint.textContent = "Maintenance";
  const lblRoutes = document.getElementById("nav-label-routes");
  if (lblRoutes) lblRoutes.textContent = "Routes";

  pageCopy.dashboard = ["Fleet Command Center", "Monitor your fleet, drivers, routes and maintenance in real time."];
  pageCopy.vehicles = ["Vehicle Records", "Search, filter and manage every unit in the fleet."];
  pageCopy.drivers = ["Driver Assignments", "Track licenses, safety scores and vehicle assignments."];
  pageCopy.fuel = ["Fuel & Cost Control", "Record fill-ups, costs and kilometre efficiency."];
  pageCopy.maintenance = ["Maintenance Schedules", "Keep overdue, upcoming and completed work in view."];
  pageCopy.routes = ["Route History", "Review completed trips and live corridor tracking."];
  pageCopy.users = ["User Management", "Create employee accounts, manage roles and account access."];
}

function updateUserChip(user) {
  const avatarEl = document.querySelector(".user-chip .avatar");
  const nameEl = document.querySelector(".user-chip .user-meta strong");
  const roleEl = document.querySelector(".user-chip .user-meta small");

  if (avatarEl) {
    const initials = user.name ? user.name.split(" ").map(function (n) { return n[0]; }).join("").toUpperCase().slice(0, 2) : "AU";
    avatarEl.textContent = initials;
  }
  if (nameEl) {
    nameEl.textContent = user.name || user.username;
  }
  if (roleEl) {
    roleEl.textContent = user.role === "ADMIN" ? "Fleet Manager (Admin)" : "Operations (Employee)";
  }
}

// ============================================================================
// SECTION 5: API AND HTTP HELPERS
// ============================================================================

async function loadAllFromBackend() {
  try {
    const promises = [
      fetch("/api/vehicles", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/trips", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/fuel", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/fuel/weekly-summary", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/maintenance", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/dashboard/stats", { credentials: "include" }).then(function (r) { return r.json(); }),
      fetch("/api/dashboard/activities", { credentials: "include" }).then(function (r) { return r.json(); })
    ];

    if (currentUser && currentUser.role === "ADMIN") {
      promises.push(fetch("/api/drivers", { credentials: "include" }).then(function (r) { return r.json(); }));
      promises.push(fetch("/api/users", { credentials: "include" }).then(function (r) { return r.json(); }));
    } else {
      // Employees fetch only their own profile if linked to a driver
      promises.push(fetch("/api/drivers/me", { credentials: "include" }).then(function (r) { return r.json(); }));
    }

    const results = await Promise.all(promises);

    vehicles = (results[0].data) || [];
    routes = (results[1].data) || [];
    fuelEntries = (results[2].data) || [];
    weeklyFuel = (results[3].data) || [];
    maintenance = (results[4].data) || [];
    dashboardStats = (results[5].data) || null;
    activities = (results[6].data) || [];

    if (currentUser && currentUser.role === "ADMIN") {
      drivers = (results[7] && results[7].data) || [];
      users = (results[8] && results[8].data) || [];
    } else {
      const myDriver = results[7] && results[7].data;
      drivers = myDriver ? [myDriver] : [];
      users = [];
    }

    renderAll();
  } catch (err) {
    console.error("Error loading fleet data from backend:", err);
    showToast("Error connecting to server. Data may be incomplete.", "error");
  }
}

function renderAll() {
  renderDashboard();
  renderVehicles();
  if (currentUser && currentUser.role === "ADMIN") {
    renderDrivers();
  }
  renderFuelFilters();
  renderFuel();
  renderMaintenance();
  renderRoutes();
  if (currentUser && currentUser.role === "ADMIN") {
    renderUsers();
  }
}

// ============================================================================
// SECTION 18: EVENT LISTENER REGISTRATION
// ============================================================================

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showSection(btn.getAttribute("data-section"));
      closeSidebar();
    });
  });

  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) menuToggle.addEventListener("click", toggleSidebar);

  const backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  const vSearch = document.getElementById("vehicle-search");
  if (vSearch) vSearch.addEventListener("input", renderVehicles);

  const vStatus = document.getElementById("vehicle-status-filter");
  if (vStatus) vStatus.addEventListener("change", renderVehicles);

  const addVBtn = document.getElementById("add-vehicle-btn");
  if (addVBtn) addVBtn.addEventListener("click", function () { openModal("add-vehicle"); });

  const dSearch = document.getElementById("driver-search");
  if (dSearch) dSearch.addEventListener("input", renderDrivers);

  const addDBtn = document.getElementById("add-driver-btn");
  if (addDBtn) addDBtn.addEventListener("click", function () { openModal("add-driver"); });

  document.querySelectorAll("[data-driver-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      driverFilter = chip.getAttribute("data-driver-filter");
      document.querySelectorAll("[data-driver-filter]").forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });
      renderDrivers();
    });
  });

  const fSearch = document.getElementById("fuel-search");
  if (fSearch) fSearch.addEventListener("input", renderFuel);

  const fVehicleFilter = document.getElementById("fuel-vehicle-filter");
  if (fVehicleFilter) fVehicleFilter.addEventListener("change", renderFuel);

  const fDateFilter = document.getElementById("fuel-date-filter");
  if (fDateFilter) fDateFilter.addEventListener("change", renderFuel);

  const fDateClear = document.getElementById("fuel-date-clear");
  if (fDateClear) {
    fDateClear.addEventListener("click", function () {
      if (fDateFilter) fDateFilter.value = "";
      renderFuel();
    });
  }

  const addFBtn = document.getElementById("add-fuel-btn");
  if (addFBtn) addFBtn.addEventListener("click", function () { openModal("add-fuel"); });

  const addMBtn = document.getElementById("add-maintenance-btn");
  if (addMBtn) addMBtn.addEventListener("click", function () { openModal("add-maintenance"); });

  const addUBtn = document.getElementById("add-user-btn");
  if (addUBtn) addUBtn.addEventListener("click", function () { openModal("add-user"); });

  const uSearch = document.getElementById("user-search");
  if (uSearch) uSearch.addEventListener("input", renderUsers);

  const uRoleFilter = document.getElementById("user-role-filter");
  if (uRoleFilter) uRoleFilter.addEventListener("change", renderUsers);

  const uStatusFilter = document.getElementById("user-status-filter");
  if (uStatusFilter) uStatusFilter.addEventListener("change", renderUsers);

  const mClose = document.getElementById("modal-close");
  if (mClose) mClose.addEventListener("click", closeModal);

  const mOverlay = document.getElementById("modal-overlay");
  if (mOverlay) {
    mOverlay.addEventListener("click", function (event) {
      if (event.target.id === "modal-overlay") closeModal();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
      closePopovers();
      closeSidebar();
    }
  });

  const notifyBtn = document.getElementById("notify-btn");
  if (notifyBtn) {
    notifyBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      togglePanel("notify-panel", "notify-btn");
    });
  }

  const userBtn = document.getElementById("user-btn");
  if (userBtn) {
    userBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      togglePanel("user-menu", "user-btn");
    });
  }

  document.addEventListener("click", closePopovers);

  const searchWrap = document.querySelector(".search-wrap");
  if (searchWrap) searchWrap.addEventListener("click", function (e) { e.stopPropagation(); });

  const notifyPanel = document.getElementById("notify-panel");
  if (notifyPanel) notifyPanel.addEventListener("click", function (e) { e.stopPropagation(); });

  const userMenu = document.getElementById("user-menu");
  if (userMenu) {
    userMenu.addEventListener("click", async function (event) {
      event.stopPropagation();
      const action = event.target.getAttribute("data-user-action");
      if (!action) return;

      if (action === "logout") {
        await handleLogout();
      } else if (action === "profile") {
        openModal("profile");
      }
      closePopovers();
    });
  }

  const globalSearch = document.getElementById("global-search");
  if (globalSearch) {
    globalSearch.addEventListener("input", runGlobalSearch);
    globalSearch.addEventListener("focus", runGlobalSearch);
  }

  const mapRetryBtn = document.getElementById("map-retry-btn");
  if (mapRetryBtn) {
    mapRetryBtn.addEventListener("click", function () {
      if (selectedTripId) selectTripRoute(selectedTripId, true);
    });
  }

  window.addEventListener("resize", function () {
    if (routeMap) routeMap.invalidateSize();
  });

  renderNotifications();
}

async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    showToast("Logged out successfully", "info");
    setTimeout(function () {
      window.location.replace("/login.html");
    }, 400);
  } catch (err) {
    window.location.replace("/login.html");
  }
}

function renderNotifications() {
  const isEmployee = currentUser && currentUser.role === "EMPLOYEE";
  const overdueCount = maintenance.filter(function (m) { return m.status === "Overdue"; }).length;
  const offlineCount = vehicles.filter(function (v) { return v.status === "Offline"; }).length;

  const notifs = isEmployee ? [
    { title: overdueCount ? (overdueCount + " service alert(s) for your vehicle") : "Your vehicle service is up to date", detail: overdueCount ? "Scheduled maintenance pending" : "No pending alerts", section: "maintenance" },
    { title: vehicles.length ? (vehicles[0].id + " status: " + vehicles[0].status) : "No vehicle currently assigned", detail: "Assigned vehicle status", section: "vehicles" },
    { title: "FleetFlow System Connected", detail: "Personal operational sync active", section: "dashboard" }
  ] : [
    { title: overdueCount ? (overdueCount + " maintenance services are overdue") : "All maintenance up to date", detail: overdueCount ? "Requires immediate inspection" : "No pending service alerts", section: "maintenance" },
    { title: offlineCount ? (offlineCount + " vehicles offline") : "Full fleet operational", detail: offlineCount ? "Checked into workshop" : "Zero vehicles stranded", section: "vehicles" },
    { title: "MongoDB Atlas Connected", detail: "Real-time bidirectional synchronization active", section: "dashboard" }
  ];

  const list = document.getElementById("notify-list");
  if (list) {
    list.innerHTML = notifs.map(function (item) {
      return '<button type="button" class="notify-item" data-section="' + item.section + '"><strong>' +
        escapeHtml(item.title) + "</strong><span>" + escapeHtml(item.detail) + "</span></button>";
    }).join("");

    list.onclick = function (event) {
      const btn = event.target.closest(".notify-item");
      if (!btn) return;
      showSection(btn.getAttribute("data-section"));
      closePopovers();
    };
  }

  const countBadge = document.getElementById("notify-count");
  if (countBadge) {
    countBadge.textContent = String(overdueCount + (isEmployee ? 0 : offlineCount));
  }
}

// ============================================================================
// SECTION 7 (CONTINUED): NAVIGATION DISPLAY & VIEW SWITCHING
// ============================================================================

function showSection(name) {
  if (currentUser && currentUser.role === "EMPLOYEE" && (name === "drivers" || name === "users")) {
    showToast("Access denied: Administrative privileges required.", "error");
    name = "dashboard";
  }

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

  const copy = pageCopy[name] || ["Fleet Operations", "System Control Console"];
  const titleEl = document.getElementById("page-title");
  const subEl = document.getElementById("page-subtitle");
  if (titleEl) titleEl.textContent = copy[0];
  if (subEl) subEl.textContent = copy[1];

  if (name === "routes") {
    setTimeout(function () {
      initOrUpdateRouteMap();
    }, 120);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const open = !sidebar.classList.contains("is-open");
  sidebar.classList.toggle("is-open", open);
  const backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.hidden = !open;
  if (routeMap) {
    setTimeout(function () { routeMap.invalidateSize(); }, 250);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("is-open");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (backdrop) backdrop.hidden = true;
  if (routeMap) {
    setTimeout(function () { routeMap.invalidateSize(); }, 250);
  }
}

function togglePanel(panelId, btnId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const willOpen = panel.hidden;
  closePopovers();
  panel.hidden = !willOpen;
  const btn = document.getElementById(btnId);
  if (btn) btn.setAttribute("aria-expanded", String(willOpen));
}

function closePopovers() {
  const notifyPanel = document.getElementById("notify-panel");
  if (notifyPanel) notifyPanel.hidden = true;

  const userMenu = document.getElementById("user-menu");
  if (userMenu) userMenu.hidden = true;

  const searchResults = document.getElementById("search-results");
  if (searchResults) searchResults.hidden = true;

  const notifyBtn = document.getElementById("notify-btn");
  if (notifyBtn) notifyBtn.setAttribute("aria-expanded", "false");

  const userBtn = document.getElementById("user-btn");
  if (userBtn) userBtn.setAttribute("aria-expanded", "false");
}

// ============================================================================
// SECTION 4: GENERAL UTILITY FUNCTIONS
// ============================================================================

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
  return Number(n || 0).toLocaleString("en-IN");
}

function formatMoney(n) {
  return "₹" + formatNumber(Math.round(n || 0));
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
    Inactive: "badge-red",
    "Below Average": "badge-yellow",
    "Above Average": "badge-green"
  };
  return '<span class="badge ' + (map[status] || "badge-gray") + '">' + escapeHtml(status) + "</span>";
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// SECTION 8: DASHBOARD DATA AND STATISTICS
// ============================================================================

function renderDashboard() {
  const isEmployee = currentUser && currentUser.role === "EMPLOYEE";
  const activeCount = dashboardStats ? dashboardStats.activeVehicles : vehicles.filter(function (v) { return v.status === "Active"; }).length;
  const totalVehiclesCount = dashboardStats ? dashboardStats.totalVehicles : vehicles.length;
  const overdueCount = dashboardStats ? dashboardStats.overdueMaintenance : maintenance.filter(function (m) { return m.status === "Overdue"; }).length;
  const spend = dashboardStats ? dashboardStats.monthlyFuelSpend : monthlyFuelSpend();

  const kpiEl = document.getElementById("kpi-grid");
  if (kpiEl) {
    if (isEmployee) {
      kpiEl.innerHTML =
        kpiCard("blue", "🚚", totalVehiclesCount, "Assigned to you", "My Vehicle", "up", "Assigned Unit") +
        kpiCard("green", "🛣️", activeCount, "Assigned active trips", "My Active Trips", "up", "On schedule") +
        kpiCard("red", "🔧", overdueCount, "Maintenance alerts", "Service Alerts", overdueCount ? "warn" : "up", overdueCount ? "Needs attention" : "All clear") +
        kpiCard("indigo", "⛽", formatMoney(spend), "Your recorded fill-ups", "My Fuel Cost", "down", "Logged entries");
    } else {
      kpiEl.innerHTML =
        kpiCard("blue", "🚚", totalVehiclesCount, "Vehicles", "Total Fleet", "up", "+1 vs last month") +
        kpiCard("green", "🛣️", activeCount, "Currently active", "Active on Route", "up", "On-time operations") +
        kpiCard("red", "🔧", overdueCount, "Overdue", "Maintenance Alerts", overdueCount ? "warn" : "up", overdueCount ? "Needs attention" : "All clear") +
        kpiCard("indigo", "⛽", formatMoney(spend), "This month", "Fuel Spend", "down", "MongoDB Real-Time");
    }
  }

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
    return sum + Number(entry.cost || 0);
  }, 0);
}

function renderFuelChart() {
  const data = (weeklyFuel && weeklyFuel.length) ? weeklyFuel : [
    { day: "Mon", liters: 82 }, { day: "Tue", liters: 95 }, { day: "Wed", liters: 74 },
    { day: "Thu", liters: 108 }, { day: "Fri", liters: 91 }, { day: "Sat", liters: 120 }, { day: "Sun", liters: 87 }
  ];
  const max = Math.max.apply(null, data.map(function (d) { return d.liters; })) || 1;
  const chart = document.getElementById("fuel-chart");
  if (!chart) return;

  chart.innerHTML = data.map(function (d) {
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
  if (donut) {
    donut.style.background =
      "conic-gradient(#16a34a 0 " + p1 + "%, #64748b " + p1 + "% " + (p1 + p2) + "%, #2563eb " + (p1 + p2) + "% 100%)";
  }

  const legend = document.getElementById("status-legend");
  if (legend) {
    legend.innerHTML =
      legendItem("#16a34a", "On Route", p1) +
      legendItem("#64748b", "Idle", p2) +
      legendItem("#2563eb", "In Shop", 100 - p1 - p2);
  }
}

function legendItem(color, label, pct) {
  return '<li><span class="swatch" style="background:' + color + '"></span>' +
    escapeHtml(label) + " · " + Math.round(pct) + "%</li>";
}

function renderActivity() {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;
  feed.innerHTML = activities.map(function (item) {
    return '<div class="activity"><div class="activity-icon">' + (item.icon || "🚚") +
      "</div><div>" + escapeHtml(item.text) + '</div><span class="when">' +
      escapeHtml(item.time || "Recent") + "</span>" + statusBadge(item.status || "Info") + "</div>";
  }).join("") || "<p class='muted' style='padding: 1rem;'>No recent activities logged.</p>";
}

// ============================================================================
// SECTION 9: VEHICLE MANAGEMENT
// ============================================================================

function renderVehicles() {
  const q = (document.getElementById("vehicle-search").value || "").toLowerCase();
  const status = document.getElementById("vehicle-status-filter").value;
  const rows = vehicles.filter(function (v) {
    const hay = (v.id + " " + v.make + " " + v.model + " " + v.plate).toLowerCase();
    const matchQ = hay.indexOf(q) !== -1;
    const matchS = status === "all" || v.status === status;
    return matchQ && matchS;
  });

  const tbody = document.getElementById("vehicle-table-body");
  if (!tbody) return;

  tbody.innerHTML = rows.map(function (v) {
    return '<tr class="row-click" data-vehicle="' + v.id + '">' +
      "<td><strong>" + escapeHtml(v.id) + "</strong></td>" +
      "<td>" + escapeHtml(v.make + " " + v.model) + "</td>" +
      "<td>" + escapeHtml(v.plate) + "</td>" +
      "<td>" + v.year + "</td>" +
      "<td>" + formatNumber(v.odometer) + " km</td>" +
      "<td>" + statusBadge(v.status) + "</td>" +
      "<td>" + escapeHtml(getDriverName(v.driverId)) + "</td>" +
      '<td><button type="button" class="link-btn" data-view="' + v.id + '">View</button></td></tr>';
  }).join("") || emptyRow(8, "No vehicles match the current filters.");

  tbody.onclick = function (event) {
    const view = event.target.getAttribute("data-view");
    const row = event.target.closest("tr");
    const id = view || (row && row.getAttribute("data-vehicle"));
    if (id) openModal("vehicle-details", id);
  };
}

function emptyRow(cols, text) {
  return '<tr><td colspan="' + cols + '" style="text-align: center; color: var(--muted); padding: 2rem;">' + escapeHtml(text) + "</td></tr>";
}

// ============================================================================
// SECTION 10: DRIVER MANAGEMENT
// ============================================================================

function renderDrivers() {
  if (currentUser && currentUser.role !== "ADMIN") {
    const tbody = document.getElementById("driver-table-body");
    if (tbody) tbody.innerHTML = emptyRow(7, "Access restricted to Fleet Administrators.");
    return;
  }

  const q = (document.getElementById("driver-search").value || "").toLowerCase();
  const rows = drivers.filter(function (d) {
    const hay = (d.name + " " + d.license + " " + d.phone).toLowerCase();
    const matchQ = hay.indexOf(q) !== -1;
    const matchS = driverFilter === "all" || d.status === driverFilter;
    return matchQ && matchS;
  });

  const tbody = document.getElementById("driver-table-body");
  if (!tbody) return;

  tbody.innerHTML = rows.map(function (d) {
    const reassignBtn = (currentUser && currentUser.role === "ADMIN")
      ? '<button type="button" class="link-btn" data-reassign="' + d.id + '">Reassign</button>'
      : '<span class="muted">—</span>';

    return "<tr><td><strong>" + escapeHtml(d.name) + "</strong></td><td>" + escapeHtml(d.license) +
      "</td><td>" + escapeHtml(d.phone) + "</td><td>" + statusBadge(d.status) +
      "</td><td>" + d.safety + " / 100</td><td>" + escapeHtml(d.vehicleId || "Unassigned") +
      "</td><td>" + reassignBtn + "</td></tr>";
  }).join("") || emptyRow(7, "No drivers match the current filters.");

  tbody.onclick = function (event) {
    const id = event.target.getAttribute("data-reassign");
    if (id) openModal("reassign", id);
  };
}

// ============================================================================
// SECTION 12: FUEL MANAGEMENT
// ============================================================================

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
  if (!select) return;
  const current = select.value || "all";
  select.innerHTML = '<option value="all">All vehicles</option>' + vehicles.map(function (v) {
    return '<option value="' + v.id + '">' + v.id + " — " + v.make + "</option>";
  }).join("");
  select.value = current;
  if (!select.value) select.value = "all";
}

function renderFuel() {
  const q = (document.getElementById("fuel-search").value || "").toLowerCase();
  const vehicleId = document.getElementById("fuel-vehicle-filter").value;
  const date = document.getElementById("fuel-date-filter").value;
  const avg = calculateFleetAverage();

  const rows = fuelEntries
    .slice()
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
    .filter(function (e) {
      const vehicle = getVehicleById(e.vehicleId);
      const driver = vehicle ? getDriverName(vehicle.driverId) : "";
      const hay = (e.date + " " + e.vehicleId + " " + driver).toLowerCase();
      const matchQ = hay.indexOf(q) !== -1;
      const matchV = vehicleId === "all" || e.vehicleId === vehicleId;
      const matchD = !date || e.date === date;
      return matchQ && matchV && matchD;
    });

  const tbody = document.getElementById("fuel-table-body");
  if (!tbody) return;

  tbody.innerHTML = rows.map(function (e) {
    const vehicle = getVehicleById(e.vehicleId);
    const driver = vehicle ? getDriverName(vehicle.driverId) : "—";
    const kmpl = calculateFuelEfficiency(e);
    const text = kmpl === null ? "—" : kmpl.toFixed(1) + " km/L";
    const below = kmpl !== null && kmpl < avg;
    return "<tr><td>" + e.date + "</td><td><strong>" + escapeHtml(e.vehicleId) + "</strong></td><td>" +
      escapeHtml(driver) + "</td><td>" + e.liters + " L</td><td>" + formatMoney(e.cost) +
      "</td><td>" + formatNumber(e.odometer) + " km</td><td>" + text + "</td><td>" +
      (kmpl === null ? statusBadge("Info") : statusBadge(below ? "Below Average" : "Above Average")) +
      "</td></tr>";
  }).join("") || emptyRow(8, "No fuel records found.");
}

// ============================================================================
// SECTION 13: MAINTENANCE MANAGEMENT
// ============================================================================

function classifyMaintenance(item) {
  if (item.status === "Completed") return "completed";
  const today = new Date().toISOString().split("T")[0];
  if (item.date < today) return "overdue";
  return "upcoming";
}

function renderMaintenance() {
  const groups = { overdue: [], upcoming: [], completed: [] };
  maintenance.forEach(function (item) {
    groups[classifyMaintenance(item)].push(item);
  });

  const board = document.getElementById("maintenance-board");
  if (!board) return;

  board.innerHTML =
    kanbanColumn("Overdue", "overdue", groups.overdue, "OVERDUE") +
    kanbanColumn("Upcoming", "upcoming", groups.upcoming, "DUE SOON") +
    kanbanColumn("Completed", "completed", groups.completed, "COMPLETED");

  // Allow clicking tickets to toggle complete status if admin
  board.onclick = async function (event) {
    const completeBtn = event.target.closest("[data-complete-ticket]");
    if (!completeBtn || !currentUser || currentUser.role !== "ADMIN") return;
    const ticketId = completeBtn.getAttribute("data-complete-ticket");
    await toggleTicketStatus(ticketId);
  };
}

function kanbanColumn(title, key, items, badge) {
  const cards = items.map(function (m) {
    const warn = key === "overdue" ? " ⚠️" : "";
    const actionBtn = (key !== "completed" && currentUser && currentUser.role === "ADMIN")
      ? '<button type="button" class="link-btn" data-complete-ticket="' + m.id + '" style="margin-top: 0.5rem; display: block;">Mark Complete</button>'
      : '';

    return '<article class="ticket ' + key + '"><h4>' + escapeHtml(m.vehicleId) + " · " +
      escapeHtml(m.type) + warn + "</h4><p>Scheduled: " + m.date + "</p><p>Est. cost: " +
      formatMoney(m.cost) + "</p><p>Priority: " + escapeHtml(m.priority) + "</p>" +
      statusBadge(badge) + actionBtn + "</article>";
  }).join("") || "<p class='muted' style='padding: 0.8rem;'>No tickets in this column.</p>";

  return '<div class="kanban-col"><h3>' + title + " <span>" + items.length +
    "</span></h3>" + cards + "</div>";
}

async function toggleTicketStatus(ticketId) {
  try {
    const res = await fetch("/api/maintenance/" + ticketId + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "Completed" })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Service ticket marked as Completed", "success");
      await loadAllFromBackend();
    } else {
      showToast(data.message || "Failed to update ticket", "error");
    }
  } catch (err) {
    showToast("Error updating ticket", "error");
  }
}

// ============================================================================
// SECTION 14: ROUTES AND TRIPS (INTERACTIVE MAP & LEAFLET)
// ============================================================================

function renderRoutes() {
  const tbody = document.getElementById("route-table-body");
  if (!tbody) return;

  if (!selectedTripId && routes.length > 0) {
    selectedTripId = routes[0].id;
  }

  tbody.innerHTML = routes.map(function (r) {
    const vehicle = getVehicleById(r.vehicleId);
    const driver = vehicle ? getDriverName(vehicle.driverId) : "—";
    const isSelected = (selectedTripId === r.id);
    const selClass = isSelected ? " is-selected" : "";

    // Status action: Employees and Admins can update status
    const statusSelect = '<select class="route-status-select" data-trip-id="' + r.id + '" style="padding: 2px 6px; font-size: 0.8rem; border-radius: 6px;">' +
      ['On Time', 'Delayed', 'Completed', 'Cancelled', 'Idle'].map(function (s) {
        return '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join("") + '</select>';

    const actionBtn = '<button type="button" class="link-btn view-route-btn" data-route-id="' + r.id + '">View Route</button>';

    return '<tr class="row-click' + selClass + '" data-route-id="' + r.id + '"><td><strong>' + escapeHtml(r.id) + '</strong></td><td>' + escapeHtml(r.vehicleId) +
      '</td><td>' + escapeHtml(driver) + '</td><td>' + escapeHtml(r.start) +
      '</td><td>' + escapeHtml(r.end) + '</td><td>' + r.distance + ' km</td><td>' +
      escapeHtml(r.duration) + '</td><td>' + statusBadge(r.status) + ' ' + statusSelect + '</td>' +
      '<td>' + actionBtn + '</td></tr>';
  }).join("") || emptyRow(9, "No active routes found for current assignment.");

  tbody.onclick = function (event) {
    if (event.target.classList.contains("route-status-select")) return;

    const row = event.target.closest("[data-route-id]");
    if (row) {
      const tripId = row.getAttribute("data-route-id");
      selectTripRoute(tripId);
    }
  };

  tbody.onchange = async function (event) {
    if (event.target.classList.contains("route-status-select")) {
      const tripId = event.target.getAttribute("data-trip-id");
      const newStatus = event.target.value;
      await updateTripStatus(tripId, newStatus);
    }
  };

  if (currentSection === "routes") {
    initOrUpdateRouteMap();
  }
}

// ============================================================================
// SECTION 14 (CONTINUED): INTERACTIVE ROUTE MAP & HIGHWAY GEOMETRY
// ============================================================================

// GPS Integration Point Hook (For future telematics feed — not yet implemented)

function initOrUpdateRouteMap() {
  if (typeof L === "undefined") {
    setTimeout(initOrUpdateRouteMap, 150);
    return;
  }

  const mapContainer = document.getElementById("route-map");
  if (!mapContainer) return;

  if (!routeMap) {
    routeMap = L.map("route-map", {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true
    }).setView([17.3850, 78.4867], 7);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | Road Routing: <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a>'
    }).addTo(routeMap);

    routeLayerGroup = L.layerGroup().addTo(routeMap);
  } else {
    routeMap.invalidateSize();
  }

  if (selectedTripId) {
    selectTripRoute(selectedTripId);
  } else if (routes.length > 0) {
    selectTripRoute(routes[0].id);
  }
}

async function selectTripRoute(tripId, forceRetry = false) {
  selectedTripId = tripId;

  // Highlight selected table row
  document.querySelectorAll("#route-table-body tr").forEach(function (row) {
    row.classList.toggle("is-selected", row.getAttribute("data-route-id") === tripId);
  });

  const loadingEl = document.getElementById("map-loading");
  const errorEl = document.getElementById("map-error");
  const errTextEl = document.getElementById("map-error-text");
  const metricsEl = document.getElementById("map-metrics");
  const titleEl = document.getElementById("map-trip-title");
  const captionEl = document.getElementById("map-caption");
  const statusTextEl = document.getElementById("map-status-text");
  const distEl = document.getElementById("map-metric-distance");
  const durEl = document.getElementById("map-metric-duration");

  if (loadingEl) loadingEl.hidden = false;
  if (errorEl) errorEl.hidden = true;

  // Fallback metadata from client trip cache
  const localTrip = routes.find(function (r) { return r.id === tripId; }) || {};
  const localVehicle = getVehicleById(localTrip.vehicleId);
  const localDriver = localVehicle ? getDriverName(localVehicle.driverId) : (localTrip.driverId ? getDriverName(localTrip.driverId) : "—");
  const defaultOriginName = localTrip.start || localTrip.startDestination || "Origin";
  const defaultDestName = localTrip.end || localTrip.endDestination || "Destination";

  try {
    const fetchUrl = "/api/trips/" + encodeURIComponent(tripId) + "/route" +
      (forceRetry ? "?retry=true&t=" + Date.now() : "");

    const res = await fetch(fetchUrl, {
      credentials: "include"
    });
    const data = await res.json();

    if (!res.ok || !data.success || !data.data) {
      throw new Error(data.message || "Route coordinates are unavailable for this trip.");
    }

    const r = data.data;

    // Defensive extraction of origin and destination objects
    const origin = (r.origin && typeof r.origin === "object") ? r.origin : {};
    const dest = (r.destination && typeof r.destination === "object") ? r.destination : {};
    const originName = (typeof origin.name === "string" && origin.name.trim()) ? origin.name.trim() : defaultOriginName;
    const destName = (typeof dest.name === "string" && dest.name.trim()) ? dest.name.trim() : defaultDestName;
    const vehicleId = r.vehicleId || localTrip.vehicleId || "—";
    const driverId = r.driverId || localTrip.driverId || "";
    const driverName = driverId ? getDriverName(driverId) : localDriver;
    const status = r.status || localTrip.status || "On Time";

    // Validate coordinates presence
    const hasOriginCoords = typeof origin.lat === "number" && typeof origin.lng === "number" &&
      Number.isFinite(origin.lat) && Number.isFinite(origin.lng);
    const hasDestCoords = typeof dest.lat === "number" && typeof dest.lng === "number" &&
      Number.isFinite(dest.lat) && Number.isFinite(dest.lng);
    const hasValidCoordinates = Array.isArray(r.coordinates) && r.coordinates.length >= 2 &&
      r.coordinates.every(function (coord) {
        return Array.isArray(coord) && coord.length >= 2 &&
          typeof coord[0] === "number" && Number.isFinite(coord[0]) &&
          typeof coord[1] === "number" && Number.isFinite(coord[1]);
      });

    if (r.available === false || !hasOriginCoords || !hasDestCoords || !hasValidCoordinates) {
      if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
      }
      if (metricsEl) metricsEl.hidden = true;
      if (titleEl) titleEl.textContent = tripId + " · " + originName + " → " + destName;
      if (captionEl) captionEl.textContent = originName + " → " + destName + " · Vehicle " + vehicleId + " · Coordinates unavailable";
      if (statusTextEl) statusTextEl.textContent = "Coordinates Unavailable";
      if (errTextEl) errTextEl.textContent = r.message || "Route coordinates are unavailable for this trip.";
      if (errorEl) errorEl.hidden = false;
      return;
    }

    if (!routeMap) {
      initOrUpdateRouteMap();
    }

    if (routeLayerGroup) {
      routeLayerGroup.clearLayers();
    }

    // Polyline following actual road geometry from OSRM
    const polyline = L.polyline(r.coordinates, {
      color: "#4f46e5",
      weight: 5,
      opacity: 0.88,
      lineJoin: "round",
      lineCap: "round"
    }).addTo(routeLayerGroup);

    if (!r.isRoadRoute) {
      polyline.setStyle({ dashArray: "8, 8", color: "#6366f1" });
    }

    // Custom Origin Marker (A)
    const originIcon = L.divIcon({
      className: "custom-leaflet-pin",
      html: '<div class="map-pin-custom pin-origin" title="Origin: ' + escapeHtml(originName) + '"><span>A</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });
    const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(routeLayerGroup);
    originMarker.bindTooltip("Origin: " + escapeHtml(originName), { direction: "top" });

    // Custom Destination Marker (B)
    const destIcon = L.divIcon({
      className: "custom-leaflet-pin",
      html: '<div class="map-pin-custom pin-dest" title="Destination: ' + escapeHtml(destName) + '"><span>B</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });
    const destMarker = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(routeLayerGroup);
    destMarker.bindTooltip("Destination: " + escapeHtml(destName), { direction: "top" });

    // Rich popup on route and markers
    const distanceVal = (r.distanceKm != null ? r.distanceKm : localTrip.distance) || 0;
    const durationVal = r.durationFormatted || localTrip.duration || "N/A";

    const popupHtml = '<div style="font-family: inherit; font-size: 0.85rem; line-height: 1.5; min-width: 210px;">' +
      '<div style="font-weight: 700; color: #4f46e5; font-size: 0.95rem; margin-bottom: 4px;">Route ' + escapeHtml(r.tripId || tripId) + '</div>' +
      '<div><strong>Highway Corridor:</strong> ' + escapeHtml(originName) + ' &rarr; ' + escapeHtml(destName) + '</div>' +
      '<div><strong>Vehicle:</strong> ' + escapeHtml(vehicleId) + '</div>' +
      '<div><strong>Driver:</strong> ' + escapeHtml(driverName) + '</div>' +
      '<div><strong>Road Distance:</strong> ' + distanceVal + ' km</div>' +
      '<div><strong>Est. Travel Time:</strong> ' + escapeHtml(durationVal) + '</div>' +
      '<div style="margin-top: 6px;">' + statusBadge(status) + '</div>' +
      '</div>';

    originMarker.bindPopup(popupHtml);
    destMarker.bindPopup(popupHtml);
    polyline.bindPopup(popupHtml);

    // Fit map bounds to encompass the entire route
    const bounds = polyline.getBounds();
    if (bounds && bounds.isValid && bounds.isValid()) {
      routeMap.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 14
      });
    }

    // Update map card labels and captions
    if (titleEl) titleEl.textContent = (r.tripId || tripId) + " · " + originName + " → " + destName;
    if (captionEl) {
      captionEl.textContent = originName + " → " + destName + " highway corridor · Vehicle " + vehicleId + " · Planned Route";
    }
    if (statusTextEl) {
      statusTextEl.textContent = r.isRoadRoute ? "Road Route Active (OSRM)" : "Direct Trajectory (Fallback)";
    }
    if (distEl) distEl.textContent = distanceVal + " km";
    if (durEl) durEl.textContent = durationVal;
    if (metricsEl) metricsEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
  } catch (err) {
    console.error("Error loading route:", err);
    if (routeLayerGroup) {
      routeLayerGroup.clearLayers();
    }
    if (metricsEl) metricsEl.hidden = true;
    if (titleEl) titleEl.textContent = tripId + " · " + defaultOriginName + " → " + defaultDestName;
    if (captionEl) captionEl.textContent = defaultOriginName + " → " + defaultDestName + " · Vehicle " + (localTrip.vehicleId || "—");
    if (statusTextEl) statusTextEl.textContent = "Route Unavailable";
    if (errTextEl) errTextEl.textContent = err.message || "Route coordinates are unavailable for this trip.";
    if (errorEl) errorEl.hidden = false;
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

async function updateTripStatus(tripId, newStatus) {
  try {
    const res = await fetch("/api/trips/" + tripId + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Trip " + tripId + " updated to " + newStatus, "success");
      await loadAllFromBackend();
    } else {
      showToast(data.message || "Failed to update trip", "error");
      renderRoutes();
    }
  } catch (err) {
    showToast("Network error updating trip status", "error");
    renderRoutes();
  }
}

// ============================================================================
// SECTION 11: USER MANAGEMENT (ADMIN ONLY)
// ============================================================================

function renderUsers() {
  const q = (document.getElementById("user-search") ? document.getElementById("user-search").value : "").toLowerCase();
  const roleFilter = document.getElementById("user-role-filter") ? document.getElementById("user-role-filter").value : "all";
  const statusFilter = document.getElementById("user-status-filter") ? document.getElementById("user-status-filter").value : "all";

  const rows = users.filter(function (u) {
    const hay = (u.username + " " + u.name + " " + u.email).toLowerCase();
    const matchQ = hay.indexOf(q) !== -1;
    const matchR = roleFilter === "all" || u.role === roleFilter;
    const matchS = statusFilter === "all" || u.status === statusFilter;
    return matchQ && matchR && matchS;
  });

  const tbody = document.getElementById("user-table-body");
  if (!tbody) return;

  tbody.innerHTML = rows.map(function (u) {
    const isSelf = currentUser && (currentUser.id === u._id || currentUser._id === u._id);
    const toggleAction = isSelf
      ? '<span class="muted">Active (You)</span>'
      : ('<button type="button" class="link-btn" data-toggle-user="' + u._id + '" data-new-status="' + (u.status === 'Active' ? 'Inactive' : 'Active') + '">' +
         (u.status === 'Active' ? 'Deactivate' : 'Activate') + '</button>');

    return "<tr><td><strong>" + escapeHtml(u.username) + "</strong></td><td>" + escapeHtml(u.name) +
      "</td><td>" + escapeHtml(u.email) + "</td><td>" + statusBadge(u.role === 'ADMIN' ? 'Warning' : 'Info') + " " + escapeHtml(u.role) +
      "</td><td>" + statusBadge(u.status) + "</td><td>" + escapeHtml(u.phone || '—') +
      "</td><td>" + escapeHtml(u.driverId || 'None') + "</td><td>" + toggleAction + "</td></tr>";
  }).join("") || emptyRow(8, "No users found.");

  tbody.onclick = async function (event) {
    const btn = event.target.closest("[data-toggle-user]");
    if (!btn) return;
    const userId = btn.getAttribute("data-toggle-user");
    const newStatus = btn.getAttribute("data-new-status");
    await handleToggleUserStatus(userId, newStatus);
  };
}

async function handleToggleUserStatus(userId, newStatus) {
  try {
    const res = await fetch("/api/users/" + userId + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message, "success");
      await loadAllFromBackend();
    } else {
      showToast(data.message || "Failed to update user status", "error");
    }
  } catch (err) {
    showToast("Error updating user status", "error");
  }
}

// ============================================================================
// SECTION 16: TABLES, FILTERS, AND SEARCH
// ============================================================================

function runGlobalSearch() {
  const box = document.getElementById("search-results");
  const q = (document.getElementById("global-search").value || "").trim().toLowerCase();
  if (!box) return;

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

  // Only Admins can search across driver directory
  if (currentUser && currentUser.role === "ADMIN") {
    drivers.forEach(function (d) {
      const hay = (d.name + " " + d.license + " " + d.phone).toLowerCase();
      if (hay.indexOf(q) !== -1) {
        hits.push({ section: "drivers", title: d.name, meta: "Driver · " + d.license });
      }
    });
  }

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

// ============================================================================
// SECTION 17: MODAL AND NOTIFICATION UTILITIES
// ============================================================================

function openModal(mode, id) {
  if (currentUser && currentUser.role === "EMPLOYEE") {
    if (mode === "add-vehicle" || mode === "add-driver" || mode === "add-user" || mode === "reassign") {
      showToast("Access denied: Administrative privileges required.", "error");
      return;
    }
  }

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
  } else if (mode === "add-user") {
    title.textContent = "Create Employee Account";
    body.innerHTML = userFormHtml();
  } else if (mode === "profile") {
    title.textContent = "My Profile";
    body.innerHTML = profileFormHtml();
  }

  overlay.hidden = false;
  overlay.classList.add("is-open");

  const form = body.querySelector("form");
  if (form) {
    form.addEventListener("submit", handleModalSubmit);
    form.addEventListener("click", function (event) {
      if (event.target.hasAttribute("data-cancel")) closeModal();
    });

    const grantLoginCb = form.querySelector("#user-grant-login");
    const loginBox = form.querySelector("#user-login-box");
    const noticeBox = form.querySelector("#user-no-login-notice");
    if (grantLoginCb && loginBox) {
      grantLoginCb.addEventListener("change", function () {
        const isChecked = this.checked;
        loginBox.hidden = !isChecked;
        if (noticeBox) noticeBox.hidden = isChecked;
        const userInput = form.querySelector("#username");
        const emailInput = form.querySelector("#email");
        const passInput = form.querySelector("#password");
        if (userInput) userInput.required = isChecked;
        if (emailInput) emailInput.required = isChecked;
        if (passInput) passInput.required = isChecked;
        if (!isChecked) {
          if (userInput) userInput.value = "";
          if (emailInput) emailInput.value = "";
          if (passInput) passInput.value = "";
          clearErrors(form);
        }
      });
    }
  }
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.classList.remove("is-open");
    overlay.hidden = true;
  }
  const body = document.getElementById("modal-body");
  if (body) body.innerHTML = "";
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
    (extra.required ? "required " : "") + (extra.value ? 'value="' + escapeHtml(extra.value) + '" ' : "") +
    (extra.min ? 'min="' + extra.min + '" ' : "") + (extra.placeholder ? 'placeholder="' + escapeHtml(extra.placeholder) + '" ' : "") +
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
    '<button type="submit" class="btn btn-primary" id="modal-submit-btn">' + submitLabel + "</button></div>";
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
    field("year", "Year", "number", { required: true, min: "1990", value: "2024" }) +
    field("odometer", "Odometer (km)", "number", { required: true, min: "0", value: "10000" }) +
    selectField("fuelType", "Fuel Type", optionList([
      { value: "Diesel", label: "Diesel" },
      { value: "Petrol", label: "Petrol" },
      { value: "CNG", label: "CNG" },
      { value: "Electric", label: "Electric" }
    ])) +
    selectField("status", "Status", optionList([
      { value: "Active", label: "Active" },
      { value: "Idle", label: "Idle" },
      { value: "In Shop", label: "In Shop" },
      { value: "Offline", label: "Offline" }
    ])) +
    selectField("driverId", "Assign Driver", driverOpts, true, false) +
    formActions("Add Vehicle to Atlas") + "</form>";
}

function driverFormHtml() {
  const vehicleOpts = '<option value="">Unassigned</option>' + optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id + " — " + v.make + " " + v.model };
  }));
  return '<form id="modal-form" class="form-grid" novalidate>' +
    field("name", "Driver Name", "text", { required: true, placeholder: "e.g. Ramesh Reddy" }) +
    field("license", "License Number", "text", { required: true, placeholder: "TG09 2024009988" }) +
    field("phone", "Phone", "tel", { required: true, placeholder: "10-digit mobile number" }) +
    field("safety", "Safety Score (70-100)", "number", { required: true, min: "70", value: "95" }) +
    selectField("status", "Shift Status", optionList([
      { value: "Active", label: "Active" },
      { value: "Off-Duty", label: "Off-Duty" }
    ])) +
    selectField("vehicleId", "Assigned Vehicle", vehicleOpts, false, false) +
    formActions("Add Driver to Atlas") + "</form>";
}

function fuelFormHtml() {
  const vehicleOpts = optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id + " — " + v.make + " " + v.model };
  }));
  const today = new Date().toISOString().split("T")[0];
  return '<form id="modal-form" class="form-grid" novalidate>' +
    selectField("vehicleId", "Vehicle", vehicleOpts, true) +
    field("date", "Date", "date", { required: true, value: today }) +
    field("liters", "Liters", "number", { required: true, min: "1", value: "80" }) +
    field("cost", "Cost (₹)", "number", { required: true, min: "1", value: "7520" }) +
    field("odometer", "Current Odometer (km)", "number", { required: true, min: "0", full: true, placeholder: "Enter current odometer reading" }) +
    formActions("Save Fuel Record") + "</form>";
}

function maintenanceFormHtml() {
  const vehicleOpts = optionList(vehicles.map(function (v) {
    return { value: v.id, label: v.id + " — " + v.make + " " + v.model };
  }));
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 4);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  return '<form id="modal-form" class="form-grid" novalidate>' +
    selectField("vehicleId", "Vehicle", vehicleOpts) +
    selectField("type", "Service Type", optionList([
      { value: "Oil Change", label: "Oil Change" },
      { value: "Brake Inspection", label: "Brake Inspection" },
      { value: "Tire Rotation", label: "Tire Rotation" },
      { value: "Engine Service", label: "Engine Service" },
      { value: "Battery Replacement", label: "Battery Replacement" },
      { value: "AC Service", label: "AC Service" },
      { value: "General Inspection", label: "General Inspection" }
    ])) +
    field("date", "Scheduled Date", "date", { required: true, value: nextWeekStr }) +
    field("cost", "Estimated Cost (₹)", "number", { required: true, min: "1", value: "4500" }) +
    selectField("priority", "Priority", optionList([
      { value: "Low", label: "Low" },
      { value: "Medium", label: "Medium" },
      { value: "High", label: "High" }
    ])) +
    '<div class="field full"><label for="notes">Notes</label><textarea id="notes" name="notes" placeholder="Service notes, garage details..."></textarea></div>' +
    formActions("Schedule Service") + "</form>";
}

function reassignFormHtml(driverId) {
  const driver = getDriverById(driverId);
  if (!driver) return "<p>Driver not found.</p>";
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
    formActions("Confirm Reassignment") + "</form>";
}

function userFormHtml() {
  const driverOpts = '<option value="">None (General Employee)</option>' + optionList(drivers.map(function (d) {
    return { value: d.id, label: d.id + " — " + d.name };
  }));

  return '<form id="modal-form" class="form-grid" novalidate>' +
    field("name", "Full Name", "text", { required: true, placeholder: "e.g. Rahul Sharma" }) +
    field("phone", "Phone Number", "tel", { placeholder: "10-digit mobile number" }) +
    '<div class="field full" style="margin-top: 4px; margin-bottom: 4px;">' +
      '<label class="checkbox-label" for="user-grant-login">' +
        '<input type="checkbox" id="user-grant-login" name="grantLogin" checked class="checkbox-input">' +
        '<span>Grant Employee Login Access</span>' +
      '</label>' +
    '</div>' +
    '<div id="user-login-box" class="form-grid full" style="grid-column: 1 / -1; margin-top: 2px;">' +
      field("username", "Username", "text", { required: true, placeholder: "e.g. employee2" }) +
      field("email", "Email Address", "email", { required: true, placeholder: "rahul@fleetflow.local" }) +
      '<div class="field full"><label for="password">Initial Password (min 6 chars)</label><input id="password" name="password" type="password" required placeholder="At least 6 characters"><div class="error" data-error-for="password"></div></div>' +
    '</div>' +
    '<div id="user-no-login-notice" class="field full" style="margin-top: 4px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; color: #92400e; font-size: 0.84rem; line-height: 1.4;" hidden>' +
      '<strong>Employee Login Access Disabled:</strong> Login credentials are required to create an active user account in User Management. Enable the checkbox above to grant login access. To create an operational driver record without login access, use the Add Driver form on the Drivers page.' +
    '</div>' +
    selectField("driverId", "Link to Driver Profile", driverOpts, false, false) +
    formActions("Create Employee Account") + "</form>";
}

function profileFormHtml() {
  if (!currentUser) return "<p>Not logged in.</p>";
  return '<form id="modal-form" class="form-grid" novalidate>' +
    '<div class="field"><label>Username</label><input value="' + escapeHtml(currentUser.username) + '" disabled></div>' +
    '<div class="field"><label>Role</label><input value="' + escapeHtml(currentUser.role) + '" disabled></div>' +
    field("name", "Full Name", "text", { required: true, value: currentUser.name }) +
    field("phone", "Phone", "tel", { value: currentUser.phone || "" }) +
    '<div class="field full"><label>Change Password (optional)</label><input type="password" id="newPassword" name="newPassword" placeholder="New password (leave blank to keep current)"></div>' +
    '<div class="field full"><label>Current Password (required to save changes)</label><input type="password" id="currentPassword" name="currentPassword" placeholder="Enter current password"></div>' +
    formActions("Update Profile") + "</form>";
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
    }).join("") || "<li>No recent trips recorded.</li>") +
    "</ul>";
}

function detail(label, value) {
  return "<div><dt>" + escapeHtml(String(label)) + "</dt><dd>" + escapeHtml(String(value)) + "</dd></div>";
}

// ============================================================================
// SECTION 15: FORM VALIDATION AND SUBMISSION
// ============================================================================

async function handleModalSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = document.getElementById("modal-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving to Atlas...";
  }

  try {
    if (modalMode === "add-vehicle") await submitVehicle(form);
    else if (modalMode === "add-driver") await submitDriver(form);
    else if (modalMode === "add-fuel") await submitFuel(form);
    else if (modalMode === "add-maintenance") await submitMaintenance(form);
    else if (modalMode === "reassign") await submitReassign(form);
    else if (modalMode === "add-user") await submitUser(form);
    else if (modalMode === "profile") await submitProfile(form);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

function setFieldError(form, name, message) {
  const box = form.querySelector('[data-error-for="' + name + '"]');
  const input = form.elements[name];
  if (box) box.textContent = message || "";
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearErrors(form) {
  if (!form) return;
  form.querySelectorAll("[data-error-for]").forEach(function (box) {
    box.textContent = "";
  });
  form.querySelectorAll("[aria-invalid]").forEach(function (input) {
    input.setAttribute("aria-invalid", "false");
  });
}

function required(form, names) {
  let ok = true;
  names.forEach(function (name) {
    const value = String(form.elements[name] ? form.elements[name].value : "").trim();
    if (!value) {
      setFieldError(form, name, "This field is required.");
      ok = false;
    } else {
      setFieldError(form, name, "");
    }
  });
  return ok;
}

async function submitVehicle(form) {
  if (!required(form, ["id", "make", "model", "plate", "year", "odometer", "fuelType", "status"])) return;

  const payload = {
    id: form.elements.id.value.trim().toUpperCase(),
    make: form.elements.make.value.trim(),
    model: form.elements.model.value.trim(),
    plate: form.elements.plate.value.trim().toUpperCase(),
    year: Number(form.elements.year.value),
    odometer: Number(form.elements.odometer.value),
    fuelType: form.elements.fuelType.value,
    status: form.elements.status.value,
    driverId: form.elements.driverId.value
  };

  const res = await fetch("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Vehicle " + payload.id + " saved to MongoDB Atlas!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to add vehicle", "error");
    if (data.message && data.message.includes("Vehicle ID")) setFieldError(form, "id", data.message);
    if (data.message && data.message.includes("License plate")) setFieldError(form, "plate", data.message);
  }
}

async function submitDriver(form) {
  if (!required(form, ["name", "license", "phone", "safety", "status"])) return;

  const phone = form.elements.phone.value.trim();
  if (!/^\d{10}$/.test(phone)) {
    setFieldError(form, "phone", "Enter a valid 10-digit phone number.");
    return;
  }

  const payload = {
    name: form.elements.name.value.trim(),
    license: form.elements.license.value.trim(),
    phone: phone,
    safety: Number(form.elements.safety.value),
    status: form.elements.status.value,
    vehicleId: form.elements.vehicleId.value
  };

  const res = await fetch("/api/drivers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Driver " + payload.name + " saved to MongoDB Atlas!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to create driver", "error");
    if (data.message && data.message.includes("License")) setFieldError(form, "license", data.message);
  }
}

async function submitFuel(form) {
  if (!required(form, ["vehicleId", "date", "liters", "cost", "odometer"])) return;

  const vehicleId = form.elements.vehicleId.value;
  const odometer = Number(form.elements.odometer.value);
  const vehicle = getVehicleById(vehicleId);

  if (vehicle && odometer < vehicle.odometer) {
    setFieldError(form, "odometer", "Odometer cannot be lower than current reading (" + vehicle.odometer + " km).");
    return;
  }

  const payload = {
    vehicleId: vehicleId,
    date: form.elements.date.value,
    liters: Number(form.elements.liters.value),
    cost: Number(form.elements.cost.value),
    odometer: odometer
  };

  const res = await fetch("/api/fuel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Fuel entry saved and vehicle odometer updated!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to save fuel entry", "error");
  }
}

async function submitMaintenance(form) {
  if (!required(form, ["vehicleId", "type", "date", "cost", "priority"])) return;

  const payload = {
    vehicleId: form.elements.vehicleId.value,
    type: form.elements.type.value,
    date: form.elements.date.value,
    cost: Number(form.elements.cost.value),
    priority: form.elements.priority.value,
    notes: form.elements.notes.value.trim()
  };

  const res = await fetch("/api/maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Maintenance ticket saved to MongoDB Atlas!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to schedule service", "error");
  }
}

async function submitReassign(form) {
  const driverId = form.elements.driverId.value;
  const vehicleId = form.elements.vehicleId.value;

  const res = await fetch("/api/drivers/" + driverId + "/assign", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ vehicleId: vehicleId })
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Driver assignment updated in MongoDB Atlas!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to reassign driver", "error");
  }
}

async function submitUser(form) {
  clearErrors(form);
  const grantLoginCb = form.querySelector("#user-grant-login");
  const grantLogin = grantLoginCb ? grantLoginCb.checked : true;

  if (!grantLogin) {
    showToast("Employee login access must be enabled to create an employee account.", "error");
    const noticeBox = form.querySelector("#user-no-login-notice");
    if (noticeBox) noticeBox.hidden = false;
    return;
  }

  if (!required(form, ["name", "username", "email", "password"])) return;

  const phone = form.elements.phone ? form.elements.phone.value.trim() : "";
  if (phone && !/^\d{10}$/.test(phone)) {
    setFieldError(form, "phone", "Enter a valid 10-digit phone number.");
    return;
  }

  const pwd = form.elements.password.value;
  if (pwd.length < 6) {
    setFieldError(form, "password", "Password must be at least 6 characters.");
    return;
  }

  const email = form.elements.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(form, "email", "Please enter a valid email address.");
    return;
  }

  const payload = {
    username: form.elements.username.value.trim(),
    name: form.elements.name.value.trim(),
    email: email,
    password: pwd,
    phone: phone,
    driverId: form.elements.driverId ? form.elements.driverId.value.trim() : "",
    grantLogin: true,
    role: "EMPLOYEE"
  };

  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    showToast("Employee account '" + payload.username + "' created in MongoDB Atlas!", "success");
    await loadAllFromBackend();
  } else {
    showToast(data.message || "Failed to create user", "error");
    if (data.message && data.message.toLowerCase().includes("username")) setFieldError(form, "username", data.message);
    if (data.message && data.message.toLowerCase().includes("email")) setFieldError(form, "email", data.message);
    if (data.message && data.message.toLowerCase().includes("driver")) setFieldError(form, "driverId", data.message);
  }
}

async function submitProfile(form) {
  const payload = {
    name: form.elements.name.value.trim(),
    phone: form.elements.phone ? form.elements.phone.value.trim() : "",
    currentPassword: form.elements.currentPassword ? form.elements.currentPassword.value : "",
    newPassword: form.elements.newPassword ? form.elements.newPassword.value : ""
  };

  const res = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.ok && data.success) {
    closeModal();
    currentUser = data.data;
    updateUserChip(currentUser);
    showToast("Profile updated successfully", "success");
  } else {
    showToast(data.message || "Failed to update profile", "error");
  }
}

// ============================================================================
// SECTION 17 (CONTINUED): TOAST NOTIFICATIONS & FEEDBACK
// ============================================================================

function showToast(message, type) {
  const stack = document.getElementById("toast-stack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "info");
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3500);
}
