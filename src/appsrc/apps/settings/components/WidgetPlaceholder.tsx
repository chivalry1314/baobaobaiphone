import React from 'react';
import { Clock, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { playDreamMusicAudioFromGesture } from '../../dreammusic/backgroundAudio';
import { useTrackLyrics } from '../../dreammusic/hooks';
import { useDreamMusicStore } from '../../dreammusic/store';
import { useWeChatStore } from '../../WeChat/store';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const resolveSystemValue = (path: string, system: Record<string, unknown>): unknown => {
  const parts = path.replace(/\?\./g, '.').split('.').filter(Boolean);
  let current: unknown = system;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const extractReturnMarkup = (source: string): string => {
  const returnMatch = source.match(/return\s*\(([\s\S]*?)\)\s*;?\s*}/);
  if (returnMatch?.[1]) return returnMatch[1].trim();
  const arrowMatch = source.match(/=>\s*\(([\s\S]*?)\)\s*;?$/);
  if (arrowMatch?.[1]) return arrowMatch[1].trim();
  return source.trim();
};

const spacingUnit = (value: string): string => {
  const arbitrary = value.match(/^\[(.+)\]$/);
  if (arbitrary?.[1]) return arbitrary[1].replace(/_/g, ' ');
  if (value === 'full') return '100%';
  if (value === 'screen') return '100vh';
  if (value === 'px') return '1px';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return `${numeric * 0.25}rem`;
};

const colorMap: Record<string, string> = {
  black: '0 0 0',
  white: '255 255 255',
  transparent: 'transparent',
  slate: '15 23 42',
  gray: '107 114 128',
  zinc: '113 113 122',
  neutral: '115 115 115',
  stone: '120 113 108',
  red: '239 68 68',
  rose: '244 63 94',
  orange: '249 115 22',
  amber: '245 158 11',
  yellow: '234 179 8',
  green: '34 197 94',
  emerald: '16 185 129',
  teal: '20 184 166',
  cyan: '6 182 212',
  sky: '14 165 233',
  blue: '59 130 246',
  indigo: '99 102 241',
  violet: '139 92 246',
  purple: '168 85 247',
  fuchsia: '217 70 239',
  pink: '236 72 153',
};

const resolveRuntimeColor = (token: string): string | null => {
  const arbitrary = token.match(/^\[(.+)\](?:\/(\d+))?$/);
  if (arbitrary) {
    const alpha = arbitrary[2] ? Number(arbitrary[2]) / 100 : 1;
    return alpha < 1 ? `color-mix(in srgb, ${arbitrary[1]} ${alpha * 100}%, transparent)` : arbitrary[1];
  }
  const [nameAndShade, alphaValue] = token.split('/');
  const [name] = nameAndShade.split('-');
  const base = colorMap[name];
  if (!base) return null;
  if (base === 'transparent') return base;
  const alpha = alphaValue ? Math.min(Math.max(Number(alphaValue), 0), 100) / 100 : 1;
  return `rgb(${base} / ${alpha})`;
};

const escapeCssClass = (className: string): string =>
  className.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);

