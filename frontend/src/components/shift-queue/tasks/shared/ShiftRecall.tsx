import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────

export interface RecallGroup {
  /** Sequence connector that models the prompt structure (First / Next / Finally). */
  connector: string;
  /** Short, basic notes of what the student did — NOT model sentences to copy. */
  items: string[];
}

export interface RecallConfig {
  title?: string;
  intro?: string;
  groups: RecallGroup[];
}

interface ShiftRecallProps {
  recall: RecallConfig;
}

// ─── Component ───────────────────────────────────────────────────

/**
 * "Look back at your shift" — a retrieval scaffold for the open-writing Shift
 * Report. Lists the basic things the student did this shift, in order, grouped
 * by sequence connector so they can see (and reuse) the first → next → final
 * spine the prompt asks them to narrate. Items are short notes, not full
 * sentences, so the student still has to produce the writing.
 */
export default function ShiftRecall({ recall }: ShiftRecallProps) {
  const [open, setOpen] = useState(true);

  const groups = recall.groups ?? [];
  if (groups.length === 0) return null;

  return (
    <div className="bg-sky-50/60 border border-sky-200 rounded-xl overflow-hidden">
      {/* Header — collapsible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 active:bg-sky-100/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <span className="font-ibm-mono text-[10px] text-sky-700 tracking-[0.2em] uppercase">
            {recall.title ?? 'Look back at your shift'}
          </span>
        </span>
        <span className="font-ibm-mono text-[10px] text-sky-500 tracking-wider">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {recall.intro && (
            <p className="text-xs text-sky-800/90 leading-relaxed">{recall.intro}</p>
          )}

          {groups.map((group, gi) => (
            <div key={gi} className="space-y-1.5">
              <p className="font-ibm-mono text-[10px] text-sky-600 tracking-[0.18em] uppercase">
                {group.connector}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item, ii) => (
                  <li key={ii} className="flex gap-2">
                    <span className="text-sky-400 select-none mt-[1px]">▸</span>
                    <p className="flex-1 text-sm text-[#2C3340] leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
