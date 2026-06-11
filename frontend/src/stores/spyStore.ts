import { create } from 'zustand';
import {
  fetchNarrativeChoices,
  postNarrativeChoice,
} from '../api/narrative-choices';
import {
  CATCH_PROBABILITY,
  FREY_INTRO_CHOICE_KEY,
  SNOOP_RETRY_COOLDOWN_MS,
  snoopChoiceKey,
  type SnoopFile,
} from '../data/spyFiles';

// ─── Spy Store — the optional snooping loop ──────────────────────
//
// Reading a Records Wing file is FREE. EXTRACTING it (copying into
// [ ].edited) is the crime PEARL watches for, so the dice roll lives there.
// Then — before the file transfers — the student completes a language
// ACTIVITY (e.g. the wordgineering decoder) to actually exfiltrate it. The
// activity is the learning; PEARL is the risk; the transfer is the payoff.
//
//   startExtract(file)  → dice roll by exposure
//        caught  → activeInterrogation = file   (PEARL cover-story modal)
//        slipped → activity (if any) else transfer
//   resolveInterrogation(correct)
//        pass → activity (if any) else transfer
//        fail → goDark(file)            (extraction blocked)
//   completeActivity(file) → downloadingFile = file   (transfer runs)
//   completeDownload(file) → writes 'funneled', opens the [ ].edited drawer
//
// Outcomes persist as NarrativeChoice rows (`w4_snoop_<id>` = funneled|dark),
// read at W5 start to branch the story. Resolved files lock (one clean roll).

export type SnoopOutcome = 'funneled' | 'dark';

/** A document restored + uploaded by the REQUIRED Cipher Decryption task. */
export interface RestoredCipher {
  /** The one-line intel headline that surfaces in Frey's channel. */
  intel: string;
}

interface SpyState {
  loaded: boolean;
  /** The student's drop-box dead-drop text, echoed back in Frey's channel. */
  dropBoxText: string | null;
  /** Persisted final outcomes by file id. */
  resolved: Record<string, SnoopOutcome>;
  /** When each dark lead went dark (epoch ms) — drives the retry cooldown. */
  darkAt: Record<string, number>;
  /**
   * Documents restored by the Cipher Decryption task and uploaded to
   * [ ].edited, keyed by cipher doc id. Persisted as NarrativeChoice
   * `w4_cipher_<id>` = 'restored' (context.intel). Rendered in FreyChannel.
   */
  restoredCiphers: Record<string, RestoredCipher>;
  /** The file whose extraction ACTIVITY is currently running (decoder, etc.). */
  activeActivity: SnoopFile | null;
  /** The file currently transferring into [ ].edited (drives the progress bar). */
  downloadingFile: SnoopFile | null;
  /** The file PEARL is interrogating you about (drives the inquiry overlay). */
  activeInterrogation: SnoopFile | null;
  /** Whether the [ ].edited funnel drawer overlay is open. */
  drawerOpen: boolean;
  /** Whether Frey's one-time first-contact note has been dismissed. */
  introSeen: boolean;

  loadChoices: () => Promise<void>;
  startExtract: (file: SnoopFile) => void;
  resolveInterrogation: (correct: boolean) => void;
  completeActivity: (file: SnoopFile) => void;
  completeDownload: (file: SnoopFile) => Promise<void>;
  /** Record a Cipher-task document as restored + uploaded to [ ].edited. */
  uploadCipherDoc: (doc: { id: string; intel: string }) => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Dismiss Frey's first-contact note (persists one-shot per pair). */
  markIntroSeen: () => Promise<void>;
  reset: () => void;
}

// Once past PEARL, either run the file's activity or go straight to transfer.
function proceedAfterClearance(file: SnoopFile, set: (p: Partial<SpyState>) => void) {
  if (file.activity) {
    set({ activeActivity: file });
  } else {
    set({ downloadingFile: file });
  }
}

// Load epoch — a loadChoices that outlives logout must not restore student
// A's W4 spy state (funneled leads, restored ciphers, drop-box echo) into B's
// cleared store.
let loadEpoch = 0;