const runtimeRuleForClass = (className: string, scoped = false): string | null => {
  const rules: string[] = [];
  const add = (property: string, value: string) => rules.push(`${property}:${value}`);
  const arbitraryValue = (prefix: string) => {
    const match = className.match(new RegExp(`^${prefix}-\\[(.+)\\]$`));
    return match?.[1]?.replace(/_/g, ' ');
  };
  const selector = scoped
    ? `.custom-widget-runtime .${escapeCssClass(className)}`
    : `.${escapeCssClass(className)}`;

  const staticRules: Record<string, string> = {
    flex: 'display:flex',
    'inline-flex': 'display:inline-flex',
    grid: 'display:grid',
    block: 'display:block',
    'inline-block': 'display:inline-block',
    hidden: 'display:none',
    relative: 'position:relative',
    absolute: 'position:absolute',
    fixed: 'position:fixed',
    'inset-0': 'inset:0',
    'top-0': 'top:0',
    'right-0': 'right:0',
    'bottom-0': 'bottom:0',
    'left-0': 'left:0',
    'z-10': 'z-index:10',
    'z-20': 'z-index:20',
    'z-30': 'z-index:30',
    'h-full': 'height:100%',
    'w-full': 'width:100%',
    'h-screen': 'height:100vh',
    'w-screen': 'width:100vw',
    'min-h-0': 'min-height:0',
    'min-w-0': 'min-width:0',
    'aspect-square': 'aspect-ratio:1/1',
    'flex-col': 'flex-direction:column',
    'flex-row': 'flex-direction:row',
    'flex-wrap': 'flex-wrap:wrap',
    'flex-1': 'flex:1 1 0%',
    'shrink-0': 'flex-shrink:0',
    'grow': 'flex-grow:1',
    'items-center': 'align-items:center',
    'items-start': 'align-items:flex-start',
    'items-end': 'align-items:flex-end',
    'items-stretch': 'align-items:stretch',
    'justify-center': 'justify-content:center',
    'justify-between': 'justify-content:space-between',
    'justify-around': 'justify-content:space-around',
    'justify-start': 'justify-content:flex-start',
    'justify-end': 'justify-content:flex-end',
    'place-items-center': 'place-items:center',
    'text-center': 'text-align:center',
    'text-left': 'text-align:left',
    'text-right': 'text-align:right',
    'overflow-hidden': 'overflow:hidden',
    'overflow-auto': 'overflow:auto',
    'overflow-x-auto': 'overflow-x:auto',
    'overflow-y-auto': 'overflow-y:auto',
    'object-cover': 'object-fit:cover',
    'object-contain': 'object-fit:contain',
    'pointer-events-none': 'pointer-events:none',
    'pointer-events-auto': 'pointer-events:auto',
    'select-none': 'user-select:none',
    'rounded-full': 'border-radius:9999px',
    rounded: 'border-radius:0.25rem',
    'rounded-md': 'border-radius:0.375rem',
    'rounded-lg': 'border-radius:0.5rem',
    'rounded-xl': 'border-radius:0.75rem',
    'rounded-2xl': 'border-radius:1rem',
    'rounded-3xl': 'border-radius:1.5rem',
    border: 'border-width:1px;border-style:solid;border-color:rgb(255 255 255 / 0.35)',
    'border-0': 'border-width:0',
    'font-light': 'font-weight:300',
    'font-normal': 'font-weight:400',
    'font-medium': 'font-weight:500',
    'font-semibold': 'font-weight:600',
    'font-bold': 'font-weight:700',
    'font-black': 'font-weight:900',
    'italic': 'font-style:italic',
    'leading-none': 'line-height:1',
    'leading-snug': 'line-height:1.375',
    'leading-tight': 'line-height:1.25',
    'leading-normal': 'line-height:1.5',
    'tracking-wide': 'letter-spacing:0.025em',
    'tracking-wider': 'letter-spacing:0.05em',
    'tracking-widest': 'letter-spacing:0.1em',
    'truncate': 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
    'whitespace-pre-wrap': 'white-space:pre-wrap',
    'whitespace-nowrap': 'white-space:nowrap',
    'shadow-sm': 'box-shadow:0 1px 2px rgb(0 0 0 / 0.08)',
    'shadow-md': 'box-shadow:0 4px 10px rgb(0 0 0 / 0.14)',
    'shadow-lg': 'box-shadow:0 10px 18px rgb(0 0 0 / 0.16)',
    'shadow-xl': 'box-shadow:0 18px 32px rgb(0 0 0 / 0.22)',
    'shadow-2xl': 'box-shadow:0 24px 48px rgb(0 0 0 / 0.24)',
    'backdrop-blur-sm': 'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)',
    'backdrop-blur': 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)',
    'backdrop-blur-md': 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)',
    'backdrop-blur-lg': 'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)',
    'backdrop-blur-xl': 'backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)',
    'bg-gradient-to-b': 'background-image:linear-gradient(to bottom,var(--tw-gradient-stops))',
    'bg-gradient-to-br': 'background-image:linear-gradient(to bottom right,var(--tw-gradient-stops))',
    'bg-gradient-to-r': 'background-image:linear-gradient(to right,var(--tw-gradient-stops))',
    'bg-gradient-to-t': 'background-image:linear-gradient(to top,var(--tw-gradient-stops))',
  };
  if (staticRules[className]) return `${selector}{${staticRules[className]}}`;

  const arbitraryText = arbitraryValue('text');
  if (arbitraryText) add('font-size', arbitraryText);
  const arbitraryRounded = arbitraryValue('rounded');
  if (arbitraryRounded) add('border-radius', arbitraryRounded);
  const arbitraryBg = arbitraryValue('bg');
  if (arbitraryBg) add('background', arbitraryBg);
  const arbitraryShadow = arbitraryValue('shadow');
  if (arbitraryShadow) add('box-shadow', arbitraryShadow);
  const arbitraryW = arbitraryValue('w');
  if (arbitraryW) add('width', arbitraryW);
  const arbitraryH = arbitraryValue('h');
  if (arbitraryH) add('height', arbitraryH);

  let match = className.match(/^(-?)(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap)-(.+)$/);
  if (match) {
    const value = `${match[1] ? '-' : ''}${spacingUnit(match[3])}`;
    const map: Record<string, string[]> = {
      p: ['padding'],
      px: ['padding-left', 'padding-right'],
      py: ['padding-top', 'padding-bottom'],
      pt: ['padding-top'],
      pr: ['padding-right'],
      pb: ['padding-bottom'],
      pl: ['padding-left'],
      m: ['margin'],
      mx: ['margin-left', 'margin-right'],
      my: ['margin-top', 'margin-bottom'],
      mt: ['margin-top'],
      mr: ['margin-right'],
      mb: ['margin-bottom'],
      ml: ['margin-left'],
      gap: ['gap'],
    };
    map[match[2]].forEach((property) => add(property, value));
  }

  match = className.match(/^(w|h|min-w|min-h|max-w|max-h)-(.+)$/);
  if (match) {
    const propertyMap: Record<string, string> = {
      w: 'width',
      h: 'height',
      'min-w': 'min-width',
      'min-h': 'min-height',
      'max-w': 'max-width',
      'max-h': 'max-height',
    };
    const value = match[2] === 'screen' && match[1].includes('w') ? '100vw' : spacingUnit(match[2]);
    add(propertyMap[match[1]], value);
  }

  match = className.match(/^(-?)(inset|inset-x|inset-y|top|right|bottom|left)-(.+)$/);
  if (match) {
    const value = `${match[1] ? '-' : ''}${spacingUnit(match[3])}`;
    const map: Record<string, string[]> = {
      inset: ['inset'],
      'inset-x': ['left', 'right'],
      'inset-y': ['top', 'bottom'],
      top: ['top'],
      right: ['right'],
      bottom: ['bottom'],
      left: ['left'],
    };
    map[match[2]].forEach((property) => add(property, value));
  }

  match = className.match(/^grid-cols-(\d+)$/);
  if (match) add('grid-template-columns', `repeat(${match[1]}, minmax(0, 1fr))`);

  match = className.match(/^grid-rows-(\d+)$/);
  if (match) add('grid-template-rows', `repeat(${match[1]}, minmax(0, 1fr))`);

  match = className.match(/^space-y-(.+)$/);
  if (match) {
    const value = spacingUnit(match[1]);
    return `${selector}>:not([hidden])~:not([hidden]){margin-top:${value}}`;
  }

  match = className.match(/^space-x-(.+)$/);
  if (match) {
    const value = spacingUnit(match[1]);
    return `${selector}>:not([hidden])~:not([hidden]){margin-left:${value}}`;
  }

  match = className.match(/^border-(\d+)$/);
  if (match) add('border-width', `${match[1]}px`);

  match = className.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/);
  if (match) {
    const sizes: Record<string, string> = {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    };
    add('font-size', sizes[match[1]]);
  }

  match = className.match(/^(bg|text|border)-(.+)$/);
  if (match && !className.startsWith('bg-gradient')) {
    const color = resolveRuntimeColor(match[2]);
    if (color) {
      if (match[1] === 'bg') add('background-color', color);
      if (match[1] === 'text') add('color', color);
      if (match[1] === 'border') add('border-color', color);
    }
  }

  match = className.match(/^(from|via|to)-(.+)$/);
  if (match) {
    const color = resolveRuntimeColor(match[2]);
    if (color) {
      if (match[1] === 'from') {
        add('--tw-gradient-from', color);
        add('--tw-gradient-to', 'rgb(255 255 255 / 0)');
        add('--tw-gradient-stops', 'var(--tw-gradient-from), var(--tw-gradient-to)');
      }
      if (match[1] === 'via') {
        add('--tw-gradient-via', color);
        add('--tw-gradient-stops', 'var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to)');
      }
      if (match[1] === 'to') add('--tw-gradient-to', color);
    }
  }

  match = className.match(/^opacity-(\d+)$/);
  if (match) add('opacity', String(Math.min(Math.max(Number(match[1]), 0), 100) / 100));

  return rules.length > 0 ? `${selector}{${rules.join(';')}}` : null;
};

const buildRuntimeTailwindCss = (markup: string, scoped = false): string => {
  const classNames = new Set<string>();
  markup.replace(/\bclass(?:Name)?=["']([^"']+)["']/g, (_match, value: string) => {
    value.split(/\s+/).filter(Boolean).forEach((item) => classNames.add(item));
    return '';
  });
  const rules = Array.from(classNames)
    .map((className) => runtimeRuleForClass(className, scoped))
    .filter(Boolean)
    .join('\n');
  return [
    '.custom-widget-runtime,.custom-widget-runtime *{box-sizing:border-box}',
    '.custom-widget-runtime{width:100%;height:100%;overflow:hidden}',
    rules,
  ].filter(Boolean).join('\n');
};

