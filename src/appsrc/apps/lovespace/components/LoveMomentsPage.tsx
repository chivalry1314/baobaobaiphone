import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  PencilLine,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';
import type {
  AddLoveMomentCommentPayload,
  BondCardData,
  LoveMomentRecord,
  RemoveLoveMomentCommentPayload,
  SaveLoveMomentPayload,
  UpdateLoveMomentPayload,
} from '../types';
import { formatDateWithWeekday } from '../utils';
import { ContactAvatar } from './ContactAvatar';

interface LoveMomentsPageProps {
  card: BondCardData;
  moments: LoveMomentRecord[];
  onBack: () => void;
  onAddMoment: (payload: SaveLoveMomentPayload) => void;
  onUpdateMoment: (payload: UpdateLoveMomentPayload) => void;
  onRemoveMoment: (momentId: string) => void;
  onAddComment: (payload: AddLoveMomentCommentPayload) => void;
  onRemoveComment: (payload: RemoveLoveMomentCommentPayload) => void;
  readOnly?: boolean;
}

type PublishMode =
  | { type: 'create' }
  | {
      type: 'edit';
      momentId: string;
    };

const MAX_CONTENT_LENGTH = 800;

const getDateBadge = (timestamp: number) => {
  const date = new Date(timestamp);
  return {
    day: `${date.getDate()}`.padStart(2, '0'),
    yearMonth: `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, '0')}`,
  };
};

const formatMomentTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatCommentTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatMomentDateWithWeekday = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });

