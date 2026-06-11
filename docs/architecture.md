# Architecture & Deployment

## Backend
- Express 5 + TypeScript
- Prisma + PostgreSQL
- Auth via JWT in HTTP-only cookies + Bearer token fallback (Safari ITP)
- Major route groups: `/api/auth`, `/api/shifts`, `/api/recordings`, `/api/pearl`, `/api/pearl-feedback`, `/api/harmony`, `/api/teacher`, `/api/vocabulary` (legacy), `/api/ai`, `/api/classes`, `/api/dictionary`, `/api/sessions` (legacy), `/api/submissions`, `/api/messages`, `/api/student`, `/api/narrative-choices`, `/api/clarity-check`, `/api/compliance-check`, `/api/remediation`, `/api/inscription` (Word Pool)
- Socket.IO for real-time teacher dashboard (student activity tracking, briefing stage broadcasts) and student notifications (`harmony:new-content`). Student socket connects on login (App.tsx). Socket auth supports both cookie and `auth.token` Bearer fallback.
- Socket reconnection: `connectSocket()` reuses stale sockets via `socket.connect()` instead of destroying and recreating them, preserving event listeners registered by App.tsx (session:clarity-message, session:task-command, etc.)
- **Socket listener dedup + JWT expiry detection** (2026-04-17, PR #4): module-level `coreListenersAttached` flag prevents duplicate connect/disconnect/connect_error listeners on repeat `connectSocket()` calls. On visibility-triggered reconnect, a local JWT base64 decode (no crypto) checks `exp` — if expired, emits `window.dispatchEvent(new CustomEvent('auth:required'))` instead of hanging in "connecting" state.
- **Role-split socket rooms** (2026-06-10; original per-class scoping 2026-05-04): STUDENTS join `class:${classId}`; TEACHERS join `class:${classId}:staff` (one per owned class, joined at connect + on class creation) plus a personal `teacher:${teacherId}` room — the global `'teacher'` room is long gone. Teacher-bound emits (live status, remediation events, clarity replies, registered/connected/disconnected/deleted, pause-state) target the staff room only; class-wide student events (paused/resumed, gate-updated, shift-changed, presence, harmony, trials) stay on the plain class room. The connection handler registers all listeners synchronously gated on a shared `ready` promise (connect-time emits are otherwise dropped during the enrollment query). All emit sites (route files + socketServer) use `io.to('class:' + classId).emit(...)`; classId resolves via `prisma.classEnrollment.findFirst({ OR: [{ pairId }, { userId }] })` for events in route files. In-memory `classPauseState` Map in `socketServer.ts` persists pause state across socket reconnects within a backend lifetime; replays `session:paused` to students on connect (fixes refresh/late-join bypass). Teacher socket commands (`skip-task`/`reset-task`/`reset-shift`/`send-to-task`) gated via `prisma.classEnrollment.findFirst` ownership check.
- **Auth hardening** (2026-05-04, PR #34): `JWT_SECRET` is required at module load — `backend/src/utils/jwt.ts` throws if env var unset (fail-fast in prod). Student `/login` rate-limited via `express-rate-limit`: 10 attempts / 15 min keyed on IP+designation; teacher login skipped via `skip` predicate.
- **MissionScore.details merge invariant**: every endpoint writing `details` to a shared MissionScore row (shifts.ts, submissions.ts, sessions.ts, teacher.ts skip-task + PATCH /scores) must read existing details first inside `prisma.$transaction` and merge via `mergeDetails()` helper. Direct `update: { details: X }` will clobber writingText/answerLog/pearlFeedback/etc. Helper currently duplicated across 4 files; flagged for shared-util refactor.
- AI services (fail-open): OpenAI direct API (GPT-4.1-mini default) for grammar checking and PEARL contextual barks, Azure Whisper for transcription
- Shared OpenAI client: `backend/src/utils/openai.ts` — lazy-init singleton, exports `getOpenAI()` and `OPENAI_MODEL`

## Frontend
- Vite + React + TypeScript + Tailwind + Zustand
- React Router routes:
  - `/` — office home (default landing page on all reloads)
  - `/terminal` — redirects to `/` on reload
  - `/season` — redirects to `/` in guided mode
  - `/shift/:weekNumber` — student shift
  - `/shift/:weekNumber/:stepId` — student step
  - `/teacher` — teacher dashboard (role-gated)
- `/teacher` is a dedicated route only for teacher-role users. All other routes show the student experience.
- Auth tokens in `sessionStorage` (per-tab isolation). Token cleared on logout via `disconnectSocket()` + `clearStoredToken()`.
- Stale chunk handling: `vite:preloadError` listener in `main.tsx` auto-reloads once after deploys.
- `MonitorPlayer`: `frontend/src/components/shared/MonitorPlayer.tsx` — shared CRT monitor video player (used for welcome video, storyboard clips, shift queue task clips). Renders video inside retro monitor frame with clip-path, scanlines, vignette, seekable LED progress bar, brass volume knob. `onEnded` captured in ref so parent re-renders don't reset the 2s auto-skip timer (fixed 2026-04-17 PR #5).
- `FrostedGlassPlayer`: `frontend/src/components/shift/media/FrostedGlassPlayer.tsx` — DEPRECATED (no remaining imports). Was replaced by MonitorPlayer.
- `scoreAggregator` + `taskResult` types (added 2026-04-17, PR #9): `frontend/src/utils/scoreAggregator.ts` is a pure reducer, `frontend/src/types/taskResult.ts` defines the canonical `TaskResultDetails` shape emitted by every task component's `onComplete`. ShiftClosing calls the aggregator; Vitest covers it (`frontend/src/utils/scoreAggregator.test.ts`, 11 tests).
- Frontend data shim: `frontend/src/data/citizen4488Posts.ts` mirrors backend's 4488 feed posts for ShiftClosing's Case File card (avoids a backend round-trip on shift close).

## Data Model (Prisma)
Primary models: `User`, `Arc`, `Week`, `Mission`, `MissionScore`, `Recording`, `HarmonyPost`, `HarmonyCensureResponse`, `PearlMessage`, `Class`, `ClassEnrollment`, `ClassWeekUnlock`, `Character`, `DialogueNode`, `PearlConversation`, `NarrativeChoice`, `TeacherConfig`, `DictionaryWord`, `WordFamily`, `WordStatusEvent`, `PairDictionaryProgress`, `Pair`, `SessionConfig`, `CharacterMessage`, `Citizen4488Interaction`, `ShiftResult`, `ComplianceCheckTemplate`, `ComplianceCheckResult`, `RemediationModuleResult`, `ClarityCheckResult` (added 2026-05-04 PR #37 — `@@unique([pairId, checkId])` for one-shot mastery delta guard, mirrors `ComplianceCheckResult` shape)

Deprecated: `Vocabulary`, `StudentVocabulary`

## Deployment (Railway — LIVE)
- **Platform**: Railway (project: `delightful-forgiveness`)
- **Backend service**: `lexical-republic` → `https://lexical-republic-production.up.railway.app`
  - Root directory: `backend`
  - Build: `npx prisma generate && npm run build`
  - Start: `npx prisma migrate deploy && npm run seed && npm run start`
- **Frontend service**: `accurate-transformation` → `https://accurate-transformation-production.up.railway.app`
  - Root directory: `frontend`
  - Build: `npm run build` (via `nixpacks.toml`)
  - Start: `npx serve dist -s -l 3000` (via `nixpacks.toml`)
  - `nixpacks.toml` sets `NPM_CONFIG_PRODUCTION=""` to suppress deprecated npm flag warning
  - Only env var: `VITE_API_BASE_URL=https://lexical-republic-production.up.railway.app/api`
- **PostgreSQL**: Railway-managed, connected via `${{Postgres.DATABASE_URL}}`
- **Volume**: 5 GB persistent disk mounted at `/data/uploads` on backend service
  - Stores briefing videos (`/data/uploads/briefings/`), welcome video (`/data/uploads/welcome/`), and student audio recordings
  - `BRIEFING_URL_PREFIX = '/uploads/briefings'` — DB stores relative URLs, `express.static('/uploads', uploadPath)` serves files
  - Upload directories created at backend startup (`uploads/` + `uploads/briefings/` + `uploads/welcome/`)
  - **Critical**: multer `destination` callbacks read `process.env.UPLOAD_DIR` at request time (not import time) to ensure the Railway volume path is used. Module-level constants evaluated before env injection caused files to write to ephemeral `/app/uploads/` instead of persistent `/data/uploads/`.
- **Key env vars** (backend):
  - `UPLOAD_DIR` = `/data/uploads`
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
  - `FRONTEND_ORIGIN`, `COOKIE_SAMESITE` = `none`, `NODE_ENV` = `production`, `JWT_SECRET`
- **Auto-deploy**: pushes to `master` trigger both services
- **Local dev**: `VITE_API_BASE_URL=/api` (proxied by Vite or direct localhost:4000)

## Backend Endpoints

### Shift routes (`backend/src/routes/shifts.ts`)
- `GET /api/shifts/weeks/:weekId/config` — week config for task queue (merges teacher overrides from Mission DB records into static WeekConfig, populates `clipAfter` from `teacherOverride.dismissalClipUrl`, includes `taskGates` array from student's class)
- `DELETE /api/shifts/weeks/:weekId/scores` — reset all MissionScore records for a week (used by teacher task controls)

### Teacher Task Commands
- **REST API** (works for online AND offline students): `POST /api/teacher/students/:studentId/task-command` — accepts `{ action, taskId? }`, persists directly to MissionScore/ShiftResult tables, also relays via socket for instant UI update on online students
- Supported actions: `skip-task` (mark current task complete), `reset-task` (delete current task score), `reset-shift` (delete all scores + ShiftResult), `send-to-task` (mark preceding tasks complete, clear target and later)
- Backend resolves student's current week and task position from DB (no client state needed)
- **Legacy Socket.IO path** still works for online students: student client handles `session:task-command` events, persists via its own API calls

### Teacher routes (`backend/src/routes/teacher.ts`)
- `GET /api/teacher/gradebook` — students + mission scores + ShiftResult summaries. Includes `shiftResults[]` per student (vocabScore, grammarAccuracy, documentsProcessed/Total, errorsFound/Total, targetWordsUsed, concernScoreDelta, `taskResults` JSON) so teacher sees the same stats students see on ShiftClosing. `taskResults` (2026-04-24) holds the new ShiftClosing metrics: `writingScore`, `overallScore`, `targetWordsHit`, `wordsWritten`. Gradebook MissionScore select also includes top-level `teacherComment` and `pearlFeedback` columns (added 2026-04-24).
- `GET /api/teacher/classes/:classId/writing-review?week=N` — (added 2026-04-24) class-wide writing review for one shift. Returns `{ weekNumber, weekTitle, entries[] }` — flat entries, one per writing source per MissionScore (writingText / text / writingSubmissions[i] / justifications[caseId]). Each entry is a `WritingReviewEntry`: `{ scoreId, studentId, designation, displayName, taskType, taskTitle, score, submittedAt, writingText, label, submittedAnyway, grammarScore, grammarNotes, vocabUsed, vocabMissed, taskNotes, pearlFeedback, teacherComment }`. taskTitle resolved via `getWeekConfig(weekNumber)`. Sorted by designation + submittedAt.
- `GET /api/teacher/weeks` — week list + briefing config
- `GET /api/teacher/weeks/:weekId/storyboard` — shift storyboard (derived from WeekConfig tasks, auto-creates missing Mission records)
- `PATCH /api/teacher/weeks/:weekId/steps/:missionType` — update step: swap activity, set embed URL, toggle `videoClipHidden`, remove video, remove dismissal video (`removeDismissalVideo`), reset override
- `POST /api/teacher/weeks/:weekId/steps/:missionType/video` — upload video clip for storyboard step (stored in `uploads/briefings/`). Supports `?slot=primary` (default, plays before task) or `?slot=dismissal` (plays after task via `clipAfter`)
- `PATCH /api/teacher/weeks/:weekId/briefing` — update briefing config (`embedUrl`, `episodeTitle`, `episodeSubtitle`, `fallbackText`)
- `PATCH /api/teacher/dictionary/:wordId` — edit dictionary word fields
- `PATCH /api/teacher/scores/:scoreId` — edit individual score (body: `{ score, details? }`)
- `PATCH /api/teacher/scores/:scoreId/comment` — (added 2026-04-24) update teacher comment on a MissionScore. Body: `{ comment: string | null }` (max 2000 chars). Auth: teacher/admin + `teacherOwnsScore` check. Emits `teacher:comment-updated` socket event on the `class:<id>` room.
- `DELETE /api/teacher/scores/:scoreId` — delete individual score
- `DELETE /api/teacher/students/:pairId/weeks/:weekId/progress` — reset week progress (cascading delete)
- `PATCH /api/teacher/students/:pairId/concern` — override pair concern score
- `PATCH /api/teacher/students/:pairId/lane` — set student difficulty tier (validates 1-3), emits `session:lane-changed` socket event for real-time update
- `DELETE /api/teacher/students/:studentId` — cascade delete single student (Pair or User, 11+ related tables), emits `student:deleted` socket event + purges in-memory tracking
- `DELETE /api/teacher/students` — bulk delete ALL students (iterates all pairs + legacy users)
- `POST /api/teacher/students/:studentId/task-command` — REST-based task control (skip-task, reset-task, reset-shift, send-to-task), works for online and offline students

### Class routes (`backend/src/routes/classes.ts`)
- `DELETE /api/classes/:classId` — cascade delete class (enrollments, week unlocks, harmony posts)
- `DELETE /api/classes/:classId/students/:studentId` — remove student enrollment from class
- `GET /api/classes/:classId/weeks/:weekId/task-gate` — read active gates (returns `taskGates: number[]`)
- `PATCH /api/classes/:classId/weeks/:weekId/task-gate` — set gates (accepts `{ taskGates: number[] }`), broadcasts `session:gate-updated` to class room
- `PATCH /api/classes/:classId` — update class name, active status, or `defaultLane` (1-3)

### Dictionary routes (`backend/src/routes/dictionary.ts`)
- `GET /api/dictionary` — full word list with `translationZhTw`, `starred`, `chineseRevealed`
- `GET /api/dictionary/:wordId` — single word detail
- `POST /api/dictionary/welcome-watched` — marks pair's welcome video as watched
- `POST /api/dictionary/welcome-video` — teacher upload (multer, MP4/WebM/MOV, 200MB limit)
- `GET /api/dictionary/welcome-video` — serves uploaded welcome video (BEFORE auth middleware — `<video>` tags can't send auth headers)
- `DELETE /api/dictionary/welcome-video` — teacher deletes welcome video
- `PATCH /api/dictionary/:wordId/starred` — toggle starred
- `PATCH /api/dictionary/:wordId/chinese-revealed` — set chineseRevealed=true (one-way)

### Harmony routes (`backend/src/routes/harmony.ts`)
- `GET /api/harmony/posts` — all feed-tab content types (feed, bulletin, pearl_tip, community_notice, sector_report), sorted by type priority. Triggers lazy generation. Returns `postType`, `bulletinData`, 3-tier vocab words. PR #12 (pending) adds `isFirstVisit: boolean` (true only when pre-update `lastHarmonyVisit` is null) for gating a one-time PEARL intro banner.
- **Auth + transaction hardening** (2026-04-17, PR #2): `POST /posts/:id/censure` rejects cross-class attempts (403). Mastery upsert+update atoms via `prisma.$transaction(async (tx) => {...})`. Stale-pending sweep threshold lowered 10s→3s. `lastHarmonyVisit` update awaited (no more fire-and-forget swallowing errors).
- `POST /api/harmony/posts` — create student post. As of 2026-04-24, runs through `harmonyModeration.ts` (profanity pre-filter + OpenAI rubric): approved posts are inserted with status='approved' + `pearlNote` + broadcast `harmony:new-content` + trigger `generateNpcReplies()`; flagged posts inserted with status='flagged' + PEARL rejection note, visible only to the author. OpenAI failure defaults to approved.
- `DELETE /api/harmony/posts/:id` — delete post (cascade: replies → censure responses → post)
- `GET /api/harmony/posts/:id/replies` — fetch replies for a post
- `POST /api/harmony/posts/:id/replies` — create reply
- `POST /api/harmony/posts/:id/censure` — approve/correct/flag a post (logs Citizen4488Interaction)
- `GET /api/harmony/censure-queue` — censure items scoped to route weeks, up to 3 review items by lowest mastery, returns `isReview` flag
- `POST /api/harmony/censure-queue/:id/respond` — submit censure response. Differentiated mastery: +0.05 current-week, +0.03 review.
- `POST /api/harmony/bulletins/:id/respond` — bulletin comprehension MCQ check (ephemeral, no DB write)
- `GET /api/harmony/archives?section=vocabulary|timeline|bulletins` — vocabulary by week with mastery, 4488 case file timeline, bulletin archive. Route-scoped, lazy-loadable by section.
- `GET /api/harmony/has-new` — lightweight check for new content since `Pair.lastHarmonyVisit`. Polled on TerminalDesktop mount.

### Clarity Check routes (`backend/src/routes/clarity-check.ts`)
- `POST /api/clarity-check/complete` — body `{ checkId, weekNumber, words: [{word, correct}] }`. Records a completed Clarity Check and bumps dictionary mastery +0.03 per correct answer (matches Harmony spaced-review rate). Wrapped in `prisma.$transaction`. No MissionScore is written — Clarity Checks are lightweight verifications, not tasks.

### Compliance Check routes (`backend/src/routes/compliance-check.ts`) — added 2026-04-28
Per-class scheduled screen-locking vocab quizzes configured in the Shifts tab. Templates are scoped by `(classId, weekNumber, placement, afterTaskId)`. One-shot per `(pairId, templateId)` enforced via DB unique constraint.
- `GET /api/compliance-check/templates?classId=X&weekNumber=N` — list templates for a class (optionally filter by shift). Teacher-only, ownership-checked.
- `POST /api/compliance-check/templates` — create. Body `{ classId, weekNumber, placement, afterTaskId?, title?, words: string[], questionCount, cumulativeReviewCount }`. Returns 409 if a template already exists for the same slot.
- `PUT /api/compliance-check/templates/:id` — partial update (`title`, `words`, `questionCount`, `cumulativeReviewCount`).
- `DELETE /api/compliance-check/templates/:id` — remove. Past `ComplianceCheckResult` rows preserved (templateId stays).
- `GET /api/compliance-check/teacher/shifts/:weekNumber/slots` — placement slots derived from `getWeekConfig(weekNumber).tasks`. Returns `{ tasks: [{ id, type, label }] }`.
- `GET /api/compliance-check/pending?weekNumber=N&placement=X[&afterTaskId=Y]` — student-facing cascade fetch. Looks up template by `(student's classId, weekNumber, placement, afterTaskId)`, builds questions on the fly via `complianceDistractors.ts`, creates/reuses a `ComplianceCheckResult` row (if `completedAt` is null), returns `{ pending: { checkId, templateId, weekIssued, title, questions } }` or `{ pending: null }`.
- `POST /api/compliance-check/complete` — student submits. Body `{ checkId, words: [{word, correct}] }`. Atomic via `prisma.$transaction`: marks result completed, bumps `PairDictionaryProgress.mastery` +0.03 per correct word.
- `GET /api/compliance-check/teacher/classes/:classId/results?weekNumber=N` — results review for a class.

**Backend distractor utility** (`backend/src/utils/complianceDistractors.ts`): `buildComplianceQuestions(selectedWords, questionCount)` — picks N random words from the curated list, looks up definitions in `DictionaryWord`, builds distractors from definitions of words NOT in `selectedWords` (deliberate — never test something the student wasn't asked about this round).

**Race-condition gotcha for cascade-style features**: the student-side cascade in `ShiftQueue.tsx` fires `fetchComplianceCheckFor()` (and similar) inside `useEffect`. If the student is moved to a different shift mid-flight (teacher's "Move to Shift"), the original promise is still pending and its `.then()` will write stale prior-shift state into `setActiveComplianceCheck` AFTER the reset effect has cleared it. **Pattern**: every async-fetching cascade effect must use a `let cancelled = false; return () => { cancelled = true; };` cleanup token AND snapshot `expectedWeek = weekConfig.weekNumber` before the await, then bail in the `.then()` if `cancelled || cc.weekIssued !== expectedWeek`. Plus a render-time guard (`if (active && weekConfig && active.weekIssued === weekConfig.weekNumber)`) as the last line of defense. Same pattern applies to any future placement-driven async fetch.

### Remediation Module routes (`backend/src/routes/remediation.ts`) — added 2026-04-30
Behavior-triggered screen-locking 3-question vocab MCQ. Fires when the rate-trigger state machine in `frontend/src/stores/sessionStore.ts` detects intentional `concernScore` grinding. Server is authoritative on cooldown math + escalating debounce.

- `POST /api/remediation/trigger` — pair-authed. Body `{ weekNumber, triggerReason: 'rate_warned' | 'rate_double' | 'absolute_3' }`. **Resume short-circuit**: if any open `RemediationModuleResult` exists for this pair (`completedAt IS NULL`), return that row directly with `resumed: true` (refresh-safe). Otherwise: count completed remediations for this pair+week; apply escalating debounce `[0, 90, 60, 30, 0]s` indexed by prior count. If still in debounce window, return `{ debounced: true, retryInSeconds }`. Otherwise: pull low-mastery words via `PairDictionaryProgress` (mastery < 0.6, weekIntroduced ≤ weekNumber, take 30, ordered by mastery + lastSeenAt); fall back to all `DictionaryWord` rows up to current week if fewer than 5 candidates (handles fresh students). Pass candidate words to `buildComplianceQuestions(words, 3)`. Create row with `concernAtTrigger = Pair.concernScore`. Emit `student:remediation-fired` to teacher room.
- `POST /api/remediation/:id/complete` — pair-authed. Body `{ correctCount: 0..3, results: [{word, correct}] }`. Cooldown delta = `[0, 0.5, 1.0, 1.5][correctCount]`. Wrapped in `prisma.$transaction`: read current `Pair.concernScore`, compute `newScore = max(0, current - cooldown)`, update Pair, mark row completed (`completedAt`, `correctCount`, `concernAfterCooldown = newScore`, `results`), upsert+bump `PairDictionaryProgress.mastery +0.03` for each correct word (mirrors clarity-check pattern). Emit `student:remediation-completed` with `cooldownApplied` + `newConcernScore`. Returns `{ success, newConcernScore, cooldownApplied, correctCount, totalCount }`. Idempotent: if `completedAt` is already set, returns `{ alreadyCompleted: true }` with current `concernAfterCooldown`.
- `POST /api/remediation/:id/clawback` — pair-authed. Called by the state machine when ANY positive `addConcern` delta lands within 60s of modal close. Restores cooldown delta to `Pair.concernScore` (no upper cap), sets `clawedBack = true`. If `correctCount === 0` (no cooldown was applied), still marks `clawedBack=true` for telemetry but doesn't change the score. Emit `student:remediation-clawback`. Returns `{ success, newConcernScore, restoredAmount }`.
- `GET /api/remediation/pending` — pair-authed. Returns the open row (`completedAt IS NULL`, ordered by `triggeredAt DESC LIMIT 1`) or `{ pending: null }`. Used by `RemediationOverlay` on App mount for refresh-safe modal restoration.

**Server-authoritative ladders**: `COOLDOWN_BY_CORRECT = [0, 0.5, 1.0, 1.5]` and `DEBOUNCE_BY_PRIOR_COUNT_SECS = [0, 90, 60, 30, 0]` — both at the top of `remediation.ts`. Tune knobs.

**Question source weighting**: low-mastery first via `PairDictionaryProgress` query; falls back to all dictionary words for fresh students. Distractors built via existing `buildComplianceQuestions` from `complianceDistractors.ts` (definitions of words NOT in the candidate list — never double-tests).

**Teacher route** (added to `backend/src/routes/teacher.ts`): `GET /api/teacher/remediation-events` accepts `?classId`, `?pairId`, `?week`. Filtered by teacher ownership (class + pair checks). Returns flat array `events: [{ id, pairId, designation, weekNumber, triggerReason, concernAtTrigger, concernAfterCooldown, correctCount, totalCount, clawedBack, triggeredAt, completedAt }]`. Used by ClassMonitor chip hydration + Gradebook drill-down.

### Narrative Choices routes (`backend/src/routes/narrative-choices.ts`)
- `POST /api/narrative-choices` — record a student's choice from an Inter-Task Moment or Mid-Task Choice. Body `{ choiceKey, value, weekNumber?, context? }`. Backed by `NarrativeChoice` Prisma model.
- `GET /api/narrative-choices?weekNumber=N` — read stored choices for the authenticated pair, optionally filtered by week.

### PEARL routes (`backend/src/routes/pearl.ts`)
- `GET /api/pearl/messages` — active ambient messages (shuffled)
- `POST /api/pearl/bark` — AI-generated contextual bark (3s timeout, fail-open to pool)
- `POST /api/pearl/chat` — AI chat with 4-layer guardrails, per-shift rate limit (20 messages per `pairId-weekN`). Supports `isWritingNudge` mode: specialized writing guidance context injection, Layer 4 filter relaxed to allow target vocab references in hints.

### PEARL Feedback route (`backend/src/routes/pearl-feedback.ts`) — added 2026-04-17 via PR #8
- `POST /api/pearl-feedback` — pair-authed. Request: `{ taskType, taskContext, studentText, weekNumber }`. Response: `{ pearlFeedback: string }` (150-200 chars, in-character PEARL observation on student REASONING — not grammar/vocab). 8s OpenAI timeout with `Promise.race`. Falls back to canned rotation on failure/timeout (never throws to UI). Reuses `getOpenAI()` from `backend/src/utils/openai.ts`; mirrors `Promise.race` pattern from `routes/pearl.ts`.

### Student routes (`backend/src/routes/student.ts`) — added 2026-04-17 via PR #6
- `GET /api/student/profile-summary` — pair-authed. Aggregates in parallel (`Promise.all`): Pair fields, `ShiftResult[]`, `PairDictionaryProgress` totals by status, `HarmonyPost` + `HarmonyCensureResponse` counts with correctness rate, `NarrativeChoice` + `Citizen4488Interaction` counts. Powers `MyFileApp.tsx`.

### Narrative Choices route (`backend/src/routes/narrative-choices.ts`) — added 2026-04-21
Stores student decisions from B (inter-task moments) and C (mid-task choices) layers. Writes to `NarrativeChoice` Prisma model (no migration — model existed; previously only written to from `messages.ts` character replies).
- `POST /api/narrative-choices` — pair-authed. Body: `{ choiceKey, value, weekNumber?, context? }`. `weekNumber` merged into `context` JSON before persistence. Uses `Prisma.InputJsonValue` cast for JSON column.
- `GET /api/narrative-choices?weekNumber=N` — pair-authed. Returns this pair's choices, optionally filtered to a specific week (filter applied in-memory on `context.weekNumber`).
- **Conventions:**
  - `choiceKey` pattern: `w{N}_{character}_aftertask{N}` for B moments (e.g. `w4_betty_aftertask1`), `w{N}_doc_review_*` for C mid-task doc choices (the old `w4_doc_review_frag3` key is RETIRED as of 2026-05-11 — W4 redesign removed the popup choice), `w{N}_drop_box_first_submission` for `[ ].edited` Drop Box submissions, `w{N}_recruitment_vote` for end-of-shift recruitment modal (compliant/curious/guarded; gates next-shift content depth). Stable across releases for cross-week queries.
  - `value` pattern: `compliant` | `curious` | `guarded` for triadic narrative choices. Used by consumer code (e.g. ShiftClosing PEARL echoes) to branch.

## Narrative-Reactive UI Layer (2026-04-21)

The W3 MVP and W4 rebuild added two non-skippable interaction layers inside the terminal flow:

### Inter-Task Moments (B-layer)
- Component: `frontend/src/components/shift-queue/InterTaskMoment.tsx` — full-surface (not floating modal), no skip/dismiss. Two variants:
  - `character`: message from a named NPC + 2–3 reply buttons (each uses W-grammar target). Click reply → POST `NarrativeChoice` → show chosen text + character response + Continue.
  - `ambient`: glitch text + timer (`durationMs`, default 2000ms) → Continue button appears after timer.
- Config: `interTaskMoments?: Record<taskId, InterTaskMomentConfig>` on `WeekConfig`. Keyed by task ID the moment fires AFTER (stable across task-list refactors).
- Wiring: `ShiftQueue.tsx` cascade after task completes = dismissal video → vocab interstitial → **inter-task moment** → next task. State cleared on week change / teacher task reset.

### Mid-Task Choices (C-layer)
- Embedded in `frontend/src/components/shift-queue/tasks/DocumentReview.tsx`. Interrupts between stamp animation and advance when the completed doc has `midTaskChoice` config.
- Config: `midTaskChoice?: MidTaskChoiceConfig` field on `DocumentConfig` (see `backend/src/data/week-configs/types.ts`). Options have `{ text, value, responseText? }`.
- UI: amber-accented "P.E.A.R.L. — Archive Control" overlay replaces doc view. Click option → POST `NarrativeChoice` → show chosen text + response (if any) + Continue → real advance.
- Extensible to any task type with a natural "between phases" moment.

### Shift-close PEARL observation cards
- `frontend/src/components/shift-queue/ShiftClosing.tsx` fetches `fetchNarrativeChoices(weekNumber)` on mount.
- Week-specific observation cards render before the ceremonial PEARL quote:
  - **W3** (MVP): quotes the student's first `priority_briefing` writing submission verbatim. Reads from `taskProgress[].details.writingSubmissions` — no backend dependency.
  - **W4**: conditional on `w4_recruitment_vote` value (end-of-shift recruitment NarrativeChoice from the `[ ].edited` recruitment modal, added 2026-05-11). Compliant → confirmation that 4488's record has been filed. Curious / guarded → variant copy reflecting the student's engagement with the resistance. The prior `w4_doc_review_frag3` key is retired; **as of 2026-06-11 the `ShiftClosing.tsx` consumer is STILL not wired to `w4_recruitment_vote`** (tracked in `audit-remediation-2026-06.md` deferred items).
- Cards are mutually exclusive (different weekNumber gates). Pattern scales as new weeks ship.
