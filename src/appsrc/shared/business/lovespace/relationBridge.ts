import { useSyncExternalStore } from 'react';

export interface LoveSpaceRelationSnapshot {
  id: string;
  label: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

type LoveSpaceRelationSnapshotResolver = () => LoveSpaceRelationSnapshot[];
type LoveSpaceRelationSnapshotSubscriber = (listener: () => void) => () => void;

let resolveLoveSpaceRelationSnapshot: LoveSpaceRelationSnapshotResolver = () => [];
let subscribeLoveSpaceRelationSnapshot: LoveSpaceRelationSnapshotSubscriber = () => () => {};
let cachedLoveSpaceRelationSnapshot: LoveSpaceRelationSnapshot[] = [];

const areRelationSnapshotsEqual = (
  left: LoveSpaceRelationSnapshot[],
  right: LoveSpaceRelationSnapshot[]
): boolean => {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (
      leftItem.id !== rightItem.id ||
      leftItem.label !== rightItem.label ||
      leftItem.ownerRoleId !== rightItem.ownerRoleId ||
      leftItem.bondId !== rightItem.bondId ||
      leftItem.contactRoleId !== rightItem.contactRoleId
    ) {
      return false;
    }
  }

  return true;
};

export const registerLoveSpaceRelationSnapshotResolver = (
  resolver: LoveSpaceRelationSnapshotResolver | null | undefined
): void => {
  resolveLoveSpaceRelationSnapshot = typeof resolver === 'function' ? resolver : () => [];
  cachedLoveSpaceRelationSnapshot = [];
};

export const registerLoveSpaceRelationSnapshotSubscriber = (
  subscriber: LoveSpaceRelationSnapshotSubscriber | null | undefined
): void => {
  subscribeLoveSpaceRelationSnapshot =
    typeof subscriber === 'function' ? subscriber : () => () => {};
};

export const getLoveSpaceRelationSnapshot = (): LoveSpaceRelationSnapshot[] => {
  const nextSnapshot = resolveLoveSpaceRelationSnapshot();
  if (areRelationSnapshotsEqual(cachedLoveSpaceRelationSnapshot, nextSnapshot)) {
    return cachedLoveSpaceRelationSnapshot;
  }
  cachedLoveSpaceRelationSnapshot = nextSnapshot;
  return cachedLoveSpaceRelationSnapshot;
};

export const useLoveSpaceRelationSnapshotBridge = (): LoveSpaceRelationSnapshot[] => {
  return useSyncExternalStore(
    subscribeLoveSpaceRelationSnapshot,
    getLoveSpaceRelationSnapshot,
    getLoveSpaceRelationSnapshot
  );
};
