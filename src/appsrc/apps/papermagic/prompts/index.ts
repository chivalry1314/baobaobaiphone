import type { PaperMagicPrompt } from '../types';
import { MEMORY_CENTER_PROMPTS } from './memoryCenterPrompts';
import { PERSONA_GENERATOR_PROMPTS } from './personaGeneratorPrompts';
import { SETTINGS_PROMPTS } from './settingsPrompts';
import { LOVESPACE_PROMPTS } from './lovespacePrompts';
import { WECHAT_PROMPTS } from './wechatPrompts';
import { COMMERCE_BRIDGE_PROMPTS } from './commerceBridgePrompts';
import { SELLER_PROMPTS } from './sellerPrompts';
import { SHOPPING_PROMPTS } from './shoppingPrompts';
import { DELIVERY_PROMPTS } from './deliveryPrompts';
import { DAILY_SCRIPT_PROMPTS } from './dailyscriptPrompts';
import { DREAM_MUSIC_PROMPTS } from './dreammusicPrompts';

export const PAPER_MAGIC_PROMPTS: PaperMagicPrompt[] = [
  ...MEMORY_CENTER_PROMPTS,
  ...PERSONA_GENERATOR_PROMPTS,
  ...SETTINGS_PROMPTS,
  ...LOVESPACE_PROMPTS,
  ...WECHAT_PROMPTS,
  ...COMMERCE_BRIDGE_PROMPTS,
  ...SELLER_PROMPTS,
  ...SHOPPING_PROMPTS,
  ...DELIVERY_PROMPTS,
  ...DAILY_SCRIPT_PROMPTS,
  ...DREAM_MUSIC_PROMPTS,
];

export { MEMORY_CENTER_PROMPTS } from './memoryCenterPrompts';
export { PERSONA_GENERATOR_PROMPTS } from './personaGeneratorPrompts';
export { SETTINGS_PROMPTS } from './settingsPrompts';
export { LOVESPACE_PROMPTS } from './lovespacePrompts';
export { WECHAT_PROMPTS } from './wechatPrompts';
export { COMMERCE_BRIDGE_PROMPTS } from './commerceBridgePrompts';
export { SELLER_PROMPTS } from './sellerPrompts';
export { SHOPPING_PROMPTS } from './shoppingPrompts';
export { DELIVERY_PROMPTS } from './deliveryPrompts';
export { DAILY_SCRIPT_PROMPTS } from './dailyscriptPrompts';
export { DREAM_MUSIC_PROMPTS } from './dreammusicPrompts';