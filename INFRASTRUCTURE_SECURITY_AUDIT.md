# Infrastructure & Security Audit Report

**Project:** DSG Transport SecurePass  
**Date:** 2026-02-23  
**Auditor:** Senior DevOps Engineer & Security Auditor (Automated Scan)  
**Scope:** Full codebase analysis — CI/CD, cloud integrations, data recovery, i18n, and security posture

---

## Executive Summary

The DSG Transport SecurePass platform is a credential management system comprising a Vite/React frontend, a CRA-based legacy frontend, a Python FastAPI backend (MongoDB), and a Chrome browser extension. The backend runs on **Google Cloud Run** (`us-central1`), the frontend deploys via **Vercel**, and secrets are managed through **GCP Secret Manager**. Docker images exist for both frontend and backend.

The audit reveals **significant gaps** in CI/CD automation, data recovery, security hardening, and internationalization. Several critical security weaknesses were identified in the backend configuration.

---

## 1. CI/CD Automation

### GitHub Actions / Workflows

> **Search path:** `.github/workflows/`

#### Cloudflare Cache Purging

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | No `.github/workflows/` directory exists. No GitHub Actions workflow files of any kind were found in the repository. There is **zero** automated Cloudflare cache purging. |

#### Automated GCP Backend Deployments

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | No CI/CD pipeline deploys the backend to Google Cloud Run. Dockerfiles exist for both `frontend/` and `backend/`, but there are no workflows, Cloud Build triggers (`cloudbuild.yaml`), or deployment scripts (`deploy.sh`) to automate the process. Deployments appear to be **manual**. |

#### Additional CI/CD Observations

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | No linting, testing, or build-verification workflows exist. |
| ❌ **[MISSING]** | No branch protection enforcement via status checks. |
| ✅ **[FOUND]** | `railway.json` — Railway deployment config is present (Nixpacks builder, 1 replica, restart-on-failure). This may serve as an alternative deployment target. |
| ✅ **[FOUND]** | `vercel.json` (root + `frontend/`) — Vercel deployment config with API rewrites to Cloud Run backend at `https://dsg-backend-564085662748.us-central1.run.app`. Vercel likely auto-deploys on push via its Git integration. |

---

## 2. Cloudflare / Vercel Integration

### Vercel Configuration

| Status | Detail |
|--------|--------|
| ✅ **[FOUND]** | `vercel.json` exists at both root and `frontend/vercel.json` (identical). Configures build commands, output directory, and **API rewrites** proxying `/api/*` requests to the Cloud Run backend. |
| ✅ **[FOUND]** | SPA fallback rewrite: `/(.*) → /index.html` for client-side routing. |

### Cloudflare Proxy / SSL

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | **No Cloudflare integration found.** Only a passing mention of "Cloudflare: DNS Settings" in `docs/RAILWAY_DEPLOYMENT_GUIDE.md`. |
| ❌ **[MISSING]** | No Full (Strict) SSL configuration, no Cloudflare bypass rules, no `CF-Connecting-IP` header handling. |
| ❌ **[MISSING]** | No `wrangler.toml`, no Cloudflare Workers, no Cloudflare Pages config. |

