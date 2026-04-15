import type { AppManifest } from '@mimisOS/sdk';
import { getMyCardsSnapshotBridge } from '../../shared/business/contacts/myCardsSnapshotBridge';
import { getContactsSnapshot } from '../../shared/business/contacts/snapshotBridge';
import { emitCommerceRoleChanged } from '../../shared/business/commerce/roleContext';
import { registerDailyScriptActionExecutor } from '../../shared/business/dailyscript/actionBridge';
import {
  registerLoveSpaceCheckInTaskSnapshotResolver,
  registerLoveSpaceCheckInTaskSnapshotSubscriber,
  type LoveSpaceCheckInTaskSnapshot,
} from '../../shared/business/lovespace/checkInTaskBridge';
import {
  registerLoveSpaceRelationSnapshotResolver,
  registerLoveSpaceRelationSnapshotSubscriber,
  type LoveSpaceRelationSnapshot,
} from '../../shared/business/lovespace/relationBridge';
import {
  DEFAULT_ACTIVE_ROLE_ID,
  createContactRoleId,
  normalizeRoleId,
} from '../../shared/business/roleIdentity';
import {
  clearRuntimeActiveRoleId,
  getRuntimeActiveRoleId,
  setRuntimeActiveRoleId,
} from '../../shared/business/roleRuntime';
import { LoveSpaceApp } from './LoveSpaceApp';
import { useLoveSpaceStore } from './store';
import type { LoveCheckInOwner } from './types';
import './timelineTask';

interface LoveSpaceScriptRelationInput {
  targetRelationId?: string;
  targetOwnerRoleId?: string;
  targetBondId?: string;
}

interface LoveSpaceAddMomentScriptPayload extends LoveSpaceScriptRelationInput {
  content?: string;
  imageDataUrl?: string;
}

interface LoveSpaceCompleteCheckInTaskScriptPayload extends LoveSpaceScriptRelationInput {
  owner?: LoveCheckInOwner;
  taskId?: string;
  templateId?: string;
  title?: string;
}

const RELATION_ID_SEPARATOR = '::';
const DEFAULT_SELF_LABEL = '默认身份';

const toTrimmedText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeCheckInOwner = (value: unknown): LoveCheckInOwner | null => {
  if (value === 'mine' || value === 'partner') return value;
  return null;
};

const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseRelationId = (
  relationId: string
): {
  ownerRoleId: string;
  bondId: string;
} | null => {
  const normalized = relationId.trim();
  if (!normalized) return null;

  const separatorIndex = normalized.indexOf(RELATION_ID_SEPARATOR);
  if (separatorIndex <= 0) return null;

  const ownerRoleId = normalized.slice(0, separatorIndex).trim();
  const bondId = normalized.slice(separatorIndex + RELATION_ID_SEPARATOR.length).trim();
  if (!ownerRoleId || !bondId) return null;

  return {
    ownerRoleId: normalizeRoleId(ownerRoleId),
    bondId,
  };
};

const createRelationId = (ownerRoleId: string, bondId: string): string =>
  `${normalizeRoleId(ownerRoleId)}${RELATION_ID_SEPARATOR}${bondId.trim()}`;

const resolveTargetRelation = (
  input: LoveSpaceScriptRelationInput
): {
  ownerRoleId: string;
  bondId: string;
  contactRoleId: string;
} => {
  const parsedById = parseRelationId(toTrimmedText(input.targetRelationId));
  const ownerRoleId = normalizeRoleId(
    toTrimmedText(input.targetOwnerRoleId) || parsedById?.ownerRoleId || undefined
  );
  const bondId = toTrimmedText(input.targetBondId) || parsedById?.bondId || '';

  if (!ownerRoleId || !bondId) {
    throw new Error('情侣空间目标关系缺失');
  }

  const ownerState = useLoveSpaceStore.getState().loveSpaceStateByRoleId[ownerRoleId];
  if (!ownerState) {
    throw new Error('未找到目标关系所属身份');
  }

  const targetBond = ownerState.bonds.find((item) => item.id === bondId);
  if (!targetBond) {
    throw new Error('未找到目标关系');
  }

  return {
    ownerRoleId,
    bondId,
    contactRoleId: createContactRoleId(targetBond.contactId),
  };
};

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

