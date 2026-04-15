import type { CreateUploadedAppPayload, UploadedMarketApp } from '../types';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeText = (value: string): string => value.trim();

export const normalizeUploadedApp = (
  payload: CreateUploadedAppPayload,
  id: string = `offline-${generateId()}`
): UploadedMarketApp => {
  const name = normalizeText(payload.name);
  const icon = normalizeText(payload.icon);
  const version = normalizeText(payload.version);
  const description = normalizeText(payload.description);
  const html = payload.html.trim();

  return {
    id,
    name: name || '未命名应用',
    icon: icon || '📱',
    version: version || '1.0.0',
    description,
    html,
    createdAt: Date.now(),
  };
};
