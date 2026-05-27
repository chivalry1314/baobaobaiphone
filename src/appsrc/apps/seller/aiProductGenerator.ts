import type { GlobalSettings } from '../../../core/sdk/types';
import type { CommerceStore } from '../../shared/business/commerce/domain/types';
import { renderPaperMagicPrompt, renderPaperMagicText } from '../papermagic/promptCatalog';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_AI_PRODUCT_COUNT = 6;
const IMAGE_MODEL_FALLBACK = 'gpt-image-1';
const IMAGE_GENERATION_CONCURRENCY = 3;
const IMAGE_GENERATION_TIMEOUT_MS = 12000;

export interface SellerAiProductDraft {
  title: string;
  category: string;
  price: number;
  stock: number;
  desc: string;
  imagePrompt: string;
  imageDataUrl: string | null;
}

interface GenerateSellerProductsParams {
  settings: GlobalSettings;
  store: CommerceStore;
  categoryOptions: string[];
  count?: number;
}

const STORE_KIND_LABEL_MAP: Record<CommerceStore['kind'], string> = {
  dessert: '甜品店',
  flower: '鲜花店',
  movie: '电影票店铺',
};

const trimText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolveImageApiKey = (settings: GlobalSettings): string =>
  trimText(settings.imageApiKey) || trimText(settings.apiKey);

const resolveImageBaseUrl = (settings: GlobalSettings): string =>
  trimText(settings.imageBaseUrl) || trimText(settings.baseUrl) || DEFAULT_BASE_URL;

const hasExplicitImageConfig = (settings: GlobalSettings): boolean =>
  Boolean(trimText(settings.imageApiKey));

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const parseNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPriceRange = (kind: CommerceStore['kind']): { min: number; max: number; fallback: number } => {
  if (kind === 'movie') return { min: 29, max: 168, fallback: 49 };
  if (kind === 'flower') return { min: 39, max: 399, fallback: 99 };
  return { min: 12, max: 129, fallback: 32 };
};

const getStockRange = (kind: CommerceStore['kind']): { min: number; max: number; fallback: number } => {
  if (kind === 'movie') return { min: 20, max: 300, fallback: 88 };
  if (kind === 'flower') return { min: 10, max: 120, fallback: 36 };
  return { min: 20, max: 200, fallback: 66 };
};

const buildCategoryOptions = (store: CommerceStore, categoryOptions: string[]): string[] => {
  const base = [
    ...categoryOptions,
    trimText(store.categoryLabel),
    trimText(store.typeName),
    store.kind === 'movie' ? '电影票' : '',
    store.kind === 'flower' ? '鲜花' : '',
    store.kind === 'dessert' ? '甜品' : '',
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(base)];
};

const buildFallbackDesc = (store: CommerceStore, title: string, category: string): string => {
  if (store.kind === 'movie') return `${title}，场次灵活，支持在线选座购票。`;
  if (store.kind === 'flower') return `${category}${title}，花材新鲜，适合送礼和日常表达心意。`;
  return `${category}${title}，口感丰富，适合下午茶和日常解馋。`;
};

const buildFallbackImagePrompt = (store: CommerceStore, title: string, category: string): string => {
  if (store.kind === 'movie') {
    return renderPaperMagicText('seller.productImageFallback.movie', { title, category });
  }
  if (store.kind === 'flower') {
    return renderPaperMagicText('seller.productImageFallback.flower', { title, category });
  }
  return renderPaperMagicText('seller.productImageFallback.dessert', { title, category });
};

const parseProductArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const objectValue = value as { products?: unknown; items?: unknown; list?: unknown };
  if (Array.isArray(objectValue.products)) return objectValue.products;
  if (Array.isArray(objectValue.items)) return objectValue.items;
  if (Array.isArray(objectValue.list)) return objectValue.list;
  return [];
};

