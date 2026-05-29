import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Brain,
  ChevronLeft,
  ContactRound,
  Download,
  FileInput,
  FileJson,
  Loader2,
  NotebookText,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useAppMemoryCenterStore } from '../../../core/appMemoryCenter';
import type { AppMemoryRecord } from '../../../core/appMemory';
import type { WorldInfoEntry } from '../../../core/sdk/types';
import { useSettingsCoreStore } from '../../../core/stores/settings/store';
import {
  addPersonaGeneratedContact,
  addPersonaGeneratedWorldBookEntry,
  type PersonaGeneratedContactPayload,
} from '../../shared/business/personagenerator/importBridge';
import {
  renderPaperMagicPersonaSkillArtifacts,
  renderPaperMagicText,
} from '../papermagic/promptCatalog';

interface PersonaGeneratorAppProps {
  onClose: () => void;
}

type ParsedLine = {
  speaker: string;
  content: string;
  timestamp?: number;
  raw?: string;
  direction?: 'sent' | 'received';
};

type ParsedImport = {
  lines: ParsedLine[];
  fileKind: 'json' | 'csv' | 'markdown' | 'text';
  sourceText: string;
  candidateNames: string[];
};

type ParsedPersonaCandidate = {
  name: string;
  messageCount: number;
  receivedCount: number;
  sentCount: number;
};

type GeneratedPersona = {
  contact: PersonaGeneratedContactPayload & { id: string; createdAt: number };
  worldBookEntries: WorldInfoEntry[];
  memoryRecords: AppMemoryRecord[];
  skill: {
    meta: Record<string, unknown>;
    personaAnalyzer: string;
    persona: string;
    memoriesAnalyzer: string;
    memories: string;
    skill: string;
  };
};

type ModelGeneratedPersonaPayload = {
  contact?: Partial<PersonaGeneratedContactPayload>;
  persona?: {
    traits?: string[];
    background?: string;
    greeting?: string;
    description?: string;
  };
  worldBookEntries?: Array<{
    name?: string;
    keywords?: string[];
    content?: string;
    scope?: 'global' | 'character';
  }>;
  memories?: string[];
};

const UNKNOWN_SPEAKER = '资料';
const FALLBACK_TARGET_NAME = '友人A';
const SELF_NAMES = new Set(['我', 'me', '自己', '本人', '你', 'user', '用户', 'system']);
const PLACEHOLDER_TARGET_NAMES = new Set([
  UNKNOWN_SPEAKER,
  '新人物',
  '未知',
  'unknown',
  '聊天记录',
  '文件',
  '消息',
  'content',
  'profile',
]);

const STOP_WORDS = new Set([
  '这个',
  '那个',
  '真的',
  '就是',
  '然后',
  '还是',
  '因为',
  '所以',
  '可以',
  '没有',
  '不是',
  '我们',
  '你们',
  '他们',
  '一下',
  '什么',
  '怎么',
  '聊天',
  '记录',
  '文件',
  '消息',
]);

const CONTENT_KEYS = ['content', 'text', 'message', 'msg', 'body', 'plainText', 'strContent'];
const SPEAKER_KEYS = [
  'speaker',
  'senderDisplayName',
  'senderRemarkName',
  'senderNickname',
  'sender',
  'from',
  'nickname',
  'userName',
  'talker',
  'senderUsername',
  'name',
];
const TIME_KEYS = ['timestamp', 'time', 'createdAt', 'date', 'datetime', 'createTime'];
const SEND_DIRECTION_KEYS = ['isSend', 'is_send', 'issend', 'sent', 'fromMe', 'isFromMe'];
const SYSTEM_LINE_PATTERN = /撤回了一条消息|以下为新消息|消息记录|微信红包|转账已被|以上是打招呼|^-{2,}$/;
const DEFAULT_MODEL_CONTEXT_LINE_LIMIT = 5000;
const MIN_MODEL_CONTEXT_LINE_LIMIT = 100;
const MAX_MODEL_CONTEXT_LINE_LIMIT = 20000;

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const sanitizeFileName = (value: string): string =>
  value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 40) || 'persona';

const safeJson = (value: unknown): string => JSON.stringify(value, null, 2);

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const clampModelContextLineLimit = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_MODEL_CONTEXT_LINE_LIMIT;
  return Math.min(MAX_MODEL_CONTEXT_LINE_LIMIT, Math.max(MIN_MODEL_CONTEXT_LINE_LIMIT, Math.floor(value)));
};

const normalizeCandidateName = (value: unknown): string => {
  const normalized = normalizeText(value).replace(/^@/, '').trim();
  if (!normalized || normalized.length > 24) return '';
  if (/[:：,，。！？!?；;\n\r]/.test(normalized)) return '';
  return normalized;
};

const isUsableTargetName = (value: unknown): value is string => {
  const normalized = normalizeCandidateName(value);
  if (!normalized) return false;
  if (SELF_NAMES.has(normalized.toLowerCase())) return false;
  if (/^wxid_/i.test(normalized) || /^[a-z]*_?\d{6,}$/i.test(normalized)) return false;
  return !PLACEHOLDER_TARGET_NAMES.has(normalized.toLowerCase());
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const guessFileKind = (fileName: string, raw: string): ParsedImport['fileKind'] => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'json') return 'json';
  if (extension === 'csv') return 'csv';
  if (extension === 'md' || extension === 'markdown') return 'markdown';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (raw.split('\n').slice(0, 3).some((line) => /sender|speaker|content|message|text/i.test(line) && line.includes(','))) {
    return 'csv';
  }
  return 'text';
};

const normalizeTimestamp = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 100000000000 ? value : value * 1000;
  }
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value.replace(/\//g, '-'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getFirstStringField = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
};

const normalizeSendDirection = (value: unknown): ParsedLine['direction'] => {
  if (typeof value === 'boolean') return value ? 'sent' : 'received';
  if (typeof value === 'number') return value === 1 ? 'sent' : value === 0 ? 'received' : undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'sent', 'send', 'out', 'outgoing', 'fromme', '我'].includes(normalized)) return 'sent';
  if (['0', 'false', 'no', 'received', 'receive', 'in', 'incoming', 'fromthem', '对方'].includes(normalized)) return 'received';
  return undefined;
};

const getSendDirection = (record: Record<string, unknown>): ParsedLine['direction'] => {
  for (const key of SEND_DIRECTION_KEYS) {
    if (key in record) return normalizeSendDirection(record[key]);
  }
  return undefined;
};

