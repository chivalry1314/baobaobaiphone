import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createDreamMusicPersistOptions } from './data/repositories/storePersistRepo';
import type {
  DreamMusicState,
  DreamListenTogetherState,
  DreamPlaylist,
  DreamPlayHistoryItem,
  DreamTrack,
  NeteaseImportResult,
  PlayMode,
} from './types';

interface DreamMusicStore extends DreamMusicState {
  setSelectedPlaylist: (playlistId: string | null) => void;
  upsertTracks: (tracks: DreamTrack[]) => void;
  upsertImportedPlaylist: (payload: NeteaseImportResult) => void;
  removePlaylist: (playlistId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  toggleFavoriteTrack: (trackId: string) => void;
  markTrackPlayed: (trackId: string) => void;
  removeRecentlyPlayedTrack: (trackId: string) => void;
  clearRecentlyPlayedTracks: () => void;
  setQueueAndPlay: (queueTrackIds: string[], initialTrackId: string) => void;
  togglePlayback: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTimeSec: (seconds: number) => void;
  cyclePlayMode: () => void;
  playNext: () => void;
  playPrev: () => void;
  setListenTogetherPending: (payload: Omit<DreamListenTogetherState, 'status' | 'invitedAt' | 'acceptedAt'>) => void;
  acceptListenTogether: (payload: Omit<DreamListenTogetherState, 'status' | 'invitedAt' | 'acceptedAt'>) => void;
  clearListenTogether: () => void;
}

const DEFAULT_STATE: DreamMusicState = {
  tracks: [],
  playlists: [],
  selectedPlaylistId: null,
  favoriteTrackIds: [],
  recentlyPlayedTrackIds: [],
  playHistory: [],
  queueTrackIds: [],
  currentTrackId: null,
  isPlaying: false,
  playMode: 'sequence',
  volume: 0.85,
  currentTimeSec: 0,
  listenTogether: null,
  listenTogetherDurationsByCompanionId: {},
  listenTogetherCompanionNamesById: {},
};

const PLAY_MODE_ORDER: PlayMode[] = ['sequence', 'shuffle', 'single_loop'];
const PLAY_HISTORY_LIMIT = 2000;
const PLAY_HISTORY_MERGE_WINDOW_MS = 30 * 1000;

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.85;
  return Math.max(0, Math.min(1, value));
};

const normalizeSeconds = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const pushUniqueTrackId = (trackIds: string[], trackId: string, limit: number): string[] => {
  const normalizedId = trackId.trim();
  if (!normalizedId) return trackIds;
  const next = [normalizedId, ...trackIds.filter((item) => item !== normalizedId)];
  if (next.length <= limit) return next;
  return next.slice(0, limit);
};

const pushPlayHistory = (
  playHistory: DreamPlayHistoryItem[],
  trackId: string,
  playedAt = Date.now()
): DreamPlayHistoryItem[] => {
  const normalizedTrackId = trackId.trim();
  if (!normalizedTrackId) return playHistory;

  const firstItem = playHistory[0];
  if (
    firstItem &&
    firstItem.trackId === normalizedTrackId &&
    playedAt - firstItem.playedAt <= PLAY_HISTORY_MERGE_WINDOW_MS
  ) {
    const next = [...playHistory];
    next[0] = { trackId: normalizedTrackId, playedAt };
    return next;
  }

  const next = [{ trackId: normalizedTrackId, playedAt }, ...playHistory];
  if (next.length <= PLAY_HISTORY_LIMIT) return next;
  return next.slice(0, PLAY_HISTORY_LIMIT);
};

const ensureReadyQueue = (queueTrackIds: string[], tracks: DreamTrack[]): string[] => {
  const readyIdSet = new Set(
    tracks
      .filter((item) => item.playableStatus === 'ready' && typeof item.playUrl === 'string')
      .map((item) => item.id)
  );
  return queueTrackIds.filter((item) => readyIdSet.has(item));
};

