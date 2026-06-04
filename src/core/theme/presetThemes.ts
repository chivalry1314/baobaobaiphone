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

const themeIconPaths: Record<string, string> = {
  settings: '<path d="M128 88a40 40 0 1 0 0 80a40 40 0 0 0 0-80Z" /><path d="M128 48v28M128 180v28M76 76l20 20M160 160l20 20M48 128h28M180 128h28M76 180l20-20M160 96l20-20" />',
  contacts: '<path d="M128 124a34 34 0 1 0 0-68a34 34 0 0 0 0 68Z" /><path d="M70 204c10-38 34-58 58-58s48 20 58 58" /><path d="M58 86h28M58 128h20M58 170h28" />',
  wechat: '<path d="M86 144c-22 0-40-15-40-34s18-34 40-34s40 15 40 34s-18 34-40 34Z" /><path d="M126 118c4-20 24-34 49-34c29 0 53 19 53 43s-24 43-53 43c-7 0-14-1-20-3l-28 16l8-27c-8-6-13-14-15-24" /><path d="M72 108h1M100 108h1M158 126h1M190 126h1" />',
  appmarket: '<path d="M72 94h112l-10 112H82L72 94Z" /><path d="M104 94c0-28 12-46 28-46s28 18 28 46" /><path d="M102 140h56M102 168h40" />',
  shopping: '<path d="M66 92h128l-14 100H80L66 92Z" /><path d="M94 92c0-24 12-40 34-40s34 16 34 40" /><path d="M92 216h1M168 216h1" />',
  seller: '<path d="M72 84h112v132H72Z" /><path d="M72 118h112" /><path d="M104 156h56M104 184h36" /><path d="M104 84V58h56v26" />',
  warmtrack: '<path d="M128 214s-70-40-70-94c0-26 17-44 41-44c14 0 24 7 29 17c5-10 15-17 29-17c24 0 41 18 41 44c0 54-70 94-70 94Z" /><path d="M104 126h56" />',
  dreammusic: '<path d="M154 58v112a24 24 0 1 1-18-23V78l62-14v96a24 24 0 1 1-18-23V50Z" />',
  phone: '<path d="M92 54h72a16 16 0 0 1 16 16v116a16 16 0 0 1-16 16H92a16 16 0 0 1-16-16V70a16 16 0 0 1 16-16Z" /><path d="M116 178h40" />',
  safari: '<path d="M128 210a82 82 0 1 0 0-164a82 82 0 0 0 0 164Z" /><path d="M128 76l22 72l-72 22l34-56Z" /><path d="M128 46v24M128 186v24M46 128h24M186 128h24" />',
  messages: '<path d="M62 84h132a22 22 0 0 1 22 22v54a22 22 0 0 1-22 22h-70l-42 28l10-28H62a22 22 0 0 1-22-22v-54a22 22 0 0 1 22-22Z" /><path d="M84 122h88M84 150h62" />',
  camera: '<path d="M52 92h48l16-24h56l16 24h24v110H52Z" /><path d="M128 176a42 42 0 1 0 0-84a42 42 0 0 0 0 84Z" /><path d="M194 116h1" />',
  dailyscript: '<path d="M76 58h96l24 24v120H76Z" /><path d="M172 58v34h34" /><path d="M102 114h56M102 144h72M102 174h42" />',
  dailywords: '<path d="M68 62h92a28 28 0 0 1 28 28v116H92a24 24 0 0 1-24-24Z" /><path d="M92 62v144" /><path d="M112 104h44M112 134h54M112 164h34" />',
  delivery: '<path d="M70 104h116l-8 74H78Z" /><path d="M90 104l14-42M156 104l-14-42" /><path d="M98 178a18 18 0 1 0 0 36a18 18 0 0 0 0-36ZM158 178a18 18 0 1 0 0 36a18 18 0 0 0 0-36Z" />',
  lovespace: '<path d="M128 214s-70-40-70-94c0-26 17-44 41-44c14 0 24 7 29 17c5-10 15-17 29-17c24 0 41 18 41 44c0 54-70 94-70 94Z" /><path d="M104 126h56" />',
  memorycenter: '<path d="M128 52c34 0 62 28 62 62v22c0 34-28 62-62 62s-62-28-62-62v-22c0-34 28-62 62-62Z" /><path d="M94 112h34M128 112h34M104 150h56M100 78v22M156 78v22" />',
  papermagic: '<path d="M58 70h74c18 0 32 14 32 32v106H90c-18 0-32-14-32-32Z" /><path d="M164 92h28v128H96" /><path d="M90 112h42M90 144h48" />',
  personagenerator: '<path d="M128 124a34 34 0 1 0 0-68a34 34 0 0 0 0 68Z" /><path d="M72 206c10-38 34-58 56-58s46 20 56 58" /><path d="M192 58l8 18l18 8l-18 8l-8 18l-8-18l-18-8l18-8Z" />',
  phoneinspector: '<path d="M118 174a62 62 0 1 0 0-124a62 62 0 0 0 0 124Z" /><path d="M162 162l42 42" /><path d="M92 116h56" />',
  scheduler: '<path d="M128 210a76 76 0 1 0 0-152a76 76 0 0 0 0 152Z" /><path d="M128 88v44l30 24" /><path d="M100 46h56" />',
  storage: '<path d="M52 82h72l18 20h62v110H52Z" /><path d="M52 112h152" /><path d="M86 158h72" />',
  template: '<path d="M66 66h58v58H66Z" /><path d="M142 66h58v58h-58Z" /><path d="M66 142h58v58H66Z" /><path d="M142 142h58v58h-58Z" />',
  weather: '<path d="M92 178h90a36 36 0 0 0 0-72c-6 0-12 1-17 4a52 52 0 0 0-100 20a40 40 0 0 0 27 48Z" /><path d="M80 76l-18-18M214 76l18-18M220 136h28M146 36V12" />',
  worldbook: '<path d="M76 58h114v140H76Z" /><path d="M98 92h70M98 124h70M98 156h48" /><path d="M76 58l-18 18v140h114l18-18" />',
  default: '<path d="M74 74h58v58H74Z" /><path d="M132 74h54v54" /><path d="M74 132v54h54" /><path d="M132 132h54v54h-54Z" />',
};

