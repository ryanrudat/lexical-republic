import { useCallback, useEffect, useRef, useState } from 'react';
import type { InscriptionWord } from '../../../../types/inscription';

// ─── DrillPromptCard ────────────────────────────────────────────
//
// Amber CRT / Mavis-Beacon-era register. The prompt sits above the
// student's input on the same chunky monospace page. No card chrome,
// no rounded corners — just green text on black with subtle scanlines
// inherited from the parent .crt-phosphor-monitor container.
//
// Lane handling is unchanged from the prior implementation: Lane 1
// pre-fills the first letter + offers Mandarin gloss + reveal-next-
// letter hint. Lane 2/3 are unprefixed. Scoring + lifecycle hooks
// (onSubmit, onKeystrokeTick) are also unchanged — only the visual
// register and the local progress display are new.

interface Props {
  word: InscriptionWord;
  wordIdx: number;
  lane: number;
  /** Returns true when answer was correct (parent advances) */
  onSubmit: (text: string, errorsRecovered: number) => Promise<{ correct: boolean }>;
  /** Fired with `true` when user is actively typing, `false` when they pause. */
  onKeystrokeTick?: (typing: boolean) => void;
  disabled?: boolean;
  /** Drill start timestamp — used to compute live WPM display. */
  drillStartedAt_ms: number | null;
  /** Running count of words completed so far in the drill (for WPM math). */
  wordsCompleted: number;
  /** Running count of total attempts in the drill (for accuracy math). */
  totalAttempts: number;
  /** Running count of correct attempts in the drill. */
  totalCorrect: number;
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
  totalAttempts,
  totalCorrect,
}: Props) {
  // Sentence prompts type the full sentence; word prompts type the word.
  const target = word.sentence ?? word.word;
  const isSentence = !!word.sentence;
  // Lane 1 prefix help applies to word prompts only — sentences are
  // already long enough without auto-typing the first character.
  const prefix = !isSentence && lane === 1 && word.word.length > 0 ? word.word[0] : '';
  const [text, setText] = useState(prefix);
  const [errorsRecovered, setErrorsRecovered] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showMandarin, setShowMandarin] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset on new word
  useEffect(() => {
    setText(prefix);
    setFeedback(null);
    setErrorsRecovered(0);
    setHintsUsed(0);
    setShowMandarin(false);
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIdx]);

  const playAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(target);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [target]);

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

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || feedback === 'correct') return;
    const val = e.target.value;
    if (lane === 1 && !val.toLowerCase().startsWith(prefix.toLowerCase())) {
      setText(prefix + val.replace(new RegExp(`^${prefix}`, 'i'), ''));
      return;
    }
    if (val.length < text.length) setErrorsRecovered((n) => n + 1);
    setText(val);
    triggerKeystrokeTick(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || feedback === 'correct') return;
    // Sentence prompts compare on the full sentence; trim trailing spaces
    // and normalize internal whitespace so the student doesn't fail for
    // extra spacing. Punctuation must still match — students learn it.
    const submitted = isSentence
      ? text.trim().replace(/\s+/g, ' ')
      : text.trim();
    if (submitted.length === 0) return;
    const res = await onSubmit(submitted, errorsRecovered);
    if (res.correct) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 500);
    }
  };

  const handleHint = () => {
    if (lane !== 1 || disabled || feedback === 'correct') return;
    if (hintsUsed >= word.word.length - 1) return;
    setHintsUsed((n) => n + 1);
    setText(word.word.slice(0, prefix.length + hintsUsed + 1));
    inputRef.current?.focus();
  };

  // Live WPM display. Conservative: words-per-minute is typed-words /
  // elapsed-minutes. Avoids divide-by-zero in the first few seconds.
  const wpm = (() => {
    if (!drillStartedAt_ms) return 0;
    const elapsedMin = (Date.now() - drillStartedAt_ms) / 60000;
    if (elapsedMin < 0.05) return 0;
    return Math.round(wordsCompleted / elapsedMin);
  })();
  const acc = totalAttempts === 0 ? 100 : Math.round((totalCorrect / totalAttempts) * 100);

  const inputBorderColor =
    feedback === 'correct'
      ? '#7AD17A'
      : feedback === 'incorrect'
      ? '#E84A4A'
      : '#33CC66';

  return (
    <form onSubmit={handleSubmit} className="pixel-mono">
      {/* Lane 1 audio + Mandarin row (top right) */}
      {(lane === 1 || lane === 2) && (
        <div className="flex items-center justify-end gap-4 mb-4 text-[12px] phosphor-text-dim">
          <button
            type="button"
            onClick={playAudio}
            className="phosphor-text-dim hover:phosphor-text uppercase tracking-wider"
            aria-label="Play audio"
          >
            [ audio ]
          </button>
          {word.translationZhTw && (
            <button
              type="button"
              onClick={() => setShowMandarin((v) => !v)}
              className="phosphor-text-dim hover:phosphor-text uppercase tracking-wider"
            >
              [ {showMandarin ? '隱藏 中文' : '顯示 中文'} ]
            </button>
          )}
        </div>
      )}

      {/* Mandarin gloss — Lane 1 always shown, Lane 2 toggleable */}
      {((lane === 1) || (lane === 2 && showMandarin)) && word.translationZhTw && (
        <div className="mb-4 phosphor-text-bright text-lg">
          中文 &nbsp;&nbsp; {word.translationZhTw}
          {word.phonetic && (
            <span className="phosphor-text-dim text-sm ml-3">[{word.phonetic}]</span>
          )}
        </div>
      )}

      {/* Definition prompt (word mode shows definition; sentence mode
          shows a small "uses [word]" hint instead so students know which
          target word the sentence is teaching). */}
      {!isSentence ? (
        <>
          <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em] mb-2">
            Definition
          </p>
          <p className="phosphor-text text-lg leading-snug mb-8 phosphor-glow">
            {word.definition}
          </p>
        </>
      ) : (
        <>
          <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em] mb-2">
            Sentence Drill &nbsp;·&nbsp; uses "{word.word}"
          </p>
          <p className="phosphor-text text-[13px] leading-snug mb-8 phosphor-text-dim">
            {word.definition}
          </p>
        </>
      )}

      {/* TYPE THIS — sentence prompts use a smaller, multi-line layout
          so longer sentences wrap cleanly without scrolling. Word prompts
          stay big + caps for emphasis on the spelling. */}
      <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em] mb-2">
        Type This
      </p>
      {isSentence ? (
        <p className="phosphor-text-bright text-xl leading-relaxed mb-8 phosphor-glow">
          &gt; {target}
        </p>
      ) : (
        <p className="phosphor-text-bright text-3xl tracking-[0.15em] mb-8 phosphor-glow-strong">
          &gt; {word.word.toUpperCase()}
        </p>
      )}

      {/* YOU — the input */}
      <p className="phosphor-text-dim text-[12px] uppercase tracking-[0.3em] mb-2">
        You
      </p>
      <div
        className="mb-6 flex items-center"
        style={{
          borderTop: `1px dashed ${inputBorderColor}`,
          borderBottom: `1px dashed ${inputBorderColor}`,
          paddingTop: '12px',
          paddingBottom: '12px',
        }}
      >
        <span className="phosphor-text text-2xl mr-3 phosphor-glow">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onBlur={() => triggerKeystrokeTick(false)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-gramm="false"
          aria-autocomplete="none"
          disabled={disabled || feedback === 'correct'}
          className="pixel-mono flex-1 bg-transparent border-none outline-none text-2xl phosphor-text phosphor-glow tracking-[0.1em] disabled:opacity-70"
          style={{
            caretColor: '#33CC66',
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-8 mb-2 phosphor-text-dim text-[12px] uppercase tracking-[0.3em]">
        <span>WPM <span className="phosphor-text-bright ml-2 tabular-nums">{wpm}</span></span>
        <span>ACC <span className="phosphor-text-bright ml-2 tabular-nums">{acc}%</span></span>
        <button
          type="submit"
          className="ml-auto phosphor-text-dim hover:phosphor-text uppercase tracking-[0.3em]"
        >
          [ enter ↵ ]
        </button>
      </div>

      {/* Lane 1 hint — word prompts only. Sentences don't get hint help. */}
      {lane === 1 && !isSentence && (
        <button
          type="button"
          onClick={handleHint}
          disabled={hintsUsed >= word.word.length - 1 || feedback === 'correct'}
          className="mt-4 phosphor-text-dim hover:phosphor-text-bright text-[12px] uppercase tracking-[0.3em] disabled:opacity-30"
        >
          [ reveal next letter (-50%) ]
        </button>
      )}
    </form>
  );
}
