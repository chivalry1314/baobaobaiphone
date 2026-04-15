export const DEFAULT_COMMERCE_ROLE_ID = 'default-self';
export const COMMERCE_ROLE_CHANGED_EVENT = 'commerce-role-changed';

let resolveRoleId: () => string = () => DEFAULT_COMMERCE_ROLE_ID;

export const normalizeCommerceRoleId = (value: string | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_COMMERCE_ROLE_ID;
};

export const registerCommerceRoleIdResolver = (
  resolver: (() => string) | null | undefined
): void => {
  resolveRoleId = typeof resolver === 'function' ? resolver : () => DEFAULT_COMMERCE_ROLE_ID;
};

export const getCommerceActiveRoleId = (): string => {
  return normalizeCommerceRoleId(resolveRoleId());
};

export const emitCommerceRoleChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COMMERCE_ROLE_CHANGED_EVENT));
};
