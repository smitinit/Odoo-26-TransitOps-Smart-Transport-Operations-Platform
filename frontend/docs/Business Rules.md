BUSINESS RULES :

# 📋 TransitOps - Business Rules

## Document Information

| Property | Value                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| Project  | TransitOps                                                                                 |
| Document | Business Rules                                                                             |
| Version  | 1.0                                                                                        |
| Purpose  | Define the business logic and operational constraints that govern the TransitOps platform. |

---

# 1. Introduction

Business rules define the conditions, validations, and automated behaviors that ensure transport operations are performed accurately and consistently. These rules prevent invalid data, enforce company policies, and maintain operational integrity.

---

# 2. Vehicle Rules

## BR-001: Unique Vehicle Registration

**Rule**

Every vehicle must have a unique registration number.

**Reason**

Prevents duplicate vehicle records.

**System Action**

Reject duplicate registration numbers during vehicle creation.

---

## BR-002: Vehicle Availability

**Rule**

Only vehicles with the status **Available** can be assigned to a trip.

**Restricted Status**

* On Trip
* In Shop
* Retired

**System Action**

Only available vehicles are displayed in the trip assignment list.

---

## BR-003: Vehicle Capacity Validation

**Rule**

Cargo weight must never exceed the selected vehicle's maximum load capacity.

**Validation**

Cargo Weight ≤ Vehicle Maximum Capacity

**System Action**

Reject the trip and display an appropriate validation message.

---

# 3. Driver Rules

## BR-004: Driver Availability

Only drivers with **Available** status can be assigned.

---

## BR-005: Driver License Validation

Drivers with expired licenses cannot be assigned to trips.

---

## BR-006: Suspended Driver Restriction

Drivers marked as **Suspended** are not eligible for trip assignment.

---

# 4. Trip Rules

## BR-007: Single Active Trip per Vehicle

A vehicle already assigned to an active trip cannot be assigned to another trip.

---

## BR-008: Single Active Trip per Driver

A driver already assigned to an active trip cannot be assigned to another trip.

---

## BR-009: Trip Dispatch

When a trip is dispatched:

* Vehicle Status → On Trip
* Driver Status → On Trip

---

## BR-010: Trip Completion

When a trip is completed:

* Vehicle Status → Available
* Driver Status → Available

---

## BR-011: Trip Cancellation

Cancelling a dispatched trip restores both vehicle and driver status to **Available**.

---

# 5. Maintenance Rules

## BR-012: Vehicle Maintenance

Creating an active maintenance record automatically changes the vehicle status to **In Shop**.

---

## BR-013: Maintenance Completion

Closing a maintenance record changes the vehicle status back to **Available**, unless the vehicle has been retired.

---

# 6. Fuel & Expense Rules

## BR-014: Fuel Logging

Fuel logs can only be recorded for an existing vehicle.

---

## BR-015: Operational Cost Calculation

Operational Cost = Fuel Cost + Maintenance Cost + Other Expenses

The system automatically updates the operational cost whenever a new fuel log or expense is recorded.

---

# 7. Reporting Rules

## BR-016: Fuel Efficiency

Fuel Efficiency = Distance Travelled ÷ Fuel Consumed

---

## BR-017: Fleet Utilization

Fleet Utilization = Active Vehicles ÷ Total Vehicles × 100

---

## BR-018: Vehicle ROI

Vehicle ROI = (Revenue − (Fuel + Maintenance)) ÷ Acquisition Cost

---

# 8. Security Rules

## BR-019: Authentication

Only authenticated users can access the application.

---

## BR-020: Role-Based Access Control (RBAC)

Each user can only access modules permitted by their assigned role.

Example:

* Fleet Manager → Vehicles, Maintenance, Reports
* Dispatcher → Trips
* Driver → Assigned Trips
* Safety Officer → Driver Management
* Financial Analyst → Expenses & Reports

---

# 9. Business Rule Summary

| Rule ID | Description                             |
| ------- | --------------------------------------- |
| BR-001  | Unique Vehicle Registration             |
| BR-002  | Only Available Vehicles can be Assigned |
| BR-003  | Cargo Capacity Validation               |
| BR-004  | Driver Availability                     |
| BR-005  | Driver License Validation               |
| BR-006  | Suspended Driver Restriction            |
| BR-007  | One Active Trip per Vehicle             |
| BR-008  | One Active Trip per Driver              |
| BR-009  | Automatic Status Update on Dispatch     |
| BR-010  | Automatic Status Update on Completion   |
| BR-011  | Status Restoration on Cancellation      |
| BR-012  | Vehicle Status Update on Maintenance    |
| BR-013  | Restore Vehicle after Maintenance       |
| BR-014  | Fuel Log Validation                     |
| BR-015  | Operational Cost Calculation            |
| BR-016  | Fuel Efficiency Calculation             |
| BR-017  | Fleet Utilization Calculation           |
| BR-018  | Vehicle ROI Calculation                 |
| BR-019  | Authentication Required                 |
| BR-020  | Role-Based Access Control               |

---

# 10. Conclusion

These business rules form the operational backbone of the TransitOps platform. Every module—including Vehicle Management, Driver Management, Trip Management, Maintenance, Fuel Management, and Reporting—must comply with these rules to ensure accurate, secure, and efficient transport operations.
