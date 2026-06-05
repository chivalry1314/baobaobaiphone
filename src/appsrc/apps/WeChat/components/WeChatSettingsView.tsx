import React from 'react';
import { Bot, Brain, ChevronLeft, ChevronRight, CircleOff, MessageSquare, Sparkles } from 'lucide-react';
import type { WeChatSettingsViewProps } from '../types';
import { useWeChatStore } from '../store';

export const WeChatSettingsView: React.FC<WeChatSettingsViewProps> = ({
  onBack,
  onChatUiOptimizeClick,
  onAiChatContextConfigClick,
  onMomentsSettingsClick,
  onAiMomentsConfigClick,
}) => {
  const { wechatUiSettings, updateWeChatUiSettings } = useWeChatStore();

  const Row = ({
    icon: Icon,
    title,
    subtitle,
    onClick,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
    >
      <div className="h-9 w-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#4E83C5]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[16px] text-gray-900">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5 truncate">{subtitle}</div>
      </div>
      <ChevronRight size={20} className="text-gray-300" />
    </button>
  );

  const SwitchRow = ({
    icon: Icon,
    title,
    subtitle,
    checked,
    onToggle,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle: string;
    checked: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 bg-white px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
    >
      <div className="h-9 w-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#4E83C5]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-[16px] text-gray-900">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5 truncate">{subtitle}</div>
      </div>
      <span
        className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#4E83C5]' : 'bg-gray-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="absolute inset-0 z-[60] bg-[#EDEDED] flex flex-col">
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">设置</h1>
      </div>

      <div className="mt-2 border-t border-b border-gray-200 bg-white">
        <Row
          icon={MessageSquare}
          title="聊天界面优化"
          subtitle="自定义聊天背景、自己和对方的聊天气泡样式"
          onClick={onChatUiOptimizeClick}
        />
        <Row
          icon={Brain}
          title="AI聊天上下文"
          subtitle="设置当前会话窗口和记忆中心引用条数"
          onClick={onAiChatContextConfigClick}
        />
        <SwitchRow
          icon={CircleOff}
          title="隐藏聊天悬浮球"
          subtitle="关闭微信会话界面的纠正剧情悬浮球"
          checked={Boolean(wechatUiSettings.hideFloatingBubble)}
          onToggle={() => updateWeChatUiSettings({ hideFloatingBubble: !wechatUiSettings.hideFloatingBubble })}
        />
        <Row
          icon={Sparkles}
          title="朋友圈设置"
          subtitle="管理朋友圈封面和展示偏好"
          onClick={onMomentsSettingsClick}
        />
        <Row
          icon={Bot}
          title="AI朋友圈配置"
          subtitle="配置下拉刷新生成条数、是否包含图片"
          onClick={onAiMomentsConfigClick}
        />
      </div>
    </div>
  );
};
