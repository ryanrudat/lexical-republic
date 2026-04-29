import { useState, useCallback, useEffect, useMemo } from 'react';
import type { TaskProps } from '../../../types/shiftQueue';
import type { TaskAnswerLogEntry } from '../../../types/taskResult';
import { useShiftQueueStore } from '../../../stores/shiftQueueStore';
import { useStudentStore } from '../../../stores/studentStore';
import TargetWordHighlighter from './shared/TargetWordHighlighter';
import WritingEvaluator from './shared/WritingEvaluator';
import type { EvalResult } from './shared/WritingEvaluator';

// ─── Types ───────────────────────────────────────────────────────

type ColumnName = 'URGENT' | 'ROUTINE' | 'HOLD';

interface CaseConfig {
  caseId: string;
  title: string;
  description: string;
  correctColumn: ColumnName;
  disappears?: boolean;
  disappearBark?: string;
}

// Sort-phase substages. Cascade is the centerpiece of W3 — cases arrive
// one at a time so each classification is a deliberate decision moment.
type SortStage = 'training' | 'cascade' | 'verifying' | 'verified';

// Per-folder visual config. Colors mirror the briefing video exactly:
// pink = URGENT, tan/amber = ROUTINE, blue = HOLD. (Pre-redesign code
// had ROUTINE=sky and HOLD=amber — swapped to match the video here.)
const COLOR_CONFIG: Record<ColumnName, {
  body: string;
  bodyHover: string;
  tab: string;
  ring: string;
  text: string;
  ringSelected: string;
  pillBorder: string;
  pillBg: string;
}> = {
  URGENT: {
    body: 'bg-rose-200',
    bodyHover: 'group-hover:bg-rose-300',
    tab: 'bg-rose-300',
    ring: 'hover:ring-rose-400/60',
    text: 'text-rose-700',
    ringSelected: 'ring-rose-400',
    pillBorder: 'border-rose-300',
    pillBg: 'bg-rose-50',
  },
  ROUTINE: {
    body: 'bg-amber-200',
    bodyHover: 'group-hover:bg-amber-300',
    tab: 'bg-amber-300',
    ring: 'hover:ring-amber-400/60',
    text: 'text-amber-700',
    ringSelected: 'ring-amber-400',
    pillBorder: 'border-amber-300',
    pillBg: 'bg-amber-50',
  },
  HOLD: {
    body: 'bg-sky-200',
    bodyHover: 'group-hover:bg-sky-300',
    tab: 'bg-sky-300',
    ring: 'hover:ring-sky-400/60',
    text: 'text-sky-700',
    ringSelected: 'ring-sky-400',
    pillBorder: 'border-sky-300',
    pillBg: 'bg-sky-50',
  },
};

const COLUMNS: ColumnName[] = ['URGENT', 'ROUTINE', 'HOLD'];

// Cascade timing — clicked-folder → next-case-arrives.
// Departure 450ms (case shrinks into folder) + receive bounce 320ms,
// overlapping. Total ~700ms before the next case slide-in fires.
const DEPART_MS = 450;
const PAUSE_BEFORE_NEXT_CASE_MS = 700;

// ─── Component ───────────────────────────────────────────────────

