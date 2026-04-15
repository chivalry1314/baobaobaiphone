import type { AppContext } from '../../../core/sdk/types';

export interface PhoneInspectorAppProps {
  onClose: () => void;
  context?: AppContext;
}
