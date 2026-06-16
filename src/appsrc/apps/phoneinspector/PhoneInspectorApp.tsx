import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { getAppById, getAppComponent } from '../../../core/registry';
import { isSystemAppId } from '../../../core/systemApps';
import { useAppMemoryCenterStore } from '../../../core/appMemoryCenter';
import { useInstalledAppIdsSnapshotBridge } from '../../shared/business/appmarket/installSnapshotBridge';
import { useContactsSnapshotBridge } from '../../shared/business/contacts/snapshotBridge';
import { createContactRoleId } from '../../shared/business/roleIdentity';
import {
  clearRuntimeActiveRoleId,
  getRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { useContactsStore } from '../contacts/store';
import { useDailyWordsStore } from '../dailywords/store';
import { useWeChatStore } from '../WeChat/store';
import { RolePhoneDesktopPage, RoleSelectPage, type InspectablePhoneApp } from './components';
import {
  generatePhoneInspectorInitialSnapshot,
  generatePhoneInspectorSupplementSnapshot,
  getPhoneInspectorDateKey,
  type PhoneInspectorGeneratedSnapshot,
} from './phoneInspectorGenerator';
import type { PhoneInspectorAppProps } from './types';

const INSPECTABLE_APP_IDS = ['wechat', 'contacts', 'dailywords'] as const;
type InspectableAppId = (typeof INSPECTABLE_APP_IDS)[number];

const SUB_APP_PARAMS: Partial<Record<(typeof INSPECTABLE_APP_IDS)[number], Record<string, unknown>>> = {
  wechat: { mode: 'inspector' },
  contacts: { initialTab: 'phone' },
  dailywords: { mode: 'inspector', readOnly: true },
};

const getBootstrapKey = (contactId: string): string => `${contactId}:bootstrap`;
const getSupplementKey = (contactId: string, nonce = 0): string => `${contactId}:supplement:${nonce || 'latest'}`;
const getReconnectKey = (contactId: string, nonce = 0): string => `${contactId}:reconnect:${nonce || 'latest'}`;

interface PhoneInspectorBackgroundTask {
  key: string;
  roleId: string;
  contactId: string;
  contactName: string;
  promise: Promise<PhoneInspectorGeneratedSnapshot>;
  startedAt: number;
}

const phoneInspectorBackgroundTasks = new Map<string, PhoneInspectorBackgroundTask>();
const importedPhoneInspectorBackgroundTaskKeys = new Set<string>();

const getOrCreatePhoneInspectorBackgroundTask = (
  key: string,
  roleId: string,
  contact: { id: string; name: string },
  runner: () => Promise<PhoneInspectorGeneratedSnapshot>
): PhoneInspectorBackgroundTask => {
  const existing = phoneInspectorBackgroundTasks.get(key);
  if (existing) return existing;

  const task: PhoneInspectorBackgroundTask = {
    key,
    roleId,
    contactId: contact.id,
    contactName: contact.name,
    startedAt: Date.now(),
    promise: runner(),
  };
  phoneInspectorBackgroundTasks.set(key, task);
  task.promise.then(
    () => phoneInspectorBackgroundTasks.delete(key),
    () => phoneInspectorBackgroundTasks.delete(key)
  );
  return task;
};

const summarizeGenerationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return '未知错误';
};

const withRuntimeRole = <T,>(roleId: string, runner: () => T): T => {
  const previousRoleId = getRuntimeActiveRoleId();
  setRuntimeActiveRoleId(roleId);
  try {
    return runner();
  } finally {
    if (previousRoleId) {
      setRuntimeActiveRoleId(previousRoleId);
    } else {
      clearRuntimeActiveRoleId();
    }
  }
};

