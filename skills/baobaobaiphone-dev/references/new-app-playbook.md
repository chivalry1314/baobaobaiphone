# New App Playbook

## Goal
Create a local baobaobaiphone app that is auto-discovered by registry and follows existing conventions.

## Fastest Command
Run from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File skills/baobaobaiphone-dev/scripts/new-baobaobaiphone-app.ps1 -AppId my-app -Name "My App" -IncludeStore
```

Optional flags:
- `-IncludeMemoryModule`: add `memoryModule.ts` for Memory Center integration.
- `-Force`: overwrite existing `src/appsrc/apps/<appId>`.
- `-Icon`, `-Color`, `-Description`, `-MarketIcon`: customize manifest defaults.

## Generated Files
- `src/appsrc/apps/<appId>/index.ts`
- `src/appsrc/apps/<appId>/<PascalAppName>App.tsx`
- `src/appsrc/apps/<appId>/types.ts`
- `src/appsrc/apps/<appId>/store.ts` (if `-IncludeStore`)
- `src/appsrc/apps/<appId>/memoryModule.ts` (if `-IncludeMemoryModule`)

## Manual Follow-Up Checklist
1. Confirm manifest values in `index.ts`.
2. Implement feature UI and business logic in `<PascalAppName>App.tsx`.
3. If state is needed, keep app-local store in `store.ts`.
4. If app is installable via market, keep `market` block and metadata updated.
5. If app should be non-removable, update `src/core/systemApps.ts` only after confirmation.
6. Avoid direct cross-app imports; move reusable logic into `src/appsrc/shared/business/**`.

## Runtime HTML vs Local App
Use runtime HTML app flow when:
- You need quick prototype upload and iframe run.

Use local app (`src/appsrc/apps/<appId>`) when:
- You need typed state, deep integrations, reusable in-repo evolution, or memory hooks.

## Validation
- Run `npm run lint`.
- Launch and close app in the phone shell.
- If changed appmarket/runtime, verify install/uninstall sync.
- If memory module added, verify Memory Center labels and grouping.
