import { useSyncExternalStore } from 'react';

type InstalledAppIdsResolver = () => string[];
type InstalledAppIdsSubscriber = (listener: () => void) => () => void;

let resolveInstalledAppIds: InstalledAppIdsResolver = () => [];
let subscribeInstalledAppIds: InstalledAppIdsSubscriber = () => () => {};

export const registerInstalledAppIdsResolver = (
  resolver: InstalledAppIdsResolver | null | undefined
): void => {
  resolveInstalledAppIds = typeof resolver === 'function' ? resolver : () => [];
};

export const registerInstalledAppIdsSubscriber = (
  subscriber: InstalledAppIdsSubscriber | null | undefined
): void => {
  subscribeInstalledAppIds = typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getInstalledAppIdsSnapshot = (): string[] => {
  return resolveInstalledAppIds();
};

export const useInstalledAppIdsSnapshotBridge = (): string[] => {
  return useSyncExternalStore(
    subscribeInstalledAppIds,
    resolveInstalledAppIds,
    resolveInstalledAppIds
  );
};
