import type { GlobalSettings } from '../../../../core/sdk/types';
import type { VoiceProvider, VoiceSynthesisRequest } from './types';

const MINIMAX_DEFAULT_BASE_URL = 'https://api.minimaxi.com';
const MINIMAX_DEFAULT_MODEL = 'speech-2.8-hd';
const MINIMAX_DEFAULT_VOICE_ID = 'male-qn-qingse';
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
  opus: 'audio/ogg; codecs=opus',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const toUint8ArrayFromHex = (hex: string): Uint8Array => {
  const normalized = hex.trim().replace(/^0x/i, '');
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !HEX_PATTERN.test(normalized)) {
    throw new Error('invalid-hex-audio');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
};

const toUint8ArrayFromBase64 = (base64: string): Uint8Array => {
  const normalized = base64.trim().replace(/\s+/g, '');
  if (!normalized) {
    throw new Error('empty-base64-audio');
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const pickAudioField = (data: unknown): string | null => {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const audioCandidates = [obj.audio, obj.audio_hex, obj.audioBase64, obj.audio_base64];
  const firstAudio = audioCandidates.find((item) => typeof item === 'string' && item.trim().length > 0);
  return typeof firstAudio === 'string' ? firstAudio : null;
};

const pickAudioFormat = (data: unknown): string => {
  if (!data || typeof data !== 'object') return 'mp3';
  const obj = data as Record<string, unknown>;
  const formatFromExtra = (obj.extra_info as Record<string, unknown> | undefined)?.audio_format;
  const formatFromAudioSetting = (obj.audio_setting as Record<string, unknown> | undefined)?.format;
  if (typeof formatFromExtra === 'string' && formatFromExtra.trim()) return formatFromExtra.trim().toLowerCase();
  if (typeof formatFromAudioSetting === 'string' && formatFromAudioSetting.trim()) {
    return formatFromAudioSetting.trim().toLowerCase();
  }
  return 'mp3';
};

const getMinimaxApiKey = (settings: GlobalSettings): string =>
  (settings.voiceApiKey || '').trim();

const buildMinimaxEndpoint = (settings: GlobalSettings): string => {
  const baseUrl = stripTrailingSlash((settings.voiceBaseUrl || MINIMAX_DEFAULT_BASE_URL).trim());
  const groupId = settings.voiceMinimaxGroupId?.trim();
  return `${baseUrl}/v1/t2a_v2${groupId ? `?GroupId=${encodeURIComponent(groupId)}` : ''}`;
};

const parseAudioBlob = (audioPayload: string, format: string): Blob => {
  const normalized = audioPayload.trim();
  const bytes =
    normalized.length % 2 === 0 && HEX_PATTERN.test(normalized.replace(/^0x/i, ''))
      ? toUint8ArrayFromHex(normalized)
      : toUint8ArrayFromBase64(normalized);

  const mimeType = AUDIO_MIME_BY_FORMAT[format.toLowerCase()] || 'audio/mpeg';
  // TS 5.8 的 TypedArray 泛型会把 Uint8Array<ArrayBufferLike> 视为非 BlobPart。
  // 先拷贝到 ArrayBuffer，可确保 Blob 入参类型精确。
  const audioBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(audioBuffer).set(bytes);
  return new Blob([audioBuffer], { type: mimeType });
};

const synthesizeMinimaxSpeech = async ({ text, settings, signal }: VoiceSynthesisRequest): Promise<Blob> => {
  const apiKey = getMinimaxApiKey(settings);
  if (!apiKey) {
    throw new Error('missing-minimax-api-key');
  }

  const response = await fetch(buildMinimaxEndpoint(settings), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.voiceModel?.trim() || MINIMAX_DEFAULT_MODEL,
      text: text.slice(0, 9999),
      stream: false,
      output_format: 'hex',
      voice_setting: {
        voice_id: settings.voiceVoiceId?.trim() || MINIMAX_DEFAULT_VOICE_ID,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`minimax-tts-request-failed-${response.status}`);
  }

  const payload = await response.json();
  const responseCode = payload?.base_resp?.status_code;
  if (typeof responseCode === 'number' && responseCode !== 0) {
    throw new Error(`minimax-tts-api-error-${responseCode}`);
  }

  const audioPayload = pickAudioField(payload?.data);
  if (!audioPayload) {
    throw new Error('missing-minimax-audio');
  }

  return parseAudioBlob(audioPayload, pickAudioFormat(payload?.data));
};

export const minimaxVoiceProvider: VoiceProvider = {
  id: 'minimax',
  canUse: (settings) => Boolean(getMinimaxApiKey(settings)),
  synthesize: synthesizeMinimaxSpeech,
};

