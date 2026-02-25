import { useState, useCallback } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useBarkContext } from '../../hooks/useBarkContext';
import { submitForEvaluation } from '../../api/sessions';
import RecordingWidget from '../recording/RecordingWidget';
import QueueCounter from './QueueCounter';
import type { PhaseConfig, EvaluationResult } from '../../types/sessions';

interface Scenario {
  id: string;
  title: string;
  description: string;
  prompt: string;
  /** Grammar focus for this scenario */
  grammarHint?: string;
}

interface D5Config {
  prompt?: string;
  grammarTarget?: string;
  targetVocab?: string[];
  scenarios?: Scenario[];
  /** Lane → number of required scenarios */
  requiredScenarios?: Record<number, number>;
  queueCounter?: {
    startCount?: number;
    incrementInterval?: number;
    thresholds?: [number, number];
  };
  /** PEARL response escalation per scenario index */
  pearlResponses?: string[];
  ambientMessages?: string[];
}

interface D5Props {
  phaseConfig: PhaseConfig;
  onComplete: (data?: Record<string, unknown>) => void;
}

interface ScenarioResult {
  scenarioId: string;
  recordingId: string | null;
  evaluation: EvaluationResult | null;
}

type ScenarioPhase = 'reading' | 'recording' | 'uploading' | 'reviewing' | 'done';

