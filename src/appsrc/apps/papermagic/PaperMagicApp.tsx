import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  Eraser,
  PenLine,
  RotateCcw,
  Save,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import type { AppProps } from '../../../core/sdk/types';
import { useSettingsCoreStore } from '../../../core/stores/settings/store';
import {
  PAPER_MAGIC_APP_GROUPS,
  PAPER_MAGIC_MODULES,
  PAPER_MAGIC_PROMPTS,
  getPaperMagicPrompt,
  type PaperMagicAppGroup,
  type PaperMagicModule,
  type PaperMagicPrompt,
} from './promptCatalog';
import styles from './PaperMagicApp.module.css';

type ViewMode = 'cover' | 'tarot' | 'book';
type PromptPart = 'variables' | 'system' | 'user' | 'content';

interface PromptBookPage {
  key: string;
  prompt: PaperMagicPrompt;
  part: PromptPart;
  label: string;
  text: string;
  editable: boolean;
}

const PROMPT_PART_LABELS: Record<PromptPart, string> = {
  variables: '参数',
  system: 'System',
  user: 'User',
  content: 'Prompt',
};

const PROMPT_PART_DESCRIPTIONS: Partial<Record<PromptPart, string>> = {
  system: 'System 提示词用于设定 AI 的身份、规则和回复边界，是模型回答时优先遵守的底层指令。',
  user: 'User 提示词用于承载本次任务的用户输入、上下文和变量数据，告诉模型这一次具体要处理什么。',
  content: 'Prompt 提示词用于保存可复用的模板正文、图片提示词或规则片段，运行时会按场景直接引用。',
};

const getPromptBookPages = (prompt: PaperMagicPrompt): PromptBookPage[] => {
  const parts: Array<[PromptPart, string | undefined]> = [
    ['system', prompt.system],
    ['user', prompt.user],
    ['content', prompt.content],
  ];

  const contentPages = parts
    .filter(([, text]) => Boolean(text))
    .map(([part, text]) => ({
      key: `${prompt.id}:${part}`,
      prompt,
      part,
      label: PROMPT_PART_LABELS[part],
      text: text || '',
      editable: true,
    }));

  return [
    {
      key: `${prompt.id}:variables`,
      prompt,
      part: 'variables',
      label: PROMPT_PART_LABELS.variables,
      text: '',
      editable: false,
    },
    ...contentPages,
  ];
};

const getAllPromptBookPages = (): PromptBookPage[] =>
  PAPER_MAGIC_PROMPTS.flatMap(getPromptBookPages);

