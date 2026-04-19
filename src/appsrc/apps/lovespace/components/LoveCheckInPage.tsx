import React, { useEffect, useMemo, useState } from 'react';

import {
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Dumbbell,
  Film,
  Flag,
  Footprints,
  HandHeart,
  Heart,
  Languages,
  MessageCircle,
  MoonStar,
  Plus,
  Smile,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { LOVE_SPACE_TEXT } from '../constants';
import type {
  AddLoveCheckInTasksPayload,
  BondCardData,
  CompleteLoveCheckInTaskPayload,
  LoveCheckInRecord,
  LoveCheckInTask,
  RemoveLoveCheckInTaskPayload,
} from '../types';
import { getTodayDateInput } from '../utils';
import { ContactAvatar } from './ContactAvatar';

interface LoveCheckInPageProps {
  card: BondCardData;
  tasks: LoveCheckInTask[];
  records: LoveCheckInRecord[];
  onBack: () => void;
  onAddTasks: (payload: AddLoveCheckInTasksPayload) => void;
  onCompleteTask: (payload: CompleteLoveCheckInTaskPayload) => void;
  onRemoveTask: (payload: RemoveLoveCheckInTaskPayload) => void;
  readOnly?: boolean;
}

type MainTab = 'mine' | 'record';

interface CheckInTemplateDef {
  templateId: string;
  title: string;
  iconKey: string;
  score: number;
}

interface CheckInCategoryDef {
  id: string;
  title: string;
  subtitle: string;
  previewIconKey: string;
  templates: CheckInTemplateDef[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  'hand-heart': HandHeart,
  moon: MoonStar,
  book: BookOpen,
  heart: Heart,
  smile: Smile,
  camera: Camera,
  users: UsersRound,
  message: MessageCircle,
  utensils: UtensilsCrossed,
  languages: Languages,
  dumbbell: Dumbbell,
  film: Film,
  flag: Flag,
  footprints: Footprints,
  sparkles: Sparkles,
};

const CATEGORIES: CheckInCategoryDef[] = [
  { id: 'custom', title: '自定义', subtitle: '定制专属于你们的目标', previewIconKey: 'flag', templates: [] },
  {
    id: 'love-words',
    title: '把爱说出来',
    subtitle: '爱需要表达',
    previewIconKey: 'hand-heart',
    templates: [
      { templateId: 'say-love', title: '说句"我爱你"', iconKey: 'hand-heart', score: 100 },
      { templateId: 'good-night', title: '睡前说晚安', iconKey: 'moon', score: 90 },
      { templateId: 'tell-story', title: '讲个故事给TA听', iconKey: 'book', score: 90 },
      { templateId: 'miss-you', title: '突然好想你', iconKey: 'heart', score: 85 },
      { templateId: 'praise-ta', title: '夸奖TA', iconKey: 'smile', score: 80 },
      { templateId: 'selfie-for-ta', title: '自拍给TA看', iconKey: 'camera', score: 80 },
    ],
  },
  {
    id: 'together',
    title: '一起做的事',
    subtitle: '最浪漫的事不过如此',
    previewIconKey: 'users',
    templates: [
      { templateId: 'hug', title: '拥抱', iconKey: 'users', score: 85 },
      { templateId: 'daily-chat', title: '每日聊天', iconKey: 'message', score: 90 },
      { templateId: 'cook', title: '学做饭', iconKey: 'utensils', score: 80 },
      { templateId: 'learn-english', title: '学英语', iconKey: 'languages', score: 70 },
      { templateId: 'workout', title: '一起健身', iconKey: 'dumbbell', score: 75 },
      { templateId: 'movie-night', title: '看电影', iconKey: 'film', score: 80 },
    ],
  },
  {
    id: 'growth',
    title: '共同进步',
    subtitle: '为彼此变得更好',
    previewIconKey: 'footprints',
    templates: [
      { templateId: 'walk', title: '一起散步30分钟', iconKey: 'footprints', score: 70 },
      { templateId: 'study', title: '一起学习', iconKey: 'book', score: 75 },
      { templateId: 'encourage', title: '互相鼓励一次', iconKey: 'sparkles', score: 80 },
      { templateId: 'language', title: '背10个单词', iconKey: 'languages', score: 70 },
      { templateId: 'sport', title: '共同运动打卡', iconKey: 'dumbbell', score: 75 },
      { templateId: 'share', title: '分享今日成长', iconKey: 'message', score: 85 },
    ],
  },
];

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

const getDateLabel = (dateKey: string): string => {
  const today = getTodayDateInput();
  if (dateKey === today) return '今天';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${`${yesterday.getMonth() + 1}`.padStart(2, '0')}-${`${yesterday.getDate()}`.padStart(2, '0')}`;
  if (dateKey === y) return '昨天';
  return dateKey;
};

const newCustomTemplateId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `custom-${crypto.randomUUID()}`
    : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const reverseCheckInOwner = (owner: 'mine' | 'partner'): 'mine' | 'partner' =>
  owner === 'mine' ? 'partner' : 'mine';

const HeartProgress: React.FC<{
  mineDone: boolean;
  partnerDone: boolean;
}> = ({ mineDone, partnerDone }) => {
  if (mineDone && partnerDone) {
    return <Heart size={16} className="text-rose-500 fill-rose-500" />;
  }

  if (mineDone || partnerDone) {
    const clipPath = mineDone ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
    return (
      <span className="relative inline-flex h-4 w-4">
        <Heart size={16} className="absolute inset-0 text-rose-200" />
        <Heart
          size={16}
          className="absolute inset-0 text-rose-500 fill-rose-500"
          style={{ clipPath }}
        />
      </span>
    );
  }

  return <Heart size={16} className="text-slate-300" />;
};

export const LoveCheckInPage: React.FC<LoveCheckInPageProps> = ({
  card,
  tasks,
  records,
  onBack,
  onAddTasks,
  onCompleteTask,
  onRemoveTask,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('mine');
  const [isAdding, setIsAdding] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState('love-words');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customAllowPartnerReminder, setCustomAllowPartnerReminder] = useState(true);
  const [pendingRemoveTask, setPendingRemoveTask] = useState<LoveCheckInTask | null>(null);

  const mineTasks = useMemo(
    () =>
      tasks
        .filter((item) => item.bondId === card.bond.id && item.owner === 'mine')
        .sort((left, right) => right.createdAt - left.createdAt),
    [tasks, card.bond.id]
  );
  const todayKey = getTodayDateInput();
  const completedTodayCount = mineTasks.filter((item) => (item.completedDateKeys ?? []).includes(todayKey)).length;
  const existingTemplateSet = useMemo(() => new Set(mineTasks.map((item) => item.templateId)), [mineTasks]);
  const selectedTemplateSet = useMemo(() => new Set(selectedTemplateIds), [selectedTemplateIds]);
  const todayDonePairByTaskId = useMemo(() => {
    const doneSetByOwnerAndTemplate = new Set<string>();
    tasks
      .filter((item) => item.bondId === card.bond.id)
      .forEach((item) => {
        if ((item.completedDateKeys ?? []).includes(todayKey)) {
          doneSetByOwnerAndTemplate.add(`${item.owner}:${item.templateId}`);
        }
      });

    const pairMap = new Map<
      string,
      {
        mineDone: boolean;
        partnerDone: boolean;
      }
    >();
    mineTasks.forEach((task) => {
      const mineDone = doneSetByOwnerAndTemplate.has(`${task.owner}:${task.templateId}`);
      const partnerDone = doneSetByOwnerAndTemplate.has(
        `${reverseCheckInOwner(task.owner)}:${task.templateId}`
      );
      pairMap.set(task.id, { mineDone, partnerDone });
    });
    return pairMap;
  }, [card.bond.id, mineTasks, tasks, todayKey]);

  const groupedRecords = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; items: LoveCheckInRecord[] }> = [];
    [...records]
      .filter((item) => item.bondId === card.bond.id)
      .sort((left, right) => right.createdAt - left.createdAt)
      .forEach((record) => {
        const key = record.dateKey || getTodayDateInput();
        const current = groups[groups.length - 1];
        if (!current || current.dateKey !== key) groups.push({ dateKey: key, label: getDateLabel(key), items: [record] });
        else current.items.push(record);
      });
    return groups;
  }, [records, card.bond.id]);

  const templateMap = useMemo(() => {
    const map = new Map<string, { categoryId: string; iconKey: string; title: string; score: number }>();
    CATEGORIES.forEach((category) =>
      category.templates.forEach((item) => map.set(item.templateId, { ...item, categoryId: category.id }))
    );
    return map;
  }, []);

  const toggleTemplate = (templateId: string) => {
    if (readOnly) return;
    if (existingTemplateSet.has(templateId)) return;
    setSelectedTemplateIds((current) =>
      current.includes(templateId) ? current.filter((item) => item !== templateId) : [...current, templateId]
    );
  };

  const confirmAddTemplates = () => {
    if (readOnly) return;
    const selected = selectedTemplateIds
      .map((id) => {
        const found = templateMap.get(id);
        return found
          ? { templateId: id, categoryId: found.categoryId, iconKey: found.iconKey, title: found.title, score: found.score }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (selected.length === 0) return;
    onAddTasks({ bondId: card.bond.id, owner: 'mine', tasks: selected });
    setIsAdding(false);
  };

  const createCustomTask = () => {
    if (readOnly) return;
    const title = customTitle.trim();
    if (!title) return;
    onAddTasks({
      bondId: card.bond.id,
      owner: 'mine',
      tasks: [
        {
          templateId: newCustomTemplateId(),
          categoryId: 'custom',
          iconKey: 'flag',
          title,
          score: 100,
          allowPartnerReminder: customAllowPartnerReminder,
        },
      ],
    });
    setCustomTitle('');
    setCustomAllowPartnerReminder(true);
    setIsCreatingCustom(false);
    setIsAdding(false);
  };

  const completeTask = (task: LoveCheckInTask) => {
    if (readOnly) return;
    if ((task.completedDateKeys ?? []).includes(todayKey)) return;
    onCompleteTask({ taskId: task.id });
  };

  const confirmRemoveTask = () => {
    if (readOnly) return;
    if (!pendingRemoveTask) return;
    onRemoveTask({ taskId: pendingRemoveTask.id });
    setPendingRemoveTask(null);
  };

  useEffect(() => {
    if (!readOnly) return;
    if (isAdding) setIsAdding(false);
    if (isCreatingCustom) setIsCreatingCustom(false);
    if (pendingRemoveTask) setPendingRemoveTask(null);
  }, [isAdding, isCreatingCustom, pendingRemoveTask, readOnly]);

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="absolute inset-0 z-50 bg-[#f5f6f8] text-slate-900 flex flex-col overflow-hidden"
    >
      <header className="relative bg-gradient-to-r from-[#f8b8ca] to-[#f68faf] text-white px-3 pt-10 pb-5 overflow-hidden">
        <div className="absolute -right-6 top-8 h-44 w-44 rounded-full bg-white/12 blur-2xl" />
        <div className="absolute left-28 top-6 h-16 w-16 rounded-full bg-white/12 blur-lg" />
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              if (!isAdding) {
                onBack();
                return;
              }
              if (isCreatingCustom) {
                setIsCreatingCustom(false);
                return;
              }
              setIsAdding(false);
            }}
            className="w-10 h-10 grid place-items-center"
          >
            <ChevronLeft size={26} />
          </button>
          <h2 className="flex-1 text-center text-[20px] font-semibold tracking-wide pr-10">
            {isAdding
              ? isCreatingCustom
                ? LOVE_SPACE_TEXT.checkInCreatePageTitle
                : LOVE_SPACE_TEXT.checkInAddPageTitle
              : activeTab === 'record'
                ? LOVE_SPACE_TEXT.checkInRecordPageTitle
                : LOVE_SPACE_TEXT.checkInPageTitle}
          </h2>
          {!isAdding && activeTab !== 'record' && !readOnly ? (
            <button type="button" onClick={() => { setIsAdding(true); setIsCreatingCustom(false); setSelectedTemplateIds([]); }} className="w-10 h-10 grid place-items-center">
              <Plus size={28} />
            </button>
          ) : (
            <span className="w-10 h-10" />
          )}
        </div>
      </header>

      {!isAdding && activeTab === 'mine' ? (
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20 space-y-3">
          <section className="relative rounded-[20px] border border-rose-100/80 bg-white px-4 py-3 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.2)]">
            <div className="absolute right-4 top-3 flex -space-x-2">
              <div className="w-10 h-10 rounded-full border-[2px] border-white bg-[#f6d7e3] text-[#cf315f] text-[14px] font-semibold flex items-center justify-center">{LOVE_SPACE_TEXT.me}</div>
              <ContactAvatar contact={card.contact} sizeClassName="w-10 h-10" />
            </div>
            <p className="text-[22px] font-semibold leading-tight text-slate-800">{LOVE_SPACE_TEXT.checkInAddHeroTitle}</p>
            <p className="mt-1 text-[14px] text-slate-500">{`${LOVE_SPACE_TEXT.checkInMineCountLabel}（${completedTodayCount}/${mineTasks.length}）`}</p>
          </section>

          {mineTasks.length === 0 ? (
            <section className="rounded-[20px] border border-rose-100/80 bg-white px-5 py-10 text-center shadow-[0_16px_28px_-24px_rgba(15,23,42,0.22)]">
              <Heart size={26} className="mx-auto text-rose-300" />
              <p className="mt-3 text-[17px] font-semibold text-slate-800">{LOVE_SPACE_TEXT.checkInListEmptyTitle}</p>
              <p className="mt-1 text-[13px] text-slate-500">{LOVE_SPACE_TEXT.checkInListEmptyHint}</p>
            </section>
          ) : (
            mineTasks.map((task) => {
              const Icon = ICON_MAP[task.iconKey] ?? Heart;
              const ownDone = (task.completedDateKeys ?? []).includes(todayKey);
              const pairStatus = todayDonePairByTaskId.get(task.id) || {
                mineDone: ownDone,
                partnerDone: false,
              };
              return (
                <article key={task.id} className="rounded-[20px] border border-rose-100/80 bg-white px-4 py-3.5 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.22)]">
                  <div className="flex items-center gap-3">
                    <span className="h-11 w-11 rounded-2xl bg-[#fff4f8] grid place-items-center text-[#ee74a4]">
                      <Icon size={24} strokeWidth={1.8} />
                    </span>
                    <p className="flex-1 text-[17px] font-medium leading-tight text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        <span>{task.title}</span>
                        <HeartProgress
                          mineDone={pairStatus.mineDone}
                          partnerDone={pairStatus.partnerDone}
                        />
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={ownDone || readOnly} onClick={() => completeTask(task)} className={`min-w-20 h-9 rounded-full border text-[14px] font-medium px-4 ${ownDone ? 'border-emerald-200 bg-emerald-50 text-emerald-500' : 'border-emerald-200 text-emerald-500 bg-white'} ${readOnly ? 'opacity-50' : ''}`}>
                        {ownDone ? LOVE_SPACE_TEXT.checkInDoneAction : LOVE_SPACE_TEXT.checkInDoAction}
                      </button>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => setPendingRemoveTask(task)}
                          className="h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-500 grid place-items-center active:scale-95 transition-transform"
                          aria-label={LOVE_SPACE_TEXT.momentsDeleteAction}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </main>
      ) : null}

      {!isAdding && activeTab === 'record' ? (
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
          {groupedRecords.length === 0 ? (
            <section className="rounded-[20px] border border-rose-100/80 bg-white px-5 py-10 text-center shadow-[0_16px_28px_-24px_rgba(15,23,42,0.22)]">
              <ClipboardList size={26} className="mx-auto text-rose-300" />
              <p className="mt-3 text-[17px] font-semibold text-slate-800">{LOVE_SPACE_TEXT.checkInRecordEmptyTitle}</p>
              <p className="mt-1 text-[13px] text-slate-500">{LOVE_SPACE_TEXT.checkInRecordEmptyDescription}</p>
            </section>
          ) : (
            groupedRecords.map((group) => (
              <section key={group.dateKey} className="mb-5">
                <h3 className="text-[19px] font-semibold text-slate-800 mb-2">{group.label}</h3>
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-rose-100" />
                  {group.items.map((record) => (
                    <article key={record.id} className="relative">
                      <span className={`absolute -left-[26px] top-6 w-7 h-7 rounded-full grid place-items-center text-white ${record.action === 'add' ? 'bg-[#ffc846]' : 'bg-[#ff6d7d]'}`}>{record.action === 'add' ? <Plus size={15} /> : <Heart size={15} className="fill-white" />}</span>
                      <div className="rounded-[18px] border border-rose-100/80 bg-white px-4 py-3 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.2)]">
                        <p className="text-[16px] leading-6 text-slate-800">{record.action === 'add' ? `${LOVE_SPACE_TEXT.checkInRecordAddPrefix}${record.taskTitle}` : record.taskTitle}</p>
                        <p className="mt-1 text-[13px] text-slate-500"><span className="text-[#ef6f9f]">{record.owner === 'mine' ? LOVE_SPACE_TEXT.me : card.contact.name}</span><span className="ml-3">{formatTime(record.createdAt)}</span></p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      ) : null}

      {isAdding ? (
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-4">
          {isCreatingCustom ? (
            <section className="rounded-[22px] border border-rose-100/80 bg-white px-5 py-8 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.26)]">
              <div className="w-24 h-24 mx-auto rounded-full border-2 border-[#ef6d9d] text-[#ef6d9d] grid place-items-center"><Flag size={42} strokeWidth={1.8} /></div>
              <div className="mt-7">
                <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={LOVE_SPACE_TEXT.checkInCustomInputPlaceholder} className="w-full bg-transparent text-center text-[20px] text-slate-800 placeholder:text-slate-400 outline-none" maxLength={20} />
                <div className="mt-3 h-px bg-slate-200" />
              </div>
              <button type="button" onClick={() => setCustomAllowPartnerReminder((v) => !v)} className="mt-7 w-full inline-flex items-center justify-center gap-2 text-[15px] text-slate-500">
                <span className={`w-6 h-6 rounded-full grid place-items-center ${customAllowPartnerReminder ? 'bg-slate-400 text-white' : 'bg-slate-200 text-slate-100'}`}><Check size={16} /></span>
                {LOVE_SPACE_TEXT.checkInCustomPartnerReminder}
              </button>
              <button type="button" onClick={createCustomTask} disabled={!customTitle.trim()} className={`mt-8 w-full h-12 rounded-full text-[18px] font-semibold ${customTitle.trim() ? 'bg-gradient-to-r from-[#ff6b9e] to-[#f55286] text-white' : 'bg-slate-200 text-slate-400'}`}>
                {LOVE_SPACE_TEXT.checkInCreateAction}
              </button>
            </section>
          ) : (
            <>
              {CATEGORIES.map((category) => {
                const PreviewIcon = ICON_MAP[category.previewIconKey] ?? Flag;
                const expanded = expandedCategoryId === category.id;
                return (
                  <section key={category.id} className="rounded-[20px] border border-rose-100/80 bg-white shadow-[0_18px_32px_-28px_rgba(15,23,42,0.26)] overflow-hidden">
                    <button type="button" onClick={() => category.id === 'custom' ? setIsCreatingCustom(true) : setExpandedCategoryId(expanded ? '' : category.id)} disabled={readOnly} className="relative w-full px-4 py-4 text-left min-h-[100px] disabled:opacity-60">
                      <p className="text-[18px] font-semibold text-slate-900">{category.title}</p>
                      <p className="mt-1 text-[13px] text-slate-500">{category.subtitle}</p>
                      <PreviewIcon size={72} strokeWidth={1.5} className="absolute right-3 bottom-0 text-[#f4b3c8]/70" />
                    </button>
                    {category.id !== 'custom' && expanded ? (
                      <div className="border-t border-rose-100/80 px-3.5 py-3.5 grid grid-cols-3 gap-2.5">
                        {category.templates.map((template) => {
                          const Icon = ICON_MAP[template.iconKey] ?? Heart;
                          const selected = selectedTemplateSet.has(template.templateId);
                          const existing = existingTemplateSet.has(template.templateId);
                          return (
                            <button key={template.templateId} type="button" disabled={existing || readOnly} onClick={() => toggleTemplate(template.templateId)} className={`relative rounded-2xl border px-2 py-3 min-h-[110px] flex flex-col items-center justify-center gap-2 ${selected ? 'border-[#f38fb1] bg-[#fff2f7]' : existing ? 'border-slate-200 bg-slate-50' : 'border-rose-100/80 bg-[#fffafd]'} ${(existing || readOnly) ? 'opacity-60' : ''}`}>
                              <Icon size={28} strokeWidth={1.7} className="text-[#ef6e9f]" />
                              <span className="text-[13px] leading-5 text-slate-800 text-center">{template.title}</span>
                              <span className={`absolute right-2.5 bottom-2.5 w-5 h-5 rounded-full grid place-items-center ${selected ? 'bg-[#ef6e9f] text-white' : existing ? 'bg-[#ffb8cf] text-white' : 'bg-slate-200 text-slate-100'}`}><Check size={14} /></span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
              <div className="pb-4">
                <button type="button" disabled={selectedTemplateIds.length === 0 || readOnly} onClick={confirmAddTemplates} className={`w-full h-12 rounded-full text-[18px] font-semibold ${selectedTemplateIds.length > 0 && !readOnly ? 'bg-gradient-to-r from-[#ff6b9e] to-[#f55286] text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {`${LOVE_SPACE_TEXT.checkInPickDonePrefix}(${selectedTemplateIds.length})${LOVE_SPACE_TEXT.checkInPickDoneSuffix}`}
                </button>
              </div>
            </>
          )}
        </main>
      ) : null}

      {!isAdding ? (
        <footer
          className="shrink-0 border-t border-rose-100/90 bg-white px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <nav className="min-h-[78px] grid grid-cols-2 pt-1.5">
            {[
              { key: 'mine' as const, label: LOVE_SPACE_TEXT.checkInTabMine, icon: CheckCircle2 },
              { key: 'record' as const, label: LOVE_SPACE_TEXT.checkInTabRecord, icon: ClipboardList },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className="flex flex-col items-center justify-center gap-1 py-0.5"
                >
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center ${
                      active ? 'bg-[#f575a3] text-white' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    <Icon size={19} className={active && item.key !== 'record' ? 'fill-white' : ''} />
                  </span>
                  <span className={`text-[13px] font-medium ${active ? 'text-[#ef5b94]' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </footer>
      ) : null}

      <AnimatePresence>
        {!readOnly && pendingRemoveTask ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[80] bg-slate-900/25 flex items-end px-4 pb-8"
            onClick={() => setPendingRemoveTask(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full rounded-[24px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.28)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[15px] font-semibold text-slate-900">{LOVE_SPACE_TEXT.checkInDeleteConfirmTitle}</p>
              <p className="mt-1 text-[12px] text-slate-500">{LOVE_SPACE_TEXT.checkInDeleteConfirmHint}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingRemoveTask(null)}
                  className="h-10 rounded-xl bg-white text-slate-600 border border-slate-200 text-[14px] font-semibold active:scale-[0.99] transition-transform"
                >
                  {LOVE_SPACE_TEXT.cancel}
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveTask}
                  className="h-10 rounded-xl bg-slate-900 text-white border border-slate-900 text-[14px] font-semibold shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] active:scale-[0.99] transition-transform"
                >
                  {LOVE_SPACE_TEXT.checkInConfirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
};
