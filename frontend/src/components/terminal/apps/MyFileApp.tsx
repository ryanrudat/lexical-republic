import { useEffect, useMemo, useState } from 'react';
import { fetchProfileSummary } from '../../../api/student';
import type { ProfileSummary, ProfileSummaryShiftResult, WordStatusKey } from '../../../api/student';

const CLEARANCE_LABELS: Record<number, string> = {
  1: 'Standard Track',
  2: 'Associate Track',
  3: 'Director Track',
};

const STATUS_LABELS: Record<WordStatusKey, string> = {
  approved: 'Approved',
  monitored: 'Monitored',
  grey: 'Grey',
  proscribed: 'Proscribed',
  recovered: 'Recovered',
};

const STATUS_DOT_COLORS: Record<WordStatusKey, string> = {
  approved: 'bg-emerald-500',
  monitored: 'bg-amber-500',
  grey: 'bg-[#8B8578]',
  proscribed: 'bg-rose-500',
  recovered: 'bg-sky-500',
};

const TOTAL_SHIFT_GRID = 18;

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function concernGaugeColor(score: number): { bar: string; label: string; tone: string } {
  if (score >= 3.0) return { bar: 'bg-rose-500', label: 'UNDER REVIEW', tone: 'text-rose-600' };
  if (score >= 1.0) return { bar: 'bg-amber-500', label: 'MONITORED', tone: 'text-amber-600' };
  return { bar: 'bg-emerald-500', label: 'GOOD STANDING', tone: 'text-emerald-600' };
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-1 rounded-full bg-sky-600" />
      <span className="font-ibm-mono text-[10px] text-sky-600 tracking-[0.25em] uppercase">
        {label}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#D4CFC6] shadow-sm p-5 mb-3">
      {children}
    </div>
  );
}

