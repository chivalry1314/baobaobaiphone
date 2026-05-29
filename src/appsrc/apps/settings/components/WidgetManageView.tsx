// WidgetManageView.tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalDesktopStore } from '@baobaobaiOS/sdk';
import { CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, readCustomWidgetLibrary } from '../../../../core/customWidgetLibrary';
import { WidgetPlaceholder } from './WidgetPlaceholder';

// ==================== 类型定义 ====================

export interface WidgetManageViewProps {
  onNavigateToEditor: (widgetId?: string) => void;
}

interface WidgetItem {
  id: string;
  name: string;
  type: string;
  size: string;
  isPro?: boolean;
  previewTitle: string;
  previewValue: string;
  templateId: string;
  data: Record<string, unknown>;
  w: number;
  h: number;
}

// ==================== 动画配置 ====================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

const systemParamSections = [
  {
    title: '日期',
    items: [
      { name: 'system.date.now', desc: '当前系统 Date 对象' },
      { name: 'system.date.year', desc: '当前年份' },
      { name: 'system.date.month', desc: '当前月份，范围 1-12' },
      { name: 'system.date.day', desc: '当前日期' },
      { name: 'system.date.weekday', desc: '当前星期名称' },
      { name: 'system.date.monthName', desc: '当前月份名称' },
    ],
  },
  {
    title: '时间',
    items: [
      { name: 'system.time.hhmm', desc: '当前时间，格式 20:38' },
      { name: 'system.time.hhmmss', desc: '当前时间，格式 20:38:12' },
      { name: 'system.time.timestamp', desc: '当前时间戳' },
    ],
  },
  {
    title: '音乐',
    items: [
      { name: 'system.music.isPlaying', desc: '梦音乐是否正在播放' },
      { name: 'system.music.currentTrack', desc: '当前歌曲信息，包含 title、artist、album、coverUrl、durationMs' },
      { name: 'system.music.listenTogether', desc: '一起听歌状态，包含 status、companionId、companionName、companionAvatar、inviterName、invitedAt、acceptedAt' },
      { name: 'system.music.listenTogetherIdleSince', desc: '一起听歌中暂停或无播放开始的时间戳；为空表示当前正在播放或不在一起听' },
      { name: 'system.music.playPrev()', desc: '切换到上一首' },
      { name: 'system.music.playNext()', desc: '切换到下一首' },
      { name: 'system.music.togglePlayback()', desc: '播放或暂停' },
    ],
  },
  {
    title: '音乐交互写法',
    items: [
      { name: 'onClick={() => system?.music?.togglePlayback?.()}', desc: '点击按钮播放或暂停梦音乐' },
      { name: 'onClick={system?.music?.togglePlayback}', desc: '播放或暂停的简写形式' },
      { name: 'onClick={handleToggle}', desc: '当 handleToggle 内部调用 togglePlayback 时会自动映射' },
      { name: "triggerSystemAction('togglePlayback')", desc: '原生 JS 中触发播放或暂停' },
      { name: 'onClick={() => system?.music?.playPrev?.()}', desc: '点击按钮切换到上一首' },
      { name: 'onClick={() => system?.music?.playNext?.()}', desc: '点击按钮切换到下一首' },
    ],
  },
];

