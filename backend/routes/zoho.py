from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db
from routes.auth import require_admin

router = APIRouter()


def _serialize_assignment(assignment: dict) -> dict:
    return {
        "user_email": assignment.get("user_email", ""),
        "computer_id": assignment.get("computer_id", ""),
        "device_name": assignment.get("device_name", ""),
        "created_at": assignment.get("created_at"),
        "updated_at": assignment.get("updated_at"),
        "updated_by": assignment.get("updated_by"),
    }


@router.get("/devices", response_model=dict)
async def get_devices(current_user: dict = Depends(require_admin)):
    """Return all Zoho device assignments."""
    db = await get_db()

    assignments = []
    async for assignment in db.zoho_devices.find().sort("user_email", 1):
        assignments.append(_serialize_assignment(assignment))

    return {
        "devices": assignments,
        "count": len(assignments),
    }


@router.post("/devices", response_model=dict)
async def add_device(
    user_email: str = Query(...),
    computer_id: str = Query(...),
    device_name: str = Query(...),
    current_user: dict = Depends(require_admin),
):
    """Create or update a Zoho device assignment."""
    db = await get_db()

    normalized_email = user_email.strip().lower()
    normalized_computer_id = computer_id.strip()
    normalized_device_name = device_name.strip()

    if not normalized_email or "@" not in normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid user email is required",
        )

    if not normalized_computer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Computer ID is required",
        )

    if not normalized_device_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device name is required",
        )

    now = datetime.now(timezone.utc).isoformat()
    assignment_data = {
        "user_email": normalized_email,
        "computer_id": normalized_computer_id,
        "device_name": normalized_device_name,
        "updated_at": now,
        "updated_by": current_user["email"],
    }

    # Save the assignment directly without requiring a matching dashboard user.
    await db.zoho_devices.update_one(
        {"user_email": normalized_email},
        {
            "$set": assignment_data,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    assignment = await db.zoho_devices.find_one({"user_email": normalized_email})

    return {
        "message": "Zoho device assignment saved successfully",
        "device": _serialize_assignment(assignment),
    }
