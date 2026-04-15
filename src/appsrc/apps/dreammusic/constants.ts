import { CircleDot, House, Search, UserRound } from 'lucide-react';
import type { PlayMode } from './types';

export const BOTTOM_NAV_ITEMS = [
  { id: 'home', label: '首页', Icon: House },
  { id: 'search', label: '搜索', Icon: Search },
  { id: 'notes', label: '圈子', Icon: CircleDot },
  { id: 'mine', label: '我的', Icon: UserRound },
] as const;

export type BottomTabId = (typeof BOTTOM_NAV_ITEMS)[number]['id'];

export const PLAY_MODE_LABEL: Record<PlayMode, string> = {
  sequence: '顺序',
  shuffle: '随机',
  single_loop: '单曲',
};
