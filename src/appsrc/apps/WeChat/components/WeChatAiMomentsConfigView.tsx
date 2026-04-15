import React, { useState } from 'react';
import { ChevronLeft, Image as ImageIcon, Minus, Plus } from 'lucide-react';
import { useGlobalSettingsStore } from '@mimisOS/sdk';
import { useWeChatStore } from '../store';
import type { WeChatAiMomentsConfigViewProps } from '../types';
import { pickModelId } from './moments/momentsUtils';

const IMAGE_MODEL_FALLBACKS = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];

export const WeChatAiMomentsConfigView: React.FC<WeChatAiMomentsConfigViewProps> = ({ onBack }) => {
  const { settings } = useGlobalSettingsStore();
  const { wechatAiMomentsSettings, updateWeChatAiMomentsSettings } = useWeChatStore();

  const [isCheckingImageSupport, setCheckingImageSupport] = useState(false);
  const [imageSupportMessage, setImageSupportMessage] = useState<string | null>(null);

  const refreshCount = Math.max(1, Math.min(20, wechatAiMomentsSettings.refreshCount || 1));
  const includeImages = Boolean(wechatAiMomentsSettings.includeImages);

  const updateRefreshCount = (nextValue: number) => {
    updateWeChatAiMomentsSettings({ refreshCount: Math.max(1, Math.min(20, nextValue)) });
  };

  const checkImageGenerationSupport = async (): Promise<{ ok: boolean; message?: string }> => {
    const apiKey = (settings.imageApiKey || settings.apiKey || '').trim();
    if (!apiKey) {
      return { ok: false, message: '请先配置图片 API 密钥。' };
    }

    const baseUrl = (settings.imageBaseUrl || settings.baseUrl || 'https://api.openai.com/v1')
      .trim()
      .replace(/\/+$/, '');
    const preferredImageModel = settings.imageModel?.trim();
    const imageSize = settings.imageSize || '1024x1024';

    let candidateModels = [
      ...(preferredImageModel ? [preferredImageModel] : []),
      ...IMAGE_MODEL_FALLBACKS,
    ];

    try {
      const modelsResponse = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (modelsResponse.ok) {
        const data = await modelsResponse.json();
        const discovered = Array.isArray(data?.data)
          ? data.data
              .map(pickModelId)
              .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
              .filter((id: string) => /(image|dall|flux|sd|stability)/i.test(id))
          : [];

        if (discovered.length > 0) {
          candidateModels = [
            ...new Set([...(preferredImageModel ? [preferredImageModel] : []), ...discovered, ...candidateModels]),
          ];
        }
      }
    } catch {
      // 忽略 /models 请求失败，继续使用兜底模型列表。
    }

    const payloadVariants = (model: string) => [
      { model, prompt: '朋友圈图片能力探测', size: imageSize, response_format: 'b64_json' },
      { model, prompt: '朋友圈图片能力探测', size: imageSize },
      ...(imageSize === '512x512'
        ? []
        : [{ model, prompt: '朋友圈图片能力探测', size: '512x512', response_format: 'b64_json' }]),
    ];

    let lastMessage = '当前 API 端点不支持图片生成。';

    for (const model of candidateModels) {
      for (const payload of payloadVariants(model)) {
        try {
          const probeResponse = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });

          if (probeResponse.ok) {
            return { ok: true };
          }

          let message = `图片生成探测失败（${probeResponse.status}）。`;
          try {
            const errorData = await probeResponse.json();
            const detail =
              (typeof errorData?.error?.message === 'string' && errorData.error.message) ||
              (typeof errorData?.message === 'string' && errorData.message) ||
              '';
            if (detail.trim()) {
              message = `图片生成不可用：${detail.trim()}`;
            }
          } catch {
            // 忽略错误信息解析失败。
          }

          lastMessage = message;
        } catch {
          lastMessage = '图片生成探测失败：网络请求异常。';
        }
      }
    }

    return { ok: false, message: lastMessage };
  };

  const handleToggleIncludeImages = async () => {
    if (includeImages) {
      updateWeChatAiMomentsSettings({ includeImages: false });
      setImageSupportMessage(null);
      return;
    }

    if (isCheckingImageSupport) return;

    setCheckingImageSupport(true);
    setImageSupportMessage('正在检查图片生成能力...');

    try {
      const result = await checkImageGenerationSupport();
      if (!result.ok) {
        updateWeChatAiMomentsSettings({ includeImages: false });
        setImageSupportMessage(result.message || '当前 API 端点不支持图片生成。');
        return;
      }

      updateWeChatAiMomentsSettings({ includeImages: true });
      setImageSupportMessage('图片生成已启用。');
    } finally {
      setCheckingImageSupport(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[#EDEDED] flex flex-col">
      <div className="bg-[#F7F7F7] px-3 pt-12 pb-3 flex items-center border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
          <ChevronLeft size={28} />
          <span className="text-[17px]">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">AI 朋友圈设置</h1>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="text-[15px] font-semibold text-gray-900">下拉刷新生成条数</div>
          <div className="text-[12px] text-gray-500 mt-0.5">每次刷新要生成的 AI 朋友圈条数。</div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-gray-200 px-2 py-1.5">
            <button
              type="button"
              onClick={() => updateRefreshCount(refreshCount - 1)}
              disabled={refreshCount <= 1}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                refreshCount > 1 ? 'text-gray-700 active:bg-gray-100' : 'text-gray-300'
              }`}
            >
              <Minus size={16} />
            </button>
            <span className="text-[18px] font-semibold text-gray-900 tabular-nums">{refreshCount}</span>
            <button
              type="button"
              onClick={() => updateRefreshCount(refreshCount + 1)}
              disabled={refreshCount >= 20}
              className={`h-8 w-8 rounded-md flex items-center justify-center ${
                refreshCount < 20 ? 'text-gray-700 active:bg-gray-100' : 'text-gray-300'
              }`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">AI 朋友圈包含图片</div>
              <div className="text-[12px] text-gray-500 mt-0.5">启用后，生成的朋友圈可能包含图片。</div>
            </div>
            <button
              type="button"
              onClick={handleToggleIncludeImages}
              disabled={isCheckingImageSupport}
              className={`h-7 w-12 rounded-full px-1 transition-colors ${
                includeImages ? 'bg-[#07C160]' : 'bg-gray-300'
              } ${isCheckingImageSupport ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                  includeImages ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {imageSupportMessage ? (
            <div
              className={`mt-2 text-[12px] ${
                includeImages && imageSupportMessage.includes('已启用')
                  ? 'text-emerald-600'
                  : imageSupportMessage.includes('正在检查')
                  ? 'text-gray-500'
                  : 'text-amber-700'
              }`}
            >
              {imageSupportMessage}
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-gray-200 bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-gray-600">
            <div className="flex items-center gap-1.5 text-gray-700">
              <ImageIcon size={14} />
              <span>预览</span>
            </div>
            <div className="mt-1.5">
              下次刷新将生成 {refreshCount} 条 AI 朋友圈
              {includeImages ? '，可能包含图片。' : '，仅文本。'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
