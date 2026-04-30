# Project Update Log

Last updated: 2026-04-30

## 2026-04-30 — Priority Sort polish + Clip A script alignment + critical bug fixes (4 commits)

### Context
Three threads converged today. (1) Yesterday's Priority Sort cascade redesign (`d2dd9ef`) was on master but **never deployed** — `tsc -b` had been failing on legacy field references from the rubric redesign (`b3ae4a0`), so Railway was silently serving the pre-`b3ae4a0` bundle. User screenshot confirmed the OLD `ASSIGN EACH CASE TO ITS PRIORITY LEVEL` UI was still showing. (2) Even after the deploy unblocked, students hit a freeze on `VERIFYING CLASSIFICATION...` for 8+ minutes due to a useEffect cleanup race. (3) Final Clip A script was confirmed and the in-game Priority Sort needed three alignment fixes.

### Shipped (4 commits on master)

- **`89f67e8` — Fix tsc -b build failure (unblocks deploy of yesterday's batch).** Two stale references to fields removed in `b3ae4a0`: `D1StructuredWriting.tsx:119` `evaluation?.taskScore` → `evaluation?.vocabScore`; `WritingEvaluator.tsx:324-326` `lastResult.taskNotes` → `lastResult.onTopicReason` gated on `lastResult.onTopic === false`. After this commit, the entire backlog (`2fe2b83` typing animation + `b3ae4a0` rubric redesign + `d2dd9ef` cascade) finally went live. **Lesson**: `npx tsc --noEmit` is laxer than `tsc -b` (which `npm run build` runs). Use `npm run build` for frontend pre-push verification, not `tsc --noEmit`.

- **`31587bb` — Randomize Priority Sort case order + persistent directions card.** Fisher-Yates shuffle on mount via `useMemo` so each shift attempt presents the 6 cases fresh. Prevents pattern-memorisation across class peers and re-attempts. Correctness data lives on each case object (correctColumn, disappears flag), so order is purely presentational — the case-5 disappearance narrative beat (Wellness Division reassignment) still fires correctly wherever it lands. Plus: compact persistent directions card between header and active case zone (3 numbered steps + one-line color key URGENT/ROUTINE/HOLD), hidden during verifying/verified.

- **`17d94a6` — Fix Priority Sort verify-stage freeze + Examples & Tips collapsible** (the critical bug). Students stuck on `VERIFYING CLASSIFICATION...` for 8+ minutes. Root cause: a single useEffect with deps `[sortStage, allCasesClassified]` scheduled t1 (set 'verifying' at 400ms) AND t2 (runVerification + set 'verified' at 1400ms). When t1 fired and `sortStage` changed, the effect re-ran, cleanup fired, **t2 was cleared mid-flight**. Fix: split into two single-shot effects (cascade→verifying watching `[sortStage, allCasesClassified]`; verifying→verified watching `[sortStage]`). Each effect's timeout is in its own cleanup window. **Pattern lesson**: when a single useEffect schedules multiple setTimeouts where one of those timeouts changes a dep of the same effect, the cleanup races the later timeouts. Split per state. Same commit added an `<details>`-based "Examples & Tips" collapsible to the cascade UI, lane-aware default open state (Lane 1 expanded for first-exposure scaffold; Lane 2/3 collapsed but accessible). Pedagogical reasoning: Cognitive Load Theory at A2-B1 means working memory holds ~4±1 chunks; each case already costs 3-4; forcing students to also hold heuristic rules in memory pushes total load over capacity and they revert to keyword-matching. Reliable accessibility frees working memory for the actual cognitive work.

- **`813b65b` — Align Shift 3 in-game with finalised Clip A script (3 fixes).** Script confirmed final, app catches up:
  - **M1 — counter + bark "six cases"**: `week3.ts` queue_status sequence `[3, 7, 12, 15]` → `[2, 4, 5, 6]`; pearlBark "15 cases" → "6 cases." 15-vs-6 contradiction with video Scene 4 ("review six cases") gone.
  - **M2 — "respond" terminology**: kept "Priority Classification" as system noun (script uses it: "complete classification") but swapped action verbs. Header subtitle "Classify Each Case" → "Respond to Each Case." Directions card "Click the folder..." → "Respond by clicking the folder...". Training subtitle adds "...and respond." Cloze fill's separate "respond to inquiries" sense unchanged — natural polysemy is acceptable A2-B1 input.
  - **M3 — FORWARDED TO STANDARD CHANNEL pip**: after each case animates into its folder, brief emerald pill ✓ "Forwarded to Standard Channel" fires in the active case zone for ~650ms before the next case slides in. Per-case timing extends 700ms → 1150ms; cumulative cascade adds ~2.7s for 6 cases. Enacts Clip A Scene 4: *"Forward each complete classification through the standard channel."*

### Pedagogy decisions captured

- **Cognitive Load Theory drives the Examples & Tips panel default state.** A2-B1 students cannot reliably hold discrimination heuristics in working memory while also processing English case bodies and forming classification hypotheses. Reliable visible reference is not a crutch — it is the correct scaffold for the application phase. Codified in `docs/pedagogy.md` §7.7.
- **Lane 1 sees panel expanded; Lane 2/3 see it collapsed.** Mirrors the existing lane-doctrine pattern: supports scale per lane, content stays uniform.
- **Script is canon when finalised.** When a video script is finalised, in-game terminology, numbers, and UI affordances align to the script — not the other way around. Three M-fixes today executed this directly (counter, "respond", FORWARDED pip).

### Open / deferred

- The W3 Priority Briefing writing prompt (`week3.ts` Card 2) requires modal use but doesn't enforce target-vocab use. Could be tightened to require 2-3 W3 target words alongside the modals. Not in scope for today's batch.
- Pre-existing `react-hooks/set-state-in-effect` lint warnings in `WritingReview.tsx` lines 77 + 130 still present — not from today's changes; from earlier load-from-API effects. Not blocking.

---

## 2026-04-29 — Typing animation + writing rubric redesign + Priority Sort cascade + pedagogy doctrine (3 commits + new doc)

### Context
Three threads converged today. (1) User wanted modern messenger-style typing dots on Shift 3 Part 1's briefing card so PEARL and Betty messages feel like they're being typed. (2) Image #2 surfaced a real failure of the writing rubric — a student who wrote about bodily functions ("I should fart. I should poop...") scored 100% because grammar+vocab averaged above 0.4 even when relevance was low. User asked: "I think the way we grade grammar is completely wrong, and I wonder if grading grammar appropriately is fruitless and too difficult for us to achieve." (3) Image #3 surfaced concern that W3 Priority Sort doesn't feel like a centerpiece — vertical card list with three pills, blends with other quizzes; briefing video (Image #4/#6) shows a CRT terminal with color-coded folders and counters that the app surface didn't reflect.

### Shipped (3 commits on master)

- **`2fe2b83` — Typing-indicator animation on Shift 3 Part 1 briefing card.** PEARL bubble shows three bouncing dots (~4.5s) → reveals message; 1.8s gap; Betty bubble does the same; Acknowledge stays disabled (`bg-slate-200 text-slate-400 cursor-not-allowed`) until both rendered. Animations: `typing-dot`, `message-rise`, `bubble-pop-in` keyframes in `tailwind.config.ts`. Logic in `PriorityBriefing.tsx` via `MessageBubble` subcomponent + sequenced useEffect with cleanup. Defensive against cards with only one of `pearlBark` / `bettyOverlay`. Motion-reduce safe.

- **`b3ae4a0` — Writing rubric redesign: on-topic veto + vocab; remove grammar scoring** (the big one). Pre-redesign rubric had three axes (grammar + vocab + relevance) averaged with 0.4 pass threshold — let the toilet-humor essay pass at 100%. New rubric: **on-topic boolean (strict veto)** → off-topic = score 0.0 regardless of vocab; **vocabScore (0–1)** → only numeric axis; **grammarAdvisory (string)** → non-scoring observation surfaced to teacher only. Submit Anyway and attempt-3 auto-pass both refuse to bypass the off-topic veto. Why grammar removed: AI grammar scoring is unstable on short A2-B1 L2 text (same essay scores 0.6 then 0.9 across attempts); double-tests what Cloze Fill / Error Correction Doc / Word Sort already test deterministically; punishing rough grammar in writing trains students to write less, not better. **Touched 10 files**: `submissions.ts` (new prompt + EvaluationResult shape + score formula), `teacher.ts /writing-review` (new fields + legacy), `taskResult.ts` + `sessions.ts` (additive fields), `WritingEvaluator.tsx` (off-topic blocks Submit Anyway + attempt-3 auto-pass with explicit message), `ShiftReport.tsx` (score = vocabScore clamped [0.1, 1.0]), `ShiftClosing.tsx` (off-topic banner above 9-card grid), `WritingReview.tsx` + `Gradebook.tsx` (On-Topic chip, advisory text, "(legacy)" suffix on pre-redesign grammar fields), `api/teacher.ts`. ShiftClosing's "Grammar Accuracy" card stays — it's now exclusively from constrained tasks (`category: 'grammar'`) since writing tasks emit `category: 'writing'`. The Grammar number students see is now an *honest* deterministic measurement.

- **`d2dd9ef` — Priority Sort cascade redesign.** Replaced vertical-card-list UI with terminal-screen layout matching the briefing video frame-for-frame. Header: `6 CASES — PRIORITY CLASSIFICATION REQUIRED` + `Read Carefully · Classify Each Case`. Three CSS-rendered manila folders (pink/tan/blue body + tab + inset shadow) with live `X / 6` counters. Footer: `MINISTRY OF CLARITY · CASE PROCESSING TERMINAL · v3.2.1`. Three layers: **(1) ClassificationTraining overlay** — one-time, three folder explainers + 5-bullet identification heuristics (time signals, impact signals, "not urgent" flag, citizen-distress flag); Lane 1 simpler examples. **(2) One-by-one cascade** — case slides in, "INCOMING CASE N OF 6" pip, click folder → directional translate + scale-down + fade (450ms toward chosen folder), folder bounces, counter ticks, 700ms pause, next case. **(3) Auto-verification** — VerifiedSummary panel with per-folder ✓/✗ chips; case 5 glitches out via `incoming-glitch` keyframe while PEARL bark slides in announcing Wellness Division reassignment. Folder colors swapped to match video: URGENT=rose (was rose), ROUTINE=amber (was sky), HOLD=sky (was amber). Scoring contract preserved. ~616 lines of new code, 5 new keyframes.

### New doc

- **`docs/pedagogy.md`** — 413 lines, the project's first pedagogy doctrine. Written this session via 6 parallel research agents (vocabulary, scaffolding, task taxonomy/SLA, writing/feedback, retrieval, narrative-as-pedagogy). Updated post-redesign: §1 principle 8 (centerpiece must mirror briefing video) + principle 9 (no grammar scoring on open writing); §5 fully rewrote around new rubric; §7.7 documents Priority Sort cascade as the centerpiece-continuity exemplar future shifts must follow. Linked from CLAUDE.md "Detail Files" as source of truth for "how does this app teach?".

### Pedagogy decisions captured

- **Grammar scoring on open writing is over.** AI scoring at A2-B1 is too noisy; constrained tasks (Cloze, Error Correction, Word Sort) already do this deterministically. Grammar advisory text remains for teacher visibility only.
- **On-topic compliance is non-negotiable.** Off-topic cannot be bypassed via Submit Anyway or attempt-3 auto-pass. The student must rewrite to address the prompt. Effort failures are still soft; topic compliance is hard.
- **Centerpiece task per shift must mirror its briefing video.** Repeating tasks (Word Match, Cloze, Vocab Clearance) need to look identical for spaced retrieval; the novel task carries shift identity and must bridge video → app surface in typography, color, animation. Brand mismatch between video and app is now a doctrine deviation.

### Open / deferred

- W3 script Clip A — user is rewriting, decided to drop the "six cases" number to avoid the in-app `15 ACTIVE CASES IN QUEUE` mismatch (option B from earlier discussion).
- Apply centerpiece-mirroring principle (1.8) to W4+ when those shifts ship.
- Continue paused: W5–W6 WeekConfig builds, condensed-route 4488 catch-up posts, new NPC introductions.

---

## 2026-04-28 — Compliance Check shipped, redesigned, polished, raced (5 commits)

### Context
User asked for a teacher-controlled vocabulary "quiz" pop-up that opens with a screen-locking animation. Built end-to-end as "Compliance Check" — sibling to Clarity Check, but teacher-triggered. After the initial on-demand version (`c3831bb`) shipped, user feedback was "the standalone tab feels too abstract — let's put it in Shifts so the teacher can place it before/after a section, with the ability to remove it, and let teachers choose words from the TOEIC vocabulary." Triggered full redesign.

### Shipped (5 commits on master)

- **`c3831bb` — Initial Compliance Check** (later partially superseded). Cyan PEARL eye SVG with iris look-around (no blink, locked decision), screen-locking shell with `z-[100]` backdrop dim + scan-line sweep + label typewriter. Backend: `ComplianceCheckResult` Prisma model, 4 endpoints (per-student issue, class-wide issue, complete, results review), distractor utility pulling from cross-week target words. Frontend: Zustand store, App-root mount, `compliance-check:issued` socket listener, ClassMonitor "Issue Compliance Check" buttons (per-student + class-wide), `IssueComplianceCheckModal`. Visual preview at `/preview/compliance-check`.

- **`a640b30` — Per-class scheduled redesign**. Replaced on-demand pattern with placement-based templates configured in the Shifts tab. Per-class scoping confirmed. **Removed**: `IssueComplianceCheckModal`, ClassMonitor buttons + state, `complianceCheckStore` (Zustand), App-root mount, `compliance-check:issued` socket event, on-demand backend issue routes. **Added**: `ComplianceCheckTemplate` Prisma model with `(classId, weekNumber, placement, afterTaskId)` unique. `templateId` FK on `ComplianceCheckResult` with `(pairId, templateId)` unique for refresh-safe one-shot. Distractor utility refactored to take a curated word list (distractors drawn from definitions of words NOT in the curated list — pedagogically deliberate). Eight new endpoints: templates CRUD, slots resolver, pending fetch, complete, results. New components: `WordPicker` (grouped-by-shift, expand/collapse, TOEIC filter, search, bulk toggles, auto-seed with current-shift words + N words from each prior shift), `ComplianceCheckEditor` (modal with title, picker, question count 1–5, cumulativeReviewCount default 2, live preview with re-roll, save/remove), `ComplianceCheckSlotList` (placement slots derived from `getWeekConfig(weekNumber).tasks`). `ShiftQueue.tsx` cascade extended to `dismissal → vocab interstitial → inter-task moment → clarity check → compliance check → next task`. Bundled supporting infra (`ClarityCheck.tsx`, `InterTaskMoment.tsx`, narrative-choices route+api) needed for `ShiftQueue` to compile. W4 student-facing content (`week4.ts`, `MAX_BUILT_WEEK` bump, `week-configs/index.ts` registration) intentionally excluded per "hold off on Shift 4."

- **`f6ce666` — Polish**. Hide ambient PEARL Dynamic Island during a Compliance Check (`body.compliance-check-active` class hides `.pearl-island`) so the broadcast pill doesn't overlap the cyan eye. Bumped shell from `z-[100]` → `z-[1000]`. Fixed unreadable green option text — was inheriting body's terminal-green `#33FF33`. Now explicit `text-slate-700` with contextual emerald-900 / rose-900 / cyan-900 for state changes. Modal-level scale+blur entrance (450ms cubic-bezier) + exit (380ms triggered ~1.8s after MCQ completion via existing 2.2s post-completion delay window).

- **`d721523` — Slot bleed-over fix**. Teacher reported templates from one shift showing in another shift's slot list when switching the dropdown. Three-layer defense: `key={classId-weekNumber}` on `<ComplianceCheckSlotList>` for hard remount on shift change; `setTasks([])` + `setTemplates([])` at start of `reload()` to clear stale render window; `t.weekNumber === weekNumber` filter on both store + `findTpl` matcher. The `key` prop alone fixes it; the others are belt-and-braces.

- **`54ca0b0` — Race-condition fix** (the important one). Teacher reported a Shift 1 Compliance Check rendering for a student moved to Shift 2 with no checks scheduled. Root cause: `fetchComplianceCheckFor()` async promise from the OLD weekConfig was still pending when the student was moved; its `.then()` resolved AFTER the reset effect cleared `activeComplianceCheck` and wrote stale prior-shift data back into state. Fix: cancellation token (`let cancelled = false; return () => { cancelled = true; };`) in both `shift_start` and `shift_end` cascade effects + `expectedWeek` snapshot compared against `cc.weekIssued` in the `.then()`. Same defensive snapshot in `handleComplete`'s `await fetchComplianceCheckFor('after_task', …)`. Render-time guard: `if (activeComplianceCheck && weekConfig && activeComplianceCheck.weekIssued === weekConfig.weekNumber)` prevents any leak that escapes the cascade-level cancellation. **Pattern applies to any future placement-driven async fetch.**

### Pedagogy discussion (parked)
Reviewed L2/bilingual research on pop-up vocab checks. Sweet spot: 3–5 questions per check; 1–2 is luck-driven; 7+ becomes click-through. User opted to keep current 1–5 range with default 3.

### Score-grinding behavior (parked)
User flagged students "racking up" Compliance scores. Diagnosed: existing `(pairId, templateId)` unique constraint already prevents true exploit; the behavior is engagement, not gaming. Proposed (not built): hide numeric score, diminishing mastery returns per word, per-word cooldown, tier ladder (`PROBATIONARY → STANDARD → COMPLIANT → MODEL CITIZEN → EXEMPLARY`) with story unlocks (Citizen-4488 messages at transitions, Surprise Audit at top tier), Compliance Compendium (Pokédex pattern). User said "park it."

### Open / deferred
- Apply the same async-cancellation pattern audit to the Clarity Check cascade (currently config-sync, not at risk, but worth checking if any future change makes it async).
- Compliance Tier ladder + story-gated 4488 content + Surprise Audit are designed but unbuilt.
- W4 student-facing content still uncommitted (week4.ts, MAX_BUILT_WEEK bump, week-configs/index.ts registration) — infrastructure on master, content held back.

---

## 2026-04-27 — Shift 3 design walkthrough (reference, no code changes)

## 2026-04-27 — Shift 3 design walkthrough (reference, no code changes)

User asked for a complete walkthrough of everything designed for Shift 3 (activities / scripts / TOEIC words / story progression). Read-only session — no commits, no decisions, no fixes shipped. Producing this entry so the source-file map is searchable next time the same question is asked.

### W3 ("Priority Queue") source-of-truth files
- **Mechanics + tasks**: `backend/src/data/week-configs/week3.ts` (single source — 6 tasks, character messages, citizen4488Post, harmonyConfig, narrativeHook, shiftClosing).
- **Grammar target**: `modals` (`should`/`must`/`can`/`may`); clearance arc PROVISIONAL → STANDARD.
- **Target vocab (10)**: process, complete, review, delay, schedule, respond, identify, separate, maintain, forward. Cumulative review words (20) carried from W1+W2.
- **Briefing video scripts**: `Dplan/Canva_Production_Scripts_Weeks_01_03.md:106-148` — Clip A "The Queue Grows" (2:20, Betty + William, 6/10 target words) + Clip B "The Second Look" (1:20, Ivan, remaining 4/10). Single-narrator Ministry Training Broadcast voice.
- **Story arc summary**: `Dplan/Story_Arc_Timeline.md:57-60`.
- **Harmony static content**: `harmonyBulletins.ts:132` (queue efficiency directive + 2 MCQs), `harmonyPearlTips.ts:44` (modal grammar tip), `harmonyCommunityContent.ts:68` (cafeteria/transit/Sector-4 notices), `harmonyCommunityContent.ts:122` (Central Filing sector report — staffing -11, "Wellness Division x3" transfers), `harmonyFeed.ts:135` (3 character-first posts: 7291 efficiency, 0022 grandmother's recipe, 4488 schedule update).
- **Shift-close 4488 case-file card**: `frontend/src/data/citizen4488Posts.ts:27-32`.
- **W3 narrative-reactive payoff** (Party Observation card quoting student's own writing): `frontend/src/components/shift-queue/ShiftClosing.tsx:117-135` — gated on `weekNumber === 3`, reads first sentence from `priority_briefing` Task 1 writing.

### Three converging story threads in W3
1. **Queue pressure / speed-vs-truth** — PEARL demands speed AND accuracy; briefing voices the contradiction ("can be fast / should be correct — these are not the same").
2. **Case 5 disappearance + Wellness Division named** — Priority Sort case 5 (citizen complaint about removed community-center activities, missing neighbor) sorts as URGENT, then disappears with PEARL bark ("reassigned to Wellness Division. Do not follow up"). Ivan messages the student about that exact case afterward. First in-game naming of Wellness Division. The case description threads back to Citizen-4488's W1-W2 build-up.
3. **Game quotes student back** — W3 MVP narrative-reactivity test (Shape 1 commitment, see 2026-04-21 entry). Same-session echo, frontend-only.

T3 Shift Report bonus prompt is the first time the game directly invites a student to articulate dissent in writing ("Must you obey? Why or why not?") — PEARL's "satisfactory" feedback arrives regardless of how they answered.

---

## 2026-04-24 — Score Visibility Fix + Teacher Review Overhaul (9 commits shipped)

### Context
User reported students aren't seeing their final score at the end of each shift AND teachers can't effectively review past student writings/answers. Diagnosed the morning, fixed the afternoon — all three investigation open questions shipped plus a much broader teacher-review feature set.

### Shipped (9 commits on master)

**Parallel /batch run — 6 PRs merged:**
- **#15 `addf4ac` — ShiftReport Submit Anyway + gradient scoring.** Students now always reach ShiftClosing. After 1 failed WritingEvaluator attempt, a "Submit Anyway" button appears (gated on `minWords` default 20). Score = `clamp((grammarScore + vocabScore) / 2, 0.1, 1.0)` — no more hardcoded `1`. `submittedAnyway: true` persisted to details for teacher review.
- **#17 `a2b4fce` — Backend teacher comments + PEARL persistence + writing-review endpoint.** Prisma migration adds `teacherComment` + `pearlFeedback` columns to `MissionScore`. `POST /api/pearl-feedback` persists PEARL feedback (keyed by pairId + missionId, fail-open). New `PATCH /api/teacher/scores/:scoreId/comment` + `GET /api/teacher/classes/:classId/writing-review?week=N` routes.
- **#18 `18bafc2` — ShiftClosing 9-card overhaul.** Added Writing Score, Final Score, Target Words Hit cards. Renamed "Target Words Used" → "Words Written". Grid layout → `grid-cols-2 sm:grid-cols-3`. `scoreAggregator.test.ts` up to 15 tests.
- **#20 `4818095` — `answerLog` persistence across task components.** Canonical `TaskAnswerLogEntry` interface. WordMatch, VocabClearance, ClozeFill, ContradictionReport, DocumentReview, PrioritySort, ErrorCorrectionDoc all emit `details.answerLog[]` with per-question chosen vs correct + first-try correctness flag.
- **#16 `e2682a3` — Gradebook drill-down enhancements.** Three new collapsible subsections: Student Answers (renders answerLog table), PEARL & AI (grammarScore/Notes/vocabUsed/Missed/taskScore/Notes + pearlFeedback), Teacher Comment (textarea + optimistic save). Graceful empty states on legacy rows.
- **#19 `2e46988` — Teacher Writing Review page.** New top-level tab. Class-wide per-shift essay review with sort-by-attention default, score pills, Submitted-Anyway flag, inline AI eval + PEARL quote + teacher comment textarea. Clicks through to Gradebook for grade editing.

**Follow-up fixes same day:**
- **`7cc1e96` — Writing Review endpoint shape fix.** Unit 4 backend returned nested `{ students, week }`, Unit 6 frontend expected flat `{ weekNumber, weekTitle, entries[] }`. Silent TypeScript cast hid the mismatch → page rendered empty. Rewrote backend to emit flat entries. Also fixed `justifications` filter (was `Array.isArray`, shape is `Record<string, string>`).
- **`9881ba4` — `answerLog` for IntakeForm + WordSort + empty-View-Writing fix.** Unit 3 missed these two task types. IntakeForm now tracks `firstQuestionPick` + `questionAttempts` per MCQ. WordSort emits per-word answerLog. Gradebook's `hasWriting` tightened to reject `writingSubmissions: {}`.
- **`1b32765` — ShiftResult field mismatch + Gradebook Shift Summary parity.** PR #18 frontend payload sent `wordsWritten` but backend `shifts.ts` still read `targetWordsUsed` — silent `0` storage for new completions. Fix: accept both names, stash new metrics (writingScore/overallScore/targetWordsHit) in existing `ShiftResult.taskResults` JSON. Gradebook Shift Summary now shows all 9 cards mirroring ShiftClosing. Added "Not finalized" amber pill when `completedAt` is null.

**Also applied:** Prisma migration `20260424100000_add_mission_score_teacher_comment_pearl_feedback` via `npx prisma migrate deploy` against the dev DB.

### Accidental commit + revert
An empty-commit attempt via `git commit --allow-empty` swept up pre-existing staged in-progress work (19 files: W4 narrative-reactive + Clarity Check wiring + docs) into commit `7e65609`, pushed to master. Immediately reverted via `git revert 7e65609 --no-edit` (commit `c7f02b9`), work restored to working tree as unstaged modifications. Net effect on master: zero. Lesson: when needing an empty commit alongside staged work, use `-o <paths>` to scope or `git reset` the index first.

### Known limitation for old data
`answerLog` was added today — MissionScore rows written BEFORE today's deploy don't have the field. The Gradebook "Student Answers" section will always show "Not recorded for this task" for those rows. The data was never captured; there's nothing to retroactively recover. Writing text (writingText / text / writingSubmissions / justifications) has always been persisted and remains visible via "View Writing".

### Open / deferred
- Have CA-1 complete a full shift end-to-end against the fresh Railway deploy, confirm new Gradebook / Writing Review surfaces populate correctly with real data.
- Consider adding a "completed before 2026-04-24 — legacy capture" indicator on Gradebook sections so teachers know empty sections are expected for old data.
- W4 narrative-reactive working-tree work remains uncommitted per "hold off on Shift 4" directive.

Technical notes in auto-memory: `project_batch_merge_2026_04_24.md`.

---

## 2026-04-21 / 22 — Narrative-Reactive Layer (Shape 1 Commitment)

### Context
External feedback flagged that students were treating narrative as decorative wrapper and engaging only with tasks. Diagnosis: agency exists in tasks, not narrative, so students route around the narrative layer. Worldbuilding artifacts (character bibles, propaganda scripts, PEARL arcs) were "progress on aspiration, not product."

After strategic discussion laying out three paths (1: rebuild as load-bearing narrative / 2: partner character middle path / 3: accept narrative as flavor), user committed to **Shape 1 — "story-driven game that teaches English."**

Rather than waiting for MVP data (classes currently on W2, W3 MVP tests won't return results for 1-2 weeks), user chose to build W4 in the new architecture now on the grounds that W4 has to exist when classes reach it — real choice is "old template vs new template," not "build vs wait."

### Shipped

**W3 MVP — smallest possible reactivity test (same-session echo)**
- `frontend/src/components/shift-queue/ShiftClosing.tsx` — new "P.E.A.R.L. — Observation" card before ceremonial quote. Quotes student's first `priority_briefing` writing submission verbatim. Pure frontend — reads from existing `taskProgress[].details.writingSubmissions`. Gated on `weekNumber === 3`.
- Tests whether students engage when narrative reacts to them. If students don't notice their own words quoted back, the problem is deeper than reactivity.

**W4 mechanical scaffold**
- `backend/src/data/week-configs/week4.ts` — 5 tasks (word_match, document_review, cloze_fill, vocab_clearance, shift_report) from `Dplan/Weeks_04_06_Shift_Plan.md`. Grammar target `past-simple-sequencing`. 10 target words (arrange/collect/examine/indicate/locate/organize/present/record/select/verify). 4 character messages (Betty, Ivan×2, M.K. silent). Citizen-4488 post (missing neighbor), "Archive Access" narrative hook, STANDARD→STANDARD clearance.
- `backend/src/data/week-configs/index.ts` — registered.
- `frontend/src/data/narrative-routes.ts` — `MAX_BUILT_WEEK` bumped 3→4.

**B-layer infrastructure (inter-task moments)**
- `backend/src/routes/narrative-choices.ts` — POST + GET for NarrativeChoice records. Model already existed in Prisma schema.
- `backend/src/index.ts` — route registered.
- `frontend/src/components/shift-queue/InterTaskMoment.tsx` — full-surface non-skippable; `character` and `ambient` variants.
- `frontend/src/api/narrative-choices.ts` — `postNarrativeChoice()` + `fetchNarrativeChoices()`.
- Types: `InterTaskMomentConfig`, `InterTaskMomentReply`, optional `interTaskMoments?: Record<taskId, InterTaskMomentConfig>` on WeekConfig.
- `frontend/src/components/shift-queue/ShiftQueue.tsx` — cascade order (dismissal → vocab interstitial → inter-task moment → next task). Cleared on week change / taskResetKey.

**B-layer W4 content (3 moments)**
- Betty after `word_match_w4`: warm warning about timelines (3 replies).
- Ivan after `cloze_fill_w4`: anxious about cloze passage being pre-written (3 replies).
- Ambient glitch `DON'T FORGET` after `vocab_clearance` (2500ms timer).

**C-layer infrastructure (mid-task choices)**
- Types: `MidTaskChoiceConfig` + optional `midTaskChoice` on `DocumentConfig`.
- `frontend/src/components/shift-queue/tasks/DocumentReview.tsx` — `checkChoiceOrAdvance` interceptor between stamp animation and advance. Amber-accented "P.E.A.R.L. — Archive Control" overlay replaces doc view. POSTs choice, shows response + Continue.

**C-layer W4 content**
- Fragment 3 reclassification on `doc_fragments`: PEARL reclassifies mid-task; student chooses REMOVE (compliant) or KEEP FLAGGED (curious). Either path, fragment is gone from official record.

**Shift-close PEARL echo (C-layer payoff)**
- `ShiftClosing.tsx` fetches `fetchNarrativeChoices(weekNumber)` on mount.
- W4-specific observation card conditional on `w4_doc_review_frag3` value. Compliant: "exemplary timeline compliance." Curious: "we have amended your file."

### Verified
- Backend build clean (34 vitest tests green, tsc passes).
- Frontend build clean.
- Against `Dplan/Story_Arc_Timeline.md` — W4's canonical Clip-B beat ("one viewed fragment becomes classified") now interactive. Character voices verified against `Dplan/Character_Bible.md`.
- All B/C reply option sets include one compliant choice (per Character Bible interaction rule 4).

### Deferred
- W5 carry-over hooks (requires W5 WeekConfig to exist).
- W5 and W6 WeekConfig files.
- W4 dictionary entries seeded to DictionaryWord table.
- W4 Harmony static content (bulletins, PEARL tips, notices, sector reports, censure items).

### Docs updated
- `CLAUDE.md` — "Recent Work (2026-04-21 / 22)" section; Key Paths includes week4.ts; Next Work updated (W4 removed, W5-6 remain).
- `docs/architecture.md` — `/api/narrative-choices` route; "Narrative-Reactive UI Layer" section covering InterTaskMoment, DocumentConfig.midTaskChoice, shift-close echoes.
- `docs/features.md` — "ShiftQueue System (Weeks 1-4)"; PEARL Observation cards under Shift Closing; "Narrative-Reactive Interaction Layers" section.
- `Dplan/Weeks_04_06_Shift_Plan.md` — W4 section has implementation status note.

---

## 2026-04-17 — Bug & Design Review, 9-PR Fix Batch, Narrative & Pedagogy Review, Doc Sweep

Long multi-part session covering: full bug/design assessment → parallel fix batch → narrative/pedagogy review → top-3-finding follow-up batch → docs updated to reflect everything. 12 PRs total (9 merged, 3 pending).

### Bug & Design Review
4 parallel investigators surveyed: shift-completion scoring flow, My File feature, codebase bug scan, game-design/pedagogy assessment. Surfaced 2 P0s (user-flagged), 9 P1s, 11 P2 polish items. Findings ordered by impact, not category.

### Fix Batch — 9 PRs Merged
All P0 + all P1 items shipped as independent units in isolated worktrees, merged to master.

| PR | What |
|---|---|
| #1 | `prisma.$transaction` wrap on submission mastery upsert+update (atomicity) |
| #2 | **Security:** Harmony cross-class censure auth hole (was comparing `viewer.classId !== viewer.classId`); + mastery transaction wrap; + sweep threshold 10s→3s; + awaited `lastHarmonyVisit` |
| #3 | HarmonyApp `if (submitting) return;` guard prevents Enter+click double-POST |
| #4 | Socket reconnect listener dedup + JWT expiry detection → `auth:required` custom event on stale tab wake |
| #5 | MonitorPlayer `onEnded` ref pattern (fixes stale closure + 2s timer reset on parent re-render) |
| #6 | **P0:** New `GET /api/student/profile-summary` endpoint + MyFileApp rewritten from placeholder to 5-section Ministry dossier (Citizen Record / 18-cell Shift History grid / Vocabulary Ledger / Harmony Activity / Character Dossier) |
| #7 | New Vocabulary Completion Interstitial (emerald/amber/rose chips per target word, 4s auto-advance) |
| #8 | New `POST /api/pearl-feedback` endpoint + WritingEvaluator renders in-character PEARL "Observation" on student reasoning |
| #9 | **P0:** Canonical `TaskResultDetails` type + pure `scoreAggregator.ts` utility + 11 task components updated + ShiftClosing accurate vocab/grammar/errorsFound (was inflated) + Citizen-4488 Case File card |

**One merge conflict resolved**: PRs #6 and #8 both added route registrations to `backend/src/index.ts`. Kept both, committed merge resolution.

### New Infrastructure on Master
- **Canonical task result shape** (`frontend/src/types/taskResult.ts`): every task component emits `{ taskType, itemsCorrect, itemsTotal, category: 'vocab'|'grammar'|'writing'|'mixed', errorsFound?, errorsTotal? }`. Aggregator returns per-category `null` when no tasks contributed (no more `completedTasks/totalTasks` inflated fallback).
- **Frontend Vitest set up**: `frontend/package.json` now has `test`/`test:watch` scripts. 11 tests in `frontend/src/utils/scoreAggregator.test.ts`.
- **New backend routes**: `backend/src/routes/student.ts`, `backend/src/routes/pearl-feedback.ts`.
- **New frontend data shim**: `frontend/src/data/citizen4488Posts.ts` (mirrors backend's 4488 feed posts for ShiftClosing).

### Narrative & Pedagogy Review
3 parallel deep-read agents reviewed: shift scripts (W1-3 + W4-6 plan), Harmony content + 4488 arc, PEARL voice across surfaces. Findings synthesized into `Dplan/Narrative_Pedagogy_Review_2026_04_17.md` (267 lines).

**Headline:** "The game is 80% of the way to being transformative. The remaining 20% is making implicit things visible — to students who have no reason yet to look closely."

Top P0 findings:
1. Citizen-4488 arc invisible to A2-B1 Mandarin speakers (no baseline agreement rules).
2. No narrative throughline W1→W2→W3 (Case 5 / Wellness Division dropped).
3. Implicit grammar teaching fails Mandarin-L1 learners.
4. Writing prompts treat target words as decoration, not necessity.
5. PEARL goes cold-procedural on failure states.

### Top-3 Findings Follow-up Batch — 3 PRs (open, awaiting merge)

| PR | What |
|---|---|
| #10 | Warm up 11 PEARL failure-state strings in submissions.ts + pearl-feedback.ts to preserve "forced happy" tone |
| #11 | Edit `Dplan/Weeks_04_06_Shift_Plan.md` — 6 pre-build pedagogy fixes: Evidence Assembly deferred to Act II; W6 re-split 4→5 tasks; W5 because-clause explicit teaching; W6 cumulative requires W1/W2/W3 vocab; PEARL bark after RUN flash; Wellness Division thread woven W3→W4→W5 |
| #12 | Citizen-4488 visibility: 2nd post per week W1-3 + ShiftClosing grammar-watch collapsible note + first-Harmony-visit PEARL intro banner; adds `isFirstVisit: boolean` to `GET /api/harmony/posts`; bumps `harmony-vocabulary.test.ts` from 34 → 42 tests |

### Documentation Sweep
Updated to reflect master's actual state (with PRs #10-12 noted as pending):
- `CLAUDE.md` — added "Recent Work (2026-04-17)" section, link to narrative review, "Task Result & Scoring Utilities" subsection
- `docs/features.md` — added "My File (Student Dossier)" section, "Vocabulary Completion Interstitial", "Shift Closing & Score Aggregation", "PEARL in-character observation", "Security & reliability hardening"
- `docs/architecture.md` — added `/api/student` + `/api/pearl-feedback` routes, security/transaction notes, frontend scoreAggregator + taskResult mentions

### Worktree / Sandbox Notes (for next batch)
- First batch (PRs #1-9): worktree isolation mostly worked. One merge conflict (#6 + #8). Resolved.
- Second batch (PRs #10-12): sandbox tightened. Workers couldn't run `gh` or even `git commit`. Coordinator manually staged + committed + pushed + opened PRs from main shell.
- **Verify sandbox permissions for `gh` and `git` BEFORE launching another batch.**

### Out-of-Scope Finding (not yet shipped)
- `frontend/src/api/pearl-feedback.ts:14-18` has duplicate canned PEARL fallbacks with the OLD cold copy (network-error path). PR #10 fixed backend only; needs sync.

---

## 2026-03-13 — Multi-Gate System, Documentation Update

### Multiple Simultaneous Task Gates
- **Change**: Upgraded from single `taskGateIndex Int?` to `taskGates Int[]` array on `ClassWeekUnlock`. Teachers can now set gates at any combination of positions between storyboard steps.
- **Student gating logic**: Student is blocked when their `currentTaskIndex` matches any gate in the array. Passing a gate position doesn't re-block.
- **Teacher UI**: Gate markers toggle independently (click to activate/deactivate). Gate control bar shows count + labels. "Advance" removes the lowest gate; "Remove All" clears everything.
- **Backend**: PATCH endpoint accepts `{ taskGates: number[] }`, deduplicates and sorts. Socket broadcasts full array.
- **PEARL bark**: Only fires when student transitions from gated → ungated (was previously firing on every gate update).
- **Migration**: `20260312072042_multi_task_gates` — drops `taskGateIndex`, adds `taskGates Int[] @default([])`.
- **Files**: schema.prisma, classes.ts, shifts.ts, shiftQueue.ts (types), teacher.ts (API), shiftQueueStore.ts, App.tsx, ShiftStoryboard.tsx

## 2026-03-12 — Task Gating, Class Monitor Filter, TOEIC Vocab, Ministry Naming, Storyboard Videos

### Task Gating System (Teacher Pace Control)
- **New feature**: Per-class, per-week task gating. Teacher places gate markers between storyboard steps — students hit "Station Hold" overlay with Party-style rotating messages until teacher advances.
- **Real-time**: `session:gate-updated` socket event broadcasts to `class:${classId}` room. All waiting students proceed instantly.
- **PEARL bark**: Students get in-world notification when gate lifts.
- **Student gate screen**: "AWAITING CLEARANCE" badge, lock icon, amber pulse animation, rotating dystopian messages (8-second cycle).
- **Files**: New `TaskGateOverlay.tsx`, modified schema.prisma, classes.ts, shifts.ts, shiftQueueStore.ts, App.tsx, ShiftStoryboard.tsx, ShiftQueue.tsx, teacher.ts, shiftQueue.ts types

### Gate Marker Visibility Fix
- **Bug**: GateMarker between storyboard steps used `opacity-0 group-hover:opacity-100`, making gates invisible unless hovered.
- **Fix**: Replaced with always-visible `bg-slate-50 text-slate-400` styling with dashed border lines.

### Class-Filtered Live Class Monitor
- **Change**: Live Class Monitor now filters students by the selected class in the teacher dashboard.
- **"Students" button**: On ClassManager class cards, now sets `selectedClassId` in Zustand store and smooth-scrolls to the ClassMonitor section.
- **Removed**: "All Classes" dropdown option (monitor always shows selected class).

### TOEIC-First Vocabulary Documentation
- **New principle**: TOEIC-aligned words come first in `targetWords`; world-building/story words come second.
- **Week 1 vocabulary breakdown**: Documented the full 25-word split (10 targetWords, 10 dictionary targets, 6 world-building). Week 1 is locked as narrative-first exception.
- **Files**: docs/world-and-story.md, CLAUDE.md (locked decision added)

### Ministry Naming Fix
- **Change**: All instances of "Ministry for Healthy and Safe Information" → "Ministry for Healthy and Safe Communication" across codebase.
- **Files**: TerminalView.tsx, seed.ts, World_Canon.md, Dplay_Source_Integration_Notes.md

### Storyboard & Video Clip System Enhancements (from prior session)
- **Storyboard derived from WeekConfig**: Steps now match actual student tasks instead of hardcoded 7-step sequence.
- **Auto-create Mission records**: Opening storyboard ensures DB records exist for all WeekConfig tasks.
- **Video clip per step**: Upload or embed URL, with hide/show toggle (`videoClipHidden`).
- **Movie theater mode**: Full-screen black overlay with CRT monitor during task clip playback.
- **Seed preservation**: Re-running seed preserves existing `teacherOverride` data.

## 2026-03-10 — Chromebook Compatibility, Task Randomization, Touch Support, Task Controls Fix

### Chromebook / Short Viewport Fixes
- **Proceed button relocated**: "PROCEED TO YOUR STATION" and "SKIP (TEST)" buttons moved from below the CRT monitor into the video player area itself (absolutely positioned inside the clip-path screen region). Ensures visibility on Chromebook viewports where the monitor image fills most of the screen.
- **Approach**: User preferred keeping the full-size monitor rather than constraining it with `max-height`. Button now overlays at `bottom-[8%]` inside the CRT screen with frosted green background + blur.

### TaskCard Dropdown Clipping Fix
- **Bug**: ErrorCorrectionDoc's word-correction dropdown was clipped by `overflow-hidden` on the parent TaskCard container.
- **Fix**: Removed `overflow-hidden` from TaskCard's main div. Wrapped the "APPROVED" stamp watermark in its own `overflow-hidden` container so the stamp still clips correctly without affecting child dropdowns.
- **File**: `frontend/src/components/shift-queue/TaskCard.tsx`

### Option Randomization (All Quiz/Match Tasks)
- **WordMatch**: Added Fisher-Yates shuffle for both word column (`shuffledWords`) and definition column (`shuffledDefs`) — both independently shuffled on mount via `useRef`.
- **VocabClearance**: Item order shuffled + option order within each item shuffled. `correctIndex` remapped after shuffling.
- **ErrorCorrectionDoc**: `normalizeErrors()` now shuffles dropdown option order and remaps `correctIndex`.
- All three use the same `shuffle<T>()` utility (Fisher-Yates).

### Writing Prompt Simplification (Vocabulary-Focused)
- **Change**: Shift report prompts across all 3 weeks changed from content-recall ("describe what happened during your shift") to vocabulary-usage ("Write your shift report using 3 to 5 sentences. Try to use as many of the target words as possible").
- **Lane 1 guided questions**: Changed from comprehension-based ("What did you learn about the Ministry?") to vocabulary-pairing exercises ("Write a sentence using 'arrive' and 'check'").
- **Lane 1 hints**: Simplified to basic sentence starters ("I arrived at..." / "First, I had to...").
- **Pedagogy**: Aligns with Involvement Load Hypothesis — "need + search + evaluate" engagement with target vocabulary is more effective for A2-B1 learners than content recall.
- **Files**: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts`

### PEARL Writing Evaluation Updated
- Backend evaluation criteria in `POST /api/submissions/evaluate` updated to match vocabulary-focused prompts.
- AI rubric now evaluates vocabulary usage and natural integration rather than content accuracy.
- **File**: `backend/src/routes/submissions.ts`

### Teacher Task Controls Fix (Server Persistence)
- **Bug**: Skip Task, Reset Task, Reset Shift, and Send to Task only updated local Zustand state — refreshing the page or reconnecting reset everything back to onboarding.
- **Fix**: All shiftQueueStore control functions now persist to the server:
  - `skipCurrentTask()`: Async — calls `submitMissionScore()` with score 0 + `{ skipped: true }`
  - `goToTask()`: Async — persists all skipped tasks before the target
  - `resetShift()`: Async — calls new `resetWeekScores()` API to delete mission scores
  - Added `reloadFromServer()` for state sync
- **New backend endpoint**: `DELETE /api/shifts/weeks/:weekId/scores` — deletes all MissionScore records for a given week
- **New frontend API**: `resetWeekScores(weekId)` in `frontend/src/api/shifts.ts`
- **Socket handler**: `onTaskCommand` in App.tsx made async with null weekConfig guard + PEARL feedback
- **Files**: `frontend/src/stores/shiftQueueStore.ts`, `frontend/src/App.tsx`, `backend/src/routes/shifts.ts`, `frontend/src/api/shifts.ts`

### Touch Support for Chromebooks
- Added `active:scale-[0.97]`, `active:scale-95`, `active:bg-*` states across all interactive elements for touchscreen Chromebooks.
- **Files affected** (10+ components): OfficeView, FrostedGlassPlayer, TerminalDesktop, VocabClearance, WordMatch, WordSort, ClozeFill, ComprehensionDoc, ErrorCorrectionDoc, PriorityBriefing, PrioritySort, IntakeForm

### Login Page Music Replacement
- Replaced `The_Iron_Grip_Overture.mp3` with `Synthetic_Serenity.mp3` as background music on the login page.
- **File**: `frontend/src/pages/Login.tsx`

### Welcome Video — Visual Polish
- Added CRT vignette overlay (`box-shadow: inset`) for gradient edge blending with monitor frame.
- Added subtle screen glare (`radial-gradient` overlay).
- Playback controls (rewind, pause/play) made visible with `opacity-40` baseline (previously `opacity-0`).
- Volume knob repositioned and styled as vintage brass knob on the bezel.

## 2026-03-10 — Frontend Build Fix, Welcome Video System, Retro Monitor Frame

### Critical Frontend Build Fix
- **Root cause found**: `ClarityQueueApp.tsx` had a mismatched JSX tag — retheme changed `<>` to `<div className="...">` but left closing as `</>`. This TypeScript build error **silently blocked ALL Railway frontend deploys** since the retheme commit. Railway kept serving the old pre-retheme bundle.
- **Impact**: All prior session fixes (video playback, delete button, full pastel retheme, autoplay handling) were invisible to users because the frontend never rebuilt.
- **Fix**: Single line change — `</>` → `</div>` in ClarityQueueApp.tsx.

### Welcome Video — Retro Monitor Frame
- **Design**: Welcome video now plays inside a retro CRT monitor image (`public/images/welcome-monitor.jpg`).
- **Technique**: `clip-path: polygon()` with 13 coordinate points traces the exact shape of the glossy black CRT screen opening. Video fills the full image area, polygon clips to screen shape.
- **CRT effects**: Scanline overlay (repeating-linear-gradient, opacity 4%) + radial glare gradient for retro tube feel.
- **Progress bar**: Overlaid on the monitor's green LED strip position — fills left-to-right as video plays with green glow.
- **Volume toggle**: Mute/unmute button inside the screen area (bottom-right).
- **Autoplay handling**: Detects browser autoplay rejection, shows "Begin Orientation" play button overlay.
- **Fallback**: If no video uploaded, shows green CRT text "WELCOME TO THE MINISTRY" inside screen.
- **Proceed button**: Only appears after video ends, below the monitor image.
- **CA-1 test bypass**: "SKIP (TEST)" button below monitor for test user.
- **Files**: `frontend/src/components/welcome/WelcomeVideoModal.tsx`, `frontend/public/images/welcome-monitor.jpg`

### Welcome Video Backend Fixes (from prior session, now deployed)
- `GET /api/dictionary/welcome-video` route moved BEFORE `router.use(authenticate)` — `<video>` tags can't send auth headers.
- `DELETE /api/dictionary/welcome-video` endpoint added for teachers.
- Upload path resolution fixed with `path.isAbsolute()` check for Railway's `/data/uploads`.
- Frontend `resolveUploadUrl()` extended to handle `/api/` paths.
- Video served via static `/uploads/welcome/welcome-video.mp4` path (express.static, no auth needed).
- Teacher ShiftsTab: video existence check (HEAD), upload, delete button with status indicator.

## 2026-03-09 — Full Shift Queue Retheme, Teacher Class/Student Management, WordMatch Fix

### Shift Queue "Forced Happy" Retheme (16 components)
- **Problem**: All shift queue task components used dark CRT terminal styling (ios-glass-card, neon-cyan/mint/pink colors, dseg7 font, text-white/* opacity) which contradicted the "forced happy" totalitarian government iOS aesthetic.
- **Solution**: Systematic retheme of ALL 16 shift queue components to light pastel palette:
  - Cream backgrounds (#F5F1EB, #FAFAF7), white cards, warm gray borders (#D4CFC6, #E8E4DC)
  - Sky-600 primary actions, emerald success states, rose error states, amber warnings
  - TerminalAppFrame stays dark (device chrome), content area is cream/white (government app content)
- **Files rethemed**: ShiftClosing, ClarityQueueApp, ShiftQueue, TaskCard, IntakeForm, ClozeFill, VocabClearance, WordMatch, DocumentCard, ErrorCorrectionDoc, ComprehensionDoc, DocumentReview, ShiftReport, PriorityBriefing, PrioritySort, ContradictionReport, WordSort, LaneScaffolding, TargetWordHighlighter, WritingEvaluator
- Removed all references to: `ios-glass-card`, `ios-glass-pill`, `ios-glass-pill-action`, `ios-glass-input`, `font-dseg7`, `text-neon-*`, `text-white/*`, `border-neon-*`, `bg-neon-*`, `text-terminal-*`, `ios-text-glow`
- Removed "LANGUAGE LAB" location label from shift queue header

### WordMatch Task Fix + Redesign
- **Bug**: Matching interaction completely broken due to inverted ternary logic — `pair.definition === pairs.find(p => p.word === defWord)?.definition ? false : defWord === word` — correct matches returned false.
- **Fix**: Simplified to `const isCorrect = selectedWord === defWord` with clean direct state management.
- **Redesign**: Rewrote from scratch with light pastel theme, proper tap-to-match interaction, visual feedback for correct/wrong matches.

### Teacher Class & Student Management
- **Class deletion**: `DELETE /api/classes/:classId` — cascade deletes enrollments, week unlocks, harmony posts.
- **Student removal from class**: `DELETE /api/classes/:classId/students/:studentId` — removes enrollment only.
- **Permanent student deletion**: `DELETE /api/teacher/students/:studentId` — cascade deletes Pair record + 11 related tables (pairDictionaryProgress, missionScore, recording, pearlConversation, narrativeChoice, harmonyPost, harmonyCensureResponse, classEnrollment, characterMessage, citizen4488Interaction, shiftResult).
- **Bulk student deletion**: `DELETE /api/teacher/students` — iterates all pairs + legacy users for full wipe.
- **ClassManager.tsx**: Full rewrite — expandable Students panel per class (individual Remove buttons), expandable Weeks panel, Delete class button with red confirmation dialog.
- **ClassMonitor.tsx**: Added per-student "Delete" link + "Delete All" button in header, both with destructive confirmation dialogs.
- **Key insight**: Class deletion only removes ClassEnrollment (the link), NOT User/Pair account records. Separate student deletion endpoints were needed for permanent removal.

## 2026-03-06 — Harmony UI Redesign, PEARL Guardrails Hardening, Data Fixes, Hybrid Class Design

### PEARL AI Guardrails Hardened (4-layer defense)
- **Layer 3a (pre-filter)**: Expanded from 14 to 22 regex patterns. Now catches copy-pasted quiz question formats ("Which word means...", "Choose the correct...", fill-in-the-blank underscores).
- **Layer 3b (task context injection)**: Strengthened for quiz tasks (`vocab_clearance`, `document_review`, `grammar`). When student is on a quiz, AI gets aggressive "CRITICAL — QUIZ IN PROGRESS" instruction forbidding definitions, synonyms, and target word mentions.
- **Layer 4 (post-response filter, NEW)**: After AI responds, checks if response contains any of the target vocabulary words while student is on a quiz task. If leaked, response is replaced with an in-character deflection. Catches cases where GPT ignores system prompt.
- Bug found in production: student copy-pasted "Which word means 'to reach a place after traveling'?" and PEARL gave a full explanation pointing to "arrive". Layer 3a now catches the "which word means" format instantly.

### Harmony UI Redesign (frontend)
- **Thread/reply view**: Tap any post → see replies + compose reply. Back button returns to feed.
- **Citizen-4488 visual distinction**: Amber border/dot/text, "COMMUNITY POST — REVIEW FOR LANGUAGE COMPLIANCE" notice on NPC posts.
- **Censure action buttons**: APPROVE / CORRECT / FLAG on all NPC posts, wired to backend `/censure` endpoint with Citizen-4488 interaction logging.
- **Target word highlighting**: Focus words highlighted in cyan, review words in amber within post content.
- **Collapsible vocabulary section**: Show/hide toggle to save screen space.
- **Reply count indicators**: Posts show count, clicking opens thread.
- **API cleanup**: Added `censurePost` to `harmony.ts` API module.

### Data Consistency Fixes (seed)
- **TOEIC category casing**: Normalized 29 Title Case entries (`'General Business'` → `'business'`, `'Office Procedures'` → `'procedures'`, etc.) to match teacher dashboard dropdown options.
- **Duplicate `confirm` removed**: Was seeded in both Week 1 and Week 3; `confirm` is a Week 1 target word only.
- **Harmony vocabulary spine aligned**: `getHarmonyReviewContext()` now pulls from WeekConfig `targetWords` (what students practice in shift tasks) instead of storyPlans `newWords` (narrative anchor words). Falls back to storyPlans for weeks 4+ without a WeekConfig.
- **Harmony seed posts rewritten**: All 9 posts now naturally use actual shift target words (arrive, follow, check, report, submit, etc.) instead of story anchor words (compliance, directive, protocol, clearance). PEARL notes document which target words appear in each post.

### Hybrid Class Design (planning — not yet implemented in code)
- Established pedagogical framework for blended physical + digital learning.
- Key principle: "Teacher introduces. App drills. Physical activities produce."
- Designed 4-phase hybrid shift template for 50-minute classes:
  1. **Ministry Briefing** (teacher-led, 12-15 min): retrieval drill, new word introduction, Clip A + discussion
  2. **Field Assignment** (physical in-world activity, 10-12 min): rotating Ministry procedures
  3. **Station Work** (app-driven, 15-18 min): vocab_clearance MCQ + core analysis task
  4. **Debrief + Clock-Out** (hybrid, 8-10 min): Clip B reveal + Shift Report writing or verbal exit
- Designed 6 physical "Ministry Procedures" activity types: Oral Compliance Review, Evidence Board, Citizen Debrief, Ministry Dictation, Priority Board, Public Address Drill.
- Mapped Week 1 → Oral Compliance Review, Week 2 → Evidence Board, Week 3 → Priority Board.
- Identified minimal app changes needed: compact intake_form mode, `teacherLed` task gating, teacher "advance to Station Work" signal.
- Vocabulary encounter chain: 12+ encounters per word across teacher intro, pronunciation drill, physical activity, MCQ, document reading, writing, Harmony.
- Next steps: decide restructure depth (light/medium/full), generate printable Ministry materials, consider teacher Session Control panel.

## 2026-03-06 — Harmony Weekly Review Feed + Story/Vocab Wiring

### Harmony as Weekly Vocabulary Review Surface
- Harmony feed now uses the student pair's current shift progression to decide what posts are visible.
- Feed response now returns current-week `focusWords` and previous-week `reviewWords` so Harmony functions as retrieval practice, not just ambient flavor.
- Harmony is unlocked from Shift 1 instead of waiting until Shift 3.

### Seeded Story/Vocabulary Integration
- Added shared `WEEK_STORY_PLANS` source so Harmony review context and seeded narrative posts use the same weekly story words.
- Added week-tagged Harmony seed posts for Weeks 1-3 with visible author labels (`Citizen-2104`, `CA-18`, `Citizen-4488`, etc.) instead of anonymous NPC posts.
- Seeded posts now deliberately recycle prior-week anchor vocabulary inside new-week Harmony content:
  - Week 1 posts circulate `directive`, `protocol`, `compliance`, `clearance`
  - Week 2 posts introduce `contradiction`, `missing`, `notice`, `revision` while carrying Week 1 terms
  - Week 3 posts introduce `clarify`, `queue`, `priority`, `dispatch` while carrying Week 2 terms

### Runtime/Backend Changes
- Added Harmony post metadata fields for `authorLabel` and `weekNumber`.
- New Harmony API behavior:
  - filter seeded posts by current unlocked week
  - preserve class scoping
  - assign student-created posts to the student's current week
  - inherit `weekNumber` on replies
- Added shared progression helper so week-aware logic is not duplicated between Dictionary and Harmony routes.

### Verification Notes
- Backend build, frontend build, Prisma client generation, and database seed completed successfully after implementation.
- Local Prisma migration engine returned a generic schema-engine error during `migrate deploy`; migration SQL was still added to the repo, and the two Harmony columns were applied directly to the local dev DB to verify seed/runtime behavior end to end.

### Remaining Follow-Up
- ~~Align live Week 1-3 queue `targetWords` and `previousWords` with the canonical story-plan anchor vocabulary~~ — DONE: `getHarmonyReviewContext()` now pulls from WeekConfig targetWords. Harmony seed posts rewritten with actual shift target words.

## 2026-03-06 — Student Work Persistence, Teacher Grades, Vocab Stemmer

### Student Data Persistence
- Student writing text now saved in `MissionScore.details` JSON blob (writingSubmissions, justifications, writingText) across all writing tasks (IntakeForm, PriorityBriefing, ContradictionReport, PrioritySort, ShiftReport)
- Concern score hydrated from DB on login/refresh (was always 0 before)
- Fixed stale closure bugs in IntakeForm, PriorityBriefing, PrioritySort where last card's writing was lost

### Teacher Grade Management
- 4 new backend endpoints: edit score, delete score, reset week progress (cascade), override concern
- Gradebook rewrite: detects dual week types (ShiftQueue weeks 1-3 vs PhaseRunner weeks 4+), inline score editing, per-task writing viewer, week reset with confirmation
- Moved welcome video upload from Dictionary tab to Shifts tab
- Fixed Dictionary tab readability (dark theme → light palette)
- Removed fake test pairs CA-2 through CA-5 from seed

### Porter Stemmer for Vocabulary Matching
- Replaced ad-hoc suffix regex (which failed on e-dropping, consonant doubling) with Porter Stemmer (1980)
- Applied to both frontend `TargetWordHighlighter` chips and backend `POST /api/submissions/evaluate`
- "arrived", "submitted", "following" all correctly match their base target words
- Aligned with CEFR A2-B1 word family standards (Bauer & Nation, 1993 Level 2)
- Shared stemmer: `frontend/src/utils/stemmer.ts` and `backend/src/utils/stemmer.ts`

## 2026-02-11 — Timeline + Media Authoring Lock
- Added fixed 18-shift story/learning/environment media plan:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Story_Learning_Environment_Timeline.md`
- Locked authoring order so media plan is defined before activity design:
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
- Confirmed operational preference:
  - keep teacher video upload open
  - run class flow in sequence (`clip_a -> activity -> clip_b`)
- Added downloadable Canva production script pack for Weeks 1-3:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.md`
- Added downloadable Word exports for script distribution:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.docx`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Weeks_01_03_Script_Pack.docx`

## 2026-02-11 — Content/Design Progress
- Locked guided student flow and teacher-controlled sequence (`clip_a -> activity -> clip_b`).
- Added dual video pipeline (embed + true upload) and Three.js TV playback support.
- Built Week 1-3 lesson packages in script-first format.
- Integrated Desktop Dplan canon into Week 1-3 scripts.
- Added semester outcomes framework aligned to 50-minute class reality.

## 2026-02-11 — Knowledge/Canon Documentation
- Added world canon summary:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/World_Canon.md`
- Added script writing style + vocabulary control guide:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Script_Writing_Style_Guide.md`
- Added Desktop source integration notes:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Dplay_Source_Integration_Notes.md`
- Updated core knowledge files:
  - `/Users/ryanrudat/Desktop/Lexical Republic/memory.md` _(merged into CLAUDE.md on 2026-02-13)_
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/TAIWAN_G10_VOCAB_WORKING_LIST.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Semester_Outcomes_Framework.md`

## Next Confirmed Step
- Write Weeks 4-6 full script packs using fixed media timeline
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for all 18 shifts
- Hybrid class model app changes (compact intake_form, teacher "advance to Station Work" signal — multi-gate system now implemented)
- Printable Ministry materials (Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards)
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume
- Expand dictionary seed data beyond Weeks 1-3 (currently 49 words, target ~120+ across 18 weeks)
