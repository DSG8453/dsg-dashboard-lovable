from fastapi import APIRouter, Depends, HTTPException, status, Request
from database import get_db
from routes.auth import get_current_user, require_admin
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter()

class IPWhitelistCreate(BaseModel):
    ip: str
    description: str
    status: str = "Active"

class UserIPSettingsUpdate(BaseModel):
    ip_restriction_enabled: bool
    whitelisted_ips: Optional[List[str]] = None

# Helper to check if Super Admin
def require_super_admin(current_user: dict = Depends(require_admin)):
    if current_user.get("role") != "Super Administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Administrator can perform this action"
        )
    return current_user

# ============ GLOBAL IP WHITELIST ============

@router.get("/whitelist")
async def get_ip_whitelist(current_user: dict = Depends(require_admin)):
    """Get global IP whitelist (admin only)"""
    db = await get_db()
    
    ips = []
    async for ip in db.ip_whitelist.find():
        ips.append({
            "id": str(ip["_id"]),
            "ip": ip["ip"],
            "description": ip.get("description", ""),
            "status": ip.get("status", "Active"),
            "added_by": ip.get("added_by", "Unknown"),
            "added_date": ip.get("added_date", "")
        })
    
    return ips

@router.post("/whitelist")
async def add_ip_to_whitelist(
    ip_data: IPWhitelistCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Add IP to global whitelist (Super Admin only)"""
    db = await get_db()
    
    # Check if IP already exists
    existing = await db.ip_whitelist.find_one({"ip": ip_data.ip})
    if existing:
        raise HTTPException(status_code=400, detail="IP address already in whitelist")
    
    new_ip = {
        "ip": ip_data.ip,
        "description": ip_data.description,
        "status": ip_data.status,
        "added_by": current_user["email"],
        "added_date": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.ip_whitelist.insert_one(new_ip)
    
    return {
        "id": str(result.inserted_id),
        "ip": ip_data.ip,
        "description": ip_data.description,
        "status": ip_data.status,
        "added_by": current_user["email"],
        "added_date": new_ip["added_date"]
    }

@router.put("/whitelist/{ip_id}")
async def update_ip_whitelist(
    ip_id: str,
    ip_data: IPWhitelistCreate,
    current_user: dict = Depends(require_super_admin)
):
    """Update IP in whitelist (Super Admin only)"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(ip_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid IP ID")
    
    ip = await db.ip_whitelist.find_one({"_id": obj_id})
    if not ip:
        raise HTTPException(status_code=404, detail="IP not found")
    
    await db.ip_whitelist.update_one(
        {"_id": obj_id},
        {"$set": {
            "ip": ip_data.ip,
            "description": ip_data.description,
            "status": ip_data.status
        }}
    )
    
    return {"message": "IP updated successfully"}

@router.delete("/whitelist/{ip_id}")
async def delete_ip_from_whitelist(
    ip_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Delete IP from whitelist (Super Admin only)"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(ip_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid IP ID")
    
    result = await db.ip_whitelist.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IP not found")
    
    return {"message": "IP deleted successfully"}

# ============ USER IP SETTINGS ============

@router.get("/users")
async def get_users_ip_settings(current_user: dict = Depends(require_super_admin)):
    """Get IP settings for all users (Super Admin only)"""
    db = await get_db()
    
    users = []
    async for user in db.users.find():
        users.append({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "ip_restriction_enabled": user.get("ip_restriction_enabled", False),
            "whitelisted_ips": user.get("whitelisted_ips", []),
            "last_login_ip": user.get("last_login_ip", "N/A")
        })
    
    return users

@router.put("/users/{user_id}")
async def update_user_ip_settings(
    user_id: str,
    settings: UserIPSettingsUpdate,
    current_user: dict = Depends(require_super_admin)
):
    """Update IP settings for a user (Super Admin only)"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {
        "ip_restriction_enabled": settings.ip_restriction_enabled
    }
    
    if settings.whitelisted_ips is not None:
        update_data["whitelisted_ips"] = settings.whitelisted_ips
    
    await db.users.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    
    return {
        "message": f"IP settings updated for {user['name']}",
        "ip_restriction_enabled": settings.ip_restriction_enabled,
        "whitelisted_ips": settings.whitelisted_ips or user.get("whitelisted_ips", [])
    }

@router.post("/users/{user_id}/add-ip")
async def add_user_whitelisted_ip(
    user_id: str,
    ip: str,
    current_user: dict = Depends(require_super_admin)
):
    """Add IP to user's whitelist (Super Admin only)"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    whitelisted_ips = user.get("whitelisted_ips", [])
    if ip not in whitelisted_ips:
        whitelisted_ips.append(ip)
    
    await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"whitelisted_ips": whitelisted_ips}}
    )
    
    return {"message": f"IP {ip} added to {user['name']}'s whitelist"}

@router.delete("/users/{user_id}/remove-ip/{ip}")
async def remove_user_whitelisted_ip(
    user_id: str,
    ip: str,
    current_user: dict = Depends(require_super_admin)
):
    """Remove IP from user's whitelist (Super Admin only)"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    whitelisted_ips = user.get("whitelisted_ips", [])
    if ip in whitelisted_ips:
        whitelisted_ips.remove(ip)
    
    await db.users.update_one(
        {"_id": obj_id},
        {"$set": {"whitelisted_ips": whitelisted_ips}}
    )
    
    return {"message": f"IP {ip} removed from {user['name']}'s whitelist"}

# ============ IP CHECK DURING LOGIN ============

async def check_ip_allowed(user: dict, client_ip: str, db) -> bool:
    """Check if the client IP is allowed for the user"""
    # Super Admin bypasses IP restrictions
    if user.get("role") == "Super Administrator":
        return True
    
    # If IP restriction not enabled for user, allow
    if not user.get("ip_restriction_enabled", False):
        return True
    
    # Check user's whitelisted IPs
    user_ips = user.get("whitelisted_ips", [])
    if client_ip in user_ips:
        return True
    
    # Check global whitelist
    global_ip = await db.ip_whitelist.find_one({"ip": client_ip, "status": "Active"})
    if global_ip:
        return True
    
    # Check CIDR ranges (basic check)
    for ip_entry in user_ips:
        if "/" in ip_entry:
            # Basic CIDR check - for production use ipaddress module
            network = ip_entry.split("/")[0].rsplit(".", 1)[0]
            if client_ip.startswith(network):
                return True
    
    return False
