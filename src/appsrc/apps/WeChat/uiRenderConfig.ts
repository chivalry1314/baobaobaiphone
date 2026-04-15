import type { WeChatUiRenderConfig } from './types';

const STYLE_KEYS = [
  'chatBackgroundStyle',
  'selfBubbleStyle',
  'peerBubbleStyle',
  'selfTextStyle',
  'peerTextStyle',
] as const;

const toCamelCase = (value: string): string =>
  value.replace(/[-_]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());

const normalizeStyleRecord = (
  value: unknown
): Record<string, string | number> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const normalized: Record<string, string | number> = {};
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') continue;
    normalized[toCamelCase(rawKey)] = rawValue;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const normalizeUiStyleRecord = (
  styleRecord?: Record<string, string | number>
) => {
  if (!styleRecord) return undefined;
  const entries = Object.entries(styleRecord);
  if (entries.length === 0) return undefined;
  return entries.reduce<Record<string, string | number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const stripCodeFence = (source: string): string => {
  const trimmed = source.trim().replace(/^\uFEFF/, '');
  const match = trimmed.match(/^```(?:json|js|javascript|ts|typescript)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
};

const stripTrailingSemicolon = (source: string): string => source.replace(/;\s*$/, '').trim();

const normalizeParsedConfig = (parsed: unknown): WeChatUiRenderConfig | null => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;
  const config: WeChatUiRenderConfig = {};

  if (typeof obj.chatBackgroundImage === 'string') {
    config.chatBackgroundImage = obj.chatBackgroundImage;
  }

  for (const key of STYLE_KEYS) {
    const styleRecord = normalizeStyleRecord(obj[key]);
    if (styleRecord) {
      config[key] = styleRecord;
    }
  }

  return config;
};

const evaluateSource = (source: string): unknown => {
  const fn = new Function(
    'module',
    'exports',
    `"use strict";
${source}
return module.exports?.default ?? module.exports ?? (typeof renderConfig !== "undefined" ? renderConfig : null);`
  );
  const moduleRef: { exports: unknown } = { exports: {} };
  return fn(moduleRef, moduleRef.exports);
};

export const parseWeChatUiRenderConfig = (source: string): WeChatUiRenderConfig | null => {
  const normalizedSource = stripCodeFence(source);
  if (!normalizedSource) return null;

  const jsonCandidate = stripTrailingSemicolon(normalizedSource);
  try {
    const parsedJson = JSON.parse(jsonCandidate);
    const normalizedJson = normalizeParsedConfig(parsedJson);
    if (normalizedJson) return normalizedJson;
  } catch {
    // ignore and fallback to JS-style parsing
  }

  const expressionCandidate = stripTrailingSemicolon(normalizedSource);
  const evalCandidates = Array.from(
    new Set(
      [
        normalizedSource,
        normalizedSource.replace(/^\s*export\s+default\s+/, 'module.exports = '),
        `module.exports = (${expressionCandidate});`,
        `const renderConfig = (${expressionCandidate});`,
      ].filter((item) => item.trim().length > 0)
    )
  );

  for (const candidate of evalCandidates) {
    try {
      const parsed = evaluateSource(candidate);
      const normalized = normalizeParsedConfig(parsed);
      if (normalized) return normalized;
    } catch {
      // try next candidate
    }
  }

  return null;
};
