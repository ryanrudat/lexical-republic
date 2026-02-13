import { create } from 'zustand';
import type { ViewMode, TerminalApp, TransitionType } from '../types/views';

interface ViewState {
  currentView: ViewMode;
  terminalApp: TerminalApp;
  isTransitioning: boolean;
  transitionType: TransitionType;
  enterTerminal: (app?: TerminalApp) => void;
  exitTerminal: () => void;
  openApp: (app: TerminalApp) => void;
  returnToDesktop: () => void;
  setView: (view: ViewMode) => void;
}

const TRANSITION_DURATION = 1200;

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'office',
  terminalApp: 'desktop',
  isTransitioning: false,
  transitionType: 'none',

  enterTerminal: (app) => {
    set({ isTransitioning: true, transitionType: 'enter-terminal' });
    setTimeout(() => {
      set({
        currentView: 'terminal',
        terminalApp: app || 'desktop',
        isTransitioning: false,
        transitionType: 'none',
      });
    }, TRANSITION_DURATION);
  },

  exitTerminal: () => {
    set({ isTransitioning: true, transitionType: 'exit-terminal' });
    setTimeout(() => {
      set({
        currentView: 'office',
        terminalApp: 'desktop',
        isTransitioning: false,
        transitionType: 'none',
      });
    }, TRANSITION_DURATION);
  },

  openApp: (app) => set({ terminalApp: app }),

  returnToDesktop: () => set({ terminalApp: 'desktop' }),

  setView: (view) => set({ currentView: view }),
}));
