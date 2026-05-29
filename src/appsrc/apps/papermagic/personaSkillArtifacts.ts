import { renderPaperMagicText } from './promptRenderer';

export const PAPER_MAGIC_PERSONA_SKILL_SOURCE = {
  name: 'paper-magic-persona-skill',
  url: 'C:/Users/HONOR/Desktop/小手机开发/ex-skill-main/prompts',
  files: [
    'prompts/intake.md',
    'prompts/persona_analyzer.md',
    'prompts/persona_builder.md',
    'prompts/memories_analyzer.md',
    'prompts/memories_builder.md',
  ],
} as const;

export interface PaperMagicPersonaSkillRenderInput {
  name: string;
  generatedAt: string;
  parsedLines: number;
  targetLines: number;
  traits: string[];
  background: string;
  keywords: string[];
  samples: string[];
}

const renderPaperMagicBulletList = (items: string[], fallback: string): string =>
  items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;

export const renderPaperMagicPersonaSkillArtifacts = (input: PaperMagicPersonaSkillRenderInput) => {
  const personaAnalyzer = [
    renderPaperMagicText('persona.skill.personalityGeneration', { name: input.name }),
    '',
    '## 当前导入上下文',
    `目标角色：${input.name}`,
    `聊天条数：${input.targetLines || input.parsedLines}`,
    `高频关键词：${input.keywords.join('、') || '暂无'}`,
    '',
    '## 本地初步特征',
    renderPaperMagicBulletList(input.traits, '暂无稳定特征。'),
  ].join('\n');

  const persona = [
    `# ${input.name} — Persona`,
    '',
    renderPaperMagicText('persona.skill.personalityGeneration', { name: input.name }),
    '',
    '## 当前生成结果',
    '',
    '### Layer 0：核心性格',
    renderPaperMagicBulletList(input.traits, '对话风格自然；具体习惯应继续以导入对话证据为准。'),
    '',
    '### Layer 1：身份与背景',
    input.background || '（原材料不足，建议追加聊天记录验证）',
    '',
    '### 证据样本',
    renderPaperMagicBulletList(input.samples.slice(0, 12), '暂无稳定样本。'),
    '',
    '### Correction 记录',
    '（暂无记录）',
  ].join('\n');

  const memoriesAnalyzer = [
    renderPaperMagicText('persona.skill.memoriesGeneration', { name: input.name }),
    '',
    '## 当前导入上下文',
    `目标角色：${input.name}`,
    `聊天条数：${input.targetLines || input.parsedLines}`,
  ].join('\n');

  const memories = [
    `# ${input.name} — 共同记忆`,
    '',
    renderPaperMagicText('persona.skill.memoriesGeneration', { name: input.name }),
    '',
    '## 当前生成记忆',
    renderPaperMagicBulletList(input.samples.slice(0, 24), '（暂无足够信息，建议追加聊天记录）'),
    '',
    '## 对话锚点',
    renderPaperMagicBulletList(
      input.keywords.slice(0, 12).map((keyword) => `关键词：${keyword}`),
      '未提取到重复关键词。'
    ),
  ].join('\n');

  const skill = [
    '# 生成的人设 Skill',
    '',
    `模板来源：${PAPER_MAGIC_PERSONA_SKILL_SOURCE.name}`,
    `生成角色：${input.name}`,
    '',
    '## 使用流程',
    '1. 先阅读“生成人设-基本信息”，确认昵称、关系、标签和主观印象。',
    '2. 用“性格生成”分析聊天证据并生成 persona.md。',
    '3. 用“记忆生成”提取共同记忆并生成 memories.md。',
    '4. 后续如果有人设修正，应追加到 persona.md 的 Correction 记录，不要静默覆盖历史。',
    '',
    '## 文件说明',
    '- meta.json：记录来源、生成时间、聊天条数、关键词和模板版本信息。',
    '- persona.md：角色性格、沟通风格、行为模式和关系边界。',
    '- memories.md：共同记忆、偏好、关系动态与使用说明。',
    '- prompts/*.md：纸间魔法内置的 intake / persona / memories prompt 模板。',
    '',
    '## 使用原则',
    '- 明确聊天证据优先于推断。',
    '- 用户手动标签优先于文件分析。',
    '- 不确定内容保持开放，不主动补完。',
  ].join('\n');

  return {
    meta: {
      name: input.name,
      generatedAt: input.generatedAt,
      source: 'baobaobaiphone/papermagic/personagenerator',
      reference: PAPER_MAGIC_PERSONA_SKILL_SOURCE,
      templateFiles: PAPER_MAGIC_PERSONA_SKILL_SOURCE.files,
      promptIds: [
        'persona.skill.intakeBasicInfo',
        'persona.skill.memoriesGeneration',
        'persona.skill.personalityGeneration',
      ],
      stats: {
        parsedLines: input.parsedLines,
        targetLines: input.targetLines,
        keywords: input.keywords,
      },
    },
    personaAnalyzer,
    persona,
    memoriesAnalyzer,
    memories,
    skill,
  };
};
