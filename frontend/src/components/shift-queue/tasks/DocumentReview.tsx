import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';
import DocumentCard from './DocumentCard';
import ErrorCorrectionDoc from './ErrorCorrectionDoc';
import type { ErrorCorrectionResult } from './ErrorCorrectionDoc';
import ComprehensionDoc from './ComprehensionDoc';
import type { ComprehensionResult } from './ComprehensionDoc';
import { postNarrativeChoice } from '../../../api/narrative-choices';


interface MidTaskChoiceOption {
  text: string;
  value: string;
  responseText?: string;
}

interface MidTaskChoice {
  id: string;
  title: string;
  message: string;
  options: MidTaskChoiceOption[];
}

interface DocumentConfig {
  id: string;
  type: 'approve' | 'error_correction' | 'comprehension';
  title: string;
  department?: string;
  classification?: string;
  priority?: string;
  from?: string;
  to?: string;
  re?: string;
  body: string;
  reviewedBy?: string;
  // error_correction fields
  errors?: Array<{
    sentenceIndex: number;
    errorWord: string;
    options: Array<{ text: string; isCorrect?: boolean }>;
    correctIndex: number;
    explanation?: string;
  }>;
  laneHints?: Record<string, string[]>;
  // comprehension fields
  questions?: Array<{
    text?: string;
    question?: string;
    options: string[];
    correctIndex: number;
  }>;
  // Mid-task C choice — fires after this doc completes, before advance
  midTaskChoice?: MidTaskChoice;
}

interface DocResultDetail {
  correctCount: number;
  itemTotal: number;
  answerLog?: TaskAnswerLogEntry[];
}