const builtInTemplateItems: WidgetItem[] = [
  {
    id: 'template:listen-together',
    name: '一起听歌',
    type: 'MUSIC',
    size: '4x2',
    previewTitle: '一起听歌播放组件',
    previewValue: '可控制上一首、播放暂停、下一首',
    templateId: 'listen-together',
    data: { name: '一起听歌', subtitle: '双人音乐播放器', cornerRadius: 22, frosted: 6, shadow: 12 },
    w: 4,
    h: 2,
  },
  {
    id: 'template:ins-photo',
    name: 'ins照片',
    type: 'PHOTO',
    size: '2x2',
    previewTitle: '点击上传照片的照片框',
    previewValue: '',
    templateId: 'ins-photo',
    data: { subtitle: '点击上传照片', cornerRadius: 22, frosted: 8, shadow: 12 },
    w: 2,
    h: 2,
  },
  {
    id: 'template:calendar-card',
    name: '日历',
    type: 'CALENDAR',
    size: '2x2',
    previewTitle: '半透明日历组件',
    previewValue: '',
    templateId: 'calendar-card',
    data: { subtitle: 'February', cornerRadius: 22, frosted: 6, shadow: 12 },
    w: 2,
    h: 2,
  },
  {
    id: 'template:vinyl-record',
    name: '唱片',
    type: 'MUSIC',
    size: '2x2',
    previewTitle: '复古唱片播放组件',
    previewValue: '',
    templateId: 'vinyl-record',
    data: { subtitle: 'SCION MANIA', cornerRadius: 22, frosted: 6, shadow: 12, musicTitle: 'SCION', musicArtist: 'MANIA' },
    w: 2,
    h: 2,
  },
  {
    id: 'template:clock-card',
    name: '时钟',
    type: 'CLOCK',
    size: '4x1',
    previewTitle: '大号时间显示',
    previewValue: '',
    templateId: 'clock-card',
    data: { subtitle: 'Thu Mar 26', cornerRadius: 18, frosted: 4, shadow: 8 },
    w: 4,
    h: 1,
  },
  {
    id: 'template:text-card',
    name: '文字',
    type: 'TEXT',
    size: '2x2',
    previewTitle: '可编辑文字组件',
    previewValue: '',
    templateId: 'text-card',
    data: { titleText: '184 天', subtitle: '我们的纪念日\n2024.07.30', titleColor: '#ffffff', titleFontSize: 22, cornerRadius: 20, frosted: 8, shadow: 10 },
    w: 2,
    h: 2,
  },
];

const getCustomWidgetDisplayName = (data: Record<string, any> | undefined): string => {
  const savedName = typeof data?.name === 'string' ? data.name.trim() : '';
  return savedName || '自定义组件';
};

// ==================== 主组件 ====================

