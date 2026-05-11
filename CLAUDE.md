# The Lexical Republic — Project Instructions

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
- Backend: `backend/` (Express 5 + TypeScript + Prisma + PostgreSQL) — see `backend/CLAUDE.md` for stack-specific gotchas
- Frontend: `frontend/` (Vite + React + TypeScript + Tailwind + Zustand) — see `frontend/CLAUDE.md` for stack-specific gotchas
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
- **"Compliance Check" is the per-class teacher-scheduled lockout sibling of Clarity Check.** Configured per-class in the Shifts tab (NOT on-demand from ClassMonitor). Teachers pick exact words from a TOEIC-grouped picker; checks fire automatically at chosen placement points (`shift_start | shift_end | after_task`) inside the student's shift cascade. One-shot per `(pair, template)` enforced via DB unique constraint. Different classes can have different templates for the same shift. **Slot rows render INLINE in the Shift Storyboard as cyan dotted-line markers (above the first card, after each task, below the last card)** — `ComplianceCheckMarker` mirrors the `GateMarker` insertion-point pattern. Standalone `ComplianceCheckSlotList` is GONE; do not re-introduce a separate section in `ShiftsTab.tsx`.
- **"Remediation Module" is the behavior-triggered third sibling.** Fires automatically when the rate-trigger state machine in `sessionStore` detects intentional `concernScore` grinding (Stage A warning at +0.4/30s, Stage B modal at +0.7/60s OR second Stage-A within 90s, backstop at score≥3.0). Server-authoritative cooldown `−[0, 0.5, 1.0, 1.5][correctCount]` floored at 0; clawback if grinding resumes within 60s of close (restores cooldown, sets `clawedBack=true`); escalating debounce 90→60→30→0s. Amber accent (vs cyan Clarity/Compliance) so students know the trigger source is behavior, not schedule. PEARL voice stays forced-happy throughout — never punitive. **The "punishment" is more vocab review using words from prior shifts; worst case = student accidentally studied harder.**
- **Concern HUD chip is now clickable** — opens `ConcernTooltip` showing score, threshold band, recent activity from `concernRateBuffer`, threshold-to-next, forced-happy hint. Score drops animate via `useCountDownAnimation` (RAF, ease-out cubic, 1500ms, decrease-only).
- **Per-class socket scoping (audit batch 2026-05-04)** — Teachers join `class:${classId}` rooms (one per owned class) plus a personal `teacher:${teacherId}` room. The old global `'teacher'` room is GONE; never call `io.to('teacher').emit(...)`. For events tied to a student, look up `classId` via `prisma.classEnrollment.findFirst({ where: { OR: [{ pairId }, { userId }] } })` BEFORE the cascade-delete (or capture from in-scope context), then `io.to('class:' + classId).emit(...)`.
- **JWT_SECRET is mandatory at module load (audit batch 2026-05-04)** — `backend/src/utils/jwt.ts` throws if `process.env.JWT_SECRET` is unset. Fail-fast beats dev-secret in prod. Local dev needs the var set in `backend/.env`.
- **Student login is rate-limited (audit batch 2026-05-04)** — `auth.ts` POST /login uses `express-rate-limit` keyed on IP+designation, 10 attempts per 15 min. Teacher login skipped via `skip` predicate.
- **MissionScore.details merges everywhere (audit batch 2026-05-04)** — `mergeDetails()` helper now duplicated in shifts.ts, submissions.ts, sessions.ts, teacher.ts. ANY new endpoint writing `details: X` MUST read existing details first inside `prisma.$transaction` and merge, or it will clobber writingText/answerLog/pearlFeedback. Flagged for future shared-util refactor.
- **Teacher endpoints check `teacherOwnsPair` (audit batch 2026-05-04)** — single delete, bulk delete, messages (POST /direct, GET /direct/:pairId, POST /:id/thread teacher branch), socket commands (skip/reset/send-to-task) all enforce ownership. Bulk-delete-all-students is now scoped to teacher's classes via `enrollments: { some: { class: { teacherId } } }` — was previously deleting every student in every class.
- **Stale-bundle defense is layered (2026-05-08)** — Layer 1: `frontend/public/serve.json` no-caches `index.html` + `version.json`, long-immutable on hashed `assets/**`. Layer 2: Vite injects `__BUILD_ID__` and writes `dist/version.json`; `useUpdateChecker` polls every 5 min + on tab focus; `UpdateBanner` shows "A new version is available — Reload" on mismatch. Skipped in dev. Backend start script runs `npx prisma migrate deploy && node dist/index.js` so future migrations auto-apply.
- **Remediation study card is lane-aware bilingual (2026-05-08)** — wrong answer in remediation modal renders `RemediationModule.tsx` study card below options: Lane 1 = full bilingual (word + IPA + correct def + Mandarin + example), Lane 2 = same but Mandarin tap-to-reveal, Lane 3 = English-only minimal. Continue button locked 5s with countdown ("Next (5)"). Aligns with Krashen affective filter + Cummins on strategic L1 + Nation/Schmitt on context exposure. Doctrine: forced exposure not punishment, no force-pass loops for ESL.
- **Remediation word source is gated to TOEIC `targetWords` for shifts ≤ current (2026-05-08)** — `pickRemediationWords` in `remediation.ts` intersects candidates with `getComplianceWordsByWeek()` union for weeks 1..weekNumber. Same gate Compliance Check uses; story / world-building / future-shift words are excluded. Bumped `take` from 30 to 100 to leave room for post-filter.
- **Teacher activity indicator is DB-backed (2026-05-08)** — `Pair.lastSeenAt` and `User.lastSeenAt` columns; `authenticate` middleware bumps the actor's timestamp on every authenticated request, throttled to 60s/actor via in-memory Map (fire-and-forget). `ClassMonitor` derives 4-state ActivityState (`active`/`recent`/`idle`/`offline`) from `online + lastSeenAt + now` and renders matching color + relative-time label. Survives Railway restarts that wipe the in-memory `onlineStudents` Map.
- **`HarmonyPost.ingestedAt` is the source of truth for NEW-content checks (2026-05-08)** — `createdAt` is intentionally backdated 10 min – 5.5 h by `staggeredCreatedAt()` for narrative texture; never use it to compare against `lastHarmonyVisit`. Use `ingestedAt` (DB-default `now()` at insert) for both `/has-new` count and per-post `isNew` badge.
- **Teacher dashboard shows shift progress without click (2026-05-08)** — `GET /api/teacher/students` now parallel-fetches via `buildShiftStatusForPair()` helper (extracted from `/shift-status`) and returns `currentShiftProgress` for every pair. Frontend falls back to `s.currentShiftProgress` when `offlineStatus` has no fresh-fetched entry, so the in-shift line renders on first page load. Click-to-refresh path preserved.
- **Task answer logs surface the actual wrong pick on non-first-try (2026-05-08)** — WordMatch / VocabClearance / ClozeFill all now show `lastWrongPickRef[item]` as `chosen` whenever `wasCorrect` is false (regardless of recovered vs auto-resolved). First-try-correct rows still show the canonical correct text. Removed the unused `autoResolvedRef` distinction.
- **W4 problem (DIAGNOSED, NOT YET FIXED 2026-05-08)** — `backend/prisma/seed.ts:884` is hardcoded `weeks 1-3` for `createQueueWeekMissions`. W4 has a WeekConfig (`week4.ts` committed `d784aa4`) but the production DB has only legacy 7-step `Mission` rows for W4 from `createDefaultWeekMissions`. When students promote to W4, ShiftQueue mounts (`weekConfig?.shiftType === 'queue'`) but new task types have no matching `Mission` rows — scoring writes break. Not blocking yet (all classes on W3); needs Layer 6 (auto-data-migration on backend boot) before any class advances.
- **Compliance Check `after_task` slots are labeled `After {task}` not `Before {task}` (2026-05-08)** — `placement: 'after_task'` with `afterTaskId: X` fires AFTER task X completes (`ShiftQueue.handleComplete` calls `fetchComplianceCheckFor('after_task', completedTaskId)`). Old labels were backwards. Editor modal title + storyboard markers + every consumer of `slotLabel(slot)` must use "After X" — never re-introduce "Before X" for after_task rows.
- **`/api/teacher/students` filters ShiftResults to `completedAt: not null` (2026-05-08)** — Move-to-Shift creates marker `ShiftResult` rows at the target week with `completedAt: null` to record current position; the include in `GET /students` previously had no `where`, so markers inflated `weeksCompleted` by 1 and the ClassMonitor "current shift" highlight off-by-one'd whenever a class had been moved. ANY new query that derives "completed shifts" from `ShiftResult` must filter `completedAt: { not: null }`. Marker rows are NOT completions.
- **`StoryboardStep.taskId` exposes the WeekConfig task `id` (2026-05-08)** — backend storyboard endpoint also returns `task.id` (e.g. `word_match_w3`) alongside `missionType` (e.g. `word_match`). Required for matching Compliance Check `afterTaskId` to storyboard cards on shifts where `task.id ≠ task.type` (W2+).
- **W4 redesigned as Activity Reconciliation (2026-05-11)** — Shift 4 frame swapped from "Evidence Board" to compiling Citizen-4488's Daily Activity Report from 5 surveillance observations. Mid-Doc-Review, Observation E (guest entry logged: Citizen-9020) is reclassified RESTRICTED via a silent visual mutation — NO popup choice (the old `midTaskChoice` field is removed from `week4.ts`). Unedited First Contact is folded INTO Clip A as a hijack at 1:40 (silhouette + modulated voice + `— F` sign-off); the old standalone Clip C + PEARL "TERMINAL ANOMALY" modal are DEPRECATED. The `[ ].edited` hidden app appears on the desktop post-login via a glitch effect (greyed out, "didn't properly download"). The app carries Lexicon (5 Black Words: `truth, mother, freedom, father, name` with all-lanes Mandarin gloss) + Cipher cloze (graded, replaces the old `cloze_fill_w4` content but keeps the task id) + Drop Box (ungraded, post-Shift-Report, NarrativeChoice key `w4_drop_box_first_submission`). End-of-shift recruitment NarrativeChoice modal (`w4_recruitment_vote`: compliant/curious/guarded) gates W5 content depth. Bracket motif `[ ]` everywhere inside the app for redacted content.
- **9-shift condensed route is canonical (2026-05-11)** — `condensedRoute` in `backend/src/data/narrative-routes.ts` should be `[1, 2, 3, 4, 5, 6, 11, 14, 18]`. **The existing value in code is stale and needs updating** — currently `[1, 2, 3, 5, 6, 11, 14, 16, 18]` (skips W4, which contradicts W4 being a pivotal beat). Each shift takes ~2 classroom weeks for a Taiwanese high school semester.
- **Briefing video Clip A uses PEARL narration only (2026-05-11)** — no Betty/Ivan/M.K. voiceover in briefing videos. Maximizes contrast for the Unedited hijack (single Party voice → ruptured by a stranger voice hits harder than multiple voices). Other characters speak inside the shift via character message slots + inter-task moments; they do not speak in the briefing.
- **In-world bureaucratic locations, not American-school (2026-05-11)** — citizen activity content uses `Sector N entrance`, `Filing Desk N`, `Common Mess`, `Records Wing`, `Block N Residential`. Avoid: cafeteria, school library, classroom, dormitory. Canon citizens are workers, not students.

