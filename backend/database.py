import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Get MongoDB URL from Secret Manager
try:
    from services.secret_manager_service import SecretManagerService
    secret_manager = SecretManagerService()
    MONGO_URL = secret_manager.get_secret("mongo-uri") or os.getenv("MONGO_URL", "mongodb://localhost:27017")
except Exception as e:
    print(f"Warning: Could not load secret from Secret Manager: {e}")
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "dsg_transport")

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.tools.create_index("name")
    await db.credentials.create_index([("user_id", 1), ("tool_id", 1)])
    await db.issues.create_index("user_id")
    
    print(f"Connected to MongoDB: {DB_NAME}")
    
    # Seed initial data if empty
    await seed_initial_data()

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")

async def get_db():
    return db

def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

async def seed_initial_data():
    """Seed initial data only when explicitly enabled via environment variables."""
    from utils.security import hash_password

    if not env_bool("ENABLE_BOOTSTRAP_SEED", False):
        print("Bootstrap seed disabled (set ENABLE_BOOTSTRAP_SEED=true to enable).")
        return

    admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@dsgtransport.com").strip().lower()
    initial_admin_password = os.getenv("INITIAL_ADMIN_PASSWORD", "").strip()

    if not initial_admin_password:
        raise RuntimeError(
            "INITIAL_ADMIN_PASSWORD is required when ENABLE_BOOTSTRAP_SEED=true."
        )

    # Check if admin exists
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        # Create admin user
        admin_user = {
            "email": admin_email,
            "password": hash_password(initial_admin_password),
            "name": "Admin User",
            "role": "Administrator",
            "status": "Active",
            "access_level": "full",
            "initials": "AU",
            "created_at": "2025-12-01T00:00:00Z"
        }
        await db.users.insert_one(admin_user)
        print("Admin user created")

    if env_bool("ENABLE_SAMPLE_USERS_SEED", False):
        sample_user_password = os.getenv("SAMPLE_USER_PASSWORD", "").strip()
        if not sample_user_password:
            raise RuntimeError(
                "SAMPLE_USER_PASSWORD is required when ENABLE_SAMPLE_USERS_SEED=true."
            )

        sample_users = [
            {
                "email": "john.smith@dsgtransport.com",
                "password": hash_password(sample_user_password),
                "name": "John Smith",
                "role": "User",
                "status": "Active",
                "access_level": "standard",
                "initials": "JS",
                "created_at": "2025-12-05T00:00:00Z"
            },
            {
                "email": "sarah.johnson@dsgtransport.com",
                "password": hash_password(sample_user_password),
                "name": "Sarah Johnson",
                "role": "User",
                "status": "Active",
                "access_level": "standard",
                "initials": "SJ",
                "created_at": "2025-12-08T00:00:00Z"
            }
        ]

        for user_data in sample_users:
            exists = await db.users.find_one({"email": user_data["email"]})
            if not exists:
                await db.users.insert_one(user_data)
        print("Sample users seeded")
    
    # Check if tools exist
    tools_count = await db.tools.count_documents({})
    if tools_count == 0:
        tools = [
            {"name": "Bitwarden", "category": "Security", "description": "Password manager for secure credential storage and sharing across the team.", "icon": "Shield", "url": "https://vault.bitwarden.com"},
            {"name": "Zoho Assist", "category": "Support", "description": "Remote desktop support and control panel for IT assistance and troubleshooting.", "icon": "Monitor", "url": "https://assist.zoho.com"},
            {"name": "Ascend TMS", "category": "TMS", "description": "Transportation management system for fleet operations and logistics tracking.", "icon": "Truck", "url": "#"},
            {"name": "RMIS", "category": "Compliance", "description": "Risk management and compliance tracking system for regulatory requirements.", "icon": "FileCheck", "url": "#"},
            {"name": "DAT Load Board", "category": "Freight", "description": "Load board platform for finding and posting freight opportunities.", "icon": "Package", "url": "#"},
            {"name": "Truckstop", "category": "Freight", "description": "Freight matching and load board services for trucking companies.", "icon": "Cloud", "url": "#"},
            {"name": "Fleet Maintenance", "category": "Operations", "description": "Vehicle maintenance tracking and scheduling system for fleet management.", "icon": "Wrench", "url": "#"},
            {"name": "Fuel Cards Portal", "category": "Finance", "description": "Fuel card management and expense tracking for fleet operations.", "icon": "Database", "url": "#"},
        ]
        await db.tools.insert_many(tools)
        print("Default tools created")
    
    # Check if settings exist
    settings = await db.settings.find_one({"type": "support"})
    if not settings:
        await db.settings.insert_one({
            "type": "support",
            "whatsapp_number": "+1234567890",
            "support_email": "support@dsgtransport.com",
            "business_hours": "Mon-Fri 9AM-6PM EST"
        })
        print("Default settings created")
