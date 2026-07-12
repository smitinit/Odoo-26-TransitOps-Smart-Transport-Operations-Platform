# TransitOps Backend

Enterprise Fleet & Transport Operations Platform backend.

## Tech Stack
- Python 3.13+
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0 (Async)
- Alembic
- Pydantic v2
- Argon2id
- UUIDv7

## Architecture
This project uses a feature-based vertical slice architecture to ensure extreme scalability and separation of concerns.
- `app/modules/`: Contains feature modules (e.g., `users`, `fleet`). Each module has its own models, schemas, repository, service, and router.
- `app/shared/`: Reusable enterprise utilities (BaseService, BaseRepository, BaseResponses, Pagination).
- `app/core/`: Application config, security, exceptions, and structured logging.

## Setup Instructions

### 1. Database
Ensure you have a PostgreSQL instance running. Create a database named `transitops`.

### 2. Environment Variables
Create a `.env` file in the root of the `backend` directory:
```env
PROJECT_NAME="TransitOps API"
VERSION="1.0.0"
SECRET_KEY="your-super-secret-key"
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/transitops"
```

### 3. Virtual Environment & Dependencies
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Migrations
Generate the initial database tables:
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 5. Seed Data
Seed the database with roles, permissions, and the default admin user:
```bash
python scripts/seed_roles.py
```

### 6. Run the Server
```bash
uvicorn main:app --reload
```

## API Documentation
Once the server is running, visit:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
