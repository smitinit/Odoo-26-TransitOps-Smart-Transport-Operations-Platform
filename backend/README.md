# TransitOps Backend

FastAPI backend for **TransitOps** – Smart Transport Operations Platform (Odoo Hackathon).

Handles authentication, RBAC, fleet, drivers, trips, maintenance, fuel & expenses, dashboard, analytics, notifications, and settings.

---

## Tech Stack

- Python 3.13+
- FastAPI
- PostgreSQL
- SQLAlchemy 2.0 (async) + asyncpg
- Alembic
- Pydantic v2 / pydantic-settings
- JWT (PyJWT) + Argon2id (pwdlib)
- UUIDv7

---

## Architecture

Feature-based vertical slices with shared infrastructure:

```text
backend/
├── main.py                 # App factory, CORS, middleware, routers
├── alembic/                # Database migrations
├── scripts/                # Seed & smoke-test utilities
├── docs/                   # Architecture, RBAC, API, integration guides
└── app/
    ├── api/v1/             # Health + aggregated CRUD routers
    ├── core/               # Config, security, exceptions, logging
    ├── database/           # Session, audit events
    ├── middleware/         # Request ID, structured logging
    ├── modules/            # Domain modules
    │   ├── auth/
    │   ├── users/
    │   ├── roles/
    │   ├── fleet/
    │   ├── drivers/
    │   ├── trips/
    │   ├── maintenance/
    │   ├── finance/
    │   ├── notifications/
    │   ├── settings/
    │   └── audit/
    └── shared/             # Base repository/service, responses, pagination
```

API base path: `/api/v1`

Main resource groups: `auth`, `users`, `roles`, `vehicles`, `drivers`, `trips`, `maintenance`, `fuel-logs`, `expenses`, `finance`, `dashboard`, `analytics`, `settings`, `notifications`, `health`.

---

## Setup

### 1. Database

Install PostgreSQL and create a database named `transitops`.

### 2. Environment

Create a `.env` in the `backend/` directory (optional — defaults work for local Postgres):

```env
PROJECT_NAME="TransitOps API"
VERSION="1.0.0"
SECRET_KEY="your-super-secret-key"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=transitops
```

`DATABASE_URL` is built from the `POSTGRES_*` values as  
`postgresql+asyncpg://user:pass@host:port/db`.

### 3. Virtual environment & dependencies

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
# venv\Scripts\activate

pip install -r requirements.txt
```

### 4. Migrations (required before starting)

Apply all database migrations before seeding or running the API:

```bash
alembic upgrade head
```

Run this after a fresh clone, whenever you pull new migration files, and before `uvicorn`. Without it, the schema will be missing or outdated.

To generate a new revision after model changes:

```bash
alembic revision --autogenerate -m "Describe change"
alembic upgrade head
```

### 5. Seed data

Roles, permissions, and demo users:

```bash
python scripts/seed_roles.py
```

Optional domain seeds (sample data for demos):

```bash
python scripts/seed_vehicles.py
python scripts/seed_drivers.py
python scripts/seed_trips.py
python scripts/seed_maintenance.py
python scripts/seed_finance.py
```

Or a presentation pack:

```bash
python scripts/seed_presentation.py
```

### 6. Run the server

```bash
alembic upgrade head   # required first
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: [http://localhost:8000](http://localhost:8000)

---

## Demo accounts

Created by `seed_roles.py`:

| Role | Email | Password |
|------|-------|----------|
| Admin (superuser) | `admin@transitops.com` | `Admin@123` |
| Fleet Manager | `fleet@transitops.com` | `Fleet@123` |
| Driver | `driver@transitops.com` | `Driver@123` |
| Safety Officer | `safety@transitops.com` | `Safety@123` |
| Financial Analyst | `finance@transitops.com` | `Finance@123` |

Presentation logins also use `*-prod@transitops.com` with password `role@123`.

---

## API documentation

With the server running:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- OpenAPI JSON: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

Auth: `POST /api/v1/auth/login` (form: `username` = email, `password`).  
Protected routes: `Authorization: Bearer <access_token>`.

---

## Smoke test

```bash
python scripts/smoke_test.py
```

---

## Further docs

See `docs/` for architecture, auth flow, RBAC, database, API contract, and frontend integration.

For the Next.js UI, see the [frontend README](../frontend/README.md).
