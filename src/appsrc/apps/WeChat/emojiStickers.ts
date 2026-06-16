import {
  createIdbStore,
  deleteRecord,
  getRecord,
  listStoreKeys,
  setRecord,
} from '../../../core/idb/client';

export interface WeChatGifSticker {
  id: string;
  name: string;
  url: string;
  online?: boolean;
  custom?: boolean;
  systemPack?: string;
  packId?: string;
  meaning?: string;
  fileLabel?: string;
}

export interface WeChatStickerPack {
  id: string;
  name: string;
  coverUrl?: string;
  createdAt: number;
  source?: 'local' | 'online';
  themeId?: string;
  enabled?: boolean;
}

const STICKER_ASSET_VERSION = '202605212224';
const CUSTOM_STICKER_STORAGE_KEY = 'baobaobaiphone:wechat:custom-gif-stickers';
const STICKER_PACK_STORAGE_KEY = 'baobaobaiphone:wechat:custom-sticker-packs';
const STICKER_IMAGE_DB_NAME = 'baobaobaiphone-wechat';
const STICKER_IMAGE_STORE_NAME = 'sticker-images';
export const WECHAT_CUSTOM_STICKERS_CHANGED_EVENT = 'baobaobaiphone:wechat:custom-stickers-changed';
export const WECHAT_STICKER_PACKS_CHANGED_EVENT = 'baobaobaiphone:wechat:sticker-packs-changed';

const stickerImageStore = createIdbStore({
  dbName: STICKER_IMAGE_DB_NAME,
  storeName: STICKER_IMAGE_STORE_NAME,
});

