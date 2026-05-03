# Backend — Lexical Republic

Backend-specific gotchas and conventions. For project-wide rules, vision, and locked decisions, see the root `CLAUDE.md`. For day-by-day shipped work, see `docs/changelog.md`.

**Stack:** Express 5 + TypeScript + Prisma + PostgreSQL + Socket.IO.

## Commands
`npm run dev` | `npm run build` | `npm run db:migrate` | `npm run seed` | `npm run test`

## Prisma Gotchas
- **`.env` must exist in `backend/` dir** (not just root) for Prisma to find `DATABASE_URL`.
- **After adding Prisma models, must run `npx prisma generate`** before tsc will pass.
- **Prisma cascade deletion**: Pair has 11+ related tables that must be deleted in correct order before deleting the Pair itself (see DELETE endpoints in `backend/src/routes/teacher.ts`).
- **Prisma JSON upsert = blob replace**: `update: { details: X }` atomically replaces the whole Json field — there is **NO deep merge**. Two endpoints upserting the same row will clobber each other. Use `mergeDetails()` via `prisma.$transaction` (see `backend/src/routes/shifts.ts` + `submissions.ts`). Spread `{...existing, ...incoming}` alone isn't enough either — incoming `''` will still overwrite a non-empty existing string.
- **TS narrowing dies in transaction callbacks**: `prisma.$transaction(async tx => {...})` drops narrowing on nullable fields like `metadata?.missionId`. Pin to a local `const missionId: string = metadata.missionId;` BEFORE the callback.
- **WeekConfig task `id` vs `type`**: Task IDs (e.g. `word_match_w2`) differ from types (e.g. `word_match`) in Week 2+. Mission DB records store `type` as `missionType`. Any lookup from frontend task IDs must translate via `configIdToType` map.

## Express 5 Gotchas
- **Express 5 (not 4)** — `req.params` values are `string | string[]`, cast with `as string`.
- **Static routes MUST be defined BEFORE parameterized routes** — `/foo/bar` must come before `/foo/:id` or it'll be matched as `id="bar"`.
- **JWT payload uses `userId`** (not `id`) — check `utils/jwt.ts` `JwtPayload` interface.
- **`<video>` tags can't send auth headers** — routes serving video must be BEFORE `router.use(authenticate)`. Use express.static `/uploads/` path instead of API routes.

## Railway Deploy Gotchas
- **Frontend build failure = silent stale deploy**: If frontend `tsc` or Vite fails, Railway keeps serving the OLD bundle. Always verify frontend `npm run build` passes locally before pushing. (Same applies to backend, but backend failures are usually noisier.)
- **Two separate services**: Backend (`lexical-republic`) and Frontend (`accurate-transformation`) deploy independently. Backend can be live while frontend is stale.
- **Upload dirs created at startup**: Backend creates `uploads/` and `uploads/briefings/` on startup. Fresh Railway volume mounts need this.
- **Persistent file storage**: currently uses Railway volume; redeploys preserve files but volume loss would delete all uploads. Future migration target: S3/R2.
- **Backend serves welcome video**: Upload/delete/serve in `dictionary.ts`; GET route BEFORE `authenticate` middleware.

## Task Control Persistence
- **Task controls MUST persist to server** — skip/goToTask/resetShift must call `submitMissionScore` or `resetWeekScores` on the backend, not just update local Zustand. Otherwise refreshing resets everything.
- **REST-based teacher task commands**: `POST /api/teacher/students/:studentId/task-command` — works for online AND offline students. Actions: `skip-task`, `reset-task`, `reset-shift`, `send-to-task`. Persists directly to DB + relays via socket for online students.
- **Reset-shift endpoint**: `DELETE /api/shifts/weeks/:weekId/scores` — clears all MissionScore records for a week.
- **Null weekConfig guard**: Task commands should check for weekConfig and show PEARL feedback if null, not silently fail.
- **Send-to-task id→type translation**: Backend `configIdToType` map translates config IDs (e.g. `word_match_w2`) to missionType (e.g. `word_match`). Shift-status endpoint returns `t.id` (not `t.type`) for consistency with online student socket data.

## Move-to-Shift System
- **Per-student**: `POST /api/teacher/students/:studentId/move-to-shift` — validates content exists, auto-unlocks weeks, creates marker ShiftResult (completedAt=null) at target.
- **Per-class**: `POST /api/teacher/classes/:classId/move-to-shift` — moves all enrolled students.
- **Forward move**: ShiftResult with completedAt for skipped weeks + marker at target + delete target MissionScores.
- **Backward move**: Delete ShiftResult + MissionScore from target onward + marker at target.
- **Socket event**: `session:shift-changed` → student reloads season, resets shiftQueueStore, navigates to `/shift/N`.
- **Season endpoint**: `clockedOut` checks `ShiftResult.completedAt` (not just MissionScore on clock_out missions).
- **Only weeks with WeekConfig content allowed** — backend rejects moves to weeks without `getWeekConfig()` returning non-null.

