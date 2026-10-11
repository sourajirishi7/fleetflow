# FleetFlow: Real MongoDB Database Schema & Architecture (`fleetflow`)

**Author:** Senior Backend & Database Architect  
**Database Engine:** MongoDB (via Mongoose ODM)  
**Database Name:** `fleetflow`  
**Isolation Architecture:** Multi-Tenant Organization Scoping with Native ObjectIds  

---

## Architecture Overview

FleetFlow operates with a multi-tenant data isolation architecture where every tenant corresponds to an **Organization**. Each document belongs strictly to one organization via its `organizationId` (MongoDB `ObjectId`). Cross-organization queries and assignments are blocked at both schema validation and middleware authorization layers.

### Primary Keys & Relationships Standard
* **Primary Key:** Every document uses the native MongoDB `_id` (`mongoose.Schema.Types.ObjectId`) as its primary key.
* **Relationships:** Modeled strictly using `ObjectId` references (`ref: "<Model>"`). For seamless compatibility with the existing frontend UI, human-readable identifier strings (e.g., `registrationNumber`/`id: "FL-101"`, `routeCode`/`id: "R-201"`) are indexed uniquely per organization.
* **Consistency Constraints:** Any record referencing another entity (e.g. a Trip referencing a Vehicle and Driver, or a FuelEntry referencing a Vehicle) MUST verify that all referenced entities belong to the same `organizationId`.

---

## Collection Schemas

### 1. `organizations`
* **Purpose:** Represents an enterprise tenant / fleet operating company. Acts as the root boundary for data isolation.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `name`: `String` (Required, trimmed, min: 2, max: 100)
  * `code`: `String` (Optional slug/code, unique, uppercase)
  * `createdBy`: `ObjectId` (Ref: `users`, optional during bootstrap)
  * `createdAt`: `Date` (Auto-generated timestamp)
  * `updatedAt`: `Date` (Auto-generated timestamp)
* **Required Fields:** `name`
* **Optional Fields:** `code`, `createdBy`
* **Relationships:**
  * `createdBy` → `users._id`
* **Unique Indexes:**
  * `{ name: 1 }` (unique, sparse)
  * `{ code: 1 }` (unique, sparse)
* **Validation Rules:**
  * Name must be between 2 and 100 characters.
* **Access Permissions:**
  * System setup / registration: Public (registration of new organization).
  * Read / Update: Authenticated `ADMIN` of that organization only.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890001" },
    "name": "Apex Logistics Corridors Ltd",
    "code": "APEX",
    "createdBy": { "$oid": "6709a101b5f1234567890002" },
    "createdAt": "2026-10-11T09:00:00.000Z",
    "updatedAt": "2026-10-11T09:00:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ createdAt: -1 }`

---

### 2. `users`
* **Purpose:** Stores authenticated administrative and employee user credentials, role definitions, and organization membership.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `fullName`: `String` (Required, alias `name` for UI compatibility)
  * `username`: `String` (Required, trimmed, unique per organization or globally)
  * `email`: `String` (Required, lowercase, trimmed, email regex)
  * `passwordHash`: `String` (Stored as `password`, bcrypt salt factor 10, excluded from JSON/queries by default with `select: false`)
  * `role`: `String` (Enum: `["ADMIN", "EMPLOYEE"]`, Required, default: `"EMPLOYEE"`)
  * `isActive`: `Boolean` (Default: `true`, with `status` enum `"Active"|"Inactive"` getter/setter)
  * `phone`: `String` (Optional, 10-digit format)
  * `driverId`: `String` (Optional legacy ID e.g. "D001" or Driver ObjectId for direct link)
  * `createdBy`: `ObjectId` (Ref: `users`, optional for initial bootstrap admin)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `fullName`, `username`, `email`, `password`
* **Optional Fields:** `phone`, `driverId`, `createdBy`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `createdBy` → `users._id`
* **Unique Indexes:**
  * `{ username: 1 }` (Global unique index to prevent credential collision)
  * `{ email: 1 }` (Global unique index)
  * `{ organizationId: 1, username: 1 }`
* **Validation Rules:**
  * Username minlength: 3, maxlength: 30.
  * Password minlength: 6 (pre-save hashed with bcrypt).
  * Email must match RFC 5322 regex.
  * Role must be strictly `ADMIN` or `EMPLOYEE`.
* **Access Permissions:**
  * Admin: Can list, create, update, deactivate employees in their own organization. Cannot modify cross-org users.
  * Employee: Can view and edit only their own profile. Cannot alter roles or list other users.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890002" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "fullName": "Sarah Johnson",
    "username": "employee1",
    "email": "sarah.driver@apexlogistics.local",
    "role": "EMPLOYEE",
    "isActive": true,
    "phone": "9876543210",
    "driverId": "D001",
    "createdBy": { "$oid": "6709a101b5f1234567890000" },
    "createdAt": "2026-10-11T09:05:00.000Z",
    "updatedAt": "2026-10-11T09:05:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, role: 1 }`
  * `{ organizationId: 1, isActive: 1 }`

