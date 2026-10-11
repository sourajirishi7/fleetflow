# FleetFlow — Full-Stack Fleet Management System

A production-ready, full-stack Fleet Management System built with **Express.js**, **MongoDB Atlas**, **Mongoose**, **Vanilla JavaScript**, **HTML5**, and modern **CSS**.

Preserves the original client design in `index.html`, `sstyle.css` / `style.css`, and `script.js` while upgrading the entire application to real, secure, persistent database operations with role-based access control.

---

## 🚀 Key Features

* **Real MongoDB Atlas Integration**: All vehicles, drivers, fuel logs, maintenance schedules, trips, and user accounts persist to MongoDB Atlas in real time.
* **Role-Based Access Control (RBAC)**:
  * **ADMIN**: Full management of fleet assets, drivers, vehicles, maintenance tickets, routes, fuel logs, and employee user accounts.
  * **EMPLOYEE**: Access to fleet overview, authorized assigned trips, permitted status updates, and profile settings.
* **Secure Authentication**:
  * Passwords hashed using `bcrypt` (10 salt rounds).
  * JWT tokens stored in secure, `HTTP-only` cookies with `SameSite=Lax` protection.
  * Rate-limited login endpoints to prevent brute-force attacks.
  * Immediate account deactivation enforcement.
* **Modern Login Experience**: Dedicated responsive two-column login interface (`login.html`) featuring a fleet illustration hero panel, live credential validation, loading indicators, and demo credential autofill.
* **Live Fleet Telematics**:
  * Real-time KPI summaries: Total fleet, active on-route vehicles, overdue maintenance alerts, and monthly fuel spend.
  * Fuel efficiency calculations (`km/L` and above/below fleet average).
  * Interactive Maintenance Kanban board (Overdue, Upcoming 7 Days, Completed).
  * Vehicle-driver two-way assignment synchronization.
  * Live corridor route monitoring.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Custom Properties & Responsive Grid)
* **Backend**: Node.js & Express.js
* **Database**: MongoDB Atlas via Mongoose ODM
* **Security**: `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit`, `cors`

---

## 📋 Prerequisites

* **Node.js**: v18.0.0 or higher (Tested with v25.9.0)
* **npm**: v9.0.0 or higher
* **MongoDB Atlas** account (or local MongoDB for testing)

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your MongoDB Atlas connection string:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/fleetflow?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Bootstrap Admin Configuration
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@fleetflow.local
ADMIN_PASSWORD=Admin@12345
ADMIN_NAME=Admin User
```

### 3. Create the Initial Administrator Account
Run the secure bootstrap command:
```bash
npm run bootstrap:admin
```
This securely creates the initial `ADMIN` user in MongoDB Atlas without exposing any public endpoint.

### 4. (Optional) Seed Sample Fleet Records
To populate initial vehicles, drivers, trips, fuel entries, and an employee test account:
```bash
npm run seed
```

### 5. Start the Application
Run in development mode:
```bash
npm run dev
```
Or start standard server:
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🌐 Configuring MongoDB Atlas

1. **Log in to MongoDB Atlas**: [https://cloud.mongodb.com/](https://cloud.mongodb.com/)
2. **Create a Database User**:
   * In Atlas, go to **Database Access** under Security.
   * Click **Add New Database User**.
   * Set authentication method to **Password**.
   * Choose a username (e.g., `fleet_admin`) and secure password.
   * Grant role: **Read and write to any database**.
3. **Configure Network Access (IP Whitelist)**:
   * In Atlas, go to **Network Access** under Security.
   * Click **Add IP Address**.
   * Choose **Add Current IP Address** or **Allow Access from Anywhere (`0.0.0.0/0`)** for testing.
4. **Get the Connection String**:
   * Go to **Clusters** / **Database**.
   * Click **Connect** on your cluster.
   * Select **Drivers** (Node.js).
   * Copy the connection URI:
     ```
     mongodb+srv://fleet_admin:<password>@cluster0.abcde.mongodb.net/fleetflow?retryWrites=true&w=majority
     ```
   * Replace `<password>` with your database user password and paste it as `MONGODB_URI` in `.env`.

---

## 👥 User Roles & Default Test Accounts

| Role | Username | Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin` | `Admin@12345` | Full administrative control: Add/edit/delete vehicles, drivers, routes, fuel logs, schedule maintenance, manage employee accounts, toggle account statuses. |
| **EMPLOYEE** | `employee1` | `Employee@12345` | View fleet overview, view assigned vehicle (`FL-101`) & routes, update route statuses, view and update personal profile. |

---

## 🔌 REST API Reference

All protected endpoints require an authenticated JWT session (via HTTP-only cookie or `Authorization: Bearer <token>`).