const collectProfileNamesFromJson = (value: unknown, names: string[] = []): string[] => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProfileNamesFromJson(item, names));
    return names;
  }

  if (!value || typeof value !== 'object') return names;
  const record = value as Record<string, unknown>;
  Object.entries(record).forEach(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase();
    const looksLikeNameField = [
      'name',
      'nickname',
      'displayname',
      'remarkname',
      'alias',
      'username',
      '名字',
      '昵称',
      '姓名',
      '备注名',
    ].some((field) => normalizedKey === field || normalizedKey.includes(field));
    if (looksLikeNameField && isUsableTargetName(nestedValue)) {
      names.push(normalizeCandidateName(nestedValue));
    }
    if (nestedValue && typeof nestedValue === 'object') collectProfileNamesFromJson(nestedValue, names);
  });
  return names;
};

const extractCandidateNamesFromText = (input: string): string[] => {
  const names: string[] = [];
  const patterns = [
    /(?:昵称|名字|姓名|备注名|name|nickname)\s*[:：]\s*([^\s,，。；;|/\\]{1,24})/gi,
    /(?:微信名|微信昵称)\s*[:：]\s*([^\s,，。；;|/\\]{1,24})/g,
  ];
  patterns.forEach((pattern) => {
    Array.from(input.matchAll(pattern)).forEach((match) => {
      if (isUsableTargetName(match[1])) names.push(normalizeCandidateName(match[1]));
    });
  });
  return uniqueStrings(names, 8);
};

const collectJsonMessages = (value: unknown, messages: ParsedLine[] = []): ParsedLine[] => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonMessages(item, messages));
    return messages;
  }

  if (!value || typeof value !== 'object') return messages;
  const record = value as Record<string, unknown>;
  const content = getFirstStringField(record, CONTENT_KEYS);
  const speaker = getFirstStringField(record, SPEAKER_KEYS);
  const direction = getSendDirection(record);
  if (content) {
    messages.push({
      speaker: speaker || UNKNOWN_SPEAKER,
      content,
      timestamp: normalizeTimestamp(TIME_KEYS.map((key) => record[key]).find(Boolean)),
      raw: content,
      direction,
    });
  }

  Object.entries(record).forEach(([key, nestedValue]) => {
    if ([...CONTENT_KEYS, ...SPEAKER_KEYS, ...TIME_KEYS, ...SEND_DIRECTION_KEYS].includes(key)) return;
    if (nestedValue && typeof nestedValue === 'object') collectJsonMessages(nestedValue, messages);
  });
  return messages;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
};

const parseCsvMessages = (raw: string): ParsedLine[] => {
  const rows = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
  if (rows.length < 2) return [];
  const headers = rows[0].map((item) => item.toLowerCase());
  const findIndex = (keys: string[]) =>
    headers.findIndex((header) => keys.some((key) => header.includes(key.toLowerCase())));
  const speakerIndex = findIndex([...SPEAKER_KEYS, '发送人', '说话人', '昵称']);
  const contentIndex = findIndex([...CONTENT_KEYS, '内容', '消息', '文本']);
  const timeIndex = findIndex([...TIME_KEYS, '时间', '日期']);
  const sendDirectionIndex = findIndex([...SEND_DIRECTION_KEYS, '是否发送', '发送方向', '方向']);
  if (contentIndex < 0) return [];

  return rows.slice(1).map((row) => ({
    speaker: row[speakerIndex] || UNKNOWN_SPEAKER,
    content: row[contentIndex] || '',
    timestamp: timeIndex >= 0 ? normalizeTimestamp(row[timeIndex]) : undefined,
    raw: row.join(','),
    direction: sendDirectionIndex >= 0 ? normalizeSendDirection(row[sendDirectionIndex]) : undefined,
  })).filter((line) => line.content && !SYSTEM_LINE_PATTERN.test(line.content));
};

const downloadText = (filename: string, text: string, type = 'application/json'): void => {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const extractJsonFromModelText = (text: string): unknown => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('invalid-model-json');
  }
};

const summarizeErrorMessage = (value: unknown): string => {
  const raw = value instanceof Error ? value.message : String(value || '');
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return '未知错误';
  return normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
};

