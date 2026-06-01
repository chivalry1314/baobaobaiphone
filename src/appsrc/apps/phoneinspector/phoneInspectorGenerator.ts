import { useSettingsCoreStore } from '../../../core/stores/settings/store';
import { queryMemoryCenterRecords } from '../../../core/appMemoryCenter';
import { renderPaperMagicText } from '../papermagic/promptCatalog';
import type { CallDirection, CallRecord } from '../contacts/types';
import type { DailyWordsEntry } from '../dailywords/types';
import type { WeChatBillRecord, WeChatMessage, WeChatSession } from '../WeChat/types';

interface GeneratedContact {
  name?: string;
  role?: string;
  note?: string;
  suspicion?: string;
  tags?: string;
  description?: string;
}

interface GeneratedChatMessage {
  sender?: string;
  content?: string;
  time?: string;
}

interface GeneratedChatSession {
  contactName?: string;
  relationshipGuess?: string;
  messages?: GeneratedChatMessage[];
}

interface GeneratedTransfer {
  counterparty?: string;
  amount?: number | string;
  direction?: string;
  time?: string;
  remark?: string;
}

interface GeneratedCallRecord {
  name?: string;
  phone?: string;
  direction?: string;
  durationSec?: number | string;
  time?: string;
  suspicion?: string;
}

interface GeneratedDailyWordsEntry {
  title?: string;
  content?: string;
  mood?: string;
  tags?: unknown;
}

export interface PhoneInspectorGeneratedSnapshot {
  sourceContactId: string;
  sessions: WeChatSession[];
  bills: WeChatBillRecord[];
  callRecords: CallRecord[];
  dailyWordsEntries: DailyWordsEntry[];
}

interface PhoneInspectorInitialSeed {
  sourceContactId: string;
  characterName: string;
  generatedContacts: GeneratedContact[];
  generatedChat: GeneratedChatSession | null;
  runPrefix: string;
  now: number;
}

interface PhoneInspectorSourceContact {
  id: string;
  name: string;
}

const INSPECTOR_GENERATED_PREFIX = 'inspector-gen';
const PHONE_INSPECTOR_REQUEST_TIMEOUT_MS = 600_000;
const PHONE_INSPECTOR_REQUEST_RETRY_COUNT = 2;

export const getPhoneInspectorDateKey = (timestamp = Date.now()): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
};

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizeMultilineText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeComparableMessage = (value: string): string =>
  value.replace(/[\s，。！？!?、,.~～…]+/g, '').trim().toLowerCase();

const isSimilarShortMessage = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeComparableMessage(left);
  const normalizedRight = normalizeComparableMessage(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.length <= 8 && normalizedRight.length <= 8) {
    return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
  }
  return false;
};

const isSameDisplayName = (left: string, right: string): boolean => {
  const normalize = (value: string) => value.replace(/\s+/g, '').trim().toLowerCase();
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

const isGeneratedNameAllowed = (name: string, ownerName: string): boolean =>
  Boolean(name.trim()) && !isSameDisplayName(name, ownerName);

const slugify = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const ascii = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (ascii) return ascii.slice(0, 32);

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36) || 'contact';
};

const makeGeneratedCharacterId = (sourceContactId: string, name: string, index: number): string =>
  `${INSPECTOR_GENERATED_PREFIX}-${slugify(sourceContactId)}-${index}-${slugify(name)}`;

const makeGeneratedSessionId = (roleId: string, characterId: string): string =>
  `session-${slugify(roleId)}-${characterId}`;

const makeGeneratedRunPrefix = (sourceContactId: string, dateKey: string): string =>
  `inspector-${dateKey}-${slugify(sourceContactId)}`;

class PhoneInspectorJsonParseError extends Error {
  rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = 'PhoneInspectorJsonParseError';
    this.rawText = rawText;
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitUntilVisible = async (): Promise<void> => {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
  await new Promise<void>((resolve) => {
    const handleVisible = () => {
      if (document.visibilityState === 'hidden') return;
      document.removeEventListener('visibilitychange', handleVisible);
      resolve();
    };
    document.addEventListener('visibilitychange', handleVisible);
  });
};

const isTransientRequestError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|load failed|network|fetch|timeout|aborted/i.test(error.message);
};

