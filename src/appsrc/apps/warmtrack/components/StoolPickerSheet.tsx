import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  buildDefaultStoolRecord,
  normalizeStoolRecord,
  STOOL_AMOUNT_OPTIONS,
  STOOL_DURATION_OPTIONS,
  STOOL_FEELING_OPTIONS,
  STOOL_SHAPE_OPTIONS,
} from '../stool';
import type { StoolRecord } from '../types';
import { WARMTRACK_FONT_STACK } from '../utils';

interface StoolPickerSheetProps {
  selectedRecord: StoolRecord | null;
  onCancel: () => void;
  onConfirm: (record: StoolRecord) => void;
}

const padTwo = (value: number): string => value.toString().padStart(2, '0');

const toCyclicValue = (value: number, max: number, offset: number): number => {
  let next = value + offset;
  while (next < 0) next += max;
  while (next >= max) next -= max;
  return next;
};

const TimeWheelColumn: React.FC<{
  value: number;
  max: number;
  onChange: (next: number) => void;
}> = ({ value, max, onChange }) => (
  <div className="relative w-full">
    <span className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-12 rounded-xl bg-slate-100 border border-slate-200" />
    <div className="relative py-2">
      {[-2, -1, 0, 1, 2].map((offset) => {
        const displayValue = toCyclicValue(value, max, offset);
        const isCenter = offset === 0;
        return (
          <button
            key={`${offset}-${displayValue}`}
            type="button"
            onClick={() => onChange(displayValue)}
            className={`h-10 w-full text-center tabular-nums transition-colors ${
              isCenter ? 'text-[22px] font-semibold text-slate-900' : 'text-[16px] text-slate-400'
            }`}
          >
            {padTwo(displayValue)}
          </button>
        );
      })}
    </div>
  </div>
);

const renderOptionCircle = (icon: string, selected: boolean, mode: 'yellow' | 'blue' = 'yellow') => {
  const normalClass = mode === 'blue' ? 'bg-gradient-to-br from-[#dff3ff] to-[#c6e9ff]' : 'bg-gradient-to-br from-[#fff8e9] to-[#fff2d8]';
  const selectedClass = mode === 'blue' ? 'bg-gradient-to-br from-[#90d5ff] to-[#66befa]' : 'bg-gradient-to-br from-[#ffd780] to-[#f7c14a]';
  return (
    <span
      className={`w-[62px] h-[62px] rounded-full grid place-items-center text-[30px] ${
        selected ? `${selectedClass} shadow-[0_10px_18px_-12px_rgba(244,170,61,0.65)]` : normalClass
      }`}
    >
      {icon}
    </span>
  );
};

export const StoolPickerSheet: React.FC<StoolPickerSheetProps> = ({ selectedRecord, onCancel, onConfirm }) => {
  const [draftRecord, setDraftRecord] = useState<StoolRecord>(() =>
    normalizeStoolRecord(selectedRecord ?? buildDefaultStoolRecord())
  );
  const [isDetailOpen, setIsDetailOpen] = useState(true);

  const handleConfirm = () => {
    onConfirm(normalizeStoolRecord(draftRecord));
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[#efeff2] pt-12 flex flex-col" style={{ fontFamily: WARMTRACK_FONT_STACK }}>
      <header className="h-14 rounded-t-3xl bg-white px-4 flex items-center">
        <button type="button" onClick={onCancel} className="text-[16px] text-slate-700 active:opacity-70">
          取消
        </button>
        <h2 className="flex-1 text-center text-[20px] font-semibold text-slate-900">便便</h2>
        <button type="button" onClick={handleConfirm} className="text-[16px] font-semibold text-[#f24f8f] active:opacity-70">
          确定
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <section className="mt-3 rounded-3xl bg-white px-3 py-4">
          <h3 className="text-[19px] font-semibold text-slate-900">排便感受</h3>
          <div className="mt-3 grid grid-cols-3 gap-y-4">
            {STOOL_FEELING_OPTIONS.map((item) => {
              const selected = draftRecord.feelingId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setDraftRecord((current) => ({
                      ...current,
                      feelingId: current.feelingId === item.id ? null : item.id,
                    }))
                  }
                  className="flex flex-col items-center text-center active:scale-95 transition-transform"
                >
                  {renderOptionCircle(item.icon, selected)}
                  <span className={`mt-2 text-[14px] ${selected ? 'text-[#e95493] font-medium' : 'text-slate-800'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 rounded-3xl bg-white px-3 py-4">
          <h3 className="text-[19px] font-semibold text-slate-900">时间</h3>
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 px-2 py-2 grid grid-cols-[1fr_auto_1fr] items-center">
            <TimeWheelColumn
              value={draftRecord.hour}
              max={24}
              onChange={(hour) => setDraftRecord((current) => ({ ...current, hour }))}
            />
            <span className="text-[22px] font-medium text-slate-700 px-2">:</span>
            <TimeWheelColumn
              value={draftRecord.minute}
              max={60}
              onChange={(minute) => setDraftRecord((current) => ({ ...current, minute }))}
            />
          </div>
          <p className="mt-2 text-center text-[12px] text-slate-400">
            当前时间：{padTwo(draftRecord.hour)}:{padTwo(draftRecord.minute)}
          </p>
        </section>

        <section className="mt-3 rounded-3xl bg-white px-3 py-4">
          <button
            type="button"
            onClick={() => setIsDetailOpen((current) => !current)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-[19px] font-semibold text-slate-900">形状、便便量、用时</h3>
            {isDetailOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {isDetailOpen ? (
            <div className="mt-4 space-y-5">
              <section>
                <h4 className="text-[16px] font-semibold text-slate-900">形状</h4>
                <div className="mt-3 grid grid-cols-4 gap-y-4">
                  {STOOL_SHAPE_OPTIONS.map((item) => {
                    const selected = draftRecord.shapeId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setDraftRecord((current) => ({
                            ...current,
                            shapeId: current.shapeId === item.id ? null : item.id,
                          }))
                        }
                        className="flex flex-col items-center text-center active:scale-95 transition-transform"
                      >
                        {renderOptionCircle(item.icon, selected)}
                        <span className={`mt-2 text-[14px] leading-tight ${selected ? 'text-[#e95493] font-medium' : 'text-slate-800'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h4 className="text-[16px] font-semibold text-slate-900">便便量</h4>
                <div className="mt-3 grid grid-cols-4 gap-y-4">
                  {STOOL_AMOUNT_OPTIONS.map((item) => {
                    const selected = draftRecord.amountId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setDraftRecord((current) => ({
                            ...current,
                            amountId: current.amountId === item.id ? null : item.id,
                          }))
                        }
                        className="flex flex-col items-center text-center active:scale-95 transition-transform"
                      >
                        {renderOptionCircle(item.icon, selected)}
                        <span className={`mt-2 text-[14px] ${selected ? 'text-[#e95493] font-medium' : 'text-slate-800'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h4 className="text-[16px] font-semibold text-slate-900">用时</h4>
                <div className="mt-3 grid grid-cols-4 gap-y-4">
                  {STOOL_DURATION_OPTIONS.map((item) => {
                    const selected = draftRecord.durationId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setDraftRecord((current) => ({
                            ...current,
                            durationId: current.durationId === item.id ? null : item.id,
                          }))
                        }
                        className="flex flex-col items-center text-center active:scale-95 transition-transform"
                      >
                        {renderOptionCircle(item.icon, selected, 'blue')}
                        <span className={`mt-2 text-[14px] leading-tight ${selected ? 'text-[#e95493] font-medium' : 'text-slate-800'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};
