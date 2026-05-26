import { create } from 'zustand';
import {
  fetchNarrativeChoices,
  postNarrativeChoice,
} from '../api/narrative-choices';
import {
  CATCH_PROBABILITY,
  snoopChoiceKey,
  type SnoopFile,
} from '../data/spyFiles';

// ─── Spy Store — the optional snooping loop ──────────────────────
//
// Drives the insider-spy layer of Shift 4: opening off-limits Records
// Room files, PEARL's "cover story" interrogation (dice roll), and
// funnelling intel to Frey via [ ].edited.
//
// Outcomes persist as NarrativeChoice rows (key `w4_snoop_<id>`,
// value 'funneled' | 'dark') — refresh-safe, and read at W5 start to
// branch the resistance story. No backend changes needed: NarrativeChoice
// accepts any key/value (same pattern as the drop box + recruitment vote).
//
// Flow per file:
//   attemptOpen(file)  → dice roll by exposure
//        caught  → activeInterrogation = file  (PEARL window appears)
//        slipped → cleared[id] = true          (read freely, funnel-ready)
//   resolveInterrogation(correct)
//        pass → cleared[id] = true (funnel-ready)
//        fail → goDark(file)       (file pulled, Frey loses the lead)
//   funnel(file) → writes 'funneled', locks the file
//
// Resolved files (funneled OR dark) are locked — one clean roll each,
// no carried-over heat.

export type SnoopOutcome = 'funneled' | 'dark';

interface SpyState {
  loaded: boolean;
  /** The student's drop-box dead-drop text, echoed back in Frey's channel. */
  dropBoxText: string | null;
  /** Persisted final outcomes by file id. */
  resolved: Record<string, SnoopOutcome>;
  /** Session-only: files you got past PEARL on (slipped or talked your way out) — readable + funnel-ready. */
  cleared: Record<string, true>;
  /** The file PEARL is currently interrogating you about (drives the overlay). */
  activeInterrogation: SnoopFile | null;
  /** Whether the [ ].edited funnel drawer overlay is open. */
  drawerOpen: boolean;

  loadChoices: () => Promise<void>;
  attemptOpen: (file: SnoopFile) => void;
  resolveInterrogation: (correct: boolean) => void;
  funnel: (file: SnoopFile) => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  reset: () => void;
}

export const useSpyStore = create<SpyState>((set, get) => ({
  loaded: false,
  dropBoxText: null,
  resolved: {},
  cleared: {},
  activeInterrogation: null,
  drawerOpen: false,

  loadChoices: async () => {
    try {
      const choices = await fetchNarrativeChoices(4);
      const resolved: Record<string, SnoopOutcome> = {};
      let dropBoxText: string | null = null;
      // Ordered createdAt asc — later writes win (last-write-wins per key).
      for (const c of choices) {
        if (c.choiceKey.startsWith('w4_snoop_')) {
          const id = c.choiceKey.replace('w4_snoop_', '');
          if (c.value === 'funneled' || c.value === 'dark') {
            resolved[id] = c.value;
          }
        } else if (c.choiceKey === 'w4_drop_box_first_submission') {
          const text = typeof c.context?.text === 'string' ? c.context.text.trim() : '';
          if (text.length > 0) dropBoxText = text;
        }
      }
      set({ resolved, dropBoxText, loaded: true });
    } catch {
      // Fail-open — an unreachable choices endpoint shouldn't block the app.
      set({ loaded: true });
    }
  },

  attemptOpen: (file) => {
    const { resolved, cleared, activeInterrogation } = get();
    // Already resolved, already open, or another interrogation in flight — ignore.
    if (resolved[file.id] || cleared[file.id] || activeInterrogation) return;

    const caught = Math.random() < CATCH_PROBABILITY[file.exposure];
    if (caught) {
      set({ activeInterrogation: file });
    } else {
      set((s) => ({ cleared: { ...s.cleared, [file.id]: true } }));
    }
  },

  resolveInterrogation: (correct) => {
    const file = get().activeInterrogation;
    if (!file) return;
    if (correct) {
      set((s) => ({
        activeInterrogation: null,
        cleared: { ...s.cleared, [file.id]: true },
      }));
    } else {
      // Cover blown — clear the window, then mark the lead lost.
      set({ activeInterrogation: null });
      void writeOutcome(file.id, 'dark', set);
    }
  },

  funnel: async (file) => {
    await writeOutcome(file.id, 'funneled', set);
    // Funnelled files leave the session-cleared set (now permanently resolved).
    set((s) => {
      const cleared = { ...s.cleared };
      delete cleared[file.id];
      return { cleared };
    });
  },

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  reset: () =>
    set({
      loaded: false,
      dropBoxText: null,
      resolved: {},
      cleared: {},
      activeInterrogation: null,
      drawerOpen: false,
    }),
}));

// Write a snoop outcome to the server (fail-open) and update local state.
async function writeOutcome(
  fileId: string,
  outcome: SnoopOutcome,
  set: (fn: (s: SpyState) => Partial<SpyState>) => void,
) {
  // Optimistic local update so the UI reflects the outcome immediately.
  set((s) => ({ resolved: { ...s.resolved, [fileId]: outcome } }));
  try {
    await postNarrativeChoice({
      choiceKey: snoopChoiceKey(fileId),
      value: outcome,
      weekNumber: 4,
    });
  } catch (err) {
    // Keep the optimistic state; the lead is resolved for this session even
    // if the write failed. (Matches DropBoxOverlay's fail-open behaviour.)
    console.error('Failed to record snoop outcome:', err);
  }
}
