import type { ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { AppManifest } from '@baobaobaiOS/sdk';
import type { StorageCategory } from './types';

export const STORAGE_CAPACITY_BYTES = 300 * 1024 * 1024 * 1024;

const iconMap = LucideIcons as Record<string, unknown>;

const isElementType = (value: unknown): value is ElementType => {
  return (
    typeof value === 'string' ||
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
};

const palette: Array<{ accent: string; muted: string }> = [
  { accent: 'text-emerald-600', muted: 'bg-emerald-50' },
  { accent: 'text-orange-500', muted: 'bg-orange-50' },
  { accent: 'text-sky-600', muted: 'bg-sky-50' },
  { accent: 'text-indigo-600', muted: 'bg-indigo-50' },
  { accent: 'text-rose-600', muted: 'bg-rose-50' },
  { accent: 'text-slate-600', muted: 'bg-slate-100' },
];

const resolveIcon = (iconName: string | undefined): ElementType => {
  if (!iconName) return LucideIcons.Database;
  const candidate = iconMap[iconName];
  if (isElementType(candidate)) return candidate;
  return LucideIcons.Database;
};

const appModules = import.meta.glob(['../*/index.ts', '!../storage/index.ts'], { eager: true });
const allAppManifests = Object.values(appModules)
  .map((mod) => (mod as { default: AppManifest }).default)
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
const appManifests = allAppManifests.filter((app) => !app.isSystem);

export const CATEGORY_DEFINITIONS: StorageCategory[] = [
  ...appManifests.map((app, index) => {
    const paletteItem = palette[index % palette.length];
    return {
      id: app.id,
      name: app.name,
      accent: paletteItem.accent,
      muted: paletteItem.muted,
      Icon: resolveIcon(app.icon),
      description: app.description ?? '应用数据',
    } satisfies StorageCategory;
  }),
  {
    id: 'misc',
    name: '其他数据',
    accent: 'text-indigo-600',
    muted: 'bg-indigo-50',
    Icon: LucideIcons.Database,
    description: '未识别的数据源',
  },
];

export const STORAGE_APP_MANIFESTS = allAppManifests;
