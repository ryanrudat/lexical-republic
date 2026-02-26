import { useEffect, useState, useMemo, useRef } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import type { DictionaryWord } from '../../types/dictionary';
import DictionaryWordCard from './DictionaryWordCard';
import DictionaryStats from './DictionaryStats';

const TAGLINES: Record<number, string> = {
  1: 'Your vocabulary serves the Republic.',
  2: 'Precision in language. Safety in meaning.',
  3: 'A clear word is a safe word.',
  4: 'Language is the foundation of order.',
  5: 'Words shape citizens. Citizens shape the Republic.',
  6: 'Trust the latest definition.',
};

function getTagline(week: number): string {
  return TAGLINES[week] || TAGLINES[1];
}

export default function DictionarySidebar() {
  const {
    words,
    loading,
    error,
    isOpen,
    searchQuery,
    filter,
    currentWeek,
    close,
    setSearch,
    setFilter,
    selectWord,
    loadDictionary,
    loadFamilies,
    families,
  } = useDictionaryStore();

  const searchRef = useRef<HTMLInputElement>(null);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const selectedWordId = useDictionaryStore((s) => s.selectedWordId);

  // Load dictionary on first open
  useEffect(() => {
    if (isOpen && words.length === 0 && !loading) {
      loadDictionary();
      loadFamilies();
    }
  }, [isOpen, words.length, loading, loadDictionary, loadFamilies]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-expand selected word
  useEffect(() => {
    if (selectedWordId) {
      setExpandedWordId(selectedWordId);
    }
  }, [selectedWordId]);

  // Available weeks from words
  const availableWeeks = useMemo(() => {
    const weeks = new Set(words.map((w) => w.weekIntroduced));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [words]);

  // Filter and search words
  const filteredWords = useMemo(() => {
    let result = words;

    // Apply filter
    if (filter === 'mastered') {
      result = result.filter((w) => w.mastery >= 1.0);
    } else if (filter === 'starred') {
      result = result.filter((w) => w.starred);
    } else if (filter === 'proscribed') {
      result = result.filter((w) => w.status === 'proscribed');
    } else if (typeof filter === 'number') {
      result = result.filter((w) => w.weekIntroduced === filter);
    }
    // 'all', 'family', 'toeic' show all words (grouping changes, not filtering)

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.partyDefinition.toLowerCase().includes(q) ||
          w.toeicCategory.toLowerCase().includes(q) ||
          (w.translationZhTw && w.translationZhTw.includes(q))
      );
    }

    return result;
  }, [words, filter, searchQuery]);

  // Group words based on active filter
  const groupedWords = useMemo(() => {
    if (filter === 'family') {
      const groups: Record<string, DictionaryWord[]> = {};
      for (const w of filteredWords) {
        const key = w.wordFamilyGroup || '_ungrouped';
        if (!groups[key]) groups[key] = [];
        groups[key].push(w);
      }
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => {
          const fam = families.find((f) => f.groupId === key);
          return {
            label: fam ? fam.rootWord : 'Ungrouped',
            words: items.sort((a, b) => a.word.localeCompare(b.word)),
          };
        });
    }

    if (filter === 'toeic') {
      const groups: Record<string, DictionaryWord[]> = {};
      for (const w of filteredWords) {
        const key = w.toeicCategory || 'uncategorized';
        if (!groups[key]) groups[key] = [];
        groups[key].push(w);
      }
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({
          label: key.toUpperCase(),
          words: items.sort((a, b) => a.word.localeCompare(b.word)),
        }));
    }

    // Default: group by week
    const groups: Record<number, DictionaryWord[]> = {};
    for (const w of filteredWords) {
      if (!groups[w.weekIntroduced]) groups[w.weekIntroduced] = [];
      groups[w.weekIntroduced].push(w);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, items]) => ({
        label: `SHIFT ${week}`,
        words: items.sort((a, b) => a.word.localeCompare(b.word)),
      }));
  }, [filteredWords, filter, families]);

  const hasProscribed = words.some((w) => w.status === 'proscribed');

  return (
    <>
      {/* Dark overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[39] transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={close}
        />
      )}

      <div
        className={`dict-panel fixed top-0 left-0 h-full z-[40] transition-all duration-500 ease-out ${
          isOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ width: '380px', background: 'var(--dict-panel)', position: 'relative' }}
      >
        <div className="h-full flex flex-col relative" style={{ zIndex: 3 }}>
          {/* Title block with gold certificate border */}
          <div
            className="px-4 pt-4 pb-3 border-b relative"
            style={{ borderColor: 'var(--dict-border)' }}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center transition-colors"
              style={{ color: 'var(--dict-text-dim)' }}
            >
              <span className="font-ibm-mono text-lg">{'\u2715'}</span>
            </button>

            {/* Gold border frame */}
            <div
              className="border rounded-sm px-3 py-2 text-center"
              style={{
                borderColor: 'var(--dict-gold-dim)',
                background: 'var(--dict-gold-glow)',
              }}
            >
              <h3
                className="font-ibm-mono text-[11px] tracking-[0.25em] uppercase font-semibold"
                style={{ color: 'var(--dict-gold)' }}
              >
                THE PARTY LEXICAL DICTIONARY
              </h3>
              <p
                className="font-ibm-mono text-[9px] tracking-wider mt-1"
                style={{ color: 'var(--dict-text-dim)' }}
              >
                {getTagline(currentWeek)}
              </p>
            </div>
          </div>

          {/* Stats ribbon */}
          {words.length > 0 && <DictionaryStats words={words} />}

          {/* Search bar */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--dict-border)' }}>
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded"
              style={{
                background: 'var(--dict-surface)',
                border: '1px solid var(--dict-border)',
              }}
            >
              <span className="text-[10px] shrink-0" style={{ color: 'var(--dict-green-dim)' }}>
                {'\u{1F50D}'}
              </span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vocabulary..."
                className="flex-1 font-ibm-mono text-[12px] bg-transparent outline-none placeholder:opacity-30"
                style={{ color: 'var(--dict-text)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[10px] font-ibm-mono"
                  style={{ color: 'var(--dict-text-dim)' }}
                >
                  {'\u2715'}
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--dict-border)' }}>
            {/* Row 1 */}
            <div className="flex gap-1 flex-wrap">
              <FilterPill
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label="ALL"
              />
              {/* Week dropdown */}
              <div className="relative">
                <select
                  value={typeof filter === 'number' ? filter : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilter(v ? Number(v) : 'all');
                  }}
                  className="appearance-none font-ibm-mono text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full border cursor-pointer outline-none"
                  style={{
                    background: typeof filter === 'number' ? 'var(--dict-green-dark)' : 'transparent',
                    borderColor: typeof filter === 'number' ? 'var(--dict-green-dim)' : 'var(--dict-border)',
                    color: typeof filter === 'number' ? 'var(--dict-green)' : 'var(--dict-text-dim)',
                    paddingRight: '1rem',
                  }}
                >
                  <option value="" style={{ background: 'var(--dict-panel)', color: 'var(--dict-text)' }}>
                    WEEK
                  </option>
                  {availableWeeks.map((w) => (
                    <option
                      key={w}
                      value={w}
                      style={{ background: 'var(--dict-panel)', color: 'var(--dict-text)' }}
                    >
                      Shift {w}
                    </option>
                  ))}
                </select>
                <span
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none"
                  style={{ color: 'var(--dict-text-dim)' }}
                >
                  {'\u25BC'}
                </span>
              </div>
              <FilterPill
                active={filter === 'mastered'}
                onClick={() => setFilter('mastered')}
                label="MASTERED"
              />
              <FilterPill
                active={filter === 'starred'}
                onClick={() => setFilter('starred')}
                label={'\u2605 STARRED'}
                accentColor="var(--dict-gold)"
              />
            </div>
            {/* Row 2 */}
            <div className="flex gap-1 mt-1 flex-wrap">
              <FilterPill
                active={filter === 'family'}
                onClick={() => setFilter('family')}
                label="BY FAMILY"
              />
              <FilterPill
                active={filter === 'toeic'}
                onClick={() => setFilter('toeic')}
                label="BY TOEIC"
              />
              {(hasProscribed || currentWeek >= 10) && (
                <FilterPill
                  active={filter === 'proscribed'}
                  onClick={() => setFilter('proscribed')}
                  label="PROSCRIBED"
                  accentColor="var(--dict-red)"
                />
              )}
            </div>
          </div>

          {/* Word list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="font-ibm-mono text-xs animate-pulse tracking-[0.2em]"
                  style={{ color: 'var(--dict-green)' }}
                >
                  LOADING LEXICON...
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <p className="font-ibm-mono text-xs tracking-wider" style={{ color: 'var(--dict-red)' }}>
                    {error}
                  </p>
                  <button
                    onClick={loadDictionary}
                    className="mt-2 font-ibm-mono text-[10px] tracking-wider transition-colors"
                    style={{ color: 'var(--dict-green-dim)' }}
                  >
                    RETRY
                  </button>
                </div>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="font-ibm-mono text-xs tracking-wider" style={{ color: 'var(--dict-text-dim)' }}>
                  {searchQuery ? 'No matching vocabulary found.' : 'No vocabulary assigned yet.'}
                </p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-4">
                {groupedWords.map(({ label, words: groupWords }) => (
                  <div key={label}>
                    <div
                      className="flex items-center gap-2 mb-2 sticky top-0 py-1 z-[1]"
                      style={{ background: 'var(--dict-panel)' }}
                    >
                      <div className="w-1 h-1" style={{ background: 'var(--dict-green-dim)' }} />
                      <span
                        className="font-ibm-mono text-[10px] tracking-[0.2em] uppercase"
                        style={{ color: 'var(--dict-text-dim)' }}
                      >
                        {label}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--dict-border)' }} />
                      <span className="font-ibm-mono text-[9px]" style={{ color: 'var(--dict-text-dim)' }}>
                        {groupWords.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {groupWords.map((w) => (
                        <DictionaryWordCard
                          key={w.id}
                          word={w}
                          expanded={expandedWordId === w.id}
                          onToggle={() => {
                            setExpandedWordId(expandedWordId === w.id ? null : w.id);
                            selectWord(expandedWordId === w.id ? null : w.id);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--dict-border)' }}>
            <p className="font-ibm-mono text-[9px] tracking-wider text-center" style={{ color: 'var(--dict-text-dim)' }}>
              Party Lexical Dictionary v1.0 &mdash; Ministry Approved
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  accentColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accentColor?: string;
}) {
  const color = accentColor || 'var(--dict-green)';
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-2 py-0.5 font-ibm-mono text-[9px] tracking-wider uppercase rounded-full border transition-colors"
      style={{
        background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
        borderColor: active ? color : 'var(--dict-border)',
        color: active ? color : 'var(--dict-text-dim)',
      }}
    >
      {label}
    </button>
  );
}
