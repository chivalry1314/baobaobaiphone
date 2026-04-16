import {
  createCoreStoreConfig,
  readIdbRawValue,
  updateIdbRawValue,
} from '../storage';

const PUSH_IDENTITY_STORE_CONFIG = createCoreStoreConfig('push_identity_v1');
const PUSH_IDENTITY_KEY = 'identity';

type PushIdentityField = 'userId' | 'deviceId';

type PushIdentityRecord = {
  userId?: string;
  deviceId?: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeIdentityField = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizePushIdentityRecord = (value: unknown): PushIdentityRecord => {
  if (!isPlainObject(value)) return {};
  return {
    userId: normalizeIdentityField(value.userId),
    deviceId: normalizeIdentityField(value.deviceId),
  };
};

export const readPushIdentityRecord = async (): Promise<PushIdentityRecord> => {
  const raw = await readIdbRawValue<unknown>(PUSH_IDENTITY_STORE_CONFIG, PUSH_IDENTITY_KEY);
  return normalizePushIdentityRecord(raw);
};

export const getOrCreatePushIdentityField = async (
  field: PushIdentityField,
  createValue: () => string
): Promise<string> => {
  const next = await updateIdbRawValue<unknown, PushIdentityRecord>(
    PUSH_IDENTITY_STORE_CONFIG,
    PUSH_IDENTITY_KEY,
    (current) => {
      const currentRecord = normalizePushIdentityRecord(current);
      const currentField = currentRecord[field];
      if (currentField) return currentRecord;
      return {
        ...currentRecord,
        [field]: createValue(),
      };
    }
  );

  const value = next[field];
  if (!value) {
    throw new Error(`[push-identity] failed to resolve ${field}`);
  }
  return value;
};
