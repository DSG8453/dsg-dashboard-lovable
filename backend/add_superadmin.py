import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from utils.security import hash_password
import os

def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value

async def create_superadmin():
    # Connect to MongoDB
    mongo_url = required_env("MONGO_URL")
    db_name = os.getenv("DB_NAME", "dsg-transport")
    superadmin_email = os.getenv("SUPERADMIN_EMAIL", "info@dsgtransport.net").strip().lower()
    superadmin_password = required_env("SUPERADMIN_PASSWORD")
    superadmin_name = os.getenv("SUPERADMIN_NAME", "Super Admin")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if superadmin exists
    existing = await db.users.find_one({"email": superadmin_email})
    
    if existing:
        print("✅ Super Admin already exists!")
        print(f"Email: {existing['email']}")
        print(f"Role: {existing.get('role', 'N/A')}")
    else:
        # Create Super Admin
        superadmin = {
            "email": superadmin_email,
            "password": hash_password(superadmin_password),
            "name": superadmin_name,
            "role": "Super Administrator",
            "status": "Active",
            "access_level": "superadmin",
            "initials": "SA",
            "password_login_enabled": True,
            "two_step_verification": True,
            "created_at": "2025-01-12T00:00:00Z"
        }
        
        await db.users.insert_one(superadmin)
        print("✅ Super Admin created!")
        print(f"Email: {superadmin_email}")
        print("⚠️  Password was set from SUPERADMIN_PASSWORD.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_superadmin())