const parseTextMessages = (input: string): ParsedLine[] => {
  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedLine[] = [];
  const linePattern =
    /^(?:(\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)\s+)?([^:：\]]{1,28})[:：]\s*(.+)$/;
  const bracketPattern =
    /^(?:\[(.+?)\]\s*)?([^:：\]]{1,28})[:：]\s*(.+)$/;
  const wechatExportPattern =
    /^([^:\s：]{1,28})\s+(\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)$/;

  lines.forEach((line) => {
    if (SYSTEM_LINE_PATTERN.test(line)) return;
    const match = line.match(linePattern) || line.match(bracketPattern);
    const wechatMatch = line.match(wechatExportPattern);
    if (wechatMatch) {
      const [, speakerText, dateText, contentText] = wechatMatch;
      parsed.push({
        speaker: speakerText.trim().replace(/^@/, ''),
        content: contentText.trim() || '',
        timestamp: normalizeTimestamp(dateText),
        raw: line,
      });
      return;
    }
    if (!match) {
      const last = parsed[parsed.length - 1];
      if (last) last.content = `${last.content}\n${line}`;
      return;
    }

    const [, dateText, speakerText, contentText] = match;
    const speaker = speakerText.trim().replace(/^@/, '');
    const timestamp = dateText ? Date.parse(dateText.replace(/\//g, '-')) : undefined;
    parsed.push({
      speaker,
      content: contentText.trim(),
      timestamp: Number.isFinite(timestamp) ? timestamp : undefined,
      raw: line,
    });
  });

  const normalizedParsed = parsed
    .map((line) => ({ ...line, content: line.content.trim() }))
    .filter((line) => line.content && !SYSTEM_LINE_PATTERN.test(line.content));
  if (normalizedParsed.length > 0) return normalizedParsed;

  return lines.slice(0, 80).map((line, index) => ({
    speaker: index % 2 === 0 ? '我' : FALLBACK_TARGET_NAME,
    content: line,
    raw: line,
  }));
};

const sortLinesByRecency = (lines: ParsedLine[]): ParsedLine[] =>
  lines
    .map((line, index) => ({ line, index }))
    .sort((left, right) => {
      const leftTime = left.line.timestamp;
      const rightTime = right.line.timestamp;
      if (typeof leftTime === 'number' && typeof rightTime === 'number') {
        return rightTime - leftTime || left.index - right.index;
      }
      if (typeof leftTime === 'number') return -1;
      if (typeof rightTime === 'number') return 1;
      return left.index - right.index;
    })
    .map((item) => item.line);

const parseImportedContent = (rawInput: string, fileName = ''): ParsedImport => {
  const fileKind = guessFileKind(fileName, rawInput);
  const textCandidateNames = extractCandidateNamesFromText(rawInput);
  if (fileKind === 'json') {
    try {
      const jsonValue = JSON.parse(rawInput);
      const messages = sortLinesByRecency(collectJsonMessages(jsonValue));
      const candidateNames = uniqueStrings([...collectProfileNamesFromJson(jsonValue), ...textCandidateNames], 12);
      if (messages.length) return { lines: messages, fileKind, sourceText: rawInput, candidateNames };
    } catch {
      return {
        lines: sortLinesByRecency(parseTextMessages(rawInput)),
        fileKind: 'text',
        sourceText: rawInput,
        candidateNames: textCandidateNames,
      };
    }
  }

  if (fileKind === 'csv') {
    const messages = sortLinesByRecency(parseCsvMessages(rawInput));
    if (messages.length) {
      const speakerNames = messages.map((line) => line.speaker).filter(isUsableTargetName);
      return {
        lines: messages,
        fileKind,
        sourceText: rawInput,
        candidateNames: uniqueStrings([...textCandidateNames, ...speakerNames], 12),
      };
    }
  }

  return {
    lines: sortLinesByRecency(parseTextMessages(rawInput)),
    fileKind,
    sourceText: rawInput,
    candidateNames: textCandidateNames,
  };
};

const getCounterpartyLines = (lines: ParsedLine[]): ParsedLine[] => {
  const receivedLines = lines.filter((line) => line.direction === 'received');
  return receivedLines.length > 0 ? receivedLines : lines;
};

const pickTargetSpeaker = (lines: ParsedLine[], candidateNames: string[] = []): string => {
  const counts = new Map<string, number>();
  getCounterpartyLines(lines).forEach((line) => {
    const speaker = normalizeCandidateName(line.speaker);
    if (!isUsableTargetName(speaker)) return;
    counts.set(speaker, (counts.get(speaker) || 0) + 1);
  });
  const [speaker] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] || [];
  return speaker || candidateNames.find(isUsableTargetName) || FALLBACK_TARGET_NAME;
};

const getTargetLines = (lines: ParsedLine[], targetName: string): ParsedLine[] => {
  const counterpartyLines = getCounterpartyLines(lines);
  const namedCounterpartyLines = counterpartyLines.filter((line) => line.speaker === targetName);
  if (namedCounterpartyLines.length > 0) return namedCounterpartyLines;
  if (counterpartyLines !== lines) return counterpartyLines;
  return lines.filter((line) => line.speaker === targetName);
};

const collectPersonaCandidates = (parsedImport: ParsedImport): ParsedPersonaCandidate[] => {
  const stats = new Map<string, ParsedPersonaCandidate>();
  const addCandidate = (name: string, line?: ParsedLine) => {
    const normalized = normalizeCandidateName(name);
    if (!isUsableTargetName(normalized)) return;
    const current = stats.get(normalized) || {
      name: normalized,
      messageCount: 0,
      receivedCount: 0,
      sentCount: 0,
    };
    if (line) {
      current.messageCount += 1;
      if (line.direction === 'received') current.receivedCount += 1;
      if (line.direction === 'sent') current.sentCount += 1;
    }
    stats.set(normalized, current);
  };

  parsedImport.lines.forEach((line) => addCandidate(line.speaker, line));
  parsedImport.candidateNames.forEach((name) => addCandidate(name));

  const candidates = [...stats.values()].sort((left, right) =>
    right.receivedCount - left.receivedCount
    || right.messageCount - left.messageCount
    || left.name.localeCompare(right.name, 'zh-CN')
  );
  return candidates.filter((candidate) => candidate.messageCount > 0);
};

const splitSentences = (contents: string[]): string[] =>
  contents
    .flatMap((content) => content.split(/[。！？!?；;\n]+/))
    .map((item) => item.trim())
    .filter((item) => item.length >= 4 && item.length <= 80);

const uniqueStrings = (items: string[], limit: number): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const normalized = item.trim().replace(/\s+/g, ' ');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result.slice(0, limit);
};

const collectKeywords = (texts: string[]): string[] => {
  const freq = new Map<string, number>();
  texts.forEach((text) => {
    const tokens: string[] = Array.from(
      text.matchAll(/[\u4e00-\u9fa5]{2,4}|[a-zA-Z]{3,}/g),
      (match) => match[0]
    );
    tokens.forEach((token) => {
      const normalized = token.toLowerCase();
      if (STOP_WORDS.has(normalized)) return;
      freq.set(normalized, (freq.get(normalized) || 0) + 1);
    });
  });
  return [...freq.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([word]) => word);
};

const inferTraits = (sentences: string[]): string[] => {
  const traits: string[] = [];
  const joined = sentences.join(' ');
  if (/哈哈|笑死|好玩|开心|快乐|乐|逗/.test(joined)) traits.push('表达轻快，常用玩笑、笑声或轻松词汇缓和气氛');
  if (/抱歉|不好意思|麻烦|谢谢|辛苦|打扰|拜托/.test(joined)) traits.push('礼貌感明显，会用感谢、道歉或缓冲表达照顾对方感受');
  if (/必须|一定|马上|现在|赶紧|快点|立刻/.test(joined)) traits.push('行动感较强，遇到明确任务时倾向快速推进');
  if (/担心|焦虑|害怕|难过|累|压力|崩溃|烦|慌/.test(joined)) traits.push('情绪表达比较外显，会直接提到压力、疲惫或担心');
  if (/计划|安排|日程|准备|确认|到时候|明天|今天|几点/.test(joined)) traits.push('重视安排和确认，常把事情落到时间、步骤或下一步');
  if (/随便|都行|看你|可以啊|没事|不用/.test(joined)) traits.push('关系中有顺应和配合倾向，常用低压力回应维持互动');
  if (/不行|别|不要|算了|不想|拒绝/.test(joined)) traits.push('边界表达较直接，会在不愿意时明确说不或收住话题');
  if (/救命|服了|绝了|裂开|麻了|绷不住/.test(joined)) traits.push('会用网络化夸张词表达情绪，语气有即时吐槽感');
  return traits.length ? traits : ['表达自然，具体性格需要继续以目标人物消息证据为准'];
};

