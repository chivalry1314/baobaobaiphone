import { create } from 'zustand';
import { normalizeRoleId } from './roleIdentity';

interface RoleRuntimeStore {
  overrideRoleId: string | null;
  setOverrideRoleId: (roleId: string | null | undefined) => void;
  clearOverrideRoleId: () => void;
}

const normalizeOverrideRoleId = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  return normalizeRoleId(normalized);
};

export const useRoleRuntimeStore = create<RoleRuntimeStore>((set) => ({
  overrideRoleId: null,
  setOverrideRoleId: (roleId) =>
    set(() => ({
      overrideRoleId: normalizeOverrideRoleId(roleId),
    })),
  clearOverrideRoleId: () =>
    set(() => ({
      overrideRoleId: null,
    })),
}));

export const setRuntimeActiveRoleId = (roleId: string): void => {
  useRoleRuntimeStore.getState().setOverrideRoleId(roleId);
};

export const clearRuntimeActiveRoleId = (): void => {
  useRoleRuntimeStore.getState().clearOverrideRoleId();
};

export const getRuntimeActiveRoleId = (): string | null => {
  return useRoleRuntimeStore.getState().overrideRoleId;
};