---

### 3. `vehicles`
* **Purpose:** Manages fleet vehicle assets, odometer readings, status tracking, and assigned drivers.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `id`: `String` (Internal fleet identifier, e.g. "FL-101", uppercase, required for UI compatibility)
  * `registrationNumber`: `String` (Official license plate, uppercase, required, alias `plate`)
  * `make`: `String` (Required, e.g. "Tata", "BharatBenz", "Mahindra")
  * `model`: `String` (Required, e.g. "Prima 4025", "Bolero Pickup")
  * `year`: `Number` (Required, min: 1980, max: 2035)
  * `status`: `String` (Enum: `["Active", "Idle", "In Shop", "Offline"]`, default: `"Active"`)
  * `odometer`: `Number` (Required, min: 0, default: 0)
  * `fuelType`: `String` (Enum: `["Diesel", "Petrol", "CNG", "Electric"]`, default: `"Diesel"`)
  * `driverId`: `String` (Optional string ID or ObjectId ref of assigned driver)
  * `driverRef`: `ObjectId` (Ref: `drivers`, optional)
  * `lastService`: `String` (YYYY-MM-DD)
  * `nextService`: `String` (YYYY-MM-DD)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `id`, `registrationNumber`, `make`, `model`, `year`, `odometer`
* **Optional Fields:** `driverId`, `driverRef`, `lastService`, `nextService`, `fuelType`, `status`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `driverRef` → `drivers._id`
* **Unique Indexes:**
  * `{ organizationId: 1, id: 1 }` (unique compound index)
  * `{ organizationId: 1, registrationNumber: 1 }` (unique compound index)
* **Validation Rules:**
  * Registration number/plate trimmed and uppercased.
  * Odometer non-negative number.
  * Year between 1980 and 2035.
* **Access Permissions:**
  * Admin: Full CRUD on organization vehicles.
  * Employee: Read-only access to their specifically assigned vehicle(s).
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890010" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "id": "FL-101",
    "registrationNumber": "AP09AB1234",
    "make": "Tata",
    "model": "Prima 4025",
    "year": 2023,
    "status": "Active",
    "odometer": 84210,
    "fuelType": "Diesel",
    "driverId": "D001",
    "lastService": "2026-06-12",
    "nextService": "2026-09-12",
    "createdAt": "2026-10-11T09:10:00.000Z",
    "updatedAt": "2026-10-11T09:10:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, status: 1 }`
  * `{ organizationId: 1, driverId: 1 }`

---

### 4. `drivers`
* **Purpose:** Maintains professional driver profiles, licensing data, safety scores, vehicle assignments, and optional links to Employee user logins.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `id`: `String` (Internal driver code, e.g. "D001", required, uppercase)
  * `userId`: `ObjectId` (Ref: `users`, optional link if driver has login credentials)
  * `fullName`: `String` (Required, alias `name`)
  * `licenseNumber`: `String` (Required, alias `license`, uppercase)
  * `phone`: `String` (Required, 10-digit format)
  * `shiftStatus`: `String` (Enum: `["Active", "Off-Duty"]`, default: `"Active"`, alias `status`)
  * `safetyScore`: `Number` (Min: 0, max: 100, default: 90, alias `safety`)
  * `vehicleId`: `String` (Optional assigned vehicle string ID e.g. "FL-101")
  * `vehicleRef`: `ObjectId` (Ref: `vehicles`, optional)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `id`, `fullName`, `licenseNumber`, `phone`
* **Optional Fields:** `userId`, `vehicleId`, `vehicleRef`, `safetyScore`, `shiftStatus`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `userId` → `users._id` (Optional)
  * `vehicleRef` → `vehicles._id` (Optional)
* **Unique Indexes:**
  * `{ organizationId: 1, id: 1 }` (unique)
  * `{ organizationId: 1, licenseNumber: 1 }` (unique)
* **Validation Rules:**
  * Phone must match 10-digit format.
  * Safety score between 0 and 100.
  * Shift status must be Active or Off-Duty.
* **Access Permissions:**
  * Admin: Full CRUD on organization drivers.
  * Employee: Read-only access to their own driver record via `/api/drivers/me`. Directory hidden.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890020" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "id": "D001",
    "userId": { "$oid": "6709a101b5f1234567890002" },
    "fullName": "Sarah Johnson",
    "licenseNumber": "TG09 2021001456",
    "phone": "9876543210",
    "shiftStatus": "Active",
    "safetyScore": 96,
    "vehicleId": "FL-101",
    "createdAt": "2026-10-11T09:12:00.000Z",
    "updatedAt": "2026-10-11T09:12:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, userId: 1 }`
  * `{ organizationId: 1, vehicleId: 1 }`

