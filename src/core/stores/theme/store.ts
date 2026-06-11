import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { upsertCustomWidgetLibraryItems } from '../../customWidgetLibrary';
import type { DesktopLayoutConfig } from '../types';
import { defaultDesktopLayout, useDesktopCoreStore } from '../desktop/store';
import { useSettingsCoreStore } from '../settings/store';
import { defaultSettings } from '../settings/store';
import { BUILTIN_THEME_CATALOG } from '../../theme/presetThemes';
import {
  extractThemeManagedSettings,
  slugifyThemeId,
  type ThemeDefinition,
  type ThemeSettingsPatch,
} from '../../theme/types';
import { createThemePersistOptions } from './storePersistRepo';

const BUILTIN_THEME_ID_SET = new Set(BUILTIN_THEME_CATALOG.map((theme) => theme.id));
const DEFAULT_THEME_MANAGED_SETTINGS = extractThemeManagedSettings(defaultSettings);
type UploadedThemeDefinition = ThemeDefinition & { source: 'imported' };

const cloneDesktopLayout = (layout: DesktopLayoutConfig): DesktopLayoutConfig => ({
  rows: layout.rows,
  cols: layout.cols,
  pageCount: layout.pageCount,
  layoutMode: layout.layoutMode,
  items: (layout.items || []).map((item) => ({
    ...item,
    data: item.data ? { ...item.data } : undefined,
  })),
  customWidgets: (layout.customWidgets || []).map((widget) => ({
    ...widget,
    data: widget.data ? { ...widget.data } : undefined,
  })),
});

export interface ThemeStoreState {
  installedThemeIds: string[];
  uploadedThemes: UploadedThemeDefinition[];
  activeThemeId: string | null;
  previousManualSettings: ThemeSettingsPatch | null;
  previousManualDesktopLayout: DesktopLayoutConfig | null;
  installTheme: (themeId: string) => void;
  uninstallTheme: (themeId: string) => void;
  addUploadedTheme: (theme: ThemeDefinition) => ThemeDefinition;
  removeUploadedTheme: (themeId: string) => void;
  applyTheme: (themeId: string) => void;
  resetToDefaultTheme: () => void;
  detachFromTheme: () => void;
}

const findThemeById = (themeId: string, uploadedThemes: UploadedThemeDefinition[]): ThemeDefinition | null => {
  const builtin = BUILTIN_THEME_CATALOG.find((theme) => theme.id === themeId);
  if (builtin) return builtin;
  return uploadedThemes.find((theme) => theme.id === themeId) || null;
};

