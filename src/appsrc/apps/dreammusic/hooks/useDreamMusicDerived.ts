import { useMemo } from 'react';
import type { DreamPlaylist, DreamTrack } from '../types';
import { buildFallbackLyrics, isReadyTrack } from '../utils';

export interface ResolvedDreamPlaylist extends DreamPlaylist {
  tracks: DreamTrack[];
  playableTrackIds: string[];
  playableCount: number;
}

interface UseDreamMusicDerivedInput {
  tracks: DreamTrack[];
  playlists: DreamPlaylist[];
  currentTrackId: string | null;
  favoriteTrackIds: string[];
  recentlyPlayedTrackIds: string[];
  searchKeyword: string;
  onlineResults: DreamTrack[];
  openedPlaylistId: string | null;
  durationSec: number;
  currentTimeSec: number;
}

export const useDreamMusicDerived = ({
  tracks,
  playlists,
  currentTrackId,
  favoriteTrackIds,
  recentlyPlayedTrackIds,
  searchKeyword,
  onlineResults,
  openedPlaylistId,
  durationSec,
  currentTimeSec,
}: UseDreamMusicDerivedInput) => {
  const trackById = useMemo(() => new Map(tracks.map((item) => [item.id, item])), [tracks]);
  const playableTracks = useMemo(() => tracks.filter(isReadyTrack), [tracks]);
  const playableTrackIds = useMemo(() => playableTracks.map((item) => item.id), [playableTracks]);
  const favoriteTrackSet = useMemo(() => new Set(favoriteTrackIds), [favoriteTrackIds]);

  const currentTrack = useMemo(() => {
    if (currentTrackId) {
      const hit = trackById.get(currentTrackId);
      if (hit) return hit;
    }
    return playableTracks[0] ?? tracks[0] ?? null;
  }, [currentTrackId, playableTracks, tracks, trackById]);

  const currentPlayableTrack = currentTrack && isReadyTrack(currentTrack) ? currentTrack : null;

  const localTracks = useMemo(
    () => tracks.filter((item) => item.sourceType !== 'free-online'),
    [tracks]
  );

  const filteredTracks = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return localTracks;
    return localTracks.filter((item) =>
      `${item.title} ${item.artist} ${item.album || ''}`.toLowerCase().includes(keyword)
    );
  }, [searchKeyword, localTracks]);

  const filteredOnlineResults = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return onlineResults;
    return onlineResults.filter((item) =>
      `${item.title} ${item.artist} ${item.album || ''}`.toLowerCase().includes(keyword)
    );
  }, [onlineResults, searchKeyword]);

  const onlinePlayableTrackIds = useMemo(
    () => filteredOnlineResults.filter(isReadyTrack).map((item) => item.id),
    [filteredOnlineResults]
  );

  const favoriteTracks = useMemo(
    () => favoriteTrackIds.map((id) => trackById.get(id)).filter((item): item is DreamTrack => Boolean(item)),
    [favoriteTrackIds, trackById]
  );

  const recentTracks = useMemo(
    () => recentlyPlayedTrackIds.map((id) => trackById.get(id)).filter((item): item is DreamTrack => Boolean(item)),
    [recentlyPlayedTrackIds, trackById]
  );

  const myPlaylists = useMemo<ResolvedDreamPlaylist[]>(
    () =>
      playlists.map((playlist) => {
        const playlistTracks = playlist.trackIds
          .map((trackId) => trackById.get(trackId))
          .filter((item): item is DreamTrack => Boolean(item));
        const playableTrackIds = playlistTracks.filter(isReadyTrack).map((item) => item.id);
        return {
          ...playlist,
          tracks: playlistTracks,
          playableTrackIds,
          playableCount: playableTrackIds.length,
        };
      }),
    [playlists, trackById]
  );

  const openedPlaylist = useMemo(
    () => (openedPlaylistId ? myPlaylists.find((item) => item.id === openedPlaylistId) ?? null : null),
    [myPlaylists, openedPlaylistId]
  );

  const playlistVirtualHeight = useMemo(() => {
    const itemCount = myPlaylists.length;
    if (itemCount === 0) return 120;
    return Math.min(360, Math.max(144, itemCount * 72));
  }, [myPlaylists.length]);

  const openedPlaylistVirtualHeight = useMemo(() => {
    const itemCount = openedPlaylist?.tracks.length ?? 0;
    if (itemCount === 0) return 160;
    return Math.min(420, Math.max(180, itemCount * 58));
  }, [openedPlaylist?.tracks.length]);

  const effectiveDurationSec = useMemo(() => {
    if (durationSec > 0) return durationSec;
    if (currentTrack?.durationMs) return Math.max(1, Math.floor(currentTrack.durationMs / 1000));
    return 0;
  }, [durationSec, currentTrack?.durationMs]);

  const lyricLines = useMemo(
    () => (currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? currentTrack.lyrics : buildFallbackLyrics(currentTrack)),
    [currentTrack]
  );

  const activeLyricIndex = useMemo(() => {
    if (lyricLines.length === 0 || effectiveDurationSec <= 0) return -1;
    const ratio = Math.max(0, Math.min(1, currentTimeSec / effectiveDurationSec));
    return Math.min(lyricLines.length - 1, Math.floor(ratio * lyricLines.length));
  }, [lyricLines.length, currentTimeSec, effectiveDurationSec]);

  return {
    trackById,
    playableTracks,
    playableTrackIds,
    favoriteTrackSet,
    currentTrack,
    currentPlayableTrack,
    localTracks,
    filteredTracks,
    filteredOnlineResults,
    onlinePlayableTrackIds,
    favoriteTracks,
    recentTracks,
    myPlaylists,
    openedPlaylist,
    playlistVirtualHeight,
    openedPlaylistVirtualHeight,
    effectiveDurationSec,
    lyricLines,
    activeLyricIndex,
  };
};
