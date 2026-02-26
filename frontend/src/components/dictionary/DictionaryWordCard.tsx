import { useState, useEffect, useRef } from 'react';
import type { DictionaryWord } from '../../types/dictionary';
import { useDictionaryStore } from '../../stores/dictionaryStore';

interface Props {
  word: DictionaryWord;
  expanded: boolean;
  onToggle: () => void;
}

export default function DictionaryWordCard({ word, expanded, onToggle }: Props) {
  const { updateNotes, families, toggleStarred, revealChinese, selectWord } = useDictionaryStore();
  const [notes, setNotes] = useState(word.studentNotes);
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulseGold, setPulseGold] = useState(false);

  const masteryPercent = Math.round(word.mastery * 100);
  const isMastered = word.mastery >= 1.0;
  const isProscribed = word.status === 'proscribed';
  const isRecovered = word.status === 'recovered' || word.isRecovered;

  const family = word.wordFamilyGroup
    ? families.find((f) => f.groupId === word.wordFamilyGroup)
    : null;

  // Auto-save notes with debounce
  useEffect(() => {
    if (notes === word.studentNotes) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      await updateNotes(word.id, notes);
      setSaveIndicator(isRecovered ? 'Remembered. \u2713' : 'Noted. \u2713');
      setTimeout(() => setSaveIndicator(null), 2000);
    }, 500);
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, [notes, word.id, word.studentNotes, updateNotes, isRecovered]);

  // Gold pulse on mastery
  useEffect(() => {
    if (isMastered) {
      setPulseGold(true);
      const t = setTimeout(() => setPulseGold(false), 300);
      return () => clearTimeout(t);
    }
  }, [isMastered]);

  // Border + accent color
  const borderColor = isProscribed
    ? 'var(--dict-red)'
    : isRecovered
      ? 'var(--dict-amber)'
      : 'var(--dict-green)';
  const accentColor = isProscribed
    ? 'var(--dict-red)'
    : isRecovered
      ? 'var(--dict-amber)'
      : 'var(--dict-green)';

  // Proscribed card
  if (isProscribed && !isRecovered) {
    return (
      <div
        className="transition-colors relative"
        style={{
          borderLeft: `3px solid var(--dict-red)`,
          background: expanded ? 'var(--dict-red-dim)' : 'transparent',
        }}
      >
        <button onClick={onToggle} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="font-ibm-mono text-sm font-semibold" style={{ color: 'var(--dict-red)' }}>
              {word.word}
            </span>
            <span className="font-ibm-mono text-[9px] ml-2 uppercase" style={{ color: 'var(--dict-text-dim)' }}>
              {word.partOfSpeech}
            </span>
          </div>
          <span className="font-ibm-mono text-[9px] tracking-wider" style={{ color: 'var(--dict-red)' }}>
            PROSCRIBED
          </span>
        </button>
        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'var(--dict-border)' }}>
            <p className="font-source-serif text-[13px] line-through pt-2" style={{ color: 'var(--dict-text-dim)' }}>
              {word.partyDefinition}
            </p>
            <p className="font-ibm-mono text-[10px] tracking-wider" style={{ color: 'var(--dict-red)' }}>
              REMOVED FOR COLLECTIVE SAFETY.
            </p>
            {family && (
              <div className="flex flex-wrap gap-1 mt-1">
                {family.members.map((m) => (
                  <span key={m} className="px-1.5 py-0.5 text-[10px] font-ibm-mono border opacity-30"
                    style={{ borderColor: 'var(--dict-border)', color: 'var(--dict-text-dim)' }}>
                    {m}
                  </span>
                ))}
              </div>
            )}
            <p className="font-source-serif text-[11px] italic mt-2" style={{ color: 'var(--dict-text-dim)' }}>
              The Party thanks you for not needing it.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="transition-all relative"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: expanded ? 'var(--dict-surface)' : 'transparent',
        boxShadow: pulseGold ? '0 0 12px var(--dict-gold-glow)' : 'none',
      }}
    >
      {/* Collapsed header */}
      <button onClick={onToggle} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            {isRecovered && (
              <span className="font-ibm-mono text-[8px] tracking-wider uppercase" style={{ color: 'var(--dict-amber)' }}>
                RECOVERED
              </span>
            )}
            <span className="font-ibm-mono text-sm font-semibold" style={{ color: accentColor }}>
              {word.word}
            </span>
            <span className="font-ibm-mono text-[9px] uppercase" style={{ color: 'var(--dict-text-dim)' }}>
              {word.partOfSpeech}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {word.phonetic && (
              <span className="font-ibm-mono text-[10px]" style={{ color: 'var(--dict-text-dim)' }}>
                {word.phonetic}
              </span>
            )}
            <span className="font-ibm-mono text-[9px]" style={{ color: 'var(--dict-text-dim)' }}>
              W{word.weekIntroduced}
            </span>
          </div>
        </div>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleStarred(word.id); }}
          className="shrink-0 text-sm transition-colors"
          style={{ color: word.starred ? 'var(--dict-gold)' : 'var(--dict-text-dim)' }}
        >
          {word.starred ? '\u2605' : '\u2606'}
        </button>

        {/* Mini mastery bar */}
        <div className="w-10 shrink-0">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--dict-surface)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${masteryPercent}%`,
                background: isMastered
                  ? 'linear-gradient(90deg, var(--dict-gold-dim), var(--dict-gold))'
                  : isRecovered
                    ? 'linear-gradient(90deg, var(--dict-amber-dim), var(--dict-amber))'
                    : 'var(--dict-green)',
              }}
            />
          </div>
        </div>

        <span
          className="font-ibm-mono text-xs transition-transform"
          style={{
            color: 'var(--dict-text-dim)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          }}
        >
          {'\u25B6'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'var(--dict-border)' }}>
          {/* Definition */}
          <div className="pt-2">
            <p className="font-source-serif text-[13px] leading-relaxed" style={{ color: 'var(--dict-text)' }}>
              <span className="italic" style={{ color: 'var(--dict-text-dim)' }}>
                ({word.partOfSpeech})
              </span>{' '}
              {word.partyDefinition}
            </p>
          </div>

          {/* Chinese toggle */}
          {word.translationZhTw && (
            <div>
              {word.chineseRevealed ? (
                <p className="font-noto-tc text-[13px]" style={{ color: 'var(--dict-gold)' }}>
                  {word.translationZhTw}
                </p>
              ) : (
                <button
                  onClick={() => revealChinese(word.id)}
                  className="font-ibm-mono text-[10px] tracking-wider px-2 py-1 border rounded transition-colors"
                  style={{
                    borderColor: 'var(--dict-gold-dim)',
                    color: 'var(--dict-gold-dim)',
                  }}
                >
                  &#x4E2D;&#x6587;
                </button>
              )}
            </div>
          )}

          {/* Example sentence */}
          {word.exampleSentence && (
            <p className="font-source-serif text-[12px] italic leading-relaxed" style={{ color: 'var(--dict-text-dim)' }}>
              &ldquo;{word.exampleSentence}&rdquo;
            </p>
          )}

          {/* Word family chips */}
          {family && (
            <div>
              <p className="font-ibm-mono text-[9px] tracking-wider uppercase mb-1" style={{ color: 'var(--dict-text-dim)' }}>
                Word Family: {family.rootWord}
              </p>
              <div className="flex flex-wrap gap-1">
                {family.members.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      const match = useDictionaryStore.getState().words.find(
                        (w) => w.word.toLowerCase() === m.toLowerCase()
                      );
                      if (match) selectWord(match.id);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-ibm-mono border rounded transition-colors"
                    style={{
                      borderColor: m.toLowerCase() === word.word.toLowerCase()
                        ? accentColor
                        : 'var(--dict-border)',
                      color: m.toLowerCase() === word.word.toLowerCase()
                        ? accentColor
                        : 'var(--dict-text-dim)',
                      background: m.toLowerCase() === word.word.toLowerCase()
                        ? 'var(--dict-surface)'
                        : 'transparent',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TOEIC category */}
          {word.toeicCategory && (
            <p className="font-ibm-mono text-[9px] tracking-wider uppercase" style={{ color: 'var(--dict-text-dim)' }}>
              TOEIC: {word.toeicCategory}
            </p>
          )}

          {/* Student notes */}
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Personal notes..."
              rows={2}
              className="w-full px-2 py-1.5 font-ibm-mono text-[11px] rounded resize-none outline-none transition-colors"
              style={{
                background: 'var(--dict-surface)',
                color: 'var(--dict-text)',
                border: '1px solid var(--dict-border)',
              }}
            />
            <div className="flex justify-between mt-0.5">
              <span className="font-ibm-mono text-[9px]" style={{ color: 'var(--dict-text-dim)' }}>
                {notes.length}/500
              </span>
              {saveIndicator && (
                <span className="font-ibm-mono text-[9px]" style={{ color: 'var(--dict-green-dim)' }}>
                  {saveIndicator}
                </span>
              )}
            </div>
          </div>

          {/* Mastery bar (expanded) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-ibm-mono text-[9px] tracking-wider uppercase" style={{ color: 'var(--dict-text-dim)' }}>
                Mastery
              </span>
              <span className="font-ibm-mono text-[10px]" style={{ color: isMastered ? 'var(--dict-gold)' : 'var(--dict-text-dim)' }}>
                {isMastered && '\u2605 '}{masteryPercent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dict-surface)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${masteryPercent}%`,
                  background: isMastered
                    ? 'linear-gradient(90deg, var(--dict-gold-dim), var(--dict-gold))'
                    : isRecovered
                      ? 'linear-gradient(90deg, var(--dict-amber-dim), var(--dict-amber))'
                      : 'linear-gradient(90deg, var(--dict-green-dark), var(--dict-green))',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
