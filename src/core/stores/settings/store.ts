import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GlobalSettings } from '../types';
import { createSettingsPersistOptions } from './storePersistRepo';

export interface SettingsStoreState {
  settings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
}

export const defaultSettings: GlobalSettings = {
  chatProvider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  memoryApiKey: '',
  memoryBaseUrl: '',
  memoryModel: '',
  memoryAutoSummaryThreshold: 120,
  memoryAutoSummaryMaxRounds: 2,
  memoryAutoSummaryMinBatch: 8,
  memoryAutoSummaryMaxBatch: 60,
  memoryAutoSummaryKeepRecentMin: 6,
  memoryAutoSummaryKeepRecentRatio: 0.5,
  imageApiKey: '',
  imageBaseUrl: 'https://api.openai.com/v1',
  imageModel: 'gpt-image-1',
  imageSize: '1024x1024',
  temperature: 0.7,
  maxTokens: 2000,
  voiceProvider: 'none',
  voiceApiKey: '',
  voiceBaseUrl: 'https://api.minimaxi.com',
  voiceModel: 'speech-2.8-hd',
  voiceVoiceId: 'male-qn-qingse',
  voiceMinimaxGroupId: '',
  voiceAutoPlay: true,
  pushEnabled: false,
  pushServerBaseUrl: '',
  pushUserId: '',
  pushDeviceId: '',
  pushLastEndpoint: null,
  pushLastSyncedAt: null,
  fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  customFontData: null,
  customFontName: null,
  customFontFormat: null,
  wallpaper: null,
  wallpaperOpacity: 80,
  customIcons: {},
  iconSize: 60,
  iconRadius: 18,
  iconFrosted: 10,
  iconShadow: 8,
  showAppName: true,
};

const normalizeSettings = (candidate?: Partial<GlobalSettings>): GlobalSettings => ({
  ...defaultSettings,
  ...(candidate ?? {}),
});

export const useSettingsCoreStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({ settings: normalizeSettings({ ...state.settings, ...newSettings }) })),
    }),
    createSettingsPersistOptions<SettingsStoreState>({
      merge: (persistedState, currentState) => {
        const nextState = (persistedState ?? {}) as Partial<SettingsStoreState>;
        return {
          ...currentState,
          ...nextState,
          settings: normalizeSettings(nextState.settings),
        };
      },
    })
  )
);
