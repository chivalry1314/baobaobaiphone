export const SYSTEM_APP_IDS = [
  'appmarket',
  'contacts',
  'phoneinspector',
  'settings',
  'scheduler',
  'storage',
  'worldbook',
  'memorycenter',
  'delivery',
] as const;

const systemAppIdSet = new Set<string>(SYSTEM_APP_IDS);

export const isSystemAppId = (appId: string): boolean => systemAppIdSet.has(appId);