const withStickerVersion = (url: string): string => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${STICKER_ASSET_VERSION}`;
};
const ONLINE_GIF_TOKEN_PREFIX = 'gif';

export const encodeWeChatStickerToken = (sticker: WeChatGifSticker): string => {
  if (sticker.online) {
    return `[${ONLINE_GIF_TOKEN_PREFIX}:${encodeURIComponent(sticker.name)}:${encodeURIComponent(sticker.url)}]`;
  }
  return `[${sticker.name}]`;
};

export const decodeWeChatOnlineStickerToken = (token: string): WeChatGifSticker | null => {
  const match = token.match(/^\[gif:([^:\]]+):([^\]]+)\]$/);
  if (!match) return null;
  try {
    const name = decodeURIComponent(match[1]);
    const url = decodeURIComponent(match[2]);
    if (!name || !url) return null;
    return {
      id: `online-${name}-${url}`,
      name,
      url,
      online: true,
    };
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseStickerMeta = (item: Record<string, unknown>): Omit<WeChatGifSticker, 'url'> | null => {
  const id = String(item.id || '');
  const name = String(item.name || '表情');
  if (!id || !name) return null;
  return {
    id,
    name,
    custom: true,
    online: Boolean(item.online),
    systemPack: typeof item.systemPack === 'string' ? item.systemPack : undefined,
    packId: typeof item.packId === 'string' ? item.packId : undefined,
    meaning: typeof item.meaning === 'string' ? item.meaning : undefined,
    fileLabel: typeof item.fileLabel === 'string' ? item.fileLabel : undefined,
  };
};

const readStickerMetaFromLocalStorage = (): Array<Record<string, unknown>> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_STICKER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
};

let stickerCache: WeChatGifSticker[] | null = null;
let stickerCachePromise: Promise<void> | null = null;

const loadStickerCache = async (): Promise<void> => {
  const records = readStickerMetaFromLocalStorage();
  if (records.length === 0) {
    stickerCache = [];
    return;
  }

  const hasLegacyUrl = records.some((item) => typeof item.url === 'string' && item.url);
  if (hasLegacyUrl) {
    const legacyStickers = records
      .map((item) => {
        const meta = parseStickerMeta(item);
        if (!meta) return null;
        const url = String(item.url || '');
        if (!url) return null;
        return { ...meta, url } as WeChatGifSticker;
      })
      .filter((item): item is WeChatGifSticker => item !== null);

    await Promise.all(
      legacyStickers.map((sticker) => setRecord(stickerImageStore, sticker.id, sticker.url))
    );

    const metaWithoutUrl = legacyStickers.map(({ url: _, ...meta }) => meta);
    try {
      window.localStorage.setItem(CUSTOM_STICKER_STORAGE_KEY, JSON.stringify(metaWithoutUrl));
    } catch (error) {
      console.warn('[emojiStickers] 迁移表情元数据到 localStorage 失败:', error);
    }
    stickerCache = legacyStickers;
    return;
  }

  const metas = records
    .map(parseStickerMeta)
    .filter((item): item is Omit<WeChatGifSticker, 'url'> => item !== null);

  const urlEntries = await Promise.all(
    metas.map(async (meta) => {
      const url = await getRecord<string>(stickerImageStore, meta.id);
      return [meta.id, url] as const;
    })
  );

  const urlMap = new Map<string, string>(
    urlEntries.filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );

  stickerCache = metas
    .map((meta) => {
      const url = urlMap.get(meta.id);
      return url ? ({ ...meta, url } as WeChatGifSticker) : null;
    })
    .filter((item): item is WeChatGifSticker => item !== null);
};

const ensureStickerCacheLoaded = async (): Promise<void> => {
  if (stickerCache !== null) return;
  if (!stickerCachePromise) {
    stickerCachePromise = loadStickerCache().catch((error) => {
      stickerCachePromise = null;
      throw error;
    });
  }
  await stickerCachePromise;
};

export const readWeChatCustomStickers = (): WeChatGifSticker[] => {
  if (typeof window === 'undefined') return [];
  if (stickerCache !== null) return stickerCache;

  if (!stickerCachePromise) {
    stickerCachePromise = loadStickerCache()
      .then(() => {
        window.dispatchEvent(new CustomEvent(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT));
      })
      .catch((error) => {
        console.error('[emojiStickers] 加载表情缓存失败:', error);
        stickerCachePromise = null;
      });
  }
  return [];
};

export const writeWeChatCustomStickers = async (stickers: WeChatGifSticker[]): Promise<void> => {
  if (typeof window === 'undefined') return;
  stickerCache = stickers;

  const metaRecords = stickers.map(({ url: _, ...meta }) => meta);
  try {
    window.localStorage.setItem(CUSTOM_STICKER_STORAGE_KEY, JSON.stringify(metaRecords));
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new Error('存储空间不足，请删除一些表情后再试');
    }
    throw new Error('保存表情失败，请检查浏览器本地存储权限');
  }

  await Promise.all(stickers.map((sticker) => setRecord(stickerImageStore, sticker.id, sticker.url)));

  const allKeys = await listStoreKeys(stickerImageStore);
  const validIds = new Set(stickers.map((sticker) => sticker.id));
  const staleKeys = allKeys.filter((key) => !validIds.has(String(key)));
  await Promise.all(staleKeys.map((key) => deleteRecord(stickerImageStore, key)));

  window.dispatchEvent(new CustomEvent(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT));
};

export const addWeChatCustomSticker = async (
  sticker: Pick<WeChatGifSticker, 'name' | 'url' | 'online' | 'packId'>
): Promise<WeChatGifSticker[]> => {
  return addWeChatCustomStickers([sticker]);
};

export const addWeChatCustomStickers = async (
  stickers: Array<Pick<WeChatGifSticker, 'name' | 'url' | 'online' | 'packId'>>
): Promise<WeChatGifSticker[]> => {
  await ensureStickerCacheLoaded();
  const current = readWeChatCustomStickers();

  const seenUrls = new Set<string>();
  const validInputs = stickers
    .map((sticker) => ({ ...sticker, url: sticker.url?.trim() }))
    .filter((sticker): sticker is typeof sticker & { url: string } => {
      if (!sticker.url || seenUrls.has(sticker.url)) return false;
      seenUrls.add(sticker.url);
      return true;
    });
  if (!validInputs.length) return current;

  const newUrls = new Set(validInputs.map((item) => item.url));
  const withoutDuplicate = current.filter((item) => !newUrls.has(item.url));

  const nextStickers: WeChatGifSticker[] = validInputs.map((sticker) => ({
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sticker.name?.trim() || '表情',
    url: sticker.url!,
    online: Boolean(sticker.online),
    custom: true,
    packId: sticker.packId,
  }));

  const next = [...nextStickers, ...withoutDuplicate].slice(0, 80);
  await writeWeChatCustomStickers(next);
  return next;
};

export const removeWeChatCustomSticker = async (id: string): Promise<WeChatGifSticker[]> => {
  await ensureStickerCacheLoaded();
  const next = readWeChatCustomStickers().filter((item) => item.id !== id);
  await writeWeChatCustomStickers(next);
  return next;
};

export const updateWeChatCustomSticker = async (
  id: string,
  patch: Partial<Pick<WeChatGifSticker, 'name' | 'meaning' | 'fileLabel'>>
): Promise<WeChatGifSticker[]> => {
  await ensureStickerCacheLoaded();
  const next = readWeChatCustomStickers().map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...(typeof patch.name === 'string' && { name: patch.name.trim() || item.name }),
      ...(typeof patch.meaning === 'string' && { meaning: patch.meaning.trim() }),
      ...(typeof patch.fileLabel === 'string' && { fileLabel: patch.fileLabel.trim() }),
    };
  });
  await writeWeChatCustomStickers(next);
  return next;
};

const isStickerPackRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readWeChatStickerPacks = (): WeChatStickerPack[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STICKER_PACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isStickerPackRecord)
      .map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || '表情包'),
        coverUrl: typeof item.coverUrl === 'string' ? item.coverUrl : undefined,
        createdAt: Number(item.createdAt) || Date.now(),
        source: (item.source === 'online' ? 'online' : 'local') as WeChatStickerPack['source'],
        themeId: typeof item.themeId === 'string' ? item.themeId : undefined,
        enabled: typeof item.enabled === 'boolean' ? item.enabled : undefined,
      }))
      .filter((item) => item.id && item.name)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
};

export const writeWeChatStickerPacks = (packs: WeChatStickerPack[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STICKER_PACK_STORAGE_KEY, JSON.stringify(packs));
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new Error('存储空间不足，请删除一些表情包后再试');
    }
    throw new Error('保存表情包失败，请检查浏览器本地存储权限');
  }
  window.dispatchEvent(new CustomEvent(WECHAT_STICKER_PACKS_CHANGED_EVENT));
};

export const addWeChatStickerPack = (
  name: string,
  coverUrl?: string,
  extra?: Partial<Omit<WeChatStickerPack, 'name' | 'coverUrl' | 'createdAt'>>
): WeChatStickerPack => {
  const trimmedName = name.trim() || '新建表情包';
  const existing = readWeChatStickerPacks();
  const existingById = extra?.id ? existing.find((item) => item.id === extra.id) : undefined;
  const pack: WeChatStickerPack = {
    id: extra?.id || `pack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    coverUrl,
    createdAt: existingById?.createdAt || Date.now(),
    ...extra,
  };
  const next = [pack, ...existing.filter((item) => item.id !== pack.id)];
  writeWeChatStickerPacks(next);
  return pack;
};

