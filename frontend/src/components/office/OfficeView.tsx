import { useEffect, useState, useCallback, useRef } from 'react';
import { useViewStore } from '../../stores/viewStore';
import { useViewTheme } from '../../hooks/useViewTheme';
import { useStudentStore } from '../../stores/studentStore';
import OfficeHUD from './OfficeHUD';
import PearlSphere3D from './PearlSphere3D';
import PearlPanel from '../pearl/PearlPanel';

// Source image: 2528×1696. Screen area measured in image-space percentages.
const IMG_W = 2528;
const IMG_H = 1696;
// All overlay positions defined in image-space percentages (cx, cy = center; w, h = size)
const SCREEN     = { cx: 0.500, cy: 0.663, w: 0.236, h: 0.238 };
const SPHERE     = { cx: 0.500, cy: 0.162, w: 0.164, h: 0.222 };
const NEON_STRIP = { cx: 0.500, cy: 0.292, w: 0.640, h: 0.002 };
const LEFT_WALL  = { cx: 0.015, cy: 0.280, w: 0.002, h: 0.150 };
const RIGHT_WALL = { cx: 0.985, cy: 0.280, w: 0.002, h: 0.150 };
const FLOOR_GLOW = { cx: 0.500, cy: 0.880, w: 0.600, h: 0.080 };
const HINT_SIGN  = { cx: 0.500, cy: 0.835, w: 0.200, h: 0.022 };
const IMAGE_FULL = { cx: 0.500, cy: 0.500, w: 1.000, h: 1.000 };
const POSTER     = { cx: 0.790, cy: 0.260, w: 0.110, h: 0.140 };

const PROPAGANDA = [
  'EVERY WORD MATTERS \u2022 EVERY WORD HELPS',
  'TOGETHER WE SPEAK CLEARLY',
  'YOUR CLARITY MAKES US STRONGER',
  'HEALTHY COMMUNICATION \u2022 HEALTHY COMMUNITY',
  'SPEAK WELL \u2022 LIVE WELL',
  'THE REPUBLIC THANKS YOU FOR YOUR SERVICE',
  'PRECISION IN LANGUAGE \u2022 HARMONY IN LIFE',
  'YOUR WORDS BUILD A BETTER TOMORROW',
  'CLARITY IS KINDNESS',
  'A CLEAR VOICE IS A HAPPY VOICE',
];

