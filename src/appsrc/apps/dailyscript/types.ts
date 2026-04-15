import type { AppContext } from '../../../core/sdk/types';
import type { DailyScriptActionType } from '../../shared/business/dailyscript/actionBridge';

export type DailyScriptLogStatus = 'success' | 'failed' | 'skipped';

export interface DailyScriptDiaryActionPayload {
  title: string;
  content: string;
  mood: string;
  tags: string[];
  syncToMemory: boolean;
}

export interface DailyScriptWeChatActionPayload {
  content: string;
  targetUserRoleId: string;
}

export type DailyScriptLoveCheckInOwner = 'mine' | 'partner';

export interface DailyScriptLoveSpaceRelationPayload {
  targetRelationId: string;
  targetRelationLabel: string;
  targetOwnerRoleId: string;
  targetBondId: string;
}

export interface DailyScriptLoveSpaceAddMomentPayload
  extends DailyScriptLoveSpaceRelationPayload {
  content: string;
  imageDataUrl?: string;
}

export interface DailyScriptLoveSpaceCompleteCheckInTaskPayload
  extends DailyScriptLoveSpaceRelationPayload {
  owner: DailyScriptLoveCheckInOwner;
  taskId: string;
  templateId: string;
  title: string;
}

export interface DailyScriptDreamMusicCommentTrackPayload {
  targetTrackId: string;
  targetTrackTitle: string;
}

export type DailyScriptActionPayload =
  | DailyScriptDiaryActionPayload
  | DailyScriptWeChatActionPayload
  | DailyScriptLoveSpaceAddMomentPayload
  | DailyScriptLoveSpaceCompleteCheckInTaskPayload
  | DailyScriptDreamMusicCommentTrackPayload;

export interface DailyScriptStep {
  id: string;
  name: string;
  time: string;
  actionType: DailyScriptActionType;
  payload: DailyScriptActionPayload;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DailyScriptPlan {
  id: string;
  name: string;
  executorRoleId: string;
  dateKey: string;
  enabled: boolean;
  steps: DailyScriptStep[];
  createdAt: number;
  updatedAt: number;
}

export interface DailyScriptExecutionLog {
  id: string;
  planId: string;
  planName: string;
  stepId: string;
  stepName: string;
  roleId: string;
  actionType: DailyScriptActionType;
  dayKey: string;
  scheduledTime: string;
  status: DailyScriptLogStatus;
  message: string;
  executedAt: number;
}

export interface DailyScriptStore {
  plans: DailyScriptPlan[];
  logs: DailyScriptExecutionLog[];
  addPlan: (name?: string, executorRoleId?: string, dateKey?: string) => string;
  renamePlan: (planId: string, name: string) => void;
  removePlan: (planId: string) => void;
  setPlanEnabled: (planId: string, enabled: boolean) => void;
  setPlanExecutorRole: (planId: string, executorRoleId: string) => void;
  upsertStep: (
    planId: string,
    input: {
      stepId?: string;
      name: string;
      time: string;
      actionType: DailyScriptActionType;
      payload: DailyScriptActionPayload;
      enabled: boolean;
    }
  ) => void;
  removeStep: (planId: string, stepId: string) => void;
  setStepEnabled: (planId: string, stepId: string, enabled: boolean) => void;
  clearLogs: () => void;
  runDueStepsNow: (now?: number) => Promise<{
    executed: number;
    failed: number;
    skipped: number;
  }>;
}

export interface DailyScriptAppProps {
  onClose: () => void;
  context?: AppContext;
}
