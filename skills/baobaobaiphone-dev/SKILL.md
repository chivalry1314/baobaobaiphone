---
name: baobaobaiphone-dev
description: Build and maintain the baobaobaiphone React/Vite app ecosystem. Use when adding or updating apps in src/appsrc/apps, wiring AppManifest and registration behavior, integrating app memory modules, extending app market runtime HTML apps, aligning bottom navigation and bottom action bars, stabilizing keyboard/form layouts, or troubleshooting baobaobaiphone app launch, settings, keyboard/composer, and model API flows.
---

# baobaobaiphone Dev

## Overview
Implement features in baobaobaiphone by following existing architecture and conventions instead of introducing new frameworks or parallel patterns.

## Fast Path
1. From repo root, scaffold a new app when the request is "create a new baobaobaiphone app":
`powershell -ExecutionPolicy Bypass -File skills/baobaobaiphone-dev/scripts/new-baobaobaiphone-app.ps1 -AppId my-app -Name "My App" -IncludeStore`
2. Open generated files under `src/appsrc/apps/<appId>/` and apply requested feature-specific edits.
3. Run `npm run lint` and report results.
4. Read references before broad edits:
- `references/architecture-map.md`
- `references/new-app-playbook.md`
- `../../design/code/bottom-nav-layout.md` when touching app bottom navs, bottom action bars, form editors, keyboard/composer spacing, or any page with fixed header/footer + input fields

## Quick Intake
1. Identify the target surface before editing:
- Local bundled app: files under `src/appsrc/apps/<appId>/`.
- Shared cross-app domain: `src/appsrc/shared/business/**`.
- Runtime market app flow: `src/appsrc/apps/appmarket/` and `src/components/HtmlRuntimeApp.tsx`.
- System/core behavior: `src/core/*` and `src/App.tsx`.
2. Confirm whether the app should be removable or system-level.
3. Read `references/architecture-map.md` for file routing before large edits.

## Local App Workflow
1. Add or update `src/appsrc/apps/<appId>/index.ts` with a default-exported `AppManifest`.
2. Keep manifest minimal and consistent:
- Required: `id`, `name`, `icon`, `component`.
- Optional: `description`, `version`, `market`, `permissions`, `isSystem`.
3. Prefer `scripts/new-baobaobaiphone-app.ps1` for first-pass scaffolding, then refine manually.
4. Add UI entry component (`<AppName>App.tsx`) and app-local state only if needed.
5. For persistent app state, prefer `createAppPersistOptions({ appId: '<appId>' })` from `src/core/persistOptions`.
6. For role-scoped state (WeChat/WarmTrack pattern), prefer app-local repository + dedicated IDB object store (for example `role_states`) keyed by `roleId`, instead of prefixing keys in one store.
7. Active role should come from contacts role context; do not treat app-local persisted `activeRoleId` as the long-term source of truth.
8. Do not manually add local app imports to a global list; registry auto-discovers via `import.meta.glob('../appsrc/apps/*/index.ts', { eager: true })`.
9. Add to `SYSTEM_APP_IDS` only when the app must be always-installed and non-removable.
10. Keep app boundary clean: avoid new cross-app imports; move reusable logic into `src/appsrc/shared/business/**` if needed.

## New App Decision Flow
1. If user wants a brand-new local app, run scaffold script with `-IncludeStore` unless explicitly unnecessary.
2. If user wants Memory Center label integration, add `-IncludeMemoryModule`.
3. If app is internal/system-level, confirm before marking `isSystem`.
4. If request is only a runtime HTML app, do not scaffold `src/appsrc/apps/<appId>`; route through appmarket runtime flow.

## Runtime HTML Decision Flow
1. For quick prototype apps shipped as HTML snippets/files, use appmarket uploaded app flow.
2. For apps needing deep system integration, typed store, or rich in-repo evolution, build local app under `src/appsrc/apps/<appId>`.
3. Keep runtime app IDs aligned with `online-` and `offline-` conventions when they are managed by market runtime mapping.

## AppMarket Runtime Workflow
1. Use appmarket store/types/runtime modules when dealing with install/uninstall and uploaded HTML.
2. Keep runtime app IDs aligned with existing conventions (`online-` / `offline-`) when participating in market runtime mapping.
3. Remember runtime apps open inside iframe `srcDoc`; test close behavior and desktop icon sync.
4. Prefer small, self-contained HTML runtime payloads and avoid assumptions about external assets.

