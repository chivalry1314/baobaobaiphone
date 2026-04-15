import React, { useEffect, useMemo, useState } from 'react';

import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  isContactRoleId,
  parseContactRoleId,
} from '../../shared/business/roleIdentity';

import { useActiveRoleId } from '../contacts/activeRole';
import { useContactsSnapshot, useMyCardsSnapshot } from '../contacts/selectors';

import {
  AddBondSheet,
  LoveAnniversaryPage,
  LoveBondCard,
  LoveBondDetailPage,
  LoveCheckInPage,
  LoveEmptyState,
  LoveMomentsPage,
  LoveSummaryCard,
  LoveTimelinePage,
  RemoveBondConfirmDialog,
} from './components';
import { CUTE_FONT_STACK, LOVE_SPACE_TEXT } from './constants';
import { useLoveSpaceStore } from './store';
import type { BondCardData, LoveCheckInOwner, LoveSpaceAppProps, LoveSpaceState } from './types';
import { calcBondDays, calcHeartbeatValue, getTodayDateInput } from './utils';

type ContactItem = ReturnType<typeof useContactsSnapshot>[number];
type MyCardItem = ReturnType<typeof useMyCardsSnapshot>[number];

interface InspectorProjection extends LoveSpaceState {
  contacts: ContactItem[];
}

const createEmptyLoveSpaceState = (): LoveSpaceState => ({
  bonds: [],
  anniversaries: [],
  moments: [],
  checkInTasks: [],
  checkInRecords: [],
  bondBackgrounds: {},
  importantTimelineByBond: {},
  timelineProcessedRecordIdsByBond: {},
});

const createFallbackRoleContact = (roleId: string): ContactItem => ({
  id: roleId,
  name: roleId === DEFAULT_ACTIVE_ROLE_ID ? '所有者' : roleId,
  role: roleId === DEFAULT_ACTIVE_ROLE_ID ? '默认身份' : '身份',
  wechatRelation: 'friend',
  phone: '',
  note: '',
  avatar: '',
  description: '',
  greeting: '',
  personality: '',
  background: '',
  createdAt: 0,
});

const mapMyCardToContact = (card: MyCardItem): ContactItem => ({
  id: card.id,
  name: card.name || card.id,
  role: card.gender || 'Profile',
  wechatRelation: 'friend',
  phone: card.phone || '',
  note: card.introduction || '',
  avatar: card.avatar || '',
  description: card.introduction || '',
  greeting: '',
  personality: '',
  background: '',
  createdAt: card.createdAt || 0,
});

const toInspectorScopedId = (sourceRoleId: string, value: string): string => {
  return `inspector-${sourceRoleId}-${value}`;
};

const reverseCheckInOwner = (owner: LoveCheckInOwner): LoveCheckInOwner => {
  return owner === 'mine' ? 'partner' : 'mine';
};