const extractJsonFromModelText = (text: string): unknown => {
  const candidate = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = candidate.search(/[\[{]/);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  const jsonCandidate = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  const attempts = [
    jsonCandidate,
    jsonCandidate
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/}\s*{/g, '},{')
      .replace(/]\s*\[/g, '],[')
      .replace(/"\s*{/g, '",{')
      .replace(/}\s*"/g, '},"')
      .replace(/"\s*\[/g, '",[')
      .replace(/]\s*"/g, '],"'),
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error && lastError.message.trim()) {
    throw new PhoneInspectorJsonParseError(
      `模型返回不是合法 JSON：${lastError.message}`,
      text
    );
  }
  throw new PhoneInspectorJsonParseError('模型返回不是合法 JSON', text);
};

const requestModelText = async (input: {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  responseFormatJson?: boolean;
}): Promise<string> => {
  const settings = useSettingsCoreStore.getState().settings;
  const apiKey = (settings.memoryApiKey || '').trim();
  const baseUrl = (settings.memoryBaseUrl || '').trim().replace(/\/+$/, '');
  const model = (settings.memoryModel || '').trim();
  if (!apiKey || !baseUrl || !model) {
    throw new Error('请先在API设置中配置记忆模型');
  }

  let response: Response | null = null;
  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: 'system',
        content: input.system,
      },
      {
        role: 'user',
        content: input.user,
      },
    ],
    temperature: input.temperature,
    max_tokens: input.maxTokens,
  };
  if (input.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  for (let attempt = 0; attempt <= PHONE_INSPECTOR_REQUEST_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PHONE_INSPECTOR_REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      break;
    } catch (error) {
      window.clearTimeout(timeoutId);
      if (attempt >= PHONE_INSPECTOR_REQUEST_RETRY_COUNT || !isTransientRequestError(error)) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('模型接口超时');
        }
        throw error;
      }
      await waitUntilVisible();
      await sleep(900 + attempt * 1200);
      continue;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (!response) {
    throw new Error('模型接口无响应');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (
      input.responseFormatJson &&
      (response.status === 400 || response.status === 422) &&
      /response_format|json_object/i.test(detail)
    ) {
      return requestModelText({
        ...input,
        responseFormatJson: false,
      });
    }
    throw new Error(`模型接口返回 ${response.status}：${detail.slice(0, 120) || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('模型返回为空');
  }

  return content;
};

const repairJsonWithModel = async (rawText: string): Promise<unknown> => {
  const repairedText = await requestModelText({
    system: [
      '你是 JSON 修复器。',
      '你只能输出修复后的合法 JSON 对象或数组。',
      '不得新增业务内容，不得改写字段含义，只修复缺失逗号、括号、引号、尾逗号等格式问题。',
      '不要输出 Markdown，不要解释。',
    ].join('\n'),
    user: [
      '请把下面内容修复成可以被 JSON.parse 解析的合法 JSON：',
      rawText,
    ].join('\n\n'),
    temperature: 0,
    maxTokens: 1600,
    responseFormatJson: true,
  });

  return extractJsonFromModelText(repairedText);
};

const requestJsonFromModel = async (prompt: string): Promise<unknown> => {
  const content = await requestModelText({
    system: '你只输出合法 JSON，不要输出 Markdown 或解释文字。',
    user: prompt,
    temperature: 0.75,
    maxTokens: 1400,
    responseFormatJson: true,
  });

  try {
    return extractJsonFromModelText(content);
  } catch (error) {
    if (error instanceof PhoneInspectorJsonParseError) {
      return repairJsonWithModel(error.rawText);
    }
    throw error;
  }
};

const requestPhoneInspectorJson = async (label: string, prompt: string): Promise<unknown> => {
  try {
    return await requestJsonFromModel(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '未知错误');
    throw new Error(`${label}生成失败：${message}`);
  }
};

const requestDailyWordsJson = async (prompt: string): Promise<GeneratedDailyWordsEntry[]> => {
  const firstJson = await requestPhoneInspectorJson('日记心语', prompt);
  const firstEntries = readDailyWordsPayload(firstJson);
  if (firstEntries.length > 0) return firstEntries;

  const retryJson = await requestPhoneInspectorJson(
    '日记心语',
    [
      prompt,
      '',
      '【强制重试要求】',
      '你上一次返回的 entries 为空，这是无效结果。',
      '必须重新生成 1-2 篇日记，entries 必须是非空数组。',
      '每篇 content 必须为 50-200 个中文字符。',
      '严格输出 JSON，不要 Markdown，不要解释。',
    ].join('\n')
  );
  const retryEntries = readDailyWordsPayload(retryJson);
  if (retryEntries.length > 0) return retryEntries;

  throw new Error('日记心语生成失败：模型返回的 entries 为空');
};

const readContactsPayload = (value: unknown): GeneratedContact[] => {
  const contacts = (value as { contacts?: unknown; contactList?: unknown })?.contacts ??
    (value as { contactList?: unknown })?.contactList;
  if (!Array.isArray(contacts)) return [];
  return contacts
    .map((item) => {
      const candidate = item as GeneratedContact;
      const tags = normalizeText(candidate.tags);
      const description = normalizeText(candidate.description);
      return {
        name: normalizeText(candidate.name),
        role: normalizeText(candidate.role) || tags,
        note: normalizeText(candidate.note) || tags,
        suspicion: normalizeText(candidate.suspicion) || description,
      };
    })
    .filter((item) => item.name);
};

const filterGeneratedContactsByOwner = (
  contacts: GeneratedContact[],
  ownerName: string
): GeneratedContact[] => {
  const seenNames = new Set<string>();
  return contacts.filter((item) => {
    if (!isGeneratedNameAllowed(item.name || '', ownerName)) return false;
    const normalizedName = (item.name || '').replace(/\s+/g, '').trim().toLowerCase();
    if (!normalizedName || seenNames.has(normalizedName)) return false;
    seenNames.add(normalizedName);
    return true;
  });
};

const selectChatSeedContact = (contacts: GeneratedContact[]): GeneratedContact | null => {
  if (contacts.length === 0) return null;
  const dramaticKeywordPattern = /暧昧|同事|领导|亲戚|八卦|对象|猎手|潜伏|篡位|借钱|公司|上级|下属/;
  return (
    contacts.find((item) =>
      dramaticKeywordPattern.test(`${item.name || ''} ${item.role || ''} ${item.note || ''} ${item.suspicion || ''}`)
    ) || contacts[0]
  );
};

const buildContactNetworkText = (contacts: GeneratedContact[]): string =>
  contacts
    .slice(0, 8)
    .map((item) => {
      const parts = [item.name, item.role || item.note, item.suspicion]
        .map((part) => normalizeText(part))
        .filter(Boolean);
      return parts.join(' / ');
    })
    .filter(Boolean)
    .join('\n');

const buildCharacterMemoriesText = (roleId: string, sourceContactId: string): string => {
  const records = queryMemoryCenterRecords({
    roleIds: roleId,
    spaces: ['personal', 'social'],
    contactIds: sourceContactId,
    order: 'desc',
    limit: 12,
  });
  return records
    .map((record) => normalizeMultilineText(record.content))
    .filter(Boolean)
    .join('\n')
    .slice(0, 1600);
};

const buildRecentCluesText = (input: {
  contacts: GeneratedContact[];
  callRecords: GeneratedCallRecord[];
  chatSession: GeneratedChatSession | null;
  transfers: GeneratedTransfer[];
}): string => {
  const lines: string[] = [];
  const contactText = buildContactNetworkText(input.contacts);
  if (contactText) {
    lines.push(`【社交圈】\n${contactText}`);
  }

  const callText = input.callRecords
    .slice(0, 6)
    .map((item) => `${item.time || '未知时间'} ${item.name || item.phone || '未知'} ${item.direction || ''} ${item.durationSec || ''}秒 ${item.suspicion || ''}`.trim())
    .filter(Boolean)
    .join('\n');
  if (callText) {
    lines.push(`【通话】\n${callText}`);
  }

  const chatText = input.chatSession?.messages
    ?.slice(-10)
    .map((item) => `${item.sender || input.chatSession?.contactName || '对方'}：${item.content}`)
    .filter(Boolean)
    .join('\n');
  if (chatText) {
    lines.push(`【聊天】\n${chatText}`);
  }

  const transferText = input.transfers
    .slice(0, 8)
    .map((item) => `${item.time || '未知时间'} ${item.direction || ''} ${item.counterparty || '未知对象'} ${item.amount || ''} ${item.remark || ''}`.trim())
    .filter(Boolean)
    .join('\n');
  if (transferText) {
    lines.push(`【账单】\n${transferText}`);
  }

  return lines.join('\n\n').slice(0, 2200);
};

const readChatPayload = (value: unknown): GeneratedChatSession | null => {
  const session = (value as { session?: unknown })?.session as GeneratedChatSession | undefined;
  if (!session || typeof session !== 'object') return null;
  const contactName = normalizeText(session.contactName);
  if (!contactName) return null;
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const dedupedMessages: GeneratedChatMessage[] = [];
  messages
    .map((item) => ({
      sender: normalizeText(item?.sender),
      content: normalizeMultilineText(item?.content),
      time: normalizeText(item?.time),
    }))
    .filter((item) => item.content)
    .forEach((item) => {
      const previous = dedupedMessages.at(-1);
      if (previous?.content && isSimilarShortMessage(previous.content, item.content || '')) return;
      const recentSimilarCount = dedupedMessages
        .slice(-6)
        .filter((message) => isSimilarShortMessage(message.content || '', item.content || '')).length;
      if (recentSimilarCount >= 1) return;
      dedupedMessages.push(item);
    });

  return {
    contactName,
    relationshipGuess: normalizeText(session.relationshipGuess),
    messages: dedupedMessages,
  };
};

const normalizeChatPayloadByOwner = (
  session: GeneratedChatSession | null,
  ownerName: string
): GeneratedChatSession | null => {
  if (!session) return null;
  if (!isGeneratedNameAllowed(session.contactName || '', ownerName)) return null;
  return session;
};

const readTransfersPayload = (value: unknown): GeneratedTransfer[] => {
  const transfers = (value as { transfers?: unknown })?.transfers;
  if (!Array.isArray(transfers)) return [];
  return transfers
    .map((item) => {
      const candidate = item as GeneratedTransfer;
      return {
        counterparty: normalizeText(candidate.counterparty),
        amount: candidate.amount,
        direction: normalizeText(candidate.direction),
        time: normalizeText(candidate.time),
        remark: normalizeText(candidate.remark),
      };
    })
    .filter((item) => item.counterparty);
};

const readCallRecordsPayload = (value: unknown): GeneratedCallRecord[] => {
  const records = (value as { callRecords?: unknown })?.callRecords;
  if (!Array.isArray(records)) return [];
  return records
    .map((item) => {
      const candidate = item as GeneratedCallRecord;
      return {
        name: normalizeText(candidate.name),
        phone: normalizeText(candidate.phone),
        direction: normalizeText(candidate.direction),
        durationSec: candidate.durationSec,
        time: normalizeText(candidate.time),
        suspicion: normalizeText(candidate.suspicion),
      };
    })
    .filter((item) => item.name || item.phone);
};

const readDailyWordsPayload = (value: unknown): GeneratedDailyWordsEntry[] => {
  const entries = (value as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) return [];
  return entries
    .map((item) => {
      const candidate = item as GeneratedDailyWordsEntry;
      const rawTags = Array.isArray(candidate.tags) ? candidate.tags : [];
      return {
        title: normalizeText(candidate.title).slice(0, 80),
        content: normalizeMultilineText(candidate.content).slice(0, 5000),
        mood: normalizeText(candidate.mood).slice(0, 30),
        tags: rawTags
          .map((tag) => normalizeText(tag))
          .filter(Boolean)
          .slice(0, 8),
      };
    })
    .filter((item) => item.title || item.content)
    .slice(0, 2);
};

const parseAmount = (value: unknown): number => {
  const raw = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Number(raw.toFixed(2));
};

const parseDurationSec = (value: unknown, direction: CallDirection): number => {
  if (direction === 'missed') return 0;
  const raw = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(raw) || raw <= 0) return 60;
  return Math.max(1, Math.min(3600, Math.round(raw)));
};

const parseCallDirection = (value: string): CallDirection => {
  const normalized = value.toLowerCase();
  if (/missed|未接|未接来电/.test(normalized)) return 'missed';
  if (/incoming|来电|接听|接入/.test(normalized)) return 'incoming';
  return 'outgoing';
};

const parseTime = (value: string, fallback: number): number => {
  const normalized = value.trim();
  if (!normalized) return fallback;

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [hour, minute] = normalized.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
  }

  const parsed = Date.parse(normalized.replace(/-/g, '/'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRecentInspectorCallTime = (
  timestamp: number,
  index: number,
  baseTimestamp: number
): number => {
  const sourceDate = new Date(Number.isFinite(timestamp) ? timestamp : baseTimestamp);
  const dayOffset = 1 + ((index * 13 + Math.floor(index / 2) * 7) % 88);
  const normalized = new Date(baseTimestamp - dayOffset * 86_400_000);
  normalized.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
  return normalized.getTime();
};

const normalizeGeneratedPhone = (value: string, index: number, name: string): string => {
  const digits = value.replace(/\D/g, '');
  const looksPlaceholder =
    /[*＊xX]/.test(value) ||
    !digits ||
    digits.length < 5 ||
    /^(\d)\1+$/.test(digits) ||
    /(\d{2,})\1{1,}/.test(digits) ||
    /^(13|14|15|16|17|18|19)700\d*7000$/.test(digits);
  if (!looksPlaceholder) return value;

  const seed = `${name}-${index}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const prefixes = ['131', '135', '136', '150', '156', '166', '177', '181', '188'];
  const prefix = prefixes[seed % prefixes.length];
  const suffix = String((seed * 9301 + 49297) % 10_000_000).padStart(8, '0').slice(0, 8);
  return `${prefix}${suffix}`;
};

const buildGroupedChatTimestamp = (
  messageIndex: number,
  messageCount: number,
  baseTimestamp: number
): number => {
  const groupSize = Math.max(10, Math.min(25, Math.ceil(Math.max(messageCount, 1) / 2)));
  const groupIndex = Math.floor(messageIndex / groupSize);
  const withinGroupIndex = messageIndex % groupSize;
  const groupCount = Math.max(1, Math.ceil(messageCount / groupSize));
  const firstGroupTimestamp = baseTimestamp - (groupCount - 1) * 48 * 60_000;
  return firstGroupTimestamp + groupIndex * 48 * 60_000 + withinGroupIndex * 18_000;
};

const buildMessage = (
  item: GeneratedChatMessage,
  ownerName: string,
  peerName: string,
  timestamp: number,
  index: number
): WeChatMessage => {
  const sender = normalizeText(item.sender);
  const ownerAliases = [ownerName, '他', '手机主人', '本人', '我'].filter(Boolean);
  const peerAliases = [peerName, '聊天对象', '对方', '好友'].filter(Boolean);
  const isOwnerMessage = ownerAliases.some((alias) => sender === alias || sender.includes(alias));
  const isPeerMessage = peerAliases.some((alias) => sender === alias || sender.includes(alias));
  const role = isOwnerMessage
    ? 'user'
    : isPeerMessage
      ? 'character'
      : index % 2 === 0
        ? 'character'
        : 'user';

  return {
    id: `inspector-msg-${timestamp}-${index}`,
    role,
    content: normalizeMultilineText(item.content),
    timestamp,
    type: 'text',
  };
};

const buildEmptyContactSession = (
  roleId: string,
  sourceContactId: string,
  contact: GeneratedContact,
  index: number,
  timestamp: number,
  runPrefix: string
): WeChatSession => {
  const name = contact.name || `可疑联系人${index + 1}`;
  const characterId = makeGeneratedCharacterId(sourceContactId, name, index);
  return {
    id: `${runPrefix}-contact-session-${index}`,
    characterId,
    messages: [],
    lastUpdated: timestamp - index * 60_000,
    unreadCount: 0,
    isPinned: false,
    inspectorGeneratedContact: {
      sourceContactId,
      name,
      role: contact.role,
      note: contact.note,
      suspicion: contact.suspicion,
    },
  };
};

const buildChatSession = (
  roleId: string,
  sourceContactId: string,
  ownerName: string,
  session: GeneratedChatSession,
  index: number,
  baseTimestamp: number,
  runPrefix: string
): WeChatSession => {
  const name = session.contactName || `聊天对象${index + 1}`;
  const characterId = makeGeneratedCharacterId(sourceContactId, name, index);
  const messageCount = session.messages?.length || 0;
  const messages = (session.messages || []).map((message, messageIndex) => {
    const fallbackTimestamp = buildGroupedChatTimestamp(messageIndex, messageCount, baseTimestamp);
    return buildMessage(
      message,
      ownerName,
      name,
      fallbackTimestamp,
      messageIndex
    );
  });

  return {
    id: `${runPrefix}-chat-session-${index}`,
    characterId,
    messages,
    lastUpdated: messages.at(-1)?.timestamp || baseTimestamp,
    unreadCount: 0,
    isPinned: false,
    inspectorGeneratedContact: {
      sourceContactId,
      name,
      relationshipGuess: session.relationshipGuess,
      note: session.relationshipGuess,
    },
  };
};

const buildBillRecord = (
  sourceContactId: string,
  item: GeneratedTransfer,
  index: number,
  baseTimestamp: number,
  runPrefix: string
): WeChatBillRecord | null => {
  const amount = parseAmount(item.amount);
  if (!amount) return null;
  const counterparty = item.counterparty || '未知对象';
  const direction = /received|收|入|转入/i.test(item.direction || '') ? 'income' : 'expense';
  const title = direction === 'income' ? '微信收款' : '微信支付';
  return {
    id: `${runPrefix}-bill-${index}`,
    title,
    counterparty,
    amount,
    direction,
    timestamp: parseTime(item.time || '', baseTimestamp - index * 3_600_000),
    remark: item.remark || undefined,
    inspectorGeneratedSourceContactId: sourceContactId,
  };
};

const buildCallRecord = (
  roleId: string,
  item: GeneratedCallRecord,
  index: number,
  baseTimestamp: number,
  runPrefix: string,
  contactId: string
): CallRecord => {
  const direction = parseCallDirection(item.direction || '');
  const timestamp = normalizeRecentInspectorCallTime(
    parseTime(item.time || '', baseTimestamp - index * 2_700_000),
    index,
    baseTimestamp
  );
  const name = item.name || item.phone || `未知号码${index + 1}`;
  const phone = normalizeGeneratedPhone(item.phone || '', index, name);
  return {
    id: `${runPrefix}-call-${index}`,
    contactId,
    roleId,
    contactName: name,
    phone,
    direction,
    durationSec: parseDurationSec(item.durationSec, direction),
    createdAt: timestamp,
    inspectorGeneratedSourceContactId: roleId.startsWith('contact:') ? roleId.slice('contact:'.length) : undefined,
  };
};

const buildDailyWordsEntry = (
  item: GeneratedDailyWordsEntry,
  index: number,
  baseTimestamp: number,
  runPrefix: string
): DailyWordsEntry => {
  const timestamp = baseTimestamp - index * 86_400_000 - 30 * 60_000;
  const date = new Date(timestamp);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => normalizeText(tag)).filter(Boolean).slice(0, 8)
    : [];

  return {
    id: `${runPrefix}-dailywords-${index}`,
    title: normalizeText(item.title).slice(0, 80),
    content: normalizeMultilineText(item.content).slice(0, 5000),
    tags,
    mood: normalizeText(item.mood).slice(0, 30),
    dateKey,
    isSyncedToMemory: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const buildSnapshotFromGeneratedParts = (input: {
  roleId: string;
  sourceContactId: string;
  characterName: string;
  generatedContacts: GeneratedContact[];
  generatedChat: GeneratedChatSession | null;
  generatedTransfers: GeneratedTransfer[];
  generatedCallRecords: GeneratedCallRecord[];
  generatedDailyWords: GeneratedDailyWordsEntry[];
  now: number;
  runPrefix: string;
}): PhoneInspectorGeneratedSnapshot => {
  const contactSessions = input.generatedContacts.map((item, index) =>
    buildEmptyContactSession(input.roleId, input.sourceContactId, item, index, input.now, input.runPrefix)
  );
  const chatSession = input.generatedChat
    ? buildChatSession(
        input.roleId,
        input.sourceContactId,
        input.characterName,
        input.generatedChat,
        contactSessions.length,
        input.now,
        input.runPrefix
      )
    : null;
  const bills = input.generatedTransfers
    .map((item, index) => buildBillRecord(input.sourceContactId, item, index, input.now, input.runPrefix))
    .filter((item): item is WeChatBillRecord => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp);
  const callRecords = input.generatedCallRecords
    .map((item, index) => {
      const matchedSession =
        [...contactSessions, chatSession].find(
          (session) =>
            session?.inspectorGeneratedContact?.name &&
            item.name &&
            session.inspectorGeneratedContact.name === item.name
        ) || contactSessions[index % Math.max(1, contactSessions.length)];
      const contactId = matchedSession?.characterId || contactSessions[0]?.characterId || input.sourceContactId;
      return buildCallRecord(input.roleId, item, index, input.now, input.runPrefix, contactId);
    })
    .sort((left, right) => right.createdAt - left.createdAt);
  const dailyWordsEntries = input.generatedDailyWords
    .map((item, index) => buildDailyWordsEntry(item, index, input.now, input.runPrefix))
    .filter((item) => item.title || item.content);
  return {
    sourceContactId: input.sourceContactId,
    sessions: [chatSession, ...contactSessions].filter((item): item is WeChatSession => Boolean(item)),
    bills,
    callRecords,
    dailyWordsEntries,
  };
};

const createInitialSeed = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorInitialSeed> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const values = { characterName };
  const contactsJson = await requestPhoneInspectorJson(
    '通讯录',
    renderPaperMagicText('phoneinspector.contacts.generate', values)
  );
  const generatedContacts = filterGeneratedContactsByOwner(readContactsPayload(contactsJson), characterName);
  const chatSeedContact = selectChatSeedContact(generatedContacts);
  const contactValues = {
    characterName,
    contactName: chatSeedContact?.name || generatedContacts[0]?.name || '可疑联系人',
    contactTags: chatSeedContact?.role || chatSeedContact?.note || '通讯录联系人',
    contactDescription: chatSeedContact?.suspicion || chatSeedContact?.note || '身份模糊、关系微妙',
    contactNetworkText: buildContactNetworkText(generatedContacts),
  };
  const chatJson = await requestPhoneInspectorJson(
    '微信聊天',
    renderPaperMagicText('phoneinspector.chats.generate', contactValues)
  );
  const generatedChat = normalizeChatPayloadByOwner(readChatPayload(chatJson), characterName);
  if (generatedChat?.messages) {
    generatedChat.messages = generatedChat.messages.slice(0, 12);
  }
  const now = Date.now();
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, getPhoneInspectorDateKey(now));

  return {
    sourceContactId,
    characterName,
    generatedContacts,
    generatedChat,
    now,
    runPrefix,
  };
};

export const generatePhoneInspectorInitialSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const seed = await createInitialSeed(roleId, contact);
  return buildSnapshotFromGeneratedParts({
    roleId,
    ...seed,
    generatedTransfers: [],
    generatedCallRecords: [],
    generatedDailyWords: [],
  });
};

export const generatePhoneInspectorSupplementSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact,
  initialSnapshot?: PhoneInspectorGeneratedSnapshot
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const now = Date.now();
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, getPhoneInspectorDateKey(now));
  const generatedContacts = (initialSnapshot?.sessions || [])
    .map((session) => session.inspectorGeneratedContact)
    .filter((item): item is NonNullable<WeChatSession['inspectorGeneratedContact']> =>
      Boolean(item?.name && item.sourceContactId === sourceContactId)
    )
    .map((item) => ({
      name: item.name,
      role: item.role || item.relationshipGuess,
      note: item.note,
      suspicion: item.suspicion || item.relationshipGuess,
    }));
  const generatedChatSession = initialSnapshot?.sessions.find(
    (session) =>
      session.inspectorGeneratedContact?.sourceContactId === sourceContactId &&
      session.messages.length > 0
  );
  const generatedChat: GeneratedChatSession | null = generatedChatSession
    ? {
        contactName: generatedChatSession.inspectorGeneratedContact?.name,
        relationshipGuess: generatedChatSession.inspectorGeneratedContact?.relationshipGuess,
        messages: generatedChatSession.messages.map((message) => ({
          sender: message.role === 'user' ? characterName : generatedChatSession.inspectorGeneratedContact?.name,
          content: message.content,
        })),
      }
    : null;
  const contactNetworkText = buildContactNetworkText(generatedContacts);
  const contactValues = {
    characterName,
    contactName: generatedContacts[0]?.name || '可疑联系人',
    contactTags: generatedContacts[0]?.role || generatedContacts[0]?.note || '通讯录联系人',
    contactDescription: generatedContacts[0]?.suspicion || generatedContacts[0]?.note || '身份模糊、关系微妙',
    contactNetworkText,
  };
  const callRecordsJson = await requestPhoneInspectorJson(
    '通话记录',
    renderPaperMagicText('phoneinspector.callRecords.generate', contactValues)
  );
  const transfersJson = await requestPhoneInspectorJson(
    '微信账单',
    renderPaperMagicText('phoneinspector.transfers.generate', { characterName })
  );
  const generatedCallRecords = readCallRecordsPayload(callRecordsJson);
  const generatedTransfers = readTransfersPayload(transfersJson);
  const generatedDailyWords = await requestDailyWordsJson(
    renderPaperMagicText('phoneinspector.dailyWords.generate', {
      characterName,
      characterMemories: buildCharacterMemoriesText(roleId, sourceContactId),
      recentClues: buildRecentCluesText({
        contacts: generatedContacts,
        callRecords: generatedCallRecords,
        chatSession: generatedChat,
        transfers: generatedTransfers,
      }),
    })
  );

  return buildSnapshotFromGeneratedParts({
    roleId,
    sourceContactId,
    characterName,
    generatedContacts,
    generatedChat: null,
    generatedTransfers,
    generatedCallRecords,
    generatedDailyWords,
    now,
    runPrefix,
  });
};

