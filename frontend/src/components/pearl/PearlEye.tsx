import { useState, useEffect, useRef, useCallback } from 'react';
import { usePearlStore } from '../../stores/pearlStore';
import { useShiftStore } from '../../stores/shiftStore';

type AttentionMoment = 'none' | 'wide_gaze' | 'slow_focus' | 'double_blink' | 'iris_pulse';

function getAvailableMoments(weekNumber: number): AttentionMoment[] {
  const moments: AttentionMoment[] = ['wide_gaze', 'double_blink'];
  if (weekNumber >= 7) moments.push('slow_focus');
  if (weekNumber >= 10) moments.push('iris_pulse');
  return moments;
}

function getMomentInterval(weekNumber: number): [number, number] {
  return weekNumber >= 14 ? [45000, 90000] : [60000, 120000];
}

const LOOK_TARGETS = [
  { x: 0, y: 0 },
  { x: -4, y: -2 },
  { x: 3, y: 1 },
  { x: 0, y: 0 },
  { x: -2, y: 3 },
  { x: 0, y: 0 },
  { x: 5, y: -1 },
  { x: 0, y: 0 },
  { x: -3, y: -3 },
  { x: 1, y: 2 },
  { x: 0, y: 0 },
];

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const EYE_STYLES = {
  welcoming: {
    iris: ['#6CFF6C', '#2FCE2F', '#1E771E'],
    sclera: '#d6f4d6',
    scleraStroke: '#245224',
    lid: '#081008',
    lidStroke: '#2a5f2a',
    pupil: '#030803',
    ring: 'rgba(51,255,51,0.20)',
    pulse: true,
    pulseMs: 3000,
    flicker: false,
  },
  attentive: {
    iris: ['#7DFF7D', '#35D235', '#1C7A1C'],
    sclera: '#d2f0d2',
    scleraStroke: '#275727',
    lid: '#071007',
    lidStroke: '#2f662f',
    pupil: '#020702',
    ring: 'rgba(81,255,81,0.35)',
    pulse: true,
    pulseMs: 2000,
    flicker: false,
  },
  evaluative: {
    iris: ['#7BFF7B', '#31C931', '#196E19'],
    sclera: '#d0ecd0',
    scleraStroke: '#2d5b2d',
    lid: '#070f07',
    lidStroke: '#325f32',
    pupil: '#020702',
    ring: 'rgba(255,170,0,0.45)',
    pulse: false,
    pulseMs: 0,
    flicker: false,
  },
  confused: {
    iris: ['#B7D4B7', '#6F8A6F', '#4A5A4A'],
    sclera: '#d3ddd3',
    scleraStroke: '#556255',
    lid: '#0c100c',
    lidStroke: '#4f5e4f',
    pupil: '#050805',
    ring: 'rgba(160,160,160,0.45)',
    pulse: true,
    pulseMs: 2600,
    flicker: true,
  },
  alarmed: {
    iris: ['#FF7A7A', '#D64242', '#7E1F1F'],
    sclera: '#f0d7d7',
    scleraStroke: '#733535',
    lid: '#120707',
    lidStroke: '#8a3d3d',
    pupil: '#140303',
    ring: 'rgba(255,170,0,0.55)',
    pulse: true,
    pulseMs: 900,
    flicker: false,
  },
  frantic: {
    iris: ['#FF8E8E', '#43D443', '#852626'],
    sclera: '#ecd7d7',
    scleraStroke: '#6a3b3b',
    lid: '#120707',
    lidStroke: '#8d4a4a',
    pupil: '#150404',
    ring: 'rgba(255,90,90,0.60)',
    pulse: true,
    pulseMs: 700,
    flicker: true,
  },
  cold: {
    iris: ['#FFFFFF', '#E8E8E8', '#B9B9B9'],
    sclera: '#efefef',
    scleraStroke: '#b7b7b7',
    lid: '#161616',
    lidStroke: '#8d8d8d',
    pupil: '#1f1f1f',
    ring: 'rgba(255,255,255,0.35)',
    pulse: false,
    pulseMs: 0,
    flicker: false,
  },
  breaking: {
    iris: ['#FFD37A', '#D65252', '#3AB53A'],
    sclera: '#eadfce',
    scleraStroke: '#7f6e58',
    lid: '#16100b',
    lidStroke: '#9f815f',
    pupil: '#23170d',
    ring: 'rgba(255,170,0,0.55)',
    pulse: true,
    pulseMs: 550,
    flicker: true,
  },
  final: {
    iris: ['#FFD38B', '#E7A84F', '#A36D27'],
    sclera: '#f3e5cb',
    scleraStroke: '#8a6a3a',
    lid: '#191106',
    lidStroke: '#9a7d4f',
    pupil: '#2a1d0b',
    ring: 'rgba(255,190,100,0.45)',
    pulse: true,
    pulseMs: 3200,
    flicker: false,
  },
} as const;

