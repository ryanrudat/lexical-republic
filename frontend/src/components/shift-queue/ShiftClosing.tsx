import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useSeasonStore } from '../../stores/seasonStore';
import { useViewStore } from '../../stores/viewStore';
import { useHarmonyStore } from '../../stores/harmonyStore';
import { getSocket } from '../../utils/socket';
import { postShiftResult, patchClearance, patchConcern } from '../../api/shifts';
import { aggregateTaskResults } from '../../utils/scoreAggregator';
import type { TaskResultDetails } from '../../types/taskResult';
import { getCitizen4488PostForWeek } from '../../data/citizen4488Posts';

interface StatItem {
  label: string;
  value: string;
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return Math.round(value * 100) + '%';
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

  // Aggregate stats from the completed task results via the pure reducer.
  const completedTasks = useMemo(
    () => taskProgress.filter(t => t.status === 'complete'),
    [taskProgress],
  );

  const aggregate = useMemo(
    () =>
      aggregateTaskResults(
        completedTasks.map(t => ({
          score: t.score ?? 0,
          details: t.details as TaskResultDetails | undefined,
        })),
      ),
    [completedTasks],
  );

  // Sum target-word usage from writing tasks that report a wordCount.
  const targetWordsUsed = useMemo(() => {
    let total = 0;
    for (const t of completedTasks) {
      const wc = (t.details as Record<string, unknown> | undefined)?.wordCount;
      if (typeof wc === 'number') total += wc;
    }
    return total;
  }, [completedTasks]);

  // W3 MVP reactive echo: pull the student's first writing sentence from the
  // Priority Briefing writing card and quote it back at shift close. Tests
  // whether students notice the game quoting their own words.
  const partyObservation = useMemo<string | null>(() => {
    if (!weekConfig || weekConfig.weekNumber !== 3) return null;
    const briefingTask = completedTasks.find(t => t.taskId === 'priority_briefing');
    const submissions = (briefingTask?.details as Record<string, unknown> | undefined)
      ?.writingSubmissions as Record<string, string> | undefined;
    if (!submissions) return null;
    const firstNonEmpty = Object.values(submissions).find(s => s && s.trim().length > 0);
    if (!firstNonEmpty) return null;
    const firstSentence = firstNonEmpty.trim().split(/[.!?]+/)[0]?.trim();
    if (!firstSentence) return null;
    const words = firstSentence.split(/\s+/);
    const capped = words.length > 20
      ? words.slice(0, 20).join(' ') + '…'
      : words.join(' ') + '.';
    return capped.charAt(0).toUpperCase() + capped.slice(1);
  }, [completedTasks, weekConfig]);

  const stats: StatItem[] = [
    { label: 'Documents Processed', value: completedTasks.length + '/' + taskProgress.length },
    {
      label: 'Errors Found',
      value:
        aggregate.errorsTotal > 0
          ? aggregate.errorsFound + '/' + aggregate.errorsTotal
          : 'N/A',
    },
    { label: 'Vocabulary Score', value: formatPct(aggregate.vocabAccuracy) },
    { label: 'Grammar Accuracy', value: formatPct(aggregate.grammarAccuracy) },
    { label: 'Target Words Used', value: String(targetWordsUsed) },
    { label: 'Concern Score', value: concernScoreDelta.toFixed(1) },
  ];

  const citizen4488Post = weekConfig
    ? getCitizen4488PostForWeek(weekConfig.weekNumber)
    : null;