### Authentication (`/api/auth`)
* `POST /api/auth/login` — Log in with username/email & password. Sets HTTP-only cookie.
* `POST /api/auth/logout` — Log out & clear cookie.
* `GET  /api/auth/me` — Retrieve current authenticated user profile.
* `PUT  /api/auth/profile` — Update user's name, phone, or password.

### User Management (`/api/users`) — *Admin Only*
* `GET    /api/users` — List all user accounts.
* `POST   /api/users` — Create an employee account.
* `GET    /api/users/:id` — View specific user.
* `PUT    /api/users/:id` — Update user details.
* `PATCH  /api/users/:id/status` — Activate or deactivate account.
* `DELETE /api/users/:id` — Delete user account.

### Vehicles (`/api/vehicles`)
* `GET    /api/vehicles` — Retrieve all vehicles (supports `status` & `search` query).
* `GET    /api/vehicles/:id` — Retrieve vehicle details with recent trip history.
* `POST   /api/vehicles` — Add new vehicle *(Admin only)*.
* `PUT    /api/vehicles/:id` — Update vehicle *(Admin only)*.
* `DELETE /api/vehicles/:id` — Remove vehicle *(Admin only)*.

### Drivers (`/api/drivers`)
* `GET    /api/drivers` — Retrieve all drivers (supports `search` & `status`).
* `GET    /api/drivers/:id` — Retrieve specific driver.
* `POST   /api/drivers` — Add new driver *(Admin only)*.
* `PUT    /api/drivers/:id` — Update driver *(Admin only)*.
* `PATCH  /api/drivers/:id/assign` — Reassign driver to a vehicle *(Admin only)*.
* `DELETE /api/drivers/:id` — Remove driver *(Admin only)*.

### Trips / Routes (`/api/trips`)
* `GET    /api/trips` — Retrieve trips (scoped to driver if Employee; all if Admin).
* `POST   /api/trips` — Schedule new route *(Admin only)*.
* `PATCH  /api/trips/:id/status` — Update trip status (`On Time`, `Delayed`, `Completed`, `Cancelled`).
* `PUT    /api/trips/:id` — Update trip details *(Admin only)*.
* `DELETE /api/trips/:id` — Remove trip *(Admin only)*.

### Fuel & Cost Tracking (`/api/fuel`)
* `GET    /api/fuel` — Retrieve fuel fill-up records.
* `GET    /api/fuel/weekly-summary` — 7-day aggregated liters for dashboard chart.
* `POST   /api/fuel` — Log fill-up & update vehicle odometer *(Admin only)*.
* `DELETE /api/fuel/:id` — Delete fuel log *(Admin only)*.

### Maintenance (`/api/maintenance`)
* `GET    /api/maintenance` — Retrieve tickets with dynamic Overdue/Upcoming status.
* `POST   /api/maintenance` — Schedule maintenance ticket *(Admin only)*.
* `PATCH  /api/maintenance/:id/status` — Update ticket status (`Overdue`, `Upcoming`, `Completed`).
* `DELETE /api/maintenance/:id` — Delete ticket *(Admin only)*.

### Dashboard & Analytics (`/api/dashboard`)
* `GET /api/dashboard/stats` — Real-time aggregate fleet statistics.
* `GET /api/dashboard/activities` — Recent audit & operational activity log.

### Diagnostics (`/api/health`)
* `GET /api/health` — Returns server uptime and MongoDB connection state with masked credentials.

---

## 🔍 How to Verify Persistence in MongoDB Atlas

1. Log in to the application at `http://localhost:5000/login.html` as `admin` (`Admin@12345`).
2. Click **+ Add Vehicle** and add `FL-999` (e.g. Ashok Leyland, `AP09ZZ9999`, 2024).
3. Open your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/) -> Browse Collections -> `fleetflow.vehicles`.
4. Observe the newly created document `FL-999` with exact timestamps and attributes.
5. In the UI, click **Users** -> **+ Add Employee** and add `john.driver`. Check `fleetflow.users` in Atlas to see the hashed password and `EMPLOYEE` role.
6. Refresh the browser page or restart the server with `npm start`: all saved records remain intact.

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```
The test suite validates:
* MongoDB connection configuration and masked URI security
* Admin bootstrap idempotency
* Successful authentication and JWT cookie issuance
* Incorrect password handling (401)
* Nonexistent user rejection (401)
* Deactivated account rejection (403)
* Role enforcement (Employee blocked from Admin endpoints)
* Employee creation and duplicate prevention
* Vehicle creation and odometer integrity
* Driver-vehicle assignment synchronization
* Fuel log insertion and vehicle odometer update
* Maintenance Kanban status updates
* Trip status updates by employees
