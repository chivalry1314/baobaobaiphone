// src/components/wechat/WeChatChatView.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWeChatStore } from '../store';
import { useGlobalSettingsStore, useGlobalWorldBookStore } from '@mimisOS/sdk';
import type { CSSProperties } from 'react';
import type { WeChatChatViewProps, WeChatMessage } from '../types';
import { useWeChatCharactersFromContacts } from '../contactAdapter';
import { normalizeUiStyleRecord, parseWeChatUiRenderConfig } from '../uiRenderConfig';
import { isVoiceProviderConfigured, synthesizeVoice } from '../voice';
import { compressImageFile } from './moments/momentsUtils';
import { isLikelyVisionChatModel } from '../../../../core/modelCapabilities';
import { wechatMemoryController } from '../memory';
import { queryPersonalMemoryByApp } from '../../../../core/appMemoryCenter';
import { getAppById } from '../../../../core/registry';

import { WeChatChatHeader } from './WeChatChatHeader';
import { WeChatChatMessageItem } from './WeChatChatMessageItem';
import { WeChatChatInputBar } from './WeChatChatInputBar';
import { Modals } from './WeChatChatModals';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike extends ArrayLike<SpeechRecognitionAlternativeLike> {
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface VoiceCaptureResult {
  audioBlob: Blob;
  durationSeconds: number;
}

interface PendingVoiceDraft {
  audioDataUrl: string;
  durationSeconds: number;
  transcript: string;
}

type ChatCompletionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatCompletionContentPart[];
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return anyWindow.SpeechRecognition || anyWindow.webkitSpeechRecognition || null;
};

const mapSpeechRecognitionError = (code?: string): string => {
  if (!code) return '语音识别失败';
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '麦克风权限被拒绝，请在浏览器设置中允许麦克风';
  }
  if (code === 'audio-capture') {
    return '未检测到可用麦克风设备';
  }
  if (code === 'network') {
    return '语音识别服务不可达（网络或地区限制）';
  }
  if (code === 'no-speech') {
    return '未检测到语音，请重试';
  }
  if (code === 'aborted') {
    return '语音识别已停止';
  }
  return `语音识别失败：${code}`;
};

const normalizeSessionContextMessageLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 30;
  return Math.max(0, Math.min(120, Math.round(value)));
};

const normalizeMemoryReferenceLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 12;
  return Math.max(0, Math.min(40, Math.round(value)));
};

const normalizePersonalProfileMemoryLimit = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0, Math.min(24, Math.round(value)));
};

const normalizeMessageContentForMemoryComparison = (message: WeChatMessage): string => {
  if (message.type === 'image') {
    const caption = message.content.trim();
    if (caption && caption !== '[图片]') return `[图片] ${caption}`;
    return '[图片]';
  }

  if (message.type === 'voice') {
    const transcript = message.voiceTranscriptText?.trim();
    if (transcript) return transcript;
  }

  if (message.type === 'transfer' && typeof message.amount === 'number') {
    return `转账 ¥${message.amount.toFixed(2)}`;
  }

  if (message.type === 'transfer_accepted' && typeof message.amount === 'number') {
    return `收款 ¥${message.amount.toFixed(2)}`;
  }

  return message.content.trim();
};