## Memory Integration Workflow
1. Use `createAppMemoryApi('<appId>')` for interaction memory capture and retrieval.
2. Provide `memoryModule.ts` when the app needs custom contact/source labels in Memory Center.
3. Respect memory scope semantics (`roleId`, `space`) and do not hardcode one identity in shared logic.
4. Keep summary/source labels stable; Memory Center uses them for filtering and display.

## Model/API Integration Rules
1. Read API settings from `useGlobalSettingsStore((state) => state.settings)` or `getGlobalSettingsSnapshot()` via `@baobaobaiOS/sdk`.
2. Build OpenAI-compatible requests against configured `baseUrl` and `apiKey`.
3. Keep endpoint usage consistent with existing code paths:
- `/models`
- `/chat/completions`
- `/images/generations`
4. Gracefully handle missing keys, network failures, and non-OK responses.
5. Do not introduce new provider-specific SDKs unless explicitly requested.

## Bottom Navigation And Footer Rules
1. When requests mention “和微信底部导航一致”, “往上挪一点”, “底部不要留空”, or keyboard/composer bottom spacing, read `../../design/code/bottom-nav-layout.md` first.
2. Default standard tab bars and docks should align to the WeChat main-nav baseline: prefer `pb-safe`; for absolute/fixed bars use `bottom: 0` on the container and add `pb-safe` from JSX instead of stacking `env(...)` in multiple places.
3. Default raised action footers such as save/cancel, publish, and edit toolbars should use `calc(env(safe-area-inset-bottom, 0px) + 12px)`. Treat legacy `safe-area-bottom-action` / `+32px` as opt-in only when the user explicitly wants a higher resting position or the page must preserve old visuals.
4. Dense form editors must use `flex-col + overflow-hidden`, with only the middle content region scrolling (`flex-1 min-h-0 overflow-y-auto`).
5. If text-entry focus would crowd the footer or make the page feel cramped, hide the footer while text inputs are focused via `useKeyboardTextEntryActive(...)`.
6. If iOS input focus makes the whole page jump, stop following `visualViewport` for that page or editor state via `useMobileViewportPageStyle(false)` or a conditional variant.
7. Chat/composer bars should keep `pb-safe` when idle and switch to `pb-0` when the keyboard is visible so the composer stays flush with the keyboard.
8. Scroll areas must reserve footer height plus safe area, otherwise the last rows will be covered.
9. Editing pages should default to the standard structure: fixed `header` + middle-only scrolling `main` + fixed `footer`.
10. Form editors must wire `useKeyboardViewportStabilizer(...)` to the middle scroll container and keep the focused input inside that scroll region during focus and keyboard viewport changes, so the header does not get pushed upward.
11. Prefer the repo-standard implementation: keep scroll targeting in `src/core/mobileViewport.ts`, then add `onFocusCapture` on the page scroll container so focus triggers several follow-up alignments while the keyboard animation settles.
12. The goal is not merely to expose part of the field. On focus, form editors should keep nudging the focused input toward the top visible region so it is fully readable instead of half-covered near the keyboard.
13. While the keyboard is open, the middle form scroll area must still be manually scrollable downward. Preserve enough bottom padding and vertical touch scrolling behavior on the scroll container so later fields remain reachable.

## Validation Checklist
1. Run `npm run lint` after code changes.
2. If touched appmarket/runtime flows, verify install, launch, and uninstall behavior.
3. If touched memory flows, verify Memory Center rendering and record grouping.
4. If touched cross-app/shared boundaries, ensure `lint:boundaries` passes (it is included in `npm run lint`).
5. Report any checks that were not run.

## Output Style For This Skill
1. Lead with changed files and behavior impact.
2. Call out risks when editing `src/App.tsx`, `src/core/registry.tsx`, or memory center core logic.
3. Prefer small, architecture-aligned patches over broad refactors.


## Role Context Guardrail
1. Treat `runtimeRoleId` as inspector/read-only override only; normal mode must rely on stored active my-card role.
2. If touched role switching (`setActiveMyCard`) or role runtime logic, ensure stale runtime override is cleared.
3. Keep WeChat and Memory Center role resolution consistent:
- inspector mode: `runtimeRoleId || storedActiveRoleId`
- normal mode: `storedActiveRoleId`
4. Add regression checks after role-context changes:
- switch my-card and re-open WeChat/Memory Center
- verify role-scoped content updates immediately without hard refresh.
