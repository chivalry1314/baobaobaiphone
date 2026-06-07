import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  decodeWeChatOnlineStickerToken,
  encodeWeChatStickerToken,
  readWeChatCustomStickers,
  removeWeChatCustomSticker,
  WECHAT_CUSTOM_STICKERS_CHANGED_EVENT,
  wechatDefaultGifStickers,
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
  onAddCustomStickerFile: (file: File, name: string) => void;
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
  const [isManagingCustomStickers, setIsManagingCustomStickers] = React.useState(false);
  const [pendingCustomStickerFile, setPendingCustomStickerFile] = React.useState<File | null>(null);
  const [customStickerNameInput, setCustomStickerNameInput] = React.useState('');
  const [isManagingCustomBubbles, setIsManagingCustomBubbles] = React.useState(false);
  const [isManagingCustomFonts, setIsManagingCustomFonts] = React.useState(false);
  const [isBubbleEditorOpen, setIsBubbleEditorOpen] = React.useState(false);
  const [bubbleEditorName, setBubbleEditorName] = React.useState('自定义气泡');
  const [bubbleEditorImage, setBubbleEditorImage] = React.useState('');
  const [bubbleEditorSize, setBubbleEditorSize] = React.useState({ width: 0, height: 0 });
  const [bubbleStretchInsets, setBubbleStretchInsets] = React.useState({ top: 24, right: 24, bottom: 24, left: 24 });
  const [bubbleContentInsets, setBubbleContentInsets] = React.useState({ top: 18, right: 18, bottom: 18, left: 18 });
  const [activeBubbleHandle, setActiveBubbleHandle] = React.useState<{
    group: 'stretch' | 'content';
    edge: 'top' | 'right' | 'bottom' | 'left';
  } | null>(null);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const customStickerInputRef = React.useRef<HTMLInputElement | null>(null);
  const customFontInputRef = React.useRef<HTMLInputElement | null>(null);
  const customBubbleImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const bubbleEditorImageBoxRef = React.useRef<HTMLDivElement | null>(null);
  const savedEditorRangeRef = React.useRef<Range | null>(null);
  const BUBBLE_EDITOR_TARGET_WIDTH = 360;
  const BUBBLE_EDITOR_TARGET_HEIGHT = 160;
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
  const splitCssDeclarations = (css: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;
    let quote: string | null = null;
    for (const char of css) {
      if (quote) {
        current += char;
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }
      if (char === '(') parenDepth += 1;
      if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
      if (char === ';' && parenDepth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current);
    return parts;
  };
  const parseCssPreviewStyle = (css: string): React.CSSProperties => {
    return splitCssDeclarations(extractBubbleCssDeclarations(css))
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

  const buildImageBubbleCss = React.useCallback(() => {
    if (!bubbleEditorImage || !bubbleEditorSize.width || !bubbleEditorSize.height) return '';
    const clean = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value)));
    const top = clean(bubbleStretchInsets.top, bubbleEditorSize.height);
    const right = clean(bubbleStretchInsets.right, bubbleEditorSize.width);
    const bottom = clean(bubbleStretchInsets.bottom, bubbleEditorSize.height);
    const left = clean(bubbleStretchInsets.left, bubbleEditorSize.width);
    const contentTop = Math.max(8, Math.min(28, clean(bubbleContentInsets.top, bubbleEditorSize.height) * 0.2));
    const contentRight = Math.max(10, Math.min(34, clean(bubbleContentInsets.right, bubbleEditorSize.width) * 0.16));
    const contentBottom = Math.max(8, Math.min(28, clean(bubbleContentInsets.bottom, bubbleEditorSize.height) * 0.2));
    const contentLeft = Math.max(10, Math.min(34, clean(bubbleContentInsets.left, bubbleEditorSize.width) * 0.16));
    const renderTop = Math.max(8, Math.min(32, top * 0.2));
    const renderRight = Math.max(8, Math.min(38, right * 0.16));
    const renderBottom = Math.max(8, Math.min(32, bottom * 0.2));
    const renderLeft = Math.max(8, Math.min(38, left * 0.16));
    return `.bubble{
border-style:solid;
border-color:transparent;
border-width:${renderTop}px ${renderRight}px ${renderBottom}px ${renderLeft}px;
border-image-source:url("${bubbleEditorImage}");
border-image-slice:${top} ${right} ${bottom} ${left} fill;
border-image-width:${renderTop}px ${renderRight}px ${renderBottom}px ${renderLeft}px;
border-image-repeat:stretch;
background:transparent;
padding:${contentTop}px ${contentRight}px ${contentBottom}px ${contentLeft}px;
}`;
  }, [bubbleContentInsets, bubbleEditorImage, bubbleEditorSize, bubbleStretchInsets]);

  const generatedBubbleCss = buildImageBubbleCss();

  const updateBubbleHandleByPoint = React.useCallback((clientX: number, clientY: number) => {
    if (!activeBubbleHandle || !bubbleEditorImageBoxRef.current || !bubbleEditorSize.width || !bubbleEditorSize.height) return;
    const rect = bubbleEditorImageBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const imageX = (x / rect.width) * bubbleEditorSize.width;
    const imageY = (y / rect.height) * bubbleEditorSize.height;
    const setter = activeBubbleHandle.group === 'stretch' ? setBubbleStretchInsets : setBubbleContentInsets;
    setter((prev) => {
      const next = { ...prev };
      const minGapX = activeBubbleHandle.group === 'content' ? 48 : 24;
      const minGapY = activeBubbleHandle.group === 'content' ? 28 : 18;
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, Math.round(value)));
      if (activeBubbleHandle.edge === 'left') {
        next.left = clamp(imageX, 0, bubbleEditorSize.width - prev.right - minGapX);
      }
      if (activeBubbleHandle.edge === 'right') {
        next.right = clamp(bubbleEditorSize.width - imageX, 0, bubbleEditorSize.width - prev.left - minGapX);
      }
      if (activeBubbleHandle.edge === 'top') {
        next.top = clamp(imageY, 0, bubbleEditorSize.height - prev.bottom - minGapY);
      }
      if (activeBubbleHandle.edge === 'bottom') {
        next.bottom = clamp(bubbleEditorSize.height - imageY, 0, bubbleEditorSize.height - prev.top - minGapY);
      }
      return next;
    });
  }, [activeBubbleHandle, bubbleEditorSize]);

  React.useEffect(() => {
    if (!activeBubbleHandle) return undefined;
    const handleMove = (event: PointerEvent) => updateBubbleHandleByPoint(event.clientX, event.clientY);
    const handleUp = () => setActiveBubbleHandle(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [activeBubbleHandle, updateBubbleHandleByPoint]);

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

  const removeStickerNearCaret = React.useCallback((direction: 'backward' | 'forward'): boolean => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || !editor.contains(range.commonAncestorContainer)) return false;

    const isStickerNode = (node: Node | null): node is HTMLElement =>
      node instanceof HTMLElement && Boolean(node.dataset?.stickerName);

    const removeSticker = (stickerNode: HTMLElement, adjacentTextNode?: Text, zeroWidthIndex?: number) => {
      if (typeof zeroWidthIndex === 'number' && adjacentTextNode) {
        adjacentTextNode.deleteData(zeroWidthIndex, 1);
      }
      const nextRange = document.createRange();
      const parent = stickerNode.parentNode || editor;
      const index = Array.prototype.indexOf.call(parent.childNodes, stickerNode);
      stickerNode.remove();
      nextRange.setStart(parent, Math.max(0, index));
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedEditorRangeRef.current = nextRange.cloneRange();
      syncEditorValue();
    };

    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer as Text;
      const offset = range.startOffset;
      if (direction === 'backward') {
        const zeroWidthIndex = offset > 0 && textNode.data[offset - 1] === '\u200B' ? offset - 1 : undefined;
        const previousNode = zeroWidthIndex !== undefined ? textNode.previousSibling : null;
        if (isStickerNode(previousNode)) {
          removeSticker(previousNode, textNode, zeroWidthIndex);
          return true;
        }
      } else if (textNode.data[offset] === '\u200B' && isStickerNode(textNode.nextSibling)) {
        removeSticker(textNode.nextSibling, textNode, offset);
        return true;
      }
    }

    const container = range.startContainer;
    const childNodes = container.childNodes;
    const candidate =
      direction === 'backward'
        ? childNodes[Math.max(0, range.startOffset - 1)] || container.previousSibling
        : childNodes[range.startOffset] || container.nextSibling;
    if (isStickerNode(candidate)) {
      removeSticker(candidate);
      return true;
    }
    return false;
  }, [syncEditorValue]);

  const handleEditorKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Backspace' && removeStickerNearCaret('backward')) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Delete' && removeStickerNearCaret('forward')) {
      event.preventDefault();
      return;
    }
    onKeyDown(event);
  }, [onKeyDown, removeStickerNearCaret]);

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
      const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
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
    const fetchQqStickerSearch = async (): Promise<WeChatGifSticker[]> => {
      const params = new URLSearchParams({
        msg: keyword,
        page: '1',
        num: '32',
      });
      const response = await fetch(`https://api.xcvts.cn/api/img/qqbqbss?${params.toString()}`, {
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) throw new Error(`QQ sticker ${response.status}`);
      const payload = await response.json();
      const results = Array.isArray(payload?.data) ? payload.data : [];
      return results
        .map((item: any, index: number) => {
          const url = String(item?.sticker_url || '');
          const format = String(item?.sticker_format || '').toLowerCase();
          return toSticker(`qq-${item?.sticker_num || index}`, format ? `${keyword}-${format}` : keyword, url, index);
        })
        .filter(Boolean) as WeChatGifSticker[];
    };
    const fetchBaiduImageJsonp = async (): Promise<WeChatGifSticker[]> => {
      if (typeof document === 'undefined') return [];
      const callbackName = `__wechatBaiduImageSearch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const params = new URLSearchParams({
        tn: 'resultjson_com',
        ipn: 'rj',
        ct: '201326592',
        fp: 'result',
        queryWord: `${keyword} 表情包 gif`,
        word: `${keyword} 表情包 gif`,
        pn: '0',
        rn: '32',
        gsm: '1e',
        callback: callbackName,
      });
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error('Baidu image JSONP timeout'));
        }, 9000);
        const cleanup = () => {
          window.clearTimeout(timeoutId);
          script.remove();
          delete (window as unknown as Record<string, unknown>)[callbackName];
        };
        (window as unknown as Record<string, (payload: any) => void>)[callbackName] = (payload: any) => {
          cleanup();
          const results = Array.isArray(payload?.data) ? payload.data : [];
          resolve(
            results
              .map((item: any, index: number) => {
                const url = String(item?.thumbURL || item?.middleURL || item?.hoverURL || item?.objURL || '');
                return toSticker(`baidu-${item?.di || index}`, String(item?.fromPageTitleEnc || keyword), url, index);
              })
              .filter(Boolean) as WeChatGifSticker[]
          );
        };
        script.onerror = () => {
          cleanup();
          reject(new Error('Baidu image JSONP failed'));
        };
        script.src = `https://image.baidu.com/search/acjson?${params.toString()}`;
        document.head.appendChild(script);
      });
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
      const response = await fetch(`https://g.tenor.com/v1/search?${params.toString()}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
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
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
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
    const fetchTenorJsonp = async (): Promise<WeChatGifSticker[]> => {
      if (typeof document === 'undefined') return [];
      const callbackName = `__wechatTenorSearch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const params = new URLSearchParams({
        q: keyword,
        key: 'LIVDSRZULELA',
        limit: '32',
        media_filter: 'minimal',
        contentfilter: 'medium',
        locale: 'zh_CN',
        callback: callbackName,
      });
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error('Tenor JSONP timeout'));
        }, 9000);
        const cleanup = () => {
          window.clearTimeout(timeoutId);
          script.remove();
          delete (window as unknown as Record<string, unknown>)[callbackName];
        };
        (window as unknown as Record<string, (payload: any) => void>)[callbackName] = (payload: any) => {
          cleanup();
          const results = Array.isArray(payload?.results) ? payload.results : [];
          resolve(
            results
              .map((item: any, index: number) => {
                const media = Array.isArray(item?.media) ? item.media[0] : null;
                const url = media?.tinygif?.url || media?.gif?.url || '';
                return toSticker(String(item?.id || ''), String(item?.title || keyword), String(url), index);
              })
              .filter(Boolean) as WeChatGifSticker[]
          );
        };
        script.onerror = () => {
          cleanup();
          reject(new Error('Tenor JSONP failed'));
        };
        script.src = `https://g.tenor.com/v1/search?${params.toString()}`;
        document.head.appendChild(script);
      });
    };
    try {
      let stickers: WeChatGifSticker[] = [];
      const sourceErrors: string[] = [];
      for (const [sourceName, loader] of [
        ['百度图片', fetchBaiduImageJsonp],
        ['QQ 表情', fetchQqStickerSearch],
        ['Tenor v2', fetchTenorV2],
        ['Tenor v1', fetchTenorV1],
        ['Tenor JSONP', fetchTenorJsonp],
        ['GIPHY', fetchGiphy],
      ] as const) {
        try {
          stickers = await loader();
          if (stickers.length > 0) break;
          sourceErrors.push(`${sourceName}: 0 results`);
        } catch (error) {
          sourceErrors.push(`${sourceName}: ${error instanceof Error ? error.message : String(error)}`);
          stickers = [];
        }
      }
      setGifSearchResults(stickers);
      if (stickers.length === 0) {
        setGifSearchError('没有找到相关表情');
      }
    } catch {
      setGifSearchResults([]);
      setGifSearchError('没有找到相关表情');
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

  const bubbleHandleLineStyle = (
    group: 'stretch' | 'content',
    edge: 'top' | 'right' | 'bottom' | 'left'
  ): React.CSSProperties => {
    const insets = group === 'stretch' ? bubbleStretchInsets : bubbleContentInsets;
    const color = group === 'stretch' ? '#f59e0b' : '#0ea5e9';
    const dashed = group === 'content';
    if (!bubbleEditorSize.width || !bubbleEditorSize.height) return {};
    const isHorizontal = edge === 'top' || edge === 'bottom';
    const pos =
      edge === 'top'
        ? (insets.top / bubbleEditorSize.height) * 100
        : edge === 'bottom'
          ? 100 - (insets.bottom / bubbleEditorSize.height) * 100
          : edge === 'left'
            ? (insets.left / bubbleEditorSize.width) * 100
            : 100 - (insets.right / bubbleEditorSize.width) * 100;
    return isHorizontal
      ? {
          top: `${pos}%`,
          left: 0,
          right: 0,
          borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
          cursor: 'ns-resize',
        }
      : {
          left: `${pos}%`,
          top: 0,
          bottom: 0,
          borderLeft: `3px ${dashed ? 'dashed' : 'solid'} ${color}`,
          cursor: 'ew-resize',
        };
  };

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
          if (file) {
            setPendingCustomStickerFile(file);
            setCustomStickerNameInput(file.name.replace(/\.[^.]+$/, '') || '表情');
          }
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
      <input
        ref={customBubbleImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = BUBBLE_EDITOR_TARGET_WIDTH;
              canvas.height = BUBBLE_EDITOR_TARGET_HEIGHT;
              const context = canvas.getContext('2d');
              if (!context) return;
              context.clearRect(0, 0, canvas.width, canvas.height);
              const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * 1.01;
              const drawWidth = image.naturalWidth * scale;
              const drawHeight = image.naturalHeight * scale;
              const drawX = (canvas.width - drawWidth) / 2;
              const drawY = (canvas.height - drawHeight) / 2;
              context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              for (let index = 0; index < data.length; index += 4) {
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                if (max > 238 && max - min < 22) {
                  data[index + 3] = 0;
                }
              }
              context.putImageData(imageData, 0, 0);
              const normalizedDataUrl = canvas.toDataURL('image/png');
              const width = BUBBLE_EDITOR_TARGET_WIDTH;
              const height = BUBBLE_EDITOR_TARGET_HEIGHT;
              setBubbleEditorImage(normalizedDataUrl);
              setBubbleEditorSize({ width, height });
              setBubbleStretchInsets({
                top: Math.round(height * 0.25),
                right: Math.round(width * 0.25),
                bottom: Math.round(height * 0.25),
                left: Math.round(width * 0.25),
              });
              setBubbleContentInsets({
                top: Math.round(height * 0.32),
                right: Math.round(width * 0.22),
                bottom: Math.round(height * 0.22),
                left: Math.round(width * 0.22),
              });
            };
            image.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }}
      />
      <style>{`
        @keyframes wechatEmojiFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          45% { transform: translate3d(0, -2px, 0) scale(1.03); }
        }
      `}</style>
      {pendingCustomStickerFile ? (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/35 px-6">
          <div className="w-full max-w-[280px] rounded-2xl bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.22)]">
            <div className="text-[15px] font-semibold text-[#111]">给表情包命名</div>
            <div className="mt-1 text-[12px] leading-5 text-[#777]">
              名字会进入聊天上下文，方便 AI 理解这个表情的情绪。
            </div>
            <input
              value={customStickerNameInput}
              onChange={(event) => setCustomStickerNameInput(event.target.value)}
              autoFocus
              className="mt-3 h-10 w-full rounded-xl border border-[#E5E7EB] px-3 text-[14px] text-[#111] outline-none focus:border-[#07C160]"
              placeholder="例如：生气捶桌"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingCustomStickerFile(null);
                  setCustomStickerNameInput('');
                }}
                className="rounded-full px-3 py-1.5 text-[13px] text-[#666] active:bg-black/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = customStickerNameInput.trim() || pendingCustomStickerFile.name.replace(/\.[^.]+$/, '') || '表情';
                  onAddCustomStickerFile(pendingCustomStickerFile, name);
                  setPendingCustomStickerFile(null);
                  setCustomStickerNameInput('');
                }}
                className="rounded-full bg-[#07C160] px-3.5 py-1.5 text-[13px] font-medium text-white active:opacity-85"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isBubbleEditorOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#F7F7F7] text-[#111]">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-[#F7F7F7] px-2 pb-2.5 pt-12">
            <button type="button" onClick={() => setIsBubbleEditorOpen(false)} className="min-w-14 px-2 text-left text-[14px] text-[#333] active:opacity-60">
              取消
            </button>
            <div className="text-[17px] font-medium">编辑气泡</div>
            <button
              type="button"
              disabled={!generatedBubbleCss}
              onClick={() => {
                if (!generatedBubbleCss) return;
                onAddCustomBubbleStyle(bubbleEditorName || '自定义气泡', generatedBubbleCss);
                setIsBubbleEditorOpen(false);
              }}
              className="min-w-14 px-2 text-right text-[14px] text-[#07C160] active:opacity-60 disabled:text-gray-300"
            >
              完成
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-4">
              <div className="mb-2 text-[16px] font-semibold">定义拉伸区域</div>
              <div className="text-[13px] leading-relaxed text-[#666]">
                橙色线定义拉伸区域的起点，蓝色线定义内容显示边缘。拖动短线调整位置。
              </div>
            </div>
            <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              {bubbleEditorImage ? (
                <div
                  ref={bubbleEditorImageBoxRef}
                  className="relative mx-auto max-w-full overflow-hidden rounded-md bg-[#E5E5E5]"
                  style={{ aspectRatio: `${bubbleEditorSize.width || 1}/${bubbleEditorSize.height || 1}` }}
                >
                  <img src={bubbleEditorImage} alt="气泡素材" className="h-full w-full object-contain" />
                  {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                    <button
                      key={`stretch-${edge}`}
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setActiveBubbleHandle({ group: 'stretch', edge });
                      }}
                      className="absolute z-20 touch-none"
                      style={bubbleHandleLineStyle('stretch', edge)}
                      aria-label={`调整拉伸区域${edge}`}
                    />
                  ))}
                  {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                    <button
                      key={`content-${edge}`}
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setActiveBubbleHandle({ group: 'content', edge });
                      }}
                      className="absolute z-30 touch-none"
                      style={bubbleHandleLineStyle('content', edge)}
                      aria-label={`调整内容区域${edge}`}
                    />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => customBubbleImageInputRef.current?.click()}
                  className="flex h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#999] text-[#555] active:bg-black/5"
                >
                  <ImageIcon size={32} strokeWidth={1.6} />
                  <span className="mt-2 text-[14px]">上传气泡图片</span>
                </button>
              )}
              {bubbleEditorImage ? (
                <div className="mt-3 flex items-center justify-between text-[13px] text-[#666]">
                  <span>图片尺寸: {bubbleEditorSize.width} x {bubbleEditorSize.height}px</span>
                  <button type="button" onClick={() => customBubbleImageInputRef.current?.click()} className="text-[#07C160] active:opacity-60">
                    更换图片
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 text-[16px] font-semibold">配置参数</div>
              <div className="grid grid-cols-2 gap-2 text-[12px] text-[#666]">
                <div>拉伸 上: {bubbleStretchInsets.top}px</div>
                <div>拉伸 右: {bubbleStretchInsets.right}px</div>
                <div>拉伸 下: {bubbleStretchInsets.bottom}px</div>
                <div>拉伸 左: {bubbleStretchInsets.left}px</div>
                <div>内容 上: {bubbleContentInsets.top}px</div>
                <div>内容 右: {bubbleContentInsets.right}px</div>
                <div>内容 下: {bubbleContentInsets.bottom}px</div>
                <div>内容 左: {bubbleContentInsets.left}px</div>
              </div>
              <input
                value={bubbleEditorName}
                onChange={(event) => setBubbleEditorName(event.target.value)}
                className="mt-3 h-9 w-full rounded-md border border-gray-200 px-3 text-[14px] outline-none"
                placeholder="气泡名称"
              />
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-1 text-[16px] font-semibold">效果预览</div>
              <div className="mb-4 text-[13px] text-[#666]">查看不同文字长度下的拉伸效果</div>
              {['你好', '这是一条测试消息', '这是一条比较长的测试消息，用来查看气泡的拉伸效果是否正常'].map((text) => (
                <div key={text} className="mb-4">
                  <div className="mb-1 text-[13px] text-[#777]">{text.length <= 2 ? '短文本' : text.length < 10 ? '中等文本' : '长文本'}</div>
                  <div
                    className="inline-block max-w-full text-[16px] leading-[1.4]"
                    style={generatedBubbleCss ? parseCssPreviewStyle(generatedBubbleCss) : undefined}
                  >
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
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
              onKeyDown={handleEditorKeyDown}
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
                      {wechatDefaultGifStickers.map((sticker) => (
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
                      <div className="mb-2 text-[12px] text-[#777]">自定义气泡</div>
                      {customBubbleStyles.length > 0 ? (
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          {customBubbleStyles.map((item) => (
                            <div key={item.id} className="relative">
                              <button
                                type="button"
                                onClick={() => {
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
                                  className="absolute -right-2 -top-2 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow"
                                  aria-label={`删除${item.name}`}
                                >
                                  <Trash2 size={13} strokeWidth={2} />
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mb-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBubbleEditorName('自定义气泡');
                            setIsBubbleEditorOpen(true);
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[#999] text-[#333] active:bg-black/5"
                          aria-label="制作气泡"
                        >
                          <Plus size={26} strokeWidth={1.6} />
                        </button>
                      </div>
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


