import type { AppManifest } from '@baobaobaiOS/sdk';
import { SystemSchedulerApp } from './SystemSchedulerApp';

const schedulerManifest: AppManifest = {
  id: 'scheduler',
  name: '定时任务',
  icon: 'Timer',
  color: '#7CA6FF',
  component: SystemSchedulerApp,
  isSystem: true,
  description: '配置系统自动任务，控制扫描频率与执行状态。',
};

export default schedulerManifest;

