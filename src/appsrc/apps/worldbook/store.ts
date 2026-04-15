import {
  useWorldBookCoreStore,
  type WorldBookStoreState,
} from './data/coreStore';

export type WorldBookAppStore = Pick<
  WorldBookStoreState,
  'worldBook' | 'addWorldEntry' | 'updateWorldEntry' | 'deleteWorldEntry'
>;

const createCachedSelector = <TSource, TResult>(
  selector: (state: TSource) => TResult
): ((state: TSource) => TResult) => {
  let hasLast = false;
  let lastState: TSource | null = null;
  let lastResult: TResult;

  return (state: TSource): TResult => {
    if (hasLast && lastState === state) {
      return lastResult;
    }

    const next = selector(state);
    hasLast = true;
    lastState = state;
    lastResult = next;
    return next;
  };
};

const selectWorldBookAppStore = createCachedSelector((state: WorldBookStoreState): WorldBookAppStore => ({
  worldBook: state.worldBook,
  addWorldEntry: state.addWorldEntry,
  updateWorldEntry: state.updateWorldEntry,
  deleteWorldEntry: state.deleteWorldEntry,
}));

export const useWorldBookStore = <T = WorldBookAppStore>(
  selector?: (state: WorldBookAppStore) => T
): T => {
  if (!selector) {
    return useWorldBookCoreStore(selectWorldBookAppStore as (state: WorldBookStoreState) => T);
  }

  return useWorldBookCoreStore((state) => selector(selectWorldBookAppStore(state)));
};