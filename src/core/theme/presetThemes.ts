import type { ThemeDefinition } from './types';

const svgToDataUrl = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const createWallpaper = (colors: {
  top: string;
  middle: string;
  bottom: string;
  glowA: string;
  glowB: string;
}): string =>
  svgToDataUrl(`
    <svg width="1440" height="3120" viewBox="0 0 1440 3120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colors.top}" />
          <stop offset="46%" stop-color="${colors.middle}" />
          <stop offset="100%" stop-color="${colors.bottom}" />
        </linearGradient>
        <radialGradient id="orbA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(360 720) rotate(48) scale(620 540)">
          <stop stop-color="${colors.glowA}" stop-opacity="0.92" />
          <stop offset="1" stop-color="${colors.glowA}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="orbB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1060 1860) rotate(12) scale(720 620)">
          <stop stop-color="${colors.glowB}" stop-opacity="0.78" />
          <stop offset="1" stop-color="${colors.glowB}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="3120" fill="url(#bg)" />
      <circle cx="360" cy="720" r="620" fill="url(#orbA)" />
      <circle cx="1060" cy="1860" r="720" fill="url(#orbB)" />
      <g opacity="0.72">
        <path d="M0 2460C180 2320 338 2266 474 2298C648 2338 756 2486 942 2486C1100 2486 1238 2368 1440 2268V3120H0V2460Z" fill="rgba(255,255,255,0.25)" />
        <path d="M0 2648C186 2542 320 2500 468 2526C632 2556 790 2718 972 2718C1148 2718 1266 2598 1440 2508V3120H0V2648Z" fill="rgba(255,255,255,0.15)" />
      </g>
    </svg>
  `);

const createCover = (title: string, subtitle: string, wallpaper: string): string =>
  svgToDataUrl(`
    <svg width="900" height="620" viewBox="0 0 900 620" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.86)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.46)" />
        </linearGradient>
      </defs>
      <image href="${wallpaper}" x="0" y="0" width="900" height="620" preserveAspectRatio="xMidYMid slice" />
      <rect x="44" y="44" width="812" height="532" rx="36" fill="url(#panel)" stroke="rgba(255,255,255,0.68)" />
      <text x="90" y="194" fill="#0F172A" font-size="62" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="90" y="246" fill="#334155" font-size="28" font-family="Arial, sans-serif">${subtitle}</text>
      <rect x="90" y="316" width="186" height="186" rx="44" fill="rgba(255,255,255,0.56)" />
      <rect x="306" y="316" width="186" height="186" rx="44" fill="rgba(255,255,255,0.36)" />
      <rect x="522" y="316" width="244" height="84" rx="30" fill="rgba(15,23,42,0.16)" />
      <rect x="522" y="418" width="180" height="50" rx="24" fill="rgba(255,255,255,0.46)" />
    </svg>
  `);

const createIcon = (label: string, background: string, foreground = '#FFFFFF'): string =>
  svgToDataUrl(`
    <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="64" fill="${background}" />
      <circle cx="128" cy="128" r="86" fill="rgba(255,255,255,0.14)" />
      <text x="128" y="154" text-anchor="middle" fill="${foreground}" font-size="88" font-family="Arial, sans-serif" font-weight="700">${label}</text>
    </svg>
  `);

const createIconPack = (palette: { primary: string; secondary: string; accent: string }) => ({
  settings: createIcon('S', palette.primary),
  contacts: createIcon('C', palette.secondary),
  wechat: createIcon('W', palette.accent),
  appmarket: createIcon('M', palette.primary),
  shopping: createIcon('B', palette.secondary),
  seller: createIcon('¥', palette.accent),
  warmtrack: createIcon('H', palette.primary),
  dreammusic: createIcon('♪', palette.secondary),
});

const mintWallpaper = createWallpaper({
  top: '#D8FFF1',
  middle: '#F3FFF9',
  bottom: '#E7FFF6',
  glowA: '#7DECC7',
  glowB: '#77D9FF',
});

const coralWallpaper = createWallpaper({
  top: '#FFD6CE',
  middle: '#FFF1EA',
  bottom: '#FFF7F2',
  glowA: '#FF9B8A',
  glowB: '#FFD57E',
});

