import React from 'react';
import { Heart, ListMusic, Play, Trash2 } from 'lucide-react';
import { VirtualList } from '../components';
import type { ResolvedDreamPlaylist } from '../hooks/useDreamMusicDerived';
import type { DreamTrack } from '../types';
import { formatDuration, isReadyTrack } from '../utils';

interface MineViewProps {
  openedPlaylist: ResolvedDreamPlaylist | null;
  myPlaylists: ResolvedDreamPlaylist[];
  favoriteTracks: DreamTrack[];
  recentTracks: DreamTrack[];
  playlistVirtualHeight: number;
  openedPlaylistVirtualHeight: number;
  onOpenPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlistId: string) => void;
  onRemovePlaylist: (playlistId: string) => void;
  onPlayTrack: (trackId: string) => void;
  onPlayTrackInPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveRecentTrack: (trackId: string) => void;
  onClearRecentTracks: () => void;
}

export const MineView: React.FC<MineViewProps> = ({
  openedPlaylist,
  myPlaylists,
  favoriteTracks,
  recentTracks,
  playlistVirtualHeight,
  openedPlaylistVirtualHeight,
  onOpenPlaylist,
  onPlayPlaylist,
  onRemovePlaylist,
  onPlayTrack,
  onPlayTrackInPlaylist,
  onRemoveTrackFromPlaylist,
  onRemoveRecentTrack,
  onClearRecentTracks,
}) => (
  <section className="pt-4 space-y-3">
    {!openedPlaylist ? (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] text-[#E4D9C9]/70">收藏</p>
            <p className="mt-1 text-[24px] font-semibold">{favoriteTracks.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-[11px] text-[#E4D9C9]/70">最近播放</p>
            <p className="mt-1 text-[24px] font-semibold">{recentTracks.length}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-[13px] mb-2">
            <ListMusic size={14} />
            我的歌单（{myPlaylists.length}）
          </div>
          <VirtualList
            items={myPlaylists}
            height={playlistVirtualHeight}
            itemHeight={72}
            overscan={6}
            className="w-full"
            itemKey={(playlist) => playlist.id}
            empty={<p className="px-1 text-[12px] text-[#E4D9C9]/60">还没有歌单</p>}
            renderItem={(playlist) => (
              <div className="h-full px-0.5 py-1">
                <div className="h-full rounded-xl border border-white/10 bg-black/15 px-2.5 py-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPlaylist(playlist.id)}
                    className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
                  >
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 bg-[#6C523A] shrink-0">
                      {playlist.coverUrl ? (
                        <img src={playlist.coverUrl} alt={playlist.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full inline-flex items-center justify-center text-[#F4EBDD]/80">
                          <ListMusic size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] truncate">{playlist.name}</p>
                      <p className="text-[10px] text-[#E4D9C9]/65 truncate">
                        {playlist.trackIds.length} 首 · 可播 {playlist.playableCount} 首
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(playlist.id)}
                    disabled={playlist.playableCount <= 0}
                    className="h-7 px-2.5 rounded-lg border border-white/15 bg-white/10 text-[10px] disabled:opacity-45"
                  >
                    播放
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePlaylist(playlist.id)}
                    className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                    aria-label="删除歌单"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-[13px] mb-2">
            <Heart size={14} />
            收藏歌曲
          </div>
          <div className="space-y-2">
            {favoriteTracks.length === 0 && (
              <p className="text-[12px] text-[#E4D9C9]/60">还没有收藏歌曲</p>
            )}
            {favoriteTracks.slice(0, 8).map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => onPlayTrack(track.id)}
                className="w-full text-left rounded-xl border border-white/10 bg-black/15 px-3 py-2"
              >
                <p className="text-[12px] truncate">{track.title}</p>
                <p className="text-[10px] text-[#E4D9C9]/65 truncate">{track.artist}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px]">
              <ListMusic size={14} />
              最近播放
            </div>
            <button
              type="button"
              onClick={onClearRecentTracks}
              disabled={recentTracks.length === 0}
              className="h-7 px-2.5 rounded-lg border border-white/15 bg-white/10 text-[10px] disabled:opacity-45"
            >
              一键清空
            </button>
          </div>
          <div className="space-y-2">
            {recentTracks.length === 0 && <p className="text-[12px] text-[#E4D9C9]/60">还没有播放记录</p>}
            {recentTracks.slice(0, 12).map((track) => (
              <div
                key={track.id}
                className="rounded-xl border border-white/10 bg-black/15 px-2 py-2 flex items-center gap-2"
              >
                <button type="button" onClick={() => onPlayTrack(track.id)} className="min-w-0 flex-1 text-left">
                  <p className="text-[12px] truncate">{track.title}</p>
                  <p className="text-[10px] text-[#E4D9C9]/65 truncate">
                    {track.artist} · {formatDuration(track.durationMs)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecentTrack(track.id)}
                  className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                  aria-label="删除最近播放"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </>
    ) : (
      <>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 bg-[#6C523A] shrink-0">
              {openedPlaylist.coverUrl ? (
                <img src={openedPlaylist.coverUrl} alt={openedPlaylist.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full inline-flex items-center justify-center text-[#F4EBDD]/80">
                  <ListMusic size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold truncate">{openedPlaylist.name}</p>
              <p className="text-[11px] text-[#E4D9C9]/70 truncate">
                {openedPlaylist.trackIds.length} 首 · 可播 {openedPlaylist.playableCount} 首
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPlayPlaylist(openedPlaylist.id)}
              disabled={openedPlaylist.playableCount <= 0}
              className="h-8 px-3 rounded-lg border border-white/15 bg-white/10 text-[11px] disabled:opacity-45"
            >
              播放全部
            </button>
            <button
              type="button"
              onClick={() => onRemovePlaylist(openedPlaylist.id)}
              className="h-8 px-3 rounded-lg border border-red-300/30 bg-red-400/10 text-[11px] inline-flex items-center gap-1"
            >
              <Trash2 size={13} /> 删除歌单
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#E4D9C9]/70">
            歌曲列表（{openedPlaylist.tracks.length}）
          </div>
          <VirtualList
            items={openedPlaylist.tracks}
            height={openedPlaylistVirtualHeight}
            itemHeight={58}
            overscan={8}
            className="w-full"
            itemKey={(track) => track.id}
            empty={<div className="px-4 py-6 text-center text-[12px] text-[#E4D9C9]/70">歌单里还没有歌曲</div>}
            renderItem={(track) => {
              const ready = isReadyTrack(track);
              return (
                <div className="h-full px-2 py-1">
                  <div className="h-full px-2 py-2 rounded-lg border border-white/10 bg-black/10 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onPlayTrackInPlaylist(openedPlaylist.id, track.id)}
                      disabled={!ready}
                      className="h-8 w-8 rounded-full bg-white/10 border border-white/10 inline-flex items-center justify-center disabled:opacity-35"
                    >
                      <Play size={14} className="ml-[1px]" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#F7F2EA] truncate">{track.title}</p>
                      <p className="text-[11px] text-[#E4D9C9]/70 truncate">{track.artist}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTrackFromPlaylist(openedPlaylist.id, track.id)}
                      className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                      aria-label="删除歌曲"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </>
    )}
  </section>
);
