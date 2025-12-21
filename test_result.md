# DSG Transport LLC Management Portal - Test Plan

## Application Overview
A full-stack management portal for DSG Transport LLC with:
- FastAPI backend with MongoDB
- React frontend with glassmorphism UI
- JWT authentication
- Encrypted credential storage

## Test Credentials
- **Admin:** admin@dsgtransport.com / admin123
- **User 1:** john.smith@dsgtransport.com / john123  
- **User 2:** sarah.johnson@dsgtransport.com / sarah123

## Backend API Base URL
Use REACT_APP_BACKEND_URL from /app/frontend/.env with /api prefix

## Features to Test

### 1. Authentication
- [x] Login with valid credentials (admin)
- [ ] Login with invalid credentials (should fail)
- [ ] Logout functionality
- [ ] Token persistence across page refreshes

### 2. Dashboard
- [x] Tools load from database
- [x] User count displays correctly
- [ ] Add new tool functionality
- [ ] Delete tool functionality (admin only)

### 3. Credentials Management
- [ ] Add credentials for a tool
- [ ] View credentials (password masked)
- [ ] Reveal password (decrypted from backend)
- [ ] Update credentials
- [ ] Delete credentials

### 4. User Management (Admin)
- [x] List all users
- [ ] Create new user (invite)
- [ ] Update user (role, status, access level)
- [ ] Suspend user
- [ ] Reactivate user
- [ ] Delete user
- [ ] Resend invitation

### 5. Issues
- [ ] Create new issue
- [ ] View issues (admin sees all, user sees own)
- [ ] AI Analysis (mock)
- [ ] Resolve issue (admin)
- [ ] Update issue status

### 6. Settings
- [ ] Get support settings
- [ ] Update WhatsApp number (admin)

## Testing Protocol
- Run backend tests in /app/backend/tests/
- Use pytest for backend testing
- Use Playwright for frontend E2E testing

## Incorporate User Feedback
- None at this time

## Last Test Result
Initial testing - Frontend loads and connects to backend successfully