export const generatePhoneInspectorSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const values = { characterName };

  const contactsJson = await requestPhoneInspectorJson(
    '通讯录',
    renderPaperMagicText('phoneinspector.contacts.generate', values)
  );
  const generatedContacts = filterGeneratedContactsByOwner(readContactsPayload(contactsJson), characterName);
  const chatSeedContact = selectChatSeedContact(generatedContacts);
  const contactNetworkText = buildContactNetworkText(generatedContacts);
  const contactValues = {
    characterName,
    contactName: chatSeedContact?.name || generatedContacts[0]?.name || '可疑联系人',
    contactTags: chatSeedContact?.role || chatSeedContact?.note || '通讯录联系人',
    contactDescription: chatSeedContact?.suspicion || chatSeedContact?.note || '身份模糊、关系微妙',
    contactNetworkText,
  };

  const callRecordsJson = await requestPhoneInspectorJson(
    '通话记录',
    renderPaperMagicText('phoneinspector.callRecords.generate', contactValues)
  );
  const transfersJson = await requestPhoneInspectorJson(
    '微信账单',
    renderPaperMagicText('phoneinspector.transfers.generate', values)
  );
  const chatJson = await requestPhoneInspectorJson(
    '微信聊天',
    renderPaperMagicText('phoneinspector.chats.generate', contactValues)
  );

  const now = Date.now();
  const dateKey = getPhoneInspectorDateKey(now);
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, dateKey);
  const generatedCallRecords = readCallRecordsPayload(callRecordsJson);
  const generatedChat = normalizeChatPayloadByOwner(readChatPayload(chatJson), characterName);
  const generatedTransfers = readTransfersPayload(transfersJson);
  const generatedDailyWords = await requestDailyWordsJson(
    renderPaperMagicText('phoneinspector.dailyWords.generate', {
      characterName,
      characterMemories: buildCharacterMemoriesText(roleId, sourceContactId),
      recentClues: buildRecentCluesText({
        contacts: generatedContacts,
        callRecords: generatedCallRecords,
        chatSession: generatedChat,
        transfers: generatedTransfers,
      }),
    })
  );

  const contactSessions = generatedContacts.map((item, index) =>
    buildEmptyContactSession(roleId, sourceContactId, item, index, now, runPrefix)
  );
  const chatSession = generatedChat
    ? buildChatSession(roleId, sourceContactId, characterName, generatedChat, contactSessions.length, now, runPrefix)
    : null;
  const bills = generatedTransfers
    .map((item, index) => buildBillRecord(sourceContactId, item, index, now, runPrefix))
    .filter((item): item is WeChatBillRecord => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp);
  const callRecords = generatedCallRecords
    .map((item, index) => {
      const matchedSession =
        [...contactSessions, chatSession].find(
          (session) =>
            session?.inspectorGeneratedContact?.name &&
            item.name &&
            session.inspectorGeneratedContact.name === item.name
        ) || contactSessions[index % Math.max(1, contactSessions.length)];
      const contactId = matchedSession?.characterId || contactSessions[0]?.characterId || sourceContactId;
      return buildCallRecord(roleId, item, index, now, runPrefix, contactId);
    })
    .sort((left, right) => right.createdAt - left.createdAt);
  const dailyWordsEntries = generatedDailyWords
    .map((item, index) => buildDailyWordsEntry(item, index, now, runPrefix))
    .filter((item) => item.title || item.content);

  return {
    sourceContactId,
    sessions: [chatSession, ...contactSessions].filter((item): item is WeChatSession => Boolean(item)),
    bills,
    callRecords,
    dailyWordsEntries,
  };
};

export const generatePhoneInspectorContactsSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const contactsJson = await requestPhoneInspectorJson(
    '通讯录',
    renderPaperMagicText('phoneinspector.contacts.generate', { characterName })
  );
  const now = Date.now();
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, getPhoneInspectorDateKey(now));
  const sessions = filterGeneratedContactsByOwner(readContactsPayload(contactsJson), characterName).map((item, index) =>
    buildEmptyContactSession(roleId, sourceContactId, item, index, now, runPrefix)
  );

  return {
    sourceContactId,
    sessions,
    bills: [],
    callRecords: [],
    dailyWordsEntries: [],
  };
};

export const generatePhoneInspectorChatsSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const chatJson = await requestPhoneInspectorJson(
    '微信聊天',
    renderPaperMagicText('phoneinspector.chats.generate', {
      characterName,
      contactName: '可疑联系人',
      contactTags: '通讯录联系人',
      contactDescription: '身份模糊、关系微妙',
    })
  );
  const chatSession = readChatPayload(chatJson);
  const now = Date.now();
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, getPhoneInspectorDateKey(now));

  return {
    sourceContactId,
    sessions: chatSession
      ? [buildChatSession(roleId, sourceContactId, characterName, chatSession, 100, now, runPrefix)]
      : [],
    bills: [],
    callRecords: [],
    dailyWordsEntries: [],
  };
};

export const generatePhoneInspectorTransfersSnapshot = async (
  roleId: string,
  contact: PhoneInspectorSourceContact
): Promise<PhoneInspectorGeneratedSnapshot> => {
  const sourceContactId = contact.id.trim();
  const characterName = contact.name || '他';
  const transfersJson = await requestPhoneInspectorJson(
    '微信账单',
    renderPaperMagicText('phoneinspector.transfers.generate', { characterName })
  );
  const now = Date.now();
  const runPrefix = makeGeneratedRunPrefix(sourceContactId, getPhoneInspectorDateKey(now));
  const bills = readTransfersPayload(transfersJson)
    .map((item, index) => buildBillRecord(sourceContactId, item, index, now, runPrefix))
    .filter((item): item is WeChatBillRecord => Boolean(item))
    .sort((left, right) => right.timestamp - left.timestamp);

  return {
    sourceContactId,
    sessions: [],
    bills,
    callRecords: [],
    dailyWordsEntries: [],
  };
};
