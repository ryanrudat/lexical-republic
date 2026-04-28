import { useEffect, useMemo, useState } from 'react';
import {
  fetchDictionaryWordsGrouped,
  type DictionaryWordRow,
} from '../../../api/compliance-check';

interface Props {
  selectedWords: string[];
  onChange: (next: string[]) => void;
  /** The shift this picker is editing for — used to default-expand and to color the focus group. */
  focusWeek: number;
}

export default function WordPicker({ selectedWords, onChange, focusWeek }: Props) {
  const [grouped, setGrouped] = useState<Record<string, DictionaryWordRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toeicOnly, setToeicOnly] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDictionaryWordsGrouped(toeicOnly)
      .then((res) => setGrouped(res.grouped))
      .catch(() => setError('Failed to load dictionary'))
      .finally(() => setLoading(false));
  }, [toeicOnly]);

  // Default-expand: focus week, plus any week that already has selected words
  useEffect(() => {
    const exp: Record<number, boolean> = { [focusWeek]: true };
    const selectedSet = new Set(selectedWords.map((w) => w.toLowerCase()));
    for (const [wkStr, rows] of Object.entries(grouped)) {
      const wk = Number(wkStr);
      if (rows.some((r) => selectedSet.has(r.word.toLowerCase()))) {
        exp[wk] = true;
      }
    }
    setExpanded((prev) => ({ ...exp, ...prev }));
  }, [grouped, focusWeek, selectedWords]);

  const selectedSet = useMemo(
    () => new Set(selectedWords.map((w) => w.toLowerCase())),
    [selectedWords],
  );

  const sortedWeeks = useMemo(
    () => Object.keys(grouped).map(Number).sort((a, b) => a - b),
    [grouped],
  );

  const toggleWord = (word: string) => {
    const lc = word.toLowerCase();
    if (selectedSet.has(lc)) {
      onChange(selectedWords.filter((w) => w.toLowerCase() !== lc));
    } else {
      onChange([...selectedWords, lc]);
    }
  };

  const setShiftAll = (week: number, value: boolean) => {
    const wkWords = (grouped[String(week)] ?? []).map((r) => r.word.toLowerCase());
    if (value) {
      const merged = Array.from(new Set([...selectedWords, ...wkWords]));
      onChange(merged);
    } else {
      const wkSet = new Set(wkWords);
      onChange(selectedWords.filter((w) => !wkSet.has(w.toLowerCase())));
    }
  };

  const filterRow = (r: DictionaryWordRow) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.word.toLowerCase().includes(q) || r.definition.toLowerCase().includes(q);
  };

  if (loading) {
    return <div className="text-xs text-slate-400 italic px-2 py-4">Loading dictionary…</div>;
  }
  if (error) {
    return <div className="text-xs text-rose-600 px-2 py-4">{error}</div>;
  }

  return (
    <div className="space-y-2">
      {/* Top filter row */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={toeicOnly}
            onChange={(e) => setToeicOnly(e.target.checked)}
            className="accent-cyan-600"
          />
          TOEIC only
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search word or definition…"
          className="flex-1 text-xs px-2.5 py-1 rounded-md border border-slate-200 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-200 bg-white"
        />
        <span className="text-[11px] font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded whitespace-nowrap">
          {selectedWords.length} selected
        </span>
      </div>

      {/* Shift groups */}
      <div className="border border-slate-200 rounded-lg max-h-[360px] overflow-y-auto bg-white">
        {sortedWeeks.length === 0 && (
          <div className="text-xs text-slate-400 italic px-3 py-4">
            No words available. Seed dictionary or toggle TOEIC filter.
          </div>
        )}
        {sortedWeeks.map((wk) => {
          const rows = (grouped[String(wk)] ?? []).filter(filterRow);
          const allWk = (grouped[String(wk)] ?? []).map((r) => r.word.toLowerCase());
          const selectedInWk = allWk.filter((w) => selectedSet.has(w)).length;
          const isExpanded = expanded[wk] ?? false;
          const isFocus = wk === focusWeek;

          return (
            <div key={wk} className={`border-b border-slate-100 last:border-b-0`}>
              <button
                type="button"
                onClick={() => setExpanded((p) => ({ ...p, [wk]: !p[wk] }))}
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                  isFocus ? 'bg-cyan-50/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className={`text-xs font-semibold ${isFocus ? 'text-cyan-700' : 'text-slate-700'}`}>
                    Shift {wk}
                  </span>
                  {isFocus && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-600 bg-cyan-100 px-1.5 py-0.5 rounded">
                      THIS SHIFT
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    ({selectedInWk}/{allWk.length})
                  </span>
                </div>
                {isExpanded && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setShiftAll(wk, true)}
                      className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-cyan-50 hover:border-cyan-200 transition-colors"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftAll(wk, false)}
                      className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 pt-1 space-y-1">
                  {rows.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic px-2 py-1">
                      No matches in this shift.
                    </div>
                  )}
                  {rows.map((r) => {
                    const checked = selectedSet.has(r.word.toLowerCase());
                    return (
                      <label
                        key={r.word}
                        className={`flex items-start gap-2 px-2 py-1.5 rounded-md border text-left cursor-pointer transition-colors ${
                          checked
                            ? 'bg-cyan-50 border-cyan-200'
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWord(r.word)}
                          className="mt-0.5 accent-cyan-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-mono font-semibold text-slate-800">
                              {r.word}
                            </span>
                            {r.partOfSpeech && (
                              <span className="text-[9px] uppercase tracking-wider text-slate-400">
                                {r.partOfSpeech}
                              </span>
                            )}
                            {r.toeicCategory && (
                              <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded uppercase tracking-wider">
                                {r.toeicCategory}
                              </span>
                            )}
                          </div>
                          {r.definition && (
                            <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                              {r.definition}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
