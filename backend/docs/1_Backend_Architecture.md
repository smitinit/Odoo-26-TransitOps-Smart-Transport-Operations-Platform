# Backend Architecture

TransitOps is built using a modern, scalable, and modular architecture designed for enterprise SaaS applications.

## Core Principles

- **Clean Architecture:** Strict separation of concerns between API routing, business logic, and data access.
- **Vertical Slicing:** Features are grouped into cohesive modules (e.g., `users`, `fleet`) rather than layered globally.
- **Dependency Injection:** Dependencies like database sessions and current users are injected at the route level.

## Folder Structure

```text
backend/
├── app/
│   ├── api/v1/           # API Routers mapping
│   ├── core/             # Configuration, Security, Logging
│   ├── database/         # Database connection and session management
│   ├── middleware/       # Request ID, Logging, CORS, Audit Middleware
│   ├── modules/          # Feature Modules (Vertical Slices)
│   │   ├── users/        # Users module (schemas, models, repo, service, router)
│   │   ├── auth/         # Authentication module
│   │   └── ...           # Future modules (fleet, trips, etc.)
│   └── shared/           # Reusable generic classes (BaseRepository, BaseService)
├── docs/                 # Developer Documentation
├── scripts/              # Database Seed Scripts
├── tests/                # Test Suites
└── main.py               # Application Factory Entrypoint
```

## Request Lifecycle

1. **Client Request:** A request hits the FastAPI router.
2. **Middleware:** Passes through Request ID, Logging, and CORS middlewares.
3. **Router:** The route function receives the request. It extracts payload via Pydantic schemas and injects dependencies (DB session, Current User).
4. **Service Layer:** The router passes the validated data to the Service Layer. The service contains all business logic.
5. **Repository Layer:** If database interaction is required, the Service calls the Repository.
6. **Database:** The Repository executes SQLAlchemy 2.0 queries and returns models.
7. **Response:** The Service returns data to the Router, which formats it using the standardized `SuccessResponse` schema.

## Base Classes

To avoid code duplication, we use generics:
- **BaseModel:** Provides `id` (UUIDv7), `created_at`, and `updated_at`.
- **BaseRepository:** Provides generic `create`, `get_by_id`, `get_all`, `update`, `delete`, and `paginate` methods.
- **BaseService:** Wraps the repository and provides business-level error handling (e.g., raising `NotFoundException`).
