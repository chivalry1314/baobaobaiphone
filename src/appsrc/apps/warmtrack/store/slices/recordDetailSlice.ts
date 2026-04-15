import { buildDiarySummary, normalizeDiaryText } from '../../diary';
import { buildSymptomSummary, getSymptomLabelMap, normalizeSymptomIds } from '../../symptoms';
import { isValidDateKey } from '../../utils';
import type { WarmTrackStore } from '../../types';
import type { WarmTrackMutationSliceOptions } from './types';

export const createWarmTrackRecordDetailSlice = ({
  updateRoleState,
  recordWarmTrackMemory,
}: WarmTrackMutationSliceOptions): Pick<WarmTrackStore, 'setDiaryForDate' | 'setSymptomsForDate'> => ({
  setDiaryForDate: (dateKey, diaryText) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (diaryText !== null) {
        const normalizedDiary = normalizeDiaryText(diaryText);
        if (!normalizedDiary) {
          if (!(dateKey in roleState.diaryRecords)) return roleState;
          const nextDiaryRecords = { ...roleState.diaryRecords };
          delete nextDiaryRecords[dateKey];
          return {
            ...roleState,
            diaryRecords: nextDiaryRecords,
          };
        }

        if (roleState.diaryRecords[dateKey] === normalizedDiary) return roleState;
        return {
          ...roleState,
          diaryRecords: {
            ...roleState.diaryRecords,
            [dateKey]: normalizedDiary,
          },
        };
      }

      if (!(dateKey in roleState.diaryRecords)) return roleState;
      const nextDiaryRecords = { ...roleState.diaryRecords };
      delete nextDiaryRecords[dateKey];
      return {
        ...roleState,
        diaryRecords: nextDiaryRecords,
      };
    });

    if (!mutation) return;
    const nextDiary = mutation.nextRoleState.diaryRecords[dateKey] ?? '';
    const diarySummary = buildDiarySummary(nextDiary, 48);
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'diary',
      dateKey,
      content: nextDiary ? `${dateKey} 的日记摘要：${diarySummary}。` : null,
    });
  },

  setSymptomsForDate: (dateKey, symptomIds) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;
      const normalizedIds = normalizeSymptomIds(symptomIds);
      const nextRecords = { ...roleState.symptomRecords };
      if (normalizedIds.length === 0) {
        if (!(dateKey in nextRecords)) return roleState;
        delete nextRecords[dateKey];
      } else {
        nextRecords[dateKey] = normalizedIds;
      }
      return {
        ...roleState,
        symptomRecords: nextRecords,
      };
    });

    if (!mutation) return;
    const nextSymptomIds = mutation.nextRoleState.symptomRecords[dateKey] ?? [];
    const symptomLabelMap = getSymptomLabelMap(mutation.nextRoleState.customSymptoms);
    const symptomSummary = buildSymptomSummary(nextSymptomIds, symptomLabelMap);
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'symptoms',
      dateKey,
      content: nextSymptomIds.length > 0 ? `${dateKey} 的症状记录：${symptomSummary || nextSymptomIds.join('、')}。` : null,
    });
  },
});