export const updateWeChatStickerPack = (
  id: string,
  patch: Partial<Pick<WeChatStickerPack, 'name' | 'coverUrl' | 'enabled'>>
): WeChatStickerPack[] => {
  const next = readWeChatStickerPacks().map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      ...(typeof patch.name === 'string' && { name: patch.name.trim() || item.name }),
      ...(typeof patch.coverUrl === 'string' && { coverUrl: patch.coverUrl }),
      ...(typeof patch.enabled === 'boolean' && { enabled: patch.enabled }),
    };
  });
  writeWeChatStickerPacks(next);
  return next;
};

export const removeWeChatStickerPack = async (id: string): Promise<void> => {
  await ensureStickerCacheLoaded();
  const nextPacks = readWeChatStickerPacks().filter((item) => item.id !== id);
  const nextStickers = readWeChatCustomStickers().filter((item) => item.packId !== id);
  writeWeChatStickerPacks(nextPacks);
  await writeWeChatCustomStickers(nextStickers);
};

export const removeWeChatStickerPacksByThemeId = async (themeId: string): Promise<void> => {
  await ensureStickerCacheLoaded();
  const packIds = new Set(
    readWeChatStickerPacks()
      .filter((item) => item.themeId === themeId)
      .map((item) => item.id)
  );
  if (packIds.size === 0) return;
  const nextPacks = readWeChatStickerPacks().filter((item) => !packIds.has(item.id));
  const nextStickers = readWeChatCustomStickers().filter(
    (item) => !packIds.has(item.packId || '')
  );
  writeWeChatStickerPacks(nextPacks);
  await writeWeChatCustomStickers(nextStickers);
};

