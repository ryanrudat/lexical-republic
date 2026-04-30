# The Lexical Republic — Project Instructions

Last updated: 2026-04-30

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world.

Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Quick Reference

### Commands
**Frontend:** `npm run dev` | `npm run lint` | `npm run build`
**Backend:** `npm run dev` | `npm run build` | `npm run db:migrate` | `npm run seed` | `npm run test`

### Development Credentials
- Teacher: `teacher` / `teacher123`
- Test student: `CA-1` with PIN `1234`

### Key Paths
- Backend: `backend/` (Express 5 + TypeScript + Prisma + PostgreSQL)
- Frontend: `frontend/` (Vite + React + TypeScript + Tailwind + Zustand)
- Week configs: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts`, `week4.ts` (weeks 5-6 planned in `Dplan/Weeks_04_06_Shift_Plan.md`)
- Dplan docs: `Dplan/`
- External canon: `/Users/ryanrudat/Desktop/Dplan/`

## Locked Decisions
- PEARL should feel ambient, constant, and authoritative — not optional, not a chatbot.
- **PEARL eye never blinks** — eye has look-around and attention moments only.
- Story and learning targets live in mission config, not hardcoded UI logic.
- Avoid too many empty app areas; keep student UI focused.
- Briefing video should be followed by comprehension/activity checks.
- Preserve Week 1 onboarding as the canonical first narrative beat.
- **NEVER touch background images, image sizing, object-fit, or image positioning** without explicit user permission.
- **ALL OfficeView overlays** must use image-space percentages + `imageToViewport()` — never fixed viewport CSS percentages.
- **NEVER change the PEARL sphere colors/style** unless explicitly asked.
- **Vocabulary is TOEIC-first** — `targetWords` in each WeekConfig should prioritize TOEIC-aligned words; world-building/story words are layered in through narrative context. Week 1 is locked as-is (narrative-first exception).
- **pOS digital-first interactions** — task confirmations use `AuthorizationToast` (PEARL eye + progress ring + checkmark), NOT physical rubber stamps. The OS is the authority, not a bureaucrat with a stamp.
- **"Clarity Check" is the canonical in-world name** for pop-up vocab verifications — reuses the "Clarity" namespace (Clarity Queue, Clarity Tea, Clarity Associates) and mirrors the children's rhyme "Check your words, check your tone."
- **"Compliance Check" is the per-class teacher-scheduled lockout sibling of Clarity Check.** Configured per-class in the Shifts tab (NOT on-demand from ClassMonitor). Teachers pick exact words from a TOEIC-grouped picker; checks fire automatically at chosen placement points (`shift_start | shift_end | after_task`) inside the student's shift cascade. One-shot per `(pair, template)` enforced via DB unique constraint. Different classes can have different templates for the same shift.

## Detail Files
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning
- [Pedagogy Doctrine](docs/pedagogy.md) — foundational principles, vocabulary doctrine, scaffolding, task taxonomy/SLA, writing rubric (on-topic veto + vocab), retrieval, narrative-as-pedagogy, Mandarin L1, quick reference. **Source of truth for "how does this app teach?"**
- [Narrative & Pedagogy Review 2026-04-17](Dplan/Narrative_Pedagogy_Review_2026_04_17.md) — cross-cutting review of shift scripts, Harmony, PEARL voice; prioritized findings + W4-6 forward-look

## Harmony Expansion Status
Harmony expansion is in progress. See `Dplan/Harmony_Expansion_Review.md` for the full design review.
- **Phase 0 (bug fixes)**: DONE — generation race condition, dead gate code, censure action fix, orphaned post sweep
- **Phase A (cumulative review + route awareness)**: DONE — 3-tier vocab (focus/recent/deep), route-aware generation/queries, differentiated mastery (+0.05 current / +0.03 review), cumulative censure review items
- **Phase B (world-building content engine)**: DONE — world bible, 5 NPC character definitions with arc phases, 4 new content types (bulletin/pearl_tip/community_notice/sector_report), per-type generator, component registry, bulletin comprehension endpoint
- **Phase B+ (content overhaul)**: DONE — character-first post rewrites, expanded world bible (food/media/hobbies/traditions/citizen roster), unified Citizen-XXXX naming, AI prompt overhaul ("Write about PEOPLE, not vocabulary"), vocabulary recycling (spaced repetition), Vitest validation suite, startup authorLabel migration
- **Phase B++ (4-tab UI)**: DONE — government portal navigation (Feed / Ministry / Sector / Review), client-side post filtering, MinistryTab + SectorTab components
- **Phase C (archives + polish)**: DONE — 5-tab UI (Feed / Ministry / Sector / Review / Archives), Archives tab with 3 sub-sections (Vocabulary by Week with mastery bars, Citizen-4488 Case File timeline, Bulletin Archive), `lastHarmonyVisit` tracking (Prisma migration), NEW badges on unseen posts, notification dot on Harmony tile via `harmony:new-content` socket event, PEARL ambient annotations (session-based: censure streaks, 4488 flag/approve reactions), `GET /api/harmony/archives` + `GET /api/harmony/has-new` endpoints.
- **Visual enhancements**: Ideas saved in `Dplan/Harmony_Visual_Enhancement_Ideas.md` (propaganda ticker, 4488 glitch, typewriter bulletins, etc.)

### Harmony Data Files
- `backend/src/data/harmonyWorldBible.ts` — 8 locations, 5 regulations, weekly culture, approved media, food culture, domestic life, traditions, children's world, citizen roster (`CORE_CITIZENS` + `BACKGROUND_CITIZENS` with `getActiveCitizens(week)`)
- `backend/src/data/harmonyCharacters.ts` — 5 NPCs with 3-phase arcs + condensed overrides (Citizen-XXXX naming)
- `backend/src/data/harmonyFeed.ts` — 12 character-first seed posts weeks 1-3 with spaced vocabulary recycling (15 once PR #12 lands: adds 2nd 4488 post per week)
- `backend/src/data/harmonyBulletins.ts` — static bulletins weeks 1-3 with comprehension MCQs
- `backend/src/data/harmonyPearlTips.ts` — static PEARL grammar tips weeks 1-3
- `backend/src/data/harmonyCommunityContent.ts` — immersive notices + sector reports weeks 1-3
- `backend/src/data/__tests__/harmony-vocabulary.test.ts` — Vitest suite (34 tests: word coverage, char limits, spaced repetition)
- `backend/src/utils/harmonyMigrations.ts` — startup migration: old authorLabels → Citizen-XXXX
- `frontend/src/data/citizen4488Posts.ts` — frontend shim mirroring 4488 posts for ShiftClosing "Case File Update" card (1 post per week on master; 2 per week once PR #12 lands)

### Task Result & Scoring Utilities (added 2026-04-17 via PR #9)
- `frontend/src/types/taskResult.ts` — canonical `TaskResultDetails` shape every task component emits: `{ taskType, itemsCorrect, itemsTotal, category, errorsFound?, errorsTotal? }`
- `frontend/src/utils/scoreAggregator.ts` — pure `aggregateTaskResults()` reducer used by ShiftClosing. Returns per-category `null` when no tasks contributed (no more inflated fallback).
- `frontend/src/utils/scoreAggregator.test.ts` — Vitest suite (11 tests) covering averaging, weighting, skipped-category fallback, legacy-shape graceful handling.
- **Frontend Vitest** now set up: `cd frontend && npm run test` runs the scoreAggregator suite.

## Recent Work (2026-04-30)

Four commits on master polishing the W3 Priority Sort cascade and aligning it to the finalised Clip A script. Yesterday's cascade redesign (`d2dd9ef`) shipped to production via this batch — the user reported the OLD UI was still showing because **`tsc -b` was failing on legacy field references from the rubric redesign** (`b3ae4a0`), so Railway had been silently serving the pre-`b3ae4a0` bundle. Critical lesson: `npx tsc --noEmit` (what I'd been using) is laxer than `tsc -b` (what `npm run build` runs). Always use `npm run build` for frontend pre-push verification.

**`89f67e8` — Fix tsc -b build failure (unblocks Railway deploy)** — two stale references to fields removed in `b3ae4a0`: `D1StructuredWriting.tsx:119` `evaluation?.taskScore` → `evaluation?.vocabScore` (taskScore was the old 3-axis relevance field; vocabScore is the only numeric axis post-redesign); `WritingEvaluator.tsx:324-326` `lastResult.taskNotes` → `lastResult.onTopicReason` gated on `lastResult.onTopic === false` so the rose-toned note only renders for off-topic-specific failures. After this push, the entire backlog (`2fe2b83` typing animation + `b3ae4a0` rubric redesign + `d2dd9ef` cascade) finally went live.

**`31587bb` — Randomize Priority Sort case order + persistent directions card** — Fisher-Yates shuffle on mount via useMemo so each shift attempt presents the 6 cases in a fresh order. Prevents pattern-memorisation across class peers and across re-attempts. Correctness data lives on each case object (correctColumn, disappears flag), so order is purely presentational — scoring and the case-5 disappearance narrative beat (Wellness Division reassignment) still fire correctly wherever case 5 lands. Added a compact persistent directions card between the terminal header and active case zone, hidden during verifying/verified so the results panel reads cleanly. Three numbered steps + a one-line color key (URGENT/ROUTINE/HOLD with one-word glosses).

**`17d94a6` — Fix Priority Sort verify-stage freeze + add Examples & Tips collapsible panel** (the critical one). Students were stuck on "VERIFYING CLASSIFICATION..." for 8+ minutes. Root cause was a useEffect cleanup race I introduced in `d2dd9ef`: a single useEffect with deps `[sortStage, allCasesClassified]` scheduled t1 (set 'verifying' at 400ms) AND t2 (runVerification + set 'verified' at 1400ms). When t1 fired and `sortStage` changed, the effect re-ran, cleanup fired, **t2 was cleared before it could execute**. Fix: split into two single-shot effects (cascade→verifying watching `[sortStage, allCasesClassified]`; verifying→verified watching `[sortStage]`). Each effect's timeout is in its own cleanup window — neither can cancel the other. **Pattern to remember**: when a single useEffect schedules multiple setTimeouts where one of those timeouts changes a dep of the same effect, the cleanup races the later timeouts. Split per state. Same commit added an `<details>`-based "Examples & Tips" collapsible panel to the cascade UI, between the Directions card and the active case zone. Lane-aware default state (Lane 1 expanded — maximum scaffold for first exposure; Lane 2/3 collapsed but accessible). Pedagogical reasoning per `docs/pedagogy.md`: Cognitive Load Theory at A2-B1 means working memory holds ~4±1 chunks; each case already costs 3-4 chunks (parse English, identify signals, form hypothesis, justify); forcing students to also hold heuristic rules in memory pushes total load over capacity and they revert to keyword-matching. Reliable accessibility frees working memory for the actual cognitive work the task is supposed to teach. Content mirrors the ClassificationTraining overlay (3 folder explainers + 5-bullet identification heuristics) but uses a more compact `ExampleRow` component (label as colored chip instead of full Folder icon).

**`813b65b` — Align Shift 3 in-game with finalised Clip A script (3 fixes)** — script is final, app fixes catch up:
- **M1 — counter + bark match "six cases"**: `week3.ts` queue_status sequence `[3, 7, 12, 15]` → `[2, 4, 5, 6]`; pearlBark "Daily processing target: 15 cases" → "6 cases." No more 15-vs-6 contradiction between video and Priority Briefing card.
- **M2 — "respond" terminology**: kept "Priority Classification" as the system noun (script also uses it: "complete classification") but swapped action verbs throughout. Header subtitle: "Classify Each Case" → "Respond to Each Case." Directions card: "Click the folder that matches its priority" → "Respond by clicking the folder that matches the case's priority"; "classify all 6" → "respond to all 6". Training subtitle: "Read carefully." → "Read carefully and respond." Cloze fill's separate "respond to inquiries" sense unchanged — natural polysemy across senses is acceptable A2-B1 input.
- **M3 — FORWARDED TO STANDARD CHANNEL pip**: after each case animates into its folder, brief emerald pill ✓ "Forwarded to Standard Channel" fires in the active case zone for ~650ms before the next case slides in. Per-case timing extends 700ms → 1150ms (DEPART_MS 450 + FORWARDED_PIP_MS 650 + 50ms buffer); cumulative cascade adds ~2.7s for 6 cases — acceptable trade for cinematic vocabulary enactment. Enacts Clip A Scene 4: *"Forward each complete classification through the standard channel."*

**Critical files (today's batch):**
- `backend/src/data/week-configs/week3.ts` — counter sequence + bark "6 cases"
- `frontend/src/components/shift-queue/tasks/PrioritySort.tsx` — shuffle, directions card, Examples & Tips panel, verify-effect split, "respond" terminology, FORWARDED pip
- `frontend/src/components/shift-queue/tasks/shared/WritingEvaluator.tsx` — legacy taskNotes → onTopicReason
- `frontend/src/components/activities/D1StructuredWriting.tsx` — legacy taskScore → vocabScore

---

## Recent Work (2026-04-29)

Three commits on master + a pedagogy doctrine doc written end-to-end. Today reframed how the app evaluates writing and how W3's centerpiece task feels.

**`2fe2b83` — Typing-indicator animation on Shift 3 Part 1 briefing card**: PEARL bubble shows three bouncing dots (~4.5s) → reveals message; 1.8s gap; Betty bubble does the same; Acknowledge button stays disabled (`bg-slate-200 text-slate-400 cursor-not-allowed`) until both messages have rendered. Animations live in `frontend/tailwind.config.ts` (`typing-dot`, `message-rise`, `bubble-pop-in` keyframes); component logic in `frontend/src/components/shift-queue/tasks/PriorityBriefing.tsx` via a `MessageBubble` subcomponent + sequenced useEffect with cleanup on unmount. Timing constants at top of file for easy tuning. Defensive against cards with only one of `pearlBark` / `bettyOverlay`. `motion-reduce:animate-none` on dots respects OS reduced-motion preference.

**`b3ae4a0` — Replace writing-eval rubric: on-topic veto + vocab; remove grammar scoring** (the big one). Pre-redesign rubric was grammar + vocab + relevance, averaged, pass at ≥0.4. Failure case from Image #2: a student wrote *"I should fart. I should poop. I should process and complete a review on the toilet as scheduled. My identity is in how my bodily functions function and respond"* — used target words, valid present-simple modals, no relevance penalty large enough → **scored 100%**. New rubric: **(1) on-topic boolean — strict veto** — off-topic = score 0.0; **(2) vocabScore (0–1)** — meaningful target-word use, the only numeric axis; **(3) grammarAdvisory: string** — non-scoring observation surfaced to teacher only, never affects student score. Submit Anyway and attempt-3 auto-pass both refuse to bypass the off-topic veto; student must rewrite to address the prompt. Touched: `backend/src/routes/submissions.ts` (rewrote prompt + EvaluationResult shape, computed score = `onTopic ? vocabScore : 0`), `backend/src/routes/teacher.ts` (`/writing-review` endpoint emits new fields + legacy fields for old rows), `frontend/src/types/{taskResult,sessions}.ts` (additive new fields, legacy preserved), `frontend/src/components/shift-queue/tasks/shared/WritingEvaluator.tsx` (off-topic blocks Submit Anyway with explicit message), `frontend/src/components/shift-queue/tasks/ShiftReport.tsx` (score formula = vocabScore clamped [0.1, 1.0]), `frontend/src/components/shift-queue/ShiftClosing.tsx` (off-topic banner above 9-card grid; Grammar Accuracy card now sourced exclusively from constrained tasks via existing category routing — no aggregator change needed), `frontend/src/components/teacher/{WritingReview,Gradebook}.tsx` (On-Topic chip, advisory text rendered italicised, legacy grammar score shown with "(legacy)" suffix), `frontend/src/api/teacher.ts` (`WritingReviewEntry` interface). Old MissionScore rows keep their old shape; new rows get new shape; UIs render either. Pre-existing react-hooks/set-state-in-effect lint warnings in WritingReview.tsx unchanged. Score aggregator vitest suite still 15/15.

**`d2dd9ef` — Redesign Priority Sort as cinematic case cascade with folder UI**. Pre-redesign Priority Sort rendered six text blocks stacked vertically with three pills under each — read as another quiz, blended with the rest of W3's tasks, no dramatic moment. Briefing video (`Image #4`/`#6`) shows a CRT terminal with header `6 CASES — PRIORITY CLASSIFICATION REQUIRED`, three color-coded folders (pink URGENT, tan ROUTINE, blue HOLD), `0/6` counters beneath each, and a footer (`MINISTRY OF CLARITY · CASE PROCESSING TERMINAL · v3.2.1`). The new component matches that frame-for-frame: terminal-screen banner header, identical typography, CSS-rendered manila folders (pink/tan/blue body + tab on top-left + inset shadow) with live `X / 6` counters, identical footer. Three layers shipped: **(1) ClassificationTraining overlay** (one-time per shift) — three folder explainers + identification heuristics (time signals, impact signals, "not urgent" flag, citizen-distress flag); Lane 1 gets simpler example sentences; Lane 2/3 share standard copy. **(2) One-by-one cascade** — cases arrive with `case-slide-in` animation + "INCOMING CASE N OF 6" pip; click a folder → case animates **directionally** toward that column (translate + scale-down + fade, 450ms), folder bounces (`folder-receive`), counter ticks (`counter-tick`), 700ms pause, next case slides in. **(3) Auto-verification + dystopian disappearance** — VerifiedSummary panel with per-folder ✓/✗ chips; case 5 glitches out via `incoming-glitch` keyframe while PEARL bark slides in announcing Wellness Division reassignment. Folder colors swapped to match video exactly (was URGENT=rose / ROUTINE=sky / HOLD=amber → now URGENT=rose / ROUTINE=amber / HOLD=sky). Scoring contract preserved unchanged (same `checkSorting` math, same `answerLog` shape, same disappearing-case narrative beat). Justify and done phases unchanged. New Tailwind keyframes (motion-reduce safe): `case-slide-in` (350ms), `case-pip-in` (600ms), `folder-receive` (320ms spring), `counter-tick` (400ms spring), `incoming-glitch` (600ms).

