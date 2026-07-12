import asyncio, httpx

async def main():
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post('http://localhost:5000/api/v1/auth/login', data={'username': 'admin@transitops.com', 'password': 'Admin@123'})
        t = r.json()['access_token']
        h = {'Authorization': f'Bearer {t}'}
        
        r2 = await c.get('http://localhost:5000/api/v1/vehicles', headers=h)
        vid = r2.json()['data'][0]['id']
        
        r3 = await c.patch(f'http://localhost:5000/api/v1/vehicles/{vid}', headers=h, json={'status': 'MAINTENANCE'})
        print(f"PATCH status: {r3.status_code}")
        print(f"PATCH body: {r3.text}")

asyncio.run(main())
