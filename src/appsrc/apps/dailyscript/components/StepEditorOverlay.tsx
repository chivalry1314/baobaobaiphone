import React from 'react';
import { X } from 'lucide-react';
import {
  scrollFieldIntoViewInContainer,
  useKeyboardTextEntryActive,
  useKeyboardViewportStabilizer,
  useKeyboardViewportInset,
  useMobileViewportPageStyle,
} from '../../../../core/mobileViewport';
import type { DailyScriptActionType } from '../../../shared/business/dailyscript/actionBridge';
import { DEFAULT_ACTIVE_ROLE_ID } from '../../../shared/business/roleIdentity';
import type {
  LoveCheckInTaskOption,
  LoveRelationOption,
  RoleOption,
  StepEditorState,
} from '../editorTypes';

interface StepEditorOverlayProps {
  state: StepEditorState;
  targetRoleOptions: RoleOption[];
  loveRelationOptions: LoveRelationOption[];
  loveCheckInTaskOptions: LoveCheckInTaskOption[];
  errorMessage: string;
  onClose: () => void;
  onSave: () => void;
  onPatch: (patch: Partial<StepEditorState>) => void;
}

type ActionAppType = 'dailywords' | 'wechat' | 'lovespace' | 'dreammusic';

const FIELD_FOCUS_TOP_PADDING = 56;

const ACTION_APP_LABELS: Record<ActionAppType, string> = {
  dailywords: '每日语',
  wechat: '微信',
  lovespace: '情侣空间',
  dreammusic: '梦音乐',
};

const ACTION_OPTIONS_BY_APP: Record<
  ActionAppType,
  Array<{
    value: DailyScriptActionType;
    label: string;
  }>
> = {
  dailywords: [
    {
      value: 'dailywords.writeDiary',
      label: '写每日语',
    },
  ],
  wechat: [
    {
      value: 'wechat.sendMessageToUser',
      label: '给用户发微信',
    },
  ],
  lovespace: [
    {
      value: 'lovespace.addMoment',
      label: '发布瞬间',
    },
    {
      value: 'lovespace.completeCheckInTask',
      label: '完成打卡任务',
    },
  ],
  dreammusic: [
    {
      value: 'dreammusic.commentTrack',
      label: '评论歌曲（自动选歌）',
    },
  ],
};

const DEFAULT_ACTION_BY_APP: Record<ActionAppType, DailyScriptActionType> = {
  dailywords: 'dailywords.writeDiary',
  wechat: 'wechat.sendMessageToUser',
  lovespace: 'lovespace.addMoment',
  dreammusic: 'dreammusic.commentTrack',
};

const getActionAppType = (actionType: DailyScriptActionType): ActionAppType => {
  if (actionType === 'dailywords.writeDiary') return 'dailywords';
  if (actionType === 'wechat.sendMessageToUser') return 'wechat';
  if (actionType === 'dreammusic.commentTrack') return 'dreammusic';
  return 'lovespace';
};

const buildUnknownRoleOption = (roleId: string): RoleOption => ({
  id: roleId || DEFAULT_ACTIVE_ROLE_ID,
  label: roleId ? `未知角色（${roleId}）` : '默认身份',
});

const buildUnknownRelationOption = (state: StepEditorState): LoveRelationOption => ({
  id: state.loveRelationId,
  label: state.loveRelationLabel || `未知关系（${state.loveRelationId || '-'}）`,
  ownerRoleId: state.loveOwnerRoleId || DEFAULT_ACTIVE_ROLE_ID,
  bondId: state.loveBondId,
  contactRoleId: '',
});

const buildUnknownTaskOption = (state: StepEditorState): LoveCheckInTaskOption => ({
  id: state.loveCompleteTaskId,
  title: state.loveCompleteTitle || `未知任务（${state.loveCompleteTaskId || '-'}）`,
  owner: state.loveCheckInOwner === 'partner' ? 'partner' : 'mine',
  templateId: state.loveCompleteTemplateId,
  relationId: state.loveRelationId,
  relationLabel: state.loveRelationLabel,
  ownerRoleId: state.loveOwnerRoleId || DEFAULT_ACTIVE_ROLE_ID,
  bondId: state.loveBondId,
  contactRoleId: '',
});

