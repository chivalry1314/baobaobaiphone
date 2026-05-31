import type { AddCallRecordPayload, CallRecord } from '../../types';
import type { ContactsStore } from '../../store';
import { normalizeRoleId } from '../../roleIdentity';
import type { ContactsActionContext } from './types';

export const createCallRecordSlice = ({
  set,
  get,
  generateId,
}: ContactsActionContext): Pick<
  ContactsStore,
  'addCallRecord' | 'importInspectorCallRecords' | 'clearInspectorCallRecords' | 'deleteCallRecord' | 'clearCallRecords'
> => ({
  addCallRecord: (payload: AddCallRecordPayload) => {
    const contact = get().contacts.find((item) => item.id === payload.contactId);
    if (!contact) return;

    const normalizedDuration =
      payload.direction === 'missed'
        ? 0
        : Math.max(0, Math.round(payload.durationSec ?? 90));

    const record: CallRecord = {
      id: `record-${generateId()}`,
      contactId: contact.id,
      roleId: normalizeRoleId(payload.roleId),
      contactName: contact.name,
      phone: contact.phone,
      direction: payload.direction,
      durationSec: normalizedDuration,
      createdAt: payload.createdAt ?? Date.now(),
    };

    set((state) => ({
      callRecords: [record, ...state.callRecords].slice(0, 500),
    }));
  },

  importInspectorCallRecords: (sourceContactId, records) => {
    const normalizedSourceContactId = sourceContactId.trim();
    if (!normalizedSourceContactId) return;

    set((state) => ({
      callRecords: [
        ...records,
        ...state.callRecords.filter(
          (record) => record.inspectorGeneratedSourceContactId !== normalizedSourceContactId
        ),
      ].slice(0, 500),
    }));
  },

  clearInspectorCallRecords: (sourceContactId) => {
    const normalizedSourceContactId = sourceContactId.trim();
    if (!normalizedSourceContactId) return;

    set((state) => ({
      callRecords: state.callRecords.filter(
        (record) => record.inspectorGeneratedSourceContactId !== normalizedSourceContactId
      ),
    }));
  },

  deleteCallRecord: (id) =>
    set((state) => ({
      callRecords: state.callRecords.filter((item) => item.id !== id),
    })),

  clearCallRecords: () => set({ callRecords: [] }),
});

