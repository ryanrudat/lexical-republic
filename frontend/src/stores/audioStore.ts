import { create } from 'zustand';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'uploading' | 'uploaded' | 'error';

interface AudioState {
  state: RecordingState;
  duration: number;
  blob: Blob | null;
  error: string | null;
  setState: (state: RecordingState) => void;
  setDuration: (duration: number) => void;
  setBlob: (blob: Blob | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  state: 'idle',
  duration: 0,
  blob: null,
  error: null,

  setState: (state) => set({ state }),
  setDuration: (duration) => set({ duration }),
  setBlob: (blob) => set({ blob }),
  setError: (error) => set({ error, state: 'error' }),
  reset: () => set({ state: 'idle', duration: 0, blob: null, error: null }),
}));