const wrapRuntimeMarkup = (markup: string): string => {
  const runtimeCss = buildRuntimeTailwindCss(markup, true);
  return `<style>${runtimeCss}</style>${markup}`;
};

const normalizeCustomWidgetSource = (source: string): string =>
  source
    .replace(/<\s+([a-zA-Z][\w:-]*)(?=[\s>/])/g, '<$1')
    .replace(/<\/\s+([a-zA-Z][\w:-]*)\s*>/g, '</$1>');

const normalizeCustomWidgetImageUrl = (url: string | undefined): string | undefined => {
  const value = url?.trim();
  if (!value) return undefined;
  if (value.startsWith('http://')) return `https://${value.slice('http://'.length)}`;
  return value;
};

const LISTEN_TOGETHER_BAR_COUNT = 12;

const clampListenTogetherBarHeight = (value: number): number => Math.max(10, Math.min(38, value));

const buildListenTogetherBarHeights = (isPlaying: boolean, tick: number): number[] =>
  Array.from({ length: LISTEN_TOGETHER_BAR_COUNT }, (_, index) => {
    if (!isPlaying) return [16, 22, 14, 28, 18, 34, 20, 30, 12, 24, 18, 26][index] || 16;
    const wave = Math.sin(tick * 0.85 + index * 0.9);
    const alternate = Math.cos(tick * 0.45 + index * 1.35);
    return clampListenTogetherBarHeight(20 + wave * 12 + alternate * 5);
  });

const normalizeMusicActionClickHandlers = (source: string): string =>
  source.replace(/\s+onClick=\{([^{}]+|\([^{}]*\)\s*=>\s*[^{}]+)\}/g, (match, expression: string) => {
    const compactExpression = expression.replace(/\s+/g, '');
    if (
      compactExpression === 'handleToggle' ||
      compactExpression === 'handleToggle()' ||
      compactExpression.includes('togglePlayback')
    ) {
      return ' data-baobaobai-music-action="togglePlayback"';
    }
    if (
      compactExpression === 'handlePrev' ||
      compactExpression === 'handlePrev()' ||
      compactExpression.includes('playPrev')
    ) {
      return ' data-baobaobai-music-action="playPrev"';
    }
    if (
      compactExpression === 'handleNext' ||
      compactExpression === 'handleNext()' ||
      compactExpression.includes('playNext')
    ) {
      return ' data-baobaobai-music-action="playNext"';
    }
    return match;
  });

