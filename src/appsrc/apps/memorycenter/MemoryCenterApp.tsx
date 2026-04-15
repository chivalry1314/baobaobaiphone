import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Brain, ChevronLeft, Eraser, RefreshCw, Trash2, X } from 'lucide-react';
import {
  DEFAULT_APP_MEMORY_ROLE_ID,
  normalizeAppMemoryRoleId,
  normalizeAppMemorySpace,
  type AppMemoryRecord,
  type AppMemorySpace,
} from '../../../core/appMemory';
import { useAppMemoryCenterStore, type AppAutoSummaryProgress } from '../../../core/appMemoryCenter';
import { useGlobalSettingsStore } from '@baobaobaiOS/sdk';
import { getRegisteredAppMemoryModules } from '../../../core/appMemoryRegistry';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { getAppById } from '../../../core/registry';
import {
  isContactRoleId,
  parseContactRoleId,
  parseRoleCharacterId,
} from '../../shared/business/roleIdentity';
import { clearRuntimeActiveRoleId, useRoleRuntimeStore } from '../../shared/business/roleRuntime';
import {
  useContactsSnapshot,
  useMyCardsSnapshot,
  useStoredActiveRoleIdSnapshot,
} from '../contacts/selectors';
import type { MemoryCenterAppProps } from './types';
const DEFAULT_MEMORY_SUMMARY_THRESHOLD = 120;
const DEFAULT_MEMORY_SUMMARY_MAX_ROUNDS = 2;
const DEFAULT_MEMORY_SUMMARY_MIN_BATCH = 8;
const DEFAULT_MEMORY_SUMMARY_MAX_BATCH = 60;
const DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_MIN = 6;
const DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_RATIO = 0.5;

const formatMemoryTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const getRoleLabel = (role: AppMemoryRecord['role']): string => (role === 'user' ? '我' : '对方');

const reverseMemoryRole = (role: AppMemoryRecord['role']): AppMemoryRecord['role'] =>
  role === 'user' ? 'assistant' : 'user';

const createInspectorProjectionRecordId = (record: AppMemoryRecord): string =>
  `inspector-${normalizeAppMemoryRoleId(record.roleId)}-${record.id}`;

const normalizeThreshold = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_SUMMARY_THRESHOLD;
  return Math.max(20, Math.min(500, Math.round(value)));
};

const normalizeSummaryMaxRounds = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_SUMMARY_MAX_ROUNDS;
  return Math.max(1, Math.min(10, Math.round(value)));
};

const normalizeSummaryMinBatch = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_SUMMARY_MIN_BATCH;
  return Math.max(4, Math.min(80, Math.round(value)));
};

const normalizeSummaryMaxBatch = (value: number | undefined, minBatch: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.max(minBatch, DEFAULT_MEMORY_SUMMARY_MAX_BATCH);
  }
  return Math.max(minBatch, Math.min(200, Math.round(value)));
};

const normalizeSummaryKeepRecentMin = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_MIN;
  return Math.max(0, Math.min(120, Math.round(value)));
};

const normalizeSummaryKeepRecentRatio = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_RATIO;
  return Math.max(0.2, Math.min(0.8, value));
};

const getAutoSummaryStageLabel = (stage: AppAutoSummaryProgress['stage']): string => {
  if (stage === 'planning') return '准备中';
  if (stage === 'summarizing') return '正在总结';
  if (stage === 'saving') return '正在写入';
  if (stage === 'completed') return '已完成';
  return '失败';
};

const getAutoSummaryProgressPercent = (progress: AppAutoSummaryProgress): number => {
  if (!progress.running) {
    if (progress.stage === 'completed') return 100;
    if (progress.stage === 'failed') {
      return Math.max(5, Math.min(95, Math.round((progress.completedRounds / progress.maxRounds) * 100)));
    }
  }

  const totalRounds = Math.max(1, progress.maxRounds);
  const roundBase = Math.max(0, progress.round - 1);
  const stageWeight =
    progress.stage === 'planning' ? 0.2 : progress.stage === 'summarizing' ? 0.65 : 1;

  return Math.max(
    1,
    Math.min(99, Math.round(((roundBase + stageWeight) / totalRounds) * 100))
  );
};

