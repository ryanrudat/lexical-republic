import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchGradebook,
  fetchWritingReview,
  updateScoreComment,
} from '../../api/teacher';
import type { GradebookWeek, WritingReviewEntry } from '../../api/teacher';
import { useTeacherStore } from '../../stores/teacherStore';

type SortKey = 'attention' | 'designation_asc' | 'designation_desc' | 'score_asc' | 'score_desc';

const SORT_LABELS: Record<SortKey, string> = {
  attention: 'Needs attention',
  designation_asc: 'Designation (A→Z)',
  designation_desc: 'Designation (Z→A)',
  score_asc: 'Score (low→high)',
  score_desc: 'Score (high→low)',
};

function scorePillClass(pct: number): string {
  if (pct >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function needsAttention(entry: WritingReviewEntry): boolean {
  if (entry.submittedAnyway) return true;
  if (entry.onTopic === false) return true;
  if (entry.score < 0.5) return true;
  if (!entry.teacherComment || entry.teacherComment.trim().length === 0) return true;
  return false;
}

function sortEntries(entries: WritingReviewEntry[], key: SortKey): WritingReviewEntry[] {
  if (key === 'attention') {
    // Decorate-sort-undecorate: compute needsAttention once per entry.
    return entries
      .map((entry) => ({ entry, attention: needsAttention(entry) ? 0 : 1 }))
      .sort((a, b) => a.attention - b.attention || a.entry.score - b.entry.score)
      .map((d) => d.entry);
  }
  const copy = [...entries];
  switch (key) {
    case 'designation_asc':
      copy.sort((a, b) => (a.designation ?? '~').localeCompare(b.designation ?? '~'));
      break;
    case 'designation_desc':
      copy.sort((a, b) => (b.designation ?? '~').localeCompare(a.designation ?? '~'));
      break;
    case 'score_asc':
      copy.sort((a, b) => a.score - b.score);
      break;
    case 'score_desc':
      copy.sort((a, b) => b.score - a.score);
      break;
  }
  return copy;
}

export default function WritingReview({ classId }: { classId: string | null }) {
  const [weeks, setWeeks] = useState<GradebookWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [entries, setEntries] = useState<WritingReviewEntry[]>([]);
  const [weekTitle, setWeekTitle] = useState<string | null>(null);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('attention');

  const setActiveTab = useTeacherStore((s) => s.setActiveTab);
  const setSelectedCell = useTeacherStore((s) => s.setSelectedCell);

  // Load the week list from the gradebook response. Default selection =
  // the most recent week that has any MissionScore (i.e. recently worked).
  useEffect(() => {
    if (!classId) {
      setWeeks([]);
      setSelectedWeek(null);
      setLoadingWeeks(false);
      return;
    }
    setLoadingWeeks(true);
    setError(null);
    void fetchGradebook(classId)
      .then((data) => {
        setWeeks(data.weeks);
        const weekWithActivity = [...data.weeks]
          .filter((w) =>
            data.students.some((s) =>
              s.missionScores.some((ms) => ms.mission.weekId === w.id),
            ),
          )
          .sort((a, b) => b.weekNumber - a.weekNumber)[0];
        setSelectedWeek((prev) => {
          if (prev && data.weeks.some((w) => w.weekNumber === prev)) return prev;
          return weekWithActivity?.weekNumber ?? data.weeks[0]?.weekNumber ?? null;
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load weeks';
        setError(message);
      })
      .finally(() => setLoadingWeeks(false));
  }, [classId]);

  // Load the writing review entries whenever class/week changes.
  const loadEntries = useCallback(() => {
    if (!classId || selectedWeek == null) {
      setEntries([]);
      setWeekTitle(null);
      return;
    }
    setLoadingEntries(true);
    setError(null);
    void fetchWritingReview(classId, selectedWeek)
      .then((data) => {
        setEntries(data.entries);
        setWeekTitle(data.weekTitle);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load writing review';
        setError(message);
        setEntries([]);
        setWeekTitle(null);
      })
      .finally(() => setLoadingEntries(false));
  }, [classId, selectedWeek]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const sorted = useMemo(() => sortEntries(entries, sortKey), [entries, sortKey]);

  const tallies = useMemo(() => {
    let attention = 0;
    let submittedAnyway = 0;
    for (const e of entries) {
      if (needsAttention(e)) attention++;
      if (e.submittedAnyway) submittedAnyway++;
    }
    return { total: entries.length, attention, submittedAnyway };
  }, [entries]);

  const openInGradebook = useCallback(
    (studentId: string) => {
      const week = weeks.find((w) => w.weekNumber === selectedWeek);
      if (week) {
        setSelectedCell({ studentId, weekId: week.id });
      }
      setActiveTab('grades');
    },
    [setSelectedCell, setActiveTab, selectedWeek, weeks],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Writing Review</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every written submission for the selected shift. Comment and save to record teacher notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Shift</label>
          <select
            value={selectedWeek ?? ''}
            onChange={(e) => setSelectedWeek(Number(e.target.value) || null)}
            disabled={loadingWeeks || weeks.length === 0}
            className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.weekNumber}>
                Shift {w.weekNumber} — {w.title}
              </option>
            ))}
          </select>

          <label className="text-xs text-slate-500 ml-3">Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tally strip */}
      {!loadingEntries && !loadingWeeks && entries.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-500 font-medium">
            {tallies.total} submission{tallies.total !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-700">{tallies.attention} need attention</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-700">{tallies.submittedAnyway} submitted anyway</span>
          </span>
          {weekTitle && (
            <span className="text-slate-400 ml-auto">{weekTitle}</span>
          )}
        </div>
      )}

      {/* Body */}
      {!classId ? (
        <div className="text-sm text-slate-400 text-center py-12 bg-white rounded-xl border border-slate-200">
          Select a class to load writing submissions.
        </div>
      ) : loadingWeeks || loadingEntries ? (
        <div className="text-sm text-indigo-500 text-center py-12 animate-pulse">
          Loading writing review...
        </div>
      ) : error ? (
        <div className="text-sm text-rose-600 text-center py-12 bg-rose-50 rounded-xl border border-rose-200">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-12 bg-white rounded-xl border border-slate-200">
          No written submissions yet for this shift.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry, idx) => (
            <EntryCard
              key={`${entry.scoreId}-${entry.label ?? 'main'}-${idx}`}
              entry={entry}
              onOpenGradebook={() => openInGradebook(entry.studentId)}
              onRefresh={loadEntries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  onOpenGradebook,
  onRefresh,
}: {
  entry: WritingReviewEntry;
  onOpenGradebook: () => void;
  onRefresh: () => void;
}) {
  const [comment, setComment] = useState(entry.teacherComment ?? '');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setComment(entry.teacherComment ?? '');
  }, [entry.teacherComment, entry.scoreId]);

  const pct = Math.round(entry.score * 100);
  const hasAiEval =
    entry.onTopic !== null ||
    entry.vocabScore !== null ||
    (entry.grammarAdvisory != null && entry.grammarAdvisory.length > 0) ||
    entry.grammarScore != null ||
    entry.grammarNotes.length > 0 ||
    entry.vocabUsed.length > 0 ||
    entry.vocabMissed.length > 0 ||
    (entry.taskNotes != null && entry.taskNotes.length > 0);
  const commentDirty = comment !== (entry.teacherComment ?? '');

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateScoreComment(entry.scoreId, comment);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save comment';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-[180px]">
          <div className="text-sm font-semibold text-slate-800">
            <span className="text-indigo-500 mr-1.5 font-mono text-xs">
              {entry.designation || '??'}
            </span>
            {entry.displayName}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {entry.taskTitle}
            {entry.label && <span className="text-slate-400"> · {entry.label}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${scorePillClass(pct)}`}
          >
            {pct}%
          </span>
          {entry.onTopic === false && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 font-medium">
              Off-Topic
            </span>
          )}
          {entry.onTopic === true && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
              On-Topic
            </span>
          )}
          {entry.submittedAnyway && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 font-medium">
              Submitted Anyway
            </span>
          )}
          <button
            onClick={onOpenGradebook}
            className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="Open this student in the Gradebook tab"
          >
            Gradebook →
          </button>
        </div>
      </div>

      {/* Writing text */}
      <div className="mb-3">
        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">
          Submission
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 max-h-72 overflow-y-auto">
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {entry.writingText}
          </div>
        </div>
      </div>

      {/* AI evaluation panel */}
      {hasAiEval && (
        <div className="mb-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
          <div className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider mb-2">
            AI Evaluation
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* On-topic verdict (post-2026-04-29 rubric) */}
            {entry.onTopic !== null && (
              <div className="md:col-span-2">
                <span className="text-slate-500">On-topic: </span>
                <span className={`font-semibold ${entry.onTopic ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {entry.onTopic ? 'Yes' : 'No'}
                </span>
                {entry.onTopicReason && (
                  <span className="text-slate-600 ml-2">— {entry.onTopicReason}</span>
                )}
              </div>
            )}
            {entry.vocabScore != null && (
              <div>
                <span className="text-slate-500">Vocab score: </span>
                <span className="font-semibold text-slate-700">
                  {Math.round(entry.vocabScore * 100)}%
                </span>
              </div>
            )}
            {entry.vocabUsed.length > 0 && (
              <div>
                <span className="text-slate-500">Vocab used: </span>
                <span className="font-medium text-emerald-700">
                  {entry.vocabUsed.join(', ')}
                </span>
              </div>
            )}
            {entry.vocabMissed.length > 0 && (
              <div>
                <span className="text-slate-500">Vocab missed: </span>
                <span className="font-medium text-rose-700">
                  {entry.vocabMissed.join(', ')}
                </span>
              </div>
            )}
            {/* Grammar advisory — non-scoring observation, post-redesign */}
            {entry.grammarAdvisory && (
              <div className="md:col-span-2">
                <span className="text-slate-500">Grammar note (advisory only): </span>
                <span className="text-slate-700 italic">{entry.grammarAdvisory}</span>
              </div>
            )}
            {/* ── Legacy fields (pre-redesign rows) ── */}
            {entry.onTopic === null && entry.grammarScore != null && (
              <div>
                <span className="text-slate-500">Grammar score (legacy): </span>
                <span className="font-semibold text-slate-700">
                  {Math.round(entry.grammarScore * 100)}%
                </span>
              </div>
            )}
            {entry.onTopic === null && entry.grammarNotes.length > 0 && (
              <div className="md:col-span-2">
                <span className="text-slate-500">Grammar notes (legacy): </span>
                <ul className="mt-1 list-disc list-inside text-slate-700 space-y-0.5">
                  {entry.grammarNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {entry.onTopic === null && entry.taskNotes && (
              <div className="md:col-span-2">
                <span className="text-slate-500">Task notes (legacy): </span>
                <span className="text-slate-700">{entry.taskNotes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PEARL feedback */}
      {entry.pearlFeedback && (
        <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
          <span
            className="inline-block w-3.5 h-3.5 rounded-full bg-gradient-to-br from-sky-300 via-white to-indigo-200 shrink-0 mt-0.5 ring-1 ring-indigo-200"
            aria-hidden="true"
          />
          <div>
            <div className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider mb-0.5">
              P.E.A.R.L. Observation
            </div>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              {entry.pearlFeedback}
            </p>
          </div>
        </div>
      )}

      {/* Teacher comment */}
      <div>
        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
          Teacher Comment
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Optional note for this submission..."
          className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
        />
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="text-[11px] text-slate-400">
            {saveError ? (
              <span className="text-rose-600">{saveError}</span>
            ) : justSaved ? (
              <span className="text-emerald-600">Saved.</span>
            ) : (
              ''
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !commentDirty}
            className="text-xs px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
