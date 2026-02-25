import { useState, useEffect, useRef } from 'react';
import type { DictionaryWord, WordStatus } from '../../types/dictionary';
import { useDictionaryStore } from '../../stores/dictionaryStore';

interface DictionaryWordCardProps {
  word: DictionaryWord;
  expanded: boolean;
  onToggle: () => void;
}

const STATUS_COLORS: Record<WordStatus, { bg: string; text: string; label: string }> = {
  approved: { bg: 'bg-neon-mint/20', text: 'text-neon-mint', label: 'APPROVED' },
  monitored: { bg: 'bg-terminal-amber/20', text: 'text-terminal-amber', label: 'MONITORED' },
  grey: { bg: 'bg-white/10', text: 'text-white/50', label: 'UNDER REVIEW' },
  proscribed: { bg: 'bg-neon-pink/20', text: 'text-neon-pink', label: 'PROSCRIBED' },
  recovered: { bg: 'bg-neon-cyan/20', text: 'text-neon-cyan', label: 'RECOVERED' },
};

const POS_ICONS: Record<string, string> = {
  noun: 'N',
  verb: 'V',
  adjective: 'Adj',
  adverb: 'Adv',
};

export default function DictionaryWordCard({ word, expanded, onToggle }: DictionaryWordCardProps) {
  const updateNotes = useDictionaryStore((s) => s.updateNotes);
  const families = useDictionaryStore((s) => s.families);
  const [notes, setNotes] = useState(word.studentNotes);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusStyle = STATUS_COLORS[word.status] || STATUS_COLORS.approved;
  const posLabel = POS_ICONS[word.partOfSpeech] || word.partOfSpeech;

  // Auto-save notes with debounce
  useEffect(() => {
    if (notes === word.studentNotes) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      updateNotes(word.id, notes);
    }, 1000);
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, [notes, word.id, word.studentNotes, updateNotes]);

  const masteryPercent = Math.round(word.mastery * 100);
  const family = word.wordFamilyGroup
    ? families.find((f) => f.groupId === word.wordFamilyGroup)
    : null;

  return (
    <div
      className={`border transition-colors ${
        expanded ? 'border-neon-cyan/30 bg-white/5' : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusStyle.bg} ${
          word.status === 'monitored' ? 'animate-pulse' : ''
        }`}>
          <div className={`w-full h-full rounded-full ${statusStyle.bg}`} />
        </div>

        {/* Word + POS */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-ibm-mono text-sm text-white/90 tracking-wider">
              {word.word}
            </span>
            <span className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase shrink-0">
              {posLabel}
            </span>
          </div>
          {word.phonetic && (
            <span className="font-ibm-mono text-[10px] text-white/30 tracking-wide">
              {word.phonetic}
            </span>
          )}
        </div>

        {/* Mastery bar (mini) */}
        <div className="w-10 shrink-0">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-cyan/60 rounded-full transition-all"
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
        </div>

        {/* Expand chevron */}
        <span className={`font-ibm-mono text-white/30 text-xs transition-transform ${
          expanded ? 'rotate-90' : ''
        }`}>
          {'\u25B6'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5">
          {/* Status badge */}
          <div className="flex items-center gap-2 pt-2">
            <span className={`inline-block px-2 py-0.5 text-[9px] font-ibm-mono tracking-wider ${statusStyle.bg} ${statusStyle.text} rounded-full`}>
              {statusStyle.label}
            </span>
            {word.isWorldBuilding && (
              <span className="inline-block px-2 py-0.5 text-[9px] font-ibm-mono tracking-wider bg-white/5 text-white/40 rounded-full">
                WORLD-BUILDING
              </span>
            )}
            {word.isRecovered && (
              <span className="inline-block px-2 py-0.5 text-[9px] font-ibm-mono tracking-wider bg-neon-cyan/15 text-neon-cyan/70 rounded-full">
                RECOVERED
              </span>
            )}
          </div>

          {/* Party Definition */}
          <div>
            <p className="font-ibm-mono text-[9px] text-neon-mint/60 tracking-wider uppercase mb-0.5">
              Ministry Definition
            </p>
            <p className="font-ibm-sans text-[12px] text-white/70 leading-relaxed">
              {word.partyDefinition}
            </p>
          </div>

          {/* True Definition (hidden until Act II) */}
          {word.trueDefinition ? (
            <div>
              <p className="font-ibm-mono text-[9px] text-neon-cyan/60 tracking-wider uppercase mb-0.5">
                True Definition
              </p>
              <p className="font-ibm-sans text-[12px] text-white/70 leading-relaxed">
                {word.trueDefinition}
              </p>
            </div>
          ) : (
            <div className="px-2 py-1.5 bg-white/5 border border-white/10">
              <p className="font-ibm-mono text-[10px] text-white/25 tracking-wider text-center">
                CLASSIFIED — Clearance Level 7 Required
              </p>
            </div>
          )}

          {/* Example sentence */}
          {word.exampleSentence && (
            <div>
              <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase mb-0.5">
                Example
              </p>
              <p className="font-ibm-sans text-[12px] text-white/50 leading-relaxed italic">
                &ldquo;{word.exampleSentence}&rdquo;
              </p>
            </div>
          )}

          {/* Word family */}
          {family && (
            <div>
              <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase mb-1">
                Word Family: {family.rootWord}
              </p>
              <div className="flex flex-wrap gap-1">
                {family.members.map((m) => (
                  <span
                    key={m}
                    className={`px-1.5 py-0.5 text-[10px] font-ibm-mono tracking-wider border ${
                      m.toLowerCase() === word.word.toLowerCase()
                        ? 'border-neon-cyan/30 text-neon-cyan/70 bg-neon-cyan/10'
                        : 'border-white/10 text-white/30'
                    }`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TOEIC category */}
          {word.toeicCategory && (
            <div className="flex items-center gap-2">
              <span className="font-ibm-mono text-[9px] text-white/25 tracking-wider uppercase">
                TOEIC:
              </span>
              <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
                {word.toeicCategory}
              </span>
            </div>
          )}

          {/* Mastery + encounters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-ibm-mono text-[9px] text-white/25 tracking-wider uppercase mb-0.5">
                Mastery
              </p>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neon-cyan/60 rounded-full transition-all"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
              <p className="font-ibm-mono text-[10px] text-white/30 mt-0.5">
                {masteryPercent}%
              </p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] text-white/25 tracking-wider uppercase mb-0.5">
                Encounters
              </p>
              <p className="font-dseg7 text-sm text-neon-cyan/60">
                {String(word.encounters).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Student notes */}
          <div>
            <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase mb-1">
              Your Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Add personal notes about this word..."
              className="w-full h-16 px-2 py-1.5 font-ibm-sans text-[12px] text-white/70 bg-white/5 border border-white/10 rounded resize-none outline-none placeholder:text-white/20 focus:border-neon-cyan/30 transition-colors"
            />
            <p className="font-ibm-mono text-[9px] text-white/15 text-right mt-0.5">
              {notes.length}/500
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
