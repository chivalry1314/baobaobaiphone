import type { WechatThemeDefinition } from './onlineThemeTypes';

const STORAGE_KEY = 'baobaobai-wechat-installed-themes';
const CHANGE_EVENT = 'baobaobai-wechat-theme-library-change';

type InstalledWechatThemeLibrary = {
  themes: WechatThemeDefinition[];
  activeThemeId: string;
};

const readLibrary = (): InstalledWechatThemeLibrary => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { themes: [], activeThemeId: '' };
    const parsed = JSON.parse(raw) as InstalledWechatThemeLibrary;
    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      activeThemeId: typeof parsed.activeThemeId === 'string' ? parsed.activeThemeId : '',
    };
  } catch {
    return { themes: [], activeThemeId: '' };
  }
};

const writeLibrary = (library: InstalledWechatThemeLibrary): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

export const getInstalledWechatThemes = (): WechatThemeDefinition[] => readLibrary().themes;

export const getActiveWechatThemeId = (): string => readLibrary().activeThemeId;

export const upsertInstalledWechatTheme = (theme: WechatThemeDefinition): void => {
  const library = readLibrary();
  const index = library.themes.findIndex(
    (item) => item.id === theme.id || (item.name === theme.name && item.source === theme.source)
  );
  const nextThemes =
    index >= 0
      ? library.themes.map((item, itemIndex) => (itemIndex === index ? theme : item))
      : [...library.themes, theme];
  writeLibrary({ ...library, themes: nextThemes });
};

export const setActiveWechatThemeId = (themeId: string): void => {
  const library = readLibrary();
  writeLibrary({ ...library, activeThemeId: themeId });
};

export const removeInstalledWechatTheme = (themeId: string): void => {
  const library = readLibrary();
  const nextThemes = library.themes.filter((item) => item.id !== themeId);
  const nextActive = library.activeThemeId === themeId ? '' : library.activeThemeId;
  writeLibrary({ themes: nextThemes, activeThemeId: nextActive });
};

export const subscribeWechatThemeLibrary = (callback: () => void): (() => void) => {
  const handler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handler);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
};
