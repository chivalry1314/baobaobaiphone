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
type PromptPart = 'system' | 'user' | 'content';

interface PromptBookPage {
  key: string;
  prompt: PaperMagicPrompt;
  part: PromptPart;
  label: string;
  text: string;
}

const PROMPT_PART_LABELS: Record<PromptPart, string> = {
  system: 'System',
  user: 'User',
  content: 'Prompt',
};

const getPromptBookPages = (prompt: PaperMagicPrompt): PromptBookPage[] => {
  const parts: Array<[PromptPart, string | undefined]> = [
    ['system', prompt.system],
    ['user', prompt.user],
    ['content', prompt.content],
  ];

  return parts
    .filter(([, text]) => Boolean(text))
    .map(([part, text]) => ({
      key: `${prompt.id}:${part}`,
      prompt,
      part,
      label: PROMPT_PART_LABELS[part],
      text: text || '',
    }));
};

const getAllPromptBookPages = (): PromptBookPage[] =>
  PAPER_MAGIC_PROMPTS.flatMap(getPromptBookPages);

const highlightVariables = (text: string, onClick: (name: string) => void) => {
  const parts = text.split(/(\$\{[A-Za-z0-9_]+\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\$\{([A-Za-z0-9_]+)\}$/);
    if (!match) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    return (
      <button
        key={`${part}-${index}`}
        type="button"
        className={styles.variableToken}
        onClick={() => onClick(match[1])}
      >
        {part}
      </button>
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
  description: '角色简介。',
  personality: '角色性格与说话方式。',
  greeting: '角色开场语气参考。',
  extraInstruction: '追加聊天规则或紧急提示。',
  relevantWorldBookLines: '相关世界书片段。',
  memoryLines: '相关长期记忆。',
  personalProfileLines: '用户个人信息上下文。',
  latestUserContent: '最后一轮连续用户消息。',
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
  const [variableDefaults, setVariableDefaults] = React.useState<Record<string, string>>({});
  const [editingVariable, setEditingVariable] = React.useState('');
  const [familiarOpen, setFamiliarOpen] = React.useState(false);
  const [familiarInput, setFamiliarInput] = React.useState('');
  const [pageTurnDirection, setPageTurnDirection] = React.useState<1 | -1>(1);
  const [variablePickerOpen, setVariablePickerOpen] = React.useState(false);
  const [variablePickerQuery, setVariablePickerQuery] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const tarotDeckRef = React.useRef<HTMLDivElement | null>(null);
  const [familiarMessages, setFamiliarMessages] = React.useState<Array<{ role: 'ai' | 'user'; text: string }>>([
    { role: 'ai', text: '把你想加进咒语的规则告诉我，我会整理成可以插入的短句。' },
  ]);

  const activeModule = PAPER_MAGIC_MODULES.find((item) => item.id === activeModuleId) || PAPER_MAGIC_MODULES[0];
  const moduleAppGroups = PAPER_MAGIC_APP_GROUPS.filter((item) => item.moduleId === activeModule.id);
  const activeAppGroup = PAPER_MAGIC_APP_GROUPS.find((item) => item.id === activeAppGroupId) || moduleAppGroups[0] || PAPER_MAGIC_APP_GROUPS[0];
  const modulePrompts = activeAppGroup.promptIds.map(getPaperMagicPrompt);
  const bookPages = modulePrompts.flatMap(getPromptBookPages);
  const activeBookPage = bookPages.find((item) => item.key === activePageKey) || bookPages[0] || getAllPromptBookPages()[0];
  const activePrompt = activeBookPage.prompt;
  const activeDraft = drafts[activeBookPage.key] ?? activeBookPage.text;
  const activePromptIndex = Math.max(0, bookPages.findIndex((item) => item.key === activeBookPage.key));

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
    const nextIndex = Math.min(bookPages.length - 1, Math.max(0, activePromptIndex + direction));
    const nextPage = bookPages[nextIndex];
    if (nextPage && nextPage.key !== activeBookPage.key) {
      setPageTurnDirection(direction);
      setActivePageKey(nextPage.key);
    }
  };

  React.useEffect(() => {
    if (view !== 'tarot') return;
    window.requestAnimationFrame(() => {
      const deck = tarotDeckRef.current;
      const activeCard = deck?.querySelector<HTMLElement>(`[data-app-group-id="${activeAppGroupId}"]`);
      activeCard?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, [activeAppGroupId, view]);

  const resetDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: activeBookPage.text }));
  };

  const clearDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: '' }));
  };

  const saveDraft = () => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: current[activeBookPage.key] || activeDraft }));
  };

  const sendFamiliarMessage = () => {
    const text = familiarInput.trim();
    if (!text) return;
    const suggestion = text
      .replace(/^帮我/, '')
      .replace(/^请/, '')
      .trim();
    setFamiliarMessages((current) => [
      ...current,
      { role: 'user', text },
      { role: 'ai', text: suggestion ? `新增规则：${suggestion}` : '新增规则：保持语气自然，并优先使用已有上下文。' },
    ]);
    setFamiliarInput('');
  };

  const insertSuggestion = (text: string) => {
    setDrafts((current) => ({
      ...current,
      [activeBookPage.key]: `${current[activeBookPage.key] || activeDraft}\n\n${text}`,
    }));
    setFamiliarOpen(false);
  };

  const updateVariableDefault = (value: string) => {
    setVariableDefaults((current) => ({ ...current, [editingVariable]: value }));
  };

  const updateActiveDraft = (value: string) => {
    setDrafts((current) => ({ ...current, [activeBookPage.key]: value }));
  };

  const handleDraftInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    updateActiveDraft(value);
    const cursor = event.target.selectionStart;
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([A-Za-z0-9_]*)$/);
    setVariablePickerOpen(Boolean(match) && activePrompt.variables.length > 0);
    setVariablePickerQuery(match?.[1] || '');
  };

  const insertVariableAtCursor = (name: string) => {
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

  const variablePickerOptions = activePrompt.variables.filter((name) =>
    name.toLowerCase().includes(variablePickerQuery.toLowerCase())
  );

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

          <div className={styles.bookStage}>
            <button
              className={styles.pageTurnLeft}
              type="button"
              onClick={() => turnPage(-1)}
              disabled={activePromptIndex === 0}
              aria-label="上一页"
            >
              <ChevronLeft size={24} />
            </button>
            <main className={styles.magicBook}>
              <div className={styles.bookSpineShadow} />
              <div className={styles.bookBackPage} />
              <AnimatePresence mode="popLayout" custom={pageTurnDirection}>
                <motion.article
                  key={activeBookPage.key}
                  custom={pageTurnDirection}
                  className={`${styles.bookPageSheet} ${pageTurnDirection > 0 ? styles.turnForward : styles.turnBackward}`}
                  initial={{
                    rotateY: pageTurnDirection > 0 ? 76 : -76,
                    x: pageTurnDirection > 0 ? 18 : -18,
                    opacity: 0.34,
                    filter: 'brightness(0.82)',
                  }}
                  animate={{
                    rotateY: 0,
                    x: 0,
                    opacity: 1,
                    filter: 'brightness(1)',
                  }}
                  exit={{
                    rotateY: pageTurnDirection > 0 ? -82 : 82,
                    x: pageTurnDirection > 0 ? -22 : 22,
                    opacity: 0.24,
                    filter: 'brightness(0.78)',
                  }}
                  transition={{ type: 'spring', damping: 21, stiffness: 170, mass: 0.9 }}
                >
                  <div className={styles.pageCurl} />
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
                  <section className={styles.variableGuide}>
                    <h3>变量说明</h3>
                    {activePrompt.variables.length > 0 ? (
                      <div className={styles.variableGuideList}>
                        {activePrompt.variables.map((name) => (
                          <button key={name} type="button" onClick={() => setEditingVariable(name)}>
                            <span>${`{${name}}`}</span>
                            <small>{describeVariable(name)}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>无模板变量。</p>
                    )}
                  </section>
                  <div className={styles.bookPartLabel}>{activeBookPage.label}</div>
                  <textarea
                    ref={textareaRef}
                    className={styles.bookTextarea}
                    value={activeDraft}
                    onChange={handleDraftInput}
                    onBlur={() => window.setTimeout(() => setVariablePickerOpen(false), 120)}
                    aria-label="书页提示词编辑器"
                  />
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
            </main>
            <button
              className={styles.pageTurnRight}
              type="button"
              onClick={() => turnPage(1)}
              disabled={activePromptIndex >= bookPages.length - 1}
              aria-label="下一页"
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          <div className={styles.bottomToolbar}>
            <button type="button" onClick={clearDraft}><Eraser size={17} />清空</button>
            <button type="button" onClick={resetDraft}><RotateCcw size={17} />回滚</button>
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
            <motion.div
              initial={{ y: 260, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={styles.familiarPanel}
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
              </div>
              <div className={styles.familiarInput}>
                <input
                  value={familiarInput}
                  onChange={(event) => setFamiliarInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') sendFamiliarMessage();
                  }}
                />
                <button type="button" onClick={sendFamiliarMessage}>
                  <Sparkles size={17} />
                </button>
              </div>
            </motion.div>
          )}

          {editingVariable && (
            <div className={styles.variableDialog}>
              <div className={styles.variableCard}>
                <h2>${`{${editingVariable}}`}</h2>
                <input
                  value={variableDefaults[editingVariable] || ''}
                  onChange={(event) => updateVariableDefault(event.target.value)}
                  autoFocus
                />
                <button type="button" onClick={() => setEditingVariable('')}>完成</button>
              </div>
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
};