## Difficulty Tier System
- **Teacher-controlled lanes**: `PATCH /api/teacher/students/:pairId/lane` — validates 1-3, emits `session:lane-changed` socket.

## Class / Student Deletion
- **Class deletion removes enrollments only** — NOT the Pair/User account records.
- **Student deletion requires cascade**: Pair has 11+ related tables (see `DELETE` endpoints in `backend/src/routes/teacher.ts`).
- **Student deletion emits socket**: `purgeOnlineStudent()` clears in-memory maps + `student:deleted` event to teachers + `purgeStudent()` clears both `onlineStudents` AND `lastKnownStatus`.
- **`DELETE /api/teacher/students/:studentId`** — cascade deletes single student.
- **`DELETE /api/teacher/students`** — bulk delete ALL students.
- **`DELETE /api/classes/:classId`** — cascade deletes enrollments, week unlocks, harmony posts.

## PEARL Rate Limiting
- **20 messages per shift**: In-memory Map keyed by `pairId-weekN`, checked before OpenAI call.
- **5-second cooldown**: Frontend `pearlStore.ts` enforces between sends.
- **200 char max**: Both frontend and backend validate.
- **In-world limit messages**: "Communication allocation exhausted, Citizen" — 4 rotation variants.
- **Frontend `chatRateLimited` flag**: Disables input + send button, set when backend returns `rateLimited: true`.
- **Resets**: New shift (different week key) or server restart.

## Remediation Module (behavior-triggered MCQ lockouts) — added 2026-04-30
- **Server is authoritative on cooldown math**: `COOLDOWN_BY_CORRECT = [0, 0.5, 1.0, 1.5]` (constants at top of `remediation.ts`). Client sends `correctCount` only; server computes delta + applies floor at 0 + bumps `PairDictionaryProgress.mastery +0.03` per correct word inside `prisma.$transaction`.
- **Server is authoritative on debounce**: `DEBOUNCE_BY_PRIOR_COUNT_SECS = [0, 90, 60, 30, 0]` indexed by count of prior completed remediations for this pair+week. Returns `{ debounced: true, retryInSeconds }` if still locked out.
- **Resume short-circuit on `POST /trigger`**: if any open `RemediationModuleResult` exists (`completedAt IS NULL`, ANY week — pair-scoped), return that row directly with `resumed: true`. Refresh-safe; multiple in-flight rows shouldn't exist by construction.
- **Question source weighting**: `PairDictionaryProgress` query first (mastery < 0.6, weekIntroduced ≤ weekNumber, ordered by mastery + lastSeenAt, take 30). Fall back to `DictionaryWord` (weekIntroduced ≤ weekNumber, take 30) if fewer than 5 candidates from progress. Pass to existing `buildComplianceQuestions(words, 3)` from `complianceDistractors.ts`.
- **Clawback is server-driven**: `POST /:id/clawback` restores `cooldownApplied = COOLDOWN_BY_CORRECT[row.correctCount]` to `Pair.concernScore` (no upper cap), sets `clawedBack=true`. If `correctCount === 0`, marks clawed-back for telemetry but doesn't change score.
- **Socket emissions to teacher room**: `student:remediation-fired` (on trigger creation), `student:remediation-completed` (on complete), `student:remediation-clawback` (on clawback). Payload always includes `pairId`, `designation`, `moduleId`, `weekNumber`. Used by ClassMonitor live chip + Gradebook drill-down.
- **Teacher endpoint** `GET /api/teacher/remediation-events` accepts `?classId`, `?pairId`, `?week`. Filters by teacher ownership (class + pair). Returns flat events array. Defined in `backend/src/routes/teacher.ts` (NOT `remediation.ts`) to keep all teacher endpoints under `/api/teacher/`.
- **TS gotcha encountered during foundation**: `Array.isArray(req.body?.x) ? req.body.x : []` produces an `any | never[]` union that loses inference downstream in `.filter(...).map(...)` chains, triggering `noImplicitAny` errors at the map step. Fix: explicitly type `const results: unknown[] = Array.isArray(req.body?.results) ? (req.body.results as unknown[]) : [];` before filter chain.
- **Tune knobs**: `COOLDOWN_BY_CORRECT` and `DEBOUNCE_BY_PRIOR_COUNT_SECS` arrays at top of `remediation.ts`. Don't pre-tune; calibrate after live observation.

