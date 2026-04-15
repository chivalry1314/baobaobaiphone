import React from 'react';
import { MessageCircle, Send, ThumbsUp, User as UserIcon } from 'lucide-react';
import type { WeChatMoment, WeChatUserProfile } from '../../types';
import { formatMomentTime } from './momentsUtils';

interface WeChatMomentCardProps {
  moment: WeChatMoment;
  wechatUserProfile: WeChatUserProfile;
  commentDraft: string;
  isCommenting: boolean;
  onOpenImagePreview: (images: string[], index: number) => void;
  onToggleLike: (momentId: string) => void;
  onToggleCommentInput: (momentId: string) => void;
  onCommentChange: (momentId: string, value: string) => void;
  onSendComment: (momentId: string) => void;
}

export const WeChatMomentCard: React.FC<WeChatMomentCardProps> = ({
  moment,
  wechatUserProfile,
  commentDraft,
  isCommenting,
  onOpenImagePreview,
  onToggleLike,
  onToggleCommentInput,
  onCommentChange,
  onSendComment,
}) => {
  const isSelfMoment = moment.authorId === wechatUserProfile.id;
  const displayName = isSelfMoment ? wechatUserProfile.name || moment.authorName : moment.authorName;
  const displayAvatar = isSelfMoment
    ? wechatUserProfile.avatar || moment.authorAvatar
    : moment.authorAvatar;
  const isLikedBySelf = moment.likes.includes(wechatUserProfile.id);

  const likeNames = moment.likes
    .map((userId) => (userId === wechatUserProfile.id ? (wechatUserProfile.name || '我') : '好友'))
    .join('、');

  const hasInteraction = moment.likes.length > 0 || moment.comments.length > 0;

  return (
    <div className="rounded-xl bg-white p-3 border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-lg bg-gray-100 overflow-hidden shrink-0">
          {displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <UserIcon size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[#576B95]">{displayName}</div>
          {moment.content ? (
            <div className="mt-1 text-[15px] leading-6 text-gray-900 whitespace-pre-wrap break-words">
              {moment.content}
            </div>
          ) : null}

          {moment.images.length > 0 ? (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {moment.images.map((image, index) => (
                <button
                  type="button"
                  key={`${moment.id}-${index}`}
                  className="aspect-square rounded-md overflow-hidden bg-gray-100"
                  onClick={() => onOpenImagePreview(moment.images, index)}
                >
                  <img src={image} alt="moment" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-2 text-[12px] text-gray-400">{formatMomentTime(moment.timestamp)}</div>

          <div className="mt-2 flex items-center gap-4 text-[13px]">
            <button
              type="button"
              onClick={() => onToggleLike(moment.id)}
              className={`flex items-center gap-1 active:opacity-70 ${
                isLikedBySelf ? 'text-[#07C160]' : 'text-gray-500'
              }`}
            >
              <ThumbsUp size={14} />
              <span>{isLikedBySelf ? '已赞' : '赞'}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleCommentInput(moment.id)}
              className="flex items-center gap-1 text-gray-500 active:opacity-70"
            >
              <MessageCircle size={14} />
              <span>评论</span>
            </button>
          </div>

          {hasInteraction ? (
            <div className="mt-2 rounded-md bg-[#F5F5F5] px-2.5 py-2 text-[13px]">
              {moment.likes.length > 0 ? (
                <div className="text-[#576B95] break-words">{likeNames}</div>
              ) : null}
              {moment.comments.length > 0 ? (
                <div
                  className={`${
                    moment.likes.length > 0 ? 'mt-1 border-t border-gray-200 pt-1' : ''
                  } space-y-0.5`}
                >
                  {moment.comments.map((comment) => (
                    <div key={comment.id} className="break-words text-gray-700">
                      <span className="text-[#576B95]">{comment.authorName}</span>
                      <span>：{comment.content}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {isCommenting ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={commentDraft}
                onChange={(event) => onCommentChange(moment.id, event.target.value)}
                placeholder="写评论..."
                className="h-9 flex-1 rounded-md border border-gray-200 bg-white px-3 text-[14px] text-gray-900 outline-none"
              />
              <button
                type="button"
                onClick={() => onSendComment(moment.id)}
                disabled={commentDraft.trim().length === 0}
                className={`h-9 rounded-md px-3 text-[13px] ${
                  commentDraft.trim().length > 0
                    ? 'bg-[#07C160] text-white active:opacity-80'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Send size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
