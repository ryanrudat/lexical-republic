import { useEffect, useRef, useState, useCallback } from 'react';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import { useMessagingStore } from '../../stores/messagingStore';
import { useShiftStore } from '../../stores/shiftStore';
import { getSocket } from '../../utils/socket';
import { resolveUploadUrl } from '../../api/client';
import TaskCard from './TaskCard';
import ShiftClosing from './ShiftClosing';
import MonitorPlayer from '../shared/MonitorPlayer';
import DismissalBroadcast from './DismissalBroadcast';
import VocabularyInterstitial from './VocabularyInterstitial';
import InterTaskMoment from './InterTaskMoment';
import ClarityCheck from './ClarityCheck';
import { fetchCompletedClarityChecks } from '../../api/clarity-check';
import ComplianceCheckShell from '../compliance-check/ComplianceCheckShell';
import {
  fetchPendingComplianceCheck,
  submitComplianceCheck,
  type PendingComplianceCheck,
} from '../../api/compliance-check';
import IntakeForm from './tasks/IntakeForm';
import WordMatch from './tasks/WordMatch';
import ClozeFill from './tasks/ClozeFill';
import WordSort from './tasks/WordSort';
import VocabClearance from './tasks/VocabClearance';
import DocumentReview from './tasks/DocumentReview';
import ContradictionReport from './tasks/ContradictionReport';
import PriorityBriefing from './tasks/PriorityBriefing';
import PrioritySort from './tasks/PrioritySort';
import ShiftReport from './tasks/ShiftReport';
import CipherActivity from './tasks/CipherActivity';
import DropBoxOverlay from './w4/DropBoxOverlay';
import RecruitmentModal from './w4/RecruitmentModal';
import CaseQueueSidebar from './w4/CaseQueueSidebar';
import TaskGateOverlay from './TaskGateOverlay';
import { fetchNarrativeChoices } from '../../api/narrative-choices';
import type { TaskProps, BridgingBriefing, InterTaskMomentConfig, ClarityCheckConfig } from '../../types/shiftQueue';

