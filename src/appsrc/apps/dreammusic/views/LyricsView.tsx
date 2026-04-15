import React, { useEffect, useRef } from 'react';
import type { DreamTrack } from '../types';

interface LyricsViewProps {
  currentTrack: DreamTrack | null;
  lyricLines: string[];
  activeLyricIndex: number;
  isLyricLoading: boolean;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  currentTrack,
  lyricLines,
  activeLyricIndex,
  isLyricLoading,
}) => {
  const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useEffect(() => {
    lyricLineRefs.current = lyricLineRefs.current.slice(0, lyricLines.length);
  }, [lyricLines.length]);

  useEffect(() => {
    if (activeLyricIndex < 0) return;
    const targetLine = lyricLineRefs.current[activeLyricIndex];
    if (!targetLine) return;
    targetLine.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLyricIndex, currentTrack?.id]);

  return (
    <section className="pt-6 space-y-3">
      <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-5 min-h-[62vh]">
        <div className="text-center mb-5">
          <p className="text-[18px] font-semibold">{currentTrack?.title || '歌词'}</p>
          <p className="text-[12px] text-[#E4D9C9]/75 mt-1">{currentTrack?.artist || '梦音乐'}</p>
        </div>
        {isLyricLoading ? (
          <p className="text-center text-[12px] text-[#E4D9C9]/60 mb-3">正在加载歌词...</p>
        ) : null}
        <div className="space-y-3 text-center max-h-[48vh] overflow-y-auto scrollbar-hide px-1">
          {lyricLines.map((line, index) => {
            const active = index === activeLyricIndex;
            return (
              <p
                key={`${line}-${index}`}
                ref={(node) => {
                  lyricLineRefs.current[index] = node;
                }}
                className={active ? 'text-[#FFF6EA] text-[17px] font-semibold' : 'text-[#E4D9C9]/65 text-[15px]'}
              >
                {line || ' '}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
};
