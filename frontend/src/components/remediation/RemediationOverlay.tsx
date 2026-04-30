import { useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useShiftQueueStore } from '../../stores/shiftQueueStore';
import {
  completeRemediation,
  fetchPendingRemediation,
  type RemediationResultEntry,
} from '../../api/remediation';
import RemediationModule from './RemediationModule';

/**
 * App-root mount for the Remediation Module modal.
 *
 * Subscribes to `useSessionStore.activeRemediation` and renders the modal when set.
 * On first mount, hydrates from the server via `fetchPendingRemediation()` so a
 * mid-modal page refresh restores the in-flight remediation. Foundation route
 * `GET /api/remediation/pending` is the source of truth.
 *
 * Race-condition handling (cf. Compliance Check `54ca0b0`):
 *  - cancellation token (`cancelled = true` in cleanup) so a slow fetch resolving
 *    after unmount cannot write stale data into the store
 *  - `expectedWeek` snapshot captured BEFORE the fetch and validated against the
 *    pending row's `weekNumber` after — if the student moved shifts mid-fetch,
 *    we ignore the stale row rather than render a prior-shift remediation
 */
export default function RemediationOverlay() {
  const activeRemediation = useSessionStore((s) => s.activeRemediation);
  const setActive = useSessionStore((s) => s.setActiveRemediation);
  const setStage = useSessionStore((s) => s.setRemediationStage);

  // Refresh-safe hydration: on mount, see if the server has a pending remediation for us.
  useEffect(() => {
    let cancelled = false;
    const expectedWeek = useShiftQueueStore.getState().weekConfig?.weekNumber ?? null;

    fetchPendingRemediation()
      .then((res) => {
        if (cancelled) return;
        if (!res.pending) return;
        // Drop the row if the student has since moved to a different shift.
        // Fail open if expectedWeek is null (no shift loaded yet — accept the row).
        if (expectedWeek !== null && res.pending.weekNumber !== expectedWeek) return;
        setActive({
          moduleId: res.pending.moduleId,
          weekNumber: res.pending.weekNumber,
          triggerReason: res.pending.triggerReason,
          questions: res.pending.questions,
        });
        setStage('modal-open');
      })
      .catch(() => {
        // ignore — student shouldn't be blocked if the network is down at boot
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!activeRemediation) return null;

  return (
    <RemediationModule
      moduleId={activeRemediation.moduleId}
      questions={activeRemediation.questions}
      onComplete={async (correct, results) => {
        // Prefer Unit 1's `closeRemediation` action when it lands.
        // Until then, fall back to the foundation API directly.
        const store = useSessionStore.getState() as unknown as {
          closeRemediation?: (
            correct: number,
            results: RemediationResultEntry[],
          ) => Promise<void>;
        };
        if (typeof store.closeRemediation === 'function') {
          try {
            await store.closeRemediation(correct, results);
            return;
          } catch {
            // fall through to direct path on store-action failure
          }
        }

        // Foundation fallback: complete on server, hydrate concern, clear modal.
        try {
          const { newConcernScore } = await completeRemediation(
            activeRemediation.moduleId,
            correct,
            results,
          );
          useSessionStore.getState().hydrateConcern(newConcernScore);
        } catch {
          // Even if the network call fails, we still need to dismiss the modal so
          // the student isn't permanently stuck. Concern score will reconcile on next refresh.
        }
        useSessionStore.getState().setActiveRemediation(null);
        useSessionStore.getState().setRemediationStage('cooling-down');
      }}
    />
  );
}
