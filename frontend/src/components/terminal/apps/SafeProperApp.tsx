import { useEffect, useState } from 'react';
import { fetchVocabulary } from '../../../api/vocabulary';
import type { VocabWord } from '../../../types/shifts';

export default function SafeProperApp() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'grey' | 'black'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchVocabulary();
        setWords(data);
      } catch {
        // Vocabulary not available
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === 'all' ? words : words.filter((w) => w.tier === filter);

  const tierStyles = {
    approved: { border: 'border-neon-mint/30', text: 'text-neon-mint', label: 'APPROVED' },
    grey: { border: 'border-neon-cyan/30', text: 'text-neon-cyan', label: 'GREY ZONE' },
    black: { border: 'border-neon-pink/30', text: 'text-neon-pink', label: 'FORBIDDEN' },
  };

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-special-elite text-xl text-white/90 tracking-wider ios-text-glow mb-1">
          Safe & Proper Dictionary
        </h2>
        <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
          Ministry-Approved Vocabulary Reference
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'approved', 'grey', 'black'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full font-ibm-mono text-[10px] tracking-wider uppercase border transition-colors ${
              filter === f
                ? f === 'all'
                  ? 'border-neon-mint text-neon-mint bg-neon-mint/10'
                  : f === 'approved'
                    ? 'border-neon-mint text-neon-mint bg-neon-mint/10'
                    : f === 'grey'
                      ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                      : 'border-neon-pink text-neon-pink bg-neon-pink/10'
                : 'border-white/10 text-white/50 hover:border-white/20'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <span className="font-ibm-mono text-[10px] text-white/30 ml-2">
          {filtered.length} words
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-wider">
            Loading vocabulary...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-ibm-mono text-xs text-white/50 tracking-wider">
            No vocabulary words found for this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((word) => {
            const style = tierStyles[word.tier];
            return (
              <div key={word.id} className={`rounded-xl ios-glass-card ${style.border} px-4 py-3 flex items-center justify-between`}>
                <div>
                  <span className={`font-ibm-mono text-sm ${style.text} tracking-wider`}>
                    {word.word}
                  </span>
                  {word.weekNumber && (
                    <span className="font-ibm-mono text-[9px] text-white/30 ml-2">
                      Wk {word.weekNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Mastery bar */}
                  <div className="w-16 h-1 bg-white/10 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        word.tier === 'approved'
                          ? 'bg-neon-mint'
                          : word.tier === 'grey'
                            ? 'bg-neon-cyan'
                            : 'bg-neon-pink'
                      }`}
                      style={{ width: `${Math.round(word.mastery * 100)}%` }}
                    />
                  </div>
                  <span className={`font-ibm-mono text-[9px] ${style.text}/70 tracking-wider uppercase`}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
