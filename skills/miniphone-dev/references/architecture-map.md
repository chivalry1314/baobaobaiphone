# baobaobaiphone Architecture Map

## Core Shell
- `src/App.tsx`: phone shell, desktop grid, active app rendering, runtime app mounting.
- `src/main.tsx`: system boot, widget init, scheduler init.

## Registration and SDK
- `src/core/registry.tsx`: app auto-discovery from `src/appsrc/apps/*/index.ts`, remote app hooks.
- `src/core/sdk/types.ts`: `AppManifest`, global settings types, system permission types.
- `src/core/sdk/storeHooks.ts`: SDK-level global selectors (`useGlobalSettingsStore`, `useGlobalDesktopStore`, `useGlobalWorldBookStore`).
- `src/core/systemApps.ts`: system app IDs (always-installed apps).

## Global State and Storage
- `src/core/stores/settings/store.ts`: global settings core store.
- `src/core/stores/desktop/store.ts`: desktop layout core store.
- `src/appsrc/apps/worldbook/data/coreStore.ts`: world book core store (registered via `src/appsrc/apps/worldbook/index.ts`).
- `src/core/persistOptions.ts`: app/core persist option helpers.
- `src/core/storage.ts`: IndexedDB adapters and storage key helpers.
- `src/appsrc/apps/WeChat/data/repositories/storePersistRepo.ts`: role-scoped persistence stored in `role_states` object store (key=`roleId`), while active role is resolved from contacts role context at runtime.

## App Layer and Shared Domain
- `src/appsrc/apps/*`: local bundled apps (each app owns manifest + UI + state).
- `src/appsrc/shared/business/*`: cross-app shared business domain (preferred over cross-app deep imports).

## App Market and Runtime HTML Apps
- `src/appsrc/apps/appmarket/types.ts`: market data contracts.
- `src/appsrc/apps/appmarket/store.ts`: installed app IDs plus uploaded HTML app hydration/actions.
- `src/appsrc/apps/appmarket/runtime.ts`: runtime app resolution from installed IDs.
- `src/components/HtmlRuntimeApp.tsx`: iframe-based runtime HTML app host.

## Memory System
- `src/core/appMemoryCenter.ts`: cross-app memory store plus auto-summary.
- `src/core/appMemoryRegistry.ts`: memory module discovery from `src/appsrc/apps/*/memoryModule.ts`.
- `src/appsrc/apps/memorycenter/MemoryCenterApp.tsx`: Memory Center UI.
- `src/appsrc/apps/WeChat/memoryModule.ts`: concrete module example for labels.

## High-Traffic AI Integrations
- `src/appsrc/apps/WeChat/components/WeChatChatView.tsx`: chat completion requests.
- `src/appsrc/apps/settings/components/ApiSettingsView.tsx`: provider config and API probe calls.
- `src/appsrc/shared/business/commerce/messageBridge.ts`: AI-assisted seller messaging.

## Common Tasks and Entry Files
- Add a local app: `src/appsrc/apps/<appId>/index.ts` plus `<AppName>App.tsx` plus optional `store.ts`.
- Add persistent state: prefer `createAppPersistOptions({ appId: '<appId>' })` from `src/core/persistOptions`.
- Add memory labels: `src/appsrc/apps/<appId>/memoryModule.ts` with `appId` and resolvers.
- Add installable market metadata: manifest `market` block in app `index.ts`.

## Boundary Rules (Enforced)
- `npm run lint` includes boundary checks (`scripts/check-boundaries.mjs`).
- `src/core/**` must not import `src/appsrc/apps/**`.
- `src/appsrc/shared/business/**` must not import `src/appsrc/apps/**`.
- New cross-app direct imports are blocked unless explicitly allowlisted.

