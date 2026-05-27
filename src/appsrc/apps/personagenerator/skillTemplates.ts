import { renderPaperMagicText } from '../papermagic/promptCatalog';

export const SKILL_SOURCE = {
  name: 'skill',
  url: 'https://github.com/perkfly/ex-skill',
  files: [
    'SKILL.md',
    'prompts/persona_analyzer.md',
    'prompts/persona_builder.md',
    'prompts/memories_analyzer.md',
    'prompts/memories_builder.md',
  ],
} as const;

export const SKILL_PERSONA_LAYERS = [
  '第 0 层：角色范围',
  '第 1 层：稳定身份',
  '第 2 层：外显行为',
  '第 3 层：内在逻辑',
  '第 4 层：关系地图',
  '第 5 层：动态状态',
  '修正记录',
] as const;

export interface SkillRenderInput {
  name: string;
  generatedAt: string;
  parsedLines: number;
  targetLines: number;
  traits: string[];
  background: string;
  keywords: string[];
  samples: string[];
}

const bulletList = (items: string[], fallback: string): string =>
  items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;

export const renderPersonaAnalyzerPrompt = (input: SkillRenderInput): string =>
  [
    renderPaperMagicText('persona.skill.personaAnalyzer'),
    '语言习惯要具体到短句/长句比例、语气词、表情包、标点、追问、拒绝、玩笑、自我解释等可复现模式。',
    '不要只写泛泛性格词；每个判断都应能对应到聊天里的重复表达方式。',
    '',
    `目标角色：${input.name}`,
    `聊天条数：${input.targetLines || input.parsedLines}`,
    `高频关键词：${input.keywords.join('、') || '暂无'}`,
    '',
  ].join('\n');

export const renderPersonaBuilderPrompt = (input: SkillRenderInput): string =>
  [
    renderPaperMagicText('persona.skill.personaBuilder', { name: input.name }),
    '',
    `## ${SKILL_PERSONA_LAYERS[0]}`,
    `${input.name} 由导入聊天记录生成。只有下方证据可以作为稳定设定；不确定的信息保持开放，不主动补完。`,
    '',
    `## ${SKILL_PERSONA_LAYERS[1]}`,
    input.background,
    '',
    `## ${SKILL_PERSONA_LAYERS[2]}`,
    bulletList(input.traits, '对话风格自然；具体习惯应继续以导入对话证据为准。'),
    '',
    `## ${SKILL_PERSONA_LAYERS[3]}`,
    `情绪和决策逻辑应从重复措辞、反复出现的话题、解释或修复关系的行为中推断。高信号词：${input.keywords.slice(0, 10).join('、') || '暂无'}。`,
    '',
    `## ${SKILL_PERSONA_LAYERS[4]}`,
    '与用户的关系应沿着导入记录中的互动历史发展。没有证据时，不突然提升亲密度、敌意、信任或依赖。',
    '',
    `## ${SKILL_PERSONA_LAYERS[5]}`,
    bulletList(input.samples.slice(0, 10), '暂无稳定的近期状态证据。'),
    '',
    `## ${SKILL_PERSONA_LAYERS[6]}`,
    '- 初始生成档案。后续修正应在此追加日期、原因和修正内容，不要静默覆盖旧设定。',
    '',
  ].join('\n');

export const renderMemoriesAnalyzerPrompt = (input: SkillRenderInput): string =>
  [
    renderPaperMagicText('persona.skill.memoriesAnalyzer'),
    '删除泛泛而谈、重复情绪、没有关系价值的一次性事实。',
    '',
    `目标角色：${input.name}`,
    '',
  ].join('\n');

export const renderMemoriesBuilderPrompt = (input: SkillRenderInput): string =>
  [
    renderPaperMagicText('persona.skill.memoriesBuilder', { name: input.name }),
    '',
    '## 关系证据',
    bulletList(input.samples.slice(0, 16), '未提取到稳定的关系证据。'),
    '',
    '## 对话锚点',
    bulletList(input.keywords.slice(0, 12).map((keyword) => `关键词：${keyword}`), '未提取到重复关键词。'),
    '',
    '## 使用规则',
    '- 把这些记忆当作证据，而不是完整传记。',
    '- 当记忆与用户后续修正冲突时，优先采用最新的明确修正。',
    '- 不要虚构来源中没有出现的隐私、医疗、财务或家庭事实。',
    '',
  ].join('\n');

export const renderSkillReadme = (input: SkillRenderInput): string =>
  [
    '# 生成的人设 Skill',
    '',
    `模板来源：${SKILL_SOURCE.name}`,
    `生成角色：${input.name}`,
    '',
    '## 使用流程',
    '1. 先阅读 persona_analyzer.md，确认聊天证据和不确定信息。',
    '2. 把 persona.md 作为当前人设档案使用。',
    '3. 用 memories_analyzer.md 判断哪些观察值得进入长期记忆。',
    '4. 把 memories.md 作为精简的连续性证据。',
    '5. 后续如果有人设修正，应追加到 persona.md 的“修正记录”，不要静默覆盖历史。',
    '',
    '## 文件说明',
    '- meta.json：记录来源、生成时间、聊天条数、关键词和模板版本信息。',
    '- persona.md：分层人设档案，用来描述角色身份、行为、情绪逻辑和关系边界。',
    '- memories.md：从聊天记录中提取出的稳定记忆，用于保持对话连续性。',
    '- prompts/*.md：项目内置的中文 prompt 模板，改编自 skill 的分析/构建流程。',
    '',
    '## 使用原则',
    '- 明确聊天证据优先于推断。',
    '- 不确定内容保持开放，不主动补完。',
    '- 人设、记忆和用户后续修正冲突时，优先采用最新的明确修正。',
    '',
  ].join('\n');

export const renderSkillArtifacts = (input: SkillRenderInput) => ({
  meta: {
    name: input.name,
    generatedAt: input.generatedAt,
    source: 'baobaobaiphone/personagenerator',
    reference: SKILL_SOURCE,
    templateFiles: SKILL_SOURCE.files,
    personaLayers: SKILL_PERSONA_LAYERS,
    stats: {
      parsedLines: input.parsedLines,
      targetLines: input.targetLines,
      keywords: input.keywords,
    },
  },
  personaAnalyzer: renderPersonaAnalyzerPrompt(input),
  persona: renderPersonaBuilderPrompt(input),
  memoriesAnalyzer: renderMemoriesAnalyzerPrompt(input),
  memories: renderMemoriesBuilderPrompt(input),
  skill: renderSkillReadme(input),
});
