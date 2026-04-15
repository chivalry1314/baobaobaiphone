import React from 'react';
import { MessageCircleMore, Pencil, Trash2 } from 'lucide-react';
import { VirtualList } from '../components';
import type { DreamComment } from '../types';

interface CircleViewProps {
  comments: DreamComment[];
  virtualHeight: number;
  currentRoleId: string;
  myCommentCount: number;
  onUpdateComment: (commentId: string, content: string) => void;
  onRemoveComment: (commentId: string) => void;
  onClearComments: () => void;
}

const formatCommentTime = (timestamp: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

export const CircleView: React.FC<CircleViewProps> = ({
  comments,
  virtualHeight,
  currentRoleId,
  myCommentCount,
  onUpdateComment,
  onRemoveComment,
  onClearComments,
}) => (
  <section className="pt-4 space-y-3">
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">音乐圈子</p>
          <p className="text-[11px] text-[#E4D9C9]/70 mt-0.5">这里记录所有歌曲评论</p>
        </div>
        <button
          type="button"
          onClick={onClearComments}
          disabled={myCommentCount === 0}
          className="h-8 px-3 rounded-lg border border-white/20 bg-white/10 text-[11px] disabled:opacity-45"
        >
          清空我的评论
        </button>
      </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#E4D9C9]/70">评论动态（{comments.length}）</div>
      <VirtualList
        items={comments}
        height={virtualHeight}
        itemHeight={134}
        overscan={6}
        className="w-full"
        itemKey={(comment) => comment.id}
        empty={
          <div className="px-4 py-8 text-center text-[12px] text-[#E4D9C9]/70">还没有评论，去首页给歌曲留个言吧</div>
        }
        renderItem={(comment) => {
          const canOperate = comment.authorRoleId === currentRoleId;
          return (
            <div className="h-full px-2 py-1">
              <div className="h-full rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#F7F2EA] truncate">{comment.trackTitle}</p>
                    <p className="text-[10px] text-[#E4D9C9]/65 truncate">{comment.trackArtist}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canOperate ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const nextContent = window.prompt('编辑评论内容', comment.content);
                            if (nextContent === null) return;
                            onUpdateComment(comment.id, nextContent);
                          }}
                          className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                          aria-label="编辑评论"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveComment(comment.id)}
                          className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                          aria-label="删除评论"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-[#E4D9C9]/55">仅作者可操作</span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#E4D9C9]/65">
                  <MessageCircleMore size={12} />
                  <span>{comment.authorName}</span>
                  <span>·</span>
                  <span>{formatCommentTime(comment.createdAt)}</span>
                  {comment.updatedAt && comment.updatedAt > comment.createdAt ? <span>· 已编辑</span> : null}
                </div>
                <p className="mt-1.5 text-[12px] text-[#EFE6D8] leading-5 whitespace-pre-wrap break-words line-clamp-2">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        }}
      />
    </div>
  </section>
);
