export const DEFAULT_ACTIVE_ROLE_ID = 'default-self';

const CONTACT_ROLE_PREFIX = 'contact:';
const ROLE_CHARACTER_PREFIX = 'role:';

export const normalizeRoleId = (value: string | undefined | null): string => {
  const normalized = value?.trim() ?? '';
  return normalized || DEFAULT_ACTIVE_ROLE_ID;
};

export const createContactRoleId = (contactId: string): string => {
  const normalized = contactId.trim();
  return `${CONTACT_ROLE_PREFIX}${normalized}`;
};

export const parseContactRoleId = (roleId: string | undefined | null): string | null => {
  const normalizedRoleId = roleId?.trim() ?? '';
  if (!normalizedRoleId.startsWith(CONTACT_ROLE_PREFIX)) return null;

  const contactId = normalizedRoleId.slice(CONTACT_ROLE_PREFIX.length).trim();
  return contactId || null;
};

export const isContactRoleId = (roleId: string | undefined | null): boolean => {
  return Boolean(parseContactRoleId(roleId));
};

export const createRoleCharacterId = (roleId: string | undefined | null): string => {
  return `${ROLE_CHARACTER_PREFIX}${normalizeRoleId(roleId)}`;
};

export const parseRoleCharacterId = (
  characterId: string | undefined | null
): string | null => {
  const normalizedCharacterId = characterId?.trim() ?? '';
  if (!normalizedCharacterId.startsWith(ROLE_CHARACTER_PREFIX)) return null;

  const roleId = normalizedCharacterId.slice(ROLE_CHARACTER_PREFIX.length).trim();
  return roleId ? normalizeRoleId(roleId) : null;
};
