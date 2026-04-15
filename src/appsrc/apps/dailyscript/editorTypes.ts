import type { DailyScriptActionType } from '../../shared/business/dailyscript/actionBridge';

export interface RoleOption {
  id: string;
  label: string;
}

export interface LoveRelationOption {
  id: string;
  label: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

export interface LoveCheckInTaskOption {
  id: string;
  title: string;
  owner: 'mine' | 'partner';
  templateId: string;
  relationId: string;
  relationLabel: string;
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
}

export interface DreamMusicTrackOption {
  id: string;
  label: string;
  title: string;
  artist: string;
}

export interface StepEditorState {
  planId: string;
  stepId?: string;
  name: string;
  time: string;
  actionType: DailyScriptActionType;
  enabled: boolean;
  diaryTitle: string;
  diaryContent: string;
  diaryMood: string;
  diaryTagsInput: string;
  diarySyncToMemory: boolean;
  wechatContent: string;
  wechatTargetUserRoleId: string;
  loveRelationId: string;
  loveRelationLabel: string;
  loveOwnerRoleId: string;
  loveBondId: string;
  loveMomentContent: string;
  loveMomentImageDataUrl: string;
  loveCheckInOwner: 'mine' | 'partner';
  loveCompleteTaskId: string;
  loveCompleteTemplateId: string;
  loveCompleteTitle: string;
  dreamMusicTargetTrackId: string;
  dreamMusicTargetTrackTitle: string;
}
