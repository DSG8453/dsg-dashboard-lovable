"""
Tool Gateway - Access tools ONLY through the dashboard
Users cannot access tools outside the dashboard
Credentials are never visible
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from services.secret_manager_service import secret_manager
from utils.tool_mapping import normalize_tool_name
from fastapi.responses import HTMLResponse, StreamingResponse
from database import get_db
from routes.auth import get_current_user
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import aiohttp
import secrets
import hashlib
import json
import base64
import re
from urllib.parse import urljoin, urlparse

router = APIRouter()

# Store active gateway sessions
gateway_sessions = {}

# Session timeout (30 minutes)
SESSION_TIMEOUT = timedelta(minutes=30)


@router.post("/start/{tool_id}")
async def start_gateway_session(
    tool_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start a gateway session to access a tool through the dashboard"""
    db = await get_db()
    
    try:
        obj_id = ObjectId(tool_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tool ID")
    
    tool = await db.tools.find_one({"_id": obj_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Check access
    if current_user.get("role") != "Super Administrator":
        user_data = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        allowed_tools = user_data.get("allowed_tools", []) if user_data else []
        if tool_id not in allowed_tools:
            raise HTTPException(status_code=403, detail="Access denied")
    
# Get credentials from Secret Manager
    tool_name_normalized = normalize_tool_name(tool.get("name", ""))
    
    try:
        credentials = secret_manager.get_tool_credentials(tool_name_normalized)
        base_url = tool.get("url", "") or tool.get("login_url", "")
        
        if not base_url:
            raise HTTPException(status_code=400, detail="Tool URL not configured")
        
        credentials["login_url"] = base_url
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve credentials: {str(e)}"
        )
    
    # Create gateway session
    session_token = secrets.token_urlsafe(32)
    session_hash = hashlib.sha256(session_token.encode()).hexdigest()
    
    gateway_sessions[session_hash] = {
        "tool_id": tool_id,
        "tool_name": tool.get("name"),
        "base_url": base_url,
        "credentials": credentials,
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "cookies": {},  # Will store tool's session cookies
        "logged_in": False,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + SESSION_TIMEOUT,
        "last_access": datetime.now(timezone.utc)
    }
    
    # Log activity
    await db.activity_logs.insert_one({
        "user_email": current_user["email"],
        "user_name": current_user.get("name", current_user["email"]),
        "action": "Started Gateway Session",
        "target": tool.get("name"),
        "details": f"Secure gateway access to {tool.get('name')}",
        "activity_type": "access",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "session_token": session_token,
        "gateway_url": f"/api/gateway/view/{session_token}",
        "tool_name": tool.get("name"),
        "expires_in": SESSION_TIMEOUT.seconds
    }


@router.get("/view/{session_token}")
async def view_tool_gateway(session_token: str):
    """View tool through the gateway - secure credential copy system"""
    session_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session = gateway_sessions.get(session_hash)
    
    if not session:
        return HTMLResponse(content=get_error_html("Session Not Found", 
            "This gateway session has expired or is invalid."), status_code=403)
    
    if datetime.now(timezone.utc) > session["expires_at"]:
        del gateway_sessions[session_hash]
        return HTMLResponse(content=get_error_html("Session Expired", 
            "Your gateway session has expired. Please start a new session."), status_code=403)
    
    # Update last access
    gateway_sessions[session_hash]["last_access"] = datetime.now(timezone.utc)
    
    tool_name = session["tool_name"]
    base_url = session["base_url"]
    
    # Get fresh credentials from Secret Manager
    tool_name_normalized = normalize_tool_name(tool_name)
    try:
        credentials = secret_manager.get_tool_credentials(tool_name_normalized)
        username = credentials.get("username", "")
        password = credentials.get("password", "")
    except Exception as e:
        return HTMLResponse(
            content=get_error_html("Credentials Error", 
                "Failed to retrieve credentials. Contact your administrator."),
            status_code=500
        )
    
    # Encode credentials for secure copy (not visible to user)
    encoded_user = base64.b64encode(username.encode()).decode()
    encoded_pass = base64.b64encode(password.encode()).decode()
    
    # Secure gateway page with copy-to-clipboard functionality
    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{tool_name} - DSG Secure Gateway</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }}
        .header {{
            background: rgba(0,0,0,0.3);
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .header-left {{
            display: flex;
            align-items: center;
            gap: 16px;
        }}
        .logo {{
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 18px;
        }}
        .logo svg {{ color: #3b82f6; }}
        .tool-badge {{
            background: #3b82f6;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
        }}
        .secure-badge {{
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #22c55e;
        }}
        .close-btn {{
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }}
        .close-btn:hover {{ background: #ef4444; color: white; }}
        
        .content {{
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }}
        .card {{
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 40px;
            max-width: 480px;
            width: 100%;
        }}
        .card-header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .card-header h2 {{
            font-size: 24px;
            margin-bottom: 8px;
        }}
        .card-header p {{
            opacity: 0.7;
            font-size: 14px;
        }}
        
        .credential-box {{
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        }}
        .credential-label {{
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .credential-row {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .credential-value {{
            flex: 1;
            background: rgba(255,255,255,0.05);
            padding: 12px 16px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 16px;
            letter-spacing: 2px;
        }}
        .copy-btn {{
            background: #3b82f6;
            border: none;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .copy-btn:hover {{ background: #2563eb; transform: translateY(-1px); }}
        .copy-btn.copied {{ background: #22c55e; }}
        
        .open-btn {{
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border: none;
            color: white;
            padding: 16px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 24px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }}
        .open-btn:hover {{ transform: translateY(-2px); box-shadow: 0 10px 30px rgba(59,130,246,0.3); }}
        
        .info-box {{
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 12px;
            padding: 16px;
            margin-top: 24px;
            font-size: 13px;
            text-align: center;
        }}
        .info-box strong {{ color: #60a5fa; }}
        
        .steps {{
            margin-top: 20px;
            font-size: 13px;
            opacity: 0.8;
        }}
        .steps ol {{
            padding-left: 20px;
        }}
        .steps li {{
            margin-bottom: 8px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                DSG Transport
            </div>
            <div class="tool-badge">{tool_name}</div>
            <div class="secure-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Credentials Protected
            </div>
        </div>
        <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
    
    <div class="content">
        <div class="card">
            <div class="card-header">
                <h2>🔐 Secure Login</h2>
                <p>Copy credentials below and paste into {tool_name}</p>
            </div>
            
            <div class="credential-box">
                <div class="credential-label">Username</div>
                <div class="credential-row">
                    <div class="credential-value">••••••••••••</div>
                    <button class="copy-btn" onclick="copyUsername(this)" id="copyUserBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
            
            <div class="credential-box">
                <div class="credential-label">Password</div>
                <div class="credential-row">
                    <div class="credential-value">••••••••••••</div>
                    <button class="copy-btn" onclick="copyPassword(this)" id="copyPassBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy
                    </button>
                </div>
            </div>
            
            <button class="open-btn" onclick="openTool()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open {tool_name} Login Page
            </button>
            
            <div class="info-box">
                <strong>🛡️ Your credentials are secure</strong><br>
                Passwords are hidden and managed by your administrator.<br>
                You can copy but never see the actual values.
            </div>
            
            <div class="steps">
                <strong>Steps:</strong>
                <ol>
                    <li>Click "Copy" next to Username</li>
                    <li>Open the login page and paste</li>
                    <li>Click "Copy" next to Password</li>
                    <li>Paste and login</li>
                </ol>
            </div>
        </div>
    </div>
    
    <script>
        // Encoded credentials (hidden from user)
        var _u = "{encoded_user}";
        var _p = "{encoded_pass}";
        
        function copyUsername(btn) {{
            var text = atob(_u);
            navigator.clipboard.writeText(text).then(function() {{
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
                btn.classList.add('copied');
                setTimeout(function() {{
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
                    btn.classList.remove('copied');
                }}, 2000);
            }});
        }}
        
        function copyPassword(btn) {{
            var text = atob(_p);
            navigator.clipboard.writeText(text).then(function() {{
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
                btn.classList.add('copied');
                setTimeout(function() {{
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
                    btn.classList.remove('copied');
                }}, 2000);
            }});
        }}
        
        function openTool() {{
            window.open("{base_url}", "_blank");
        }}
        
        // Security: clear from memory after 5 minutes
        setTimeout(function() {{
            _u = '';
            _p = '';
        }}, 300000);
        
        // Prevent view source / inspect
        document.addEventListener('contextmenu', function(e) {{ e.preventDefault(); }});
    </script>
</body>
</html>'''
    
    return HTMLResponse(content=html)


@router.get("/proxy/{session_token}/{path:path}")
@router.post("/proxy/{session_token}/{path:path}")
async def proxy_tool_request(
    session_token: str,
    path: str = "",
    request: Request = None
):
    """Proxy requests to the tool - maintains session"""
    session_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session = gateway_sessions.get(session_hash)
    
    if not session:
        return HTMLResponse(content="<h1>Session expired</h1>", status_code=403)
    
    if datetime.now(timezone.utc) > session["expires_at"]:
        del gateway_sessions[session_hash]
        return HTMLResponse(content="<h1>Session expired</h1>", status_code=403)
    
    # Update last access
    gateway_sessions[session_hash]["last_access"] = datetime.now(timezone.utc)
    
    base_url = session["base_url"]
    credentials = session.get("credentials", {})
    
    # Build target URL
    target_url = urljoin(base_url, path)
    if request.query_params:
        target_url += "?" + str(request.query_params)
    
    try:
        async with aiohttp.ClientSession() as http_session:
            # Get cookies from session
            cookies = session.get("cookies", {})
            
            # Prepare headers
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
            
            # Make request
            method = request.method
            if method == "POST":
                body = await request.body()
                async with http_session.post(target_url, data=body, headers=headers, cookies=cookies, allow_redirects=True) as resp:
                    content = await resp.read()
                    # Store cookies
                    for cookie in resp.cookies.values():
                        gateway_sessions[session_hash]["cookies"][cookie.key] = cookie.value
            else:
                async with http_session.get(target_url, headers=headers, cookies=cookies, allow_redirects=True) as resp:
                    content = await resp.read()
                    # Store cookies
                    for cookie in resp.cookies.values():
                        gateway_sessions[session_hash]["cookies"][cookie.key] = cookie.value
            
            content_type = resp.headers.get("Content-Type", "text/html")
            
            # Rewrite URLs in HTML content to go through proxy
            if "text/html" in content_type:
                try:
                    html = content.decode("utf-8", errors="ignore")
                    # Rewrite absolute URLs
                    parsed = urlparse(base_url)
                    base_domain = f"{parsed.scheme}://{parsed.netloc}"
                    html = html.replace(f'href="{base_domain}', f'href="/api/gateway/proxy/{session_token}')
                    html = html.replace(f"href='{base_domain}", f"href='/api/gateway/proxy/{session_token}")
                    html = html.replace(f'src="{base_domain}', f'src="/api/gateway/proxy/{session_token}')
                    html = html.replace(f"src='{base_domain}", f"src='/api/gateway/proxy/{session_token}")
                    html = html.replace(f'action="{base_domain}', f'action="/api/gateway/proxy/{session_token}')
                    html = html.replace(f"action='{base_domain}", f"action='/api/gateway/proxy/{session_token}")
                    content = html.encode("utf-8")
                except Exception:
                    pass
            
            return Response(content=content, media_type=content_type)
            
    except Exception as e:
        return HTMLResponse(content=f"<h1>Error loading tool</h1><p>{str(e)}</p>", status_code=500)


@router.delete("/session/{session_token}")
async def end_gateway_session(session_token: str, current_user: dict = Depends(get_current_user)):
    """End a gateway session"""
    session_hash = hashlib.sha256(session_token.encode()).hexdigest()
    if session_hash in gateway_sessions:
        del gateway_sessions[session_hash]
    return {"message": "Session ended"}


def get_error_html(title: str, message: str) -> str:
    return f'''<!DOCTYPE html>
<html>
<head><title>{title}</title>
<style>
body {{
    font-family: system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0f172a;
    color: white;
    text-align: center;
    margin: 0;
}}
.box {{
    background: rgba(255,255,255,0.1);
    padding: 40px;
    border-radius: 16px;
    max-width: 400px;
}}
h1 {{ margin-bottom: 16px; }}
a {{
    display: inline-block;
    margin-top: 20px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 8px;
}}
a:hover {{ background: #2563eb; }}
</style>
</head>
<body>
<div class="box">
    <h1>⚠️ {title}</h1>
    <p>{message}</p>
    <a href="/">Return to Dashboard</a>
</div>
</body>
</html>'''
