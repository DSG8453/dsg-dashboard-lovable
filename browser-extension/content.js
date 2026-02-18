// DSG Transport Secure Login - Content Script v1.3.3
// Shows OVERLAY to hide login form, fills credentials, auto-submits
// User NEVER sees login form - only sees DSG loading screen

(function() {
  'use strict';
  
  let loadingOverlay = null;
  let loginAttempted = false;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    chrome.runtime.sendMessage({ action: 'GET_PENDING_LOGIN' }, (pending) => {
      if (chrome.runtime.lastError || !pending || loginAttempted) return;
      loginAttempted = true;
      
      showLoadingOverlay(pending.toolName);
      
      setTimeout(() => fillAndSubmit(pending), 800);
    });
  }
  
  function showLoadingOverlay(toolName) {
    if (loadingOverlay) return;
    
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'dsg-loading-overlay';
    
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
    `;
    
    const displayName = toolName || 'Tool';
    
    loadingOverlay.innerHTML = `
      <div class="dsg-loading-content">
        <div class="dsg-loading-spinner"></div>
        <div class="dsg-loading-logo">DSG Transport</div>
        <div class="dsg-loading-text">Connecting to ${displayName}...</div>
        <div class="dsg-loading-subtext">Securely logging you in</div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.id = 'dsg-loading-styles';
    style.textContent = `
      #dsg-loading-overlay * { box-sizing: border-box; }
      .dsg-loading-content { text-align: center; color: white; font-family: system-ui, -apple-system, sans-serif; }
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
    
    document.head.appendChild(style);
    document.body.appendChild(loadingOverlay);
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
    const maxAttempts = 20;
    
    const tryFill = () => {
      attempts++;
      
      const userField = findUsernameField(creds.usernameField);
      const passField = findPasswordField(creds.passwordField);
      
      if (userField && passField) {
        preventPasswordSave(userField, passField);
        
        fillInput(userField, creds.username);
        
        setTimeout(() => {
          fillInput(passField, creds.password);
          
          setTimeout(() => {
            const btn = findLoginButton();
            if (btn) {
              submitWithPasswordPrevention(userField, passField, btn);
            } else {
              const form = userField.closest('form') || passField.closest('form');
              if (form) {
                scrambleFieldsBeforeSubmit(userField, passField);
                form.submit();
              }
              setTimeout(hideLoadingOverlay, 1500);
            }
          }, 400);
        }, 300);
        
      } else if (attempts < maxAttempts) {
        setTimeout(tryFill, 600);
      } else {
        hideLoadingOverlay();
        chrome.runtime.sendMessage({ action: 'LOGIN_FAILED' });
      }
    };
    
    tryFill();
  }
  
  // ============ PASSWORD SAVE PREVENTION ============
  
  function preventPasswordSave(userField, passField) {
    userField.setAttribute('autocomplete', 'off');
    passField.setAttribute('autocomplete', 'new-password');
    
    [userField, passField].forEach(f => {
      f.setAttribute('data-lpignore', 'true');
      f.setAttribute('data-1p-ignore', 'true');
      f.setAttribute('data-bwignore', 'true');
      f.setAttribute('data-form-type', 'other');
      f.setAttribute('data-com-onepassword-filled', 'dark');
    });
    
    const form = userField.closest('form') || passField.closest('form');
    if (form) {
      form.setAttribute('autocomplete', 'off');
      form.setAttribute('data-lpignore', 'true');
      form.setAttribute('data-turbo', 'false');
    }
    
    const dummy = document.createElement('div');
    dummy.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;';
    dummy.innerHTML = `
      <input type="text" name="fake_email_${Date.now()}" autocomplete="username" tabindex="-1">
      <input type="password" name="fake_pass_${Date.now()}" autocomplete="current-password" tabindex="-1">
    `;
    if (form) form.insertBefore(dummy, form.firstChild);
    else document.body.insertBefore(dummy, document.body.firstChild);
    
    interceptPasswordSavePrompt();
  }
  
  function interceptPasswordSavePrompt() {
    const origCredCreate = navigator.credentials?.store;
    if (navigator.credentials) {
      navigator.credentials.store = function() { return Promise.resolve(); };
    }
    
    if (window.PasswordCredential) {
      try {
        Object.defineProperty(window, 'PasswordCredential', {
          value: undefined,
          writable: false,
          configurable: false
        });
      } catch (e) {}
    }
  }
  
  function scrambleFieldsBeforeSubmit(userField, passField) {
    const rand = '_dsg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    userField.name = 'f_x' + rand;
    userField.id = 'i_x' + rand;
    passField.name = 'f_y' + rand;
    passField.id = 'i_y' + rand;
    passField.type = 'text';
    passField.setAttribute('autocomplete', 'new-password');
  }
  
  function submitWithPasswordPrevention(userField, passField, btn) {
    const form = userField.closest('form') || passField.closest('form');
    
    const origUserName = userField.name;
    const origPassName = passField.name;
    const origUserId = userField.id;
    const origPassId = passField.id;
    
    scrambleFieldsBeforeSubmit(userField, passField);
    
    if (form) form.setAttribute('autocomplete', 'off');
    
    requestAnimationFrame(() => {
      btn.click();
      
      if (form) {
        setTimeout(() => {
          if (document.contains(btn)) {
            try {
              if (form.requestSubmit) form.requestSubmit(btn);
              else form.submit();
            } catch (e) {}
          }
        }, 500);
      }
      
      setTimeout(hideLoadingOverlay, 2000);
      
      setTimeout(() => {
        if (document.contains(userField)) {
          userField.name = origUserName;
          userField.id = origUserId;
        }
        if (document.contains(passField)) {
          passField.name = origPassName;
          passField.id = origPassId;
          passField.type = 'password';
        }
      }, 800);
    });
    
    chrome.runtime.sendMessage({ action: 'LOGIN_SUCCESS' });
  }
  
  // ============ FIELD FINDING ============
  
  function findUsernameField(preferredName) {
    const selectors = [
      `input[name="${preferredName}"]`,
      `input[id="${preferredName}"]`,
      `input[name="${preferredName?.replace(/\\$/g, '_')}"]`,
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
      `input[name="${preferredName?.replace(/\\$/g, '_')}"]`,
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
      'form button:not([type="button"])',
      'a[id*="btnLogin" i]',
      'a[class*="login-btn" i]'
    ];
    
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && isVisible(el) && !isSkipButton(el)) return el;
      } catch (e) {}
    }
    
    const btns = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn');
    for (const btn of btns) {
      const text = (btn.textContent || btn.value || '').toLowerCase();
      if ((text.includes('sign in') || text.includes('log in') || text.includes('login') || text.includes('submit')) && isVisible(btn)) {
        return btn;
      }
    }
    
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
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }
  
  function fillInput(el, value) {
    if (!el || !value) return;
    
    el.readOnly = false;
    el.disabled = false;
    el.focus();
    el.value = '';
    
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: 'a' }));
    
    if (el.value !== value) {
      el.setAttribute('value', value);
      el.value = value;
    }
  }
  
})();