export const useSpyStore = create<SpyState>((set, get) => ({
  loaded: false,
  dropBoxText: null,
  resolved: {},
  darkAt: {},
  restoredCiphers: {},
  activeActivity: null,
  downloadingFile: null,
  activeInterrogation: null,
  drawerOpen: false,
  introSeen: false,

  loadChoices: async () => {
    const epoch = ++loadEpoch;
    try {
      const choices = await fetchNarrativeChoices(4);
      if (epoch !== loadEpoch) return; // superseded by reset()/newer load
      const resolved: Record<string, SnoopOutcome> = {};
      const darkAt: Record<string, number> = {};
      const restoredCiphers: Record<string, RestoredCipher> = {};
      let dropBoxText: string | null = null;
      let introSeen = false;
      // Ordered createdAt asc — later writes win (last-write-wins per key).
      for (const c of choices) {
        if (c.choiceKey.startsWith('w4_snoop_')) {
          const id = c.choiceKey.replace('w4_snoop_', '');
          if (c.value === 'funneled' || c.value === 'dark') {
            resolved[id] = c.value;
            if (c.value === 'dark') darkAt[id] = Date.parse(c.createdAt) || 0;
          }
        } else if (c.choiceKey.startsWith('w4_cipher_')) {
          if (c.value === 'restored') {
            const id = c.choiceKey.replace('w4_cipher_', '');
            const intel = typeof c.context?.intel === 'string' ? c.context.intel : '';
            restoredCiphers[id] = { intel };
          }
        } else if (c.choiceKey === 'w4_drop_box_first_submission') {
          // Only echo text the student actually POSTED. Older 'skipped' rows
          // could still carry typed-but-unsent drafts in context.text — those
          // must not appear in Frey's "you told me" section.
          const text = typeof c.context?.text === 'string' ? c.context.text.trim() : '';
          if (c.value === 'submitted' && text.length > 0) dropBoxText = text;
        } else if (c.choiceKey === FREY_INTRO_CHOICE_KEY) {
          if (c.value === 'seen') introSeen = true;
        }
      }
      set({ resolved, darkAt, restoredCiphers, dropBoxText, introSeen, loaded: true });
    } catch {
      if (epoch !== loadEpoch) return; // stale rejection — don't mark loaded
      // Fail-open — an unreachable choices endpoint shouldn't block the app.
      set({ loaded: true });
    }
  },

  startExtract: (file) => {
    const { resolved, darkAt, downloadingFile, activeInterrogation, activeActivity } = get();
    // Mid-flow or another interrogation in flight — ignore.
    if (downloadingFile || activeInterrogation || activeActivity) return;
    if (resolved[file.id] === 'funneled') return;
    if (resolved[file.id] === 'dark') {
      // A dead lead reopens after the cooldown — clear it and roll fresh.
      if (Date.now() - (darkAt[file.id] ?? 0) < SNOOP_RETRY_COOLDOWN_MS) return;
      const { [file.id]: _dropped, ...rest } = resolved;
      set({ resolved: rest });
    }

    const caught = Math.random() < CATCH_PROBABILITY[file.exposure];
    if (caught) {
      set({ activeInterrogation: file });
    } else {
      proceedAfterClearance(file, set);
    }
  },

  resolveInterrogation: (correct) => {
    const file = get().activeInterrogation;
    if (!file) return;
    set({ activeInterrogation: null });
    if (correct) {
      proceedAfterClearance(file, set);
    } else {
      // Cover blown — extraction blocked, lead goes dark.
      void writeOutcome(file.id, 'dark', set);
    }
  },

  completeActivity: (file) => {
    if (get().activeActivity?.id !== file.id) return;
    set({ activeActivity: null, downloadingFile: file });
  },

  completeDownload: async (file) => {
    // Guard against double-fire from the progress timer.
    if (get().downloadingFile?.id !== file.id) return;
    set({ downloadingFile: null });
    await writeOutcome(file.id, 'funneled', set);
    // Open the channel so the student watches the intel land with Frey.
    set({ drawerOpen: true });
  },

  uploadCipherDoc: async (doc) => {
    // Already persisted this doc (server load or an earlier upload this session)?
    // Reflect it locally but skip the POST so refresh/replay can't pile up
    // duplicate `w4_cipher_<id>` rows (the route inserts, it doesn't upsert).
    const already = Boolean(get().restoredCiphers[doc.id]);
    // Optimistic local update so Frey's channel reflects it immediately.
    set({
      restoredCiphers: {
        ...get().restoredCiphers,
        [doc.id]: { intel: doc.intel },
      },
    });
    if (already) return;
    try {
      await postNarrativeChoice({
        choiceKey: `w4_cipher_${doc.id}`,
        value: 'restored',
        weekNumber: 4,
        context: { intel: doc.intel },
      });
    } catch (err) {
      // Keep the optimistic state; the doc is restored for this session even
      // if the write failed (matches writeOutcome's fail-open behaviour).
      console.error('Failed to record cipher restoration:', err);
    }
  },

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  markIntroSeen: async () => {
    if (get().introSeen) return;
    // Optimistic — worst case a failed write replays the note next login
    // (matches writeOutcome's fail-open behaviour).
    set({ introSeen: true });
    try {
      await postNarrativeChoice({
        choiceKey: FREY_INTRO_CHOICE_KEY,
        value: 'seen',
        weekNumber: 4,
      });
    } catch (err) {
      console.error('Failed to record Frey intro dismissal:', err);
    }
  },

  reset: () => {
    loadEpoch++; // invalidate in-flight loadChoices
    set({
      loaded: false,
      dropBoxText: null,
      resolved: {},
      darkAt: {},
      restoredCiphers: {},
      activeActivity: null,
      downloadingFile: null,
      activeInterrogation: null,
      drawerOpen: false,
      introSeen: false,
    });
  },
}));

// Write a snoop outcome to the server (fail-open) and update local state.
async function writeOutcome(
  fileId: string,
  outcome: SnoopOutcome,
  set: (partial: Partial<SpyState>) => void,
) {
  // Optimistic local update so the UI reflects the outcome immediately.
  const patch: Partial<SpyState> = {
    resolved: { ...useSpyStore.getState().resolved, [fileId]: outcome },
  };
  if (outcome === 'dark') {
    patch.darkAt = { ...useSpyStore.getState().darkAt, [fileId]: Date.now() };
  }
  set(patch);
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
