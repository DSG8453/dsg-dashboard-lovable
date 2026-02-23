# Internationalization (i18n) Implementation

This project now uses **i18next** + **react-i18next** for runtime localization.

## Added components

- i18n bootstrap: `frontend/src/i18n/index.js`
- Locale resources:
  - `frontend/src/i18n/locales/en.json`
  - `frontend/src/i18n/locales/es.json`
- App initialization: `frontend/src/index.js` imports `@/i18n`
- UI integration: `frontend/src/components/layout/Navbar.jsx` and `frontend/src/App.js`

## Current behavior

- Default language fallback: English (`en`)
- Supported languages: English (`en`), Spanish (`es`)
- Language detection order:
  1. `localStorage` key `dsg_locale`
  2. Browser language
  3. `<html lang="">`
- User can switch language from the navbar menu (desktop + mobile)

## Extending translations

1. Add keys to `frontend/src/i18n/locales/en.json`
2. Add translated values to `frontend/src/i18n/locales/<lang>.json`
3. Use key in code:

```jsx
const { t } = useTranslation();
return <span>{t("nav.dashboard")}</span>;
```
