export interface DischargeOption {
  id: string;
  label: string;
  description: string;
  iconType: 'dry' | 'sticky' | 'mushy' | 'watery' | 'eggwhite';
}

export const DEFAULT_DISCHARGE_OPTIONS: DischargeOption[] = [
  {
    id: 'discharge-dry',
    label: '干燥',
    description: '内裤干爽，分泌物量少，无水分',
    iconType: 'dry',
  },
  {
    id: 'discharge-sticky',
    label: '粘稠',
    description: '分泌物稠厚，触感像胶状物',
    iconType: 'sticky',
  },
  {
    id: 'discharge-mushy',
    label: '稀糊状',
    description: '含水量偏多偏黄色，触感像乳液',
    iconType: 'mushy',
  },
  {
    id: 'discharge-watery',
    label: '水状',
    description: '呈白色或透明，触感似水滴',
    iconType: 'watery',
  },
  {
    id: 'discharge-eggwhite',
    label: '蛋清状',
    description: '呈透明状，两指间可拉丝',
    iconType: 'eggwhite',
  },
];

const DISCHARGE_MAP: Record<string, DischargeOption> = {};
DEFAULT_DISCHARGE_OPTIONS.forEach((option) => {
  DISCHARGE_MAP[option.id] = option;
});

export const getDischargeOptionById = (dischargeId: string | null | undefined): DischargeOption | null => {
  if (!dischargeId) return null;
  return DISCHARGE_MAP[dischargeId] ?? null;
};

export const isValidDischargeId = (value: string): boolean => Boolean(DISCHARGE_MAP[value]);
