#  TransitOps – Smart Transport Operations Platform

_(Since we haven't actually deployed the backend, the client side link(deployed using vercel) won't work). So please follow the below given instructions to clone it locally and make it working!_

TransitOps is a web-based transport management platform developed for the **Odoo Hackathon**. It helps organizations manage their fleet, drivers, trips, maintenance, and operational expenses from a single dashboard.

The goal of the project is to replace manual spreadsheets and logbooks with a centralized system that improves efficiency and enforces transport business rules.

---

##  Tech Stack

### Frontend
- Next.js
- Tailwind CSS

### Backend
- FastAPI (Python)

### Database
- PostgreSQL

---

##  Features

- Secure Authentication
- Dashboard with Fleet Overview
- Vehicle Management
- Driver Management
- Trip Management
- Maintenance Tracking
- Fuel & Expense Tracking
- Reports & Analytics

---

##  Project Structure

```text
TransitOps/
│
├── frontend/     # Next.js application
├── backend/      # FastAPI application
└── README.md
```

---

##  Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/smitinit/Odoo-26-TransitOps-Smart-Transport-Operations-Platform.git
cd Odoo-26-TransitOps-Smart-Transport-Operations-Platform
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on:

```
http://localhost:3000
```

---

### 3. Database Setup

- Install PostgreSQL
- Create a database named:

```
transitops
```

- Configure your database connection in the backend environment file (see [backend README](backend/README.md)).

---

### 4. Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Required: apply DB migrations before starting the API
alembic upgrade head

python scripts/seed_roles.py

uvicorn main:app --reload
```

The backend will run on:

```
http://localhost:8000
```

---

##  Core Modules

- Authentication
- Dashboard
- Vehicle Registry
- Driver Management
- Trip Management
- Maintenance
- Fuel & Expense Management
- Reports & Analytics

---

##  Team

Developed for the **Odoo Hackathon**.

Team Leader:

- Vivek

Team Members:

- Vishw
- Smit
- Pratham

---

##  License

This project is developed for educational and hackathon purposes.
