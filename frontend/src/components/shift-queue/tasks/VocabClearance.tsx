import { useState, useCallback, useEffect, useRef } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

// ─── Types ───────────────────────────────────────────────────────

interface VocabItem {
  type: string;
  word: string;
  question: string;
  options: string[];
  correctIndex: number;
  context?: string;
}

// ─── Component ───────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VocabClearance({ config, weekConfig, onComplete }: TaskProps) {
  const rawItems = (config.items ?? []) as VocabItem[];
  const addConcern = useShiftQueueStore(s => s.addConcern);
  const lane = useStudentStore(s => s.user?.lane ?? 2);
  // Per-shift skin. The drill is a repeating task, so most shifts share the
  // default look; specific shifts opt into a bespoke theme keyed by weekNumber.
  // Shift 4 (Evidence Board) renders as a Department-of-Clarity case file.
  const weekNumber = weekConfig?.weekNumber ?? 0;

  // Tier 1 (Guided): 3 attempts — more chances, concern only on final miss
  // Tier 2 (Standard): 2 attempts — current behavior
  // Tier 3 (Independent): 1 attempt — immediate lock on wrong answer
  const maxAttempts = lane === 1 ? 3 : lane === 3 ? 1 : 2;

  // Shuffle item order and option order within each item on mount
  const items = useRef(
    shuffle(rawItems).map(item => {
      const indices = shuffle(item.options.map((_, i) => i));
      return {
        ...item,
        options: indices.map(i => item.options[i]),
        correctIndex: indices.indexOf(item.correctIndex),
      };
    }),
  ).current;

  const [currentItem, setCurrentItem] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
  const [attempt, setAttempt] = useState(1);

  // Teacher review trail — one entry per item appended as it's finalized.
  const answerLogRef = useRef<TaskAnswerLogEntry[]>([]);
  // Captures the FIRST wrong option the student picked on the current item,
  // so when they recover (eventually pick correctly), the answer log shows
  // the actual confusion instead of the canonical correct text.
  const firstWrongTextRef = useRef<string | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const total = items.length;
  const item = items[currentItem];
  const progress = (currentItem + (showResult ? 1 : 0)) / total;

  const advanceToNext = useCallback((finalCorrectCount: number) => {
    if (currentItem < total - 1) {
      setCurrentItem(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
      setEliminatedOptions(new Set());
      setAttempt(1);
      firstWrongTextRef.current = null;
    } else {
      const score = total > 0 ? finalCorrectCount / total : 1;
      onComplete(score, {
        taskType: 'vocab_clearance',
        itemsCorrect: finalCorrectCount,
        itemsTotal: total,
        category: 'vocab',
        answerLog: answerLogRef.current,
        // Gradebook teacher view reads these legacy keys — keep them.
        correct: finalCorrectCount,
        total,
      });
    }
  }, [currentItem, total, onComplete]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (showResult || selectedOption !== null) return;
    if (eliminatedOptions.has(optionIndex)) return;

    setSelectedOption(optionIndex);

    resultTimerRef.current = setTimeout(() => {
      const isCorrect = optionIndex === item.correctIndex;
      const questionId = String(currentItem);
      const correctText = item.options[item.correctIndex];
      const chosenText = item.options[optionIndex];

      if (isCorrect) {
        const wasFirstTry = attempt === 1;
        // If they got it right after a wrong attempt, log THAT wrong pick as
        // `chosen` so teachers see the actual confusion. First-try-correct
        // rows show the canonical correct text (which is what they picked).
        const loggedChosen = wasFirstTry
          ? chosenText
          : (firstWrongTextRef.current ?? chosenText);
        answerLogRef.current.push({
          questionId,
          prompt: item.question,
          chosen: loggedChosen,
          correct: correctText,
          wasCorrect: wasFirstTry,
          attempts: attempt,
        });
        setShowResult(true);
        // Score counts FIRST-TRY corrects only, matching WordMatch / ClozeFill /
        // Cipher — recovery after a retry is a learning affordance, recorded in
        // the answerLog (wasCorrect:false + attempts), never in the score.
        // Previously any-attempt corrects counted here, so the Gradebook %
        // contradicted its own answer-log checkmarks and Lane-1 (3 attempts)
        // scores weren't comparable with Lane-3 (1 attempt).
        const newCount = wasFirstTry ? correctCount + 1 : correctCount;
        if (wasFirstTry) setCorrectCount(newCount);
        advanceTimerRef.current = setTimeout(() => advanceToNext(newCount), 1200);
      } else if (attempt < maxAttempts) {
        // Still has attempts left — eliminate wrong option, let them retry.
        // Capture the FIRST wrong pick so the answer log can surface it on recovery.
        if (firstWrongTextRef.current === null) {
          firstWrongTextRef.current = chosenText;
        }
        setShowResult(true);
        // Tier 1: only add concern on final miss; Tier 2/3: every miss
        if (lane !== 1) addConcern(0.05);
        advanceTimerRef.current = setTimeout(() => {
          setEliminatedOptions(prev => new Set(prev).add(optionIndex));
          setSelectedOption(null);
          setShowResult(false);
          setAttempt(prev => prev + 1);
        }, 800);
      } else {
        // Final attempt missed — lock and advance. Prefer the FIRST wrong pick
        // (what they confused first) over the final wrong pick when both exist.
        const loggedChosen = firstWrongTextRef.current ?? chosenText;
        answerLogRef.current.push({
          questionId,
          prompt: item.question,
          chosen: loggedChosen,
          correct: correctText,
          wasCorrect: false,
          attempts: attempt,
        });
        setShowResult(true);
        addConcern(0.05);
        // Tier 1: show correct answer longer (2s) for learning; others: 1.5s
        const delay = lane === 1 ? 2500 : 1500;
        advanceTimerRef.current = setTimeout(() => advanceToNext(correctCount), delay);
      }
    }, 300);
  }, [showResult, selectedOption, eliminatedOptions, item, attempt, maxAttempts, lane, correctCount, addConcern, advanceToNext, currentItem]);

  if (!item) {
    return null;
  }

  // ─── Shift 4 · Evidence Board theme ──────────────────────────────
  // A Department-of-Clarity case file: warm manila surface, evidence-tag
  // header, exhibit-lettered options, chain-of-custody progress, and a
  // CLEARED stamp on a correct answer. Same mechanic, fully re-skinned.
  // Rose accents intentionally echo the W4 Archive-Control reclassification
  // beat. Bleeds (-m-5) to fill the TaskCard interior below its label.
  if (weekNumber === 4) {
    return (
      <div className="-m-5 relative overflow-hidden rounded-b-2xl border-t-2 border-t-rose-300/70 bg-[#ECE1C8] px-5 pt-4 pb-6 shadow-[inset_0_0_44px_rgba(120,90,40,0.07)]">
        {/* Faint evidence watermark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 top-10 select-none font-special-elite text-[58px] leading-none tracking-widest text-black/[0.035] rotate-12"
        >
          EVIDENCE
        </span>
        {/* Pin */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-1.5 w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        />

        {/* Evidence-tag header */}
        <div className="relative flex items-center justify-between mb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-rose-500">▸</span>
            <span className="font-ibm-mono text-[11px] tracking-[0.22em] uppercase text-[#6B5B3E]">
              Evidence Clearance
            </span>
          </div>
          <span className="font-ibm-mono text-[9px] tracking-[0.18em] uppercase text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
            Case 4488
          </span>
        </div>

        {/* Chain-of-custody progress */}
        <div className="relative space-y-1 mb-4">
          <div className="h-1.5 rounded-full bg-[#D8C7A0] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between font-ibm-mono text-[10px] text-[#8A7649]">
            <span>Tag {currentItem + 1} / {total}</span>
            <span>{correctCount} cleared for record</span>
          </div>
        </div>

        {/* Exhibit under review */}
        <div key={currentItem} className="animate-fadeIn relative space-y-4">
          {item.context && (
            <div className="bg-[#F6EFDD] border border-[#D6C49A] border-l-2 border-l-rose-400 rounded-lg px-3 py-2">
              <p className="font-ibm-mono text-[10px] tracking-wider uppercase text-[#9A8755] mb-1">
                Field note
              </p>
              <p className="text-xs text-[#5A4B30] leading-relaxed">{item.context}</p>
            </div>
          )}

          <div>
            <p className="font-ibm-mono text-[10px] tracking-[0.2em] uppercase text-[#9A8755] mb-1.5">
              Term under review
            </p>
            <p className="text-[15px] text-[#2C2415] leading-relaxed font-medium">
              {item.question}
            </p>
          </div>

          {/* Exhibits (options) */}
          <div className="space-y-2">
            {item.options.map((option, i) => {
              const isEliminated = eliminatedOptions.has(i);
              const isCorrectAnswer = i === item.correctIndex;
              const isSelected = i === selectedOption;
              const exhibit = String.fromCharCode(65 + i);

              let row =
                'relative w-full text-left pl-12 pr-4 py-3 rounded-lg border text-sm font-ibm-mono transition-all duration-200 ';
              let chip =
                'absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded grid place-items-center text-[11px] font-bold border ';

              if (isEliminated) {
                row += 'border-[#D8C9A8] bg-[#EAE0C7] text-[#B6A87E] line-through opacity-50';
                chip += 'border-[#D8C9A8] bg-[#E0D4B4] text-[#B6A87E]';
              } else if (showResult && isCorrectAnswer && (isSelected || attempt >= maxAttempts)) {
                row += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold';
                chip += 'border-emerald-400 bg-emerald-100 text-emerald-700';
              } else if (showResult && isSelected && !isCorrectAnswer) {
                row += 'border-rose-400 bg-rose-50 text-rose-700 line-through';
                chip += 'border-rose-400 bg-rose-100 text-rose-700';
              } else if (isSelected && !showResult) {
                row += 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-200';
                chip += 'border-rose-400 bg-rose-100 text-rose-700';
              } else {
                row +=
                  'border-[#C9B68A] bg-[#F6EFDD] text-[#4B3F28] shadow-sm hover:border-rose-300 hover:bg-[#F1E7CD] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer';
                chip += 'border-[#C9B68A] bg-[#EADDBC] text-[#7A6A45]';
              }

              return (
                <button
                  key={i}
                  className={row}
                  onClick={() => handleSelect(i)}
                  disabled={showResult || isEliminated}
                >
                  <span className={chip} aria-hidden>
                    {exhibit}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && (
            <div className="text-center">
              {selectedOption === item.correctIndex ? (
                <span className="vocab-cleared-stamp inline-flex items-center gap-1.5 font-ibm-mono text-[11px] tracking-[0.2em] uppercase text-emerald-700 border border-emerald-300 bg-emerald-50 rounded px-3 py-1">
                  ✓ Cleared for record
                </span>
              ) : attempt < maxAttempts ? (
                <span className="font-ibm-mono text-[11px] tracking-[0.18em] uppercase text-amber-700">
                  Re-examine{lane === 1 && ` · ${maxAttempts - attempt} left`}
                </span>
              ) : (
                <span className="font-ibm-mono text-[11px] tracking-[0.16em] uppercase text-rose-600">
                  ✗ Not cleared — recorded: {item.options[item.correctIndex]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Case-file footer */}
        <div className="relative mt-5 pt-3 border-t border-[#D6C49A]/70 flex items-center justify-between">
          <span className="font-ibm-mono text-[9px] tracking-[0.2em] uppercase text-[#9A8755]">
            Chain of custody · Citizen-4488
          </span>
          <span className="font-ibm-mono text-[9px] tracking-[0.2em] uppercase text-[#B3A271]">
            Dept. of Clarity
          </span>
        </div>
      </div>
    );
  }

  // ─── Default theme (all other shifts) ────────────────────────────
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-ibm-mono text-[#9CA3AF]">
          <span>{currentItem + 1} / {total}</span>
          <span>{correctCount} first-try correct</span>
        </div>
      </div>

      {/* Item card */}
      <div
        key={currentItem}
        className="animate-fadeIn space-y-4"
      >
        {/* Context block */}
        {item.context && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 border-l-2 border-l-sky-400">
            <p className="text-xs text-sky-800 leading-relaxed">
              {item.context}
            </p>
          </div>
        )}

        {/* Question */}
        <p className="text-sm text-[#2C3340] leading-relaxed">
          {item.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {item.options.map((option, i) => {
            const isEliminated = eliminatedOptions.has(i);
            const isCorrectAnswer = i === item.correctIndex;
            const isSelected = i === selectedOption;

            let classes = 'w-full text-left px-4 py-3 rounded-xl text-sm border transition-all duration-200 ';

            if (isEliminated) {
              classes += 'border-[#E8E4DC] bg-[#FAFAF7] text-[#D4CFC6] line-through opacity-50';
            } else if (showResult && isCorrectAnswer && (isSelected || attempt >= maxAttempts)) {
              classes += 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium';
            } else if (showResult && isSelected && !isCorrectAnswer) {
              classes += 'border-rose-300 bg-rose-50 text-rose-600';
            } else if (isSelected && !showResult) {
              classes += 'border-sky-400 bg-sky-50 text-sky-700';
            } else {
              classes += 'border-[#D4CFC6] bg-white text-[#4B5563] hover:border-sky-300 hover:bg-sky-50/50 active:bg-sky-100 active:scale-[0.98] cursor-pointer';
            }

            return (
              <button
                key={i}
                className={classes}
                onClick={() => handleSelect(i)}
                disabled={showResult || isEliminated}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Result feedback */}
        {showResult && (
          <div className="text-center animate-fadeIn">
            {selectedOption === item.correctIndex ? (
              <span className="text-xs text-emerald-600 font-medium tracking-wider">
                Correct
              </span>
            ) : attempt < maxAttempts ? (
              <span className="text-xs text-amber-600 tracking-wider">
                Try again{lane === 1 && ` (${maxAttempts - attempt} left)`}
              </span>
            ) : (
              <span className="text-xs text-rose-500 tracking-wider">
                Incorrect — answer: {item.options[item.correctIndex]}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
