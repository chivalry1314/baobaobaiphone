export type DailyScriptActionType =
  | 'dailywords.writeDiary'
  | 'wechat.sendMessageToUser'
  | 'lovespace.addMoment'
  | 'lovespace.completeCheckInTask'
  | 'dreammusic.commentTrack';

export interface DailyScriptExecutionContext {
  roleId: string;
  actionType: DailyScriptActionType;
  payload: unknown;
  now: number;
}

export interface DailyScriptExecutionResult {
  ok: boolean;
  message?: string;
}

type DailyScriptActionExecutor = (
  context: DailyScriptExecutionContext
) => Promise<DailyScriptExecutionResult | void> | DailyScriptExecutionResult | void;

const actionExecutors = new Map<DailyScriptActionType, DailyScriptActionExecutor>();

export const registerDailyScriptActionExecutor = (
  actionType: DailyScriptActionType,
  executor: DailyScriptActionExecutor
): void => {
  actionExecutors.set(actionType, executor);
};

export const getRegisteredDailyScriptActionTypes = (): DailyScriptActionType[] => {
  return [...actionExecutors.keys()];
};

export const executeDailyScriptAction = async (
  context: DailyScriptExecutionContext
): Promise<DailyScriptExecutionResult> => {
  const executor = actionExecutors.get(context.actionType);
  if (!executor) {
    throw new Error(`未注册的每日剧本动作执行器：${context.actionType}`);
  }

  const result = await executor(context);
  if (!result) return { ok: true };
  return result;
};
