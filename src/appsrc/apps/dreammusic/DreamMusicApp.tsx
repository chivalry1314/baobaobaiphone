import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import type { BottomTabId } from './constants';
import { DEFAULT_ACTIVE_ROLE_ID, useActiveRoleId } from '../contacts/activeRole';
import { useRoleDisplayNameBridge } from '../../shared/business/contacts/roleDisplayNameBridge';
import { getDreamMusicBackgroundAudio } from './backgroundAudio';
import { AppDock, AppHeader } from './components';
import { useDreamMusicCommentsStore } from './commentsStore';
import { useDreamMusicAudio, useDreamMusicDerived, useTrackLyrics } from './hooks';
import { importNeteasePlaylistFromShareUrl } from './services/neteaseAdapter';
import { searchFreeMusicByKeyword } from './services/freeMusicSearch';
import { useDreamMusicStore } from './store';
import {
  buildDreamMusicRecentSummarySignature,
  clearDreamMusicRecentSummaryMemory,
  removeDreamMusicCommentMemory,
  removeDreamMusicFavoriteMemory,
  upsertDreamMusicCommentMemory,
  upsertDreamMusicFavoriteMemory,
  upsertDreamMusicRecentSummaryMemory,
} from './memoryHelpers';
import type { DreamMusicAppProps, DreamTrack } from './types';
import { isReadyTrack, toOnlineTrack } from './utils';
import {
  CircleView,
  CommentView,
  HomeView,
  LyricsView,
  MineView,
  SearchView,
} from './views';

type AppViewId = BottomTabId | 'lyrics' | 'comment';

const isBottomTabView = (view: AppViewId): view is BottomTabId =>
  view === 'home' || view === 'search' || view === 'notes' || view === 'mine';

const RECENT_MEMORY_SYNC_INTERVAL_MS = 2 * 60 * 1000;

