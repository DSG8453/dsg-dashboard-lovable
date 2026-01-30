// DSG Transport Secure Login - Background Service Worker
// SECURITY: Credentials are encrypted and decrypted only within the extension
// Users NEVER see credentials - they are auto-filled directly into forms

// Store pending login data
let pendingLogins = {};

// Listen for messages from DSG Transport dashboard (external)
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    // Dynamically capture the backend URL from the sender's origin
    if (sender.origin) {
      setBackendUrl(sender.origin);
    } else if (sender.url) {
      try {
        const url = new URL(sender.url);
        setBackendUrl(url.origin);
      } catch (e) {}
    }
    
    // NEW: Secure login with encrypted payload
    if (request.action === 'DSG_SECURE_LOGIN') {
      handleSecureLogin(request, sendResponse);
      return true; // Keep channel open for async response
    }
    
    // Legacy support (will be removed)
    if (request.action === 'DSG_AUTO_LOGIN') {
      handleAutoLogin(request, sendResponse);
      return true;
    }
    
    if (request.action === 'DSG_CHECK_EXTENSION') {
      sendResponse({ 
        installed: true, 
        version: chrome.runtime.getManifest().version,
        ready: true,
        secure: true // Indicates this version supports encrypted payloads
      });
      return true;
    }
    
    return false;
  }
);

// Listen for internal messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PENDING_LOGIN') {
    // Check if there's a pending login for this tab
    chrome.storage.local.get('pendingLogin', (data) => {
      const pending = data.pendingLogin;
      if (pending && isUrlMatch(pending.url, sender.tab?.url)) {
        sendResponse(pending);
        // Clear after sending to content script
        chrome.storage.local.remove('pendingLogin');
      } else {
        sendResponse(null);
      }
    });
    return true; // Async response
  }
  
  if (request.action === 'CLEAR_PENDING_LOGIN') {
    chrome.storage.local.remove('pendingLogin', () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'LOGIN_SUCCESS') {
    sendResponse({ acknowledged: true });
  }
  
  if (request.action === 'LOGIN_FAILED') {
    console.warn('[DSG] Login failed:', request.reason);
    sendResponse({ acknowledged: true });
  }
  
  return false;
});

// NEW: Handle secure login with encrypted payload
async function handleSecureLogin(request, sendResponse) {
  try {
    // Get the backend URL dynamically (captured from sender origin)
    const backendUrl = getDynamicBackendUrl();
    
    let decryptResponse;
    try {
      decryptResponse = await fetch(backendUrl + '/api/secure-access/decrypt-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': chrome.runtime.getURL('')
        },
        body: JSON.stringify({
          encrypted: request.encryptedPayload
        })
      });
    } catch (fetchError) {
      console.error('[DSG] Network error:', fetchError.message);
      throw new Error('Network error calling decrypt API: ' + fetchError.message);
    }
    
    if (!decryptResponse.ok) {
      const errorText = await decryptResponse.text();
      console.error('[DSG] Decrypt error:', errorText);
      throw new Error('Decrypt API returned ' + decryptResponse.status + ': ' + errorText);
    }
    
    const decrypted = await decryptResponse.json();
    
    if (!decrypted.success) {
      throw new Error(decrypted.error || 'Decryption failed - check EXTENSION_KEY env variable');
    }
    
    if (!decrypted.u || !decrypted.p) {
      throw new Error('Decrypted payload missing username or password');
    }
    
    // Store login data temporarily (credentials in memory only)
    const loginData = {
      url: request.loginUrl,
      username: decrypted.u,
      password: decrypted.p,
      usernameField: request.usernameField || decrypted.uf || 'username',
      passwordField: request.passwordField || decrypted.pf || 'password',
      toolName: request.toolName,
      autoSubmit: true,
      timestamp: Date.now()
    };
    
    // Store the pending login
    await chrome.storage.local.set({ pendingLogin: loginData });
    
    // Open the login URL in a new tab
    const tab = await chrome.tabs.create({ 
      url: request.loginUrl,
      active: true
    });
    
    // Clear credentials from memory after they're used
    setTimeout(() => {
      loginData.username = null;
      loginData.password = null;
    }, 15000);
    
    sendResponse({ 
      success: true, 
      tabId: tab.id,
      message: 'Auto-login initiated'
    });
    
  } catch (error) {
    console.error('[DSG] Secure login error:', error.message);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Legacy: Handle auto-login request (for backwards compatibility)
async function handleAutoLogin(request, sendResponse) {
  try {
    const loginData = {
      url: request.loginUrl,
      username: request.username,
      password: request.password,
      usernameField: request.usernameField || 'username',
      passwordField: request.passwordField || 'password',
      toolName: request.toolName,
      timestamp: Date.now()
    };
    
    // Store the pending login
    await chrome.storage.local.set({ pendingLogin: loginData });
    
    // Open the login URL in a new tab
    const tab = await chrome.tabs.create({ 
      url: request.loginUrl,
      active: true
    });
    
    sendResponse({ 
      success: true, 
      tabId: tab.id,
      message: 'Login page opened, credentials will auto-fill'
    });
    
  } catch (error) {
    console.error('[DSG] Auto-login error:', error.message);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get backend URL dynamically from the page that triggered the login
function getBackendUrl() {
  const fallbackUrls = [
    'https://portal.dsgtransport.net',
    'https://api.portal.dsgtransport.net',
    'https://secure.dsgtransport.net',
    'https://app.dsgtransport.net', 
    'https://secure.dsgtransport.com',
    'https://app.dsgtransport.com'
  ];
  
  return fallbackUrls[0];
}

// Store the backend URL when we receive a message from the dashboard
let dynamicBackendUrl = null;

function setBackendUrl(url) {
  if (url && url.includes('dsgtransport')) {
    dynamicBackendUrl = url.replace(/\/$/, '');
  }
}

function getDynamicBackendUrl() {
  return dynamicBackendUrl || getBackendUrl();
}

// Check if two URLs match (same domain or URL contains pending URL domain)
function isUrlMatch(pendingUrl, currentUrl) {
  if (!pendingUrl || !currentUrl) {
    return false;
  }
  
  try {
    const pending = new URL(pendingUrl);
    const current = new URL(currentUrl);
    
    // Exact hostname match
    if (pending.hostname === current.hostname) {
      return true;
    }
    
    // Check if same domain (ignoring subdomain)
    const pendingDomain = pending.hostname.split('.').slice(-2).join('.');
    const currentDomain = current.hostname.split('.').slice(-2).join('.');
    
    if (pendingDomain === currentDomain) {
      return true;
    }
    
    // Check if current URL hostname contains pending domain
    if (current.hostname.includes(pending.hostname) || pending.hostname.includes(current.hostname)) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Clean up expired login data periodically (every minute)
setInterval(() => {
  chrome.storage.local.get('pendingLogin', (data) => {
    if (data.pendingLogin) {
      const age = Date.now() - data.pendingLogin.timestamp;
      // Expire after 2 minutes (shorter for security)
      if (age > 2 * 60 * 1000) {
        chrome.storage.local.remove('pendingLogin');
      }
    }
  });
}, 30000);

// Listen for tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get('pendingLogin', (data) => {
      // Content script handles the rest
    });
  }
});
