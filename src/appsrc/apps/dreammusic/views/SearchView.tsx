import React from 'react';
import { Loader2, Play, Search } from 'lucide-react';
import type { DreamTrack } from '../types';
import { isReadyTrack } from '../utils';

interface SearchViewProps {
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  onOnlineSearch: () => void | Promise<void>;
  isOnlineSearching: boolean;
  onlineSearchError: string | null;
  neteaseShareText: string;
  onNeteaseShareTextChange: (value: string) => void;
  onParsePlaylistShare: () => void | Promise<void>;
  isNeteaseParsing: boolean;
  neteaseParseError: string | null;
  filteredTracks: DreamTrack[];
  filteredOnlineResults: DreamTrack[];
  onPlayTrack: (trackId: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchKeyword,
  onSearchKeywordChange,
  onOnlineSearch,
  isOnlineSearching,
  onlineSearchError,
  neteaseShareText,
  onNeteaseShareTextChange,
  onParsePlaylistShare,
  isNeteaseParsing,
  neteaseParseError,
  filteredTracks,
  filteredOnlineResults,
  onPlayTrack,
}) => (
  <section className="pt-4 space-y-3">
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 flex items-center gap-2">
      <Search size={16} className="text-[#E4D9C9]/75" />
      <input
        value={searchKeyword}
        onChange={(event) => onSearchKeywordChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void onOnlineSearch();
          }
        }}
        placeholder="搜歌名、歌手、专辑"
        className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#E4D9C9]/50"
      />
      <button
        type="button"
        onClick={() => void onOnlineSearch()}
        disabled={isOnlineSearching}
        className="h-8 px-3 rounded-lg border border-white/20 bg-white/10 text-[11px] text-[#F7F2EA] inline-flex items-center gap-1 disabled:opacity-60"
      >
        {isOnlineSearching ? <Loader2 size={12} className="animate-spin" /> : null}
        在线搜
      </button>
    </div>

    {onlineSearchError && (
      <p className="text-[11px] text-amber-100/85 rounded-lg bg-black/15 border border-white/10 px-2.5 py-1.5">
        {onlineSearchError}
      </p>
    )}

    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-2.5">
      <p className="text-[11px] text-[#E4D9C9]/75">解析网易云或 QQ 音乐歌单，并加入“我的歌单”</p>
      <textarea
        value={neteaseShareText}
        onChange={(event) => onNeteaseShareTextChange(event.target.value)}
        rows={3}
        placeholder="示例：https://y.qq.com/n/ryqq/playlist/3602407677 或 https://music.163.com/playlist?id=123456789"
        className="w-full resize-none rounded-xl border border-white/15 bg-black/20 px-2.5 py-2 text-[12px] leading-5 text-[#F7F2EA] placeholder:text-[#E4D9C9]/45 outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#E4D9C9]/60">支持整段分享文本，无需手动提取链接。</p>
        <button
          type="button"
          onClick={() => void onParsePlaylistShare()}
          disabled={isNeteaseParsing}
          className="h-8 px-3 rounded-lg border border-white/20 bg-white/10 text-[11px] text-[#F7F2EA] inline-flex items-center gap-1 disabled:opacity-60"
        >
          {isNeteaseParsing ? <Loader2 size={12} className="animate-spin" /> : null}
          解析并加入
        </button>
      </div>
      {neteaseParseError && (
        <p className="text-[10px] text-amber-100/85 rounded-lg bg-black/15 border border-white/10 px-2 py-1.5">
          {neteaseParseError}
        </p>
      )}
    </div>

    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#E4D9C9]/70">
        本地歌曲（{filteredTracks.length}）
      </div>
      <div className="divide-y divide-white/10">
        {filteredTracks.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#E4D9C9]/70">没有匹配歌曲</div>
        )}
        {filteredTracks.map((track) => {
          const ready = isReadyTrack(track);
          return (
            <div key={track.id} className="px-3 py-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onPlayTrack(track.id)}
                disabled={!ready}
                className="h-8 w-8 rounded-full bg-white/10 border border-white/10 inline-flex items-center justify-center disabled:opacity-35"
              >
                <Play size={14} className="ml-[1px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-[#F7F2EA] truncate">{track.title}</p>
                <p className="text-[11px] text-[#E4D9C9]/70 truncate">
                  {track.artist}
                  {track.album ? ` · ${track.album}` : ''}
                </p>
              </div>
              <span className={`text-[10px] ${ready ? 'text-emerald-200/90' : 'text-amber-100/90'}`}>
                {ready ? '可播' : '不可播'}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#E4D9C9]/70">
        在线免费库（{filteredOnlineResults.length}）
      </div>
      <div className="divide-y divide-white/10">
        {filteredOnlineResults.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#E4D9C9]/70">
            还没有在线结果，输入关键词后点“在线搜”
          </div>
        )}
        {filteredOnlineResults.map((track) => {
          const ready = isReadyTrack(track);
          return (
            <div key={track.id} className="px-3 py-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onPlayTrack(track.id)}
                disabled={!ready}
                className="h-8 w-8 rounded-full bg-white/10 border border-white/10 inline-flex items-center justify-center disabled:opacity-35"
              >
                <Play size={14} className="ml-[1px]" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-[#F7F2EA] truncate">{track.title}</p>
                <p className="text-[11px] text-[#E4D9C9]/70 truncate">
                  {track.artist}
                  {track.album ? ` · ${track.album}` : ''}
                </p>
              </div>
              <span className="text-[10px] text-[#E4D9C9]/70">在线</span>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
