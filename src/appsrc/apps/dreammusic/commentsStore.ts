import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createDreamMusicCommentsPersistOptions } from './data/repositories/commentsStorePersistRepo';
import type { DreamComment } from './types';

interface DreamMusicCommentsState {
  comments: DreamComment[];
}

interface DreamMusicCommentsStore extends DreamMusicCommentsState {
  addComment: (input: Omit<DreamComment, 'id' | 'createdAt'>) => DreamComment | null;
  updateComment: (
    commentId: string,
    content: string,
    actorRoleId: string
  ) => DreamComment | null;
  removeComment: (commentId: string, actorRoleId: string) => DreamComment | null;
  clearComments: (actorRoleId: string) => DreamComment[];
}

const DEFAULT_STATE: DreamMusicCommentsState = {
  comments: [],
};

const createCommentId = (timestamp: number): string =>
  `comment-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;

export const useDreamMusicCommentsStore = create<DreamMusicCommentsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      addComment: (input) => {
        let createdComment: DreamComment | null = null;

        set((state) => {
          const content = input.content.trim();
          const authorName = input.authorName.trim() || '默认身份';
          const authorRoleId = input.authorRoleId.trim() || 'owner';
          if (!content) return state;

          const now = Date.now();
          const comment: DreamComment = {
            ...input,
            authorRoleId,
            authorName,
            content,
            id: createCommentId(now),
            createdAt: now,
          };
          createdComment = comment;

          return {
            comments: [comment, ...state.comments].slice(0, 500),
          };
        });

        return createdComment;
      },

      updateComment: (commentId, content, actorRoleId) => {
        let updatedComment: DreamComment | null = null;

        set((state) => {
          const normalizedId = commentId.trim();
          const nextContent = content.trim();
          const normalizedActorRoleId = actorRoleId.trim();
          if (!normalizedId || !nextContent || !normalizedActorRoleId) return state;

          const targetIndex = state.comments.findIndex((item) => item.id === normalizedId);
          if (targetIndex < 0) return state;

          const target = state.comments[targetIndex];
          if (target.authorRoleId !== normalizedActorRoleId) return state;
          if (target.content === nextContent) return state;

          const nextComment: DreamComment = {
            ...target,
            content: nextContent,
            updatedAt: Date.now(),
          };
          updatedComment = nextComment;

          const nextComments = [...state.comments];
          nextComments[targetIndex] = nextComment;
          return { comments: nextComments };
        });

        return updatedComment;
      },

      removeComment: (commentId, actorRoleId) => {
        let removedComment: DreamComment | null = null;

        set((state) => {
          const normalizedId = commentId.trim();
          const normalizedActorRoleId = actorRoleId.trim();
          if (!normalizedId || !normalizedActorRoleId) return state;

          const target = state.comments.find((item) => item.id === normalizedId);
          if (!target) return state;
          if (target.authorRoleId !== normalizedActorRoleId) return state;

          removedComment = target;
          return {
            comments: state.comments.filter((item) => item.id !== normalizedId),
          };
        });

        return removedComment;
      },

      clearComments: (actorRoleId) => {
        let removedComments: DreamComment[] = [];

        set((state) => {
          const normalizedActorRoleId = actorRoleId.trim();
          if (!normalizedActorRoleId) return state;

          removedComments = state.comments.filter(
            (item) => item.authorRoleId === normalizedActorRoleId
          );
          if (removedComments.length === 0) return state;

          return {
            comments: state.comments.filter(
              (item) => item.authorRoleId !== normalizedActorRoleId
            ),
          };
        });

        return removedComments;
      },
    }),
    createDreamMusicCommentsPersistOptions<DreamMusicCommentsStore, DreamMusicCommentsState>({
      partialize: (state) => ({
        comments: state.comments,
      }),
    })
  )
);