const midnightWallpaper = createWallpaper({
  top: '#111827',
  middle: '#1F2937',
  bottom: '#0F172A',
  glowA: '#6EE7F9',
  glowB: '#8B5CF6',
});

export const BUILTIN_THEME_CATALOG: ThemeDefinition[] = [
  {
    id: 'mint-glass',
    name: '薄荷玻璃',
    author: 'baobaobaiOS',
    version: '1.0.0',
    description: '清透薄荷色的桌面外观，适合强调轻盈、明亮和玻璃拟态质感。',
    tags: ['玻璃', '清新', '桌面'],
    source: 'builtin',
    coverImage: createCover('薄荷玻璃', 'Mint glass desktop', mintWallpaper),
    previewImages: [mintWallpaper],
    sizeLabel: 'Built-in',
    tokens: {
      systemBg: '#dff9ef',
      surface: 'rgba(255,255,255,0.18)',
      surfaceStrong: 'rgba(255,255,255,0.36)',
      surfaceText: '#0f172a',
      mutedText: 'rgba(15,23,42,0.68)',
      border: 'rgba(255,255,255,0.52)',
      shadowColor: 'rgba(15,23,42,0.16)',
      accent: '#12b981',
      accentText: '#ffffff',
      accentSoft: 'rgba(16,185,129,0.14)',
      accentMuted: '#059669',
      danger: '#ef4444',
      dangerText: '#ffffff',
      dangerSoft: 'rgba(239,68,68,0.12)',
      glassBg: 'rgba(255,255,255,0.20)',
      glassBorder: 'rgba(255,255,255,0.34)',
      glassIconBg: 'rgba(255,255,255,0.26)',
      dockBg: 'rgba(255,255,255,0.24)',
      dockBorder: 'rgba(255,255,255,0.40)',
      iconBg: 'rgba(255,255,255,0.32)',
      iconBorder: 'rgba(255,255,255,0.56)',
      iconLabel: '#0f172a',
      iconGlyph: '#0f172a',
      iconShadowColor: 'rgba(15,23,42,0.12)',
      badgeBg: '#12b981',
      badgeText: '#ffffff',
      badgeRing: 'rgba(255,255,255,0.88)',
      statusFg: '#0f172a',
      statusMuted: 'rgba(15,23,42,0.76)',
      statusChipBg: 'rgba(255,255,255,0.30)',
      statusChipBorder: 'rgba(255,255,255,0.42)',
      statusBatteryBg: '#0f172a',
      statusBatteryCap: 'rgba(15,23,42,0.38)',
    },
    settingsPatch: {
      wallpaper: mintWallpaper,
      wallpaperOpacity: 90,
      fontFamily: '"Trebuchet MS", "PingFang SC", "Microsoft YaHei", sans-serif',
      iconSize: 60,
      iconRadius: 22,
      iconFrosted: 14,
      iconShadow: 10,
      showAppName: true,
      customIcons: createIconPack({
        primary: '#1FBF90',
        secondary: '#59B8FF',
        accent: '#0F766E',
      }),
    },
  },
  {
    id: 'sunset-coral',
    name: '落日珊瑚',
    author: 'baobaobaiOS',
    version: '1.0.0',
    description: '偏暖色的落日系主题，图标更圆润，适合偏生活化和温暖感的桌面。',
    tags: ['暖色', '生活感', '插画'],
    source: 'builtin',
    coverImage: createCover('落日珊瑚', 'Warm coral sunset', coralWallpaper),
    previewImages: [coralWallpaper],
    sizeLabel: 'Built-in',
    tokens: {
      systemBg: '#fff1ea',
      surface: 'rgba(255,248,244,0.24)',
      surfaceStrong: 'rgba(255,240,233,0.42)',
      surfaceText: '#4a1d16',
      mutedText: 'rgba(74,29,22,0.70)',
      border: 'rgba(255,255,255,0.52)',
      shadowColor: 'rgba(120,53,15,0.18)',
      accent: '#fb7185',
      accentText: '#ffffff',
      accentSoft: 'rgba(251,113,133,0.14)',
      accentMuted: '#e11d48',
      danger: '#dc2626',
      dangerText: '#ffffff',
      dangerSoft: 'rgba(220,38,38,0.12)',
      glassBg: 'rgba(255,247,242,0.22)',
      glassBorder: 'rgba(255,255,255,0.34)',
      glassIconBg: 'rgba(255,245,240,0.30)',
      dockBg: 'rgba(255,241,234,0.30)',
      dockBorder: 'rgba(255,255,255,0.42)',
      iconBg: 'rgba(255,248,244,0.34)',
      iconBorder: 'rgba(255,255,255,0.58)',
      iconLabel: '#4a1d16',
      iconGlyph: '#6b2417',
      iconShadowColor: 'rgba(127,29,29,0.16)',
      badgeBg: '#fb7185',
      badgeText: '#ffffff',
      badgeRing: 'rgba(255,255,255,0.9)',
      statusFg: '#4a1d16',
      statusMuted: 'rgba(74,29,22,0.74)',
      statusChipBg: 'rgba(255,248,244,0.32)',
      statusChipBorder: 'rgba(255,255,255,0.42)',
      statusBatteryBg: '#6b2417',
      statusBatteryCap: 'rgba(107,36,23,0.40)',
    },
    settingsPatch: {
      wallpaper: coralWallpaper,
      wallpaperOpacity: 94,
      fontFamily: '"Georgia", "Times New Roman", "PingFang SC", serif',
      iconSize: 62,
      iconRadius: 26,
      iconFrosted: 6,
      iconShadow: 12,
      showAppName: true,
      customIcons: createIconPack({
        primary: '#FF7D66',
        secondary: '#FFB14A',
        accent: '#D9485F',
      }),
    },
  },
  {
    id: 'midnight-neon',
    name: '霓虹夜航',
    author: 'baobaobaiOS',
    version: '1.0.0',
    description: '暗色夜景配合冷色霓虹发光，更适合需要强氛围感的主题陈列。',
    tags: ['夜色', '霓虹', '氛围'],
    source: 'builtin',
    coverImage: createCover('霓虹夜航', 'Midnight neon run', midnightWallpaper),
    previewImages: [midnightWallpaper],
    sizeLabel: 'Built-in',
    tokens: {
      systemBg: '#08111f',
      surface: 'rgba(8,15,30,0.42)',
      surfaceStrong: 'rgba(15,23,42,0.62)',
      surfaceText: '#e2e8f0',
      mutedText: 'rgba(226,232,240,0.74)',
      border: 'rgba(148,163,184,0.26)',
      shadowColor: 'rgba(2,6,23,0.46)',
      accent: '#38bdf8',
      accentText: '#082f49',
      accentSoft: 'rgba(56,189,248,0.16)',
      accentMuted: '#7dd3fc',
      danger: '#f43f5e',
      dangerText: '#ffffff',
      dangerSoft: 'rgba(244,63,94,0.16)',
      glassBg: 'rgba(15,23,42,0.34)',
      glassBorder: 'rgba(148,163,184,0.20)',
      glassIconBg: 'rgba(30,41,59,0.40)',
      dockBg: 'rgba(15,23,42,0.46)',
      dockBorder: 'rgba(96,165,250,0.22)',
      iconBg: 'rgba(15,23,42,0.46)',
      iconBorder: 'rgba(125,211,252,0.34)',
      iconLabel: '#e2e8f0',
      iconGlyph: '#f8fafc',
      iconShadowColor: 'rgba(2,6,23,0.34)',
      badgeBg: '#f43f5e',
      badgeText: '#ffffff',
      badgeRing: 'rgba(15,23,42,0.88)',
      statusFg: '#f8fafc',
      statusMuted: 'rgba(226,232,240,0.78)',
      statusChipBg: 'rgba(15,23,42,0.52)',
      statusChipBorder: 'rgba(148,163,184,0.26)',
      statusBatteryBg: '#f8fafc',
      statusBatteryCap: 'rgba(226,232,240,0.46)',
    },
    settingsPatch: {
      wallpaper: midnightWallpaper,
      wallpaperOpacity: 84,
      fontFamily: '"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
      iconSize: 58,
      iconRadius: 18,
      iconFrosted: 12,
      iconShadow: 16,
      showAppName: true,
      customIcons: createIconPack({
        primary: '#38BDF8',
        secondary: '#8B5CF6',
        accent: '#22C55E',
      }),
    },
  },
];