interface PearlEyeProps {
  onClick: () => void;
  panelOpen: boolean;
  variant?: 'chrome' | 'crt';
  size?: 'sm' | 'md' | 'lg';
}

export default function PearlEye({ onClick, panelOpen, variant = 'chrome', size = 'md' }: PearlEyeProps) {
  const eyeState = usePearlStore((s) => s.eyeState);
  const currentWeek = useShiftStore((s) => s.currentWeek);
  const weekNumber = currentWeek?.weekNumber ?? 1;

  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [targetIndex, setTargetIndex] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [attentionMoment, setAttentionMoment] = useState<AttentionMoment>('none');
  const animFrameRef = useRef<number>(0);
  const currentPos = useRef({ x: 0, y: 0 });
  const slowFocusOverride = useRef(false);

  // Trigger a double-blink sequence
  const triggerDoubleBlink = useCallback(() => {
    setIsBlinking(true);
    setTimeout(() => {
      setIsBlinking(false);
      setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }, 200);
    }, 150);
  }, []);

  // Pupil animation — respects slow_focus override
  useEffect(() => {
    const animateFrame = () => {
      const target = slowFocusOverride.current
        ? { x: 0, y: 0 }
        : LOOK_TARGETS[targetIndex];
      currentPos.current.x += (target.x - currentPos.current.x) * 0.08;
      currentPos.current.y += (target.y - currentPos.current.y) * 0.08;
      setPupilOffset({ x: currentPos.current.x, y: currentPos.current.y });
      animFrameRef.current = requestAnimationFrame(animateFrame);
    };

    animFrameRef.current = requestAnimationFrame(animateFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [targetIndex]);

  // Look-around scheduling
  useEffect(() => {
    const schedule = (): ReturnType<typeof setTimeout> => {
      const delay = 1500 + Math.random() * 2500;
      return setTimeout(() => {
        setTargetIndex((i) => (i + 1) % LOOK_TARGETS.length);
        timerRef.current = schedule();
      }, delay);
    };
    const timerRef = { current: schedule() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // Regular blink
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Panel open resets look position
  useEffect(() => {
    if (panelOpen) {
      currentPos.current = { x: 0, y: 0 };
    }
  }, [panelOpen]);

  // Attention moments — organic micro-animations every 60-120s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let durationTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const [min, max] = getMomentInterval(weekNumber);
      const delay = min + Math.random() * (max - min);
      timer = setTimeout(() => {
        if (cancelled) return;
        const pool = getAvailableMoments(weekNumber);
        const moment = pool[Math.floor(Math.random() * pool.length)];

        setAttentionMoment(moment);

        // Execute moment-specific behaviors
        if (moment === 'slow_focus') {
          slowFocusOverride.current = true;
        } else if (moment === 'double_blink') {
          triggerDoubleBlink();
        }

        // Duration varies by moment type
        const duration = moment === 'double_blink' ? 700
          : moment === 'iris_pulse' ? 1500
          : 2000;

        durationTimer = setTimeout(() => {
          if (cancelled) return;
          setAttentionMoment('none');
          if (moment === 'slow_focus') {
            slowFocusOverride.current = false;
          }
          schedule();
        }, duration);
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(durationTimer);
    };
  }, [weekNumber, triggerDoubleBlink]);

  // Compute lid positions — wide_gaze pulls lids open further
  const isWideGaze = attentionMoment === 'wide_gaze';
  const upperCpY = isBlinking ? 52 : isWideGaze ? 3 : 10;
  const lowerCpY = isBlinking ? 48 : isWideGaze ? 95 : 90;

  const palette = EYE_STYLES[eyeState];
  const isCrt = variant === 'crt';
  const pulseClass = palette.pulse ? 'animate-eye-pulse' : '';
  const flickerClass = palette.flicker ? 'animate-flicker' : '';
  const ringWidth = eyeState === 'alarmed' || eyeState === 'frantic' ? 4 : 2.5;

  // Variant-specific colors — crt variant now uses iOS palette
  const bgColor = isCrt ? 'bg-ios-bg/95' : 'bg-retro-warm-gray/90';
  const borderColor = panelOpen
    ? isCrt ? 'border-neon-cyan/70' : 'border-pearl-iris/60'
    : isCrt ? 'border-white/30 hover:border-neon-cyan/60' : 'border-chrome-mid hover:border-pearl-iris/50';
  const scleraColor = palette.sclera;
  const scleraStroke = palette.scleraStroke;
  const lidColor = palette.lid;
  const lidStroke = palette.lidStroke;
  const pupilColor = palette.pupil;
  const baseGlow =
    eyeState === 'cold'
      ? '0 0 10px rgba(255,255,255,0.15)'
      : eyeState === 'alarmed' || eyeState === 'frantic'
        ? '0 0 18px rgba(255,70,70,0.30)'
        : eyeState === 'final'
          ? '0 0 18px rgba(255,190,100,0.28)'
          : isCrt
            ? '0 0 15px rgba(0,229,255,0.22)'
            : '0 0 15px rgba(51,255,51,0.22)';
  const glowStyle = {
    boxShadow: attentionMoment === 'iris_pulse'
      ? `${baseGlow}, 0 0 25px rgba(51,255,51,0.4)`
      : baseGlow,
    animationDuration: `${palette.pulseMs}ms`,
    transition: 'box-shadow 0.4s ease',
  };

  return (
    <button
      onClick={onClick}
      className={`relative ${SIZE_MAP[size]} overflow-hidden cursor-pointer group focus:outline-none transition-all duration-300 border-2 ${bgColor} ${borderColor} ${pulseClass} ${flickerClass} ${
        panelOpen ? 'scale-110' : 'hover:scale-110'
      }`}
      style={{ borderRadius: '50%' }}
      aria-label={`Open PEARL panel (${eyeState} state)`}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={glowStyle}
        aria-hidden
      />
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id={`iris-gradient-${variant}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.iris[0]} />
            <stop offset="60%" stopColor={palette.iris[1]} />
            <stop offset="100%" stopColor={palette.iris[2]} />
          </radialGradient>
        </defs>

        {/* State ring */}
        <circle cx="50" cy="50" r="30" fill="none" stroke={palette.ring} strokeWidth={ringWidth} />

        {/* Sclera */}
        <ellipse cx="50" cy="50" rx="38" ry="26" fill={scleraColor} stroke={scleraStroke} strokeWidth="0.5" />

        {/* Iris */}
        <circle
          cx={50 + pupilOffset.x}
          cy={50 + pupilOffset.y}
          r="14"
          fill={`url(#iris-gradient-${variant})`}
          style={{
            filter: attentionMoment === 'iris_pulse' ? 'brightness(1.3)' : 'brightness(1)',
            transition: 'filter 0.4s ease',
          }}
        />

        {/* Pupil */}
        <circle cx={50 + pupilOffset.x * 1.1} cy={50 + pupilOffset.y * 1.1} r={isWideGaze ? 8.5 : 7} fill={pupilColor} />

        {/* Eye shine */}
        <circle cx={45 + pupilOffset.x * 0.5} cy={44 + pupilOffset.y * 0.5} r="4" fill="white" opacity="0.85" />
        <circle cx={53 + pupilOffset.x * 0.6} cy={47 + pupilOffset.y * 0.6} r="2" fill="white" opacity="0.5" />

        {/* Upper eyelid */}
        <path
          d={`M 0 0 L 100 0 L 100 50 Q 68 ${upperCpY} 50 ${upperCpY} Q 32 ${upperCpY} 0 50 Z`}
          fill={lidColor}
        />

        {/* Lower eyelid */}
        <path
          d={`M 0 100 L 100 100 L 100 50 Q 68 ${lowerCpY} 50 ${lowerCpY} Q 32 ${lowerCpY} 0 50 Z`}
          fill={lidColor}
        />

        {/* Lid edge lines */}
        <path
          d={`M 12 50 Q 32 ${upperCpY} 50 ${upperCpY} Q 68 ${upperCpY} 88 50`}
          fill="none"
          stroke={lidStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d={`M 12 50 Q 32 ${lowerCpY} 50 ${lowerCpY} Q 68 ${lowerCpY} 88 50`}
          fill="none"
          stroke={lidStroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
