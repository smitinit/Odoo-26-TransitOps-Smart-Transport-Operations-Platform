# TransitOps Frontend

Next.js frontend for **TransitOps** – Smart Transport Operations Platform (Odoo Hackathon).

Provides the UI for authentication, fleet, drivers, trips, maintenance, fuel & expenses, analytics, notifications, settings, and admin user management.

---

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui (Base UI / Nova style)
- TanStack Table
- Recharts
- Zod
- Lucide React
- next-themes
- pnpm

---

## Architecture

```text
frontend/
├── app/                 # Next.js App Router pages
│   ├── (app)/           # Authenticated shell (sidebar + header)
│   │   ├── dashboard/
│   │   ├── fleet/
│   │   ├── drivers/
│   │   ├── trips/
│   │   ├── maintenance/
│   │   ├── fuel-expenses/
│   │   ├── analytics/
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── users/       # Superuser-only
│   │   └── account/
│   └── login/
├── components/          # UI, layout, feature components, auth guards
├── lib/
│   ├── api/             # Typed API client modules (auth, vehicles, …)
│   ├── auth/            # Permission helpers
│   └── utils.ts
├── hooks/
├── docs/                # Product notes / todos
└── ui-mockups/          # Design references
```

- **Auth:** JWT access/refresh tokens stored client-side; `AuthProvider` + `AuthGuard` protect `(app)` routes. Superuser-only pages use `AdminGuard`.
- **API:** `lib/api/client.ts` sends `Authorization: Bearer …` to `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- **RBAC:** Nav and pages respect backend permissions / `is_superuser` where enforced.

---

## Features

- Login / logout with session restore
- Dashboard overview
- Vehicle registry (fleet CRUD, filters, search)
- Driver management
- Trip management
- Maintenance tracking
- Fuel & expense tracking
- Analytics charts
- Notifications
- Settings & account
- Admin user management (create / update / deactivate / delete)

---

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Backend running at `http://localhost:8000` (see [backend README](../backend/README.md))

### 1. Install dependencies

```bash
cd frontend
pnpm install
```

### 2. Environment

```bash
cp .env.sample .env
```

```env
# Backend API base URL (includes /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Use a seeded backend account (e.g. `admin@transitops.com` / `Admin@123`) — see the backend README for all demo users.

### Other scripts

```bash
pnpm build    # production build
pnpm start    # serve production build
pnpm lint     # ESLint
```

---

## Project context

```text
TransitOps/
├── frontend/     # This Next.js application
├── backend/      # FastAPI application
└── README.md
```

For full project setup and team info, see the [root README](../README.md).
