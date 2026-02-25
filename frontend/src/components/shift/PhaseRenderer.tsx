import { lazy, Suspense } from 'react';
import type { PhaseConfig } from '../../types/sessions';

// Lazy-load activity components
const D1StructuredWriting = lazy(() => import('../activities/D1StructuredWriting'));
const D2DocumentCompare = lazy(() => import('../activities/D2DocumentCompare'));
const D5AudioLog = lazy(() => import('../activities/D5AudioLog'));

// Existing step components (used for settle, grammar_toeic, debrief)
const GrammarStep = lazy(() => import('./GrammarStep'));

interface PhaseRendererProps {
  phase: PhaseConfig;
  onComplete: (data?: Record<string, unknown>) => void;
}

export default function PhaseRenderer({ phase, onComplete }: PhaseRendererProps) {
  const loading = (
    <div className="flex items-center justify-center py-12">
      <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-[0.2em]">
        LOADING MODULE...
      </div>
    </div>
  );

  switch (phase.type) {
    case 'settle':
      return <SettlePhase phase={phase} onComplete={onComplete} />;

    case 'grammar_toeic':
      return (
        <Suspense fallback={loading}>
          <GrammarStep phaseConfig={phase.config} onPhaseComplete={onComplete} />
        </Suspense>
      );

    case 'd1_structured_writing':
      return (
        <Suspense fallback={loading}>
          <D1StructuredWriting phaseConfig={phase} onComplete={onComplete} />
        </Suspense>
      );

    case 'd2_document_compare':
      return (
        <Suspense fallback={loading}>
          <D2DocumentCompare phaseConfig={phase} onComplete={onComplete} />
        </Suspense>
      );

    case 'd5_audio_log':
      return (
        <Suspense fallback={loading}>
          <D5AudioLog phaseConfig={phase} onComplete={onComplete} />
        </Suspense>
      );

    case 'debrief':
      return <DebriefPhase phase={phase} onComplete={onComplete} />;

    default:
      return (
        <div className="flex items-center justify-center py-12">
          <p className="font-ibm-mono text-white/40 text-sm">
            Unknown phase type: {phase.type}
          </p>
        </div>
      );
  }
}

// ── Settle Phase ──
function SettlePhase({
  phase,
  onComplete,
}: {
  phase: PhaseConfig;
  onComplete: () => void;
}) {
  const config = phase.config as {
    atmosphereText?: string;
    pearlGreeting?: string;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 max-w-xl mx-auto text-center">
      {/* Atmosphere text */}
      {config.atmosphereText && (
        <p className="font-ibm-sans text-sm text-white/60 leading-relaxed mb-6">
          {config.atmosphereText}
        </p>
      )}

      {/* PEARL greeting */}
      {config.pearlGreeting && (
        <div className="border border-neon-cyan/20 bg-neon-cyan/5 px-6 py-4 mb-8 max-w-md">
          <p className="font-ibm-mono text-[9px] text-neon-cyan/50 tracking-[0.3em] uppercase mb-2">
            P.E.A.R.L.
          </p>
          <p className="font-ibm-sans text-sm text-neon-cyan/80 leading-relaxed italic">
            &ldquo;{config.pearlGreeting}&rdquo;
          </p>
        </div>
      )}

      <button
        onClick={onComplete}
        className="ios-glass-pill px-8 py-3 font-ibm-mono text-sm text-neon-cyan tracking-[0.2em] uppercase hover:border-neon-cyan/40 hover:bg-neon-cyan/10 transition-all"
      >
        Begin Shift
      </button>
    </div>
  );
}

// ── Debrief Phase ──
function DebriefPhase({
  phase,
  onComplete,
}: {
  phase: PhaseConfig;
  onComplete: () => void;
}) {
  const config = phase.config as {
    discussionTiers?: Array<{
      tier: string;
      questions: string[];
    }>;
    revealText?: string;
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      <h2 className="font-special-elite text-lg text-white/90 tracking-wider text-center ios-text-glow">
        Shift Debrief
      </h2>

      {/* Discussion tiers */}
      {config.discussionTiers?.map((tier, i) => (
        <div key={i} className="border border-white/10 p-4">
          <h3 className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.2em] uppercase mb-3">
            {tier.tier}
          </h3>
          <ul className="space-y-2">
            {tier.questions.map((q, j) => (
              <li key={j} className="font-ibm-sans text-sm text-white/60 leading-relaxed">
                {q}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Reveal text (e.g. queue counter reveal) */}
      {config.revealText && (
        <div className="border border-terminal-amber/20 bg-terminal-amber/5 px-4 py-3">
          <p className="font-ibm-mono text-[10px] text-terminal-amber/60 tracking-wider uppercase mb-1">
            Disclosure
          </p>
          <p className="font-ibm-sans text-sm text-terminal-amber/80 leading-relaxed italic">
            {config.revealText}
          </p>
        </div>
      )}

      <div className="text-center pt-4">
        <button
          onClick={onComplete}
          className="ios-glass-pill px-8 py-3 font-ibm-mono text-sm text-neon-mint tracking-[0.2em] uppercase hover:border-neon-mint/40 hover:bg-neon-mint/10 transition-all"
        >
          End Shift
        </button>
      </div>
    </div>
  );
}
