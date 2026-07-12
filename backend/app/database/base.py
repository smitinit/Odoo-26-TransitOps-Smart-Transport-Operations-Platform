# Import all models here so Alembic can discover them
from app.shared.base.model import Base
from app.modules.users.models import User
from app.modules.roles.models import Role, Permission, RolePermission
from app.modules.fleet.models import Vehicle, VehicleDocument
from app.modules.drivers.models import Driver, DriverDocument
from app.modules.trips.models import Trip
from app.modules.maintenance.models import Maintenance
from app.modules.finance.models import Expense, FuelLog
from app.modules.notifications.models import Notification
from app.modules.audit.models import AuditLog
from app.modules.settings.models import Setting
