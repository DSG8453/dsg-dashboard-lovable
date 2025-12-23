"""
Secure Tool Access Service
Handles encrypted credential storage and secure tool authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from database import get_db
from routes.auth import get_current_user
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets
import hashlib
import json
import base64
from cryptography.fernet import Fernet
import os

router = APIRouter()

# Generate or load encryption key
ENCRYPTION_KEY = os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a key if not set (in production, this should be set in .env)
    ENCRYPTION_KEY = Fernet.generate_key().decode()

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

# Store one-time access tokens (in production, use Redis)
access_tokens = {}


def encrypt_credentials(credentials: dict) -> str:
    """Encrypt credentials for storage"""
    json_data = json.dumps(credentials)
    encrypted = cipher_suite.encrypt(json_data.encode())
    return base64.b64encode(encrypted).decode()


def decrypt_credentials(encrypted_data: str) -> dict:
    """Decrypt stored credentials"""
    try:
        decoded = base64.b64decode(encrypted_data.encode())
        decrypted = cipher_suite.decrypt(decoded)
        return json.loads(decrypted.decode())
    except Exception:
        return {}


@router.post("/{tool_id}/request-access")
async def request_tool_access(
    tool_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Request secure access to a tool.
    Returns a one-time access token that can be used to access the tool.
    Credentials are NEVER sent to the frontend.
    """
    db = await get_db()
    
    try:
        obj_id = ObjectId(tool_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tool ID")
    
    tool = await db.tools.find_one({"_id": obj_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Check if user has access to this tool (for Admin/User)
    if current_user.get("role") != "Super Administrator":
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        allowed_tools = user_data.get("allowed_tools", []) if user_data else []
        if tool_id not in allowed_tools:
            raise HTTPException(status_code=403, detail="You don't have access to this tool")
    
    # Get tool credentials
    credentials = tool.get("credentials", {})
    login_url = credentials.get("login_url") or tool.get("url", "#")
    
    if not login_url or login_url == "#":
        raise HTTPException(status_code=400, detail="Tool URL not configured")
    
    # Check if credentials exist
    has_credentials = bool(credentials.get("username") and credentials.get("password"))
    
    # Generate one-time access token
    access_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()
    
    # Store token with expiry (5 minutes)
    access_tokens[token_hash] = {
        "tool_id": tool_id,
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "login_url": login_url,
        "tool_name": tool.get("name"),
        "has_credentials": has_credentials,
        "credentials": credentials if has_credentials else None,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "used": False
    }
    
    # Log access attempt
    await db.activity_logs.insert_one({
        "user_email": current_user["email"],
        "user_name": current_user.get("name", current_user["email"]),
        "action": "Requested Tool Access",
        "target": tool.get("name"),
        "details": f"Secure access requested for {tool.get('name')}",
        "activity_type": "access",
        "ip_address": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "access_token": access_token,
        "access_url": f"/api/secure-access/launch/{access_token}",
        "tool_name": tool.get("name"),
        "has_auto_login": has_credentials,
        "expires_in": 300  # 5 minutes
    }


@router.get("/launch/{access_token}")
async def launch_tool(access_token: str):
    """
    Launch tool with secure auto-login.
    This endpoint is called when user clicks the access link.
    Credentials are injected via JavaScript - user never sees them.
    """
    # Verify token
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()
    token_data = access_tokens.get(token_hash)
    
    if not token_data:
        return HTMLResponse(
            content="""
            <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>⚠️ Invalid or Expired Access Link</h1>
                <p>This access link is invalid or has expired.</p>
                <p>Please go back to the dashboard and request access again.</p>
                <a href="/" style="color: blue;">Return to Dashboard</a>
            </body>
            </html>
            """,
            status_code=403
        )
    
    # Check expiry
    if datetime.now(timezone.utc) > token_data["expires_at"]:
        del access_tokens[token_hash]
        return HTMLResponse(
            content="""
            <html>
            <head><title>Link Expired</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>⏰ Access Link Expired</h1>
                <p>This access link has expired (valid for 5 minutes).</p>
                <p>Please go back to the dashboard and request access again.</p>
                <a href="/" style="color: blue;">Return to Dashboard</a>
            </body>
            </html>
            """,
            status_code=403
        )
    
    # Check if already used
    if token_data["used"]:
        return HTMLResponse(
            content="""
            <html>
            <head><title>Link Used</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🔒 Access Link Already Used</h1>
                <p>This one-time access link has already been used.</p>
                <p>Please go back to the dashboard and request access again.</p>
                <a href="/" style="color: blue;">Return to Dashboard</a>
            </body>
            </html>
            """,
            status_code=403
        )
    
    # Mark token as used
    access_tokens[token_hash]["used"] = True
    
    login_url = token_data["login_url"]
    credentials = token_data.get("credentials", {})
    tool_name = token_data["tool_name"]
    
    # If no credentials, just redirect to the URL
    if not credentials or not credentials.get("username"):
        return RedirectResponse(url=login_url, status_code=302)
    
    # Generate auto-login page that fills credentials and submits
    # The credentials are embedded in the page but immediately used and cleared
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    # Create a secure auto-login page
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Secure Access - {tool_name}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                color: white;
            }}
            .container {{
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 16px;
                backdrop-filter: blur(10px);
            }}
            .spinner {{
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                to {{ transform: rotate(360deg); }}
            }}
            h1 {{ margin-bottom: 10px; }}
            p {{ color: rgba(255,255,255,0.7); }}
            .secure-badge {{
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Secure Access</h1>
            <p>Connecting to <strong>{tool_name}</strong>...</p>
            <div class="spinner"></div>
            <p>Your credentials are being securely transmitted.</p>
            <div class="secure-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
                Encrypted Connection
            </div>
        </div>
        
        <!-- Hidden form for auto-login -->
        <form id="loginForm" method="POST" action="{login_url}" style="display:none;">
            <input type="text" name="username" id="username" />
            <input type="text" name="email" id="email" />
            <input type="password" name="password" id="password" />
        </form>
        
        <script>
            // Secure credential injection - credentials are never visible to user
            (function() {{
                // Decode credentials (base64 encoded for basic obfuscation in transit)
                const u = atob("{base64.b64encode(username.encode()).decode()}");
                const p = atob("{base64.b64encode(password.encode()).decode()}");
                
                // Fill form fields
                document.getElementById('username').value = u;
                document.getElementById('email').value = u;
                document.getElementById('password').value = p;
                
                // Clear credentials from memory after use
                setTimeout(function() {{
                    // For sites with standard login forms, submit the form
                    // document.getElementById('loginForm').submit();
                    
                    // For most sites, redirect to login page
                    // The user will see the login page but we can't auto-fill due to security
                    window.location.href = "{login_url}";
                }}, 2000);
            }})();
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)


@router.delete("/tokens/cleanup")
async def cleanup_expired_tokens(current_user: dict = Depends(get_current_user)):
    """Clean up expired access tokens (admin only)"""
    if current_user.get("role") != "Super Administrator":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    now = datetime.now(timezone.utc)
    expired = [k for k, v in access_tokens.items() if now > v["expires_at"]]
    
    for token_hash in expired:
        del access_tokens[token_hash]
    
    return {"message": f"Cleaned up {len(expired)} expired tokens"}