const resolveNextTrackId = (
  queueTrackIds: string[],
  currentTrackId: string | null,
  playMode: PlayMode
): string | null => {
  if (queueTrackIds.length === 0) return null;

  if (playMode === 'single_loop') {
    return currentTrackId && queueTrackIds.includes(currentTrackId) ? currentTrackId : queueTrackIds[0];
  }

  if (playMode === 'shuffle') {
    if (queueTrackIds.length === 1) return queueTrackIds[0];
    const available = queueTrackIds.filter((item) => item !== currentTrackId);
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex] ?? queueTrackIds[0];
  }

  const currentIndex = currentTrackId ? queueTrackIds.indexOf(currentTrackId) : -1;
  if (currentIndex < 0) return queueTrackIds[0];
  const nextIndex = currentIndex + 1;
  if (nextIndex >= queueTrackIds.length) return null;
  return queueTrackIds[nextIndex];
};

const resolvePrevTrackId = (
  queueTrackIds: string[],
  currentTrackId: string | null,
  playMode: PlayMode
): string | null => {
  if (queueTrackIds.length === 0) return null;

  if (playMode === 'single_loop') {
    return currentTrackId && queueTrackIds.includes(currentTrackId) ? currentTrackId : queueTrackIds[0];
  }

  if (playMode === 'shuffle') {
    if (queueTrackIds.length === 1) return queueTrackIds[0];
    const available = queueTrackIds.filter((item) => item !== currentTrackId);
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex] ?? queueTrackIds[0];
  }

  const currentIndex = currentTrackId ? queueTrackIds.indexOf(currentTrackId) : -1;
  if (currentIndex <= 0) return queueTrackIds[0];
  return queueTrackIds[currentIndex - 1];
};

