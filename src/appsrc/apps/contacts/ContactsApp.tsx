import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useMobileViewportPageStyle } from '../../../core/mobileViewport';
import { useGlobalSettingsStore, useGlobalWorldBookStore } from '@baobaobaiOS/sdk';
import { isVoiceProviderConfigured, synthesizeVoice } from '../WeChat/voice';
import { FONT_STACK, TEXT } from './constants';
import {
  AddMyCardPage,
  AddContactPage,
  ContactDetailPage,
  ContactsBottomTabs,
  ContactsListView,
  ContactsTopBar,
  FavoritesView,
  MyCardsPage,
  PhoneCallView,
  PhoneRecordsView,
} from './components';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  isContactRoleId,
  parseContactRoleId,
} from './roleIdentity';
import { useActiveRoleId } from './activeRole';
import { useContactsStore } from './store';
import { useWeChatStore } from '../WeChat/store';
import type { CallRecord, Contact, ContactsAppProps } from './types';
import type { ContactsBottomTab, ContactsPage } from './uiTypes';

const createDefaultInspectorContact = (): Contact => ({
  id: DEFAULT_ACTIVE_ROLE_ID,
  name: '默认身份',
  role: '默认身份',
  wechatRelation: 'friend',
  phone: '',
  note: '手机主人的默认身份',
  avatar: '',
  description: '查手机视角下的默认身份',
  greeting: '你好',
  personality: '',
  background: '',
  createdAt: 0,
});

