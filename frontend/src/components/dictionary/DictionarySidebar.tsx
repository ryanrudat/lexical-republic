import { useEffect, useState, useMemo, useRef } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import type { DictionaryFilter, DictionaryWord } from '../../types/dictionary';
import DictionaryWordCard from './DictionaryWordCard';
import DictionaryStats from './DictionaryStats';

const FILTER_TABS: { key: DictionaryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'target', label: 'Target' },
  { key: 'world-building', label: 'World' },
  { key: 'approved', label: 'Approved' },
  { key: 'monitored', label: 'Monitored' },
  { key: 'grey', label: 'Grey' },
  { key: 'proscribed', label: 'Banned' },
  { key: 'recovered', label: 'Recovered' },
];

export default function DictionarySidebar() {
  const {
    words,
    loading,
    error,
    isOpen,
    searchQuery,
    filter,
    selectedWordId,
    close,
    setSearch,
    setFilter,
    selectWord,
    loadDictionary,
    loadFamilies,
  } = useDictionaryStore();

  const searchRef = useRef<HTMLInputElement>(null);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

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

  // Filter and search words
  const filteredWords = useMemo(() => {
    let result = words;

    // Apply filter
    if (filter === 'target') {
      result = result.filter((w) => !w.isWorldBuilding);
    } else if (filter === 'world-building') {
      result = result.filter((w) => w.isWorldBuilding);
    } else if (filter !== 'all') {
      result = result.filter((w) => w.status === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.partyDefinition.toLowerCase().includes(q) ||
          w.toeicCategory.toLowerCase().includes(q)
      );
    }

    return result;
  }, [words, filter, searchQuery]);

  // Group words by week
  const wordsByWeek = useMemo(() => {
    const groups: Record<number, DictionaryWord[]> = {};
    for (const w of filteredWords) {
      if (!groups[w.weekIntroduced]) groups[w.weekIntroduced] = [];
      groups[w.weekIntroduced].push(w);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, items]) => ({
        week: Number(week),
        words: items.sort((a, b) => a.word.localeCompare(b.word)),
      }));
  }, [filteredWords]);

  // Only show filter tabs that have words
  const visibleTabs = useMemo(() => {
    return FILTER_TABS.filter((tab) => {
      if (tab.key === 'all') return true;
      if (tab.key === 'target') return words.some((w) => !w.isWorldBuilding);
      if (tab.key === 'world-building') return words.some((w) => w.isWorldBuilding);
      return words.some((w) => w.status === tab.key);
    });
  }, [words]);

  return (
    <div
      className={`fixed top-0 left-0 h-full z-[40] transition-all duration-500 ease-out ${
        isOpen
          ? 'translate-x-0 opacity-100'
          : '-translate-x-full opacity-0 pointer-events-none'
      }`}
      style={{ width: '360px' }}
    >
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[-1]" onClick={close} />
      )}

      <div className="h-full bg-ios-bg/95 border-r border-white/10 flex flex-col shadow-[8px_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-special-elite text-sm text-neon-mint tracking-wider ios-text-glow">
                Party Lexical Dictionary
              </h3>
              <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider mt-0.5">
                Ministry-Approved Vocabulary Reference
              </p>
            </div>
            <button
              onClick={close}
              className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-neon-pink transition-colors"
            >
              <span className="font-ibm-mono text-lg">{'\u2715'}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        {words.length > 0 && <DictionaryStats words={words} />}

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2.5 py-1.5">
            <span className="font-ibm-mono text-[10px] text-neon-cyan/60 shrink-0">
              {'\u{1F50D}'}
            </span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vocabulary..."
              className="flex-1 font-ibm-sans text-[12px] text-white/80 bg-transparent outline-none placeholder:text-white/25"
            />
            {searchQuery && (
              <button
                onClick={() => setSearch('')}
                className="font-ibm-mono text-[10px] text-white/30 hover:text-white/60"
              >
                {'\u2715'}
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-3 py-1.5 border-b border-white/10 overflow-x-auto">
          <div className="flex gap-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 px-2 py-0.5 font-ibm-mono text-[9px] tracking-wider uppercase rounded-full transition-colors ${
                  filter === tab.key
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'text-white/40 border border-white/10 hover:border-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Word list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-[0.2em]">
                LOADING LEXICON...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="font-ibm-mono text-neon-pink text-xs tracking-wider">{error}</p>
                <button
                  onClick={loadDictionary}
                  className="mt-2 font-ibm-mono text-[10px] text-neon-cyan/60 hover:text-neon-cyan tracking-wider"
                >
                  RETRY
                </button>
              </div>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="font-ibm-mono text-xs text-white/30 tracking-wider">
                {searchQuery ? 'No matching vocabulary found.' : 'No vocabulary assigned yet.'}
              </p>
            </div>
          ) : (
            <div className="px-3 py-2 space-y-4">
              {wordsByWeek.map(({ week, words: weekWords }) => (
                <div key={week}>
                  <div className="flex items-center gap-2 mb-2 sticky top-0 bg-ios-bg/95 backdrop-blur-sm py-1 z-[1]">
                    <div className="w-1 h-1 bg-neon-cyan/40" />
                    <span className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-[0.2em] uppercase">
                      Shift {week}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="font-ibm-mono text-[9px] text-white/20">
                      {weekWords.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {weekWords.map((w) => (
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
        <div className="px-4 py-2 border-t border-white/10">
          <p className="font-ibm-mono text-[9px] text-white/15 tracking-wider text-center">
            Party Lexical Dictionary v1.0 — Ministry Approved
          </p>
        </div>
      </div>
    </div>
  );
}
