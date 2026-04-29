import { useState, useEffect, useCallback } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';
import LaneScaffolding from './shared/LaneScaffolding';

// ─── Message sequencing constants ────────────────────────────────
// Tuned to feel like a chat: ~5s of "typing" per bubble, brief gap between speakers.
const PEARL_TYPING_MS = 4500;
const INTER_MESSAGE_GAP_MS = 1800;
const BETTY_TYPING_MS = 4500;

type BubbleState = 'hidden' | 'typing' | 'revealed';

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
  const [writingSubmissions, setWritingSubmissions] = useState<Record<number, string>>({});
  const [writingPassed, setWritingPassed] = useState(false);
  const [cardCompleted, setCardCompleted] = useState<boolean[]>(() => cards.map(() => false));

  // Per queue_status card: PEARL bubble shows typing dots → reveals message,
  // then Betty bubble does the same after a short gap. Acknowledge stays
  // disabled until every present message has revealed.
  const [pearlState, setPearlState] = useState<BubbleState>('hidden');
  const [bettyState, setBettyState] = useState<BubbleState>('hidden');

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

  // ── Message sequencing (PEARL → Betty with typing indicators) ─
  useEffect(() => {
    if (!card || card.type !== 'queue_status') return;

    const queueCard = card as QueueStatusCard;
    const hasPearl = Boolean(queueCard.pearlBark);
    const hasBetty = Boolean(queueCard.bettyOverlay);

    setPearlState(hasPearl ? 'typing' : 'hidden');
    setBettyState('hidden');

    const timers: ReturnType<typeof setTimeout>[] = [];

    let elapsed = 0;
    if (hasPearl) {
      elapsed += PEARL_TYPING_MS;
      timers.push(setTimeout(() => setPearlState('revealed'), elapsed));
    }
    if (hasBetty) {
      elapsed += hasPearl ? INTER_MESSAGE_GAP_MS : 0;
      timers.push(setTimeout(() => setBettyState('typing'), elapsed));
      elapsed += BETTY_TYPING_MS;
      timers.push(setTimeout(() => setBettyState('revealed'), elapsed));
    }

    return () => {
      timers.forEach(clearTimeout);
    };
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
      const hasWriting = Object.keys(writingSubmissions).length > 0;
      onComplete(1, {
        taskType: 'priority_briefing',
        itemsCorrect: 1,
        itemsTotal: 1,
        category: hasWriting ? 'writing' : 'mixed',
        writingSubmissions,
      });
    }
  }, [currentCard, total, cardCompleted, writingSubmissions, onComplete]);

  // ── Writing result handler ─────────────────────────────────────

  const handleWritingResult = useCallback((result: EvalResult) => {
    if (result.passed) {
      setWritingSubmissions(prev => ({ ...prev, [currentCard]: writingText }));
      setWritingPassed(true);
    }
  }, [currentCard, writingText]);

  // ── Render: Queue Status card ──────────────────────────────────

  function renderQueueStatusCard(c: QueueStatusCard) {
    const pearlReady = !c.pearlBark || pearlState === 'revealed';
    const bettyReady = !c.bettyOverlay || bettyState === 'revealed';
    const allRevealed = pearlReady && bettyReady;

    return (
      <div className="space-y-4">
        {/* Animated counter */}
        <div className="text-center py-6">
          <span className="font-ibm-mono text-4xl text-sky-600 tabular-nums font-bold">
            {queueCount}
          </span>
          <p className="font-ibm-mono text-[10px] text-[#9CA3AF] tracking-widest uppercase mt-2">
            ACTIVE CASES IN QUEUE
          </p>
        </div>

        {/* PEARL bubble */}
        {c.pearlBark && pearlState !== 'hidden' && (
          <MessageBubble
            speaker="P.E.A.R.L."
            color="sky"
            state={pearlState}
            text={c.pearlBark}
          />
        )}

        {/* Betty bubble */}
        {c.bettyOverlay && bettyState !== 'hidden' && (
          <MessageBubble
            speaker="Betty (Welcome Associate-14)"
            color="emerald"
            state={bettyState}
            text={c.bettyOverlay}
          />
        )}

        {/* Acknowledge */}
        <div className="pt-2 text-center">
          <button
            disabled={!allRevealed}
            aria-disabled={!allRevealed}
            className={
              allRevealed
                ? 'px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors'
                : 'px-6 py-2.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-medium tracking-wider cursor-not-allowed transition-colors'
            }
            onClick={allRevealed ? advanceCard : undefined}
          >
            Acknowledge
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
          <h3 className="font-ibm-mono text-xs tracking-wider uppercase text-[#8B8578] mb-2">
            {c.title}
          </h3>
        )}

        {c.prompt && (
          <p className="text-sm text-[#4B5563] leading-relaxed">
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
          minWords={(c.lane as Record<string, Record<string, unknown>> | undefined)?.[String(lane)]?.minWords as number ?? c.minWords ?? 30}
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
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
              onClick={advanceCard}
            >
              Continue
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
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest">
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

// ─── MessageBubble (typing → reveal) ─────────────────────────────

interface MessageBubbleProps {
  speaker: string;
  color: 'sky' | 'emerald';
  state: BubbleState;
  text: string;
}

function MessageBubble({ speaker, color, state, text }: MessageBubbleProps) {
  const borderClass = color === 'sky' ? 'border-sky-200' : 'border-emerald-200';
  const labelClass = color === 'sky' ? 'text-sky-500' : 'text-emerald-500';
  const dotClass = color === 'sky' ? 'bg-sky-400' : 'bg-emerald-400';

  return (
    <div
      className={`bg-[#FAFAF7] border ${borderClass} rounded-xl p-4 animate-bubble-pop-in transition-all duration-300`}
    >
      <p
        className={`font-ibm-mono text-[10px] ${labelClass} tracking-wider uppercase mb-2`}
      >
        {speaker}
      </p>
      {state === 'typing' ? (
        <div
          className="flex items-center gap-1.5 h-5"
          role="status"
          aria-label={`${speaker} is typing`}
        >
          <span
            className={`block w-2 h-2 rounded-full ${dotClass} animate-typing-dot motion-reduce:animate-none`}
            style={{ animationDelay: '0ms' }}
          />
          <span
            className={`block w-2 h-2 rounded-full ${dotClass} animate-typing-dot motion-reduce:animate-none`}
            style={{ animationDelay: '180ms' }}
          />
          <span
            className={`block w-2 h-2 rounded-full ${dotClass} animate-typing-dot motion-reduce:animate-none`}
            style={{ animationDelay: '360ms' }}
          />
        </div>
      ) : (
        <p className="text-sm text-[#4B5563] leading-relaxed animate-message-rise">
          {text}
        </p>
      )}
    </div>
  );
}
