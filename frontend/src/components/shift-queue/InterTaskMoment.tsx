import { useEffect, useMemo, useState } from 'react';
import type { InterTaskMomentConfig, InterTaskMomentReply } from '../../types/shiftQueue';
import { postNarrativeChoice } from '../../api/narrative-choices';

interface InterTaskMomentProps {
  moment: InterTaskMomentConfig;
  weekNumber: number;
  onComplete: () => void;
}

/**
 * Non-skippable inter-task moment — renders a character choice-point (B)
 * or an ambient glitch beat. Lives in the terminal flow between tasks.
 *
 * Unlike toasts and Harmony posts, there is no dismiss/skip button for
 * character-type moments: the student must pick a reply to continue.
 * Ambient moments auto-timer to a Continue button after durationMs.
 */
export default function InterTaskMoment({
  moment,
  weekNumber,
  onComplete,
}: InterTaskMomentProps) {
  const [selectedReplyIdx, setSelectedReplyIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ambientReady, setAmbientReady] = useState(false);

  const isAmbient = moment.type === 'ambient';
  const durationMs = moment.durationMs ?? 2000;

  // Ambient timer — Continue button appears after durationMs
  useEffect(() => {
    if (!isAmbient) return;
    const t = setTimeout(() => setAmbientReady(true), durationMs);
    return () => clearTimeout(t);
  }, [isAmbient, durationMs]);

  const selectedReply: InterTaskMomentReply | null = useMemo(() => {
    if (selectedReplyIdx === null || !moment.replies) return null;
    return moment.replies[selectedReplyIdx] ?? null;
  }, [selectedReplyIdx, moment.replies]);

  const handleReply = async (idx: number) => {
    if (submitting || selectedReplyIdx !== null) return;
    const reply = moment.replies?.[idx];
    if (!reply) return;

    setSelectedReplyIdx(idx);
    setSubmitting(true);

    try {
      await postNarrativeChoice({
        choiceKey: moment.id,
        value: reply.value,
        weekNumber,
        context: {
          momentType: 'inter_task',
          characterName: moment.characterName,
          replyText: reply.text,
        },
      });
    } catch (err) {
      // Fail-open — the mechanic should not block task flow on network errors.
      console.error('Failed to save narrative choice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    onComplete();
  };

  // ─── Ambient variant (no-choice glitch beat) ───────────────────
  if (isAmbient) {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-8 animate-fade-in">
          <div className="text-center">
            <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-widest uppercase mb-4">
              System Anomaly
            </p>
            <div className="font-ibm-mono text-2xl text-rose-600 font-bold tracking-[0.3em] animate-pulse">
              {moment.glitchText ?? '...'}
            </div>
          </div>

          {ambientReady && (
            <button
              onClick={handleContinue}
              className="animate-fade-in px-6 py-2.5 rounded-xl border border-[#D4CFC6] bg-white text-xs font-medium tracking-wider text-[#6B7280] hover:text-[#2C3340] hover:border-sky-300 transition-colors active:scale-[0.98]"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Character variant (choice required) ──────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-4">
      {/* Header */}
      <div className="text-center py-2">
        <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-widest uppercase">
          Incoming Message
        </p>
      </div>

      {/* Character card — message bubble */}
      <div className="bg-white border border-[#D4CFC6] rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
            {moment.characterName ?? 'Anonymous'}
            {moment.designation ? ` · ${moment.designation}` : ''}
          </p>
        </div>
        <p className="text-sm text-[#2C3340] leading-relaxed">
          {moment.messageText ?? ''}
        </p>
      </div>

      {/* Replies */}
      {selectedReplyIdx === null ? (
        <div className="space-y-2">
          <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-widest uppercase text-center pt-2">
            Select a reply
          </p>
          {moment.replies?.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleReply(idx)}
              disabled={submitting}
              className="w-full text-left bg-[#FAFAF7] border border-[#E8E4DC] hover:border-sky-300 hover:bg-white rounded-xl p-4 transition-colors active:scale-[0.99] disabled:opacity-50"
            >
              <p className="text-sm text-[#4B5563] leading-relaxed">{reply.text}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Chosen reply echo */}
          <div className="bg-[#FAFAF7] border border-sky-200 rounded-xl p-4">
            <p className="font-ibm-mono text-[9px] text-sky-500 tracking-wider uppercase mb-2">
              You replied
            </p>
            <p className="text-sm text-[#4B5563] leading-relaxed italic">
              &ldquo;{moment.replies?.[selectedReplyIdx]?.text}&rdquo;
            </p>
          </div>

          {/* Character response (if present) */}
          {selectedReply?.responseText && (
            <div className="bg-white border border-[#D4CFC6] rounded-xl p-4 animate-fade-in">
              <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase mb-2">
                {moment.characterName}
              </p>
              <p className="text-sm text-[#2C3340] leading-relaxed">
                {selectedReply.responseText}
              </p>
            </div>
          )}

          {/* Continue */}
          <div className="pt-2 text-center animate-fade-in">
            <button
              onClick={handleContinue}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}
