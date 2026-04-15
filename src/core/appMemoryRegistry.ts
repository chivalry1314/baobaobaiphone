import type { AppMemoryRecord, AppMemorySpace } from './appMemory';

export interface AppMemoryModule<TRecord extends AppMemoryRecord = AppMemoryRecord> {
  appId: string;
  defaultSpace?: AppMemorySpace;
  resolveContactName?: (contactId: string) => string;
  resolveSourceLabel?: (record: TRecord) => string | undefined;
}

type AppMemoryModuleExport = {
  default?: AppMemoryModule;
  appMemoryModule?: AppMemoryModule;
};

const isAppMemoryModule = (value: unknown): value is AppMemoryModule => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppMemoryModule>;
  return typeof candidate.appId === 'string';
};

const resolveModuleFromExport = (
  mod: AppMemoryModuleExport | undefined
): AppMemoryModule | null => {
  if (!mod) return null;

  const defaultExport = mod.default;
  if (isAppMemoryModule(defaultExport)) return defaultExport;

  const namedExport = mod.appMemoryModule;
  if (isAppMemoryModule(namedExport)) return namedExport;

  return null;
};

const collectAppMemoryModules = (): AppMemoryModule[] => {
  const dedicatedModuleExports = import.meta.glob('../appsrc/apps/*/memoryModule.ts', {
    eager: true,
  }) as Record<string, AppMemoryModuleExport>;
  const moduleByAppId = new Map<string, AppMemoryModule>();

  Object.entries(dedicatedModuleExports).forEach(([, mod]) => {
    const appModule = resolveModuleFromExport(mod);
    if (!appModule) return;
    moduleByAppId.set(appModule.appId, appModule);
  });

  return [...moduleByAppId.values()].sort((left, right) =>
    left.appId.localeCompare(right.appId, 'en')
  );
};

let allAppMemoryModules: AppMemoryModule[] = collectAppMemoryModules();

export const reloadAppMemoryModules = (): void => {
  allAppMemoryModules = collectAppMemoryModules();
};

export const getRegisteredAppMemoryModules = (): AppMemoryModule[] => allAppMemoryModules;

export const getAppMemoryModule = (appId: string): AppMemoryModule | undefined =>
  allAppMemoryModules.find((item) => item.appId === appId);
