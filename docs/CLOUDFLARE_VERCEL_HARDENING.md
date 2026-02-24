# Cloudflare + Vercel Hardening Runbook

This project now includes:

- Security and caching headers in `vercel.json` and `frontend/vercel.json`
- An automation script to enforce Cloudflare proxy settings:
  - SSL mode: **Full (strict)**
  - Always Use HTTPS: **on**
  - Cache bypass rules for API/auth/websocket paths

## 1) Required environment variables

Set these before running the script:

- `CLOUDFLARE_API_TOKEN` (Zone Settings + Page Rules edit scope)
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_PRIMARY_DOMAIN` (example: `portal.example.com`)

Optional:

- `CLOUDFLARE_BYPASS_PATTERNS` (comma-separated custom wildcard patterns)
- `CLOUDFLARE_DRY_RUN=true` (preview changes without writing)

## 2) Execute configuration

```bash
npm run infra:cloudflare:configure
```

## 3) Default bypass rules created

If `CLOUDFLARE_BYPASS_PATTERNS` is not provided, the script creates cache bypass rules for:

- `*<primary-domain>/api/*`
- `*<primary-domain>/auth/*`
- `*<primary-domain>/ws/*`

## 4) Verification checklist

1. Cloudflare Dashboard → SSL/TLS → Overview = **Full (strict)**
2. Cloudflare Dashboard → SSL/TLS → Edge Certificates → Always Use HTTPS = **On**
3. Cloudflare Dashboard → Rules → Page Rules includes bypass patterns for dynamic routes
4. Vercel responses include HSTS and security headers

