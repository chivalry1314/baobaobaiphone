import {
  normalizeCustomSymptomIconMap,
  normalizeSymptomList,
  remapSymptomIdsForCustomChange,
} from '../../symptoms';
import type { WarmTrackState, WarmTrackStore } from '../../types';
import type { WarmTrackMutationSliceOptions } from './types';

export const createWarmTrackCustomSymptomsSlice = ({
  updateRoleState,
  recordWarmTrackMemory,
}: WarmTrackMutationSliceOptions): Pick<WarmTrackStore, 'setCustomSymptoms'> => ({
  setCustomSymptoms: (payload) => {
    const mutation = updateRoleState((roleState) => {
      const nextCustomSymptoms = normalizeSymptomList(payload.symptoms);
      const nextSymptomRecords: WarmTrackState['symptomRecords'] = {};
      const nextCustomSymptomIcons = normalizeCustomSymptomIconMap(
        nextCustomSymptoms,
        payload.iconMap
      );

      Object.entries(roleState.symptomRecords).forEach(([dateKey, symptomIds]) => {
        const remappedIds = remapSymptomIdsForCustomChange(
          symptomIds,
          roleState.customSymptoms,
          nextCustomSymptoms
        );
        if (remappedIds.length === 0) return;
        nextSymptomRecords[dateKey] = remappedIds;
      });

      return {
        ...roleState,
        customSymptoms: nextCustomSymptoms,
        customSymptomIcons: nextCustomSymptomIcons,
        symptomRecords: nextSymptomRecords,
      };
    });

    if (!mutation) return;
    const customSymptomLabels = mutation.nextRoleState.customSymptoms;
    recordWarmTrackMemory({
      roleId: mutation.roleId,
      sourceType: 'custom-symptoms',
      sessionId: 'warmtrack-custom-symptoms',
      sourceId: 'custom-symptoms:all',
      content:
        customSymptomLabels.length > 0
          ? `当前自定义症状词条：${customSymptomLabels.join('、')}。`
          : null,
    });
  },
});
