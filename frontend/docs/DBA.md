DataBase Understanding

# 🗄️ TransitOps - Database Schema

## Document Information

| Property | Value                                                                        |
| -------- | ---------------------------------------------------------------------------- |
| Project  | TransitOps                                                                   |
| Document | Database Schema                                                              |
| Version  | 1.0                                                                          |
| Purpose  | Define the database structure and relationships for the TransitOps platform. |

---

# 1. Overview

The TransitOps database is designed using a relational database model to efficiently manage transport operations. The schema stores information related to users, vehicles, drivers, trips, maintenance, fuel consumption, operational expenses, and system roles.

The primary objective of the database is to ensure data consistency, eliminate redundancy, and enforce business rules throughout the transport lifecycle.

---

# 2. Database Overview

The system consists of the following core entities:

* Users
* Roles
* Vehicles
* Drivers
* Trips
* Maintenance Logs
* Fuel Logs
* Expenses

---

# 3. Entity Descriptions

---

## Users

Stores login credentials and user information for everyone who can access the system.

### Attributes

| Field      | Type      | Description           |
| ---------- | --------- | --------------------- |
| user_id    | UUID      | Primary Key           |
| full_name  | VARCHAR   | User's full name      |
| email      | VARCHAR   | Unique email address  |
| password   | VARCHAR   | Encrypted password    |
| role_id    | UUID      | Assigned role         |
| created_at | TIMESTAMP | Account creation time |

---

## Roles

Defines system permissions for different users.

### Available Roles

* Fleet Manager
* Dispatcher
* Driver
* Safety Officer
* Financial Analyst

### Attributes

| Field     | Type    |
| --------- | ------- |
| role_id   | UUID    |
| role_name | VARCHAR |

---

## Vehicles

Stores all registered fleet vehicles.

### Attributes

| Field               | Type             |
| ------------------- | ---------------- |
| vehicle_id          | UUID             |
| registration_number | VARCHAR (Unique) |
| vehicle_name        | VARCHAR          |
| vehicle_type        | VARCHAR          |
| maximum_capacity    | DECIMAL          |
| odometer            | INTEGER          |
| acquisition_cost    | DECIMAL          |
| status              | ENUM             |
| created_at          | TIMESTAMP        |

### Vehicle Status

* Available
* On Trip
* In Shop
* Retired

---

## Drivers

Stores all company drivers.

### Attributes

| Field            | Type    |
| ---------------- | ------- |
| driver_id        | UUID    |
| full_name        | VARCHAR |
| license_number   | VARCHAR |
| license_category | VARCHAR |
| license_expiry   | DATE    |
| contact_number   | VARCHAR |
| safety_score     | INTEGER |
| status           | ENUM    |

### Driver Status

* Available
* On Trip
* Off Duty
* Suspended

---

## Trips

Stores every transportation request.

### Attributes

| Field            | Type      |
| ---------------- | --------- |
| trip_id          | UUID      |
| vehicle_id       | UUID      |
| driver_id        | UUID      |
| source           | VARCHAR   |
| destination      | VARCHAR   |
| cargo_weight     | DECIMAL   |
| planned_distance | DECIMAL   |
| actual_distance  | DECIMAL   |
| fuel_consumed    | DECIMAL   |
| status           | ENUM      |
| created_at       | TIMESTAMP |

### Trip Status

* Draft
* Dispatched
* Completed
* Cancelled

---

## Maintenance Logs

Stores maintenance records for every vehicle.

### Attributes

| Field            | Type    |
| ---------------- | ------- |
| maintenance_id   | UUID    |
| vehicle_id       | UUID    |
| maintenance_type | VARCHAR |
| description      | TEXT    |
| maintenance_cost | DECIMAL |
| start_date       | DATE    |
| end_date         | DATE    |
| status           | ENUM    |

---

## Fuel Logs

Stores fuel usage information.

### Attributes

| Field       | Type    |
| ----------- | ------- |
| fuel_log_id | UUID    |
| vehicle_id  | UUID    |
| trip_id     | UUID    |
| litres      | DECIMAL |
| fuel_cost   | DECIMAL |
| fuel_date   | DATE    |

---

## Expenses

Stores additional operational expenses.

### Attributes

| Field        | Type    |
| ------------ | ------- |
| expense_id   | UUID    |
| vehicle_id   | UUID    |
| trip_id      | UUID    |
| expense_type | VARCHAR |
| amount       | DECIMAL |
| expense_date | DATE    |
| remarks      | TEXT    |

---

# 4. Entity Relationships

| Parent Entity | Relationship | Child Entity     |
| ------------- | ------------ | ---------------- |
| Roles         | One-to-Many  | Users            |
| Vehicles      | One-to-Many  | Trips            |
| Drivers       | One-to-Many  | Trips            |
| Vehicles      | One-to-Many  | Fuel Logs        |
| Vehicles      | One-to-Many  | Maintenance Logs |
| Vehicles      | One-to-Many  | Expenses         |
| Trips         | One-to-Many  | Fuel Logs        |
| Trips         | One-to-Many  | Expenses         |

---

# 5. Primary Keys

| Table            | Primary Key    |
| ---------------- | -------------- |
| Users            | user_id        |
| Roles            | role_id        |
| Vehicles         | vehicle_id     |
| Drivers          | driver_id      |
| Trips            | trip_id        |
| Maintenance Logs | maintenance_id |
| Fuel Logs        | fuel_log_id    |
| Expenses         | expense_id     |

---

# 6. Foreign Keys

| Table            | Foreign Key | References |
| ---------------- | ----------- | ---------- |
| Users            | role_id     | Roles      |
| Trips            | vehicle_id  | Vehicles   |
| Trips            | driver_id   | Drivers    |
| Maintenance Logs | vehicle_id  | Vehicles   |
| Fuel Logs        | vehicle_id  | Vehicles   |
| Fuel Logs        | trip_id     | Trips      |
| Expenses         | vehicle_id  | Vehicles   |
| Expenses         | trip_id     | Trips      |

---

# 7. Business Constraints

The database enforces the following constraints:

* Vehicle registration number must be unique.
* A vehicle marked as **On Trip**, **In Shop**, or **Retired** cannot be assigned to a new trip.
* Drivers with expired licenses or suspended status cannot be assigned.
* Cargo weight must not exceed the selected vehicle's maximum load capacity.
* Completing a trip automatically changes vehicle and driver status back to **Available**.
* Creating a maintenance record automatically changes the vehicle status to **In Shop**.

---

# 8. Future Enhancements

The following tables can be introduced in future versions:

* Customers
* Shipments
* Warehouses
* Route Optimization
* GPS Tracking
* Driver Attendance
* Vehicle Insurance
* Vehicle Documents
* Notifications
* Audit Logs

---

# 9. Summary

The TransitOps database has been designed to support the complete transport management lifecycle while maintaining scalability, consistency, and efficient relationships between operational entities. The relational structure enables accurate reporting, business rule enforcement, and seamless integration across all modules of the application.