const buildLoveSpaceRelationSnapshot = (): LoveSpaceRelationSnapshot[] => {
  const contacts = getContactsSnapshot();
  const contactsById = new Map(contacts.map((item) => [item.id, item]));
  const myCards = getMyCardsSnapshotBridge();
  const myCardsById = new Map(myCards.map((item) => [item.id, item]));

  const resolveOwnerLabel = (ownerRoleId: string): string => {
    const normalizedRoleId = normalizeRoleId(ownerRoleId);
    if (normalizedRoleId === DEFAULT_ACTIVE_ROLE_ID) return DEFAULT_SELF_LABEL;
    return myCardsById.get(normalizedRoleId)?.name?.trim() || normalizedRoleId;
  };

  const relationList: LoveSpaceRelationSnapshot[] = [];
  const roleStateById = useLoveSpaceStore.getState().loveSpaceStateByRoleId;
  Object.entries(roleStateById).forEach(([ownerRoleId, roleState]) => {
    const ownerLabel = resolveOwnerLabel(ownerRoleId);
    roleState.bonds.forEach((bond) => {
      const contact = contactsById.get(bond.contactId);
      const contactLabel = contact?.name?.trim() || bond.contactId;
      relationList.push({
        id: createRelationId(ownerRoleId, bond.id),
        label: `${ownerLabel} ↔ ${contactLabel}`,
        ownerRoleId: normalizeRoleId(ownerRoleId),
        bondId: bond.id,
        contactRoleId: createContactRoleId(bond.contactId),
      });
    });
  });

  return relationList.sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
};

const buildLoveSpaceCheckInTaskSnapshot = (): LoveSpaceCheckInTaskSnapshot[] => {
  const relationSnapshot = buildLoveSpaceRelationSnapshot();
  const relationById = new Map(relationSnapshot.map((item) => [item.id, item]));

  const taskSnapshot: LoveSpaceCheckInTaskSnapshot[] = [];
  const roleStateById = useLoveSpaceStore.getState().loveSpaceStateByRoleId;
  Object.entries(roleStateById).forEach(([ownerRoleId, roleState]) => {
    roleState.checkInTasks.forEach((task) => {
      const relationId = createRelationId(ownerRoleId, task.bondId);
      const relation = relationById.get(relationId);
      if (!relation) return;

      taskSnapshot.push({
        id: task.id,
        title: task.title,
        owner: task.owner === 'partner' ? 'partner' : 'mine',
        templateId: task.templateId,
        relationId: relation.id,
        relationLabel: relation.label,
        ownerRoleId: relation.ownerRoleId,
        bondId: relation.bondId,
        contactRoleId: relation.contactRoleId,
      });
    });
  });

  return taskSnapshot.sort((left, right) => {
    const leftLabel = `${left.relationLabel}|${left.owner}|${left.title}`;
    const rightLabel = `${right.relationLabel}|${right.owner}|${right.title}`;
    return leftLabel.localeCompare(rightLabel, 'zh-CN');
  });
};

let loveSpaceScriptExecutorRegistered = false;

