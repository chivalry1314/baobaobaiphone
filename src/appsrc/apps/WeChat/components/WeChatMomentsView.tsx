import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, ChevronLeft, RefreshCw, User as UserIcon } from 'lucide-react';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { useWeChatStore } from '../store';
import { useWeChatCharactersFromContacts } from '../contactAdapter';
import type { WeChatMomentsViewProps } from '../types';
import { WeChatMomentCard } from './moments/WeChatMomentCard';
import { WeChatMomentsComposer } from './moments/WeChatMomentsComposer';
import { WeChatMomentsImagePreview } from './moments/WeChatMomentsImagePreview';
import {
  clamp,
  compressImageFile,
  MAX_UPLOAD_IMAGES,
} from './moments/momentsUtils';
import { appendAiMoments, type AiAuthor } from './moments/momentsAiService';

const PULL_REFRESH_TRIGGER = 72;

const toAiErrorMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'missing-chat-api-key') {
    return '请先在设置中配置对话 API Key';
  }
  if (code === 'moments-empty-drafts') {
    return 'AI 没有返回可用动态，请稍后重试';
  }
  return 'AI 生成失败，请检查对话模型和生图模型配置';
};

export const WeChatMomentsView: React.FC<WeChatMomentsViewProps> = ({ onBack, focusAuthorId }) => {
  const { settings } = useGlobalSettingsStore();
  const {
    wechatMoments,
    wechatUserProfile,
    wechatAiMomentsSettings,
    addWeChatMoment,
    toggleWeChatMomentLike,
    addWeChatMomentComment,
    updateWeChatUserProfile,
  } = useWeChatStore();

  const wechatCharacters = useWeChatCharactersFromContacts();

  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [activeCommentMomentId, setActiveCommentMomentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isRefreshingAi, setRefreshingAi] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [previewState, setPreviewState] = useState<{ images: string[]; index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const previewTouchStartXRef = useRef<number | null>(null);
  const previewTouchDeltaXRef = useRef(0);
  const initialGeneratedScopesRef = useRef<Record<string, boolean>>({});
  const lastRefreshAuthorIdRef = useRef<string | null>(null);

  const isScopedView = Boolean(focusAuthorId);
  const scopeKey = focusAuthorId || '__all__';

  const focusedCharacter = useMemo(
    () => wechatCharacters.find((item) => item.id === focusAuthorId) ?? null,
    [focusAuthorId, wechatCharacters]
  );

  const candidateAiCharacters = useMemo<AiAuthor[]>(() => {
    if (focusAuthorId) {
      return wechatCharacters.filter((item) => item.id === focusAuthorId);
    }
    return wechatCharacters;
  }, [focusAuthorId, wechatCharacters]);

  const aiRefreshCount = clamp(wechatAiMomentsSettings.refreshCount || 3, 1, 20);
  const aiIncludeImages = Boolean(wechatAiMomentsSettings.includeImages);

  const sortedMoments = useMemo(
    () =>
      [...wechatMoments]
        .filter((moment) => (focusAuthorId ? moment.authorId === focusAuthorId : true))
        .sort((a, b) => b.timestamp - a.timestamp),
    [focusAuthorId, wechatMoments]
  );

  const canPublish = draftContent.trim().length > 0 || draftImages.length > 0;
  const showComposerActions = !isScopedView;
  const hasCoverImage = showComposerActions && Boolean(wechatUserProfile.backgroundImage);
  const title = focusedCharacter ? `${focusedCharacter.name}的朋友圈` : '朋友圈';

  const runAiRefresh = async (count: number) => {
    const result = await appendAiMoments({
      settings,
      count,
      authors: candidateAiCharacters,
      focusAuthorId,
      includeImages: aiIncludeImages,
      lastRefreshAuthorId: lastRefreshAuthorIdRef.current,
      addMoment: addWeChatMoment,
    });

    lastRefreshAuthorIdRef.current = result.lastRefreshAuthorId;

    if (aiIncludeImages && result.generatedCount > 0 && result.generatedImageCount === 0) {
      setAiErrorMessage('已生成文案，但当前生图接口未返回图片，请检查生图配置');
    }
  };

  const handleRefreshAiMoments = async () => {
    if (isRefreshingAi) return;
    setRefreshingAi(true);
    setAiErrorMessage(null);

    try {
      await runAiRefresh(aiRefreshCount);
    } catch (error) {
      setAiErrorMessage(toAiErrorMessage(error));
    } finally {
      setPullDistance(0);
      setRefreshingAi(false);
    }
  };

  useEffect(() => {
    if (initialGeneratedScopesRef.current[scopeKey]) return;
    initialGeneratedScopesRef.current[scopeKey] = true;

    const hasAiContentInScope = focusAuthorId
      ? wechatMoments.some((moment) => moment.authorId === focusAuthorId)
      : wechatMoments.some((moment) => moment.authorId !== wechatUserProfile.id);

    if (hasAiContentInScope) return;

    let cancelled = false;
    setRefreshingAi(true);
    setAiErrorMessage(null);

    (async () => {
      try {
        await runAiRefresh(aiRefreshCount);
      } catch (error) {
        if (!cancelled) {
          setAiErrorMessage(toAiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setRefreshingAi(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    aiRefreshCount,
    focusAuthorId,
    scopeKey,
    wechatMoments,
    wechatUserProfile.id,
    aiIncludeImages,
    candidateAiCharacters,
    settings,
    addWeChatMoment,
  ]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!listRef.current || listRef.current.scrollTop > 0) {
      pullStartYRef.current = null;
      return;
    }
    pullStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartYRef.current === null || isRefreshingAi) return;
    const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
    const distance = currentY - pullStartYRef.current;
    if (distance <= 0) return;
    setPullDistance(clamp(distance, 0, 108));
  };

  const handleTouchEnd = () => {
    pullStartYRef.current = null;
    if (pullDistance >= PULL_REFRESH_TRIGGER) {
      handleRefreshAiMoments();
      return;
    }
    setPullDistance(0);
  };

  const handleChooseImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const available = Math.max(0, MAX_UPLOAD_IMAGES - draftImages.length);
    if (available <= 0) return;

    const selectedFiles = files.slice(0, available);
    const compressed = await Promise.all(selectedFiles.map((file) => compressImageFile(file)));
    setDraftImages((prev) => [...prev, ...compressed]);
    event.target.value = '';
  };

  const handleChooseCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const compressedCover = await compressImageFile(file);
    updateWeChatUserProfile({ backgroundImage: compressedCover });
    event.target.value = '';
  };

  const handlePublish = () => {
    if (!canPublish) return;

    addWeChatMoment({
      authorId: wechatUserProfile.id,
      authorName: wechatUserProfile.name || '我',
      authorAvatar: wechatUserProfile.avatar || '',
      content: draftContent.trim(),
      images: draftImages,
    });

    setComposerOpen(false);
    setDraftContent('');
    setDraftImages([]);
  };

  const handleCommentChange = (momentId: string, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [momentId]: value }));
  };

  const handleSendComment = (momentId: string) => {
    const content = (commentDrafts[momentId] || '').trim();
    if (!content) return;

    addWeChatMomentComment(momentId, {
      authorName: wechatUserProfile.name || '我',
      content,
    });

    setCommentDrafts((prev) => ({ ...prev, [momentId]: '' }));
    setActiveCommentMomentId(null);
  };

  const handleOpenImagePreview = (images: string[], index: number) => {
    if (!images.length) return;
    setPreviewState({ images, index: clamp(index, 0, images.length - 1) });
  };

  const handlePreviewGoPrev = () => {
    setPreviewState((prev) => {
      if (!prev || prev.index <= 0) return prev;
      return { ...prev, index: prev.index - 1 };
    });
  };

  const handlePreviewGoNext = () => {
    setPreviewState((prev) => {
      if (!prev || prev.index >= prev.images.length - 1) return prev;
      return { ...prev, index: prev.index + 1 };
    });
  };

  const handlePreviewTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    previewTouchStartXRef.current = event.touches[0]?.clientX ?? null;
    previewTouchDeltaXRef.current = 0;
  };

  const handlePreviewTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (previewTouchStartXRef.current === null) return;
    const currentX = event.touches[0]?.clientX ?? previewTouchStartXRef.current;
    previewTouchDeltaXRef.current = currentX - previewTouchStartXRef.current;
  };

  const handlePreviewTouchEnd = () => {
    const deltaX = previewTouchDeltaXRef.current;
    previewTouchStartXRef.current = null;
    previewTouchDeltaXRef.current = 0;

    const swipeThreshold = 48;
    if (deltaX <= -swipeThreshold) {
      handlePreviewGoNext();
      return;
    }
    if (deltaX >= swipeThreshold) {
      handlePreviewGoPrev();
    }
  };

  useEffect(() => {
    if (!previewState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewState(null);
        return;
      }
      if (event.key === 'ArrowLeft') {
        handlePreviewGoPrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        handlePreviewGoNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewState]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-50 bg-[#EDEDED] flex flex-col"
    >
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRefreshAiMoments}
            className="text-gray-900 active:opacity-50 px-1.5"
            aria-label="刷新 AI 朋友圈"
            title="刷新 AI 朋友圈"
          >
            <RefreshCw size={19} className={isRefreshingAi ? 'animate-spin' : ''} />
          </button>
          {showComposerActions ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="text-gray-900 active:opacity-50 pr-1"
              aria-label="发朋友圈"
              title="发朋友圈"
            >
              <Camera size={22} />
            </button>
          ) : (
            <div className="w-1" />
          )}
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-center justify-center text-[12px] text-gray-500 transition-all"
          style={{ height: `${isRefreshingAi ? 48 : pullDistance}px` }}
        >
          {isRefreshingAi
            ? '正在生成 AI 朋友圈...'
            : pullDistance >= PULL_REFRESH_TRIGGER
            ? '松开刷新 AI 朋友圈'
            : pullDistance > 0
            ? '继续下拉刷新 AI 朋友圈'
            : ''}
        </div>

        {aiErrorMessage ? (
          <div className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {aiErrorMessage}
          </div>
        ) : null}

        <div
          className={`h-44 relative ${
            hasCoverImage ? 'bg-slate-300' : 'bg-gradient-to-b from-[#90b6d9] to-[#cedceb]'
          }`}
          style={
            hasCoverImage
              ? {
                  backgroundImage: `url(${wechatUserProfile.backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-black/10" />

          {showComposerActions ? (
            <>
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                className="absolute left-3 top-3 z-10 rounded-md bg-black/35 px-2.5 py-1 text-[12px] text-white active:opacity-80"
              >
                更换封面
              </button>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChooseCoverImage}
              />
            </>
          ) : null}

          <div className="absolute right-4 bottom-4 flex items-center gap-3">
            <span className="text-white text-[17px] font-semibold drop-shadow">
              {focusedCharacter?.name || wechatUserProfile.name || '我'}
            </span>
            <div className="h-16 w-16 rounded-lg bg-white overflow-hidden border border-white/70 shadow">
              {focusedCharacter?.avatar || wechatUserProfile.avatar ? (
                <img
                  src={focusedCharacter?.avatar || wechatUserProfile.avatar}
                  alt={focusedCharacter?.name || wechatUserProfile.name || 'avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400">
                  <UserIcon size={26} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-4">
          {sortedMoments.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-6 text-center text-[14px] text-gray-500 border border-gray-100">
              {isScopedView
                ? '该联系人还没有朋友圈动态，下拉可生成 AI 动态。'
                : '还没有朋友圈内容，点右上角相机发布第一条动态，或下拉刷新 AI 动态。'}
            </div>
          ) : (
            sortedMoments.map((moment) => (
              <WeChatMomentCard
                key={moment.id}
                moment={moment}
                wechatUserProfile={wechatUserProfile}
                commentDraft={commentDrafts[moment.id] || ''}
                isCommenting={activeCommentMomentId === moment.id}
                onOpenImagePreview={handleOpenImagePreview}
                onToggleLike={(momentId) => toggleWeChatMomentLike(momentId, wechatUserProfile.id)}
                onToggleCommentInput={(momentId) =>
                  setActiveCommentMomentId((prev) => (prev === momentId ? null : momentId))
                }
                onCommentChange={handleCommentChange}
                onSendComment={handleSendComment}
              />
            ))
          )}
        </div>
      </div>

      <WeChatMomentsImagePreview
        previewState={previewState}
        onClose={() => setPreviewState(null)}
        onPrev={handlePreviewGoPrev}
        onNext={handlePreviewGoNext}
        onTouchStart={handlePreviewTouchStart}
        onTouchMove={handlePreviewTouchMove}
        onTouchEnd={handlePreviewTouchEnd}
      />

      <WeChatMomentsComposer
        isOpen={isComposerOpen}
        canPublish={canPublish}
        draftContent={draftContent}
        draftImages={draftImages}
        fileInputRef={fileInputRef}
        onClose={() => {
          setComposerOpen(false);
          setDraftContent('');
          setDraftImages([]);
        }}
        onPublish={handlePublish}
        onDraftContentChange={setDraftContent}
        onChooseImages={handleChooseImages}
        onRemoveDraftImage={(index) => setDraftImages((prev) => prev.filter((_, i) => i !== index))}
      />
    </motion.div>
  );
};
