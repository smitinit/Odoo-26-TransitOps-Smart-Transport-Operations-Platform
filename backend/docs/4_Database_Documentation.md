# Database Documentation

TransitOps utilizes PostgreSQL with SQLAlchemy 2.0. All primary keys are UUIDv7 for optimized database locality and ordering.

## Core Tables (IAM)

### 1. `users`
- **Purpose:** Stores application users and credentials.
- **Columns:**
  - `id` (UUIDv7, PK)
  - `email` (String, Unique, Index)
  - `hashed_password` (String, Argon2id)
  - `first_name`, `last_name` (String)
  - `is_active`, `is_superuser` (Boolean)
  - `role_id` (UUID, FK -> `roles.id`)
- **Relationships:** Belongs to a Role.

### 2. `roles`
- **Purpose:** Defines the user roles within the system.
- **Columns:**
  - `id` (UUIDv7, PK)
  - `name` (String, Unique)
  - `description` (String)

### 3. `permissions`
- **Purpose:** Defines granular access control actions (e.g., `vehicle.create`).
- **Columns:**
  - `id` (UUIDv7, PK)
  - `name` (String, Unique)
  - `description` (String)

### 4. `role_permissions`
- **Purpose:** Junction table mapping Roles to Permissions.
- **Columns:**
  - `id` (UUIDv7, PK)
  - `role_id` (UUID, FK -> `roles.id`, Cascade Delete)
  - `permission_id` (UUID, FK -> `permissions.id`, Cascade Delete)

## Future Tables Scaffolded

- **Fleet:** `vehicles`, `vehicle_documents`
- **Drivers:** `drivers`, `driver_documents`
- **Operations:** `trips`, `maintenance`
- **Finance:** `fuel_logs`, `expenses`
- **System:** `notifications`, `audit_logs`, `settings`

*All models inherit from `BaseModel` providing `created_at` and `updated_at`. Certain entities like Users, Vehicles, and Drivers use `SoftDeleteMixin` providing a `deleted_at` column.*