export default function D5AudioLog({ phaseConfig, onComplete }: D5Props) {
  const user = useStudentStore(s => s.user);
  const triggerBark = usePearlStore(s => s.triggerBark);
  const triggerAIBark = usePearlStore(s => s.triggerAIBark);
  const currentWeek = useShiftStore(s => s.currentWeek);
  const baseContext = useBarkContext();

  const config = phaseConfig.config as D5Config;
  const lane = user?.lane || 2;
  const scenarios = config.scenarios || [];
  const requiredCount = config.requiredScenarios?.[lane] ?? (lane === 1 ? 2 : lane === 2 ? 3 : 4);
  const targetVocab = config.targetVocab || [];
  const pearlResponses = config.pearlResponses || [
    'Observation filed.',
    'Noted. Added to your case log.',
    'Monitoring increased. Continue.',
    'Concern level elevated. Your observations have been escalated.',
  ];
  const queueConfig = config.queueCounter || {};

  const scenariosToShow = scenarios.slice(0, requiredCount);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scenarioPhase, setScenarioPhase] = useState<ScenarioPhase>('reading');
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [, setCurrentRecordingId] = useState<string | null>(null);

  const currentScenario = scenariosToShow[currentIndex];
  const progress = results.length / requiredCount;

  const handleStartRecording = useCallback(() => {
    setScenarioPhase('recording');
  }, []);

  const handleRecordingUploaded = useCallback((recordingId: string) => {
    setCurrentRecordingId(recordingId);
    setScenarioPhase('uploading');

    // Submit for evaluation
    (async () => {
      let evaluation: EvaluationResult | null = null;
      try {
        evaluation = await submitForEvaluation({
          weekNumber: currentWeek?.weekNumber || 3,
          phaseId: phaseConfig.id,
          activityType: 'd5_audio_log',
          content: `[Audio recording for scenario: ${currentScenario?.title}]`,
          metadata: {
            grammarTarget: config.grammarTarget,
            targetVocab,
            missionId: phaseConfig.missionId,
            lane,
          },
        });
      } catch {
        // Fail-open
      }

      const newResult: ScenarioResult = {
        scenarioId: currentScenario?.id || `scenario-${currentIndex}`,
        recordingId,
        evaluation,
      };

      const updatedResults = [...results, newResult];
      setResults(updatedResults);

      // Show escalating PEARL response
      const responseText = pearlResponses[Math.min(currentIndex, pearlResponses.length - 1)];
      if (evaluation?.pearlFeedback) {
        triggerBark('notice', evaluation.pearlFeedback);
      } else {
        triggerBark('notice', responseText);
      }

      setScenarioPhase('reviewing');
    })();
  }, [currentWeek, phaseConfig, currentScenario, config.grammarTarget, targetVocab, lane, currentIndex, results, pearlResponses, triggerBark]);

  const handleNextScenario = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= scenariosToShow.length) {
      // All scenarios complete
      setIsComplete(true);
      triggerAIBark('success', {
        ...baseContext,
        customDetail: `All ${results.length + 1} audio observations completed.`,
      }, 'All observations recorded. Your shift at Clarity Bay is complete.');

      setTimeout(() => {
        onComplete({
          score: 1,
          scenarioResults: results,
          scenariosCompleted: results.length + 1,
        });
      }, 3000);
    } else {
      setCurrentIndex(nextIndex);
      setScenarioPhase('reading');
      setCurrentRecordingId(null);
    }
  }, [currentIndex, scenariosToShow.length, results, triggerAIBark, baseContext, onComplete]);

  if (scenariosToShow.length === 0) {
    return (
      <div className="text-center py-8 font-ibm-mono text-white/40 text-sm tracking-wider">
        No scenarios available for this shift.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Queue counter (top-right floating) */}
      <div className="flex items-center justify-between">
        <span className="font-ibm-mono text-[10px] text-white/40 tracking-wider">
          OBSERVATION {currentIndex + 1} OF {scenariosToShow.length}
        </span>
        <QueueCounter
          startCount={queueConfig.startCount}
          incrementInterval={queueConfig.incrementInterval}
          thresholds={queueConfig.thresholds}
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white/10 h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-neon-mint/70 transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Prompt */}
      <div className="ios-glass-card border-neon-cyan/20 p-4">
        <p className="font-ibm-sans text-sm text-white/90 leading-relaxed">
          {config.prompt || 'Record your observation for each citizen scenario using past tense.'}
        </p>
      </div>

      {isComplete ? (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint py-8">
          ALL OBSERVATIONS FILED
        </div>
      ) : currentScenario ? (
        <div className="space-y-4">
          {/* Scenario card */}
          <div className="ios-glass-card p-5 border-white/15">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="font-ibm-mono text-xs text-neon-cyan/70 tracking-wider">
                {currentScenario.title}
              </span>
            </div>
            <p className="font-ibm-sans text-sm text-white/85 leading-relaxed mb-3">
              {currentScenario.description}
            </p>
            <div className="border-t border-white/10 pt-3">
              <p className="font-ibm-mono text-xs text-neon-cyan/60 tracking-wider">
                YOUR TASK: {currentScenario.prompt}
              </p>
              {currentScenario.grammarHint && (
                <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-1">
                  Grammar focus: {currentScenario.grammarHint}
                </p>
              )}
            </div>
          </div>

          {/* Target vocab reminder */}
          {targetVocab.length > 0 && scenarioPhase === 'reading' && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {targetVocab.map(word => (
                <span
                  key={word}
                  className="ios-glass-pill px-2.5 py-1 font-ibm-mono text-[10px] text-neon-cyan/70 tracking-wider border-neon-cyan/20"
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Reading phase — start recording button */}
          {scenarioPhase === 'reading' && (
            <button
              onClick={handleStartRecording}
              className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
            >
              Begin Recording
            </button>
          )}

          {/* Recording phase */}
          {(scenarioPhase === 'recording' || scenarioPhase === 'uploading') && (
            <RecordingWidget
              missionId={phaseConfig.missionId}
              onUploaded={handleRecordingUploaded}
            />
          )}

          {/* Uploading phase — evaluation in progress */}
          {scenarioPhase === 'uploading' && !results.find(r => r.scenarioId === currentScenario.id) && (
            <div className="ios-glass-card p-4 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-neon-cyan/40 rounded-full flex items-center justify-center mb-2">
                <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.2em] animate-pulse">
                PROCESSING OBSERVATION...
              </p>
            </div>
          )}

          {/* Reviewing phase — show PEARL response */}
          {scenarioPhase === 'reviewing' && (
            <div className="space-y-3">
              <div className="ios-glass-card p-4 border-neon-cyan/20 text-center">
                <p className="font-ibm-mono text-[10px] text-neon-mint/70 tracking-wider mb-1">
                  OBSERVATION RECORDED
                </p>
                <p className="font-ibm-mono text-xs text-white/60 tracking-wider">
                  {pearlResponses[Math.min(currentIndex, pearlResponses.length - 1)]}
                </p>
              </div>

              <button
                onClick={handleNextScenario}
                className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
              >
                {currentIndex + 1 >= scenariosToShow.length ? 'Complete Audio Log' : 'Next Scenario'}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Completed scenarios summary */}
      {results.length > 0 && !isComplete && (
        <div className="ios-glass-card p-3">
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mb-2">
            COMPLETED OBSERVATIONS
          </p>
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={r.scenarioId} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-mint" />
                <span className="font-ibm-mono text-[10px] text-white/50 tracking-wider">
                  {scenariosToShow[i]?.title || `Scenario ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