const highlightVariables = (text: string) => {
  const parts = text.split(/(\$\{[A-Za-z0-9_]+\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\$\{([A-Za-z0-9_]+)\}$/);
    if (!match) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    return (
      <span
        key={`${part}-${index}`}
        className={styles.variableToken}
      >
        {part}
      </span>
    );
  });
};

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  appId: '当前产生记忆的应用 ID。',
  contactId: '当前联系人或关系对象 ID。',
  timeline: '按时间整理后的历史记录文本。',
  productInfo: '商品名称、描述、价格、库存等 JSON 信息。',
  productName: '下单失败或咨询中的商品名称。',
  inputRecordsJson: '待分析的记忆记录 JSON。',
  roleId: '执行每日剧本的角色 ID。',
  roleLabel: '执行角色的显示名称。',
  dateKey: '目标日期。',
  allowedTargetRoleIdsJson: '可发送微信消息的目标角色 ID 列表。',
  dreamMusicTrackPromptPayloadJson: '可选择的梦音乐歌曲列表。',
  relationPromptPayloadJson: '可选择的恋爱空间关系列表。',
  checkInTaskPromptPayloadJson: '可选择的恋爱空间打卡任务列表。',
  normalizedInputText: '用户输入的自然语言剧本需求。',
  maxLength: '评论允许的最大字数。',
  trackTitle: '歌曲标题。',
  trackArtist: '歌曲艺人。',
  authorName: '作者或评论用户名称。',
  lyricContext: '可参考的歌词片段。',
  commentContext: '可参考的评论区线索。',
  lyricCueLine: '用户指定重点参考的歌词句。',
  userRequirementLine: '用户对生成内容的补充要求。',
  existingNames: '需要避免重复的已有名称。',
  companionName: '购物陪伴搭子的名字。',
  screen: '当前购物页面。',
  latestTopic: '用户最近关注的对象。',
  recentTranscript: '最近对话上下文。',
  modeLine: '观察模式或回复模式的任务说明。',
  storeKindLabel: '店铺类型中文标签。',
  count: '需要生成的数量。',
  storeTitle: '店铺名称。',
  storeType: '店铺类型。',
  storeDescription: '店铺描述。',
  categoryList: '候选类目列表。',
  recentConversation: '最近聊天记录。',
  sellerMessage: '店主最新消息。',
  authorPayloadJson: '朋友圈作者候选列表 JSON。',
  imageInstruction: '是否生成配图提示词的要求。',
  content: '朋友圈文案或上下文正文。',
  characterName: '微信聊天中要扮演的角色名称。',
  contactName: '查手机中从通讯录生成结果传入的联系人姓名。',
  contactTags: '查手机中从通讯录生成结果传入的联系人标签或客观身份说明。',
  contactDescription: '查手机中从通讯录生成结果传入的联系人背景描述。',
  contactNetworkText: '查手机中已生成通讯录候选的简短文本，用于让通话记录复用同一批人物。',
  characterMemories: '查手机中从记忆中心读取的角色核心记忆或背景设定。',
  recentClues: '查手机中由刚生成的聊天、账单、通话和社交圈整理出的近期线索。',
  description: '角色简介。',
  personality: '角色性格与说话方式。',
  greeting: '角色开场语气参考。',
  extraInstruction: '追加聊天规则或紧急提示。',
  relevantWorldBookLines: '相关世界书片段。',
  memoryLines: '相关长期记忆。',
  personalProfileLines: '用户个人信息上下文。',
  latestUserContent: '最后一轮连续用户消息。',
  oocInstruction: '微信聊天悬浮玻璃球中输入的剧情纠正指令。',
  normalizedCaption: '图片附言或默认图片理解提示。',
  actionText: '特殊消息动作说明。',
  amount: '金额。',
  orderIdsText: '订单号文本。',
  orderPreviewText: '订单商品预览文本。',
  title: '标题、菜名、商品名或电影名。',
  cinema: '影院名称。',
  date: '日期。',
  time: '时间。',
  hall: '影厅。',
  seat: '座位。',
  qty: '数量。',
  pickupCode: '取票码。',
  subtitle: '副标题或说明。',
  servings: '份量。',
  ingredientText: '食材文本。',
  inviterName: '一起听歌邀请者名称。',
  statusText: '邀请状态。',
  trackText: '歌曲信息文本。',
  durationText: '一起听歌时长。',
  model: '模型名称。',
  text: '语音合成文本。',
  voiceId: '语音音色 ID。',
};

const describeVariable = (name: string): string =>
  VARIABLE_DESCRIPTIONS[name] || '模板运行时会替换的动态参数。';

