import { create } from 'zustand';

type LoginMode = 'student' | 'teacher' | 'register' | 'teacher-register';

interface LoginFormState {
  mode: LoginMode;
  designation: string;
  pin: string;
  username: string;
  password: string;
  regDesignation: string;
  regPin: string;
  regPinConfirm: string;
  regStudentAName: string;
  regStudentBName: string;
  regClassCode: string;
  tRegUsername: string;
  tRegPassword: string;
  tRegPasswordConfirm: string;
  tRegDisplayName: string;
  tRegCode: string;

  setMode: (mode: LoginMode) => void;
  setField: (field: string, value: string) => void;
  clearForm: () => void;
}

const initialFields = {
  designation: '',
  pin: '',
  username: '',
  password: '',
  regDesignation: '',
  regPin: '',
  regPinConfirm: '',
  regStudentAName: '',
  regStudentBName: '',
  regClassCode: '',
  tRegUsername: '',
  tRegPassword: '',
  tRegPasswordConfirm: '',
  tRegDisplayName: '',
  tRegCode: '',
};

export const useLoginFormStore = create<LoginFormState>((set) => ({
  mode: 'student',
  ...initialFields,

  setMode: (mode) => set({ mode }),
  setField: (field, value) => set({ [field]: value }),
  clearForm: () => set({ mode: 'student', ...initialFields }),
}));