const normalizeJsxLikeMarkup = (source: string, system: Record<string, unknown>): string => {
  let markup = normalizeMusicActionClickHandlers(extractReturnMarkup(source))
    .replace(/^\s*<>\s*/, '')
    .replace(/\s*<\/>\s*$/, '')
    .replace(/\bclassName=/g, 'class=')
    .replace(/\bhtmlFor=/g, 'for=')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\s+[a-zA-Z]+=\{(?:true|false|null|undefined)\}/g, '')
    .replace(/\s+[a-zA-Z]+=\{[\s\S]*?\}/g, '')
    .replace(/<([A-Z][A-Za-z0-9.]*)\b[^>]*\/>/g, '')
    .replace(/<([A-Z][A-Za-z0-9.]*)\b[^>]*>[\s\S]*?<\/\1>/g, '');

  markup = markup.replace(
    /\{\s*system\.([A-Za-z0-9_?.]+)(?:\s*\|\|\s*['"`]([^'"`]+)['"`])?\s*\}/g,
    (_match, path: string, fallback: string | undefined) => {
      const value = resolveSystemValue(path, system);
      return escapeHtml(value === undefined || value === null || value === '' ? fallback ?? '' : String(value));
    }
  );

  markup = markup.replace(/\{[^{}]*\}/g, '');
  return markup;
};

/**
 * Widget 占位组件
 * 当 Widget 未开发或加载中时展示
 */
export interface WidgetPlaceholderProps {
  /** Widget 名称 */
  name: string;
  /** 默认图标 URL */
  defaultIcon?: string;
  /** 背景图（自定义组件） */
  backgroundImage?: string;
  /** 是否为加载中状态 */
  isLoading?: boolean;
  /** 状态文案：默认建设中 */
  status?: 'normal' | 'building';
  /** 圆角大小 */
  cornerRadius?: number;
  /** 磨砂程度 */
  frosted?: number;
  /** 阴影大小 */
  shadow?: number;
  /** 占据的网格宽度 */
  width?: number;
  /** 占据的网格高度 */
  height?: number;
  templateId?: string;
  subtitle?: string;
  titleText?: string;
  titleColor?: string;
  titleFontSize?: number;
  widgetCode?: string;
  musicPlaying?: boolean;
  musicTitle?: string;
  musicArtist?: string;
  isEditing?: boolean;
  onUpdateData?: (data: Record<string, unknown>) => void;
  onRequestDesktopEdit?: () => void;
}

export const WidgetPlaceholder: React.FC<WidgetPlaceholderProps> = ({
  name,
  defaultIcon,
  backgroundImage,
  isLoading = false,
  status = 'building',
  cornerRadius,
  frosted,
  shadow,
  width = 2,
  height = 2,
  templateId,
  subtitle,
  titleText,
  titleColor,
  titleFontSize,
  widgetCode,
  musicPlaying,
  musicTitle,
  musicArtist,
  isEditing = false,
  onUpdateData,
  onRequestDesktopEdit,
}) => {
  const [now, setNow] = React.useState(() => new Date());
  const customWidgetFrameRef = React.useRef<HTMLIFrameElement | null>(null);
  const customWidgetPressRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    longPressed: boolean;
  } | null>(null);
  const dreamTracks = useDreamMusicStore((state) => state.tracks);
  const dreamCurrentTrackId = useDreamMusicStore((state) => state.currentTrackId);
  const dreamIsPlaying = useDreamMusicStore((state) => state.isPlaying);
  const dreamCurrentTimeSec = useDreamMusicStore((state) => state.currentTimeSec);
  const dreamVolume = useDreamMusicStore((state) => state.volume);
  const dreamSetPlaying = useDreamMusicStore((state) => state.setPlaying);
  const dreamTogglePlayback = useDreamMusicStore((state) => state.togglePlayback);
  const dreamPlayNext = useDreamMusicStore((state) => state.playNext);
  const dreamPlayPrev = useDreamMusicStore((state) => state.playPrev);
  const dreamSetQueueAndPlay = useDreamMusicStore((state) => state.setQueueAndPlay);
  const dreamListenTogether = useDreamMusicStore((state) => state.listenTogether);
  const dreamListenTogetherIdleSince = useDreamMusicStore((state) => state.listenTogetherIdleSince);
  const dreamClearListenTogether = useDreamMusicStore((state) => state.clearListenTogether);
  const wechatUserProfile = useWeChatStore((state) => state.wechatUserProfile);
  const [listenTogetherTick, setListenTogetherTick] = React.useState(0);
  const dreamCurrentTrack = React.useMemo(
    () => dreamTracks.find((track) => track.id === dreamCurrentTrackId) ?? null,
    [dreamCurrentTrackId, dreamTracks]
  );
  const dreamPlayableTrackIds = React.useMemo(
    () => dreamTracks
      .filter((track) => track.playableStatus === 'ready' && typeof track.playUrl === 'string')
      .map((track) => track.id),
    [dreamTracks]
  );
  const runDreamMusicAction = React.useCallback((action: unknown) => {
    if (action === 'togglePlayback') {
      if (!dreamCurrentTrackId && dreamPlayableTrackIds.length > 0) {
        const firstTrackId = dreamPlayableTrackIds[0];
        dreamSetQueueAndPlay(dreamPlayableTrackIds, firstTrackId);
        const firstTrack = dreamTracks.find((track) => track.id === firstTrackId);
        if (firstTrack?.playUrl) {
          void playDreamMusicAudioFromGesture({
            trackId: firstTrack.id,
            playUrl: firstTrack.playUrl,
            volume: dreamVolume,
          }).catch(() => dreamSetPlaying(false));
        }
        return;
      }
      if (!dreamIsPlaying && dreamCurrentTrack?.playUrl) {
        void playDreamMusicAudioFromGesture({
          trackId: dreamCurrentTrack.id,
          playUrl: dreamCurrentTrack.playUrl,
          volume: dreamVolume,
          resetTime: false,
        }).catch(() => dreamSetPlaying(false));
      }
      dreamTogglePlayback();
      return;
    }
    if (action === 'playNext') {
      if (!dreamCurrentTrackId && dreamPlayableTrackIds.length > 0) {
        dreamSetQueueAndPlay(dreamPlayableTrackIds, dreamPlayableTrackIds[0]);
        return;
      }
      dreamPlayNext();
      return;
    }
    if (action === 'playPrev') {
      if (!dreamCurrentTrackId && dreamPlayableTrackIds.length > 0) {
        dreamSetQueueAndPlay(dreamPlayableTrackIds, dreamPlayableTrackIds[0]);
        return;
      }
      dreamPlayPrev();
    }
  }, [
    dreamCurrentTrackId,
    dreamCurrentTrack,
    dreamIsPlaying,
    dreamPlayNext,
    dreamPlayPrev,
    dreamPlayableTrackIds,
    dreamSetQueueAndPlay,
    dreamSetPlaying,
    dreamTogglePlayback,
    dreamTracks,
    dreamVolume,
  ]);
  const listenTogetherBarHeights = React.useMemo(
    () => buildListenTogetherBarHeights(dreamIsPlaying, listenTogetherTick),
    [dreamIsPlaying, listenTogetherTick]
  );
  const handleListenTogetherMusicAction = React.useCallback((action: 'togglePlayback' | 'playPrev' | 'playNext') => {
    runDreamMusicAction(action);
  }, [runDreamMusicAction]);

  React.useEffect(() => {
    if (templateId !== 'listen-together' || !dreamIsPlaying) return undefined;
    const timer = window.setInterval(() => setListenTogetherTick((value) => value + 1), 220);
    return () => window.clearInterval(timer);
  }, [dreamIsPlaying, templateId]);

  React.useEffect(() => {
    if (!['calendar-card', 'clock-card', 'custom-code', 'text-card'].includes(templateId || '')) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), templateId === 'clock-card' || templateId === 'custom-code' ? 1000 : 60 * 1000);
    return () => window.clearInterval(timer);
  }, [templateId]);

  React.useEffect(() => {
    if (templateId !== 'custom-code') return undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'baobaobai:custom-widget-request-edit') {
        onRequestDesktopEdit?.();
        return;
      }
      if (event.data?.type !== 'baobaobai:custom-widget-music-action') return;
      runDreamMusicAction(event.data.action);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onRequestDesktopEdit, runDreamMusicAction, templateId]);

  React.useEffect(() => () => {
    if (customWidgetPressRef.current?.timer) {
      window.clearTimeout(customWidgetPressRef.current.timer);
    }
  }, []);

  const calendarDays = React.useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      firstDay,
      days: Array.from({ length: daysInMonth }, (_, index) => index + 1),
      today: now.getDate(),
    };
  }, [now]);

  const countdownDays = React.useMemo(() => {
    const source = `${titleText || ''}\n${subtitle || ''}`;
    const match = source.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (!match) return null;
    const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(Math.abs(today.getTime() - target.getTime()) / 86_400_000);
  }, [now, subtitle, titleText]);

  // 根据宽高计算样式类
  const sizeClass = `col-span-${width} row-span-${height}`;

  const hasBackground = Boolean(backgroundImage);
  const resolvedRadius = cornerRadius ?? 24;
  const resolvedFrosted = frosted ?? 0;
  const resolvedShadow = shadow ?? 0;
  const shadowStyle = resolvedShadow > 0
    ? `0 ${Math.max(2, Math.round(resolvedShadow / 2))}px ${resolvedShadow}px -${Math.max(2, Math.round(resolvedShadow / 3))}px rgba(15, 23, 42, 0.35)`
    : 'none';
  const frostedOpacity = Math.min(0.6, resolvedFrosted / 40);
  const isWideVinyl = templateId === 'vinyl-record' && width > height;
  const isTransparentTemplate = templateId === 'calendar-card' || templateId === 'clock-card' || templateId === 'text-card';
  const listenTogetherCompanionName = dreamListenTogether?.companionName || '哥哥';
  const listenTogetherInviterName =
    wechatUserProfile.name?.trim() || dreamListenTogether?.inviterName?.trim() || '我';
  const listenTogetherInviterInitial = listenTogetherInviterName[0] || '我';
  const listenTogetherCompanionInitial = dreamListenTogether?.companionName?.trim()?.[0] || 'TA';
  const dreamEffectiveDurationSec = React.useMemo(
    () => Math.max(0, Math.round((dreamCurrentTrack?.durationMs || 0) / 1000)),
    [dreamCurrentTrack?.durationMs]
  );
  const {
    lyricLines: listenTogetherLyricLines,
    activeLyricIndex: listenTogetherActiveLyricIndex,
    isLyricLoading: isListenTogetherLyricLoading,
  } = useTrackLyrics({
    currentTrack: dreamCurrentTrack,
    currentTimeSec: dreamCurrentTimeSec,
    effectiveDurationSec: dreamEffectiveDurationSec,
  });
  const listenTogetherLyricText = React.useMemo(() => {
    if (isListenTogetherLyricLoading) return '正在读取歌词...';
    const activeLine =
      listenTogetherActiveLyricIndex >= 0 ? listenTogetherLyricLines[listenTogetherActiveLyricIndex] : '';
    return activeLine?.trim() || listenTogetherLyricLines.find((line) => line.trim()) || '音乐传递心声，一起听见此刻';
  }, [isListenTogetherLyricLoading, listenTogetherActiveLyricIndex, listenTogetherLyricLines]);
  const customWidgetSystem = React.useMemo(() => ({
    date: {
      now: now.toISOString(),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' }),
      monthName: calendarDays.monthName,
    },
    time: {
      hhmm: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      hhmmss: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      timestamp: now.getTime(),
    },
    music: {
      isPlaying: dreamIsPlaying,
      currentTrack: dreamCurrentTrack
        ? {
            title: dreamCurrentTrack.title,
            artist: dreamCurrentTrack.artist,
            album: dreamCurrentTrack.album,
            coverUrl: normalizeCustomWidgetImageUrl(dreamCurrentTrack.coverUrl),
            artworkUrl: normalizeCustomWidgetImageUrl(dreamCurrentTrack.coverUrl),
            picUrl: normalizeCustomWidgetImageUrl(dreamCurrentTrack.coverUrl),
            durationMs: dreamCurrentTrack.durationMs,
          }
        : null,
      togglePlayback: dreamTogglePlayback,
      playNext: dreamPlayNext,
      playPrev: dreamPlayPrev,
      listenTogether: dreamListenTogether
        ? {
            status: dreamListenTogether.status,
            companionId: dreamListenTogether.companionId,
            companionName: dreamListenTogether.companionName,
            companionAvatar: normalizeCustomWidgetImageUrl(dreamListenTogether.companionAvatar),
            inviterName: dreamListenTogether.inviterName,
            invitedAt: dreamListenTogether.invitedAt,
            acceptedAt: dreamListenTogether.acceptedAt,
          }
        : null,
      listenTogetherIdleSince: dreamListenTogetherIdleSince,
    },
  }), [
    calendarDays.monthName,
    dreamCurrentTrack,
    dreamIsPlaying,
    dreamListenTogether,
    dreamListenTogetherIdleSince,
    dreamPlayNext,
    dreamPlayPrev,
    dreamTogglePlayback,
    now,
  ]);
  const serializableCustomWidgetSystem = React.useMemo(() => ({
    ...customWidgetSystem,
    music: {
      ...customWidgetSystem.music,
      togglePlayback: undefined,
      playNext: undefined,
      playPrev: undefined,
    },
  }), [customWidgetSystem]);
  React.useEffect(() => {
    if (templateId !== 'custom-code') return;
    customWidgetFrameRef.current?.contentWindow?.postMessage({
      type: 'baobaobai:custom-widget-system-update',
      system: serializableCustomWidgetSystem,
    }, '*');
  }, [serializableCustomWidgetSystem, templateId]);
  const customWidgetHtml = React.useMemo(() => {
    if (templateId !== 'custom-code') return '';
    const source = normalizeCustomWidgetSource(widgetCode?.trim() || '');
    if (!source) return '';
    const serializedSystem = JSON.stringify(serializableCustomWidgetSystem).replace(/</g, '\\u003c');
    const systemBridgeScript = `<script>
window.system=${serializedSystem};
function bindBaobaobaiSystemActions(){
  window.system=window.system||{};
  window.system.music=window.system.music||{};
  window.system.music.togglePlayback=function(){window.parent.postMessage({type:'baobaobai:custom-widget-music-action',action:'togglePlayback'},'*')};
  window.system.music.playNext=function(){window.parent.postMessage({type:'baobaobai:custom-widget-music-action',action:'playNext'},'*')};
  window.system.music.playPrev=function(){window.parent.postMessage({type:'baobaobai:custom-widget-music-action',action:'playPrev'},'*')};
  window.triggerSystemAction=function(action){
    if(action==='togglePlayback'||action==='playNext'||action==='playPrev'){
      window.parent.postMessage({type:'baobaobai:custom-widget-music-action',action:action},'*');
    }
  };
}
bindBaobaobaiSystemActions();
var baobaobaiPress=null;
function clearBaobaobaiPress(){
  if(baobaobaiPress&&baobaobaiPress.timer) window.clearTimeout(baobaobaiPress.timer);
  baobaobaiPress=null;
}
window.addEventListener('pointerdown',function(event){
  clearBaobaobaiPress();
  var startX=event.clientX;
  var startY=event.clientY;
  var pointerId=event.pointerId;
  var timer=window.setTimeout(function(){
    if(!baobaobaiPress||baobaobaiPress.pointerId!==pointerId) return;
    window.parent.postMessage({type:'baobaobai:custom-widget-request-edit'},'*');
    clearBaobaobaiPress();
  },520);
  baobaobaiPress={pointerId:pointerId,startX:startX,startY:startY,timer:timer};
},true);
window.addEventListener('pointermove',function(event){
  if(!baobaobaiPress||baobaobaiPress.pointerId!==event.pointerId) return;
  var dx=event.clientX-baobaobaiPress.startX;
  var dy=event.clientY-baobaobaiPress.startY;
  if(Math.sqrt(dx*dx+dy*dy)>9) clearBaobaobaiPress();
},true);
window.addEventListener('pointerup',clearBaobaobaiPress,true);
window.addEventListener('pointercancel',clearBaobaobaiPress,true);
window.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='baobaobai:custom-widget-system-update') return;
  window.system=event.data.system||{};
  bindBaobaobaiSystemActions();
  window.dispatchEvent(new CustomEvent('baobaobai:system-update',{detail:window.system}));
});
window.addEventListener('message',function(event){
  if(!event.data||event.data.type!=='baobaobai:custom-widget-proxy-click') return;
  var point=event.data.point||{};
  var target=document.elementFromPoint(Number(point.x)||0,Number(point.y)||0);
  if(!target) return;
  ['pointerdown','pointerup','click'].forEach(function(type){
    var clickEvent=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:Number(point.x)||0,clientY:Number(point.y)||0});
    target.dispatchEvent(clickEvent);
  });
});
</script>`;
    const hasDocument = /<!doctype html|<html[\s>]/i.test(source);
    const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(source);
    const normalizedSource = normalizeCustomWidgetSource(source).replace(/\bclassName=/g, 'class=');
    const runtimeCss = buildRuntimeTailwindCss(normalizedSource);
    const looksLikeCssOnly =
      !hasHtmlTag &&
      /[{][\s\S]*[:][\s\S]*[}]/.test(source) &&
      !/function\s|=>|const\s|let\s|var\s|document\.|window\./.test(source);
    if (hasDocument) {
      const documentSource = normalizedSource.replace(
        /<head([^>]*)>/i,
        `<head$1>${systemBridgeScript}<style>${runtimeCss}</style>`
      );
      return /<head[\s>]/i.test(documentSource)
        ? documentSource
        : `${systemBridgeScript}<style>${runtimeCss}</style>${documentSource}`;
    }
    if (looksLikeCssOnly) {
      return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${systemBridgeScript}
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      ${runtimeCss}
      ${source}
    </style>
  </head>
  <body>
    <div class="widget">
      <div class="title">${name}</div>
      <div class="sub">${customWidgetSystem.time.hhmm}</div>
    </div>
  </body>
</html>`;
    }
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${systemBridgeScript}
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      * { box-sizing: border-box; }
      ${runtimeCss}
    </style>
  </head>
  <body><div class="custom-widget-runtime">${normalizedSource}</div></body>
