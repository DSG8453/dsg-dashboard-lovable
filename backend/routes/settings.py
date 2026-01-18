from fastapi import APIRouter, Depends, HTTPException, status
from models.schemas import SupportSettings, SupportSettingsUpdate
from database import get_db
from routes.auth import get_current_user, require_admin

router = APIRouter()

@router.get("/support", response_model=dict)
async def get_support_settings(current_user: dict = Depends(get_current_user)):
    """Get support settings (WhatsApp number, etc.)"""
    db = await get_db()
    
    settings = await db.settings.find_one({"type": "support"})
    if not settings:
        return {
            "whatsapp_number": "+1234567890",
            "support_email": "support@dsgtransport.com",
            "business_hours": "Mon-Fri 9AM-6PM EST"
        }
    
    return {
        "whatsapp_number": settings.get("whatsapp_number", "+1234567890"),
        "support_email": settings.get("support_email", "support@dsgtransport.com"),
        "business_hours": settings.get("business_hours", "Mon-Fri 9AM-6PM EST")
    }

@router.put("/support", response_model=dict)
async def update_support_settings(settings_data: SupportSettingsUpdate, current_user: dict = Depends(require_admin)):
    """Update support settings (admin only)"""
    db = await get_db()
    
    update_data = {}
    if settings_data.whatsapp_number is not None:
        update_data["whatsapp_number"] = settings_data.whatsapp_number
    if settings_data.support_email is not None:
        update_data["support_email"] = settings_data.support_email
    if settings_data.business_hours is not None:
        update_data["business_hours"] = settings_data.business_hours
    
    if update_data:
        await db.settings.update_one(
            {"type": "support"},
            {"$set": update_data},
            upsert=True
        )
    
    settings = await db.settings.find_one({"type": "support"})
    return {
        "whatsapp_number": settings.get("whatsapp_number", "+1234567890"),
        "support_email": settings.get("support_email", "support@dsgtransport.com"),
        "business_hours": settings.get("business_hours", "Mon-Fri 9AM-6PM EST")
    }
