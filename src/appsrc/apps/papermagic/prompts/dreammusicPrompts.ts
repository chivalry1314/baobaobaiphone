import type { PaperMagicPrompt } from '../types';
import { definePaperMagicPrompt } from './definePaperMagicPrompt';

export const DREAM_MUSIC_PROMPTS: PaperMagicPrompt[] = [
  definePaperMagicPrompt({
    id: 'dreammusic.commentTrack',
    moduleId: 'entertainment',
    title: '梦音乐：每日剧本评论生成',
    source: 'src/appsrc/apps/dreammusic/dailyScriptAction.ts',
    kind: 'chat',
    description: '每日剧本动作自动为歌曲生成一条评论。',
    system: '你是音乐社区评论助手。请只输出一条中文短评，像真实用户在歌曲评论区留言。不要解释，不要分点，不要加前缀。字数控制在 18-${maxLength} 字，语气自然，避免夸张和营销腔。',
    user: '当前歌曲：${trackTitle} - ${trackArtist}\n评论用户：${authorName}\n可参考歌词片段：\n${lyricContext}\n可参考评论区线索：\n${commentContext}\n优先围绕歌词意象与评论区共鸣，生成一条不重复、可直接发布的评论。${lyricCueLine}',
    variables: ['maxLength', 'trackTitle', 'trackArtist', 'authorName', 'lyricContext', 'commentContext', 'lyricCueLine'],
  }),
];
