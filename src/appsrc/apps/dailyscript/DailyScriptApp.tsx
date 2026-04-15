import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useMyCardsSnapshotBridge } from '../../shared/business/contacts/myCardsSnapshotBridge';
import { useContactsSnapshotBridge } from '../../shared/business/contacts/snapshotBridge';
import { emitCommerceRoleChanged } from '../../shared/business/commerce/roleContext';
import { useLoveSpaceCheckInTaskSnapshotBridge } from '../../shared/business/lovespace/checkInTaskBridge';
import { useLoveSpaceRelationSnapshotBridge } from '../../shared/business/lovespace/relationBridge';
import { DEFAULT_ACTIVE_ROLE_ID, createContactRoleId } from '../../shared/business/roleIdentity';
import {
  clearRuntimeActiveRoleId,
  getRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { useDreamMusicStore } from '../dreammusic/store';
import { useLoveSpaceStore } from '../lovespace/store';
import {
  parseDailyScriptAiPlansText,
  requestDailyScriptAiPlans,
  serializeDailyScriptAiPlans,
  toDailyScriptAiErrorMessage,
  type DailyScriptAIDraftPlan,
} from './aiPlanBuilder';
import { RoleName, StepEditorOverlay } from './components';
import { TIME_PATTERN } from './constants';
import type {
  DreamMusicTrackOption,
  LoveCheckInTaskOption,
  LoveRelationOption,
  RoleOption,
  StepEditorState,
} from './editorTypes';
import { useDailyScriptStore } from './store';
import type { DailyScriptActionPayload, DailyScriptAppProps, DailyScriptStep } from './types';
import {
  buildCalendarDays,
  buildEditorState,
  formatDateKeyLabel,
  formatMonthLabel,
  parseTagsInput,
  toDateKey,
} from './utils';
import { AiCreateView, CalendarView, DaySettingsView, RoleListView } from './views';

type DailyScriptView = 'roles' | 'calendar' | 'settings' | 'ai-create';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const countDraftSteps = (plans: DailyScriptAIDraftPlan[]): number =>
  plans.reduce((sum, plan) => sum + plan.steps.length, 0);

const formatAiSummary = (plans: DailyScriptAIDraftPlan[]): string =>
  `已生成 ${plans.length} 个剧本，共 ${countDraftSteps(plans)} 个步骤，请确认后导入。`;

const runWithRuntimeRole = <T,>(roleId: string, runner: () => T): T => {
  const previousRoleId = getRuntimeActiveRoleId();
  setRuntimeActiveRoleId(roleId);
  emitCommerceRoleChanged();
  try {
    return runner();
  } finally {
    if (previousRoleId) {
      setRuntimeActiveRoleId(previousRoleId);
    } else {
      clearRuntimeActiveRoleId();
    }
    emitCommerceRoleChanged();
  }
};

export const DailyScriptApp: React.FC<DailyScriptAppProps> = ({ onClose }) => {
  const { settings } = useGlobalSettingsStore();

  const plans = useDailyScriptStore((state) => state.plans);
  const logs = useDailyScriptStore((state) => state.logs);
  const addPlan = useDailyScriptStore((state) => state.addPlan);
  const renamePlan = useDailyScriptStore((state) => state.renamePlan);
  const removePlan = useDailyScriptStore((state) => state.removePlan);
  const setPlanEnabled = useDailyScriptStore((state) => state.setPlanEnabled);
  const upsertStep = useDailyScriptStore((state) => state.upsertStep);
  const removeStep = useDailyScriptStore((state) => state.removeStep);
  const setStepEnabled = useDailyScriptStore((state) => state.setStepEnabled);
  const clearLogs = useDailyScriptStore((state) => state.clearLogs);
  const runDueStepsNow = useDailyScriptStore((state) => state.runDueStepsNow);

  const contacts = useContactsSnapshotBridge();
  const myCards = useMyCardsSnapshotBridge();
  const loveSpaceRelations = useLoveSpaceRelationSnapshotBridge();
  const loveSpaceCheckInTasks = useLoveSpaceCheckInTaskSnapshotBridge();
  const dreamMusicTracks = useDreamMusicStore((state) => state.tracks);
  const dreamMusicFavoriteTrackIds = useDreamMusicStore((state) => state.favoriteTrackIds);

  const [view, setView] = useState<DailyScriptView>('roles');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [editorState, setEditorState] = useState<StepEditorState | null>(null);
  const [editorError, setEditorError] = useState('');
  const [runSummary, setRunSummary] = useState('');
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [planNameDrafts, setPlanNameDrafts] = useState<Record<string, string>>({});

  const [aiSourceText, setAiSourceText] = useState('');
  const [aiResultText, setAiResultText] = useState('');
  const [aiDraftPlans, setAiDraftPlans] = useState<DailyScriptAIDraftPlan[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiImporting, setIsAiImporting] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [aiSummaryMessage, setAiSummaryMessage] = useState('');

  const roleOptions = useMemo<RoleOption[]>(
    () =>
      contacts
        .map((contact) => ({
          id: createContactRoleId(contact.id),
          label: contact.name || contact.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN')),
    [contacts]
  );

  const myCardTargetRoleOptions = useMemo<RoleOption[]>(
    () =>
      myCards
        .map((myCard) => ({
          id: myCard.id,
          label: myCard.name || myCard.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN')),
    [myCards]
  );

  const targetRoleOptions = useMemo<RoleOption[]>(
    () => [
      {
        id: DEFAULT_ACTIVE_ROLE_ID,
        label: '默认身份',
      },
      ...myCardTargetRoleOptions,
    ],
    [myCardTargetRoleOptions]
  );

  const loveRelationOptions = useMemo<LoveRelationOption[]>(() => {
    if (!selectedRoleId) return [];
    return loveSpaceRelations
      .filter((item) => item.contactRoleId === selectedRoleId)
      .map((item) => ({
        id: item.id,
        label: item.label,
        ownerRoleId: item.ownerRoleId,
        bondId: item.bondId,
        contactRoleId: item.contactRoleId,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
  }, [loveSpaceRelations, selectedRoleId]);

  const loveCheckInTaskOptions = useMemo<LoveCheckInTaskOption[]>(() => {
    if (!selectedRoleId) return [];
    return loveSpaceCheckInTasks
      .filter((item) => item.contactRoleId === selectedRoleId)
      .map((item) => ({
        id: item.id,
        title: item.title,
        owner: item.owner,
        templateId: item.templateId,
        relationId: item.relationId,
        relationLabel: item.relationLabel,
        ownerRoleId: item.ownerRoleId,
        bondId: item.bondId,
        contactRoleId: item.contactRoleId,
      }))
      .sort((left, right) => {
        const leftLabel = `${left.relationLabel}|${left.owner}|${left.title}`;
        const rightLabel = `${right.relationLabel}|${right.owner}|${right.title}`;
        return leftLabel.localeCompare(rightLabel, 'zh-CN');
      });
  }, [loveSpaceCheckInTasks, selectedRoleId]);

  const dreamMusicTrackOptions = useMemo<DreamMusicTrackOption[]>(() => {
    const trackById = new Map(dreamMusicTracks.map((track) => [track.id, track]));
    const favoriteTrackIdSet = new Set(dreamMusicFavoriteTrackIds);

    const favoriteTracks = dreamMusicFavoriteTrackIds
      .map((trackId) => trackById.get(trackId))
      .filter((track): track is NonNullable<typeof track> => Boolean(track));

    const normalTracks = dreamMusicTracks
      .filter((track) => !favoriteTrackIdSet.has(track.id))
      .sort((left, right) => right.updatedAt - left.updatedAt);

    const orderedTracks = [...favoriteTracks, ...normalTracks];

    return orderedTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      label: `${track.title} - ${track.artist}`,
    }));
  }, [dreamMusicFavoriteTrackIds, dreamMusicTracks]);

  const allowedTargetRoleIds = useMemo(
    () => targetRoleOptions.map((option) => option.id),
    [targetRoleOptions]
  );

  const selectedRoleLabel = useMemo(() => {
    if (!selectedRoleId) return '';
    return roleOptions.find((option) => option.id === selectedRoleId)?.label || selectedRoleId;
  }, [roleOptions, selectedRoleId]);

  const selectedRolePlanCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedRoleId) return map;

    plans
      .filter((plan) => plan.executorRoleId === selectedRoleId)
      .forEach((plan) => {
        map.set(plan.dateKey, (map.get(plan.dateKey) || 0) + 1);
      });
    return map;
  }, [plans, selectedRoleId]);

  const calendarCells = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);

  const selectedDayPlans = useMemo(() => {
    if (!selectedRoleId || !selectedDateKey) return [];
    return plans
      .filter(
        (plan) => plan.executorRoleId === selectedRoleId && plan.dateKey === selectedDateKey
      )
      .sort((left, right) => left.createdAt - right.createdAt);
  }, [plans, selectedDateKey, selectedRoleId]);

  const selectedDayLogs = useMemo(() => {
    if (!selectedRoleId || !selectedDateKey) return [];
    return logs
      .filter((log) => log.roleId === selectedRoleId && log.dayKey === selectedDateKey)
      .sort((left, right) => right.executedAt - left.executedAt);
  }, [logs, selectedDateKey, selectedRoleId]);

  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const canRunNow = selectedDateKey === todayDateKey;

  const closeEditor = () => {
    setEditorState(null);
    setEditorError('');
  };

  const handlePatchEditor = (patch: Partial<StepEditorState>) => {
    setEditorState((current) => (current ? { ...current, ...patch } : current));
  };

  const openRoleCalendar = (roleId: string) => {
    setSelectedRoleId(roleId);
    setSelectedDateKey(null);
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setView('calendar');
    setRunSummary('');
  };

  const openDateSettings = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setView('settings');
    setRunSummary('');
  };

  const openAiCreate = () => {
    if (!selectedRoleId || !selectedDateKey) return;
    setView('ai-create');
    setAiErrorMessage('');
    setAiSummaryMessage('');
  };

  const handleOpenCreateStep = (planId: string) => {
    setEditorError('');
    setEditorState(buildEditorState(planId));
  };

  const handleOpenEditStep = (planId: string, step: DailyScriptStep) => {
    setEditorError('');
    setEditorState(buildEditorState(planId, step));
  };

  const resolveSelectedLoveRelation = (
    state: StepEditorState,
    options?: {
      requireOwnerRoleMatch?: boolean;
    }
  ): LoveRelationOption | null => {
    const relationId = state.loveRelationId.trim();
    if (!relationId) return null;
    const relation = loveRelationOptions.find((option) => option.id === relationId);
    if (!relation) return null;
    if (selectedRoleId && relation.contactRoleId !== selectedRoleId) return null;
    if (options?.requireOwnerRoleMatch) {
      const ownerRoleId = state.loveOwnerRoleId.trim();
      if (ownerRoleId && relation.ownerRoleId !== ownerRoleId) return null;
    }
    return relation;
  };

  const resolveSelectedLoveCheckInTask = (
    state: StepEditorState,
    relation: LoveRelationOption
  ): LoveCheckInTaskOption | null => {
    const taskId = state.loveCompleteTaskId.trim();
    if (!taskId) return null;

    return (
      loveCheckInTaskOptions.find(
        (option) =>
          option.id === taskId &&
          option.relationId === relation.id &&
          option.ownerRoleId === relation.ownerRoleId &&
          option.bondId === relation.bondId &&
          (!selectedRoleId || option.contactRoleId === selectedRoleId)
      ) || null
    );
  };

  const resolvePartnerLoveCheckInTask = (
    selectedTask: LoveCheckInTaskOption,
    relation: LoveRelationOption
  ): LoveCheckInTaskOption | null => {
    if (selectedTask.owner === 'partner') return selectedTask;
    return (
      loveCheckInTaskOptions.find(
        (option) =>
          option.owner === 'partner' &&
          option.templateId === selectedTask.templateId &&
          option.relationId === relation.id &&
          option.ownerRoleId === relation.ownerRoleId &&
          option.bondId === relation.bondId &&
          (!selectedRoleId || option.contactRoleId === selectedRoleId)
      ) || null
    );
  };

  const ensurePartnerLoveCheckInTask = (
    selectedTask: LoveCheckInTaskOption,
    relation: LoveRelationOption
  ): LoveCheckInTaskOption | null => {
    const resolvedPartnerTask = resolvePartnerLoveCheckInTask(selectedTask, relation);
    if (resolvedPartnerTask) return resolvedPartnerTask;
    if (!selectedTask.templateId.trim()) return null;

    runWithRuntimeRole(relation.ownerRoleId, () => {
      const store = useLoveSpaceStore.getState();
      store.syncLoveSpaceRoleContext();
      store.addCheckInTasks({
        bondId: relation.bondId,
        owner: selectedTask.owner,
        tasks: [
          {
            templateId: selectedTask.templateId,
            categoryId: 'custom',
            iconKey: 'heart',
            title: selectedTask.title || '鎵撳崱浠诲姟',
            score: 100,
            allowPartnerReminder: true,
          },
        ],
      });
    });

    return (
      useLoveSpaceStore
        .getState()
        .checkInTasks.filter(
          (item) =>
            item.owner === 'partner' &&
            item.templateId === selectedTask.templateId &&
            item.bondId === relation.bondId
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          owner: item.owner,
          templateId: item.templateId,
          relationId: relation.id,
          relationLabel: relation.label,
          ownerRoleId: relation.ownerRoleId,
          bondId: relation.bondId,
          contactRoleId: relation.contactRoleId,
        }))
        .sort((left, right) => right.id.localeCompare(left.id))[0] || null
    );
  };

  const handleSaveStep = () => {
    if (!editorState) return;

    const normalizedTime = editorState.time.trim();
    if (!TIME_PATTERN.test(normalizedTime)) {
      setEditorError('时间格式需为 HH:mm');
      return;
    }

    let payload: DailyScriptActionPayload;

    if (editorState.actionType === 'dailywords.writeDiary') {
      const title = editorState.diaryTitle.trim();
      const content = editorState.diaryContent.trim();
      if (!title && !content) {
        setEditorError('每日语动作至少需要标题或内容');
        return;
      }

      payload = {
        title,
        content,
        mood: editorState.diaryMood.trim(),
        tags: parseTagsInput(editorState.diaryTagsInput),
        syncToMemory: editorState.diarySyncToMemory,
      };
    } else if (editorState.actionType === 'wechat.sendMessageToUser') {
      const content = editorState.wechatContent.trim();
      if (!content) {
        setEditorError('微信动作必须填写消息内容');
        return;
      }

      const targetUserRoleIdCandidate = editorState.wechatTargetUserRoleId.trim();
      const normalizedTargetUserRoleId = targetRoleOptions.some(
        (option) => option.id === targetUserRoleIdCandidate
      )
        ? targetUserRoleIdCandidate
        : DEFAULT_ACTIVE_ROLE_ID;

      payload = {
        content,
        targetUserRoleId: normalizedTargetUserRoleId,
      };
    } else if (editorState.actionType === 'dreammusic.commentTrack') {
      payload = {
        targetTrackId: '',
        targetTrackTitle: '',
      };
    } else if (editorState.actionType === 'lovespace.addMoment') {
      const relation = resolveSelectedLoveRelation(editorState);
      if (!relation) {
        setEditorError('请选择有效的情侣关系');
        return;
      }

      const content = editorState.loveMomentContent.trim();
      const imageDataUrl = editorState.loveMomentImageDataUrl.trim();
      if (!content && !imageDataUrl) {
        setEditorError('瞬间内容和图片至少填写一项');
        return;
      }

      payload = {
        targetRelationId: relation.id,
        targetRelationLabel: relation.label,
        targetOwnerRoleId: relation.ownerRoleId,
        targetBondId: relation.bondId,
        content,
        imageDataUrl: imageDataUrl || undefined,
      };
    } else {
      const relation = resolveSelectedLoveRelation(editorState, {
        requireOwnerRoleMatch: true,
      });
      if (!relation) {
        setEditorError('请选择有效的情侣关系');
        return;
      }

      const selectedTask = resolveSelectedLoveCheckInTask(editorState, relation);
      if (!selectedTask) {
        setEditorError('请选择有效的打卡任务');
        return;
      }

      const partnerTask = ensurePartnerLoveCheckInTask(selectedTask, relation);
      if (!partnerTask) {
        setEditorError('无法创建对方打卡任务，请到情侣空间检查关系与打卡模板');
        return;
      }


      payload = {
        targetRelationId: relation.id,
        targetRelationLabel: relation.label,
        targetOwnerRoleId: relation.ownerRoleId,
        targetBondId: relation.bondId,
        owner: 'partner',
        taskId: partnerTask.id,
        templateId: partnerTask.templateId,
        title: partnerTask.title,
      };
    }

    upsertStep(editorState.planId, {
      stepId: editorState.stepId,
      name: editorState.name.trim(),
      time: normalizedTime,
      actionType: editorState.actionType,
      payload,
      enabled: editorState.enabled,
    });

    closeEditor();
  };

  const handleAddPlan = () => {
    if (!selectedRoleId || !selectedDateKey) return;
    const planId = addPlan(undefined, selectedRoleId, selectedDateKey);
    handleOpenCreateStep(planId);
  };

  const commitPlanName = (planId: string, fallbackName: string) => {
    const draft = planNameDrafts[planId];
    if (draft === undefined) return;
    const nextName = draft.trim();
    if (nextName && nextName !== fallbackName) {
      renamePlan(planId, nextName);
    }

    setPlanNameDrafts((current) => {
      const next = { ...current };
      delete next[planId];
      return next;
    });
  };

  const handleRemovePlan = (planId: string, planName: string) => {
    const confirmed = window.confirm(`确认删除剧本“${planName}”吗？该剧本下的步骤会一起删除。`);
    if (!confirmed) return;
    removePlan(planId);
  };

  const handleRemoveStep = (planId: string, stepId: string) => {
    const confirmed = window.confirm('确认删除该步骤吗？');
    if (!confirmed) return;
    removeStep(planId, stepId);
  };

  const parseAiDraftPlansFromResult = (rawText: string): DailyScriptAIDraftPlan[] => {
    return parseDailyScriptAiPlansText(rawText, allowedTargetRoleIds, {
      loveRelationOptions,
      loveCheckInTaskOptions,
      dreamMusicTrackOptions,
    });
  };

  const handleGenerateAiPlans = async () => {
    if (isAiGenerating || isAiImporting) return;
    if (!selectedRoleId || !selectedDateKey) {
      setAiErrorMessage('请先选择执行角色和目标日期');
      return;
    }

    setAiErrorMessage('');
    setAiSummaryMessage('');
    setIsAiGenerating(true);

    try {
      const result = await requestDailyScriptAiPlans({
        settings,
        dateKey: selectedDateKey,
        roleId: selectedRoleId,
        roleLabel: selectedRoleLabel || selectedRoleId,
        sourceText: aiSourceText,
        allowedTargetRoleIds,
        loveRelationOptions,
        loveCheckInTaskOptions,
        dreamMusicTrackOptions,
      });

      setAiDraftPlans(result.plans);
      setAiResultText(serializeDailyScriptAiPlans(result.plans));
      setAiSummaryMessage(formatAiSummary(result.plans));
    } catch (error) {
      setAiErrorMessage(toDailyScriptAiErrorMessage(error));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleRefreshAiPreview = () => {
    setAiErrorMessage('');
    setAiSummaryMessage('');

    try {
      const parsedPlans = parseAiDraftPlansFromResult(aiResultText);
      setAiDraftPlans(parsedPlans);
      setAiSummaryMessage(formatAiSummary(parsedPlans));
    } catch (error) {
      setAiErrorMessage(toDailyScriptAiErrorMessage(error));
    }
  };

  const handleImportAiPlans = async () => {
    if (isAiImporting || isAiGenerating) return;
    if (!selectedRoleId || !selectedDateKey) {
      setAiErrorMessage('请先选择执行角色和目标日期');
      return;
    }

    setAiErrorMessage('');
    setAiSummaryMessage('');
    setIsAiImporting(true);

    try {
      const plansToImport = parseAiDraftPlansFromResult(aiResultText);
      if (plansToImport.length === 0) {
        setAiErrorMessage('没有可导入的剧本');
        return;
      }

      let importedStepCount = 0;
      plansToImport.forEach((plan) => {
        const createdPlanId = addPlan(plan.name, selectedRoleId, selectedDateKey);
        if (plan.enabled === false) {
          setPlanEnabled(createdPlanId, false);
        }

        plan.steps.forEach((step) => {
          upsertStep(createdPlanId, {
            name: step.name || '',
            time: step.time,
            actionType: step.actionType,
            payload: step.payload as DailyScriptActionPayload,
            enabled: step.enabled !== false,
          });
          importedStepCount += 1;
        });
      });

      setAiDraftPlans(plansToImport);
      setAiResultText(serializeDailyScriptAiPlans(plansToImport));
      setAiSummaryMessage(`已导入 ${plansToImport.length} 个剧本，包含 ${importedStepCount} 个步骤。`);
      setView('settings');
    } catch (error) {
      setAiErrorMessage(toDailyScriptAiErrorMessage(error));
    } finally {
      setIsAiImporting(false);
    }
  };

  const handleRunNow = async () => {
    if (!canRunNow || isRunningNow) return;
    setIsRunningNow(true);
    setRunSummary('');

    try {
      const result = await runDueStepsNow();
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      setRunSummary(
        `${time} 执行完成：成功 ${result.executed}，失败 ${result.failed}，跳过 ${result.skipped}`
      );
    } catch (error) {
      setRunSummary(`执行失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsRunningNow(false);
    }
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 220 }}
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-indigo-50 via-white to-rose-50 text-slate-800"
    >
      <header className="pt-11 px-3 pb-3 bg-white/70 border-b border-indigo-100 backdrop-blur">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              if (view === 'roles') {
                onClose();
                return;
              }
              if (view === 'calendar') {
                setView('roles');
                setSelectedRoleId(null);
                return;
              }
              if (view === 'settings') {
                setView('calendar');
                setSelectedDateKey(null);
                return;
              }
              setView('settings');
            }}
            className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label="返回"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-[20px] font-semibold tracking-wide">
              {view === 'roles'
                ? '每日剧本执行角色'
                : view === 'calendar'
                ? '每日剧本日历'
                : view === 'settings'
                ? '剧本设置'
                : 'AI自动生成'}
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {view === 'roles' ? '先选择执行角色，再设置每日剧本' : null}
              {view === 'calendar' && selectedRoleId ? (
                <>
                  当前角色：<RoleName roleId={selectedRoleId} />
                </>
              ) : null}
              {view === 'settings' && selectedDateKey ? formatDateKeyLabel(selectedDateKey) : null}
              {view === 'ai-create' && selectedDateKey ? (
                <>
                  {formatDateKeyLabel(selectedDateKey)}
                  {selectedRoleId ? (
                    <>
                      {' '}
                      · <RoleName roleId={selectedRoleId} />
                    </>
                  ) : null}
                </>
              ) : null}
            </p>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-3">
        {view === 'roles' ? (
          <RoleListView
            roleOptions={roleOptions}
            plans={plans}
            onOpenRoleCalendar={openRoleCalendar}
          />
        ) : null}

        {view === 'calendar' ? (
          <CalendarView
            monthCursor={monthCursor}
            weekdayLabels={WEEKDAY_LABELS}
            calendarCells={calendarCells}
            selectedRolePlanCountByDate={selectedRolePlanCountByDate}
            todayDateKey={todayDateKey}
            onOpenDateSettings={openDateSettings}
            onPrevMonth={() =>
              setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            onNextMonth={() =>
              setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            formatMonthLabel={formatMonthLabel}
          />
        ) : null}

        {view === 'settings' ? (
          <DaySettingsView
            selectedRoleId={selectedRoleId}
            selectedDateKey={selectedDateKey}
            selectedDayPlans={selectedDayPlans}
            selectedDayLogs={selectedDayLogs}
            planNameDrafts={planNameDrafts}
            isRunningNow={isRunningNow}
            canRunNow={canRunNow}
            runSummary={runSummary}
            formatDateKeyLabel={formatDateKeyLabel}
            onAddPlan={handleAddPlan}
            onOpenAiCreate={openAiCreate}
            onRunNow={handleRunNow}
            onSetPlanNameDraft={(planId, value) =>
              setPlanNameDrafts((current) => ({
                ...current,
                [planId]: value,
              }))
            }
            onCommitPlanName={commitPlanName}
            onSetPlanEnabled={setPlanEnabled}
            onRemovePlan={handleRemovePlan}
            onOpenCreateStep={handleOpenCreateStep}
            onOpenEditStep={handleOpenEditStep}
            onRemoveStep={handleRemoveStep}
            onToggleStepEnabled={setStepEnabled}
            onClearLogs={clearLogs}
          />
        ) : null}

        {view === 'ai-create' ? (
          <AiCreateView
            selectedRoleId={selectedRoleId}
            selectedRoleLabel={selectedRoleLabel}
            selectedDateKey={selectedDateKey}
            sourceText={aiSourceText}
            rawDraftText={aiResultText}
            generatedPlans={aiDraftPlans}
            isGenerating={isAiGenerating}
            isImporting={isAiImporting}
            errorMessage={aiErrorMessage}
            summaryMessage={aiSummaryMessage}
            formatDateKeyLabel={formatDateKeyLabel}
            onSourceTextChange={setAiSourceText}
            onRawDraftTextChange={setAiResultText}
            onGenerate={handleGenerateAiPlans}
            onRefreshPreview={handleRefreshAiPreview}
            onImport={handleImportAiPlans}
          />
        ) : null}
      </main>

      {editorState ? (
        <StepEditorOverlay
          state={editorState}
          targetRoleOptions={targetRoleOptions}
          loveRelationOptions={loveRelationOptions}
          loveCheckInTaskOptions={loveCheckInTaskOptions}
          errorMessage={editorError}
          onClose={closeEditor}
          onSave={handleSaveStep}
          onPatch={handlePatchEditor}
        />
      ) : null}
    </motion.div>
  );
};

export type { DailyScriptAppProps };
