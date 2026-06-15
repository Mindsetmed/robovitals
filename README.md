# MindSet SDK — Standalone RoboVitals / Mindset Vitals App

Lightweight Angular app for Mindset Vitals capture only. Uses the same Hellogard backend APIs (`/api/mindset-vitals/*`).

## Prerequisites

- Node.js 18+
- Hellogard backend running (default dev: `https://localhost:54559/`)

## Setup

```bash
npm install
```

This runs `postinstall` and copies Mindset SDK worker assets into `src/assets/mindset-vitals/dist`.

## Development

```bash
npm start
```

Opens at **http://localhost:4300** with COOP/COEP headers required for the vitals WASM worker.

Update the API URL in `src/environments/environment.ts` if your backend is not at `https://localhost:54559/`.

## Production build

```bash
npm run build
```

Output: `dist/mindset-sdk/`

Deploy the build output to IIS (or any static host). Include `Web.config` for COOP/COEP headers and SPA routing.

Set `apiBaseUrl` in `src/environments/environment.prod.ts` to your backend origin before building, or configure a reverse proxy so `/api` routes to the backend.

## Flow

1. Enter Patient ID — auto lookup via Mindset API
2. If not found — Bootstrap registration form appears
3. **Capture Vitals** — full-page scan (no popup), then results

## Dependencies

- Angular 18 (standalone components)
- Bootstrap 5 (forms only)
- `@mindset-vitals/web-sdk` (from `vendor/mindset-vitals-web-sdk`)

No DevExtreme, no shared Hellogard frontend code.