export const PhoneInspectorApp: React.FC<PhoneInspectorAppProps> = ({ onClose }) => {
  const contacts = useContactsSnapshotBridge();
  const installedAppIds = useInstalledAppIdsSnapshotBridge();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeSubAppId, setActiveSubAppId] = useState<string | null>(null);
  const [generatingKeys, setGeneratingKeys] = useState<Record<string, boolean>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [readyContactIds, setReadyContactIds] = useState<Record<string, boolean>>({});
  const [supplementReadyContactIds, setSupplementReadyContactIds] = useState<Record<string, boolean>>({});
  const [supplementGeneratingContactIds, setSupplementGeneratingContactIds] = useState<Record<string, boolean>>({});
  const [forceReconnectKeys, setForceReconnectKeys] = useState<Record<string, number>>({});
  const [isClearPickerOpen, setIsClearPickerOpen] = useState(false);
  const generationInFlightRef = useRef<Set<string>>(new Set());
  const handledGenerationKeysRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);
  const importWeChatInspectorSnapshot = useWeChatStore((state) => state.importWeChatInspectorSnapshot);
  const clearWeChatInspectorSnapshot = useWeChatStore((state) => state.clearWeChatInspectorSnapshot);
  const clearWeChatInspectorContacts = useWeChatStore((state) => state.clearWeChatInspectorContacts);
  const setWeChatCurrentSession = useWeChatStore((state) => state.setWeChatCurrentSession);
  const callRecords = useContactsStore((state) => state.callRecords);
  const dailyWordsStateByRoleId = useDailyWordsStore((state) => state.dailyWordsStateByRoleId);
  const importInspectorCallRecords = useContactsStore((state) => state.importInspectorCallRecords);
  const clearInspectorCallRecords = useContactsStore((state) => state.clearInspectorCallRecords);
  const importInspectorDailyWordsEntries = useDailyWordsStore((state) => state.importInspectorEntries);
  const clearInspectorDailyWordsEntries = useDailyWordsStore((state) => state.clearInspectorEntries);
  const recordAppInteraction = useAppMemoryCenterStore((state) => state.recordAppInteraction);
  const clearAppMemories = useAppMemoryCenterStore((state) => state.clearAppMemories);
  const installedAppIdSet = useMemo(() => new Set(installedAppIds), [installedAppIds]);

  const selectedContact = useMemo(
    () => contacts.find((item) => item.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const inspectableApps = useMemo<InspectablePhoneApp[]>(
    () =>
      INSPECTABLE_APP_IDS.map((appId) => getAppById(appId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter((app) => app.id === 'dailywords' || isSystemAppId(app.id) || installedAppIdSet.has(app.id))
        .map((app) => ({
          id: app.id,
          name: app.name,
          icon: app.icon,
        })),
    [installedAppIdSet]
  );

  const clearTargetApps = useMemo<InspectablePhoneApp[]>(
    () => inspectableApps.filter((app) => INSPECTABLE_APP_IDS.includes(app.id as InspectableAppId)),
    [inspectableApps]
  );

  useEffect(() => {
    if (!selectedContactId) {
      clearRuntimeActiveRoleId();
      return;
    }

    setRuntimeActiveRoleId(createContactRoleId(selectedContactId));
    return () => {
      clearRuntimeActiveRoleId();
    };
  }, [selectedContactId]);

  useEffect(
    () => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    },
    []
  );

  useEffect(
    () => () => {
      clearRuntimeActiveRoleId();
    },
    []
  );

  useEffect(() => {
    if (!selectedContactId) return;
    if (contacts.some((item) => item.id === selectedContactId)) return;
    setActiveSubAppId(null);
    setSelectedContactId(null);
  }, [contacts, selectedContactId]);

  const ActiveSubApp = activeSubAppId ? getAppComponent(activeSubAppId) : null;

  useEffect(() => {
    if (!selectedContact) return;

    const todayKey = getPhoneInspectorDateKey();
    const runIdPart = `inspector-${todayKey}-`;
    const roleId = createContactRoleId(selectedContact.id);
    const roleState = wechatStateByRoleId[roleId];
    const hasContacts = roleState?.wechatSessions?.some(
      (session) =>
        session.inspectorGeneratedContact?.sourceContactId === selectedContact.id &&
        session.messages.length === 0 &&
        session.id.includes(runIdPart)
    );
    const hasChats = roleState?.wechatSessions?.some(
      (session) =>
        session.inspectorGeneratedContact?.sourceContactId === selectedContact.id &&
        session.messages.length > 0 &&
        session.id.includes(runIdPart)
    );
    const hasTransfers = roleState?.wechatBills?.some(
      (bill) => bill.inspectorGeneratedSourceContactId === selectedContact.id && bill.id.includes(runIdPart)
    );
    const hasCallRecords = callRecords.some(
      (record) =>
        record.inspectorGeneratedSourceContactId === selectedContact.id &&
        record.id.includes(runIdPart)
    );
    const hasDailyWords = (dailyWordsStateByRoleId[roleId]?.entries || []).some(
      (entry) => entry.id.includes(runIdPart)
    );
    const forceReconnectKey = forceReconnectKeys[selectedContact.id] || 0;

    const initialReady = !forceReconnectKey && Boolean(hasContacts && hasChats);
    const supplementReady = !forceReconnectKey && Boolean(hasTransfers && hasCallRecords && hasDailyWords);

    if (!forceReconnectKey && initialReady && !readyContactIds[selectedContact.id]) {
      setReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
    }

    if (!forceReconnectKey && supplementReady && !supplementReadyContactIds[selectedContact.id]) {
      setSupplementReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
    }

    if (initialReady) {
      if (supplementReady || supplementGeneratingContactIds[selectedContact.id]) return;
      const supplementKey = forceReconnectKey
        ? getReconnectKey(selectedContact.id, forceReconnectKey)
        : getSupplementKey(selectedContact.id);
      if (generationInFlightRef.current.has(supplementKey) || generationErrors[supplementKey]) return;

      generationInFlightRef.current.add(supplementKey);
      setSupplementGeneratingContactIds((current) => ({ ...current, [selectedContact.id]: true }));
      setGeneratingKeys((current) => ({ ...current, [supplementKey]: true }));
      setGenerationErrors((current) => {
        const next = { ...current };
        delete next[supplementKey];
        return next;
      });

      const currentSessions = roleState?.wechatSessions?.filter(
        (session) =>
          session.inspectorGeneratedContact?.sourceContactId === selectedContact.id &&
          session.id.includes(runIdPart)
      ) || [];
      const initialSnapshot: PhoneInspectorGeneratedSnapshot = {
        sourceContactId: selectedContact.id,
        sessions: currentSessions,
        bills: [],
        callRecords: [],
        dailyWordsEntries: [],
      };

      const task = getOrCreatePhoneInspectorBackgroundTask(
        supplementKey,
        roleId,
        selectedContact,
        () => generatePhoneInspectorSupplementSnapshot(roleId, selectedContact, initialSnapshot)
      );
      task.promise
        .then((snapshot) => {
          if (handledGenerationKeysRef.current.has(supplementKey) || importedPhoneInspectorBackgroundTaskKeys.has(supplementKey)) return;
          handledGenerationKeysRef.current.add(supplementKey);
          importedPhoneInspectorBackgroundTaskKeys.add(supplementKey);
          importWeChatInspectorSnapshot(roleId, snapshot);
          importInspectorCallRecords(snapshot.sourceContactId, snapshot.callRecords);
          withRuntimeRole(roleId, () => {
            importInspectorDailyWordsEntries(roleId, snapshot.dailyWordsEntries);
          });
          if (isMountedRef.current) {
            setSupplementReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
            if (forceReconnectKey) {
              setForceReconnectKeys((current) => ({ ...current, [selectedContact.id]: 0 }));
            }
          }
        })
        .catch((error) => {
          console.error('[PhoneInspector] supplement AI generation failed:', error);
          const message = `后台补齐失败：${summarizeGenerationError(error)}`;
          if (isMountedRef.current) {
            setGenerationErrors((current) => ({ ...current, [supplementKey]: message }));
          }
        })
        .finally(() => {
          generationInFlightRef.current.delete(supplementKey);
          if (isMountedRef.current) {
            setGeneratingKeys((current) => ({ ...current, [supplementKey]: false }));
            setSupplementGeneratingContactIds((current) => ({ ...current, [selectedContact.id]: false }));
          }
        });
      return;
    }

    const key = forceReconnectKey
      ? getReconnectKey(selectedContact.id, forceReconnectKey)
      : getBootstrapKey(selectedContact.id);
    if (generationInFlightRef.current.has(key) || generationErrors[key]) return;

    generationInFlightRef.current.add(key);
    setGeneratingKeys((current) => ({ ...current, [key]: true }));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    const task = getOrCreatePhoneInspectorBackgroundTask(
      key,
      roleId,
      selectedContact,
      () => generatePhoneInspectorInitialSnapshot(roleId, selectedContact)
    );
    task.promise
      .then((snapshot) => {
        if (handledGenerationKeysRef.current.has(key) || importedPhoneInspectorBackgroundTaskKeys.has(key)) return;
        handledGenerationKeysRef.current.add(key);
        importedPhoneInspectorBackgroundTaskKeys.add(key);
        importWeChatInspectorSnapshot(roleId, snapshot);
        if (isMountedRef.current) {
          setReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
          if (forceReconnectKey) {
            setForceReconnectKeys((current) => ({ ...current, [selectedContact.id]: 0 }));
          }
        }
      })
      .catch((error) => {
        console.error('[PhoneInspector] bootstrap AI generation failed:', error);
        const message = `AI 生成失败：${summarizeGenerationError(error)}`;
        if (isMountedRef.current) {
          setGenerationErrors((current) => ({ ...current, [key]: message }));
        }
      })
      .finally(() => {
        generationInFlightRef.current.delete(key);
        if (isMountedRef.current) {
          setGeneratingKeys((current) => ({ ...current, [key]: false }));
        }
      });
  }, [
    generationErrors,
    callRecords,
    dailyWordsStateByRoleId,
    forceReconnectKeys,
    importInspectorCallRecords,
    importInspectorDailyWordsEntries,
    importWeChatInspectorSnapshot,
    readyContactIds,
    selectedContact,
    supplementGeneratingContactIds,
    supplementReadyContactIds,
    wechatStateByRoleId,
  ]);

  const activeSubAppContext = useMemo(
    () => ({
      activeAppId: activeSubAppId,
      params: activeSubAppId
        ? SUB_APP_PARAMS[activeSubAppId as (typeof INSPECTABLE_APP_IDS)[number]]
        : undefined,
    }),
    [activeSubAppId]
  );

  const handleCloseApp = () => {
    clearRuntimeActiveRoleId();
    onClose();
  };

  const handleHideToDesktop = () => {
    handleBackToRoles();
  };

  const handleBackToRoles = () => {
    setActiveSubAppId(null);
    setSelectedContactId(null);
    clearRuntimeActiveRoleId();
  };

  const handleOpenSubApp = async (appId: string) => {
    if (!isSelectedContactReady) return;
    if (!isSupplementReadySelected && (appId === 'contacts' || appId === 'dailywords')) return;
    setActiveSubAppId(appId);
  };

  const handleReconnect = () => {
    if (!selectedContact) return;
    setActiveSubAppId(null);
    setReadyContactIds((current) => ({ ...current, [selectedContact.id]: false }));
    setSupplementReadyContactIds((current) => ({ ...current, [selectedContact.id]: false }));
    setSupplementGeneratingContactIds((current) => ({ ...current, [selectedContact.id]: false }));
    generationInFlightRef.current.delete(getBootstrapKey(selectedContact.id));
    generationInFlightRef.current.delete(getSupplementKey(selectedContact.id));
    handledGenerationKeysRef.current.delete(getBootstrapKey(selectedContact.id));
    handledGenerationKeysRef.current.delete(getSupplementKey(selectedContact.id));
    importedPhoneInspectorBackgroundTaskKeys.delete(getBootstrapKey(selectedContact.id));
    importedPhoneInspectorBackgroundTaskKeys.delete(getSupplementKey(selectedContact.id));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[getBootstrapKey(selectedContact.id)];
      delete next[getSupplementKey(selectedContact.id)];
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${selectedContact.id}:reconnect:`)) delete next[key];
      });
      return next;
    });
    setForceReconnectKeys((current) => ({
      ...current,
      [selectedContact.id]: Date.now(),
    }));
  };

  const handleClearPhone = () => {
    if (!selectedContact) return;
    setIsClearPickerOpen(true);
  };

  const recordClearActionMemory = (appId: InspectableAppId, appName: string, roleId: string) => {
    if (!selectedContact) return;
    recordAppInteraction({
      appId: 'memorycenter',
      roleId,
      space: 'social',
      contactId: selectedContact.id,
      sourceType: 'phone-inspector-clear',
      sourceId: `phone-inspector-clear-${appId}-${Date.now()}`,
      role: 'user',
      content: `查手机中清除了「${appName}」的内容`,
      timestamp: Date.now(),
    });
  };

  const handleClearApp = (appId: string) => {
    if (!selectedContact) return;
    if (!INSPECTABLE_APP_IDS.includes(appId as InspectableAppId)) return;
    const targetAppId = appId as InspectableAppId;
    const appName = getAppById(targetAppId)?.name || targetAppId;
    const confirmed = window.confirm(`确定清除 ${selectedContact.name} 手机中「${appName}」的内容吗？`);
    if (!confirmed) return;

    const roleId = createContactRoleId(selectedContact.id);
    setActiveSubAppId(null);

    if (targetAppId === 'wechat') {
      clearWeChatInspectorSnapshot(roleId, selectedContact.id);
      setWeChatCurrentSession(null);
    } else if (targetAppId === 'contacts') {
      clearWeChatInspectorContacts(roleId, selectedContact.id);
      clearInspectorCallRecords(selectedContact.id);
    } else if (targetAppId === 'dailywords') {
      clearInspectorDailyWordsEntries(roleId);
      clearAppMemories('dailywords', undefined, { roleId, space: 'personal' });
      clearAppMemories('dailywords', undefined, { roleId, space: 'social' });
    }

    recordClearActionMemory(targetAppId, appName, roleId);
    setIsClearPickerOpen(false);
    setReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[getBootstrapKey(selectedContact.id)];
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${selectedContact.id}:reconnect:`)) delete next[key];
      });
      return next;
    });
  };

  const selectedGenerationKeys = selectedContact
    ? [
        getBootstrapKey(selectedContact.id),
        getReconnectKey(selectedContact.id, forceReconnectKeys[selectedContact.id] || 0),
      ]
    : [];
  const isGeneratingSelected = selectedGenerationKeys.some((key) => generatingKeys[key]);
  const selectedGenerationError = selectedGenerationKeys
    .map((key) => generationErrors[key])
    .find(Boolean);
  const isSelectedContactReady = selectedContact ? Boolean(readyContactIds[selectedContact.id]) : false;
  const isSupplementReadySelected = selectedContact ? Boolean(supplementReadyContactIds[selectedContact.id]) : false;
  const loadingAppIds = selectedContact && isSelectedContactReady && !isSupplementReadySelected
    ? ['contacts', 'dailywords']
    : [];

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-sky-50 via-blue-50 to-emerald-50 text-slate-800"
    >
      {!selectedContact ? (
        <RoleSelectPage
          contacts={contacts}
          onClose={handleCloseApp}
          onSelectContact={(contactId) => {
            setActiveSubAppId(null);
            setSelectedContactId(contactId);
          }}
        />
      ) : selectedGenerationError ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-[42px] font-light text-white shadow-[0_18px_34px_-20px_rgba(220,38,38,0.8)]">
            ×
          </div>
          <h2 className="text-[20px] font-semibold text-slate-900">读取失败</h2>
          <p className="mt-3 max-w-[320px] text-[13px] leading-6 text-slate-600">
            {selectedGenerationError}
          </p>
          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={handleBackToRoles}
              className="rounded-full bg-white/90 px-5 py-2 text-[14px] font-medium text-slate-700 shadow-sm active:bg-white"
            >
              返回
            </button>
            <button
              type="button"
              onClick={handleReconnect}
              className="rounded-full bg-slate-900 px-5 py-2 text-[14px] font-medium text-white shadow-sm active:bg-slate-700"
            >
              重试
            </button>
          </div>
        </div>
      ) : !isSelectedContactReady ? (
        <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
          <button
            type="button"
            onClick={handleHideToDesktop}
            className="absolute right-5 top-5 rounded-full border border-sky-200/90 bg-white/88 px-4 py-2 text-[13px] font-medium text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] backdrop-blur active:bg-sky-50"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 42px)' }}
          >
            隐藏
          </button>
          <div className="relative mb-7 h-24 w-24">
            <div className="absolute inset-0 rounded-[28px] bg-white/80 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.55)]" />
            <div className="absolute inset-3 rounded-[20px] border border-sky-200 bg-sky-50/70" />
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
          </div>
          <h2 className="text-[20px] font-semibold text-slate-900">正在连接手机</h2>
          <p className="mt-3 text-[14px] text-slate-500">正在读取对方手机中的信息...</p>
        </div>
      ) : (
        <RolePhoneDesktopPage
          contactName={selectedContact.name}
          isReading={isGeneratingSelected}
          generationStatus={
            !isSupplementReadySelected
              ? '转账、通话、日记读取中...'
              : selectedGenerationError || ''
          }
          inspectableApps={inspectableApps}
          loadingAppIds={loadingAppIds}
          clearTargetApps={clearTargetApps}
          isClearPickerOpen={isClearPickerOpen}
          onBackToRoles={handleBackToRoles}
          onReconnect={handleReconnect}
          onClearPhone={handleClearPhone}
          onCancelClearPhone={() => setIsClearPickerOpen(false)}
          onClearApp={handleClearApp}
          onOpenSubApp={handleOpenSubApp}
        >
          {activeSubAppId && ActiveSubApp && (
            <div className="absolute inset-0 z-[120]">
              <ActiveSubApp
                onClose={() => {
                  setActiveSubAppId(null);
                }}
                context={activeSubAppContext}
              />
              {!isSupplementReadySelected ? (
                <div
                  className="pointer-events-none absolute left-1/2 top-5 z-[220] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-[13px] text-white shadow-lg backdrop-blur"
                  style={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
                >
                  后台补齐中...
                </div>
              ) : null}
            </div>
          )}
        </RolePhoneDesktopPage>
      )}
    </motion.div>
  );
};

export type { PhoneInspectorAppProps };
