import { useState, useEffect, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import LaneScaffolding from './shared/LaneScaffolding';

// ─── Types ───────────────────────────────────────────────────────

interface QueueAnimation {
  sequence: number[];
  intervalMs: number;
}

interface QueueStatusCard {
  type: 'queue_status';
  animation: QueueAnimation;
  pearlBark: string;
  bettyOverlay: string;
}

interface WritingCard {
  type: 'writing';
  title?: string;
  prompt: string;
  minWords?: number;
  lane?: Record<string, unknown>;
}

type BriefingCard = QueueStatusCard | WritingCard;

// ─── Component ───────────────────────────────────────────────────

export default function PriorityBriefing({ config, weekConfig, onComplete }: TaskProps) {
  const cards = (config.cards ?? []) as BriefingCard[];
  const user = useStudentStore(s => s.user);
  const lane = user?.lane ?? 2;

  const [currentCard, setCurrentCard] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [writingText, setWritingText] = useState('');
  const [writingPassed, setWritingPassed] = useState(false);
  const [cardCompleted, setCardCompleted] = useState<boolean[]>(() => cards.map(() => false));

  const card = cards[currentCard];
  const total = cards.length;

  // ── Queue counter animation ────────────────────────────────────

  useEffect(() => {
    if (!card || card.type !== 'queue_status') return;

    const queueCard = card as QueueStatusCard;
    const sequence = queueCard.animation?.sequence ?? [3, 7, 12, 15];
    const intervalMs = queueCard.animation?.intervalMs ?? 800;

    let idx = 0;
    setQueueCount(sequence[0] ?? 0);

    const timer = setInterval(() => {
      idx++;
      if (idx < sequence.length) {
        setQueueCount(sequence[idx]);
      } else {
        clearInterval(timer);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [card, currentCard]);

  // ── Navigation ─────────────────────────────────────────────────

  const advanceCard = useCallback(() => {
    const updated = [...cardCompleted];
    updated[currentCard] = true;
    setCardCompleted(updated);

    if (currentCard < total - 1) {
      setCurrentCard(currentCard + 1);
      setWritingText('');
      setWritingPassed(false);
    } else {
      onComplete(1, { type: 'priority_briefing' });
    }
  }, [currentCard, total, cardCompleted, onComplete]);

  // ── Writing result handler ─────────────────────────────────────

  const handleWritingResult = useCallback((result: EvalResult, _attempt: number) => {
    if (result.passed) {
      setWritingPassed(true);
    }
  }, []);

  // ── Render: Queue Status card ──────────────────────────────────

  function renderQueueStatusCard(c: QueueStatusCard) {
    return (
      <div className="space-y-4">
        {/* Animated counter */}
        <div className="text-center py-6">
          <span className="font-dseg7 text-4xl text-neon-cyan tabular-nums">
            {queueCount}
          </span>
          <p className="font-ibm-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
            ACTIVE CASES IN QUEUE
          </p>
        </div>

        {/* PEARL bark */}
        {c.pearlBark && (
          <div className="ios-glass-card p-4 border border-neon-cyan/20">
            <p className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-wider uppercase mb-2">
              P.E.A.R.L.
            </p>
            <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
              {c.pearlBark}
            </p>
          </div>
        )}

        {/* Betty overlay */}
        {c.bettyOverlay && (
          <div className="ios-glass-card p-4 border border-neon-mint/20">
            <p className="font-ibm-mono text-[10px] text-neon-mint/50 tracking-wider uppercase mb-2">
              Betty (Welcome Associate-14)
            </p>
            <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
              {c.bettyOverlay}
            </p>
          </div>
        )}

        {/* Acknowledge */}
        <div className="pt-2 text-center">
          <button
            className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
            onClick={advanceCard}
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Writing card ───────────────────────────────────────

  function renderWritingCard(c: WritingCard) {
    const scaffolding = c.lane ?? {};

    return (
      <div className="space-y-4">
        {c.title && (
          <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-white/50 mb-2">
            {c.title}
          </h3>
        )}

        {c.prompt && (
          <p className="font-ibm-mono text-sm text-white/70 leading-relaxed">
            {c.prompt}
          </p>
        )}

        <LaneScaffolding
          lane={lane}
          scaffolding={scaffolding}
          targetWords={weekConfig.targetWords}
        />

        <TargetWordHighlighter
          text={writingText}
          onChange={setWritingText}
          targetWords={weekConfig.targetWords}
          minWords={c.minWords ?? 30}
          placeholder="Begin writing here..."
        />

        <WritingEvaluator
          text={writingText}
          weekNumber={weekConfig.weekNumber}
          grammarTarget={weekConfig.grammarTarget}
          targetVocab={weekConfig.targetWords}
          lane={lane}
          onResult={handleWritingResult}
          disabled={!writingText.trim()}
        />

        {writingPassed && (
          <div className="pt-2 text-center">
            <button
              className="ios-glass-pill-action px-6 py-2 font-ibm-mono text-xs tracking-wider"
              onClick={advanceCard}
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────

  if (!card) return null;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Card counter */}
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-white/30 tracking-widest">
          STEP {currentCard + 1} OF {total}
        </span>
      </div>

      {/* Card content */}
      <div key={currentCard} className="animate-fadeIn">
        {card.type === 'queue_status' && renderQueueStatusCard(card as QueueStatusCard)}
        {card.type === 'writing' && renderWritingCard(card as WritingCard)}
      </div>
    </div>
  );
}
