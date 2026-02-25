import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStudentStore } from '../../stores/studentStore';
import { usePearlStore } from '../../stores/pearlStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useBarkContext } from '../../hooks/useBarkContext';
import { submitForEvaluation } from '../../api/sessions';
import type { PhaseConfig, EvaluationResult } from '../../types/sessions';

interface D1Config {
  prompt?: string;
  minWords?: number;
  targetVocab?: string[];
  grammarTarget?: string;
  formHeader?: {
    department?: string;
    formTitle?: string;
    formSubtitle?: string;
  };
  sentenceFrames?: string[];
  vocabBank?: string[];
  ambientMessages?: string[];
}

interface D1Props {
  phaseConfig: PhaseConfig;
  onComplete: (data?: Record<string, unknown>) => void;
}

type Phase = 'writing' | 'submitting' | 'feedback' | 'complete';

export default function D1StructuredWriting({ phaseConfig, onComplete }: D1Props) {
  const user = useStudentStore(s => s.user);
  const triggerAIBark = usePearlStore(s => s.triggerAIBark);
  const triggerBark = usePearlStore(s => s.triggerBark);
  const currentWeek = useShiftStore(s => s.currentWeek);
  const baseContext = useBarkContext();

  const config = phaseConfig.config as D1Config;
  const prompt = config.prompt || 'Complete the intake form below.';
  const minWords = config.minWords || 30;
  const targetVocab = config.targetVocab || [];
  const minVocab = Math.max(1, Math.ceil(targetVocab.length * 0.3));
  const sentenceFrames = config.sentenceFrames || [];
  const vocabBank = config.vocabBank || [];
  const ambientMessages = config.ambientMessages || [];
  const formHeader = config.formHeader;
  const lane = user?.lane || 2;

  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const ambientTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Track which target vocab words are used
  const vocabUsed = useMemo(() => {
    const lower = text.toLowerCase();
    return targetVocab.filter(word => {
      const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return pattern.test(lower);
    });
  }, [text, targetVocab]);

  const canSubmit = wordCount >= minWords && vocabUsed.length >= minVocab;

  // Ambient PEARL messages every 3-4 minutes
  useEffect(() => {
    if (phase !== 'writing' || ambientMessages.length === 0) return;
    ambientTimerRef.current = setInterval(() => {
      const msg = ambientMessages[Math.floor(Math.random() * ambientMessages.length)];
      triggerBark('notice', msg);
    }, (180 + Math.random() * 60) * 1000);
    return () => {
      if (ambientTimerRef.current) clearInterval(ambientTimerRef.current);
    };
  }, [phase, ambientMessages, triggerBark]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setPhase('submitting');

    try {
      const result = await submitForEvaluation({
        weekNumber: currentWeek?.weekNumber || 1,
        phaseId: phaseConfig.id,
        activityType: 'd1_structured_writing',
        content: text,
        metadata: {
          grammarTarget: config.grammarTarget,
          targetVocab,
          missionId: phaseConfig.missionId,
          lane,
        },
      });
      setEvaluation(result);
      setPhase('feedback');

      // PEARL feedback bark
      if (result.pearlFeedback) {
        triggerBark('success', result.pearlFeedback);
      } else {
        triggerAIBark('success', {
          ...baseContext,
          customDetail: `Intake form submitted with ${wordCount} words, ${vocabUsed.length} target vocab used.`,
        });
      }
    } catch {
      // Fail-open: proceed to complete even if evaluation fails
      triggerBark('success', 'Your intake form has been received and filed.');
      setPhase('feedback');
      setEvaluation(null);
    }
  }, [canSubmit, text, currentWeek, phaseConfig, config.grammarTarget, targetVocab, lane, wordCount, vocabUsed.length, triggerBark, triggerAIBark, baseContext]);

  const handleFinish = useCallback(() => {
    setPhase('complete');
    onComplete({
      score: evaluation?.taskScore ?? 1,
      text,
      wordCount,
      vocabUsed,
      evaluation,
    });
  }, [onComplete, evaluation, text, wordCount, vocabUsed]);

  return (
    <div className="space-y-5">
      {/* Ministry form header */}
      {formHeader && (
        <div className="ios-glass-card p-4 border-neon-cyan/20">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
              {formHeader.department || 'DEPARTMENT OF CLARITY'}
            </span>
            <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
              {user?.designation || 'CA-7'}
            </span>
          </div>
          <h2 className="font-special-elite text-base text-white/90 tracking-wider text-center">
            {formHeader.formTitle || 'INTAKE FORM'}
          </h2>
          {formHeader.formSubtitle && (
            <p className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-wider text-center mt-1">
              {formHeader.formSubtitle}
            </p>
          )}
        </div>
      )}

      {/* Prompt */}
      <div className="ios-glass-card border-neon-cyan/20 p-4">
        <p className="font-ibm-sans text-sm text-white/90 leading-relaxed">
          {prompt}
        </p>
      </div>

      {/* Lane-differentiated support */}
      {lane === 1 && sentenceFrames.length > 0 && (
        <div className="ios-glass-card p-3 border-neon-mint/20">
          <p className="font-ibm-mono text-[10px] text-neon-mint/70 tracking-wider mb-2">
            SENTENCE FRAMES — Use these to help structure your writing:
          </p>
          <div className="space-y-1.5">
            {sentenceFrames.map((frame, i) => (
              <p key={i} className="font-ibm-mono text-xs text-white/60 italic pl-2 border-l border-neon-mint/20">
                {frame}
              </p>
            ))}
          </div>
        </div>
      )}

      {(lane <= 2 && vocabBank.length > 0) && (
        <div className="ios-glass-card p-3 border-neon-cyan/20">
          <p className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-wider mb-2">
            VOCABULARY BANK — Include these words in your writing:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vocabBank.map((word) => {
              const used = vocabUsed.includes(word.toLowerCase()) ||
                vocabUsed.some(v => v.toLowerCase() === word.toLowerCase());
              return (
                <span
                  key={word}
                  className={`ios-glass-pill px-2.5 py-1 font-ibm-mono text-xs tracking-wider transition-all ${
                    used
                      ? 'text-neon-mint border-neon-mint/40 bg-neon-mint/10'
                      : 'text-neon-cyan/70 border-neon-cyan/20'
                  }`}
                >
                  {word} {used && '✓'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Writing phase */}
      {phase === 'writing' && (
        <>
          <div className="ios-glass-card p-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Begin writing here..."
              className="ios-glass-input w-full h-44 border-none bg-transparent text-sm leading-relaxed resize-none font-ibm-sans text-white/90"
            />
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className={`font-ibm-mono text-xs tracking-wider ${
                wordCount >= minWords ? 'text-neon-mint' : 'text-white/40'
              }`}>
                {wordCount} / {minWords} words {wordCount >= minWords ? '✓' : ''}
              </span>
              <span className={`font-ibm-mono text-xs tracking-wider ${
                vocabUsed.length >= minVocab ? 'text-neon-mint' : 'text-white/40'
              }`}>
                {vocabUsed.length} / {minVocab} vocab {vocabUsed.length >= minVocab ? '✓' : ''}
              </span>
            </div>
          </div>

          {/* Target vocab tracker (all lanes) */}
          {targetVocab.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {targetVocab.map(word => {
                const used = vocabUsed.some(v => v.toLowerCase() === word.toLowerCase());
                return (
                  <span
                    key={word}
                    className={`px-2 py-0.5 rounded-full font-ibm-mono text-[10px] tracking-wider transition-all ${
                      used
                        ? 'bg-neon-mint/15 text-neon-mint border border-neon-mint/30'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
              canSubmit
                ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                : 'ios-glass-pill text-white/25 cursor-not-allowed'
            }`}
          >
            Submit for Processing
          </button>
        </>
      )}

      {/* Submitting phase */}
      {phase === 'submitting' && (
        <div className="ios-glass-card p-8 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 mx-auto border-2 border-neon-cyan/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <p className="font-ibm-mono text-xs text-neon-cyan tracking-[0.3em] uppercase animate-pulse">
            P.E.A.R.L. is reviewing...
          </p>
          <p className="font-ibm-mono text-[10px] text-white/30 tracking-wider mt-2">
            Intake form submitted for compliance review
          </p>
        </div>
      )}

      {/* Feedback phase */}
      {phase === 'feedback' && (
        <div className="space-y-4">
          {/* APPROVED stamp */}
          <div className="ios-glass-card p-6 text-center border-neon-mint/30">
            <div className="inline-block border-2 border-neon-mint/60 rounded-lg px-6 py-2 mb-3 rotate-[-2deg]">
              <span className="font-special-elite text-xl text-neon-mint tracking-[0.3em] ios-text-glow-mint">
                APPROVED
              </span>
            </div>
            {evaluation?.pearlFeedback && (
              <p className="font-ibm-mono text-xs text-white/70 tracking-wider leading-relaxed mt-3">
                {evaluation.pearlFeedback}
              </p>
            )}
          </div>

          {/* Vocab results */}
          {evaluation && (
            <div className="ios-glass-card p-4">
              <p className="font-ibm-mono text-[10px] text-white/40 tracking-wider mb-2">
                VOCABULARY COMPLIANCE
              </p>
              <div className="flex flex-wrap gap-1.5">
                {targetVocab.map(word => {
                  const used = evaluation.vocabUsed.some(v => v.toLowerCase() === word.toLowerCase());
                  return (
                    <span
                      key={word}
                      className={`px-2 py-0.5 rounded-full font-ibm-mono text-[10px] tracking-wider ${
                        used
                          ? 'bg-neon-mint/15 text-neon-mint'
                          : 'bg-neon-pink/10 text-neon-pink/60'
                      }`}
                    >
                      {word} {used ? '✓' : '✗'}
                    </span>
                  );
                })}
              </div>
              <p className="font-ibm-mono text-[10px] text-white/50 tracking-wider mt-2">
                {evaluation.vocabUsed.length} of {targetVocab.length} target terms detected.
              </p>
            </div>
          )}

          <button
            onClick={handleFinish}
            className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {/* Complete phase */}
      {phase === 'complete' && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint py-8">
          FILED
        </div>
      )}
    </div>
  );
}