</html>`;
  }, [name, templateId, widgetCode]);
  const customWidgetInlineMarkup = React.useMemo(() => {
    if (templateId !== 'custom-code') return '';
    const source = normalizeCustomWidgetSource(widgetCode?.trim() || '');
    if (!source) return '';
    const hasDocument = /<!doctype html|<html[\s>]/i.test(source);
    const hasScript = /<script[\s>]/i.test(source);
    const looksLikeCssOnly =
      !/<\/?[a-z][\s\S]*>/i.test(source) &&
      /[{][\s\S]*[:][\s\S]*[}]/.test(source) &&
      !/function\s|=>|const\s|let\s|var\s|document\.|window\./.test(source);
    if (hasDocument || hasScript || looksLikeCssOnly) return '';
    return wrapRuntimeMarkup(normalizeJsxLikeMarkup(source, customWidgetSystem));
  }, [customWidgetSystem, templateId, widgetCode]);

  if (hasBackground && !templateId) {
    return (
      <div
        className="w-full h-full overflow-hidden relative"
        style={{
          gridColumn: `span ${width}`,
          gridRow: `span ${height}`,
          borderRadius: resolvedRadius,
          boxShadow: shadowStyle,
        }}
      >
        <img src={backgroundImage} alt={name} className="w-full h-full object-cover" />
        {resolvedFrosted > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${resolvedFrosted}px)`,
              WebkitBackdropFilter: `blur(${resolvedFrosted}px)`,
              backgroundColor: `rgba(255, 255, 255, ${frostedOpacity})`,
            }}
          />
        )}
      </div>
    );
  }

  if (status === 'normal' && templateId) {
    if (templateId === 'glass-frame') {
      return (
        <div
          className="w-full h-full overflow-hidden relative border border-white/35 bg-white/16 text-white"
          style={{
            gridColumn: `span ${width}`,
            gridRow: `span ${height}`,
            borderRadius: resolvedRadius,
            boxShadow: shadowStyle,
            backdropFilter: 'blur(12px) saturate(170%)',
            WebkitBackdropFilter: 'blur(12px) saturate(170%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/24 via-white/6 to-white/14" />
        </div>
      );
    }

    const stopDesktopPointer = (event: React.SyntheticEvent) => {
      if (!isEditing) event.stopPropagation();
    };
    const handleInlineCustomWidgetClick = (event: React.MouseEvent<HTMLDivElement>) => {
      const actionTarget = (event.target as HTMLElement).closest('[data-baobaobai-music-action]');
      if (!actionTarget) return;
      event.stopPropagation();
      const action = actionTarget.getAttribute('data-baobaobai-music-action');
      runDreamMusicAction(action);
    };
    const clearCustomWidgetPress = () => {
      if (customWidgetPressRef.current?.timer) {
        window.clearTimeout(customWidgetPressRef.current.timer);
      }
      customWidgetPressRef.current = null;
    };
    const startCustomWidgetPress = (event: React.PointerEvent<HTMLDivElement>) => {
      if (isEditing) return;
      event.stopPropagation();
      clearCustomWidgetPress();
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const timer = window.setTimeout(() => {
        if (customWidgetPressRef.current?.pointerId !== pointerId) return;
        customWidgetPressRef.current.longPressed = true;
        onRequestDesktopEdit?.();
      }, 520);
      customWidgetPressRef.current = { pointerId, startX, startY, timer, longPressed: false };
      event.currentTarget.setPointerCapture(pointerId);
    };
    const moveCustomWidgetPress = (event: React.PointerEvent<HTMLDivElement>) => {
      const press = customWidgetPressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      const dx = event.clientX - press.startX;
      const dy = event.clientY - press.startY;
      if (Math.hypot(dx, dy) > 9 && !press.longPressed) {
        clearCustomWidgetPress();
      }
    };
    const endCustomWidgetPress = (event: React.PointerEvent<HTMLDivElement>) => {
      const press = customWidgetPressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const wasLongPress = press.longPressed;
      clearCustomWidgetPress();
      if (wasLongPress || isEditing) return;
      const frame = customWidgetFrameRef.current;
      const rect = frame?.getBoundingClientRect();
      if (!frame?.contentWindow || !rect) return;
      frame.contentWindow.postMessage({
        type: 'baobaobai:custom-widget-proxy-click',
        point: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
      }, '*');
    };
    const readPhotoFile = (file: File | undefined) => {
      if (!file || !onUpdateData) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateData({ backgroundImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div
        className={`w-full h-full overflow-hidden relative text-white ${
          isTransparentTemplate ? '' : 'border border-white/35 bg-white/16'
        }`}
        style={{
          gridColumn: `span ${width}`,
          gridRow: `span ${height}`,
          borderRadius: resolvedRadius,
          boxShadow: isTransparentTemplate ? 'none' : shadowStyle,
          backdropFilter: isTransparentTemplate ? undefined : 'blur(12px) saturate(170%)',
          WebkitBackdropFilter: isTransparentTemplate ? undefined : 'blur(12px) saturate(170%)',
        }}
      >
        {backgroundImage ? (
          <img src={backgroundImage} alt={name} className="absolute inset-0 h-full w-full object-cover opacity-80" />
        ) : null}
        {isTransparentTemplate ? null : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/24 via-white/6 to-white/14" />
        )}
        <div className="relative z-10 flex h-full flex-col justify-between p-3">
          {templateId === 'calendar-card' ? (
            <div className="relative h-full p-3 font-serif italic text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]">
              <div className="relative flex h-full flex-col">
                <div className="text-right text-[clamp(16px,6vw,30px)] font-semibold leading-none">{calendarDays.monthName}</div>
                <div className="mt-3 grid flex-1 grid-cols-7 gap-1 text-center text-[clamp(9px,3vw,16px)] font-semibold">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`} className="opacity-95">{day}</span>
                  ))}
                  {Array.from({ length: calendarDays.firstDay }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {calendarDays.days.map((day) => (
                    <span
                      key={day}
                      className={day === calendarDays.today ? 'rounded bg-white/78 px-1 text-stone-500 shadow-sm' : 'opacity-90'}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : templateId === 'vinyl-record' ? (
            <div className="relative flex h-full items-center justify-center overflow-hidden" onPointerDown={stopDesktopPointer}>
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.16)_0_9px,rgba(15,23,42,0.10)_9px_14px)]" />
              <div
                className="relative aspect-square"
                style={isWideVinyl ? { height: '82%' } : { width: '82%' }}
              >
                <div
                  className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(180,150,104,0.72)_0_18%,rgba(20,20,20,0.96)_19%_33%,rgba(7,7,8,0.98)_34%_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.30),inset_0_0_0_12px_rgba(255,255,255,0.035)] ${dreamIsPlaying ? 'animate-[spin_3.8s_linear_infinite]' : ''}`}
                >
                  <div className="absolute inset-[32%] overflow-hidden rounded-full border border-white/12 bg-stone-500/70">
                    {dreamCurrentTrack?.coverUrl || backgroundImage ? (
                      <img src={dreamCurrentTrack?.coverUrl || backgroundImage} alt={dreamCurrentTrack?.title || name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <svg
                  className="absolute left-[84%] top-[-8%] h-[100%] w-[52%] overflow-visible drop-shadow-[0_2px_8px_rgba(15,23,42,0.26)] transition-transform"
                  style={{ transform: dreamIsPlaying ? 'translateY(1px)' : 'translateY(0)' }}
                  viewBox="0 0 80 100"
                  aria-hidden="true"
                >
                  <path
                    d="M20 13 C19 34 14 56 7 73 C1 83 -5 89 -12 94"
                    fill="none"
                    stroke="rgba(255,255,255,0.84)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="absolute left-[84%] top-[-8%] grid h-[26%] w-[26%] place-items-center rounded-full border border-white/40 bg-black/70 shadow-[inset_0_1px_3px_rgba(255,255,255,0.22),0_8px_16px_rgba(15,23,42,0.22)]">
                  <div className="h-[50%] w-[50%] rounded-full border border-white/45 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
                </div>
              </div>
              {dreamCurrentTrack || musicTitle || musicArtist ? (
                <div className="absolute inset-x-2 bottom-2 rounded-full bg-black/24 px-2 py-1 text-center text-[10px] leading-tight text-white/90 backdrop-blur">
                  <div className="truncate">{dreamCurrentTrack?.title || musicTitle}</div>
                  <div className="truncate text-white/65">{dreamCurrentTrack?.artist || musicArtist}</div>
                </div>
              ) : null}
            </div>
          ) : templateId === 'listen-together' ? (
            <div
              className="relative h-full w-full overflow-hidden rounded-[inherit] border border-white/70 bg-white/28 text-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-18px_38px_rgba(255,255,255,0.2),0_12px_30px_rgba(148,163,184,0.12)] backdrop-blur-2xl"
              onPointerDown={stopDesktopPointer}
            >
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.08)_42%,rgba(255,255,255,0.34)_100%)]" />
              <div className="pointer-events-none absolute -inset-3 rounded-[inherit] border border-white/35 blur-[6px]" />
              {dreamListenTogether ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dreamClearListenTogether();
                  }}
                  className="absolute right-1.5 top-1.5 z-30 grid h-5 w-5 place-items-center rounded-full bg-white/62 text-[13px] font-semibold leading-none text-[#8A9099] shadow-[0_6px_14px_rgba(15,23,42,0.08)] active:bg-white/78"
                  aria-label="退出一起听"
                >
                  ×
                </button>
              ) : null}
              <div
                className={`absolute left-9 flex h-10 items-end gap-[4px] transition-[top] duration-300 ${dreamListenTogether ? 'top-3' : 'top-[54px]'}`}
                aria-hidden="true"
              >
                {listenTogetherBarHeights.map((barHeight, index) => (
                  <span
                    key={index}
                    className="w-[3px] rounded-full bg-[#30323A] transition-[height] duration-200 ease-out"
                    style={{ height: `${barHeight}px` }}
                  />
                ))}
              </div>
              {dreamListenTogether ? (
                <div className="absolute left-[30px] top-1.5 max-w-[42%] rounded-full bg-white/62 px-3 py-1.5 text-[10px] font-semibold text-[#7A7F8B] shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="truncate">与 {listenTogetherCompanionName} 一起听</div>
                </div>
              ) : null}
              {dreamListenTogether ? (
                <div className="absolute bottom-1.5 left-1.5 flex items-center">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[#E9F5FF] text-[17px] font-bold text-[#5B6C80] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
                    {wechatUserProfile.avatar ? (
                      <img src={wechatUserProfile.avatar} alt={listenTogetherInviterName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="relative mx-[-1px] h-8 w-12">
                    <svg
                      className="absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 overflow-visible"
                      viewBox="0 0 48 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M0 13 H9 L12 6 L15 22 L19 2 L22 13 H28 L32 7 L36 13 H48"
                        fill="none"
                        stroke="rgba(75,85,99,0.72)"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-[dream-heart-float_2.8s_linear_infinite] text-center text-[22px] leading-7 text-[#FF4B55]">
                      ♥
                    </div>
                  </div>
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[#EAF8F1] text-[17px] font-bold text-[#5B7168] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]">
                    {dreamListenTogether.companionAvatar ? (
                      <img src={dreamListenTogether.companionAvatar} alt={listenTogetherCompanionName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="absolute right-3 top-[22px] w-[48%] min-w-[136px]">
                <div className="truncate text-center text-[14px] font-black leading-tight">{dreamCurrentTrack?.title || musicTitle || '孙行者'}</div>
                <div className="relative mt-1 h-3 overflow-hidden text-center text-[9px] leading-3 text-[#6B7280]">
                  <div key={listenTogetherLyricText} className="animate-[dream-lyric-swap_420ms_ease-out]">
                    <div className="truncate">
                      {listenTogetherLyricText}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleListenTogetherMusicAction('playPrev')}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#1F2937] active:bg-slate-200/70"
                    aria-label="上一首"
                  >
                    <SkipBack size={18} fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleListenTogetherMusicAction('togglePlayback')}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ECECF0] text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.08)] active:scale-95"
                    aria-label={dreamIsPlaying ? '暂停' : '播放'}
                  >
                    {dreamIsPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleListenTogetherMusicAction('playNext')}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#1F2937] active:bg-slate-200/70"
                    aria-label="下一首"
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
              <style>{`
                @keyframes dream-heart-float {
                  0% { transform: translate(-14px, -50%) scale(0.72); opacity: 0; }
                  18% { opacity: 1; }
                  50% { transform: translate(-50%, -58%) scale(1); opacity: 1; }
                  100% { transform: translate(10px, -50%) scale(0.78); opacity: 0; }
                }
                @keyframes dream-lyric-swap {
                  0% { opacity: 0; transform: translateY(4px); }
                  100% { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          ) : templateId === 'clock-card' ? (
            <div className="flex h-full flex-col items-center justify-center text-white/82">
              <div className="text-[clamp(12px,5vw,22px)] font-semibold leading-none">
                {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="mt-1 text-[clamp(38px,20vw,96px)] font-black leading-none tracking-normal drop-shadow-[0_2px_2px_rgba(15,23,42,0.14)]">
                {now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          ) : templateId === 'custom-code' ? (
            customWidgetInlineMarkup ? (
              <div
                className="custom-widget-runtime h-full w-full"
                onPointerDown={startCustomWidgetPress}
                onPointerMove={moveCustomWidgetPress}
                onPointerUp={endCustomWidgetPress}
                onPointerCancel={clearCustomWidgetPress}
                onClick={handleInlineCustomWidgetClick}
                dangerouslySetInnerHTML={{ __html: customWidgetInlineMarkup }}
              />
            ) : customWidgetHtml ? (
              <div className="relative h-full w-full">
                <iframe
                  ref={customWidgetFrameRef}
                  title={name}
                  srcDoc={customWidgetHtml}
                  className={`h-full w-full border-0 bg-transparent ${isEditing ? 'pointer-events-none' : ''}`}
                  sandbox="allow-scripts"
                  onPointerDown={stopDesktopPointer}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
                <div
                  className="w-full whitespace-pre-wrap font-semibold leading-tight"
                  style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
                >
                  {titleText || name || 'Custom'}
                </div>
                <div className="whitespace-pre-wrap text-[12px] leading-5 text-white/75">
                  {subtitle || '组件代码为空'}
                </div>
              </div>
            )
          ) : templateId === 'text-card' ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center" onPointerDown={stopDesktopPointer}>
              {isEditing ? (
                <>
                  <input
                    value={titleText || '184 天'}
                    onChange={(event) => onUpdateData?.({ titleText: event.target.value })}
                    className="w-full bg-transparent text-center font-serif italic outline-none placeholder:text-white/50"
                    style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
                  />
                  <textarea
                    value={subtitle || '我们的纪念日\n2024.07.30'}
                    onChange={(event) => onUpdateData?.({ subtitle: event.target.value })}
                    className="min-h-10 w-full resize-none bg-transparent text-center text-[12px] leading-5 text-white/85 outline-none"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="color"
                      value={titleColor || '#ffffff'}
                      onChange={(event) => onUpdateData?.({ titleColor: event.target.value })}
                      className="h-5 w-7 rounded border border-white/30 bg-transparent"
                    />
                    <input
                      type="range"
                      min={14}
                      max={42}
                      value={titleFontSize || 22}
                      onChange={(event) => onUpdateData?.({ titleFontSize: Number(event.target.value) })}
                      className="w-20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="w-full whitespace-pre-wrap font-serif italic leading-tight"
                    style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 22}px` }}
                  >
                    {countdownDays === null ? titleText || '184 天' : `${countdownDays} 天`}
                  </div>
                  <div className="whitespace-pre-wrap text-[12px] leading-5 text-white/85">
                    {subtitle || '我们的纪念日\n2024.07.30'}
                  </div>
                </>
              )}
            </div>
          ) : templateId === 'headline' ? (
            <div className="flex h-full flex-col justify-center gap-2" onPointerDown={stopDesktopPointer}>
              <input
                value={titleText || name}
                onChange={(event) => onUpdateData?.({ titleText: event.target.value })}
                className="w-full bg-transparent text-center font-semibold outline-none placeholder:text-white/50"
                style={{ color: titleColor || '#ffffff', fontSize: `${titleFontSize || 24}px` }}
              />
              <div className="flex items-center justify-center gap-2">
                <input
                  type="color"
                  value={titleColor || '#ffffff'}
                  onChange={(event) => onUpdateData?.({ titleColor: event.target.value })}
                  className="h-5 w-7 rounded border border-white/30 bg-transparent"
                />
                <input
                  type="range"
                  min={14}
                  max={42}
                  value={titleFontSize || 24}
                  onChange={(event) => onUpdateData?.({ titleFontSize: Number(event.target.value) })}
                  className="w-20"
                />
              </div>
            </div>
          ) : templateId === 'ins-photo' ? (
            <label
              className={`relative flex h-full flex-col items-center justify-center gap-2 overflow-hidden text-center ${onUpdateData && isEditing ? 'cursor-pointer' : 'cursor-default'}`}
              onPointerDown={stopDesktopPointer}
              onClick={(event) => {
                if (!onUpdateData || !isEditing) event.preventDefault();
              }}
            >
              {onUpdateData && isEditing ? (
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => readPhotoFile(event.target.files?.[0])}
                />
              ) : null}
              {backgroundImage ? (
                <img src={backgroundImage} alt={name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-white/18" />
              )}
              <div className="absolute inset-2 rounded-[inherit] border border-white/35" />
              {isEditing ? (
                <div className="relative rounded-full border border-white/35 bg-white/22 px-3 py-1 text-[11px] font-semibold shadow-[0_6px_16px_rgba(15,23,42,0.14)] backdrop-blur">
                  {backgroundImage ? '更换照片' : '上传照片'}
                </div>
              ) : null}
            </label>
          ) : templateId === 'retro-music' || templateId === 'vinyl-record' ? (
            <div className="flex h-full flex-col justify-between" onPointerDown={stopDesktopPointer}>
              <div>
                <div className="text-[13px] font-semibold">{musicTitle || name}</div>
                <div className="mt-1 text-[10px] text-white/70">{musicArtist || subtitle}</div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button type="button" className="rounded-full bg-white/18 px-2 py-1 text-[11px]">上一首</button>
                <button
                  type="button"
                  className="rounded-full bg-white/28 px-3 py-1 text-[11px] font-semibold"
                  onClick={() => onUpdateData?.({ musicPlaying: !musicPlaying })}
                >
                  {musicPlaying ? '暂停' : '播放'}
                </button>
                <button type="button" className="rounded-full bg-white/18 px-2 py-1 text-[11px]">下一首</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[13px] font-semibold leading-tight drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]">
                  {name}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-[10px] leading-tight text-white/72 drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <div className="flex items-end justify-between">
                <div className="text-[10px] font-semibold text-white/64">
                  {width}x{height}
                </div>
                <div
                  className="rounded-[10px] border border-white/18 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                  style={{
                    width: `${Math.min(72, Math.max(18, width * 18))}px`,
                    height: `${Math.min(56, Math.max(18, height * 14))}px`,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        w-full h-full
        bg-gradient-to-br from-slate-100 to-slate-200
        rounded-2xl
        flex flex-col items-center justify-center
        relative overflow-hidden
        ${sizeClass}
      `}
      style={{
        gridColumn: `span ${width}`,
        gridRow: `span ${height}`,
      }}
    >
      {/* 背景装饰 - 网格纹理 */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* 主图标区域 */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {defaultIcon ? (
          <img
            src={defaultIcon}
            alt={name}
            className="w-12 h-12 object-contain opacity-40 grayscale"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-300/50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
        )}

        {/* 状态文案 */}
        <div className="text-center">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">加载中...</span>
            </div>
          ) : status === 'normal' ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-500 font-medium">正常</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-500 font-medium">建设中</span>
            </div>
          )}
        </div>

        {/* Widget 名称 */}
        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate max-w-[80%]">
          {name}
        </span>
      </div>

      {/* 加载动画效果 */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default WidgetPlaceholder;
