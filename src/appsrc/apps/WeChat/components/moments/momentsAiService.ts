import type { GlobalSettings } from '../../../../../core/sdk/types';
import type { WeChatMoment } from '../../types';
import { parseAiMomentDrafts, pickModelId } from './momentsUtils';
import { renderPaperMagicPrompt, renderPaperMagicText } from '../../../papermagic/promptCatalog';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const IMAGE_MODEL_FALLBACKS = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];

export interface AiAuthor {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  greeting?: string;
}

interface RequestAiMomentsParams {
  settings: GlobalSettings;
  count: number;
  authors: AiAuthor[];
  includeImages: boolean;
}

interface RequestAiImageParams {
  settings: GlobalSettings;
  prompt: string;
}

interface AppendAiMomentsParams {
  settings: GlobalSettings;
  count: number;
  authors: AiAuthor[];
  focusAuthorId?: string | null;
  includeImages: boolean;
  lastRefreshAuthorId: string | null;
  addMoment: (moment: Omit<WeChatMoment, 'id' | 'timestamp' | 'likes' | 'comments'>) => void;
}

export interface AppendAiMomentsResult {
  generatedCount: number;
  generatedImageCount: number;
  lastRefreshAuthorId: string | null;
}

const getChatApiKey = (settings: GlobalSettings): string => settings.apiKey?.trim() || '';

const getImageApiKey = (settings: GlobalSettings): string =>
  (settings.imageApiKey || settings.apiKey || '').trim();

const getChatBaseUrl = (settings: GlobalSettings): string =>
  (settings.baseUrl || DEFAULT_BASE_URL).trim();

const getImageBaseUrl = (settings: GlobalSettings): string =>
  (settings.imageBaseUrl || settings.baseUrl || DEFAULT_BASE_URL).trim();

const requestAiMoments = async ({
  settings,
  count,
  authors,
  includeImages,
}: RequestAiMomentsParams) => {
  const apiKey = getChatApiKey(settings);
  if (!apiKey) {
    throw new Error('missing-chat-api-key');
  }

  if (authors.length === 0 || count <= 0) {
    return [];
  }

  const baseUrl = getChatBaseUrl(settings);
  const authorPayload = authors.map((author) => ({
    authorId: author.id,
    name: author.name,
    description: (author.description || '').slice(0, 80),
    greeting: (author.greeting || '').slice(0, 80),
  }));

  const momentsPrompt = renderPaperMagicPrompt('wechat.moments.generateDrafts', {
    count,
    authorPayloadJson: JSON.stringify(authorPayload),
    imageInstruction: includeImages ? '尽量提供 imagePrompt 用于配图。' : 'imagePrompt 置为空字符串。',
  });
  const systemPrompt = momentsPrompt.system || '';
  const userPrompt = momentsPrompt.user || '';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-3.5-turbo',
      temperature: settings.temperature ?? 0.7,
      max_tokens: Math.min(2200, Math.max(500, settings.maxTokens || 1500)),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`moments-chat-api-failed-${response.status}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (typeof rawContent !== 'string') {
    return [];
  }

  return parseAiMomentDrafts(
    rawContent,
    authors.map((author) => author.id),
    authors[0].id
  ).slice(0, count);
};

const discoverImageModels = async (
  baseUrl: string,
  apiKey: string,
  preferredImageModel: string
): Promise<string[]> => {
  let models = [
    ...(preferredImageModel ? [preferredImageModel] : []),
    ...IMAGE_MODEL_FALLBACKS,
  ];

  try {
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!modelsResponse.ok) {
      return models;
    }

    const modelData = await modelsResponse.json();
    const discovered = Array.isArray(modelData?.data)
      ? modelData.data
          .map(pickModelId)
          .filter((id): id is string => Boolean(id))
          .filter((id) => /(image|dall|flux|sd|stability)/i.test(id))
      : [];

    models = [
      ...new Set([
        ...(preferredImageModel ? [preferredImageModel] : []),
        ...discovered,
        ...IMAGE_MODEL_FALLBACKS,
      ]),
    ];
  } catch {
    // ignore model discovery errors and use fallback models
  }

  return models;
};

const requestAiImage = async ({ settings, prompt }: RequestAiImageParams): Promise<string | null> => {
  const apiKey = getImageApiKey(settings);
  if (!apiKey) {
    return null;
  }

  const baseUrl = getImageBaseUrl(settings);
  const preferredImageModel = settings.imageModel?.trim() || '';
  const imageSize = settings.imageSize || '1024x1024';
  const candidateModels = await discoverImageModels(baseUrl, apiKey, preferredImageModel);

  const payloadVariants = (model: string) => [
    { model, prompt, size: imageSize, response_format: 'b64_json' },
    { model, prompt, size: imageSize },
    ...(imageSize === '512x512'
      ? []
      : [{ model, prompt, size: '512x512', response_format: 'b64_json' }]),
  ];

  for (const model of candidateModels) {
    for (const payload of payloadVariants(model)) {
      try {
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const firstImage = data?.data?.[0];
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
      } catch {
        // ignore single-attempt errors
      }
    }
  }

  return null;
};

const pickRefreshAuthors = (
  authors: AiAuthor[],
  focusAuthorId: string | null | undefined,
  lastRefreshAuthorId: string | null
): { selectedAuthors: AiAuthor[]; nextLastRefreshAuthorId: string | null } => {
  if (authors.length === 0) {
    return { selectedAuthors: [], nextLastRefreshAuthorId: lastRefreshAuthorId };
  }

  if (focusAuthorId || authors.length === 1) {
    return {
      selectedAuthors: [authors[0]],
      nextLastRefreshAuthorId: authors[0].id,
    };
  }

  const available = authors.filter((author) => author.id !== lastRefreshAuthorId);
  const pool = available.length > 0 ? available : authors;
  const randomAuthor = pool[Math.floor(Math.random() * pool.length)];

  return {
    selectedAuthors: [randomAuthor],
    nextLastRefreshAuthorId: randomAuthor.id,
  };
};

export const appendAiMoments = async ({
  settings,
  count,
  authors,
  focusAuthorId,
  includeImages,
  lastRefreshAuthorId,
  addMoment,
}: AppendAiMomentsParams): Promise<AppendAiMomentsResult> => {
  if (authors.length === 0 || count <= 0) {
    return {
      generatedCount: 0,
      generatedImageCount: 0,
      lastRefreshAuthorId,
    };
  }

  const { selectedAuthors, nextLastRefreshAuthorId } = pickRefreshAuthors(
    authors,
    focusAuthorId,
    lastRefreshAuthorId
  );

  const drafts = await requestAiMoments({
    settings,
    count,
    authors: selectedAuthors,
    includeImages,
  });

  if (drafts.length === 0) {
    throw new Error('moments-empty-drafts');
  }

  let generatedImageCount = 0;

  for (const draft of drafts) {
    const author = selectedAuthors.find((item) => item.id === draft.authorId) ?? selectedAuthors[0];
    const images: string[] = [];

    if (includeImages) {
      const imagePrompt =
        draft.imagePrompt || renderPaperMagicText('wechat.moments.fallbackImage', {
          authorName: author.name,
          content: draft.content,
        });
      const generatedImage = await requestAiImage({ settings, prompt: imagePrompt });
      if (generatedImage) {
        images.push(generatedImage);
        generatedImageCount += 1;
      }
    }

    addMoment({
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar || '',
      content: draft.content,
      images,
    });
  }

  return {
    generatedCount: drafts.length,
    generatedImageCount,
    lastRefreshAuthorId: nextLastRefreshAuthorId,
  };
};
