import type { DailyScriptActionType } from '../../shared/business/dailyscript/actionBridge';

export const ACTION_LABELS: Record<DailyScriptActionType, string> = {
  'dailywords.writeDiary': '写每日语',
  'wechat.sendMessageToUser': '发微信给用户',
  'lovespace.addMoment': '情侣空间-写瞬间',
  'lovespace.completeCheckInTask': '情侣空间-完成打卡',
  'dreammusic.commentTrack': '梦音乐-歌曲评论',
};

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
