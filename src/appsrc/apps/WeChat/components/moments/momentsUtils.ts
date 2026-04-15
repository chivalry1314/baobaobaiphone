export const MAX_UPLOAD_IMAGES = 9;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const formatMomentTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;

  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${dayOfMonth} ${hours}:${minutes}`;
};

export const compressImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-file-failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('decode-image-failed'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1280;
        const MIN_MODEL_SIZE = 32;
        let { width, height } = image;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height >= width && height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        const targetWidth = Math.max(width, MIN_MODEL_SIZE);
        const targetHeight = Math.max(height, MIN_MODEL_SIZE);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas-failed'));
          return;
        }

        const drawX = Math.round((targetWidth - width) / 2);
        const drawY = Math.round((targetHeight - height) / 2);
        ctx.drawImage(image, drawX, drawY, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result ?? '');
    };

    reader.readAsDataURL(file);
  });

export interface AiMomentDraft {
  authorId: string;
  content: string;
  imagePrompt?: string;
}

const parseMomentsArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const moments = (value as { moments?: unknown }).moments;
  return Array.isArray(moments) ? moments : [];
};

export const parseAiMomentDrafts = (
  raw: string,
  validAuthorIds: string[],
  fallbackAuthorId: string
): AiMomentDraft[] => {
  const normalize = (value: unknown): AiMomentDraft | null => {
    if (!value || typeof value !== 'object') return null;

    const item = value as Record<string, unknown>;
    const authorId =
      typeof item.authorId === 'string' && validAuthorIds.includes(item.authorId)
        ? item.authorId
        : fallbackAuthorId;
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    const imagePromptRaw =
      (typeof item.imagePrompt === 'string' && item.imagePrompt) ||
      (typeof item.image_prompt === 'string' && item.image_prompt) ||
      (typeof item.prompt === 'string' && item.prompt) ||
      '';
    const imagePrompt = imagePromptRaw.trim() || undefined;

    if (!content) return null;
    return { authorId, content, imagePrompt };
  };

  const parse = (source: string): AiMomentDraft[] => {
    const parsed = JSON.parse(source);
    return parseMomentsArray(parsed)
      .map(normalize)
      .filter((item): item is AiMomentDraft => Boolean(item));
  };

  try {
    const direct = parse(raw);
    if (direct.length > 0) return direct;
  } catch {
    // ignore invalid direct payload
  }

  const firstArrayStart = raw.indexOf('[');
  const lastArrayEnd = raw.lastIndexOf(']');
  if (firstArrayStart >= 0 && lastArrayEnd > firstArrayStart) {
    try {
      const sliced = raw.slice(firstArrayStart, lastArrayEnd + 1);
      const list = parse(sliced);
      if (list.length > 0) return list;
    } catch {
      // ignore invalid sliced payload
    }
  }

  return [];
};

export const pickModelId = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
};
