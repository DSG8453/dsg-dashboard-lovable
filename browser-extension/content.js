// DSG Transport Secure Login - Content Script
// Shows OVERLAY to hide login form, fills credentials, auto-submits
// User NEVER sees login form - only sees DSG loading screen

(function() {
  'use strict';
  
  let loadingOverlay = null;
  let loginAttempted = false;
  const PENDING_RETRY_DELAY_MS = 300;
  const MAX_PENDING_RETRIES = 25;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    requestPendingLogin(0);
  }

  function requestPendingLogin(attempt) {
    if (loginAttempted) return;

    chrome.runtime.sendMessage({ action: 'GET_PENDING_LOGIN' }, (response) => {
      // Service worker may still be starting up; retry a few times
      if (chrome.runtime.lastError) {
        if (attempt < MAX_PENDING_RETRIES) {
          setTimeout(() => requestPendingLogin(attempt + 1), PENDING_RETRY_DELAY_MS);
        }
        return;
      }

      const hasCreds = Boolean(response?.username && response?.password);
      const isReady = response?.status === 'ready' || (hasCreds && !response?.status);
      const shouldRetry = response?.status === 'waiting';

      if (isReady && hasCreds) {
        loginAttempted = true;

        // Best-effort overlay: never block autofill if rendering fails
        try {
          showLoadingOverlay(response.toolName);
        } catch (err) {
          console.warn('[DSG Secure Login] Overlay failed to render:', err);
        }
        
        // Fill credentials behind the overlay
        setTimeout(() => fillAndSubmit(response), 500);
        return;
      }

      // Retry only when background indicates tab-binding race
      if (shouldRetry && attempt < MAX_PENDING_RETRIES) {
        setTimeout(() => requestPendingLogin(attempt + 1), PENDING_RETRY_DELAY_MS);
      }
    });
  }
  
  // LOADING OVERLAY - Covers entire screen so user never sees login form
  function showLoadingOverlay(toolName) {
    if (loadingOverlay) return;

    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'dsg-loading-overlay';
    loadingOverlay.setAttribute('role', 'status');
    loadingOverlay.setAttribute('aria-live', 'polite');
    loadingOverlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      opacity: 1 !important;
      pointer-events: all !important;
    `;

    const content = document.createElement('div');
    content.className = 'dsg-loading-content';

    const spinner = document.createElement('div');
    spinner.className = 'dsg-loading-spinner';

    const logo = document.createElement('div');
    logo.className = 'dsg-loading-logo';
    logo.textContent = 'DSG Transport';

    const text = document.createElement('div');
    text.className = 'dsg-loading-text';
    text.textContent = `Signing into ${toolName || 'your tool'}...`;

    const subtext = document.createElement('div');
    subtext.className = 'dsg-loading-subtext';
    subtext.textContent = 'Secure auto-login in progress';

    content.appendChild(spinner);
    content.appendChild(logo);
    content.appendChild(text);
    content.appendChild(subtext);
    loadingOverlay.appendChild(content);

    if (!document.getElementById('dsg-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'dsg-loading-styles';
      style.textContent = `
        #dsg-loading-overlay * { box-sizing: border-box; }
        .dsg-loading-content { text-align: center; color: white; font-family: system-ui, -apple-system, sans-serif; padding: 24px; }
        .dsg-loading-spinner {
          width: 50px; height: 50px;
          border: 4px solid rgba(255,255,255,0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: dsg-spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        .dsg-loading-logo {
          font-size: 28px; font-weight: 700; margin-bottom: 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .dsg-loading-text { font-size: 18px; font-weight: 500; margin-bottom: 8px; color: #fff; }
        .dsg-loading-subtext { font-size: 14px; color: #94a3b8; }
        @keyframes dsg-spin { to { transform: rotate(360deg); } }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    const overlayContainer = document.body || document.documentElement;
    if (!overlayContainer) {
      throw new Error('Could not find a container to mount overlay');
    }
    overlayContainer.appendChild(loadingOverlay);
  }
  
  function hideLoadingOverlay() {
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      loadingOverlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        loadingOverlay?.remove();
        document.getElementById('dsg-loading-styles')?.remove();
        loadingOverlay = null;
      }, 300);
    }
  }
  
  function fillAndSubmit(creds) {
    let attempts = 0;
    const maxAttempts = 30;
    
    const tryFill = () => {
      attempts++;
      
      const userField = findUsernameField(creds.usernameField);
      const passField = findPasswordField(creds.passwordField);
      
      if (userField && passField) {
        // PREVENT PASSWORD SAVE - 7 techniques
        preventPasswordSave(userField, passField);
        
        // Fill username
        fillInput(userField, creds.username);
        
        setTimeout(() => {
          // Fill password
          fillInput(passField, creds.password);
          
          setTimeout(() => {
            // Find and click login button
            const btn = findLoginButton();
            if (btn) {
              submitWithPasswordPrevention(userField, passField, btn);
            } else {
              // Try form.submit() as fallback
              const form = userField.closest('form') || passField.closest('form');
              if (form) {
                scrambleFieldsBeforeSubmit(userField, passField);
                form.submit();
              }
              setTimeout(hideLoadingOverlay, 1000);
            }
          }, 300);
        }, 200);
        
      } else if (attempts < maxAttempts) {
        setTimeout(tryFill, 500);
      } else {
        hideLoadingOverlay();
        chrome.runtime.sendMessage({ action: 'LOGIN_FAILED' });
      }
    };
    
    tryFill();
  }
  
  // ============ PASSWORD SAVE PREVENTION - 7 TECHNIQUES ============
  
  function preventPasswordSave(userField, passField) {
    // 1. Autocomplete attributes
    userField.setAttribute('autocomplete', 'off');
    passField.setAttribute('autocomplete', 'new-password');
    
    // 2. Password manager ignore flags
    [userField, passField].forEach(f => {
      f.setAttribute('data-lpignore', 'true');      // LastPass
      f.setAttribute('data-1p-ignore', 'true');     // 1Password
      f.setAttribute('data-bwignore', 'true');      // Bitwarden
      f.setAttribute('data-form-type', 'other');
    });
    
    // 3. Form autocomplete
    const form = userField.closest('form') || passField.closest('form');
    if (form) {
      form.setAttribute('autocomplete', 'off');
      form.setAttribute('data-lpignore', 'true');
    }
    
    // 4. Dummy fields BEFORE real fields (password managers grab first match)
    const dummy = document.createElement('div');
    dummy.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;';
    dummy.innerHTML = `
      <input type="text" name="fake_email_${Date.now()}" autocomplete="username" tabindex="-1">
      <input type="password" name="fake_pass_${Date.now()}" autocomplete="current-password" tabindex="-1">
    `;
    if (form) form.insertBefore(dummy, form.firstChild);
    else document.body.insertBefore(dummy, document.body.firstChild);
    
    // 5. Temporarily convert password to text
    const origType = passField.type;
    passField.type = 'text';
    setTimeout(() => { passField.type = origType; }, 50);
    
    // 6. Readonly during fill
    userField.readOnly = true;
    passField.readOnly = true;
    setTimeout(() => {
      userField.readOnly = false;
      passField.readOnly = false;
    }, 100);
    
    // 7. Blur fields
    userField.blur();
    passField.blur();
  }
  
  function scrambleFieldsBeforeSubmit(userField, passField) {
    const rand = '_dsg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    userField.name = 'f_x' + rand;
    userField.id = 'i_x' + rand;
    passField.name = 'f_y' + rand;
    passField.id = 'i_y' + rand;
    passField.setAttribute('autocomplete', 'new-password');
  }
  
  function submitWithPasswordPrevention(userField, passField, btn) {
    const form = userField.closest('form') || passField.closest('form');
    
    // Store originals
    const origUserName = userField.name;
    const origPassName = passField.name;
    const origUserId = userField.id;
    const origPassId = passField.id;
    
    // Scramble before submit
    scrambleFieldsBeforeSubmit(userField, passField);
    
    if (form) form.setAttribute('autocomplete', 'off');
    
    // Click button
    requestAnimationFrame(() => {
      btn.click();
      
      // Backup: form.submit() if click didn't navigate
      if (form) {
        setTimeout(() => {
          if (document.contains(btn)) {
            try {
              if (form.requestSubmit) form.requestSubmit(btn);
              else form.submit();
            } catch (e) {}
          }
        }, 400);
      }
      
      // Hide overlay after redirect starts
      setTimeout(hideLoadingOverlay, 1500);
      
      // Restore originals (in case of validation error)
      setTimeout(() => {
        if (document.contains(userField)) {
          userField.name = origUserName;
          userField.id = origUserId;
        }
        if (document.contains(passField)) {
          passField.name = origPassName;
          passField.id = origPassId;
        }
      }, 600);
    });
    
    chrome.runtime.sendMessage({ action: 'LOGIN_SUCCESS' });
  }
  
  // ============ FIELD FINDING ============
  
  function findUsernameField(preferredName) {
    const selectors = [
      `input[name="${preferredName}"]`,
      `input[id="${preferredName}"]`,
      `input[name="${preferredName?.replace(/\$/g, '_')}"]`,
      `input[name*="txtUserName" i]`,
      `input[name*="UserName" i]`,
      `input[id*="txtUserName" i]`,
      'input[type="email"]',
      'input[name*="user" i]',
      'input[name*="email" i]',
      'input[name*="login" i]',
      'input[id*="user" i]',
      'input[id*="email" i]',
      'input[autocomplete="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="user" i]',
      'input[name="Email"]',
      'input[name="LOGIN_ID"]',
      'form input[type="text"]:first-of-type'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      } catch (e) {}
    }
    
    // Fallback: any visible text input
    const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
    for (const inp of inputs) {
      if (isVisible(inp)) return inp;
    }
    return null;
  }
  
  function findPasswordField(preferredName) {
    const selectors = [
      `input[name="${preferredName}"]`,
      `input[id="${preferredName}"]`,
      `input[name="${preferredName?.replace(/\$/g, '_')}"]`,
      `input[name*="txtPassword" i]`,
      `input[id*="txtPassword" i]`,
      'input[type="password"]',
      'input[name*="pass" i]',
      'input[name*="pwd" i]',
      'input[id*="pass" i]',
      'input[autocomplete="current-password"]',
      'input[name="PASSWORD"]'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) return el;
      } catch (e) {}
    }
    return null;
  }
  
  function findLoginButton() {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[id*="login" i]',
      'button[id*="signin" i]',
      'button[class*="login" i]',
      'button[class*="signin" i]',
      'input[name*="btnLogin" i]',
      'input[id*="btnLogin" i]',
      'input[name*="btnSubmit" i]',
      '.btn-login', '.btn-signin',
      'form button:not([type="button"])'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el) && !isSkipButton(el)) return el;
      } catch (e) {}
    }
    
    // Text search
    const btns = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    for (const btn of btns) {
      const text = (btn.textContent || btn.value || '').toLowerCase();
      if ((text.includes('sign in') || text.includes('log in') || text.includes('login') || text.includes('submit')) && isVisible(btn)) {
        return btn;
      }
    }
    
    // Any submit in form with password
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      if (form.querySelector('input[type="password"]')) {
        const btn = form.querySelector('button, input[type="submit"]');
        if (btn && isVisible(btn)) return btn;
      }
    }
    
    return null;
  }
  
  function isSkipButton(el) {
    const text = (el.textContent || el.value || '').toLowerCase();
    return text.includes('forgot') || text.includes('register') || text.includes('sign up') || text.includes('create');
  }
  
  function isVisible(el) {
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }
  
  function fillInput(el, value) {
    if (!el || !value) return;
    el.focus();
    el.value = '';
    
    // Native setter for React/Angular/Vue
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value);
    el.value = value;
    
    // Fire events
    ['input', 'change', 'keydown', 'keyup', 'keypress'].forEach(evt => {
      el.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));
    });
  }
  
})();
