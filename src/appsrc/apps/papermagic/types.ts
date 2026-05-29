export type PaperMagicModuleId = 'memory-persona' | 'social-bonds' | 'commerce-life' | 'entertainment';

export type PaperMagicPromptKind = 'chat' | 'image' | 'voice' | 'vision' | 'template';

export interface PaperMagicPrompt {
  id: string;
  moduleId: PaperMagicModuleId;
  title: string;
  source: string;
  kind: PaperMagicPromptKind;
  description: string;
  system?: string;
  user?: string;
  content?: string;
  variables: string[];
}

export interface PaperMagicModule {
  id: PaperMagicModuleId;
  title: string;
  subtitle: string;
  icon: 'Brain' | 'MessagesSquare' | 'ShoppingBag' | 'Clapperboard';
  promptIds: string[];
}

export interface PaperMagicAppGroup {
  id: string;
  moduleId: PaperMagicModuleId;
  title: string;
  subtitle: string;
  promptIds: string[];
}