export const WidgetManageView: React.FC<WidgetManageViewProps> = ({ onNavigateToEditor }) => {
  const { desktopLayout, updateDesktopLayout } = useGlobalDesktopStore();
  const builtInWidgetItems = builtInTemplateItems;
  const [showSystemParams, setShowSystemParams] = React.useState(false);
  const [localCustomWidgets, setLocalCustomWidgets] = React.useState(() => readCustomWidgetLibrary());
  React.useEffect(() => {
    const syncLocalCustomWidgets = () => setLocalCustomWidgets(readCustomWidgetLibrary());
    syncLocalCustomWidgets();
    window.addEventListener(CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, syncLocalCustomWidgets);
    window.addEventListener('storage', syncLocalCustomWidgets);
    return () => {
      window.removeEventListener(CUSTOM_WIDGET_LIBRARY_CHANGED_EVENT, syncLocalCustomWidgets);
      window.removeEventListener('storage', syncLocalCustomWidgets);
    };
  }, []);
  React.useEffect(() => {
    const currentLibrary = desktopLayout.customWidgets || [];
    const currentKeys = new Set(currentLibrary.map((widget) => `${getCustomWidgetDisplayName({ name: widget.name, widgetCode: widget.widgetCode })}::${widget.widgetCode}`));
    const legacyWidgets = (desktopLayout.items || [])
      .filter((item) => (
        item.type === 'widget' &&
        item.componentId === 'custom-widget' &&
        item.data?.templateId === 'custom-code' &&
        typeof item.data?.widgetCode === 'string' &&
        item.data.widgetCode.trim().length > 0
      ))
      .filter((item) => !currentKeys.has(`${getCustomWidgetDisplayName(item.data)}::${item.data?.widgetCode}`))
      .map((item) => ({
        id: item.instanceId,
        name: getCustomWidgetDisplayName(item.data),
        width: item.w || 2,
        height: item.h || 2,
        templateId: 'custom-code',
        widgetCode: String(item.data?.widgetCode || ''),
        cornerRadius: typeof item.data?.cornerRadius === 'number' ? item.data.cornerRadius : 24,
        frosted: typeof item.data?.frosted === 'number' ? item.data.frosted : 8,
        shadow: typeof item.data?.shadow === 'number' ? item.data.shadow : 12,
        data: item.data,
      }));
    if (legacyWidgets.length > 0) {
      updateDesktopLayout({ customWidgets: [...currentLibrary, ...legacyWidgets] });
    }
  }, [desktopLayout.customWidgets, desktopLayout.items, updateDesktopLayout]);

  const mergedSavedCustomWidgets = [...(desktopLayout.customWidgets || []), ...localCustomWidgets].filter((widget, index, array) => (
    array.findIndex((item) => item.id === widget.id || (item.name === widget.name && item.widgetCode === widget.widgetCode)) === index
  ));
  const savedCustomWidgetItems: WidgetItem[] = mergedSavedCustomWidgets
    .map((widget) => ({
      id: `library:${widget.id}`,
      name: getCustomWidgetDisplayName({ name: widget.name, widgetCode: widget.widgetCode }),
      type: 'CUSTOM',
      size: `${widget.width || 2}x${widget.height || 2}`,
      previewTitle: '自定义组件代码',
      previewValue: '',
      templateId: widget.templateId || 'custom-code',
      data: {
        ...(widget.data || {}),
        name: widget.name,
        templateId: widget.templateId || 'custom-code',
        widgetCode: widget.widgetCode,
        cornerRadius: widget.cornerRadius,
        frosted: widget.frosted,
        shadow: widget.shadow,
      },
      w: widget.width || 2,
      h: widget.height || 2,
    }));
  const savedCustomKeys = new Set(
    mergedSavedCustomWidgets.map((widget) => `${getCustomWidgetDisplayName({ name: widget.name, widgetCode: widget.widgetCode })}::${widget.widgetCode}`)
  );
  const legacyDesktopWidgetItems: WidgetItem[] = (desktopLayout.items || [])
    .filter(
      (item) =>
        item.type === 'widget' &&
        item.componentId === 'custom-widget' &&
        item.data?.templateId === 'custom-code' &&
        typeof item.data?.widgetCode === 'string' &&
        !savedCustomKeys.has(`${getCustomWidgetDisplayName(item.data)}::${item.data.widgetCode}`)
    )
    .map((item) => ({
      id: item.instanceId,
      name: getCustomWidgetDisplayName(item.data),
      type: 'CUSTOM',
      size: `${item.w || 2}x${item.h || 2}`,
      previewTitle: '自定义组件代码',
      previewValue: '',
      templateId: 'custom-code',
      data: item.data || {},
      w: item.w || 2,
      h: item.h || 2,
    }));
  const customWidgetItems = [...savedCustomWidgetItems, ...legacyDesktopWidgetItems];

  const renderWidgetCard = (widget: WidgetItem) => (
    <motion.div
      key={widget.id}
      variants={itemVariants}
      className="group relative rounded-[1.75rem] bg-white/80 border border-white/60 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.6)] overflow-hidden transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_26px_45px_-30px_rgba(15,23,42,0.7)]"
      onClick={() => onNavigateToEditor(widget.id)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent pointer-events-none" />
      <div className="p-4 pb-3">
        <div className="relative rounded-2xl overflow-hidden h-28 bg-slate-100/80 border border-slate-100">
          <WidgetPlaceholder
            name={widget.name}
            status="normal"
            templateId={widget.templateId}
            subtitle={typeof widget.data.subtitle === 'string' ? widget.data.subtitle : undefined}
            titleText={typeof widget.data.titleText === 'string' ? widget.data.titleText : undefined}
            titleColor={typeof widget.data.titleColor === 'string' ? widget.data.titleColor : undefined}
            titleFontSize={typeof widget.data.titleFontSize === 'number' ? widget.data.titleFontSize : undefined}
            widgetCode={typeof widget.data.widgetCode === 'string' ? widget.data.widgetCode : undefined}
            musicTitle={typeof widget.data.musicTitle === 'string' ? widget.data.musicTitle : undefined}
            musicArtist={typeof widget.data.musicArtist === 'string' ? widget.data.musicArtist : undefined}
            cornerRadius={typeof widget.data.cornerRadius === 'number' ? widget.data.cornerRadius : 22}
            frosted={typeof widget.data.frosted === 'number' ? widget.data.frosted : 8}
            shadow={typeof widget.data.shadow === 'number' ? widget.data.shadow : 10}
            width={widget.w}
            height={widget.h}
          />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 tracking-widest">{widget.type}</span>
            <span className="text-[10px] text-slate-400 bg-slate-100/80 rounded-full px-2 py-0.5">{widget.size}</span>
          </div>
          <div className="mt-1 text-[15px] font-semibold text-slate-800 truncate">{widget.name}</div>
          <div className="text-xs text-slate-500 truncate">{widget.previewTitle}</div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="text-[11px] text-slate-400">点击查看代码</div>
      </div>
    </motion.div>
  );

  const renderAddWidgetCard = () => (
    <motion.button
      type="button"
      key="template:custom-code"
      variants={itemVariants}
      className="min-h-[214px] rounded-[1.75rem] border border-dashed border-slate-300/90 bg-white/45 text-slate-400 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:bg-white/70 hover:text-slate-600"
      onClick={() => onNavigateToEditor('template:custom-code')}
    >
      <div className="flex h-full min-h-[214px] flex-col items-center justify-center gap-3 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/70 text-[30px] font-light leading-none">
          +
        </div>
      </div>
    </motion.button>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-800 font-sans pb-16"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {showSystemParams ? (
          <motion.div
            className="flex-1 overflow-y-auto px-5 pb-16 pt-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="mb-4 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm"
              onClick={() => setShowSystemParams(false)}
            >
              返回组件管理
            </button>
            <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">SYSTEM PARAMS</div>
              <div className="mt-2 text-xl font-semibold text-slate-800">系统参数说明书</div>
              <div className="mt-1 text-xs text-slate-500">自定义组件代码可以通过 system 读取参数，也可以调用音乐动作。</div>
            </div>
            <div className="mt-4 space-y-4">
              {systemParamSections.map((section) => (
                <section key={section.title} className="rounded-[1.5rem] border border-white/70 bg-white/78 p-4 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.55)]">
                  <h3 className="mb-3 text-[15px] font-semibold text-slate-800">{section.title}</h3>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item.name} className="rounded-2xl bg-slate-50 px-3 py-2">
                        <code className="block text-[12px] font-semibold text-slate-900">{item.name}</code>
                        <span className="text-[12px] text-slate-500">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
        <motion.header
          className="px-5 pt-6 pb-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={itemVariants}
            className="rounded-[1.75rem] border border-white/60 bg-white/70 backdrop-blur shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] p-5"
          >
            <div className="text-[11px] text-slate-400 uppercase tracking-[0.3em]">组件工坊</div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold text-slate-800">组件管理</div>
                <div className="text-xs text-slate-500 mt-1">查看桌面内置组件样式代码</div>
              </div>
              <div className="text-xs text-slate-500 bg-slate-100/80 rounded-full px-2.5 py-1">
                {builtInWidgetItems.length + customWidgetItems.length} 个
            </div>
            </div>
          </motion.div>
        </motion.header>

        <motion.main 
          className="px-5 grid grid-cols-2 gap-4 pb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <div className="col-span-2 flex items-end justify-between px-1 pt-1">
            <div className="text-sm font-semibold text-slate-700">内置组件</div>
            <div className="text-xs text-slate-400">{builtInWidgetItems.length} 个</div>
          </div>
          <motion.button
            type="button"
            variants={itemVariants}
            className="col-span-2 rounded-[1.5rem] border border-white/70 bg-white/78 p-4 text-left shadow-[0_16px_34px_-32px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            onClick={() => setShowSystemParams(true)}
          >
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">SYSTEM PARAMS</div>
            <div className="mt-1 text-[15px] font-semibold text-slate-800">系统参数说明书</div>
            <div className="mt-1 text-xs text-slate-500">查看日期、时间、音乐等可用参数</div>
          </motion.button>
          {builtInWidgetItems.map(renderWidgetCard)}
          {customWidgetItems.map(renderWidgetCard)}
          {renderAddWidgetCard()}
        </motion.main>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default WidgetManageView;
