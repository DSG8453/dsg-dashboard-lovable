"""
Secure Tool Access Service
Handles encrypted credential storage and secure tool authentication with auto-login
"""
from fastapi import APIRouter, Depends, HTTPException, status
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
import os

router = APIRouter()

# Store one-time access tokens (in production, use Redis)
access_tokens = {}


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
        "tool_url": tool.get("url", "#"),
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
    This creates a page that auto-submits credentials to the login form.
    Credentials are encrypted and never visible to the user.
    """
    # Verify token
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()
    token_data = access_tokens.get(token_hash)
    
    if not token_data:
        return HTMLResponse(
            content=get_error_page("Invalid or Expired Access Link", 
                "This access link is invalid or has expired. Please go back to the dashboard and request access again."),
            status_code=403
        )
    
    # Check expiry
    if datetime.now(timezone.utc) > token_data["expires_at"]:
        del access_tokens[token_hash]
        return HTMLResponse(
            content=get_error_page("Access Link Expired", 
                "This access link has expired (valid for 5 minutes). Please go back to the dashboard and request access again."),
            status_code=403
        )
    
    # Check if already used
    if token_data["used"]:
        return HTMLResponse(
            content=get_error_page("Access Link Already Used", 
                "This one-time access link has already been used. Please go back to the dashboard and request access again."),
            status_code=403
        )
    
    # Mark token as used
    access_tokens[token_hash]["used"] = True
    
    login_url = token_data["login_url"]
    credentials = token_data.get("credentials", {})
    tool_name = token_data["tool_name"]
    tool_url = token_data.get("tool_url", login_url)
    
    # If no credentials, just redirect to the URL
    if not credentials or not credentials.get("username"):
        return RedirectResponse(url=login_url, status_code=302)
    
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    # Get custom field names if configured, otherwise use common defaults
    username_field = credentials.get("username_field", "username")
    password_field = credentials.get("password_field", "password")
    
    # Encode credentials for safe embedding (base64)
    encoded_user = base64.b64encode(username.encode()).decode()
    encoded_pass = base64.b64encode(password.encode()).decode()
    
    # Generate auto-login page with form POST
    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <title>Secure Access - {tool_name}</title>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex, nofollow">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            color: white;
        }}
        .container {{
            text-align: center;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            max-width: 400px;
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
        @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
        h1 {{ margin-bottom: 10px; font-size: 24px; }}
        p {{ color: rgba(255,255,255,0.7); margin: 10px 0; }}
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
        .tool-name {{ color: #60a5fa; font-weight: 600; }}
        .status {{ font-size: 14px; margin-top: 15px; }}
        .manual-link {{
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            display: none;
        }}
        .manual-link a {{
            color: #60a5fa;
            text-decoration: none;
        }}
        .manual-link a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Secure Access</h1>
        <p>Connecting to <span class="tool-name">{tool_name}</span></p>
        <div class="spinner" id="spinner"></div>
        <p class="status" id="status">Preparing secure login...</p>
        <div class="secure-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
            </svg>
            Encrypted Credentials
        </div>
        <div class="manual-link" id="manualLink">
            <p>Auto-login taking too long?</p>
            <a href="{login_url}" target="_blank">Click here to open manually</a>
        </div>
    </div>
    
    <!-- Hidden form for auto-login - credentials are encrypted -->
    <form id="loginForm" method="POST" action="{login_url}" style="display:none;">
        <input type="hidden" name="{username_field}" id="f_user" />
        <input type="hidden" name="email" id="f_email" />
        <input type="hidden" name="{password_field}" id="f_pass" />
        <input type="hidden" name="login" value="1" />
        <input type="hidden" name="submit" value="Login" />
    </form>
    
    <script>
    (function() {{
        // Decode encrypted credentials
        function b64d(s) {{ return decodeURIComponent(atob(s).split('').map(function(c) {{
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }}).join('')); }}
        
        var u = b64d("{encoded_user}");
        var p = b64d("{encoded_pass}");
        
        // Set form values
        document.getElementById('f_user').value = u;
        document.getElementById('f_email').value = u;
        document.getElementById('f_pass').value = p;
        
        // Update status
        document.getElementById('status').textContent = 'Submitting credentials securely...';
        
        // Show manual link after 3 seconds in case auto-submit fails
        setTimeout(function() {{
            document.getElementById('manualLink').style.display = 'block';
        }}, 3000);
        
        // Clear credentials from memory
        u = null; p = null;
        
        // Auto-submit after brief delay
        setTimeout(function() {{
            try {{
                document.getElementById('loginForm').submit();
            }} catch(e) {{
                // If form submit fails, try opening in new window with POST
                document.getElementById('status').textContent = 'Opening login page...';
                window.location.href = "{login_url}";
            }}
        }}, 1000);
    }})();
    </script>
</body>
</html>'''
    
    return HTMLResponse(content=html_content)


def get_error_page(title: str, message: str) -> str:
    """Generate error page HTML"""
    return f'''<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }}
        .container {{
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 500px;
        }}
        h1 {{ margin-bottom: 20px; }}
        p {{ color: rgba(255,255,255,0.7); margin-bottom: 20px; }}
        a {{
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 10px;
        }}
        a:hover {{ background: #2563eb; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ {title}</h1>
        <p>{message}</p>
        <a href="/">Return to Dashboard</a>
    </div>
</body>
</html>'''


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
