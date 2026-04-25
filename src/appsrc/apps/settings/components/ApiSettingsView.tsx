import React from 'react';
import { Cpu, Eye, EyeOff, Globe, Image as ImageIcon, Key, Mic2, RefreshCw } from 'lucide-react';
import type { GlobalSettings } from '../../../../core/sdk/types';
import { detectVisionSupportByModel } from '../../../../core/modelCapabilities';
import {
  scrollFieldIntoViewInContainer,
  useKeyboardViewportStabilizer,
} from '../../../../core/mobileViewport';

const VISION_TEST_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAtSURBVFhH7c6hAQAACMOw/f80+B0AJpVVyTyXHtcBAAAAAAAAAAAAAAAAAAAsl/rw4k5bXakAAAAASUVORK5CYII=';

const CHAT_PROVIDER_BASE_URL_MAP = {
  openai: 'https://api.openai.com/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
} as const;

interface ApiSettingsViewProps {
  settings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;
  availableChatModels: string[];
  availableImageModels: string[];
  availableMemoryModels: string[];
  isLoadingChatModels: boolean;
  isLoadingImageModels: boolean;
  isLoadingMemoryModels: boolean;
  showApiKey: boolean;
  showImageApiKey: boolean;
  showVoiceApiKey: boolean;
  showMemoryApiKey: boolean;
  onToggleShowApiKey: () => void;
  onToggleShowImageApiKey: () => void;
  onToggleShowVoiceApiKey: () => void;
  onToggleShowMemoryApiKey: () => void;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  settings,
  updateSettings,
  availableChatModels,
  availableImageModels,
  availableMemoryModels,
  isLoadingChatModels,
  isLoadingImageModels,
  isLoadingMemoryModels,
  showApiKey,
  showImageApiKey,
  showVoiceApiKey,
  showMemoryApiKey,
  onToggleShowApiKey,
  onToggleShowImageApiKey,
  onToggleShowVoiceApiKey,
  onToggleShowMemoryApiKey,
}) => {
  const contentScrollRef = React.useRef<HTMLElement | null>(null);
  const chatProviderValue = settings.chatProvider || 'openai';
  const chatModelValue = settings.model || 'gpt-3.5-turbo';
  const imageModelValue = settings.imageModel || 'gpt-image-1';
  const imageSizeValue = settings.imageSize || '1024x1024';
  const memoryModelValue = settings.memoryModel || 'gpt-4.1-mini';
  const memoryBaseUrlValue = settings.memoryBaseUrl || '';
  const memoryApiKeyValue = settings.memoryApiKey || '';
  const voiceProviderValue = settings.voiceProvider || 'none';
  const voiceBaseUrlValue = settings.voiceBaseUrl || 'https://api.minimaxi.com';
  const voiceApiKeyValue = settings.voiceApiKey || '';
  const voiceModelValue = settings.voiceModel || 'speech-2.8-hd';
  const voiceVoiceIdValue = settings.voiceVoiceId || 'male-qn-qingse';
  const voiceGroupIdValue = settings.voiceMinimaxGroupId || '';
  const voiceAutoPlayValue =
    typeof settings.voiceAutoPlay === 'boolean' ? settings.voiceAutoPlay : true;
  const [voiceKeyTestState, setVoiceKeyTestState] = React.useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [voiceKeyTestMessage, setVoiceKeyTestMessage] = React.useState('');
  const [chatKeyTestState, setChatKeyTestState] = React.useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [chatKeyTestMessage, setChatKeyTestMessage] = React.useState('');
  const [imageKeyTestState, setImageKeyTestState] = React.useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [imageKeyTestMessage, setImageKeyTestMessage] = React.useState('');
  const [visionTestState, setVisionTestState] = React.useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [visionTestMessage, setVisionTestMessage] = React.useState('');
  const defaultChatBaseUrl = CHAT_PROVIDER_BASE_URL_MAP[chatProviderValue] || CHAT_PROVIDER_BASE_URL_MAP.openai;
  const chatModelPlaceholder =
    chatProviderValue === 'siliconflow'
      ? '例如 Qwen/Qwen2.5-VL-72B-Instruct'
      : '请输入对话模型，或等待加载...';
  const visionSupportState = detectVisionSupportByModel(chatModelValue);
  useKeyboardViewportStabilizer(true, contentScrollRef);
  const handleFieldFocusCapture = React.useCallback((event: React.FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer) return;
    const alignField = () =>
      scrollFieldIntoViewInContainer(scrollContainer, target, {
        preferTopAlign: true,
        topPadding: 10,
        bottomPadding: 28,
      });
    alignField();
    window.setTimeout(alignField, 80);
    window.setTimeout(alignField, 180);
    window.setTimeout(alignField, 320);
    window.setTimeout(alignField, 460);
  }, []);

  React.useEffect(() => {
    setVisionTestState('idle');
    setVisionTestMessage('');
  }, [chatModelValue, settings.baseUrl, settings.apiKey]);

  React.useEffect(() => {
    setChatKeyTestState('idle');
    setChatKeyTestMessage('');
  }, [settings.baseUrl, settings.apiKey, chatProviderValue]);

  React.useEffect(() => {
    setImageKeyTestState('idle');
    setImageKeyTestMessage('');
  }, [settings.imageBaseUrl, settings.imageApiKey, settings.baseUrl, settings.apiKey]);

  const handleChatProviderChange = (provider: 'openai' | 'siliconflow') => {
    const prevProvider = chatProviderValue;
    const prevDefaultBaseUrl =
      CHAT_PROVIDER_BASE_URL_MAP[prevProvider] || CHAT_PROVIDER_BASE_URL_MAP.openai;
    const nextDefaultBaseUrl =
      CHAT_PROVIDER_BASE_URL_MAP[provider] || CHAT_PROVIDER_BASE_URL_MAP.openai;
    const currentBaseUrl = (settings.baseUrl || '').trim();
    const shouldSyncBaseUrl = !currentBaseUrl || currentBaseUrl === prevDefaultBaseUrl;

    updateSettings({
      chatProvider: provider,
      ...(shouldSyncBaseUrl ? { baseUrl: nextDefaultBaseUrl } : {}),
    });
  };

  const handleTestChatApiKey = async () => {
    const apiKey = (settings.apiKey || '').trim();
    const baseUrl = (settings.baseUrl || '').trim().replace(/\/+$/, '');

    if (!apiKey) {
      setChatKeyTestState('error');
      setChatKeyTestMessage('请先填写对话 API Key');
      return;
    }
    if (!baseUrl) {
      setChatKeyTestState('error');
      setChatKeyTestMessage('请先填写对话 API 地址');
      return;
    }

    setChatKeyTestState('testing');
    setChatKeyTestMessage('正在检测...');

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore
      }

      if (!response.ok) {
        const statusMsg = data?.error?.message || data?.message || `HTTP ${response.status}`;
        setChatKeyTestState('error');
        setChatKeyTestMessage(`检测失败：${statusMsg}`);
        return;
      }

      const modelCount = Array.isArray(data?.data) ? data.data.length : 0;
      setChatKeyTestState('success');
      setChatKeyTestMessage(
        modelCount > 0
          ? `检测通过：已连通（可访问 ${modelCount} 个模型）`
          : '检测通过：已连通'
      );
    } catch {
      setChatKeyTestState('error');
      setChatKeyTestMessage('检测失败：网络错误或跨域限制');
    }
  };

  const handleTestImageApiKey = async () => {
    const apiKey = (settings.imageApiKey || settings.apiKey || '').trim();
    const baseUrl = (settings.imageBaseUrl || settings.baseUrl || '').trim().replace(/\/+$/, '');

    if (!apiKey) {
      setImageKeyTestState('error');
      setImageKeyTestMessage('请先填写生图 API Key（或对话 API Key）');
      return;
    }
    if (!baseUrl) {
      setImageKeyTestState('error');
      setImageKeyTestMessage('请先填写生图 API 地址');
      return;
    }

    setImageKeyTestState('testing');
    setImageKeyTestMessage('正在检测...');

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore
      }

      if (!response.ok) {
        const statusMsg = data?.error?.message || data?.message || `HTTP ${response.status}`;
        setImageKeyTestState('error');
        setImageKeyTestMessage(`检测失败：${statusMsg}`);
        return;
      }

      const modelCount = Array.isArray(data?.data) ? data.data.length : 0;
      setImageKeyTestState('success');
      setImageKeyTestMessage(
        modelCount > 0
          ? `检测通过：已连通（可访问 ${modelCount} 个模型）`
          : '检测通过：已连通'
      );
    } catch {
      setImageKeyTestState('error');
      setImageKeyTestMessage('检测失败：网络错误或跨域限制');
    }
  };

  const handleTestMinimaxVoiceApiKey = async () => {
    const apiKey = (voiceApiKeyValue || '').trim();
    if (!apiKey) {
      setVoiceKeyTestState('error');
      setVoiceKeyTestMessage('请先填写 Minimax API Key（或对话 API Key）');
      return;
    }

    const baseUrl = (voiceBaseUrlValue || 'https://api.minimaxi.com').trim().replace(/\/+$/, '');
    const groupId = voiceGroupIdValue.trim();
    const endpoint = `${baseUrl}/v1/t2a_v2${groupId ? `?GroupId=${encodeURIComponent(groupId)}` : ''}`;

    setVoiceKeyTestState('testing');
    setVoiceKeyTestMessage('正在检测...');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: voiceModelValue || 'speech-2.8-hd',
          text: '你好',
          stream: false,
          output_format: 'hex',
          voice_setting: {
            voice_id: voiceVoiceIdValue || 'male-qn-qingse',
            speed: 1,
            vol: 1,
            pitch: 0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1,
          },
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore json parsing error, fallback to status info
      }

      if (!response.ok) {
        const statusMsg = data?.base_resp?.status_msg || `HTTP ${response.status}`;
        setVoiceKeyTestState('error');
        setVoiceKeyTestMessage(`检测失败：${statusMsg}`);
        return;
      }

      const code = data?.base_resp?.status_code;
      if (typeof code === 'number' && code !== 0) {
        const statusMsg = data?.base_resp?.status_msg || `错误码 ${code}`;
        setVoiceKeyTestState('error');
        setVoiceKeyTestMessage(`检测失败：${statusMsg}`);
        return;
      }

      if (typeof data?.data?.audio !== 'string' || data.data.audio.length === 0) {
        setVoiceKeyTestState('error');
        setVoiceKeyTestMessage('检测失败：接口未返回音频数据');
        return;
      }

      setVoiceKeyTestState('success');
      setVoiceKeyTestMessage('检测通过：API Key 与语音配置可用');
    } catch (error) {
      setVoiceKeyTestState('error');
      setVoiceKeyTestMessage('检测失败：网络错误或跨域限制');
    }
  };

  const handleTestVisionSupport = async () => {
    const apiKey = (settings.apiKey || '').trim();
    const baseUrl = (settings.baseUrl || '').trim().replace(/\/+$/, '');
    const model = (chatModelValue || '').trim();

    if (!apiKey) {
      setVisionTestState('error');
      setVisionTestMessage('请先填写对话 API Key');
      return;
    }
    if (!baseUrl) {
      setVisionTestState('error');
      setVisionTestMessage('请先填写对话 API 地址');
      return;
    }
    if (!model) {
      setVisionTestState('error');
      setVisionTestMessage('请先填写对话模型');
      return;
    }

    setVisionTestState('testing');
    setVisionTestMessage('正在检测...');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 32,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: '请识别图片并回复“支持图片”。' },
                { type: 'image_url', image_url: { url: VISION_TEST_IMAGE_DATA_URL } },
              ],
            },
          ],
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore json parse error
      }

      if (!response.ok) {
        const errorMessage =
          data?.error?.message || data?.message || data?.base_resp?.status_msg || `HTTP ${response.status}`;
        setVisionTestState('error');
        setVisionTestMessage(`检测失败：${errorMessage}`);
        return;
      }

      const output = data?.choices?.[0]?.message?.content;
      const hasOutput =
        typeof output === 'string'
          ? output.trim().length > 0
          : Array.isArray(output)
          ? output.length > 0
          : Boolean(output);

      if (!hasOutput) {
        setVisionTestState('error');
        setVisionTestMessage('检测失败：接口未返回有效内容');
        return;
      }

      setVisionTestState('success');
      setVisionTestMessage('检测通过：当前模型支持图片解析');
    } catch (error) {
      setVisionTestState('error');
      setVisionTestMessage('检测失败：网络错误或跨域限制');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <main
        ref={contentScrollRef}
        onFocusCapture={handleFieldFocusCapture}
        className="flex-1 min-h-0 overflow-y-auto touch-pan-y p-4 pb-40 space-y-6"
      >
        <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-gray-500 uppercase tracking-wider">API 配置</h2>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">对话模型配置</p>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Cpu size={20} className="text-indigo-500" />
            <div className="flex-1">
              <p className="text-[15px]">模型供应商</p>
              <select
                value={chatProviderValue}
                onChange={(e) =>
                  handleChatProviderChange(e.target.value as 'openai' | 'siliconflow')
                }
                className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1"
              >
                <option value="openai">OpenAI</option>
                <option value="siliconflow">硅基流动（OpenAI 格式）</option>
              </select>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Globe size={20} className="text-blue-500" />
            <div className="flex-1">
              <p className="text-[15px]">对话 API 地址</p>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                placeholder={defaultChatBaseUrl}
              />
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Key size={20} className="text-orange-500" />
            <div className="flex-1">
              <p className="text-[15px]">对话 API 密钥</p>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => updateSettings({ apiKey: e.target.value })}
                  className="flex-1 text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                  placeholder="sk-..."
                />
                <button onClick={onToggleShowApiKey} className="text-gray-400 hover:text-gray-600 p-1">
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handleTestChatApiKey}
                  disabled={chatKeyTestState === 'testing'}
                  className={`rounded-md px-3 py-1.5 text-[12px] text-white ${
                    chatKeyTestState === 'testing'
                      ? 'bg-gray-400'
                      : 'bg-blue-500 hover:bg-blue-600 active:opacity-90'
                  }`}
                >
                  {chatKeyTestState === 'testing' ? '检测中...' : '测试 API Key'}
                </button>
                {chatKeyTestMessage ? (
                  <span
                    className={`text-[12px] ${
                      chatKeyTestState === 'success'
                        ? 'text-emerald-600'
                        : chatKeyTestState === 'error'
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {chatKeyTestMessage}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3">
            <Cpu size={20} className="text-purple-500" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-[15px]">对话模型</p>
                {isLoadingChatModels ? <RefreshCw size={14} className="text-blue-500 animate-spin" /> : null}
              </div>
              <div className="relative mt-1">
                {availableChatModels.length > 0 ? (
                  <select
                    value={chatModelValue}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none appearance-none cursor-pointer"
                  >
                    {!availableChatModels.includes(chatModelValue) ? (
                      <option value={chatModelValue}>{chatModelValue} (当前)</option>
                    ) : null}
                    {availableChatModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={chatModelValue}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                    placeholder={chatModelPlaceholder}
                  />
                )}
              </div>
              <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <p
                  className={`text-[12px] ${
                    visionSupportState === 'supported'
                      ? 'text-emerald-600'
                      : visionSupportState === 'unsupported'
                      ? 'text-red-500'
                      : 'text-amber-600'
                  }`}
                >
                  {visionSupportState === 'supported'
                    ? '当前模型名称看起来支持图片解析'
                    : visionSupportState === 'unsupported'
                    ? '当前模型名称看起来不支持图片解析'
                    : '当前模型是否支持图片解析无法仅凭名称判断'}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={handleTestVisionSupport}
                    disabled={visionTestState === 'testing'}
                    className={`rounded-md px-3 py-1.5 text-[12px] text-white ${
                      visionTestState === 'testing'
                        ? 'bg-gray-400'
                        : 'bg-blue-500 hover:bg-blue-600 active:opacity-90'
                    }`}
                  >
                    {visionTestState === 'testing' ? '检测中...' : '检测图片解析能力'}
                  </button>
                  {visionTestMessage ? (
                    <span
                      className={`text-[12px] ${
                        visionTestState === 'success'
                          ? 'text-emerald-600'
                          : visionTestState === 'error'
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}
                    >
                      {visionTestMessage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">记忆模型配置</p>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Globe size={20} className="text-violet-500" />
            <div className="flex-1">
              <p className="text-[15px]">记忆 API 地址</p>
              <input
                type="text"
                value={memoryBaseUrlValue}
                onChange={(e) => updateSettings({ memoryBaseUrl: e.target.value })}
                className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Key size={20} className="text-violet-500" />
            <div className="flex-1">
              <p className="text-[15px]">记忆 API 密钥</p>
              <div className="flex items-center gap-2">
                <input
                  type={showMemoryApiKey ? 'text' : 'password'}
                  value={memoryApiKeyValue}
                  onChange={(e) => updateSettings({ memoryApiKey: e.target.value })}
                  className="flex-1 text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                  placeholder="sk-..."
                />
                <button
                  onClick={onToggleShowMemoryApiKey}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  {showMemoryApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Cpu size={20} className="text-violet-500" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-[15px]">记忆模型</p>
                {isLoadingMemoryModels ? (
                  <RefreshCw size={14} className="text-blue-500 animate-spin" />
                ) : null}
              </div>
              <div className="relative mt-1">
                {availableMemoryModels.length > 0 ? (
                  <select
                    value={memoryModelValue}
                    onChange={(e) => updateSettings({ memoryModel: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none appearance-none cursor-pointer"
                  >
                    {!availableMemoryModels.includes(memoryModelValue) ? (
                      <option value={memoryModelValue}>{memoryModelValue} (当前)</option>
                    ) : null}
                    {availableMemoryModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={memoryModelValue}
                    onChange={(e) => updateSettings({ memoryModel: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                    placeholder="请输入记忆总结模型，或等待加载..."
                  />
                )}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[12px] text-gray-500">
              记忆压缩策略参数已迁移到「记忆中心」配置，此处仅保留记忆模型 API 与模型配置。
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">生图模型配置</p>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Globe size={20} className="text-sky-500" />
            <div className="flex-1">
              <p className="text-[15px]">生图 API 地址</p>
              <input
                type="text"
                value={settings.imageBaseUrl || ''}
                onChange={(e) => updateSettings({ imageBaseUrl: e.target.value })}
                className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Key size={20} className="text-amber-500" />
            <div className="flex-1">
              <p className="text-[15px]">生图 API 密钥</p>
              <div className="flex items-center gap-2">
                <input
                  type={showImageApiKey ? 'text' : 'password'}
                  value={settings.imageApiKey || ''}
                  onChange={(e) => updateSettings({ imageApiKey: e.target.value })}
                  className="flex-1 text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                  placeholder="sk-..."
                />
                <button
                  onClick={onToggleShowImageApiKey}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  {showImageApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handleTestImageApiKey}
                  disabled={imageKeyTestState === 'testing'}
                  className={`rounded-md px-3 py-1.5 text-[12px] text-white ${
                    imageKeyTestState === 'testing'
                      ? 'bg-gray-400'
                      : 'bg-sky-500 hover:bg-sky-600 active:opacity-90'
                  }`}
                >
                  {imageKeyTestState === 'testing' ? '检测中...' : '测试 API Key'}
                </button>
                {imageKeyTestMessage ? (
                  <span
                    className={`text-[12px] ${
                      imageKeyTestState === 'success'
                        ? 'text-emerald-600'
                        : imageKeyTestState === 'error'
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {imageKeyTestMessage}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center px-4 py-3 gap-3">
            <ImageIcon size={20} className="text-sky-500" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-[15px]">生图模型</p>
                {isLoadingImageModels ? <RefreshCw size={14} className="text-blue-500 animate-spin" /> : null}
              </div>
              <div className="relative mt-1">
                {availableImageModels.length > 0 ? (
                  <select
                    value={imageModelValue}
                    onChange={(e) => updateSettings({ imageModel: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none appearance-none cursor-pointer"
                  >
                    {!availableImageModels.includes(imageModelValue) ? (
                      <option value={imageModelValue}>{imageModelValue} (当前)</option>
                    ) : null}
                    {availableImageModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={imageModelValue}
                    onChange={(e) => updateSettings({ imageModel: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                    placeholder="请输入生图模型，或等待加载..."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">语音聊天配置</p>
          </div>

          <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
            <Mic2 size={20} className="text-emerald-500" />
            <div className="flex-1">
              <p className="text-[15px]">语音供应商</p>
              <select
                value={voiceProviderValue}
                onChange={(e) =>
                  updateSettings({ voiceProvider: e.target.value as 'none' | 'minimax' })
                }
                className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1"
              >
                <option value="none">关闭</option>
                <option value="minimax">Minimax</option>
              </select>
            </div>
          </div>

          {voiceProviderValue === 'minimax' && (
            <>
              <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
                <Globe size={20} className="text-emerald-500" />
                <div className="flex-1">
                  <p className="text-[15px]">Minimax Base URL</p>
                  <input
                    type="text"
                    value={voiceBaseUrlValue}
                    onChange={(e) => updateSettings({ voiceBaseUrl: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                    placeholder="https://api.minimaxi.com"
                  />
                </div>
              </div>

              <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
                <Key size={20} className="text-emerald-500" />
                <div className="flex-1">
                  <p className="text-[15px]">Minimax API Key</p>
                  <div className="flex items-center gap-2">
                    <input
                      type={showVoiceApiKey ? 'text' : 'password'}
                      value={voiceApiKeyValue}
                      onChange={(e) => updateSettings({ voiceApiKey: e.target.value })}
                      className="flex-1 text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                      placeholder="sk-..."
                    />
                    <button
                      onClick={onToggleShowVoiceApiKey}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showVoiceApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={handleTestMinimaxVoiceApiKey}
                      disabled={voiceKeyTestState === 'testing'}
                      className={`rounded-md px-3 py-1.5 text-[12px] text-white ${
                        voiceKeyTestState === 'testing'
                          ? 'bg-gray-400'
                          : 'bg-emerald-500 hover:bg-emerald-600 active:opacity-90'
                      }`}
                    >
                      {voiceKeyTestState === 'testing' ? '检测中...' : '测试 API Key'}
                    </button>
                    {voiceKeyTestMessage ? (
                      <span
                        className={`text-[12px] ${
                          voiceKeyTestState === 'success'
                            ? 'text-emerald-600'
                            : voiceKeyTestState === 'error'
                            ? 'text-red-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {voiceKeyTestMessage}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
                <Cpu size={20} className="text-emerald-500" />
                <div className="flex-1">
                  <p className="text-[15px]">语音模型</p>
                  <input
                    type="text"
                    value={voiceModelValue}
                    onChange={(e) => updateSettings({ voiceModel: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                    placeholder="speech-2.8-hd"
                  />
                </div>
              </div>

              <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
                <Mic2 size={20} className="text-emerald-500" />
                <div className="flex-1">
                  <p className="text-[15px]">音色 Voice ID</p>
                  <input
                    type="text"
                    value={voiceVoiceIdValue}
                    onChange={(e) => updateSettings({ voiceVoiceId: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                    placeholder="male-qn-qingse"
                  />
                </div>
              </div>

              <div className="flex items-center px-4 py-3 gap-3 border-b border-gray-100">
                <Key size={20} className="text-emerald-500" />
                <div className="flex-1">
                  <p className="text-[15px]">Minimax Group ID (可选)</p>
                  <input
                    type="text"
                    value={voiceGroupIdValue}
                    onChange={(e) => updateSettings({ voiceMinimaxGroupId: e.target.value })}
                    className="w-full text-[14px] text-gray-700 bg-transparent outline-none mt-1 placeholder:text-gray-400"
                    placeholder="如果账号要求 GroupId，在此填写"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center px-4 py-3 gap-3">
            <Mic2 size={20} className="text-emerald-500" />
            <div className="flex-1 flex items-center justify-between">
              <p className="text-[15px]">自动播报 AI 回复</p>
              <button
                onClick={() => updateSettings({ voiceAutoPlay: !voiceAutoPlayValue })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  voiceAutoPlayValue ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    voiceAutoPlayValue ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-4 text-[13px] text-gray-500 uppercase tracking-wider">生成设置</h2>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">对话模型生成设置</p>
          </div>
          <div className="px-4 py-3 space-y-2 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <p className="text-[15px]">Temperature (温度)</p>
              <span className="text-[14px] text-blue-500 font-medium">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-[15px]">Max Tokens (最大长度)</p>
              <span className="text-[14px] text-blue-500 font-medium">{settings.maxTokens}</span>
            </div>
            <input
              type="range"
              min="100"
              max="8000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <p className="text-[13px] font-medium text-gray-600">生图模型生成设置</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-[15px]">图片尺寸</p>
              <span className="text-[14px] text-blue-500 font-medium">{imageSizeValue}</span>
            </div>
            <select
              value={imageSizeValue}
              onChange={(e) => updateSettings({ imageSize: e.target.value })}
              className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-[14px] text-gray-700 outline-none"
            >
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1536x1024">1536x1024</option>
              <option value="1024x1536">1024x1536</option>
            </select>
          </div>
        </div>
        </section>
      </main>
      <footer
        className="shrink-0 border-t border-transparent bg-[#F2F2F7]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      />
    </div>
  );
};


