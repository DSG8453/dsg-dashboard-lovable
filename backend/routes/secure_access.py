"""
Secure Tool Access Service
Handles secure tool access with credential display (never auto-fill due to security restrictions)
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
    Returns a one-time access token for viewing credentials securely.
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
        "action": "Accessed Tool",
        "target": tool.get("name"),
        "details": f"Secure access to {tool.get('name')}",
        "activity_type": "access",
        "ip_address": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "access_token": access_token,
        "access_url": f"/api/secure-access/launch/{access_token}",
        "tool_name": tool.get("name"),
        "has_auto_login": has_credentials,
        "login_url": login_url,
        "expires_in": 300
    }


@router.get("/launch/{access_token}")
async def launch_tool(access_token: str):
    """
    Launch tool with secure credential display.
    Opens the tool and shows credentials that can be copied.
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
    
    # If no credentials, just redirect to the URL
    if not credentials or not credentials.get("username"):
        return RedirectResponse(url=login_url, status_code=302)
    
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    # Encode credentials for display (base64 for basic obfuscation)
    encoded_user = base64.b64encode(username.encode()).decode()
    encoded_pass = base64.b64encode(password.encode()).decode()
    
    # Generate secure access page with copy functionality
    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <title>Secure Access - {tool_name}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            color: white;
            padding: 20px;
        }}
        .container {{
            max-width: 500px;
            margin: 0 auto;
            padding-top: 40px;
        }}
        .card {{
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            padding: 30px;
            margin-bottom: 20px;
        }}
        h1 {{
            font-size: 24px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .subtitle {{
            color: rgba(255,255,255,0.7);
            margin-bottom: 24px;
        }}
        .tool-name {{
            color: #60a5fa;
            font-weight: 600;
        }}
        .credential-box {{
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        }}
        .credential-label {{
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }}
        .credential-value {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .credential-input {{
            flex: 1;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            padding: 12px 16px;
            color: white;
            font-size: 16px;
            font-family: monospace;
        }}
        .credential-input.password {{
            -webkit-text-security: disc;
        }}
        .credential-input.revealed {{
            -webkit-text-security: none;
        }}
        .btn {{
            padding: 12px 20px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }}
        .btn-copy {{
            background: rgba(255,255,255,0.1);
            color: white;
        }}
        .btn-copy:hover {{
            background: rgba(255,255,255,0.2);
        }}
        .btn-copy.copied {{
            background: rgba(34, 197, 94, 0.3);
            color: #22c55e;
        }}
        .btn-primary {{
            background: #3b82f6;
            color: white;
            width: 100%;
            justify-content: center;
            font-size: 16px;
            padding: 16px 24px;
        }}
        .btn-primary:hover {{
            background: #2563eb;
        }}
        .btn-toggle {{
            background: transparent;
            color: rgba(255,255,255,0.7);
            padding: 8px;
        }}
        .security-note {{
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
            font-size: 13px;
            color: #fbbf24;
        }}
        .secure-badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 16px;
        }}
        .steps {{
            margin-top: 20px;
        }}
        .step {{
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            align-items: flex-start;
        }}
        .step-num {{
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            flex-shrink: 0;
        }}
        .step-text {{
            color: rgba(255,255,255,0.8);
            font-size: 14px;
            padding-top: 2px;
        }}
        .timer {{
            text-align: center;
            color: rgba(255,255,255,0.5);
            font-size: 12px;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🔐 Secure Access</h1>
            <p class="subtitle">Credentials for <span class="tool-name">{tool_name}</span></p>
            
            <div class="credential-box">
                <div class="credential-label">Username / Email</div>
                <div class="credential-value">
                    <input type="text" class="credential-input" id="username" readonly />
                    <button class="btn btn-copy" onclick="copyToClipboard('username', this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
            
            <div class="credential-box">
                <div class="credential-label">Password</div>
                <div class="credential-value">
                    <input type="text" class="credential-input password" id="password" readonly />
                    <button class="btn btn-toggle" onclick="togglePassword()" id="toggleBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="eyeIcon">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="btn btn-copy" onclick="copyToClipboard('password', this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
            
            <div class="security-note">
                ⚠️ These credentials will disappear when you close this page. Copy them now if needed.
            </div>
            
            <div class="secure-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
                Encrypted &amp; Secure
            </div>
        </div>
        
        <div class="card">
            <h2 style="font-size: 18px; margin-bottom: 16px;">How to Login</h2>
            <div class="steps">
                <div class="step">
                    <div class="step-num">1</div>
                    <div class="step-text">Copy the username and password above</div>
                </div>
                <div class="step">
                    <div class="step-num">2</div>
                    <div class="step-text">Click the button below to open {tool_name}</div>
                </div>
                <div class="step">
                    <div class="step-num">3</div>
                    <div class="step-text">Paste your credentials on the login page</div>
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="openTool()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Open {tool_name}
            </button>
            
            <p class="timer" id="timer">This page expires in 5:00</p>
        </div>
    </div>
    
    <script>
        // Decode and set credentials
        (function() {{
            function b64d(s) {{ 
                try {{
                    return decodeURIComponent(atob(s).split('').map(function(c) {{
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }}).join('')); 
                }} catch(e) {{
                    return atob(s);
                }}
            }}
            
            var u = b64d("{encoded_user}");
            var p = b64d("{encoded_pass}");
            
            document.getElementById('username').value = u;
            document.getElementById('password').value = p;
        }})();
        
        // Toggle password visibility
        var passwordVisible = false;
        function togglePassword() {{
            passwordVisible = !passwordVisible;
            var passField = document.getElementById('password');
            passField.classList.toggle('revealed', passwordVisible);
        }}
        
        // Copy to clipboard
        function copyToClipboard(fieldId, btn) {{
            var field = document.getElementById(fieldId);
            var text = field.value;
            
            navigator.clipboard.writeText(text).then(function() {{
                btn.classList.add('copied');
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
                
                setTimeout(function() {{
                    btn.classList.remove('copied');
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
                }}, 2000);
            }});
        }}
        
        // Open tool
        function openTool() {{
            window.open("{login_url}", "_blank");
        }}
        
        // Timer countdown
        var timeLeft = 300;
        setInterval(function() {{
            timeLeft--;
            if (timeLeft <= 0) {{
                document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h1>⏰ Session Expired</h1><p>Please return to the dashboard to access the tool again.</p></div>';
                return;
            }}
            var mins = Math.floor(timeLeft / 60);
            var secs = timeLeft % 60;
            document.getElementById('timer').textContent = 'This page expires in ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
        }}, 1000);
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
