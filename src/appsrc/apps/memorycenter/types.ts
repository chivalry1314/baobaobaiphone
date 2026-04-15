import type { AppContext } from '../../../core/sdk/types';

export interface MemoryCenterAppProps {
  onClose: () => void;
  context?: AppContext;
}
