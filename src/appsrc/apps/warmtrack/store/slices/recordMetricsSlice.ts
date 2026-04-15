import { getDischargeOptionById, isValidDischargeId } from '../../discharge';
import { getMoodOptionById, isValidMoodId } from '../../moods';
import { normalizeStoolRecord } from '../../stool';
import { normalizeTemperatureValue } from '../../temperature';
import { isValidDateKey } from '../../utils';
import { normalizeWeightValue } from '../../weight';
import type { WarmTrackStore } from '../../types';
import type { WarmTrackMutationSliceOptions } from './types';

const padTwo = (value: number): string => value.toString().padStart(2, '0');

const buildStoolRecordContent = (
  dateKey: string,
  stoolRecord: NonNullable<WarmTrackStore['stoolRecords'][string]>
): string => {
  const normalizedRecord = normalizeStoolRecord(stoolRecord);
  const parts: string[] = [];

  if (normalizedRecord.feelingId) {
    parts.push(`感觉=${normalizedRecord.feelingId}`);
  }
  if (normalizedRecord.shapeId) {
    parts.push(`形态=${normalizedRecord.shapeId}`);
  }
  if (normalizedRecord.amountId) {
    parts.push(`量=${normalizedRecord.amountId}`);
  }
  if (normalizedRecord.durationId) {
    parts.push(`时长=${normalizedRecord.durationId}`);
  }
  parts.push(`时间=${padTwo(normalizedRecord.hour)}:${padTwo(normalizedRecord.minute)}`);

  return `${dateKey} 的排便记录：${parts.join('；')}。`;
};

export const createWarmTrackRecordMetricsSlice = ({
  updateRoleState,
  recordWarmTrackMemory,
  areStoolRecordsEqual,
}: WarmTrackMutationSliceOptions): Pick<
  WarmTrackStore,
  | 'setMoodForDate'
  | 'setDischargeForDate'
  | 'setStoolForDate'
  | 'setTemperatureForDate'
  | 'setWeightForDate'
> => ({
  setMoodForDate: (dateKey, moodId) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (moodId !== null) {
        const normalizedMoodId = moodId.trim();
        if (!normalizedMoodId || !isValidMoodId(normalizedMoodId)) return roleState;
        if (roleState.moodRecords[dateKey] === normalizedMoodId) return roleState;
        return {
          ...roleState,
          moodRecords: {
            ...roleState.moodRecords,
            [dateKey]: normalizedMoodId,
          },
        };
      }

      if (!(dateKey in roleState.moodRecords)) return roleState;
      const nextMoodRecords = { ...roleState.moodRecords };
      delete nextMoodRecords[dateKey];
      return {
        ...roleState,
        moodRecords: nextMoodRecords,
      };
    });

    if (!mutation) return;
    const nextMoodId = mutation.nextRoleState.moodRecords[dateKey] ?? null;
    const moodLabel = getMoodOptionById(nextMoodId)?.label ?? nextMoodId;
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'mood',
      dateKey,
      content: nextMoodId ? `${dateKey} 的心情记录：${moodLabel}。` : null,
    });
  },

  setDischargeForDate: (dateKey, dischargeId) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (dischargeId !== null) {
        const normalizedDischargeId = dischargeId.trim();
        if (!normalizedDischargeId || !isValidDischargeId(normalizedDischargeId)) return roleState;
        if (roleState.dischargeRecords[dateKey] === normalizedDischargeId) return roleState;
        return {
          ...roleState,
          dischargeRecords: {
            ...roleState.dischargeRecords,
            [dateKey]: normalizedDischargeId,
          },
        };
      }

      if (!(dateKey in roleState.dischargeRecords)) return roleState;
      const nextDischargeRecords = { ...roleState.dischargeRecords };
      delete nextDischargeRecords[dateKey];
      return {
        ...roleState,
        dischargeRecords: nextDischargeRecords,
      };
    });

    if (!mutation) return;
    const nextDischargeId = mutation.nextRoleState.dischargeRecords[dateKey] ?? null;
    const dischargeLabel = getDischargeOptionById(nextDischargeId)?.label ?? nextDischargeId;
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'discharge',
      dateKey,
      content: nextDischargeId ? `${dateKey} 的分泌物记录：${dischargeLabel}。` : null,
    });
  },

  setStoolForDate: (dateKey, stoolRecord) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (stoolRecord !== null) {
        const normalizedRecord = normalizeStoolRecord(stoolRecord);
        if (areStoolRecordsEqual(roleState.stoolRecords[dateKey], normalizedRecord)) return roleState;
        return {
          ...roleState,
          stoolRecords: {
            ...roleState.stoolRecords,
            [dateKey]: normalizedRecord,
          },
        };
      }

      if (!(dateKey in roleState.stoolRecords)) return roleState;
      const nextStoolRecords = { ...roleState.stoolRecords };
      delete nextStoolRecords[dateKey];
      return {
        ...roleState,
        stoolRecords: nextStoolRecords,
      };
    });

    if (!mutation) return;
    const nextRecord = mutation.nextRoleState.stoolRecords[dateKey] ?? null;
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'stool',
      dateKey,
      content: nextRecord ? buildStoolRecordContent(dateKey, nextRecord) : null,
    });
  },

  setTemperatureForDate: (dateKey, temperature) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (temperature !== null) {
        const normalizedTemperature = normalizeTemperatureValue(temperature);
        if (normalizedTemperature === null) return roleState;
        if (roleState.temperatureRecords[dateKey] === normalizedTemperature) return roleState;
        return {
          ...roleState,
          temperatureRecords: {
            ...roleState.temperatureRecords,
            [dateKey]: normalizedTemperature,
          },
        };
      }

      if (!(dateKey in roleState.temperatureRecords)) return roleState;
      const nextTemperatureRecords = { ...roleState.temperatureRecords };
      delete nextTemperatureRecords[dateKey];
      return {
        ...roleState,
        temperatureRecords: nextTemperatureRecords,
      };
    });

    if (!mutation) return;
    const nextTemperature = mutation.nextRoleState.temperatureRecords[dateKey];
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'temperature',
      dateKey,
      content:
        typeof nextTemperature === 'number'
          ? `${dateKey} 的体温：${nextTemperature.toFixed(1)}℃。`
          : null,
    });
  },

  setWeightForDate: (dateKey, weightKg) => {
    const mutation = updateRoleState((roleState) => {
      if (!isValidDateKey(dateKey)) return roleState;

      if (weightKg !== null) {
        const normalizedWeight = normalizeWeightValue(weightKg);
        if (normalizedWeight === null) return roleState;
        if (roleState.weightRecords[dateKey] === normalizedWeight) return roleState;
        return {
          ...roleState,
          weightRecords: {
            ...roleState.weightRecords,
            [dateKey]: normalizedWeight,
          },
        };
      }

      if (!(dateKey in roleState.weightRecords)) return roleState;
      const nextWeightRecords = { ...roleState.weightRecords };
      delete nextWeightRecords[dateKey];
      return {
        ...roleState,
        weightRecords: nextWeightRecords,
      };
    });

    if (!mutation) return;
    const nextWeight = mutation.nextRoleState.weightRecords[dateKey];
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'weight',
      dateKey,
      content:
        typeof nextWeight === 'number'
          ? `${dateKey} 的体重：${nextWeight.toFixed(1)}kg。`
          : null,
    });
  },
});