---

### 5. `trips`
* **Purpose:** Records dispatch trips, transit corridors, assigned vehicles and drivers, distance, duration, and road status.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `routeCode`: `String` (Required, alias `id` e.g. "R-201", uppercase)
  * `vehicleId`: `String` (Vehicle identifier e.g. "FL-101", required)
  * `vehicleRef`: `ObjectId` (Ref: `vehicles`, optional/resolved)
  * `driverId`: `String` (Driver identifier e.g. "D001", optional/assigned)
  * `driverRef`: `ObjectId` (Ref: `drivers`, optional/resolved)
  * `startDestination`: `String` (Required, alias `start`)
  * `endDestination`: `String` (Required, alias `end`)
  * `startCoordinates`: `{ lat: Number, lng: Number }` (Optional)
  * `endCoordinates`: `{ lat: Number, lng: Number }` (Optional)
  * `startTime`: `Date` (Optional)
  * `endTime`: `Date` (Optional)
  * `distanceKm`: `Number` (Required, min: 0, alias `distance`)
  * `durationMinutes`: `Number` (Optional calculated minutes)
  * `duration`: `String` (Formatted string e.g. "5h 20m")
  * `status`: `String` (Enum: `["On Time", "Delayed", "Completed", "Cancelled", "Idle"]`, default: `"On Time"`)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `routeCode`, `vehicleId`, `startDestination`, `endDestination`, `distanceKm`
* **Optional Fields:** `driverId`, `vehicleRef`, `driverRef`, `startCoordinates`, `endCoordinates`, `startTime`, `endTime`, `durationMinutes`, `duration`, `status`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `vehicleRef` → `vehicles._id`
  * `driverRef` → `drivers._id`
* **Unique Indexes:**
  * `{ organizationId: 1, routeCode: 1 }` (unique)
* **Validation Rules:**
  * Start and end destinations must not be empty.
  * Distance must be a non-negative number.
  * Referenced vehicle and driver must belong to the same `organizationId`.
* **Access Permissions:**
  * Admin: Full CRUD on organization trips.
  * Employee: View only trips assigned to their driver ID or vehicle; update trip status.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890030" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "routeCode": "R-201",
    "vehicleId": "FL-101",
    "driverId": "D001",
    "startDestination": "Hyderabad",
    "endDestination": "Vijayawada",
    "distanceKm": 275,
    "duration": "5h 20m",
    "status": "Completed",
    "createdAt": "2026-10-11T09:15:00.000Z",
    "updatedAt": "2026-10-11T09:15:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, driverId: 1 }`
  * `{ organizationId: 1, vehicleId: 1 }`
  * `{ organizationId: 1, status: 1 }`

---

### 6. `fuelRecords` (or `fuelentries`)
* **Purpose:** Tracks diesel/petrol/CNG consumption, fuel purchase costs, odometer progression, and efficiency metrics.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `id`: `String` (Internal entry code, e.g. "F01", uppercase)
  * `vehicleId`: `String` (Vehicle identifier e.g. "FL-101", required)
  * `vehicleRef`: `ObjectId` (Ref: `vehicles`, optional/resolved)
  * `submittedBy`: `ObjectId` (Ref: `users`, optional recorder)
  * `quantityLitres`: `Number` (Required, min: 0.1, alias `liters`)
  * `pricePerLitre`: `Number` (Optional, price/liter)
  * `totalCost`: `Number` (Required, min: 0, alias `cost`, verified/calculated on server)
  * `odometerKm`: `Number` (Required, min: 0, alias `odometer`)
  * `fuelDate`: `String` (Required, YYYY-MM-DD, alias `date`)
  * `notes`: `String` (Optional)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `id`, `vehicleId`, `quantityLitres`, `totalCost`, `odometerKm`, `fuelDate`
* **Optional Fields:** `vehicleRef`, `submittedBy`, `pricePerLitre`, `notes`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `vehicleRef` → `vehicles._id`
  * `submittedBy` → `users._id`
* **Unique Indexes:**
  * `{ organizationId: 1, id: 1 }` (unique)
* **Validation Rules:**
  * Odometer must be equal to or greater than the vehicle's last recorded odometer reading.
  * Quantity litres > 0.
  * Cost >= 0.
  * Server calculates `totalCost = quantityLitres * pricePerLitre` if price is provided.
  * Vehicle must belong to the user's organization.
