import React from 'react';
import {
  Camera,
  ChevronRight,
  Droplets,
  Flower2,
  Plus,
  Smile,
  Stethoscope,
  Thermometer,
  Weight,
} from 'lucide-react';
import type { DischargeOption } from '../discharge';
import type { MoodOption } from '../moods';
import { formatTemperatureValue } from '../temperature';
import { formatWeightRecordLabel } from '../weight';
import type { RecordItemType } from '../types';

interface RecordListSectionProps {
  selectedMood: MoodOption | null;
  selectedDischarge: DischargeOption | null;
  selectedTemperature: number | null;
  selectedWeight: number | null;
  diarySummary: string;
  stoolSummary: string;
  isSelectedPeriodStart: boolean;
  isSelectedPeriodEnd: boolean;
  symptomSummary: string;
  onOpenMoodPicker: () => void;
  onOpenDischargePicker: () => void;
  onOpenTemperaturePicker: () => void;
  onOpenWeightPicker: () => void;
  onOpenStoolPicker: () => void;
  onOpenDiaryEditor: () => void;
  onMarkPeriodStart: (enabled: boolean) => void;
  onMarkPeriodEnd: (enabled: boolean) => void;
  onOpenSymptomPicker: () => void;
}

interface RecordItemConfig {
  id: string;
  label: string;
  type: RecordItemType;
  iconBg: string;
  icon: React.ReactNode;
}

const RECORD_ITEMS: RecordItemConfig[] = [
  {
    id: 'period-start',
    label: '月经来了',
    type: 'period-start-toggle',
    iconBg: 'bg-[#ffe2ef]',
    icon: <Droplets size={18} className="text-[#f15995]" />,
  },
  {
    id: 'period-end',
    label: '月经走咯',
    type: 'period-end-toggle',
    iconBg: 'bg-[#ffe2ef]',
    icon: <Droplets size={18} className="text-[#f26ea2]" />,
  },
  {
    id: 'symptom',
    label: '症状',
    type: 'symptom',
    iconBg: 'bg-[#e7f6ff]',
    icon: <Stethoscope size={18} className="text-[#4bb8e8]" />,
  },
  {
    id: 'mood',
    label: '心情',
    type: 'mood',
    iconBg: 'bg-[#fff3d8]',
    icon: <Smile size={18} className="text-[#f2b326]" />,
  },
  {
    id: 'discharge',
    label: '白带',
    type: 'discharge',
    iconBg: 'bg-[#f0e8ff]',
    icon: <Flower2 size={18} className="text-[#a56ae4]" />,
  },
  {
    id: 'temperature',
    label: '体温',
    type: 'temperature',
    iconBg: 'bg-[#f1e8ff]',
    icon: <Thermometer size={18} className="text-[#9d6ce2]" />,
  },
  {
    id: 'weight',
    label: '体重',
    type: 'weight',
    iconBg: 'bg-[#f1e8ff]',
    icon: <Weight size={18} className="text-[#9d6ce2]" />,
  },
  { id: 'diary', label: '日记', type: 'diary', iconBg: 'bg-[#fff1da]', icon: <span className="text-[15px]">📝</span> },
  { id: 'stool', label: '便便', type: 'stool', iconBg: 'bg-[#fff1d4]', icon: <span className="text-[15px]">💩</span> },
];