export const PaperMagicApp: React.FC<AppProps> = ({ onClose }) => {
  const [view, setView] = React.useState<ViewMode>('cover');
  const [activeModuleId, setActiveModuleId] = React.useState(PAPER_MAGIC_MODULES[0].id);
  const [activeAppGroupId, setActiveAppGroupId] = React.useState(PAPER_MAGIC_APP_GROUPS[0].id);
  const [activePageKey, setActivePageKey] = React.useState(
    getPromptBookPages(getPaperMagicPrompt(PAPER_MAGIC_MODULES[0].promptIds[0]))[0].key
  );
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(getAllPromptBookPages().map((item) => [item.key, item.text]))
  );
  const [familiarOpen, setFamiliarOpen] = React.useState(false);
  const [familiarInput, setFamiliarInput] = React.useState('');
  const [familiarPending, setFamiliarPending] = React.useState(false);
  const [pageTurnDirection, setPageTurnDirection] = React.useState<1 | -1>(1);
  const [turningPage, setTurningPage] = React.useState<{
    key: string;
    direction: 1 | -1;
  } | null>(null);
  const [bookDragging, setBookDragging] = React.useState(false);
  const [variablePickerOpen, setVariablePickerOpen] = React.useState(false);
  const [variablePickerQuery, setVariablePickerQuery] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const tarotDeckRef = React.useRef<HTMLDivElement | null>(null);
  const bookTouchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const bookTouchHandledRef = React.useRef(false);
  const bookMouseStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const bookMouseHandledRef = React.useRef(false);
  const [familiarMessages, setFamiliarMessages] = React.useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    { role: 'ai', text: '把你想加进咒语的规则告诉我，我会整理成可以插入的短句。' },
  ]);
  const bookStageRef = React.useRef<HTMLDivElement | null>(null);

  const activeModule = PAPER_MAGIC_MODULES.find((item) => item.id === activeModuleId) || PAPER_MAGIC_MODULES[0];
  const moduleAppGroups = PAPER_MAGIC_APP_GROUPS.filter((item) => item.moduleId === activeModule.id);
  const activeAppGroup = PAPER_MAGIC_APP_GROUPS.find((item) => item.id === activeAppGroupId) || moduleAppGroups[0] || PAPER_MAGIC_APP_GROUPS[0];
  const modulePrompts = activeAppGroup.promptIds.map(getPaperMagicPrompt);
  const bookPages = modulePrompts.flatMap(getPromptBookPages);
  const activeBookPage = bookPages.find((item) => item.key === activePageKey) || bookPages[0] || getAllPromptBookPages()[0];
  const activePrompt = activeBookPage.prompt;
  const activeDraft = drafts[activeBookPage.key] ?? activeBookPage.text;
  const activePageIsEditable = activeBookPage.editable;
  const activePromptIndex = Math.max(0, bookPages.findIndex((item) => item.key === activeBookPage.key));
  const turnAnimationTimerRef = React.useRef<number | null>(null);

  const openModule = (module: PaperMagicModule) => {
    setActiveModuleId(module.id);
    const firstApp = PAPER_MAGIC_APP_GROUPS.find((item) => item.moduleId === module.id);
    if (firstApp) {
      setActiveAppGroupId(firstApp.id);
      setActivePageKey(getPromptBookPages(getPaperMagicPrompt(firstApp.promptIds[0]))[0].key);
    }
    setView('tarot');
  };

  const openAppBook = (appGroup: PaperMagicAppGroup) => {
    setActiveModuleId(appGroup.moduleId);
    setActiveAppGroupId(appGroup.id);
    setActivePageKey(getPromptBookPages(getPaperMagicPrompt(appGroup.promptIds[0]))[0].key);
    setFamiliarOpen(false);
    setView('book');
  };

  const turnPage = (direction: -1 | 1) => {
    if (turningPage) return;
    const nextIndex = Math.min(bookPages.length - 1, Math.max(0, activePromptIndex + direction));
    const nextPage = bookPages[nextIndex];
    if (nextPage && nextPage.key !== activeBookPage.key) {
      setPageTurnDirection(direction);
      if (turnAnimationTimerRef.current !== null) {
        window.clearTimeout(turnAnimationTimerRef.current);
      }
      if (direction < 0) {
        setActivePageKey(nextPage.key);
        return;
      }
      setTurningPage({ key: `${activeBookPage.key}:${nextPage.key}:${Date.now()}`, direction });
      turnAnimationTimerRef.current = window.setTimeout(() => {
        setActivePageKey(nextPage.key);
        turnAnimationTimerRef.current = window.setTimeout(() => {
          setTurningPage(null);
          turnAnimationTimerRef.current = null;
        }, 430);
      }, 520);
    }
  };

  React.useEffect(() => () => {
    if (turnAnimationTimerRef.current !== null) {
      window.clearTimeout(turnAnimationTimerRef.current);
    }
  }, []);

  const resolveSwipeDirection = (deltaX: number, deltaY: number): -1 | 1 | null => {
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.18) return null;
    return deltaX < 0 ? 1 : -1;
  };

  const isEditableGestureTarget = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && Boolean(target.closest('textarea, input, select, button, a, [role="button"], [contenteditable="true"]'));

  const handleBookTouchStartCapture = (event: React.TouchEvent<HTMLElement>) => {
    if (isEditableGestureTarget(event.target)) return;
    const touch = event.touches[0];
    if (!touch) return;
    bookTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    bookTouchHandledRef.current = false;
  };

  const handleBookTouchMoveCapture = (event: React.TouchEvent<HTMLElement>) => {
    const start = bookTouchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || bookTouchHandledRef.current) return;
    const direction = resolveSwipeDirection(touch.clientX - start.x, touch.clientY - start.y);
    if (!direction) return;
    event.preventDefault();
    bookTouchHandledRef.current = true;
    turnPage(direction);
  };

  const handleBookTouchEndCapture = () => {
    bookTouchStartRef.current = null;
    bookTouchHandledRef.current = false;
    setBookDragging(false);
  };

  const handleBookMouseDownCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (isEditableGestureTarget(event.target)) return;
    event.preventDefault();
    bookMouseStartRef.current = { x: event.clientX, y: event.clientY };
    bookMouseHandledRef.current = false;
    setBookDragging(true);
  };

  const handleBookMouseMoveCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (!bookDragging) return;
    event.preventDefault();
  };

  const handleBookMouseUpCapture = () => {
    bookMouseStartRef.current = null;
    bookMouseHandledRef.current = false;
    setBookDragging(false);
  };

  React.useEffect(() => {
    if (!bookDragging) return undefined;

    const handleWindowMouseMove = (event: MouseEvent) => {
      const start = bookMouseStartRef.current;
      if (!start) return;
      event.preventDefault();
      if (bookMouseHandledRef.current) return;
      const direction = resolveSwipeDirection(event.clientX - start.x, event.clientY - start.y);
      if (!direction) return;
      bookMouseHandledRef.current = true;
      turnPage(direction);
    };

    const handleWindowMouseUp = () => {
      bookMouseStartRef.current = null;
      bookMouseHandledRef.current = false;
      setBookDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [bookDragging, activePromptIndex, bookPages, turningPage]);

  React.useEffect(() => {
    if (view !== 'tarot') return;
    window.requestAnimationFrame(() => {
      const deck = tarotDeckRef.current;
      const activeCard = deck?.querySelector<HTMLElement>(`[data-app-group-id="${activeAppGroupId}"]`);
      activeCard?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, [activeAppGroupId, view]);

  React.useEffect(() => {
    if (view !== 'book') return undefined;
    const stage = bookStageRef.current;
    if (!stage) return undefined;

    const handleTouchMove = (event: TouchEvent) => {
      if (isEditableGestureTarget(event.target)) return;
      const start = bookTouchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      const direction = resolveSwipeDirection(touch.clientX - start.x, touch.clientY - start.y);
      if (!direction) return;
      event.preventDefault();
      if (bookTouchHandledRef.current) return;
      bookTouchHandledRef.current = true;
      turnPage(direction);
    };

    stage.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      stage.removeEventListener('touchmove', handleTouchMove);
    };
  }, [view, activePromptIndex, bookPages, turningPage]);

  const resetDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: activeBookPage.text }));
  };

  const clearDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: '' }));
  };

  const saveDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: current[activeBookPage.key] || activeDraft }));
  };

  const sendFamiliarMessage = async () => {
    const text = familiarInput.trim();
    if (!text || familiarPending) return;
    setFamiliarMessages((current) => [
      ...current,
      { role: 'user', text },
    ]);
    setFamiliarInput('');
    setFamiliarPending(true);

    try {
      const settings = useSettingsCoreStore.getState().settings;
      const apiKey = (settings.apiKey || '').trim();
      const baseUrl = (settings.baseUrl || '').trim().replace(/\/+$/, '');
      const model = (settings.model || '').trim();
      if (!apiKey || !baseUrl || !model) {
        throw new Error('missing-chat-settings');
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: Math.min(0.9, Math.max(0.2, settings.temperature ?? 0.55)),
          max_tokens: Math.max(300, Math.min(1200, settings.maxTokens || 700)),
          messages: [
            {
              role: 'system',
              content: [
                '你是纸间魔法里的提示词编辑助手。',
                '你要先理解用户输入背后的真实意图，再结合当前 Prompt 内容，产出可以直接插入提示词的中文规则。',
                '如果用户说得很口语、模糊或省略主语，要根据当前标题、用途、页类型、变量和已有草稿补全语义。',
                '如果用户是在追问、修正或延续上一轮灵感碰撞，要承接上下文，不要只看最后一句。',
                '输出不要寒暄，不要解释，不要 Markdown 标题。优先输出 1 到 3 句可执行规则；只有信息严重不足时才用一句话反问。',
              ].join('\n'),
            },
            {
              role: 'user',
              content: [
                `当前提示词标题：${activePrompt.title}`,
                `当前页：${activeBookPage.label}`,
                `用途：${activePrompt.description}`,
                `变量：${activePrompt.variables.map((name) => `\${${name}}`).join('、') || '无'}`,
                '',
                '最近灵感碰撞对话：',
                familiarMessages.slice(-6).map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.text}`).join('\n') || '暂无',
                '',
                '当前草稿：',
                activeDraft || '（空）',
                '',
                '本轮用户输入：',
                text,
              ].join('\n'),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`familiar-request-failed-${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      const suggestion = typeof content === 'string' ? content.trim() : '';
      if (!suggestion) throw new Error('empty-familiar-response');
      setFamiliarMessages((current) => [...current, { role: 'ai', text: suggestion }]);
    } catch (error) {
      console.error('[PaperMagic] familiar chat failed:', error);
      const fallback = text
        .replace(/^帮我/, '')
        .replace(/^请/, '')
        .trim();
      setFamiliarMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: fallback
            ? `新增规则：${fallback}`
            : '新增规则：保持语气自然，并优先使用已有上下文。',
        },
      ]);
    } finally {
      setFamiliarPending(false);
    }
  };

  const insertSuggestion = (text: string) => {
    setDrafts((current) => ({
      ...current,
      [activeBookPage.key]: `${current[activeBookPage.key] || activeDraft}\n\n${text}`,
    }));
    setFamiliarOpen(false);
  };

  const updateActiveDraft = (value: string) => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: value }));
  };

  const handleDraftInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activePageIsEditable) return;
    const value = event.target.value;
    updateActiveDraft(value);
    const cursor = event.target.selectionStart;
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([A-Za-z0-9_]*)$/);
    setVariablePickerOpen(Boolean(match) && activePrompt.variables.length > 0);
    setVariablePickerQuery(match?.[1] || '');
  };

  const insertVariableAtCursor = (name: string) => {
    if (!activePageIsEditable) return;
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? activeDraft.length;
    const beforeCursor = activeDraft.slice(0, cursor);
    const afterCursor = activeDraft.slice(cursor);
    const atMatch = beforeCursor.match(/@([A-Za-z0-9_]*)$/);
    const prefix = atMatch ? beforeCursor.slice(0, beforeCursor.length - atMatch[0].length) : beforeCursor;
    const insertion = `\${${name}}`;
    const nextValue = `${prefix}${insertion}${afterCursor}`;
    const nextCursor = prefix.length + insertion.length;
    updateActiveDraft(nextValue);
    setVariablePickerOpen(false);
    setVariablePickerQuery('');
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const variablePickerOptions = activePageIsEditable
    ? activePrompt.variables.filter((name) => name.toLowerCase().includes(variablePickerQuery.toLowerCase()))
    : [];

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 22, stiffness: 210 }}
      className={styles.appShell}
    >
      {view === 'cover' && (
        <section className={styles.cover}>
          <button className={styles.closeButton} onClick={onClose} aria-label="返回">
            <ChevronLeft size={26} />
          </button>
          <div className={styles.orbitHeader}>
            <div className={styles.coverTitle}>
              <h1>纸间<br />魔法</h1>
              <p>AI-Powered Prompt Grimoire</p>
            </div>
            <div className={styles.promptBadge}>
              <Sparkles size={22} />
              <span>{PAPER_MAGIC_PROMPTS.length}</span>
              <small>咒语</small>
            </div>
          </div>

          <div className={styles.starScroll}>
            <div className={styles.starRail} />
            {PAPER_MAGIC_MODULES.map((module, index) => {
              const sideClass = index % 2 === 0 ? styles.starModuleRight : styles.starModuleLeft;
              return (
                <button
                  key={module.id}
                  type="button"
                  className={`${styles.starModule} ${sideClass}`}
                  style={{ top: `${18 + index * 190}px` }}
                  onClick={() => openModule(module)}
                >
                  <span className={styles.starCore}>
                    <Sparkles size={index === 0 ? 24 : 18} />
                  </span>
                  <span className={styles.starText}>
                    <small>{String(index + 1).padStart(2, '0')} / {module.promptIds.length} spells</small>
                    <strong>{module.title}</strong>
                    <em>{module.subtitle}</em>
                  </span>
                </button>
              );
            })}
            <div className={styles.scrollEnd}>滑动星路，选择章节</div>
          </div>
        </section>
      )}

      {view === 'tarot' && (
        <section className={styles.tarotPage}>
          <header className={styles.tarotHeader}>
            <button className={styles.iconButton} onClick={() => setView('cover')} aria-label="返回星路">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1>模块塔罗</h1>
              <p>{activeModule.title} · 选择一本咒语书</p>
            </div>
            <span className={styles.tarotHeaderMark}>
              <Sparkles size={18} />
            </span>
          </header>

          <div className={styles.tarotDeck} ref={tarotDeckRef}>
            {moduleAppGroups.map((appGroup, index) => (
              <button
                key={appGroup.id}
                data-app-group-id={appGroup.id}
                type="button"
                className={`${styles.tarotCard} ${appGroup.id === activeAppGroupId ? styles.tarotCardActive : ''}`}
                onClick={() => openAppBook(appGroup)}
              >
                <span className={styles.tarotNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.tarotFrame}>
                  <span className={styles.tarotMoon} />
                  <Sparkles size={34} />
                  <span className={styles.tarotLine} />
                </span>
                <strong>{appGroup.title}</strong>
                <em>{appGroup.promptIds.length} spells</em>
                <small>{appGroup.subtitle}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'book' && (
        <section className={styles.editorPage}>
          <header className={styles.editorHeader}>
            <button className={styles.iconButton} onClick={() => setView('tarot')} aria-label="返回塔罗牌">
              <ChevronLeft size={24} />
            </button>
            <h1>{activeAppGroup.title}</h1>
            <button className={styles.saveButton} onClick={saveDraft}>
              <Save size={16} />
              保存
            </button>
          </header>

          <div
            ref={bookStageRef}
            className={`${styles.bookStage} ${bookDragging ? styles.bookStageDragging : ''}`}
            onTouchStartCapture={handleBookTouchStartCapture}
            onTouchMoveCapture={handleBookTouchMoveCapture}
            onTouchEndCapture={handleBookTouchEndCapture}
            onTouchCancelCapture={handleBookTouchEndCapture}
            onMouseDownCapture={handleBookMouseDownCapture}
            onMouseMoveCapture={handleBookMouseMoveCapture}
            onMouseUpCapture={handleBookMouseUpCapture}
            onMouseLeave={handleBookMouseUpCapture}
          >
            <main className={styles.magicBook}>
              <div className={styles.bookSpineShadow} />
              <div className={styles.bookBackPage} />
              <AnimatePresence mode="popLayout" custom={pageTurnDirection}>
                <motion.article
                  key={activeBookPage.key}
                  custom={pageTurnDirection}
                  className={`${styles.bookPageSheet} ${pageTurnDirection > 0 ? styles.turnForward : styles.turnBackward}`}
                  initial={pageTurnDirection < 0 ? { rotateY: -76, x: 8, opacity: 0.34, filter: 'brightness(0.82)' } : false}
                  animate={{ rotateY: 0, x: 0, opacity: 1, filter: 'brightness(1)' }}
                  exit={pageTurnDirection < 0 ? { rotateY: 72, x: 10, opacity: 0.24, filter: 'brightness(0.78)' } : { opacity: 1 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 105, mass: 1.18 }}
                >
                  {pageTurnDirection < 0 && <div className={styles.pageCurl} />}
                <div className={styles.bookPageHeader}>
                  <span>{String(activePromptIndex + 1).padStart(2, '0')} / {bookPages.length}</span>
                  <em>{activeBookPage.label}</em>
                </div>
                <h2>{activePrompt.title}</h2>
                <div className={styles.bookMeta}>
                  <span>{activePrompt.variables.length} 个变量</span>
                  <span>{activePrompt.kind}</span>
                  <span>{activePrompt.source}</span>
                </div>
                <p className={styles.bookUsage}>用途：{activePrompt.description}</p>
                {activeBookPage.part === 'variables' ? (
                  <section className={styles.variableGuide}>
                    <h3>参数</h3>
                    <p className={styles.variableHint}>
                      参数会被系统替换成具体的值，输入@可直接调用参数。
                    </p>
                    {activePrompt.variables.length > 0 ? (
                      <div className={styles.variableGuideList}>
                        {activePrompt.variables.map((name) => (
                          <div key={name}>
                            <span>${`{${name}}`}</span>
                            <small>{describeVariable(name)}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>无模板变量。</p>
                    )}
                  </section>
                ) : (
                  <>
                    <div className={styles.bookPartLabel}>{activeBookPage.label}</div>
                    {PROMPT_PART_DESCRIPTIONS[activeBookPage.part] && (
                      <p className={styles.bookPartDescription}>
                        {PROMPT_PART_DESCRIPTIONS[activeBookPage.part]}
                      </p>
                    )}
                    <textarea
                      ref={textareaRef}
                      className={styles.bookTextarea}
                      value={activeDraft}
                      onChange={handleDraftInput}
                      onBlur={() => window.setTimeout(() => setVariablePickerOpen(false), 120)}
                      aria-label="书页提示词编辑器"
                    />
                  </>
                )}
                {variablePickerOpen && variablePickerOptions.length > 0 && (
                  <div className={styles.variablePicker}>
                    {variablePickerOptions.map((name) => (
                      <button key={name} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertVariableAtCursor(name)}>
                        <span>${`{${name}}`}</span>
                        <small>{describeVariable(name)}</small>
                      </button>
                    ))}
                  </div>
                )}
                </motion.article>
              </AnimatePresence>
              <AnimatePresence>
                {turningPage && (
                  <motion.div
                    key={turningPage.key}
                    className={`${styles.turningLeaf} ${turningPage.direction > 0 ? styles.turningLeafForward : styles.turningLeafBackward}`}
                    initial={{ rotateY: 0, boxShadow: '0 20px 42px rgba(80, 45, 24, 0.18)' }}
                    animate={{
                      rotateY: turningPage.direction > 0 ? -168 : 168,
                      boxShadow: '18px 20px 38px rgba(80, 45, 24, 0.28)',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.02, ease: [0.2, 0.72, 0.18, 1] }}
                  >
                    <div className={styles.turningLeafFront}>
                      <span />
                    </div>
                    <div className={styles.turningLeafBack} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>

          <div className={`${styles.bottomToolbar} ${activePageIsEditable ? styles.bottomToolbarEditable : styles.bottomToolbarPaging}`}>
            <button type="button" onClick={() => turnPage(-1)} disabled={activePromptIndex === 0 || Boolean(turningPage)}>
              上一页
            </button>
            {activePageIsEditable && (
              <>
                <button type="button" onClick={clearDraft}><Eraser size={17} />清空</button>
                <button type="button" onClick={resetDraft}><RotateCcw size={17} />回滚</button>
              </>
            )}
            <button type="button" onClick={() => turnPage(1)} disabled={activePromptIndex >= bookPages.length - 1 || Boolean(turningPage)}>
              下一页
            </button>
          </div>

          <button
            type="button"
            className={styles.fab}
            onClick={() => {
              setFamiliarOpen((current) => !current);
            }}
            aria-label="灵感碰撞"
          >
            <Sparkles size={24} />
          </button>

          {familiarOpen && (
            <div
              className={styles.familiarBackdrop}
              onMouseDown={() => setFamiliarOpen(false)}
            >
              <motion.div
                initial={{ y: 260, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={styles.familiarPanel}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.familiarGrip}
                  onClick={() => setFamiliarOpen(false)}
                  aria-label="隐藏灵感碰撞"
                >
                  <span className={styles.familiarHandle} />
                </button>
                <button
                  type="button"
                  className={styles.familiarTitle}
                  onClick={() => setFamiliarOpen(false)}
                >
                  <WandSparkles size={18} />
                  灵感碰撞
                </button>
                <div className={styles.familiarMessages}>
                  {familiarMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`${styles.bubbleRow} ${message.role === 'user' ? styles.bubbleRowUser : ''}`}>
                      <div className={message.role === 'ai' ? styles.aiOrb : styles.userDot} />
                      <div className={`${styles.bubble} ${message.role === 'user' ? styles.userBubble : ''}`}>
                        {message.text}
                        {message.role === 'ai' && index > 0 && (
                          <button type="button" onClick={() => insertSuggestion(message.text)}>
                            <PenLine size={14} />
                            插入到 Prompt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {familiarPending && (
                    <div className={styles.thinkingRow}>
                      <div className={styles.aiOrb} />
                      <div className={styles.thinkingBubble}>
                        <span />思考中
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.familiarInput}>
                  <input
                    value={familiarInput}
                    onChange={(event) => setFamiliarInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') sendFamiliarMessage();
                    }}
                    disabled={familiarPending}
                  />
                  <button type="button" onClick={sendFamiliarMessage} disabled={familiarPending}>
                    <Sparkles size={17} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

        </section>
      )}
    </motion.div>
  );
};
