import { useSyncExternalStore } from 'react';

export interface LoveSpaceCheckInTaskSnapshot {
  id: string;
  title: string;
  owner: 'mine' | 'partner';
  templateId: string;
  relationId: string;
  relationLabel: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

type LoveSpaceCheckInTaskSnapshotResolver = () => LoveSpaceCheckInTaskSnapshot[];
type LoveSpaceCheckInTaskSnapshotSubscriber = (listener: () => void) => () => void;

let resolveLoveSpaceCheckInTaskSnapshot: LoveSpaceCheckInTaskSnapshotResolver = () => [];
let subscribeLoveSpaceCheckInTaskSnapshot: LoveSpaceCheckInTaskSnapshotSubscriber = () => () => {};
let cachedLoveSpaceCheckInTaskSnapshot: LoveSpaceCheckInTaskSnapshot[] = [];

const areTaskSnapshotsEqual = (
  left: LoveSpaceCheckInTaskSnapshot[],
  right: LoveSpaceCheckInTaskSnapshot[]
): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (
      leftItem.id !== rightItem.id ||
      leftItem.title !== rightItem.title ||
      leftItem.owner !== rightItem.owner ||
      leftItem.templateId !== rightItem.templateId ||
      leftItem.relationId !== rightItem.relationId ||
      leftItem.relationLabel !== rightItem.relationLabel ||
      leftItem.ownerRoleId !== rightItem.ownerRoleId ||
      leftItem.bondId !== rightItem.bondId ||
      leftItem.contactRoleId !== rightItem.contactRoleId
    ) {
      return false;
    }
  }

  return true;
};

export const registerLoveSpaceCheckInTaskSnapshotResolver = (
  resolver: LoveSpaceCheckInTaskSnapshotResolver | null | undefined
): void => {
  resolveLoveSpaceCheckInTaskSnapshot = typeof resolver === 'function' ? resolver : () => [];
  cachedLoveSpaceCheckInTaskSnapshot = [];
};

export const registerLoveSpaceCheckInTaskSnapshotSubscriber = (
  subscriber: LoveSpaceCheckInTaskSnapshotSubscriber | null | undefined
): void => {
  subscribeLoveSpaceCheckInTaskSnapshot =
    typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getLoveSpaceCheckInTaskSnapshot = (): LoveSpaceCheckInTaskSnapshot[] => {
  const nextSnapshot = resolveLoveSpaceCheckInTaskSnapshot();
  if (areTaskSnapshotsEqual(cachedLoveSpaceCheckInTaskSnapshot, nextSnapshot)) {
    return cachedLoveSpaceCheckInTaskSnapshot;
  }
  cachedLoveSpaceCheckInTaskSnapshot = nextSnapshot;
  return cachedLoveSpaceCheckInTaskSnapshot;
};

export const useLoveSpaceCheckInTaskSnapshotBridge = (): LoveSpaceCheckInTaskSnapshot[] => {
  return useSyncExternalStore(
    subscribeLoveSpaceCheckInTaskSnapshot,
    getLoveSpaceCheckInTaskSnapshot,
    getLoveSpaceCheckInTaskSnapshot
  );
};
