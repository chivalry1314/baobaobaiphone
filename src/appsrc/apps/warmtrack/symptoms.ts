export interface SymptomOption {
  id: string;
  label: string;
  icon: string;
}

export interface SymptomSection {
  id: string;
  title: string;
  symptoms: SymptomOption[];
}

const BODY_SYMPTOMS: SymptomOption[] = [
  { id: 'body-backache', label: '腰酸', icon: '🩷' },
  { id: 'body-cramp', label: '腹痛', icon: '⚡' },
  { id: 'body-bloating', label: '小腹坠胀', icon: '❗' },
  { id: 'body-breast-pain', label: '乳房胀痛', icon: '🫧' },
  { id: 'body-ache', label: '身体酸痛', icon: '🩹' },
  { id: 'body-headache', label: '头痛', icon: '💥' },
  { id: 'body-dizzy', label: '眩晕', icon: '🌀' },
  { id: 'body-insomnia', label: '失眠', icon: '🥱' },
  { id: 'body-acne', label: '粉刺', icon: '🫥' },
  { id: 'body-dry-skin', label: '皮肤干燥', icon: '🪞' },
  { id: 'body-low-appetite', label: '食欲不振', icon: '🙁' },
  { id: 'body-high-appetite', label: '食欲旺盛', icon: '😋' },
  { id: 'body-cold-drink', label: '贪冷饮', icon: '🧊' },
  { id: 'body-diarrhea', label: '腹泻', icon: '🧻' },
  { id: 'body-constipation', label: '便秘', icon: '🧱' },
  { id: 'body-fatigue', label: '疲惫', icon: '😮‍💨' },
];

const DISCHARGE_SYMPTOMS: SymptomOption[] = [
  { id: 'discharge-brown', label: '褐色分泌物', icon: '🟤' },
  { id: 'discharge-blood', label: '出血', icon: '🩸' },
  { id: 'discharge-clots', label: '有血块', icon: '🫧' },
  { id: 'discharge-more', label: '白带增多', icon: '⚪' },
];

export const DEFAULT_SYMPTOM_SECTIONS: SymptomSection[] = [
  { id: 'body', title: '身体症状', symptoms: BODY_SYMPTOMS },
  { id: 'discharge', title: '阴道分泌物', symptoms: DISCHARGE_SYMPTOMS },
];

const DEFAULT_SYMPTOM_MAP: Record<string, string> = {};
DEFAULT_SYMPTOM_SECTIONS.forEach((section) => {
  section.symptoms.forEach((symptom) => {
    DEFAULT_SYMPTOM_MAP[symptom.id] = symptom.label;
  });
});

const buildCustomSymptomId = (label: string, index: number): string => `custom-${index}-${label}`;

export const getSymptomLabelMap = (customSymptoms: string[]): Record<string, string> => {
  const map = { ...DEFAULT_SYMPTOM_MAP };
  customSymptoms.forEach((item, index) => {
    map[buildCustomSymptomId(item, index)] = item;
  });
  return map;
};

export const buildCustomSymptomOption = (label: string, index: number, icon?: string): SymptomOption => ({
  id: buildCustomSymptomId(label, index),
  label,
  icon: icon?.trim().startsWith('data:image/') ? icon : '✨',
});

export const normalizeCustomSymptomIconMap = (
  customSymptoms: string[],
  iconMap: Record<string, string>
): Record<string, string> => {
  const normalizedSymptoms = normalizeSymptomList(customSymptoms);
  const next: Record<string, string> = {};

  normalizedSymptoms.forEach((label) => {
    const maybeIcon = iconMap[label];
    if (typeof maybeIcon !== 'string') return;
    const normalizedIcon = maybeIcon.trim();
    if (!normalizedIcon.startsWith('data:image/')) return;
    next[label] = normalizedIcon;
  });

  return next;
};

const buildCustomSymptomLookup = (customSymptoms: string[]): Map<string, string> => {
  const lookup = new Map<string, string>();
  normalizeSymptomList(customSymptoms).forEach((label, index) => {
    lookup.set(buildCustomSymptomId(label, index), label);
  });
  return lookup;
};

export const remapSymptomIdsForCustomChange = (
  symptomIds: string[],
  previousCustomSymptoms: string[],
  nextCustomSymptoms: string[]
): string[] => {
  const previousLookup = buildCustomSymptomLookup(previousCustomSymptoms);
  const nextIdByLabel = new Map<string, string>();
  normalizeSymptomList(nextCustomSymptoms).forEach((label, index) => {
    nextIdByLabel.set(label, buildCustomSymptomId(label, index));
  });

  const remapped = symptomIds.flatMap((symptomId) => {
    const normalizedId = symptomId.trim();
    if (!normalizedId) return [];

    const customLabel = previousLookup.get(normalizedId);
    if (customLabel) {
      const nextId = nextIdByLabel.get(customLabel);
      return nextId ? [nextId] : [];
    }

    if (normalizedId.startsWith('custom-')) return [];
    return [normalizedId];
  });

  return normalizeSymptomIds(remapped);
};

export const normalizeSymptomList = (input: string[]): string[] => {
  const next: string[] = [];
  input.forEach((item) => {
    const normalized = item.trim();
    if (!normalized) return;
    if (next.includes(normalized)) return;
    next.push(normalized);
  });
  return next;
};

export const normalizeSymptomIds = (input: string[]): string[] => {
  const next: string[] = [];
  input.forEach((item) => {
    const normalized = item.trim();
    if (!normalized) return;
    if (next.includes(normalized)) return;
    next.push(normalized);
  });
  return next;
};

export const buildSymptomSummary = (symptomIds: string[], labelMap: Record<string, string>): string => {
  const labels = symptomIds.map((id) => labelMap[id]).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}、${labels[1]}`;
  return `${labels[0]}、${labels[1]}、...共${labels.length}种`;
};