const inferSpeechTraits = (targetLines: ParsedLine[]): string[] => {
  const contents = targetLines.map((line) => line.content).filter(Boolean);
  if (!contents.length) return [];
  const joined = contents.join('\n');
  const avgLength = contents.reduce((sum, item) => sum + item.length, 0) / contents.length;
  const shortRatio = contents.filter((item) => item.length <= 12).length / contents.length;
  const longRatio = contents.filter((item) => item.length >= 45).length / contents.length;
  const questionRatio = contents.filter((item) => /[？?]|吗|呢|怎么|为什么|啥|什么/.test(item)).length / contents.length;
  const emojiRatio = contents.filter((item) => /\[[^\]]{1,8}\]|[\u{1F300}-\u{1FAFF}]/u.test(item)).length / contents.length;
  const traits: string[] = [];
  if (avgLength <= 12 || shortRatio >= 0.55) traits.push('短句比例高，回复节奏快，常用一两句话完成回应');
  if (avgLength >= 40 || longRatio >= 0.28) traits.push('长句比例较高，表达时会补充原因、背景或心理过程');
  if (shortRatio >= 0.35 && longRatio >= 0.18) traits.push('句长变化明显，会在轻松短回和认真解释之间切换');
  if (/[~～]{1,}|呀|啦|嘛|呢|哦|哈/.test(joined)) traits.push('语气词明显，聊天口吻比书面表达更松弛');
  if (questionRatio >= 0.18) traits.push('追问和确认较多，会通过问题推进关系和信息交换');
  if (/[!！]{1,}|太好了|绝了|救命/.test(joined)) traits.push('情绪外放时会用感叹和夸张表达增强现场感');
  if (/(我觉得|我想|我怕|我以为|其实|可能)/.test(joined)) traits.push('会暴露主观判断和犹豫，内心活动比较可见');
  if (emojiRatio >= 0.08) traits.push('会使用表情或表情包增强语气，情绪表达更偏即时聊天');
  if (/(不是|就是|主要是|问题是|关键是|因为|所以)/.test(joined)) traits.push('解释事情时常用转折和因果词，倾向把逻辑补出来');
  if (/(算了|没事|不用|还好|可以|都行)/.test(joined)) traits.push('常用缓和式收尾，避免让对话压力继续升级');
  return traits;
};

const inferBackground = (sentences: string[], keywords: string[]): string => {
  const useful = sentences.filter((sentence) => /在|去|工作|学校|家|喜欢|经常|以前|最近/.test(sentence));
  const evidence = useful.slice(0, 4).join('；');
  return evidence || `聊天中高频关注：${keywords.slice(0, 6).join('、') || '日常关系、情绪和安排'}`;
};

const extractWorldBookEntries = (params: {
  lines: ParsedLine[];
  targetName: string;
  keywords: string[];
  personaContent: string;
  traits: string[];
  background: string;
}): WorldInfoEntry[] => {
  const { lines, targetName, keywords, personaContent, traits, background } = params;
  const targetSentences = splitSentences(getTargetLines(lines, targetName).map((line) => line.content));
  const sceneHints = uniqueStrings(
    targetSentences.filter((sentence) =>
      /早|晚|睡|醒|忙|累|吃|喝|回家|上班|上学|出门|见面|消息|电话|视频|安慰|撒娇|生气|压力|准备|安排|确认/.test(sentence)
    ),
    6
  );
  const commonScenes = sceneHints.length
    ? sceneHints.map((sentence) => `- ${sentence}`)
    : [
        '- 日常闲聊：保持导入记录里的称呼、句长、语气词和回应节奏。',
        '- 情绪安抚：先接住对方情绪，再给出简短真实的关心，不突然说教。',
        '- 事务沟通：按角色习惯确认时间、安排、边界和下一步。',
      ];

  return [{
    id: generateId('persona-worldbook'),
    name: `${targetName} / 人物世界书`,
    keywords: [targetName, '人物性格', '说话方式', '人物背景', '对话规则', ...keywords.slice(0, 6)],
    content: [
      '【核心性格画像】',
      traits.length ? traits.join('；') : '表达自然，关系回应以聊天上下文为准',
      '',
      '【说话方式】',
      '优先复现目标人物在导入记录里的句长、语气词、表情/标点、追问方式、玩笑方式、解释原因和缓和收尾习惯。',
      '回复时不要只复述事件，应让性格、口吻和情绪反应先出来。',
      '',
      '【人物背景】',
      background,
      '背景只用于支撑人物行为逻辑，不要把单个事件写成长期设定。',
      '',
      '【对话规则】',
      '回复时优先匹配目标人物的称呼习惯、语气节奏、情绪反应和边界表达；没有证据时保持不确定，不突然制造重大设定。',
      '具体事件、考试、答辩、一次性安排只作为语境证据，不要在世界书里反复强调事件关系。',
      '',
      '【常见场景】',
      commonScenes.join('\n'),
      '',
      '【关系边界】',
      '关系状态沿导入记录自然延续；除非证据明确，不主动提升亲密度、敌意、信任或依赖。',
    ].join('\n'),
    triggerMode: 'keyword',
    insertionOrder: 10,
    scope: 'character',
  }];
};

const extractDurableMemories = (lines: ParsedLine[], targetName: string): string[] => {
  const memories: string[] = [];
  const allSentences = lines.flatMap((line) =>
    splitSentences([line.content]).map((sentence) => ({ ...line, sentence }))
  );
  const memoryPattern =
    /我(?:叫|是|喜欢|讨厌|不喜欢|想要|希望|习惯|经常|住在|来自|在.+工作|在.+上学|决定|答应|约定|记得|不能|害怕|担心)/;
  const plotPattern = /我们|一起|上次|之前|后来|已经|正在|刚刚|决定|答应|约定|误会|吵架|和好|见面|分开|回家|上班|上学|任务|剧情/;

  allSentences.forEach(({ speaker, sentence, direction }) => {
    if ((direction === 'sent' || SELF_NAMES.has(speaker.toLowerCase())) && memoryPattern.test(sentence)) {
      memories.push(`用户信息：${sentence}`);
      return;
    }
    if ((speaker === targetName || direction === 'received') && memoryPattern.test(sentence)) {
      memories.push(`${targetName} 自述：${sentence}`);
      return;
    }
    if (plotPattern.test(sentence)) {
      memories.push(`剧情/关系进展：${speaker}：${sentence}`);
    }
  });

  if (memories.length === 0) {
    getCounterpartyLines(lines).slice(0, 16).forEach((line) => {
      memories.push(`聊天证据：${line.speaker}：${line.content}`);
    });
  }

  return uniqueStrings(memories, 40);
};

