import { useEffect, useMemo, useState } from 'react';
import {
  fetchShiftSlots,
  listComplianceTemplates,
  type ComplianceCheckTemplate,
  type ShiftSlotTask,
} from '../../../api/compliance-check';
import ComplianceCheckEditor, { type PlacementSlot } from './ComplianceCheckEditor';

interface Props {
  classId: string;
  weekNumber: number;
}

interface SlotRow {
  slot: PlacementSlot;
  template: ComplianceCheckTemplate | null;
}

export default function ComplianceCheckSlotList({ classId, weekNumber }: Props) {
  const [tasks, setTasks] = useState<ShiftSlotTask[]>([]);
  const [templates, setTemplates] = useState<ComplianceCheckTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ slot: PlacementSlot; existing: ComplianceCheckTemplate | null } | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    // Clear stale slot/template state immediately so a previous shift's
    // rows can't briefly render while the new shift's data loads.
    setTasks([]);
    setTemplates([]);
    try {
      const [slotsRes, tplRes] = await Promise.all([
        fetchShiftSlots(weekNumber),
        listComplianceTemplates(classId, weekNumber),
      ]);
      setTasks(slotsRes.tasks);
      // Defensive: only keep templates that match the current shift, even if
      // the API somehow returns extras.
      setTemplates(tplRes.templates.filter((t) => t.weekNumber === weekNumber));
    } catch {
      setError('Failed to load Compliance Checks for this shift.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, weekNumber]);

  const rows = useMemo<SlotRow[]>(() => {
    const findTpl = (
      placement: 'shift_start' | 'shift_end' | 'after_task',
      afterTaskId: string | null,
    ) =>
      templates.find(
        (t) =>
          t.weekNumber === weekNumber &&
          t.placement === placement &&
          (placement === 'after_task' ? t.afterTaskId === afterTaskId : true),
      ) ?? null;

    const out: SlotRow[] = [];
    out.push({
      slot: { kind: 'shift_start' },
      template: findTpl('shift_start', null),
    });
    for (const t of tasks) {
      out.push({
        slot: { kind: 'after_task', afterTaskId: t.id, afterTaskLabel: t.label },
        template: findTpl('after_task', t.id),
      });
    }
    out.push({
      slot: { kind: 'shift_end' },
      template: findTpl('shift_end', null),
    });
    return out;
  }, [tasks, templates, weekNumber]);

  const slotLabel = (slot: PlacementSlot): string => {
    if (slot.kind === 'shift_start') return 'Before shift starts';
    if (slot.kind === 'shift_end') return 'At shift end';
    return `Before ${slot.afterTaskLabel}`;
  };

  if (loading) {
    return <div className="text-xs text-slate-400 italic py-4">Loading Compliance Checks…</div>;
  }
  if (error) {
    return <div className="text-xs text-rose-600 py-4">{error}</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-cyan-600 tracking-[0.2em] uppercase">
            P.E.A.R.L. — Compliance Checks
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Screen-locking vocabulary verification at scheduled placement points.
          </p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map(({ slot, template }, idx) => {
          const slotKey =
            slot.kind === 'after_task' ? `after:${slot.afterTaskId}` : slot.kind;
          return (
            <div
              key={`${slotKey}-${idx}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-700">
                  {slotLabel(slot)}
                </div>
                {template ? (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    <span className="text-cyan-700 font-medium">
                      {template.title || 'Vocabulary Verification'}
                    </span>
                    {' · '}
                    {template.words.length} word{template.words.length === 1 ? '' : 's'}
                    {' · '}
                    {template.questionCount} Q{template.questionCount === 1 ? '' : 's'}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic mt-0.5">No check set</div>
                )}
              </div>
              {template ? (
                <button
                  onClick={() => setEditing({ slot, existing: template })}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => setEditing({ slot, existing: null })}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 transition-colors"
                >
                  + Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <ComplianceCheckEditor
          classId={classId}
          weekNumber={weekNumber}
          slot={editing.slot}
          existing={editing.existing}
          onSaved={() => void reload()}
          onDeleted={() => void reload()}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
