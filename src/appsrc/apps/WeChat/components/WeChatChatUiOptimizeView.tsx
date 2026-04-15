import React, { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ChevronLeft,
  Code2,
  Eraser,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { useWeChatStore } from '../store';
import { normalizeUiStyleRecord, parseWeChatUiRenderConfig } from '../uiRenderConfig';
import type {
  WeChatBubblePreset,
  WeChatChatUiOptimizeViewProps,
  WeChatUiSettings,
} from '../types';

type OptimizeTab = 'background' | 'bubble' | 'source';

const TAB_ITEMS: { key: OptimizeTab; label: string }[] = [
  { key: 'background', label: '聊天背景' },
  { key: 'bubble', label: '气泡样式' },
  { key: 'source', label: '源码渲染' },
];

const BUBBLE_PRESETS: { key: WeChatBubblePreset; label: string; desc: string }[] = [
  { key: 'wechat', label: '微信默认', desc: '标准微信圆角和配色' },
  { key: 'rounded', label: '柔和圆角', desc: '圆角更大，带轻微阴影' },
  { key: 'glass', label: '玻璃感', desc: '半透明磨砂风格' },
  { key: 'outline', label: '线框风', desc: '透明底 + 边框' },
];

const SOURCE_TEMPLATE = `module.exports = {
  // 可选：聊天背景图 URL 或 base64
  chatBackgroundImage: '',
  // 可选：聊天背景样式
  chatBackgroundStyle: {
    backgroundColor: '#e8f3ff',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  },
  // 可选：自己消息气泡样式
  selfBubbleStyle: {
    background: '#b7f28a',
    borderRadius: '14px 6px 14px 14px'
  },
  // 可选：对方消息气泡样式
  peerBubbleStyle: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px 14px 14px 14px'
  },
  // 可选：文本样式
  selfTextStyle: { color: '#111827' },
  peerTextStyle: { color: '#111827' }
};`;

const compressImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-file-failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('decode-image-failed'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1400;
        let { width, height } = image;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height >= width && height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas-failed'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      image.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });

const getBubblePresetClass = (preset: WeChatBubblePreset, isSelf: boolean): string => {
  switch (preset) {
    case 'rounded':
      return isSelf
        ? 'bg-[#A6EB7A] border border-[#8ED865] rounded-2xl rounded-tr-[8px] text-gray-900 shadow-sm'
        : 'bg-white border border-gray-200 rounded-2xl rounded-tl-[8px] text-gray-900 shadow-sm';
    case 'glass':
      return isSelf
        ? 'bg-[#95ec69]/65 border border-[#7fd35a]/60 rounded-2xl rounded-tr-[8px] text-gray-900 backdrop-blur-md'
        : 'bg-white/70 border border-white/80 rounded-2xl rounded-tl-[8px] text-gray-900 backdrop-blur-md';
    case 'outline':
      return isSelf
        ? 'bg-transparent border border-[#95ec69] rounded-xl rounded-tr-[8px] text-gray-900'
        : 'bg-transparent border border-gray-300 rounded-xl rounded-tl-[8px] text-gray-900';
    case 'wechat':
    default:
      return isSelf
        ? 'bg-[#95ec69] rounded-lg rounded-tr-none text-gray-900'
        : 'bg-white rounded-lg rounded-tl-none text-gray-900';
  }
};

const ChatPreviewCard: React.FC<{
  title: string;
  containerStyle?: CSSProperties;
  selfBubblePreset: WeChatBubblePreset;
  peerBubblePreset: WeChatBubblePreset;
  selfBubbleStyle?: CSSProperties;
  peerBubbleStyle?: CSSProperties;
  selfTextStyle?: CSSProperties;
  peerTextStyle?: CSSProperties;
}> = ({
  title,
  containerStyle,
  selfBubblePreset,
  peerBubblePreset,
  selfBubbleStyle,
  peerBubbleStyle,
  selfTextStyle,
  peerTextStyle,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-100 text-[12px] text-gray-500">{title}</div>
      <div
        className="h-40 p-3 bg-gradient-to-b from-[#EAF3FF] to-[#F7FAFF]"
        style={containerStyle}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-white border border-gray-200" />
          <div
            className={`max-w-[70%] px-2.5 py-1.5 text-[13px] ${getBubblePresetClass(
              peerBubblePreset,
              false
            )}`}
            style={peerBubbleStyle}
          >
            <span style={peerTextStyle}>这是一条对方消息预览</span>
          </div>
        </div>
        <div className="flex items-start gap-2 justify-end">
          <div
            className={`max-w-[70%] px-2.5 py-1.5 text-[13px] ${getBubblePresetClass(
              selfBubblePreset,
              true
            )}`}
            style={selfBubbleStyle}
          >
            <span style={selfTextStyle}>这是一条我的消息预览</span>
          </div>
          <div className="h-7 w-7 rounded-md bg-[#95ec69]/70 border border-[#8ed865]" />
        </div>
      </div>
    </div>
  );
};

export const WeChatChatUiOptimizeView: React.FC<WeChatChatUiOptimizeViewProps> = ({ onBack }) => {
  const { wechatUiSettings, updateWeChatUiSettings } = useWeChatStore();
  const [activeTab, setActiveTab] = useState<OptimizeTab>('background');
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  const updatePreset = <K extends 'selfBubblePreset' | 'peerBubblePreset'>(
    field: K,
    value: WeChatBubblePreset
  ) => {
    updateWeChatUiSettings({ [field]: value } as Pick<WeChatUiSettings, K>);
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    updateWeChatUiSettings({ chatBackgroundImage: compressed });
    event.target.value = '';
  };

  const handleSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    updateWeChatUiSettings({ customRendererSource: content });
    event.target.value = '';
  };

  const previewBackgroundStyle = useMemo<CSSProperties>(() => {
    const opacity = Math.max(0, Math.min(1, wechatUiSettings.chatBackgroundOpacity));
    const style: CSSProperties = {};
    if (wechatUiSettings.chatBackgroundImage) {
      style.backgroundImage = `linear-gradient(rgba(255,255,255,${1 - opacity}), rgba(255,255,255,${1 - opacity})), url(${wechatUiSettings.chatBackgroundImage})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
    }
    return style;
  }, [wechatUiSettings.chatBackgroundImage, wechatUiSettings.chatBackgroundOpacity]);

  const sourcePreview = useMemo(() => {
    const config = parseWeChatUiRenderConfig(wechatUiSettings.customRendererSource);
    const hasSource = wechatUiSettings.customRendererSource.trim().length > 0;
    const parseError = hasSource && !config;

    const containerStyle: CSSProperties = {};
    if (config?.chatBackgroundStyle) {
      Object.assign(containerStyle, normalizeUiStyleRecord(config.chatBackgroundStyle));
    }
    if (config?.chatBackgroundImage) {
      containerStyle.backgroundImage = `url(${config.chatBackgroundImage})`;
      containerStyle.backgroundSize = 'cover';
      containerStyle.backgroundPosition = 'center';
      containerStyle.backgroundRepeat = 'no-repeat';
    }

    return {
      config,
      parseError,
      containerStyle,
      selfBubbleStyle: normalizeUiStyleRecord(config?.selfBubbleStyle),
      peerBubbleStyle: normalizeUiStyleRecord(config?.peerBubbleStyle),
      selfTextStyle: normalizeUiStyleRecord(config?.selfTextStyle),
      peerTextStyle: normalizeUiStyleRecord(config?.peerTextStyle),
    };
  }, [wechatUiSettings.customRendererSource]);

  return (
    <div className="absolute inset-0 z-[70] bg-[#EDEDED] flex flex-col">
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">聊天界面优化</h1>
      </div>

      <div className="px-3 pt-3 shrink-0">
        <div className="rounded-xl bg-white border border-gray-200 p-1 flex">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-9 rounded-lg text-[14px] transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#07C160] text-white'
                  : 'text-gray-600 active:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-2">
        {activeTab === 'background' ? (
          <div className="space-y-3">
            <ChatPreviewCard
              title="聊天背景预览"
              containerStyle={previewBackgroundStyle}
              selfBubblePreset={wechatUiSettings.selfBubblePreset}
              peerBubblePreset={wechatUiSettings.peerBubblePreset}
            />

            <section className="rounded-xl bg-white border border-gray-100 p-3">
              <div className="text-[15px] font-semibold text-gray-900">背景图片</div>
              <div className="text-[12px] text-gray-500 mt-0.5">支持上传图片作为聊天背景，实时生效</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => backgroundInputRef.current?.click()}
                  className="h-9 px-3 rounded-md bg-[#07C160] text-white text-[13px] active:opacity-80 flex items-center gap-1"
                >
                  <ImageIcon size={14} /> 上传背景
                </button>
                <button
                  type="button"
                  onClick={() => updateWeChatUiSettings({ chatBackgroundImage: '' })}
                  className="h-9 px-3 rounded-md border border-gray-200 text-gray-600 text-[13px] active:bg-gray-50"
                >
                  清空背景
                </button>
              </div>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBackgroundUpload}
              />

              <div className="mt-4">
                <div className="flex items-center justify-between text-[13px] text-gray-700">
                  <span>背景透明度</span>
                  <span>{Math.round(wechatUiSettings.chatBackgroundOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(wechatUiSettings.chatBackgroundOpacity * 100)}
                  onChange={(event) =>
                    updateWeChatUiSettings({
                      chatBackgroundOpacity: Number(event.target.value) / 100,
                    })
                  }
                  className="mt-2 w-full accent-[#07C160]"
                />
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'bubble' ? (
          <div className="space-y-3">
            <ChatPreviewCard
              title="气泡样式预览"
              containerStyle={previewBackgroundStyle}
              selfBubblePreset={wechatUiSettings.selfBubblePreset}
              peerBubblePreset={wechatUiSettings.peerBubblePreset}
            />

            <section className="rounded-xl bg-white border border-gray-100 p-3">
              <div className="text-[15px] font-semibold text-gray-900">我的气泡</div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BUBBLE_PRESETS.map((item) => (
                  <button
                    key={`self-${item.key}`}
                    type="button"
                    onClick={() => updatePreset('selfBubblePreset', item.key)}
                    className={`rounded-md border px-2.5 py-2 text-left ${
                      wechatUiSettings.selfBubblePreset === item.key
                        ? 'border-[#07C160] bg-[#07C160]/5'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="text-[13px] text-gray-900">{item.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>

              <div className="text-[15px] font-semibold text-gray-900 mt-4">对方气泡</div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BUBBLE_PRESETS.map((item) => (
                  <button
                    key={`peer-${item.key}`}
                    type="button"
                    onClick={() => updatePreset('peerBubblePreset', item.key)}
                    className={`rounded-md border px-2.5 py-2 text-left ${
                      wechatUiSettings.peerBubblePreset === item.key
                        ? 'border-[#07C160] bg-[#07C160]/5'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="text-[13px] text-gray-900">{item.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'source' ? (
          <div className="space-y-3">
            <ChatPreviewCard
              title="源码渲染预览"
              containerStyle={sourcePreview.containerStyle}
              selfBubblePreset={wechatUiSettings.selfBubblePreset}
              peerBubblePreset={wechatUiSettings.peerBubblePreset}
              selfBubbleStyle={sourcePreview.selfBubbleStyle}
              peerBubbleStyle={sourcePreview.peerBubbleStyle}
              selfTextStyle={sourcePreview.selfTextStyle}
              peerTextStyle={sourcePreview.peerTextStyle}
            />

            <section className="rounded-xl bg-white border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-gray-900">源码渲染开关</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">开启后聊天页将按源码配置渲染</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateWeChatUiSettings({
                      customRendererEnabled: !wechatUiSettings.customRendererEnabled,
                    })
                  }
                  className={`h-7 w-12 rounded-full relative transition-colors ${
                    wechatUiSettings.customRendererEnabled
                      ? 'bg-[#07C160]'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
                      wechatUiSettings.customRendererEnabled
                        ? 'left-[22px]'
                        : 'left-[2px]'
                    }`}
                  />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => sourceInputRef.current?.click()}
                  className="h-8 px-3 rounded-md border border-gray-200 text-gray-700 text-[12px] active:bg-gray-50 flex items-center gap-1"
                >
                  <Upload size={13} /> 上传源码文件
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateWeChatUiSettings({ customRendererSource: SOURCE_TEMPLATE })
                  }
                  className="h-8 px-3 rounded-md border border-gray-200 text-gray-700 text-[12px] active:bg-gray-50 flex items-center gap-1"
                >
                  <Code2 size={13} /> 填入模板
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateWeChatUiSettings({
                      customRendererSource: '',
                      customRendererEnabled: false,
                    })
                  }
                  className="h-8 px-3 rounded-md border border-gray-200 text-gray-700 text-[12px] active:bg-gray-50 flex items-center gap-1"
                >
                  <Eraser size={13} /> 清空源码
                </button>
              </div>

              <textarea
                value={wechatUiSettings.customRendererSource}
                onChange={(event) =>
                  updateWeChatUiSettings({ customRendererSource: event.target.value })
                }
                placeholder="粘贴 JSON 或 module.exports 源码..."
                className="mt-2 w-full min-h-[200px] rounded-lg border border-gray-200 bg-[#0B1020] text-[#D8E2FF] font-mono text-[12px] leading-5 px-3 py-2 outline-none"
              />
              <input
                ref={sourceInputRef}
                type="file"
                accept=".txt,.js,.json,.mjs,.cjs"
                className="hidden"
                onChange={handleSourceUpload}
              />

              {sourcePreview.parseError ? (
                <div className="mt-2 text-[12px] text-red-500">源码解析失败，请检查 JSON/JS 格式</div>
              ) : (
                <div className="mt-2 text-[12px] text-gray-500">
                  {sourcePreview.config
                    ? '源码可解析，预览卡片已应用源码样式'
                    : '未提供源码，预览卡片使用当前预设样式'}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
};