export const DreamMusicApp: React.FC<DreamMusicAppProps> = ({ onClose }) => {
  const activeRoleId = useActiveRoleId();
  const roleDisplayName = useRoleDisplayNameBridge(activeRoleId);
  const commentAuthorName = useMemo(() => {
    const trimmedName = roleDisplayName.trim();
    const isDefaultRole = activeRoleId === DEFAULT_ACTIVE_ROLE_ID;
    if (trimmedName && !(trimmedName === activeRoleId && isDefaultRole)) {
      return trimmedName;
    }
    if (isDefaultRole) return '默认身份';
    return trimmedName || activeRoleId;
  }, [activeRoleId, roleDisplayName]);

  const {
    tracks,
    playlists,
    currentTrackId,
    favoriteTrackIds,
    recentlyPlayedTrackIds,
    playHistory,
    isPlaying,
    playMode,
    volume,
    currentTimeSec,
    setQueueAndPlay,
    togglePlayback,
    setPlaying,
    setVolume,
    setCurrentTimeSec,
    cyclePlayMode,
    playNext,
    playPrev,
    upsertTracks,
    upsertImportedPlaylist,
    removePlaylist,
    removeTrackFromPlaylist,
    removeRecentlyPlayedTrack,
    clearRecentlyPlayedTracks,
    toggleFavoriteTrack,
    markTrackPlayed,
  } = useDreamMusicStore();

  const { comments, addComment, updateComment, removeComment, clearComments } =
    useDreamMusicCommentsStore();

  const [activeView, setActiveView] = useState<AppViewId>('home');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [onlineResults, setOnlineResults] = useState<DreamTrack[]>([]);
  const [isOnlineSearching, setIsOnlineSearching] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState<string | null>(null);
  const [neteaseShareText, setNeteaseShareText] = useState('');
  const [isNeteaseParsing, setIsNeteaseParsing] = useState(false);
  const [neteaseParseError, setNeteaseParseError] = useState<string | null>(null);
  const [openedPlaylistId, setOpenedPlaylistId] = useState<string | null>(null);
  const backgroundAudio = useMemo(() => getDreamMusicBackgroundAudio(), []);
  const audioRef = useRef<HTMLAudioElement | null>(backgroundAudio);
  audioRef.current = backgroundAudio;
  const recentMemorySignatureRef = useRef<string>('');
  const recentMemoryTimestampRef = useRef<number>(0);
  const recentMemoryInitializedRef = useRef(false);
  const recentMemoryRoleRef = useRef<string>('');

  const {
    trackById,
    playableTracks,
    playableTrackIds,
    favoriteTrackSet,
    currentTrack,
    currentPlayableTrack,
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
  } = useDreamMusicDerived({
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
  });

  const trackComments = useMemo(() => {
    if (!currentTrack) return [];
    return comments.filter((item) => item.trackId === currentTrack.id);
  }, [comments, currentTrack]);

  const circleVirtualHeight = useMemo(() => {
    if (comments.length === 0) return 180;
    return Math.min(520, Math.max(220, comments.length * 134));
  }, [comments.length]);

  const myCommentCount = useMemo(
    () => comments.filter((item) => item.authorRoleId === activeRoleId).length,
    [comments, activeRoleId]
  );

  useEffect(() => {
    if (!openedPlaylistId) return;
    const exists = myPlaylists.some((item) => item.id === openedPlaylistId);
    if (!exists) setOpenedPlaylistId(null);
  }, [myPlaylists, openedPlaylistId]);

  useEffect(() => {
    if (recentMemoryRoleRef.current !== activeRoleId) {
      recentMemoryRoleRef.current = activeRoleId;
      recentMemoryTimestampRef.current = 0;
      recentMemorySignatureRef.current = '';
    }

    const nextSignature = buildDreamMusicRecentSummarySignature({
      playHistory,
      trackById,
    });

    if (!recentMemoryInitializedRef.current) {
      recentMemoryInitializedRef.current = true;
      recentMemorySignatureRef.current = nextSignature;
      recentMemoryTimestampRef.current = Date.now();
      return;
    }

    if (!nextSignature) {
      if (recentMemorySignatureRef.current) {
        clearDreamMusicRecentSummaryMemory();
      }
      recentMemorySignatureRef.current = '';
      recentMemoryTimestampRef.current = Date.now();
      return;
    }

    if (nextSignature === recentMemorySignatureRef.current) return;

    const now = Date.now();
    if (now - recentMemoryTimestampRef.current < RECENT_MEMORY_SYNC_INTERVAL_MS) {
      return;
    }

    upsertDreamMusicRecentSummaryMemory({
      contactId: activeRoleId,
      playHistory,
      trackById,
    });
    recentMemorySignatureRef.current = nextSignature;
    recentMemoryTimestampRef.current = now;
  }, [activeRoleId, playHistory, trackById]);

  useDreamMusicAudio({
    audioRef,
    currentPlayableTrack,
    currentTrackId,
    isPlaying,
    volume,
    playNext,
    setPlaying,
    setCurrentTimeSec,
    setDurationSec,
    markTrackPlayed,
    onPlaybackError: () => setUiMessage('播放失败，可能是链接失效或被限制。'),
  });

  const { lyricLines, activeLyricIndex, isLyricLoading } = useTrackLyrics({
    currentTrack,
    currentTimeSec,
    effectiveDurationSec,
  });

  const handleOnlineSearch = async () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setOnlineSearchError('请输入关键词后再搜索。');
      return;
    }

    setIsOnlineSearching(true);
    setOnlineSearchError(null);
    try {
      const results = await searchFreeMusicByKeyword(keyword);
      const mappedTracks = results.map(toOnlineTrack);
      setOnlineResults(mappedTracks);
      if (mappedTracks.length === 0) {
        setOnlineSearchError('在线库没有找到匹配歌曲。');
      }
    } catch (error) {
      console.error('[DreamMusic] online search failed:', error);
      setOnlineSearchError('在线搜索失败，请稍后重试。');
    } finally {
      setIsOnlineSearching(false);
    }
  };

  const playTrackById = (trackId: string) => {
    const target = trackById.get(trackId) ?? onlineResults.find((item) => item.id === trackId);
    if (!target || !isReadyTrack(target)) {
      setUiMessage('这首歌当前不可播放。');
      return;
    }

    if (onlinePlayableTrackIds.includes(trackId)) {
      upsertTracks(filteredOnlineResults.filter(isReadyTrack));
    } else {
      upsertTracks([target]);
    }

    const preferredQueue = onlinePlayableTrackIds.includes(trackId)
      ? onlinePlayableTrackIds
      : playableTrackIds;
    const initialTrackId = preferredQueue.includes(trackId) ? trackId : preferredQueue[0];
    if (!initialTrackId || preferredQueue.length === 0) {
      setUiMessage('当前没有可播放歌曲。');
      return;
    }
    setQueueAndPlay(preferredQueue, initialTrackId);
    setUiMessage(null);
  };

  const handleParseNeteaseShare = async () => {
    const input = neteaseShareText.trim();
    if (!input) {
      setNeteaseParseError('请粘贴网易云或 QQ 音乐歌单分享内容。');
      return;
    }

    setIsNeteaseParsing(true);
    setNeteaseParseError(null);
    try {
      const result = await importNeteasePlaylistFromShareUrl(input);
      upsertImportedPlaylist(result);
      const playableCount = result.tracks.filter(isReadyTrack).length;
      setUiMessage(`歌单已加入：${result.playlist.name}（可播 ${playableCount}/${result.tracks.length}）`);
      setNeteaseShareText('');
    } catch (error) {
      console.error('[DreamMusic] parse playlist share failed:', error);
      const message = error instanceof Error ? error.message : '歌单解析失败，请重试。';
      setNeteaseParseError(message);
    } finally {
      setIsNeteaseParsing(false);
    }
  };

  const playPlaylistById = (playlistId: string) => {
    const playlist = myPlaylists.find((item) => item.id === playlistId);
    if (!playlist) {
      setUiMessage('未找到该歌单。');
      return;
    }
    if (playlist.playableTrackIds.length === 0) {
      setUiMessage('这个歌单暂时没有可播放歌曲。');
      return;
    }
    setQueueAndPlay(playlist.playableTrackIds, playlist.playableTrackIds[0]);
    setUiMessage(`开始播放：${playlist.name}`);
  };

  const playTrackInPlaylist = (playlistId: string, trackId: string) => {
    const playlist = myPlaylists.find((item) => item.id === playlistId);
    if (!playlist) {
      setUiMessage('未找到该歌单。');
      return;
    }
    if (playlist.playableTrackIds.length === 0) {
      setUiMessage('这个歌单暂时没有可播放歌曲。');
      return;
    }

    const targetTrackId = playlist.playableTrackIds.includes(trackId)
      ? trackId
      : playlist.playableTrackIds[0];
    setQueueAndPlay(playlist.playableTrackIds, targetTrackId);
    setUiMessage(null);
  };

  const handleToggleFavoriteTrack = (trackId: string) => {
    const normalizedTrackId = trackId.trim();
    if (!normalizedTrackId) return;

    const track = trackById.get(normalizedTrackId);
    if (!track) return;

    const wasFavorite = favoriteTrackSet.has(normalizedTrackId);
    toggleFavoriteTrack(normalizedTrackId);

    if (wasFavorite) {
      removeDreamMusicFavoriteMemory(normalizedTrackId);
      return;
    }

    upsertDreamMusicFavoriteMemory({
      contactId: activeRoleId,
      track,
    });
  };

  const handleRemovePlaylist = (playlistId: string) => {
    const playlist = myPlaylists.find((item) => item.id === playlistId);
    const referencedTrackIdSet = new Set(
      myPlaylists
        .filter((item) => item.id !== playlistId)
        .flatMap((item) => item.trackIds)
    );
    playlist?.trackIds
      .filter((trackId) => favoriteTrackSet.has(trackId) && !referencedTrackIdSet.has(trackId))
      .forEach((trackId) => {
        removeDreamMusicFavoriteMemory(trackId);
      });

    removePlaylist(playlistId);
    if (openedPlaylistId === playlistId) {
      setOpenedPlaylistId(null);
    }
    setUiMessage(`已删除歌单：${playlist?.name || '未命名歌单'}`);
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const playlist = myPlaylists.find((item) => item.id === playlistId);
    const track = trackById.get(trackId);
    const stillReferencedByOthers = myPlaylists
      .filter((item) => item.id !== playlistId)
      .some((item) => item.trackIds.includes(trackId));
    if (favoriteTrackSet.has(trackId) && !stillReferencedByOthers) {
      removeDreamMusicFavoriteMemory(trackId);
    }

    removeTrackFromPlaylist(playlistId, trackId);
    setUiMessage(`已从 ${playlist?.name || '歌单'} 删除《${track?.title || '歌曲'}》`);
  };

  const handleRemoveRecentTrack = (trackId: string) => {
    const track = trackById.get(trackId);
    removeRecentlyPlayedTrack(trackId);
    setUiMessage(`已从最近播放移除：${track?.title || '歌曲'}`);
  };

  const handleClearRecentTracks = () => {
    clearRecentlyPlayedTracks();
    setUiMessage('最近播放已清空');
  };

  const handleSubmitComment = (content: string) => {
    if (!currentTrack) {
      setUiMessage('请先播放一首歌，再发表评论。');
      return;
    }
    const createdComment = addComment({
      trackId: currentTrack.id,
      trackTitle: currentTrack.title,
      trackArtist: currentTrack.artist,
      trackCoverUrl: currentTrack.coverUrl,
      authorRoleId: activeRoleId,
      authorName: commentAuthorName,
      content,
    });
    if (!createdComment) {
      setUiMessage('评论内容不能为空。');
      return;
    }

    upsertDreamMusicCommentMemory(createdComment);
    setUiMessage(`评论已发布：${currentTrack.title}`);
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    const nextContent = content.trim();
    if (!nextContent) {
      setUiMessage('评论内容不能为空。');
      return;
    }

    const target = comments.find((item) => item.id === commentId);
    if (!target) {
      setUiMessage('未找到对应评论。');
      return;
    }
    if (target.authorRoleId !== activeRoleId) {
      setUiMessage('只能编辑当前身份发布的评论。');
      return;
    }

    const updatedComment = updateComment(commentId, nextContent, activeRoleId);
    if (updatedComment) {
      upsertDreamMusicCommentMemory(updatedComment);
    }
    setUiMessage('评论已更新');
  };

  const handleRemoveComment = (commentId: string) => {
    const target = comments.find((item) => item.id === commentId);
    if (!target) {
      setUiMessage('未找到对应评论。');
      return;
    }
    if (target.authorRoleId !== activeRoleId) {
      setUiMessage('只能删除当前身份发布的评论。');
      return;
    }

    const removedComment = removeComment(commentId, activeRoleId);
    if (removedComment) {
      removeDreamMusicCommentMemory(removedComment);
    }
    setUiMessage('评论已删除');
  };

  const handleClearMyComments = () => {
    if (myCommentCount === 0) {
      setUiMessage('当前身份暂无可清空评论。');
      return;
    }
    const removedComments = clearComments(activeRoleId);
    removedComments.forEach((comment) => {
      removeDreamMusicCommentMemory(comment);
    });
    setUiMessage(`已清空 ${commentAuthorName} 的 ${myCommentCount} 条评论`);
  };

  const handleHeaderBack = () => {
    if (activeView === 'lyrics' || activeView === 'comment') {
      setActiveView('home');
      return;
    }
    if (activeView === 'mine' && openedPlaylistId) {
      setOpenedPlaylistId(null);
      return;
    }
    onClose();
  };

  const handleTogglePlay = () => {
    if (!currentTrackId) {
      const firstTrackId = playableTrackIds[0];
      if (!firstTrackId) {
        setUiMessage('当前没有可播放歌曲。');
        return;
      }
      setQueueAndPlay(playableTrackIds, firstTrackId);
      return;
    }
    togglePlayback();
  };

  const handleSeek = (value: string) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return;
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, seconds);
    setCurrentTimeSec(Math.max(0, seconds));
  };

  const handleTabChange = (nextView: BottomTabId) => {
    setActiveView(nextView);
    if (nextView !== 'mine') {
      setOpenedPlaylistId(null);
    }
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 overflow-hidden bg-[#6B5139] flex flex-col text-[#F4EFE8]"
      style={{ fontFamily: '"Avenir Next", "DIN Alternate", "PingFang SC", "Microsoft YaHei", sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,235,190,0.2),transparent_45%),radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.35),transparent_52%)]" />

      <div className="relative z-10 flex h-full flex-col">
        <AppHeader onBack={handleHeaderBack} />

        <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          {activeView === 'home' && (
            <HomeView
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTrackId={currentTrackId}
              favoriteTrackSet={favoriteTrackSet}
              effectiveDurationSec={effectiveDurationSec}
              currentTimeSec={currentTimeSec}
              playMode={playMode}
              volume={volume}
              playableTracks={playableTracks}
              playableTrackIds={playableTrackIds}
              uiMessage={uiMessage}
              onOpenLyrics={() => setActiveView('lyrics')}
              onOpenComment={() => setActiveView('comment')}
              onToggleFavorite={handleToggleFavoriteTrack}
              onSeek={handleSeek}
              onPlayPrev={playPrev}
              onTogglePlay={handleTogglePlay}
              onPlayNext={playNext}
              onCyclePlayMode={cyclePlayMode}
              onVolumeChange={setVolume}
              onPlayTrack={playTrackById}
            />
          )}

          {activeView === 'search' && (
            <SearchView
              searchKeyword={searchKeyword}
              onSearchKeywordChange={setSearchKeyword}
              onOnlineSearch={handleOnlineSearch}
              isOnlineSearching={isOnlineSearching}
              onlineSearchError={onlineSearchError}
              neteaseShareText={neteaseShareText}
              onNeteaseShareTextChange={setNeteaseShareText}
              onParsePlaylistShare={handleParseNeteaseShare}
              isNeteaseParsing={isNeteaseParsing}
              neteaseParseError={neteaseParseError}
              filteredTracks={filteredTracks}
              filteredOnlineResults={filteredOnlineResults}
              onPlayTrack={playTrackById}
            />
          )}

          {activeView === 'notes' && (
            <CircleView
              comments={comments}
              virtualHeight={circleVirtualHeight}
              currentRoleId={activeRoleId}
              myCommentCount={myCommentCount}
              onUpdateComment={handleUpdateComment}
              onRemoveComment={handleRemoveComment}
              onClearComments={handleClearMyComments}
            />
          )}

          {activeView === 'lyrics' && (
            <LyricsView
              currentTrack={currentTrack}
              lyricLines={lyricLines}
              activeLyricIndex={activeLyricIndex}
              isLyricLoading={isLyricLoading}
            />
          )}

          {activeView === 'comment' && (
            <CommentView
              currentTrack={currentTrack}
              trackComments={trackComments}
              currentRoleId={activeRoleId}
              authorName={commentAuthorName}
              onSubmitComment={handleSubmitComment}
              onUpdateComment={handleUpdateComment}
              onRemoveComment={handleRemoveComment}
            />
          )}

          {activeView === 'mine' && (
            <MineView
              openedPlaylist={openedPlaylist}
              myPlaylists={myPlaylists}
              favoriteTracks={favoriteTracks}
              recentTracks={recentTracks}
              playlistVirtualHeight={playlistVirtualHeight}
              openedPlaylistVirtualHeight={openedPlaylistVirtualHeight}
              onOpenPlaylist={setOpenedPlaylistId}
              onPlayPlaylist={playPlaylistById}
              onRemovePlaylist={handleRemovePlaylist}
              onPlayTrack={playTrackById}
              onPlayTrackInPlaylist={playTrackInPlaylist}
              onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
              onRemoveRecentTrack={handleRemoveRecentTrack}
              onClearRecentTracks={handleClearRecentTracks}
            />
          )}
        </main>

        {isBottomTabView(activeView) && <AppDock activeView={activeView} onChange={handleTabChange} />}
      </div>
    </motion.div>
  );
};

export type { DreamMusicAppProps };
