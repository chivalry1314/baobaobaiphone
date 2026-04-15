import type { GlobalSettings } from '../../../../core/sdk/types';

export type VoiceProviderId = 'none' | 'minimax';

export interface VoiceSynthesisRequest {
  text: string;
  settings: GlobalSettings;
  signal?: AbortSignal;
}

export interface VoiceProvider {
  id: Exclude<VoiceProviderId, 'none'>;
  canUse: (settings: GlobalSettings) => boolean;
  synthesize: (request: VoiceSynthesisRequest) => Promise<Blob>;
}

