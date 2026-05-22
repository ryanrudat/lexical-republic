import { useCallback, useEffect, useRef, useState } from 'react';
import type { InscriptionWord } from '../../../../types/inscription';

interface Props {
  word: InscriptionWord;
  wordIdx: number;
  lane: number;
  /** Returns true when answer was correct (parent advances) */
  onSubmit: (text: string, errorsRecovered: number) => Promise<{ correct: boolean }>;
  /** Fired with `true` when user is actively typing, `false` when they pause. Edge-triggered. */
  onKeystrokeTick?: (typing: boolean) => void;
  disabled?: boolean;
}

const KEYSTROKE_IDLE_MS = 800;

export default function DrillPromptCard({
  word,
  wordIdx,
  lane,
  onSubmit,
  onKeystrokeTick,
  disabled,
}: Props) {
  // Lane 1 gets the first letter pre-filled
  const prefix = lane === 1 && word.word.length > 0 ? word.word[0] : '';
  const [text, setText] = useState(prefix);
  const [errorsRecovered, setErrorsRecovered] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset on new word
  useEffect(() => {
    setText(prefix);
    setFeedback(null);
    setErrorsRecovered(0);
    setHintsUsed(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIdx]);

  const playAudio = useCallback(() => {
    // Use Web Speech API for audio fallback when no audio asset
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(word.word);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, [word.word]);

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
    // Lane 1 enforced prefix
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
    const submitted = text.trim();
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#5BB8B0]/30 bg-[#0A2A2E]/40 p-5 shadow-inner relative"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-ibm-mono text-[10px] text-[#5BB88C] tracking-[0.3em] uppercase">
          Inscribe This Term
        </p>
        <button
          type="button"
          onClick={playAudio}
          className="font-ibm-mono text-[10px] text-[#82B0B5] hover:text-[#5BB8B0] tracking-wider transition-colors"
          aria-label="Play audio"
        >
          ◀▶ AUDIO
        </button>
      </div>

      {/* Lane-aware prompt */}
      <div className="mb-4 space-y-1.5">
        {lane === 1 && word.translationZhTw && (
          <div className="flex items-center gap-2">
            <span className="font-ibm-mono text-[9px] text-[#5BB88C] tracking-[0.2em] uppercase">
              中文
            </span>
            <span className="text-base text-[#D4E8E5]">{word.translationZhTw}</span>
            {word.phonetic && (
              <span className="text-xs text-[#82B0B5] font-mono ml-2">[{word.phonetic}]</span>
            )}
          </div>
        )}
        <p className="text-sm text-[#D4E8E5] leading-relaxed">
          {lane === 3 || lane === 2 ? word.definition : word.definition}
        </p>
        {lane === 2 && word.translationZhTw && (
          <button
            type="button"
            onClick={(e) => {
              const el = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (el) el.classList.toggle('hidden');
            }}
            className="font-ibm-mono text-[10px] text-[#5BB88C] hover:text-[#82E8D0] tracking-[0.2em] uppercase mt-1"
          >
            Tap for 中文
          </button>
        )}
        {lane === 2 && word.translationZhTw && (
          <p className="hidden text-xs text-[#D4E8E5]">{word.translationZhTw}</p>
        )}
      </div>

      {/* Input field */}
      <div className="relative">
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
          className={`w-full font-ibm-mono text-xl bg-[#04181B] border-2 rounded-md px-4 py-3 text-[#D4E8E5] tracking-wider outline-none transition-colors ${
            feedback === 'correct'
              ? 'border-emerald-400 text-emerald-200'
              : feedback === 'incorrect'
                ? 'border-rose-400 animate-pulse'
                : 'border-[#5BB8B0]/40 focus:border-[#5BB8B0]'
          }`}
          placeholder={lane === 1 ? `${prefix}_____` : '_______'}
        />
        <button
          type="submit"
          className="absolute top-1/2 -translate-y-1/2 right-3 font-ibm-mono text-[10px] text-[#82B0B5] hover:text-[#5BB8B0] tracking-wider px-2 py-1 active:scale-95"
          aria-label="Submit inscription"
        >
          ENTER ↵
        </button>
      </div>

      {/* Lane 1 hint button */}
      {lane === 1 && (
        <button
          type="button"
          onClick={handleHint}
          disabled={hintsUsed >= word.word.length - 1 || feedback === 'correct'}
          className="mt-3 font-ibm-mono text-[10px] text-[#C9944A] hover:text-[#E6B470] tracking-wider px-2 py-1 active:scale-95 disabled:opacity-30"
        >
          Reveal next letter (–50%)
        </button>
      )}
    </form>
  );
}
