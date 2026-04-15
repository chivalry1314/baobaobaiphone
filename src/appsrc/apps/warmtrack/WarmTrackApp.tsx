import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookText, ChevronLeft, ClipboardList } from 'lucide-react';
import { APP_CLOSE_MOTION, APP_OPEN_MOTION } from '../../../core/appOpenMotion';
import { useActiveRoleId } from '../contacts/activeRole';
import {
  CalendarSection,
  DiaryListSection,
  DiaryEditorSheet,
  DischargePickerSheet,
  MoodPickerSheet,
  RecordListSection,
  StoolPickerSheet,
  SymptomPickerSheet,
  TemperaturePickerSheet,
  WeightPickerSheet,
} from './components';
import { buildDiarySummary } from './diary';
import { getDischargeOptionById } from './discharge';
import { getMoodOptionById } from './moods';
import { buildPredictionDaySets, buildPredictionModel } from './prediction';
import { buildStoolSummary } from './stool';
import { buildSymptomSummary, getSymptomLabelMap } from './symptoms';
import { useWarmTrackStore } from './store';
import {
  WARMTRACK_FONT_STACK,
  buildMonthCells,
  chunkCells,
  formatMonthLabel,
  getTodayDateKey,
} from './utils';

interface WarmTrackAppProps {
  onClose: () => void;
}

type WarmTrackTab = 'record' | 'diary';

