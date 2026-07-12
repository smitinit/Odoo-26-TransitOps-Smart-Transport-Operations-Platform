"""Seed roles, permissions, and demo users aligned to the TransitOps RBAC matrix.

Role intent (from product matrix):
- Fleet Manager: owns fleet assets, maintenance, fuel/expense logs; can plan/dispatch
  trips but does not complete them or enter trip-time fuel.
- Driver: creates/assigns/dispatches trips, completes deliveries, enters fuel &
  toll/misc expenses (write). Read-only on registries & maintenance.
- Safety Officer: driver compliance & licenses (CRUD); read elsewhere including costs.
- Financial Analyst: read-only review of fleet, trips, fuel, expenses, maintenance.
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.modules.roles.models import Role, Permission, RolePermission
from app.modules.users.models import User
from sqlalchemy import select, delete

PERMISSIONS = [
    # Vehicle
    "vehicle.create", "vehicle.read", "vehicle.update", "vehicle.delete",
    # Driver registry
    "driver.create", "driver.read", "driver.update", "driver.delete",
    # Trips
    "trip.create", "trip.read", "trip.dispatch", "trip.complete", "trip.cancel",
    # Maintenance
    "maintenance.create", "maintenance.read", "maintenance.update",
    # Finance
    "fuel.create", "fuel.read", "expense.create", "expense.read",
    # Dashboard / system
    "dashboard.view",
    "notification.read",
    "settings.manage",
]

# Fleet Manager — fleet assets & maintenance; fuel/expense log CRUD;
# trip plan/assign/dispatch (W) but Complete Trip is R only (no trip.complete)
FLEET_MANAGER_PERMISSIONS = {
    "dashboard.view",
    "vehicle.create", "vehicle.read", "vehicle.update", "vehicle.delete",
    "driver.create", "driver.read", "driver.update", "driver.delete",
    "trip.create", "trip.read", "trip.dispatch", "trip.cancel",
    "maintenance.create", "maintenance.read", "maintenance.update",
    "fuel.create", "fuel.read",
    "expense.create", "expense.read",
    "notification.read",
}

# Driver — trip ops owner: create/assign/dispatch/complete; write fuel & expenses;
# read registries & maintenance (status Auto via business rules)
DRIVER_PERMISSIONS = {
    "dashboard.view",
    "vehicle.read",
    "driver.read",
    "trip.create", "trip.read", "trip.dispatch", "trip.complete", "trip.cancel",
    "maintenance.read",
    "fuel.create", "fuel.read",
    "expense.create", "expense.read",
    "notification.read",
}

# Safety Officer — driver compliance / licenses; suspend-restore via driver.update;
# read-only on fleet, trips, maintenance, fuel, expenses
SAFETY_OFFICER_PERMISSIONS = {
    "dashboard.view",
    "vehicle.read",
    "driver.create", "driver.read", "driver.update", "driver.delete",
    "trip.read",
    "maintenance.read",
    "fuel.read",
    "expense.read",
    "notification.read",
}

# Financial Analyst — read-only cost & ops review (no writes)
FINANCIAL_ANALYST_PERMISSIONS = {
    "dashboard.view",
    "vehicle.read",
    "driver.read",
    "trip.read",
    "maintenance.read",
    "fuel.read",
    "expense.read",
    "notification.read",
}


async def _ensure_permission(session, name: str) -> Permission:
    result = await session.execute(select(Permission).where(Permission.name == name))
    perm = result.scalar_one_or_none()
    if not perm:
        perm = Permission(name=name, description=f"Permission for {name}")
        session.add(perm)
        await session.flush()
    return perm


async def _ensure_role(session, name: str, description: str | None = None) -> Role:
    result = await session.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=name, description=description or f"{name} role")
        session.add(role)
        await session.flush()
    elif description and role.description != description:
        role.description = description
    return role


async def _sync_role_permissions(
    session,
    role: Role,
    permission_names: set[str],
    perm_by_name: dict[str, Permission],
):
    """Add missing links and revoke extras so the role matches the matrix exactly."""
    desired_ids = {perm_by_name[name].id for name in permission_names}

    existing = (
        await session.execute(
            select(RolePermission).where(RolePermission.role_id == role.id)
        )
    ).scalars().all()
    existing_by_perm = {rp.permission_id: rp for rp in existing}

    for perm_id, rp in existing_by_perm.items():
        if perm_id not in desired_ids:
            await session.delete(rp)

    for perm_id in desired_ids:
        if perm_id not in existing_by_perm:
            session.add(RolePermission(role_id=role.id, permission_id=perm_id))


async def _migrate_dispatcher_to_driver(session, driver_role: Role) -> None:
    """Rename legacy 'Dispatcher' role users onto 'Driver' (matrix name)."""
    result = await session.execute(select(Role).where(Role.name == "Dispatcher"))
    dispatcher = result.scalar_one_or_none()
    if not dispatcher or dispatcher.id == driver_role.id:
        return

    users = (
        await session.execute(select(User).where(User.role_id == dispatcher.id))
    ).scalars().all()
    for user in users:
        user.role_id = driver_role.id
        print(f"Migrated {user.email} from Dispatcher → Driver.")

    await session.execute(
        delete(RolePermission).where(RolePermission.role_id == dispatcher.id)
    )
    await session.delete(dispatcher)
    print("Removed legacy Dispatcher role.")


async def _ensure_demo_user(
    session,
    *,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: Role,
    label: str,
):
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        session.add(
            User(
                email=email,
                hashed_password=get_password_hash(password),
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_superuser=False,
                role_id=role.id,
            )
        )
        print(f"{label} user created ({email} / {password}).")
    else:
        user.role_id = role.id
        user.is_superuser = False
        print(f"Updated existing {email} role to {label}.")


async def seed_data():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        perm_by_name: dict[str, Permission] = {}
        for name in PERMISSIONS:
            perm_by_name[name] = await _ensure_permission(session, name)
        await session.commit()

        roles = {
            "Admin": await _ensure_role(
                session, "Admin", "Full system access"
            ),
            "Fleet Manager": await _ensure_role(
                session,
                "Fleet Manager",
                "Manages fleet assets, maintenance, and cost logs",
            ),
            "Driver": await _ensure_role(
                session,
                "Driver",
                "Creates trips, assigns resources, completes deliveries, logs fuel/tolls",
            ),
            "Safety Officer": await _ensure_role(
                session,
                "Safety Officer",
                "Manages driver compliance and licenses",
            ),
            "Financial Analyst": await _ensure_role(
                session,
                "Financial Analyst",
                "Reviews fuel, expenses, maintenance costs, and profitability",
            ),
        }
        await session.commit()

        await _migrate_dispatcher_to_driver(session, roles["Driver"])
        await session.commit()

        await _sync_role_permissions(
            session, roles["Admin"], set(PERMISSIONS), perm_by_name
        )
        await _sync_role_permissions(
            session, roles["Fleet Manager"], FLEET_MANAGER_PERMISSIONS, perm_by_name
        )
        await _sync_role_permissions(
            session, roles["Driver"], DRIVER_PERMISSIONS, perm_by_name
        )
        await _sync_role_permissions(
            session, roles["Safety Officer"], SAFETY_OFFICER_PERMISSIONS, perm_by_name
        )
        await _sync_role_permissions(
            session,
            roles["Financial Analyst"],
            FINANCIAL_ANALYST_PERMISSIONS,
            perm_by_name,
        )
        await session.commit()

        # Admin
        result = await session.execute(
            select(User).where(User.email == "admin@transitops.com")
        )
        if not result.scalar_one_or_none():
            session.add(
                User(
                    email="admin@transitops.com",
                    hashed_password=get_password_hash("Admin@123"),
                    first_name="System",
                    last_name="Admin",
                    is_active=True,
                    is_superuser=True,
                    role_id=roles["Admin"].id,
                )
            )
            print("Admin user created.")

        await _ensure_demo_user(
            session,
            email="fleet@transitops.com",
            password="Fleet@123",
            first_name="Priya",
            last_name="Shah",
            role=roles["Fleet Manager"],
            label="Fleet Manager",
        )
        await _ensure_demo_user(
            session,
            email="driver@transitops.com",
            password="Driver@123",
            first_name="Raven",
            last_name="Kulkarni",
            role=roles["Driver"],
            label="Driver",
        )
        # Keep legacy dispatch login working → Driver role
        await _ensure_demo_user(
            session,
            email="dispatch@transitops.com",
            password="Dispatch@123",
            first_name="Raven",
            last_name="Kulkarni",
            role=roles["Driver"],
            label="Driver",
        )
        await _ensure_demo_user(
            session,
            email="safety@transitops.com",
            password="Safety@123",
            first_name="Raven",
            last_name="Kapoor",
            role=roles["Safety Officer"],
            label="Safety Officer",
        )
        await _ensure_demo_user(
            session,
            email="finance@transitops.com",
            password="Finance@123",
            first_name="Anika",
            last_name="Mehta",
            role=roles["Financial Analyst"],
            label="Financial Analyst",
        )

        # Link Driver login users to a physical driver profile (for personal dashboard)
        from app.modules.drivers.models import Driver

        driver_user = (
            await session.execute(select(User).where(User.email == "driver@transitops.com"))
        ).scalar_one_or_none()
        dispatch_user = (
            await session.execute(select(User).where(User.email == "dispatch@transitops.com"))
        ).scalar_one_or_none()
        # Prefer ON_TRIP profile so Driver dashboard shows an active trip
        profile = (
            await session.execute(
                select(Driver).where(Driver.license_number == "DL-77031")  # Priya Nair
            )
        ).scalar_one_or_none()
        if not profile:
            profile = (
                await session.execute(select(Driver).limit(1))
            ).scalar_one_or_none()
        if profile:
            if driver_user:
                profile.user_id = driver_user.id
                print(f"Linked driver@transitops.com → {profile.first_name} {profile.last_name}.")
            elif dispatch_user:
                profile.user_id = dispatch_user.id
                print(f"Linked dispatch@transitops.com → {profile.first_name} {profile.last_name}.")

        await session.commit()
        print(
            "Role permissions synced "
            "(Admin, Fleet Manager, Driver, Safety Officer, Financial Analyst)."
        )


if __name__ == "__main__":
    asyncio.run(seed_data())
