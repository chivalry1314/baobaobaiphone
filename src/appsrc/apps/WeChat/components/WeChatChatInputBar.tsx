import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  decodeWeChatOnlineStickerToken,
  encodeWeChatStickerToken,
  readWeChatCustomStickers,
  removeWeChatCustomSticker,
  WECHAT_CUSTOM_STICKERS_CHANGED_EVENT,
  wechatGifStickers,
  type WeChatGifSticker,
} from '../emojiStickers';
import type { WeChatBubblePreset, WeChatCustomBubbleStyle, WeChatCustomFontStyle } from '../types';
import {
  Mic,
  Radio,
  Smile,
  Plus,
  Image as ImageIcon,
  Camera,
  Forward,
  Box,
  Trash2,
  Mail,
  Maximize,
  XCircle,
  ArrowRightLeft,
  Video,
  Heart,
  MessageCircle,
  Search,
  Type,
  Delete,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface WeChatChatInputBarProps {
  readOnly?: boolean;
  isKeyboardVisible?: boolean;
  isSelectionMode: boolean;
  selectedCount: number;
  inputValue: string;
  hasVoiceDraft: boolean;
  isTyping: boolean;
  isVoiceRecording: boolean;
  isVoiceBusy: boolean;
  isMultiline: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputFocus: () => void;
  onInputBlur: () => void;
  showPlusMenu: boolean;
  setShowPlusMenu: (show: boolean) => void;
  quotingMessage: { senderName: string; content: string } | null;
  setQuotingMessage: (val: null) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onInputChange: (value: string) => void;
  onDeleteInput: () => void;
  onSendOnlineSticker: (sticker: WeChatGifSticker) => void;
  onAddCustomStickerFile: (file: File) => void;
  currentBubblePreset: WeChatBubblePreset;
  currentBubbleColor: string;
  customBubbleCss: string;
  currentCustomBubbleStyleId: string;
  currentChatFontFamily: string;
  hasCustomChatFont: boolean;
  customBubbleStyles: WeChatCustomBubbleStyle[];
  customChatFonts: WeChatCustomFontStyle[];
  onSelectBubblePreset: (preset: WeChatBubblePreset) => void;
  onSelectBubbleColor: (color: string) => void;
  onSelectCustomBubbleStyle: (id: string, css: string) => void;
  onAddCustomBubbleStyle: (name: string, css: string) => void;
  onDeleteCustomBubbleStyle: (id: string) => void;
  onAddCustomFontFile: (file: File, name: string) => void;
  onDeleteCustomFont: (id: string) => void;
  onSelectChatFont: (fontFamily: string) => void;
  onShowTransfer: () => void;
  onShowCallOptions: () => void;
  onChooseImage: () => void;
  onTakePhoto: () => void;
  onShowFullScreenEditor: () => void;
  onToggleVoiceInput: () => void;
  onOpenVoiceRecorder: () => void;
  onForwardMulti: () => void;
  onDeleteMulti: () => void;
}

export const WeChatChatInputBar: React.FC<WeChatChatInputBarProps> = ({
  readOnly = false,
  isKeyboardVisible = false,
  isSelectionMode,
  selectedCount,
  inputValue,
  hasVoiceDraft,
  isTyping,
  isVoiceRecording,
  isVoiceBusy,
  isMultiline,
  textareaRef,
  onInputFocus,
  onInputBlur,
  showPlusMenu,
  setShowPlusMenu,
  quotingMessage,
  setQuotingMessage,
  onSend,
  onKeyDown,
  onInputChange,
  onDeleteInput,
  onSendOnlineSticker,
  onAddCustomStickerFile,
  currentBubblePreset,
  currentBubbleColor,
  customBubbleCss,
  currentCustomBubbleStyleId,
  currentChatFontFamily,
  hasCustomChatFont,
  customBubbleStyles,
  customChatFonts,
  onSelectBubblePreset,
  onSelectBubbleColor,
  onSelectCustomBubbleStyle,
  onAddCustomBubbleStyle,
  onDeleteCustomBubbleStyle,
  onAddCustomFontFile,
  onDeleteCustomFont,
  onSelectChatFont,
  onShowTransfer,
  onShowCallOptions,
  onChooseImage,
  onTakePhoto,
  onShowFullScreenEditor,
  onToggleVoiceInput,
  onOpenVoiceRecorder,
  onForwardMulti,
  onDeleteMulti,
}) => {
  const [showEmojiPanel, setShowEmojiPanel] = React.useState(false);
  const [emojiPanelMode, setEmojiPanelMode] = React.useState<'local' | 'search' | 'custom' | 'bubble' | 'font'>('local');
  const [gifSearchQuery, setGifSearchQuery] = React.useState('');
  const [gifSearchResults, setGifSearchResults] = React.useState<WeChatGifSticker[]>([]);
  const [isGifSearching, setIsGifSearching] = React.useState(false);
  const [gifSearchError, setGifSearchError] = React.useState('');
  const [customStickers, setCustomStickers] = React.useState<WeChatGifSticker[]>(() => readWeChatCustomStickers());
  const [customBubbleDraftCss, setCustomBubbleDraftCss] = React.useState(customBubbleCss);
  const [isManagingCustomStickers, setIsManagingCustomStickers] = React.useState(false);
  const [isManagingCustomBubbles, setIsManagingCustomBubbles] = React.useState(false);
  const [isManagingCustomFonts, setIsManagingCustomFonts] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const customStickerInputRef = React.useRef<HTMLInputElement | null>(null);
  const customFontInputRef = React.useRef<HTMLInputElement | null>(null);
  const savedEditorRangeRef = React.useRef<Range | null>(null);
  const bubblePresetOptions: Array<{
    key: WeChatBubblePreset;
    label: string;
    selfClass: string;
    peerClass: string;
  }> = [
    { key: 'wechat', label: '微信经典', selfClass: 'rounded-lg rounded-tr-none', peerClass: 'rounded-lg rounded-tl-none' },
    { key: 'rounded', label: '柔和圆角', selfClass: 'rounded-2xl rounded-tr-[8px] shadow-sm', peerClass: 'rounded-2xl rounded-tl-[8px] shadow-sm' },
    { key: 'glass', label: '玻璃气泡', selfClass: 'rounded-2xl rounded-tr-[8px] backdrop-blur-md opacity-80', peerClass: 'rounded-2xl rounded-tl-[8px] backdrop-blur-md opacity-80' },
    { key: 'outline', label: '描边气泡', selfClass: 'rounded-xl rounded-tr-[8px]', peerClass: 'rounded-xl rounded-tl-[8px]' },
  ];
  const bubbleColorOptions = ['#bbf7d0', '#bae6fd', '#fbcfe8', '#fef08a', '#ddd6fe', '#fed7aa', '#ccfbf1', '#fecaca'];
  const getSoftPreviewColor = (color: string) => {
    const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];
    if (hex) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.58)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
      };
    }
    const rgb = color.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const [r, g, b] = rgb[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if ([r, g, b].every((item) => Number.isFinite(item))) {
        return {
          backgroundColor: `rgba(${r}, ${g}, ${b}, 0.58)`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
        };
      }
    }
    return { backgroundColor: color || '#bbf7d0', borderColor: color || '#bbf7d0' };
  };
  const extractBubbleCssDeclarations = (css: string): string => {
    const blockMatch = css.match(/\.bubble\s*\{([\s\S]*?)\}/i);
    return (blockMatch?.[1] || css).trim();
  };
  const parseCssPreviewStyle = (css: string): React.CSSProperties => {
    return extractBubbleCssDeclarations(css)
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .reduce<React.CSSProperties>((acc, item) => {
        const index = item.indexOf(':');
        if (index <= 0) return acc;
        const key = item
          .slice(0, index)
          .trim()
          .replace(/[-_]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
        const value = item.slice(index + 1).trim();
        if (key && value) (acc as Record<string, string>)[key] = value;
        return acc;
      }, {});
  };
  const lastEditorValueRef = React.useRef('');
  const keepTextareaFocused = (
    event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };
  const saveEditorSelection = React.useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedEditorRangeRef.current = range.cloneRange();
    }
  }, []);
  const closeEmojiPanelForTyping = React.useCallback(() => {
    if (showEmojiPanel) setShowEmojiPanel(false);
    setShowPlusMenu(false);
  }, [setShowPlusMenu, showEmojiPanel]);
  const bottomPaddingClass = isKeyboardVisible ? 'pb-0' : 'pb-safe';
  const stickerByName = React.useMemo(
    () => new Map(wechatGifStickers.map((sticker) => [sticker.name, sticker])),
    []
  );

  React.useEffect(() => {
    setCustomBubbleDraftCss(customBubbleCss);
  }, [customBubbleCss]);

  const serializeEditor = React.useCallback((root: HTMLElement): string => {
    const readNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (!(node instanceof HTMLElement)) return '';
      const stickerName = node.dataset?.stickerName;
      if (stickerName) {
        return encodeWeChatStickerToken({
          id: node.dataset?.stickerId || stickerName,
          name: stickerName,
          url: node.dataset?.stickerUrl || '',
          online: node.dataset?.stickerOnline === 'true',
        });
      }
      if (node.tagName === 'BR') return '\n';
      return Array.from(node.childNodes).map(readNode).join('');
    };
    return Array.from(root.childNodes).map(readNode).join('').replace(/\u200B/g, '');
  }, []);

  const renderEditorValue = React.useCallback((value: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = '';
    const parts = value.split(/(\[gif:[^\]]+\]|\[[^\[\]]{1,12}\])/g).filter((part) => part.length > 0);
    parts.forEach((part) => {
      const onlineSticker = decodeWeChatOnlineStickerToken(part);
      const name = part.match(/^\[([^\[\]]{1,12})\]$/)?.[1];
      const sticker = onlineSticker || (name ? stickerByName.get(name) : undefined);
      if (sticker) {
        const span = document.createElement('span');
        span.dataset.stickerId = sticker.id;
        span.dataset.stickerName = sticker.name;
        span.dataset.stickerUrl = sticker.url;
        span.dataset.stickerOnline = sticker.online ? 'true' : 'false';
        span.contentEditable = 'false';
        span.className = '-mx-0.5 inline-flex h-7 w-7 align-[-6px]';
        const img = document.createElement('img');
        img.src = sticker.url;
        img.alt = sticker.name;
        img.className = 'h-7 w-7 object-contain';
        span.appendChild(img);
        editor.appendChild(span);
        return;
      }
      editor.appendChild(document.createTextNode(part));
    });
  }, [stickerByName]);

  React.useEffect(() => {
    if (inputValue === lastEditorValueRef.current) return;
    lastEditorValueRef.current = inputValue;
    renderEditorValue(inputValue);
  }, [inputValue, renderEditorValue]);

  const syncEditorValue = React.useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeEditor(editor);
    lastEditorValueRef.current = nextValue;
    onInputChange(nextValue);
  }, [onInputChange, serializeEditor]);

  const insertStickerIntoEditor = React.useCallback((sticker: WeChatGifSticker) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    let range = savedEditorRangeRef.current?.cloneRange() || (selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    const span = document.createElement('span');
    span.dataset.stickerId = sticker.id;
    span.dataset.stickerName = sticker.name;
    span.dataset.stickerUrl = sticker.url;
    span.dataset.stickerOnline = sticker.online ? 'true' : 'false';
    span.contentEditable = 'false';
    span.className = '-mx-0.5 inline-flex h-7 w-7 align-[-6px]';
    const img = document.createElement('img');
    img.src = sticker.url;
    img.alt = sticker.name;
    img.className = 'h-7 w-7 object-contain';
    span.appendChild(img);
    range.deleteContents();
    range.insertNode(span);
    const spacer = document.createTextNode('\u200B');
    span.after(spacer);
    range.setStartAfter(spacer);
    range.collapse(true);
    savedEditorRangeRef.current = range.cloneRange();
    syncEditorValue();
  }, [syncEditorValue]);

  const searchOnlineGifs = React.useCallback(async (query: string) => {
    const keyword = query.trim();
    if (!keyword) {
      setGifSearchResults([]);
      setGifSearchError('');
      return;
    }
    setIsGifSearching(true);
    setGifSearchError('');
    const toSticker = (id: string, name: string, url: string, index: number): WeChatGifSticker | null => {
      if (!url) return null;
      return {
        id: `online-${id || index}`,
        name: name.trim() || keyword,
        url,
        online: true,
      };
    };
    const fetchTenorV2 = async (): Promise<WeChatGifSticker[]> => {
      const params = new URLSearchParams({
        q: keyword,
        key: 'LIVDSRZULELA',
        client_key: 'baobaobaiphone_wechat',
        limit: '32',
        media_filter: 'tinygif,gif',
        contentfilter: 'medium',
        locale: 'zh_CN',
      });
      const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`);
      if (!response.ok) throw new Error(`Tenor v2 ${response.status}`);
      const payload = await response.json();
      const results = Array.isArray(payload?.results) ? payload.results : [];
      return results
        .map((item: any, index: number) => {
          const media = item?.media_formats?.tinygif || item?.media_formats?.gif;
          return toSticker(String(item?.id || ''), String(item?.content_description || keyword), String(media?.url || ''), index);
        })
        .filter(Boolean) as WeChatGifSticker[];
    };
    const fetchTenorV1 = async (): Promise<WeChatGifSticker[]> => {
      const params = new URLSearchParams({
        q: keyword,
        key: 'LIVDSRZULELA',
        limit: '32',
        media_filter: 'minimal',
        contentfilter: 'medium',
        locale: 'zh_CN',
      });
      const response = await fetch(`https://g.tenor.com/v1/search?${params.toString()}`);
      if (!response.ok) throw new Error(`Tenor v1 ${response.status}`);
      const payload = await response.json();
      const results = Array.isArray(payload?.results) ? payload.results : [];
      return results
        .map((item: any, index: number) => {
          const media = Array.isArray(item?.media) ? item.media[0] : null;
          const url = media?.tinygif?.url || media?.gif?.url || '';
          return toSticker(String(item?.id || ''), String(item?.title || keyword), String(url), index);
        })
        .filter(Boolean) as WeChatGifSticker[];
    };
    const fetchGiphy = async (): Promise<WeChatGifSticker[]> => {
      const params = new URLSearchParams({
        api_key: 'dc6zaTOxFJmzC',
        q: keyword,
        limit: '32',
        rating: 'pg-13',
        lang: 'zh-CN',
      });
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`);
      if (!response.ok) throw new Error(`GIPHY ${response.status}`);
      const payload = await response.json();
      const results = Array.isArray(payload?.data) ? payload.data : [];
      return results
        .map((item: any, index: number) => {
          const image = item?.images?.fixed_width_small || item?.images?.downsized || item?.images?.original;
          return toSticker(String(item?.id || ''), String(item?.title || keyword), String(image?.url || ''), index);
        })
        .filter(Boolean) as WeChatGifSticker[];
    };
    try {
      let stickers: WeChatGifSticker[] = [];
      let failedSourceCount = 0;
      for (const loader of [fetchTenorV2, fetchTenorV1, fetchGiphy]) {
        try {
          stickers = await loader();
          if (stickers.length > 0) break;
        } catch {
          failedSourceCount += 1;
          stickers = [];
        }
      }
      setGifSearchResults(stickers);
      if (stickers.length === 0) {
        setGifSearchError(failedSourceCount >= 3 ? '在线表情源访问失败，请检查网络后重试' : '没有找到相关表情');
      }
    } catch {
      setGifSearchResults([]);
      setGifSearchError('搜索失败，请检查网络后重试');
    } finally {
      setIsGifSearching(false);
    }
  }, []);

  React.useEffect(() => {
    if (!showEmojiPanel || emojiPanelMode !== 'search') return;
    const timer = window.setTimeout(() => {
      void searchOnlineGifs(gifSearchQuery);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [emojiPanelMode, gifSearchQuery, searchOnlineGifs, showEmojiPanel]);

  React.useEffect(() => {
    if (showPlusMenu && showEmojiPanel) {
      setShowEmojiPanel(false);
    }
  }, [showEmojiPanel, showPlusMenu]);

  React.useEffect(() => {
    const syncCustomStickers = () => setCustomStickers(readWeChatCustomStickers());
    window.addEventListener(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT, syncCustomStickers);
    window.addEventListener('storage', syncCustomStickers);
    return () => {
      window.removeEventListener(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT, syncCustomStickers);
      window.removeEventListener('storage', syncCustomStickers);
    };
  }, []);

  if (readOnly) {
    return (
      <div className={`bg-[#F7F7F7] border-t border-gray-200 px-4 py-3 shrink-0 ${bottomPaddingClass}`}>
        <p className="text-[13px] text-gray-500 text-center">查手机模式：仅可查看聊天记录</p>
      </div>
    );
  }

  if (isSelectionMode) {
    return (
      <div className={`bg-[#F7F7F7] border-t border-gray-200 px-6 py-2 flex items-center justify-between shrink-0 ${bottomPaddingClass}`}>
        <button
          onClick={onForwardMulti}
          disabled={selectedCount === 0}
          className={`p-2 transition-opacity ${
            selectedCount > 0 ? 'text-gray-800 active:opacity-50' : 'text-gray-300'
          }`}
        >
          <Forward size={24} strokeWidth={1.5} />
        </button>
        <button className="text-gray-800 active:opacity-50 p-2">
          <Box size={24} strokeWidth={1.5} />
        </button>
        <button
          onClick={onDeleteMulti}
          disabled={selectedCount === 0}
          className={`p-2 transition-opacity ${
            selectedCount > 0 ? 'text-gray-800 active:opacity-50' : 'text-gray-300'
          }`}
        >
          <Trash2 size={24} strokeWidth={1.5} />
        </button>
        <button className="text-gray-800 active:opacity-50 p-2">
          <Mail size={24} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-[#F7F7F7] border-t border-gray-200 flex flex-col shrink-0 ${bottomPaddingClass}`}>
      <input
        ref={customStickerInputRef}
        type="file"
        accept="image/gif,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onAddCustomStickerFile(file);
        }}
      />
      <input
        ref={customFontInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            const fallbackName = file.name.replace(/\.[^.]+$/, '') || '自定义字体';
            const name = window.prompt('给这个字体起个名字', fallbackName)?.trim();
            if (name) onAddCustomFontFile(file, name);
          }
        }}
      />
      <style>{`
        @keyframes wechatEmojiFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          45% { transform: translate3d(0, -2px, 0) scale(1.03); }
        }
      `}</style>
      <div className="px-1.5 py-2 flex flex-col">
        <div className="flex items-end gap-1 w-full min-w-0">
          <div className="flex flex-col justify-end shrink-0 mb-0.5 w-[42px] sm:w-[52px] items-start">
            <AnimatePresence>
              {isMultiline && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 10 }}
                  transition={{ duration: 0.15 }}
                  onClick={onShowFullScreenEditor}
                  className="text-gray-500 hover:text-gray-700 active:opacity-50 p-1 w-[40px] sm:w-[46px] h-[32px] flex items-center justify-center mb-1"
                >
                  <Maximize size={22} strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={onOpenVoiceRecorder}
              className="w-[42px] h-[42px] sm:w-[50px] sm:h-[50px] rounded-full bg-transparent text-[#2f3135] flex items-center justify-center transition-transform active:scale-95 shrink-0"
              type="button"
              aria-label="语音模式"
            >
              <Radio size={18} strokeWidth={2.1} />
            </button>
          </div>

          <div className="flex-1 min-w-0 bg-white rounded-md border border-gray-200 min-h-[40px] flex items-center px-2 py-1.5 box-border">
            <div
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              onInput={syncEditorValue}
              onKeyDown={onKeyDown}
              onKeyUp={saveEditorSelection}
              onMouseUp={saveEditorSelection}
              onFocus={() => {
                closeEmojiPanelForTyping();
                saveEditorSelection();
                onInputFocus();
              }}
              onBlur={onInputBlur}
              className="max-h-[120px] min-h-6 flex-1 min-w-0 overflow-y-auto bg-transparent text-[16px] leading-snug text-gray-900 outline-none empty:before:text-gray-400"
              suppressContentEditableWarning
            />
            <button
              onClick={onToggleVoiceInput}
              disabled={isTyping || (isVoiceBusy && !isVoiceRecording)}
              className={`ml-1 p-1 w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] flex items-center justify-center active:opacity-50 shrink-0 ${
                isVoiceRecording ? 'text-[#E5484D]' : 'text-gray-600'
              } ${isTyping || (isVoiceBusy && !isVoiceRecording) ? 'opacity-50' : ''}`}
              type="button"
            >
              <Mic size={24} strokeWidth={1.8} />
            </button>
          </div>

          <button
            type="button"
            onPointerDown={keepTextareaFocused}
            onMouseDown={keepTextareaFocused}
            onClick={() => {
              const nextShow = !showEmojiPanel;
              saveEditorSelection();
              setShowEmojiPanel(nextShow);
              setEmojiPanelMode('local');
              setShowPlusMenu(false);
              if (nextShow) editorRef.current?.blur();
            }}
            className={`active:opacity-50 p-1 mb-0.5 shrink-0 w-[30px] sm:w-[32px] flex items-center justify-center ${
              showEmojiPanel ? 'text-[#07C160]' : 'text-gray-700'
            }`}
            aria-label="表情"
          >
            <Smile size={26} strokeWidth={1.5} />
          </button>

          <div className="shrink-0 mb-0.5 w-[50px] sm:w-[56px] flex justify-end">
            <AnimatePresence mode="wait">
              {(inputValue.trim() || hasVoiceDraft) && !showEmojiPanel ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onPointerDown={keepTextareaFocused}
                  onMouseDown={keepTextareaFocused}
                  onClick={onSend}
                  type="button"
                  className="text-white text-[14px] sm:text-[15px] font-medium w-full h-[36px] sm:h-[38px] rounded-md bg-[#07C160] active:opacity-80"
                >
                  发送
                </motion.button>
              ) : (
                <motion.button
                  key="plus"
                  onClick={() => {
                    setShowEmojiPanel(false);
                    editorRef.current?.blur();
                    setShowPlusMenu(!showPlusMenu);
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-gray-700 active:opacity-50 p-1 w-[30px] sm:w-[32px] flex items-center justify-center"
                >
                  <Plus size={28} strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {quotingMessage && (
          <div className="flex gap-2 mt-2 w-full">
            <div className="w-[42px] sm:w-[52px] shrink-0 pointer-events-none opacity-0" />
            <div className="flex-1 bg-[#EAEAEA] rounded-[4px] px-2 py-1.5 flex items-center justify-between overflow-hidden">
              <span className="text-[13px] text-gray-500 truncate flex-1">
                {quotingMessage.senderName}: {quotingMessage.content}
              </span>
              <button
                onClick={() => setQuotingMessage(null)}
                className="ml-2 text-gray-400 active:opacity-50 shrink-0"
              >
                <XCircle size={16} className="text-gray-400 fill-gray-200" />
              </button>
            </div>
            <div className="w-[30px] sm:w-[32px] shrink-0 pointer-events-none opacity-0" />
            <div className="w-[50px] sm:w-[56px] shrink-0 pointer-events-none opacity-0" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEmojiPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 12 }}
            animate={{ height: '45dvh', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#F2F2F2] border-t border-gray-200 overflow-hidden shrink-0 shadow-[0_-8px_22px_rgba(15,23,42,0.06)]"
          >
            <div className="flex h-full min-h-0 flex-col">
              {emojiPanelMode === 'search' ? (
                <>
                  <div className="flex h-12 shrink-0 items-center gap-2 px-4">
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('local')}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECECEC] text-[#111] active:bg-[#E0E0E0]"
                      aria-label="返回表情"
                    >
                      <ChevronDown size={18} strokeWidth={2.2} />
                    </button>
                    <div className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2">
                      <Search size={16} strokeWidth={1.8} className="shrink-0 text-[#B8B8B8]" />
                      <input
                        value={gifSearchQuery}
                        onChange={(event) => setGifSearchQuery(event.target.value)}
                        placeholder="搜索 GIF 表情"
                        className="min-w-0 flex-1 bg-transparent text-[12px] text-[#111] outline-none placeholder:text-[#B8B8B8]"
                      />
                      {gifSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setGifSearchQuery('');
                            setGifSearchResults([]);
                            setGifSearchError('');
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#BDBDBD] text-white active:opacity-75"
                          aria-label="清空搜索"
                        >
                          <XCircle size={14} strokeWidth={2} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid h-9 shrink-0 grid-cols-2 border-b border-gray-200 text-[12px]">
                    <button type="button" className="relative font-medium text-[#111]">
                      全部表情
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-[#111]" />
                    </button>
                    <button type="button" className="text-[#8B8B8B]">合成表情</button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
                    {isGifSearching ? (
                      <div className="flex h-full items-center justify-center text-[#8B8B8B]">
                        <Loader2 size={22} className="mr-2 animate-spin" />
                        <span className="text-[14px]">搜索中</span>
                      </div>
                    ) : gifSearchResults.length > 0 ? (
                      <div className="grid grid-cols-4 gap-x-4 gap-y-4">
                        {gifSearchResults.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            onPointerDown={keepTextareaFocused}
                            onMouseDown={keepTextareaFocused}
                            onClick={() => onSendOnlineSticker(sticker)}
                            className="aspect-square overflow-hidden rounded-md bg-white active:opacity-80"
                            aria-label={`插入${sticker.name}`}
                          >
                            <img src={sticker.url} alt={sticker.name} className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[14px] text-[#8B8B8B]">
                        {gifSearchError || '输入关键词搜索在线 GIF 表情'}
                      </div>
                    )}
                  </div>
                </>
              ) : emojiPanelMode === 'local' ? (
                <>
                  <div className="flex h-11 shrink-0 items-center gap-4 overflow-x-auto px-5">
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('search')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="搜索表情"
                    >
                      <Search size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPanelMode('local');
                        setIsManagingCustomStickers(false);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#111] shadow-sm active:bg-black/5"
                      aria-label="默认表情"
                    >
                      <Smile size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('custom')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="收藏表情"
                    >
                      <Heart size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('bubble')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="气泡样式"
                    >
                      <MessageCircle size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('font')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="聊天字体"
                    >
                      <Type size={22} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="flex h-3 shrink-0 items-center justify-center border-t border-gray-200/80 bg-[#EDEDED]">
                    <span className="h-0.5 w-10 rounded-full bg-black/12" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2 [scrollbar-width:thin]">
                    <div className="mb-3 text-[14px] text-[#6F6F6F]">所有表情</div>
                    <div className="grid grid-cols-5 gap-x-5 gap-y-2">
                      {wechatGifStickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          onPointerDown={keepTextareaFocused}
                          onMouseDown={keepTextareaFocused}
                          onClick={() => {
                            insertStickerIntoEditor(sticker);
                          }}
                          className="group flex h-11 items-center justify-center rounded-xl active:bg-black/5"
                          aria-label={`插入${sticker.name}`}
                        >
                          <img src={sticker.url} alt={sticker.name} className="h-10 w-10 object-contain transition-transform duration-150 group-active:scale-90" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 bg-[#F2F2F2] px-5 py-3">
                    <div className="ml-auto grid w-[136px] grid-cols-[64px_64px] gap-2 text-[12px]">
                      <button
                        type="button"
                        onPointerDown={keepTextareaFocused}
                        onMouseDown={keepTextareaFocused}
                        onClick={onDeleteInput}
                        className="flex h-9 items-center justify-center rounded-md bg-[#E5E5E5] text-gray-400 active:bg-[#DADADA]"
                        aria-label="删除表情"
                      >
                        <Delete size={20} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onPointerDown={keepTextareaFocused}
                        onMouseDown={keepTextareaFocused}
                        onClick={onSend}
                        disabled={!inputValue.trim() && !hasVoiceDraft}
                        className={`h-9 rounded-md text-[12px] transition-colors active:opacity-80 ${
                          inputValue.trim() || hasVoiceDraft
                            ? 'bg-[#07C160] text-white'
                            : 'bg-[#E5E5E5] text-gray-400'
                        }`}
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
              {emojiPanelMode === 'custom' ? (
                <>
                  <div className="flex h-11 shrink-0 items-center gap-4 overflow-x-auto px-5">
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('search')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="搜索表情"
                    >
                      <Search size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPanelMode('local');
                        setIsManagingCustomStickers(false);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="默认表情"
                    >
                      <Smile size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#111] shadow-sm active:bg-black/5"
                      aria-label="收藏表情"
                    >
                      <Heart size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('bubble')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="气泡样式"
                    >
                      <MessageCircle size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('font')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="聊天字体"
                    >
                      <Type size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManagingCustomStickers((value) => !value)}
                      className="ml-auto text-[12px] text-[#666] active:opacity-60"
                    >
                      {isManagingCustomStickers ? '完成' : '管理'}
                    </button>
                  </div>
                  <div className="flex h-3 shrink-0 items-center justify-center border-t border-gray-200/80 bg-[#EDEDED]">
                    <span className="h-0.5 w-10 rounded-full bg-black/12" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-4 [scrollbar-width:thin]">
                    <div className="mb-4 text-[14px] text-[#6F6F6F]">添加的单个表情</div>
                    <div className="grid grid-cols-4 gap-x-6 gap-y-5">
                      <button
                        type="button"
                        onClick={() => customStickerInputRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#111] bg-transparent text-[#111] active:bg-black/5"
                        aria-label="添加表情包"
                      >
                        <Plus size={34} strokeWidth={1.6} />
                      </button>
                      {customStickers.map((sticker) => (
                        <div key={sticker.id} className="relative aspect-square">
                          <button
                            type="button"
                            onPointerDown={keepTextareaFocused}
                            onMouseDown={keepTextareaFocused}
                            onClick={() => onSendOnlineSticker(sticker)}
                            className="h-full w-full overflow-hidden rounded-md bg-white active:opacity-80"
                            aria-label={`发送${sticker.name}`}
                          >
                            <img src={sticker.url} alt={sticker.name} className="h-full w-full object-cover" loading="lazy" />
                          </button>
                          {isManagingCustomStickers ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomStickers(removeWeChatCustomSticker(sticker.id));
                              }}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow"
                              aria-label={`删除${sticker.name}`}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
              {emojiPanelMode === 'bubble' ? (
                <>
                  <div className="flex h-11 shrink-0 items-center gap-4 overflow-x-auto px-5">
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('search')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="搜索表情"
                    >
                      <Search size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmojiPanelMode('local');
                        setIsManagingCustomStickers(false);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="默认表情"
                    >
                      <Smile size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('custom')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="收藏表情"
                    >
                      <Heart size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#111] shadow-sm active:bg-black/5"
                      aria-label="气泡样式"
                    >
                      <MessageCircle size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmojiPanelMode('font')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5"
                      aria-label="聊天字体"
                    >
                      <Type size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManagingCustomBubbles((value) => !value)}
                      className="ml-auto shrink-0 text-[12px] text-[#666] active:opacity-60"
                    >
                      {isManagingCustomBubbles ? '完成' : '管理'}
                    </button>
                  </div>
                  <div className="flex h-3 shrink-0 items-center justify-center border-t border-gray-200/80 bg-[#EDEDED]">
                    <span className="h-0.5 w-10 rounded-full bg-black/12" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4 [scrollbar-width:thin]">
                    <div className="mb-4 text-[14px] text-[#6F6F6F]">气泡样式</div>
                    <div className="grid grid-cols-2 gap-3">
                      {bubblePresetOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => onSelectBubblePreset(option.key)}
                          className={`rounded-xl border bg-white p-3 text-left active:opacity-80 ${
                            !customBubbleCss && !currentCustomBubbleStyleId && currentBubblePreset === option.key ? 'border-[#07C160]' : 'border-transparent'
                          }`}
                        >
                          <div className="mb-1 flex justify-start">
                            <div
                              className={`max-w-[92%] border px-3 py-1.5 text-[12px] text-gray-900 ${option.peerClass}`}
                              style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                            >
                              对方气泡
                            </div>
                          </div>
                          <div className="mb-2 flex justify-end">
                            <div
                              className={`max-w-[92%] border px-3 py-1.5 text-[12px] text-gray-900 ${option.selfClass}`}
                              style={getSoftPreviewColor(currentBubbleColor || '#bbf7d0')}
                            >
                              我的气泡
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[12px] text-[#666]">
                            <span>{option.label}</span>
                            {!customBubbleCss && !currentCustomBubbleStyleId && currentBubblePreset === option.key ? (
                              <span className="text-[#07C160]">已选</span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 text-[12px] text-[#777]">气泡颜色</div>
                      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                        {bubbleColorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onSelectBubbleColor(color)}
                            className={`h-7 w-7 shrink-0 rounded-full border-2 ${
                              currentBubbleColor === color ? 'border-[#111]' : 'border-white'
                            } shadow-sm`}
                            style={{ backgroundColor: color }}
                            aria-label={`选择气泡颜色${color}`}
                          />
                        ))}
                      </div>
                      <input
                        value={currentBubbleColor}
                        onChange={(event) => onSelectBubbleColor(event.target.value)}
                        placeholder="rgb(149, 236, 105)"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[12px] text-[#111] outline-none"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 text-[12px] text-[#777]">自定义气泡 CSS</div>
                      {customBubbleStyles.length > 0 ? (
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          {customBubbleStyles.map((item) => (
                            <div key={item.id} className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomBubbleDraftCss(item.css);
                                  onSelectCustomBubbleStyle(item.id, item.css);
                                }}
                                className={`w-full rounded-lg border bg-white p-2 text-left text-[12px] active:opacity-80 ${
                                  currentCustomBubbleStyleId === item.id ? 'border-[#07C160]' : 'border-transparent'
                                }`}
                              >
                                <div className="mb-2 flex justify-end">
                                  <div
                                    className="max-w-full px-3 py-1.5 text-[12px] text-gray-900"
                                    style={{
                                      ...getSoftPreviewColor(currentBubbleColor || '#bbf7d0'),
                                      ...parseCssPreviewStyle(item.css),
                                    }}
                                  >
                                    {item.name}
                                  </div>
                                </div>
                                <div className="truncate text-[#999]">{item.css}</div>
                              </button>
                              {isManagingCustomBubbles ? (
                                <button
                                  type="button"
                                  onClick={() => onDeleteCustomBubbleStyle(item.id)}
                                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow"
                                  aria-label={`删除${item.name}`}
                                >
                                  <Trash2 size={13} strokeWidth={2} />
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const name = window.prompt('给这个气泡样式起个名字', '自定义气泡')?.trim();
                            if (!name) return;
                            const css = customBubbleDraftCss.trim();
                            if (!css) return;
                            onAddCustomBubbleStyle(name, css);
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[#999] text-[#333] active:bg-black/5"
                          aria-label="自定义气泡"
                        >
                          <Plus size={26} strokeWidth={1.6} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomBubbleDraftCss('')}
                          disabled={!customBubbleDraftCss}
                          className="h-8 rounded-md px-3 text-[12px] text-[#666] active:bg-black/5 disabled:text-[#BBB]"
                        >
                          清空
                        </button>
                      </div>
                      <textarea
                        value={customBubbleDraftCss}
                        onChange={(event) => setCustomBubbleDraftCss(event.target.value)}
                        placeholder="border-radius: 18px; box-shadow: 0 6px 14px rgba(0,0,0,.08);"
                        className="h-20 w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] text-[#111] outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : null}
              {emojiPanelMode === 'font' ? (
                <>
                  <div className="flex h-11 shrink-0 items-center gap-4 overflow-x-auto px-5">
                    <button type="button" onClick={() => setEmojiPanelMode('search')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5" aria-label="搜索表情">
                      <Search size={22} strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => setEmojiPanelMode('local')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5" aria-label="默认表情">
                      <Smile size={22} strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => setEmojiPanelMode('custom')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5" aria-label="收藏表情">
                      <Heart size={22} strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => setEmojiPanelMode('bubble')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#111] active:bg-black/5" aria-label="气泡样式">
                      <MessageCircle size={22} strokeWidth={1.8} />
                    </button>
                    <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#111] shadow-sm active:bg-black/5" aria-label="聊天字体">
                      <Type size={22} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManagingCustomFonts((value) => !value)}
                      className="ml-auto text-[12px] text-[#666] active:opacity-60"
                    >
                      {isManagingCustomFonts ? '完成' : '管理'}
                    </button>
                  </div>
                  <div className="flex h-3 shrink-0 items-center justify-center border-t border-gray-200/80 bg-[#EDEDED]">
                    <span className="h-0.5 w-10 rounded-full bg-black/12" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4 [scrollbar-width:thin]">
                    <div className="mb-4 text-[14px] text-[#6F6F6F]">聊天字体</div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      {[
                        { label: '系统默认', value: '' },
                        { label: '圆润字体', value: 'ui-rounded, system-ui, sans-serif' },
                        { label: '衬线字体', value: 'Georgia, serif' },
                        { label: '等宽字体', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => onSelectChatFont(item.value)}
                          className={`rounded-xl border bg-white p-3 text-left active:opacity-80 ${currentChatFontFamily === item.value ? 'border-[#07C160]' : 'border-transparent'}`}
                        >
                          <div style={{ fontFamily: item.value || undefined }} className="mb-2 text-[16px] text-[#111]">你好呀 Aa</div>
                          <div className="text-[#666]">{item.label}</div>
                        </button>
                      ))}
                      {customChatFonts.map((font) => (
                        <div key={font.id} className="relative">
                          <button
                            type="button"
                            onClick={() => onSelectChatFont(font.fontFamily)}
                            className={`min-h-[74px] w-full rounded-xl border bg-white p-3 text-left active:opacity-80 ${
                              currentChatFontFamily === font.fontFamily ? 'border-[#07C160]' : 'border-transparent'
                            }`}
                          >
                            <div style={{ fontFamily: font.fontFamily }} className="mb-2 text-[16px] text-[#111]">你好呀 Aa</div>
                            <div className="truncate text-[#666]">{font.name}</div>
                          </button>
                          {isManagingCustomFonts ? (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomFont(font.id)}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow"
                              aria-label={`删除${font.name}`}
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => customFontInputRef.current?.click()}
                        className="flex min-h-[74px] flex-col items-center justify-center rounded-xl border border-dashed border-[#999] bg-white text-[#333] active:bg-black/5"
                      >
                        <Plus size={28} strokeWidth={1.6} />
                        <span className="mt-1 text-[12px]">导入字体</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
        {showPlusMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#F7F7F7] border-t border-gray-200 overflow-hidden shrink-0"
          >
            <div className="grid grid-cols-4 gap-y-6 gap-x-4 p-6 pb-8">
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onShowCallOptions();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <Video size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">视频通话</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onShowTransfer();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <ArrowRightLeft size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">转账</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onChooseImage();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <ImageIcon size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">图片</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => {
                    setShowPlusMenu(false);
                    onTakePhoto();
                  }}
                  className="w-[60px] h-[60px] bg-white rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-100 cursor-pointer shadow-sm"
                >
                  <Camera size={28} strokeWidth={1.5} />
                </div>
                <span className="text-[12px] text-gray-500">拍照</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


