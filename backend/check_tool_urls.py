import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_tools():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    db = client["dsg-transport"]
    
    tools = await db.tools.find({}).to_list(None)
    
    print("Tools in database:")
    for tool in tools:
        print(f"\nName: {tool.get('name')}")
        print(f"URL: {tool.get('url')}")
        print(f"ID: {tool.get('_id')}")

asyncio.run(check_tools())