export const WeChatChatView: React.FC<WeChatChatViewProps> = ({
  characterId,
  onBack,
  restoreVoiceCallSignal,
  onVoiceCallUiStateChange,
  readOnly = false,
}) => {
  const {
    wechatSessions, addWeChatMessage, deleteWeChatMessages,
    updateWeChatMessage, createWeChatSession, ensureWeChatSession, wechatUserProfile, withdrawWeChatBalance, wechatUiSettings
  } = useWeChatStore();
  const wechatCharacters = useWeChatCharactersFromContacts();
  const settings = useGlobalSettingsStore((state) => state.settings);
  const worldBook = useGlobalWorldBookStore((state) => state.worldBook);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [showFullScreenEditor, setShowFullScreenEditor] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);
  const [showCameraCaptureModal, setShowCameraCaptureModal] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);

  const [showTransferView, setShowTransferView] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [showCallTypeSheet, setShowCallTypeSheet] = useState(false);
  const [showVoiceCallView, setShowVoiceCallView] = useState(false);
  const [isVoiceCallMinimized, setIsVoiceCallMinimized] = useState(false);
  const [voiceCallMicEnabled, setVoiceCallMicEnabled] = useState(true);
  const [voiceCallSpeakerEnabled, setVoiceCallSpeakerEnabled] = useState(false);
  const [voiceCallStatusText, setVoiceCallStatusText] = useState('等待对方接受邀请...');
  const [showVoiceRecorderModal, setShowVoiceRecorderModal] = useState(false);
  const [isRealVoiceRecording, setIsRealVoiceRecording] = useState(false);

  const [menuState, setMenuState] = useState<{
    messageId: string;
    x: number;
    y: number;
    text: string;
    messageType?: WeChatMessage['type'];
    canTranscribe?: boolean;
    transcriptVisible?: boolean;
  } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | 'multi' | null>(null);
  const [quotingMessage, setQuotingMessage] = useState<{ senderName: string; content: string } | null>(null);

  const [forwardTargetModal, setForwardTargetModal] = useState<{ messageIds: string[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingVoiceDraft, setPendingVoiceDraft] = useState<PendingVoiceDraft | null>(null);
  const [playingVoiceMessageId, setPlayingVoiceMessageId] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceSynthesizing, setIsVoiceSynthesizing] = useState(false);
  const peerAvatarTapStateRef = useRef<{ count: number; lastTapAt: number }>({
    count: 0,
    lastTapAt: 0,
  });
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceRecognitionManualStopRef = useRef(false);
  const voiceRecognitionRestartTimerRef = useRef<number | null>(null);
  const voiceRecognitionDiscardResultRef = useRef(false);
  const finalizeVoiceRecordingRef = useRef<(() => void) | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const voiceSynthesisAbortRef = useRef<AbortController | null>(null);
  const messageVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const realVoiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const realVoiceMediaStreamRef = useRef<MediaStream | null>(null);
  const realVoiceChunksRef = useRef<Blob[]>([]);
  const realVoiceStartedAtRef = useRef(0);
  const realVoiceShouldSaveRef = useRef(false);
  const realVoiceRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const realVoiceRecognitionRestartTimerRef = useRef<number | null>(null);
  const realVoiceRecognitionStopRequestedRef = useRef(false);
  const realVoiceRecognitionActiveRef = useRef(false);
  const realVoiceTranscriptFinalRef = useRef('');
  const realVoiceTranscriptCurrentRef = useRef('');
  const realVoiceTranscriptSnapshotRef = useRef('');
  const voiceCallRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceCallRecognitionRestartTimerRef = useRef<number | null>(null);
  const voiceCallRecognitionActiveRef = useRef(false);
  const voiceCallRecognitionStopRequestedRef = useRef(false);
  const voiceCallLastFinalAggregateRef = useRef('');
  const voiceCallUtteranceQueueRef = useRef<string[]>([]);
  const voiceCallRespondingRef = useRef(false);
  const voiceCallConversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const voiceCallConnectTimerRef = useRef<number | null>(null);
  const voiceCallSpeakerEnabledRef = useRef(false);
  const lastRestoreVoiceCallSignalRef = useRef<number | null>(restoreVoiceCallSignal ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const character = wechatCharacters.find(c => c.id === characterId);
  const session = wechatSessions.find(s => s.characterId === characterId);
  const messages = session?.messages || [];

  useEffect(() => {
    if (!readOnly) return;
    setShowFullScreenEditor(false);
    setShowPlusMenu(false);
    setShowCameraCaptureModal(false);
    setShowTransferView(false);
    setShowCallTypeSheet(false);
    setShowVoiceCallView(false);
    setShowVoiceRecorderModal(false);
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setMenuState(null);
    setDeleteTarget(null);
    setForwardTargetModal(null);
    setQuotingMessage(null);
    setPendingVoiceDraft(null);
  }, [readOnly]);

  useEffect(() => {
    const normalizedCharacterId = characterId.trim();
    if (!normalizedCharacterId) return;
    ensureWeChatSession(normalizedCharacterId, { switchCurrent: false });
  }, [characterId, ensureWeChatSession]);

  const chatModelSupportsVision = isLikelyVisionChatModel(settings.model || '');
  const customRenderConfig = useMemo(
    () =>
      wechatUiSettings.customRendererEnabled
        ? parseWeChatUiRenderConfig(wechatUiSettings.customRendererSource)
        : null,
    [wechatUiSettings.customRendererEnabled, wechatUiSettings.customRendererSource]
  );
  const chatBackgroundStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {};
    const customBackgroundStyle = normalizeUiStyleRecord(customRenderConfig?.chatBackgroundStyle);
    if (customBackgroundStyle) {
      Object.assign(baseStyle, customBackgroundStyle);
    }

    const backgroundOpacity = Math.max(
      0,
      Math.min(1, wechatUiSettings.chatBackgroundOpacity ?? 1)
    );

    const backgroundImage =
      customRenderConfig?.chatBackgroundImage || wechatUiSettings.chatBackgroundImage;
    if (backgroundImage) {
      baseStyle.backgroundImage = `linear-gradient(rgba(255,255,255,${
        1 - backgroundOpacity
      }), rgba(255,255,255,${1 - backgroundOpacity})), url(${backgroundImage})`;
      baseStyle.backgroundSize = 'cover';
      baseStyle.backgroundPosition = 'center';
      baseStyle.backgroundRepeat = 'no-repeat';
      baseStyle.backgroundBlendMode = 'normal';
    } else if (!baseStyle.backgroundColor) {
      baseStyle.backgroundColor = '#EDEDED';
    }

    return baseStyle;
  }, [
    customRenderConfig?.chatBackgroundImage,
    customRenderConfig?.chatBackgroundStyle,
    wechatUiSettings.chatBackgroundImage,
    wechatUiSettings.chatBackgroundOpacity,
  ]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80, 
    overscan: 10,
    useAnimationFrameWithResizeObserver: true,
  });

  const scrollToBottom = () => {
    if (messages.length > 0 && !isSelectionMode) {
      setTimeout(() => { virtualizer.scrollToIndex(messages.length - 1, { align: 'end' }); }, 50);
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages.length, isTyping, quotingMessage]);

  const clearVoicePlayback = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.onended = null;
      voiceAudioRef.current.onerror = null;
      voiceAudioRef.current = null;
    }
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current);
      voiceAudioUrlRef.current = null;
    }
  };

  const stopVoiceSynthesis = () => {
    if (voiceSynthesisAbortRef.current) {
      voiceSynthesisAbortRef.current.abort();
      voiceSynthesisAbortRef.current = null;
    }
    setIsVoiceSynthesizing(false);
  };

  const stopVoiceRecognition = (discardResult = false) => {
    voiceRecognitionDiscardResultRef.current = discardResult;
    if (voiceRecognitionRestartTimerRef.current) {
      window.clearTimeout(voiceRecognitionRestartTimerRef.current);
      voiceRecognitionRestartTimerRef.current = null;
    }
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;
    voiceRecognitionManualStopRef.current = true;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // ignore stop errors when recognition is not active
    }
    speechRecognitionRef.current = null;
    setIsVoiceRecording(false);

    if (finalizeVoiceRecordingRef.current) {
      finalizeVoiceRecordingRef.current();
      finalizeVoiceRecordingRef.current = null;
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('voice-read-failed'));
      };
      reader.onerror = () => reject(reader.error || new Error('voice-read-failed'));
      reader.readAsDataURL(blob);
    });

  const stopMessageVoicePlayback = () => {
    if (messageVoiceAudioRef.current) {
      messageVoiceAudioRef.current.pause();
      messageVoiceAudioRef.current.onended = null;
      messageVoiceAudioRef.current.onerror = null;
      messageVoiceAudioRef.current = null;
    }
    setPlayingVoiceMessageId(null);
  };

  const clearVoiceCallConnectTimer = () => {
    if (voiceCallConnectTimerRef.current) {
      window.clearTimeout(voiceCallConnectTimerRef.current);
      voiceCallConnectTimerRef.current = null;
    }
  };

  const clearVoiceCallRecognitionRestartTimer = () => {
    if (voiceCallRecognitionRestartTimerRef.current) {
      window.clearTimeout(voiceCallRecognitionRestartTimerRef.current);
      voiceCallRecognitionRestartTimerRef.current = null;
    }
  };

  const stopVoiceCallRecognition = () => {
    voiceCallRecognitionActiveRef.current = false;
    voiceCallRecognitionStopRequestedRef.current = true;
    clearVoiceCallRecognitionRestartTimer();
    voiceCallLastFinalAggregateRef.current = '';
    const recognition = voiceCallRecognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
    voiceCallRecognitionRef.current = null;
  };

  const clearRealVoiceRecognitionRestartTimer = () => {
    if (realVoiceRecognitionRestartTimerRef.current) {
      window.clearTimeout(realVoiceRecognitionRestartTimerRef.current);
      realVoiceRecognitionRestartTimerRef.current = null;
    }
  };

  const stopRealVoiceRecognitionCapture = (): string => {
    realVoiceRecognitionActiveRef.current = false;
    realVoiceRecognitionStopRequestedRef.current = true;
    clearRealVoiceRecognitionRestartTimer();

    const transcript = (
      realVoiceTranscriptFinalRef.current || realVoiceTranscriptCurrentRef.current
    ).trim();

    const recognition = realVoiceRecognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      realVoiceRecognitionRef.current = null;
    }

    realVoiceTranscriptSnapshotRef.current = transcript;
    return transcript;
  };

  const startRealVoiceRecognitionCapture = (): boolean => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      return false;
    }

    const startRecognitionInstance = () => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let nextFinal = '';
          let nextInterim = '';
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;
            if (result.isFinal) {
              nextFinal += transcript;
            } else {
              nextInterim += transcript;
            }
          }

          realVoiceTranscriptFinalRef.current = nextFinal.trim();
          realVoiceTranscriptCurrentRef.current = `${nextFinal}${nextInterim}`.trim();
        };

        recognition.onerror = (event) => {
          if (!realVoiceRecognitionStopRequestedRef.current) {
            const message = mapSpeechRecognitionError(event?.error);
            if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
              setToastMessage(message);
              setTimeout(() => setToastMessage(null), 1800);
            }
          }
        };

        recognition.onend = () => {
          realVoiceRecognitionRef.current = null;
          if (realVoiceRecognitionStopRequestedRef.current || !realVoiceRecognitionActiveRef.current) {
            return;
          }
          clearRealVoiceRecognitionRestartTimer();
          realVoiceRecognitionRestartTimerRef.current = window.setTimeout(() => {
            realVoiceRecognitionRestartTimerRef.current = null;
            if (realVoiceRecognitionActiveRef.current && !realVoiceRecognitionStopRequestedRef.current) {
              startRecognitionInstance();
            }
          }, 120);
        };

        realVoiceRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        realVoiceRecognitionRef.current = null;
      }
    };

    realVoiceRecognitionActiveRef.current = true;
    realVoiceRecognitionStopRequestedRef.current = false;
    realVoiceTranscriptFinalRef.current = '';
    realVoiceTranscriptCurrentRef.current = '';
    realVoiceTranscriptSnapshotRef.current = '';
    startRecognitionInstance();
    return true;
  };

  const stopRealVoiceRecording = (saveResult: boolean) => {
    realVoiceShouldSaveRef.current = saveResult;
    stopRealVoiceRecognitionCapture();
    const recorder = realVoiceMediaRecorderRef.current;
    if (!recorder) {
      setIsRealVoiceRecording(false);
      if (!saveResult) {
        setShowVoiceRecorderModal(false);
      }
      return;
    }
    if (recorder.state === 'inactive') {
      setIsRealVoiceRecording(false);
      return;
    }
    try {
      recorder.stop();
    } catch {
      setIsRealVoiceRecording(false);
    }
  };

  const handleOpenVoiceRecorderModal = () => {
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    setShowVoiceRecorderModal(true);
  };

  const handleOpenCallTypeSheet = () => {
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    setShowCallTypeSheet(true);
  };

  const handleOpenImagePicker = () => {
    if (isTyping || isSendingImage) return;
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    imageFileInputRef.current?.click();
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const handleOpenCameraCapture = () => {
    if (isTyping || isSendingImage) return;
    stopVoiceRecognition(true);
    if (showPlusMenu) setShowPlusMenu(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraFileInputRef.current?.click();
      return;
    }
    setShowCameraCaptureModal(true);
  };

  const handleCloseCameraCapture = () => {
    setShowCameraCaptureModal(false);
    setIsCameraInitializing(false);
    stopCameraStream();
  };

  const sendImageFile = async (file: File) => {
    if (!character || isSendingImage) return;

    setIsSendingImage(true);
    try {
      const imageDataUrl = await compressImageFile(file);
      const sessionId = session?.id || createWeChatSession(character.id);
      addWeChatMessage(sessionId, {
        role: 'user',
        type: 'image',
        content: '[图片]',
        imageDataUrl,
        imageMimeType: file.type || 'image/jpeg',
      });
      scrollToBottom();

      if (!settings.apiKey) {
        alert('请先配置 API Key');
        return;
      }
      if (!chatModelSupportsVision) {
        setToastMessage('当前模型可能不支持图片解析，请在设置中检测后再尝试');
        setTimeout(() => setToastMessage(null), 1800);
      }
      await requestAssistantReply(sessionId);
    } catch {
      setToastMessage('图片处理失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
    } finally {
      setIsSendingImage(false);
    }
  };

  const handleChooseImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendImageFile(file);
  };

  const handleTakePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendImageFile(file);
  };

  const handleCaptureFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setToastMessage('相机尚未就绪，请稍后重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setToastMessage('拍照失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9)
    );
    if (!blob) {
      setToastMessage('拍照失败，请重试');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    handleCloseCameraCapture();
    await sendImageFile(file);
  };

  const handleStartVoiceCall = () => {
    if (!character) return;
    setShowCallTypeSheet(false);
    setIsVoiceCallMinimized(false);
    stopVoiceRecognition(true);
    stopRealVoiceRecording(false);
    voiceCallUtteranceQueueRef.current = [];
    voiceCallRespondingRef.current = false;
    voiceCallConversationRef.current = [];
    setVoiceCallMicEnabled(true);
    setVoiceCallSpeakerEnabled(false);
    voiceCallSpeakerEnabledRef.current = false;
    setVoiceCallStatusText('等待对方接受邀请...');
    setShowVoiceCallView(true);
    clearVoiceCallConnectTimer();
    voiceCallConnectTimerRef.current = window.setTimeout(() => {
      voiceCallConnectTimerRef.current = null;
      setVoiceCallStatusText('通话中...');
    }, 1100);
  };

  const handleCloseVoiceCall = () => {
    clearVoiceCallConnectTimer();
    stopVoiceCallRecognition();
    stopVoiceSynthesis();
    voiceCallUtteranceQueueRef.current = [];
    voiceCallRespondingRef.current = false;
    voiceCallConversationRef.current = [];
    setShowVoiceCallView(false);
    setIsVoiceCallMinimized(false);
    setVoiceCallMicEnabled(true);
    setVoiceCallSpeakerEnabled(false);
    voiceCallSpeakerEnabledRef.current = false;
    setVoiceCallStatusText('等待对方接受邀请...');
  };

  const handleMinimizeVoiceCall = () => {
    setIsVoiceCallMinimized(true);
    setToastMessage('已缩略');
    window.setTimeout(() => setToastMessage(null), 700);
  };

  const handleCloseVoiceRecorderModal = () => {
    if (isRealVoiceRecording) {
      stopRealVoiceRecording(false);
    }
    setShowVoiceRecorderModal(false);
  };

  const handleToggleRealVoiceRecording = async () => {
    if (isRealVoiceRecording) {
      stopRealVoiceRecording(true);
      return;
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setToastMessage('当前浏览器不支持录音');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      realVoiceMediaStreamRef.current = stream;
      realVoiceMediaRecorderRef.current = recorder;
      realVoiceChunksRef.current = [];
      realVoiceStartedAtRef.current = Date.now();
      realVoiceShouldSaveRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          realVoiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const shouldSave = realVoiceShouldSaveRef.current;
        realVoiceShouldSaveRef.current = false;
        setIsRealVoiceRecording(false);
        const transcript = (
          realVoiceTranscriptSnapshotRef.current ||
          realVoiceTranscriptFinalRef.current ||
          realVoiceTranscriptCurrentRef.current
        ).trim();
        realVoiceTranscriptSnapshotRef.current = '';
        realVoiceTranscriptFinalRef.current = '';
        realVoiceTranscriptCurrentRef.current = '';

        const mediaStream = realVoiceMediaStreamRef.current;
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          realVoiceMediaStreamRef.current = null;
        }

        const mediaRecorder = realVoiceMediaRecorderRef.current;
        realVoiceMediaRecorderRef.current = null;
        const chunks = realVoiceChunksRef.current;
        realVoiceChunksRef.current = [];
        if (!shouldSave) {
          setShowVoiceRecorderModal(false);
          return;
        }
        if (!chunks.length || !character) {
          setShowVoiceRecorderModal(false);
          return;
        }

        void (async () => {
          try {
            const blob = new Blob(chunks, {
              type: mediaRecorder?.mimeType || 'audio/webm',
            });
            if (!blob.size) {
              setShowVoiceRecorderModal(false);
              return;
            }
            const audioDataUrl = await blobToDataUrl(blob);
            const durationSeconds = Math.max(
              1,
              Math.round((Date.now() - realVoiceStartedAtRef.current) / 1000)
            );
            const sessionId = session?.id || createWeChatSession(character.id);
            addWeChatMessage(sessionId, {
              role: 'user',
              type: 'voice',
              content: transcript || '[语音]',
              voiceAudioDataUrl: audioDataUrl,
              voiceDurationSeconds: durationSeconds,
              voiceTranscriptText: transcript || undefined,
              voiceTranscriptVisible: false,
            });
            setShowVoiceRecorderModal(false);
            scrollToBottom();
            if (!transcript) {
              setToastMessage('未识别到语音文本，未发送给AI');
              setTimeout(() => setToastMessage(null), 1800);
              return;
            }
            if (!settings.apiKey) {
              alert('请先配置 API Key');
              return;
            }
            await requestAssistantReply(sessionId);
          } catch {
            setShowVoiceRecorderModal(false);
            setToastMessage('语音保存失败');
            setTimeout(() => setToastMessage(null), 1800);
          }
        })();
      };

      recorder.start();
      const transcriptionStarted = startRealVoiceRecognitionCapture();
      if (!transcriptionStarted) {
        setToastMessage('当前浏览器不支持语音转写，仅保存录音');
        setTimeout(() => setToastMessage(null), 1800);
      }
      setIsRealVoiceRecording(true);
    } catch {
      setToastMessage('无法启动录音');
      setTimeout(() => setToastMessage(null), 1800);
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceRecognition(true);
      stopRealVoiceRecording(false);
      stopVoiceCallRecognition();
      stopCameraStream();
      clearVoiceCallConnectTimer();
      stopVoiceSynthesis();
      clearVoicePlayback();
      stopMessageVoicePlayback();
    };
  }, []);

  useEffect(() => {
    if (!showCameraCaptureModal) return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    const startCamera = async () => {
      setIsCameraInitializing(true);
      try {
        stopCameraStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          try {
            await cameraVideoRef.current.play();
          } catch {
            // ignore play failures and keep stream for manual interaction
          }
        }
      } catch {
        setToastMessage('无法打开摄像头，请检查权限');
        setTimeout(() => setToastMessage(null), 2000);
        setShowCameraCaptureModal(false);
        cameraFileInputRef.current?.click();
      } finally {
        if (!cancelled) {
          setIsCameraInitializing(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      setIsCameraInitializing(false);
      stopCameraStream();
    };
  }, [showCameraCaptureModal]);

  useEffect(() => {
    if (!showVoiceCallView || !voiceCallMicEnabled) {
      stopVoiceCallRecognition();
      return;
    }
    startVoiceCallRecognition();
    return () => {
      stopVoiceCallRecognition();
    };
  }, [showVoiceCallView, voiceCallMicEnabled]);

  useEffect(() => {
    if (voiceAudioRef.current && showVoiceCallView) {
      voiceAudioRef.current.muted = !voiceCallSpeakerEnabled;
      voiceAudioRef.current.volume = voiceCallSpeakerEnabled ? 1 : 0;
    }
    voiceCallSpeakerEnabledRef.current = voiceCallSpeakerEnabled;
  }, [voiceCallSpeakerEnabled, showVoiceCallView]);

  useEffect(() => {
    if (restoreVoiceCallSignal == null) return;
    if (lastRestoreVoiceCallSignalRef.current === restoreVoiceCallSignal) return;
    lastRestoreVoiceCallSignalRef.current = restoreVoiceCallSignal;
    setShowVoiceCallView(true);
    setIsVoiceCallMinimized(false);
  }, [restoreVoiceCallSignal]);

  useEffect(() => {
    if (!onVoiceCallUiStateChange) return;
    onVoiceCallUiStateChange({
      active: showVoiceCallView,
      minimized: showVoiceCallView && isVoiceCallMinimized,
      characterId,
      characterName: character?.name || '对方',
      characterAvatar: character?.avatar,
    });
  }, [
    onVoiceCallUiStateChange,
    showVoiceCallView,
    isVoiceCallMinimized,
    characterId,
    character?.name,
    character?.avatar,
  ]);

  const playVoiceReply = async (replyContent: string) => {
    const content = replyContent.trim();
    if (!content || !settings.voiceAutoPlay || !isVoiceProviderConfigured(settings)) {
      return;
    }

    stopVoiceSynthesis();
    clearVoicePlayback();
    const abortController = new AbortController();
    voiceSynthesisAbortRef.current = abortController;
    setIsVoiceSynthesizing(true);

    try {
      const audioBlob = await synthesizeVoice(settings, content, abortController.signal);
      if (abortController.signal.aborted) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      const endPlayback = () => {
        clearVoicePlayback();
        setIsVoiceSynthesizing(false);
      };

      voiceAudioRef.current = audio;
      voiceAudioUrlRef.current = audioUrl;
      audio.onended = endPlayback;
      audio.onerror = endPlayback;
      await audio.play();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Voice playback failed:', error);
      }
      clearVoicePlayback();
      setIsVoiceSynthesizing(false);
    } finally {
      if (voiceSynthesisAbortRef.current === abortController) {
        voiceSynthesisAbortRef.current = null;
      }
    }
  };

  const getAudioDurationSeconds = (audioSrc: string): Promise<number> =>
    new Promise((resolve) => {
      const audio = new Audio();
      const settle = (value: number) => {
        audio.onloadedmetadata = null;
        audio.onerror = null;
        resolve(Math.max(1, Math.round(value || 1)));
      };

      const timer = window.setTimeout(() => {
        settle(1);
      }, 1500);

      audio.onloadedmetadata = () => {
        window.clearTimeout(timer);
        settle(audio.duration || 1);
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        settle(1);
      };
      audio.src = audioSrc;
    });

  const playVoiceFromMessage = async (
    audioDataUrl: string,
    options?: { force?: boolean; muted?: boolean }
  ) => {
    if (!options?.force && !settings.voiceAutoPlay) return;
    clearVoicePlayback();
    const audio = new Audio(audioDataUrl);
    audio.muted = Boolean(options?.muted);
    audio.volume = options?.muted ? 0 : 1;
    const endPlayback = () => {
      clearVoicePlayback();
    };
    voiceAudioRef.current = audio;
    voiceAudioUrlRef.current = null;
    audio.onended = endPlayback;
    audio.onerror = endPlayback;
    try {
      await audio.play();
    } catch {
      clearVoicePlayback();
    }
  };

  const buildCharacterReplyMessage = async (
    replyContent: string
  ): Promise<Omit<WeChatMessage, 'id' | 'timestamp'>> => {
    const content = replyContent.trim();
    if (!content || !isVoiceProviderConfigured(settings)) {
      return { role: 'character', content };
    }

    stopVoiceSynthesis();
    const abortController = new AbortController();
    voiceSynthesisAbortRef.current = abortController;
    setIsVoiceSynthesizing(true);

    try {
      const audioBlob = await synthesizeVoice(settings, content, abortController.signal);
      if (abortController.signal.aborted) {
        return { role: 'character', content };
      }
      const audioDataUrl = await blobToDataUrl(audioBlob);
      const durationSeconds = await getAudioDurationSeconds(audioDataUrl);
      return {
        role: 'character',
        type: 'voice',
        content,
        voiceAudioDataUrl: audioDataUrl,
        voiceDurationSeconds: durationSeconds,
        voiceTranscriptText: content,
        voiceTranscriptVisible: false,
      };
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Build character voice message failed:', error);
      }
      return { role: 'character', content };
    } finally {
      if (voiceSynthesisAbortRef.current === abortController) {
        voiceSynthesisAbortRef.current = null;
      }
      setIsVoiceSynthesizing(false);
    }
  };

  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    const scrollHeight = element.scrollHeight;
    element.style.height = `${Math.min(scrollHeight, 120)}px`;
    setIsMultiline(scrollHeight > 36);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (pendingVoiceDraft) {
      setPendingVoiceDraft(null);
    }
    setInputValue(e.target.value);
    adjustTextareaHeight(e.target);
    if (showPlusMenu) setShowPlusMenu(false);
  };

  const toggleSelection = (messageId: string) => {
    setSelectedMessageIds(prev => prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]);
  };

  const exitSelectionMode = () => { setIsSelectionMode(false); setSelectedMessageIds([]); };

  const openMessageMenu = (msg: WeChatMessage, clientX: number, clientY: number) => {
    if (isSelectionMode) {
      toggleSelection(msg.id);
      return;
    }
    if (navigator.vibrate) navigator.vibrate(50);
    const x = Math.min(Math.max(clientX - 100, 20), window.innerWidth - 220);
    const y = Math.max(clientY - 90, 100);
    setMenuState({
      messageId: msg.id,
      x,
      y,
      text: msg.content,
      messageType: msg.type,
      canTranscribe: msg.type === 'voice' && Boolean(msg.voiceTranscriptText),
      transcriptVisible: Boolean(msg.voiceTranscriptVisible),
    });
  };

  const handleMessageClick = (e: React.MouseEvent, msg: WeChatMessage) => {
    e.stopPropagation();
    openMessageMenu(msg, e.clientX, e.clientY);
  };

  const executeDelete = () => {
    if (!session?.id) return;
    const idsToDelete = deleteTarget === 'multi' ? selectedMessageIds : [deleteTarget!];
    if (idsToDelete.length > 0) deleteWeChatMessages(session.id, idsToDelete);
    setDeleteTarget(null);
    if (deleteTarget === 'multi') exitSelectionMode();
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } 
    catch (err) { /* 忽略剪贴板失败，保持静默降级 */ }
    setMenuState(null);
  };

  const handlePlayVoiceMessage = (message: WeChatMessage) => {
    if (!message.voiceAudioDataUrl) {
      setToastMessage('语音文件不存在');
      setTimeout(() => setToastMessage(null), 1500);
      return;
    }

    if (playingVoiceMessageId === message.id) {
      stopMessageVoicePlayback();
      return;
    }

    stopMessageVoicePlayback();
    const audio = new Audio(message.voiceAudioDataUrl);
    audio.onended = () => {
      stopMessageVoicePlayback();
    };
    audio.onerror = () => {
      stopMessageVoicePlayback();
      setToastMessage('语音播放失败');
      setTimeout(() => setToastMessage(null), 1500);
    };

    messageVoiceAudioRef.current = audio;
    setPlayingVoiceMessageId(message.id);
    void audio.play().catch(() => {
      stopMessageVoicePlayback();
      setToastMessage('语音播放失败');
      setTimeout(() => setToastMessage(null), 1500);
    });
  };

  const toggleVoiceTranscript = () => {
    if (!session?.id || !menuState?.messageId) return;
    const targetMessage = messages.find((item) => item.id === menuState.messageId);
    if (!targetMessage || targetMessage.type !== 'voice' || !targetMessage.voiceTranscriptText) {
      setMenuState(null);
      return;
    }
    updateWeChatMessage(session.id, targetMessage.id, {
      voiceTranscriptVisible: !targetMessage.voiceTranscriptVisible,
    });
    setToastMessage(targetMessage.voiceTranscriptVisible ? '已隐藏文字' : '已转为文字');
    setTimeout(() => setToastMessage(null), 1500);
    setMenuState(null);
  };

  const handlePeerAvatarTap = () => {
    if (!session?.id) return;

    const now = Date.now();
    const tapWindowMs = 700;
    const tapState = peerAvatarTapStateRef.current;
    tapState.count = now - tapState.lastTapAt <= tapWindowMs ? tapState.count + 1 : 1;
    tapState.lastTapAt = now;

    if (tapState.count < 2) return;

    tapState.count = 0;
    const suffix = (character?.patSuffix ?? '的肩膀').trim();
    const content = suffix ? `你拍了拍${character?.name}${suffix}` : `你拍了拍${character?.name}`;
    addWeChatMessage(session.id, { role: 'user', content, type: 'pat' });
    scrollToBottom();
  };

  const executeForward = (targetCharacterId: string) => {
    if (!forwardTargetModal) return;

    let targetSessionId = wechatSessions.find((sessionItem) => sessionItem.characterId === targetCharacterId)?.id;
    if (!targetSessionId) {
      targetSessionId = ensureWeChatSession(targetCharacterId, { switchCurrent: false });
    }
    if (!targetSessionId) return;

    const msgsToForward = messages
      .filter((messageItem) => forwardTargetModal.messageIds.includes(messageItem.id))
      .sort((left, right) => left.timestamp - right.timestamp);

    msgsToForward.forEach((messageItem) =>
      addWeChatMessage(targetSessionId!, {
        role: 'user',
        content: messageItem.content,
        type: messageItem.type,
        amount: messageItem.amount,
        voiceAudioDataUrl: messageItem.voiceAudioDataUrl,
        voiceDurationSeconds: messageItem.voiceDurationSeconds,
        voiceTranscriptText: messageItem.voiceTranscriptText,
        voiceTranscriptVisible: messageItem.voiceTranscriptVisible,
        imageDataUrl: messageItem.imageDataUrl,
        imageMimeType: messageItem.imageMimeType,
      })
    );

    setForwardTargetModal(null);
    if (isSelectionMode) exitSelectionMode();
    setToastMessage('已转发');
    setTimeout(() => setToastMessage(null), 2000);
  };

  const buildApiMessages = (basePrompt: string, sessionId: string): ChatCompletionMessage[] => {
    const stateSnapshot = useWeChatStore.getState();
    stateSnapshot.syncWeChatRoleContext();
    const syncedStateSnapshot = useWeChatStore.getState();
    const chatHistory = syncedStateSnapshot.wechatSessions.find((s) => s.id === sessionId)?.messages || [];
    const sessionContextLimit = normalizeSessionContextMessageLimit(
      syncedStateSnapshot.wechatAiChatSettings?.recentMessageCount
    );
    const memoryReferenceLimit = normalizeMemoryReferenceLimit(
      syncedStateSnapshot.wechatAiChatSettings?.memoryReferenceCount
    );
    const includePersonalProfileMemory =
      syncedStateSnapshot.wechatAiChatSettings?.includePersonalProfileMemory !== false;
    const personalProfileMemoryLimit = includePersonalProfileMemory
      ? normalizePersonalProfileMemoryLimit(Math.min(24, Math.max(0, memoryReferenceLimit)))
      : 0;
    const sessionContextMessages =
      sessionContextLimit > 0 ? chatHistory.slice(-sessionContextLimit) : [];
    const recentSourceIdSet = new Set(sessionContextMessages.map((item) => item.id));
    const recentContentSet = new Set(
      sessionContextMessages
        .map((item) => normalizeMessageContentForMemoryComparison(item))
        .map((item) => item.trim())
        .filter(Boolean)
    );
    const apiMessages: ChatCompletionMessage[] = [{ role: 'system', content: basePrompt }];

    const memoryLines = (() => {
      if (memoryReferenceLimit <= 0) return [];

      // Pull a larger candidate window, then dedupe against current session context.
      const candidateRecords = wechatMemoryController.selectByContact(characterId, {
        limit: Math.max(memoryReferenceLimit * 4, memoryReferenceLimit + sessionContextMessages.length),
      });

      const dedupedRecords = candidateRecords.filter((record) => {
        if (record.sourceId && recentSourceIdSet.has(record.sourceId)) return false;
        const normalizedContent = record.content.trim();
        if (!normalizedContent) return false;
        return !recentContentSet.has(normalizedContent);
      });

      return dedupedRecords
        .slice(0, memoryReferenceLimit)
        .slice()
        .reverse()
        .map((record) => `- ${record.role === 'user' ? '我' : '你'}：${record.content}`);
    })();

    if (memoryLines.length > 0) {
      apiMessages.push({
        role: 'system',
        content: `以下是历史交互记忆，请结合参考，不要逐字复述：\n${memoryLines.join('\n')}`,
      });
    }

    const personalProfileLines = (() => {
      if (personalProfileMemoryLimit <= 0) return [];

      const perAppLimit = Math.max(1, Math.min(6, Math.ceil(personalProfileMemoryLimit / 4)));
      const groups = queryPersonalMemoryByApp({
        roleId: syncedStateSnapshot.activeRoleId,
        order: 'desc',
        limitPerApp: perAppLimit,
      }).filter((group) => group.appId !== 'wechat');

      if (groups.length === 0) return [];

      const dedupedContent = new Set<string>();
      const lines: string[] = [];

      groups.forEach((group) => {
        if (lines.length >= personalProfileMemoryLimit) return;
        const appLabel = getAppById(group.appId)?.name || group.appId;

        group.records.forEach((record) => {
          if (lines.length >= personalProfileMemoryLimit) return;
          const normalizedContent = record.content.trim();
          if (!normalizedContent) return;
          if (recentContentSet.has(normalizedContent)) return;
          if (dedupedContent.has(normalizedContent)) return;
          dedupedContent.add(normalizedContent);
          lines.push(`- [${appLabel}] ${normalizedContent}`);
        });
      });

      return lines;
    })();

    if (personalProfileLines.length > 0) {
      apiMessages.push({
        role: 'system',
        content: `以下是用户在其他应用中沉淀的个人信息，请仅在相关时自然参考，不要生硬复述：\n${personalProfileLines.join('\n')}`,
      });
    }

    sessionContextMessages.forEach((m) => {
      const role: 'user' | 'assistant' = m.role === 'user' ? 'user' : 'assistant';

      if (m.type === 'image') {
        const caption = m.content.trim();
        const normalizedCaption = caption && caption !== '[图片]' ? caption : '';

        if (m.role === 'user' && m.imageDataUrl) {
          const textPrompt = normalizedCaption || '请根据这张图片内容回复。';
          apiMessages.push({
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: m.imageDataUrl } },
              { type: 'text', text: textPrompt },
            ],
          });
          return;
        }

        const fallbackContent = normalizedCaption
          ? `[系统记录：${role === 'user' ? '用户' : '对方'}发送了一张图片，附言：${normalizedCaption}]`
          : `[系统记录：${role === 'user' ? '用户' : '对方'}发送了一张图片]`;
        apiMessages.push({
          role,
          content: fallbackContent,
        });
        return;
      }

      let content = m.content;
      if (m.type === 'transfer') content = `[系统记录：用户向你发起了转账 ¥${m.amount}]`;
      if (m.type === 'transfer_accepted') content = `[系统记录：你已接收转账 ¥${m.amount}]`;
      if (m.type === 'pat') content = `[系统记录：${m.content}]`;
      if (m.type === 'voice') content = m.voiceTranscriptText?.trim() || m.content;
      if (m.quoteText) content = `[引用："${m.quoteText}"]\n${content}`;
      apiMessages.push({ role, content });
    });

    return apiMessages;
  };

  const requestAssistantReply = async (sessionId: string) => {
    if (!character) return;

    setIsTyping(true);
    try {
      let systemPrompt = `你扮演${character.name}与我微信聊天。设定：${character.description}。开场白：${character.greeting}。`;
      if (character.worldBookId) {
        systemPrompt += `背景：${worldBook.find(w => w.id === character.worldBookId)?.content}\n`;
      }
      systemPrompt += `\n要求：微信聊天语气，简短、口语化。直接输出内容，不带前缀。`;

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: buildApiMessages(systemPrompt, sessionId),
          temperature: settings.temperature || 0.7,
        })
      });
      if (!response.ok) throw new Error('API 失败');
      const replyContent = (await response.json()).choices[0].message.content;
      if (replyContent) {
        const replyMessage = await buildCharacterReplyMessage(replyContent);
        addWeChatMessage(sessionId, replyMessage);
        if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
          void playVoiceFromMessage(replyMessage.voiceAudioDataUrl);
        } else {
          void playVoiceReply(replyContent);
        }
      }
    } catch (e) {
      addWeChatMessage(sessionId, { role: 'character', content: '[系统提示：AI连接失败]' });
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const requestAssistantReplyForVoiceCall = async (userText: string) => {
    if (!character) return;
    if (!settings.apiKey) {
      setToastMessage('请先配置 API Key');
      setTimeout(() => setToastMessage(null), 1600);
      return;
    }

    const normalizedUserText = userText.trim();
    if (!normalizedUserText) return;

    const nextConversation = [
      ...voiceCallConversationRef.current,
      { role: 'user' as const, content: normalizedUserText },
    ].slice(-20);
    voiceCallConversationRef.current = nextConversation;

    try {
      let systemPrompt = `你扮演${character.name}与我进行微信语音通话。设定：${character.description}。开场白：${character.greeting}。`;
      if (character.worldBookId) {
        systemPrompt += `背景：${worldBook.find(w => w.id === character.worldBookId)?.content}\n`;
      }
      systemPrompt += `\n要求：用口语化、短句回应，像实时语音聊天。`;

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: systemPrompt }, ...nextConversation],
          temperature: settings.temperature || 0.7,
        }),
      });
      if (!response.ok) throw new Error('API 失败');
      const payload = await response.json();
      const replyContentRaw = payload?.choices?.[0]?.message?.content;
      const replyContent = typeof replyContentRaw === 'string' ? replyContentRaw.trim() : '';
      if (!replyContent) return;

      voiceCallConversationRef.current = [
        ...nextConversation,
        { role: 'assistant' as const, content: replyContent },
      ].slice(-20);

      const replyMessage = await buildCharacterReplyMessage(replyContent);
      if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
        await playVoiceFromMessage(replyMessage.voiceAudioDataUrl, {
          force: true,
          muted: !voiceCallSpeakerEnabledRef.current,
        });
      } else {
        setToastMessage('语音通话需要配置 Minimax 语音');
        setTimeout(() => setToastMessage(null), 1600);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setToastMessage('语音通话请求失败');
      setTimeout(() => setToastMessage(null), 1600);
    }
  };

  const processVoiceCallUtteranceQueue = async () => {
    if (voiceCallRespondingRef.current) return;
    if (!showVoiceCallView) return;
    const nextText = (voiceCallUtteranceQueueRef.current.shift() || '').trim();
    if (!nextText || !character) return;

    voiceCallRespondingRef.current = true;
    setVoiceCallStatusText('对方正在说话...');
    await requestAssistantReplyForVoiceCall(nextText);
    voiceCallRespondingRef.current = false;
    if (showVoiceCallView) {
      setVoiceCallStatusText('通话中...');
    }

    if (voiceCallUtteranceQueueRef.current.length > 0) {
      void processVoiceCallUtteranceQueue();
    }
  };

  const enqueueVoiceCallUtterance = (text: string) => {
    const normalized = text.trim();
    if (!normalized || !showVoiceCallView) return;
    voiceCallUtteranceQueueRef.current.push(normalized);
    void processVoiceCallUtteranceQueue();
  };

  const startVoiceCallRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setToastMessage('当前浏览器不支持语音识别');
      setTimeout(() => setToastMessage(null), 1800);
      return;
    }

    const startRecognitionInstance = () => {
      try {
        const recognition = new SpeechRecognition();
        voiceCallLastFinalAggregateRef.current = '';
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let finalAggregate = '';
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (!result.isFinal) continue;
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;
            finalAggregate += transcript;
          }
          const normalizedFinal = finalAggregate.trim();
          if (!normalizedFinal) return;

          const previous = voiceCallLastFinalAggregateRef.current;
          let delta = '';
          if (!previous) {
            delta = normalizedFinal;
          } else if (normalizedFinal.startsWith(previous)) {
            delta = normalizedFinal.slice(previous.length).trim();
          } else if (!previous.startsWith(normalizedFinal)) {
            delta = normalizedFinal;
          }
          voiceCallLastFinalAggregateRef.current = normalizedFinal;
          if (delta) enqueueVoiceCallUtterance(delta);
        };

        recognition.onerror = (event) => {
          const code = event?.error || '';
          if (!code || code === 'no-speech' || code === 'aborted') return;
          setToastMessage(mapSpeechRecognitionError(code));
          setTimeout(() => setToastMessage(null), 1800);
        };

        recognition.onend = () => {
          voiceCallRecognitionRef.current = null;
          if (voiceCallRecognitionStopRequestedRef.current || !voiceCallRecognitionActiveRef.current) {
            return;
          }
          clearVoiceCallRecognitionRestartTimer();
          voiceCallRecognitionRestartTimerRef.current = window.setTimeout(() => {
            voiceCallRecognitionRestartTimerRef.current = null;
            if (voiceCallRecognitionActiveRef.current && !voiceCallRecognitionStopRequestedRef.current) {
              startRecognitionInstance();
            }
          }, 140);
        };

        voiceCallRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        setToastMessage('语音识别启动失败');
        setTimeout(() => setToastMessage(null), 1800);
      }
    };

    voiceCallRecognitionActiveRef.current = true;
    voiceCallRecognitionStopRequestedRef.current = false;
    startRecognitionInstance();
  };

  const handleTransferSubmit = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !character) return;
    if (amount > (wechatUserProfile.balance || 0)) {
      alert('零钱余额不足');
      return;
    }

    let sessionId = session?.id || createWeChatSession(character.id);
    addWeChatMessage(sessionId, { role: 'user', content: `转账 ¥${amount.toFixed(2)}`, type: 'transfer', amount });
    setShowTransferView(false); setTransferAmount(''); scrollToBottom();

    if (!settings.apiKey) {
      setIsTyping(true);
      setTimeout(() => {
        withdrawWeChatBalance(amount, {
          title: '转账',
          counterparty: character.name,
          avatar: character.avatar,
        });
        const acceptedText = `已收款 ¥${amount.toFixed(2)}`;
        addWeChatMessage(sessionId!, { role: 'character', content: acceptedText, type: 'transfer_accepted', amount });
        void playVoiceReply(acceptedText);
        setIsTyping(false); scrollToBottom();
      }, 2000); return;
    }

    setIsTyping(true);
    try {
      let systemPrompt = `你扮演${character.name}与我微信聊天。设定：${character.description}。开场白：${character.greeting}。\n`;
      if (character.worldBookId) systemPrompt += `背景：${worldBook.find(w => w.id === character.worldBookId)?.content}\n`;
      systemPrompt += `[系统紧急提示：用户刚刚向你发起了一笔转账，金额：¥${amount}。如果你选择接收这笔钱，请必须在回复中包含“【接收转账】”这四个字；如果不接收或想忽略，请正常回复其他内容即可。]`;

      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
        body: JSON.stringify({ model: settings.model || 'gpt-3.5-turbo', messages: buildApiMessages(systemPrompt, sessionId), temperature: settings.temperature || 0.7 })
      });
      if (!response.ok) throw new Error('API 失败');
      const data = await response.json();
      let replyContent = data.choices[0].message.content;

      if (replyContent.includes('【接收转账】')) {
        withdrawWeChatBalance(amount, {
          title: '转账',
          counterparty: character.name,
          avatar: character.avatar,
        });
        addWeChatMessage(sessionId, { role: 'character', content: `已收款 ¥${amount.toFixed(2)}`, type: 'transfer_accepted', amount });
        replyContent = replyContent.replace('【接收转账】', '').trim();
      }
      if (replyContent) {
        const replyMessage = await buildCharacterReplyMessage(replyContent);
        addWeChatMessage(sessionId, replyMessage);
        if (replyMessage.type === 'voice' && replyMessage.voiceAudioDataUrl) {
          void playVoiceFromMessage(replyMessage.voiceAudioDataUrl);
        } else {
          void playVoiceReply(replyContent);
        }
      }
    } catch (e) { addWeChatMessage(sessionId, { role: 'character', content: '[系统提示：AI连接失败]' }); } 
    finally { setIsTyping(false); scrollToBottom(); }
  };

  const handleSend = async (inputOverride?: string) => {
    const contentToSend = (inputOverride ?? inputValue).trim();
    if (isVoiceRecording) {
      stopVoiceRecognition(true);
    }
    const hasVoiceDraftToSend = Boolean(pendingVoiceDraft);
    if ((!contentToSend && !hasVoiceDraftToSend) || !character) return;
    if (!settings.apiKey) {
      alert('请先配置 API Key');
      return;
    }

    let sessionId = session?.id || createWeChatSession(character.id);
    const messageData: Omit<WeChatMessage, 'id' | 'timestamp'> = hasVoiceDraftToSend
      ? {
          role: 'user',
          type: 'voice',
          content: contentToSend || pendingVoiceDraft!.transcript,
          voiceAudioDataUrl: pendingVoiceDraft!.audioDataUrl,
          voiceDurationSeconds: pendingVoiceDraft!.durationSeconds,
          voiceTranscriptText: contentToSend || pendingVoiceDraft!.transcript,
          voiceTranscriptVisible: false,
        }
      : {
          role: 'user',
          content: contentToSend,
        };
    if (quotingMessage) messageData.quoteText = `${quotingMessage.senderName}: ${quotingMessage.content}`;

    addWeChatMessage(sessionId, messageData);
    setInputValue('');
    setPendingVoiceDraft(null);
    setQuotingMessage(null);
    setShowFullScreenEditor(false);
    setIsMultiline(false);
    setShowPlusMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    scrollToBottom();
    await requestAssistantReply(sessionId);
  };

  const handleToggleVoiceInput = () => {
    if (isVoiceRecording) {
      stopVoiceRecognition(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setToastMessage('当前浏览器不支持语音识别');
      setTimeout(() => setToastMessage(null), 2000);
      return;
    }
    stopVoiceRecognition();
    voiceRecognitionManualStopRef.current = false;
    voiceRecognitionDiscardResultRef.current = false;
    setPendingVoiceDraft(null);
    if (showPlusMenu) setShowPlusMenu(false);

    let mediaRecorder: MediaRecorder | null = null;
    let mediaStream: MediaStream | null = null;
    let recordStartedAt = 0;
    const audioChunks: Blob[] = [];

    let transcriptCommitted = '';
    let transcriptRealtime = '';
    let hasRecognitionError = false;
    let recognitionErrorCode = '';
    let recognitionErrorMessage = '';
    let shouldStopDueToError = false;

    const stopVoiceCapture = async (): Promise<VoiceCaptureResult | null> => {
      const finalizeCapture = (): VoiceCaptureResult | null => {
        if (!mediaStream) return null;
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        if (audioChunks.length === 0) return null;
        const audioBlob = new Blob(audioChunks, {
          type: mediaRecorder?.mimeType || 'audio/webm',
        });
        if (!audioBlob.size) return null;
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordStartedAt) / 1000));
        return { audioBlob, durationSeconds };
      };

      if (!mediaRecorder) {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
        return null;
      }

      if (mediaRecorder.state === 'inactive') {
        return finalizeCapture();
      }

      return new Promise((resolve) => {
        const done = () => resolve(finalizeCapture());
        mediaRecorder?.addEventListener('stop', done, { once: true });
        try {
          mediaRecorder?.stop();
        } catch {
          done();
        }
      });
    };

    const finalizeVoiceRecording = async () => {
      if (voiceRecognitionRestartTimerRef.current) {
        window.clearTimeout(voiceRecognitionRestartTimerRef.current);
        voiceRecognitionRestartTimerRef.current = null;
      }

      const voiceCaptureResult = await stopVoiceCapture();
      const transcript = (transcriptRealtime || transcriptCommitted).trim();
      speechRecognitionRef.current = null;
      setIsVoiceRecording(false);
      finalizeVoiceRecordingRef.current = null;

      if (voiceRecognitionDiscardResultRef.current) {
        voiceRecognitionDiscardResultRef.current = false;
        setPendingVoiceDraft(null);
        return;
      }

      if (transcript) {
        if (voiceCaptureResult) {
          try {
            const audioDataUrl = await blobToDataUrl(voiceCaptureResult.audioBlob);
            setPendingVoiceDraft({
              audioDataUrl,
              durationSeconds: voiceCaptureResult.durationSeconds,
              transcript,
            });
          } catch {
            setPendingVoiceDraft(null);
          }
        } else {
          setPendingVoiceDraft(null);
        }
        setInputValue(transcript);
        setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
        return;
      }

      setPendingVoiceDraft(null);
      voiceRecognitionDiscardResultRef.current = false;
      if (
        hasRecognitionError &&
        recognitionErrorCode &&
        recognitionErrorCode !== 'aborted' &&
        recognitionErrorCode !== 'no-speech'
      ) {
        setToastMessage(recognitionErrorMessage || '语音识别失败');
        setTimeout(() => setToastMessage(null), 2000);
      }
    };

    const startRecognition = () => {
      try {
        const recognition = new SpeechRecognition();
        let currentSessionFinal = '';
        let currentSessionInterim = '';

        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let nextFinal = '';
          let nextInterim = '';

          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result?.[0]?.transcript?.trim();
            if (!transcript) continue;

            if (result.isFinal) {
              nextFinal += transcript;
            } else {
              nextInterim += transcript;
            }
          }

          currentSessionFinal = nextFinal.trim();
          currentSessionInterim = nextInterim.trim();
          transcriptRealtime = `${transcriptCommitted}${currentSessionFinal}${currentSessionInterim}`.trim();
          setInputValue(transcriptRealtime);
          setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
        };

        recognition.onerror = (event) => {
          hasRecognitionError = true;
          recognitionErrorCode = event?.error || '';
          recognitionErrorMessage = mapSpeechRecognitionError(event?.error);

          if (
            recognitionErrorCode &&
            recognitionErrorCode !== 'aborted' &&
            recognitionErrorCode !== 'no-speech'
          ) {
            shouldStopDueToError = true;
          }
        };

        recognition.onend = () => {
          speechRecognitionRef.current = null;

          const stablePart = (currentSessionFinal || currentSessionInterim).trim();
          if (stablePart) {
            transcriptCommitted = `${transcriptCommitted}${stablePart}`.trim();
            transcriptRealtime = transcriptCommitted;
            setInputValue(transcriptCommitted);
            setTimeout(() => adjustTextareaHeight(textareaRef.current), 0);
          }

          if (voiceRecognitionManualStopRef.current || shouldStopDueToError) {
            void finalizeVoiceRecording();
            return;
          }

          if (voiceRecognitionRestartTimerRef.current) {
            window.clearTimeout(voiceRecognitionRestartTimerRef.current);
            voiceRecognitionRestartTimerRef.current = null;
          }
          voiceRecognitionRestartTimerRef.current = window.setTimeout(() => {
            voiceRecognitionRestartTimerRef.current = null;
            if (!voiceRecognitionManualStopRef.current) {
              startRecognition();
            }
          }, 120);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        hasRecognitionError = true;
        recognitionErrorCode = 'start-failed';
        recognitionErrorMessage = '无法启动语音识别';
        shouldStopDueToError = true;
        void finalizeVoiceRecording();
      }
    };

    const startCaptureAndRecognition = async () => {
      if (typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(mediaStream);
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          recordStartedAt = Date.now();
          mediaRecorder.start();
        } catch {
          mediaRecorder = null;
          if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
          }
        }
      }

      setIsVoiceRecording(true);
      finalizeVoiceRecordingRef.current = () => {
        void finalizeVoiceRecording();
      };
      startRecognition();
    };

    void startCaptureAndRecognition();
  };

  if (!character) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-[#EDEDED] flex flex-col z-50">
        
        {/* 顶部 Header */}
        <WeChatChatHeader isSelectionMode={isSelectionMode} selectedCount={selectedMessageIds.length} characterName={character.name} isTyping={isTyping} onBack={onBack} onExitSelection={exitSelectionMode} />

        {/* 虚拟列表内容 */}
        <div className="flex-1 relative bg-[#EDEDED]" onClick={() => showPlusMenu && setShowPlusMenu(false)}>
          <div
            ref={scrollRef}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              ...chatBackgroundStyle,
            }}
          >
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const message = messages[virtualItem.index];
                return (
                  <div key={message.id} data-index={virtualItem.index} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)`, padding: '16px 16px 8px 16px' }}>
                    <WeChatChatMessageItem 
                      message={message} isUser={message.role === 'user'} 
                      userAvatar={wechatUserProfile?.avatar} characterAvatar={character.avatar} characterName={character.name}
                      selfBubblePreset={wechatUiSettings.selfBubblePreset}
                      peerBubblePreset={wechatUiSettings.peerBubblePreset}
                      customRenderConfig={customRenderConfig}
                      isSelected={selectedMessageIds.includes(message.id)} isSelectionMode={isSelectionMode}
                      isMenuOpen={menuState?.messageId === message.id}
                      onMessageClick={readOnly ? (event) => event.stopPropagation() : handleMessageClick}
                      onOpenMessageMenu={readOnly ? undefined : openMessageMenu}
                      onVoiceMessagePlay={readOnly ? undefined : handlePlayVoiceMessage}
                      isVoicePlaying={playingVoiceMessageId === message.id}
                      onToggleSelection={readOnly ? () => undefined : toggleSelection}
                      onAvatarClick={readOnly ? undefined : handlePeerAvatarTap}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部输入组件 */}
        <WeChatChatInputBar 
          readOnly={readOnly}
          isSelectionMode={isSelectionMode} selectedCount={selectedMessageIds.length}
          inputValue={inputValue}
          hasVoiceDraft={Boolean(pendingVoiceDraft)}
          isTyping={isTyping}
          isVoiceRecording={isVoiceRecording}
          isVoiceBusy={isVoiceSynthesizing}
          isMultiline={isMultiline}
          textareaRef={textareaRef} showPlusMenu={showPlusMenu} setShowPlusMenu={setShowPlusMenu}
          quotingMessage={quotingMessage} setQuotingMessage={setQuotingMessage}
          onSend={() => { void handleSend(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          onInputChange={handleInputChange}
          onShowTransfer={() => setShowTransferView(true)}
          onShowCallOptions={handleOpenCallTypeSheet}
          onChooseImage={handleOpenImagePicker}
          onTakePhoto={handleOpenCameraCapture}
          onShowFullScreenEditor={() => setShowFullScreenEditor(true)}
          onToggleVoiceInput={handleToggleVoiceInput}
          onOpenVoiceRecorder={handleOpenVoiceRecorderModal}
          onForwardMulti={() => setForwardTargetModal({ messageIds: selectedMessageIds })} onDeleteMulti={() => setDeleteTarget('multi')}
        />
      </motion.div>
      {!readOnly && (
        <>
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleChooseImage(event);
        }}
      />
      <input
        ref={cameraFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleTakePhoto(event);
        }}
      />
      {showCameraCaptureModal ? (
        <div className="fixed inset-0 z-[280] bg-black/85 flex flex-col">
          <div className="px-4 pt-[max(env(safe-area-inset-top),18px)] pb-3 flex items-center justify-between text-white">
            <button
              type="button"
              onClick={handleCloseCameraCapture}
              className="rounded-md px-3 py-1.5 bg-white/15 active:bg-white/25 text-[14px]"
            >
              取消
            </button>
            <div className="text-[15px] font-medium">
              {isCameraInitializing ? '正在打开摄像头...' : '拍照发送'}
            </div>
            <div className="w-[58px]" />
          </div>
          <div className="flex-1 px-4 pb-4 flex items-center justify-center">
            <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden bg-black border border-white/10">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {isCameraInitializing ? (
                <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/90 bg-black/35">
                  正在连接摄像头...
                </div>
              ) : null}
            </div>
          </div>
          <div className="pb-[max(env(safe-area-inset-bottom),24px)] px-6 pt-2">
            <button
              type="button"
              onClick={() => {
                void handleCaptureFromCamera();
              }}
              disabled={isCameraInitializing || isSendingImage}
              className={`w-full h-12 rounded-full text-[16px] font-medium text-white ${
                isCameraInitializing || isSendingImage
                  ? 'bg-gray-500'
                  : 'bg-[#07C160] active:opacity-85'
              }`}
            >
              {isSendingImage ? '发送中...' : '拍照并发送'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 集成所有的 Modals 弹窗 */}
      <Modals.TransferView show={showTransferView} onClose={() => setShowTransferView(false)} onSubmit={handleTransferSubmit} amount={transferAmount} setAmount={setTransferAmount} character={character} />
      <Modals.FullScreenEditor show={showFullScreenEditor} onClose={() => setShowFullScreenEditor(false)} onSend={() => { void handleSend(); }} inputValue={inputValue} setInputValue={setInputValue} isTyping={isTyping} adjustHeight={adjustTextareaHeight} textareaRef={textareaRef} />
      <Modals.ContextMenu
        menuState={menuState}
        closeMenu={() => setMenuState(null)}
        onCopy={() => handleCopy(menuState!.text)}
        onForward={() => { setForwardTargetModal({ messageIds: [menuState!.messageId] }); setMenuState(null); }}
        onDelete={() => { setDeleteTarget(menuState!.messageId); setMenuState(null); }}
        onSelect={() => { setIsSelectionMode(true); setSelectedMessageIds([menuState!.messageId]); setMenuState(null); }}
        onQuote={() => {
          const t = messages.find(m => m.id === menuState!.messageId);
          if (t) {
            setQuotingMessage({ senderName: t.role === 'user' ? (wechatUserProfile?.name || '我') : character.name, content: menuState!.text });
          }
          setMenuState(null);
        }}
        onTranscribe={menuState?.canTranscribe ? toggleVoiceTranscript : undefined}
        transcribeLabel={menuState?.transcriptVisible ? '隐藏文字' : '转文字'}
      />
      <Modals.ForwardTargetModal show={!!forwardTargetModal} onClose={() => setForwardTargetModal(null)} characters={wechatCharacters} onSelectContact={executeForward} />
      <Modals.ConfirmDialog show={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={executeDelete} />
      <Modals.CallTypeSheet
        show={showCallTypeSheet}
        onClose={() => setShowCallTypeSheet(false)}
        onVideoCall={() => {
          setToastMessage('视频通话暂未开放');
          setTimeout(() => setToastMessage(null), 1600);
        }}
        onVoiceCall={handleStartVoiceCall}
      />
      <Modals.VoiceCallView
        show={showVoiceCallView && !isVoiceCallMinimized}
        onClose={handleCloseVoiceCall}
        onMinimize={handleMinimizeVoiceCall}
        character={character}
        statusText={voiceCallStatusText}
        micEnabled={voiceCallMicEnabled}
        speakerEnabled={voiceCallSpeakerEnabled}
        onToggleMic={() => {
          setVoiceCallMicEnabled((prev) => {
            const next = !prev;
            if (!next) {
              setVoiceCallStatusText('麦克风已关闭');
              stopVoiceCallRecognition();
            } else {
              setVoiceCallStatusText('通话中...');
            }
            return next;
          });
        }}
        onToggleSpeaker={() => setVoiceCallSpeakerEnabled((prev) => !prev)}
      />
      <Modals.VoiceRecorderModal
        show={showVoiceRecorderModal}
        onClose={handleCloseVoiceRecorderModal}
        isRecording={isRealVoiceRecording}
        onToggleRecording={handleToggleRealVoiceRecording}
      />
        </>
      )}
      <Modals.Toast message={toastMessage} />
    </>
  );
};

