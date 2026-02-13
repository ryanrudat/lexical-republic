import { create } from 'zustand';

type EnvironmentMode = 'ministry' | 'resistance' | 'director';
type ParticleType = 'dust' | 'embers' | 'static';

interface EnvironmentState {
  mode: EnvironmentMode;
  particleType: ParticleType;
  postProcessing: boolean;
  setMode: (mode: EnvironmentMode) => void;
  setParticleType: (type: ParticleType) => void;
  togglePostProcessing: () => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  mode: 'ministry',
  particleType: 'dust',
  postProcessing: true,

  setMode: (mode) => set({ mode }),
  setParticleType: (particleType) => set({ particleType }),
  togglePostProcessing: () => set((s) => ({ postProcessing: !s.postProcessing })),
}));