export const getStickersByPackId = (packId: string | undefined, stickers: WeChatGifSticker[]): WeChatGifSticker[] => {
  if (!packId) return stickers.filter((item) => !item.packId);
  return stickers.filter((item) => item.packId === packId);
};

export const getEnabledWeChatCustomStickers = (): WeChatGifSticker[] => {
  const packs = readWeChatStickerPacks();
  const disabledPackIds = new Set(packs.filter((item) => item.enabled === false).map((item) => item.id));
  return readWeChatCustomStickers().filter(
    (item) => !item.packId || !disabledPackIds.has(item.packId)
  );
};

import angryGif from '../../../assets/wechat/gif-emojis/angry.gif';
import coolGif from '../../../assets/wechat/gif-emojis/cool.gif';
import cryGif from '../../../assets/wechat/gif-emojis/cry.gif';
import heartGif from '../../../assets/wechat/gif-emojis/heart.gif';
import laughGif from '../../../assets/wechat/gif-emojis/laugh.gif';
import noGif from '../../../assets/wechat/gif-emojis/no.gif';
import partyGif from '../../../assets/wechat/gif-emojis/party.gif';
import poopGif from '../../../assets/wechat/gif-emojis/poop.gif';
import shockGif from '../../../assets/wechat/gif-emojis/shock.gif';
import shyGif from '../../../assets/wechat/gif-emojis/shy.gif';
import sickGif from '../../../assets/wechat/gif-emojis/sick.gif';
import sleepGif from '../../../assets/wechat/gif-emojis/sleep.gif';
import sneerGif from '../../../assets/wechat/gif-emojis/sneer.gif';
import sobGif from '../../../assets/wechat/gif-emojis/sob.gif';
import thumbsUpGif from '../../../assets/wechat/gif-emojis/thumbs-up.gif';
import winkGif from '../../../assets/wechat/gif-emojis/wink.gif';

export const wechatDefaultGifStickers: WeChatGifSticker[] = [
  { id: 'sneer', name: '冷笑', url: withStickerVersion(sneerGif) },
  { id: 'cry', name: '流泪', url: withStickerVersion(cryGif) },
  { id: 'sob', name: '大哭', url: withStickerVersion(sobGif) },
  { id: 'laugh', name: '大笑', url: withStickerVersion(laughGif) },
  { id: 'angry', name: '发怒', url: withStickerVersion(angryGif) },
  { id: 'cool', name: '酷', url: withStickerVersion(coolGif) },
  { id: 'heart', name: '爱心', url: withStickerVersion(heartGif) },
  { id: 'thumbs-up', name: '点赞', url: withStickerVersion(thumbsUpGif) },
  { id: 'shy', name: '害羞', url: withStickerVersion(shyGif) },
  { id: 'shock', name: '震惊', url: withStickerVersion(shockGif) },
  { id: 'sleep', name: '睡觉', url: withStickerVersion(sleepGif) },
  { id: 'wink', name: '眨眼', url: withStickerVersion(winkGif) },
  { id: 'sick', name: '生病', url: withStickerVersion(sickGif) },
  { id: 'no', name: '不要', url: withStickerVersion(noGif) },
  { id: 'poop', name: '便便', url: withStickerVersion(poopGif) },
  { id: 'party', name: '庆祝', url: withStickerVersion(partyGif) },
];

export const wechatGifStickers: WeChatGifSticker[] = [
  ...wechatDefaultGifStickers,
];