export const ContactsApp: React.FC<ContactsAppProps> = ({ onClose, context }) => {
  const {
    contacts,
    callRecords,
    myCards,
    addContact,
    addMyCard,
    setActiveMyCard,
    updateMyCard,
    updateContact,
    deleteContact,
    addCallRecord,
    deleteCallRecord,
  } = useContactsStore();
  const activeRoleId = useActiveRoleId();
  const worldBook = useGlobalWorldBookStore((state) => state.worldBook);
  const settings = useGlobalSettingsStore((state) => state.settings);
  const inspectorContactId = parseContactRoleId(activeRoleId);
  const isInspectorContactRoleMode =
    isContactRoleId(activeRoleId) && Boolean(inspectorContactId);
  const wechatStateByRoleId = useWeChatStore((state) => state.wechatStateByRoleId);

  const inspectorPerspectiveContacts = useMemo<Contact[]>(() => {
    if (!isInspectorContactRoleMode) return contacts;

    const result: Contact[] = [];

    const generatedSessions = wechatStateByRoleId[activeRoleId]?.wechatSessions || [];
    generatedSessions.forEach((session) => {
      const generated = session.inspectorGeneratedContact;
      if (!generated || generated.sourceContactId !== inspectorContactId) return;
      const name = generated.name?.trim();
      if (!name || result.some((item) => item.id === session.characterId)) return;

      result.push({
        id: session.characterId,
        name,
        role: generated.role || generated.relationshipGuess || '查手机联系人',
        wechatRelation: 'friend',
        phone:
          callRecords.find(
            (record) =>
              record.inspectorGeneratedSourceContactId === inspectorContactId &&
              record.contactId === session.characterId &&
              record.phone
          )?.phone || '',
        note: generated.note || generated.suspicion || generated.relationshipGuess || '',
        avatar: '',
        description: generated.suspicion || generated.relationshipGuess || '',
        greeting: '你好',
        personality: '',
        background: '',
        createdAt: session.lastUpdated || 0,
      });
    });

    callRecords
      .filter((record) => record.inspectorGeneratedSourceContactId === inspectorContactId)
      .forEach((record) => {
        if (result.some((item) => item.id === record.contactId)) return;
        const existingContact = contacts.find((contact) => contact.id === record.contactId);
        const name = record.contactName || existingContact?.name || record.phone || '未知号码';
        result.push({
          id: record.contactId,
          name,
          role: existingContact?.role || '通话记录',
          wechatRelation: 'friend',
          phone: record.phone || existingContact?.phone || '',
          note: existingContact?.note || '查手机通话记录中的联系人',
          avatar: existingContact?.avatar || '',
          description: existingContact?.description || '',
          greeting: existingContact?.greeting || '你好',
          personality: existingContact?.personality || '',
          background: existingContact?.background || '',
          createdAt: record.createdAt || existingContact?.createdAt || 0,
        });
      });

    if (result.length === 0) {
      result.push(createDefaultInspectorContact());
    }

    return result;
  }, [activeRoleId, callRecords, contacts, inspectorContactId, isInspectorContactRoleMode, wechatStateByRoleId]);

  const scopedContacts = isInspectorContactRoleMode
    ? inspectorPerspectiveContacts
    : contacts;
  const scopedContactIdSet = useMemo(
    () => new Set(scopedContacts.map((item) => item.id)),
    [scopedContacts]
  );
  const myCardById = useMemo(
    () => new Map(myCards.map((card) => [card.id, card])),
    [myCards]
  );
  const scopedCallRecords = useMemo<CallRecord[]>(() => {
    if (!isInspectorContactRoleMode) return callRecords;
    if (!inspectorContactId) return [];

    return callRecords
      .filter((record) => record.inspectorGeneratedSourceContactId === inspectorContactId)
      .filter((record) => scopedContactIdSet.has(record.contactId));
  }, [
    callRecords,
    inspectorContactId,
    isInspectorContactRoleMode,
    scopedContactIdSet,
  ]);

  const launchTab =
    context?.params?.initialTab === 'phone' ? 'phone' : 'contacts';
  const [currentPage, setCurrentPage] = useState<ContactsPage>('main');
  const shouldFreezeViewport =
    currentPage === 'addContact' ||
    currentPage === 'editContact' ||
    currentPage === 'addMyCard' ||
    currentPage === 'editMyCard';
  const viewportPageStyle = useMobileViewportPageStyle(!shouldFreezeViewport);
  const [activeTab, setActiveTab] = useState<ContactsBottomTab>(launchTab);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedMyCardId, setSelectedMyCardId] = useState<string | null>(null);

  const [showCallView, setShowCallView] = useState(false);
  const [activeCallContactId, setActiveCallContactId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'dialing' | 'active'>('dialing');
  const [callConnectedAt, setCallConnectedAt] = useState<number | null>(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const [callMicEnabled, setCallMicEnabled] = useState(true);
  const [callSpeakerEnabled, setCallSpeakerEnabled] = useState(true);
  const callConnectTimerRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const greetingAbortRef = useRef<AbortController | null>(null);
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);
  const greetingAudioUrlRef = useRef<string | null>(null);
  const greetingAttemptKeyRef = useRef<string | null>(null);

  const stopGreetingPlayback = () => {
    if (greetingAbortRef.current) {
      greetingAbortRef.current.abort();
      greetingAbortRef.current = null;
    }

    if (greetingAudioRef.current) {
      greetingAudioRef.current.pause();
      greetingAudioRef.current.onended = null;
      greetingAudioRef.current.onerror = null;
      greetingAudioRef.current = null;
    }

    if (greetingAudioUrlRef.current) {
      URL.revokeObjectURL(greetingAudioUrlRef.current);
      greetingAudioUrlRef.current = null;
    }
  };

  const showToast = (message: string, duration = 2200) => {
    setToastMessage(message);
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, duration);
  };

  const clearCallConnectTimer = () => {
    if (callConnectTimerRef.current) {
      window.clearTimeout(callConnectTimerRef.current);
      callConnectTimerRef.current = null;
    }
  };

  const resetCallState = () => {
    clearCallConnectTimer();
    stopGreetingPlayback();
    greetingAttemptKeyRef.current = null;
    setShowCallView(false);
    setActiveCallContactId(null);
    setCallStatus('dialing');
    setCallConnectedAt(null);
    setCallElapsedSeconds(0);
    setCallMicEnabled(true);
    setCallSpeakerEnabled(true);
  };

  const handleStartCall = (contactId: string) => {
    if (isInspectorContactRoleMode) return;
    const target = scopedContacts.find((item) => item.id === contactId);
    if (!target) return;

    clearCallConnectTimer();
    stopGreetingPlayback();
    greetingAttemptKeyRef.current = null;
    setActiveCallContactId(target.id);
    setShowCallView(true);
    setCallStatus('dialing');
    setCallConnectedAt(null);
    setCallElapsedSeconds(0);
    setCallMicEnabled(true);
    setCallSpeakerEnabled(true);

    callConnectTimerRef.current = window.setTimeout(() => {
      callConnectTimerRef.current = null;
      setCallStatus('active');
      const startedAt = Date.now();
      setCallConnectedAt(startedAt);
      setCallElapsedSeconds(0);
    }, 1600);
  };

  const handleHangupCall = () => {
    const contactId = activeCallContactId;
    if (contactId && !isInspectorContactRoleMode) {
      const durationSec =
        callStatus === 'active' && callConnectedAt
          ? Math.max(1, Math.floor((Date.now() - callConnectedAt) / 1000))
          : 0;
      addCallRecord({
        contactId,
        roleId: activeRoleId,
        direction: 'outgoing',
        durationSec,
      });
    }

    resetCallState();
  };

  useEffect(
    () => () => {
      if (callConnectTimerRef.current) {
        window.clearTimeout(callConnectTimerRef.current);
        callConnectTimerRef.current = null;
      }
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      if (greetingAbortRef.current) {
        greetingAbortRef.current.abort();
        greetingAbortRef.current = null;
      }
      if (greetingAudioRef.current) {
        greetingAudioRef.current.pause();
        greetingAudioRef.current.onended = null;
        greetingAudioRef.current.onerror = null;
        greetingAudioRef.current = null;
      }
      if (greetingAudioUrlRef.current) {
        URL.revokeObjectURL(greetingAudioUrlRef.current);
        greetingAudioUrlRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!showCallView || callStatus !== 'active' || !callConnectedAt) return;

    const syncElapsed = () => {
      setCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));
    };

    syncElapsed();
    const timer = window.setInterval(syncElapsed, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [showCallView, callStatus, callConnectedAt]);

  useEffect(() => {
    if (!isInspectorContactRoleMode) return;
    if (
      currentPage === 'addContact' ||
      currentPage === 'editContact' ||
      currentPage === 'myCards' ||
      currentPage === 'addMyCard' ||
      currentPage === 'editMyCard'
    ) {
      setCurrentPage('main');
    }
  }, [currentPage, isInspectorContactRoleMode]);

  useEffect(() => {
    if (!selectedContactId) return;
    if (scopedContacts.some((contact) => contact.id === selectedContactId)) return;
    setSelectedContactId(null);
    if (currentPage === 'contactDetail' || currentPage === 'editContact') {
      setCurrentPage('main');
    }
  }, [currentPage, scopedContacts, selectedContactId]);

  const selectedContact = scopedContacts.find((contact) => contact.id === selectedContactId) ?? null;
  const selectedMyCard = myCards.find((item) => item.id === selectedMyCardId) ?? null;
  const selectedContactRecords = selectedContact
    ? scopedCallRecords.filter((record) => record.contactId === selectedContact.id)
    : [];
  const activeCallContact = scopedContacts.find((contact) => contact.id === activeCallContactId) ?? null;

  useEffect(() => {
    const audio = greetingAudioRef.current;
    if (!audio) return;
    audio.muted = !callSpeakerEnabled;
    audio.volume = callSpeakerEnabled ? 1 : 0;
  }, [callSpeakerEnabled]);

  useEffect(() => {
    if (
      !showCallView ||
      callStatus !== 'active' ||
      !callConnectedAt ||
      !activeCallContact
    ) {
      return;
    }

    const greetingKey = `${activeCallContact.id}:${callConnectedAt}`;
    if (greetingAttemptKeyRef.current === greetingKey) {
      return;
    }
    greetingAttemptKeyRef.current = greetingKey;

    const defaultGreeting = activeCallContact.name
      ? `你好，我是${activeCallContact.name}，现在方便聊几句吗？`
      : '你好，现在方便聊几句吗？';
    const greetingText = activeCallContact.greeting?.trim() || defaultGreeting;

    if (!isVoiceProviderConfigured(settings)) {
      showToast('请先在设置中完成语音合成 API 配置');
      return;
    }

    stopGreetingPlayback();
    const abortController = new AbortController();
    greetingAbortRef.current = abortController;

    const playGreeting = async () => {
      try {
        const audioBlob = await synthesizeVoice(settings, greetingText, abortController.signal);
        if (abortController.signal.aborted) return;

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        greetingAudioRef.current = audio;
        greetingAudioUrlRef.current = audioUrl;
        audio.muted = !callSpeakerEnabled;
        audio.volume = callSpeakerEnabled ? 1 : 0;

        const clearAudio = () => {
          if (greetingAudioRef.current === audio) {
            greetingAudioRef.current = null;
          }
          audio.onended = null;
          audio.onerror = null;
          if (greetingAudioUrlRef.current === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            greetingAudioUrlRef.current = null;
          }
        };

        audio.onended = clearAudio;
        audio.onerror = clearAudio;
        await audio.play();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to play contact greeting:', error);
          showToast('语音打招呼失败，请检查语音配置后重试');
        }
        stopGreetingPlayback();
      } finally {
        if (greetingAbortRef.current === abortController) {
          greetingAbortRef.current = null;
        }
      }
    };

    void playGreeting();
  }, [showCallView, callStatus, callConnectedAt, activeCallContact, settings, callSpeakerEnabled, showToast, stopGreetingPlayback]);

  const openContactDetail = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentPage('contactDetail');
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute left-0 right-0 z-50 flex min-h-0 flex-col overflow-hidden bg-white text-slate-800"
      style={{ ...viewportPageStyle, fontFamily: FONT_STACK }}
    >
      {currentPage === 'main' ? (
        <>
          <ContactsTopBar
            activeTab={activeTab}
            onClose={onClose}
            onAddContact={() => setCurrentPage('addContact')}
            showAddContactAction={!isInspectorContactRoleMode}
          />

          {activeTab === 'phone' && (
            <PhoneRecordsView
              callRecords={scopedCallRecords}
              contacts={scopedContacts}
              onQuickCall={handleStartCall}
              onOpenContact={openContactDetail}
            />
          )}
          {activeTab === 'contacts' && (
            <ContactsListView
              contacts={scopedContacts}
              onOpenContact={openContactDetail}
              onOpenMyCards={() => setCurrentPage('myCards')}
              showMyCardsEntry={!isInspectorContactRoleMode}
            />
          )}
          {activeTab === 'favorites' && (
            <FavoritesView
              contacts={scopedContacts}
              onQuickCall={handleStartCall}
              onOpenContact={openContactDetail}
            />
          )}

          <ContactsBottomTabs activeTab={activeTab} onChange={setActiveTab} />
        </>
      ) : (
        <>
          {currentPage === 'addContact' && (
            <AddContactPage
              worldBook={worldBook}
              onBack={() => setCurrentPage('main')}
              onSubmit={(payload) => {
                const contact = addContact(payload);
                setSelectedContactId(contact.id);
                setCurrentPage('contactDetail');
              }}
            />
          )}

          {currentPage === 'contactDetail' && selectedContact && (
            <ContactDetailPage
              contact={selectedContact}
              callRecords={selectedContactRecords}
              onBack={() => setCurrentPage('main')}
              onEdit={() => setCurrentPage('editContact')}
              onQuickCall={handleStartCall}
              onClearRecords={() => {
                selectedContactRecords.forEach((record) => deleteCallRecord(record.id));
              }}
              readOnly={isInspectorContactRoleMode}
            />
          )}

          {currentPage === 'editContact' && selectedContact && (
            <AddContactPage
              worldBook={worldBook}
              initialContact={selectedContact}
              title={TEXT.editContact}
              submitLabel={TEXT.save}
              onBack={() => setCurrentPage('contactDetail')}
              onSubmit={(payload) => {
                updateContact(selectedContact.id, payload);
                setCurrentPage('contactDetail');
              }}
              onDelete={() => {
                const confirmed = window.confirm('删除联系人后将无法恢复，确定要删除吗？');
                if (!confirmed) return;
                deleteContact(selectedContact.id);
                setSelectedContactId(null);
                setCurrentPage('main');
              }}
            />
          )}

          {currentPage === 'myCards' && (
            <MyCardsPage
              myCards={myCards}
              onBack={() => setCurrentPage('main')}
              onAdd={() => setCurrentPage('addMyCard')}
              onActivate={setActiveMyCard}
              onOpen={(cardId) => {
                setSelectedMyCardId(cardId);
                setCurrentPage('editMyCard');
              }}
            />
          )}

          {currentPage === 'addMyCard' && (
            <AddMyCardPage
              onBack={() => setCurrentPage('myCards')}
              onSubmit={(payload) => {
                addMyCard(payload);
                setCurrentPage('myCards');
              }}
            />
          )}

          {currentPage === 'editMyCard' && selectedMyCard && (
            <AddMyCardPage
              initialCard={selectedMyCard}
              title={TEXT.editMyCard}
              submitLabel={TEXT.save}
              onBack={() => setCurrentPage('myCards')}
              onSubmit={(payload) => {
                updateMyCard(selectedMyCard.id, payload);
                setCurrentPage('myCards');
              }}
            />
          )}
        </>
      )}

      <PhoneCallView
        show={showCallView}
        contact={activeCallContact}
        status={callStatus}
        elapsedSeconds={callElapsedSeconds}
        micEnabled={callMicEnabled}
        speakerEnabled={callSpeakerEnabled}
        onToggleMic={() => setCallMicEnabled((prev) => !prev)}
        onToggleSpeaker={() => setCallSpeakerEnabled((prev) => !prev)}
        onHangup={handleHangupCall}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 16, x: '-50%' }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[120px] left-1/2 z-[230] bg-black/75 text-white px-4 py-2.5 rounded-xl text-[13px] shadow-lg flex items-center gap-2"
          >
            <AlertTriangle size={16} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export type { ContactsAppProps };






