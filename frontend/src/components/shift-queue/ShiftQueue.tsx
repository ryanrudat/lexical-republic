import { useEffect, useRef } from 'react';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import { useMessagingStore } from '../../stores/messagingStore';
import { useShiftStore } from '../../stores/shiftStore';
import { getSocket } from '../../utils/socket';
import TaskCard from './TaskCard';
import ShiftClosing from './ShiftClosing';
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
import type { TaskProps } from '../../types/shiftQueue';

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

export default function ShiftQueue() {
  const { weekConfig, taskProgress, currentTaskIndex, shiftComplete, loading, taskResetKey } =
    useShiftQueueStore();
  const { completeTask } = useShiftQueueStore();
  const { triggerMessage, loadMessages } = useMessagingStore();
  const currentWeek = useShiftStore(s => s.currentWeek);

  const weekNumber = currentWeek?.weekNumber ?? 0;
  const currentTask = weekConfig?.tasks[currentTaskIndex] ?? null;
  const messagesReadyRef = useRef(false);
  const lastTriggeredTaskRef = useRef<string | null>(null);

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
    await completeTask(currentTask.id, score, details);
    triggerMessage('task_complete', { taskId: currentTask.id, weekNumber }, weekConfig);
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