const mergeTracks = (currentTracks: DreamTrack[], incomingTracks: DreamTrack[]): DreamTrack[] => {
  if (incomingTracks.length === 0) return currentTracks;
  const now = Date.now();
  const byExternalTrackId = new Map(currentTracks.map((item) => [item.externalTrackId, item]));

  incomingTracks.forEach((incoming) => {
    const existing = byExternalTrackId.get(incoming.externalTrackId);
    if (!existing) {
      byExternalTrackId.set(incoming.externalTrackId, {
        ...incoming,
        createdAt: incoming.createdAt || now,
        updatedAt: incoming.updatedAt || now,
      });
      return;
    }

    byExternalTrackId.set(incoming.externalTrackId, {
      ...existing,
      ...incoming,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    });
  });

  return [...byExternalTrackId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
};

const mergePlaylists = (
  currentPlaylists: DreamPlaylist[],
  incomingPlaylist: DreamPlaylist
): DreamPlaylist[] => {
  const now = Date.now();
  const existingIndex = currentPlaylists.findIndex(
    (item) => item.externalPlaylistId === incomingPlaylist.externalPlaylistId
  );
  if (existingIndex < 0) {
    return [
      {
        ...incomingPlaylist,
        createdAt: incomingPlaylist.createdAt || now,
        updatedAt: incomingPlaylist.updatedAt || now,
      },
      ...currentPlaylists,
    ];
  }

  const existing = currentPlaylists[existingIndex];
  const nextPlaylist: DreamPlaylist = {
    ...existing,
    ...incomingPlaylist,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const next = [...currentPlaylists];
  next.splice(existingIndex, 1, nextPlaylist);
  return next;
};

const cleanupPlaybackAfterTrackRemoval = (input: {
  queueTrackIds: string[];
  currentTrackId: string | null;
  isPlaying: boolean;
  removedTrackIdSet: Set<string>;
}) => {
  const nextQueueTrackIds = input.queueTrackIds.filter((id) => !input.removedTrackIdSet.has(id));
  const currentRemoved = input.currentTrackId ? input.removedTrackIdSet.has(input.currentTrackId) : false;
  const nextCurrentTrackId = currentRemoved ? nextQueueTrackIds[0] ?? null : input.currentTrackId;

  return {
    queueTrackIds: nextQueueTrackIds,
    currentTrackId: nextCurrentTrackId,
    isPlaying: nextCurrentTrackId ? input.isPlaying : false,
    currentTimeSec: nextCurrentTrackId ? undefined : 0,
  };
};

const normalizeCompanionId = (value: string): string => value.trim();

const settleListenTogetherDuration = (
  durations: Record<string, number>,
  listenTogether: DreamListenTogetherState | null,
  now = Date.now()
): Record<string, number> => {
  if (!listenTogether || listenTogether.status !== 'active') return durations;
  const companionId = normalizeCompanionId(listenTogether.companionId);
  const startedAt = listenTogether.acceptedAt || listenTogether.invitedAt;
  if (!companionId || !startedAt || !Number.isFinite(startedAt)) return durations;

  const elapsed = Math.max(0, now - startedAt);
  if (elapsed <= 0) return durations;
  return {
    ...durations,
    [companionId]: Math.max(0, durations[companionId] || 0) + elapsed,
  };
};

export const useDreamMusicStore = create<DreamMusicStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setSelectedPlaylist: (playlistId) => {
        set({ selectedPlaylistId: playlistId });
      },

      upsertTracks: (tracks) =>
        set((state) => ({
          tracks: mergeTracks(state.tracks, tracks),
        })),

      upsertImportedPlaylist: ({ playlist, tracks }) =>
        set((state) => {
          const mergedTracks = mergeTracks(state.tracks, tracks);
          const mergedPlaylists = mergePlaylists(state.playlists, playlist);

          const selectedPlaylistId =
            state.selectedPlaylistId && mergedPlaylists.some((item) => item.id === state.selectedPlaylistId)
              ? state.selectedPlaylistId
              : playlist.id;

          return {
            tracks: mergedTracks,
            playlists: mergedPlaylists,
            selectedPlaylistId,
          };
        }),

      removePlaylist: (playlistId) =>
        set((state) => {
          const normalizedPlaylistId = playlistId.trim();
          if (!normalizedPlaylistId) return state;

          const targetPlaylist = state.playlists.find((item) => item.id === normalizedPlaylistId);
          if (!targetPlaylist) return state;

          const nextPlaylists = state.playlists.filter((item) => item.id !== normalizedPlaylistId);
          const referencedTrackIdSet = new Set(nextPlaylists.flatMap((item) => item.trackIds));
          const removedTrackIdSet = new Set(
            targetPlaylist.trackIds.filter((trackId) => !referencedTrackIdSet.has(trackId))
          );

          const playbackCleanup = cleanupPlaybackAfterTrackRemoval({
            queueTrackIds: state.queueTrackIds,
            currentTrackId: state.currentTrackId,
            isPlaying: state.isPlaying,
            removedTrackIdSet,
          });

          return {
            playlists: nextPlaylists,
            tracks: state.tracks.filter((item) => !removedTrackIdSet.has(item.id)),
            favoriteTrackIds: state.favoriteTrackIds.filter((id) => !removedTrackIdSet.has(id)),
            recentlyPlayedTrackIds: state.recentlyPlayedTrackIds.filter((id) => !removedTrackIdSet.has(id)),
            playHistory: state.playHistory.filter((item) => !removedTrackIdSet.has(item.trackId)),
            selectedPlaylistId:
              state.selectedPlaylistId && state.selectedPlaylistId !== normalizedPlaylistId
                ? state.selectedPlaylistId
                : null,
            queueTrackIds: playbackCleanup.queueTrackIds,
            currentTrackId: playbackCleanup.currentTrackId,
            isPlaying: playbackCleanup.isPlaying,
            currentTimeSec:
              playbackCleanup.currentTimeSec === undefined
                ? state.currentTimeSec
                : playbackCleanup.currentTimeSec,
          };
        }),

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((state) => {
          const normalizedPlaylistId = playlistId.trim();
          const normalizedTrackId = trackId.trim();
          if (!normalizedPlaylistId || !normalizedTrackId) return state;

          const playlistIndex = state.playlists.findIndex((item) => item.id === normalizedPlaylistId);
          if (playlistIndex < 0) return state;

          const playlist = state.playlists[playlistIndex];
          if (!playlist.trackIds.includes(normalizedTrackId)) return state;

          const now = Date.now();
          const nextPlaylist: DreamPlaylist = {
            ...playlist,
            trackIds: playlist.trackIds.filter((id) => id !== normalizedTrackId),
            updatedAt: now,
          };
          const nextPlaylists = [...state.playlists];
          nextPlaylists.splice(playlistIndex, 1, nextPlaylist);

          const stillReferenced = nextPlaylists.some((item) => item.trackIds.includes(normalizedTrackId));
          const removedTrackIdSet = stillReferenced ? new Set<string>() : new Set([normalizedTrackId]);

          const playbackCleanup = cleanupPlaybackAfterTrackRemoval({
            queueTrackIds: state.queueTrackIds,
            currentTrackId: state.currentTrackId,
            isPlaying: state.isPlaying,
            removedTrackIdSet,
          });

          return {
            playlists: nextPlaylists,
            tracks: state.tracks.filter((item) => !removedTrackIdSet.has(item.id)),
            favoriteTrackIds: state.favoriteTrackIds.filter((id) => !removedTrackIdSet.has(id)),
            recentlyPlayedTrackIds: state.recentlyPlayedTrackIds.filter((id) => !removedTrackIdSet.has(id)),
            playHistory: state.playHistory.filter((item) => !removedTrackIdSet.has(item.trackId)),
            queueTrackIds: playbackCleanup.queueTrackIds,
            currentTrackId: playbackCleanup.currentTrackId,
            isPlaying: playbackCleanup.isPlaying,
            currentTimeSec:
              playbackCleanup.currentTimeSec === undefined
                ? state.currentTimeSec
                : playbackCleanup.currentTimeSec,
          };
        }),

      toggleFavoriteTrack: (trackId) =>
        set((state) => {
          const normalizedId = trackId.trim();
          if (!normalizedId) return state;
          const hasTrack = state.tracks.some((item) => item.id === normalizedId);
          if (!hasTrack) return state;

          const alreadyFavorite = state.favoriteTrackIds.includes(normalizedId);
          if (alreadyFavorite) {
            return {
              favoriteTrackIds: state.favoriteTrackIds.filter((item) => item !== normalizedId),
            };
          }

          return {
            favoriteTrackIds: pushUniqueTrackId(state.favoriteTrackIds, normalizedId, 300),
          };
        }),

      markTrackPlayed: (trackId) =>
        set((state) => {
          const normalizedId = trackId.trim();
          if (!normalizedId) return state;
          const hasTrack = state.tracks.some((item) => item.id === normalizedId);
          if (!hasTrack) return state;
          return {
            recentlyPlayedTrackIds: pushUniqueTrackId(
              state.recentlyPlayedTrackIds,
              normalizedId,
              500
            ),
            playHistory: pushPlayHistory(state.playHistory, normalizedId),
          };
        }),

      removeRecentlyPlayedTrack: (trackId) =>
        set((state) => {
          const normalizedId = trackId.trim();
          if (!normalizedId) return state;
          if (!state.recentlyPlayedTrackIds.includes(normalizedId)) return state;
          return {
            recentlyPlayedTrackIds: state.recentlyPlayedTrackIds.filter((id) => id !== normalizedId),
            playHistory: state.playHistory.filter((item) => item.trackId !== normalizedId),
          };
        }),

      clearRecentlyPlayedTracks: () =>
        set((state) => {
          if (state.recentlyPlayedTrackIds.length === 0 && state.playHistory.length === 0) {
            return state;
          }
          return {
            recentlyPlayedTrackIds: [],
            playHistory: [],
          };
        }),

      setQueueAndPlay: (queueTrackIds, initialTrackId) =>
        set((state) => {
          const readyQueue = ensureReadyQueue(queueTrackIds, state.tracks);
          if (!readyQueue.length) {
            return {
              queueTrackIds: [],
              currentTrackId: null,
              isPlaying: false,
              currentTimeSec: 0,
            };
          }

          const targetTrackId = readyQueue.includes(initialTrackId) ? initialTrackId : readyQueue[0];
          return {
            queueTrackIds: readyQueue,
            currentTrackId: targetTrackId,
            isPlaying: true,
            currentTimeSec: 0,
          };
        }),

      togglePlayback: () =>
        set((state) => ({
          isPlaying: !state.isPlaying,
        })),

      setPlaying: (isPlaying) =>
        set({
          isPlaying,
        }),

      setVolume: (volume) =>
        set({
          volume: clampVolume(volume),
        }),

      setCurrentTimeSec: (seconds) =>
        set({
          currentTimeSec: normalizeSeconds(seconds),
        }),

      cyclePlayMode: () =>
        set((state) => {
          const index = PLAY_MODE_ORDER.indexOf(state.playMode);
          const nextIndex = index < 0 ? 0 : (index + 1) % PLAY_MODE_ORDER.length;
          return { playMode: PLAY_MODE_ORDER[nextIndex] };
        }),

      playNext: () =>
        set((state) => {
          const readyQueue = ensureReadyQueue(state.queueTrackIds, state.tracks);
          if (!readyQueue.length) {
            return {
              queueTrackIds: [],
              currentTrackId: null,
              isPlaying: false,
              currentTimeSec: 0,
            };
          }

          const nextTrackId = resolveNextTrackId(readyQueue, state.currentTrackId, state.playMode);
          if (!nextTrackId) {
            return {
              queueTrackIds: readyQueue,
              isPlaying: false,
              currentTimeSec: 0,
            };
          }

          return {
            queueTrackIds: readyQueue,
            currentTrackId: nextTrackId,
            isPlaying: true,
            currentTimeSec: 0,
          };
        }),

      playPrev: () =>
        set((state) => {
          const readyQueue = ensureReadyQueue(state.queueTrackIds, state.tracks);
          if (!readyQueue.length) {
            return {
              queueTrackIds: [],
              currentTrackId: null,
              isPlaying: false,
              currentTimeSec: 0,
            };
          }

          const prevTrackId = resolvePrevTrackId(readyQueue, state.currentTrackId, state.playMode);
          if (!prevTrackId) {
            return {
              queueTrackIds: readyQueue,
              isPlaying: false,
              currentTimeSec: 0,
            };
          }

          return {
            queueTrackIds: readyQueue,
            currentTrackId: prevTrackId,
            isPlaying: true,
            currentTimeSec: 0,
          };
        }),

      setListenTogetherPending: (payload) =>
        set((state) => {
          const now = Date.now();
          const companionId = normalizeCompanionId(payload.companionId);
          return {
            listenTogetherDurationsByCompanionId: settleListenTogetherDuration(
              state.listenTogetherDurationsByCompanionId,
              state.listenTogether,
              now
            ),
            listenTogetherCompanionNamesById: companionId
              ? {
                  ...state.listenTogetherCompanionNamesById,
                  [companionId]: payload.companionName,
                }
              : state.listenTogetherCompanionNamesById,
            listenTogether: {
              ...payload,
              companionId: companionId || payload.companionId,
              status: 'pending',
              invitedAt: now,
            },
          };
        }),

      acceptListenTogether: (payload) =>
        set((state) => {
          const now = Date.now();
          const nextCompanionId = normalizeCompanionId(payload.companionId);
          const currentCompanionId = normalizeCompanionId(state.listenTogether?.companionId || '');
          const durations =
            currentCompanionId && currentCompanionId !== nextCompanionId
              ? settleListenTogetherDuration(state.listenTogetherDurationsByCompanionId, state.listenTogether, now)
              : state.listenTogetherDurationsByCompanionId;

          return {
            listenTogetherDurationsByCompanionId: durations,
            listenTogetherCompanionNamesById: nextCompanionId
              ? {
                  ...state.listenTogetherCompanionNamesById,
                  [nextCompanionId]: payload.companionName,
                }
              : state.listenTogetherCompanionNamesById,
            listenTogether: {
              ...payload,
              companionId: nextCompanionId || payload.companionId,
              inviterName: payload.inviterName || state.listenTogether?.inviterName,
              status: 'active',
              invitedAt:
                currentCompanionId === nextCompanionId
                  ? state.listenTogether?.invitedAt || now
                  : now,
              acceptedAt: now,
            },
          };
        }),

      clearListenTogether: () =>
        set((state) => ({
          listenTogetherDurationsByCompanionId: settleListenTogetherDuration(
            state.listenTogetherDurationsByCompanionId,
            state.listenTogether
          ),
          listenTogether: null,
        })),

    }),
    createDreamMusicPersistOptions<DreamMusicStore, DreamMusicState>({
      partialize: (state): DreamMusicState => ({
        tracks: state.tracks,
        playlists: state.playlists,
        selectedPlaylistId: state.selectedPlaylistId,
        favoriteTrackIds: state.favoriteTrackIds,
        recentlyPlayedTrackIds: state.recentlyPlayedTrackIds,
        playHistory: state.playHistory,
        queueTrackIds: state.queueTrackIds,
        currentTrackId: state.currentTrackId,
        isPlaying: false,
        playMode: state.playMode,
        volume: state.volume,
        currentTimeSec: 0,
        listenTogether: state.listenTogether,
        listenTogetherDurationsByCompanionId: state.listenTogetherDurationsByCompanionId,
        listenTogetherCompanionNamesById: state.listenTogetherCompanionNamesById,
      }),
    })
  )
);