const createThemeIcon = (
  path: string,
  colors: { background: string; stroke: string; glow: string; scale?: number; strokeWidth?: number; border?: string; highlight?: string }
): string => {
  const scale = colors.scale ?? 1;
  const strokeWidth = colors.strokeWidth ?? 12;
  const border = colors.border ?? 'rgba(255,255,255,0.28)';
  const highlight = colors.highlight ?? 'rgba(255,255,255,0.18)';
  const transform = scale === 1 ? '' : ` transform="translate(128 128) scale(${scale}) translate(-128 -128)"`;
  return (
  svgToDataUrl(`
    <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(82 64) rotate(45) scale(164)">
          <stop stop-color="rgba(255,255,255,0.62)" />
          <stop offset="1" stop-color="${colors.glow}" stop-opacity="0.22" />
        </radialGradient>
      </defs>
      <rect width="256" height="256" rx="64" fill="${colors.background}" />
      <rect x="16" y="16" width="224" height="224" rx="54" fill="url(#glow)" stroke="${border}" stroke-width="3" />
      <path d="M40 76C58 44 96 28 140 28h42c24 0 44 20 44 44v16C172 74 106 72 40 118V76Z" fill="${highlight}" />
      <g stroke="${colors.stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${transform}>
        ${path}
      </g>
    </svg>
  `)
  );
};

