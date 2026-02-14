import { create } from 'zustand';

type RecordingState =
  | 'idle'
  | 'requesting'
  | 'calibrating'
  | 'recording'
  | 'paused_violation'
  | 'stopped'
  | 'uploading'
  | 'uploaded'
  | 'error';

interface AudioState {
  state: RecordingState;
  duration: number;
  blob: Blob | null;
  error: string | null;
  /** Number of acoustic violations in current recording session */
  violationCount: number;
  setState: (state: RecordingState) => void;
  setDuration: (duration: number) => void;
  setBlob: (blob: Blob | null) => void;
  setError: (error: string | null) => void;
  incrementViolation: () => number;
  reset: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  state: 'idle',
  duration: 0,
  blob: null,
  error: null,
  violationCount: 0,

  setState: (state) => set({ state }),
  setDuration: (duration) => set({ duration }),
  setBlob: (blob) => set({ blob }),
  setError: (error) => set({ error, state: 'error' }),
  incrementViolation: () => {
    const count = get().violationCount + 1;
    set({ violationCount: count });
    return count;
  },
  reset: () => set({ state: 'idle', duration: 0, blob: null, error: null, violationCount: 0 }),
}));
