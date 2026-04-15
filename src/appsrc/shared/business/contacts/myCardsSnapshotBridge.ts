import { useSyncExternalStore } from 'react';

export interface MyCardSnapshot {
  id: string;
  name: string;
}

type MyCardsSnapshotResolver = () => MyCardSnapshot[];
type MyCardsSnapshotSubscriber = (listener: () => void) => () => void;

let resolveMyCardsSnapshot: MyCardsSnapshotResolver = () => [];
let subscribeMyCardsSnapshot: MyCardsSnapshotSubscriber = () => () => {};

export const registerMyCardsSnapshotResolver = (
  resolver: MyCardsSnapshotResolver | null | undefined
): void => {
  resolveMyCardsSnapshot = typeof resolver === 'function' ? resolver : () => [];
};

export const registerMyCardsSnapshotSubscriber = (
  subscriber: MyCardsSnapshotSubscriber | null | undefined
): void => {
  subscribeMyCardsSnapshot = typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getMyCardsSnapshotBridge = (): MyCardSnapshot[] => {
  return resolveMyCardsSnapshot();
};

export const useMyCardsSnapshotBridge = (): MyCardSnapshot[] => {
  return useSyncExternalStore(
    subscribeMyCardsSnapshot,
    resolveMyCardsSnapshot,
    resolveMyCardsSnapshot
  );
};
