// DEV-ONLY: floating button that fires a remediation modal on demand so the
// new lane-aware study card can be previewed without grinding concern score.
// Gated at the App.tsx mount site by `import.meta.env.DEV` — never rendered
// in production builds. Safe to delete this whole file once preview is done.

import { useState } from 'react';
import { triggerRemediation } from '../../api/remediation';
import { useSessionStore } from '../../stores/sessionStore';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';

export default function RemediationDevTrigger() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const fire = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const weekNumber = useShiftQueueStore.getState().weekConfig?.weekNumber ?? 1;
    try {
      const res = await triggerRemediation(weekNumber, 'rate_warned');
      if (res.debounced) {
        setNote(`Debounced (${res.retryInSeconds ?? '?'}s left)`);
      } else if (res.noQuestionsAvailable) {
        setNote('No questions — dictionary lacks target words for this shift');
      } else if (
        res.moduleId &&
        res.questions &&
        res.weekNumber !== undefined &&
        res.triggerReason
      ) {
        useSessionStore.getState().setActiveRemediation({
          moduleId: res.moduleId,
          weekNumber: res.weekNumber,
          triggerReason: res.triggerReason,
          questions: res.questions,
        });
        useSessionStore.getState().setRemediationStage('modal-open');
      } else {
        setNote('Trigger returned no module — check backend logs');
      }
    } catch (err) {
      console.error('[DEV] Remediation trigger failed:', err);
      setNote('Failed — see console');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col items-end gap-1 pointer-events-auto">
      {note && (
        <span className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-mono shadow">
          {note}
        </span>
      )}
      <button
        onClick={fire}
        disabled={busy}
        className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-mono shadow-lg hover:bg-amber-700 active:scale-95 disabled:opacity-50"
        title="Dev only — fires a remediation modal immediately"
      >
        {busy ? 'Firing…' : 'DEV: Fire Remediation'}
      </button>
    </div>
  );
}
