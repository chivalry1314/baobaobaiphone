# BaobaobaiPhone

baobaobaiphone is a mobile desktop-style web app container built with React + Vite.
It organizes features as "system desktop + multiple apps", and supports local app auto-registration, runtime HTML apps from App Market, system scheduled tasks, Memory Center, Web Push, and multiple AI integrations.

## Overview

- Desktop-style container: icon layout, paging, and desktop widgets.
- Multi-app ecosystem: apps are auto-registered via manifest, no manual global registry list.
- App Market: supports installing and launching online/offline runtime HTML apps.
- System scheduler: configurable periodic tasks with execution logs.
- Persistence: IndexedDB-based storage (core store + app store).
- AI integration: OpenAI-compatible endpoints, image generation, voice, memory summarization.
- Web Push: browser subscription, server sync, test push, and notification-to-app deep open.

## Tech Stack

- React 19
- TypeScript 5
- Vite 6
- Zustand
- Tailwind CSS 4
- motion
- IndexedDB (via in-repo abstractions)

## Project Structure

```text
src/
  App.tsx                          # System shell and app lifecycle
  main.tsx                         # System bootstrap (widgets / scheduler / push SW)
  core/
    registry.tsx                   # Auto-scan and register appsrc/apps/*/index.ts
    systemScheduler.ts             # System task scheduler
    push/webPush.ts                # Web Push capability and server sync
    storage.ts                     # IndexedDB storage abstraction
    stores/                        # Core settings / desktop stores
  components/
    HtmlRuntimeApp.tsx             # Runtime HTML app container (iframe srcDoc)
  appsrc/
    apps/                          # Business apps (manifest + UI + store)
    shared/business/               # Cross-app business bridges and domain logic
public/
  service-worker.js                # Push and notification click handling
scripts/
  check-boundaries.mjs             # Architecture boundary checks
```

## Built-in Apps

Current app folders under `src/appsrc/apps`:

- `appmarket`
- `contacts`
- `dailyscript`
- `dailywords`
- `dreammusic`
- `lovespace`
- `memorycenter`
- `phoneinspector`
- `scheduler`
- `seller`
- `settings`
- `shopping`
- `storage`
- `template`
- `warmtrack`
- `weather`
- `WeChat` (manifest id is `wechat`)
- `worldbook`

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`, then set at least the following as needed:

- `VITE_PUSH_SERVER_BASE_URL`: Web Push backend base URL.
- `VITE_DREAM_MUSIC_API_BASE`: optional DreamMusic gateway base URL (falls back to default relative/public endpoints when unset).
- `GEMINI_API_KEY`: injected to `process.env.GEMINI_API_KEY` at build time (AI Studio compatibility scenario).

### 3. Run locally

```bash
npm run dev
```

### 4. Build and preview

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev`: local dev server (`0.0.0.0:3000`).
- `npm run build`: Vite production build.
- `npm run preview`: preview built assets.
- `npm run lint`: type check + boundary check.
- `npm run lint:types`: TypeScript check.
- `npm run lint:boundaries`: architecture boundary check (prevents invalid cross-layer imports).

## Build and Deployment Notes

- Build output directory is `dist`.
- `vite-plugin-singlefile` is enabled; main bundle is aggressively inlined.
- `service-worker.js` is emitted during build via a Vite plugin.
- Web Push requires HTTPS (or localhost) and Service Worker support.

When deploying, ensure:

- `dist/index.html` and `dist/service-worker.js` are accessible from the same origin root.
- If the site is deployed under a sub-path (not `/`), review and adjust SW registration path and routing behavior.

## Web Push Backend Contract

The frontend expects these endpoints (see `src/core/push/webPush.ts`):

- `GET /api/push/vapid-public-key`: returns `{ publicKey }`
- `POST /api/push/subscriptions`: upsert subscription (`userId`, `deviceId`, `appId`, `subscription`)
- `DELETE /api/push/subscriptions`: remove by `endpoint`
- `POST /api/push/test`: send a test push, returns `{ eventId }`

Notes:

- This repo does not include the Push backend implementation; deploy it separately.
- `public/service-worker.js` handles `push` and `notificationclick`.

## Development Conventions

- New apps are auto-registered by exporting a manifest from `src/appsrc/apps/<appId>/index.ts`.
- `src/core` must not directly depend on `src/appsrc/apps`.
- `src/appsrc/shared/business` must not depend on concrete app implementations.
- Use `npm run lint:boundaries` to enforce the above rules in CI.

## Key References

- Auto app registry: `src/core/registry.tsx`
- Scheduler bootstrap: `src/main.tsx` + `src/core/systemScheduler.ts`
- App Market runtime: `src/components/HtmlRuntimeApp.tsx` + `src/appsrc/apps/appmarket/runtime.ts`
- Storage abstraction: `src/core/storage.ts`
- Push stack: `src/core/push/webPush.ts` + `public/service-worker.js`
