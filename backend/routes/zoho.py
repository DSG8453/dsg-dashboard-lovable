from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db
from routes.auth import get_current_user, require_admin

router = APIRouter()
ZOHO_DEPARTMENT_ID = "2775667000000022001"
ZOHO_TOOL_BASE_URL = "https://dsg-backend-564085662748.us-central1.run.app/api/zoho/launch"


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
        "user_name": assignment.get("user_name") or "",
        "computer_id": assignment.get("computer_id", ""),
        "device_name": assignment.get("device_name", ""),
        "created_at": assignment.get("created_at"),
        "updated_at": assignment.get("updated_at"),
        "updated_by": assignment.get("updated_by"),
    }


def _build_zoho_tool_url(user_email: str) -> str:
    return f"{ZOHO_TOOL_BASE_URL}/{user_email}"


def _build_zoho_tool_name(device_name: str, user_name: str = "") -> str:
    if user_name:
        return f"Zoho - {user_name} - {device_name}"
    return f"Zoho - {device_name}"


async def _sync_zoho_tool_for_user(
    db,
    user_email: str,
    computer_id: str,
    device_name: str,
    user_name: str = "",
) -> str:
    tool_data = {
        "name": _build_zoho_tool_name(device_name, user_name),
        "category": "Remote Access",
        "description": "Direct Zoho access",
        "url": f"{_build_zoho_tool_url(user_email)}?computer_id={computer_id}",
        "icon": "Globe",
        "zoho_auto": True,
        "zoho_device_email": user_email,
        "zoho_computer_id": computer_id,
    }

    existing_tool = await db.tools.find_one({
        "zoho_auto": True,
        "zoho_device_email": user_email,
        "zoho_computer_id": computer_id,
    })

    if existing_tool:
        await db.tools.update_one(
            {"_id": existing_tool["_id"]},
            {"$set": tool_data},
        )
        return str(existing_tool["_id"])

    result = await db.tools.insert_one(tool_data)
    return str(result.inserted_id)


@router.get("/devices", response_model=dict)
async def get_devices(current_user: dict = Depends(require_admin)):
    """Return every Zoho device assignment row without deduplicating by email."""
    db = await get_db()

    assignments = []
    async for assignment in db.zoho_devices.find().sort([
        ("user_email", 1),
        ("computer_id", 1),
        ("created_at", 1),
    ]):
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
    user_name: str = Query(None),
    current_user: dict = Depends(require_admin),
):
    """Create or update a Zoho device assignment."""
    db = await get_db()

    normalized_email = user_email.strip().lower()
    normalized_computer_id = computer_id.strip()
    normalized_device_name = device_name.strip()
    normalized_user_name = user_name.strip() if user_name and user_name.strip() else ""

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

    existing_assignment = await db.zoho_devices.find_one({
        "user_email": normalized_email,
        "computer_id": normalized_computer_id,
    })
    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This device is already assigned to this user",
        )

    now = datetime.now(timezone.utc).isoformat()
    assignment_data = {
        "user_email": normalized_email,
        "user_name": normalized_user_name,
        "computer_id": normalized_computer_id,
        "device_name": normalized_device_name,
        "updated_at": now,
        "updated_by": current_user["email"],
    }

    await db.zoho_devices.update_one(
        {
            "user_email": normalized_email,
            "computer_id": normalized_computer_id,
        },
        {
            "$set": assignment_data,
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    assignment = await db.zoho_devices.find_one({
        "user_email": normalized_email,
        "computer_id": normalized_computer_id,
    })
    tool_id = await _sync_zoho_tool_for_user(
        db,
        normalized_email,
        normalized_computer_id,
        normalized_device_name,
        normalized_user_name,
    )

    user = await db.users.find_one({"email": normalized_email})
    if user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$addToSet": {"allowed_tools": tool_id}},
        )

    return {
        "message": "Zoho device assignment saved successfully",
        "device": _serialize_assignment(assignment),
    }


@router.delete("/devices/{user_email}/{computer_id}", response_model=dict)
async def delete_device(
    user_email: str,
    computer_id: str,
    current_user: dict = Depends(require_admin),
):
    """Delete a Zoho device assignment and related auto-created tool access."""
    db = await get_db()
    normalized_email = user_email.strip().lower()
    normalized_computer_id = computer_id.strip()

    if not normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email is required",
        )
    if not normalized_computer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Computer ID is required",
        )

    tool = await db.tools.find_one({
        "zoho_auto": True,
        "zoho_device_email": normalized_email,
        "zoho_computer_id": normalized_computer_id,
    })
    tool_id = str(tool["_id"]) if tool else None
    user = await db.users.find_one({"email": normalized_email})
    if user and tool_id:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$pull": {"allowed_tools": tool_id}},
        )

    if tool:
        await db.tools.delete_one({"_id": tool["_id"]})

    assignment_result = await db.zoho_devices.delete_one({
        "user_email": normalized_email,
        "computer_id": normalized_computer_id,
    })
    if assignment_result.deleted_count == 0 and not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Zoho device assignment found for {normalized_email} and {normalized_computer_id}",
        )

    return {
        "message": f"Zoho device assignment deleted for {normalized_email} and {normalized_computer_id}",
    }


@router.get("/launch/{user_email}", response_model=dict)
async def launch_device(
    user_email: str,
    computer_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Create a Zoho Assist session for the assigned device."""
    db = await get_db()
    normalized_email = user_email.strip().lower()
    normalized_computer_id = computer_id.strip() if computer_id else ""

    if not normalized_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email is required",
        )

    user_role = current_user.get("role")
    current_user_email = (current_user.get("email") or "").strip().lower()
    is_admin = user_role in {"Administrator", "Super Administrator"}
    if not is_admin and current_user_email != normalized_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    assignment_filter = {"user_email": normalized_email}
    if normalized_computer_id:
        assignment_filter["computer_id"] = normalized_computer_id

    assignment = await db.zoho_devices.find_one(
        assignment_filter,
        sort=[("updated_at", -1), ("created_at", -1)],
    )
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

    print("ZOHO RESPONSE:", payload)

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
        payload.get("representation", {}).get("connect_uri")
        or payload.get("connect_uri")
        or payload.get("technician_uri")
        or payload.get("session_url")
        or payload.get("representation", {}).get("technician_uri")
    )
    if not session_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoho Assist response did not include technician_uri",
        )

    if isinstance(session_url, str) and session_url.startswith("/"):
        session_url = f"https://assist.zoho.com{session_url}"

    return {
        "user_email": normalized_email,
        "computer_id": computer_id,
        "session_url": session_url,
    }