### Middleware & Security Headers

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | No `middleware.ts` or `middleware.js` files (project is Vite/React, not Next.js — so no edge middleware layer). |
| ❌ **[MISSING]** | **No security headers configured anywhere** — no `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Referrer-Policy`, or `Permissions-Policy`. Neither in Vercel config, nginx, nor the FastAPI backend. |
| ⚠️ **[WARNING]** | `backend/server.py` lines 43-50: CORS is configured with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`. This is **dangerously permissive** for a credential management system. |

---

## 3. Data Recovery & Backups

### Backup Scripts & Terraform

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | **No Terraform files** (`.tf`, `.tfvars`) found anywhere in the repository. Infrastructure is not codified. |
| ❌ **[MISSING]** | **No backup scripts** (Python/Node) for database dumps or exports. |
| ❌ **[MISSING]** | **No references to GCS buckets or S3** for backup storage. The only cloud storage reference is a Supabase URL for hosting a logo image. |
| ❌ **[MISSING]** | **No `pg_dump`, `mongodump`, `mysqldump`, or `firestore export`** references found. |

### Cloud Functions / Cron Jobs

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | **No Cloud Functions** directory or code exists. |
| ❌ **[MISSING]** | **No cron job configurations** (`cron.yaml`, `node-cron`, or scheduled tasks) for automated database exports. |

### What Does Exist

| Status | Detail |
|--------|--------|
| ✅ **[FOUND]** | **Client-side CSV export** in `frontend/src/pages/ActivityLogsPage.jsx` (lines 193-221) — a `handleExport()` function that exports activity logs to CSV. This is a UI convenience, not a backup mechanism. |
| ✅ **[FOUND]** | `.backup` files for local development safety: `AuthContext.jsx.backup`, `database.py.backup`, `security.py.backup`, `auth.py.backup`. These are development artifacts, not operational backups. |
| ✅ **[FOUND]** | Dev server plugin (`frontend/plugins/visual-edits/dev-server-setup.js`) creates `.backup` files before code modifications, then cleans up after git commits. |

---

## 4. Internationalization (i18n)

| Status | Detail |
|--------|--------|
| ❌ **[MISSING]** | **No i18n library installed.** Neither `next-intl`, `i18next`, `react-intl`, `react-i18next`, nor `formatjs` appear in any `package.json`. |
| ❌ **[MISSING]** | **No locale/translation files.** No `locales/`, `translations/`, `messages/`, or `lang/` directories. |
| ❌ **[MISSING]** | **No i18n configuration files** of any kind. |
| ❌ **[MISSING]** | **No translation hooks or functions.** No `useTranslation()`, `t()`, `intl.formatMessage()`, or similar patterns in the source. |
| ❌ **[MISSING]** | **All UI strings are hardcoded in English** throughout the codebase. Examples: `"Pending Approval"`, `"Login Failed"`, `"Activity Logs"`, `"Save Changes"`, `"In Progress"`, `"Tool Access"`, etc. |

**Current state:** The application is **English-only with no internationalization infrastructure**. Adding i18n later will require extracting hundreds of hardcoded strings from components across both frontend projects.

---

## 5. Additional Security Findings (Critical)

Beyond the four audit areas requested, the following critical security issues were identified:

| Severity | Finding | Location |
|----------|---------|----------|
| **CRITICAL** | CORS allows all origins (`"*"`) on a credential management API | `backend/server.py:46` |
| **CRITICAL** | Hardcoded default admin password `"admin123"` in database seed | `backend/database.py:56` |
| **CRITICAL** | Hardcoded sample user passwords (`"john123"`, `"sarah123"`) | `backend/database.py:70,80` |
| **CRITICAL** | JWT fallback secret key is `"fallback-dev-key"` | `backend/utils/security.py:22` |
| **CRITICAL** | WebSocket JWT secret fallback is `"your-secret-key"` | `backend/server.py:100` |
| **HIGH** | No rate limiting on any API endpoint (authentication, login, etc.) | `backend/server.py` |
| **HIGH** | No security headers (HSTS, CSP, X-Frame-Options, etc.) | Entire stack |
| **HIGH** | No automated database backups for MongoDB | N/A |
| **MEDIUM** | No input sanitization middleware | `backend/server.py` |
| **MEDIUM** | Encryption key falls back to a runtime-generated key (data becomes unrecoverable on restart) | `backend/utils/security.py:23` |
| **LOW** | Two duplicate `vercel.json` files (root and `frontend/`) | Root & `frontend/` |

---

## 6. Infrastructure Summary Matrix

| Area | Status | Details |
|------|--------|---------|
| GitHub Actions (any) | ❌ Missing | No `.github/workflows/` directory |
| Cloudflare Cache Purge Workflow | ❌ Missing | No automation exists |
| GCP Auto-Deploy Workflow | ❌ Missing | No CI/CD for Cloud Run |
| Vercel Config | ✅ Found | `vercel.json` with API proxy rewrites |
| Cloudflare Proxy Integration | ❌ Missing | No CF config, headers, or workers |
| Security Headers | ❌ Missing | None configured on any layer |
| Middleware (Next.js-style) | ❌ N/A | Project uses Vite/React, not Next.js |
| Terraform / IaC | ❌ Missing | No infrastructure as code |
| Database Backup Scripts | ❌ Missing | No `mongodump` or export scripts |
| Cloud Function for DB Export | ❌ Missing | No Cloud Functions exist |
| Cron Job for Backups | ❌ Missing | No scheduled jobs |
| i18n Library | ❌ Missing | No i18n dependencies |
| Translation Files | ❌ Missing | No locale files |
| GCP Secret Manager | ✅ Found | `backend/services/secret_manager_service.py` |
| Docker Support | ✅ Found | Dockerfiles for frontend & backend |
| JWT Auth | ✅ Found | `backend/utils/security.py` (with caveats) |
| Credential Encryption | ✅ Found | Fernet symmetric encryption (with caveats) |

---

## 7. Security Health Score

### Scoring Breakdown

| Category | Weight | Score | Notes |
|----------|--------|-------|-------|
| CI/CD & Deployment | 15% | 2/10 | No pipelines, no automated testing or deploys |
| Network Security (Cloudflare/Headers) | 15% | 1/10 | No CDN protection, no security headers, wildcard CORS |
| Data Recovery & Backups | 20% | 0/10 | Zero backup infrastructure for production MongoDB |
| Secrets Management | 15% | 5/10 | GCP Secret Manager used, but dangerous fallback values |
| Authentication & Authorization | 15% | 4/10 | JWT + bcrypt present, but hardcoded passwords, no rate limiting |
| Infrastructure as Code | 10% | 1/10 | Dockerfiles only, no Terraform/IaC |
| Internationalization | 10% | 0/10 | Completely absent |

### Overall Security Health Score

# 2 / 10

**Rating: CRITICAL — Immediate action required**

The codebase has foundational elements (JWT auth, encryption, Secret Manager integration, Docker support) but is missing almost all operational security, CI/CD automation, backup infrastructure, and hardening measures expected for a production credential management system. The wildcard CORS policy and hardcoded secrets represent immediate, exploitable vulnerabilities.

---

## 8. Recommended Priority Actions

1. **[P0 — Immediate]** Restrict CORS to specific allowed origins
2. **[P0 — Immediate]** Remove all hardcoded passwords and fallback secret keys
3. **[P0 — Immediate]** Implement automated MongoDB backups (Cloud Function + GCS bucket on a cron schedule)
4. **[P1 — This Sprint]** Add GitHub Actions workflow for CI (lint, test, build verification)
5. **[P1 — This Sprint]** Add GitHub Actions workflow for automated Cloud Run deployment
6. **[P1 — This Sprint]** Add security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
7. **[P1 — This Sprint]** Implement API rate limiting (e.g., `slowapi` for FastAPI)
8. **[P2 — Next Sprint]** Set up Cloudflare proxy with Full (Strict) SSL
9. **[P2 — Next Sprint]** Add Cloudflare cache purge workflow to GitHub Actions
10. **[P2 — Next Sprint]** Introduce Terraform for infrastructure management
11. **[P3 — Backlog]** Implement i18n with `react-i18next` and extract all hardcoded strings

---

*End of audit report.*