export default function DocumentReview({
  config,
  weekConfig,
  onComplete,
}: TaskProps) {
  const documents = (config.documents as DocumentConfig[]) ?? [];
  const lane = (config.lane as number) ?? 2;
  const weekNumber = weekConfig.weekNumber;

  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [completedDocs] = useState<Set<string>>(() => new Set());
  const [docScores, setDocScores] = useState<Record<string, number>>({});
  const [docResults, setDocResults] = useState<Record<string, DocResultDetail>>({});
  const [stampStatus, setStampStatus] = useState<'idle' | 'stamping' | 'stamped'>('idle');
  const stampTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mid-task C choice state (fires between stamp and advance if the just-
  // completed doc has a `midTaskChoice` config). Non-skippable.
  const [activeMidTaskChoice, setActiveMidTaskChoice] = useState<MidTaskChoice | null>(null);
  const [midTaskChoicePicked, setMidTaskChoicePicked] = useState<MidTaskChoiceOption | null>(null);
  const [midTaskChoiceSubmitting, setMidTaskChoiceSubmitting] = useState(false);
  const resolvedChoicesRef = useRef<Set<string>>(new Set());

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (stampTimerRef.current) clearTimeout(stampTimerRef.current);
    };
  }, []);

  const currentDoc = documents[currentDocIndex] as DocumentConfig | undefined;
  const remainingCount = documents.length - completedDocs.size;

  const advanceToNext = useCallback(() => {
    const nextIndex = documents.findIndex(
      (d, idx) => idx > currentDocIndex && !completedDocs.has(d.id),
    );

    if (nextIndex >= 0) {
      setCurrentDocIndex(nextIndex);
      setStampStatus('idle');
    } else {
      // All documents processed
      const scores = Object.values(docScores);
      const avgScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 1;

      // Aggregate corrected-item counts across every document in this task
      let correctSum = 0;
      let totalSum = 0;
      const mergedAnswerLog: TaskAnswerLogEntry[] = [];
      for (const d of documents) {
        const r = docResults[d.id];
        if (r) {
          correctSum += r.correctCount;
          totalSum += r.itemTotal;
          if (r.answerLog) {
            // Namespace questionIds by doc so later UIs can tell them apart.
            for (const entry of r.answerLog) {
              mergedAnswerLog.push({
                ...entry,
                questionId: `${d.id}:${entry.questionId}`,
              });
            }
          }
        } else if (d.type === 'approve') {
          // Approve-type docs are 1-of-1 pass/fail, always correct when reached
          correctSum += 1;
          totalSum += 1;
          mergedAnswerLog.push({
            questionId: `${d.id}:approve`,
            prompt: `Approve: ${d.title}`,
            chosen: 'APPROVED',
            correct: 'APPROVED',
            wasCorrect: true,
            attempts: 1,
          });
        }
      }

      const totalErrors = documents.reduce((sum, d) => sum + (d.errors?.length ?? 0), 0);
      onComplete(avgScore, {
        taskType: 'document_review',
        itemsCorrect: correctSum,
        itemsTotal: totalSum,
        // Document Review is primarily grammar error correction + comprehension
        category: 'grammar',
        errorsFound: correctSum,
        errorsTotal: totalSum,
        answerLog: mergedAnswerLog,
        // Gradebook teacher view reads these legacy keys — keep them.
        documentsProcessed: documents.length,
        errors: totalErrors,
      });
    }
  }, [currentDocIndex, completedDocs, docScores, docResults, documents, onComplete]);

  /**
   * Check whether the just-completed doc has a mid-task C choice. If so,
   * show the overlay instead of advancing. Otherwise advance normally.
   */
  const checkChoiceOrAdvance = useCallback(() => {
    const completedDoc = documents[currentDocIndex];
    const choice = completedDoc?.midTaskChoice;
    if (choice && !resolvedChoicesRef.current.has(choice.id)) {
      setActiveMidTaskChoice(choice);
      return;
    }
    advanceToNext();
  }, [currentDocIndex, documents, advanceToNext]);

  const handleMidTaskChoicePick = useCallback(
    async (option: MidTaskChoiceOption) => {
      if (!activeMidTaskChoice || midTaskChoicePicked) return;
      setMidTaskChoicePicked(option);
      setMidTaskChoiceSubmitting(true);
      try {
        await postNarrativeChoice({
          choiceKey: activeMidTaskChoice.id,
          value: option.value,
          weekNumber,
          context: {
            momentType: 'doc_review_choice',
            docReviewTask: true,
            optionText: option.text,
          },
        });
      } catch (err) {
        // Fail-open — network errors should not block progression.
        console.error('Failed to save mid-task choice:', err);
      } finally {
        setMidTaskChoiceSubmitting(false);
      }
    },
    [activeMidTaskChoice, midTaskChoicePicked, weekNumber],
  );

  const handleMidTaskChoiceContinue = useCallback(() => {
    if (activeMidTaskChoice) {
      resolvedChoicesRef.current.add(activeMidTaskChoice.id);
    }
    setActiveMidTaskChoice(null);
    setMidTaskChoicePicked(null);
    advanceToNext();
  }, [activeMidTaskChoice, advanceToNext]);

  const markDocComplete = useCallback(
    (docId: string, score: number, result?: DocResultDetail) => {
      completedDocs.add(docId);
      setDocScores(prev => ({ ...prev, [docId]: score }));
      if (result) {
        setDocResults(prev => ({ ...prev, [docId]: result }));
      }

      // Trigger stamp animation
      setStampStatus('stamping');
      stampTimerRef.current = setTimeout(() => {
        setStampStatus('stamped');
        // After stamp shows, check for mid-task choice or advance
        setTimeout(() => checkChoiceOrAdvance(), 600);
      }, 1200);
    },
    [completedDocs, checkChoiceOrAdvance],
  );

  // Handle approve-type document
  const handleApprove = useCallback(() => {
    if (!currentDoc || stampStatus !== 'idle') return;
    markDocComplete(currentDoc.id, 1, { correctCount: 1, itemTotal: 1 });
  }, [currentDoc, stampStatus, markDocComplete]);

  // Handle error correction completion
  const handleErrorComplete = useCallback(
    (score: number, result: ErrorCorrectionResult) => {
      if (!currentDoc) return;
      markDocComplete(currentDoc.id, score, {
        correctCount: result.correctCount,
        itemTotal: result.totalErrors,
        answerLog: result.answerLog,
      });
    },
    [currentDoc, markDocComplete],
  );

  // Handle comprehension completion
  const handleComprehensionComplete = useCallback(
    (score: number, result: ComprehensionResult) => {
      if (!currentDoc) return;
      markDocComplete(currentDoc.id, score, {
        correctCount: result.correctCount,
        itemTotal: result.totalQuestions,
        answerLog: result.answerLog,
      });
    },
    [currentDoc, markDocComplete],
  );

  if (!currentDoc) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="font-ibm-mono text-xs text-[#B8B3AA] tracking-wider">
          No documents in queue
        </span>
      </div>
    );
  }

  // Mid-task C choice — non-skippable overlay that replaces the doc view.
  // Fires between stamp and advance when the completed doc has a midTaskChoice.
  if (activeMidTaskChoice) {
    return (
      <div className="flex flex-col gap-4 max-w-xl mx-auto w-full animate-fade-in">
        <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="font-ibm-mono text-[10px] text-amber-700 tracking-widest uppercase">
              P.E.A.R.L. — Archive Control
            </p>
          </div>
          <h3 className="font-special-elite text-base text-amber-800 tracking-wider mb-3">
            {activeMidTaskChoice.title}
          </h3>
          <p className="text-sm text-[#2C3340] leading-relaxed mb-4">
            {activeMidTaskChoice.message}
          </p>

          {midTaskChoicePicked === null ? (
            <div className="space-y-2 pt-2">
              {activeMidTaskChoice.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMidTaskChoicePick(option)}
                  disabled={midTaskChoiceSubmitting}
                  className="w-full text-left bg-[#FAFAF7] border border-[#E8E4DC] hover:border-amber-300 hover:bg-amber-50 rounded-xl p-3.5 transition-colors active:scale-[0.99] disabled:opacity-50"
                >
                  <p className="text-sm text-[#4B5563] leading-relaxed font-medium">
                    {option.text}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2">
                <p className="font-ibm-mono text-[9px] text-amber-700 tracking-wider uppercase mb-1.5">
                  Selection Logged
                </p>
                <p className="text-sm text-[#4B5563] leading-relaxed italic">
                  &ldquo;{midTaskChoicePicked.text}&rdquo;
                </p>
              </div>

              {midTaskChoicePicked.responseText && (
                <div className="bg-white border border-[#D4CFC6] rounded-xl p-3.5 mt-3 animate-fade-in">
                  <p className="text-sm text-[#2C3340] leading-relaxed">
                    {midTaskChoicePicked.responseText}
                  </p>
                </div>
              )}

              <div className="pt-3 text-center animate-fade-in">
                <button
                  onClick={handleMidTaskChoiceContinue}
                  disabled={midTaskChoiceSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Queue counter */}
      <div className="flex items-center justify-between px-1">
        <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase">
          Document {currentDocIndex + 1} of {documents.length}
        </span>
        <span className="font-ibm-mono text-sm text-sky-600 tracking-wider">
          Queue: {String(remainingCount).padStart(3, '0')}
        </span>
      </div>

      {/* Current document */}
      <div className="relative">
        {currentDoc.type === 'approve' && (
          <div className="flex flex-col gap-3">
            <DocumentCard
              title={currentDoc.title}
              department={currentDoc.department}
              classification={currentDoc.classification}
              priority={currentDoc.priority}
              from={currentDoc.from}
              to={currentDoc.to}
              re={currentDoc.re}
              body={currentDoc.body}
              reviewedBy={currentDoc.reviewedBy}
            >
              <button
                className={`w-full px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-[0.2em] uppercase transition-opacity duration-300 hover:bg-sky-700 ${
                  stampStatus !== 'idle'
                    ? 'opacity-30 cursor-not-allowed'
                    : 'opacity-100 cursor-pointer'
                }`}
                onClick={handleApprove}
                disabled={stampStatus !== 'idle'}
              >
                Approve Document
              </button>
            </DocumentCard>
          </div>
        )}

        {currentDoc.type === 'error_correction' && currentDoc.errors && (
          <ErrorCorrectionDoc
            doc={{
              title: currentDoc.title,
              department: currentDoc.department,
              classification: currentDoc.classification,
              priority: currentDoc.priority,
              from: currentDoc.from,
              to: currentDoc.to,
              re: currentDoc.re,
              body: currentDoc.body,
              reviewedBy: currentDoc.reviewedBy,
              errors: currentDoc.errors,
              laneHints: currentDoc.laneHints,
            }}
            lane={lane}
            onComplete={handleErrorComplete}
          />
        )}

        {currentDoc.type === 'comprehension' && currentDoc.questions && (
          <ComprehensionDoc
            doc={{
              title: currentDoc.title,
              department: currentDoc.department,
              classification: currentDoc.classification,
              priority: currentDoc.priority,
              from: currentDoc.from,
              to: currentDoc.to,
              re: currentDoc.re,
              body: currentDoc.body,
              reviewedBy: currentDoc.reviewedBy,
              questions: currentDoc.questions,
            }}
            onComplete={handleComprehensionComplete}
          />
        )}

        {/* Stamp overlay */}
        {stampStatus === 'stamping' && (
          <div className="stamp-watermark">PROCESSED</div>
        )}
      </div>
    </div>
  );
}
