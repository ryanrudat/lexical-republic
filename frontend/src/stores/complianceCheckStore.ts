import { create } from 'zustand';
import type { PendingComplianceCheck } from '../types/complianceCheck';

interface ComplianceCheckState {
  pendingCheck: PendingComplianceCheck | null;
  setPending: (check: PendingComplianceCheck) => void;
  clearPending: () => void;
}

export const useComplianceCheckStore = create<ComplianceCheckState>((set) => ({
  pendingCheck: null,
  setPending: (check) => set({ pendingCheck: check }),
  clearPending: () => set({ pendingCheck: null }),
}));
