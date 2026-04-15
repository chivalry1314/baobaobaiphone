import type { GlobalSettings } from '../../../../core/sdk/types';
import { minimaxVoiceProvider } from './minimaxVoiceProvider';
import type { VoiceProvider, VoiceProviderId } from './types';

const voiceProviders: Record<string, VoiceProvider> = {
  minimax: minimaxVoiceProvider,
};

const normalizeProviderId = (settings: GlobalSettings): VoiceProviderId =>
  ((settings.voiceProvider as VoiceProviderId | undefined) || 'none');

export const getVoiceProvider = (settings: GlobalSettings): VoiceProvider | null => {
  const providerId = normalizeProviderId(settings);
  if (providerId === 'none') return null;
  return voiceProviders[providerId] || null;
};

export const isVoiceProviderConfigured = (settings: GlobalSettings): boolean => {
  const provider = getVoiceProvider(settings);
  return Boolean(provider && provider.canUse(settings));
};

export const synthesizeVoice = async (
  settings: GlobalSettings,
  text: string,
  signal?: AbortSignal
): Promise<Blob> => {
  const provider = getVoiceProvider(settings);
  if (!provider) {
    throw new Error('voice-provider-not-configured');
  }
  if (!provider.canUse(settings)) {
    throw new Error('voice-provider-missing-config');
  }
  return provider.synthesize({ settings, text, signal });
};

