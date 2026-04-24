import { useState, useCallback, useRef } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';

interface Pair {
  word: string;
  definition: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WordMatch({ config, onComplete }: TaskProps) {
  const pairs = (config.pairs as Pair[]) || [];
  const pearlBark = config.pearlBarkOnComplete as string | undefined;

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const lane = useStudentStore(s => s.user?.lane ?? 2);

  // Tier 1 (Guided): 3 attempts — more chances, concern only on final miss
  // Tier 2 (Standard): 2 attempts — default
  // Tier 3 (Independent): 1 attempt — immediate auto-resolve on wrong
  const maxAttempts = lane === 1 ? 3 : lane === 3 ? 1 : 2;

  // Shuffle both columns independently on mount
  const shuffledWords = useRef(shuffle(pairs)).current;
  const shuffledDefs = useRef(shuffle(pairs)).current;

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [correctFlash, setCorrectFlash] = useState<string | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<string>>(new Set());
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});

  // Teacher review trail (refs — read once at completion, don't drive re-renders).
  const lastWrongPickRef = useRef<Record<string, string>>({});
  const autoResolvedRef = useRef<Set<string>>(new Set());

  const hasCompleted = useRef(false);

  // Render-time completion detection (same pattern as ClozeFill)
  const allMatched = matched.size === pairs.length;
  if (allMatched && !hasCompleted.current) {
    hasCompleted.current = true;
    const score = firstTryCorrect.size / pairs.length;
    if (pearlBark) {
      usePearlStore.getState().triggerBark('success', pearlBark);
    }
    const answerLog: TaskAnswerLogEntry[] = pairs.map((pair, idx) => {
      // Auto-resolved students never ended on the correct match; surface
      // their last wrong pick so teachers see what they actually tried.
      const autoResolved = autoResolvedRef.current.has(pair.word);
      const lastWrong = lastWrongPickRef.current[pair.word];
      const chosen = autoResolved && lastWrong ? lastWrong : pair.definition;
      return {
        questionId: String(idx),
        prompt: `Match: ${pair.word}`,
        chosen,
        correct: pair.definition,
        wasCorrect: firstTryCorrect.has(pair.word),
        attempts: (attemptCounts[pair.word] ?? 0) + 1,
      };
    });
    setTimeout(() => {
      onComplete(score, {
        taskType: 'word_match',
        itemsCorrect: firstTryCorrect.size,
        itemsTotal: pairs.length,
        category: 'vocab',
        answerLog,
      });
    }, 1000);
  }

  const handleWordClick = useCallback(
    (word: string) => {
      if (matched.has(word)) return;
      setSelectedWord((prev) => (prev === word ? null : word));
    },
    [matched],
  );

  const tryMatch = useCallback(
    (word: string, defWord: string) => {
      if (matched.has(defWord)) return;
      const isCorrect = word === defWord;

      if (isCorrect) {
        setCorrectFlash(defWord);
        const newMatched = new Set(matched);
        newMatched.add(defWord);
        setMatched(newMatched);

        if (!attempted.has(word)) {
          setFirstTryCorrect((prev) => new Set(prev).add(word));
        }

        setSelectedWord(null);
        setTimeout(() => setCorrectFlash(null), 500);
      } else {
        const newCount = (attemptCounts[word] ?? 0) + 1;
        setAttemptCounts(prev => ({ ...prev, [word]: newCount }));
        setAttempted((prev) => new Set(prev).add(word));

        const wrongDef = pairs.find(p => p.word === defWord)?.definition;
        if (wrongDef) {
          lastWrongPickRef.current[word] = wrongDef;
        }

        // Tier 1: concern only on final miss; Tier 2/3: every miss
        if (lane !== 1) addConcern(0.05);

        if (newCount >= maxAttempts) {
          // Max attempts reached — flash wrong, then auto-resolve with correct match
          if (lane === 1) addConcern(0.05);
          autoResolvedRef.current.add(word);
          setWrongFlash(defWord);
          setSelectedWord(null);
          setTimeout(() => {
            setWrongFlash(null);
            // Use functional updaters so auto-resolve is never stale
            setCorrectFlash(word);
            setMatched(prev => new Set(prev).add(word));
            // Tier 1: show correct match longer for learning; others: shorter
            const flashDuration = lane === 1 ? 2000 : 1000;
            setTimeout(() => setCorrectFlash(null), flashDuration);
          }, 500);
        } else {
          setWrongFlash(defWord);
          usePearlStore
            .getState()
            .triggerBark(
              'incorrect',
              lane === 1
                ? `Incorrect match. ${maxAttempts - newCount} attempt${maxAttempts - newCount > 1 ? 's' : ''} remaining.`
                : 'Incorrect match. Review the definition and try again.',
            );
          setTimeout(() => setWrongFlash(null), 500);
          setSelectedWord(null);
        }
      }
    },
    [matched, attempted, attemptCounts, maxAttempts, lane, addConcern, pairs],
  );

  const handleDefClick = useCallback(
    (defWord: string) => {
      if (matched.has(defWord) || !selectedWord) return;
      tryMatch(selectedWord, defWord);
    },
    [selectedWord, matched, tryMatch],
  );

  const handleDrop = useCallback(
    (defWord: string, draggedWord: string) => {
      tryMatch(draggedWord, defWord);
    },
    [tryMatch],
  );

  const progress = matched.size / pairs.length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-[#6B7280]">
          {selectedWord
            ? <>Select the definition for <span className="font-semibold text-sky-600">{selectedWord}</span></>
            : 'Tap a term, then tap its matching definition.'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-[#E8E4DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#8B8578] font-ibm-mono">{matched.size}/{pairs.length} verified</span>
          {allMatched && (
            <span className="text-emerald-600 font-semibold animate-pulse">Complete</span>
          )}
        </div>
      </div>

      {/* Two-column match area */}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {/* Words column */}
        <div className="space-y-2">
          <div className="text-[10px] text-[#8B8578] font-ibm-mono tracking-[0.15em] uppercase font-medium px-1">
            Terms
          </div>
          {shuffledWords.map((pair) => {
            const isMatched = matched.has(pair.word);
            const isSelected = selectedWord === pair.word;
            return (
              <button
                key={pair.word}
                draggable={!isMatched}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', pair.word);
                }}
                onClick={() => handleWordClick(pair.word)}
                disabled={isMatched}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : isSelected
                    ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-md shadow-sky-100 scale-[1.02]'
                    : 'bg-white border-[#D4CFC6] text-[#2C3340] hover:border-[#B8B3AA] hover:shadow-sm active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isMatched ? (
                    <span className="text-emerald-500 text-xs">&#10003;</span>
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-sky-400' : 'bg-[#D4CFC6]'
                    }`} />
                  )}
                  {pair.word}
                </span>
              </button>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="space-y-2">
          <div className="text-[10px] text-[#8B8578] font-ibm-mono tracking-[0.15em] uppercase font-medium px-1">
            Definitions
          </div>
          {shuffledDefs.map((pair) => {
            const isMatched = matched.has(pair.word);
            const isWrong = wrongFlash === pair.word;
            const isCorrectFlash = correctFlash === pair.word;
            const isClickable = !isMatched && !!selectedWord;
            return (
              <div
                key={`def-${pair.word}`}
                onDragOver={(e) => {
                  if (!isMatched) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedWord = e.dataTransfer.getData('text/plain');
                  handleDrop(pair.word, draggedWord);
                }}
                onClick={() => handleDefClick(pair.word)}
                className={`px-3.5 py-2.5 rounded-xl border text-[12px] leading-relaxed transition-all duration-200 ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700/70'
                    : isCorrectFlash
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-md shadow-emerald-100'
                    : isWrong
                    ? 'bg-red-50 border-red-300 text-red-700 animate-resist-shake'
                    : isClickable
                    ? 'bg-white border-[#D4CFC6] text-[#4B5563] cursor-pointer hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-sm active:bg-sky-100 active:scale-[0.98]'
                    : 'bg-[#FAFAF7] border-[#E8E4DC] text-[#9CA3AF]'
                }`}
              >
                {isMatched && (
                  <span className="text-[10px] text-emerald-500 font-ibm-mono font-medium">
                    {pair.word} &#10003;
                  </span>
                )}
                <span className={isMatched ? 'block mt-0.5' : ''}>
                  {pair.definition}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion badge */}
      {allMatched && (
        <div className="text-center py-3">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
            <span className="text-emerald-500">&#10003;</span>
            <span className="font-ibm-mono text-xs text-emerald-700 tracking-wider font-medium">
              Authorization Verified
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