const buildModelExtractionPrompt = (params: {
  parsedImport: ParsedImport;
  targetName: string;
  localTraits: string[];
  localBackground: string;
  localKeywords: string[];
  localMemories: string[];
  lineLimit: number;
}): string => {
  const lineLimit = clampModelContextLineLimit(params.lineLimit);
  const compactLines = params.parsedImport.lines.slice(0, lineLimit).map((line, index) => ({
    index: index + 1,
    speaker: line.speaker,
    direction: line.direction || 'unknown',
    content: line.content,
    timestamp: line.timestamp,
  }));
  const targetLines = getTargetLines(params.parsedImport.lines, params.targetName).slice(0, lineLimit);
  const targetCompactLines = targetLines.map((line, index) => ({
    index: index + 1,
    speaker: line.speaker,
    direction: line.direction || 'unknown',
    content: line.content,
    timestamp: line.timestamp,
  }));

  return [
    renderPaperMagicText('persona.extract.profile'),
    '',
    '以下三段纸间魔法提示词必须共同参与本次人设生成：',
    '',
    '【生成人设-基本信息】',
    renderPaperMagicText('persona.skill.intakeBasicInfo', { name: params.targetName }),
    '',
    '【记忆生成】',
    renderPaperMagicText('persona.skill.memoriesGeneration', { name: params.targetName }),
    '',
    '【性格生成】',
    renderPaperMagicText('persona.skill.personalityGeneration', { name: params.targetName }),
    '',
    '如果存在 isSend 字段：isSend=1 是我发出的消息，isSend=0 是对方发来的消息。不要把我发出的内容当成目标人物的口吻。',
    'contact.name 必须优先使用 received 消息里的 speaker/senderDisplayName 或资料字段候选名；不要使用 sent 消息里的发送者姓名。',
    '人物性别不确定时，不要使用有性别指向的第三人称代词；除目标角色名外，避免写“和某某”这种具体人名关系，改用“和用户”“和对方”等概括表达。',
    '如果信息不足，请写“不确定”或保留开放；可以基于反复出现的措辞、语气和行为做轻量推断，但要让推断贴近证据。',
    '提取人物性格和说话方式时必须更精细：观察短句/长句比例、常用语气词、表情包、标点、追问方式、开玩笑方式、道歉感谢、拒绝边界、情绪词、解释原因的习惯。',
    '不要只写“开朗、温柔、幽默”这类泛泛标签；每条 traits/personality 都要体现“结论 + 具体语言证据或行为模式”。',
    '如果目标人物在不同场景下风格不同，要写出切换条件，例如“轻松时短句玩笑，认真时会补充原因”。',
    '',
    '概念定义：',
    '1. 人物信息：用于通讯录和 persona.md，必须偏重人物性格、人物背景、说话方式、情绪逻辑、关系边界和常见反应；不要把单个事件当成通讯录主描述。人物性别不确定时避免使用性别指向代词，具体人名改为"用户"来表达',
    '2. 世界书：只生成一份“人物世界书”，重点是核心性格画像、说话方式、人物背景、对话规则和常见场景。性格与口吻必须占主要篇幅。人物性别不确定时避免使用性别指向代词，具体人名改为"用户"来表达',
    '3. 记忆中心：长期记忆库。提取用户偏好、人物偏好、历史对话、关系变化、剧情进展、承诺、未完成事项，跨会话使用。人物性别不确定时避免使用性别指向代词，具体人名改为"用户"表达',
    '整体提取重点：人物性格、人物背景、说话方式、关系边界和常见互动模式。具体事件只作为证据，不要围绕同一事件重复提炼，也不要让事件关系覆盖人物性格刻画。人物性别不确定时避免使用性别指向代词，具体人名改为"用户"来表达',
    '',
    '输出要求：只输出 JSON，不要 Markdown，不要解释。',
    'JSON 结构如下：',
    JSON.stringify({
      contact: {
        name: '角色名',
        role: '一句话人物定位，偏性格/关系/说话习惯，不写单个事件',
        note: '来源和置信度说明，说明主要依据对方发言的说话方式和性格线索',
        description: '通讯录人物短描述，概括性格、关系、说话方式，不罗列具体事件，人物性别不确定时避免使用性别指向代词',
        greeting: '自然开场白，体现说话方式，简短',
        personality: '性格和说话风格，分号分隔；每项写成“特征 + 语言证据/行为模式”，避免泛泛标签和事件清单',
        background: '人物背景和关系边界，避免出现具体事件',
      },
      persona: {
        traits: ['可证据支持的行为/语气/情绪特征；每条要具体到句式、语气词、标点、表情、追问或边界表达，人物性别不确定时避免使用性别指向代词'],
        background: '更完整的人物背景和关系边界',
        greeting: '自然开场白',
        description: '通讯录展示描述',
      },
      worldBookEntries: [
        {
          name: '角色名 / 人物世界书',
          keywords: ['角色名', '人物性格', '说话方式', '人物背景', '对话规则'],
          content: '内容详细丰富，必须包含【核心性格画像】【说话方式】【人物背景】【对话规则】【关系边界】五部分；避免具体的人名，用"用户"这种概括性称呼;不对短期阶段性事件进行描述；人物性别不确定时避免使用性别指向代词',
          scope: 'character',
        },
      ],
      memories: ['长期记忆内容，每条一句话，包含偏好/关系/剧情进展/承诺等'],
    }),
    '',
    `文件类型：${params.parsedImport.fileKind}`,
    `解析消息总条数：${params.parsedImport.lines.length}`,
    `本次发送给主模型的消息条数：${compactLines.length}`,
    `目标角色候选：${params.targetName}`,
    `目标人物消息条数（接收方优先）：${targetCompactLines.length}`,
    `资料字段候选名：${params.parsedImport.candidateNames.join('、') || '暂无'}`,
    `注意：“${UNKNOWN_SPEAKER}”只是解析占位符，不是角色名；不要把它作为 contact.name。`,
    `本地初步关键词：${params.localKeywords.join('、') || '暂无'}（只作触发词参考，不要逐个扩写成世界书条目）`,
    `本地初步特征：${params.localTraits.join('；') || '暂无'}`,
    `本地初步背景：${params.localBackground}`,
    `本地初步记忆：${params.localMemories.slice(0, 20).join(' / ') || '暂无'}`,
    '',
    '目标人物消息 JSON（优先依据这一组提取人物性格、背景、说话方式）：',
    JSON.stringify(targetCompactLines),
    '',
    '导入聊天证据 JSON：',
    JSON.stringify(compactLines),
  ].join('\n');
};