export const WarmTrackApp: React.FC<WarmTrackAppProps> = ({ onClose }) => {
  const activeRoleId = useActiveRoleId();
  const syncWarmTrackRoleContext = useWarmTrackStore((state) => state.syncWarmTrackRoleContext);
  const periodRanges = useWarmTrackStore((state) => state.periodRanges);
  const symptomRecords = useWarmTrackStore((state) => state.symptomRecords);
  const moodRecords = useWarmTrackStore((state) => state.moodRecords);
  const dischargeRecords = useWarmTrackStore((state) => state.dischargeRecords);
  const stoolRecords = useWarmTrackStore((state) => state.stoolRecords);
  const temperatureRecords = useWarmTrackStore((state) => state.temperatureRecords);
  const weightRecords = useWarmTrackStore((state) => state.weightRecords);
  const diaryRecords = useWarmTrackStore((state) => state.diaryRecords);
  const customSymptoms = useWarmTrackStore((state) => state.customSymptoms);
  const customSymptomIcons = useWarmTrackStore((state) => state.customSymptomIcons);
  const selectedDateKey = useWarmTrackStore((state) => state.selectedDateKey);
  const monthCursorKey = useWarmTrackStore((state) => state.monthCursorKey);
  const setSelectedDateKey = useWarmTrackStore((state) => state.setSelectedDateKey);
  const switchMonth = useWarmTrackStore((state) => state.switchMonth);
  const setMoodForDate = useWarmTrackStore((state) => state.setMoodForDate);
  const setDischargeForDate = useWarmTrackStore((state) => state.setDischargeForDate);
  const setStoolForDate = useWarmTrackStore((state) => state.setStoolForDate);
  const setTemperatureForDate = useWarmTrackStore((state) => state.setTemperatureForDate);
  const setWeightForDate = useWarmTrackStore((state) => state.setWeightForDate);
  const setDiaryForDate = useWarmTrackStore((state) => state.setDiaryForDate);
  const setSymptomsForDate = useWarmTrackStore((state) => state.setSymptomsForDate);
  const setCustomSymptoms = useWarmTrackStore((state) => state.setCustomSymptoms);
  const markPeriodStart = useWarmTrackStore((state) => state.markPeriodStart);
  const markPeriodEnd = useWarmTrackStore((state) => state.markPeriodEnd);
  const [isSymptomPickerOpen, setIsSymptomPickerOpen] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [isDischargePickerOpen, setIsDischargePickerOpen] = useState(false);
  const [isStoolPickerOpen, setIsStoolPickerOpen] = useState(false);
  const [isTemperaturePickerOpen, setIsTemperaturePickerOpen] = useState(false);
  const [isWeightPickerOpen, setIsWeightPickerOpen] = useState(false);
  const [diaryEditorDateKey, setDiaryEditorDateKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WarmTrackTab>('record');

  useEffect(() => {
    syncWarmTrackRoleContext();
  }, [activeRoleId, syncWarmTrackRoleContext]);

  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const predictionModel = useMemo(() => buildPredictionModel(periodRanges), [periodRanges]);
  const predictionDaySets = useMemo(() => buildPredictionDaySets(predictionModel), [predictionModel]);
  const monthCells = useMemo(
    () =>
      buildMonthCells({
        monthCursorKey,
        selectedDateKey,
        todayDateKey,
        periodRanges,
        predictionDaySets,
      }),
    [monthCursorKey, selectedDateKey, todayDateKey, periodRanges, predictionDaySets]
  );
  const selectedMoodId = useMemo(() => moodRecords[selectedDateKey] ?? null, [moodRecords, selectedDateKey]);
  const selectedMood = useMemo(() => getMoodOptionById(selectedMoodId), [selectedMoodId]);
  const selectedDischargeId = useMemo(() => dischargeRecords[selectedDateKey] ?? null, [dischargeRecords, selectedDateKey]);
  const selectedDischarge = useMemo(() => getDischargeOptionById(selectedDischargeId), [selectedDischargeId]);
  const selectedStoolRecord = useMemo(() => stoolRecords[selectedDateKey] ?? null, [stoolRecords, selectedDateKey]);
  const stoolSummary = useMemo(() => buildStoolSummary(selectedStoolRecord), [selectedStoolRecord]);
  const selectedTemperature = useMemo(() => temperatureRecords[selectedDateKey] ?? null, [temperatureRecords, selectedDateKey]);
  const selectedWeight = useMemo(() => weightRecords[selectedDateKey] ?? null, [weightRecords, selectedDateKey]);
  const selectedDiaryText = useMemo(() => diaryRecords[selectedDateKey] ?? '', [diaryRecords, selectedDateKey]);
  const diarySummary = useMemo(() => buildDiarySummary(selectedDiaryText), [selectedDiaryText]);
  const activeDiaryDateKey = diaryEditorDateKey ?? selectedDateKey;
  const activeDiaryText = useMemo(() => diaryRecords[activeDiaryDateKey] ?? '', [diaryRecords, activeDiaryDateKey]);
  const monthRows = useMemo(() => chunkCells(monthCells, 7), [monthCells]);
  const monthLabel = useMemo(() => formatMonthLabel(monthCursorKey), [monthCursorKey]);
  const isSelectedPeriodStart = useMemo(
    () => periodRanges.some((range) => range.start === selectedDateKey),
    [periodRanges, selectedDateKey]
  );
  const isSelectedPeriodEnd = useMemo(
    () => periodRanges.some((range) => range.end === selectedDateKey),
    [periodRanges, selectedDateKey]
  );
  const selectedSymptomIds = useMemo(() => symptomRecords[selectedDateKey] ?? [], [symptomRecords, selectedDateKey]);
  const symptomLabelMap = useMemo(() => getSymptomLabelMap(customSymptoms), [customSymptoms]);
  const symptomSummary = useMemo(
    () => buildSymptomSummary(selectedSymptomIds, symptomLabelMap),
    [selectedSymptomIds, symptomLabelMap]
  );
  const headerTitle = activeTab === 'record' ? '经期记录' : '日记';

  return (
    <motion.div
      {...APP_OPEN_MOTION}
      exit={APP_CLOSE_MOTION}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#f5f6f8] text-slate-900"
      style={{ fontFamily: WARMTRACK_FONT_STACK }}
    >
      <header className="bg-gradient-to-r from-[#fde7ef] to-[#fbe2eb] px-3 pt-11 pb-3 border-b border-rose-100">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 grid place-items-center text-slate-700 active:scale-95 transition-transform"
            aria-label="返回"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="flex-1 text-center text-[20px] font-semibold tracking-wide pr-10">{headerTitle}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'record' ? (
          <>
            <CalendarSection
              monthLabel={monthLabel}
              monthRows={monthRows}
              predictionModel={predictionModel}
              onSwitchMonth={switchMonth}
              onSelectDate={setSelectedDateKey}
            />

            <RecordListSection
              selectedMood={selectedMood}
              selectedDischarge={selectedDischarge}
              selectedTemperature={selectedTemperature}
              selectedWeight={selectedWeight}
              diarySummary={diarySummary}
              stoolSummary={stoolSummary}
              isSelectedPeriodStart={isSelectedPeriodStart}
              isSelectedPeriodEnd={isSelectedPeriodEnd}
              symptomSummary={symptomSummary}
              onOpenMoodPicker={() => setIsMoodPickerOpen(true)}
              onOpenDischargePicker={() => setIsDischargePickerOpen(true)}
              onOpenTemperaturePicker={() => setIsTemperaturePickerOpen(true)}
              onOpenWeightPicker={() => setIsWeightPickerOpen(true)}
              onOpenStoolPicker={() => setIsStoolPickerOpen(true)}
              onOpenDiaryEditor={() => setDiaryEditorDateKey(selectedDateKey)}
              onMarkPeriodStart={markPeriodStart}
              onMarkPeriodEnd={markPeriodEnd}
              onOpenSymptomPicker={() => setIsSymptomPickerOpen(true)}
            />
          </>
        ) : (
          <DiaryListSection
            diaryRecords={diaryRecords}
            onOpenDiary={(dateKey) => {
              setDiaryEditorDateKey(dateKey);
            }}
          />
        )}
      </main>

      <footer className="border-t border-rose-100 bg-white px-4 pt-2 pb-5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors ${
              activeTab === 'record' ? 'bg-[#ffe8f1] text-[#e44f90]' : 'bg-slate-50 text-slate-500'
            }`}
          >
            <ClipboardList size={18} />
            记录
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diary')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors ${
              activeTab === 'diary' ? 'bg-[#ffe8f1] text-[#e44f90]' : 'bg-slate-50 text-slate-500'
            }`}
          >
            <BookText size={18} />
            日记
          </button>
        </div>
      </footer>

      {isStoolPickerOpen ? (
        <StoolPickerSheet
          selectedRecord={selectedStoolRecord}
          onCancel={() => setIsStoolPickerOpen(false)}
          onConfirm={(nextRecord) => {
            setStoolForDate(selectedDateKey, nextRecord);
            setIsStoolPickerOpen(false);
          }}
        />
      ) : null}

      {diaryEditorDateKey ? (
        <DiaryEditorSheet
          selectedDateKey={activeDiaryDateKey}
          initialText={activeDiaryText}
          onCancel={() => setDiaryEditorDateKey(null)}
          onConfirm={(nextText) => {
            setDiaryForDate(activeDiaryDateKey, nextText);
            setDiaryEditorDateKey(null);
          }}
        />
      ) : null}

      {isWeightPickerOpen ? (
        <WeightPickerSheet
          selectedWeightKg={selectedWeight}
          onCancel={() => setIsWeightPickerOpen(false)}
          onConfirm={(nextWeightKg) => {
            setWeightForDate(selectedDateKey, nextWeightKg);
            setIsWeightPickerOpen(false);
          }}
        />
      ) : null}

      {isTemperaturePickerOpen ? (
        <TemperaturePickerSheet
          selectedTemperature={selectedTemperature}
          onCancel={() => setIsTemperaturePickerOpen(false)}
          onConfirm={(nextTemperature) => {
            setTemperatureForDate(selectedDateKey, nextTemperature);
            setIsTemperaturePickerOpen(false);
          }}
        />
      ) : null}

      {isDischargePickerOpen ? (
        <DischargePickerSheet
          selectedDischargeId={selectedDischargeId}
          onCancel={() => setIsDischargePickerOpen(false)}
          onConfirm={(nextDischargeId) => {
            setDischargeForDate(selectedDateKey, nextDischargeId);
            setIsDischargePickerOpen(false);
          }}
        />
      ) : null}

      {isMoodPickerOpen ? (
        <MoodPickerSheet
          selectedMoodId={selectedMoodId}
          onCancel={() => setIsMoodPickerOpen(false)}
          onConfirm={(nextMoodId) => {
            setMoodForDate(selectedDateKey, nextMoodId);
            setIsMoodPickerOpen(false);
          }}
        />
      ) : null}

      {isSymptomPickerOpen ? (
        <SymptomPickerSheet
          selectedSymptomIds={selectedSymptomIds}
          customSymptoms={customSymptoms}
          customSymptomIcons={customSymptomIcons}
          onCancel={() => setIsSymptomPickerOpen(false)}
          onConfirm={({ selectedSymptomIds: nextSymptomIds, customSymptoms: nextCustomSymptoms, customSymptomIcons: nextIconMap }) => {
            setSymptomsForDate(selectedDateKey, nextSymptomIds);
            setCustomSymptoms({
              symptoms: nextCustomSymptoms,
              iconMap: nextIconMap,
            });
            setIsSymptomPickerOpen(false);
          }}
        />
      ) : null}
    </motion.div>
  );
};

export type { WarmTrackAppProps };