**Pedagogy doctrine doc (`docs/pedagogy.md`)** — 413 lines, 10 sections + quick reference. Written this session via 6 parallel research agents covering vocabulary, scaffolding, task taxonomy/SLA, writing/grammar/feedback, retrieval, and narrative-as-pedagogy. Updated end-to-end after the rubric redesign + Priority Sort cascade: §1 added principles 8 (centerpiece must mirror briefing video) and 9 (no grammar scoring on open writing); §5 fully rewrote around the on-topic + vocab rubric; §7.7 documents Priority Sort cascade as the centerpiece-continuity exemplar future shifts must follow. Source of truth for "how does this app teach?" — added to CLAUDE.md Detail Files.

**Critical files (today's batch):**
- `frontend/src/components/shift-queue/tasks/PriorityBriefing.tsx` — typing-indicator + sequenced reveal
- `backend/src/routes/submissions.ts` — new on-topic + vocab rubric (prompt + EvaluationResult + computedScore)
- `frontend/src/components/shift-queue/tasks/shared/WritingEvaluator.tsx` — off-topic veto enforcement (Submit Anyway block + attempt-3 auto-pass refusal)
- `frontend/src/components/shift-queue/tasks/PrioritySort.tsx` — cascade rewrite (~616 lines)
- `frontend/tailwind.config.ts` — 8 new keyframes/animations across the three commits
- `docs/pedagogy.md` — doctrine doc

---

## Recent Work (2026-04-27 / 28)

Compliance Check feature shipped, then redesigned end-to-end after teacher feedback that on-demand "fire from ClassMonitor" felt too abstract. Five commits on master.

**Initial Compliance Check** (commit `c3831bb`, on-demand pattern — superseded by redesign): teacher-issued screen-locking vocab MCQ via ClassMonitor button. Cyan PEARL eye SVG + look-around animation + lockout shell. Shipped end-to-end (Prisma `ComplianceCheckResult` + 4 routes + frontend mount + ClassMonitor buttons).

**Redesign — per-class scheduled templates** (commit `a640b30`): replaced the on-demand pattern with placement-based templates configured in the Shifts tab. Removed: `IssueComplianceCheckModal`, ClassMonitor buttons, `complianceCheckStore` (Zustand), App-root mount, `compliance-check:issued` socket event, on-demand backend issue routes. Added: new `ComplianceCheckTemplate` Prisma model (`(classId, weekNumber, placement, afterTaskId)` unique), `templateId` FK on `ComplianceCheckResult` with `(pairId, templateId)` unique for refresh-safe one-shot. Refactored `complianceDistractors.ts` to take a curated word list. New routes: `GET/POST/PUT/DELETE /compliance-check/templates`, `GET /compliance-check/pending`, `GET /teacher/dictionary-words/grouped`, `GET /compliance-check/teacher/shifts/:weekNumber/slots`. New components: `WordPicker`, `ComplianceCheckEditor`, `ComplianceCheckSlotList` (under `frontend/src/components/teacher/compliance-check/`). `ShiftQueue.tsx` cascade extended to `… → clarity check → compliance check → next task`. Bundled supporting infra (`ClarityCheck.tsx`, `InterTaskMoment.tsx`, narrative-choices route+api) needed for `ShiftQueue` to compile — W4 student-facing content (`week4.ts`, `MAX_BUILT_WEEK` bump, `week-configs/index.ts` registration) intentionally NOT pushed per the "hold off on Shift 4" directive.

**Polish + bug fixes** (commits `f6ce666`, `d721523`, `54ca0b0`):
- Hide ambient PEARL Dynamic Island during a Compliance Check (`body.compliance-check-active` class hides `.pearl-island`). Bumped shell to `z-[1000]` defensively.
- Fixed unreadable green option text — was inheriting body's terminal-green `#33FF33`. Explicit `text-slate-700` (and contextual emerald-900 / rose-900 / cyan-900 for state changes).
- Modal-level scale+blur entrance (450ms cubic-bezier) and exit (380ms triggered ~1.8s after MCQ completion via existing 2.2s post-completion delay window).
- **Slot bleed-over fix** (`d721523`): teacher reported templates from one shift showing in another shift's slot list. Three-layer defense — `key={classId-weekNumber}` on `ComplianceCheckSlotList` for hard remount on shift change, `setTasks([])`/`setTemplates([])` at start of `reload()` to clear stale render window, and `t.weekNumber === weekNumber` filter on both store + match.
- **Race-condition fix** (`54ca0b0`, the important one): student moved to a different shift mid-flight had a prior-shift's Compliance Check render anyway. Cause: `fetchComplianceCheckFor()` async promise from the OLD weekConfig still pending; its `.then()` resolved AFTER the reset effect cleared `activeComplianceCheck` and wrote stale prior-shift data back. Fix: cancellation token (`let cancelled = false; return () => { cancelled = true; }`) in both `shift_start` and `shift_end` cascade effects + `expectedWeek` snapshot compared against `cc.weekIssued` in the `.then()`. Same defensive snapshot in `handleComplete`'s `await fetchComplianceCheckFor('after_task', …)`. Render-time guard: `if (activeComplianceCheck && weekConfig && activeComplianceCheck.weekIssued === weekConfig.weekNumber)` prevents any leak that escapes the cascade-level cancellation.

**Critical files (Compliance Check):**
- `backend/prisma/schema.prisma` — `ComplianceCheckTemplate` + `ComplianceCheckResult` models
- `backend/prisma/migrations/20260428140000_add_compliance_check_result/` — initial table
- `backend/prisma/migrations/20260428180000_add_compliance_check_template/` — redesign migration (templates + templateId FK + pairId-templateId unique)
- `backend/src/routes/compliance-check.ts` — all 8 endpoints (templates CRUD, pending, complete, results, slots)
- `backend/src/utils/complianceDistractors.ts` — `buildComplianceQuestions(selectedWords, count)` — curated-word version
- `backend/src/routes/teacher.ts` — added `GET /dictionary-words/grouped?toeicOnly=true`
- `frontend/src/components/teacher/compliance-check/WordPicker.tsx` — grouped-by-shift word picker (TOEIC filter, search, bulk toggles, expand/collapse)
- `frontend/src/components/teacher/compliance-check/ComplianceCheckEditor.tsx` — modal: title, word picker, question count, cumulativeReviewCount, live preview with re-roll, save/remove
- `frontend/src/components/teacher/compliance-check/ComplianceCheckSlotList.tsx` — placement slots derived from WeekConfig.tasks per shift
- `frontend/src/components/teacher/ShiftsTab.tsx` — Compliance Checks section, `key={classId-weekNumber}` on slot list
- `frontend/src/components/compliance-check/{ComplianceEye,ComplianceCheckShell,ComplianceCheckMCQ}.tsx` — student-side rendering
- `frontend/src/components/shift-queue/ShiftQueue.tsx` — cascade integration with cancellation tokens
- `frontend/src/api/compliance-check.ts` — full client API (templates CRUD, pending, complete, results, slots, dictionary grouped)

## Recent Work (2026-04-23 / 24)

Three batches shipped to master (commits `226ab52`, `92f53a7`, `73f43bf`). Clarity Check system built and ready to commit. W3 rebase conflicts from prior stashed work resolved.

**Shipped to master:**

- **Harmony live post rendering fix** (commit `73f43bf`): when a student creates a post, the backend now emits `harmony:new-content` to the class room on approved submissions, and the frontend `onHarmonyNewContent` handler refetches when `viewStore.terminalApp === 'harmony'`. Previously peers had to sign out/in to see new posts. Touches `backend/src/routes/harmony.ts` + `frontend/src/App.tsx` + `frontend/src/stores/harmonyStore.ts`.

- **Harmony OpenAI content moderation** (commit `73f43bf`): replaces the fake 2-5s setTimeout auto-approve with a real OpenAI-driven review. `backend/src/utils/harmonyModeration.ts` runs a cheap profanity pre-filter then a rubric check (English, target-vocab use, compliant tone, on-topic, min length). Returns `{ verdict: 'approved'|'flagged', reason, pearlNote }`. Flagged posts visible ONLY to the author (no public shaming), status='flagged', with a PEARL rejection note. OpenAI failure defaults to approved (permissive). New `FLAGGED` chip in `HarmonyApp.tsx` feed card.

- **Harmony staggered timestamps + NPC replies** (commit `226ab52`): `harmonyGenerator.ts` now sets `createdAt` per post via per-type window (bulletins 2.5-5h, feed 10min-3.5h, etc.) so a freshly-seeded class doesn't look like every post dropped at the same instant. New `backend/src/utils/harmonyReplies.ts` — 60% probability gate, picks 1-2 random `BACKGROUND_CITIZENS` active that week, one OpenAI call, staggers inserts 30-150s apart. Citizen-4488 explicitly excluded from AI voicing.

- **Teacher Shift Review modal** (commit `92f53a7`): `frontend/src/components/teacher/ShiftReviewModal.tsx` — read-only class-wide snapshot of one shift's work. Button in ClassMonitor header next to "Move Class to Shift." Per-student rows with status chip, avg score, per-task chips with tooltips, expandable writing submissions, compact shift summary, "Gradebook →" drill-through. Read-only by design — score edits stay in Gradebook (one editing surface). Reuses existing `/api/teacher/gradebook` endpoint; no backend changes.

**Built, not yet committed (ready to commit):**

- **Clarity Check — screen-locking pop-up vocab verification**:
  - Backend: `backend/src/utils/harmonyModeration.ts` (NEW) writes moderation prompt. `backend/src/routes/clarity-check.ts` (NEW) `POST /api/clarity-check/complete` records correct answers and bumps dictionary mastery +0.03 per correct. Registered at `app.use('/api/clarity-check', clarityCheckRoutes)`.
  - Frontend: `frontend/src/components/shift-queue/ClarityCheck.tsx` (NEW) — screen-locking modal at `z-[90]` with `fixed inset-0`. ESC blocked, browser back blocked, covers terminal header (Home/Close click-blocked). MCQ flow: shuffled options, verify+feedback per question, final "Verification Recorded" summary, submit on finish.
  - Types: `ClarityCheckConfig`, `ClarityCheckPlacement` (`'shift_start' | 'shift_end' | { afterTaskId: string }`), `ClarityCheckQuestion`. Added `clarityChecks?: ClarityCheckConfig[]` to `WeekConfig` (both backend `types.ts` and frontend `shiftQueue.ts`).
  - Integration: `ShiftQueue.tsx` cascade extended to `dismissal video → vocab interstitial → inter-task moment → clarity check → next task`. Cleared on week change / task reset. `completedClarityCheckIdsRef` ensures one-shot per shift per id. Shift_end checks gated before `ShiftClosing` renders (no flicker).
  - Demo: Week 2 has `clarity-w2-start` at `shift_start` (3 MCQs on notice/inform/require) for live testing.

**Stashed/uncommitted W4 work resolved:** Pre-existing W3 rebase conflicts from the 2026-04-21 stash pop (W3 vocab definitions, cloze-fill passage, ShiftClosing partyObservation) were resolved by keeping upstream (PR #13) for week3.ts (live version students are running) and hand-merging ShiftClosing.tsx to preserve both upstream's W3 observation code AND stashed's W4 fragment observation + narrative-choices fetch. No conflict markers remain. W4 narrative-reactive feature files (week4.ts, InterTaskMoment.tsx, narrative-choices routes) are still sitting in the working tree per user's "hold off on Shift 4" directive.

**Batch shipped 2026-04-24 (score-visibility fix + teacher review overhaul):** 9 commits landed on master + Prisma migration applied to dev DB. All three open questions from the 2026-04-23 investigation are now shipped.

Shipped via parallel /batch run (6 PRs merged + 3 follow-up fixes):

- **#15 `addf4ac` — ShiftReport Submit Anyway + gradient scoring** — `tasks/ShiftReport.tsx` no longer gates `onComplete` on AI pass. After 1 failed WritingEvaluator attempt, a "Submit Anyway" button appears (gated on `minWords` default 20). Score = `clamp((grammarScore + vocabScore) / 2, 0.1, 1.0)` — no more hardcoded `1`. `details.submittedAnyway: true` surfaced for teacher review. Attempt-3 auto-pass kept as defense in depth. Students always reach ShiftClosing now.
- **#17 `a2b4fce` — Backend teacher comments + PEARL persistence + writing-review endpoint** — Prisma migration `20260424100000_add_mission_score_teacher_comment_pearl_feedback` adds `teacherComment String?` + `pearlFeedback String?` to `MissionScore`. `POST /api/pearl-feedback` now persists generated feedback into the column (keyed by pairId + missionId, fail-open). `submissions.ts /evaluate` also stores pearlFeedback + writingText in details as belt-and-braces backup. New routes: `PATCH /api/teacher/scores/:scoreId/comment` (teacher-only, emits `teacher:comment-updated` socket) and `GET /api/teacher/classes/:classId/writing-review?week=N`.
- **#18 `18bafc2` — ShiftClosing 9-card overhaul** — 6 cards → 9. Added Writing Score (`aggregate.writingScore`), Final Score (`aggregate.overallScore`), Target Words Hit (via new `countTargetWordsHit()` helper in `scoreAggregator.ts` reading `details.vocabUsed` across tasks, case-insensitive dedupe). Renamed "Target Words Used" → "Words Written" (honest label). Grid switched to `grid-cols-2 sm:grid-cols-3`. `TaskResultDetails` extended with optional `vocabUsed?: string[]`. `scoreAggregator.test.ts` bumped to 15 tests (4 new for `countTargetWordsHit`).
- **#20 `4818095` — Task components persist `answerLog` in details** — canonical `TaskAnswerLogEntry` interface added to `types/taskResult.ts`. WordMatch, VocabClearance, ClozeFill, ContradictionReport, DocumentReview, PrioritySort, ErrorCorrectionDoc now emit `details.answerLog = [{ questionId, prompt, chosen, correct, wasCorrect, attempts? }]`. Score aggregator intentionally ignores the field — it's teacher-UI data. `wasCorrect = first-try correct` for retry-tolerant tasks (WordMatch, ClozeFill); `chosen` surfaces last wrong pick on auto-resolve so teachers see what the student actually tried.
- **#16 `e2682a3` — Gradebook drill-down three new sections** — `TaskRow` / `DrillDown` in `components/teacher/Gradebook.tsx` gains: (a) **Student Answers** — compact table of `details.answerLog` with ✓/✗ pills; (b) **PEARL & AI** — two-column panel rendering `details.grammarScore`/`grammarNotes`/`vocabScore`/`vocabUsed` (emerald pills)/`vocabMissed` (rose pills)/`taskScore`/`taskNotes` + top-level `pearlFeedback`; (c) **Teacher Comment** — textarea + Save button wired to the new PATCH endpoint, optimistic update with Modified/Saved/Server-not-ready pills. Graceful empty states on all three for legacy rows.
- **#19 `2e46988` — Teacher Writing Review page (new top-level tab)** — `frontend/src/components/teacher/WritingReview.tsx` (441 LOC). Shift selector + class-wide essay list, sort by "Needs attention" (default: submittedAnyway || score < 0.5 || missing comment) / designation / score. Each card: student designation, task title, score pill (emerald/amber/rose), Submitted-Anyway pill, full writing text, AI eval panel, PEARL feedback quote, teacher comment textarea. Wired into `pages/TeacherDashboard.tsx` between Grades and Shifts. `teacherStore.TeacherTab` extended with `'writing'`.

Follow-up fixes shipped later the same day:

- **`7cc1e96` — Writing Review endpoint shape fix** — Unit 4 backend returned `{ students, week }` (nested per-student) but Unit 6 frontend expected `{ weekNumber, weekTitle, entries[] }` (flat). TypeScript `as` cast hid the mismatch so the page silently rendered empty. Rewrote the endpoint to build flat entries (one per writing source per score), populate all AI-eval fields, resolve taskTitle via `getWeekConfig(weekNumber)`. Also fixed `justifications` filter bug (was `Array.isArray` but shape is `Record<string, string>`).
- **`9881ba4` — Extend answerLog coverage + hide empty View Writing** — IntakeForm and WordSort were missing from Unit 3's scope. IntakeForm now tracks `firstQuestionPick` + `questionAttempts` per intake_questions MCQ and emits `answerLog`. WordSort emits per-word `answerLog` with first-wrong column (if any) vs correct column. Gradebook `hasWriting` tightened to reject empty `writingSubmissions: {}` (was showing a useless "View Writing" button on tasks with no writing cards like Week 2 Intake Form).
- **`1b32765` — Fix ShiftResult field-name mismatch + expose PR #18 metrics in Gradebook** — PR #18 renamed the `postShiftResult` payload field `targetWordsUsed` → `wordsWritten` and added 4 new metrics. Backend shifts.ts endpoint was still reading `body.targetWordsUsed`, silently storing 0 for new completions. Fix: accept both field names, stash `writingScore`/`overallScore`/`targetWordsHit`/`wordsWritten` in existing `ShiftResult.taskResults` JSON (no schema change). Gradebook Shift Summary now shows all 9 cards mirroring ShiftClosing, plus a "Not finalized — student hasn't reached ShiftClosing yet" amber pill when `completedAt` is null (clarifies teacher-Move-to-Shift marker rows).

**Accidental commit + revert (`7e65609` / `c7f02b9`)**: An empty-commit attempt via `git commit --allow-empty` swept up the user's pre-existing staged in-progress work (19 files — W4 narrative-reactive code + Clarity Check wiring) and pushed it to master. Immediately reverted via `git revert 7e65609 --no-edit`. Work restored to working tree as unstaged modifications. Lesson: when needing an empty commit alongside staged work, use `-o <paths>` to scope, or `git reset` the index first.

**Known limitation for old data**: `answerLog` was added today (PR #20). MissionScore rows written BEFORE today's deploy don't have the field — those tasks' "Student Answers" section will always show "Not recorded for this task." The data was never captured; there's nothing to retroactively recover. Writing text (writingText / text / writingSubmissions / justifications) has always been persisted and remains visible via the existing "View Writing" button.

**Writing-visibility fix batch (2026-04-24 late, 3 commits):** After the teacher-review batch above deployed, `answerLog` started appearing in Gradebook but `writingText` intermittently did not. Root cause was two endpoints upserting the same MissionScore row and clobbering each other's fields. Fixed in:

- **`e54ca30` — merge-not-replace on MissionScore.details** — `/submissions/evaluate` (inside WritingEvaluator) and `/shifts/weeks/:weekId/missions/:missionId/score` (from task onComplete) both write to the same row. Plain Prisma upsert with `update: { details }` REPLACES the JSON blob — so whichever call ran second wiped the other's fields. Both endpoints now wrap in `prisma.$transaction(async tx => {...})` that reads existing details, spreads incoming on top, and upserts the merged object. Also forced a frontend redeploy via `main.tsx` build-tag comment so students actually run today's answerLog+writingText code.
- **`ba6c30d` — protect non-empty strings from empty-string clobber** — `{...existing, ...incoming}` spread still let `writingText: ''` from a blank state snapshot overwrite a non-empty stored `writingText`. New `mergeDetails()` helper (duplicated in both `shifts.ts` and `submissions.ts`) skips overrides where the incoming value is `''` and the existing is a non-empty string. Numbers/booleans/arrays/objects still overwrite normally.
- **`752a2b9` — debug endpoint** — `GET /api/teacher/debug/raw-details/:pairId/:weekNumber` dumps raw MissionScore rows for a shift (keys, writingText, text, answerLog length, PEARL feedback, teacher comment). Use for investigating "why isn't my writing showing" live. Teacher-authenticated, ownership-checked.

**TS gotcha encountered:** inside `prisma.$transaction(async tx => {...})`, TS drops narrowing on nullable fields like `metadata?.missionId`. Pin to a local `const missionId: string = metadata.missionId;` before the transaction callback.

**Not retroactively recoverable:** rows written before `e54ca30` may have missing fields (race wipe); rows between `e54ca30` and `ba6c30d` may have empty writingText (empty-string override). Only fix for existing rows: reset the task so the student redoes it.

---

## Recent Work (2026-04-21 / 22)

Narrative-reactive layer shipped — committing to Shape 1 ("story-driven game that teaches English") after external feedback flagged that students were routing around narrative. W3 MVP test + W4 full rebuild with C (narrative-as-activity) and B (inter-task choice-points) layers. Full strategic context in `memory/project_narrative_strategic_tension_2026_04_21.md` (auto-memory).

**Shipped:**

- **W3 MVP — Party Observation card (pure frontend)**: `frontend/src/components/shift-queue/ShiftClosing.tsx`. Quotes the student's first rule from `priority_briefing` Task 1 writing at shift close in PEARL's voice. Gated on `weekConfig.weekNumber === 3`. Reads from existing `taskProgress[].details.writingSubmissions` — no backend/migration. Tests whether students engage when narrative reacts to them.

- **W4 mechanical scaffold**: `backend/src/data/week-configs/week4.ts` (Evidence Board episode; grammar `past-simple-sequencing`; 10 target words). `backend/src/data/week-configs/index.ts` updated. `frontend/src/data/narrative-routes.ts` — `MAX_BUILT_WEEK` bumped 3→4. Backend `full` route already included W4; condensed route bridging briefing already authored for students who skip it.

- **B-layer infrastructure (inter-task moments — non-skippable character choice-points or ambient beats between tasks)**:
  - Backend: `backend/src/routes/narrative-choices.ts` (`POST` + `GET /api/narrative-choices` with optional `?weekNumber=N`). Wraps existing `NarrativeChoice` Prisma model.
  - Frontend: `frontend/src/components/shift-queue/InterTaskMoment.tsx` (full-surface, non-skippable; `character` and `ambient` variants). `frontend/src/api/narrative-choices.ts` API client.
  - Types: `InterTaskMomentConfig` + optional `interTaskMoments?: Record<taskId, InterTaskMomentConfig>` on WeekConfig. Keyed by the task ID the moment fires AFTER (stable across task-list changes).
  - Wiring: `ShiftQueue.tsx` cascade post-task = dismissal video → vocab interstitial → inter-task moment → next task. Cleared on week change / teacher task reset.
  - W4 content: Betty after `word_match_w4` (3 replies: compliant/curious/guarded), Ivan after `cloze_fill_w4` (3 replies), ambient glitch `DON'T FORGET` after `vocab_clearance` (2500ms).

- **C-layer infrastructure (mid-task choice-points that interrupt task flow)**:
  - Types: `MidTaskChoiceConfig` + optional `midTaskChoice` on `DocumentConfig`.
  - Frontend: `DocumentReview.tsx` extended with `checkChoiceOrAdvance` interceptor between stamp animation and advance. Amber-accented "P.E.A.R.L. — Archive Control" overlay replaces doc view when active. POSTs choice, shows response + Continue.
  - W4 content: Fragment 3 reclassification on `doc_fragments` — REMOVE (compliant) vs KEEP FLAGGED (curious). Either path, the fragment is gone from the official record.

- **Shift-close PEARL echoes (C-layer payoff at end of shift)**:
  - `ShiftClosing.tsx` now fetches `fetchNarrativeChoices(weekNumber)` on mount.
  - W3 card (existing): quotes student's own writing verbatim.
  - W4 card (new): conditional on `w4_doc_review_frag3` value — compliant branch ("exemplary timeline compliance") or curious branch ("we have amended your file").

**Design invariants preserved** (per `Dplan/Character_Bible.md`):
- All B/C reply options include one compliant choice.
- No character cross-references (W5+ rule — honored).
- Character voices on canon: Betty "sugar/darlin" + exclamations, Ivan ellipses + validation-seeking, M.K. silent replies preserved.
- Citizen-4488 W4 post continues self-censorship deepening pattern (nearly error-free grammar).

**Deferred to future sessions:**
- W5 carry-over hooks reading stored W4 choices (Betty/Ivan W5 tone variants, Citizen-4488 W5 post variants, Harmony Wellness Division post tone).
- W5 and W6 WeekConfig files.
- W4 dictionary entries seeded to `DictionaryWord` table.
- W4 Harmony static content (bulletins, PEARL tips, notices, sector reports, censure items).

---

## Recent Work (2026-04-17)

Large batch shipped from comprehensive bug/design review. All 9 P0+P1 items merged to master as PRs #1-9; 3 follow-up PRs (#10-12) from the subsequent narrative/pedagogy review are still awaiting merge.

**Merged (master):**
- **P0 scoring fix** (#9): canonical `TaskResultDetails` type, pure `scoreAggregator.ts` utility, all 11 task components updated to emit canonical shape, ShiftClosing "Errors Found" + "Vocab Score" + "Grammar Accuracy" now accurate (was inflated). + Citizen-4488 Case File card at shift close.
- **P0 My File rebuild** (#6): `GET /api/student/profile-summary` (new `backend/src/routes/student.ts`). MyFileApp rewritten from placeholder to 5-section Ministry dossier (Citizen Record / Shift History 18-cell grid / Vocabulary Ledger / Harmony Activity / Character Dossier).
- **P1 Harmony backend hardening** (#2): cross-class censure auth hole fixed, mastery updates wrapped in `prisma.$transaction`, stale-pending sweep 10s→3s, `lastHarmonyVisit` awaited (no more fire-and-forget).
- **P1 Submissions transaction** (#1): mastery upsert+update wrapped atomically.
- **P1 Socket reconnect** (#4): listener dedup + JWT expiry detection → `auth:required` custom event on stale tab wake.
- **P1 MonitorPlayer** (#5): `onEnded` ref pattern to avoid stale closure + 2s timer reset on callback re-create.
- **P1 HarmonyApp** (#3): `if (submitting) return;` guard prevents Enter+click race double-submit.
- **P1 PEARL in-character feedback** (#8): `POST /api/pearl-feedback` endpoint returns 150-200 char reasoning-focused observation. Rendered under WritingEvaluator's existing grammar result with PEARL eye glyph + "P.E.A.R.L. Observation" label.
- **P1 Vocabulary Completion Interstitial** (#7): shown after `vocab_clearance` / `cloze_fill` tasks; emerald/amber/rose chips per target word; 4s auto-advance or click to skip.

**Pending (open PRs):**
- **#10** PEARL warmth: 11 failure-state strings rewritten in submissions.ts + pearl-feedback.ts to preserve "forced happy" tone (per narrative review Issue #5).
- **#11** W4-6 plan doc: 6 pre-build pedagogy fixes (Evidence Assembly deferred, W6 re-split to 5 tasks, because-clause teaching for Mandarin-L1, W1-3 vocab required in W6 cumulative, PEARL bark after RUN flash, Wellness Division thread woven W3→W4→W5).
- **#12** Citizen-4488 visibility: 2nd post per week W1-3 (bumps harmony-vocabulary.test.ts to 42) + ShiftClosing grammar-watch collapsible note + first-Harmony-visit PEARL intro banner (`isFirstVisit: boolean` added to `GET /api/harmony/posts`).

**Known out-of-scope finding**: `frontend/src/api/pearl-feedback.ts:14-18` has duplicate canned PEARL fallbacks with the OLD cold copy (network-error path). PR #10 fixed backend only; needs sync.

## Next Work
- **W5 carry-over hooks** — read stored W4 `NarrativeChoice` values at W5 shift start, branch Betty/Ivan tones, Citizen-4488 W5 post variants, Harmony Wellness Division post tone. Requires W5 WeekConfig to exist first.
- **Build Weeks 5-6 WeekConfig files** from `Dplan/Weeks_04_06_Shift_Plan.md` — mechanical scaffold first (same W4 pattern), then C+B layers on top. **Audit fixes applied 2026-04-08:** W5 "respond"→"recommend" (duplication with W3), W5 Doc B reduced to 5 errors, W6 writing tasks merged (5→4 tasks), SVA errors added. See shift plan § Pedagogical Notes. **Pre-build pedagogy fixes 2026-04-17 (PR #11, pending):** W6 re-split 4→5 tasks to reduce Lane 1 cognitive load; W5 because-clause explicit teaching (Mandarin-L1 interference); W6 cumulative review must include one target word from EACH of W1/W2/W3; PEARL bark after W6 RUN flash; Wellness Division thread woven W3→W4→W5.
- **Harmony content authoring** — weeks 4-6 static content (new NPC introductions: Citizen-6103, Citizen-1177, Citizen-9020; first disappearance: Citizen-0031) + W4 static Harmony content (bulletins, PEARL tips, notices, sector reports, censure items).
- **Condensed route 4488 catch-up posts** — 3-5 posts at route-gap transitions ("I named her Tuesday").
- **Condensed route bridging Harmony posts** — ~20 NPC catch-up posts for gap weeks.
- Seed dictionary entries for Weeks 4-6 (30 words defined in shift plan; W5 "respond" replaced with "recommend"). W4's 10 words are used in W4 tasks but not yet in `DictionaryWord` table.
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for Weeks 7-18.
- Full scripted dialogue pass for all character beats (especially Weeks 7-18).
- Custom domain setup for student-friendly URLs (optional).
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume; redeploys preserve files but volume loss would delete all uploads.
- Lane auto-promote/demote evaluation after each shift (deferred; manual teacher lane control is live).
- Hybrid class model app changes — compact intake_form mode, `teacherLed` task gating flag (multi-gate system implemented: `taskGates Int[]` supports multiple simultaneous gates), teacher "advance to Station Work" signal in dashboard.
- Printable Ministry materials — Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards.
- **Admin "God Access"** — single admin login that sees all classes across all teachers + student impersonation. Full plan in `Dplan/Admin_God_Access_Plan.md`. Adds `admin` to Role enum, relaxes ownership checks, new `/api/admin/impersonate/:pairId` endpoint, ~140 lines across 11 files.
