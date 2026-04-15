import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { getAppById, getAppComponent } from '../../../core/registry';
import { isSystemAppId } from '../../../core/systemApps';
import { useInstalledAppIdsSnapshotBridge } from '../../shared/business/appmarket/installSnapshotBridge';
import { useContactsSnapshotBridge } from '../../shared/business/contacts/snapshotBridge';
import { createContactRoleId } from '../../shared/business/roleIdentity';
import {
  clearRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { RolePhoneDesktopPage, RoleSelectPage, type InspectablePhoneApp } from './components';
import type { PhoneInspectorAppProps } from './types';

const INSPECTABLE_APP_IDS = ['wechat', 'contacts', 'lovespace', 'memorycenter', 'dailywords'] as const;

const SUB_APP_PARAMS: Partial<Record<(typeof INSPECTABLE_APP_IDS)[number], Record<string, unknown>>> = {
  wechat: { mode: 'inspector' },
  contacts: { initialTab: 'phone' },
  lovespace: { mode: 'inspector', readOnly: true },
  memorycenter: { mode: 'inspector', readOnly: true },
  dailywords: { mode: 'inspector', readOnly: true },
};

export const PhoneInspectorApp: React.FC<PhoneInspectorAppProps> = ({ onClose }) => {
  const contacts = useContactsSnapshotBridge();
  const installedAppIds = useInstalledAppIdsSnapshotBridge();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeSubAppId, setActiveSubAppId] = useState<string | null>(null);
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

  const handleOpenSubApp = (appId: string) => {
    setActiveSubAppId(appId);
  };

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
      ) : (
        <RolePhoneDesktopPage
          contactName={selectedContact.name}
          inspectableApps={inspectableApps}
          onBackToRoles={handleBackToRoles}
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
            </div>
          )}
        </RolePhoneDesktopPage>
      )}
    </motion.div>
  );
};

export type { PhoneInspectorAppProps };