const requestPersonaExtractionFromModel = async (params: {
  parsedImport: ParsedImport;
  targetName: string;
  localTraits: string[];
  localBackground: string;
  localKeywords: string[];
  localMemories: string[];
  lineLimit: number;
}): Promise<ModelGeneratedPersonaPayload> => {
  const settings = useSettingsCoreStore.getState().settings;
  const apiKey = (settings.apiKey || '').trim();
  const baseUrl = (settings.baseUrl || '').trim().replace(/\/+$/, '');
  const model = (settings.model || '').trim();
  if (!apiKey || !baseUrl || !model) {
    throw new Error('missing-chat-settings');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Math.min(0.9, Math.max(0.2, settings.temperature ?? 0.55)),
      max_tokens: Math.max(1800, settings.maxTokens || 3000),
      response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: renderPaperMagicText('persona.extract.system', {}, 'system'),
          },
        {
          role: 'user',
          content: buildModelExtractionPrompt(params),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`model-request-failed-${response.status}: ${summarizeErrorMessage(detail)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('empty-model-response');
  }

  const parsed = extractJsonFromModelText(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid-model-payload');
  }
  return parsed as ModelGeneratedPersonaPayload;
};

const buildGeneratedPersona = (
  rawInput: string,
  fileName = '',
  modelPayload?: ModelGeneratedPersonaPayload,
  selectedTargetName?: string
): GeneratedPersona => {
  const parsedImport = parseImportedContent(rawInput, fileName);
  const lines = parsedImport.lines;
  const targetName = isUsableTargetName(selectedTargetName)
    ? normalizeCandidateName(selectedTargetName)
    : pickTargetSpeaker(lines, parsedImport.candidateNames);
  const targetLines = getTargetLines(lines, targetName);
  const targetTexts = targetLines.map((line) => line.content);
  const allTexts = lines.map((line) => line.content);
  const sentences = splitSentences(targetTexts.length ? targetTexts : allTexts);
  const keywords = collectKeywords(targetTexts.length ? targetTexts : allTexts);
  const traits = uniqueStrings([...inferTraits(sentences), ...inferSpeechTraits(targetLines)], 10);
  const background = inferBackground(sentences, keywords);
  const durableMemories = extractDurableMemories(lines, targetName);
  const samples = uniqueStrings([...durableMemories, ...sentences], 32);
  const now = Date.now();
  const generatedAt = new Date(now).toISOString();
  const contactId = generateId('persona-contact');
  const worldBookId = generateId('persona-worldbook');
  const modelContact = modelPayload?.contact || {};
  const modelPersona = modelPayload?.persona || {};
  const modelName = normalizeText(modelContact.name);
  const generatedName = targetName !== FALLBACK_TARGET_NAME
    ? targetName
    : isUsableTargetName(modelName)
      ? modelName
      : FALLBACK_TARGET_NAME;
  const generatedTraits = uniqueStrings(
    [
      ...(Array.isArray(modelPersona.traits) ? modelPersona.traits.map(normalizeText) : []),
      ...traits,
    ],
    12
  );
  const generatedBackground = normalizeText(modelPersona.background)
    || normalizeText(modelContact.background)
    || background;
  const generatedMemories = uniqueStrings(
    [
      ...(Array.isArray(modelPayload?.memories) ? modelPayload.memories.map(normalizeText) : []),
      ...durableMemories,
    ],
    48
  );
  const traitSummary = generatedTraits.slice(0, 3).join('；') || '表达自然，互动方式以导入聊天证据为准';
  const backgroundSummary = generatedBackground || background;
  const personaDescription = `${traitSummary}。${backgroundSummary}`;
  const greetingSample = targetLines.find((line) => line.content.length >= 2 && line.content.length <= 36)?.content
    || samples.find((sample) => sample.length >= 2 && sample.length <= 36);
  const skill = renderPaperMagicPersonaSkillArtifacts({
    name: generatedName,
    generatedAt,
    parsedLines: lines.length,
    targetLines: targetLines.length,
    traits: generatedTraits,
    background: generatedBackground,
    keywords,
    samples: uniqueStrings([...generatedMemories, ...samples], 48),
  });

  const contact: GeneratedPersona['contact'] = {
    id: contactId,
    name: generatedName,
    role: normalizeText(modelContact.role) || '由聊天记录提取的人物画像',
    wechatRelation: 'friend',
    phone: normalizeText(modelContact.phone),
    note: normalizeText(modelContact.note) || '由人设生成器根据对方发言、性格线索和说话方式生成',
    description: normalizeText(modelPersona.description)
      || normalizeText(modelContact.description)
      || personaDescription,
    greeting: normalizeText(modelPersona.greeting)
      || normalizeText(modelContact.greeting)
      || greetingSample
      || `你好，我是${generatedName}。`,
    personality: normalizeText(modelContact.personality) || generatedTraits.join('；'),
    background: generatedBackground,
    worldBookId,
    createdAt: now,
  };

  const worldBookEntries = extractWorldBookEntries({
    lines,
    targetName: generatedName,
    keywords,
    personaContent: skill.persona,
    traits: generatedTraits,
    background: generatedBackground,
  }).map((entry, index) => (index === 0 ? { ...entry, id: worldBookId } : entry));
  const modelWorldBookEntry = Array.isArray(modelPayload?.worldBookEntries)
    ? modelPayload.worldBookEntries.find((entry) => normalizeText(entry.content))
    : undefined;
  const modelWorldBookContent = normalizeText(modelWorldBookEntry?.content);
  if (
    modelWorldBookEntry
    && /核心性格画像|性格与说话方式|说话方式|语言风格/.test(modelWorldBookContent)
  ) {
    const modelKeywords = Array.isArray(modelWorldBookEntry.keywords)
      ? uniqueStrings(modelWorldBookEntry.keywords.map(normalizeText), 8)
      : [];
    worldBookEntries[0] = {
      ...worldBookEntries[0],
      name: normalizeText(modelWorldBookEntry.name) || worldBookEntries[0].name,
      keywords: uniqueStrings([...worldBookEntries[0].keywords, ...modelKeywords], 12),
      content: modelWorldBookContent || worldBookEntries[0].content,
      scope: modelWorldBookEntry.scope === 'global' ? 'global' : 'character',
    };
  }

  const memoryRecords: AppMemoryRecord[] = generatedMemories.slice(0, 40).map((content, index) => ({
    id: generateId('memory-import'),
    appId: 'wechat',
    roleId: 'default-self',
    space: 'social',
    contactId,
    sessionId: `persona-generator-${contactId}`,
    sourceId: `import-line-${index + 1}`,
    sourceType: 'persona-import',
    role: 'assistant',
    content,
    timestamp: now - index * 1000,
  }));

  return {
    contact,
    worldBookEntries,
    memoryRecords,
    skill,
  };
};

const createPreviewRows = (result: GeneratedPersona | null) => {
  if (!result) return [];
  return [
    { label: '通讯录', value: `${result.contact.name} / ${result.contact.role}` },
    { label: '备忘录', value: `${result.worldBookEntries.length} 条世界书` },
    { label: '记忆中心', value: `${result.memoryRecords.length} 条历史记忆` },
    { label: 'skill', value: 'SKILL.md' },
  ];
};

export const PersonaGeneratorApp: React.FC<PersonaGeneratorAppProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<GeneratedPersona | null>(null);
  const [status, setStatus] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelLineLimit, setModelLineLimit] = useState(String(DEFAULT_MODEL_CONTEXT_LINE_LIMIT));
  const [selectedTargetName, setSelectedTargetName] = useState('');
  const importAppMemoryRecords = useAppMemoryCenterStore((state) => state.importAppMemoryRecords);
  const previewRows = useMemo(() => createPreviewRows(result), [result]);
  const parsedStats = useMemo(() => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      return {
        total: 0,
        modelLimit: clampModelContextLineLimit(Number(modelLineLimit)),
        modelLines: 0,
        candidates: [] as ParsedPersonaCandidate[],
      };
    }
    const parsedImport = parseImportedContent(trimmed, fileName);
    const modelLimit = clampModelContextLineLimit(Number(modelLineLimit));
    return {
      total: parsedImport.lines.length,
      modelLimit,
      modelLines: Math.min(parsedImport.lines.length, modelLimit),
      candidates: collectPersonaCandidates(parsedImport),
    };
  }, [fileName, modelLineLimit, sourceText]);
  const activeTargetName = selectedTargetName
    || parsedStats.candidates[0]?.name
    || FALLBACK_TARGET_NAME;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    setStatus('');
    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      setSourceText(text);
      setResult(null);
      setSelectedTargetName('');
      setStatus(`已导入 ${file.name}`);
    } catch {
      setStatus('文件读取失败，请换一个文本、JSON、Markdown 或 CSV 文件。');
    } finally {
      setIsReading(false);
      event.target.value = '';
    }
  };

  const handleGenerate = async () => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      setStatus('先导入或粘贴一段聊天记录。');
      return;
    }

    setIsGenerating(true);
    setStatus('正在调用主模型理解导入内容...');
    try {
      const lineLimit = clampModelContextLineLimit(Number(modelLineLimit));
      const parsedImport = parseImportedContent(trimmed, fileName);
      const targetName = isUsableTargetName(activeTargetName)
        ? normalizeCandidateName(activeTargetName)
        : pickTargetSpeaker(parsedImport.lines, parsedImport.candidateNames);
      const targetLines = getTargetLines(parsedImport.lines, targetName);
      const allTexts = parsedImport.lines.map((line) => line.content);
      const targetTexts = targetLines.map((line) => line.content);
      const sentences = splitSentences(targetTexts.length ? targetTexts : allTexts);
      const localKeywords = collectKeywords(targetTexts.length ? targetTexts : allTexts);
      const localTraits = uniqueStrings([...inferTraits(sentences), ...inferSpeechTraits(targetLines)], 10);
      const localBackground = inferBackground(sentences, localKeywords);
      const localMemories = extractDurableMemories(parsedImport.lines, targetName);
      const modelPayload = await requestPersonaExtractionFromModel({
        parsedImport,
        targetName,
        localTraits,
        localBackground,
        localKeywords,
        localMemories,
        lineLimit,
      });
      const next = buildGeneratedPersona(trimmed, fileName, modelPayload, targetName);
      setResult(next);
      setStatus(`已通过主模型生成 ${next.contact.name} 的人物信息、世界书和记忆中心。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setResult(null);
      if (message === 'missing-chat-settings') {
        setStatus('请先在设置里填写主模型 API Key、Base URL 和模型名。');
        return;
      }
      setStatus(`主模型调用失败（${summarizeErrorMessage(error)}），未生成人设。请检查模型配置或稍后重试。`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    const createdContact = addPersonaGeneratedContact(result.contact);
    result.worldBookEntries.forEach((entry) => {
      addPersonaGeneratedWorldBookEntry({
        name: entry.name,
        keywords: entry.keywords,
        content: entry.content,
        triggerMode: entry.triggerMode,
        insertionOrder: entry.insertionOrder,
        scope: entry.scope,
      });
    });
    importAppMemoryRecords(
      result.memoryRecords.map((record) => ({
        ...record,
        contactId: createdContact.id,
      }))
    );
    setStatus(`已写入通讯录、备忘录和记忆中心：${createdContact.name}`);
  };

  const handleDownload = (kind: 'all' | 'contacts' | 'worldbook' | 'memorycenter' | 'skill') => {
    if (!result) return;
    const base = sanitizeFileName(result.contact.name);
    const payloads = {
      contacts: {
        contacts: [result.contact],
      },
      worldbook: {
        worldBook: result.worldBookEntries,
      },
      memorycenter: {
        appMemoryRecords: result.memoryRecords,
      },
      skill: result.skill,
    };

    if (kind === 'all') {
      downloadText(
        `${base}-persona-export.json`,
        safeJson({
          version: 1,
          generatedAt: new Date().toISOString(),
          ...payloads,
        })
      );
      return;
    }

    downloadText(`${base}-${kind}.json`, safeJson(payloads[kind]));
  };

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className="absolute inset-0 z-50 bg-[#f7faf8] flex flex-col font-sans text-slate-800"
    >
      <div className="px-2 pt-12 pb-3 flex items-center bg-white/90 border-b border-slate-200 z-10">
        <button
          onClick={onClose}
          className="text-slate-600 flex items-center gap-1 active:scale-95 p-2 transition-transform"
          aria-label="返回"
        >
          <ChevronLeft size={28} />
          <span className="text-[17px] font-medium">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold pr-10">人设生成器</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold flex items-center gap-2">
                <FileInput size={18} className="text-teal-600" />
                导入聊天记录
              </div>
              <p className="text-[12px] text-slate-500 mt-1 leading-5 break-words">
                {fileName || '支持 txt、json、md、csv；也可以直接粘贴文本'}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-[92px] shrink-0 rounded-[8px] bg-slate-900 text-white text-[14px] font-medium flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
            >
              {isReading ? <Loader2 size={16} className="animate-spin" /> : <FileInput size={16} />}
              导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json,.md,.csv,.log"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <textarea
            value={sourceText}
            onChange={(event) => {
              setSourceText(event.target.value);
              setResult(null);
              setSelectedTargetName('');
            }}
            placeholder="示例：&#10;我: 今天有点累&#10;林夏: 那你先休息，我把晚点要说的事写下来。"
            className="mt-4 h-[220px] w-full resize-none overflow-y-scroll rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] leading-6 outline-none [scrollbar-color:#64748b_#e2e8f0] [scrollbar-gutter:stable] [scrollbar-width:auto] focus:border-teal-500 focus:bg-white [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-slate-200 [&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200"
          />
          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="min-w-0 text-[12px] leading-5 text-slate-600">
              <div>已解析消息：{parsedStats.total} 条</div>
            </div>
          </div>
          <div className="mt-3 rounded-[8px] border border-slate-200 bg-white px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-slate-700">目标人设</div>
              <div className="text-[11px] text-slate-500">当前：{activeTargetName}</div>
            </div>
            {parsedStats.candidates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {parsedStats.candidates.map((candidate) => {
                  const selected = activeTargetName === candidate.name;
                  return (
                    <button
                      key={candidate.name}
                      type="button"
                      onClick={() => {
                        setSelectedTargetName(candidate.name);
                        setResult(null);
                      }}
                      className={`shrink-0 rounded-[8px] border px-3 py-2 text-left active:scale-[0.98] ${
                        selected
                          ? 'border-teal-500 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-[13px] font-semibold">{candidate.name}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[8px] bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                导入或粘贴聊天记录后，会在这里显示可选择的人物。
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-600">
              <span>模型读取上下文信息条数</span>
              <label className="flex items-center gap-2 text-[12px] text-slate-500">
                上限
                <input
                  type="number"
                  min={MIN_MODEL_CONTEXT_LINE_LIMIT}
                  max={MAX_MODEL_CONTEXT_LINE_LIMIT}
                  step={100}
                  value={modelLineLimit}
                  onChange={(event) => setModelLineLimit(event.target.value)}
                  onBlur={() => setModelLineLimit(String(clampModelContextLineLimit(Number(modelLineLimit))))}
                  className="h-8 w-[86px] rounded-[8px] border border-slate-200 bg-white px-2 text-right text-[13px] font-medium text-slate-700 outline-none focus:border-teal-500"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="h-11 rounded-[8px] bg-teal-600 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-teal-300 disabled:active:scale-100"
          >
            {isGenerating ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
            {isGenerating ? '生成中' : '生成'}
          </button>
          <button
            onClick={handleApply}
            disabled={!result}
            className="h-11 rounded-[8px] bg-slate-900 text-white text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-slate-300 disabled:active:scale-100"
          >
            <Save size={17} />
            写入应用
          </button>
        </section>

        {status ? (
          <div className="rounded-[8px] border border-teal-100 bg-teal-50 px-3 py-2 text-[13px] text-teal-800">
            {status}
          </div>
        ) : null}

        <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <div className="text-[15px] font-semibold flex items-center gap-2">
            <Sparkles size={18} className="text-teal-600" />
            生成预览
          </div>
          <div className="mt-3 grid gap-2">
            {previewRows.length ? (
              previewRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 rounded-[8px] bg-slate-50 px-3 py-2">
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                  <span className="text-right text-[13px] font-medium text-slate-700">{row.value}</span>
                </div>
              ))
            ) : (
              <div className="rounded-[8px] bg-slate-50 px-3 py-8 text-center text-[13px] text-slate-500">
                生成后会在这里看到通讯录、备忘录、记忆中心和 skill 产物。
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <div className="text-[15px] font-semibold flex items-center gap-2">
            <Download size={18} className="text-teal-600" />
            导出 JSON
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { key: 'contacts', label: '通讯录', icon: ContactRound },
              { key: 'worldbook', label: '备忘录', icon: NotebookText },
              { key: 'memorycenter', label: '记忆中心', icon: Brain },
              { key: 'skill', label: 'skill', icon: FileJson },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleDownload(key as 'contacts' | 'worldbook' | 'memorycenter' | 'skill')}
                disabled={!result}
                className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-700 flex items-center justify-center gap-2 active:scale-[0.98] disabled:text-slate-300 disabled:active:scale-100"
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleDownload('all')}
            disabled={!result}
            className="mt-2 h-10 w-full rounded-[8px] border border-teal-200 bg-teal-50 text-[13px] font-semibold text-teal-800 flex items-center justify-center gap-2 active:scale-[0.98] disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:active:scale-100"
          >
            <Download size={16} />
            导出完整包
          </button>
        </section>

        {result ? (
          <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
            <div className="text-[15px] font-semibold">人物介绍</div>
            <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-[8px] bg-slate-950 p-3 text-[12px] leading-5 text-slate-100">
              {result.skill.persona}
            </pre>
          </section>
        ) : null}
      </div>
    </motion.div>
  );
};

export type { PersonaGeneratorAppProps };