export const StepEditorOverlay: React.FC<StepEditorOverlayProps> = ({
  state,
  targetRoleOptions,
  loveRelationOptions,
  loveCheckInTaskOptions,
  errorMessage,
  onClose,
  onSave,
  onPatch,
}) => {
  const shouldHideFooter = useKeyboardTextEntryActive();
  const pageStyle = useMobileViewportPageStyle(false);
  const contentScrollRef = React.useRef<HTMLElement | null>(null);
  const keyboardInset = useKeyboardViewportInset(true);
  useKeyboardViewportStabilizer(true, contentScrollRef, {
    topPadding: FIELD_FOCUS_TOP_PADDING,
    bottomPadding: 28,
  });
  const handleFieldFocusCapture = React.useCallback((event: React.FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer) return;
    const alignField = () =>
      scrollFieldIntoViewInContainer(scrollContainer, target, {
        preferTopAlign: true,
        topPadding: FIELD_FOCUS_TOP_PADDING,
        bottomPadding: 28,
      });
    alignField();
    window.requestAnimationFrame(alignField);
    window.setTimeout(alignField, 80);
    window.setTimeout(alignField, 180);
    window.setTimeout(alignField, 320);
    window.setTimeout(alignField, 460);
  }, []);
  const currentActionAppType = getActionAppType(state.actionType);
  const filteredActionOptions = ACTION_OPTIONS_BY_APP[currentActionAppType];

  const hasCurrentTargetRole = targetRoleOptions.some(
    (option) => option.id === state.wechatTargetUserRoleId
  );
  const resolvedTargetRoleOptions = hasCurrentTargetRole
    ? targetRoleOptions
    : [buildUnknownRoleOption(state.wechatTargetUserRoleId), ...targetRoleOptions];

  const hasCurrentLoveOwnerRole = targetRoleOptions.some(
    (option) => option.id === state.loveOwnerRoleId
  );
  const resolvedLoveOwnerRoleOptions = hasCurrentLoveOwnerRole
    ? targetRoleOptions
    : state.loveOwnerRoleId
    ? [buildUnknownRoleOption(state.loveOwnerRoleId), ...targetRoleOptions]
    : targetRoleOptions;

  const filterLoveRelationsByOwnerRole = (ownerRoleId: string): LoveRelationOption[] => {
    const normalizedOwnerRoleId = ownerRoleId.trim();
    if (!normalizedOwnerRoleId) return loveRelationOptions;
    return loveRelationOptions.filter((option) => option.ownerRoleId === normalizedOwnerRoleId);
  };

  const getCheckInTasksBySelection = (relationId: string): LoveCheckInTaskOption[] => {
    const normalizedRelationId = relationId.trim();
    if (!normalizedRelationId) return [];
    const relationTasks = loveCheckInTaskOptions.filter(
      (option) => option.relationId === normalizedRelationId
    );
    const partnerTasks = relationTasks.filter((option) => option.owner === 'partner');
    return partnerTasks.length > 0 ? partnerTasks : relationTasks;
  };

  const relationOptionsForCurrentAction =
    state.actionType === 'lovespace.completeCheckInTask'
      ? filterLoveRelationsByOwnerRole(state.loveOwnerRoleId)
      : loveRelationOptions;

  const hasCurrentLoveRelation = relationOptionsForCurrentAction.some(
    (option) => option.id === state.loveRelationId
  );
  const resolvedLoveRelationOptions =
    hasCurrentLoveRelation || !state.loveRelationId
      ? relationOptionsForCurrentAction
      : [buildUnknownRelationOption(state), ...relationOptionsForCurrentAction];

  const checkInTaskOptionsForCurrentSelection = getCheckInTasksBySelection(state.loveRelationId);
  const hasCurrentCheckInTask = checkInTaskOptionsForCurrentSelection.some(
    (option) => option.id === state.loveCompleteTaskId
  );
  const resolvedCheckInTaskOptions =
    hasCurrentCheckInTask || !state.loveCompleteTaskId
      ? checkInTaskOptionsForCurrentSelection
      : [buildUnknownTaskOption(state), ...checkInTaskOptionsForCurrentSelection];

  const patchLoveOwnerRole = (ownerRoleId: string) => {
    const relationOptions = filterLoveRelationsByOwnerRole(ownerRoleId);
    const currentRelation = relationOptions.find((item) => item.id === state.loveRelationId);
    const nextRelation = currentRelation || relationOptions[0];

    const taskOptions = nextRelation ? getCheckInTasksBySelection(nextRelation.id) : [];
    const currentTask = taskOptions.find((item) => item.id === state.loveCompleteTaskId);
    const nextTask = currentTask || taskOptions[0];

    onPatch({
      loveOwnerRoleId: ownerRoleId,
      loveRelationId: nextRelation?.id || '',
      loveRelationLabel: nextRelation?.label || '',
      loveBondId: nextRelation?.bondId || '',
      loveCheckInOwner: nextTask?.owner || 'partner',
      loveCompleteTaskId: nextTask?.id || '',
      loveCompleteTemplateId: nextTask?.templateId || '',
      loveCompleteTitle: nextTask?.title || '',
    });
  };

  const patchLoveRelation = (relationId: string) => {
    const matchedRelation =
      relationOptionsForCurrentAction.find((item) => item.id === relationId) ||
      resolvedLoveRelationOptions.find((item) => item.id === relationId);

    const taskOptions = getCheckInTasksBySelection(relationId);
    const currentTask = taskOptions.find((item) => item.id === state.loveCompleteTaskId);
    const nextTask = currentTask || taskOptions[0];

    onPatch({
      loveRelationId: relationId,
      loveRelationLabel: matchedRelation?.label || '',
      loveOwnerRoleId: matchedRelation?.ownerRoleId || state.loveOwnerRoleId,
      loveBondId: matchedRelation?.bondId || '',
      loveCheckInOwner: nextTask?.owner || 'partner',
      loveCompleteTaskId: nextTask?.id || '',
      loveCompleteTemplateId: nextTask?.templateId || '',
      loveCompleteTitle: nextTask?.title || '',
    });
  };

  const patchLoveCheckInTask = (taskId: string) => {
    const matchedTask =
      checkInTaskOptionsForCurrentSelection.find((item) => item.id === taskId) ||
      resolvedCheckInTaskOptions.find((item) => item.id === taskId);

    onPatch({
      loveCheckInOwner: matchedTask?.owner || 'partner',
      loveCompleteTaskId: taskId,
      loveCompleteTemplateId: matchedTask?.templateId || '',
      loveCompleteTitle: matchedTask?.title || '',
    });
  };

  const renderLoveRelationSelect = () => (
    <label className="text-[12px] text-slate-500 block">
      关系
      <select
        value={state.loveRelationId}
        onChange={(event) => patchLoveRelation(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-rose-100 bg-rose-50/35 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
      >
        <option value="" disabled>
          请选择关系
        </option>
        {resolvedLoveRelationOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className="absolute left-0 right-0 z-[120] flex min-h-0 flex-col overflow-hidden bg-white/90 backdrop-blur-sm"
      style={pageStyle}
    >
      <header className="shrink-0 pt-11 px-3 pb-3 border-b border-indigo-100 bg-white/85">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label="关闭编辑"
          >
            <X size={22} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h2 className="text-[19px] font-semibold tracking-wide">
              {state.stepId ? '编辑步骤' : '新增步骤'}
            </h2>
          </div>
        </div>
      </header>

      <main
        ref={contentScrollRef}
        onFocusCapture={handleFieldFocusCapture}
        className="flex-1 min-h-0 overflow-y-auto touch-pan-y px-4 py-4 pb-40 space-y-3"
        style={{
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${160 + keyboardInset}px)`,
          scrollPaddingTop: FIELD_FOCUS_TOP_PADDING,
        }}
      >
        <section className="rounded-3xl border border-indigo-100 bg-white p-4 space-y-3">
          <input
            type="text"
            value={state.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            placeholder="步骤名称（可选）"
            className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 text-[14px] outline-none focus:border-indigo-300"
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-slate-500">
              执行时间
              <input
                type="time"
                value={state.time}
                onChange={(event) => onPatch({ time: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-300"
              />
            </label>
            <label className="text-[12px] text-slate-500">
              App 分类
              <select
                value={currentActionAppType}
                onChange={(event) => {
                  const nextAppType = event.target.value as ActionAppType;
                  onPatch({
                    actionType: DEFAULT_ACTION_BY_APP[nextAppType],
                  });
                }}
                className="mt-1 w-full rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-300"
              >
                {Object.entries(ACTION_APP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-[12px] text-slate-500 block">
            动作
            <select
              value={state.actionType}
              onChange={(event) =>
                onPatch({ actionType: event.target.value as DailyScriptActionType })
              }
              className="mt-1 w-full rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2.5 text-[13px] outline-none focus:border-indigo-300"
            >
              {filteredActionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(event) => onPatch({ enabled: event.target.checked })}
              className="h-4 w-4 accent-indigo-500"
            />
            启用这个步骤
          </label>
        </section>

        {state.actionType === 'dailywords.writeDiary' ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-rose-600">每日语内容</h3>
            <input
              type="text"
              value={state.diaryTitle}
              onChange={(event) => onPatch({ diaryTitle: event.target.value })}
              placeholder="标题（可选）"
              className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
            />
            <textarea
              value={state.diaryContent}
              onChange={(event) => onPatch({ diaryContent: event.target.value })}
              placeholder="输入每日语内容"
              className="w-full min-h-[140px] rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-rose-300 resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={state.diaryMood}
                onChange={(event) => onPatch({ diaryMood: event.target.value })}
                placeholder="心情"
                className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
              />
              <input
                type="text"
                value={state.diaryTagsInput}
                onChange={(event) => onPatch({ diaryTagsInput: event.target.value })}
                placeholder="标签（逗号分隔）"
                className="w-full rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
              <input
                type="checkbox"
                checked={state.diarySyncToMemory}
                onChange={(event) => onPatch({ diarySyncToMemory: event.target.checked })}
                className="h-4 w-4 accent-rose-500"
              />
              同步到记忆中心
            </label>
          </section>
        ) : null}

        {state.actionType === 'wechat.sendMessageToUser' ? (
          <section className="rounded-3xl border border-emerald-100 bg-white p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-emerald-600">微信消息</h3>
            <textarea
              value={state.wechatContent}
              onChange={(event) => onPatch({ wechatContent: event.target.value })}
              placeholder="输入要发送的消息"
              className="w-full min-h-[130px] rounded-2xl border border-emerald-100 bg-emerald-50/30 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-emerald-300 resize-none"
            />
            <label className="text-[12px] text-slate-500 block">
              目标用户角色
              <select
                value={state.wechatTargetUserRoleId}
                onChange={(event) => onPatch({ wechatTargetUserRoleId: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-emerald-100 bg-emerald-50/30 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-300"
              >
                {resolvedTargetRoleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {state.actionType === 'dreammusic.commentTrack' ? (
          <section className="rounded-3xl border border-sky-100 bg-white p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-sky-600">梦音乐评论</h3>
            <p className="text-[12px] text-slate-500 leading-5">
              该动作会在执行时自动选择歌曲，并结合歌词和该歌曲评论区内容生成评论。
            </p>
            <p className="text-[12px] text-slate-500 leading-5">
              选歌优先级：当前播放歌曲 → 收藏歌曲 → 最近播放 → 最近更新歌曲。
            </p>
          </section>
        ) : null}

        {state.actionType === 'lovespace.addMoment' ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-rose-600">情侣空间-发布瞬间</h3>
            {renderLoveRelationSelect()}
            <textarea
              value={state.loveMomentContent}
              onChange={(event) => onPatch({ loveMomentContent: event.target.value })}
              placeholder="输入瞬间内容"
              className="w-full min-h-[130px] rounded-2xl border border-rose-100 bg-rose-50/30 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-rose-300 resize-none"
            />
            <input
              type="text"
              value={state.loveMomentImageDataUrl}
              onChange={(event) => onPatch({ loveMomentImageDataUrl: event.target.value })}
              placeholder="图片 Data URL（可选）"
              className="w-full rounded-2xl border border-rose-100 bg-rose-50/30 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
            />
          </section>
        ) : null}

        {state.actionType === 'lovespace.completeCheckInTask' ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-4 space-y-3">
            <h3 className="text-[14px] font-semibold text-rose-600">情侣空间-完成打卡任务</h3>
            <label className="text-[12px] text-slate-500 block">
              任务归属角色
              <select
                value={state.loveOwnerRoleId}
                onChange={(event) => patchLoveOwnerRole(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-rose-100 bg-rose-50/30 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
              >
                {resolvedLoveOwnerRoleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {renderLoveRelationSelect()}

            <label className="text-[12px] text-slate-500 block">
              打卡任务
              <select
                value={state.loveCompleteTaskId}
                onChange={(event) => patchLoveCheckInTask(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-rose-100 bg-rose-50/30 px-3 py-2.5 text-[13px] outline-none focus:border-rose-300"
              >
                <option value="" disabled>
                  请选择打卡任务
                </option>
                {resolvedCheckInTaskOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            {checkInTaskOptionsForCurrentSelection.length === 0 ? (
              <p className="text-[12px] text-slate-500">
                当前关系下没有可选任务，请先在情侣空间中创建任务。
              </p>
            ) : null}

            {state.loveCompleteTaskId ? (
              <p className="text-[12px] text-slate-500">
                将尝试完成任务：{state.loveCompleteTitle || '已选择任务'}
              </p>
            ) : null}
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
            {errorMessage}
          </section>
        ) : null}
      </main>

      <footer
        className={
          shouldHideFooter
            ? 'shrink-0 h-0 overflow-hidden border-0 bg-white/90 px-0 pt-0'
            : 'shrink-0 px-4 pt-2 border-t border-indigo-100 bg-white/90'
        }
        style={{ paddingBottom: shouldHideFooter ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        {!shouldHideFooter ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl bg-slate-100 text-slate-700 text-[14px] font-semibold"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              className="h-11 rounded-2xl bg-indigo-500 text-white text-[14px] font-semibold"
            >
              保存步骤
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  );
};
