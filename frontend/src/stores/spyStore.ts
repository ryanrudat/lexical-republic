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
// Drives the insider-spy layer of Shift 4. Reading a Records Wing file is
// FREE (browsing). EXTRACTING it — copying it into [ ].edited — is the
// crime PEARL watches for, so that's where the dice roll lives:
//
//   startExtract(file)  → dice roll by exposure
//        caught  → activeInterrogation = file  (PEARL cover-story modal)
//        slipped → downloadingFile = file       (transfer animation runs)
//   resolveInterrogation(correct)
//        pass → downloadingFile = file (transfer resumes to completion)
//        fail → goDark(file)           (extraction blocked, Frey loses it)
//   completeDownload(file) → writes 'funneled', opens the [ ].edited drawer
//        so the student watches the file land in Frey's channel.
//
// Outcomes persist as NarrativeChoice rows (key `w4_snoop_<id>`, value
// 'funneled' | 'dark') — refresh-safe, read at W5 start to branch the
// resistance story. No backend changes (NarrativeChoice is generic).
// Resolved files are locked — one clean roll each, no carried-over heat.

export type SnoopOutcome = 'funneled' | 'dark';

interface SpyState {
  loaded: boolean;
  /** The student's drop-box dead-drop text, echoed back in Frey's channel. */
  dropBoxText: string | null;
  /** Persisted final outcomes by file id. */
  resolved: Record<string, SnoopOutcome>;
  /** The file currently transferring into [ ].edited (drives the progress bar). */
  downloadingFile: SnoopFile | null;
  /** The file PEARL is interrogating you about (drives the inquiry overlay). */
  activeInterrogation: SnoopFile | null;
  /** Whether the [ ].edited funnel drawer overlay is open. */
  drawerOpen: boolean;

  loadChoices: () => Promise<void>;
  startExtract: (file: SnoopFile) => void;
  resolveInterrogation: (correct: boolean) => void;
  completeDownload: (file: SnoopFile) => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  reset: () => void;
}

export const useSpyStore = create<SpyState>((set, get) => ({
  loaded: false,
  dropBoxText: null,
  resolved: {},
  downloadingFile: null,
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

  startExtract: (file) => {
    const { resolved, downloadingFile, activeInterrogation } = get();
    // Already resolved, mid-transfer, or another interrogation in flight — ignore.
    if (resolved[file.id] || downloadingFile || activeInterrogation) return;

    const caught = Math.random() < CATCH_PROBABILITY[file.exposure];
    if (caught) {
      set({ activeInterrogation: file });
    } else {
      set({ downloadingFile: file });
    }
  },

  resolveInterrogation: (correct) => {
    const file = get().activeInterrogation;
    if (!file) return;
    if (correct) {
      // Cover held — clear the modal and let the transfer run to completion.
      set({ activeInterrogation: null, downloadingFile: file });
    } else {
      // Cover blown — extraction blocked, lead goes dark.
      set({ activeInterrogation: null });
      void writeOutcome(file.id, 'dark', set);
    }
  },

  completeDownload: async (file) => {
    // Guard against double-fire from the progress timer.
    if (get().downloadingFile?.id !== file.id) return;
    set({ downloadingFile: null });
    await writeOutcome(file.id, 'funneled', set);
    // Open the channel so the student watches the intel land with Frey.
    set({ drawerOpen: true });
  },

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  reset: () =>
    set({
      loaded: false,
      dropBoxText: null,
      resolved: {},
      downloadingFile: null,
      activeInterrogation: null,
      drawerOpen: false,
    }),
}));

// Write a snoop outcome to the server (fail-open) and update local state.
async function writeOutcome(
  fileId: string,
  outcome: SnoopOutcome,
  set: (partial: Partial<SpyState>) => void,
) {
  // Optimistic local update so the UI reflects the outcome immediately.
  set({ resolved: { ...useSpyStore.getState().resolved, [fileId]: outcome } });
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
