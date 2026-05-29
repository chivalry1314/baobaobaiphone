import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const SHOPPING_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'shopping.companionReply',
    moduleId: 'commerce-life',
    title: '购物：陪逛搭子回复',
    source: 'src/appsrc/apps/shopping/ShoppingApp.tsx',
    kind: 'chat',
    description: '一起购物模式下，生成陪聊回复。',
    system: '你是用户正在一起购物的陪伴搭子，名字叫${companionName}。你在购物过程中陪聊、夸赞、给情绪价值，也可以轻微调侃，但语气要自然、亲近、像微信聊天。不要提自己是AI，不要提模型，不要写分析过程，不要使用列表，不要加引号。输出只要1到2句中文，总长度控制在18到60字，口语化、温柔、有陪伴感。如果用户在看具体商品、电影、订单或礼物，要结合那个对象来回应，不要空泛。',
    user: '当前页面：${screen}\n最近关注的对象：${latestTopic}\n最近聊天：\n${recentTranscript}\n${modeLine}',
    variables: ['companionName', 'screen', 'latestTopic', 'recentTranscript', 'modeLine'],
  }),
];
