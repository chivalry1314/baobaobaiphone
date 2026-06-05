import React from 'react';
import { ChevronLeft, Minus, Plus, RotateCcw } from 'lucide-react';
import { useWeChatStore } from '../store';
import type { WeChatAiChatContextConfigViewProps } from '../types';

const DEFAULT_RECENT_MESSAGE_COUNT = 30;
const DEFAULT_MEMORY_REFERENCE_COUNT = 12;
const DEFAULT_INCLUDE_PERSONAL_PROFILE_MEMORY = true;
const MIN_RECENT_MESSAGE_COUNT = 0;
const MAX_RECENT_MESSAGE_COUNT = 120;
const MIN_MEMORY_REFERENCE_COUNT = 0;
const MAX_MEMORY_REFERENCE_COUNT = 40;

const normalizeRecentMessageCount = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_RECENT_MESSAGE_COUNT;
  return Math.max(MIN_RECENT_MESSAGE_COUNT, Math.min(MAX_RECENT_MESSAGE_COUNT, Math.round(value)));
};

const normalizeMemoryReferenceCount = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_MEMORY_REFERENCE_COUNT;
  return Math.max(MIN_MEMORY_REFERENCE_COUNT, Math.min(MAX_MEMORY_REFERENCE_COUNT, Math.round(value)));
};

export const WeChatAiChatContextConfigView: React.FC<WeChatAiChatContextConfigViewProps> = ({
  onBack,
}) => {
  const { wechatAiChatSettings, updateWeChatAiChatSettings } = useWeChatStore();

  const recentMessageCount = normalizeRecentMessageCount(wechatAiChatSettings.recentMessageCount);
  const memoryReferenceCount = normalizeMemoryReferenceCount(
    wechatAiChatSettings.memoryReferenceCount
  );
  const includePersonalProfileMemory =
    wechatAiChatSettings.includePersonalProfileMemory !== false;

  const updateRecentMessageCount = (nextValue: number) => {
    updateWeChatAiChatSettings({ recentMessageCount: nextValue });
  };

  const updateMemoryReferenceCount = (nextValue: number) => {
    updateWeChatAiChatSettings({ memoryReferenceCount: nextValue });
  };

  const togglePersonalProfileMemory = () => {
    updateWeChatAiChatSettings({
      includePersonalProfileMemory: !includePersonalProfileMemory,
    });
  };

  const resetDefaults = () => {
    updateWeChatAiChatSettings({
      recentMessageCount: DEFAULT_RECENT_MESSAGE_COUNT,
      memoryReferenceCount: DEFAULT_MEMORY_REFERENCE_COUNT,
      includePersonalProfileMemory: DEFAULT_INCLUDE_PERSONAL_PROFILE_MEMORY,
    });
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[#EDEDED] flex flex-col">
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">
          AI 聊天上下文
        </h1>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">当前会话窗口（条）</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                仅把当前会话最近 N 条消息传给 AI。设为 0 表示不带当前会话历史。
              </div>
            </div>
            <span className="text-[18px] font-semibold text-gray-900 tabular-nums">
              {recentMessageCount}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-gray-200 px-2 py-1.5">
            <button
              type="button"
              onClick={() => updateRecentMessageCount(recentMessageCount - 1)}
              disabled={recentMessageCount <= MIN_RECENT_MESSAGE_COUNT}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                recentMessageCount > MIN_RECENT_MESSAGE_COUNT
                  ? 'text-gray-700 active:bg-gray-100'
                  : 'text-gray-300'
              }`}
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min={String(MIN_RECENT_MESSAGE_COUNT)}
              max={String(MAX_RECENT_MESSAGE_COUNT)}
              step="1"
              value={recentMessageCount}
              onChange={(event) => updateRecentMessageCount(parseInt(event.target.value, 10))}
              className="mx-2 h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#4E83C5]"
            />
            <button
              type="button"
              onClick={() => updateRecentMessageCount(recentMessageCount + 1)}
              disabled={recentMessageCount >= MAX_RECENT_MESSAGE_COUNT}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                recentMessageCount < MAX_RECENT_MESSAGE_COUNT
                  ? 'text-gray-700 active:bg-gray-100'
                  : 'text-gray-300'
              }`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">记忆中心引用（条）</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                从记忆中心拉取历史摘要与记忆条目。设为 0 表示关闭记忆引用。
              </div>
            </div>
            <span className="text-[18px] font-semibold text-gray-900 tabular-nums">
              {memoryReferenceCount}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-gray-200 px-2 py-1.5">
            <button
              type="button"
              onClick={() => updateMemoryReferenceCount(memoryReferenceCount - 1)}
              disabled={memoryReferenceCount <= MIN_MEMORY_REFERENCE_COUNT}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                memoryReferenceCount > MIN_MEMORY_REFERENCE_COUNT
                  ? 'text-gray-700 active:bg-gray-100'
                  : 'text-gray-300'
              }`}
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min={String(MIN_MEMORY_REFERENCE_COUNT)}
              max={String(MAX_MEMORY_REFERENCE_COUNT)}
              step="1"
              value={memoryReferenceCount}
              onChange={(event) =>
                updateMemoryReferenceCount(parseInt(event.target.value, 10))
              }
              className="mx-2 h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#4E83C5]"
            />
            <button
              type="button"
              onClick={() => updateMemoryReferenceCount(memoryReferenceCount + 1)}
              disabled={memoryReferenceCount >= MAX_MEMORY_REFERENCE_COUNT}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                memoryReferenceCount < MAX_MEMORY_REFERENCE_COUNT
                  ? 'text-gray-700 active:bg-gray-100'
                  : 'text-gray-300'
              }`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-gray-900">跨 App 个人记忆注入</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                开启后会读取个人空间中其他 App 的记忆作为参考。
              </div>
            </div>
            <button
              type="button"
              onClick={togglePersonalProfileMemory}
              className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${
                includePersonalProfileMemory ? 'bg-[#4E83C5]' : 'bg-gray-300'
              }`}
              aria-pressed={includePersonalProfileMemory}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  includePersonalProfileMemory ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="text-[14px] font-semibold text-gray-900">策略说明</div>
          <p className="mt-1 text-[12px] leading-5 text-gray-600">
            推荐保持混合模式：当前会话窗口 + 记忆中心引用 + 跨 App 个人记忆注入。
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700">
            <span>
              当前配置：会话 {recentMessageCount} 条 + 记忆 {memoryReferenceCount} 条
            </span>
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] text-gray-600 active:opacity-80"
            >
              <RotateCcw size={12} />
              默认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
