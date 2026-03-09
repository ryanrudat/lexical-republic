import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useViewStore } from '../../stores/viewStore';
import { useHarmonyStore } from '../../stores/harmonyStore';
import { getSocket } from '../../utils/socket';
import { postShiftResult, patchClearance, patchConcern } from '../../api/shifts';

interface StatItem {
  label: string;
  value: string;
}

export default function ShiftClosing() {
  const navigate = useNavigate();
  const hasPosted = useRef(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const weekConfig = useShiftQueueStore(s => s.weekConfig);
  const taskProgress = useShiftQueueStore(s => s.taskProgress);
  const concernScoreDelta = useShiftQueueStore(s => s.concernScoreDelta);
  const concernScorePersisted = useShiftQueueStore(s => s.concernScorePersisted);
  const resetQueue = useShiftQueueStore(s => s.reset);

  const currentWeek = useShiftStore(s => s.currentWeek);
  const missions = useShiftStore(s => s.missions);
  const submitMissionScore = useShiftStore(s => s.submitMissionScore);

  const loadSeason = useSeasonStore(s => s.loadSeason);
  const openApp = useViewStore(s => s.openApp);
  const returnToDesktop = useViewStore(s => s.returnToDesktop);

  // Calculate stats from task progress
  const completedTasks = taskProgress.filter(t => t.status === 'complete');
  const totalTasks = taskProgress.length;

  let docsProcessed = 0;
  let docsTotal = 0;
  let errorsFound = 0;
  let errorsTotal = 0;
  let vocabScore = 0;
  let vocabCount = 0;
  let grammarAccuracy = 0;
  let grammarCount = 0;
  let targetWordsUsed = 0;

  for (const tp of completedTasks) {
    const d = tp.details ?? {};
    const taskType = String(d.type ?? '');

    // DocumentReview passes { documentsProcessed, errors }
    if (taskType.includes('document') || d.documentsProcessed != null) {
      docsProcessed += Number(d.documentsProcessed ?? 1);
      docsTotal += Number(d.documentsTotal ?? d.documentsProcessed ?? 1);
    }

    // ErrorCorrectionDoc + DocumentReview pass { errors } (total error count)
    if (d.errors != null) {
      errorsTotal += Number(d.errors);
    }
    if (d.errorsFound != null) {
      errorsFound += Number(d.errorsFound);
    }

    // VocabClearance passes { correct, total }
    if (d.correct != null && d.total != null) {
      vocabScore += Number(d.correct) / Math.max(Number(d.total), 1);
      vocabCount += 1;
    } else if (d.vocabScore != null) {
      vocabScore += Number(d.vocabScore);
      vocabCount += 1;
    }

    // ContradictionReport passes { correctClassifications, diffsTotal }
    if (d.correctClassifications != null) {
      grammarAccuracy += Number(d.correctClassifications) / Math.max(Number(d.diffsTotal ?? 1), 1);
      grammarCount += 1;
    } else if (d.grammarAccuracy != null) {
      grammarAccuracy += Number(d.grammarAccuracy);
      grammarCount += 1;
    }

    // ShiftReport passes { wordCount }
    if (d.wordCount != null) {
      targetWordsUsed += Number(d.wordCount);
    } else if (d.targetWordsUsed != null) {
      targetWordsUsed += Number(d.targetWordsUsed);
    }
  }

  // Average scores when multiple tasks contribute
  const avgVocabScore = vocabCount > 0 ? vocabScore / vocabCount : completedTasks.length / totalTasks;
  const avgGrammarAccuracy = grammarCount > 0 ? grammarAccuracy / grammarCount : completedTasks.length / totalTasks;

  // Use sensible defaults if no detailed data available
  if (docsTotal === 0) {
    docsProcessed = completedTasks.length;
    docsTotal = totalTasks;
  }

  const stats: StatItem[] = [
    { label: 'Documents Processed', value: docsProcessed + '/' + docsTotal },
    { label: 'Errors Found', value: errorsFound + '/' + errorsTotal },
    { label: 'Vocabulary Score', value: Math.round(avgVocabScore * 100) + '%' },
    { label: 'Grammar Accuracy', value: Math.round(avgGrammarAccuracy * 100) + '%' },
    { label: 'Target Words Used', value: String(targetWordsUsed) },
    { label: 'Concern Score', value: concernScoreDelta.toFixed(1) },
  ];

  // Post shift result, update clearance, persist concern, mark complete
  useEffect(() => {
    if (hasPosted.current || !weekConfig || !currentWeek) return;
    hasPosted.current = true;

    const postResults = async () => {
      try {
        const resultPayload: Record<string, unknown> = {
          documentsProcessed: docsProcessed,
          documentsTotal: docsTotal,
          errorsFound,
          errorsTotal,
          vocabScore: avgVocabScore,
          grammarAccuracy: avgGrammarAccuracy,
          targetWordsUsed,
          concernScoreDelta,
          tasksCompleted: completedTasks.length,
          tasksTotal: totalTasks,
        };

        await postShiftResult(currentWeek.id, resultPayload);
        await patchClearance(weekConfig.shiftClosing.clearanceTo);

        const remainingDelta = concernScoreDelta - concernScorePersisted;
        if (remainingDelta > 0) {
          await patchConcern(remainingDelta);
        }

        // Mark the last mission (clock_out equivalent) as complete
        const lastTask = weekConfig.tasks[weekConfig.tasks.length - 1];
        if (lastTask) {
          const lastMission = missions.find(m => m.missionType === lastTask.type);
          if (lastMission) {
            await submitMissionScore(lastMission.id, 1, { status: 'complete' });
          }
        }

        // Refresh season data so Duty Roster shows updated unlock state
        await loadSeason();
      } catch {
        // Fail silently -- student sees the closing screen regardless
      }

      // Animate clearance upgrade after a delay
      setTimeout(() => setShowUpgrade(true), 1000);
    };

    postResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccessHarmony = () => {
    openApp('harmony');
  };

  const handleCensureOverflow = () => {
    // Route to Harmony with censure tab active + notify teacher
    useHarmonyStore.getState().setTab('censure');
    openApp('harmony');
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('student:task-update', {
        taskId: 'censure_overflow',
        taskLabel: 'Censure Queue (bonus)',
        failCount: 0,
      });
    }
  };

  const handleEndShift = () => {
    resetQueue();
    returnToDesktop();
    navigate('/', { replace: true });
  };

  if (!weekConfig) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
      {/* Shift Complete header */}
      <div className="text-center py-4">
        <h2 className="font-special-elite text-2xl text-white/90 tracking-wider ios-text-glow">
          Shift Complete
        </h2>
        <p className="font-ibm-mono text-xs text-white/40 tracking-wider mt-2">
          SHIFT {weekConfig.weekNumber} — PROCESSING SUMMARY
        </p>
      </div>

      {/* Stats grid: 2x3 frosted glass cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="ios-glass-card p-3 text-center">
            <span className="font-dseg7 text-lg text-neon-cyan">{stat.value}</span>
            <p className="font-ibm-mono text-[9px] text-white/30 tracking-wider mt-1 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Clearance upgrade animation */}
      {showUpgrade && weekConfig.shiftClosing.clearanceFrom !== weekConfig.shiftClosing.clearanceTo && (
        <div className="ios-glass-card border border-neon-mint/30 p-4 text-center animate-fade-in">
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider uppercase mb-2">
            Clearance Level
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-ibm-mono text-sm text-white/40">
              {weekConfig.shiftClosing.clearanceFrom}
            </span>
            <span className="text-neon-mint">→</span>
            <span className="font-ibm-mono text-sm text-neon-mint tracking-wider ios-text-glow">
              {weekConfig.shiftClosing.clearanceTo}
            </span>
          </div>
        </div>
      )}

      {/* PEARL quote */}
      <div className="text-center py-2">
        <p className="font-ibm-mono text-xs text-white/60 italic max-w-md mx-auto leading-relaxed">
          &ldquo;{weekConfig.shiftClosing.pearlQuote}&rdquo;
        </p>
        <p className="font-ibm-mono text-[9px] text-white/20 tracking-wider mt-1">
          — P.E.A.R.L.
        </p>
      </div>

      {/* Narrative hook card */}
      <div className="ios-glass-card border border-terminal-amber/30 p-4">
        <h3 className="font-special-elite text-sm text-terminal-amber tracking-wider mb-2">
          {weekConfig.shiftClosing.narrativeHook.title}
        </h3>
        <p className="font-ibm-mono text-xs text-white/50 leading-relaxed">
          {weekConfig.shiftClosing.narrativeHook.body}
        </p>
      </div>

      {/* Overflow prompt */}
      <div className="ios-glass-card border border-neon-mint/20 p-3 text-center">
        <p className="font-ibm-mono text-[11px] text-white/40 leading-relaxed mb-3">
          All assigned cases processed. Citizen communication queue contains additional items requiring review.
        </p>
        <button
          onClick={handleCensureOverflow}
          className="ios-glass-pill-action px-6 py-2.5 font-ibm-mono text-xs tracking-wider"
        >
          CONTINUE TO CENSURE QUEUE
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center pt-2 pb-6">
        <button
          onClick={handleAccessHarmony}
          className="ios-glass-pill px-6 py-2.5 font-ibm-mono text-xs tracking-wider text-white/60 hover:text-white"
        >
          ACCESS HARMONY
        </button>
        <button
          onClick={handleEndShift}
          className="ios-glass-pill px-6 py-2.5 font-ibm-mono text-xs tracking-wider text-white/60 hover:text-white"
        >
          END SHIFT
        </button>
      </div>
    </div>
  );
}