const normalizeDraft = (
  value: unknown,
  store: CommerceStore,
  categoryOptions: string[]
): Omit<SellerAiProductDraft, 'imageDataUrl'> | null => {
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const title =
    trimText(item.title) || trimText(item.name) || trimText(item.productTitle) || trimText(item.product_name);
  const category =
    trimText(item.category) ||
    trimText(item.type) ||
    trimText(item.categoryLabel) ||
    categoryOptions[0] ||
    trimText(store.typeName) ||
    '精选';
  const priceRange = getPriceRange(store.kind);
  const stockRange = getStockRange(store.kind);
  const parsedPrice =
    parseNumber(item.price) ??
    parseNumber(item.salePrice) ??
    parseNumber(item.unitPrice) ??
    priceRange.fallback;
  const parsedStock =
    parseNumber(item.stock) ??
    parseNumber(item.inventory) ??
    parseNumber(item.qty) ??
    stockRange.fallback;
  const desc =
    trimText(item.desc) ||
    trimText(item.description) ||
    trimText(item.subtitle) ||
    buildFallbackDesc(store, title, category);
  const imagePrompt =
    trimText(item.imagePrompt) ||
    trimText(item.image_prompt) ||
    trimText(item.prompt) ||
    buildFallbackImagePrompt(store, title, category);

  if (!title) return null;

  return {
    title: title.slice(0, 40),
    category,
    price: Number(clampNumber(parsedPrice, priceRange.min, priceRange.max).toFixed(2)),
    stock: Math.floor(clampNumber(parsedStock, stockRange.min, stockRange.max)),
    desc: desc.slice(0, 120),
    imagePrompt,
  };
};

const parseSellerAiProductDrafts = (
  raw: string,
  store: CommerceStore,
  categoryOptions: string[]
): Array<Omit<SellerAiProductDraft, 'imageDataUrl'>> => {
  const parse = (source: string) => {
    const parsed = JSON.parse(source);
    return parseProductArray(parsed)
      .map((item) => normalizeDraft(item, store, categoryOptions))
      .filter((item): item is Omit<SellerAiProductDraft, 'imageDataUrl'> => Boolean(item));
  };

  try {
    const direct = parse(raw);
    if (direct.length > 0) return direct;
  } catch {
    // ignore invalid direct JSON
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      const fromFence = parse(fenced[1]);
      if (fromFence.length > 0) return fromFence;
    } catch {
      // ignore invalid fenced JSON
    }
  }

  const firstArrayStart = raw.indexOf('[');
  const lastArrayEnd = raw.lastIndexOf(']');
  if (firstArrayStart >= 0 && lastArrayEnd > firstArrayStart) {
    try {
      const sliced = parse(raw.slice(firstArrayStart, lastArrayEnd + 1));
      if (sliced.length > 0) return sliced;
    } catch {
      // ignore invalid sliced JSON
    }
  }

  return [];
};

