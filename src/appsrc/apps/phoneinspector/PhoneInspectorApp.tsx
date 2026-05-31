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
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { useContactsStore } from '../contacts/store';
import { useDailyWordsStore } from '../dailywords/store';
import { useLoveSpaceStore } from '../lovespace/store';
import { useWeChatStore } from '../WeChat/store';
import { RolePhoneDesktopPage, RoleSelectPage, type InspectablePhoneApp } from './components';
import { generatePhoneInspectorSnapshot, getPhoneInspectorDateKey } from './phoneInspectorGenerator';
import type { PhoneInspectorAppProps } from './types';

const INSPECTABLE_APP_IDS = ['wechat', 'contacts', 'lovespace', 'memorycenter', 'dailywords'] as const;
type InspectableAppId = (typeof INSPECTABLE_APP_IDS)[number];

const SUB_APP_PARAMS: Partial<Record<(typeof INSPECTABLE_APP_IDS)[number], Record<string, unknown>>> = {
  wechat: { mode: 'inspector' },
  contacts: { initialTab: 'phone' },
  lovespace: { mode: 'inspector', readOnly: true },
  memorycenter: { mode: 'inspector', readOnly: true },
  dailywords: { mode: 'inspector', readOnly: true },
};

const getBootstrapKey = (contactId: string): string => `${contactId}:bootstrap`;
const getReconnectKey = (contactId: string): string => `${contactId}:reconnect`;

const createEmptyLoveSpaceState = () => ({
  bonds: [],
  anniversaries: [],
  moments: [],
  checkInTasks: [],
  checkInRecords: [],
  bondBackgrounds: {},
  importantTimelineByBond: {},
  timelineProcessedRecordIdsByBond: {},
});

const summarizeGenerationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return '未知错误';
};

export const PhoneInspectorApp: React.FC<PhoneInspectorAppProps> = ({ onClose }) => {
  const contacts = useContactsSnapshotBridge();
  const installedAppIds = useInstalledAppIdsSnapshotBridge();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeSubAppId, setActiveSubAppId] = useState<string | null>(null);
  const [generatingKeys, setGeneratingKeys] = useState<Record<string, boolean>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [readyContactIds, setReadyContactIds] = useState<Record<string, boolean>>({});
  const [forceReconnectKeys, setForceReconnectKeys] = useState<Record<string, number>>({});
  const [isClearPickerOpen, setIsClearPickerOpen] = useState(false);
  const generationInFlightRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);
  const importWeChatInspectorSnapshot = useWeChatStore((state) => state.importWeChatInspectorSnapshot);
  const clearWeChatInspectorSnapshot = useWeChatStore((state) => state.clearWeChatInspectorSnapshot);
  const clearWeChatInspectorContacts = useWeChatStore((state) => state.clearWeChatInspectorContacts);
  const setWeChatCurrentSession = useWeChatStore((state) => state.setWeChatCurrentSession);
  const callRecords = useContactsStore((state) => state.callRecords);
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
        .filter((app) => isSystemAppId(app.id) || installedAppIdSet.has(app.id))
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
        generationInFlightRef.current.clear();
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
    const forceReconnectKey = forceReconnectKeys[selectedContact.id] || 0;

    if (!forceReconnectKey && readyContactIds[selectedContact.id]) {
      return;
    }

    if (!forceReconnectKey && hasContacts && hasChats && hasTransfers && hasCallRecords) {
      setReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
      return;
    }

    const key = forceReconnectKey
      ? getReconnectKey(selectedContact.id)
      : getBootstrapKey(selectedContact.id);
    if (generationInFlightRef.current.has(key) || generationErrors[key]) return;

    generationInFlightRef.current.add(key);
    setGeneratingKeys((current) => ({ ...current, [key]: true }));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    generatePhoneInspectorSnapshot(roleId, selectedContact)
      .then((snapshot) => {
        importWeChatInspectorSnapshot(roleId, snapshot);
        importInspectorCallRecords(snapshot.sourceContactId, snapshot.callRecords);
        importInspectorDailyWordsEntries(roleId, snapshot.dailyWordsEntries);
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
    forceReconnectKeys,
    importInspectorCallRecords,
    importInspectorDailyWordsEntries,
    importWeChatInspectorSnapshot,
    readyContactIds,
    selectedContact,
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

  const handleBackToRoles = () => {
    setActiveSubAppId(null);
    setSelectedContactId(null);
    clearRuntimeActiveRoleId();
  };

  const handleOpenSubApp = async (appId: string) => {
    if (isGeneratingSelected || !isSelectedContactReady) return;
    setActiveSubAppId(appId);
  };

  const handleReconnect = () => {
    if (!selectedContact) return;
    setActiveSubAppId(null);
    setReadyContactIds((current) => ({ ...current, [selectedContact.id]: false }));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[getBootstrapKey(selectedContact.id)];
      delete next[getReconnectKey(selectedContact.id)];
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
    } else if (targetAppId === 'memorycenter') {
      clearAppMemories('wechat', undefined, { roleId, space: 'social' });
      clearAppMemories('dailywords', undefined, { roleId, space: 'personal' });
      clearAppMemories('dailywords', undefined, { roleId, space: 'social' });
      clearAppMemories('lovespace', undefined, { roleId, space: 'social' });
    } else if (targetAppId === 'dailywords') {
      clearInspectorDailyWordsEntries(roleId);
      clearAppMemories('dailywords', undefined, { roleId, space: 'personal' });
      clearAppMemories('dailywords', undefined, { roleId, space: 'social' });
    } else if (targetAppId === 'lovespace') {
      useLoveSpaceStore.setState((state) => {
        const emptyState = createEmptyLoveSpaceState();
        return {
          ...state,
          loveSpaceStateByRoleId: {
            ...state.loveSpaceStateByRoleId,
            [roleId]: emptyState,
          },
          ...(state.activeRoleId === roleId ? emptyState : {}),
        };
      });
      clearAppMemories('lovespace', undefined, { roleId, space: 'social' });
    }

    recordClearActionMemory(targetAppId, appName, roleId);
    setIsClearPickerOpen(false);
    setReadyContactIds((current) => ({ ...current, [selectedContact.id]: true }));
    setGenerationErrors((current) => {
      const next = { ...current };
      delete next[getBootstrapKey(selectedContact.id)];
      delete next[getReconnectKey(selectedContact.id)];
      return next;
    });
  };

  const selectedGenerationKeys = selectedContact
    ? [getBootstrapKey(selectedContact.id), getReconnectKey(selectedContact.id)]
    : [];
  const isGeneratingSelected = selectedGenerationKeys.some((key) => generatingKeys[key]);
  const selectedGenerationError = selectedGenerationKeys
    .map((key) => generationErrors[key])
    .find(Boolean);
  const isSelectedContactReady = selectedContact ? Boolean(readyContactIds[selectedContact.id]) : false;

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
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
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
            isGeneratingSelected
              ? '正在读取对方手机中的信息...'
              : selectedGenerationError || ''
          }
          inspectableApps={inspectableApps}
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
              {isGeneratingSelected ? (
                <div
                  className="pointer-events-none absolute left-1/2 top-5 z-[220] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-[13px] text-white shadow-lg backdrop-blur"
                  style={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
                >
                  正在读取对方手机中的信息...
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
