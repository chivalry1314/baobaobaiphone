export interface MoodOption {
  id: string;
  label: string;
  icon: string;
}

export const DEFAULT_MOOD_OPTIONS: MoodOption[] = [
  { id: 'mood-super-happy', label: '超开心', icon: '😆' },
  { id: 'mood-happy', label: '挺开心', icon: '😄' },
  { id: 'mood-neutral', label: '一般', icon: '😐' },
  { id: 'mood-unhappy', label: '不开心', icon: '🙁' },
  { id: 'mood-sad', label: '好伤心', icon: '😭' },
  { id: 'mood-excited', label: '兴奋', icon: '🤩' },
  { id: 'mood-surprised', label: '惊喜', icon: '😮' },
  { id: 'mood-satisfied', label: '满足', icon: '😊' },
  { id: 'mood-heartbeat', label: '心动', icon: '😍' },
  { id: 'mood-confident', label: '自信', icon: '😎' },
  { id: 'mood-relaxed', label: '放松', icon: '😌' },
  { id: 'mood-calm', label: '平静', icon: '😶‍🌫️' },
  { id: 'mood-irritated', label: '烦躁', icon: '😣' },
  { id: 'mood-angry-easy', label: '易怒', icon: '😤' },
  { id: 'mood-angry', label: '生气', icon: '😡' },
  { id: 'mood-anxious', label: '焦虑', icon: '😰' },
  { id: 'mood-drained', label: '内耗', icon: '🥺' },
  { id: 'mood-stressed', label: '压力', icon: '😓' },
  { id: 'mood-afraid', label: '害怕', icon: '😨' },
  { id: 'mood-cold', label: '冷漠', icon: '🥶' },
];

const MOOD_MAP: Record<string, MoodOption> = {};
DEFAULT_MOOD_OPTIONS.forEach((option) => {
  MOOD_MAP[option.id] = option;
});

export const getMoodOptionById = (moodId: string | null | undefined): MoodOption | null => {
  if (!moodId) return null;
  return MOOD_MAP[moodId] ?? null;
};

export const isValidMoodId = (value: string): boolean => Boolean(MOOD_MAP[value]);
