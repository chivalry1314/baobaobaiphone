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
import baobaobaiKissGif from '../../../assets/wechat/gif-baobaobai/亲亲.gif';
import baobaobaiSadCryGif from '../../../assets/wechat/gif-baobaobai/伤心哭.gif';
import baobaobaiSillyGif from '../../../assets/wechat/gif-baobaobai/做鬼脸.gif';
import baobaobaiScaredGif from '../../../assets/wechat/gif-baobaobai/害怕.gif';
import baobaobaiShyGif from '../../../assets/wechat/gif-baobaobai/害羞.gif';
import baobaobaiHappyGif from '../../../assets/wechat/gif-baobaobai/开心.gif';
import baobaobaiHeartGif from '../../../assets/wechat/gif-baobaobai/爱心.gif';
import baobaobaiAngryGif from '../../../assets/wechat/gif-baobaobai/生气.gif';
import baobaobaiFlowerGif from '../../../assets/wechat/gif-baobaobai/送花花.gif';

export const baobaobaiGifStickers: WeChatGifSticker[] = [
  { id: 'baobaobai-kiss', name: '亲亲', fileLabel: '亲亲', url: withStickerVersion(baobaobaiKissGif), systemPack: '包包白', meaning: '亲昵、撒娇、想贴贴' },
  { id: 'baobaobai-sad-cry', name: '伤心哭', fileLabel: '伤心哭', url: withStickerVersion(baobaobaiSadCryGif), systemPack: '包包白', meaning: '委屈、难过、求哄' },
  { id: 'baobaobai-silly', name: '做鬼脸', fileLabel: '做鬼脸', url: withStickerVersion(baobaobaiSillyGif), systemPack: '包包白', meaning: '调皮、故意逗人、缓和气氛' },
  { id: 'baobaobai-scared', name: '害怕', fileLabel: '害怕', url: withStickerVersion(baobaobaiScaredGif), systemPack: '包包白', meaning: '害怕、心虚、被吓到' },
  { id: 'baobaobai-shy', name: '害羞包包白', fileLabel: '害羞', url: withStickerVersion(baobaobaiShyGif), systemPack: '包包白', meaning: '害羞、脸红、不好意思' },
  { id: 'baobaobai-happy', name: '开心', fileLabel: '开心', url: withStickerVersion(baobaobaiHappyGif), systemPack: '包包白', meaning: '开心、得意、被逗笑' },
  { id: 'baobaobai-heart', name: '爱心包包白', fileLabel: '爱心', url: withStickerVersion(baobaobaiHeartGif), systemPack: '包包白', meaning: '喜欢、爱意、黏人' },
  { id: 'baobaobai-angry', name: '生气包包白', fileLabel: '生气', url: withStickerVersion(baobaobaiAngryGif), systemPack: '包包白', meaning: '生气、炸毛、嘴硬不爽' },
  { id: 'baobaobai-flower', name: '送花花', fileLabel: '送花花', url: withStickerVersion(baobaobaiFlowerGif), systemPack: '包包白', meaning: '示好、哄人、表达喜欢或道歉' },
];

export const wechatGifStickers: WeChatGifSticker[] = [
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
  ...baobaobaiGifStickers,
];
