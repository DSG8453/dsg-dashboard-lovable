from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db
from routes.auth import require_admin

router = APIRouter()
ZOHO_DEPARTMENT_ID = "2775667000000022001"


async def get_zoho_token():
    import httpx
    import os
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://accounts.zoho.com/oauth/v2/token",
            params={
                "refresh_token": os.getenv("ZOHO_REFRESH_TOKEN"),
                "client_id": os.getenv("ZOHO_CLIENT_ID"),
                "client_secret": os.getenv("ZOHO_CLIENT_SECRET"),
                "grant_type": "refresh_token"
            }
        )
    return response.json().get("access_token")


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


@router.get("/launch/{user_email}", response_model=dict)
async def launch_device(user_email: str, current_user: dict = Depends(require_admin)):
    """Create a Zoho Assist session for the assigned device."""
    db = await get_db()
    normalized_email = user_email.strip().lower()

    if not normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email is required",
        )

    assignment = await db.zoho_devices.find_one({"user_email": normalized_email})
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Zoho device assignment found for {normalized_email}",
        )

    computer_id = str(assignment.get("computer_id", "")).strip()
    if not computer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zoho device assignment for {normalized_email} is missing a computer ID",
        )

    access_token = await get_zoho_token()
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Zoho Assist access token is not configured",
        )

    launch_url = f"https://assist.zoho.com/api/v2/unattended/{computer_id}/connect"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                launch_url,
                params={"department_id": ZOHO_DEPARTMENT_ID},
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to contact Zoho Assist: {exc}",
        ) from exc

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if response.status_code >= 400:
        detail = (
            payload.get("message")
            or payload.get("error_description")
            or payload.get("error")
            or response.text
            or "Zoho Assist session creation failed"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )

    session_url = (
        payload.get("technician_uri")
        or payload.get("session_url")
        or payload.get("representation", {}).get("technician_uri")
    )
    if not session_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoho Assist response did not include technician_uri",
        )

    return {
        "user_email": normalized_email,
        "computer_id": computer_id,
        "session_url": session_url,
    }