// ─── Propaganda Chyron (3D sphere-wrapping illusion) ──────────
function PropagandaChyron({
  text,
  sphereWidth,
  visible,
}: {
  text: string;
  sphereWidth: number;
  visible: boolean;
}) {
  const rafRef = useRef(0);
  const scrollRef = useRef(0);
  const spansRef = useRef<(HTMLSpanElement | null)[]>([]);
  const prevTextRef = useRef('');

  const fontSize = Math.max(8, sphereWidth * 0.055);
  const charW = fontSize * 0.6 + 3; // monospace char width + letter-spacing
  const gap = '      ';
  const segment = text + gap;
  const segmentPx = segment.length * charW;
  const fullText = segment + segment + segment;

  useEffect(() => {
    if (!visible || sphereWidth <= 0) return;

    // Reset scroll position when text changes (enter from right)
    if (prevTextRef.current !== text) {
      scrollRef.current = sphereWidth * 0.8;
      prevTextRef.current = text;
    }

    const center = sphereWidth / 2;
    const visibleHalf = sphereWidth * 0.8;
    const speed = sphereWidth * 0.13;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      scrollRef.current -= speed * dt;

      if (scrollRef.current < -segmentPx) {
        scrollRef.current += segmentPx;
      }

      const spans = spansRef.current;
      for (let i = 0; i < spans.length; i++) {
        const el = spans[i];
        if (!el) continue;

        const x = scrollRef.current + i * charW;
        const mid = x + charW / 2;
        const norm = (mid - center) / visibleHalf;
        const clamped = Math.max(-1, Math.min(1, norm));
        const cos = Math.cos(clamped * Math.PI * 0.5);

        // Scale: 0.6 at edges → 1.1 at center (sphere curvature)
        const s = 0.6 + 0.5 * cos;
        // Opacity: gentle cosine fade at edges (no power curve)
        const a = Math.max(0, cos);
        // Y offset: subtle downward arc at edges (sphere surface)
        const y = (1 - cos) * sphereWidth * 0.04;

        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%) scale(${s.toFixed(3)})`;
        el.style.opacity = a.toFixed(3);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, text, sphereWidth, segmentPx, charW]);

  if (sphereWidth <= 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {fullText.split('').map((char, i) => (
        <span
          key={i}
          ref={(el) => { spansRef.current[i] = el; }}
          className="font-ibm-mono"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            fontSize,
            color: 'rgba(255, 255, 255, 0.92)',
            textShadow: '0 0 8px rgba(0, 229, 255, 0.6), 0 0 20px rgba(0, 229, 255, 0.25)',
            lineHeight: 1,
            whiteSpace: 'pre',
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

/** Map a point from image-space % to viewport px, accounting for object-contain */
function imageToViewport(vw: number, vh: number) {
  // object-contain: scale to fit entire image, then center
  const scale = Math.min(vw / IMG_W, vh / IMG_H);
  const padX = (vw - IMG_W * scale) / 2;
  const padY = (vh - IMG_H * scale) / 2;
  return (rect: { cx: number; cy: number; w: number; h: number }) => ({
    left: padX + rect.cx * IMG_W * scale - (rect.w * IMG_W * scale) / 2,
    top: padY + rect.cy * IMG_H * scale - (rect.h * IMG_H * scale) / 2,
    width: rect.w * IMG_W * scale,
    height: rect.h * IMG_H * scale,
  });
}

export default function OfficeView() {
  useViewTheme();
  const enterTerminal = useViewStore((s) => s.enterTerminal);
  const { logout } = useStudentStore();
  const [pearlVisible, setPearlVisible] = useState(true);
  const [pearlOpen, setPearlOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [time, setTime] = useState(new Date());
  const [screenFlicker, setScreenFlicker] = useState(false);
  const [propagandaVisible, setPropagandaVisible] = useState(false);
  const [propagandaText, setPropagandaText] = useState(PROPAGANDA[0]);
  const screenFlickerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const propagandaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pearlVisibleRef = useRef(true);
  const zero = { left: 0, top: 0, width: 0, height: 0 };
  const [rects, setRects] = useState({
    monitor: zero, sphere: zero, neonStrip: zero,
    leftWall: zero, rightWall: zero, floorGlow: zero, hintSign: zero, imageBounds: zero,
    poster: zero,
  });

  const recalc = useCallback(() => {
    const map = imageToViewport(window.innerWidth, window.innerHeight);
    setRects({
      monitor: map(SCREEN),
      sphere: map(SPHERE),
      neonStrip: map(NEON_STRIP),
      leftWall: map(LEFT_WALL),
      rightWall: map(RIGHT_WALL),
      floorGlow: map(FLOOR_GLOW),
      hintSign: map(HINT_SIGN),
      imageBounds: map(IMAGE_FULL),
      poster: map(POSTER),
    });
  }, []);

  useEffect(() => {
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [recalc]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sync pearlVisibleRef for propaganda scheduling
  useEffect(() => {
    pearlVisibleRef.current = pearlVisible;
  }, [pearlVisible]);

  // Monitor ambient cyan flicker — rare organic power fluctuation
  useEffect(() => {
    const schedule = () => {
      const delay = 20000 + Math.random() * 25000;
      screenFlickerRef.current = setTimeout(() => {
        setScreenFlicker(true);
        screenFlickerRef.current = setTimeout(() => {
          setScreenFlicker(false);
          schedule();
        }, 120);
      }, delay);
    };
    schedule();
    return () => {
      if (screenFlickerRef.current) clearTimeout(screenFlickerRef.current);
    };
  }, []);

  // PEARL propaganda chyron — shows every 15-25s for 14s when face not showing
  useEffect(() => {
    const schedule = () => {
      const delay = 15000 + Math.random() * 10000;
      propagandaTimeoutRef.current = setTimeout(() => {
        if (pearlVisibleRef.current) {
          // Face showing — skip, try again in 5s
          propagandaTimeoutRef.current = setTimeout(schedule, 5000);
          return;
        }
        setPropagandaText(PROPAGANDA[Math.floor(Math.random() * PROPAGANDA.length)]);
        setPropagandaVisible(true);
        propagandaTimeoutRef.current = setTimeout(() => {
          setPropagandaVisible(false);
          schedule();
        }, 14000);
      }, delay);
    };
    schedule();
    return () => {
      if (propagandaTimeoutRef.current) clearTimeout(propagandaTimeoutRef.current);
    };
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#a8a49c]">
      {/* Blurred background fill — bleeds image edge colors into padding areas */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/images/office-bg.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'blur(40px)', transform: 'scale(1.15)' }}
          draggable={false}
          aria-hidden="true"
        />
      </div>

      {/* Concept art background — sharp, fully visible */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/office-bg.jpg"
          alt="Ministry Hall"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* === Neon light effects layer === */}

      {/* Ceiling LED strip glow — horizontal band across top */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={{
          left: rects.neonStrip.left,
          top: rects.neonStrip.top,
          width: rects.neonStrip.width,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.6) 20%, rgba(0, 229, 255, 0.8) 50%, rgba(0, 229, 255, 0.6) 80%, transparent)',
          boxShadow: '0 0 20px 6px rgba(0, 229, 255, 0.25), 0 0 60px 15px rgba(0, 229, 255, 0.1)',
          animation: 'neonPulse 4s ease-in-out infinite',
        }}
      />

      {/* PEARL sphere pulsating light — slow cyan radial pulse beneath sphere */}
      <div
        className="absolute z-[1] pointer-events-none rounded-full"
        style={{
          left: rects.sphere.left + rects.sphere.width / 2,
          top: rects.sphere.top + rects.sphere.height / 2,
          transform: 'translate(-50%, -50%)',
          width: rects.sphere.width * 1.5,
          height: rects.sphere.height * 1.5,
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.06) 40%, transparent 70%)',
          animation: 'spherePulse 6s ease-in-out infinite',
          opacity: pearlVisible ? 1 : 0,
          transition: 'opacity 1s ease-out',
        }}
      />

      {/* PEARL sphere glow ring */}
      <div
        className="absolute z-[1] pointer-events-none rounded-full"
        style={{
          left: rects.sphere.left,
          top: rects.sphere.top,
          width: rects.sphere.width,
          height: rects.sphere.height,
          boxShadow: '0 0 30px 10px rgba(0, 229, 255, 0.3), 0 0 80px 20px rgba(0, 229, 255, 0.12), inset 0 0 20px 5px rgba(0, 229, 255, 0.15)',
          animation: pearlVisible ? 'sphereGlow 3s ease-in-out infinite' : 'none',
          opacity: pearlVisible ? 1 : 0.15,
          transition: 'opacity 0.15s ease-out',
        }}
      />

      {/* PEARL 3D glass sphere — swirl lights + video face + glass shell */}
      <div
        className="absolute z-[2] pointer-events-none rounded-full overflow-hidden"
        style={{
          left: rects.sphere.left,
          top: rects.sphere.top,
          width: rects.sphere.width,
          height: rects.sphere.height,
          WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
        }}
      >
        <PearlSphere3D visible={pearlVisible} onVisibilityChange={setPearlVisible} isMuted={isMuted} />
      </div>

      {/* === Monitor screen effects === */}

      {/* Monitor ambient glow — always visible, pulses */}
      <div
        className="absolute z-[1] pointer-events-none rounded-sm"
        style={{
          left: rects.monitor.left,
          top: rects.monitor.top,
          width: rects.monitor.width,
          height: rects.monitor.height,
          boxShadow: '0 0 40px 12px rgba(91, 184, 212, 0.2), 0 0 80px 25px rgba(91, 184, 212, 0.08)',
          animation: 'monitorGlow 3s ease-in-out infinite',
        }}
      />

      {/* Monitor scanline sweep */}
      <div
        className="absolute z-[2] pointer-events-none overflow-hidden rounded-sm"
        style={{
          left: rects.monitor.left,
          top: rects.monitor.top,
          width: rects.monitor.width,
          height: rects.monitor.height,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(180deg, transparent, rgba(91, 184, 212, 0.4), transparent)',
            boxShadow: '0 0 8px 2px rgba(91, 184, 212, 0.3)',
            animation: 'scanSweep 4s linear infinite',
          }}
        />
      </div>

      {/* Monitor CRT flicker overlay */}
      <div
        className="absolute z-[2] pointer-events-none rounded-sm"
        style={{
          left: rects.monitor.left,
          top: rects.monitor.top,
          width: rects.monitor.width,
          height: rects.monitor.height,
          background: 'radial-gradient(ellipse at center, rgba(91, 184, 212, 0.06) 0%, transparent 70%)',
          animation: 'crtFlicker 0.1s step-end infinite',
        }}
      />

      {/* Clickable monitor hotspot */}
      <button
        onClick={() => enterTerminal('desktop')}
        className="absolute z-[4] cursor-pointer group"
        style={{
          left: rects.monitor.left,
          top: rects.monitor.top,
          width: rects.monitor.width,
          height: rects.monitor.height,
        }}
        aria-label="Begin your shift"
      >
        {/* Subtle hover glow */}
        <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.08) 0%, transparent 60%)',
          }}
        />
        {/* BEGIN SHIFT — frosted glass pill centered on screen */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
            style={{
              width: rects.monitor.width * 0.55,
              height: Math.max(24, rects.monitor.height * 0.16),
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(0,229,255,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px rgba(0,229,255,0.1)',
            }}
          >
            <span
              className="font-ibm-mono tracking-[3px]"
              style={{
                fontSize: Math.max(9, rects.monitor.height * 0.08),
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 0 8px rgba(0,229,255,0.5)',
                lineHeight: 1,
              }}
            >
              BEGIN SHIFT
            </span>
          </div>
        </div>
      </button>

      {/* "Click screen to begin shift" hint sign — pill between monitor and keyboard */}
      <div
        className="absolute z-[3] pointer-events-none flex items-center justify-center"
        style={{
          left: rects.hintSign.left,
          top: rects.hintSign.top,
          width: rects.hintSign.width,
          height: rects.hintSign.height,
        }}
      >
        <div
          className="rounded-full flex items-center justify-center w-full h-full"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(0,229,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <span
            className="font-ibm-mono tracking-[2px]"
            style={{
              fontSize: Math.max(7, rects.hintSign.height * 0.4),
              color: 'rgba(255,255,255,0.55)',
              textShadow: '0 0 4px rgba(0,229,255,0.2)',
              lineHeight: 1,
            }}
          >
            CLICK SCREEN TO BEGIN SHIFT
          </span>
        </div>
      </div>

      {/* === Monitor on-screen UI (iOS dystopia style) === */}
      {(() => {
        const pillW = rects.monitor.width * 0.28;
        const pillH = Math.max(20, rects.monitor.height * 0.16);
        const pillFont = Math.max(8, rects.monitor.height * 0.09);
        const inset = rects.monitor.width * 0.04;
        return (
          <div
            className="absolute z-[5] flex items-end justify-between pointer-events-none"
            style={{
              left: rects.monitor.left,
              top: rects.monitor.top,
              width: rects.monitor.width,
              height: rects.monitor.height,
              paddingLeft: inset,
              paddingRight: inset,
              paddingBottom: Math.max(4, rects.monitor.height * 0.04),
            }}
          >
            {/* Clock pill — bottom left (status display, not clickable) */}
            <div
              className="rounded-full flex items-center justify-center gap-1.5"
              style={{
                width: pillW,
                height: pillH,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(0,229,255,0.08) 100%)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <div
                className="rounded-full animate-pulse"
                style={{
                  width: Math.max(4, pillH * 0.22),
                  height: Math.max(4, pillH * 0.22),
                  background: '#69F0AE',
                  boxShadow: '0 0 4px rgba(105,240,174,0.6)',
                }}
              />
              <span
                className="font-dseg7"
                style={{
                  fontSize: pillFont,
                  color: 'rgba(255,255,255,0.92)',
                  textShadow: '0 0 8px rgba(0,229,255,0.5)',
                  lineHeight: 1,
                }}
              >
                {hours}:{minutes}
              </span>
            </div>

            {/* LOG OFF pill — bottom right (clickable action) */}
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              className="pointer-events-auto cursor-pointer transition-all duration-200 rounded-full flex items-center justify-center"
              style={{
                width: pillW,
                height: pillH,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,64,129,0.05) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,64,129,0.12) 100%)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,64,129,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,64,129,0.05) 100%)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)';
              }}
              aria-label="Log off"
            >
              <span
                className="font-ibm-mono tracking-[2px]"
                style={{
                  fontSize: pillFont,
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1,
                }}
              >
                LOG OFF
              </span>
            </button>
          </div>
        );
      })()}

      {/* === Ambient room light accents === */}

      {/* Left wall neon strip */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={{
          left: rects.leftWall.left,
          top: rects.leftWall.top,
          width: '2px',
          height: rects.leftWall.height,
          background: 'linear-gradient(180deg, transparent, rgba(0, 229, 255, 0.4), rgba(0, 229, 255, 0.5), rgba(0, 229, 255, 0.4), transparent)',
          boxShadow: '0 0 12px 3px rgba(0, 229, 255, 0.2)',
          animation: 'neonPulse 5s ease-in-out infinite 1s',
        }}
      />

      {/* Right wall neon strip */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={{
          left: rects.rightWall.left,
          top: rects.rightWall.top,
          width: '2px',
          height: rects.rightWall.height,
          background: 'linear-gradient(180deg, transparent, rgba(0, 229, 255, 0.4), rgba(0, 229, 255, 0.5), rgba(0, 229, 255, 0.4), transparent)',
          boxShadow: '0 0 12px 3px rgba(0, 229, 255, 0.2)',
          animation: 'neonPulse 5s ease-in-out infinite 2s',
        }}
      />

      {/* Floor reflection glow — subtle ambient bounce from neon */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={{
          left: rects.floorGlow.left,
          top: rects.floorGlow.top,
          width: rects.floorGlow.width,
          height: rects.floorGlow.height,
          background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.06) 0%, transparent 70%)',
          animation: 'neonPulse 4s ease-in-out infinite 0.5s',
        }}
      />

      {/* Propaganda poster warm spotlight — right wall "SIMPLE WORDS" */}
      <div
        className="absolute z-[1] pointer-events-none"
        style={{
          left: rects.poster.left,
          top: rects.poster.top,
          width: rects.poster.width,
          height: rects.poster.height,
          background: 'radial-gradient(ellipse, rgba(255, 220, 160, 0.22) 0%, rgba(255, 200, 120, 0.06) 50%, transparent 75%)',
          animation: 'posterGlow 5s ease-in-out infinite',
        }}
      />

      {/* Monitor ambient cyan flicker — rare organic power fluctuation */}
      <div
        className="absolute z-[2] pointer-events-none rounded-sm"
        style={{
          left: rects.monitor.left,
          top: rects.monitor.top,
          width: rects.monitor.width,
          height: rects.monitor.height,
          background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.10) 0%, rgba(0, 229, 255, 0.04) 50%, transparent 80%)',
          opacity: screenFlicker ? 1 : 0,
          transition: 'opacity 40ms ease',
        }}
      />

      {/* PEARL sphere propaganda chyron — text wrapping around the sphere */}
      <div
        className="absolute z-[2] pointer-events-none"
        style={{
          left: rects.sphere.left,
          top: rects.sphere.top,
          width: rects.sphere.width,
          height: rects.sphere.height,
          overflow: 'hidden',
          opacity: (propagandaVisible && !pearlVisible) ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <PropagandaChyron
          text={propagandaText}
          sphereWidth={rects.sphere.width}
          visible={propagandaVisible && !pearlVisible}
        />
      </div>

      {/* React HUD overlay — constrained to visible image area, pointer-events-none so monitor clicks pass through */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          left: rects.imageBounds.left,
          top: rects.imageBounds.top,
          width: rects.imageBounds.width,
          height: rects.imageBounds.height,
        }}
      >
        <OfficeHUD isMuted={isMuted} setIsMuted={setIsMuted} pearlOpen={pearlOpen} setPearlOpen={setPearlOpen} />
      </div>

      {/* PEARL Panel — rendered outside imageBounds so it gets proper stacking context + pointer events */}
      <PearlPanel
        open={pearlOpen}
        onClose={() => setPearlOpen(false)}
        variant="chrome"
      />

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes neonPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes spherePulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(0.85);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 1;
          }
        }
        @keyframes sphereGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes monitorGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes scanSweep {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes crtFlicker {
          0% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        @keyframes posterGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

      `}</style>
    </div>
  );
}