## Compliance / Clarity Check (per-class scheduled MCQ lockouts)
- **Compliance Check**: `ComplianceCheckTemplate` Prisma model with `(classId, weekNumber, placement, afterTaskId)` unique. `templateId` FK on `ComplianceCheckResult` with `(pairId, templateId)` unique for refresh-safe one-shot.
- **Compliance routes**: `GET/POST/PUT/DELETE /compliance-check/templates`, `GET /compliance-check/pending`, `GET /teacher/dictionary-words/grouped`, `GET /compliance-check/teacher/shifts/:weekNumber/slots`, `POST /compliance-check/complete`, `GET /compliance-check/teacher/classes/:classId/results`.
- **Clarity Check route**: `POST /api/clarity-check/complete` records correct answers and bumps dictionary mastery +0.03 per correct.
- **Distractors**: `backend/src/utils/complianceDistractors.ts` `buildComplianceQuestions(selectedWords, count)` takes a curated word list.
- **Word picker is gated to per-shift `WeekConfig.targetWords`** (added 2026-05-03). `getComplianceWordsByWeek()` in `backend/src/data/week-configs/index.ts` returns `Record<weekNumber, Set<lowercase>>` — single source of truth. `/teacher/dictionary-words/grouped?toeicOnly=true` intersects rows against `allowedByWeek[row.weekIntroduced]`. POST/PUT `/templates` use `filterToTargetWords()` (NOT the older `filterToToeicOnly()` — that gate was too loose, allowed non-target TOEIC words). Question count cap = **6** (not 5). Adding a new shift means adding its targetWords list AND mirroring it in `frontend/src/components/teacher/compliance-check/WordPicker.tsx::TARGET_WORDS_BY_WEEK`.
- **Results table is populated, no UI consumes it yet** — `ComplianceCheckResult` stores per-attempt `pairId`, `templateId`, full `questions` JSON, full `results` JSON, `correctCount`, timestamps. `GET /teacher/classes/:classId/results` endpoint exists; future Gradebook drill-down can render answers.

## Multer Upload Error Handling (added 2026-05-03)
- **`withMulterError(handler)` wrapper** in `backend/src/middleware/upload.ts` converts multer failures (`LIMIT_FILE_SIZE` → 413, fileFilter rejection → 400, anything else → 400) into JSON `{ error, code, maxBytes }` responses. Without it, multer errors bubble to Express' default HTML 500 page and the frontend can only show a generic "upload failed" — masking real causes. Wrap every `uploadVideo.single('video')` route registration with this. Currently used in: `dictionary.ts` (`/welcome-video`), `teacher.ts` (`/weeks/:weekId/briefing/video`, `/weeks/:weekId/briefing/video/:slot`, `/weeks/:weekId/steps/:missionType/video`).

## KNOWN BUGS — diagnosed 2026-05-03, NOT YET FIXED
- **`onlineStudents` Map is in-memory** (`socketServer.ts:33`) — wipes on every backend restart. Railway redeploys (especially the recent failed-build retry pattern) churn this state. Teacher dashboard sees an empty class for ~5s after each restart. Fix shape: either (a) rebuild from active socket connections + replay-on-connect for late joiners, or (b) persist last-known to Redis with TTL.
- **`session:paused` and `session:task-command` are fire-and-forget** — Socket.IO doesn't replay missed events to late connections. Result: a class paused via `teacher:pause-all` only locks students currently connected at click time; refreshes / late joiners bypass the pause silently. Same shape for send-to-task: REST writes the DB but the live socket relay is lost if the student is mid-reconnect. Fix shape: server-side persisted `Map<classId, { paused, message, ts }>` (or `Class.pausedAt` + `Class.pauseMessage` Prisma columns for restart-survivable state) + replay block in the student-connection handler at `socketServer.ts:225-235`.

## Harmony (server-side)
- **Generation lock**: In-memory `Map<string, Promise<void>>` per classId prevents concurrent duplicate generation.
- **Route-aware generation**: `ensureHarmonyPostsExist()` only generates for weeks in the class's `narrativeRoute`.
- **3-tier vocabulary**: focus / recent / deep — `getHarmonyReviewContext()` in `harmonyFeed.ts` resolves by route index, not absolute week number.
- **Mastery updates wrapped in `prisma.$transaction`** (Phase 0/A hardening).
- **Stale-pending sweep**: 3s (was 10s).
- **`lastHarmonyVisit` awaited** (no more fire-and-forget) — needed for accurate NEW badges.
- **`harmony:new-content` socket event**: Emitted from `harmonyGenerator.ts` when posts are inserted. Frontend listener clears when student opens Harmony.
- **OpenAI moderation**: `backend/src/utils/harmonyModeration.ts` runs profanity pre-filter + rubric check. Flagged posts visible ONLY to author. OpenAI failure defaults to approved (permissive).

## Submissions / Writing Eval
- **Mastery upsert+update wrapped atomically** in `prisma.$transaction`.
- **On-topic veto rubric** (post 2026-04-29): `(1) onTopic boolean — strict veto` (off-topic = score 0.0); `(2) vocabScore (0–1)` — only numeric axis; `(3) grammarAdvisory string` — non-scoring observation, teacher-only. Score = `onTopic ? vocabScore : 0`.
- **No grammar scoring on open writing.** Grammar scoring lives only in constrained tasks (multi-choice / cloze / error correction).
- **Debug endpoint**: `GET /api/teacher/debug/raw-details/:pairId/:weekNumber` dumps raw MissionScore rows for a shift. Teacher-authenticated, ownership-checked.
