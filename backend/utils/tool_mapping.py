"""
Tool Name Mapping
Place this file at: backend/utils/tool_mapping.py
"""

TOOL_NAME_MAPPING = {
    "rmis": "rmis",
    "risk management": "rmis",
    "truckstop": "truckstop",
    "truckstop.com": "truckstop",
    "truck stop": "truckstop",
    "saferwatch": "saferwatch",
    "safer watch": "saferwatch",
    "bill.com": "billcom",
    "billcom": "billcom",
    "bill com": "billcom",
    "mcp": "mcp",
    "management control panel": "mcp",
    "zoho assist": "zoho-assist",
    "zoho": "zoho-assist",
}

def normalize_tool_name(tool_name: str) -> str:
    if not tool_name:
        return ""
    
    normalized = tool_name.lower().strip().replace(".", "").replace("_", " ")
    
    if normalized in TOOL_NAME_MAPPING:
        return TOOL_NAME_MAPPING[normalized]
    
    no_spaces = normalized.replace(" ", "")
    if no_spaces in TOOL_NAME_MAPPING:
        return TOOL_NAME_MAPPING[no_spaces]
    
    safe_name = normalized.replace(" ", "-")
    safe_name = "".join(c for c in safe_name if c.isalnum() or c == "-")
    return safe_name
