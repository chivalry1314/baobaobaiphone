import type { CustomWidgetDefinition } from '../../../core/stores/types';

export interface ParsedDesktopWidget {
  name: string;
  width: number;
  height: number;
  cornerRadius: number;
  frosted: number;
  shadow: number;
  backgroundOpacity: number;
  html: string;
}

const parseIntSafe = (value: string | undefined | null, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const parseDesktopWidgetHtml = (html: string, fallbackName: string): ParsedDesktopWidget => {
  const trimmedHtml = html.trim();
  const result: ParsedDesktopWidget = {
    name: fallbackName,
    width: 2,
    height: 2,
    cornerRadius: 22,
    frosted: 8,
    shadow: 12,
    backgroundOpacity: 0,
    html: trimmedHtml,
  };

  if (typeof window === 'undefined' || !trimmedHtml) {
    return result;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmedHtml, 'text/html');
    const metaTags = doc.querySelectorAll('meta');

    metaTags.forEach((meta) => {
      const name = (meta.getAttribute('name') || '').trim().toLowerCase();
      const content = meta.getAttribute('content') || '';

      switch (name) {
        case 'widget-name':
          if (content.trim()) {
            result.name = content.trim();
          }
          break;
        case 'widget-width':
          result.width = clamp(parseIntSafe(content, 2), 1, 4);
          break;
        case 'widget-height':
          result.height = clamp(parseIntSafe(content, 2), 1, 6);
          break;
        case 'widget-corner-radius':
          result.cornerRadius = clamp(parseIntSafe(content, 22), 0, 64);
          break;
        case 'widget-frosted':
          result.frosted = clamp(parseIntSafe(content, 8), 0, 64);
          break;
        case 'widget-shadow':
          result.shadow = clamp(parseIntSafe(content, 12), 0, 64);
          break;
        case 'widget-background-opacity':
          result.backgroundOpacity = clamp(parseIntSafe(content, 0), 0, 100);
          break;
        default:
          break;
      }
    });
  } catch {
    // 解析失败时返回默认值
  }

  return result;
};

export const createCustomWidgetDefinition = (
  parsed: ParsedDesktopWidget,
  id: string
): CustomWidgetDefinition => ({
  id,
  name: parsed.name,
  width: parsed.width,
  height: parsed.height,
  templateId: 'custom-code',
  widgetCode: parsed.html,
  cornerRadius: parsed.cornerRadius,
  frosted: parsed.frosted,
  shadow: parsed.shadow,
  backgroundOpacity: parsed.backgroundOpacity / 100,
  data: {
    name: parsed.name,
    templateId: 'custom-code',
    widgetCode: parsed.html,
    cornerRadius: parsed.cornerRadius,
    frosted: parsed.frosted,
    shadow: parsed.shadow,
    backgroundOpacity: parsed.backgroundOpacity / 100,
  },
});