* **Access Permissions:**
  * Admin: View and record fuel across all organization vehicles.
  * Employee: View and submit fuel records only for their assigned vehicle.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890040" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "id": "F01",
    "vehicleId": "FL-101",
    "quantityLitres": 120,
    "pricePerLitre": 94.00,
    "totalCost": 11280,
    "odometerKm": 84210,
    "fuelDate": "2026-08-23",
    "notes": "Highway HP pump fill-up",
    "createdAt": "2026-10-11T09:20:00.000Z",
    "updatedAt": "2026-10-11T09:20:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, vehicleId: 1, fuelDate: -1 }`

---

### 7. `maintenanceRecords`
* **Purpose:** Manages preventive maintenance, garage work orders, inspection tickets, and repair expenses.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `id`: `String` (Internal ticket code, e.g. "M01", uppercase)
  * `vehicleId`: `String` (Vehicle identifier e.g. "FL-104", required)
  * `vehicleRef`: `ObjectId` (Ref: `vehicles`, optional/resolved)
  * `reportedBy`: `ObjectId` (Ref: `users`, optional)
  * `maintenanceType`: `String` (Enum: `["Oil Change", "Brake Inspection", "Tire Rotation", "Engine Service", "Battery Replacement", "AC Service", "General Inspection"]`, alias `type`)
  * `serviceDate`: `String` (Required, YYYY-MM-DD, alias `date`)
  * `cost`: `Number` (Required, min: 0)
  * `priority`: `String` (Enum: `["Low", "Medium", "High"]`, default: `"Medium"`)
  * `status`: `String` (Enum: `["Upcoming", "Completed", "Overdue"]`, default: `"Upcoming"`)
  * `description`: `String` (Optional, alias `notes`)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `id`, `vehicleId`, `maintenanceType`, `serviceDate`, `cost`
* **Optional Fields:** `vehicleRef`, `reportedBy`, `priority`, `status`, `description`
* **Relationships:**
  * `organizationId` → `organizations._id`
  * `vehicleRef` → `vehicles._id`
  * `reportedBy` → `users._id`
* **Unique Indexes:**
  * `{ organizationId: 1, id: 1 }` (unique)
* **Validation Rules:**
  * Cost must be non-negative.
  * Service date in YYYY-MM-DD format.
  * Vehicle must belong to the organization.
* **Access Permissions:**
  * Admin: Full CRUD on maintenance tickets.
  * Employee: View and submit tickets for their assigned vehicle only.
* **Example Document:**
  ```json
  {
    "_id": { "$oid": "6709a101b5f1234567890050" },
    "organizationId": { "$oid": "6709a101b5f1234567890001" },
    "id": "M01",
    "vehicleId": "FL-104",
    "maintenanceType": "Engine Service",
    "serviceDate": "2026-08-10",
    "cost": 18500,
    "priority": "High",
    "status": "Overdue",
    "description": "Check-in completed at garage",
    "createdAt": "2026-10-11T09:25:00.000Z",
    "updatedAt": "2026-10-11T09:25:00.000Z"
  }
  ```
* **Recommended Indexes:**
  * `{ organizationId: 1, vehicleId: 1 }`
  * `{ organizationId: 1, status: 1 }`

---

### 8. `activities`
* **Purpose:** Logs operational fleet audit events and notifications for the dashboard feed.
* **Primary Key:** `_id` (`ObjectId`)
* **Fields & Types:**
  * `_id`: `ObjectId` (Auto-generated)
  * `organizationId`: `ObjectId` (Ref: `organizations`, Required, indexed)
  * `icon`: `String` (Default: `"🚚"`)
  * `text`: `String` (Required)
  * `time`: `String` (Default: `"Just now"`)
  * `status`: `String` (Default: `"Info"`)
  * `createdAt`: `Date`
  * `updatedAt`: `Date`
* **Required Fields:** `organizationId`, `text`
* **Relationships:**
  * `organizationId` → `organizations._id`
* **Access Permissions:**
  * Scoped strictly to the authenticated user's organization.

---

## Multi-Tenant Data Isolation Rules

1. **Automatic Query Scoping:**
   Every Mongoose query across `vehicles`, `drivers`, `trips`, `fuel`, `maintenance`, and `users` must include `{ organizationId: req.user.organizationId }`.
2. **Creation Boundary:**
   On document creation, `organizationId` is forced from the verified server session (`req.user.organizationId`), never from client input.
3. **Cross-Tenant Reference Integrity:**
   Before creating or updating a record that references another entity (e.g. assigning Driver D001 to Vehicle FL-101, or creating a Trip with Vehicle FL-101), the backend must verify that the referenced documents also belong to `req.user.organizationId`.
4. **Clean Slate for New Organizations:**
   When a new admin registers and creates an organization, the organization is initialized with ZERO sample records (no demo drivers, vehicles, trips, fuel, or maintenance). The dashboard accurately displays zero counts and helpful empty states.
5. **No Data Deletion on Inspection:**
   Existing database collections and documents are preserved without modification or loss.