  // Post shift result, update clearance, persist concern, mark complete
  useEffect(() => {
    if (hasPosted.current || !weekConfig || !currentWeek) return;
    hasPosted.current = true;

    const postResults = async () => {
      try {
        const resultPayload: Record<string, unknown> = {
          documentsProcessed: completedTasks.length,
          documentsTotal: taskProgress.length,
          errorsFound: aggregate.errorsFound,
          errorsTotal: aggregate.errorsTotal,
          vocabScore: aggregate.vocabAccuracy,
          grammarAccuracy: aggregate.grammarAccuracy,
          writingScore: aggregate.writingScore,
          targetWordsUsed,
          concernScoreDelta,
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
        <h2 className="font-special-elite text-2xl text-[#2C3340] tracking-wider">
          Shift Complete
        </h2>
        <p className="font-ibm-mono text-xs text-[#9CA3AF] tracking-wider mt-2">
          SHIFT {weekConfig.weekNumber} — PROCESSING SUMMARY
        </p>
      </div>

      {/* Stats grid: 2x3 cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white border border-[#E8E4DC] rounded-xl p-3 text-center">
            <span className="font-ibm-mono text-lg text-sky-600 font-bold">{stat.value}</span>
            <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider mt-1 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Citizen-4488 Case File Update — subtle but hard to miss */}
      {citizen4488Post && (
        <Citizen4488Card post={citizen4488Post} concernDelta={concernScoreDelta} />
      )}

      {/* Clearance upgrade animation */}
      {showUpgrade && weekConfig.shiftClosing.clearanceFrom !== weekConfig.shiftClosing.clearanceTo && (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 text-center animate-fade-in">
          <p className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider uppercase mb-2">
            Clearance Level
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-ibm-mono text-sm text-[#9CA3AF]">
              {weekConfig.shiftClosing.clearanceFrom}
            </span>
            <span className="text-emerald-500">→</span>
            <span className="font-ibm-mono text-sm text-emerald-600 tracking-wider font-bold">
              {weekConfig.shiftClosing.clearanceTo}
            </span>
          </div>
        </div>
      )}

      {/* W3 reactive echo — PEARL quotes the student's first written principle back */}
      {partyObservation && (
        <div className="bg-white border border-sky-200 rounded-xl p-4 animate-fade-in">
          <p className="font-ibm-mono text-[10px] text-sky-600 tracking-wider uppercase mb-2 text-center">
            P.E.A.R.L. — Observation
          </p>
          <p className="text-xs text-[#4B5563] leading-relaxed text-center">
            Your first principle — <span className="italic">&ldquo;{partyObservation}&rdquo;</span> — has been logged. The Party values specificity, Citizen.
          </p>
        </div>
      )}

      {/* PEARL quote */}
      <div className="text-center py-2">
        <p className="text-sm text-[#4B5563] italic max-w-md mx-auto leading-relaxed">
          &ldquo;{weekConfig.shiftClosing.pearlQuote}&rdquo;
        </p>
        <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider mt-1">
          — P.E.A.R.L.
        </p>
      </div>

      {/* Narrative hook card */}
      <div className="bg-white border border-amber-200 rounded-xl p-4">
        <h3 className="font-special-elite text-sm text-amber-700 tracking-wider mb-2">
          {weekConfig.shiftClosing.narrativeHook.title}
        </h3>
        <p className="text-xs text-[#6B7280] leading-relaxed">
          {weekConfig.shiftClosing.narrativeHook.body}
        </p>
      </div>

      {/* Overflow prompt */}
      <div className="bg-[#FAFAF7] border border-emerald-200 rounded-xl p-3 text-center">
        <p className="text-[11px] text-[#6B7280] leading-relaxed mb-3">
          All assigned cases processed. Citizen communication queue contains additional items requiring review.
        </p>
        <button
          onClick={handleCensureOverflow}
          className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700"
        >
          Continue to Censure Queue
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center pt-2 pb-6">
        <button
          onClick={handleAccessHarmony}
          className="px-6 py-2.5 rounded-xl border border-[#D4CFC6] bg-white text-xs font-medium tracking-wider text-[#6B7280] hover:text-[#2C3340] hover:border-sky-300 transition-colors"
        >
          Access Harmony
        </button>
        <button
          onClick={handleEndShift}
          className="px-6 py-2.5 rounded-xl border border-[#D4CFC6] bg-white text-xs font-medium tracking-wider text-[#6B7280] hover:text-[#2C3340] hover:border-sky-300 transition-colors"
        >
          End Shift
        </button>
      </div>
    </div>
  );
}

// ── Citizen-4488 case file card ─────────────────────────────────

interface Citizen4488CardProps {
  post: { title: string; excerpt: string };
  concernDelta: number;
}

function Citizen4488Card({ post, concernDelta }: Citizen4488CardProps) {
  const tone =
    concernDelta >= 0.5
      ? { label: 'CONCERN RISING', text: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50' }
      : concernDelta >= 0.2
      ? { label: 'MILD CONCERN', text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' }
      : { label: 'STABLE', text: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' };

  return (
    <div className={`border rounded-xl overflow-hidden ${tone.border} ${tone.bg}`}>
      <div className="px-4 py-2 border-b border-white/60 flex items-center justify-between">
        <span className={`font-ibm-mono text-[9px] tracking-widest uppercase ${tone.text}`}>
          Citizen-4488 Case File
        </span>
        <span className={`font-ibm-mono text-[9px] tracking-widest uppercase ${tone.text}`}>
          {tone.label} &middot; &Delta; {concernDelta.toFixed(2)}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2 bg-white">
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
          {post.title}
        </p>
        <p className="text-[12px] text-[#4B5563] leading-relaxed">
          &ldquo;{post.excerpt}&rdquo;
        </p>
      </div>
    </div>
  );
}
