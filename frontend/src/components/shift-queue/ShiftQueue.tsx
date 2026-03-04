import { useEffect } from 'react';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import { useMessagingStore } from '../../stores/messagingStore';
import { useShiftStore } from '../../stores/shiftStore';
import TaskCard from './TaskCard';
import ShiftClosing from './ShiftClosing';
import IntakeForm from './tasks/IntakeForm';
import VocabClearance from './tasks/VocabClearance';
import DocumentReview from './tasks/DocumentReview';
import ContradictionReport from './tasks/ContradictionReport';
import PriorityBriefing from './tasks/PriorityBriefing';
import PrioritySort from './tasks/PrioritySort';
import ShiftReport from './tasks/ShiftReport';
import type { TaskProps } from '../../types/shiftQueue';

const TASK_REGISTRY: Record<string, React.ComponentType<TaskProps>> = {
  intake_form: IntakeForm,
  vocab_clearance: VocabClearance,
  document_review: DocumentReview,
  shift_report: ShiftReport,
  contradiction_report: ContradictionReport,
  priority_briefing: PriorityBriefing,
  priority_sort: PrioritySort,
};

export default function ShiftQueue() {
  const { weekConfig, taskProgress, currentTaskIndex, shiftComplete, loading } =
    useShiftQueueStore();
  const { completeTask } = useShiftQueueStore();
  const { triggerMessage, loadMessages } = useMessagingStore();
  const currentWeek = useShiftStore(s => s.currentWeek);

  const weekNumber = currentWeek?.weekNumber ?? 0;
  const currentTask = weekConfig?.tasks[currentTaskIndex] ?? null;

  // Fire shift_start on mount and load messages
  useEffect(() => {
    if (!weekConfig) return;
    triggerMessage('shift_start', { weekNumber }, weekConfig);
    loadMessages(weekNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekConfig?.weekNumber]);

  // Fire task_start when current task changes
  useEffect(() => {
    if (!currentTask || !weekConfig) return;
    triggerMessage('task_start', { taskId: currentTask.id, weekNumber }, weekConfig);
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
        <div className="font-ibm-mono text-neon-cyan text-xs animate-pulse tracking-[0.2em]">
          LOADING MODULE...
        </div>
      </div>
    );
  }

  // Shift complete
  if (shiftComplete) {
    return <ShiftClosing />;
  }

  // Resolve current task component
  const TaskComponent = currentTask ? TASK_REGISTRY[currentTask.type] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Progress Bar ─── */}
      <div className="flex gap-1.5 px-1">
        {taskProgress.map((tp, idx) => (
          <div
            key={tp.taskId}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              tp.status === 'complete'
                ? 'bg-neon-mint'
                : tp.status === 'current'
                  ? 'bg-neon-cyan stamp-glow-pulse'
                  : 'bg-white/10'
            }`}
            aria-label={`Task ${idx + 1}: ${tp.status}`}
          />
        ))}
      </div>

      {/* ─── Location Label ─── */}
      {currentTask && (
        <div className="px-1">
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-[0.3em] uppercase">
            {currentTask.location}
          </span>
        </div>
      )}

      {/* ─── Current Task ─── */}
      {currentTask && TaskComponent && weekConfig && (
        <TaskCard
          taskId={currentTask.id}
          label={currentTask.label}
          status="idle"
        >
          <TaskComponent
            config={currentTask.config}
            weekConfig={weekConfig}
            onComplete={handleComplete}
          />
        </TaskCard>
      )}
    </div>
  );
}
