import {
  createAppStoreConfig,
  readIdbRawValue,
  writeIdbRawValue,
} from '../../../../../core/storage';
import {
  getCommerceActiveRoleId,
  normalizeCommerceRoleId,
} from '../../../../shared/business/commerce/roleContext';

const SELLER_PREFERENCES_STORE = createAppStoreConfig('seller', 'preferences_v1');
const SELLER_STORE_TYPES_KEY_PREFIX = 'store_types_v1';

export type SellerStoreTypeRecord = {
  id: string;
  typeName: string;
  kind: 'dessert' | 'flower' | 'movie';
  categoryLabel?: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeStoreTypeKind = (value: unknown): SellerStoreTypeRecord['kind'] => {
  if (value === 'flower' || value === 'movie') return value;
  return 'dessert';
};

const normalizeStoreTypeRecord = (
  value: unknown,
  fallbackId: string
): SellerStoreTypeRecord | null => {
  if (!isPlainObject(value)) return null;

  const id = typeof value.id === 'string' ? value.id : fallbackId;
  const typeName = typeof value.typeName === 'string' ? value.typeName.trim() : '';
  if (!typeName) return null;

  const categoryLabel =
    typeof value.categoryLabel === 'string' ? value.categoryLabel.trim() : '';

  return {
    id,
    typeName,
    kind: normalizeStoreTypeKind(value.kind),
    categoryLabel: categoryLabel || undefined,
  };
};

const normalizeStoreTypeRecords = (value: unknown): SellerStoreTypeRecord[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => normalizeStoreTypeRecord(item, `type-${index}`))
    .filter((item): item is SellerStoreTypeRecord => Boolean(item));
};

const resolveStoreTypeKey = (): string => {
  const roleId = normalizeCommerceRoleId(getCommerceActiveRoleId());
  return `${SELLER_STORE_TYPES_KEY_PREFIX}::${roleId}`;
};

export const readSellerStoreTypeRecords = async (): Promise<SellerStoreTypeRecord[]> => {
  const raw = await readIdbRawValue<unknown>(SELLER_PREFERENCES_STORE, resolveStoreTypeKey());
  return normalizeStoreTypeRecords(raw);
};

export const writeSellerStoreTypeRecords = async (
  records: SellerStoreTypeRecord[]
): Promise<void> => {
  await writeIdbRawValue<SellerStoreTypeRecord[]>(
    SELLER_PREFERENCES_STORE,
    resolveStoreTypeKey(),
    normalizeStoreTypeRecords(records)
  );
};
