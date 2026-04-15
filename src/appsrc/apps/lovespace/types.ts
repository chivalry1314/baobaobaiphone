import type { AppContext } from '../../../core/sdk/types';
import type { Contact } from '../contacts/types';
import type { LoveImportantTimelineEvent } from './importantTimeline';

export interface LoveBond {
  id: string;
  contactId: string;
  sinceDate: string;
  createdAt: number;
}

export type LoveCalendarType = 'solar' | 'lunar';
export type LoveRepeatType = 'none' | 'yearly' | 'monthly';

export interface LoveAnniversary {
  id: string;
  bondId: string;
  title: string;
  date: string;
  includeStartDay: boolean;
  calendarType: LoveCalendarType;
  reminderText: string;
  repeatType: LoveRepeatType;
  backgroundKey: string;
  presetKey?: string;
  createdAt: number;
}

export interface LoveMomentRecord {
  id: string;
  bondId: string;
  content: string;
  imageDataUrl?: string;
  comments: LoveMomentComment[];
  happenedAt: number;
  createdAt: number;
}

export interface LoveMomentComment {
  id: string;
  content: string;
  createdAt: number;
}

export type LoveCheckInOwner = 'mine' | 'partner';
export type LoveCheckInRecordAction = 'add' | 'complete';

export interface LoveCheckInTask {
  id: string;
  bondId: string;
  owner: LoveCheckInOwner;
  templateId: string;
  categoryId: string;
  iconKey: string;
  title: string;
  score: number;
  allowPartnerReminder: boolean;
  completedDateKeys: string[];
  createdAt: number;
}

export interface LoveCheckInRecord {
  id: string;
  bondId: string;
  taskId: string;
  taskTitle: string;
  taskIconKey: string;
  owner: LoveCheckInOwner;
  action: LoveCheckInRecordAction;
  dateKey: string;
  createdAt: number;
}

export interface AddLoveCheckInTasksPayload {
  bondId: string;
  owner: LoveCheckInOwner;
  tasks: Array<{
    templateId: string;
    categoryId: string;
    iconKey: string;
    title: string;
    score: number;
    allowPartnerReminder?: boolean;
  }>;
}

export interface CompleteLoveCheckInTaskPayload {
  taskId: string;
}

export interface RemoveLoveCheckInTaskPayload {
  taskId: string;
}

export interface SaveLoveAnniversaryPayload {
  bondId: string;
  title: string;
  date: string;
  includeStartDay: boolean;
  calendarType: LoveCalendarType;
  reminderText: string;
  repeatType: LoveRepeatType;
  backgroundKey: string;
  presetKey?: string;
}

export interface SaveLoveMomentPayload {
  bondId: string;
  content: string;
  imageDataUrl?: string;
}

export interface UpdateLoveMomentPayload {
  momentId: string;
  content: string;
  imageDataUrl?: string;
}

export interface AddLoveMomentCommentPayload {
  momentId: string;
  content: string;
}

export interface RemoveLoveMomentCommentPayload {
  momentId: string;
  commentId: string;
}

export interface LoveSpaceState {
  bonds: LoveBond[];
  anniversaries: LoveAnniversary[];
  moments: LoveMomentRecord[];
  checkInTasks: LoveCheckInTask[];
  checkInRecords: LoveCheckInRecord[];
  bondBackgrounds: Record<string, string>;
  importantTimelineByBond: Record<string, LoveImportantTimelineEvent[]>;
  timelineProcessedRecordIdsByBond: Record<string, string[]>;
}

export type LoveSpaceRoleScopedState = LoveSpaceState;

export interface LoveSpaceStore extends LoveSpaceState {
  activeRoleId: string;
  loveSpaceStateByRoleId: Record<string, LoveSpaceRoleScopedState>;
  syncLoveSpaceRoleContext: () => void;
  addOrUpdateBonds: (contactIds: string[], sinceDate: string) => void;
  saveAnniversary: (payload: SaveLoveAnniversaryPayload) => void;
  addMomentRecord: (payload: SaveLoveMomentPayload) => void;
  updateMomentRecord: (payload: UpdateLoveMomentPayload) => void;
  removeMomentRecord: (momentId: string) => void;
  addMomentComment: (payload: AddLoveMomentCommentPayload) => void;
  removeMomentComment: (payload: RemoveLoveMomentCommentPayload) => void;
  addCheckInTasks: (payload: AddLoveCheckInTasksPayload) => void;
  completeCheckInTask: (payload: CompleteLoveCheckInTaskPayload) => void;
  removeCheckInTask: (payload: RemoveLoveCheckInTaskPayload) => void;
  setBondBackground: (bondId: string, imageDataUrl: string) => void;
  removeBond: (bondId: string) => void;
  syncImportantTimelinesByModel: () => Promise<void>;
}

export interface BondCardData {
  bond: LoveBond;
  contact: Contact;
  days: number;
  heartbeat: number;
}

export interface LoveSpaceAppProps {
  onClose: () => void;
  context?: AppContext;
}
