import { createAppStoreConfig, readIdbRawValue, writeIdbRawValue } from '../../../../../core/storage';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../../../../shared/business/commerce/roleContext';

const SELLER_DRAFTS_IDB_CONFIG = createAppStoreConfig('seller', 'drafts');
const PUBLISH_DRAFT_KEY = 'seller-publish-drafts';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeDraftMap = <T>(value: unknown): Record<string, T> => {
  if (!isPlainObject(value)) return {};
  return value as Record<string, T>;
};

const resolvePublishDraftKey = (): string => {
  const roleId = normalizeCommerceRoleId(getCommerceActiveRoleId());
  return `${PUBLISH_DRAFT_KEY}::${roleId}`;
};

export const readSellerPublishDraftMap = async <T>(): Promise<Record<string, T>> => {
  const raw = await readIdbRawValue<unknown>(
    SELLER_DRAFTS_IDB_CONFIG,
    resolvePublishDraftKey()
  );
  if (!raw) return {};
  return normalizeDraftMap<T>(raw);
};

export const writeSellerPublishDraftMap = async <T>(
  draftMap: Record<string, T>
): Promise<void> => {
  await writeIdbRawValue<Record<string, T>>(
    SELLER_DRAFTS_IDB_CONFIG,
    resolvePublishDraftKey(),
    draftMap
  );
};
