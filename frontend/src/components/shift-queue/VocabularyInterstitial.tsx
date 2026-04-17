import { useEffect, useRef, useState } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';

interface Props {
  weekNumber: number;
  targetWords: string[];
  onContinue: () => void;
}

interface WordChipInfo {
  word: string;
  mastery: number;
  found: boolean;
}

const AUTO_ADVANCE_MS = 4000;
const LOADING_TIMEOUT_MS = 500;

function norm(w: string): string {
  return w.trim().toLowerCase();
}

function chipClass(found: boolean, mastery: number): string {
  if (!found || mastery < 0.3) {
    return 'bg-rose-50 border-rose-200 text-rose-700';
  }
  if (mastery < 0.7) {
    return 'bg-amber-50 border-amber-200 text-amber-700';
  }
  return 'bg-emerald-50 border-emerald-200 text-emerald-700';
}

export default function VocabularyInterstitial({ weekNumber, targetWords, onContinue }: Props) {
  const words = useDictionaryStore(s => s.words);
  const loadDictionary = useDictionaryStore(s => s.loadDictionary);
  const [showLoading, setShowLoading] = useState(false);
  const hasAdvanced = useRef(false);

  const hasData = words.length > 0;

  useEffect(() => {
    if (hasData) return;
    const loadingTimer = setTimeout(() => setShowLoading(true), LOADING_TIMEOUT_MS);
    loadDictionary().finally(() => clearTimeout(loadingTimer));
    return () => clearTimeout(loadingTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAdvanced.current) {
        hasAdvanced.current = true;
        onContinue();
      }
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const handleContinue = () => {
    if (hasAdvanced.current) return;
    hasAdvanced.current = true;
    onContinue();
  };

  const chips: WordChipInfo[] = targetWords.map((tw) => {
    const match = words.find((w) => norm(w.word) === norm(tw));
    return {
      word: tw,
      mastery: match?.mastery ?? 0,
      found: !!match,
    };
  });

  const masteredCount = chips.filter((c) => c.mastery >= 0.7).length;
  const weekTarget = targetWords.length;
  const progressPercent = weekTarget > 0 ? Math.round((masteredCount / weekTarget) * 100) : 0;

  const isLoading = !hasData && showLoading;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#D4CFC6] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#EDE8DE] flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
          <span className="font-ibm-mono text-[10px] tracking-[0.25em] uppercase text-[#8B8578]">
            Vocabulary Status — Week {weekNumber}
          </span>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b border-[#EDE8DE]">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-ibm-mono text-xs tracking-wider uppercase text-[#2C3340]">
              {isLoading ? 'Loading…' : `${masteredCount}/${weekTarget} words mastered`}
            </span>
            <span className="font-ibm-mono text-[10px] text-[#8B8578]">
              {isLoading ? '' : `${progressPercent}%`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#E8E4DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Word chips */}
        <div className="px-5 py-4 border-b border-[#EDE8DE]">
          {isLoading ? (
            <div className="text-center font-ibm-mono text-[10px] text-[#8B8578] tracking-wider py-6">
              Loading vocabulary…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip.word}
                  className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${chipClass(
                    chip.found,
                    chip.mastery
                  )}`}
                >
                  {chip.word}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PEARL line */}
        <div className="px-5 py-3 bg-[#FAFAF7] border-b border-[#EDE8DE]">
          <p className="text-[11px] text-[#4B5563] italic leading-relaxed text-center">
            "Ministry vocabulary requirements are being fulfilled, Citizen."
          </p>
        </div>

        {/* Continue button */}
        <div className="px-5 py-4 flex justify-center">
          <button
            onClick={handleContinue}
            className="font-ibm-mono text-[10px] tracking-[0.2em] uppercase px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
