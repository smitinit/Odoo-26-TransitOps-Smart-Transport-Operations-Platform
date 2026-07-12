# Role-Based Access Control (RBAC)

TransitOps utilizes a robust, database-driven RBAC system. 

## Core Concepts

- **Users:** The individuals logging into the system. A user has exactly one `Role`.
- **Roles:** A grouping of permissions (e.g., "Admin", "Fleet Manager", "Driver").
- **Permissions:** Granular actions represented as strings (e.g., `vehicle.create`, `trip.dispatch`).
- **RolePermissions:** The mapping table linking Roles to Permissions.

## How it Works

The RBAC system evaluates authorization at the route level using FastAPI Dependency Injection.

### `require_permission` Dependency

The `require_permission(permission: str)` factory function returns a dependency that:
1. Resolves the current user via `get_current_user`.
2. Checks if the user is a superuser (`is_superuser = True`). If so, grants immediate access.
3. If not a superuser, it queries the `RolePermissions` table to verify if the user's role is mapped to the requested permission.
4. If the permission is missing, it raises a `403 Forbidden` exception.

## Protecting Future APIs

To protect a new endpoint, simply inject the dependency into the route signature.

### Example: Protecting a Vehicle Creation Route

```python
from fastapi import APIRouter, Depends
from app.api.dependencies.auth import require_permission
from app.modules.users.models import User

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.post("")
async def create_vehicle(
    # ... payload ...
    current_user: User = Depends(require_permission("vehicle.create"))
):
    # This block will ONLY execute if the user has the 'vehicle.create' permission.
    pass
```

## Seeded Roles & Permissions

Aligned to the product RBAC matrix. `scripts/seed_roles.py` syncs (adds + revokes) so DB matches.

| Role | Intent | Write access highlights | Demo login |
| :--- | :--- | :--- | :--- |
| **Admin** | Full access (`is_superuser`) | All permissions | `admin@transitops.com` / `Admin@123` |
| **Fleet Manager** | Fleet assets & maintenance; cost log ownership | Vehicle/driver/maint CRUD; fuel & expense CRUD; trip create/dispatch/cancel (**not** complete) | `fleet@transitops.com` / `Fleet@123` |
| **Driver** | Trip ops: create, assign, dispatch, complete | Trip CRUD + complete; fuel & expense write; registries read-only | `driver@transitops.com` / `Driver@123` (also `dispatch@…`) |
| **Safety Officer** | Driver compliance & licenses | Driver CRUD (incl. suspend/restore); read elsewhere | `safety@transitops.com` / `Safety@123` |
| **Financial Analyst** | Cost & profitability review | **Read-only** (fuel, expense, maintenance, fleet, trips) | `finance@transitops.com` / `Finance@123` |

Notes:
- “Enter Fuel Consumed” / trip completion are **Driver** writes; Fleet Manager manages **Fuel Logs** as a registry (CRUD) but does not get `trip.complete`.
- Safety Officer and Financial Analyst can **view** Fuel & Expenses; only Fleet Manager and Driver can create logs.

