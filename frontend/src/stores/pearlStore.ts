import { create } from 'zustand';
import type { PearlMessage } from '../api/pearl';
import { fetchPearlMessages, generateBark } from '../api/pearl';
import type { BarkType, BarkEntry } from '../types/shifts';
import type { BarkContext } from '../hooks/useBarkContext';

// Per-type message pools for contextual barks
// Canonical lines from Dplan ambient-text-bank.md
const BARK_POOLS: Record<BarkType, string[]> = {
  success: [
    'Excellent precision, Citizen. The Party notices.',
    'Beautiful clarity. You protect more than words.',
    'Correct. Your focus is exemplary.',
    'Another error resolved. The Republic is safer.',
    'You are a model of careful language.',
    'Well done. Your language scores contribute to collective harmony.',
  ],
  incorrect: [
    'Not quite. Review the subject and verb.',
    'Close. Check your pronoun case.',
    'Hmm. That creates confusion. Try again.',
    'Careful. That word does not mean what you think it means.',
    "Let's slow down. Clarity requires patience.",
  ],
  hint: [
    "Ask yourself: can you replace it with 'it is'?",
    'Is this word about ownership, location, or a contraction?',
    'Identify the subject first. Then match the verb.',
    'Who is acting? Who is receiving?',
    'Singular or plural? The verb will tell the truth.',
  ],
  concern: [
    "I've noticed some difficulty. That's normal. The Party helps those who struggle.",
    'This is a friendly reminder to focus on accuracy.',
    'If you need support, simply ask. PEARL is always listening.',
    'Consistent confusion can be corrected with care and time.',
    'The Party wants you to succeed. Let me guide you.',
  ],
  notice: [
    'Good morning, Citizen. Your clarity builds our harmony.',
    'Reminder: Clear language reduces confusion. Confusion reduces comfort.',
    'Your words shape reality. Choose Ministry-approved terms.',
    'Compliance is not restriction — it is liberation.',
    'Citizens are reminded: questions are welcome when asked in the proper format.',
    'The Party provides. The Party protects. The Party appreciates you.',
  ],
};

// Eye state arc based on week number
type EyeStateArc =
  | 'welcoming'    // Wk 1-3: soft green pulse, gentle blink
  | 'attentive'    // Wk 4-6: brighter, faster pulse
  | 'evaluative'   // Wk 7-9: steady stare, amber ring
  | 'confused'     // Wk 10-11: flicker green/gray
  | 'alarmed'      // Wk 12-13: red tint, rapid pulse
  | 'frantic'      // Wk 14-15: alternating red/green
  | 'cold'         // Wk 16: flat white, no animation
  | 'breaking'     // Wk 17: rapid state cycling
  | 'final';       // Wk 18: dark → warm amber glow

function getEyeStateFromWeek(week: number): EyeStateArc {
  if (week <= 3) return 'welcoming';
  if (week <= 6) return 'attentive';
  if (week <= 9) return 'evaluative';
  if (week <= 11) return 'confused';
  if (week <= 13) return 'alarmed';
  if (week <= 15) return 'frantic';
  if (week === 16) return 'cold';
  if (week === 17) return 'breaking';
  return 'final';
}

let barkIdCounter = 0;

export type AnnouncementType = 'introduction' | 'story_beat' | 'disciplinary' | 'shift_transition';

export interface PearlAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  dismissLabel?: string;
}

interface PearlState {
  messages: PearlMessage[];
  currentIndex: number;
  eyeState: EyeStateArc;
  loading: boolean;
  barkHistory: BarkEntry[];
  activeBark: BarkEntry | null;
  activeAnnouncement: PearlAnnouncement | null;
  loadMessages: () => Promise<void>;
  nextMessage: () => void;
  setEyeState: (state: EyeStateArc) => void;
  setEyeStateFromWeek: (weekNumber: number) => void;
  triggerBark: (type: BarkType, text?: string) => void;
  triggerAIBark: (type: BarkType, context?: BarkContext, fallbackText?: string) => void;
  dismissBark: () => void;
  triggerAnnouncement: (type: AnnouncementType, title: string, body: string, dismissLabel?: string) => void;
  dismissAnnouncement: () => void;
}

export const usePearlStore = create<PearlState>((set, get) => ({
  messages: [],
  currentIndex: 0,
  eyeState: 'welcoming',
  loading: false,
  barkHistory: [],
  activeBark: null,
  activeAnnouncement: null,

  loadMessages: async () => {
    set({ loading: true });
    try {
      const messages = await fetchPearlMessages();
      set({ messages, loading: false, currentIndex: 0 });
    } catch {
      set({ loading: false });
    }
  },

  nextMessage: () => {
    const { messages, currentIndex } = get();
    if (messages.length === 0) return;
    set({ currentIndex: (currentIndex + 1) % messages.length });
  },

  setEyeState: (eyeState) => set({ eyeState }),

  setEyeStateFromWeek: (weekNumber) => set({ eyeState: getEyeStateFromWeek(weekNumber) }),

  triggerBark: (type, text) => {
    const pool = BARK_POOLS[type];
    const barkText = text || pool[Math.floor(Math.random() * pool.length)];
    const entry: BarkEntry = {
      id: `bark-${++barkIdCounter}`,
      type,
      text: barkText,
      timestamp: Date.now(),
    };
    const { barkHistory } = get();
    const newHistory = [...barkHistory, entry].slice(-60);
    set({ barkHistory: newHistory, activeBark: entry });
  },

  triggerAIBark: (type, context, fallbackText) => {
    // 1. Show pool/fallback message immediately (zero latency)
    const pool = BARK_POOLS[type];
    const barkText = fallbackText || pool[Math.floor(Math.random() * pool.length)];
    const barkId = `bark-${++barkIdCounter}`;
    const entry: BarkEntry = {
      id: barkId,
      type,
      text: barkText,
      timestamp: Date.now(),
    };
    const { barkHistory } = get();
    set({ barkHistory: [...barkHistory, entry].slice(-60), activeBark: entry });

    // 2. Fire async AI request — swap text if bark is still active
    generateBark(type, context)
      .then(({ text }) => {
        const current = get().activeBark;
        if (current && current.id === barkId) {
          // Same bark still showing — swap text in-place (keep same id)
          set({ activeBark: { ...current, text } });
        }
      })
      .catch(() => {
        // Fail silently — pool message already displayed
      });
  },

  dismissBark: () => set({ activeBark: null }),

  triggerAnnouncement: (type, title, body, dismissLabel) => {
    set({
      activeAnnouncement: {
        id: `announce-${++barkIdCounter}`,
        type,
        title,
        body,
        dismissLabel,
      },
    });
  },

  dismissAnnouncement: () => set({ activeAnnouncement: null }),
}));