export const MemoryCenterApp: React.FC<MemoryCenterAppProps> = ({ onClose, context }) => {
  const allRecords = useAppMemoryCenterStore((state) => state.appMemoryRecords);
  const autoSummaryProgressByApp = useAppMemoryCenterStore(
    (state) => state.autoSummaryProgressByApp
  );
  const removeAppMemoryById = useAppMemoryCenterStore((state) => state.removeAppMemoryById);
  const clearAppMemories = useAppMemoryCenterStore((state) => state.clearAppMemories);
  const contacts = useContactsSnapshot();
  const myCards = useMyCardsSnapshot();
  const memoryAutoSummaryThreshold = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryThreshold
  );
  const memoryAutoSummaryMaxRounds = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryMaxRounds
  );
  const memoryAutoSummaryMinBatch = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryMinBatch
  );
  const memoryAutoSummaryMaxBatch = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryMaxBatch
  );
  const memoryAutoSummaryKeepRecentMin = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryKeepRecentMin
  );
  const memoryAutoSummaryKeepRecentRatio = useGlobalSettingsStore(
    (state) => state.settings.memoryAutoSummaryKeepRecentRatio
  );
  const memoryModel = useGlobalSettingsStore((state) => state.settings.memoryModel);
  const updateSettings = useGlobalSettingsStore((state) => state.updateSettings);

  const storedActiveRoleIdSnapshot = useStoredActiveRoleIdSnapshot();
  const storedActiveRoleId = useMemo(
    () => normalizeAppMemoryRoleId(storedActiveRoleIdSnapshot),
    [storedActiveRoleIdSnapshot]
  );
  const runtimeRoleId = useRoleRuntimeStore((state) => state.overrideRoleId);
  const isInspectorMode = context?.params?.mode === 'inspector';
  const effectiveRoleId = useMemo(
    () => normalizeAppMemoryRoleId(isInspectorMode ? runtimeRoleId || storedActiveRoleId : storedActiveRoleId),
    [isInspectorMode, runtimeRoleId, storedActiveRoleId]
  );
  const inspectorContactId = useMemo(
    () => (isInspectorMode ? parseContactRoleId(effectiveRoleId) : null),
    [effectiveRoleId, isInspectorMode]
  );
  const isInspectorContactRoleMode = useMemo(
    () => isInspectorMode && Boolean(inspectorContactId) && isContactRoleId(effectiveRoleId),
    [effectiveRoleId, inspectorContactId, isInspectorMode]
  );
  const isInspectorReadOnlyMode =
    isInspectorContactRoleMode || context?.params?.readOnly === true;

  useEffect(() => {
    if (isInspectorMode) return;
    if (!runtimeRoleId) return;
    clearRuntimeActiveRoleId();
  }, [isInspectorMode, runtimeRoleId]);

  const contactNameMap = useMemo(
    () => new Map(contacts.map((item) => [item.id, item.name])),
    [contacts]
  );
  const myCardNameMap = useMemo(
    () => new Map(myCards.map((item) => [item.id, item.name || item.id])),
    [myCards]
  );
  const roleDisplayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set(DEFAULT_APP_MEMORY_ROLE_ID, '默认身份');
    myCardNameMap.forEach((name, roleId) => {
      map.set(roleId, name);
    });
    return map;
  }, [myCardNameMap]);
  const activeRoleName = useMemo(() => {
    if (inspectorContactId) {
      return contactNameMap.get(inspectorContactId) || inspectorContactId;
    }

    return roleDisplayNameMap.get(effectiveRoleId) || effectiveRoleId;
  }, [contactNameMap, effectiveRoleId, inspectorContactId, roleDisplayNameMap]);

  const [selectedSpace, setSelectedSpace] = useState<AppMemorySpace>('social');
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'records' | 'autoSummaryConfig'>('records');
  const recordsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInspectorReadOnlyMode) return;
    if (selectedSpace === 'social') return;
    setSelectedSpace('social');
  }, [isInspectorReadOnlyMode, selectedSpace]);

  useEffect(() => {
    if (!isInspectorReadOnlyMode) return;
    if (currentView !== 'autoSummaryConfig') return;
    setCurrentView('records');
  }, [currentView, isInspectorReadOnlyMode]);

  const directScopedRecords = useMemo(
    () =>
      allRecords.filter(
        (item) =>
          normalizeAppMemoryRoleId(item.roleId) === effectiveRoleId &&
          normalizeAppMemorySpace(item.space) === selectedSpace
      ),
    [allRecords, effectiveRoleId, selectedSpace]
  );

  const inspectorProjectedRecords = useMemo(() => {
    if (!isInspectorContactRoleMode || !inspectorContactId) return [];

    return allRecords
      .filter((item) => normalizeAppMemorySpace(item.space) === selectedSpace)
      .filter((item) => item.contactId === inspectorContactId)
      .map((item) => {
        const sourceRoleId = normalizeAppMemoryRoleId(item.roleId);
        if (sourceRoleId === effectiveRoleId) return null;
        if (isContactRoleId(sourceRoleId)) return null;

        return {
          ...item,
          id: createInspectorProjectionRecordId(item),
          roleId: effectiveRoleId,
          contactId: sourceRoleId,
          role: reverseMemoryRole(item.role),
        } as AppMemoryRecord;
      })
      .filter((item): item is AppMemoryRecord => Boolean(item))
      .sort((left, right) => right.timestamp - left.timestamp);
  }, [
    allRecords,
    effectiveRoleId,
    inspectorContactId,
    isInspectorContactRoleMode,
    selectedSpace,
  ]);

  const scopedRecords = useMemo(() => {
    if (!isInspectorContactRoleMode) return directScopedRecords;

    const directByAppId = new Map<string, AppMemoryRecord[]>();
    directScopedRecords.forEach((item) => {
      const current = directByAppId.get(item.appId);
      if (current) {
        current.push(item);
        return;
      }
      directByAppId.set(item.appId, [item]);
    });

    const projectedByAppId = new Map<string, AppMemoryRecord[]>();
    inspectorProjectedRecords.forEach((item) => {
      const current = projectedByAppId.get(item.appId);
      if (current) {
        current.push(item);
        return;
      }
      projectedByAppId.set(item.appId, [item]);
    });

    const appIds = new Set<string>([
      ...directByAppId.keys(),
      ...projectedByAppId.keys(),
    ]);
    const nextRecords: AppMemoryRecord[] = [];

    appIds.forEach((appId) => {
      const directRecords = directByAppId.get(appId);
      const projectedRecords = projectedByAppId.get(appId);
      const mergedById = new Map<string, AppMemoryRecord>();

      projectedRecords?.forEach((item) => {
        mergedById.set(item.id, item);
      });
      directRecords?.forEach((item) => {
        mergedById.set(item.id, item);
      });

      if (mergedById.size > 0) {
        nextRecords.push(...mergedById.values());
      }
    });

    return nextRecords;
  }, [directScopedRecords, inspectorProjectedRecords, isInspectorContactRoleMode]);

  const appMemoryModules = useMemo(() => getRegisteredAppMemoryModules(), []);

  const appMemoryModuleMap = useMemo(
    () => new Map(appMemoryModules.map((item) => [item.appId, item])),
    [appMemoryModules]
  );

  const appItems = useMemo(() => {
    const appIdSet = new Set<string>();
    appMemoryModules.forEach((item) => {
      if (!item.defaultSpace || item.defaultSpace === selectedSpace) {
        appIdSet.add(item.appId);
      }
    });
    scopedRecords.forEach((item) => appIdSet.add(item.appId));

    return [...appIdSet]
      .map((appId) => {
        const manifest = getAppById(appId);
        return {
          id: appId,
          name: manifest?.name || appId,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  }, [appMemoryModules, scopedRecords, selectedSpace]);

  useEffect(() => {
    if (appItems.length === 0) {
      if (activeAppId !== null) setActiveAppId(null);
      return;
    }

    if (!activeAppId || !appItems.some((item) => item.id === activeAppId)) {
      setActiveAppId(appItems[0].id);
    }
  }, [appItems, activeAppId]);

  const resolveContactName = (appId: string, contactId: string): string => {
    const normalizedId = normalizeAppMemoryRoleId(contactId);
    if (isInspectorContactRoleMode) {
      const mappedRoleName = roleDisplayNameMap.get(normalizedId);
      if (mappedRoleName) return mappedRoleName;
    }

    const roleCharacterRoleId = parseRoleCharacterId(contactId);
    if (roleCharacterRoleId) {
      return roleDisplayNameMap.get(roleCharacterRoleId) || roleCharacterRoleId;
    }

    const module = appMemoryModuleMap.get(appId);
    const moduleResolvedName = module?.resolveContactName?.(contactId);
    if (moduleResolvedName) return moduleResolvedName;

    const contactRoleId = parseContactRoleId(contactId);
    if (contactRoleId) {
      return contactNameMap.get(contactRoleId) || contactRoleId;
    }

    return contactNameMap.get(contactId) || roleDisplayNameMap.get(normalizedId) || contactId;
  };

  const resolveContactFilterGroupId = (contactId: string): string => {
    if (!isInspectorContactRoleMode) return contactId;

    const roleCharacterRoleId = parseRoleCharacterId(contactId);
    if (roleCharacterRoleId) return `role-group:${roleCharacterRoleId}`;

    const normalizedId = normalizeAppMemoryRoleId(contactId);
    if (roleDisplayNameMap.has(normalizedId)) return `role-group:${normalizedId}`;

    return contactId;
  };

  const activeRecords = useMemo(() => {
    if (!activeAppId) return [];

    return [...scopedRecords]
      .filter((item) => item.appId === activeAppId)
      .sort((left, right) => right.timestamp - left.timestamp);
  }, [scopedRecords, activeAppId]);

  const contactFilterMeta = useMemo(() => {
    if (!activeAppId) {
      return {
        options: [] as Array<{ id: string; name: string }>,
        groupedContactIdMap: new Map<string, Set<string>>(),
      };
    }

    const nameByOptionId = new Map<string, string>();
    const groupedContactIdMap = new Map<string, Set<string>>();

    activeRecords.forEach((item) => {
      const optionId = resolveContactFilterGroupId(item.contactId);
      if (!nameByOptionId.has(optionId)) {
        nameByOptionId.set(optionId, resolveContactName(activeAppId, item.contactId));
      }
      const groupedContactIds = groupedContactIdMap.get(optionId) || new Set<string>();
      groupedContactIds.add(item.contactId);
      groupedContactIdMap.set(optionId, groupedContactIds);
    });

    return {
      options: [...nameByOptionId.entries()].map(([id, name]) => ({ id, name })),
      groupedContactIdMap,
    };
  }, [
    activeAppId,
    activeRecords,
    appMemoryModuleMap,
    contactNameMap,
    isInspectorContactRoleMode,
    roleDisplayNameMap,
  ]);
  const contactFilterOptions = contactFilterMeta.options;

  useEffect(() => {
    if (!activeAppId) {
      if (selectedContactId !== 'all') setSelectedContactId('all');
      return;
    }

    if (selectedContactId === 'all') return;
    const hasSelectedContact = contactFilterOptions.some((item) => item.id === selectedContactId);
    if (!hasSelectedContact) {
      setSelectedContactId('all');
    }
  }, [activeAppId, contactFilterOptions, selectedContactId]);

  const filteredRecords = useMemo(() => {
    if (selectedContactId === 'all') return activeRecords;
    const groupedContactIds = contactFilterMeta.groupedContactIdMap.get(selectedContactId);
    if (groupedContactIds && groupedContactIds.size > 0) {
      return activeRecords.filter((item) => groupedContactIds.has(item.contactId));
    }
    return activeRecords.filter((item) => item.contactId === selectedContactId);
  }, [activeRecords, contactFilterMeta.groupedContactIdMap, selectedContactId]);
  const recordsVirtualizer = useVirtualizer({
    count: filteredRecords.length,
    getScrollElement: () => recordsScrollRef.current,
    estimateSize: () => 146,
    overscan: 8,
  });

  useEffect(() => {
    if (!recordsScrollRef.current) return;
    recordsScrollRef.current.scrollTo({ top: 0 });
  }, [activeAppId, selectedContactId, selectedSpace, effectiveRoleId]);

  const handleClearCurrent = () => {
    if (isInspectorReadOnlyMode) return;
    if (!activeAppId || filteredRecords.length === 0) return;

    const activeAppName = appItems.find((item) => item.id === activeAppId)?.name || activeAppId;
    const scopeLabel = selectedSpace === 'social' ? '社交空间' : '个人空间';
    const shouldClear = window.confirm(
      selectedContactId === 'all'
        ? `确认清空 ${activeRoleName} · ${scopeLabel} 中 ${activeAppName} 的全部记忆吗？`
        : '确认清空该联系人的记忆记录吗？'
    );
    if (!shouldClear) return;

    clearAppMemories(activeAppId, selectedContactId === 'all' ? undefined : selectedContactId, {
      roleId: effectiveRoleId,
      space: selectedSpace,
    });
  };

  const threshold = normalizeThreshold(memoryAutoSummaryThreshold);
  const maxRounds = normalizeSummaryMaxRounds(memoryAutoSummaryMaxRounds);
  const minBatch = normalizeSummaryMinBatch(memoryAutoSummaryMinBatch);
  const maxBatch = normalizeSummaryMaxBatch(memoryAutoSummaryMaxBatch, minBatch);
  const keepRecentMin = normalizeSummaryKeepRecentMin(memoryAutoSummaryKeepRecentMin);
  const keepRecentRatio = normalizeSummaryKeepRecentRatio(memoryAutoSummaryKeepRecentRatio);
  const keepRecentRatioPercent = Math.round(keepRecentRatio * 100);
  const normalizedMemoryModel = (memoryModel || '').trim();
  const resolvedMemoryModelLabel = normalizedMemoryModel;

  const handleMinBatchChange = (nextValue: number) => {
    const nextMinBatch = normalizeSummaryMinBatch(nextValue);
    updateSettings({
      memoryAutoSummaryMinBatch: nextMinBatch,
      ...(maxBatch < nextMinBatch ? { memoryAutoSummaryMaxBatch: nextMinBatch } : {}),
    });
  };

  const handleMaxBatchChange = (nextValue: number) => {
    const nextMaxBatch = normalizeSummaryMaxBatch(nextValue, minBatch);
    updateSettings({ memoryAutoSummaryMaxBatch: nextMaxBatch });
  };

  const handleResetAutoSummaryConfig = () => {
    updateSettings({
      memoryAutoSummaryThreshold: DEFAULT_MEMORY_SUMMARY_THRESHOLD,
      memoryAutoSummaryMaxRounds: DEFAULT_MEMORY_SUMMARY_MAX_ROUNDS,
      memoryAutoSummaryMinBatch: DEFAULT_MEMORY_SUMMARY_MIN_BATCH,
      memoryAutoSummaryMaxBatch: DEFAULT_MEMORY_SUMMARY_MAX_BATCH,
      memoryAutoSummaryKeepRecentMin: DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_MIN,
      memoryAutoSummaryKeepRecentRatio: DEFAULT_MEMORY_SUMMARY_KEEP_RECENT_RATIO,
    });
  };

  const isConfigView = currentView === 'autoSummaryConfig';
  const allAutoSummaryProgress = useMemo(
    () =>
      Object.values(autoSummaryProgressByApp).sort((left, right) => right.updatedAt - left.updatedAt),
    [autoSummaryProgressByApp]
  );
  const runningAutoSummaryProgress = useMemo(
    () => allAutoSummaryProgress.find((item) => item.running) || null,
    [allAutoSummaryProgress]
  );
  const latestAutoSummaryProgress = allAutoSummaryProgress[0] || null;
  const displayAutoSummaryProgress = runningAutoSummaryProgress || latestAutoSummaryProgress;
  const autoSummaryPercent = displayAutoSummaryProgress
    ? getAutoSummaryProgressPercent(displayAutoSummaryProgress)
    : 0;
  const progressAppName =
    displayAutoSummaryProgress?.appId
      ? getAppById(displayAutoSummaryProgress.appId)?.name || displayAutoSummaryProgress.appId
      : '';
  const progressContactName =
    displayAutoSummaryProgress?.appId && displayAutoSummaryProgress.contactId
      ? resolveContactName(displayAutoSummaryProgress.appId, displayAutoSummaryProgress.contactId)
      : '';

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-br from-[#F7FBFF] via-[#F8FCFF] to-[#F6F8FF] text-slate-800"
    >
      <div className="px-4 pt-12 pb-4 border-b border-slate-200/80 bg-white/75 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (isConfigView) {
                setCurrentView('records');
                return;
              }
              onClose();
            }}
            className="h-9 inline-flex items-center gap-1.5 text-slate-700 active:opacity-70"
          >
            <ChevronLeft size={22} />
            <span className="text-[15px]">返回</span>
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">
            {isConfigView ? '自动总结配置' : '记忆中心'}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 inline-flex items-center justify-center text-slate-500 active:opacity-70"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-slate-500">
          {isConfigView
            ? '这里可以调整自动总结策略参数'
            : '统一管理所有 App 的 AI 交互记忆'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 space-y-4">
        {isConfigView ? (
          <section className="rounded-3xl border border-slate-200 bg-white/95 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">自动总结配置</h2>
            <button
              type="button"
              onClick={handleResetAutoSummaryConfig}
                className="h-7 rounded-full border border-slate-200 px-2.5 text-[12px] text-slate-600 active:opacity-70"
              >
                恢复默认
              </button>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-medium text-slate-900">自动总结进度</div>
                {displayAutoSummaryProgress?.running ? (
                  <span className="inline-flex items-center gap-1 text-[12px] text-blue-600">
                    <RefreshCw size={12} className="animate-spin" />
                    运行中
                  </span>
                ) : null}
              </div>
              {displayAutoSummaryProgress ? (
                <>
                  <div className="mt-2 text-[12px] text-slate-600">
                    状态：{getAutoSummaryStageLabel(displayAutoSummaryProgress.stage)}
                    {progressAppName ? ` · 应用：${progressAppName}` : ''}
                    {progressContactName ? ` · 联系人：${progressContactName}` : ''}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    第 {Math.max(1, displayAutoSummaryProgress.round)}/{displayAutoSummaryProgress.maxRounds} 轮
                    {displayAutoSummaryProgress.currentBatchSize > 0
                      ? ` · 本轮 ${displayAutoSummaryProgress.currentBatchSize} 条`
                      : ''}
                    {' · '}
                    已压缩 {displayAutoSummaryProgress.compressedCount} 条
                  </div>
                  {displayAutoSummaryProgress.errorMessage ? (
                    <div className="mt-1 text-[12px] text-rose-500">
                      {displayAutoSummaryProgress.errorMessage}
                    </div>
                  ) : null}
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        displayAutoSummaryProgress.stage === 'failed'
                          ? 'bg-rose-400'
                          : displayAutoSummaryProgress.stage === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${autoSummaryPercent}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-2 text-[12px] text-slate-500">
                  暂无自动总结进度，触发总结后会在这里显示状态。
                </div>
              )}
            </div>
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">自动总结阈值（条）</p>
                  <span className="text-[13px] text-violet-600 font-medium">{threshold}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="5"
                  value={threshold}
                  onChange={(event) =>
                    updateSettings({
                      memoryAutoSummaryThreshold: parseInt(event.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">单次触发最大轮数</p>
                  <span className="text-[13px] text-violet-600 font-medium">{maxRounds} 轮</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={maxRounds}
                  onChange={(event) =>
                    updateSettings({
                      memoryAutoSummaryMaxRounds: parseInt(event.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">每轮最少压缩条数</p>
                  <span className="text-[13px] text-violet-600 font-medium">{minBatch} 条</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="80"
                  step="1"
                  value={minBatch}
                  onChange={(event) => handleMinBatchChange(parseInt(event.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">每轮最多压缩条数</p>
                  <span className="text-[13px] text-violet-600 font-medium">{maxBatch} 条</span>
                </div>
                <input
                  type="range"
                  min={String(minBatch)}
                  max="200"
                  step="1"
                  value={maxBatch}
                  onChange={(event) => handleMaxBatchChange(parseInt(event.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">近期最少保留条数</p>
                  <span className="text-[13px] text-violet-600 font-medium">{keepRecentMin} 条</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={keepRecentMin}
                  onChange={(event) =>
                    updateSettings({
                      memoryAutoSummaryKeepRecentMin: parseInt(event.target.value, 10),
                    })
                  }
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <p className="text-[14px] text-slate-800">近期保留比例</p>
                  <span className="text-[13px] text-violet-600 font-medium">
                    {keepRecentRatioPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={keepRecentRatioPercent}
                  onChange={(event) =>
                    updateSettings({
                      memoryAutoSummaryKeepRecentRatio:
                        parseInt(event.target.value, 10) / 100,
                    })
                  }
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            </div>

            <p className="mt-3 text-[12px] text-slate-500">当前记忆模型：{resolvedMemoryModelLabel || '未配置'}</p>
            <p className="mt-1 text-[12px] text-slate-500">
              大模型 API（地址/密钥/模型）请在设置的 API 配置页调整。
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white/95 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-slate-900">自动总结配置</h2>
                <button
                  type="button"
                  disabled={isInspectorReadOnlyMode}
                  onClick={() => {
                    if (isInspectorReadOnlyMode) return;
                    setCurrentView('autoSummaryConfig');
                  }}
                  className="h-8 rounded-full border border-slate-200 px-3 text-[12px] text-slate-700 active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  进入配置
                </button>
              </div>
              <p className="mt-2 text-[12px] text-slate-500">
                当前阈值：{threshold} 条，单次最大 {maxRounds} 轮，当前记忆模型：{resolvedMemoryModelLabel || '未配置'}。
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/95 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-slate-500">当前身份：{activeRoleName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSpace('social')}
                  className={`h-8 rounded-full px-3 text-[12px] border ${
                    selectedSpace === 'social'
                      ? 'bg-[#4E83C5]/10 text-[#4E83C5] border-[#4E83C5]/30'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  社交空间
                </button>
                {!isInspectorReadOnlyMode ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSpace('personal')}
                    className={`h-8 rounded-full px-3 text-[12px] border ${
                      selectedSpace === 'personal'
                        ? 'bg-[#4E83C5]/10 text-[#4E83C5] border-[#4E83C5]/30'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    个人空间
                  </button>
                ) : null}
              </div>
            </section>

            {appItems.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center">
                <div className="text-[15px] font-medium text-slate-700">暂无记忆记录</div>
                <p className="mt-2 text-[12px] text-slate-500">
                  当前身份在该空间下暂无记录。                </p>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white/90 px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {appItems.map((item) => {
                      const isActive = item.id === activeAppId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveAppId(item.id)}
                          className={`h-8 rounded-full px-3 text-[12px] border ${
                            isActive
                              ? 'bg-[#4E83C5]/10 text-[#4E83C5] border-[#4E83C5]/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeAppId ? (
                  <section className="rounded-3xl border border-[#E8ECF3] bg-white/95 px-4 py-4 shadow-[0_14px_36px_-22px_rgba(31,41,55,0.45)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Brain size={17} className="text-[#4E83C5]" />
                        <h2 className="text-[15px] font-semibold text-slate-900">
                          {(appItems.find((item) => item.id === activeAppId)?.name || activeAppId) +
                            ` · ${activeRecords.length} 条记忆`}
                        </h2>
                      </div>
                      {!isInspectorReadOnlyMode ? (
                        <button
                          type="button"
                          onClick={handleClearCurrent}
                          className="h-8 rounded-full border border-slate-200 px-3 text-[12px] text-slate-700 inline-flex items-center gap-1.5 active:opacity-70"
                        >
                          <Eraser size={14} />
                          清空
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedContactId('all')}
                        className={`h-8 rounded-full px-3 text-[12px] border ${
                          selectedContactId === 'all'
                            ? 'bg-[#4E83C5]/10 text-[#4E83C5] border-[#4E83C5]/30'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        全部
                      </button>
                      {contactFilterOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedContactId(option.id)}
                          className={`h-8 rounded-full px-3 text-[12px] border ${
                            selectedContactId === option.id
                              ? 'bg-[#4E83C5]/10 text-[#4E83C5] border-[#4E83C5]/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>

                    {filteredRecords.length === 0 ? (
                      <div className="py-14 text-center text-[13px] text-slate-500">
                        当前范围暂无记忆记录
                      </div>
                    ) : (
                      <div
                        ref={recordsScrollRef}
                        className="mt-3 max-h-[58vh] overflow-y-auto pr-1"
                      >
                        <div
                          className="relative w-full"
                          style={{ height: `${recordsVirtualizer.getTotalSize()}px` }}
                        >
                          {recordsVirtualizer.getVirtualItems().map((virtualRow) => {
                            const record = filteredRecords[virtualRow.index];
                            if (!record) return null;

                            const module = appMemoryModuleMap.get(record.appId);
                            const sourceLabel =
                              module?.resolveSourceLabel?.(record) || record.sourceType || undefined;

                            return (
                              <div
                                key={record.id}
                                data-index={virtualRow.index}
                                ref={recordsVirtualizer.measureElement}
                                className="absolute left-0 top-0 w-full pb-2"
                                style={{ transform: `translateY(${virtualRow.start}px)` }}
                              >
                                <article className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.35)]">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                          {resolveContactName(record.appId, record.contactId)}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                          {getRoleLabel(record.role)}
                                        </span>
                                        <span>{formatMemoryTime(record.timestamp)}</span>
                                        {sourceLabel ? (
                                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                            {sourceLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 text-[14px] leading-6 text-slate-900 whitespace-pre-wrap break-words">
                                        {record.content}
                                      </p>
                                    </div>
                                    {!isInspectorReadOnlyMode ? (
                                      <button
                                        type="button"
                                        onClick={() => removeAppMemoryById(record.appId, record.id)}
                                        className="shrink-0 text-[12px] text-slate-500 inline-flex items-center gap-1 active:opacity-70"
                                      >
                                        <Trash2 size={13} />
                                        删除
                                      </button>
                                    ) : null}
                                  </div>
                                </article>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export type { MemoryCenterAppProps };


