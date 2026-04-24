# The Lexical Republic — Project Instructions

Last updated: 2026-04-24

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

## Detail Files
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning
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

**Score-visibility investigation (diagnosis only, no fixes shipped):** User reported students aren't seeing their final score at shift close. Traced the full flow:

- **Most likely root cause — ShiftReport gates closing-screen advance on AI pass.** `tasks/ShiftReport.tsx:38-58` only fires `onComplete` inside `if (result.passed)`. If `WritingEvaluator` rejects the writing and the student gives up, no MissionScore is persisted *and* the task stays `current` — shift never advances to ShiftClosing, so the student never sees ANY closing-screen content. ContradictionReport is fine (always fires `onComplete` on Submit; score from classifications, not AI).
- **No Writing Score / Final Score card in ShiftClosing.** `aggregate.writingScore` and `aggregate.overallScore` are computed by `scoreAggregator.ts:118-126` but never rendered in `ShiftClosing.tsx:155-168`. The 6-card grid (Documents Processed / Errors Found / Vocabulary Score / Grammar Accuracy / Target Words Used / Concern Score) has no overall summary and no writing card. ShiftReport's only visible contribution is incrementing `Documents Processed`.
- **"Target Words Used" stat is mislabeled.** Sums `details.wordCount` across tasks. ShiftReport sets `wordCount` to the full essay word count (`fullText.split(/\s+/).filter(Boolean).length`), not the count of target words actually used.
- **ShiftReport hardcodes score to `1` on pass** — no gradient.

Full notes in auto-memory `project_score_registration_findings_2026_04_24.md`. Open question for next session: (a) add a fallback so ShiftReport awards partial credit / lets student submit after N failed attempts so they always reach ShiftClosing, (b) add a Writing Score + real Final Score card to the grid, or (c) both.

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
