import type { CallRecord, Contact, MyCard } from '../types';
import { normalizeContact } from './normalizers';
import { DEFAULT_ACTIVE_ROLE_ID } from '../roleIdentity';

const now = Date.now();

export const initialContacts: Contact[] = [
  normalizeContact({
    id: 'contact-chen',
    name: '陈安',
    role: '项目经理',
    phone: '182-5884-7905',
    note: '周会沟通',
    description: '负责推进需求与排期。',
    greeting: '你好，我们先过一下最新进度。',
    createdAt: now - 1000 * 60 * 60 * 72,
  }),
  normalizeContact({
    id: 'contact-zhang',
    name: '张菲',
    role: '设计师',
    phone: '170-2573-6875',
    note: 'UI Review',
    description: '主导组件风格与交互细节。',
    greeting: '有新的界面稿需要确认吗？',
    createdAt: now - 1000 * 60 * 60 * 56,
  }),
  normalizeContact({
    id: 'contact-li',
    name: '李华',
    role: '后端开发',
    phone: '191-0658-7402',
    note: 'DB Migration',
    description: '负责接口与存储组件。',
    greeting: '我先检查一下日志。',
    createdAt: now - 1000 * 60 * 60 * 44,
  }),
];

export const initialCallRecords: CallRecord[] = [
  {
    id: 'record-1',
    contactId: 'contact-chen',
    roleId: DEFAULT_ACTIVE_ROLE_ID,
    contactName: '陈安',
    phone: '182-5884-7905',
    direction: 'incoming',
    durationSec: 205,
    createdAt: now - 1000 * 60 * 60 * 3,
  },
  {
    id: 'record-2',
    contactId: 'contact-li',
    roleId: DEFAULT_ACTIVE_ROLE_ID,
    contactName: '李华',
    phone: '191-0658-7402',
    direction: 'outgoing',
    durationSec: 96,
    createdAt: now - 1000 * 60 * 60 * 8,
  },
  {
    id: 'record-3',
    contactId: 'contact-zhang',
    roleId: DEFAULT_ACTIVE_ROLE_ID,
    contactName: '张菲',
    phone: '170-2573-6875',
    direction: 'missed',
    durationSec: 0,
    createdAt: now - 1000 * 60 * 60 * 14,
  },
];

export const initialMyCards: MyCard[] = [];
