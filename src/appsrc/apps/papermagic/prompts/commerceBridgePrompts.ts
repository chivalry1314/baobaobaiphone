import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const COMMERCE_BRIDGE_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'commerce.buyerInquiry',
    moduleId: 'commerce-life',
    title: '商业消息桥：买家咨询生成',
    source: 'src/appsrc/shared/business/commerce/messageBridge.ts',
    kind: 'chat',
    description: '用户收藏商品后，自动生成买家向店主咨询的消息。',
    system: '你是购物平台买家，正在向店主咨询商品。只输出一条 10-30 字中文消息。',
    user: '你现在扮演我，我想悄悄给最重要的朋友买 TA 收藏的商品，需要去咨询店主。请用日常、自然、不刻意的语气，向店主询问商品细节（材质 / 尺寸 / 发货 / 质量等），并不经意提到这是送给很重要的人、想给对方惊喜，不要太刻意煽情，像普通买家正常咨询一样。商品信息：${productInfo}',
    variables: ['productInfo'],
  }),
  definePaperMagicPrompt({
    id: 'commerce.orderFailedRetry',
    moduleId: 'commerce-life',
    title: '商业消息桥：下单失败追问',
    source: 'src/appsrc/shared/business/commerce/messageBridge.ts',
    kind: 'chat',
    description: '商品售罄或下架时，自动生成继续询问店主的消息。',
    system: '你是购物平台买家，遇到下单失败后继续咨询店主。只输出一条 15-40 字中文消息。',
    user: '商品「${productName}」下单失败，原因是售罄或已下架。请向店主询问是否还有货以及何时补货。',
    variables: ['productName'],
  }),
];
