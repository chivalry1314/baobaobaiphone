import React, { useMemo, useState } from 'react';
import { Check, MessageCircleMore, Pencil, Send, Trash2, X } from 'lucide-react';
import type { DreamComment, DreamTrack } from '../types';

interface CommentViewProps {
  currentTrack: DreamTrack | null;
  trackComments: DreamComment[];
  currentRoleId: string;
  authorName: string;
  onSubmitComment: (content: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  onRemoveComment: (commentId: string) => void;
}

const formatCommentTime = (timestamp: number) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

export const CommentView: React.FC<CommentViewProps> = ({
  currentTrack,
  trackComments,
  currentRoleId,
  authorName,
  onSubmitComment,
  onUpdateComment,
  onRemoveComment,
}) => {
  const [content, setContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const canSubmit = Boolean(currentTrack) && Boolean(content.trim());

  const subtitle = useMemo(() => {
    if (!currentTrack) return '请先播放一首歌再评论';
    return `${currentTrack.artist}${currentTrack.album ? ` · ${currentTrack.album}` : ''}`;
  }, [currentTrack]);

  return (
    <section className="pt-4 space-y-3">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-[#6C523A] shrink-0">
            {currentTrack?.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full inline-flex items-center justify-center text-[#F4EBDD]/80">
                <MessageCircleMore size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate">{currentTrack?.title || '暂无播放歌曲'}</p>
            <p className="text-[11px] text-[#E4D9C9]/70 truncate">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-2">
        <div className="grid grid-cols-[68px_1fr] items-center gap-2">
          <label className="text-[12px] text-[#E4D9C9]/75">
            用户名
          </label>
          <div className="h-9 rounded-lg border border-white/15 bg-black/20 px-2.5 inline-flex items-center text-[12px] text-[#F7F2EA]">
            {authorName}
          </div>
        </div>
        <p className="text-[10px] text-[#E4D9C9]/60">用户名来自当前名片身份，切换身份后将自动更新。</p>
        <textarea
          value={content}
          rows={4}
          maxLength={300}
          onChange={(event) => setContent(event.target.value)}
          className="w-full resize-none rounded-xl border border-white/15 bg-black/20 px-2.5 py-2 text-[12px] leading-5 outline-none"
          placeholder={currentTrack ? `想对《${currentTrack.title}》说点什么...` : '请先播放歌曲后再留言'}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#E4D9C9]/60">{content.length}/300</span>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmitComment(content);
              setContent('');
            }}
            className="h-8 px-3 rounded-lg border border-white/20 bg-white/10 text-[11px] inline-flex items-center gap-1 disabled:opacity-45"
          >
            <Send size={12} />
            发布评论
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#E4D9C9]/70">
          这首歌的评论（{trackComments.length}）
        </div>
        <div className="divide-y divide-white/10">
          {trackComments.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-[#E4D9C9]/70">还没有评论，来发第一条吧</div>
          )}
          {trackComments.map((comment) => {
            const canOperate = comment.authorRoleId === currentRoleId;
            const isEditing = canOperate && editingCommentId === comment.id;
            return (
              <div key={comment.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#F7F2EA] truncate">{comment.authorName}</p>
                    <p className="text-[10px] text-[#E4D9C9]/60">
                      {formatCommentTime(comment.createdAt)}
                      {comment.updatedAt && comment.updatedAt > comment.createdAt ? ' · 已编辑' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingContent.trim()) return;
                            onUpdateComment(comment.id, editingContent);
                            setEditingCommentId(null);
                            setEditingContent('');
                          }}
                          disabled={!editingContent.trim()}
                          className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center disabled:opacity-45"
                          aria-label="保存评论"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent('');
                          }}
                          className="h-7 w-7 rounded-lg border border-white/15 bg-white/10 inline-flex items-center justify-center"
                          aria-label="取消编辑"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : canOperate ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingContent(comment.content);
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
                {isEditing ? (
                  <textarea
                    value={editingContent}
                    rows={3}
                    maxLength={300}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-black/20 px-2.5 py-2 text-[12px] leading-5 outline-none"
                  />
                ) : (
                  <p className="mt-1 text-[12px] text-[#EDE4D5] leading-5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
