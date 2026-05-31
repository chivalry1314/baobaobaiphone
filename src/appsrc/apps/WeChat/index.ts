import type { AppManifest } from '@baobaobaiOS/sdk';
import {
  COMMERCE_ROLE_CHANGED_EVENT,
  emitCommerceRoleChanged,
} from '../../shared/business/commerce/roleContext';
import { getMyCardsSnapshotBridge } from '../../shared/business/contacts/myCardsSnapshotBridge';
import { registerDailyScriptActionExecutor } from '../../shared/business/dailyscript/actionBridge';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  createRoleCharacterId,
} from '../../shared/business/roleIdentity';
import {
  clearRuntimeActiveRoleId,
  getRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { WeChatApp } from './WeChatApp';
import { wechatMemoryController } from './memory';
import { useWeChatStore } from './store';

interface WeChatScriptPayload {
  content?: string;
  targetUserRoleId?: string;
}

let wechatRoleContextSubscribed = false;

if (!wechatRoleContextSubscribed && typeof window !== 'undefined') {
  wechatRoleContextSubscribed = true;
  window.addEventListener(COMMERCE_ROLE_CHANGED_EVENT, () => {
    useWeChatStore.getState().syncWeChatRoleContext();
  });
}

const runWithRuntimeRole = async <T>(roleId: string, runner: () => Promise<T> | T): Promise<T> => {
  const previousRoleId = getRuntimeActiveRoleId();
  setRuntimeActiveRoleId(roleId);
  emitCommerceRoleChanged();
  try {
    return await runner();
  } finally {
    if (previousRoleId) {
      setRuntimeActiveRoleId(previousRoleId);
    } else {
      clearRuntimeActiveRoleId();
    }
    emitCommerceRoleChanged();
  }
};

let wechatScriptExecutorRegistered = false;

if (!wechatScriptExecutorRegistered) {
  wechatScriptExecutorRegistered = true;
  registerDailyScriptActionExecutor('wechat.sendMessageToUser', async ({ roleId, payload }) => {
    const input = (payload && typeof payload === 'object' ? payload : {}) as WeChatScriptPayload;
    const content = (typeof input.content === 'string' ? input.content : '').trim();
    if (!content) {
      throw new Error('微信消息内容不能为空');
    }

    const targetUserRoleIdCandidate =
      typeof input.targetUserRoleId === 'string' && input.targetUserRoleId.trim()
        ? input.targetUserRoleId.trim()
        : DEFAULT_ACTIVE_ROLE_ID;
    const allowTargetRoleIds = new Set([
      DEFAULT_ACTIVE_ROLE_ID,
      ...getMyCardsSnapshotBridge().map((item) => item.id),
    ]);
    const targetUserRoleId = allowTargetRoleIds.has(targetUserRoleIdCandidate)
      ? targetUserRoleIdCandidate
      : DEFAULT_ACTIVE_ROLE_ID;
    const targetCharacterId = createRoleCharacterId(targetUserRoleId);

    return runWithRuntimeRole(roleId, async () => {
      const store = useWeChatStore.getState();
      store.syncWeChatRoleContext();
      const sessionId = store.ensureWeChatSession(targetCharacterId, { switchCurrent: false });
      if (!sessionId) {
        throw new Error('未找到可用的微信会话');
      }

      store.addWeChatMessage(sessionId, {
        role: 'user',
        content,
        type: 'text',
      });

      await runWithRuntimeRole(targetUserRoleId, () => {
        wechatMemoryController.record({
          contactId: roleId,
          sessionId,
          sourceId: `daily-script-${roleId}-${Date.now()}`,
          sourceType: 'text',
          role: 'assistant',
          content,
          timestamp: Date.now(),
        });
      });

      return {
        ok: true,
        message: '已发送微信消息',
      };
    });
  });
}

const weChatManifest: AppManifest = {
  id: 'wechat',
  name: '微信',
  icon: 'MessageCircle',
  color: '#07c160',
  component: WeChatApp,
  market: {
    icon: '💬',
    tags: ['社交', '聊天', '通讯'],
    sortOrder: 20,
  },
  description: '即时通讯应用，可进行聊天、通讯录管理、朋友圈与个人资料操作。',
};

export default weChatManifest;
