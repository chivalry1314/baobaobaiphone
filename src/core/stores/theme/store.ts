import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface ThemeStoreState {
  installedThemeIds: string[];
  uploadedThemes: ThemeDefinition[];
  activeThemeId: string | null;
  previousManualSettings: ThemeSettingsPatch | null;
  installTheme: (themeId: string) => void;
  uninstallTheme: (themeId: string) => void;
  addUploadedTheme: (theme: ThemeDefinition) => ThemeDefinition;
  removeUploadedTheme: (themeId: string) => void;
  applyTheme: (themeId: string) => void;
  resetToDefaultTheme: () => void;
  detachFromTheme: () => void;
}

const findThemeById = (themeId: string, uploadedThemes: ThemeDefinition[]): ThemeDefinition | null => {
  const builtin = BUILTIN_THEME_CATALOG.find((theme) => theme.id === themeId);
  if (builtin) return builtin;
  return uploadedThemes.find((theme) => theme.id === themeId) || null;
};

const ensureUniqueThemeId = (
  baseId: string,
  uploadedThemes: ThemeDefinition[]
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

        let storedTheme = normalizedTheme;
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
        if (wasActive && previousManualSettings) {
          useSettingsCoreStore.getState().updateSettings(previousManualSettings);
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
        }));
      },

      applyTheme: (themeId) => {
        const normalizedId = themeId.trim();
        if (!normalizedId) return;

        const theme = findThemeById(normalizedId, get().uploadedThemes);
        if (!theme) return;

        const settingsStore = useSettingsCoreStore.getState();
        const activeThemeId = get().activeThemeId;
        const manualSnapshot =
          activeThemeId === null
            ? extractThemeManagedSettings(settingsStore.settings)
            : get().previousManualSettings || extractThemeManagedSettings(settingsStore.settings);

        settingsStore.updateSettings(theme.settingsPatch);
        set((state) => ({
          activeThemeId: normalizedId,
          previousManualSettings: manualSnapshot,
          installedThemeIds: state.installedThemeIds.includes(normalizedId)
            ? state.installedThemeIds
            : [...state.installedThemeIds, normalizedId],
        }));
      },

      resetToDefaultTheme: () => {
        useSettingsCoreStore.getState().updateSettings(DEFAULT_THEME_MANAGED_SETTINGS);

        set({
          activeThemeId: null,
          previousManualSettings: null,
        });
      },

      detachFromTheme: () => {
        set({
          activeThemeId: null,
          previousManualSettings: null,
        });
      },
    }),
    createThemePersistOptions<ThemeStoreState>()
  )
);
