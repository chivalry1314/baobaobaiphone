export type VisionSupportState = 'supported' | 'unsupported' | 'unknown';

const SUPPORT_PATTERNS: RegExp[] = [
  /gpt-4o/i,
  /gpt-4\.1/i,
  /gpt-4\.5/i,
  /gpt-4-turbo/i,
  /gpt-4-vision/i,
  /\bo1\b/i,
  /\bo3\b/i,
  /\bo4\b/i,
  /claude-3/i,
  /claude-4/i,
  /gemini/i,
  /qwen.*vl/i,
  /glm-4v/i,
  /doubao.*vision/i,
  /internvl/i,
  /llava/i,
  /vision/i,
  /multimodal/i,
];

const UNSUPPORT_PATTERNS: RegExp[] = [/gpt-3\.5/i, /text-davinci/i, /babbage/i, /curie/i, /ada/i];

export const detectVisionSupportByModel = (modelName: string): VisionSupportState => {
  const normalized = modelName.trim();
  if (!normalized) return 'unknown';
  if (UNSUPPORT_PATTERNS.some((pattern) => pattern.test(normalized))) return 'unsupported';
  if (SUPPORT_PATTERNS.some((pattern) => pattern.test(normalized))) return 'supported';
  return 'unknown';
};

export const isLikelyVisionChatModel = (modelName: string): boolean =>
  detectVisionSupportByModel(modelName) === 'supported';

