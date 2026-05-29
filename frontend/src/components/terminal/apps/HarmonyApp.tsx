import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useHarmonyStore } from '../../../stores/harmonyStore';
import { useStudentStore } from '../../../stores/studentStore';
import { getSocket } from '../../../utils/socket';
import type { HarmonyPost, CensureItem, CensureResponseResult, AuditPair } from '../../../api/harmony';
import HarmonyBulletin from './HarmonyBulletin';
import HarmonyPearlTip from './HarmonyPearlTip';
import HarmonyNoticeCard from './HarmonyNoticeCard';
import HarmonySectorReport from './HarmonySectorReport';

/** Max characters for a Harmony post. Source of truth: backend/src/data/harmonyWorldBible.ts */
const HARMONY_POST_MAX_LENGTH = 280;

/* ─── Result Overlay (neon check / X) ──────────────────────────── */

function ResultOverlay({ isCorrect, onDone }: { isCorrect: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Enter → hold
    const t1 = setTimeout(() => setPhase('hold'), 50);
    // Hold → exit after 3s
    const t2 = setTimeout(() => setPhase('exit'), 3000);
    // Remove after exit animation
    const t3 = setTimeout(() => onDone(), 3500);
    timerRef.current = t3;
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const opacity = phase === 'enter' ? 'opacity-0 scale-50' : phase === 'hold' ? 'opacity-100 scale-100' : 'opacity-0 scale-75';
  const glowColor = isCorrect ? 'shadow-[0_0_60px_rgba(74,222,128,0.5)]' : 'shadow-[0_0_60px_rgba(244,63,94,0.5)]';
  const borderColor = isCorrect ? 'border-green-400' : 'border-rose-500';
  const iconColor = isCorrect ? 'text-green-400' : 'text-rose-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className={`w-32 h-32 rounded-2xl border-2 ${borderColor} bg-black/80 ${glowColor} flex items-center justify-center transition-all duration-500 ease-out ${opacity}`}>
        {isCorrect ? (
          <svg className={`w-20 h-20 ${iconColor} drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className={`w-20 h-20 ${iconColor} drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(date);
}

function isCitizen4488(post: HarmonyPost): boolean {
  return post.designation === 'Citizen-4488';
}

/* ─── Propaganda + PEARL presence + reward (M1) ─────────────────── */

/** Frontend mirror of the weekly slogan (source of truth: harmonyWorldBible.ts). */
const WEEKLY_SLOGANS: Record<number, string> = {
  1: 'Harmony Starts With You',
  2: 'Clear Words, Clear Minds',
  3: 'Efficiency Is Community',
  4: 'Accurate Records, Accurate Lives',
};
function sloganForWeek(week: number): string {
  return WEEKLY_SLOGANS[week] ?? 'Compliance Is Care';
}

/** Small static PEARL eye glyph — the sanctioned pearl-eye-glow asset, no RAF. */
function PearlGlyph({ className = 'w-6 h-6' }: { className?: string }) {
  return <img src="/images/pearl-eye-glow.png" alt="" aria-hidden className={`${className} shrink-0 object-contain`} />;
}

/** Thin scrolling propaganda slogan bar — makes the Feed feel like live state media. */
function PropagandaTicker({ week }: { week: number }) {
  const slogan = sloganForWeek(week);
  const line = Array.from({ length: 4 }, () => slogan).join('   ◆   ');
  return (
    <div className="overflow-hidden border-b border-[#E8E4DC] bg-sky-50/50">
      <div className="harmony-ticker whitespace-nowrap py-1 text-[9px] tracking-[0.25em] uppercase text-sky-700/70">
        <span className="px-3">{line}</span>
        <span className="px-3" aria-hidden>{line}</span>
      </div>
    </div>
  );
}

/** PEARL goal banner — gives the Feed a session objective + a "done" state. */
function HarmonyGoalBanner({
  remaining,
  total,
  credits,
}: {
  remaining: number;
  total: number;
  credits: number;
}) {
  const done = total > 0 && remaining === 0;
  const message = total === 0
    ? 'Welcome back, Citizen. Read, review, and keep our words clear.'
    : done
      ? 'Every document is reviewed. Exemplary clarity, Citizen.'
      : `${remaining} document${remaining === 1 ? '' : 's'} await${remaining === 1 ? 's' : ''} your review in the Queue, Citizen.`;
  return (
    <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2">
      <PearlGlyph className="w-7 h-7" />
      <p className="flex-1 text-[11px] text-sky-800/90 italic leading-snug">{message}</p>
      <span className="shrink-0 text-[10px] font-mono font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        HC {credits}
      </span>
    </div>
  );
}

/** Shift-end summary shown when the Review queue is cleared. */
function ShiftComplianceReport({
  reviewed,
  correct,
  credits,
}: {
  reviewed: number;
  correct: number;
  credits: number;
}) {
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;
  return (
    <div className="mx-4 mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-200/60 bg-emerald-50">
        <PearlGlyph />
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-700">
          Shift Compliance Report
        </span>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[18px] font-semibold text-emerald-700">{reviewed}</p>
          <p className="text-[9px] tracking-wider uppercase text-[#8B8578]">Reviewed</p>
        </div>
        <div>
          <p className="text-[18px] font-semibold text-emerald-700">{accuracy}%</p>
          <p className="text-[9px] tracking-wider uppercase text-[#8B8578]">Accuracy</p>
        </div>
        <div>
          <p className="text-[18px] font-semibold text-amber-600">{credits}</p>
          <p className="text-[9px] tracking-wider uppercase text-[#8B8578]">Credits</p>
        </div>
      </div>
      <p className="px-4 pb-3 text-[11px] italic text-emerald-700/80 leading-snug">
        PEARL: The Queue is clear, Citizen. Your diligence has been noted with appreciation.
      </p>
    </div>
  );
}

/** Daily Vocabulary Audit — top-of-feed 3-pair word↔definition match on
 *  PRIOR-shift words (spaced retrieval). Once per shift; awards Harmony Credits. */
function DailyVocabAudit({ pairs, week, pairId }: { pairs: AuditPair[]; week: number; pairId: string | null }) {
  const awardCredits = useHarmonyStore((s) => s.awardCredits);
  const doneKey = `harmony_audit_${pairId ?? 'anon'}_w${week}`;
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(doneKey) === '1'; } catch { return false; }
  });
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongDef, setWrongDef] = useState<string | null>(null);

  // Stable shuffled definition column.
  const shuffledDefs = useMemo(() => {
    const arr = [...pairs];
    for (let k = arr.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [arr[k], arr[j]] = [arr[j], arr[k]];
    }
    return arr;
  }, [pairs]);

  useEffect(() => {
    if (!done && pairs.length >= 2 && matched.size === pairs.length) {
      setDone(true);
      try { localStorage.setItem(doneKey, '1'); } catch { /* ignore */ }
      awardCredits(2);
    }
  }, [matched, pairs.length, done, doneKey, awardCredits]);

  if (pairs.length < 2) return null;

  if (done) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-1.5">
        <PearlGlyph className="w-4 h-4" />
        <span className="text-[10px] tracking-[0.12em] uppercase text-emerald-700/80">Daily Vocabulary Audit — complete</span>
      </div>
    );
  }

  const tapDef = (d: AuditPair) => {
    if (!selectedWord || matched.has(d.word)) return;
    if (d.word === selectedWord) {
      const w = selectedWord;
      setMatched((prev) => new Set(prev).add(w));
      setSelectedWord(null);
    } else {
      setWrongDef(d.definition);
      setSelectedWord(null);
      setTimeout(() => setWrongDef(null), 350);
    }
  };

  return (
    <div className="mx-4 mt-3 rounded-xl border border-sky-200 bg-sky-50/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-sky-200/60 flex items-center gap-2">
        <PearlGlyph className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-sky-700">Daily Vocabulary Audit</span>
        <span className="ml-auto text-[9px] text-sky-700/60 tabular-nums">{matched.size}/{pairs.length}</span>
      </div>
      <div className="px-3 py-2.5 grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          {pairs.map((p) => {
            const isMatched = matched.has(p.word);
            const isSel = selectedWord === p.word;
            return (
              <button
                key={p.word}
                disabled={isMatched}
                onClick={() => setSelectedWord(isSel ? null : p.word)}
                className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isMatched
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 line-through'
                    : isSel
                      ? 'border-sky-400 bg-sky-100 text-sky-800 font-medium'
                      : 'border-[#E8E4DC] bg-white text-[#2C3340] hover:border-sky-300 active:scale-[0.98]'
                }`}
              >
                {p.word}
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5">
          {shuffledDefs.map((d) => {
            const isMatched = matched.has(d.word);
            const isWrong = wrongDef === d.definition;
            return (
              <button
                key={d.definition}
                disabled={isMatched}
                onClick={() => tapDef(d)}
                className={`w-full text-left text-[10px] leading-snug px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isMatched
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : isWrong
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-sky-300 active:scale-[0.98]'
                }`}
              >
                {d.definition}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Ambient "citizens online" strip — live count from the per-class socket room. */
function ClassPresenceStrip({ online }: { online: number }) {
  if (online <= 0) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-1 bg-emerald-50/40 border-b border-[#E8E4DC]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[9px] tracking-[0.15em] uppercase text-emerald-700/70">
        {online} citizen{online === 1 ? '' : 's'} on shift in your sector
      </span>
    </div>
  );
}

/** Periodic "Citizen-4488 is typing…" indicator — pure client-side timing, never posts. */
function Citizen4488Typing() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = (initial = false) => {
      const hiddenFor = (initial ? 11000 : 24000) + Math.random() * 18000;
      timer = setTimeout(() => {
        if (cancelled) return;
        setTyping(true);
        timer = setTimeout(() => {
          if (cancelled) return;
          setTyping(false);
          loop();
        }, 3500 + Math.random() * 2500);
      }, hiddenFor);
    };
    loop(true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!typing) return null;
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-200/60">
      <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
        <span className="text-[8px] font-bold text-amber-700">4488</span>
      </div>
      <span className="text-[11px] text-amber-700/80 italic">Citizen-4488 is typing</span>
      <span className="text-amber-600 text-[14px] leading-none animate-pulse">&hellip;</span>
    </div>
  );
}

/* ─── Word Highlighting ─────────────────────────────────────────── */

function VocabWord({
  text,
  type,
}: {
  text: string;
  type: 'focus' | 'recent' | 'deep';
}) {
  const [showTip, setShowTip] = useState(false);
  const label = type === 'focus' ? 'Target word' : type === 'recent' ? 'Recent review' : 'Deep review';
  const color = type === 'focus'
    ? 'text-sky-700 font-medium'
    : type === 'recent'
      ? 'text-amber-600'
      : 'text-[#8B8578]';
  const tipBg = type === 'focus'
    ? 'bg-sky-600/20 border-sky-300/30 text-sky-700'
    : type === 'recent'
      ? 'bg-amber-100/20 border-amber-300/30 text-amber-600'
      : 'bg-gray-100/40 border-gray-300/30 text-[#6B7280]';
  const decoration = type === 'deep'
    ? 'underline decoration-dotted decoration-1 underline-offset-2 decoration-gray-400/50'
    : 'underline decoration-dotted decoration-1 underline-offset-2';

  return (
    <span className="relative inline">
      <span
        className={`${color} cursor-help ${decoration}`}
        onClick={() => setShowTip(!showTip)}
      >
        {text}
      </span>
      {showTip && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded text-[9px] font-medium border whitespace-nowrap z-10 ${tipBg}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function HighlightedContent({
  content,
  focusWords,
  recentWords,
  deepReviewWords,
}: {
  content: string;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
}) {
  const wordSets = useMemo(() => {
    const focusSet = new Set(focusWords.map((w) => w.toLowerCase()));
    const recentSet = new Set(recentWords.map((w) => w.toLowerCase()));
    const deepSet = new Set(deepReviewWords.map((w) => w.toLowerCase()));
    return { focusSet, recentSet, deepSet };
  }, [focusWords, recentWords, deepReviewWords]);

  const parts = useMemo(() => {
    const words = content.split(/(\s+)/);
    return words.map((segment, i) => {
      const cleaned = segment.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (!cleaned) return { key: i, text: segment, type: 'plain' as const };
      if (wordSets.focusSet.has(cleaned))
        return { key: i, text: segment, type: 'focus' as const };
      if (wordSets.recentSet.has(cleaned))
        return { key: i, text: segment, type: 'recent' as const };
      if (wordSets.deepSet.has(cleaned))
        return { key: i, text: segment, type: 'deep' as const };
      return { key: i, text: segment, type: 'plain' as const };
    });
  }, [content, wordSets]);

  return (
    <p className="text-[13px] text-[#4B5563] leading-relaxed">
      {parts.map((p) => {
        if (p.type === 'focus' || p.type === 'recent' || p.type === 'deep')
          return <VocabWord key={p.key} text={p.text} type={p.type} />;
        return <span key={p.key}>{p.text}</span>;
      })}
    </p>
  );
}

/* ─── Compose Box ───────────────────────────────────────────────── */

function ComposeBox({
  placeholder,
  onSubmit,
  submitLabel,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  submitLabel: string;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-4 mt-3 mb-2 bg-white rounded-xl border border-[#E8E4DC] shadow-sm p-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-sky-600">YOU</span>
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-[#2C3340] placeholder:text-[#B8B3AA] resize-none outline-none"
            rows={2}
            maxLength={HARMONY_POST_MAX_LENGTH}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#B8B3AA]">
              {text.length}/{HARMONY_POST_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wider bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'POSTING...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ─── Verdict loop (feed_review posts — Junior Compliance Reviewer) ─ */

const VERDICT_RULE_LABEL: Record<string, string> = {
  reg_14c: 'Regulation 14-C — Approved Vocabulary',
  conduct_s1: 'Conduct Code §1 — Collective Voice',
  conduct_sentiment: 'Conduct Code §5 — Approved Sentiment',
};
function activeRulesForWeek(week: number): string[] {
  // Sentiment is active from W1 (praise/fault/condemn spectrum); collective
  // voice (§1) unlocks at W2.
  return week >= 2
    ? ['reg_14c', 'conduct_s1', 'conduct_sentiment']
    : ['reg_14c', 'conduct_sentiment'];
}

/** Reconstruct a forced-happy reaction for a reloaded (already-answered) post. */
function buildClientReaction(
  verdict: 'approve' | 'flag' | null,
  correct: boolean | null,
  correctVerdict: 'approve' | 'flag' | null,
  violations: { rule: string; forbiddenWord: string; approvedWord: string }[] | null,
): string {
  const v = violations?.[0] ?? null;
  const label = v ? VERDICT_RULE_LABEL[v.rule] ?? 'the Approved List' : 'the Approved List';
  if (correct && verdict === 'approve') return 'Approved. Clean compliance, Citizen.';
  if (correct && verdict === 'flag' && v) return `Infraction confirmed under ${label}. "${v.forbiddenWord}" → "${v.approvedWord}".`;
  if (correctVerdict === 'flag' && v) return `Audit notice: this post used "${v.forbiddenWord}". The approved form is "${v.approvedWord}".`;
  return 'This post is compliant, Citizen.';
}

/** Free word selector for the flag modal — no answer hints. */
function FlagTappableWords({ content, selected, onSelect }: { content: string; selected: string | null; onSelect: (w: string) => void }) {
  const tokens = content.split(/(\s+)/);
  const sel = (selected ?? '').trim().replace(/[^a-zA-Z]/g, '').toLowerCase();
  return (
    <p className="text-[13px] text-[#2C3340] leading-relaxed">
      {tokens.map((tok, i) => {
        const cleaned = tok.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (!cleaned) return <span key={i}>{tok}</span>;
        const isSel = cleaned === sel;
        return (
          <span
            key={i}
            onClick={() => onSelect(tok)}
            className={`px-0.5 rounded cursor-pointer transition-colors ${
              isSel ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-300 font-medium' : 'hover:bg-amber-50 active:bg-amber-100'
            }`}
          >
            {tok}
          </span>
        );
      })}
    </p>
  );
}

function FlagModal({
  post,
  onCancel,
  onSubmit,
}: {
  post: HarmonyPost;
  onCancel: () => void;
  onSubmit: (details: { rule: string; word: string; replacement: string }) => void;
}) {
  const week = useHarmonyStore((s) => s.currentWeekNumber);
  const rules = activeRulesForWeek(week);
  const [rule, setRule] = useState<string | null>(rules.length === 1 ? rules[0] : null);
  const [word, setWord] = useState<string | null>(null);
  const [replacement, setReplacement] = useState<string | null>(null);
  const chips = post.flagOptions ?? [];
  const ready = rule && word && replacement;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[#FAFAF7] border border-[#D4CFC6] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#E8E4DC] bg-white">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-rose-700">File an Infraction</p>
          <p className="text-[10px] text-[#8B8578] mt-0.5">Cite the regulation, mark the word, request the approved form.</p>
        </div>
        <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-auto">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-[#8B8578] mb-1">1 · Regulation</p>
            <div className="space-y-1">
              {rules.map((r) => (
                <button
                  key={r}
                  onClick={() => setRule(r)}
                  className={`w-full text-left text-[11px] px-3 py-2 rounded-lg border transition-colors ${
                    rule === r ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-[#D4CFC6]'
                  }`}
                >
                  {VERDICT_RULE_LABEL[r] ?? r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-wider uppercase text-[#8B8578] mb-1">2 · Tap the unapproved word</p>
            <div className="rounded-lg border border-[#E8E4DC] bg-white px-3 py-2">
              <FlagTappableWords content={post.content} selected={word} onSelect={setWord} />
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-wider uppercase text-[#8B8578] mb-1">3 · Approved replacement</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => setReplacement(c)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                    replacement === c ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-[#D4CFC6]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-[#E8E4DC] bg-white flex items-center justify-between gap-2">
          <button onClick={onCancel} className="text-[11px] text-[#8B8578] hover:text-[#4B5563] px-3 py-1.5">
            Cancel
          </button>
          <button
            disabled={!ready}
            onClick={() => ready && onSubmit({ rule: rule!, word: word!, replacement: replacement! })}
            className="text-[11px] font-semibold tracking-wider px-4 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            FILE FLAG
          </button>
        </div>
      </div>
    </div>
  );
}

function VerdictControls({ post }: { post: HarmonyPost }) {
  const submitVerdict = useHarmonyStore((s) => s.submitVerdict);
  const [showFlag, setShowFlag] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = post.verdict != null;
  const verdict = post.verdict ?? null;
  const correct = post.verdictCorrect ?? null;

  const doApprove = async () => {
    if (busy) return;
    setBusy(true);
    const res = await submitVerdict(post.id, 'approve');
    if (res) setReaction(res.pearlNote);
    setBusy(false);
  };
  const doFlag = async (details: { rule: string; word: string; replacement: string }) => {
    setShowFlag(false);
    if (busy) return;
    setBusy(true);
    const res = await submitVerdict(post.id, 'flag', details);
    if (res) setReaction(res.pearlNote);
    setBusy(false);
  };

  if (!answered) {
    return (
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded tracking-wider font-medium">
            PENDING REVIEW
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={doApprove}
              disabled={busy}
              className="text-[11px] px-3 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 font-medium disabled:opacity-40"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowFlag(true)}
              disabled={busy}
              className="text-[11px] px-3 py-1 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 font-medium disabled:opacity-40"
            >
              ✗ Flag
            </button>
          </div>
        </div>
        {showFlag && <FlagModal post={post} onCancel={() => setShowFlag(false)} onSubmit={doFlag} />}
      </div>
    );
  }

  const wrongApprove = verdict === 'approve' && correct === false;
  const badge = correct
    ? verdict === 'approve'
      ? { text: '✓ APPROVED', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
      : { text: '✗ FLAGGED', cls: 'text-rose-700 bg-rose-50 border-rose-200' }
    : wrongApprove
      ? { text: '⚠ AUDIT NOTICE — REVIEWED IN ERROR', cls: 'text-amber-700 bg-amber-50 border-amber-300' }
      : { text: '⚠ REVIEW IN ERROR', cls: 'text-amber-700 bg-amber-50 border-amber-300' };
  const note = reaction ?? buildClientReaction(verdict, correct, post.correctVerdict ?? null, post.violations ?? null);

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <span className={`text-[9px] px-1.5 py-0.5 rounded border tracking-wider font-medium ${badge.cls}`}>{badge.text}</span>
      {note && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <PearlGlyph className="w-4 h-4 mt-0.5" />
          <p className="text-[10px] text-emerald-700/80 italic leading-relaxed">{note}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Post Card (Social Media Style) ────────────────────────────── */

function PostCard({
  post,
  focusWords,
  recentWords,
  deepReviewWords,
  onOpenThread,
  onCensure,
  onDelete,
}: {
  post: HarmonyPost;
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
  onOpenThread: (postId: string) => void;
  onCensure?: (postId: string, action: 'approve' | 'flag', weekNumber: number) => void;
  onDelete?: (postId: string) => void;
}) {
  const is4488 = isCitizen4488(post);
  const [censureAction, setCensureAction] = useState<'approve' | 'flag' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarColor = is4488
    ? 'bg-amber-100 border-amber-300 text-amber-700'
    : post.isOwn
      ? 'bg-sky-100 border-sky-200 text-sky-600'
      : 'bg-gray-100 border-gray-200 text-gray-500';

  const designation = post.isOwn ? 'YOU' : post.designation;
  const initials = designation.slice(0, 3).toUpperCase();

  const handleCensureAction = (action: 'approve' | 'flag') => {
    if (censureAction || !onCensure) return;
    setCensureAction(action);
    onCensure(post.id, action, post.weekNumber ?? 1);
  };

  return (
    <div
      className={`mx-4 mb-2 p-3 rounded-xl border shadow-sm transition-colors ${
        is4488 ? 'bg-amber-50 border-amber-200 harmony-4488-glitch' : 'bg-white border-[#E8E4DC] hover:border-[#D4CFC6]'
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${avatarColor}`}>
          {is4488 ? (
            <span className="text-[9px] font-bold">4488</span>
          ) : (
            <span className="text-[8px] font-bold">{initials}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[13px] font-semibold ${is4488 ? 'text-amber-700' : post.isOwn ? 'text-sky-600' : 'text-[#2C3340]'}`}>
              {designation}
            </span>
            {post.weekNumber != null && (
              <span className="text-[10px] text-[#9CA3AF] bg-gray-100 px-1.5 py-0.5 rounded">
                S{post.weekNumber}
              </span>
            )}
            {post.status === 'pending_review' && (
              <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded tracking-wider font-medium">
                PENDING
              </span>
            )}
            {post.status === 'flagged' && (
              <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded tracking-wider font-medium">
                FLAGGED
              </span>
            )}
            {post.isNew && (
              <span className="text-[8px] text-white bg-sky-500 px-1.5 py-0.5 rounded-full tracking-wider font-bold">
                NEW
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF] ml-auto">
              {formatTimestamp(post.createdAt)}
            </span>
          </div>

          {/* Post body */}
          <HighlightedContent
            content={post.content}
            focusWords={focusWords}
            recentWords={recentWords}
            deepReviewWords={deepReviewWords}
          />

          {/* PEARL note */}
          {post.pearlNote && (
            <div className="mt-2 pl-2 border-l-2 border-emerald-300">
              <p className="text-[10px] text-emerald-700 italic">
                PEARL: {post.pearlNote}
              </p>
            </div>
          )}

          {/* Verdict loop — inline Approve/Flag for Junior Compliance Reviewer posts */}
          {post.postType === 'feed_review' && <VerdictControls post={post} />}

          {/* Citizen-4488 interaction */}
          {is4488 && !post.isOwn && onCensure && (
            <div className="mt-2 flex items-center gap-2">
              {censureAction ? (
                <span className={`text-[10px] tracking-wider font-semibold ${
                  censureAction === 'approve' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {censureAction === 'approve' ? 'APPROVED' : 'FLAGGED FOR REVIEW'}
                </span>
              ) : (
                <>
                  <span className="text-[9px] text-[#9CA3AF] tracking-wider mr-1">COMPLIANCE:</span>
                  <button
                    onClick={() => handleCensureAction('approve')}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors active:scale-95 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleCensureAction('flag')}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors active:scale-95 font-medium"
                  >
                    Flag
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4">
            <button
              onClick={() => onOpenThread(post.id)}
              className="text-[11px] text-[#9CA3AF] hover:text-sky-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              {post.replyCount > 0 ? post.replyCount : ''}
            </button>

            {/* Delete — own posts only */}
            {post.isOwn && onDelete && (
              confirmDelete ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-rose-700/60">Delete?</span>
                  <button
                    onClick={() => { onDelete(post.id); setConfirmDelete(false); }}
                    className="text-[10px] text-rose-700 hover:text-rose-700/80 transition-colors active:scale-95"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[11px] text-[#B8B3AA] hover:text-rose-700/60 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Thread View ───────────────────────────────────────────────── */

function ThreadView({
  focusWords,
  recentWords,
  deepReviewWords,
}: {
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
}) {
  const {
    posts,
    selectedPostId,
    replies,
    repliesLoading,
    closeThread,
    submitReply,
  } = useHarmonyStore();

  const parentPost = posts.find((p) => p.id === selectedPostId);
  if (!parentPost) return null;

  return (
    <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#EFEBE4] border-b border-[#D4CFC6]">
        <button
          onClick={closeThread}
          className="text-xs text-[#4B5563] hover:text-sky-600 transition-colors flex items-center gap-1 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
          Thread
        </span>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Parent post */}
        <div className="bg-white rounded-xl border border-[#E8E4DC] shadow-sm p-3 mb-3">
          <div className="flex gap-3">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
              isCitizen4488(parentPost) ? 'bg-amber-100 border-amber-300' : parentPost.isOwn ? 'bg-sky-100 border-sky-200' : 'bg-gray-100 border-gray-200'
            }`}>
              <span className={`text-[8px] font-bold ${isCitizen4488(parentPost) ? 'text-amber-700' : parentPost.isOwn ? 'text-sky-600' : 'text-gray-500'}`}>
                {(parentPost.isOwn ? 'YOU' : parentPost.designation).slice(0, 4)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-[#2C3340]">
                  {parentPost.isOwn ? 'YOU' : parentPost.designation}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {formatTimestamp(parentPost.createdAt)}
                </span>
              </div>
              <HighlightedContent content={parentPost.content} focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />
            </div>
          </div>
        </div>

        {/* Replies */}
        {repliesLoading && (
          <div className="text-xs text-[#9CA3AF] animate-pulse text-center py-6 tracking-wider">
            LOADING...
          </div>
        )}

        {replies.map((reply) => (
          <div key={reply.id} className="bg-white rounded-lg border border-[#E8E4DC] shadow-sm p-3 mb-2 ml-6">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <span className="text-[7px] font-bold text-gray-500">
                  {reply.designation.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-[#2C3340]">{reply.designation}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{formatTimestamp(reply.createdAt)}</span>
                </div>
                <HighlightedContent content={reply.content} focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />
              </div>
            </div>
          </div>
        ))}

        {!repliesLoading && replies.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] text-center py-6 tracking-wider">
            No replies yet
          </div>
        )}
      </div>

      <ComposeBox
        placeholder="Write a reply..."
        onSubmit={submitReply}
        submitLabel="REPLY"
      />
    </div>
  );
}

/* ─── Censure Content with Error Highlight ─────────────────────── */

function CensureContentHighlight({
  content,
  errorWord,
  postType,
}: {
  content: string;
  errorWord: string;
  postType: string;
}) {
  if (!errorWord) {
    return <p className="text-[13px] text-[#4B5563] leading-relaxed">{content}</p>;
  }

  // For replace items, look for [word] brackets
  if (postType === 'censure_replace') {
    const bracketPattern = new RegExp(`\\[${errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
    const match = content.match(bracketPattern);
    if (match) {
      const idx = content.indexOf(match[0]);
      return (
        <p className="text-[13px] text-[#4B5563] leading-relaxed">
          {content.slice(0, idx)}
          <span className="px-1.5 py-0.5 rounded bg-amber-100/15 text-amber-600 font-medium border border-amber-300/25">
            {match[0]}
          </span>
          {content.slice(idx + match[0].length)}
        </p>
      );
    }
  }

  // For grammar/vocab, highlight the error word in the sentence
  const escapedWord = errorWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordPattern = new RegExp(`(\\b${escapedWord}\\b)`, 'i');
  const parts = content.split(wordPattern);

  if (parts.length === 1) {
    // Word not found as whole word — show content as-is
    return <p className="text-[13px] text-[#4B5563] leading-relaxed">{content}</p>;
  }

  const highlightColor = postType === 'censure_grammar'
    ? 'bg-rose-700/15 text-rose-700 border-rose-700/25'
    : 'bg-sky-600/15 text-sky-700 border-sky-300/25';

  return (
    <p className="text-[13px] text-[#4B5563] leading-relaxed">
      {parts.map((part, i) =>
        wordPattern.test(part) ? (
          <span key={i} className={`px-1 py-0.5 rounded font-medium border ${highlightColor}`}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/* ─── Tappable Words (Redact-a-Word) ───────────────────────────── */

/** Renders the post content as a sequence of tappable word tokens.
 *  Used by censure_redact items where the student taps the unapproved
 *  word inside the sentence instead of choosing from MCQ options. */
function TappableWords({
  content,
  selectedWord,
  onSelect,
  isReviewed,
  errorWord,
  wasCorrect,
}: {
  content: string;
  selectedWord: string | null;
  onSelect: (word: string) => void;
  isReviewed: boolean;
  errorWord: string;
  wasCorrect: boolean | null;
}) {
  // Split on whitespace, keeping the whitespace tokens as separate parts
  // so we can render them between word buttons without losing spacing.
  const tokens = content.split(/(\s+)/);
  const errorLower = errorWord.trim().toLowerCase();
  const selectedClean = (selectedWord ?? '').trim().replace(/[^a-zA-Z]/g, '').toLowerCase();
  return (
    <p className="text-[13px] text-[#4B5563] leading-relaxed">
      {tokens.map((tok, i) => {
        const cleaned = tok.replace(/[^a-zA-Z]/g, '').toLowerCase();
        // Whitespace / punctuation-only — render as plain text.
        if (!cleaned) return <span key={i}>{tok}</span>;
        const isThisError = cleaned === errorLower;
        const isThisSelected = cleaned === selectedClean;
        let cls = 'px-0.5 rounded transition-colors';
        if (isReviewed) {
          if (isThisError) {
            // The correct answer — always shown green after review.
            cls += ' bg-emerald-100 text-emerald-800 border-b-2 border-emerald-500 font-medium';
          } else if (isThisSelected && !wasCorrect) {
            // Their wrong pick — red strike.
            cls += ' bg-rose-100 text-rose-800 line-through';
          }
        } else if (isThisSelected) {
          cls += ' bg-sky-100 text-sky-800 ring-2 ring-sky-300 font-medium';
        } else {
          cls += ' cursor-pointer hover:bg-amber-50 active:bg-amber-100';
        }
        return (
          <span
            key={i}
            className={cls}
            onClick={() => !isReviewed && onSelect(tok)}
          >
            {tok}
          </span>
        );
      })}
    </p>
  );
}

/* ─── Censure Queue Item ────────────────────────────────────────── */

function CensureCard({ item }: { item: CensureItem }) {
  const { respondToCensure } = useHarmonyStore();
  const lane = useStudentStore((s) => s.user?.lane ?? 2);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [result, setResult] = useState<CensureResponseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showMandarin, setShowMandarin] = useState(false);

  const data = item.censureData;

  // Shuffle options once per item (Fisher-Yates), stored in ref for stability.
  // Skipped for censure_triage — bins are taught in fixed order (Approve / Wellness / Flag).
  const shuffleRef = useRef<{ options: string[]; mapping: number[] } | null>(null);
  if (!shuffleRef.current && data) {
    const indices = data.options.map((_, i) => i);
    if (item.postType !== 'censure_triage') {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }
    shuffleRef.current = {
      options: indices.map(i => data.options[i]),
      mapping: indices, // mapping[displayIdx] = originalIdx
    };
  }

  if (!data) return null;

  const shuffledOptions = shuffleRef.current!.options;
  const indexMapping = shuffleRef.current!.mapping;

  const typeLabel =
    item.postType === 'censure_grammar' ? 'GRAMMAR CHECK'
    : item.postType === 'censure_vocab' ? 'VOCABULARY CHECK'
    : item.postType === 'censure_redact' ? 'WORD REDACTION'
    : item.postType === 'censure_triage' ? 'QUEUE TRIAGE'
    : 'WORD REPLACEMENT';

  const typeColor =
    item.postType === 'censure_grammar' ? 'text-rose-700 border-rose-700/20 bg-rose-100/[0.06]'
    : item.postType === 'censure_vocab' ? 'text-sky-700 border-sky-300/20 bg-sky-600/[0.08]'
    : item.postType === 'censure_redact' ? 'text-rose-700 border-rose-700/20 bg-rose-100/[0.06]'
    : item.postType === 'censure_triage' ? 'text-emerald-700 border-emerald-300/20 bg-emerald-100/[0.06]'
    : 'text-amber-600 border-amber-300/20 bg-amber-100/[0.06]';

  const handleSubmit = async () => {
    if (submitting) return;
    // Redact uses word-match instead of index-match.
    if (item.postType === 'censure_redact') {
      if (!selectedWord) return;
      setSubmitting(true);
      const res = await respondToCensure(item.id, 'answer', -1, selectedWord);
      if (res) { setResult(res); setShowOverlay(true); }
      setSubmitting(false);
      return;
    }
    if (selectedIdx === null) return;
    setSubmitting(true);
    // Map shuffled display index back to original index for backend validation
    const originalIdx = indexMapping[selectedIdx];
    const res = await respondToCensure(item.id, 'answer', originalIdx);
    if (res) {
      setResult(res);
      setShowOverlay(true);
    }
    setSubmitting(false);
  };

  const isReviewed = item.reviewed || result !== null;

  return (
    <div className={`mx-4 mb-3 rounded-xl border border-[#E8E4DC] overflow-hidden ${
      isReviewed
        ? result?.isCorrect || item.wasCorrect
          ? 'border-green-500/20 bg-green-500/[0.03]'
          : 'border-rose-700/20 bg-rose-100/[0.03]'
        : 'bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-medium tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
            {typeLabel}
          </span>
          {item.weekNumber && (
            <span className="text-[10px] text-[#B8B3AA]">Shift {item.weekNumber}</span>
          )}
          {item.isReview && (
            <span className="text-[9px] font-medium tracking-[0.1em] text-[#8B8578] bg-gray-100/60 px-1.5 py-0.5 rounded-full border border-gray-200/30">
              REVIEW
            </span>
          )}
        </div>
        {isReviewed && (
          <span className={`text-[10px] font-medium tracking-wider ${
            result?.isCorrect || item.wasCorrect ? 'text-green-400' : 'text-rose-700'
          }`}>
            {result?.isCorrect || item.wasCorrect ? 'CORRECT' : 'INCORRECT'}
          </span>
        )}
      </div>

      {/* Post content — redact uses tappable words (selector lives inside the
          post body); other types use the highlight-the-error renderer. */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#6B7280]">
              {item.designation.slice(0, 3)}
            </span>
          </div>
          <span className="text-[12px] text-[#4B5563]">{item.designation}</span>
        </div>
        {item.postType === 'censure_redact' ? (
          <TappableWords
            content={item.content}
            selectedWord={selectedWord}
            onSelect={setSelectedWord}
            isReviewed={isReviewed}
            errorWord={data.errorWord ?? ''}
            wasCorrect={result?.isCorrect ?? item.wasCorrect ?? null}
          />
        ) : (
          <CensureContentHighlight
            content={item.content}
            errorWord={data.errorWord || data.blankWord || ''}
            postType={item.postType}
          />
        )}
      </div>

      {/* Question / options */}
      <div className="px-4 pb-3 space-y-2">
        <p className="text-[11px] text-[#6B7280] tracking-wider uppercase">
          {item.postType === 'censure_grammar' && (
            <>Find the correct form of "<span className="text-rose-700 font-medium normal-case">{data.errorWord}</span>":</>
          )}
          {item.postType === 'censure_vocab' && (
            <>What does "<span className="text-sky-700 font-medium normal-case">{data.errorWord}</span>" actually mean?</>
          )}
          {item.postType === 'censure_replace' && (
            <>Replace "<span className="text-amber-600 font-medium normal-case">{data.blankWord || '...'}</span>" with the correct word:</>
          )}
          {item.postType === 'censure_redact' && (
            <>
              Tap the unapproved word in the post above.
              {data.regulation && (
                <span className="normal-case text-[#9CA3AF]"> ({data.regulation})</span>
              )}
            </>
          )}
          {item.postType === 'censure_triage' && (
            <>Sort this submission to the correct queue:</>
          )}
        </p>

        {/* Selector — redact has none (selection happens inside the post body),
            triage is a vertical bin picker, others are 2-column MCQ. */}
        {item.postType === 'censure_redact' ? null : item.postType === 'censure_triage' ? (
          <div className="grid grid-cols-1 gap-1.5">
            {shuffledOptions.map((opt, displayIdx) => {
              const originalIdx = indexMapping[displayIdx];
              const isCorrectOption = originalIdx === data.correctIndex;
              const isSelected = selectedIdx === displayIdx;

              if (isReviewed) {
                const wasRight = result?.isCorrect || item.wasCorrect;
                let optionStyle: string;
                if (isCorrectOption) {
                  optionStyle = 'border-green-500/40 bg-green-500/10 text-green-700';
                } else if (isSelected && !wasRight) {
                  optionStyle = 'border-rose-700/40 bg-rose-700/10 text-rose-700';
                } else {
                  optionStyle = 'border-[#E8E4DC] bg-gray-50 text-[#9CA3AF]';
                }
                return (
                  <div
                    key={displayIdx}
                    className={`text-left px-3 py-2.5 rounded-lg text-[12px] font-medium border ${optionStyle} flex items-center gap-1.5`}
                  >
                    {isCorrectOption && (
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                    {isSelected && !wasRight && !isCorrectOption && (
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                    {opt}
                  </div>
                );
              }

              return (
                <button
                  key={displayIdx}
                  onClick={() => setSelectedIdx(displayIdx)}
                  className={`text-left px-3 py-2.5 rounded-lg text-[12px] font-medium border transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-emerald-300/60 bg-emerald-50 text-emerald-800'
                      : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-emerald-300/40 hover:bg-emerald-50/30'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {shuffledOptions.map((opt, displayIdx) => {
              const originalIdx = indexMapping[displayIdx];
              const isCorrectOption = originalIdx === data.correctIndex;
              const isSelected = selectedIdx === displayIdx;

              // After review: show correct/incorrect markings
              if (isReviewed) {
                const wasRight = result?.isCorrect || item.wasCorrect;
                let optionStyle: string;
                if (isCorrectOption) {
                  optionStyle = 'border-green-500/40 bg-green-500/10 text-green-400';
                } else if (isSelected && !wasRight) {
                  optionStyle = 'border-rose-700/40 bg-rose-700/10 text-rose-700';
                } else {
                  optionStyle = 'border-[#E8E4DC] bg-gray-50 text-[#9CA3AF]';
                }
                return (
                  <div
                    key={displayIdx}
                    className={`text-left px-3 py-2 rounded-lg text-[12px] border ${optionStyle} flex items-center gap-1.5`}
                  >
                    {isCorrectOption && (
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                    {isSelected && !wasRight && !isCorrectOption && (
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    )}
                    {opt}
                  </div>
                );
              }

              // Before review: interactive buttons
              return (
                <button
                  key={displayIdx}
                  onClick={() => setSelectedIdx(displayIdx)}
                  className={`text-left px-3 py-2 rounded-lg text-[12px] border transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-sky-300/40 bg-sky-600/10 text-sky-700'
                      : 'border-[#E8E4DC] bg-white text-[#4B5563] hover:border-[#D4CFC6]'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Submit button — only before review */}
        {!isReviewed && (
          <button
            onClick={handleSubmit}
            disabled={
              (item.postType === 'censure_redact' ? !selectedWord : selectedIdx === null)
              || submitting
            }
            className="w-full mt-1 py-2 rounded-lg text-[11px] font-medium tracking-wider bg-sky-600/10 text-sky-700 border border-sky-300/20 hover:bg-sky-600/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            {submitting ? 'CHECKING...' : 'SUBMIT REVIEW'}
          </button>
        )}
      </div>

      {/* Explanation — only after review */}
      {isReviewed && (
        <div className="px-4 pb-3">
          <div className={`rounded-lg px-3 py-2 border ${
            result?.isCorrect || item.wasCorrect
              ? 'border-green-500/15 bg-green-500/[0.05]'
              : 'border-rose-200/15 bg-rose-100/[0.05]'
          }`}>
            <p className="text-[11px] text-[#4B5563]">
              {result?.explanation || data.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Lane-aware bilingual study card — Lane 1 always shows Mandarin,
          Lane 2 tap-to-reveal, Lane 3 English-only. Mirrors RemediationModule
          so Censure Queue meets the same A2-B1 doctrine. */}
      {result?.studyCard && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-[#2C3340] font-ibm-mono">
                {result.studyCard.word}
              </span>
              {result.studyCard.phonetic && (
                <span className="text-[10px] text-sky-700 font-ibm-mono">
                  /{result.studyCard.phonetic}/
                </span>
              )}
            </div>
            {result.studyCard.translationZhTw && lane === 1 && (
              <div>
                <p className="text-[9px] font-ibm-mono text-sky-700 tracking-wider uppercase mb-0.5">中文</p>
                <p className="text-[12px] text-[#2C3340]">{result.studyCard.translationZhTw}</p>
              </div>
            )}
            {result.studyCard.translationZhTw && lane === 2 && (
              <div>
                {showMandarin ? (
                  <>
                    <p className="text-[9px] font-ibm-mono text-sky-700 tracking-wider uppercase mb-0.5">中文</p>
                    <p className="text-[12px] text-[#2C3340]">{result.studyCard.translationZhTw}</p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMandarin(true)}
                    className="text-[10px] text-sky-700 underline hover:text-sky-800"
                  >
                    Show 中文
                  </button>
                )}
              </div>
            )}
            {result.studyCard.exampleSentence && lane !== 3 && (
              <div>
                <p className="text-[9px] font-ibm-mono text-sky-700 tracking-wider uppercase mb-0.5">Example</p>
                <p className="text-[11px] text-[#4B5563] italic leading-snug">
                  {result.studyCard.exampleSentence}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Neon result overlay */}
      {showOverlay && result && (
        <ResultOverlay
          isCorrect={result.isCorrect}
          onDone={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}

/* ─── Censure Queue Tab ─────────────────────────────────────────── */

function CensureQueue() {
  const { censureItems, censureStats, censureLoading, loadCensureQueue, harmonyCredits } = useHarmonyStore();

  useEffect(() => {
    void loadCensureQueue();
  }, [loadCensureQueue]);

  const unreviewed = censureItems.filter(i => !i.reviewed);
  const reviewed = censureItems.filter(i => i.reviewed);
  const correctCount = reviewed.filter(i => i.wasCorrect).length;
  const queueCleared = censureStats.total > 0 && unreviewed.length === 0;

  if (censureLoading && censureItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-xs text-sky-700/50 animate-pulse tracking-wider">
          LOADING CENSURE QUEUE...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto py-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="text-[10px] text-[#9CA3AF] tracking-[0.15em] uppercase">
          Documents for Review
        </span>
        <span className="text-[11px] text-sky-700/60 font-medium">
          {censureStats.completed}/{censureStats.total} reviewed
        </span>
      </div>

      {/* Progress bar (clamped — completed can momentarily lead total on re-answer) */}
      {censureStats.total > 0 && (
        <div className="mx-4 mb-4 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-200/40 transition-all duration-500"
            style={{ width: `${Math.min(100, (censureStats.completed / censureStats.total) * 100)}%` }}
          />
        </div>
      )}

      {/* Shift-end summary — appears once the queue is fully cleared */}
      {queueCleared && (
        <ShiftComplianceReport reviewed={reviewed.length} correct={correctCount} credits={harmonyCredits} />
      )}

      {/* Unreviewed items */}
      {unreviewed.map((item) => (
        <CensureCard key={item.id} item={item} />
      ))}

      {/* Reviewed items (collapsed) */}
      {reviewed.length > 0 && (
        <div className="px-4 py-2 mt-2">
          <p className="text-[10px] text-[#B8B3AA] tracking-[0.15em] uppercase mb-2">
            Completed ({reviewed.length})
          </p>
          {reviewed.map((item) => (
            <CensureCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {censureItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No documents pending review.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            New items appear as you progress through shifts.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Onboarding Briefing ──────────────────────────────────────── */

const HARMONY_BRIEFING_KEY = 'harmony_briefing_dismissed';

function HarmonyOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-3 rounded-xl border border-[#E8E4DC] bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#E8E4DC] bg-sky-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-sky-700">
            Ministry Orientation — Harmony Protocol
          </span>
          <button
            onClick={onDismiss}
            className="text-[9px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors tracking-wider"
          >
            DISMISS
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[12px] text-[#4B5563] leading-relaxed">
          Welcome to <span className="text-sky-700 font-medium">Harmony</span>, the Ministry-monitored community network. As a Clarity Associate, you have two duties here:
        </p>
        <div className="space-y-1.5 pl-2 border-l-2 border-sky-200">
          <div>
            <span className="text-[11px] text-sky-700/80 font-medium">Feed</span>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Read citizen posts and practice your target vocabulary. You may write your own posts for Ministry review. Words from your current shift are highlighted.
            </p>
          </div>
          <div>
            <span className="text-[11px] text-amber-600/80 font-medium">Censure Queue</span>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Review flagged citizen posts for language errors — grammar mistakes, vocabulary misuse, and incorrect word choices. Select the correct answer to clear each item.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-[#9CA3AF] italic">
          P.E.A.R.L. monitors all community activity. Proceed with clarity.
        </p>
      </div>
    </div>
  );
}

/* ─── Locked State ──────────────────────────────────────────────── */

function HarmonyLocked({ message }: { message: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#B8B3AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h3 className="font-special-elite text-base text-[#4B5563] tracking-wider mb-2">
        Harmony Restricted
      </h3>
      <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed max-w-xs">
        {message || 'Complete your first shift to gain Harmony access. The community awaits your contributions.'}
      </p>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function HarmonyApp() {
  const {
    posts,
    currentWeekNumber,
    focusWords,
    recentWords,
    deepReviewWords,
    loading,
    error,
    locked,
    lockMessage,
    selectedPostId,
    activeTab,
    setTab,
    loadPosts,
    submitPost,
    openThread,
    censurePost: _censurePost,
    deletePost,
    pearlAnnotations,
    setHasNewContent,
    trackCitizen4488Action,
  } = useHarmonyStore();

  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem(HARMONY_BRIEFING_KEY),
  );

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(HARMONY_BRIEFING_KEY, '1');
    setShowOnboarding(false);
  }, []);

  const { loadCensureQueue, censureStats, harmonyCredits, loadCredits, dismissPearlAnnotations, classOnline, auditPairs } = useHarmonyStore();
  const pairId = useStudentStore((s) => s.user?.pairId ?? s.user?.id ?? null);

  useEffect(() => {
    void loadPosts();
    void loadCensureQueue();
    loadCredits(pairId);
    // Ask the server for the current class online count (live presence strip).
    getSocket()?.emit('student:presence-request');
    // Clear new content flag when user opens Harmony
    setHasNewContent(false);
  }, [loadPosts, loadCensureQueue, loadCredits, pairId, setHasNewContent]);

  // Per-tab NEW indicators — lit when a tab holds posts unseen since last visit.
  const feedHasNew = posts.some((p) => (p.postType === 'feed' || p.postType === 'feed_review' || !p.postType) && p.isNew);
  const ministryHasNew = posts.some((p) => (p.postType === 'bulletin' || p.postType === 'pearl_tip') && p.isNew);
  const sectorHasNew = posts.some((p) => (p.postType === 'community_notice' || p.postType === 'sector_report') && p.isNew);

  const handleCensure = useCallback(
    (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => {
      void _censurePost(postId, action, weekNumber);
      // Track 4488 actions for PEARL annotations
      trackCitizen4488Action(postId, action);
    },
    [_censurePost, trackCitizen4488Action],
  );

  // Thread view
  if (selectedPostId) {
    return <ThreadView focusWords={focusWords} recentWords={recentWords} deepReviewWords={deepReviewWords} />;
  }

  // Locked state
  if (locked) {
    return (
      <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
        <HarmonyHeader currentWeekNumber={0} />
        <HarmonyLocked message={lockMessage} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-full bg-[#F5F1EB]">
      {/* Header */}
      <HarmonyHeader currentWeekNumber={currentWeekNumber} credits={harmonyCredits} />

      {/* First-time onboarding */}
      {showOnboarding && <HarmonyOnboarding onDismiss={dismissOnboarding} />}

      {/* Tabs — government portal navigation */}
      <HarmonyTabs
        activeTab={activeTab}
        setTab={setTab}
        censureStats={censureStats}
        ministryCount={posts.filter(p => p.postType === 'bulletin' || p.postType === 'pearl_tip').length}
        newFlags={{ feed: feedHasNew, ministry: ministryHasNew, sector: sectorHasNew }}
      />

      {/* Tab content */}
      {activeTab === 'feed' && (
        <>
          <PropagandaTicker week={currentWeekNumber} />
          <ClassPresenceStrip online={classOnline} />
          <HarmonyGoalBanner
            remaining={Math.max(0, censureStats.total - censureStats.completed)}
            total={censureStats.total}
            credits={harmonyCredits}
          />
          <DailyVocabAudit pairs={auditPairs} week={currentWeekNumber} pairId={pairId} />
          <FeedTab
            posts={posts.filter(p => p.postType === 'feed' || p.postType === 'feed_review' || !p.postType)}
          focusWords={focusWords}
          recentWords={recentWords}
          deepReviewWords={deepReviewWords}
          currentWeekNumber={currentWeekNumber}
          loading={loading}
          error={error}
          onSubmitPost={submitPost}
          onOpenThread={openThread}
          onCensure={handleCensure}
            onDelete={deletePost}
          />
        </>
      )}
      {activeTab === 'ministry' && (
        <MinistryTab
          posts={posts.filter(p => p.postType === 'bulletin' || p.postType === 'pearl_tip')}
          loading={loading}
        />
      )}
      {activeTab === 'sector' && (
        <SectorTab
          posts={posts.filter(p => p.postType === 'community_notice' || p.postType === 'sector_report')}
          loading={loading}
          onOpenThread={openThread}
        />
      )}
      {activeTab === 'censure' && (
        <CensureQueue />
      )}
      {activeTab === 'archives' && (
        <ArchivesTab />
      )}

      {/* PEARL ambient annotations — pinned at bottom of feed, dismissible */}
      {pearlAnnotations.length > 0 && activeTab === 'feed' && (
        <div className="border-t border-emerald-200/50 bg-emerald-50/30 px-4 py-2">
          <div className="flex items-start gap-2">
            <PearlGlyph className="w-5 h-5 mt-0.5" />
            <div className="flex-1 min-w-0">
              {pearlAnnotations.map((a, i) => (
                <p key={i} className="text-[10px] text-emerald-700/80 italic leading-relaxed py-0.5">
                  <span className="font-bold not-italic tracking-wider text-emerald-600 mr-1">P.E.A.R.L.</span>
                  {a.message}
                </p>
              ))}
            </div>
            <button
              onClick={dismissPearlAnnotations}
              className="shrink-0 px-1 text-[13px] leading-none text-emerald-600/50 hover:text-emerald-700 transition-colors"
              aria-label="Dismiss PEARL note"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function HarmonyHeader({ currentWeekNumber, credits = 0 }: { currentWeekNumber: number; credits?: number }) {
  return (
    <div className="bg-gradient-to-b from-[#E8E4DC] to-[#F5F1EB] border-b border-[#D4CFC6] px-4 py-3">
      <div className="flex items-center gap-3">
        <img
          src="/images/harmony-icon.png"
          alt="Harmony"
          className="w-10 h-10 object-contain"
        />
        <div className="flex-1">
          <h2 className="text-[18px] font-semibold text-[#2C3340] tracking-wide" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Harmony
          </h2>
          <p className="text-[9px] text-[#8B8578] tracking-[0.2em] uppercase">
            Content Moderation Console
          </p>
        </div>
        {currentWeekNumber > 0 && (
          <div className="flex items-center gap-1.5">
            {/* Harmony Credits — in-world compliance reward balance */}
            <div
              className="flex items-center gap-1 bg-amber-50 rounded-full px-2.5 py-1 border border-amber-200"
              title="Harmony Credits — earned for accurate review work"
            >
              <span className="text-[9px] font-bold text-amber-600 tracking-wider">HC</span>
              <span className="text-[11px] font-semibold text-amber-700 font-mono tabular-nums">{credits}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-[#D4CFC6]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-medium text-[#4B5563]">Shift {currentWeekNumber}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Feed Tab ──────────────────────────────────────────────────── */

function FeedTab({
  posts,
  focusWords,
  recentWords,
  deepReviewWords,
  currentWeekNumber,
  loading,
  error,
  onDelete,
  onSubmitPost,
  onOpenThread,
  onCensure,
}: {
  posts: HarmonyPost[];
  focusWords: string[];
  recentWords: string[];
  deepReviewWords: string[];
  currentWeekNumber: number;
  loading: boolean;
  error: string | null;
  onSubmitPost: (content: string) => Promise<void>;
  onOpenThread: (postId: string) => void;
  onCensure: (postId: string, action: 'approve' | 'correct' | 'flag', weekNumber: number) => void;
  onDelete: (postId: string) => void;
}) {
  const [showVocab, setShowVocab] = useState(false);

  // ── Live feed drip (M2) ──────────────────────────────────────────
  // Hold back the newest few posts and let them "arrive" slowly so the feed
  // feels alive; a "↑ N NEW POST" pill nudges the student to scroll up.
  //
  // INDEX-based (not object-based): `displayed` is derived from the CURRENT
  // posts each render, so filing a verdict (which mutates a post in place) only
  // updates that card — it never reshuffles the list. The drip resets ONLY when
  // the set of post IDs actually changes (a real feed reload / shift change),
  // not when a post object mutates. Content is never lost (held posts auto-reveal).
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const holdCount = posts.length >= 6 ? 3 : posts.length >= 4 ? 2 : posts.length >= 3 ? 1 : 0;
  const [revealedCount, setRevealedCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const postIdsKey = useMemo(() => posts.map((p) => p.id).join('|'), [posts]);

  useEffect(() => {
    setRevealedCount(0);
    setNewCount(0);
    if (holdCount === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let revealed = 0;
    const tick = () => {
      if (cancelled) return;
      revealed += 1;
      setRevealedCount(revealed);
      setNewCount((c) => c + 1);
      if (revealed < holdCount) {
        timer = setTimeout(tick, 30000 + Math.random() * 45000); // subsequent: 30–75s, randomized
      }
    };
    timer = setTimeout(tick, 15000 + Math.random() * 25000); // first arrival: 15–40s
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIdsKey, holdCount]);

  // Newest `holdCount - revealedCount` posts stay hidden; the rest show in their
  // natural (server-sorted) order. A revealed post simply un-hides in place.
  const displayed = posts.slice(Math.max(0, holdCount - revealedCount));

  const handleSeeNew = () => {
    setNewCount(0);
    feedScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Vocab chips (collapsible, 3-tier) */}
      {(focusWords.length > 0 || recentWords.length > 0 || deepReviewWords.length > 0) && (
        <div className="border-b border-[#E8E4DC]">
          <button
            onClick={() => setShowVocab(!showVocab)}
            className="w-full flex items-center justify-between px-4 py-2 group"
          >
            <span className="text-[10px] text-sky-700/50 tracking-[0.2em] uppercase">
              Shift {currentWeekNumber} Vocabulary
            </span>
            <span className="text-[9px] text-[#B8B3AA] group-hover:text-[#6B7280] transition-colors">
              {showVocab ? 'HIDE' : 'SHOW'}
            </span>
          </button>
          {showVocab && (
            <div className="px-4 pb-3 space-y-2">
              {focusWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Focus</p>
                  <div className="flex flex-wrap gap-1">
                    {focusWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-sky-300/20 text-sky-700/70 bg-sky-200/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {recentWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Recent</p>
                  <div className="flex flex-wrap gap-1">
                    {recentWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300/20 text-amber-600/70 bg-amber-100/[0.05]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {deepReviewWords.length > 0 && (
                <div>
                  <p className="text-[9px] text-[#9CA3AF] tracking-[0.15em] uppercase mb-1">Deep Review</p>
                  <div className="flex flex-wrap gap-1">
                    {deepReviewWords.map((w) => (
                      <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-300/15 text-[#8B8578]/60 bg-gray-100/[0.03]">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compose */}
      <ComposeBox
        placeholder="Share your thoughts with the community..."
        onSubmit={onSubmitPost}
        submitLabel="POST"
      />

      {/* Feed */}
      <div ref={feedScrollRef} className="flex-1 overflow-auto relative">
        {/* New-posts pill — appears as held-back posts drip in */}
        {newCount > 0 && (
          <div className="sticky top-2 z-[5] flex justify-center pointer-events-none">
            <button
              onClick={handleSeeNew}
              className="pointer-events-auto px-3 py-1 rounded-full bg-sky-600 text-white text-[10px] font-semibold tracking-wider shadow-md hover:bg-sky-700 active:scale-95 transition-all"
            >
              ↑ {newCount} NEW POST{newCount === 1 ? '' : 'S'}
            </button>
          </div>
        )}

        {/* Ambient: Citizen-4488 occasionally "typing…" */}
        <Citizen4488Typing />

        {loading && posts.length === 0 && (
          <div className="text-xs text-sky-700/50 animate-pulse text-center py-8 tracking-wider">
            LOADING FEED...
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-700/60 text-center py-2 tracking-wider">
            {error.toUpperCase()}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] text-center py-8 tracking-wider">
            No posts yet. Be the first to contribute.
          </div>
        )}

        {displayed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            focusWords={focusWords}
            recentWords={recentWords}
            deepReviewWords={deepReviewWords}
            onOpenThread={onOpenThread}
            onCensure={onCensure}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

/* ─── Tab Bar ───────────────────────────────────────────────────── */

function HarmonyTabs({
  activeTab,
  setTab,
  censureStats,
  ministryCount,
  newFlags,
}: {
  activeTab: string;
  setTab: (tab: 'feed' | 'ministry' | 'sector' | 'censure' | 'archives') => void;
  censureStats: { total: number; completed: number };
  ministryCount: number;
  newFlags?: { feed: boolean; ministry: boolean; sector: boolean };
}) {
  const tabs: { key: 'feed' | 'ministry' | 'sector' | 'censure' | 'archives'; label: string; badge?: number; badgeColor?: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'ministry', label: 'Ministry', badge: ministryCount > 0 ? ministryCount : undefined, badgeColor: 'bg-sky-500' },
    { key: 'sector', label: 'Sector' },
    { key: 'censure', label: 'Review', badge: censureStats.total - censureStats.completed > 0 ? censureStats.total - censureStats.completed : undefined, badgeColor: 'bg-rose-500' },
    { key: 'archives', label: 'Archives' },
  ];

  return (
    <div className="flex gap-1 px-3 py-2 bg-[#EFEBE4] border-b border-[#D4CFC6]">
      {tabs.map((tab) => {
        const hasNew = !!newFlags && activeTab !== tab.key && (
          tab.key === 'feed' ? newFlags.feed
          : tab.key === 'ministry' ? newFlags.ministry
          : tab.key === 'sector' ? newFlags.sector
          : false
        );
        return (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold tracking-[0.08em] uppercase transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#2C3340] shadow-sm border border-[#D4CFC6]'
                : 'text-[#8B8578] hover:text-[#4B5563] hover:bg-white/40'
            }`}
          >
            <span className="relative inline-flex items-center">
              {tab.label}
              {hasNew && (
                <span className="absolute -top-1 -right-2 h-1.5 w-1.5 rounded-full bg-sky-500" aria-label="new" />
              )}
            </span>
            {tab.badge && (
              <span className={`ml-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-bold ${tab.badgeColor} text-white`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Ministry Tab ──────────────────────────────────────────────── */

function MinistryTab({
  posts,
  loading,
}: {
  posts: HarmonyPost[];
  loading: boolean;
}) {
  const bulletins = posts.filter(p => p.postType === 'bulletin');
  const tips = posts.filter(p => p.postType === 'pearl_tip');

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-sky-200/30">
        <p className="text-[10px] text-sky-700/50 tracking-[0.2em] uppercase font-semibold">
          Ministry Dispatches
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Official bulletins and language guidance from P.E.A.R.L.
        </p>
      </div>

      {loading && posts.length === 0 && (
        <div className="text-xs text-sky-700/50 animate-pulse text-center py-8 tracking-wider">
          LOADING DISPATCHES...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No dispatches have been issued for this shift.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            Ministry bulletins appear as you progress.
          </p>
        </div>
      )}

      {/* Bulletins first */}
      {bulletins.map((post) => (
        <HarmonyBulletin key={post.id} post={post} />
      ))}

      {/* PEARL tips */}
      {tips.length > 0 && bulletins.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E8E4DC]">
          <p className="text-[9px] text-emerald-600/50 tracking-[0.15em] uppercase">
            P.E.A.R.L. Language Guidance
          </p>
        </div>
      )}
      {tips.map((post) => (
        <HarmonyPearlTip key={post.id} post={post} />
      ))}
    </div>
  );
}

/* ─── Sector Tab ────────────────────────────────────────────────── */

function SectorTab({
  posts,
  loading,
  onOpenThread,
}: {
  posts: HarmonyPost[];
  loading: boolean;
  onOpenThread: (postId: string) => void;
}) {
  const notices = posts.filter(p => p.postType === 'community_notice');
  const reports = posts.filter(p => p.postType === 'sector_report');

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-amber-200/30">
        <p className="text-[10px] text-amber-600/50 tracking-[0.2em] uppercase font-semibold">
          Sector Board
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Community notices, schedules, and sector reports.
        </p>
      </div>

      {loading && posts.length === 0 && (
        <div className="text-xs text-amber-600/50 animate-pulse text-center py-8 tracking-wider">
          LOADING SECTOR NOTICES...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[11px] text-[#9CA3AF] tracking-wider">
            No sector notices for this shift.
          </p>
          <p className="text-[10px] text-[#B8B3AA] mt-1">
            Community updates appear as new shifts begin.
          </p>
        </div>
      )}

      {/* Notices first */}
      {notices.map((post) => (
        <HarmonyNoticeCard key={post.id} post={post} onOpenThread={onOpenThread} />
      ))}

      {/* Sector reports */}
      {reports.length > 0 && notices.length > 0 && (
        <div className="px-4 py-2 border-t border-[#E8E4DC]">
          <p className="text-[9px] text-[#8B8578]/50 tracking-[0.15em] uppercase">
            Sector Performance Data
          </p>
        </div>
      )}
      {reports.map((post) => (
        <HarmonySectorReport key={post.id} post={post} />
      ))}
    </div>
  );
}

/* ─── Archives Tab ─────────────────────────────────────────────── */

/** Per-word card with lane-aware Mandarin gloss. Extracted so each word
 *  can own its own tap-to-reveal state (Lane 2) without parent bookkeeping. */
function ArchiveWordEntry({
  word,
  lane,
}: {
  word: import('../../../api/harmony').ArchiveWord;
  lane: number;
}) {
  const [showMandarin, setShowMandarin] = useState(false);
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/60 rounded-lg border border-[#E8E4DC]/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-semibold text-[#2C3340]">{word.word}</span>
          {word.phonetic && lane !== 3 && (
            <span className="text-[9px] text-sky-700 font-ibm-mono">/{word.phonetic}/</span>
          )}
        </div>
        <p className="text-[10px] text-[#4B5563] leading-snug mt-0.5">{word.definition}</p>
        {word.translationZhTw && lane === 1 && (
          <p className="text-[10px] text-sky-700/80 leading-snug mt-0.5">{word.translationZhTw}</p>
        )}
        {word.translationZhTw && lane === 2 && (
          showMandarin ? (
            <p className="text-[10px] text-sky-700/80 leading-snug mt-0.5">{word.translationZhTw}</p>
          ) : (
            <button
              type="button"
              onClick={() => setShowMandarin(true)}
              className="text-[9px] text-sky-700/70 underline hover:text-sky-800 mt-0.5"
            >
              Show 中文
            </button>
          )
        )}
        {word.exampleSentence && (
          <p className="text-[9px] text-[#8B8578] italic mt-0.5">"{word.exampleSentence}"</p>
        )}
      </div>
      {/* Mastery bar */}
      <div className="w-16 shrink-0">
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              word.mastery >= 0.8 ? 'bg-emerald-500' : word.mastery >= 0.4 ? 'bg-amber-500' : 'bg-rose-400'
            }`}
            style={{ width: `${Math.round(word.mastery * 100)}%` }}
          />
        </div>
        <p className="text-[8px] text-[#9CA3AF] text-right mt-0.5">
          {Math.round(word.mastery * 100)}%
        </p>
      </div>
    </div>
  );
}

function ArchivesTab() {
  const { archives, archivesLoading, loadArchives } = useHarmonyStore();
  const lane = useStudentStore((s) => s.user?.lane ?? 2);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'vocabulary' | 'timeline' | 'bulletins'>('vocabulary');

  useEffect(() => {
    void loadArchives();
  }, [loadArchives]);

  if (archivesLoading && !archives) {
    return (
      <div className="text-xs text-[#8B8578] animate-pulse text-center py-8 tracking-wider">
        LOADING ARCHIVES...
      </div>
    );
  }

  if (archives?.locked) {
    return (
      <div className="text-center py-12">
        <p className="text-[11px] text-[#9CA3AF] tracking-wider">Archives unavailable.</p>
      </div>
    );
  }

  const sectionTabs: { key: typeof activeSection; label: string }[] = [
    { key: 'vocabulary', label: 'Vocabulary' },
    { key: 'timeline', label: 'Case File: 4488' },
    { key: 'bulletins', label: 'Bulletins' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-[#D4CFC6]">
        <p className="text-[10px] text-[#8B8578] tracking-[0.2em] uppercase font-semibold">
          Ministry Archives
        </p>
        <p className="text-[9px] text-[#B8B3AA] mt-0.5">
          Historical records and vocabulary reference.
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="flex gap-1 px-3 py-2 bg-[#EFEBE4] border-b border-[#E8E4DC]">
        {sectionTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`flex-1 py-1 rounded text-[9px] font-semibold tracking-[0.06em] uppercase transition-all ${
              activeSection === t.key
                ? 'bg-white text-[#2C3340] shadow-sm border border-[#D4CFC6]'
                : 'text-[#8B8578] hover:text-[#4B5563] hover:bg-white/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Vocabulary by Week */}
      {activeSection === 'vocabulary' && (
        <div className="px-3 py-2">
          {(!archives?.vocabulary || archives.vocabulary.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No vocabulary records yet.</p>
          )}
          {archives?.vocabulary?.map(week => (
            <div key={week.weekNumber} className="mb-2">
              <button
                onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#E8E4DC] hover:border-[#D4CFC6] transition-colors"
              >
                <span className="text-[12px] font-semibold text-[#2C3340]">Shift {week.weekNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8B8578]">{week.words.length} words</span>
                  <span className={`text-[10px] transition-transform ${expandedWeek === week.weekNumber ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </div>
              </button>
              {expandedWeek === week.weekNumber && (
                <div className="mt-1 space-y-1 pl-2">
                  {week.words.map(w => (
                    <ArchiveWordEntry key={w.word} word={w} lane={lane} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Citizen-4488 Case File Timeline */}
      {activeSection === 'timeline' && (
        <div className="px-4 py-3">
          {(!archives?.timeline || archives.timeline.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No case file entries yet.</p>
          )}
          <div className="relative">
            {/* Timeline line */}
            {(archives?.timeline?.length ?? 0) > 1 && (
              <div className="absolute left-[14px] top-3 bottom-3 w-px bg-amber-200" />
            )}
            {archives?.timeline?.map((entry) => (
              <div key={entry.id} className="flex gap-3 mb-3 relative">
                {/* Timeline dot */}
                <div className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 z-[1] ${
                  entry.studentAction === 'flag' ? 'bg-rose-100 border-rose-300' :
                  entry.studentAction === 'approve' ? 'bg-emerald-100 border-emerald-300' :
                  'bg-amber-100 border-amber-300'
                }`}>
                  <span className="text-[8px] font-bold text-amber-700">
                    {entry.weekNumber ? `S${entry.weekNumber}` : '?'}
                  </span>
                </div>
                {/* Entry content */}
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-amber-700">{entry.authorLabel}</span>
                    <span className="text-[9px] text-amber-500">{formatTimestamp(entry.createdAt)}</span>
                    {entry.studentAction && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-auto ${
                        entry.studentAction === 'flag'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {entry.studentAction === 'flag' ? 'FLAGGED' : 'APPROVED'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">{entry.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulletin Archive */}
      {activeSection === 'bulletins' && (
        <div className="px-3 py-2">
          {(!archives?.bulletins || archives.bulletins.length === 0) && (
            <p className="text-[11px] text-[#9CA3AF] text-center py-8">No archived bulletins.</p>
          )}
          {archives?.bulletins?.map(b => (
            <HarmonyBulletin
              key={b.id}
              post={{
                id: b.id,
                designation: b.authorLabel,
                content: b.content,
                status: 'approved',
                pearlNote: null,
                replyCount: 0,
                createdAt: b.createdAt,
                isOwn: false,
                weekNumber: b.weekNumber,
                postType: 'bulletin',
                bulletinData: b.bulletinData as HarmonyPost['bulletinData'],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
