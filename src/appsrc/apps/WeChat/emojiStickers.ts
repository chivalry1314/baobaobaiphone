export interface WeChatGifSticker {
  id: string;
  name: string;
  url: string;
  online?: boolean;
  custom?: boolean;
  systemPack?: string;
  meaning?: string;
  fileLabel?: string;
}

const STICKER_ASSET_VERSION = '202605212224';
const CUSTOM_STICKER_STORAGE_KEY = 'baobaobaiphone:wechat:custom-gif-stickers';
export const WECHAT_CUSTOM_STICKERS_CHANGED_EVENT = 'baobaobaiphone:wechat:custom-stickers-changed';
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

export const readWeChatCustomStickers = (): WeChatGifSticker[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_STICKER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecord)
      .map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || '表情'),
        url: String(item.url || ''),
        custom: true,
        online: Boolean(item.online),
      }))
      .filter((item) => item.id && item.url);
  } catch {
    return [];
  }
};

export const writeWeChatCustomStickers = (stickers: WeChatGifSticker[]): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_STICKER_STORAGE_KEY, JSON.stringify(stickers));
  window.dispatchEvent(new CustomEvent(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT));
};

export const addWeChatCustomSticker = (sticker: Pick<WeChatGifSticker, 'name' | 'url' | 'online'>): WeChatGifSticker[] => {
  const url = sticker.url.trim();
  if (!url) return readWeChatCustomStickers();
  const current = readWeChatCustomStickers();
  const withoutDuplicate = current.filter((item) => item.url !== url);
  const nextSticker: WeChatGifSticker = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: sticker.name?.trim() || '表情',
    url,
    online: Boolean(sticker.online),
    custom: true,
  };
  const next = [nextSticker, ...withoutDuplicate].slice(0, 80);
  writeWeChatCustomStickers(next);
  return next;
};

export const removeWeChatCustomSticker = (id: string): WeChatGifSticker[] => {
  const next = readWeChatCustomStickers().filter((item) => item.id !== id);
  writeWeChatCustomStickers(next);
  return next;
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