export const LoveMomentsPage: React.FC<LoveMomentsPageProps> = ({
  card,
  moments,
  onBack,
  onAddMoment,
  onUpdateMoment,
  onRemoveMoment,
  onAddComment,
  onRemoveComment,
  readOnly = false,
}) => {
  const [publishMode, setPublishMode] = useState<PublishMode | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [commentDraftByMoment, setCommentDraftByMoment] = useState<Record<string, string>>({});
  const [pendingDeleteMoment, setPendingDeleteMoment] = useState<LoveMomentRecord | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const sortedMoments = useMemo(
    () =>
      [...moments].sort(
        (left, right) => right.happenedAt - left.happenedAt || right.createdAt - left.createdAt
      ),
    [moments]
  );

  const selectedMoment = useMemo(
    () => sortedMoments.find((item) => item.id === selectedMomentId) ?? null,
    [sortedMoments, selectedMomentId]
  );

  useEffect(() => {
    if (selectedMomentId && !selectedMoment) {
      setSelectedMomentId(null);
    }
  }, [selectedMomentId, selectedMoment]);

  const isPublishing = Boolean(publishMode);
  const isEditing = publishMode?.type === 'edit';
  const draftLength = draftContent.length;
  const canPublish = draftLength > 0 || Boolean(draftImage);

  const openCreate = () => {
    if (readOnly) return;
    setPublishMode({ type: 'create' });
    setDraftContent('');
    setDraftImage(null);
  };

  const openEdit = (moment: LoveMomentRecord) => {
    if (readOnly) return;
    setPublishMode({ type: 'edit', momentId: moment.id });
    setDraftContent(moment.content);
    setDraftImage(moment.imageDataUrl ?? null);
  };

  const closePublish = () => {
    setPublishMode(null);
    setDraftContent('');
    setDraftImage(null);
  };

  const handleUploadPhoto = () => {
    if (readOnly) return;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      event.currentTarget.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  const handlePublish = () => {
    if (readOnly) return;
    if (!canPublish) return;

    if (publishMode?.type === 'edit') {
      onUpdateMoment({
        momentId: publishMode.momentId,
        content: draftContent.slice(0, MAX_CONTENT_LENGTH),
        imageDataUrl: draftImage ?? undefined,
      });
      closePublish();
      return;
    }

    onAddMoment({
      bondId: card.bond.id,
      content: draftContent.slice(0, MAX_CONTENT_LENGTH),
      imageDataUrl: draftImage ?? undefined,
    });
    closePublish();
  };

  const handleCommentChange = (momentId: string, value: string) => {
    setCommentDraftByMoment((current) => ({ ...current, [momentId]: value }));
  };

  const handleSendComment = (momentId: string) => {
    if (readOnly) return;
    const draft = (commentDraftByMoment[momentId] ?? '').trim();
    if (!draft) return;

    onAddComment({
      momentId,
      content: draft,
    });

    setCommentDraftByMoment((current) => ({
      ...current,
      [momentId]: '',
    }));
  };

  const handleDeleteComment = (momentId: string, commentId: string) => {
    if (readOnly) return;
    onRemoveComment({ momentId, commentId });
  };

  const handleConfirmDeleteMoment = () => {
    if (readOnly) return;
    if (!pendingDeleteMoment) return;
    onRemoveMoment(pendingDeleteMoment.id);

    if (selectedMomentId === pendingDeleteMoment.id) {
      setSelectedMomentId(null);
    }

    setPendingDeleteMoment(null);
  };

  const renderPublishView = () => (
    <motion.div
      key="publish"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="h-full flex flex-col"
    >
      <header className="bg-[#fff7fb] px-4 pt-11 pb-3 border-b border-rose-100 flex items-center">
        <button
          type="button"
          onClick={closePublish}
          className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
          aria-label={LOVE_SPACE_TEXT.back}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="flex-1 text-center text-[20px] font-semibold tracking-wide">
          {isEditing ? LOVE_SPACE_TEXT.momentsEditTitle : LOVE_SPACE_TEXT.momentsPublishTitle}
        </h2>
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish}
          className={`h-9 min-w-20 rounded-full px-4 text-[15px] font-semibold ${
            canPublish
              ? 'bg-white border border-rose-100 text-slate-700 shadow-[0_12px_24px_-20px_rgba(241,180,200,0.55)] active:scale-95 transition-transform'
              : 'bg-slate-200 text-slate-400'
          }`}
        >
          {LOVE_SPACE_TEXT.momentsPublishDone}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <section className="rounded-[20px] border border-rose-100/75 bg-white px-4 py-4 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.25)]">
          <textarea
            value={draftContent}
            maxLength={MAX_CONTENT_LENGTH}
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder={LOVE_SPACE_TEXT.momentsPublishPlaceholder}
            className="w-full min-h-[210px] resize-none bg-transparent text-[16px] leading-7 text-slate-800 placeholder:text-slate-400 outline-none"
          />
          <p className="mt-3 text-right text-[12px] text-slate-400">
            {`${draftLength}${LOVE_SPACE_TEXT.momentsCharacterCountSuffix}`}
          </p>
        </section>

        <section className="mt-4 rounded-[20px] border border-rose-100/75 bg-white px-4 py-3.5 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.25)]">
          {draftImage ? (
            <div className="relative">
              <img
                src={draftImage}
                alt={LOVE_SPACE_TEXT.momentsAddPhoto}
                className="w-full max-h-[300px] rounded-2xl object-cover"
              />
              <button
                type="button"
                onClick={() => setDraftImage(null)}
                className="absolute top-2 right-2 h-8 rounded-full bg-black/70 text-white text-[12px] px-3 flex items-center justify-center"
              >
                {LOVE_SPACE_TEXT.momentsRemovePhoto}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUploadPhoto}
              className="w-full h-24 rounded-2xl border border-dashed border-rose-200 bg-[#fff9fc] text-slate-500 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            >
              <ImagePlus size={20} />
              {LOVE_SPACE_TEXT.momentsAddPhoto}
            </button>
          )}
        </section>
      </main>
    </motion.div>
  );

  const renderDetailView = (moment: LoveMomentRecord) => {
    const momentComments = moment.comments ?? [];
    const commentDraft = commentDraftByMoment[moment.id] ?? '';
    const canSendComment = commentDraft.trim().length > 0;

    return (
      <motion.div
        key={`detail-${moment.id}`}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        className="h-full flex flex-col"
      >
        <header className="bg-gradient-to-r from-[#fde7ef] to-[#fbe2eb] px-4 pt-11 pb-3 border-b border-rose-100 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedMomentId(null)}
            className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label={LOVE_SPACE_TEXT.back}
          >
            <ChevronLeft size={26} />
          </button>
          <h2 className="text-[20px] font-semibold tracking-wide">{LOVE_SPACE_TEXT.momentsDetailTitle}</h2>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-4">
          <section className="rounded-[20px] border border-rose-100/80 bg-white p-3.5 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.3)]">
            {moment.imageDataUrl ? (
              <img
                src={moment.imageDataUrl}
                alt={LOVE_SPACE_TEXT.momentsAddPhoto}
                className="w-full max-h-[320px] rounded-2xl object-cover"
              />
            ) : null}
            {moment.content ? (
              <p
                className={`text-[15px] leading-7 text-slate-800 whitespace-pre-wrap break-words ${
                  moment.imageDataUrl ? 'mt-3' : ''
                }`}
              >
                {moment.content}
              </p>
            ) : null}
            <p className="mt-3 text-[12px] text-slate-500">
              {`${LOVE_SPACE_TEXT.momentsRecordTimePrefix} ${formatMomentTime(moment.happenedAt)} · ${formatMomentDateWithWeekday(moment.happenedAt)}`}
            </p>

            <div className="mt-3 border-t border-rose-100/80 pt-3 flex items-center gap-2">
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => openEdit(moment)}
                    className="h-8 rounded-full border border-rose-100 px-3 text-[12px] text-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <PencilLine size={14} />
                    {LOVE_SPACE_TEXT.momentsEditAction}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteMoment(moment)}
                    className="h-8 rounded-full border border-slate-200 px-3 text-[12px] text-slate-700 inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Trash2 size={14} />
                    {LOVE_SPACE_TEXT.momentsDeleteAction}
                  </button>
                </>
              ) : null}
              <span className="ml-auto text-[12px] text-slate-500">{`${LOVE_SPACE_TEXT.momentsCommentAction} ${momentComments.length}`}</span>
            </div>
          </section>

          <section className="mt-4 rounded-[20px] border border-rose-100/80 bg-white px-3.5 py-3.5 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.3)]">
            {momentComments.length > 0 ? (
              <div className="space-y-2.5">
                {momentComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-rose-100/80 bg-[#fffafc] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[13px] text-slate-800 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(moment.id, comment.id)}
                          className="shrink-0 text-[11px] text-slate-500 active:scale-95 transition-transform"
                        >
                          {LOVE_SPACE_TEXT.momentsDeleteAction}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{formatCommentTime(comment.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">{LOVE_SPACE_TEXT.momentsNoComment}</p>
            )}

            {!readOnly ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={commentDraft}
                  onChange={(event) => handleCommentChange(moment.id, event.target.value)}
                  placeholder={LOVE_SPACE_TEXT.momentsCommentPlaceholder}
                  className="flex-1 h-9 rounded-full border border-rose-100 bg-[#fff9fc] px-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none"
                />
                <button
                  type="button"
                  disabled={!canSendComment}
                  onClick={() => handleSendComment(moment.id)}
                  className={`h-9 rounded-full px-3 text-[13px] font-medium inline-flex items-center gap-1.5 ${
                    canSendComment
                      ? 'bg-white border border-rose-100 text-slate-700 shadow-[0_10px_20px_-18px_rgba(241,180,200,0.8)] active:scale-95 transition-transform'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Send size={14} />
                  {LOVE_SPACE_TEXT.momentsCommentSend}
                </button>
              </div>
            ) : null}
          </section>
        </main>
      </motion.div>
    );
  };

  const renderListView = () => (
    <motion.div
      key="list"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="h-full flex flex-col"
    >
      <header className="bg-gradient-to-r from-[#fde7ef] to-[#fbe2eb] px-4 pt-11 pb-3 border-b border-rose-100 flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
          aria-label={LOVE_SPACE_TEXT.back}
        >
          <ChevronLeft size={26} />
        </button>
        <h2 className="text-[20px] font-semibold tracking-wide">{LOVE_SPACE_TEXT.momentsPageTitle}</h2>
      </header>

      <main className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-9">
        <section className="relative rounded-[24px] border border-white/90 bg-gradient-to-b from-[#f9dce6] to-[#faedf2] px-5 pb-5 pt-11 text-slate-800 shadow-[0_24px_40px_-34px_rgba(180,130,150,0.55)]">
          <div className="absolute left-1/2 -top-9 -translate-x-1/2 flex -space-x-2">
            <div className="w-16 h-16 rounded-full border-[3px] border-white bg-[#f6d7e3] text-[#cf315f] text-[22px] font-bold flex items-center justify-center shadow-[0_12px_22px_-16px_rgba(15,23,42,0.55)]">
              {LOVE_SPACE_TEXT.me}
            </div>
            <ContactAvatar contact={card.contact} sizeClassName="w-16 h-16" />
          </div>

          <p className="text-center text-[17px]">
            {LOVE_SPACE_TEXT.momentsSinceLabel}
            <span className="mx-1 text-[34px] font-bold leading-none align-middle">{card.days}</span>
            {LOVE_SPACE_TEXT.dayUnit}
          </p>
          <p className="mt-2 text-center text-[14px] text-slate-600">{formatDateWithWeekday(card.bond.sinceDate)}</p>
        </section>

        {sortedMoments.length === 0 ? (
          <section className="mt-4 rounded-[20px] border border-rose-100/80 bg-white px-5 py-10 text-center shadow-[0_18px_32px_-28px_rgba(15,23,42,0.26)]">
            <Heart size={26} className="mx-auto text-rose-300" />
            <p className="mt-3 text-[17px] font-semibold text-slate-800">{LOVE_SPACE_TEXT.momentsEmptyTitle}</p>
            <p className="mt-1 text-[13px] text-slate-500">{LOVE_SPACE_TEXT.momentsEmptyDescription}</p>
          </section>
        ) : (
          <section className="mt-4 space-y-4">
            {sortedMoments.map((moment) => {
              const dateBadge = getDateBadge(moment.happenedAt);
              const commentCount = moment.comments?.length ?? 0;

              return (
                <button
                  key={moment.id}
                  type="button"
                  onClick={() => setSelectedMomentId(moment.id)}
                  className="w-full text-left grid grid-cols-[62px_1fr] gap-3 active:scale-[0.995] transition-transform"
                >
                  <div className="rounded-2xl border border-rose-100/80 bg-white px-2 py-2 text-center h-fit shadow-[0_12px_24px_-22px_rgba(15,23,42,0.3)]">
                    <p className="text-[24px] font-bold leading-none text-slate-800">{dateBadge.day}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{dateBadge.yearMonth}</p>
                  </div>

                  <div className="rounded-[20px] border border-rose-100/80 bg-white p-3.5 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.3)] overflow-hidden">
                    <div className="min-w-0 flex items-start gap-3">
                      {moment.imageDataUrl ? (
                        <img
                          src={moment.imageDataUrl}
                          alt={LOVE_SPACE_TEXT.momentsAddPhoto}
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-6 text-slate-800 truncate">
                          {moment.content || LOVE_SPACE_TEXT.momentsAddPhoto}
                        </p>
                        <p className="mt-2 text-[12px] text-slate-500 truncate">
                          {`${LOVE_SPACE_TEXT.momentsRecordTimePrefix} ${formatMomentTime(moment.happenedAt)} · ${LOVE_SPACE_TEXT.momentsCommentAction} ${commentCount}`}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 mt-0.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>

      {!readOnly ? (
        <button
          type="button"
          onClick={openCreate}
          className="absolute right-5 bottom-8 w-[60px] h-[60px] rounded-full bg-white border border-rose-100 text-slate-700 shadow-[0_18px_30px_-20px_rgba(241,180,200,0.7)] grid place-items-center active:scale-95 transition-transform"
          aria-label={LOVE_SPACE_TEXT.momentsFloatingAdd}
        >
          <Plus size={30} />
        </button>
      ) : null}
    </motion.div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute inset-0 z-50 bg-[#f5f6f8] text-slate-900 flex flex-col overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {isPublishing
          ? renderPublishView()
          : selectedMoment
            ? renderDetailView(selectedMoment)
            : renderListView()}
      </AnimatePresence>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      <AnimatePresence>
        {!readOnly && pendingDeleteMoment ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] bg-slate-900/22 flex items-end px-4 pb-8"
            onClick={() => setPendingDeleteMoment(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full rounded-[26px] border border-slate-200/90 bg-white/95 px-4 py-4 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[15px] font-semibold text-slate-900">{LOVE_SPACE_TEXT.momentsDeleteConfirmTitle}</p>
              <p className="mt-1 text-[12px] text-slate-500">{LOVE_SPACE_TEXT.momentsDeleteConfirmHint}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingDeleteMoment(null)}
                  className="h-10 rounded-xl bg-white text-slate-600 border border-slate-200 text-[14px] font-semibold active:scale-[0.99] transition-transform"
                >
                  {LOVE_SPACE_TEXT.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMoment}
                  className="h-10 rounded-xl bg-slate-900 text-white border border-slate-900 text-[14px] font-semibold shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] active:scale-[0.99] transition-transform"
                >
                  {LOVE_SPACE_TEXT.momentsConfirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
};