export const RecordListSection: React.FC<RecordListSectionProps> = ({
  selectedMood,
  selectedDischarge,
  selectedTemperature,
  selectedWeight,
  diarySummary,
  stoolSummary,
  isSelectedPeriodStart,
  isSelectedPeriodEnd,
  symptomSummary,
  onOpenMoodPicker,
  onOpenDischargePicker,
  onOpenTemperaturePicker,
  onOpenWeightPicker,
  onOpenStoolPicker,
  onOpenDiaryEditor,
  onMarkPeriodStart,
  onMarkPeriodEnd,
  onOpenSymptomPicker,
}) => (
  <section className="mx-3 mt-2 rounded-[26px] bg-white border border-rose-100/70 overflow-hidden">
    {RECORD_ITEMS.map((item, index) => (
      <div key={item.id} className={`px-4 py-3 flex items-center gap-3 ${index !== 0 ? 'border-t border-slate-100' : ''}`}>
        <span className={`w-8 h-8 rounded-full grid place-items-center ${item.iconBg}`}>{item.icon}</span>
        <span className="text-[17px] font-medium text-slate-900">{item.label}</span>

        <div className="ml-auto flex items-center gap-2">
          {item.type === 'symptom' ? (
            <>
              {symptomSummary ? (
                <button
                  type="button"
                  onClick={onOpenSymptomPicker}
                  className="max-w-[180px] truncate text-[14px] text-[#ea5c99] active:opacity-80"
                >
                  {symptomSummary}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSymptomPicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'period-start-toggle' ? (
            <div className="h-10 rounded-xl border border-slate-200 overflow-hidden inline-flex">
              <button
                type="button"
                onClick={() => onMarkPeriodStart(true)}
                className={`w-12 text-[14px] font-semibold ${
                  isSelectedPeriodStart ? 'bg-[#f24f8f] text-white' : 'bg-[#f5f5f7] text-slate-300'
                }`}
              >
                是
              </button>
              <button
                type="button"
                onClick={() => onMarkPeriodStart(false)}
                className={`w-12 text-[14px] font-semibold ${
                  !isSelectedPeriodStart ? 'bg-[#f24f8f] text-white' : 'bg-[#f5f5f7] text-slate-300'
                }`}
              >
                否
              </button>
            </div>
          ) : null}

          {item.type === 'period-end-toggle' ? (
            <div className="h-10 rounded-xl border border-slate-200 overflow-hidden inline-flex">
              <button
                type="button"
                onClick={() => onMarkPeriodEnd(true)}
                className={`w-12 text-[14px] font-semibold ${
                  isSelectedPeriodEnd ? 'bg-[#f24f8f] text-white' : 'bg-[#f5f5f7] text-slate-300'
                }`}
              >
                是
              </button>
              <button
                type="button"
                onClick={() => onMarkPeriodEnd(false)}
                className={`w-12 text-[14px] font-semibold ${
                  !isSelectedPeriodEnd ? 'bg-[#f24f8f] text-white' : 'bg-[#f5f5f7] text-slate-300'
                }`}
              >
                否
              </button>
            </div>
          ) : null}

          {item.type === 'mood' ? (
            <>
              {selectedMood ? (
                <button
                  type="button"
                  onClick={onOpenMoodPicker}
                  className="max-w-[180px] h-9 pl-2 pr-3 rounded-full border border-rose-200 bg-rose-50 text-[#e95493] flex items-center gap-1.5 active:opacity-80"
                >
                  <span className="text-[18px] leading-none">{selectedMood.icon}</span>
                  <span className="truncate text-[13px] font-medium">{selectedMood.label}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenMoodPicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'discharge' ? (
            <>
              {selectedDischarge ? (
                <button
                  type="button"
                  onClick={onOpenDischargePicker}
                  className="max-w-[180px] truncate text-[14px] text-[#ea5c99] active:opacity-80"
                >
                  {selectedDischarge.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenDischargePicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'temperature' ? (
            <>
              {selectedTemperature !== null ? (
                <button
                  type="button"
                  onClick={onOpenTemperaturePicker}
                  className="max-w-[180px] truncate text-[14px] text-[#ea5c99] active:opacity-80"
                >
                  {formatTemperatureValue(selectedTemperature)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenTemperaturePicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'weight' ? (
            <>
              {selectedWeight !== null ? (
                <button
                  type="button"
                  onClick={onOpenWeightPicker}
                  className="max-w-[180px] truncate text-[14px] text-[#ea5c99] active:opacity-80"
                >
                  {formatWeightRecordLabel(selectedWeight)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenWeightPicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'diary' ? (
            <button type="button" onClick={onOpenDiaryEditor} className="inline-flex items-center gap-2 active:opacity-80">
              {diarySummary ? <span className="max-w-[180px] truncate text-[14px] text-[#ea5c99]">{diarySummary}</span> : <Camera size={20} className="text-slate-300" />}
              <ChevronRight size={20} className="text-slate-300" />
            </button>
          ) : null}

          {item.type === 'stool' ? (
            <>
              {stoolSummary ? (
                <button
                  type="button"
                  onClick={onOpenStoolPicker}
                  className="max-w-[180px] truncate text-[14px] text-[#ea5c99] active:opacity-80"
                >
                  {stoolSummary}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenStoolPicker}
                  className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
                >
                  <Plus size={20} />
                </button>
              )}
            </>
          ) : null}

          {item.type === 'habit' ? (
            <div className="flex items-center gap-2">
              {['🥤', '🍎', '☕', '🏐'].map((habit) => (
                <span key={habit} className="w-8 h-8 rounded-full bg-slate-100 text-slate-300 grid place-items-center text-[15px]">
                  {habit}
                </span>
              ))}
            </div>
          ) : null}

          {item.type === 'plus' ? (
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-[#f07ba9] text-[#f04d8f] grid place-items-center"
            >
              <Plus size={20} />
            </button>
          ) : null}
        </div>
      </div>
    ))}
  </section>
);