const createGraphicIconPack = (colors: { primary: string; secondary: string; accent: string; stroke: string; glow: string; scale?: number; strokeWidth?: number; border?: string; highlight?: string }) => ({
  settings: createThemeIcon(themeIconPaths.settings, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  contacts: createThemeIcon(themeIconPaths.contacts, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  wechat: createThemeIcon(themeIconPaths.wechat, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  appmarket: createThemeIcon(themeIconPaths.appmarket, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  shopping: createThemeIcon(themeIconPaths.shopping, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  seller: createThemeIcon(themeIconPaths.seller, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  warmtrack: createThemeIcon(themeIconPaths.warmtrack, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  dreammusic: createThemeIcon(themeIconPaths.dreammusic, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  phone: createThemeIcon(themeIconPaths.phone, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  safari: createThemeIcon(themeIconPaths.safari, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  messages: createThemeIcon(themeIconPaths.messages, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  camera: createThemeIcon(themeIconPaths.camera, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  dailyscript: createThemeIcon(themeIconPaths.dailyscript, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  dailywords: createThemeIcon(themeIconPaths.dailywords, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  delivery: createThemeIcon(themeIconPaths.delivery, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  lovespace: createThemeIcon(themeIconPaths.lovespace, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  memorycenter: createThemeIcon(themeIconPaths.memorycenter, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  papermagic: createThemeIcon(themeIconPaths.papermagic, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  personagenerator: createThemeIcon(themeIconPaths.personagenerator, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  phoneinspector: createThemeIcon(themeIconPaths.phoneinspector, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  scheduler: createThemeIcon(themeIconPaths.scheduler, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  storage: createThemeIcon(themeIconPaths.storage, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  template: createThemeIcon(themeIconPaths.template, { background: colors.secondary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  weather: createThemeIcon(themeIconPaths.weather, { background: colors.accent, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
  worldbook: createThemeIcon(themeIconPaths.worldbook, { background: colors.primary, stroke: colors.stroke, glow: colors.glow, scale: colors.scale, strokeWidth: colors.strokeWidth, border: colors.border, highlight: colors.highlight }),
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
      customIcons: createGraphicIconPack({
        primary: '#A7F3D0',
        secondary: '#BAE6FD',
        accent: '#5EEAD4',
        stroke: '#064E3B',
        glow: '#6EE7B7',
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
      surfaceText: '#4a1634',
      mutedText: 'rgba(74,22,52,0.70)',
      border: 'rgba(255,255,255,0.52)',
      shadowColor: 'rgba(147,51,93,0.16)',
      accent: '#fb7185',
      accentText: '#ffffff',
      accentSoft: 'rgba(251,113,133,0.14)',
      accentMuted: '#e11d48',
      danger: '#dc2626',
      dangerText: '#ffffff',
      dangerSoft: 'rgba(220,38,38,0.12)',
      glassBg: 'rgba(255,247,242,0.22)',
      glassBorder: 'rgba(255,255,255,0.34)',
      glassIconBg: 'rgba(255,255,255,0.18)',
      dockBg: 'rgba(255,241,234,0.30)',
      dockBorder: 'rgba(255,255,255,0.42)',
      iconBg: 'rgba(255,255,255,0.16)',
      iconBorder: 'rgba(255,255,255,0.52)',
      iconInnerBg: 'linear-gradient(145deg, rgba(255,255,255,0.34), rgba(255,255,255,0.06) 58%, rgba(255,182,213,0.10))',
      iconInnerInset: '1px',
      iconTexture: 'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.52), transparent 32%)',
      iconLabel: '#4a1634',
      iconGlyph: '#9d174d',
      iconShadowColor: 'rgba(157,23,77,0.14)',
      badgeBg: '#fb7185',
      badgeText: '#ffffff',
      badgeRing: 'rgba(255,255,255,0.9)',
      statusFg: '#4a1634',
      statusMuted: 'rgba(74,22,52,0.74)',
      statusChipBg: 'rgba(255,248,244,0.32)',
      statusChipBorder: 'rgba(255,255,255,0.42)',
      statusBatteryBg: '#9d174d',
      statusBatteryCap: 'rgba(157,23,77,0.34)',
    },
    settingsPatch: {
      wallpaper: coralWallpaper,
      wallpaperOpacity: 94,
      customFontData: '/fonts/NaniFont-Light.ttf',
      customFontName: 'NaniFont Light',
      customFontFormat: 'truetype',
      fontFamily: '"NaniFont Light", "PingFang SC", "Microsoft YaHei", sans-serif',
      iconSize: 62,
      iconRadius: 26,
      iconFrosted: 18,
      iconShadow: 10,
      showAppName: true,
      customIcons: createGraphicIconPack({
        primary: 'rgba(255,255,255,0.18)',
        secondary: 'rgba(255,255,255,0.14)',
        accent: 'rgba(255,255,255,0.20)',
        stroke: '#C75A89',
        glow: '#FFFFFF',
        border: 'rgba(255,255,255,0.52)',
        highlight: 'rgba(255,255,255,0.34)',
        scale: 0.78,
        strokeWidth: 9,
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
      customIcons: createGraphicIconPack({
        primary: '#38BDF8',
        secondary: '#8B5CF6',
        accent: '#22C55E',
        stroke: '#020617',
        glow: '#67E8F9',
      }),
    },
  },
];