const requestSellerProductDrafts = async (
  settings: GlobalSettings,
  store: CommerceStore,
  categoryOptions: string[],
  count: number
): Promise<Array<Omit<SellerAiProductDraft, 'imageDataUrl'>>> => {
  const apiKey = trimText(settings.apiKey);
  if (!apiKey) {
    throw new Error('missing-chat-api-key');
  }

  const baseUrl = trimText(settings.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('missing-chat-base-url');
  }

  const storeTitle = trimText(store.signboard) || trimText(store.name) || '店铺';
  const storeType = trimText(store.typeName) || STORE_KIND_LABEL_MAP[store.kind];
  const storeDescription = trimText(store.description);
  const categoryList = buildCategoryOptions(store, categoryOptions);
  const model = trimText(settings.model) || 'gpt-4o-mini';
  const productPrompt = renderPaperMagicPrompt('seller.productDrafts', {
    storeKindLabel: STORE_KIND_LABEL_MAP[store.kind],
    count,
    storeTitle,
    storeType,
    storeDescription: storeDescription || '暂无',
    categoryList: categoryList.join('、') || '无',
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: settings.temperature ?? 0.8,
      max_tokens: Math.min(2600, Math.max(1200, settings.maxTokens || 1800)),
      messages: [
        {
          role: 'system',
          content: productPrompt.system || '',
        },
        {
          role: 'user',
          content: productPrompt.user || '',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`chat-api-failed-${response.status}`);
  }

  const data = await response.json().catch(() => null);
  const rawContent = data?.choices?.[0]?.message?.content;
  if (typeof rawContent !== 'string') {
    throw new Error('invalid-chat-response');
  }

  const drafts = parseSellerAiProductDrafts(rawContent, store, categoryList).slice(0, count);
  if (drafts.length === 0) {
    throw new Error('empty-ai-products');
  }

  return drafts;
};

const resolveImageResponse = (payload: any): string | null => {
  const firstImage = payload?.data?.[0];
  if (typeof firstImage?.b64_json === 'string' && firstImage.b64_json.length > 0) {
    return `data:image/png;base64,${firstImage.b64_json}`;
  }
  if (typeof firstImage?.base64 === 'string' && firstImage.base64.length > 0) {
    return `data:image/png;base64,${firstImage.base64}`;
  }
  if (typeof firstImage?.url === 'string' && firstImage.url.length > 0) {
    return firstImage.url;
  }
  if (typeof firstImage?.image_url === 'string' && firstImage.image_url.length > 0) {
    return firstImage.image_url;
  }
  return null;
};

const requestSellerProductImage = async (
  settings: GlobalSettings,
  prompt: string
): Promise<string | null> => {
  if (!hasExplicitImageConfig(settings)) {
    return null;
  }

  const apiKey = resolveImageApiKey(settings);
  if (!apiKey) {
    return null;
  }

  const baseUrl = resolveImageBaseUrl(settings).replace(/\/+$/, '');
  if (!baseUrl) {
    return null;
  }

  const preferredModel = trimText(settings.imageModel) || IMAGE_MODEL_FALLBACK;
  const size = trimText(settings.imageSize) || '1024x1024';
  const candidateModels = [...new Set([preferredModel, IMAGE_MODEL_FALLBACK].filter(Boolean))];
  const candidateSizes = [...new Set([size, '512x512'])];

  for (const model of candidateModels) {
    for (const candidateSize of candidateSizes) {
      const payloads = [
        { model, prompt, size: candidateSize, response_format: 'b64_json' },
        { model, prompt, size: candidateSize },
      ];

      for (const payload of payloads) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

        try {
          const response = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) continue;
          const data = await response.json().catch(() => null);
          const resolved = resolveImageResponse(data);
          if (resolved) return resolved;
        } catch {
          // ignore single generation failure and try next candidate
        } finally {
          window.clearTimeout(timeoutId);
        }
      }
    }
  }

  return null;
};

const mapWithConcurrency = async <TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> => {
  if (items.length === 0) return [];

  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};

export const generateSellerProducts = async ({
  settings,
  store,
  categoryOptions,
  count = DEFAULT_AI_PRODUCT_COUNT,
}: GenerateSellerProductsParams): Promise<SellerAiProductDraft[]> => {
  const normalizedCount = Math.max(1, Math.min(50, Math.floor(count || DEFAULT_AI_PRODUCT_COUNT)));
  const drafts = await requestSellerProductDrafts(settings, store, categoryOptions, normalizedCount);
  return mapWithConcurrency(drafts, IMAGE_GENERATION_CONCURRENCY, async (draft) => {
    const imageDataUrl = await requestSellerProductImage(settings, draft.imagePrompt);
    return {
      ...draft,
      imageDataUrl,
    };
  });
};

export const formatSellerProductGenerationError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  if (message === 'missing-chat-api-key') return '请先在 API 设置中填写对话 API Key';
  if (message === 'missing-chat-base-url') return '请先在 API 设置中填写对话 API 地址';
  if (message === 'missing-image-api-key') return '请先在 API 设置中填写生图 API Key';
  if (message === 'missing-image-base-url') return '请先在 API 设置中填写生图 API 地址';
  if (message === 'invalid-chat-response' || message === 'empty-ai-products') {
    return 'AI 没有返回有效商品数据，请稍后重试';
  }
  if (message.startsWith('chat-api-failed-')) {
    return `商品草稿生成失败：${message.replace('chat-api-failed-', 'HTTP ')}`;
  }
  return 'AI 生成商品失败，请检查 API 配置后重试';
};
