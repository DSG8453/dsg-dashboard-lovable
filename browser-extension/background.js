// DSG Transport Secure Login - Background Service Worker v1.3.19
// Opens tab VISIBLE with overlay covering login form
// User sees loading screen, never the login form

// Listen for messages from DSG Transport dashboard
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('[DSG-BG] External message received:', request.action, 'from:', sender.origin);
  if (sender.origin) setBackendUrl(sender.origin);
  
  if (request.action === 'DSG_SECURE_LOGIN') {
    console.log('[DSG-BG] Starting secure login for:', request.toolName);
    handleSecureLogin(request, sendResponse);
    return true;
  }
  
  if (request.action === 'DSG_AUTO_LOGIN') {
    console.log('[DSG-BG] Starting auto login for:', request.toolName);
    handleSecureLogin(request, sendResponse);
    return true;
  }
  
  if (request.action === 'DSG_CHECK_EXTENSION') {
    console.log('[DSG-BG] Extension check - responding with version');
    sendResponse({ 
      installed: true, 
      version: chrome.runtime.getManifest().version,
      ready: true,
      secure: true
    });
    return true;
  }
  
  return false;
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PENDING_LOGIN') {
    console.log('[DSG-BG] GET_PENDING_LOGIN from:', sender.tab?.url);
    chrome.storage.local.get('pendingLogin', (data) => {
      const pending = data.pendingLogin;
      console.log('[DSG-BG] Stored pendingLogin:', pending ? 'EXISTS' : 'NONE');
      if (pending) {
        console.log('[DSG-BG] Stored URL:', pending.url);
        console.log('[DSG-BG] Current URL:', sender.tab?.url);
        console.log('[DSG-BG] URL match:', isUrlMatch(pending.url, sender.tab?.url));
        console.log('[DSG-BG] Has password:', pending.password ? 'YES' : 'NO');
      }
      if (pending && isUrlMatch(pending.url, sender.tab?.url)) {
        console.log('[DSG-BG] Returning credentials to content script');
        sendResponse(pending);
        chrome.storage.local.remove('pendingLogin');
      } else {
        console.log('[DSG-BG] No matching pending login - returning null');
        sendResponse(null);
      }
    });
    return true;
  }
  
  if (request.action === 'CLEAR_PENDING_LOGIN') {
    chrome.storage.local.remove('pendingLogin');
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'LOGIN_SUCCESS' || request.action === 'LOGIN_FAILED') {
    sendResponse({ acknowledged: true });
    return true;
  }
  
  if (request.action === 'LOGIN_NEEDS_MANUAL') {
    // CAPTCHA or 2FA detected - credentials filled, user needs to complete manually
    // Clear pending login since credentials are already filled
    chrome.storage.local.remove('pendingLogin');
    sendResponse({ acknowledged: true, reason: request.reason });
    return true;
  }
  
  return false;
});

// Handle secure login - Opens tab VISIBLE (overlay will cover it)
async function handleSecureLogin(request, sendResponse) {
  try {
    console.log('[DSG-BG] handleSecureLogin started');
    console.log('[DSG-BG] Login URL:', request.loginUrl);
    console.log('[DSG-BG] Has encrypted payload:', !!request.encryptedPayload);
    
    let username, password, usernameField, passwordField;
    
    if (request.encryptedPayload) {
      const backendUrl = getDynamicBackendUrl();
      console.log('[DSG-BG] Decrypting via:', backendUrl);
      
      const decryptResponse = await fetch(backendUrl + '/api/secure-access/decrypt-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encrypted: request.encryptedPayload })
      });
      
      console.log('[DSG-BG] Decrypt response status:', decryptResponse.status);
      
      if (!decryptResponse.ok) throw new Error('Decrypt failed');
      
      const decrypted = await decryptResponse.json();
      console.log('[DSG-BG] Decrypted success:', decrypted.success);
      console.log('[DSG-BG] Has username:', !!decrypted.u);
      console.log('[DSG-BG] Has password:', !!decrypted.p);
      
      if (!decrypted.success || !decrypted.u || !decrypted.p) {
        throw new Error(decrypted.error || 'Invalid credentials');
      }
      
      username = decrypted.u;
      password = decrypted.p;
      usernameField = request.usernameField || decrypted.uf || 'username';
      passwordField = request.passwordField || decrypted.pf || 'password';
    } else {
      console.log('[DSG-BG] Using direct credentials (no encryption)');
      username = request.username;
      password = request.password;
      usernameField = request.usernameField || 'username';
      passwordField = request.passwordField || 'password';
    }
    
    console.log('[DSG-BG] Final - Has username:', !!username);
    console.log('[DSG-BG] Final - Has password:', !!password);
    
    if (!username || !password) throw new Error('Missing credentials');
    
    const loginData = {
      url: request.loginUrl,
      username: username,
      password: password,
      usernameField: usernameField,
      passwordField: passwordField,
      toolName: request.toolName,
      timestamp: Date.now()
    };
    
    console.log('[DSG-BG] Storing pendingLogin for URL:', loginData.url);
    await chrome.storage.local.set({ pendingLogin: loginData });
    console.log('[DSG-BG] pendingLogin stored successfully');
    
    // Open tab VISIBLE - overlay will cover login form immediately
    const tab = await chrome.tabs.create({ 
      url: request.loginUrl,
      active: true  // VISIBLE - but overlay covers everything
    });
    console.log('[DSG-BG] Tab created with ID:', tab.id);
    
    // Clear credentials from memory
    setTimeout(() => {
      loginData.username = null;
      loginData.password = null;
    }, 15000);
    
    sendResponse({ 
      success: true, 
      tabId: tab.id,
      hiddenLogin: true,
      message: 'Hidden login started'
    });
    
  } catch (error) {
    console.log('[DSG-BG] ERROR:', error.message);
    sendResponse({ success: false, error: error.message });
  }
}

function isUrlMatch(pendingUrl, currentUrl) {
  if (!pendingUrl || !currentUrl) return false;
  try {
    const pending = new URL(pendingUrl);
    const current = new URL(currentUrl);
    if (pending.hostname === current.hostname) return true;
    const pendingDomain = pending.hostname.split('.').slice(-2).join('.');
    const currentDomain = current.hostname.split('.').slice(-2).join('.');
    return pendingDomain === currentDomain;
  } catch (e) {
    return false;
  }
}

let dynamicBackendUrl = null;
function setBackendUrl(url) {
  if (url && url.includes('dsgtransport')) {
    dynamicBackendUrl = url.replace(/\/$/, '');
  }
}
function getDynamicBackendUrl() {
  return dynamicBackendUrl || 'https://portal.dsgtransport.net';
}

// Cleanup expired data
setInterval(() => {
  chrome.storage.local.get('pendingLogin', (data) => {
    if (data.pendingLogin && Date.now() - data.pendingLogin.timestamp > 120000) {
      chrome.storage.local.remove('pendingLogin');
    }
  });
}, 30000);
