import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InscriptionWord } from '../../../../types/inscription';

// ─── DrillPromptCard ────────────────────────────────────────────
//
// Per-character live coloring + auto-advance. The target word (or
// sentence) is rendered character by character; each cell shows
// green when matched, red when wrong, and a filled cursor block at
// the current position. There is no submit button — when the input
// matches the target exactly the parent advances automatically.
//
// This eliminates the prior submit-cycle race condition that left
// the input frozen after the first word (setFeedback('correct') in
// an async handler running after the parent had already advanced).
//
// A hidden <input> captures keystrokes; clicking anywhere on the
// prompt area focuses it. Backspace works normally to correct
// mistakes; over-typing past the target length is silently ignored.

interface Props {
  word: InscriptionWord;
  wordIdx: number;
  lane: number;
  /** Returns when the answer has been recorded. Parent advances via store. */
  onSubmit: (text: string, errorsRecovered: number) => Promise<{ correct: boolean }>;
  /** Fired with `true` when user is actively typing, `false` when they pause. */
  onKeystrokeTick?: (typing: boolean) => void;
  disabled?: boolean;
  drillStartedAt_ms: number | null;
  wordsCompleted: number;
  /** Local accuracy counters for the per-character tracker. */
  charsTyped: number;
  charsCorrect: number;
  /** Called on every keystroke so the parent can track local accuracy. */
  onCharTyped: (wasCorrect: boolean) => void;
}

const KEYSTROKE_IDLE_MS = 800;

