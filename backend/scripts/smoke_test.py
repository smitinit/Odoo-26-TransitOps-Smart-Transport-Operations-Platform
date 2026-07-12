"""Quick smoke test for all TransitOps endpoints."""
import asyncio
import httpx
import time

BASE = "http://localhost:5000/api/v1"
TS = str(int(time.time()))[-6:]  # unique suffix per run

async def main():
    async with httpx.AsyncClient(timeout=10) as c:
        # 1. Login
        r = await c.post(f"{BASE}/auth/login", data={"username": "admin@transitops.com", "password": "Admin@123"})
        assert r.status_code == 200, f"Login failed: {r.text}"
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] Login OK")

        # 2. Get /me
        r = await c.get(f"{BASE}/users/me", headers=h)
        assert r.status_code == 200
        print(f"[PASS] GET /users/me -- {r.json()['data']['email']}")

        # 3. List roles
        r = await c.get(f"{BASE}/roles", headers=h)
        assert r.status_code == 200
        roles = r.json()["data"]
        print(f"[PASS] GET /roles -- {len(roles)} roles found")

        # 4. Create vehicle
        r = await c.post(f"{BASE}/vehicles", headers=h, json={
            "vin": f"VIN{TS}ABCDEF", "license_plate": f"MH-{TS}",
            "make": "Tata", "model": "Ace Gold", "year": 2024
        })
        assert r.status_code == 201, f"Create vehicle failed: {r.text}"
        vehicle_id = r.json()["data"]["id"]
        print(f"[PASS] POST /vehicles -- created {vehicle_id[:12]}...")

        # 5. List vehicles
        r = await c.get(f"{BASE}/vehicles", headers=h)
        assert r.status_code == 200
        print(f"[PASS] GET /vehicles -- {len(r.json()['data'])} vehicles")

        # 6. Get single vehicle
        r = await c.get(f"{BASE}/vehicles/{vehicle_id}", headers=h)
        assert r.status_code == 200
        print(f"[PASS] GET /vehicles/{{id}} OK")

        # 7. Update vehicle
        r = await c.patch(f"{BASE}/vehicles/{vehicle_id}", headers=h, json={"status": "MAINTENANCE"})
        assert r.status_code == 200, f"Update vehicle failed: {r.text}"
        print(f"[PASS] PATCH /vehicles -- status={r.json()['data']['status']}")

        # 8. Create user (driver account)
        r = await c.post(f"{BASE}/users", headers=h, json={
            "email": f"driver{TS}@transitops.com", "password": "Driver@123",
            "first_name": "Rahul", "last_name": "Sharma"
        })
        assert r.status_code == 201, f"Create user failed: {r.text}"
        driver_user_id = r.json()["data"]["id"]
        print(f"[PASS] POST /users -- created driver user")

        # 9. Create driver
        r = await c.post(f"{BASE}/drivers", headers=h, json={
            "user_id": driver_user_id,
            "first_name": "Rahul",
            "last_name": "Sharma",
            "license_number": f"MH-LIC-{TS}",
            "license_category": "LMV",
            "contact_number": "9876500000",
            "status": "AVAILABLE",
        })
        assert r.status_code == 201, f"Create driver failed: {r.text}"
        driver_id = r.json()["data"]["id"]
        print(f"[PASS] POST /drivers -- created")

        # 10. List drivers
        r = await c.get(f"{BASE}/drivers", headers=h)
        assert r.status_code == 200
        print(f"[PASS] GET /drivers -- {len(r.json()['data'])} drivers")

        # 11. Create trip
        r = await c.post(f"{BASE}/trips", headers=h, json={
            "vehicle_id": vehicle_id, "driver_id": driver_id,
            "origin": "Mumbai", "destination": "Pune",
            "start_time": "2026-07-12T10:00:00+05:30",
            "load_type": "Parcels",
            "cargo_weight_kg": 200,
            "planned_distance_km": 150,
        })
        assert r.status_code == 201, f"Create trip failed: {r.text}"
        trip_id = r.json()["data"]["id"]
        print(f"[PASS] POST /trips -- created")

        # 12. Update trip status
        r = await c.patch(f"{BASE}/trips/{trip_id}", headers=h, json={"status": "IN_PROGRESS"})
        assert r.status_code == 200, f"Update trip failed: {r.text}"
        print(f"[PASS] PATCH /trips -- status={r.json()['data']['status']}")

        # 13. Create maintenance
        r = await c.post(f"{BASE}/maintenance", headers=h, json={
            "vehicle_id": vehicle_id,
            "maintenance_type": "Oil Change",
            "description": "Oil change",
            "scheduled_date": "2026-07-15",
            "cost": 2500.00,
        })
        assert r.status_code == 201, f"Create maintenance failed: {r.text}"
        print(f"[PASS] POST /maintenance -- created")

        # 14. Create expense
        r = await c.post(f"{BASE}/expenses", headers=h, json={
            "vehicle_id": vehicle_id, "trip_id": trip_id,
            "expense_type": "TOLL", "amount": 350.00,
            "date_incurred": "2026-07-12", "description": "Mumbai-Pune toll"
        })
        assert r.status_code == 201, f"Create expense failed: {r.text}"
        print(f"[PASS] POST /expenses -- created")

        # 15. Create fuel log
        r = await c.post(f"{BASE}/fuel-logs", headers=h, json={
            "vehicle_id": vehicle_id, "liters": 15.5,
            "cost": 1800.00, "date_filled": "2026-07-12"
        })
        assert r.status_code == 201, f"Create fuel log failed: {r.text}"
        print(f"[PASS] POST /fuel-logs -- created")

        # 16. Dashboard stats
        r = await c.get(f"{BASE}/dashboard/stats", headers=h)
        assert r.status_code == 200, f"Dashboard failed: {r.text}"
        stats = r.json()["data"]
        print(f"[PASS] GET /dashboard/stats --")
        print(f"   Vehicles: {stats['total_vehicles']} total, {stats['active_vehicles']} active")
        print(f"   Drivers: {stats['total_drivers']} total, {stats['active_drivers']} active")
        print(f"   Trips: {stats['total_trips']} total, {stats['trips_in_progress']} in progress")
        print(f"   Maintenance: {stats['pending_maintenance']} pending")
        print(f"   Expenses: {stats['total_expenses']}")

        # 17. List users
        r = await c.get(f"{BASE}/users", headers=h)
        assert r.status_code == 200
        print(f"[PASS] GET /users -- {len(r.json()['data'])} users")

        # 18. Verify 404 for non-existent resource
        r = await c.get(f"{BASE}/vehicles/00000000-0000-0000-0000-000000000000", headers=h)
        assert r.status_code == 404
        print(f"[PASS] GET /vehicles/{{invalid}} -- 404 as expected")

        print("\n=== ALL 18 TESTS PASSED - Backend is fully functional! ===")

asyncio.run(main())