export default function PrioritySort({ config, weekConfig, onComplete }: TaskProps) {
  // Fisher-Yates shuffle on mount so each shift attempt presents cases in a
  // different order — prevents pattern-memorisation across class peers and
  // across re-attempts. Correctness data (correctColumn, disappears) is on
  // each case object, so order is purely presentational and doesn't affect
  // scoring or the disappearing-case narrative beat (case 5 still vanishes
  // wherever it lands in the queue). useMemo keeps the order stable across
  // re-renders within a single mount.
  const cases = useMemo(() => {
    const raw = (config.cases ?? []) as CaseConfig[];
    const shuffled = [...raw];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [config.cases]);
  const modalPrompt = (config.modalPrompt as string) ?? 'Explain why this case received its priority level.';

  const addConcern = useShiftQueueStore(s => s.addConcern);
  const user = useStudentStore(s => s.user);
  const lane = user?.lane ?? 2;

  const [columns, setColumns] = useState<Record<ColumnName, string[]>>({
    URGENT: [],
    ROUTINE: [],
    HOLD: [],
  });
  const [phase, setPhase] = useState<'sort' | 'justify' | 'done'>('sort');
  const [sortStage, setSortStage] = useState<SortStage>('training');
  const [currentCascadeIdx, setCurrentCascadeIdx] = useState(0);
  // The case mid-flight to a folder — drives the depart animation.
  const [departingCase, setDepartingCase] = useState<{ caseId: string; column: ColumnName } | null>(null);
  // Folder bounce trigger — keyed by column, increments to retrigger animation.
  const [folderPulseKey, setFolderPulseKey] = useState<Record<ColumnName, number>>({
    URGENT: 0,
    ROUTINE: 0,
    HOLD: 0,
  });
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [currentJustifyIdx, setCurrentJustifyIdx] = useState(0);
  const [disappearedCases, setDisappearedCases] = useState<Set<string>>(new Set());
  const [sortResults, setSortResults] = useState<Record<string, boolean>>({});
  const [disappearBarkText, setDisappearBarkText] = useState<string | null>(null);
  const [writingPassed, setWritingPassed] = useState(false);

  const currentCascadeCase = cases[currentCascadeIdx];
  const allCasesClassified = currentCascadeIdx >= cases.length;

  // ── Auto-verify after the last case is classified ──────────────
  // Triggered by the cascade reaching the end. Brief "verifying..." beat
  // before flipping to the verified results panel — gives the cascade a
  // visible closure moment instead of snapping to results.
  useEffect(() => {
    if (sortStage !== 'cascade' || !allCasesClassified) return;
    const t1 = setTimeout(() => setSortStage('verifying'), 400);
    const t2 = setTimeout(() => {
      runVerification();
      setSortStage('verified');
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // runVerification is intentionally omitted — it depends on `columns`
    // which we want at-trigger-time, not via stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortStage, allCasesClassified]);

  // ── Disappearing-case handler (W3 narrative beat) ──────────────
  // After verified, run the dystopian "case 5 reassigned to Wellness"
  // moment — chip glitches out, PEARL bark slides in, then justify phase.
  useEffect(() => {
    if (sortStage !== 'verified') return;

    const disappearing = cases.filter(c => c.disappears);
    if (disappearing.length === 0) {
      const t = setTimeout(() => setPhase('justify'), 1800);
      return () => clearTimeout(t);
    }

    const t1 = setTimeout(() => {
      const disappeared = new Set<string>();
      for (const c of disappearing) {
        disappeared.add(c.caseId);
        if (c.disappearBark) setDisappearBarkText(c.disappearBark);
      }
      setDisappearedCases(disappeared);
    }, 1200);

    const t2 = setTimeout(() => {
      setDisappearBarkText(null);
      setPhase('justify');
    }, 5400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [sortStage, cases]);

  // ── Sort phase handlers ────────────────────────────────────────

  function runVerification() {
    const results: Record<string, boolean> = {};
    let wrongCount = 0;
    for (const c of cases) {
      const assigned = COLUMNS.find(col => columns[col].includes(c.caseId));
      const correct = assigned === c.correctColumn;
      results[c.caseId] = correct;
      if (!correct) wrongCount++;
    }
    if (wrongCount > 0) {
      const concernPerWrong = lane === 1 ? 0.05 : lane === 3 ? 0.15 : 0.1;
      addConcern(wrongCount * concernPerWrong);
    }
    setSortResults(results);
  }

  const handleFolderClick = useCallback(
    (column: ColumnName) => {
      if (sortStage !== 'cascade' || !currentCascadeCase || departingCase) return;

      // Begin departure animation; folder pulses on receive.
      setDepartingCase({ caseId: currentCascadeCase.caseId, column });

      // Halfway through depart, trigger the folder bounce + counter tick.
      setTimeout(() => {
        setColumns(prev => ({
          ...prev,
          [column]: [...prev[column], currentCascadeCase.caseId],
        }));
        setFolderPulseKey(prev => ({ ...prev, [column]: prev[column] + 1 }));
      }, DEPART_MS - 100);

      // After full depart, advance to next case.
      setTimeout(() => {
        setDepartingCase(null);
        setCurrentCascadeIdx(idx => idx + 1);
      }, PAUSE_BEFORE_NEXT_CASE_MS);
    },
    [sortStage, currentCascadeCase, departingCase],
  );

  const beginCascade = useCallback(() => setSortStage('cascade'), []);

  // ── Justify phase handlers ─────────────────────────────────────

  const justifyCases = cases.filter(c => !disappearedCases.has(c.caseId));
  const currentJustifyCase = justifyCases[currentJustifyIdx];

  const handleWritingResult = useCallback((result: EvalResult) => {
    if (result.passed) {
      setWritingPassed(true);
    } else if (!result.isDegraded) {
      addConcern(0.05);
    }
  }, [addConcern]);

  const advanceJustify = useCallback(() => {
    if (!currentJustifyCase) return;

    const allJustifications = {
      ...justifications,
      [currentJustifyCase.caseId]: justifications[currentJustifyCase.caseId] ?? '',
    };
    setJustifications(allJustifications);

    if (currentJustifyIdx < justifyCases.length - 1) {
      setCurrentJustifyIdx(currentJustifyIdx + 1);
      setWritingPassed(false);
    } else {
      const correctCount = cases.filter(c => sortResults[c.caseId]).length;
      const score = correctCount / Math.max(cases.length, 1);

      const answerLog: TaskAnswerLogEntry[] = cases.map(c => {
        const assigned = COLUMNS.find(col => columns[col].includes(c.caseId));
        const isDisappeared = disappearedCases.has(c.caseId);
        return {
          questionId: `case:${c.caseId}`,
          prompt: `${c.title}: ${c.description}`,
          chosen: isDisappeared ? '(case disappeared)' : assigned ?? '(unassigned)',
          correct: c.correctColumn,
          wasCorrect: !!sortResults[c.caseId],
          attempts: 1,
        };
      });

      onComplete(score, {
        taskType: 'priority_sort',
        itemsCorrect: correctCount,
        itemsTotal: cases.length,
        category: 'mixed',
        answerLog,
        disappeared: [...disappearedCases],
        justifications: allJustifications,
        casesCorrect: correctCount,
        totalCases: cases.length,
      });
      setPhase('done');
    }
  }, [currentJustifyCase, currentJustifyIdx, justifyCases.length, justifications, cases, sortResults, disappearedCases, onComplete, columns]);

  // ── Render: Sort phase (cascade + folders + verified results) ──

  function renderSortPhase() {
    if (sortStage === 'training') {
      return <ClassificationTraining lane={lane} onBegin={beginCascade} />;
    }
    return (
      <CascadeStage
        cases={cases}
        currentCascadeIdx={currentCascadeIdx}
        currentCascadeCase={currentCascadeCase}
        departingCase={departingCase}
        columns={columns}
        folderPulseKey={folderPulseKey}
        sortStage={sortStage}
        sortResults={sortResults}
        disappearedCases={disappearedCases}
        disappearBarkText={disappearBarkText}
        onFolderClick={handleFolderClick}
      />
    );
  }

  // ── Render: Justify phase (unchanged from prior version) ───────

  function renderJustifyPhase() {
    if (!currentJustifyCase) return null;
    const justifyText = justifications[currentJustifyCase.caseId] ?? '';

    return (
      <div className="space-y-4">
        <div className="text-center">
          <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest">
            CASE {currentJustifyIdx + 1} OF {justifyCases.length}
          </span>
        </div>

        <div className="bg-white border border-[#E8E4DC] rounded-xl p-4">
          <p className="font-special-elite text-sm text-[#2C3340]">
            {currentJustifyCase.title}
          </p>
          <p className="font-ibm-mono text-xs text-[#6B7280] mt-1">
            {currentJustifyCase.description}
          </p>
        </div>

        <p className="text-sm text-[#4B5563] leading-relaxed">{modalPrompt}</p>

        <TargetWordHighlighter
          text={justifyText}
          onChange={text => setJustifications(prev => ({ ...prev, [currentJustifyCase.caseId]: text }))}
          targetWords={weekConfig.targetWords}
          minWords={10}
          rows={3}
          placeholder="Write your justification here..."
        />

        <WritingEvaluator
          text={justifyText}
          weekNumber={weekConfig.weekNumber}
          grammarTarget={weekConfig.grammarTarget}
          targetVocab={weekConfig.targetWords}
          lane={lane}
          onResult={handleWritingResult}
          disabled={!justifyText.trim()}
        />

        {writingPassed && (
          <div className="pt-2 text-center">
            <button
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
              onClick={advanceJustify}
            >
              {currentJustifyIdx < justifyCases.length - 1 ? 'Next Case' : 'Complete'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="text-center">
        <span className="font-ibm-mono text-[10px] text-[#B8B3AA] tracking-widest uppercase">
          {phase === 'sort' && 'Priority Sorting'}
          {phase === 'justify' && 'Justification'}
          {phase === 'done' && 'Sorting Complete'}
        </span>
      </div>

      <div key={phase} className="animate-fade-in">
        {phase === 'sort' && renderSortPhase()}
        {phase === 'justify' && renderJustifyPhase()}
      </div>
    </div>
  );
}

// ─── ClassificationTraining ──────────────────────────────────────
// One-time per-shift instructional overlay. Explains each folder + how
// to identify which goes where. Lane 1 gets a simpler English variant.

function ClassificationTraining({
  lane,
  onBegin,
}: {
  lane: number;
  onBegin: () => void;
}) {
  const examples = useMemo(
    () =>
      lane === 1
        ? {
            urgent: 'A clinic must change appointments tomorrow.',
            routine: 'New labels arrive next month.',
            hold: 'A form update marked "not urgent."',
          }
        : {
            urgent: 'A regional clinic must reschedule three patients tomorrow.',
            routine: 'The Records Division ordered new filing labels for next month.',
            hold: 'An associate submitted a contact-information update marked "not urgent."',
          },
    [lane],
  );

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="text-center">
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase mb-2">
          Priority Classification Training
        </p>
        <p className="font-special-elite text-base text-[#2C3340]">
          Three folders. Six cases. Read carefully.
        </p>
      </div>

      {/* Folder explanations */}
      <div className="space-y-3">
        <FolderExplainer
          column="URGENT"
          headline="Cases that demand immediate processing."
          detail="Lives, deadlines, or safety are affected."
          example={examples.urgent}
        />
        <FolderExplainer
          column="ROUTINE"
          headline="Cases that follow standard schedule."
          detail="No immediate operational impact."
          example={examples.routine}
        />
        <FolderExplainer
          column="HOLD"
          headline="Cases that can wait or need more information."
          detail="Process later, or escalate if unclear."
          example={examples.hold}
        />
      </div>

      {/* Identification heuristics */}
      <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-4">
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase mb-2">
          How to identify
        </p>
        <ul className="text-xs text-[#4B5563] leading-relaxed space-y-1.5 list-disc list-inside">
          <li>Read the <span className="font-medium">whole</span> case body — small details matter.</li>
          <li>Look for <span className="font-medium">time signals</span>: &ldquo;tomorrow,&rdquo; &ldquo;immediate,&rdquo; &ldquo;next month.&rdquo;</li>
          <li>Look for <span className="font-medium">impact signals</span>: lives, deadlines, services affected.</li>
          <li>If the case explicitly says &ldquo;not urgent&rdquo; → HOLD or ROUTINE.</li>
          <li>If a citizen is in distress → likely URGENT.</li>
        </ul>
      </div>

      {/* PEARL bark + begin */}
      <div className="bg-[#FAFAF7] border border-sky-200 rounded-xl p-3">
        <p className="font-ibm-mono text-[10px] text-sky-500 tracking-wider uppercase mb-1">
          P.E.A.R.L.
        </p>
        <p className="text-xs text-[#4B5563] leading-relaxed">
          P.E.A.R.L. observes your decisions. Maintain accuracy.
        </p>
      </div>

      <div className="text-center">
        <button
          className="px-7 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium tracking-wider hover:bg-sky-700 active:bg-sky-800 active:scale-[0.98] transition-colors"
          onClick={onBegin}
        >
          Begin Classification
        </button>
      </div>
    </div>
  );
}

function FolderExplainer({
  column,
  headline,
  detail,
  example,
}: {
  column: ColumnName;
  headline: string;
  detail: string;
  example: string;
}) {
  const c = COLOR_CONFIG[column];
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-1">
        <Folder column={column} count={null} compact />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-ibm-mono text-[10px] tracking-[0.2em] uppercase mb-0.5 ${c.text}`}>
          {column}
        </p>
        <p className="text-sm text-[#2C3340] font-medium">{headline}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{detail}</p>
        <p className="text-[11px] text-[#8B8578] italic mt-1">e.g. {example}</p>
      </div>
    </div>
  );
}

// ─── CascadeStage ────────────────────────────────────────────────
// The terminal-screen layout matching the briefing video: header
// banner, active case centered above, three folders with counters,
// terminal footer.

interface CascadeStageProps {
  cases: CaseConfig[];
  currentCascadeIdx: number;
  currentCascadeCase: CaseConfig | undefined;
  departingCase: { caseId: string; column: ColumnName } | null;
  columns: Record<ColumnName, string[]>;
  folderPulseKey: Record<ColumnName, number>;
  sortStage: SortStage;
  sortResults: Record<string, boolean>;
  disappearedCases: Set<string>;
  disappearBarkText: string | null;
  onFolderClick: (column: ColumnName) => void;
}

function CascadeStage({
  cases,
  currentCascadeIdx,
  currentCascadeCase,
  departingCase,
  columns,
  folderPulseKey,
  sortStage,
  sortResults,
  disappearedCases,
  disappearBarkText,
  onFolderClick,
}: CascadeStageProps) {
  const totalCases = cases.length;
  const correctCount = useMemo(
    () => cases.filter(c => sortResults[c.caseId]).length,
    [cases, sortResults],
  );

  const showActiveCase = sortStage === 'cascade' && currentCascadeCase;
  const showVerifying = sortStage === 'verifying';
  const showVerified = sortStage === 'verified';

  // Departure transform — direction depends on which folder was clicked
  // so the case visually shrinks toward its destination column.
  const departTransform = useMemo(() => {
    if (!departingCase) return undefined;
    const dx = departingCase.column === 'URGENT' ? '-30%'
      : departingCase.column === 'HOLD' ? '30%'
      : '0';
    return `translate(${dx}, 60%) scale(0.3)`;
  }, [departingCase]);

  return (
    <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-5 space-y-4">
      {/* Terminal header banner */}
      <div className="text-center border-b border-[#E8E4DC] pb-3">
        <p className="font-special-elite text-base text-[#2C3340]">
          {totalCases} CASES — PRIORITY CLASSIFICATION REQUIRED
        </p>
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.2em] uppercase mt-1">
          Read Carefully · Classify Each Case
        </p>
      </div>

      {/* Persistent directions — quick reference once cascade has begun.
          Shown only during the cascade itself; hidden during verifying/verified
          so the results panel reads cleanly. Full instructions live in the
          ClassificationTraining overlay shown before the cascade starts. */}
      {sortStage === 'cascade' && (
        <div className="bg-white border border-[#E8E4DC] rounded-lg px-4 py-2.5">
          <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-[0.25em] uppercase mb-1.5">
            Directions
          </p>
          <ol className="text-xs text-[#4B5563] leading-relaxed list-decimal list-inside space-y-0.5">
            <li>Read each case carefully.</li>
            <li>Click the folder that matches its priority.</li>
            <li>Cases arrive one at a time — classify all {totalCases}.</li>
          </ol>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#F0EDE6] flex-wrap font-ibm-mono text-[10px] tracking-wider">
            <span><span className="text-rose-600 font-bold">URGENT</span> <span className="text-[#8B8578]">— act now</span></span>
            <span className="text-[#D4CFC6]">·</span>
            <span><span className="text-amber-600 font-bold">ROUTINE</span> <span className="text-[#8B8578]">— standard schedule</span></span>
            <span className="text-[#D4CFC6]">·</span>
            <span><span className="text-sky-600 font-bold">HOLD</span> <span className="text-[#8B8578]">— wait or escalate</span></span>
          </div>
        </div>
      )}

      {/* Active case zone */}
      <div className="min-h-[160px] flex items-center justify-center relative">
        {showActiveCase && currentCascadeCase && (
          <div
            key={currentCascadeCase.caseId}
            className="w-full max-w-md"
            style={
              departingCase && departingCase.caseId === currentCascadeCase.caseId
                ? {
                    transform: departTransform,
                    opacity: 0,
                    transition: `transform ${DEPART_MS}ms cubic-bezier(0.55, 0, 0.65, 1), opacity ${DEPART_MS}ms ease-in`,
                  }
                : undefined
            }
          >
            <div className="bg-white border border-[#D4CFC6] rounded-xl p-4 animate-case-slide-in motion-reduce:animate-none shadow-sm">
              <p className="font-special-elite text-sm text-[#2C3340]">
                {currentCascadeCase.title}
              </p>
              <p className="font-ibm-mono text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                {currentCascadeCase.description}
              </p>
            </div>
            {!departingCase && (
              <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-[0.3em] uppercase text-center mt-2 animate-case-pip-in motion-reduce:animate-none">
                Incoming case {currentCascadeIdx + 1} of {totalCases}
              </p>
            )}
          </div>
        )}
        {showVerifying && (
          <div className="text-center">
            <p className="font-ibm-mono text-[10px] text-sky-600 tracking-[0.3em] uppercase animate-pulse">
              Verifying classification...
            </p>
          </div>
        )}
        {showVerified && (
          <VerifiedSummary
            cases={cases}
            columns={columns}
            sortResults={sortResults}
            disappearedCases={disappearedCases}
            correctCount={correctCount}
            totalCases={totalCases}
          />
        )}
      </div>

      {/* 3 folders */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        {COLUMNS.map(column => (
          <button
            key={column}
            type="button"
            disabled={sortStage !== 'cascade' || !currentCascadeCase || !!departingCase}
            onClick={() => onFolderClick(column)}
            className="group flex flex-col items-center gap-2 disabled:cursor-default"
            aria-label={`Classify as ${column}`}
          >
            <Folder
              column={column}
              count={columns[column].length}
              total={totalCases}
              pulseKey={folderPulseKey[column]}
              clickable={sortStage === 'cascade' && !!currentCascadeCase && !departingCase}
            />
          </button>
        ))}
      </div>

      {/* Terminal footer */}
      <div className="border-t border-[#E8E4DC] pt-2 flex items-center justify-between font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider">
        <span>10:25 AM</span>
        <span>MINISTRY OF CLARITY · CASE PROCESSING TERMINAL · v3.2.1</span>
      </div>

      {/* Disappear bark — slides in over the verified panel */}
      {disappearBarkText && (
        <div className="bg-white border border-sky-300 rounded-xl p-4 animate-bubble-pop-in motion-reduce:animate-none shadow-md">
          <p className="font-ibm-mono text-[10px] text-sky-600 tracking-wider uppercase mb-2">
            P.E.A.R.L.
          </p>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            {disappearBarkText}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Folder ──────────────────────────────────────────────────────
// CSS-rendered manila folder matching the briefing video. Pink/tan/blue
// body + tab on top-left + counter beneath. `pulseKey` change retriggers
// the receive-bounce animation.

interface FolderProps {
  column: ColumnName;
  count: number | null;
  total?: number;
  pulseKey?: number;
  clickable?: boolean;
  compact?: boolean;
}

function Folder({ column, count, total = 6, pulseKey = 0, clickable = false, compact = false }: FolderProps) {
  const c = COLOR_CONFIG[column];
  const size = compact
    ? { folder: 'w-12 h-9', tab: 'w-5 h-2 left-1 -top-1.5' }
    : { folder: 'w-20 h-14 sm:w-24 sm:h-16', tab: 'w-8 h-2.5 left-2 -top-2' };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        key={pulseKey}
        className={`relative ${size.folder} ${clickable ? 'animate-folder-receive motion-reduce:animate-none' : ''}`}
      >
        {/* Tab */}
        <div
          className={`absolute ${size.tab} ${c.tab} rounded-t-md transition-colors ${clickable ? c.bodyHover : ''}`}
          aria-hidden="true"
        />
        {/* Body */}
        <div
          className={`relative w-full h-full ${c.body} rounded-md rounded-tl-none transition-all ${
            clickable
              ? `ring-1 ring-transparent ${c.ring} group-hover:scale-[1.04] group-active:scale-[0.97] ${c.bodyHover} cursor-pointer`
              : ''
          }`}
          style={{ boxShadow: 'inset 0 -3px 0 rgba(0, 0, 0, 0.08)' }}
        />
      </div>
      <p className={`font-ibm-mono text-[10px] tracking-wider uppercase ${c.text}`}>
        {column}
      </p>
      {count !== null && (
        <p
          key={`counter-${count}`}
          className="font-ibm-mono text-[10px] text-[#8B8578] tabular-nums animate-counter-tick motion-reduce:animate-none"
        >
          {count} / {total}
        </p>
      )}
    </div>
  );
}

// ─── VerifiedSummary ─────────────────────────────────────────────
// Post-cascade results panel: per-folder list of cases with ✓/✗,
// disappearing case glitches out when its time comes.

interface VerifiedSummaryProps {
  cases: CaseConfig[];
  columns: Record<ColumnName, string[]>;
  sortResults: Record<string, boolean>;
  disappearedCases: Set<string>;
  correctCount: number;
  totalCases: number;
}

function VerifiedSummary({
  cases,
  columns,
  sortResults,
  disappearedCases,
  correctCount,
  totalCases,
}: VerifiedSummaryProps) {
  const caseById = useMemo(() => {
    const map: Record<string, CaseConfig> = {};
    for (const c of cases) map[c.caseId] = c;
    return map;
  }, [cases]);

  return (
    <div className="w-full space-y-3 animate-fade-in">
      <div className="text-center">
        <p className="font-ibm-mono text-[10px] text-emerald-600 tracking-[0.3em] uppercase mb-1">
          Classification Verified
        </p>
        <p className="font-special-elite text-base text-[#2C3340]">
          {correctCount} of {totalCases} correct
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {COLUMNS.map(column => {
          const c = COLOR_CONFIG[column];
          const inFolder = columns[column];
          return (
            <div key={column} className={`border ${c.pillBorder} ${c.pillBg} rounded-lg p-2 space-y-1.5`}>
              <p className={`font-ibm-mono text-[9px] tracking-wider uppercase ${c.text} text-center`}>
                {column}
              </p>
              {inFolder.length === 0 && (
                <p className="font-ibm-mono text-[9px] text-[#B8B3AA] text-center italic">empty</p>
              )}
              {inFolder.map(caseId => {
                const cfg = caseById[caseId];
                const correct = sortResults[caseId];
                const isDisappearing = disappearedCases.has(caseId);
                return (
                  <div
                    key={caseId}
                    className={`text-[10px] text-[#4B5563] flex items-start gap-1 leading-tight ${
                      isDisappearing ? 'animate-incoming-glitch motion-reduce:animate-none' : ''
                    }`}
                    style={isDisappearing ? { animationFillMode: 'forwards' } : undefined}
                  >
                    <span className={correct ? 'text-emerald-600' : 'text-rose-600'}>
                      {correct ? '✓' : '✗'}
                    </span>
                    <span className="flex-1">{cfg?.title ?? caseId}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