export const LoveSpaceApp: React.FC<LoveSpaceAppProps> = ({ onClose, context }) => {
  const contacts = useContactsSnapshot();
  const myCards = useMyCardsSnapshot();
  const activeRoleId = useActiveRoleId();
  const inspectorContactId = parseContactRoleId(activeRoleId);
  const isInspectorContactRoleMode =
    isContactRoleId(activeRoleId) && Boolean(inspectorContactId);
  const isReadOnlyMode =
    isInspectorContactRoleMode || context?.params?.readOnly === true;
  const bonds = useLoveSpaceStore((state) => state.bonds);
  const anniversaries = useLoveSpaceStore((state) => state.anniversaries);
  const moments = useLoveSpaceStore((state) => state.moments);
  const checkInTasks = useLoveSpaceStore((state) => state.checkInTasks);
  const checkInRecords = useLoveSpaceStore((state) => state.checkInRecords);
  const bondBackgrounds = useLoveSpaceStore((state) => state.bondBackgrounds);
  const importantTimelineByBond = useLoveSpaceStore(
    (state) => state.importantTimelineByBond
  );
  const loveSpaceStateByRoleId = useLoveSpaceStore(
    (state) => state.loveSpaceStateByRoleId
  );

  const addOrUpdateBonds = useLoveSpaceStore((state) => state.addOrUpdateBonds);
  const saveAnniversary = useLoveSpaceStore((state) => state.saveAnniversary);
  const addMomentRecord = useLoveSpaceStore((state) => state.addMomentRecord);
  const updateMomentRecord = useLoveSpaceStore((state) => state.updateMomentRecord);
  const removeMomentRecord = useLoveSpaceStore((state) => state.removeMomentRecord);
  const addMomentComment = useLoveSpaceStore((state) => state.addMomentComment);
  const removeMomentComment = useLoveSpaceStore((state) => state.removeMomentComment);
  const addCheckInTasks = useLoveSpaceStore((state) => state.addCheckInTasks);
  const completeCheckInTask = useLoveSpaceStore((state) => state.completeCheckInTask);
  const removeCheckInTask = useLoveSpaceStore((state) => state.removeCheckInTask);
  const setBondBackground = useLoveSpaceStore((state) => state.setBondBackground);
  const removeBond = useLoveSpaceStore((state) => state.removeBond);
  const syncLoveSpaceRoleContext = useLoveSpaceStore((state) => state.syncLoveSpaceRoleContext);

  const inspectorProjection = useMemo<InspectorProjection | null>(() => {
    if (!inspectorContactId || !isInspectorContactRoleMode) return null;

    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
    const myCardsById = new Map(myCards.map((card) => [card.id, card]));
    const projectionState = createEmptyLoveSpaceState();
    const projectionContactsById = new Map<string, ContactItem>();

    const resolveSourceRoleContact = (sourceRoleId: string): ContactItem => {
      const sourceContactId = parseContactRoleId(sourceRoleId);
      if (sourceContactId) {
        const foundContact = contactsById.get(sourceContactId);
        return foundContact ?? createFallbackRoleContact(sourceContactId);
      }

      if (sourceRoleId === DEFAULT_ACTIVE_ROLE_ID) {
        return createFallbackRoleContact(sourceRoleId);
      }

      const sourceCard = myCardsById.get(sourceRoleId);
      if (sourceCard) {
        return mapMyCardToContact(sourceCard);
      }

      return createFallbackRoleContact(sourceRoleId);
    };

    Object.entries(loveSpaceStateByRoleId).forEach(([sourceRoleId, sourceRoleState]) => {
      if (sourceRoleId === activeRoleId) return;

      sourceRoleState.bonds.forEach((sourceBond) => {
        if (sourceBond.contactId !== inspectorContactId) return;

        const sourceRoleContact = resolveSourceRoleContact(sourceRoleId);
        projectionContactsById.set(sourceRoleContact.id, sourceRoleContact);

        const scopedBondId = toInspectorScopedId(sourceRoleId, sourceBond.id);
        projectionState.bonds.push({
          ...sourceBond,
          id: scopedBondId,
          contactId: sourceRoleContact.id,
        });

        const sourceBackground = sourceRoleState.bondBackgrounds[sourceBond.id];
        if (sourceBackground) {
          projectionState.bondBackgrounds[scopedBondId] = sourceBackground;
        }

        const sourceTimeline = sourceRoleState.importantTimelineByBond[sourceBond.id] ?? [];
        projectionState.importantTimelineByBond[scopedBondId] = sourceTimeline.map((item) => ({
          ...item,
          id: toInspectorScopedId(sourceRoleId, item.id),
          role:
            item.role === 'user'
              ? 'assistant'
              : item.role === 'assistant'
              ? 'user'
              : item.role,
        }));

        const sourceProcessedRecordIds =
          sourceRoleState.timelineProcessedRecordIdsByBond[sourceBond.id] ?? [];
        projectionState.timelineProcessedRecordIdsByBond[scopedBondId] =
          sourceProcessedRecordIds.map((item) => toInspectorScopedId(sourceRoleId, item));

        sourceRoleState.anniversaries
          .filter((item) => item.bondId === sourceBond.id)
          .forEach((item) => {
            projectionState.anniversaries.push({
              ...item,
              id: toInspectorScopedId(sourceRoleId, item.id),
              bondId: scopedBondId,
            });
          });

        sourceRoleState.moments
          .filter((item) => item.bondId === sourceBond.id)
          .forEach((item) => {
            projectionState.moments.push({
              ...item,
              id: toInspectorScopedId(sourceRoleId, item.id),
              bondId: scopedBondId,
              comments: item.comments.map((comment) => ({
                ...comment,
                id: toInspectorScopedId(sourceRoleId, comment.id),
              })),
            });
          });

        const scopedTaskIdBySourceId = new Map<string, string>();
        const projectedTaskOwnerBySourceId = new Map<string, LoveCheckInOwner>();
        const sourceBondCheckInTasks = sourceRoleState.checkInTasks.filter(
          (item) => item.bondId === sourceBond.id
        );
        const sourceOwnerTemplateKeySet = new Set(
          sourceBondCheckInTasks.map((item) => `${item.owner}:${item.templateId}`)
        );

        sourceBondCheckInTasks.forEach((item) => {
          const hasMirroredTask = sourceOwnerTemplateKeySet.has(
            `${reverseCheckInOwner(item.owner)}:${item.templateId}`
          );
          // Backward compatible: old tasks might not have mirrored counterpart.
          // In that case, expose it as "mine" so contact-side can still see it.
          const projectedOwner: LoveCheckInOwner = hasMirroredTask
            ? reverseCheckInOwner(item.owner)
            : 'mine';

          projectedTaskOwnerBySourceId.set(item.id, projectedOwner);
          const scopedTaskId = toInspectorScopedId(sourceRoleId, item.id);
          scopedTaskIdBySourceId.set(item.id, scopedTaskId);
          projectionState.checkInTasks.push({
            ...item,
            id: scopedTaskId,
            bondId: scopedBondId,
            owner: projectedOwner,
          });
        });

        sourceRoleState.checkInRecords
          .filter((item) => item.bondId === sourceBond.id)
          .forEach((item) => {
            projectionState.checkInRecords.push({
              ...item,
              id: toInspectorScopedId(sourceRoleId, item.id),
              bondId: scopedBondId,
              taskId:
                scopedTaskIdBySourceId.get(item.taskId) ??
                toInspectorScopedId(sourceRoleId, item.taskId),
              owner: projectedTaskOwnerBySourceId.get(item.taskId) ?? reverseCheckInOwner(item.owner),
            });
          });
      });
    });

    return {
      ...projectionState,
      contacts: [...projectionContactsById.values()],
    };
  }, [
    activeRoleId,
    contacts,
    inspectorContactId,
    isInspectorContactRoleMode,
    loveSpaceStateByRoleId,
    myCards,
  ]);

  const scopedContacts = isInspectorContactRoleMode
    ? inspectorProjection?.contacts ?? []
    : contacts;
  const scopedBonds = isInspectorContactRoleMode
    ? inspectorProjection?.bonds ?? []
    : bonds;
  const scopedAnniversaries = isInspectorContactRoleMode
    ? inspectorProjection?.anniversaries ?? []
    : anniversaries;
  const scopedMoments = isInspectorContactRoleMode
    ? inspectorProjection?.moments ?? []
    : moments;
  const scopedCheckInTasks = isInspectorContactRoleMode
    ? inspectorProjection?.checkInTasks ?? []
    : checkInTasks;
  const scopedCheckInRecords = isInspectorContactRoleMode
    ? inspectorProjection?.checkInRecords ?? []
    : checkInRecords;
  const scopedBondBackgrounds = isInspectorContactRoleMode
    ? inspectorProjection?.bondBackgrounds ?? {}
    : bondBackgrounds;
  const scopedImportantTimelineByBond = isInspectorContactRoleMode
    ? inspectorProjection?.importantTimelineByBond ?? {}
    : importantTimelineByBond;

  const [isPickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sinceDateInput, setSinceDateInput] = useState(getTodayDateInput);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [activeDetailBondId, setActiveDetailBondId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<'home' | 'anniversary' | 'moments' | 'timeline' | 'checkin'>('home');
  const [pendingRemoveBond, setPendingRemoveBond] = useState<{
    bondId: string;
    contactName: string;
  } | null>(null);

  const sortedContacts = useMemo(
    () =>
      [...(isReadOnlyMode ? [] : contacts)].sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-CN')
      ),
    [contacts, isReadOnlyMode]
  );

  const contactById = useMemo(
    () => new Map(scopedContacts.map((contact) => [contact.id, contact])),
    [scopedContacts]
  );
  const existingBondContactSet = useMemo(
    () => new Set(scopedBonds.map((bond) => bond.contactId)),
    [scopedBonds]
  );

  const bondCards = useMemo<BondCardData[]>(() => {
    return [...scopedBonds]
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((bond) => {
        const contact = contactById.get(bond.contactId);
        if (!contact) return null;
        const days = calcBondDays(bond.sinceDate);
        return {
          bond,
          contact,
          days,
          heartbeat: calcHeartbeatValue(days),
        };
      })
      .filter((item): item is BondCardData => Boolean(item));
  }, [contactById, scopedBonds]);

  const filteredContacts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return sortedContacts;

    return sortedContacts.filter((contact) =>
      `${contact.name} ${contact.role ?? ''} ${contact.phone ?? ''}`.toLowerCase().includes(keyword)
    );
  }, [search, sortedContacts]);

  const selectedContactSet = useMemo(() => new Set(selectedContactIds), [selectedContactIds]);

  const totalHeartbeat = useMemo(
    () => bondCards.reduce((sum, card) => sum + card.heartbeat, 0),
    [bondCards]
  );
  const activeDetailCard = useMemo(
    () => bondCards.find((card) => card.bond.id === activeDetailBondId) ?? null,
    [bondCards, activeDetailBondId]
  );

  useEffect(() => {
    syncLoveSpaceRoleContext();
  }, [activeRoleId, syncLoveSpaceRoleContext]);

  useEffect(() => {
    if (!activeDetailCard) {
      setDetailView('home');
    }
  }, [activeDetailCard]);

  const handleOpenPicker = () => {
    if (isReadOnlyMode) return;
    setSearch('');
    setSinceDateInput(getTodayDateInput());
    setSelectedContactIds([]);
    setPickerOpen(true);
  };

  const handleSelectContact = (contactId: string) => {
    if (isReadOnlyMode) return;
    setSelectedContactIds((currentIds) => {
      if (currentIds.includes(contactId)) {
        return currentIds.filter((id) => id !== contactId);
      }
      return [...currentIds, contactId];
    });
  };

  const handleSaveBonds = () => {
    if (isReadOnlyMode) return;
    if (selectedContactIds.length === 0) return;
    addOrUpdateBonds(selectedContactIds, sinceDateInput);
    setPickerOpen(false);
  };

  const handleSinceDateInputChange = (value: string) => {
    setSinceDateInput(value || getTodayDateInput());
  };

  const handleRequestRemoveBond = (bondId: string, contactName: string) => {
    if (isReadOnlyMode) return;
    setPendingRemoveBond({ bondId, contactName });
  };

  const handleConfirmRemoveBond = () => {
    if (isReadOnlyMode) return;
    if (!pendingRemoveBond) return;
    removeBond(pendingRemoveBond.bondId);
    if (pendingRemoveBond.bondId === activeDetailBondId) {
      setActiveDetailBondId(null);
      setDetailView('home');
    }
    setPendingRemoveBond(null);
  };

  const handleOpenDetail = (bondId: string) => {
    setActiveDetailBondId(bondId);
    setDetailView('home');
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 210 }}
      className="absolute inset-0 z-50 overflow-hidden flex flex-col text-slate-800"
      style={{ fontFamily: CUTE_FONT_STACK }}
    >
      {activeDetailCard ? (
        detailView === 'anniversary' ? (
          <LoveAnniversaryPage
            card={activeDetailCard}
            anniversaries={scopedAnniversaries}
            onBack={() => setDetailView('home')}
            onSaveAnniversary={isReadOnlyMode ? () => {} : saveAnniversary}
            readOnly={isReadOnlyMode}
          />
        ) : detailView === 'moments' ? (
          <LoveMomentsPage
            card={activeDetailCard}
            moments={scopedMoments.filter((item) => item.bondId === activeDetailCard.bond.id)}
            onBack={() => setDetailView('home')}
            onAddMoment={isReadOnlyMode ? () => {} : addMomentRecord}
            onUpdateMoment={isReadOnlyMode ? () => {} : updateMomentRecord}
            onRemoveMoment={isReadOnlyMode ? () => {} : removeMomentRecord}
            onAddComment={isReadOnlyMode ? () => {} : addMomentComment}
            onRemoveComment={isReadOnlyMode ? () => {} : removeMomentComment}
            readOnly={isReadOnlyMode}
          />
        ) : detailView === 'timeline' ? (
          <LoveTimelinePage
            card={activeDetailCard}
            timelineRecords={scopedImportantTimelineByBond[activeDetailCard.bond.id] ?? []}
            onBack={() => setDetailView('home')}
          />
        ) : detailView === 'checkin' ? (
          <LoveCheckInPage
            card={activeDetailCard}
            tasks={scopedCheckInTasks}
            records={scopedCheckInRecords}
            onBack={() => setDetailView('home')}
            onAddTasks={isReadOnlyMode ? () => {} : addCheckInTasks}
            onCompleteTask={isReadOnlyMode ? () => {} : completeCheckInTask}
            onRemoveTask={isReadOnlyMode ? () => {} : removeCheckInTask}
            readOnly={isReadOnlyMode}
          />
        ) : (
          <LoveBondDetailPage
            card={activeDetailCard}
            backgroundImage={scopedBondBackgrounds[activeDetailCard.bond.id]}
            onUploadBackground={(imageDataUrl) =>
              isReadOnlyMode
                ? undefined
                : setBondBackground(activeDetailCard.bond.id, imageDataUrl)
            }
            onBack={() => {
              setActiveDetailBondId(null);
              setDetailView('home');
            }}
            onOpenAnniversary={() => setDetailView('anniversary')}
            onOpenMoments={() => setDetailView('moments')}
            onOpenTimeline={() => setDetailView('timeline')}
            onOpenCheckIn={() => setDetailView('checkin')}
            readOnly={isReadOnlyMode}
          />
        )
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#fffbfd] via-[#fff7fb] to-[#fff1f7]" />
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/65 blur-2xl" />
          <div className="absolute top-28 -right-20 w-72 h-72 rounded-full bg-rose-100/45 blur-2xl" />
          <header className="relative z-10 px-2 pt-12 pb-3 flex items-center">
            <button
              onClick={onClose}
              className="text-rose-300 flex items-center gap-1 active:scale-95 transition-transform p-2"
            >
              <ChevronLeft size={26} />
              <span className="text-[16px] font-semibold">{LOVE_SPACE_TEXT.back}</span>
            </button>
            <h1 className="flex-1 text-center text-[18px] font-bold tracking-wide pr-12">
              {LOVE_SPACE_TEXT.appTitle}
            </h1>
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-7">
            <LoveSummaryCard
              hasBonds={bondCards.length > 0}
              totalHeartbeat={totalHeartbeat}
              onAddBond={handleOpenPicker}
              allowAddBond={!isReadOnlyMode}
            />

            {bondCards.length === 0 ? (
              <LoveEmptyState onAddBond={handleOpenPicker} allowAddBond={!isReadOnlyMode} />
            ) : (
              <section className="mt-5 space-y-3">
                {bondCards.map((card, index) => (
                  <LoveBondCard
                    key={card.bond.id}
                    card={card}
                    index={index}
                    onOpenDetail={handleOpenDetail}
                    onRequestRemoveBond={handleRequestRemoveBond}
                    readOnly={isReadOnlyMode}
                  />
                ))}
              </section>
            )}
          </main>

          {!isReadOnlyMode && (
            <AddBondSheet
              isOpen={isPickerOpen}
              search={search}
              sinceDateInput={sinceDateInput}
              selectedCount={selectedContactIds.length}
              filteredContacts={filteredContacts}
              selectedContactSet={selectedContactSet}
              existingBondContactSet={existingBondContactSet}
              onClose={() => setPickerOpen(false)}
              onSave={handleSaveBonds}
              onSearchChange={setSearch}
              onSinceDateInputChange={handleSinceDateInputChange}
              onToggleContact={handleSelectContact}
            />
          )}
        </>
      )}

      {!isReadOnlyMode && (
        <RemoveBondConfirmDialog
          isOpen={Boolean(pendingRemoveBond)}
          contactName={pendingRemoveBond?.contactName ?? ''}
          onCancel={() => setPendingRemoveBond(null)}
          onConfirm={handleConfirmRemoveBond}
        />
      )}
    </motion.div>
  );
};

export type { LoveSpaceAppProps };
