export type {
  PaperMagicAppGroup,
  PaperMagicModule,
  PaperMagicModuleId,
  PaperMagicPrompt,
  PaperMagicPromptKind,
} from './types';
export { PAPER_MAGIC_APP_GROUPS, PAPER_MAGIC_MODULES } from './modules';
export { PAPER_MAGIC_PROMPTS } from './prompts';
export {
  getPaperMagicPrompt,
  renderPaperMagicPrompt,
  renderPaperMagicTemplate,
  renderPaperMagicText,
} from './promptRenderer';
export {
  PAPER_MAGIC_PERSONA_SKILL_SOURCE,
  renderPaperMagicPersonaSkillArtifacts,
  type PaperMagicPersonaSkillRenderInput,
} from './personaSkillArtifacts';