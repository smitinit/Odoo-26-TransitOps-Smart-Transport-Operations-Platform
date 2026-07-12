# Role-Based Access Control (RBAC)

TransitOps utilizes a robust, database-driven RBAC system. 

## Core Concepts

- **Users:** The individuals logging into the system. A user has exactly one `Role`.
- **Roles:** A grouping of permissions (e.g., "Admin", "Dispatcher", "Driver").
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

The `scripts/seed_roles.py` script automatically seeds:
- **Roles:** Admin, Fleet Manager, Dispatcher, Safety Officer, Financial Analyst.
- **Permissions:** Module specific permissions (`vehicle.create`, `trip.dispatch`, etc.) mapped accordingly.
