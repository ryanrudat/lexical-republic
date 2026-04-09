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
import TaskGateOverlay from './TaskGateOverlay';
import type { TaskProps, BridgingBriefing } from '../../types/shiftQueue';

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

  // Load messages on mount, then fire shift_start + initial task_start
  useEffect(() => {
    if (!weekConfig) return;
    messagesReadyRef.current = false;
    lastTriggeredTaskRef.current = null;
    loadMessages(weekNumber).then(() => {
      messagesReadyRef.current = true;
      triggerMessage('shift_start', { weekNumber }, weekConfig);
      // Emit full task list for teacher controls
      const sock = getSocket();
      if (sock?.connected) {
        sock.emit('student:shift-tasks', weekConfig.tasks.map(t => ({ id: t.id, label: t.label })));
      }
      // Also fire initial task_start
      const task = weekConfig.tasks[currentTaskIndex];
      if (task) {
        lastTriggeredTaskRef.current = task.id;
        triggerMessage('task_start', { taskId: task.id, weekNumber }, weekConfig);
        // Emit initial task to teacher's class monitor
        const sock = getSocket();
        if (sock?.connected) {
          sock.emit('student:task-update', { taskId: task.id, taskLabel: task.label });
        }
      }
    });
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

    await completeTask(currentTask.id, score, details);

    if (afterUrl) {
      // DELAY character message triggers until dismissal completes
      dismissalUrlRef.current = afterUrl;
      pendingTriggerRef.current = { taskId: completedTaskId, weekNumber };
      setDismissalState('flash');
    } else {
      // No dismissal video — fire messages immediately
      triggerMessage('task_complete', { taskId: completedTaskId, weekNumber }, weekConfig);
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
  }, [weekConfig, triggerMessage]);

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
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('student:task-update', { taskId: 'shift_complete', taskLabel: 'Shift Complete', failCount: 0 });
    }
    return <ShiftClosing />;
  }

  // Resolve current task component
  const TaskComponent = currentTask ? TASK_REGISTRY[currentTask.type] : null;

  // Video clip gate — full-screen "movie theater" overlay
  if (currentTask && watchingClip) {
    const { clipUrl, clipEmbed } = getTaskClip(currentTask.config);
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 45%, rgba(58, 82, 65, 0.35) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0, 180, 100, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 120% 80% at 50% 55%, rgba(90, 75, 50, 0.2) 0%, transparent 70%),
            #0a0a0a
          `,
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

  return (
    <div className="flex flex-col gap-4">
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
  );
}