if (!loveSpaceScriptExecutorRegistered) {
  loveSpaceScriptExecutorRegistered = true;

  registerDailyScriptActionExecutor('lovespace.addMoment', async ({ payload }) => {
    const input =
      payload && typeof payload === 'object' ? (payload as LoveSpaceAddMomentScriptPayload) : {};
    const { ownerRoleId, bondId } = resolveTargetRelation(input);

    const content = toTrimmedText(input.content);
    const imageDataUrl = toTrimmedText(input.imageDataUrl);
    if (!content && !imageDataUrl) {
      throw new Error('情侣空间瞬间内容为空');
    }

    return runWithRuntimeRole(ownerRoleId, async () => {
      const store = useLoveSpaceStore.getState();
      store.syncLoveSpaceRoleContext();
      store.addMomentRecord({
        bondId,
        content,
        imageDataUrl: imageDataUrl || undefined,
      });

      return {
        ok: true,
        message: '已写入情侣空间瞬间',
      };
    });
  });

  registerDailyScriptActionExecutor('lovespace.completeCheckInTask', async ({ payload, roleId }) => {
    const input =
      payload && typeof payload === 'object'
        ? (payload as LoveSpaceCompleteCheckInTaskScriptPayload)
        : {};
    const { ownerRoleId, bondId, contactRoleId } = resolveTargetRelation(input);
    if (normalizeRoleId(roleId) !== contactRoleId) {
      return {
        ok: false,
        message: '当前打卡关系与执行角色不匹配',
      };
    }
    const owner = normalizeCheckInOwner(input.owner);

    const taskId = toTrimmedText(input.taskId);
    const templateId = toTrimmedText(input.templateId);
    const title = toTrimmedText(input.title);
    if (!taskId && !templateId && !title) {
      throw new Error('缺少打卡任务匹配条件');
    }

    return runWithRuntimeRole(ownerRoleId, async () => {
      const store = useLoveSpaceStore.getState();
      store.syncLoveSpaceRoleContext();

      const allTasks = useLoveSpaceStore
        .getState()
        .checkInTasks.filter((item) => item.bondId === bondId);

      let candidates = owner
        ? allTasks.filter((item) => item.owner === owner)
        : allTasks;

      if (taskId) {
        const matchedByTaskId = candidates.filter((item) => item.id === taskId);
        if (matchedByTaskId.length > 0) {
          candidates = matchedByTaskId;
        }
      }
      if (templateId) {
        candidates = candidates.filter((item) => item.templateId.trim() === templateId);
      }
      if (title) {
        candidates = candidates.filter((item) => item.title.trim() === title);
      }

      if (candidates.length === 0) {
        return {
          ok: false,
          message: '未找到可完成的打卡任务',
        };
      }

      if (candidates.length > 1) {
        return {
          ok: false,
          message: '匹配到多个打卡任务，请补充条件',
        };
      }

      const targetTask = candidates[0];
      if ((targetTask.completedDateKeys ?? []).includes(getTodayDateKey())) {
        return {
          ok: false,
          message: '该任务今日已打卡',
        };
      }

      store.completeCheckInTask({ taskId: targetTask.id });
      return {
        ok: true,
        message: `已完成打卡：${targetTask.title}`,
      };
    });
  });
}

let loveSpaceRelationSnapshotRegistered = false;

if (!loveSpaceRelationSnapshotRegistered) {
  loveSpaceRelationSnapshotRegistered = true;
  registerLoveSpaceRelationSnapshotResolver(buildLoveSpaceRelationSnapshot);
  registerLoveSpaceRelationSnapshotSubscriber((listener) =>
    useLoveSpaceStore.subscribe(() => {
      listener();
    })
  );
}

let loveSpaceCheckInTaskSnapshotRegistered = false;

if (!loveSpaceCheckInTaskSnapshotRegistered) {
  loveSpaceCheckInTaskSnapshotRegistered = true;
  registerLoveSpaceCheckInTaskSnapshotResolver(buildLoveSpaceCheckInTaskSnapshot);
  registerLoveSpaceCheckInTaskSnapshotSubscriber((listener) =>
    useLoveSpaceStore.subscribe(() => {
      listener();
    })
  );
}

const loveSpaceManifest: AppManifest = {
  id: 'lovespace',
  name: '情侣空间',
  icon: 'Heart',
  color: '#F7CAD8',
  component: LoveSpaceApp,
  market: {
    icon: '💗',
    tags: ['情侣', '纪念日', '关系'],
    sortOrder: 10,
  },
  description: '从通讯录添加多位关系，在首页查看绑定天数与心动值。',
};

export default loveSpaceManifest;
