import asyncio
import sys
import os

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.modules.roles.models import Role, Permission, RolePermission
from app.modules.users.models import User
from sqlalchemy import select

async def seed_data():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        # Create permissions
        perms = ["vehicle:create", "vehicle:read", "vehicle:update", "vehicle:delete"]
        db_perms = []
        for p in perms:
            result = await session.execute(select(Permission).where(Permission.name == p))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(name=p, description=f"Permission to {p}")
                session.add(perm)
            db_perms.append(perm)
            
        await session.commit()
        for p in db_perms:
            await session.refresh(p)

        # Create roles
        roles_data = ["admin", "driver", "manager"]
        db_roles = []
        for r in roles_data:
            result = await session.execute(select(Role).where(Role.name == r))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(name=r, description=f"{r.capitalize()} role")
                session.add(role)
            db_roles.append(role)
            
        await session.commit()
        for r in db_roles:
            await session.refresh(r)

        # Assign all perms to admin
        admin_role = next(r for r in db_roles if r.name == "admin")
        for p in db_perms:
            result = await session.execute(
                select(RolePermission).where(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == p.id
                )
            )
            if not result.scalar_one_or_none():
                rp = RolePermission(role_id=admin_role.id, permission_id=p.id)
                session.add(rp)
                
        await session.commit()

        # Create Admin User
        result = await session.execute(select(User).where(User.email == "admin@transitops.com"))
        if not result.scalar_one_or_none():
            admin_user = User(
                email="admin@transitops.com",
                hashed_password=get_password_hash("SuperSecret123!"),
                first_name="System",
                last_name="Admin",
                is_active=True,
                is_superuser=True,
                role_id=admin_role.id
            )
            session.add(admin_user)
            await session.commit()
            print("Admin user created: admin@transitops.com / SuperSecret123!")

if __name__ == "__main__":
    asyncio.run(seed_data())