## Detail Files
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning
- [Pedagogy Doctrine](docs/pedagogy.md) — foundational principles, vocabulary doctrine, scaffolding, task taxonomy/SLA, writing rubric (on-topic veto + vocab), retrieval, narrative-as-pedagogy, Mandarin L1, quick reference. **Source of truth for "how does this app teach?"**
- [Narrative & Pedagogy Review 2026-04-17](Dplan/Narrative_Pedagogy_Review_2026_04_17.md) — cross-cutting review of shift scripts, Harmony, PEARL voice; prioritized findings + W4-6 forward-look
- [Changelog](docs/changelog.md) — day-by-day work history (was the "Recent Work" sections in this file)
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend-specific gotchas (ShiftQueue, Harmony, MonitorPlayer, CSS/z-index, R3F, browser media, palette)
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — backend-specific gotchas (Prisma, Express, Railway deploy, uploads, PEARL rate limiting)

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

### Task Result & Scoring Utilities
- `frontend/src/types/taskResult.ts` — canonical `TaskResultDetails` shape every task component emits: `{ taskType, itemsCorrect, itemsTotal, category, errorsFound?, errorsTotal? }`
- `frontend/src/utils/scoreAggregator.ts` — pure `aggregateTaskResults()` reducer used by ShiftClosing. Returns per-category `null` when no tasks contributed (no more inflated fallback).
- `frontend/src/utils/scoreAggregator.test.ts` — Vitest suite (15 tests) covering averaging, weighting, skipped-category fallback, legacy-shape graceful handling.
- **Frontend Vitest**: `cd frontend && npm run test` runs the scoreAggregator suite.

