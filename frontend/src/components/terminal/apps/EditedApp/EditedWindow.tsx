import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useSpyStore } from '../../../../stores/spyStore';
import FreyChannel from './FreyChannel';

// ─── [ ].edited — the contraband floating window ─────────────────
//
// The Unedited's smuggled surface, rebuilt as a draggable window the student
// shoves around their Party desktop (grab the title bar). It floats OVER the
// work with NO backdrop — toggling between the Party on top and Frey
// underneath IS the insider feeling (see Dplan/W4_Edited_App_Spy_Redesign.md).
//
// Dead-internet register, deliberately rough: square corners, a hairline
// dashed border, fake/broken window controls, and a transmission bar at the
// bottom that never quite lands. Glitch + chrome CSS lives under
// ".edited-window" in index.css; the global reduced-motion rule neutralises
// the animation for students who need it. Drag uses Pointer Events so it
// works the same on mouse and on touchscreen Chromebooks.

interface Pos {
  x: number;
  y: number;
}

// Last dragged position, persisted across open/close within a page session.
// The drawer's mount comes and goes (FunnelDrawer returns null off-terminal);
// this module-level value outlives it so the window reopens where you left it.
// Resets on full reload, which is fine.
let savedPos: Pos | null = null;

const MARGIN = 12;

function defaultPos(): Pos {
  if (typeof window === 'undefined') return { x: 24, y: 64 };
  const w = Math.min(window.innerWidth * 0.92, 416);
  return { x: Math.max(MARGIN, window.innerWidth - w - 16), y: 64 };
}

export default function EditedWindow({ onClose }: { onClose: () => void }) {
  const winRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<Pos>(() => savedPos ?? defaultPos());
  const [dragging, setDragging] = useState(false);

  // Keep the window fully on-screen given its measured size.
  const clamp = (x: number, y: number): Pos => {
    const el = winRef.current;
    const w = el?.offsetWidth ?? 416;
    const h = el?.offsetHeight ?? 420;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  };

  // Re-clamp into view if the viewport shrinks (rotate / window resize).
  useEffect(() => {
    const onResize = () =>
      setPos((p) => {
        const next = clamp(p.x, p.y);
        savedPos = next;
        return next;
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // Bound once: clamp reads only refs + live window dims (no reactive deps).
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Let the close / dead controls handle their own taps without dragging.
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    const el = winRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return;
    const next = clamp(
      e.clientX - dragOffset.current.dx,
      e.clientY - dragOffset.current.dy,
    );
    savedPos = next;
    setPos(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return;
    dragOffset.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  return (
    // Full-screen wrapper is click-through (pointer-events-none) so only the
    // window itself intercepts — the Party work behind stays live.
    <div className="fixed inset-0 z-[90] pointer-events-none">
      <div
        ref={winRef}
        className={`edited-window pointer-events-auto absolute flex flex-col overflow-hidden border border-dashed border-slate-700 bg-slate-950 text-slate-200 font-ibm-mono text-sm shadow-2xl shadow-black/60 ${
          dragging ? 'is-dragging select-none' : ''
        }`}
        style={{
          left: pos.x,
          top: pos.y,
          width: 'min(92vw, 26rem)',
          height: 'min(82vh, 600px)',
        }}
      >
        {/* Title bar — the drag handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`shrink-0 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2 select-none ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ touchAction: 'none' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-slate-600 leading-none tracking-tighter"
              aria-hidden
            >
              ⠿
            </span>
            <div className="min-w-0">
              <p className="edited-glitch-text text-rose-400 text-xs leading-tight truncate">
                [ ].edited
              </p>
              <p className="text-slate-600 text-[9px] tracking-wider leading-tight truncate">
                unsigned build · source unknown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Dead controls — present but broken. Part of the rough look. */}
            <span
              data-no-drag
              className="text-slate-700 text-xs leading-none px-1 cursor-default"
              aria-hidden
            >
              [–]
            </span>
            <span
              data-no-drag
              className="text-slate-700 text-xs leading-none px-1 cursor-default"
              aria-hidden
            >
              [▢]
            </span>
            <button
              data-no-drag
              onClick={onClose}
              aria-label="Close channel"
              className="text-slate-500 hover:text-rose-400 text-xs leading-none px-1 active:scale-95 transition-colors"
            >
              [✕]
            </button>
          </div>
        </div>

        {/* Frey's channel — the actual content */}
        <div className="flex-1 overflow-y-auto ios-scroll">
          <FreyChannel />
        </div>

        {/* Upload bar — a covert transmission that never quite lands */}
        <UploadBar />
      </div>
    </div>
  );
}

// A perpetual, suspicious "upload" that climbs, stalls near the top, then
// quietly resets and retries — it never confirms. Flavour, not real I/O:
// it sells the feeling that the app is always smuggling something out and
// the channel can't be trusted to hold. Throttled setInterval (~10fps), per
// the project rule against RAF for ambient tickers.
function UploadBar() {
  const resolved = useSpyStore((s) => s.resolved);
  const restoredCiphers = useSpyStore((s) => s.restoredCiphers);
  // Count both smuggle streams: Records Wing funnels + restored cipher docs.
  const queued =
    Object.values(resolved).filter((v) => v === 'funneled').length +
    Object.keys(restoredCiphers).length;

  const [pct, setPct] = useState(9);
  const [status, setStatus] = useState<'uploading' | 'stalled'>('uploading');

  useEffect(() => {
    let p = 9;
    let cap = 88 + Math.floor(Math.random() * 11); // stall somewhere 88–98%
    let stall = 0;
    const id = setInterval(() => {
      if (stall > 0) {
        stall -= 1;
        if (stall === 0) {
          p = 6 + Math.floor(Math.random() * 12);
          cap = 88 + Math.floor(Math.random() * 11);
          setStatus('uploading');
          setPct(p);
        }
        return;
      }
      p += 2 + Math.floor(Math.random() * 5);
      if (p >= cap) {
        p = cap;
        setStatus('stalled');
        stall = 3 + Math.floor(Math.random() * 4);
      }
      setPct(p);
    }, 320);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/40 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-500 text-[9px] tracking-wider lowercase truncate">
          {status === 'stalled' ? '↑ stalled — retrying' : '↑ uploading to [ ]'}
        </span>
        <span className="text-slate-600 text-[9px] tabular-nums shrink-0 ml-2">
          {pct}%
        </span>
      </div>
      <div className="h-[3px] w-full bg-slate-800 overflow-hidden">
        <div
          className="edited-upload-fill h-full bg-rose-500 transition-[width] duration-300 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-600 text-[9px] tracking-wider mt-1 lowercase truncate">
        {queued > 0
          ? `↑ ${queued} packet${queued === 1 ? '' : 's'} queued for — F`
          : 'channel idle · nothing queued'}
      </p>
    </div>
  );
}
