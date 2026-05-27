import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useViewStore } from '../../stores/viewStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useSpyStore } from '../../stores/spyStore';
import { getHighestUnlockedWeek } from '../../utils/weekUnlock';
import EditedWindow from '../terminal/apps/EditedApp/EditedWindow';

// ─── Funnel Drawer — [ ].edited, reachable mid-shift ─────────────
//
// App-root overlay. A small glitchy `[ ]` floats in the corner across the
// terminal — Current Shift, the Records Wing, any app. It is itself
// DRAGGABLE: grab it and drag it anywhere on screen; a clean tap (no drag)
// opens Frey's channel. So the student can stash the launcher wherever, and
// the channel it opens (EditedWindow) is a draggable window too.
//
// That toggle (Party work on top, secret channel underneath) is the feeling
// of being an insider. Hidden in the 3D office (protect the art; the
// office-view door is the planned entrance there) and inside the full
// [ ].edited app (redundant). W4+ only.

interface Pos {
  x: number;
  y: number;
}

// Last dragged launcher position, persisted across open/close + remounts
// within a page session (the pill unmounts while the channel is open). Resets
// on full reload, which is fine.
let savedPillPos: Pos | null = null;

function defaultPillPos(): Pos {
  if (typeof window === 'undefined') return { x: 16, y: 16 };
  // bottom-left, matching the old `bottom-4 left-4` resting spot
  return { x: 16, y: window.innerHeight - 56 };
}

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
      {showTrigger && <FunnelPill onOpen={openDrawer} />}
      {drawerOpen && <EditedWindow onClose={closeDrawer} />}
    </>
  );
}

// The draggable corner launcher. Drag to reposition; a clean tap (movement
// under the threshold) opens the channel. Pointer Events so it behaves the
// same on mouse and on touchscreen Chromebooks.
function FunnelPill({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const down = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const [pos, setPos] = useState<Pos>(() => savedPillPos ?? defaultPillPos());

  const clampPill = (x: number, y: number): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 52;
    const h = el?.offsetHeight ?? 44;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - h - 8)),
    };
  };

  // Keep the launcher on-screen if the viewport shrinks (rotate / resize).
  useEffect(() => {
    const onResize = () =>
      setPos((p) => {
        const next = clampPill(p.x, p.y);
        savedPillPos = next;
        return next;
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    down.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = down.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Ignore tiny jitter so a tap still reads as a tap, not a drag.
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const next = clampPill(d.px + dx, d.py + dy);
    savedPillPos = next;
    setPos(next);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = down.current;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    down.current = null;
    // If this was a drag, swallow the click that follows so we don't open.
    if (d?.moved) suppressClick.current = true;
  };

  // Open on a clean tap (and on keyboard Enter/Space, which fire click only).
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen();
  };

  return (
    <button
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      aria-label="Open or drag the [ ].edited channel"
      className="edited-pill fixed z-[55] touch-none select-none font-ibm-mono text-sm tracking-[0.3em] text-rose-400/90 bg-slate-900/90 border border-dashed border-slate-700 hover:border-rose-500 rounded-lg px-3 py-2 shadow-lg cursor-grab active:cursor-grabbing transition-colors"
      style={{ left: pos.x, top: pos.y }}
    >
      [ ]
    </button>
  );
}
