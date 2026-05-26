import { useEffect } from 'react';
import { useViewStore } from '../../stores/viewStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useSpyStore } from '../../stores/spyStore';
import { getHighestUnlockedWeek } from '../../utils/weekUnlock';
import FreyChannel from '../terminal/apps/EditedApp/FreyChannel';

// ─── Funnel Drawer — [ ].edited, reachable mid-shift ─────────────
//
// App-root overlay. A small glitchy `[ ]` floats in the corner across the
// terminal — Current Shift, the Records Wing, any app — so the student can
// slide open Frey's channel and funnel WITHOUT leaving their post. That
// toggle (Party work on top, secret channel underneath) is the feeling of
// being an insider.
//
// Hidden in the 3D office (protect the art; the office-view door is the
// planned entrance there) and inside the full [ ].edited app (redundant).
// W4+ only. Reuses FreyChannel — same content as the full app.

export default function FunnelDrawer() {
  const currentView = useViewStore((s) => s.currentView);
  const terminalApp = useViewStore((s) => s.terminalApp);
  const weeks = useSeasonStore((s) => s.weeks);
  const drawerOpen = useSpyStore((s) => s.drawerOpen);
  const openDrawer = useSpyStore((s) => s.openDrawer);
  const closeDrawer = useSpyStore((s) => s.closeDrawer);

  const unlocked = getHighestUnlockedWeek(weeks) >= 4;
  const inTerminal = currentView === 'terminal';

  // If the student leaves the terminal (e.g. back to the office) with the
  // drawer open, close it so it can't hover over the 3D office.
  useEffect(() => {
    if (!inTerminal && drawerOpen) closeDrawer();
  }, [inTerminal, drawerOpen, closeDrawer]);

  if (!unlocked || !inTerminal) return null;

  // Don't show the trigger inside the full [ ].edited app (you're already there).
  const showTrigger = !drawerOpen && terminalApp !== 'edited';

  return (
    <>
      {showTrigger && (
        <button
          onClick={openDrawer}
          aria-label="Open [ ].edited channel"
          className="fixed bottom-4 left-4 z-[55] font-ibm-mono text-sm tracking-[0.3em] text-rose-400/90 bg-slate-900/90 border border-dashed border-slate-700 hover:border-rose-500 rounded-lg px-3 py-2 shadow-lg active:scale-95 transition-colors"
        >
          [ ]
        </button>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-[90]">
          {/* Backdrop — tap to close */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          {/* Sliding channel panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-slate-950 text-slate-200 font-ibm-mono text-sm shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <span className="text-rose-400 text-xs tracking-wider">[ ].edited</span>
              <button
                onClick={closeDrawer}
                className="text-slate-500 hover:text-slate-200 transition-colors active:scale-95"
                aria-label="Close channel"
              >
                [ ✕ ]
              </button>
            </div>
            <div className="flex-1 overflow-y-auto ios-scroll">
              <FreyChannel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
