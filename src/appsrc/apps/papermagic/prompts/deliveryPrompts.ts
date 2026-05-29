import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const DELIVERY_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'delivery.kitchenRecipes',
    moduleId: 'commerce-life',
    title: '外卖：私家厨房菜谱生成',
    source: 'src/appsrc/apps/delivery/DeliveryApp.tsx',
    kind: 'chat',
    description: '生成私家厨房菜谱 JSON。',
    system: '你只返回符合要求的 JSON。',
    user: [
      '你是一个资深家常菜谱编辑，请严格只输出 JSON 数组，不要输出任何解释、标题、markdown 或代码块。',
      '请生成 3 个全新的、随机的、适合外卖App私家厨房的中文家常菜谱。',
      '${userRequirementLine}',
      '菜谱名称不要与这些重复：${existingNames}',
      '每个菜谱对象必须包含以下字段：',
      '{',
      '  "name": "菜谱名",',
      '  "subtitle": "一句话简介",',
      '  "accent": "#fb7185",',
      '  "time": "15 分钟",',
      '  "servings": "2 人份",',
      '  "shareText": "分享文案",',
      '  "steps": ["步骤1", "步骤2", "步骤3"],',
      '  "ingredients": [',
      '    { "name": "食材名", "amount": "2 个", "qty": 2, "price": 3.5 }',
      '  ]',
      '}',
      '要求：',
      '1. ingredients 至少 3 个，最多 6 个。',
      '2. qty 必须是正整数，price 必须是正数单价。',
      '3. 菜谱要随机，风格尽量不同。',
      '4. 食材和做法都要用中文。',
    ].join('\n'),
    variables: ['userRequirementLine', 'existingNames'],
  }),
];