## Recent Work
For day-by-day history of shipped batches, commits, and decisions, see [`docs/changelog.md`](docs/changelog.md). For specific past work, prefer `git log` and the topic files in `memory/`.

## Next Work
- **Pause-All replay survives backend restart (deferred from audit batch 2026-05-04).** Audit fix landed an in-memory `classPauseState` Map in `socketServer.ts` that replays `session:paused` to students on connect — fixes refresh/late-join bypass. Still in-memory only, so Railway redeploys lose pause state. Persist via `Class.pausedAt` + `Class.pauseMessage` Prisma columns when needed (rare classroom case; not blocking).
- **Compliance Check teacher results UI**: data is already saved (`ComplianceCheckResult` table, full questions+answers JSON). `GET /compliance-check/teacher/classes/:classId/results` endpoint + `fetchComplianceCheckResults()` client wrapper exist. Need a Gradebook drill-down panel mirroring the Remediation Events pattern (PR #24) to render attempts, scores, time-to-complete, and per-question correctness.
- **Compliance Check teacher results UI**: data is already saved (`ComplianceCheckResult` table, full questions+answers JSON). `GET /compliance-check/teacher/classes/:classId/results` endpoint + `fetchComplianceCheckResults()` client wrapper exist. Need a Gradebook drill-down panel mirroring the Remediation Events pattern (PR #24) to render attempts, scores, time-to-complete, and per-question correctness.
- **W5 carry-over hooks** — read stored W4 `NarrativeChoice` values at W5 shift start (`w4_recruitment_vote` is the primary gate: compliant/curious/guarded; `w4_drop_box_first_submission` carries the student's free-text observation). Branch Betty/Ivan tones, Citizen-4488 W5 post variants, Harmony Wellness Division post tone, and second `[ ].edited` message depth. Requires W5 WeekConfig to exist first.
- **Build Weeks 5-6 WeekConfig files** from `Dplan/Weeks_04_06_Shift_Plan.md` — mechanical scaffold first (same W4 pattern), then C+B layers on top. **Audit fixes applied 2026-04-08:** W5 "respond"→"recommend" (duplication with W3), W5 Doc B reduced to 5 errors, W6 writing tasks merged (5→4 tasks), SVA errors added. See shift plan § Pedagogical Notes. **Pre-build pedagogy fixes 2026-04-17 (PR #11, pending):** W6 re-split 4→5 tasks to reduce Lane 1 cognitive load; W5 because-clause explicit teaching (Mandarin-L1 interference); W6 cumulative review must include one target word from EACH of W1/W2/W3; PEARL bark after W6 RUN flash; Wellness Division thread woven W3→W4→W5.
- **Harmony content authoring** — weeks 4-6 static content (new NPC introductions: Citizen-6103, Citizen-1177, Citizen-9020; first disappearance: Citizen-0031) + W4 static Harmony content (bulletins, PEARL tips, notices, sector reports, censure items).
- **W4 Activity Reconciliation — frontend build pending (redesigned 2026-05-11, commit `77e5937`).** Content + clips committed in `week4.ts` and `Dplan/Weeks_04_06_Shift_Plan.md`. **Still needs frontend work:** (1) Queue sidebar panel (right column, 4 cases, 4488 priority); (2) Observation card mutation event (greying + RESTRICTED stamp on Obs E after the 5 comprehension Qs, before Doc B); (3) `[ ].edited` desktop app — tile with greyed/broken-pixel state, Lexicon tab (5 Black Word entries with audio), Cipher tab (renders existing `cloze_fill_w4` content with bracket motif `[ ]` instead of underscores), Drop Box tab; (4) post-login glitch effect that materializes the app; (5) post-Shift-Report Drop Box ping; (6) end-of-shift recruitment NarrativeChoice modal (`w4_recruitment_vote`); (7) Canva production of new Clip A (~2:55-3:00, queue + hijack) and new Clip B (~1:25, closing dispatch + Citizen-9020 reassignment notice).
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

## Design Feedback Log
- Tone: "forced happy" dystopian, NOT intimidating
- PEARL: kind, welcoming, prominent — user's connection to The Party
- **No "Season" naming** — use in-world bureaucratic terms
- **User HATES monochrome green CRT everywhere** — green CRT only inside terminal view
- **User HATES dark CRT terminal for shift queue** — shift queue is a "forced happy" government iOS app, NOT a hacker terminal
- **Office view = warm retrofuturist** — pastels, neon accents, chrome
- **TerminalAppFrame stays dark** (device chrome), content area uses `crt-monitor-screen` cyan CRT background
- **Terminal desktop & app frame** both use `crt-monitor-screen` class for cyan CRT background with scan line effect
- **pOS digital-first, not physical stamps** — task confirmations use `AuthorizationToast` (PEARL eye + progress ring + checkmark), not BureauStamp. "The OS is the authority, not a bureaucrat with a stamp." StampChoice (CHANGED/REMOVED classification) still uses old stamp pattern.
- **AuthorizationToast image**: `pearl-eye-glow.png` (128x128, 22KB) — radial-gradient mask for feathered edges into transparency

## Dplan Canon Reference
- Location: `~/Desktop/Dplan/` — iOS version design docs, canonical reference
- Key file: `docs/webapp-technical-design.md` — authoritative web track spec
- Canonical PEARL barks: `docs/ambient-text-bank.md`
