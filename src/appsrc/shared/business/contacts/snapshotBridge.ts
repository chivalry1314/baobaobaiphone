import { useSyncExternalStore } from 'react';

export interface ContactSnapshot {
  id: string;
  name: string;
  role: string;
  phone?: string;
  note?: string;
  avatar?: string;
}

type ContactsSnapshotResolver = () => ContactSnapshot[];
type ContactsSnapshotSubscriber = (listener: () => void) => () => void;

let resolveContactsSnapshot: ContactsSnapshotResolver = () => [];
let subscribeContactsSnapshot: ContactsSnapshotSubscriber = () => () => {};

export const registerContactsSnapshotResolver = (
  resolver: ContactsSnapshotResolver | null | undefined
): void => {
  resolveContactsSnapshot = typeof resolver === 'function' ? resolver : () => [];
};

export const registerContactsSnapshotSubscriber = (
  subscriber: ContactsSnapshotSubscriber | null | undefined
): void => {
  subscribeContactsSnapshot = typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getContactsSnapshot = (): ContactSnapshot[] => {
  return resolveContactsSnapshot();
};

export const useContactsSnapshotBridge = (): ContactSnapshot[] => {
  return useSyncExternalStore(
    subscribeContactsSnapshot,
    resolveContactsSnapshot,
    resolveContactsSnapshot
  );
};
