import type { AppManifest } from '@mimisOS/sdk';
import { DailyScriptApp } from './DailyScriptApp';
import './timelineTask';

const dailyScriptManifest: AppManifest = {
  id: 'dailyscript',
  name: '每日剧本',
  icon: 'ListTodo',
  color: '#5B8DEF',
  component: DailyScriptApp,
  market: {
    icon: '📜',
    tags: ['自动化', '角色流程', '编排'],
    sortOrder: 25,
  },
  description: '先选通讯录角色，再按日期设置当天要执行的剧本流程。',
};

export default dailyScriptManifest;