const ensureUniqueThemeId = (
  baseId: string,
  uploadedThemes: UploadedThemeDefinition[]
): string => {
  const normalizedBaseId = slugifyThemeId(baseId);
  const usedIds = new Set([
    ...BUILTIN_THEME_CATALOG.map((theme) => theme.id),
    ...uploadedThemes.map((theme) => theme.id),
  ]);

  if (!usedIds.has(normalizedBaseId)) return normalizedBaseId;

  let suffix = 2;
  let nextId = `${normalizedBaseId}-${suffix}`;
  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${normalizedBaseId}-${suffix}`;
  }
  return nextId;
};

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      installedThemeIds: [],
      uploadedThemes: [],
      activeThemeId: null,
      previousManualSettings: null,
      previousManualDesktopLayout: null,

      installTheme: (themeId) => {
        const normalizedId = themeId.trim();
        if (!normalizedId) return;
        set((state) => (
          state.installedThemeIds.includes(normalizedId)
            ? state
            : { installedThemeIds: [...state.installedThemeIds, normalizedId] }
        ));
      },

      uninstallTheme: (themeId) => {
        const normalizedId = themeId.trim();
        if (!normalizedId) return;

        if (get().activeThemeId === normalizedId) {
          get().resetToDefaultTheme();
        }

        set((state) => ({
          installedThemeIds: state.installedThemeIds.filter((id) => id !== normalizedId),
        }));
      },

      addUploadedTheme: (theme) => {
        const normalizedTheme = {
          ...theme,
          id: slugifyThemeId(theme.id || theme.name),
          source: 'imported' as const,
        };

        let storedTheme: UploadedThemeDefinition = normalizedTheme;
        set((state) => {
          const sameThemeIndex = state.uploadedThemes.findIndex(
            (item) => item.id === normalizedTheme.id
          );

          if (sameThemeIndex >= 0) {
            const nextThemes = [...state.uploadedThemes];
            nextThemes[sameThemeIndex] = {
              ...normalizedTheme,
              importedAt: normalizedTheme.importedAt || Date.now(),
            };
            storedTheme = nextThemes[sameThemeIndex];
            return {
              uploadedThemes: nextThemes,
              installedThemeIds: state.installedThemeIds.includes(storedTheme.id)
                ? state.installedThemeIds
                : [...state.installedThemeIds, storedTheme.id],
            };
          }

          const uniqueId = ensureUniqueThemeId(normalizedTheme.id, state.uploadedThemes);
          storedTheme = {
            ...normalizedTheme,
            id: uniqueId,
            importedAt: normalizedTheme.importedAt || Date.now(),
          };

          return {
            uploadedThemes: [storedTheme, ...state.uploadedThemes],
            installedThemeIds: state.installedThemeIds.includes(uniqueId)
              ? state.installedThemeIds
              : [...state.installedThemeIds, uniqueId],
          };
        });

        return storedTheme;
      },

      removeUploadedTheme: (themeId) => {
        const normalizedId = themeId.trim();
        if (!normalizedId) return;

        const state = get();
        const targetTheme = state.uploadedThemes.find((theme) => theme.id === normalizedId);
        if (!targetTheme) {
          if (!BUILTIN_THEME_ID_SET.has(normalizedId)) return;
          get().uninstallTheme(normalizedId);
          return;
        }

        const wasActive = state.activeThemeId === normalizedId;
        const previousManualSettings = state.previousManualSettings;
        const previousManualDesktopLayout = state.previousManualDesktopLayout;
        if (wasActive && previousManualSettings) {
          useSettingsCoreStore.getState().updateSettings(previousManualSettings);
        }
        if (wasActive && previousManualDesktopLayout) {
          useDesktopCoreStore.getState().updateDesktopLayout(cloneDesktopLayout(previousManualDesktopLayout));
        }

        set((currentState) => ({
          uploadedThemes: currentState.uploadedThemes.filter((theme) => theme.id !== normalizedId),
          installedThemeIds: currentState.installedThemeIds.filter((id) => id !== normalizedId),
          activeThemeId:
            currentState.activeThemeId === normalizedId ? null : currentState.activeThemeId,
          previousManualSettings:
            currentState.activeThemeId === normalizedId
              ? null
              : currentState.previousManualSettings,
          previousManualDesktopLayout:
            currentState.activeThemeId === normalizedId
              ? null
              : currentState.previousManualDesktopLayout,
        }));
      },

      applyTheme: (themeId) => {
        const normalizedId = themeId.trim();
        if (!normalizedId) return;

        const theme = findThemeById(normalizedId, get().uploadedThemes);
        if (!theme) return;

        const settingsStore = useSettingsCoreStore.getState();
        const desktopStore = useDesktopCoreStore.getState();
        const activeThemeId = get().activeThemeId;
        const manualSnapshot =
          activeThemeId === null
            ? extractThemeManagedSettings(settingsStore.settings)
            : get().previousManualSettings || extractThemeManagedSettings(settingsStore.settings);
        const manualDesktopLayoutSnapshot =
          activeThemeId === null
            ? cloneDesktopLayout(desktopStore.desktopLayout)
            : get().previousManualDesktopLayout || cloneDesktopLayout(desktopStore.desktopLayout);

        settingsStore.updateSettings(theme.settingsPatch);
        if (theme.desktopLayout) {
          upsertCustomWidgetLibraryItems(theme.desktopLayout.customWidgets || []);
          desktopStore.updateDesktopLayout(cloneDesktopLayout(theme.desktopLayout));
        }
        set((state) => ({
          activeThemeId: normalizedId,
          previousManualSettings: manualSnapshot,
          previousManualDesktopLayout: manualDesktopLayoutSnapshot,
          installedThemeIds: state.installedThemeIds.includes(normalizedId)
            ? state.installedThemeIds
            : [...state.installedThemeIds, normalizedId],
        }));
      },

      resetToDefaultTheme: () => {
        useSettingsCoreStore.getState().updateSettings(DEFAULT_THEME_MANAGED_SETTINGS);
        useDesktopCoreStore.getState().updateDesktopLayout(
          cloneDesktopLayout(defaultDesktopLayout)
        );

        set({
          activeThemeId: null,
          previousManualSettings: null,
          previousManualDesktopLayout: null,
        });
      },

      detachFromTheme: () => {
        set({
          activeThemeId: null,
          previousManualSettings: null,
          previousManualDesktopLayout: null,
        });
      },
    }),
    createThemePersistOptions<ThemeStoreState>()
  )
);
