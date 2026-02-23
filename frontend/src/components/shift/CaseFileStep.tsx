import { useState, useMemo } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useStudentStore } from '../../stores/studentStore';
import { useGrammarCheck } from '../../hooks/useGrammarCheck';
import StoryBeatCard from './shared/StoryBeatCard';
import StepVideoClip from './shared/StepVideoClip';
import MinistryAuditView from './MinistryAuditView';
import LoreReveal from './LoreReveal';
import type { StoryBeatConfig } from './shared/StoryBeatCard';

type Phase = 'drafting' | 'scanning' | 'reviewing' | 'complete';

const MAX_ATTEMPTS = 3;

interface CaseFileConfig {
  prompt?: string;
  minWords?: number;
  storyBeat?: StoryBeatConfig;
  grammarTargets?: string[];
  knownWords?: string[];
  newWords?: string[];
  loreRevealText?: string;
  features?: { enableQueuePressure?: boolean };
}

export default function CaseFileStep() {
  const { missions, currentWeek, updateStepStatus, submitMissionScore, nextStep } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);
  const user = useStudentStore(s => s.user);
  const { incrementAttempt, getAttemptCount, addConcern, setLastGrammarError } = useSessionStore();

  const mission = missions.find(m => m.missionType === 'case_file');
  const config = (mission?.config || {}) as CaseFileConfig;
  const prompt = config.prompt || 'Write your Case File summary.';
  const minWords = config.minWords || 40;
  const storyBeat = config.storyBeat;

  const grammarConfig = useMemo(() => ({
    weekNumber: currentWeek?.weekNumber,
    grammarTargets: config.grammarTargets,
    knownWords: config.knownWords,
    newWords: config.newWords,
  }), [currentWeek?.weekNumber, config.grammarTargets, config.knownWords, config.newWords]);

  const { scan, errors, isClean, isScanning, isDegraded } = useGrammarCheck(grammarConfig);

  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('drafting');
  const [showLore, setShowLore] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= minWords;

  const handleScan = async () => {
    if (!canSubmit || !mission) return;

    const attemptNum = incrementAttempt(mission.id);
    setPhase('scanning');

    const result = await scan(text);

    // Track concern from errors
    if (result.errorCount > 0) {
      addConcern(result.errorCount * 5);
      setLastGrammarError(result.errors[0]);
    }

    // Auto-accept after max attempts or if degraded
    if (attemptNum >= MAX_ATTEMPTS || result.isDegraded) {
      if (attemptNum >= MAX_ATTEMPTS && result.errorCount > 0) {
        triggerBark('concern', 'Maximum review attempts reached. Filing under provisional clearance.');
      }
      await finalize();
      return;
    }

    setPhase('reviewing');
  };

  const handleAmend = () => {
    setPhase('drafting');
    triggerBark('hint', 'Review the flagged items and correct them. The Republic values precision.');
  };

  const finalize = async () => {
    if (!mission) return;

    const attemptNum = getAttemptCount(mission.id);

    updateStepStatus('case_file', 'complete', { text, wordCount });
    await submitMissionScore(mission.id, 1, {
      status: 'complete',
      text,
      wordCount,
      grammarErrors: errors.length,
      attempts: attemptNum,
      isDegraded,
    });

    // Check lore reveal eligibility: clean + first attempt + lane 3 + loreRevealText exists
    if (isClean && attemptNum === 1 && user?.lane === 3 && config.loreRevealText) {
      setShowLore(true);
      return; // LoreReveal will call handleLoreComplete → nextStep
    }

    triggerBark('success', 'Case File archived. Your written record serves the Republic.');
    setPhase('complete');
    setTimeout(() => nextStep(), 2000);
  };

  const handleLoreComplete = () => {
    setShowLore(false);
    triggerBark('success', 'Case File archived. A hidden fragment was recovered.');
    setPhase('complete');
    setTimeout(() => nextStep(), 2000);
  };

  return (
    <div className="space-y-6">
      <StoryBeatCard storyBeat={storyBeat} />

      <StepVideoClip config={(mission?.config || {}) as Record<string, unknown>} stepLabel="Filing Desk" />

      {/* Prompt */}
      <div className="ios-glass-card border-neon-cyan/20 p-4">
        <p className="font-ibm-sans text-sm text-white/90 leading-relaxed">
          {prompt}
        </p>
      </div>

      {/* Phase: Drafting */}
      {phase === 'drafting' && (
        <>
          <div className="ios-glass-card p-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Begin writing your Case File summary here..."
              className="ios-glass-input w-full h-40 border-none bg-transparent text-sm leading-relaxed resize-none"
            />
            <div className="mt-2 pt-2 border-t border-white/10">
              <span className={`font-ibm-mono text-xs tracking-wider ${
                wordCount >= minWords ? 'text-neon-mint' : 'text-white/40'
              }`}>
                {wordCount} / {minWords} words {wordCount >= minWords ? '\u2713' : ''}
              </span>
              {mission && getAttemptCount(mission.id) > 0 && (
                <span className="font-ibm-mono text-xs text-white/30 tracking-wider ml-3">
                  Attempt {getAttemptCount(mission.id)} / {MAX_ATTEMPTS}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
              canSubmit
                ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                : 'ios-glass-pill text-white/25 cursor-not-allowed'
            }`}
          >
            Submit for Scan
          </button>
        </>
      )}

      {/* Phase: Scanning (loading) */}
      {(phase === 'scanning' || isScanning) && (
        <div className="ios-glass-card p-8 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto border-2 border-neon-cyan/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="font-ibm-mono text-xs text-neon-cyan tracking-[0.3em] uppercase animate-pulse">
            Filing Under Review...
          </p>
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-2">
            Ministry Compliance Bureau processing your document
          </p>
        </div>
      )}

      {/* Phase: Reviewing (annotation overlay) */}
      {phase === 'reviewing' && !isScanning && (
        <MinistryAuditView
          text={text}
          errors={errors}
          onAmend={handleAmend}
          onAccept={finalize}
          isDegraded={isDegraded}
        />
      )}

      {/* Phase: Complete */}
      {phase === 'complete' && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}

      {/* Lore Reveal overlay */}
      {showLore && config.loreRevealText && (
        <LoreReveal text={config.loreRevealText} onComplete={handleLoreComplete} />
      )}
    </div>
  );
}
