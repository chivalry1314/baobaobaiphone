import { useSyncExternalStore } from 'react';

type RoleDisplayNameResolver = (roleId: string) => string;
type RoleDisplayNameSubscriber = (listener: () => void) => () => void;

let resolveRoleDisplayName: RoleDisplayNameResolver = (roleId) => roleId;
let subscribeRoleDisplayName: RoleDisplayNameSubscriber = () => () => {};

export const registerRoleDisplayNameResolver = (
  resolver: RoleDisplayNameResolver | null | undefined
): void => {
  resolveRoleDisplayName = typeof resolver === 'function' ? resolver : (roleId) => roleId;
};

export const registerRoleDisplayNameSubscriber = (
  subscriber: RoleDisplayNameSubscriber | null | undefined
): void => {
  subscribeRoleDisplayName = typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getRoleDisplayNameSnapshot = (roleId: string): string => {
  return resolveRoleDisplayName(roleId);
};

export const useRoleDisplayNameBridge = (roleId: string): string => {
  return useSyncExternalStore(
    subscribeRoleDisplayName,
    () => resolveRoleDisplayName(roleId),
    () => resolveRoleDisplayName(roleId)
  );
};

