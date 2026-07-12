import asyncio
import asyncpg
from app.core.config import settings

async def create_db():
    try:
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            database='postgres'
        )
        db_exists = await conn.fetchval(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            settings.POSTGRES_DB
        )
        if not db_exists:
            await conn.execute(f'CREATE DATABASE {settings.POSTGRES_DB}')
            print('DB created')
        else:
            print('DB already exists')
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(create_db())