export default function DrillPromptCard({
  word,
  wordIdx,
  lane,
  onSubmit,
  onKeystrokeTick,
  disabled,
  drillStartedAt_ms,
  wordsCompleted,
  charsTyped,
  charsCorrect,
  onCharTyped,
}: Props) {
  // Sentence prompts type the full sentence; word prompts type the word.
  // Both render the same character-by-character way.
  const target = word.sentence ?? word.word;
  const isSentence = !!word.sentence;

  // Lane 1 prefix help: pre-fill the first character on word prompts.
  const prefix = !isSentence && lane === 1 && word.word.length > 0
    ? word.word[0]
    : '';

  const [input, setInput] = useState(prefix);
  const [showMandarin, setShowMandarin] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [errorsRecovered, setErrorsRecovered] = useState(0);

  const submittingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevInputLengthRef = useRef(prefix.length);

  // Reset on new word — every state that needs to clear, plus refocus.
  useEffect(() => {
    setInput(prefix);
    setShowMandarin(false);
    setHintsUsed(0);
    setErrorsRecovered(0);
    submittingRef.current = false;
    prevInputLengthRef.current = prefix.length;
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIdx]);

  // Cleanup idle timer
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const triggerKeystrokeTick = useCallback(
    (typing: boolean) => {
      if (!onKeystrokeTick) return;
      if (typing !== isTypingRef.current) {
        isTypingRef.current = typing;
        onKeystrokeTick(typing);
      }
      if (typing) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          isTypingRef.current = false;
          onKeystrokeTick(false);
        }, KEYSTROKE_IDLE_MS);
      }
    },
    [onKeystrokeTick],
  );

  const playAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(target);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [target]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || submittingRef.current) return;
      const raw = e.target.value;

      // Lane 1: enforce prefix at the start (can't backspace past it).
      const safeInput = lane === 1 && prefix && !raw.toLowerCase().startsWith(prefix.toLowerCase())
        ? prefix + raw.replace(new RegExp(`^${prefix}`, 'i'), '')
        : raw;

      const prevLen = prevInputLengthRef.current;
      const newLen = safeInput.length;

      if (newLen < prevLen) {
        // Backspace — count as error recovery (the student is correcting a mistake)
        setErrorsRecovered((n) => n + (prevLen - newLen));
      } else if (newLen > prevLen) {
        // New characters typed — track correctness per char. Overflow chars
        // (past target length) count as wrong.
        for (let i = prevLen; i < newLen; i++) {
          const isCorrect = i < target.length && safeInput[i] === target[i];
          onCharTyped(isCorrect);
        }
      }

      prevInputLengthRef.current = newLen;
      setInput(safeInput);
      triggerKeystrokeTick(true);

      // Auto-submit when the input matches the target exactly. Sentence
      // mode is forgiving on a trailing period/comma so students don't
      // have to type the closing punctuation perfectly; word mode is strict.
      const matchesTarget = isSentence
        ? safeInput.replace(/[.,;]\s*$/, '') === target.replace(/[.,;]\s*$/, '')
        : safeInput === target;

      if (matchesTarget && !submittingRef.current) {
        submittingRef.current = true;
        void onSubmit(safeInput, errorsRecovered);
      }
    },
    [disabled, target, lane, prefix, isSentence, onSubmit, errorsRecovered, onCharTyped, triggerKeystrokeTick],
  );

  const handleHint = useCallback(() => {
    if (lane !== 1 || disabled || isSentence) return;
    if (hintsUsed >= word.word.length - 1) return;
    const newHints = hintsUsed + 1;
    setHintsUsed(newHints);
    const newInput = word.word.slice(0, prefix.length + newHints);
    setInput(newInput);
    prevInputLengthRef.current = newInput.length;
    inputRef.current?.focus();
  }, [lane, disabled, isSentence, hintsUsed, word.word, prefix]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Live WPM — words per minute based on full words completed
  const wpm = useMemo(() => {
    if (!drillStartedAt_ms) return 0;
    const elapsedMin = (Date.now() - drillStartedAt_ms) / 60000;
    if (elapsedMin < 0.05) return 0;
    return Math.round(wordsCompleted / elapsedMin);
  }, [drillStartedAt_ms, wordsCompleted]);

  // Live accuracy — correct chars / total chars typed (incl. recovered errors)
  const acc = charsTyped === 0 ? 100 : Math.round((charsCorrect / charsTyped) * 100);

  // Build the per-character display for the target word/sentence
  const chars = useMemo(() => target.split(''), [target]);

  return (
    <div className="pixel-mono relative" onClick={focusInput}>
      {/* Top row — audio + Mandarin toggle */}
      {(lane === 1 || lane === 2) && (
        <div className="flex items-center justify-end gap-4 mb-3 text-[11px]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); playAudio(); }}
            className="phosphor-text-dim hover:phosphor-text uppercase tracking-wider"
          >
            [ audio ]
          </button>
          {word.translationZhTw && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMandarin((v) => !v); }}
              className="phosphor-text-dim hover:phosphor-text uppercase tracking-wider"
            >
              [ {showMandarin ? '隱藏 中文' : '顯示 中文'} ]
            </button>
          )}
        </div>
      )}

      {/* Mandarin gloss — Lane 1 always shown, Lane 2 toggleable */}
      {((lane === 1) || (lane === 2 && showMandarin)) && word.translationZhTw && (
        <p className="phosphor-text-bright text-base mb-3">
          中文 &nbsp; {word.translationZhTw}
          {word.phonetic && (
            <span className="phosphor-text-dim text-xs ml-3">[{word.phonetic}]</span>
          )}
        </p>
      )}

      {/* Definition / sentence-mode label */}
      {!isSentence ? (
        <>
          <p className="phosphor-text-dim text-[11px] uppercase tracking-[0.3em] mb-1">
            Definition
          </p>
          <p className="phosphor-text text-base leading-snug mb-5">
            {word.definition}
          </p>
        </>
      ) : (
        <>
          <p className="phosphor-text-dim text-[11px] uppercase tracking-[0.3em] mb-1">
            Sentence Drill &nbsp;·&nbsp; uses "{word.word}"
          </p>
          <p className="phosphor-text-dim text-[12px] leading-snug mb-5">
            {word.definition}
          </p>
        </>
      )}

      {/* Per-character display.
            • correctly typed     → bright green
            • wrong typed         → red underlined target char
            • cursor position     → bright background block
            • not yet typed       → dim
            • overflow (past end) → red typed char on dim background (you've
              typed extra characters — backspace them off)
          Whitespace renders as a dot so sentences stay readable. */}
      <div className="mb-3 flex flex-wrap gap-y-1">
        {/* Target chars + correctness coloring */}
        {chars.map((char, i) => {
          const typed = input[i];
          const isWhitespace = char === ' ';
          let cellClass = '';
          if (i < input.length) {
            cellClass = typed === char
              ? 'phosphor-text-bright phosphor-glow'
              : 'text-rose-400 underline';
          } else if (i === input.length) {
            cellClass = 'bg-[#66FF99] text-[#04120A] phosphor-glow-strong';
          } else {
            cellClass = 'phosphor-text-faint';
          }
          return (
            <span
              key={i}
              className={`${cellClass} font-mono text-3xl tracking-normal inline-block min-w-[1ch] text-center transition-colors`}
              aria-hidden
            >
              {isWhitespace ? '·' : char}
            </span>
          );
        })}
        {/* Overflow chars — what the student typed past the end. Shown in
            red so it's obvious they need to backspace. */}
        {input.length > target.length &&
          Array.from(input.slice(target.length)).map((char, i) => (
            <span
              key={`overflow-${i}`}
              className="text-rose-400 bg-rose-950/40 underline font-mono text-3xl tracking-normal inline-block min-w-[1ch] text-center"
              aria-hidden
            >
              {char === ' ' ? '·' : char}
            </span>
          ))}
      </div>

      {/* Backspace hint — appears when input is wrong or has overflow. */}
      {(() => {
        const hasWrong =
          input.length > target.length ||
          Array.from(input).some((c, i) => i < target.length && c !== target[i]);
        return hasWrong ? (
          <p className="text-rose-400/80 text-[11px] uppercase tracking-[0.3em] mb-3">
            &gt; backspace to correct.
          </p>
        ) : (
          <div className="mb-3 h-[14px]" /> /* spacer keeps layout stable */
        );
      })()}

      {/* Hidden input — captures keystrokes; visually invisible but focusable. */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleInputChange}
        onBlur={() => triggerKeystrokeTick(false)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-gramm="false"
        aria-autocomplete="none"
        aria-label="Inscription input"
        disabled={disabled}
        className="absolute opacity-0 -z-10 w-0 h-0"
        autoFocus
      />

      {/* Footer — WPM / Accuracy + hint (Lane 1 only) */}
      <div className="flex items-center gap-6 phosphor-text-dim text-[11px] uppercase tracking-[0.3em]">
        <span>WPM <span className="phosphor-text-bright ml-1 tabular-nums">{wpm}</span></span>
        <span>ACC <span className="phosphor-text-bright ml-1 tabular-nums">{acc}%</span></span>
        {lane === 1 && !isSentence && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleHint(); }}
            disabled={hintsUsed >= word.word.length - 1}
            className="ml-auto phosphor-text-dim hover:phosphor-text-bright disabled:opacity-30"
          >
            [ hint -50% ]
          </button>
        )}
      </div>

      <p className="phosphor-text-faint text-[10px] uppercase tracking-[0.3em] mt-3 italic">
        type the word above. it advances automatically.
      </p>
    </div>
  );
}
