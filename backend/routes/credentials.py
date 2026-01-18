from fastapi import APIRouter, Depends, HTTPException, status
from models.schemas import CredentialCreate, CredentialUpdate, CredentialResponse
from utils.security import encrypt_credential, decrypt_credential
from database import get_db
from routes.auth import get_current_user
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/tool/{tool_id}", response_model=List[dict])
async def get_tool_credentials(tool_id: str, current_user: dict = Depends(get_current_user)):
    """Get all credentials for a tool (current user only)"""
    db = await get_db()
    
    credentials = []
    async for cred in db.credentials.find({
        "user_id": current_user["id"],
        "tool_id": tool_id
    }).limit(100):
        credentials.append({
            "id": str(cred["_id"]),
            "tool_id": cred["tool_id"],
            "label": cred["label"],
            "username": cred["username"],
            # Password NOT included by default
            "created_at": cred.get("created_at", ""),
            "updated_at": cred.get("updated_at", "")
        })
    
    return credentials

@router.get("/{credential_id}/reveal")
async def reveal_credential_password(credential_id: str, current_user: dict = Depends(get_current_user)):
    """Reveal decrypted password for a credential (owner only)"""
    db = await get_db()
    
    cred = await db.credentials.find_one({"_id": ObjectId(credential_id)})
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    # Only owner can reveal password
    if cred["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Decrypt and return password
    decrypted_password = decrypt_credential(cred["encrypted_password"])
    
    return {
        "id": str(cred["_id"]),
        "password": decrypted_password
    }

@router.post("", response_model=dict)
async def create_credential(cred_data: CredentialCreate, current_user: dict = Depends(get_current_user)):
    """Create a new credential (encrypted)"""
    db = await get_db()
    
    # Verify tool exists
    tool = await db.tools.find_one({"_id": ObjectId(cred_data.tool_id)})
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    
    # Encrypt password
    encrypted_password = encrypt_credential(cred_data.password)
    
    now = datetime.utcnow().isoformat() + "Z"
    new_cred = {
        "user_id": current_user["id"],
        "tool_id": cred_data.tool_id,
        "label": cred_data.label,
        "username": cred_data.username,
        "encrypted_password": encrypted_password,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.credentials.insert_one(new_cred)
    
    return {
        "id": str(result.inserted_id),
        "tool_id": cred_data.tool_id,
        "label": cred_data.label,
        "username": cred_data.username,
        "created_at": now,
        "updated_at": now
    }

@router.put("/{credential_id}", response_model=dict)
async def update_credential(credential_id: str, cred_data: CredentialUpdate, current_user: dict = Depends(get_current_user)):
    """Update a credential (owner only)"""
    db = await get_db()
    
    cred = await db.credentials.find_one({"_id": ObjectId(credential_id)})
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    # Only owner can update
    if cred["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    update_data = {"updated_at": datetime.utcnow().isoformat() + "Z"}
    
    if cred_data.label is not None:
        update_data["label"] = cred_data.label
    if cred_data.username is not None:
        update_data["username"] = cred_data.username
    if cred_data.password is not None:
        update_data["encrypted_password"] = encrypt_credential(cred_data.password)
    
    await db.credentials.update_one(
        {"_id": ObjectId(credential_id)},
        {"$set": update_data}
    )
    
    cred = await db.credentials.find_one({"_id": ObjectId(credential_id)})
    return {
        "id": str(cred["_id"]),
        "tool_id": cred["tool_id"],
        "label": cred["label"],
        "username": cred["username"],
        "created_at": cred.get("created_at", ""),
        "updated_at": cred.get("updated_at", "")
    }

@router.delete("/{credential_id}")
async def delete_credential(credential_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a credential (owner only)"""
    db = await get_db()
    
    cred = await db.credentials.find_one({"_id": ObjectId(credential_id)})
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credential not found"
        )
    
    # Only owner can delete
    if cred["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.credentials.delete_one({"_id": ObjectId(credential_id)})
    
    return {"message": "Credential deleted successfully"}
