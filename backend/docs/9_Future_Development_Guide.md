# Future Development Guide

All future feature modules MUST follow the Vertical Slicing architecture. 

## Step-by-Step Module Creation

To create a new module (e.g., `fleet`):

### 1. Create the Module Directory
Create `app/modules/fleet/`.

### 2. Create the Model (`models.py`)
- Inherit from `BaseModel`.
- Add columns and relationships.
- Import this model in `app/database/base.py` so Alembic detects it.

### 3. Create Schemas (`schemas.py`)
- Define `VehicleBase`, `VehicleCreate`, `VehicleUpdate`, and `VehicleResponse`.
- Use Pydantic v2.

### 4. Create Repository (`repository.py`)
```python
from app.shared.base.repository import BaseRepository
from app.modules.fleet.models import Vehicle
from app.modules.fleet.schemas import VehicleCreate, VehicleUpdate

class VehicleRepository(BaseRepository[Vehicle, VehicleCreate, VehicleUpdate]):
    def __init__(self):
        super().__init__(Vehicle)
        
vehicle_repository = VehicleRepository()
```

### 5. Create Service (`service.py`)
```python
from app.shared.base.service import BaseService
from app.modules.fleet.models import Vehicle
from app.modules.fleet.schemas import VehicleCreate, VehicleUpdate
from app.modules.fleet.repository import VehicleRepository, vehicle_repository

class VehicleService(BaseService[Vehicle, VehicleCreate, VehicleUpdate]):
    def __init__(self, repository: VehicleRepository):
        super().__init__(repository)
        
vehicle_service = VehicleService(vehicle_repository)
```

### 6. Create Router (`router.py`)
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies.auth import require_permission
from app.modules.fleet.service import vehicle_service

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.post("")
async def create_vehicle(
    payload: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("vehicle.create"))
):
    # Pass to service
    vehicle = await vehicle_service.create(db, obj_in=payload)
    return SuccessResponse(message="Vehicle created", data=vehicle)
```

### 7. Register Router
Import and include the router in `main.py`:
```python
from app.modules.fleet.router import router as fleet_router
app.include_router(fleet_router, prefix=settings.API_V1_STR)
```
