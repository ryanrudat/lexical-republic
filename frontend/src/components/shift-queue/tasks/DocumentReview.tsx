import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import DocumentCard from './DocumentCard';
import ErrorCorrectionDoc from './ErrorCorrectionDoc';
import type { ErrorCorrectionResult } from './ErrorCorrectionDoc';
import ComprehensionDoc from './ComprehensionDoc';
import type { ComprehensionResult } from './ComprehensionDoc';


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
}

interface DocResultDetail {
  correctCount: number;
  itemTotal: number;
}

export default function DocumentReview({
  config,
  onComplete,
}: TaskProps) {
  const documents = (config.documents as DocumentConfig[]) ?? [];
  const lane = (config.lane as number) ?? 2;

  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [completedDocs] = useState<Set<string>>(() => new Set());
  const [docScores, setDocScores] = useState<Record<string, number>>({});
  const [docResults, setDocResults] = useState<Record<string, DocResultDetail>>({});
  const [stampStatus, setStampStatus] = useState<'idle' | 'stamping' | 'stamped'>('idle');
  const stampTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      for (const d of documents) {
        const r = docResults[d.id];
        if (r) {
          correctSum += r.correctCount;
          totalSum += r.itemTotal;
        } else if (d.type === 'approve') {
          // Approve-type docs are 1-of-1 pass/fail, always correct when reached
          correctSum += 1;
          totalSum += 1;
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
        // Gradebook teacher view reads these legacy keys — keep them.
        documentsProcessed: documents.length,
        errors: totalErrors,
      });
    }
  }, [currentDocIndex, completedDocs, docScores, docResults, documents, onComplete]);

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
        // After stamp shows, advance
        setTimeout(() => advanceToNext(), 600);
      }, 1200);
    },
    [completedDocs, advanceToNext],
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