/** Bridging briefing overlay for condensed-route students who skipped weeks */
function BridgingBriefingOverlay({ briefing, onDismiss }: { briefing: BridgingBriefing; onDismiss: () => void }) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="bg-white rounded-xl border border-[#D4CFC6] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="font-ibm-mono text-[10px] tracking-[0.15em] text-[#8B8578] uppercase">
            Inter-Shift Briefing
          </span>
        </div>
        <h3 className="text-sm font-semibold text-[#2C3340] mb-0.5">{briefing.title}</h3>
        <p className="text-[10px] text-[#8B8578] mb-3 font-ibm-mono">From: {briefing.from}</p>
        <div className="space-y-2.5">
          {briefing.paragraphs.map((p, i) => (
            <p key={i} className="text-xs text-[#4B5563] leading-relaxed">{p}</p>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[#E8E4DC] flex justify-end">
          <button
            onClick={onDismiss}
            className="text-[10px] font-ibm-mono tracking-[0.15em] uppercase px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors active:scale-95"
          >
            Proceed to Shift
          </button>
        </div>
      </div>
    </div>
  );
}

const TASK_REGISTRY: Record<string, React.ComponentType<TaskProps>> = {
  intake_form: IntakeForm,
  word_match: WordMatch,
  cloze_fill: ClozeFill,
  word_sort: WordSort,
  vocab_clearance: VocabClearance,
  document_review: DocumentReview,
  shift_report: ShiftReport,
  contradiction_report: ContradictionReport,
  priority_briefing: PriorityBriefing,
  priority_sort: PrioritySort,
};

const VOCAB_TASK_TYPES = new Set(['vocab_clearance', 'cloze_fill']);

/** Extract teacher video clip info from a task config */
function getTaskClip(config: Record<string, unknown>) {
  const override = config?.teacherOverride as Record<string, unknown> | undefined;
  if (override?.videoClipHidden === true) return { clipUrl: '', clipEmbed: '', hasClip: false };
  const clipUrl = typeof override?.videoClipUrl === 'string' ? resolveUploadUrl(override.videoClipUrl) : '';
  const clipEmbed = typeof override?.videoClipEmbedUrl === 'string' ? (override.videoClipEmbedUrl as string).trim() : '';
  return { clipUrl, clipEmbed, hasClip: !!(clipUrl || clipEmbed) };
}

export default function ShiftQueue() {
  const { weekConfig, taskProgress, currentTaskIndex, shiftComplete, loading, taskResetKey, gated } =
    useShiftQueueStore();
  const { completeTask } = useShiftQueueStore();
  const { triggerMessage, loadMessages } = useMessagingStore();
  const currentWeek = useShiftStore(s => s.currentWeek);

  const weekNumber = currentWeek?.weekNumber ?? 0;
  const currentTask = weekConfig?.tasks[currentTaskIndex] ?? null;
  const messagesReadyRef = useRef(false);
  const lastTriggeredTaskRef = useRef<string | null>(null);

  // Bridging briefing gate — show once per shift load for condensed-route students
  const [briefingDismissed, setBriefingDismissed] = useState(false);

  // Reset briefing dismissed state when week changes
  useEffect(() => {
    setBriefingDismissed(false);
  }, [weekConfig?.weekNumber]);

  // Video clip gate — show clip before task, then reveal task
  const [watchingClip, setWatchingClip] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dismissal broadcast state (clipAfter)
  const [dismissalState, setDismissalState] = useState<'idle' | 'flash' | 'playing' | 'outro'>('idle');
  const dismissalUrlRef = useRef<string>('');
  const [showDismissalSkip, setShowDismissalSkip] = useState(false);
  const pendingTriggerRef = useRef<{ taskId: string; weekNumber: number } | null>(null);

  // Vocabulary interstitial — shown after vocab_clearance / cloze_fill tasks complete
  const [showVocabInterstitial, setShowVocabInterstitial] = useState(false);
  const pendingInterstitialRef = useRef(false);

  // Inter-task moment (B-layer) — non-skippable character choice or ambient beat
  // keyed by the task ID it fires AFTER.
  const [activeInterTaskMoment, setActiveInterTaskMoment] = useState<InterTaskMomentConfig | null>(null);
  const pendingInterTaskMomentRef = useRef<InterTaskMomentConfig | null>(null);

  // Clarity Check — screen-locking pop-up vocab verification.
  // Placement: shift_start | shift_end | { afterTaskId }. One-shot per shift.
  const [activeClarityCheck, setActiveClarityCheck] = useState<ClarityCheckConfig | null>(null);
  const pendingClarityCheckRef = useRef<ClarityCheckConfig | null>(null);
  const completedClarityCheckIdsRef = useRef<Set<string>>(new Set());

  // Compliance Check — teacher-scheduled per-class screen-locking vocab quiz.
  // Fetched from backend at placement points (shift_start, after_task, shift_end).
  // One-shot per template per pair (DB-enforced via unique constraint).
  const [activeComplianceCheck, setActiveComplianceCheck] = useState<PendingComplianceCheck | null>(null);
  const pendingComplianceCheckRef = useRef<PendingComplianceCheck | null>(null);
  const completedComplianceTemplateIdsRef = useRef<Set<string>>(new Set());
  const [shiftEndComplianceFetched, setShiftEndComplianceFetched] = useState(false);

  // W4 epilogue cascade (Drop Box → Recruitment vote → ShiftClosing).
  // Resolves which stage to render based on existing NarrativeChoices —
  // refresh-safe. 'loading' is the initial state while we fetch; 'done'
  // means both choices are recorded and ShiftClosing should render.
  const [w4Stage, setW4Stage] = useState<'loading' | 'dropbox' | 'recruitment' | 'done'>('loading');

  const findClarityCheckForPlacement = useCallback(
    (
      placementMatch: (placement: ClarityCheckConfig['placement']) => boolean,
    ): ClarityCheckConfig | null => {
      const checks = weekConfig?.clarityChecks ?? [];
      for (const c of checks) {
        if (completedClarityCheckIdsRef.current.has(c.id)) continue;
        if (placementMatch(c.placement)) return c;
      }
      return null;
    },
    [weekConfig],
  );

  // Clear interstitial + inter-task moment + clarity check + compliance check on week change / teacher task reset / skip
  useEffect(() => {
    setShowVocabInterstitial(false);
    pendingInterstitialRef.current = false;
    setActiveInterTaskMoment(null);
    pendingInterTaskMomentRef.current = null;
    setActiveClarityCheck(null);
    pendingClarityCheckRef.current = null;
    completedClarityCheckIdsRef.current = new Set();
    setActiveComplianceCheck(null);
    pendingComplianceCheckRef.current = null;
    completedComplianceTemplateIdsRef.current = new Set();
    setShiftEndComplianceFetched(false);
    setW4Stage('loading');
  }, [weekConfig?.weekNumber, taskResetKey]);

  // W4 epilogue resolver — fires when shiftComplete first becomes true.
  // Reads existing NarrativeChoices to decide which epilogue stage to show
  // (or to skip the epilogue entirely if both choices are already on file).
  useEffect(() => {
    if (!shiftComplete || weekNumber !== 4) return;
    if (w4Stage !== 'loading') return;
    let cancelled = false;
    fetchNarrativeChoices(4)
      .then((choices) => {
        if (cancelled) return;
        const keys = new Set(choices.map((c) => c.choiceKey));
        if (keys.has('w4_recruitment_vote')) setW4Stage('done');
        else if (keys.has('w4_drop_box_first_submission')) setW4Stage('recruitment');
        else setW4Stage('dropbox');
      })
      .catch(() => {
        // On fetch failure, run the epilogue from the start rather than
        // skipping it. 'done' here silently dropped the recruitment vote
        // (the W5-gating NarrativeChoice) on a single failed GET — end-of-
        // class Wi-Fi blips were eating votes with no retry surface. Worst
        // case now: a student who already voted is politely re-asked.
        if (!cancelled) setW4Stage('dropbox');
      });
    return () => { cancelled = true; };
  }, [shiftComplete, weekNumber, w4Stage]);

  // Fetch a pending Compliance Check for the given placement, or null.
  const fetchComplianceCheckFor = useCallback(
    async (
      placement: 'shift_start' | 'shift_end' | 'after_task',
      afterTaskId?: string,
    ): Promise<PendingComplianceCheck | null> => {
      if (!weekConfig) return null;
      try {
        const res = await fetchPendingComplianceCheck({
          weekNumber: weekConfig.weekNumber,
          placement,
          ...(afterTaskId ? { afterTaskId } : {}),
        });
        const c = res.pending;
        if (!c) return null;
        if (completedComplianceTemplateIdsRef.current.has(c.templateId)) return null;
        return c;
      } catch {
        return null;
      }
    },
    [weekConfig],
  );

  // When task changes, check if it has a clip to play first
  useEffect(() => {
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    setShowSkip(false);

    if (currentTask) {
      const { hasClip } = getTaskClip(currentTask.config);
      if (hasClip) {
        setWatchingClip(true);
        skipTimerRef.current = setTimeout(() => setShowSkip(true), 3000);
      } else {
        setWatchingClip(false);
      }
    }

    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [currentTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire shift_start clarity check + compliance check (clarity first, then compliance)
  useEffect(() => {
    if (!weekConfig) return;
    let cancelled = false;
    const expectedWeek = weekConfig.weekNumber;
    void (async () => {
      // Hydrate the one-shot gate from the server FIRST. The ref is client
      // memory only and resets on every refresh/remount, which replayed the
      // shift_start check as a screen-locking quiz (mastery was already
      // server-deduped; the lockout wasn't). Fail-open: worst case is the
      // old replay behavior.
      try {
        const checkIds = await fetchCompletedClarityChecks(expectedWeek);
        if (cancelled) return;
        for (const id of checkIds) completedClarityCheckIdsRef.current.add(id);
      } catch {
        /* hydration is best-effort */
      }
      const startCheck = findClarityCheckForPlacement((p) => p === 'shift_start');
      const cc = await fetchComplianceCheckFor('shift_start');
      // Bail if the student moved to a different shift while we were fetching.
      if (cancelled) return;
      if (cc && cc.weekIssued !== expectedWeek) return;
      if (startCheck) {
        setActiveClarityCheck(startCheck);
        pendingComplianceCheckRef.current = cc ?? null;
      } else if (cc) {
        setActiveComplianceCheck(cc);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekConfig?.weekNumber]);

  // Fire shift_end clarity check + compliance check before ShiftClosing renders
  useEffect(() => {
    if (!shiftComplete) return;
    if (activeClarityCheck || activeComplianceCheck) return;
    if (shiftEndComplianceFetched) return;
    if (!weekConfig) return;

    let cancelled = false;
    const expectedWeek = weekConfig.weekNumber;
    const endCheck = findClarityCheckForPlacement((p) => p === 'shift_end');
    void fetchComplianceCheckFor('shift_end').then((cc) => {
      if (cancelled) return;
      if (cc && cc.weekIssued !== expectedWeek) return;
      if (endCheck) {
        setActiveClarityCheck(endCheck);
        pendingComplianceCheckRef.current = cc ?? null;
      } else if (cc) {
        setActiveComplianceCheck(cc);
      }
      setShiftEndComplianceFetched(true);
    });
    return () => { cancelled = true; };
  }, [shiftComplete, activeClarityCheck, activeComplianceCheck, shiftEndComplianceFetched, weekConfig?.weekNumber, findClarityCheckForPlacement, fetchComplianceCheckFor]);

  // Load messages on mount, then fire shift_start + initial task_start
  useEffect(() => {
    if (!weekConfig) return;
    messagesReadyRef.current = false;
    lastTriggeredTaskRef.current = null;
    // Persistent reconnect re-emit: after any >5s disconnect the server's
    // rebuilt status is hollow (no tasks, no task label) and the teacher card
    // goes blank for the rest of the task. Re-announce the task list + the
    // CURRENT task (read live from the store — not the mount-time snapshot)
    // on every (re)connect. Registered before the async load so a cleanup
    // always exists even if the component unmounts mid-load.
    const sock = getSocket();
    const emitCurrent = () => {
      const wc = useShiftQueueStore.getState().weekConfig;
      const idx = useShiftQueueStore.getState().currentTaskIndex;
      if (!wc) return;
      sock?.emit('student:shift-tasks', wc.tasks.map(t => ({ id: t.id, label: t.label })));
      const liveTask = wc.tasks[idx];
      if (liveTask) sock?.emit('student:task-update', { taskId: liveTask.id, taskLabel: liveTask.label });
    };
    sock?.on('connect', emitCurrent);

    loadMessages(weekNumber).then(() => {
      messagesReadyRef.current = true;
      triggerMessage('shift_start', { weekNumber }, weekConfig);
      // Fire initial task_start
      const task = weekConfig.tasks[currentTaskIndex];
      if (task) {
        lastTriggeredTaskRef.current = task.id;
        triggerMessage('task_start', { taskId: task.id, weekNumber }, weekConfig);
      }
      // Emit the full task list + initial task to the teacher's monitor right
      // away when already connected (cold-open handshake is covered by the
      // persistent connect handler above).
      if (sock?.connected) emitCurrent();
    });
    return () => {
      sock?.off('connect', emitCurrent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekConfig?.weekNumber]);

  // Fire task_start when task changes AFTER initial load
  useEffect(() => {
    if (!currentTask || !weekConfig || !messagesReadyRef.current) return;
    if (lastTriggeredTaskRef.current === currentTask.id) return;
    lastTriggeredTaskRef.current = currentTask.id;
    triggerMessage('task_start', { taskId: currentTask.id, weekNumber }, weekConfig);

    // Emit task update to teacher's class monitor
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('student:task-update', {
        taskId: currentTask.id,
        taskLabel: currentTask.label,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask?.id]);

  const handleComplete = async (score: number, details?: Record<string, unknown>) => {
    if (!currentTask || !weekConfig) return;

    // Capture clipAfter BEFORE completeTask advances the index
    const afterUrl = currentTask.clipAfter
      ? resolveUploadUrl(currentTask.clipAfter)
      : '';
    const completedTaskId = currentTask.id;
    // cloze_fill_w4 renders inside the [ ].edited app and ends with Frey's
    // bark — skipping the cream Party-flavored vocab interstitial keeps
    // the Unedited register intact through the next inter-task moment.
    const wasVocabTask = completedTaskId === 'cloze_fill_w4'
      ? false
      : VOCAB_TASK_TYPES.has(currentTask.type);
    const momentConfig = weekConfig.interTaskMoments?.[completedTaskId] ?? null;
    const clarityCheckConfig = findClarityCheckForPlacement(
      (p) => typeof p === 'object' && p.afterTaskId === completedTaskId,
    );
    const expectedWeek = weekConfig.weekNumber;

    // Persist the task completion FIRST. The compliance fetch used to run
    // before this await, so a slow/hung compliance request delayed the
    // MissionScore write — a refresh in that window lost the completed task.
    await completeTask(currentTask.id, score, details);

    const fetchedComplianceCheck = await fetchComplianceCheckFor('after_task', completedTaskId);
    // Bail if student moved to a different shift while the fetch was in flight.
    const complianceCheckConfig =
      fetchedComplianceCheck && fetchedComplianceCheck.weekIssued === expectedWeek
        ? fetchedComplianceCheck
        : null;

    if (afterUrl) {
      // DELAY character message triggers until dismissal completes
      pendingInterstitialRef.current = wasVocabTask;
      pendingInterTaskMomentRef.current = momentConfig;
      pendingClarityCheckRef.current = clarityCheckConfig;
      pendingComplianceCheckRef.current = complianceCheckConfig;
      dismissalUrlRef.current = afterUrl;
      pendingTriggerRef.current = { taskId: completedTaskId, weekNumber };
      setDismissalState('flash');
    } else {
      // No dismissal video — fire messages immediately
      triggerMessage('task_complete', { taskId: completedTaskId, weekNumber }, weekConfig);
      if (wasVocabTask) {
        pendingInterTaskMomentRef.current = momentConfig;
        pendingClarityCheckRef.current = clarityCheckConfig;
        pendingComplianceCheckRef.current = complianceCheckConfig;
        setShowVocabInterstitial(true);
      } else if (momentConfig) {
        pendingClarityCheckRef.current = clarityCheckConfig;
        pendingComplianceCheckRef.current = complianceCheckConfig;
        setActiveInterTaskMoment(momentConfig);
      } else if (clarityCheckConfig) {
        pendingComplianceCheckRef.current = complianceCheckConfig;
        setActiveClarityCheck(clarityCheckConfig);
      } else if (complianceCheckConfig) {
        setActiveComplianceCheck(complianceCheckConfig);
      }
    }
  };

  const handleDismissalComplete = useCallback(() => {
    setDismissalState('idle');
    setShowDismissalSkip(false);
    dismissalUrlRef.current = '';

    // Fire deferred task_complete message triggers NOW
    if (pendingTriggerRef.current && weekConfig) {
      triggerMessage('task_complete', pendingTriggerRef.current, weekConfig);
      pendingTriggerRef.current = null;
    }

    // Cascade: vocab interstitial → inter-task moment → clarity check → compliance check → next task
    if (pendingInterstitialRef.current) {
      pendingInterstitialRef.current = false;
      setShowVocabInterstitial(true);
    } else if (pendingInterTaskMomentRef.current) {
      setActiveInterTaskMoment(pendingInterTaskMomentRef.current);
      pendingInterTaskMomentRef.current = null;
    } else if (pendingClarityCheckRef.current) {
      setActiveClarityCheck(pendingClarityCheckRef.current);
      pendingClarityCheckRef.current = null;
    } else if (pendingComplianceCheckRef.current) {
      setActiveComplianceCheck(pendingComplianceCheckRef.current);
      pendingComplianceCheckRef.current = null;
    }
  }, [weekConfig, triggerMessage]);

  const handleVocabInterstitialContinue = useCallback(() => {
    setShowVocabInterstitial(false);
    if (pendingInterTaskMomentRef.current) {
      setActiveInterTaskMoment(pendingInterTaskMomentRef.current);
      pendingInterTaskMomentRef.current = null;
    } else if (pendingClarityCheckRef.current) {
      setActiveClarityCheck(pendingClarityCheckRef.current);
      pendingClarityCheckRef.current = null;
    } else if (pendingComplianceCheckRef.current) {
      setActiveComplianceCheck(pendingComplianceCheckRef.current);
      pendingComplianceCheckRef.current = null;
    }
  }, []);

  const handleInterTaskMomentComplete = useCallback(() => {
    setActiveInterTaskMoment(null);
    if (pendingClarityCheckRef.current) {
      setActiveClarityCheck(pendingClarityCheckRef.current);
      pendingClarityCheckRef.current = null;
    } else if (pendingComplianceCheckRef.current) {
      setActiveComplianceCheck(pendingComplianceCheckRef.current);
      pendingComplianceCheckRef.current = null;
    }
  }, []);

  const handleClarityCheckComplete = useCallback(() => {
    if (activeClarityCheck) {
      completedClarityCheckIdsRef.current.add(activeClarityCheck.id);
    }
    setActiveClarityCheck(null);
    if (pendingComplianceCheckRef.current) {
      setActiveComplianceCheck(pendingComplianceCheckRef.current);
      pendingComplianceCheckRef.current = null;
    }
  }, [activeClarityCheck]);

  const handleComplianceCheckComplete = useCallback(
    async (results: Array<{ word: string; correct: boolean }>) => {
      const checkBeingCompleted = activeComplianceCheck;
      if (!checkBeingCompleted) return;
      completedComplianceTemplateIdsRef.current.add(checkBeingCompleted.templateId);
      try {
        await submitComplianceCheck({ checkId: checkBeingCompleted.checkId, words: results });
      } catch (err) {
        console.error('[ComplianceCheck] submit failed:', err);
      }
      setTimeout(() => setActiveComplianceCheck(null), 2200);
    },
    [activeComplianceCheck],
  );

  const handleClipDone = () => {
    setWatchingClip(false);
    setShowSkip(false);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
  };

  // Loading state
  if (loading || !weekConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="font-ibm-mono text-[#8B8578] text-xs animate-pulse tracking-[0.2em]">
          Loading module...
        </div>
      </div>
    );
  }

  // Bridging briefing overlay (condensed route — context for skipped weeks)
  if (weekConfig.bridgingBriefing && !briefingDismissed && currentTaskIndex === 0) {
    return (
      <BridgingBriefingOverlay
        briefing={weekConfig.bridgingBriefing}
        onDismiss={() => setBriefingDismissed(true)}
      />
    );
  }

  // Dismissal broadcast overlay (clipAfter)
  if (dismissalState !== 'idle') {
    return (
      <DismissalBroadcast
        state={dismissalState as 'flash' | 'playing' | 'outro'}
        videoUrl={dismissalUrlRef.current}
        showSkip={showDismissalSkip}
        onStateChange={setDismissalState}
        onSkipReady={() => setShowDismissalSkip(true)}
        onComplete={handleDismissalComplete}
        onSkip={handleDismissalComplete}
      />
    );
  }

  // Vocabulary interstitial — shown after vocab_clearance / cloze_fill tasks
  if (showVocabInterstitial) {
    return (
      <VocabularyInterstitial
        weekNumber={weekNumber}
        targetWords={weekConfig.targetWords}
        onContinue={handleVocabInterstitialContinue}
      />
    );
  }

  // Inter-task moment (B-layer) — non-skippable character choice or ambient beat
  if (activeInterTaskMoment) {
    return (
      <InterTaskMoment
        moment={activeInterTaskMoment}
        weekNumber={weekNumber}
        onComplete={handleInterTaskMomentComplete}
      />
    );
  }

  // Clarity Check — screen-locking pop-up vocab verification (takes priority over task render)
  if (activeClarityCheck) {
    return (
      <ClarityCheck
        config={activeClarityCheck}
        weekNumber={weekNumber}
        onComplete={handleClarityCheckComplete}
      />
    );
  }

  // Compliance Check — teacher-scheduled per-class lockout (mounts after Clarity Check)
  // Render-time guard: never show a check whose weekIssued doesn't match the
  // current shift. Defends against any stale state that escaped the cascade
  // cancellation (e.g., race during shift change).
  if (activeComplianceCheck && weekConfig && activeComplianceCheck.weekIssued === weekConfig.weekNumber) {
    return (
      <ComplianceCheckShell
        questions={activeComplianceCheck.questions}
        onComplete={handleComplianceCheckComplete}
      />
    );
  }

  // Gated — waiting for teacher to advance
  if (gated && !shiftComplete) {
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('student:task-update', { taskId: 'gated', taskLabel: 'Awaiting Clearance', failCount: 0 });
    }
    return (
      <div className="flex flex-col gap-4">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-1">
          {taskProgress.map((tp, idx) => (
            <div
              key={tp.taskId}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                tp.status === 'complete'
                  ? 'bg-emerald-400'
                  : tp.status === 'current'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-[#D4CFC6]'
              }`}
              aria-label={`Task ${idx + 1}: ${tp.status}`}
            />
          ))}
        </div>
        <TaskGateOverlay />
      </div>
    );
  }

  // Shift complete — notify teacher
  if (shiftComplete) {
    // Defer ShiftClosing while shift_end Clarity Check or Compliance Check still needs to fire,
    // to avoid the closing screen briefly flashing before the check takes over.
    const endCheckPending = findClarityCheckForPlacement((p) => p === 'shift_end');
    if (endCheckPending) return null;
    if (!shiftEndComplianceFetched) return null;
    if (pendingComplianceCheckRef.current) return null;

    // W4 epilogue: Drop Box → Recruitment vote → ShiftClosing. Stage
    // resolves async from existing NarrativeChoices (refresh-safe). While
    // loading, render a brief Frey-register beat instead of flashing
    // ShiftClosing or any Party chrome.
    if (weekNumber === 4 && w4Stage !== 'done') {
      if (w4Stage === 'loading') {
        return (
          <div className="bg-slate-950 min-h-[300px] -mx-4 -my-3 px-6 py-12 rounded-xl text-slate-400 font-ibm-mono text-sm">
            <p className="lowercase">&gt; reading...</p>
          </div>
        );
      }
      if (w4Stage === 'dropbox') {
        return (
          <DropBoxOverlay
            weekNumber={weekNumber}
            onComplete={() => setW4Stage('recruitment')}
          />
        );
      }
      if (w4Stage === 'recruitment') {
        return (
          <RecruitmentModal
            weekNumber={weekNumber}
            onComplete={() => setW4Stage('done')}
          />
        );
      }
    }

    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('student:task-update', { taskId: 'shift_complete', taskLabel: 'Shift Complete', failCount: 0 });
    }
    return <ShiftClosing />;
  }

  // Resolve current task component.
  // ID-level override: cloze_fill_w4 renders inside the [ ].edited app's
  // Cipher chrome (CipherActivity), not the standard ClozeFill. Same
  // task lifecycle — different visual register.
  const TaskComponent = currentTask
    ? currentTask.id === 'cloze_fill_w4'
      ? CipherActivity
      : TASK_REGISTRY[currentTask.type]
    : null;

  // Video clip gate — full-screen "movie theater" overlay
  if (currentTask && watchingClip) {
    const { clipUrl, clipEmbed } = getTaskClip(currentTask.config);
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(58,82,65,0.35) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,180,100,0.08) 0%, transparent 60%), radial-gradient(ellipse 120% 80% at 50% 55%, rgba(90,75,50,0.2) 0%, transparent 70%)',
        }}
      >
        <div className="w-full max-w-3xl px-4">
          <MonitorPlayer
            src={clipUrl || undefined}
            embedUrl={clipEmbed || undefined}
            autoPlay
            onEnded={handleClipDone}
          />
        </div>
        {showSkip && (
          <button
            onClick={handleClipDone}
            className="mt-6 font-ibm-mono text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border rounded transition-all active:scale-95 opacity-50 hover:opacity-100"
            style={{
              borderColor: '#5a8a6a',
              color: '#5a8a6a',
              background: 'transparent',
            }}
          >
            SKIP
          </button>
        )}
      </div>
    );
  }

  // W4 layout: main task area + right-column case queue sidebar (lg+).
  // Below lg, the sidebar hides and the task gets the full width.
  const isW4 = weekNumber === 4;

  return (
    <div className={isW4 ? 'lg:flex lg:gap-6 lg:items-start' : ''}>
      <div className={`flex flex-col gap-4${isW4 ? ' lg:flex-1 min-w-0' : ''}`}>
        {/* ─── Progress Bar ─── */}
        <div className="flex gap-1.5 mb-1">
          {taskProgress.map((tp, idx) => (
            <div
              key={tp.taskId}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                tp.status === 'complete'
                  ? 'bg-emerald-400'
                  : tp.status === 'current'
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-[#D4CFC6]'
              }`}
              aria-label={`Task ${idx + 1}: ${tp.status}`}
            />
          ))}
        </div>

        {/* ─── Current Task ─── */}
        {currentTask && TaskComponent && weekConfig && (
          <TaskCard
            taskId={currentTask.id}
            label={currentTask.label}
            status="idle"
          >
            <TaskComponent
              key={`${currentTask.id}-${taskResetKey}`}
              config={currentTask.config}
              weekConfig={weekConfig}
              onComplete={handleComplete}
            />
          </TaskCard>
        )}
      </div>

      {isW4 && <CaseQueueSidebar />}
    </div>
  );
}