function MetricBlock({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase block mb-1">
        {label}
      </span>
      <span className="text-xl font-semibold text-[#2C3340] tabular-nums">
        {value}
      </span>
      {hint ? (
        <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider block mt-0.5">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Gauge({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 rounded-full bg-[#E8E4DC] overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function ShiftGrid({
  totalAvailable,
  results,
  onSelect,
  selectedWeek,
}: {
  totalAvailable: number;
  results: ProfileSummaryShiftResult[];
  onSelect: (r: ProfileSummaryShiftResult | null) => void;
  selectedWeek: number | null;
}) {
  const byWeek = useMemo(() => {
    const map = new Map<number, ProfileSummaryShiftResult>();
    for (const r of results) map.set(r.weekNumber, r);
    return map;
  }, [results]);

  const cells = Array.from({ length: TOTAL_SHIFT_GRID }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-6 gap-2">
      {cells.map(week => {
        const result = byWeek.get(week);
        const isAvailable = week <= totalAvailable;
        const isCompleted = !!result;
        const isSelected = selectedWeek === week;

        const baseClasses =
          'aspect-square rounded-xl border flex flex-col items-center justify-center px-1 transition-all duration-200 active:scale-95';

        if (!isAvailable) {
          return (
            <div
              key={week}
              className={`${baseClasses} border-[#E8E4DC] bg-[#FAFAF7] opacity-60 cursor-not-allowed`}
              aria-label={`Shift ${week} locked`}
            >
              <span className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider">W{week}</span>
              <span className="font-ibm-mono text-[10px] text-[#B8B3AA] mt-0.5">—</span>
            </div>
          );
        }

        if (!isCompleted) {
          return (
            <div
              key={week}
              className={`${baseClasses} border-[#D4CFC6] bg-white`}
              aria-label={`Shift ${week} not completed`}
            >
              <span className="font-ibm-mono text-[9px] text-[#8B8578] tracking-wider">W{week}</span>
              <span className="font-ibm-mono text-[10px] text-[#B8B3AA] mt-0.5">—</span>
            </div>
          );
        }

        const scorePct = Math.round(Math.max(0, Math.min(1, result.vocabScore)) * 100);
        return (
          <button
            key={week}
            type="button"
            onClick={() => onSelect(isSelected ? null : result)}
            className={`${baseClasses} ${
              isSelected
                ? 'border-sky-500 bg-sky-50 shadow-sm'
                : 'border-emerald-200 bg-emerald-50/40 hover:border-sky-400'
            }`}
            aria-pressed={isSelected}
            aria-label={`Shift ${week} — ${scorePct}% vocab score`}
          >
            <span className="font-ibm-mono text-[9px] text-[#4B5563] tracking-wider">W{week}</span>
            <span className="text-sm font-semibold text-emerald-700 tabular-nums mt-0.5">{scorePct}%</span>
          </button>
        );
      })}
    </div>
  );
}

function ShiftDetail({ result }: { result: ProfileSummaryShiftResult }) {
  const completedAt = new Date(result.completedAt);
  const date = Number.isFinite(completedAt.getTime())
    ? completedAt.toLocaleDateString()
    : '—';
  const errorsLabel = result.errorsTotal > 0
    ? `${result.errorsFound} / ${result.errorsTotal}`
    : `${result.errorsFound}`;
  const concernLabel = result.concernScoreDelta > 0
    ? `+${result.concernScoreDelta.toFixed(1)}`
    : result.concernScoreDelta.toFixed(1);
  const concernTone = result.concernScoreDelta > 0 ? 'text-rose-600' : 'text-emerald-600';

  return (
    <div className="mt-3 rounded-xl border border-[#D4CFC6] bg-[#FAFAF7] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-ibm-mono text-[10px] text-sky-600 tracking-[0.25em] uppercase">
          Shift {result.weekNumber} · Detail
        </p>
        <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider">{date}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label="Vocab Score" value={formatPercent(result.vocabScore)} />
        <MetricBlock label="Grammar Accuracy" value={formatPercent(result.grammarAccuracy)} />
        <MetricBlock label="Target Words Used" value={result.targetWordsUsed} />
        <MetricBlock label="Errors Found" value={errorsLabel} />
        <div>
          <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase block mb-1">
            Concern Delta
          </span>
          <span className={`text-xl font-semibold tabular-nums ${concernTone}`}>
            {concernLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse mb-3" />
      <p className="text-sm text-[#4B5563]">Loading citizen file...</p>
      <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider mt-2">
        Ministry records are being retrieved
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-ibm-mono text-[10px] text-rose-600 tracking-[0.25em] uppercase mb-2">
        Access Fault
      </p>
      <p className="text-sm text-[#2C3340] mb-1 font-medium">
        Ministry records temporarily unavailable
      </p>
      <p className="text-xs text-[#4B5563] mb-5 max-w-sm">
        Your dossier could not be retrieved. Please stand by and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl border border-sky-200 bg-sky-50 text-xs font-medium tracking-wider text-sky-700 hover:bg-sky-100 active:scale-95 transition-all"
      >
        Retry
      </button>
    </div>
  );
}

export default function MyFileApp() {
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ProfileSummaryShiftResult | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchProfileSummary()
      .then(data => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Ministry records temporarily unavailable');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const load = () => {
    setSummary(null);
    setError(null);
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#F5F1EB] px-6 py-8">
        <LoadingState />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-full bg-[#F5F1EB] px-6 py-8">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  const { citizen, shifts, vocabulary, harmony, character } = summary;
  const clearanceLabel = CLEARANCE_LABELS[citizen.lane] ?? 'Unassigned';
  const concernGauge = concernGaugeColor(citizen.concernScore);
  // Concern score visually capped at ~5.0 for the gauge; real concern ranges 0-5+ typically
  const concernPercent = Math.min(100, (citizen.concernScore / 5.0) * 100);
  const masteryPercent = vocabulary.averageMastery * 100;
  const alignmentPercent = harmony.censureCorrectnessRate * 100;

  return (
    <div className="min-h-full bg-[#F5F1EB] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-[0.3em] uppercase mb-1">
            Ministry Personnel Records Division
          </p>
          <h2 className="text-2xl font-semibold text-[#2C3340] tracking-wide mb-1">
            Citizen File
          </h2>
          <p className="font-ibm-mono text-xs text-sky-600 tracking-[0.2em]">
            {citizen.designation}
          </p>
        </div>

        {/* Citizen Record */}
        <Card>
          <SectionHeader label="Citizen Record" />
          <div className="grid grid-cols-2 gap-5 mb-4">
            <MetricBlock
              label="Designation"
              value={<span className="text-lg">{citizen.designation}</span>}
            />
            <MetricBlock
              label="Clearance"
              value={<span className="text-lg">Level {citizen.lane}</span>}
              hint={clearanceLabel}
            />
            <MetricBlock label="Merit Points (XP)" value={citizen.xp} />
            <MetricBlock label="Streak" value={citizen.streak > 0 ? `${citizen.streak} days` : '—'} />
          </div>

          {/* Concern Gauge */}
          <div className="mt-4 pt-4 border-t border-[#EDE8DE]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
                Concern Score
              </span>
              <span className={`font-ibm-mono text-[10px] tracking-[0.2em] uppercase font-semibold ${concernGauge.tone}`}>
                {concernGauge.label}
              </span>
            </div>
            <Gauge percent={concernPercent} color={concernGauge.bar} />
            <p className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider mt-1.5 tabular-nums">
              {citizen.concernScore.toFixed(2)} · Qualifying shifts: {citizen.consecutiveQualifyingShifts} of 3
              {citizen.laneLocked ? ' · Lane locked' : ''}
            </p>
          </div>
        </Card>

        {/* Shift History */}
        <Card>
          <SectionHeader label="Shift History" />
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm text-[#4B5563]">
              <span className="font-semibold text-[#2C3340] tabular-nums">{shifts.totalCompleted}</span>
              <span className="text-[#8B8578]"> of {shifts.totalAvailable} shifts completed</span>
            </p>
            {selectedShift ? (
              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="font-ibm-mono text-[10px] text-sky-600 hover:text-sky-700 tracking-wider uppercase active:scale-95 transition-all"
              >
                Close
              </button>
            ) : null}
          </div>
          <ShiftGrid
            totalAvailable={shifts.totalAvailable}
            results={shifts.recentResults}
            onSelect={setSelectedShift}
            selectedWeek={selectedShift?.weekNumber ?? null}
          />
          {selectedShift ? <ShiftDetail result={selectedShift} /> : null}
        </Card>

        {/* Vocabulary Ledger */}
        <Card>
          <SectionHeader label="Vocabulary Ledger" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <MetricBlock label="Words Logged" value={vocabulary.totalWords} />
            <MetricBlock label="Encounters" value={vocabulary.totalEncounters} />
            <MetricBlock label="Starred" value={vocabulary.starredCount} />
          </div>

          {/* Mastery Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
                Average Mastery
              </span>
              <span className="font-ibm-mono text-xs text-[#2C3340] font-semibold tabular-nums">
                {Math.round(masteryPercent)}%
              </span>
            </div>
            <Gauge percent={masteryPercent} color="bg-sky-500" />
          </div>

          {/* Status Breakdown */}
          <div className="pt-3 border-t border-[#EDE8DE]">
            <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase block mb-2">
              Status Breakdown
            </span>
            <div className="grid grid-cols-5 gap-2">
              {(['approved', 'monitored', 'grey', 'proscribed', 'recovered'] as WordStatusKey[]).map(key => (
                <div key={key} className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[key]}`} />
                    <span className="text-sm font-semibold text-[#2C3340] tabular-nums">
                      {vocabulary.byStatus[key]}
                    </span>
                  </div>
                  <span className="font-ibm-mono text-[9px] text-[#8B8578] tracking-wider uppercase">
                    {STATUS_LABELS[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Harmony Activity */}
        <Card>
          <SectionHeader label="Harmony Activity" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <MetricBlock label="Posts Written" value={harmony.postsWritten} />
            <MetricBlock
              label="Censure Responses"
              value={harmony.censureResponsesTotal}
              hint={harmony.censureResponsesTotal > 0 ? `${harmony.censureCorrect} correct` : undefined}
            />
          </div>
          <div className="pt-3 border-t border-[#EDE8DE]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-ibm-mono text-[10px] text-[#8B8578] tracking-wider uppercase">
                Ministry Alignment
              </span>
              <span className="font-ibm-mono text-xs text-[#2C3340] font-semibold tabular-nums">
                {Math.round(alignmentPercent)}%
              </span>
            </div>
            <Gauge percent={alignmentPercent} color="bg-emerald-500" />
          </div>
        </Card>

        {/* Character Dossier */}
        <Card>
          <SectionHeader label="Character Dossier" />
          <div className="grid grid-cols-2 gap-4">
            <MetricBlock
              label="Narrative Choices"
              value={character.narrativeChoicesMade}
              hint="Decisions logged"
            />
            <MetricBlock
              label="Citizen-4488 Log"
              value={character.citizen4488InteractionsCount}
              hint="Interactions recorded"
            />
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center font-ibm-mono text-[10px] text-[#B8B3AA] tracking-wider mt-8">
          File classification: Standard · Accessible by Ministry personnel
        </p>
      </div>
    </div>
  );
}
