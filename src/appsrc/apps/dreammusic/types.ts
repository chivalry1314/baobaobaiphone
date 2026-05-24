export interface DreamMusicAppProps {
  onClose: () => void;
}

export type MusicSourceType = 'netease' | 'qq' | 'free-online';
export type TrackPlayableStatus = 'ready' | 'unavailable';
export type PlayMode = 'sequence' | 'shuffle' | 'single_loop';

export interface DreamTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  lyricUrl?: string;
  lyrics?: string[];
  durationMs?: number;
  sourceType: MusicSourceType;
  playableStatus: TrackPlayableStatus;
  externalTrackId: string;
  playUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DreamPlaylist {
  id: string;
  name: string;
  coverUrl?: string;
  sourceType: MusicSourceType;
  externalPlaylistId: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DreamComment {
  id: string;
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  trackCoverUrl?: string;
  authorRoleId: string;
  authorName: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DreamPlayHistoryItem {
  trackId: string;
  playedAt: number;
}

export interface DreamListenTogetherState {
  status: 'idle' | 'pending' | 'active';
  companionId: string;
  companionName: string;
  companionAvatar?: string;
  inviterName?: string;
  invitedAt: number;
  acceptedAt?: number;
}

export interface DreamMusicState {
  tracks: DreamTrack[];
  playlists: DreamPlaylist[];
  selectedPlaylistId: string | null;
  favoriteTrackIds: string[];
  recentlyPlayedTrackIds: string[];
  playHistory: DreamPlayHistoryItem[];
  queueTrackIds: string[];
  currentTrackId: string | null;
  isPlaying: boolean;
  playMode: PlayMode;
  volume: number;
  currentTimeSec: number;
  listenTogether: DreamListenTogetherState | null;
  listenTogetherDurationsByCompanionId: Record<string, number>;
  listenTogetherCompanionNamesById: Record<string, string>;
}

export interface NeteaseImportResult {
  playlist: DreamPlaylist;
  tracks: DreamTrack[];
}
