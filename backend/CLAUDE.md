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
- **Markers are NOT completions** (added 2026-05-08) — any query that derives "shifts completed" from `ShiftResult` MUST filter `completedAt: { not: null }`. The `GET /api/teacher/students` include was missing this filter, off-by-one'ing `weeksCompleted` (and the ClassMonitor "current shift" highlight) whenever a class had been moved. Fixed at `backend/src/routes/teacher.ts:89` — replicate the filter pattern in any new endpoint that touches ShiftResults for completion counting.

## Difficulty Tier System
- **Teacher-controlled lanes**: `PATCH /api/teacher/students/:pairId/lane` — validates 1-3, emits `session:lane-changed` socket.

## Class / Student Deletion
- **Class deletion removes enrollments only** — NOT the Pair/User account records.
- **Student deletion requires cascade**: Pair has 11+ related tables (see `DELETE` endpoints in `backend/src/routes/teacher.ts`).
- **Student deletion emits socket**: `purgeOnlineStudent()` clears in-memory maps + `student:deleted` event to teachers + `purgeStudent()` clears both `onlineStudents` AND `lastKnownStatus`.
- **`DELETE /api/teacher/students/:studentId`** — cascade deletes single student. **Now gated by `teacherOwnsPair`** (audit batch 2026-05-04, PR #35).
- **`DELETE /api/teacher/students`** — bulk delete. **Now scoped to teacher's classes** via `enrollments: { some: { class: { teacherId } } }` (audit batch 2026-05-04, PR #35) — was previously deleting EVERY student in EVERY teacher's class.
- **`DELETE /api/classes/:classId`** — cascade deletes enrollments, week unlocks, harmony posts.
- **All `student:deleted` emits now scope to `class:${classId}`** (PR #38) — `classId` captured BEFORE the cascade transaction since `ClassEnrollment` rows get deleted in cascade.

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
- **`GET /pending` is now atomic** (audit batch 2026-05-04, PR #33) — was non-atomic `findUnique` + `create` race that 500'd on the second concurrent request. Now `prisma.complianceCheckResult.upsert({ update: {}, create: ... })`. Pre-existing `findUnique` short-circuit on `completedAt` retained to skip `buildComplianceQuestions(...)` when already done.
- **Clarity Check route**: `POST /api/clarity-check/complete` records correct answers and bumps dictionary mastery +0.03 per correct.
- **Clarity Check is now idempotent** (audit batch 2026-05-04, PR #37) — new `ClarityCheckResult` Prisma model `{ pairId, checkId, completedAt, ... @@unique([pairId, checkId]) }` mirrors `ComplianceCheckResult`. POST /complete short-circuits with `{ alreadyCompleted: true }` if `existing.completedAt` is set; mastery delta runs only on first call. Stops infinite +0.03/word grinding via replay.
- **Distractors**: `backend/src/utils/complianceDistractors.ts` `buildComplianceQuestions(selectedWords, count)` takes a curated word list.
- **Word picker is gated to per-shift `WeekConfig.targetWords`** (added 2026-05-03). `getComplianceWordsByWeek()` in `backend/src/data/week-configs/index.ts` returns `Record<weekNumber, Set<lowercase>>` — single source of truth. `/teacher/dictionary-words/grouped?toeicOnly=true` intersects rows against `allowedByWeek[row.weekIntroduced]`. POST/PUT `/templates` use `filterToTargetWords()` (NOT the older `filterToToeicOnly()` — that gate was too loose, allowed non-target TOEIC words). Question count cap = **6** (not 5). Adding a new shift means adding its targetWords list AND mirroring it in `frontend/src/components/teacher/compliance-check/WordPicker.tsx::TARGET_WORDS_BY_WEEK`.
- **Results table is populated, no UI consumes it yet** — `ComplianceCheckResult` stores per-attempt `pairId`, `templateId`, full `questions` JSON, full `results` JSON, `correctCount`, timestamps. `GET /teacher/classes/:classId/results` endpoint exists; future Gradebook drill-down can render answers.

## Multer Upload Error Handling (added 2026-05-03)
- **`withMulterError(handler)` wrapper** in `backend/src/middleware/upload.ts` converts multer failures (`LIMIT_FILE_SIZE` → 413, fileFilter rejection → 400, anything else → 400) into JSON `{ error, code, maxBytes }` responses. Without it, multer errors bubble to Express' default HTML 500 page and the frontend can only show a generic "upload failed" — masking real causes. Wrap every `uploadVideo.single('video')` route registration with this. Currently used in: `dictionary.ts` (`/welcome-video`), `teacher.ts` (`/weeks/:weekId/briefing/video`, `/weeks/:weekId/briefing/video/:slot`, `/weeks/:weekId/steps/:missionType/video`).

## Socket Server — per-class scoping (audit batch 2026-05-04, PR #36/#38)
- **No more global `'teacher'` room.** Teachers join `class:${classId}` rooms (one per owned class — fetched via `prisma.class.findMany({ where: { teacherId } })`) plus a personal `teacher:${teacherId}` room. Initial `teacher:class-snapshot` is filtered to the teacher's classes.
- **All emit sites use per-class rooms.** `socketServer.ts` internal emits + the 9 emit sites in `auth.ts` / `messages.ts` / `remediation.ts` / `teacher.ts` route files. `classId` resolves via `prisma.classEnrollment.findFirst({ where: { OR: [{ pairId }, { userId }] }, select: { classId: true } })` — captured BEFORE cascade-delete in delete handlers.
- **`teacher:pause-all` / `teacher:resume-all` validate classId + ownership** before broadcasting. Missing classId = no-op (no more accidental pause-every-class). Verifies teacher owns the class via `prisma.class.findFirst({ id, teacherId })`.
- **`classPauseState: Map<classId, { paused, message, ts }>`** at top of `socketServer.ts` persists pause state across socket reconnects within a backend lifetime. Mutated in pause-all/resume-all handlers; checked in student-connect handler — if class is paused at connect time, server immediately emits `session:paused` to that student, fixing the W3 writing-submit overlay bypass for refreshed/late-join students.
- **Per-student commands gated by ownership** — `teacher:skip-task` / `teacher:reset-task` / `teacher:reset-shift` / `teacher:send-to-task` all run `prisma.classEnrollment.findFirst` ownership check; unauthorized requests silently ignored.

### `student:task-progress` partial-update event (added 2026-05-08 PM)
- **New socket event** alongside the existing `student:task-update`. Lets sub-components (currently `WritingEvaluator`) push progress without owning the parent task's identity.
- **Does NOT mutate `taskId`/`taskLabel`. Does NOT reset `taskStartedAt` or `failCount`.** Only updates the explicitly-set payload fields: `taskKind`, `progressLabel`, `failCount`. Bumps `lastActivityAt` and re-emits `student:status-updated`.
- **`StudentStatus` now carries `taskKind: string | null` and `progressLabel: string | null`** (also cleared on taskId change in the existing `student:task-update` handler so labels don't bleed across tasks).
- **Why this exists**: WritingEvaluator's old failure emit used `student:task-update` with `taskId: missionId ?? 'writing'` which differed from the parent's taskId (e.g. `priority_briefing`), tripping the `if (existing.taskId !== data.taskId)` reset path on every first failure. Elapsed time on Writing was being reset to "first fail" instead of "task entry" and the parent label was being overwritten. Switching to `task-progress` fixes both.

### Still unresolved (deferred)
- **`classPauseState` is in-memory only.** Railway redeploys lose pause state. Acceptable for now; persist via `Class.pausedAt` + `Class.pauseMessage` Prisma columns when the rare classroom case bites. The `onlineStudents` Map (`socketServer.ts:33`) is also in-memory but rebuilds organically as students reconnect and emit `student:enter-shift`.

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

## Activity Tracking — `lastSeenAt` (added 2026-05-08)
- **Schema**: `Pair.lastSeenAt DateTime?` and `User.lastSeenAt DateTime?` (migration `20260508020000_add_last_seen_at`). Nullable so existing rows are valid until they next make a request.
- **Update site**: `backend/src/middleware/auth.ts` — after successful JWT verification, calls `bumpLastSeen('pair' | 'user', id)`. Throttled to once per actor per 60s via in-memory `lastSeenWritten` Map. Update is fire-and-forget (`prisma.update().catch(...)`); never blocks the request.
- **Read site**: `GET /api/teacher/students` returns `lastSeenAt` for both pair and legacy User results. Frontend `ClassMonitor` derives a 4-state ActivityState from `online + lastSeenAt + now`.
- **Why DB-backed not socket-only**: the in-memory `onlineStudents` Map (`socketServer.ts:33`) gets wiped on every Railway restart. `lastSeenAt` survives restarts so the dashboard isn't empty for minutes after a redeploy.

## Harmony Bilingual Study Card (added 2026-05-14)
- **`POST /api/harmony/censure-queue/:id/respond` returns optional `studyCard`**: shape `{ word, phonetic, translationZhTw, exampleSentence } | null`. Looked up via `lookupStudyWord(raw)` helper at the top of `routes/harmony.ts`.
- **`lookupStudyWord` inflection fallback**: tries the raw word, then `-s`/`-ed`/`-ing`/`-ies` strippings so `describes` resolves to `describe`, `arrived` to `arrive`. Stop after the first match. Returns null if no candidate hits `DictionaryWord` — UI is expected to handle null gracefully.
- **Per-type lookup target**:
  - `censure_vocab` → `errorWord` (student needs the misused word's real meaning)
  - `censure_redact` → `approvedWord`, then `correction` (teach the TOEIC word they SHOULD have demanded)
  - `censure_triage` → null (decision-based; no single teaching target)
  - `censure_grammar` / `censure_replace` → `correction`, then `errorWord`
- **studyCard lookup wrapped in try/catch**: if the DB hiccups during lookup, log + return `studyCard: null`. NEVER let the lookup error 500 an otherwise-successful submission.

## Harmony Bulletin Mandarin Backfill — `STATIC_TRANSLATION_BY_REF` (added 2026-05-14)
- **`STATIC_TRANSLATION_BY_REF: Map<refNumber, translations[]>`** built once at module load from current `STATIC_BULLETINS`. Sits at the top of `routes/harmony.ts`.
- **`enrichBulletinData(bulletinData)` helper**: takes a `HarmonyPost.bulletinData` JSON value, looks up the bulletin by `refNumber`, and merges current per-question `translationZhTw` into questions that don't already have one. **DB value wins on conflict** for forward-compat with future-seeded posts.
- **Applied in two places**: `/posts` response (`bulletinData: enrichBulletinData(post.bulletinData) ?? null`) and `/archives` response (`bulletinData: enrichBulletinData(b.bulletinData)`). Any future endpoint that returns `bulletinData` must wrap the same way — without it, existing DB rows never pick up new Mandarin translations.
- **Why this exists**: bulletins inserted before `translationZhTw` was added have stale JSON. Read-time enrichment avoids a one-off migration and the risk of overwriting future hand-authored translations in the DB.

## Harmony Censor Activity Types — Redact + Triage (added 2026-05-18)
- **`CENSURE_POST_TYPES`** in `routes/harmony.ts`: `['censure_grammar', 'censure_vocab', 'censure_replace', 'censure_redact', 'censure_triage']`. Adding a new censure type means: (1) extend this constant, (2) extend `DEFAULT_CONTENT_COUNTS` in `harmonyGenerator.ts`, (3) handle the response shape in `/censure-queue/:id/respond` if the validation rule differs from index-match, (4) add static items to `STATIC_CENSURE_ITEMS` for the weeks that should carry it.
- **`censure_redact` validation uses `selectedWord` body field**: optional `selectedWord: string` arrives in the request body alongside `selectedIndex`. When `post.postType === 'censure_redact'`, backend strips punctuation + lowercases + compares to `censureData.errorWord`. All other types ignore `selectedWord` and use the existing `selectedIndex === correctIndex` check.
- **`censure_triage` reuses MCQ index-match**: bins are `censureData.options[]`; correct bin index is `censureData.correctIndex`. No special validation logic needed.
- **`DEFAULT_CONTENT_COUNTS`** entries for new types: `censure_redact: 2, censure_triage: 2`. Static-only for now — the AI generator's prompt does NOT know about these types, so the static pool fills the quota. Weeks without static items (W4+) will simply not have redact/triage in the queue until either static items are authored or the AI prompt is extended.
- **`censureData.options` for redact** is `[]` and `correctIndex` is `-1` — sentinel values, not used. The frontend branches on `postType` and never reads these for redact. Keeping the fields present preserves the JSON shape compatibility with the existing `censureData` type.
- **`censureData` for triage** keeps the standard MCQ shape — `options: ['Approve', 'Forward to Wellness', 'Flag for Reg 14-C']` (fixed order, NOT shuffled by frontend), `correctIndex: 0 | 1 | 2`.

## Harmony NEW-content Detection — `ingestedAt` (added 2026-05-07)
- **Schema**: `HarmonyPost.ingestedAt DateTime @default(now())` (migration `20260507051505_add_harmonypost_ingested_at`). Backfilled from `createdAt` for existing rows so old posts don't all flash NEW.
- **Why a separate column**: `createdAt` is intentionally backdated 10 min – 5.5 h by `staggeredCreatedAt()` for narrative texture. That backdating was breaking `/has-new` and per-post `isNew` checks (compared to `lastHarmonyVisit`, false-negatived for students who visited Harmony recently).
- **Use `ingestedAt` for ALL "is this new" comparisons**: `harmony.ts:189` (`/has-new` count) and `harmony.ts:471` (per-post `isNew` boolean). `createdAt` is for display order + "posted X hours ago" UI only.

## Teacher Shift-Progress on Initial Load (added 2026-05-08)
- **`buildShiftStatusForPair(pairId)` helper** at top of `backend/src/routes/teacher.ts`. Extracted from `GET /shift-status`. Returns the same `ShiftStatus` shape (`weekNumber`, `tasks`, `currentTaskIndex`, etc.) or `null` for pairs with no current week / no WeekConfig.
- **`GET /students` parallel-fetches per-pair via `Promise.all`** + `buildShiftStatusForPair`, includes `currentShiftProgress` on each pair result. Failures per-pair are caught + logged + null'd; do NOT 500 the whole endpoint on one bad pair.

## Storyboard Step Exposes `taskId` (added 2026-05-08)
- **`GET /api/teacher/weeks/:weekId/storyboard`** returns `taskId: task.id` on each step alongside `missionType: task.type` (`backend/src/routes/teacher.ts:1362`). On W2+, task `id` (e.g. `word_match_w3`) differs from `type` (e.g. `word_match`).
- **Why**: the frontend's `ComplianceCheckMarker` matches inline storyboard slots to Compliance Check templates by `afterTaskId`, which references the WeekConfig task `id`. Without exposing `id`, the markers couldn't find the right template.
- **Pattern**: any storyboard consumer that needs to bridge to `WeekConfig` task lookups (Compliance Check, Clarity Check, future per-task overlays) should use `taskId` not `missionType`.

## Compliance Check `after_task` Semantics (added 2026-05-08)
- **`placement: 'after_task'` with `afterTaskId: X` fires AFTER task X completes** — `ShiftQueue.handleComplete` calls `fetchComplianceCheckFor('after_task', completedTaskId)` after the just-finished task, before advancing the queue. The frontend label was historically "Before X" (backwards); renamed to "After X" everywhere on 2026-05-08. Backend semantics never changed — only the labels.
- **There is no `before_task` placement.** A check that should fire as students enter task X is implemented as `after_task` with `afterTaskId = (task before X)`. If you ever need true on-entry firing, that's a separate runtime change in `ShiftQueue` (start-of-task hook), not a new placement value.

## Remediation Word Source — TOEIC `targetWords` Gate (added 2026-05-08)
- **`pickRemediationWords` in `backend/src/routes/remediation.ts`** intersects candidate words with `getComplianceWordsByWeek()` for shifts 1..weekNumber. Same gate Compliance Check uses.
- **Purpose**: prevent story / world-building / future-shift words from showing up in remediation MCQ. Doctrine: vocabulary is TOEIC-first.
- **`take: 100`** on both progress + fallback queries (was 30) to leave room for the post-filter.

## Remediation Question Payload — phonetic / translation / example (added 2026-05-08)
- **`ComplianceQuestion` interface** in `backend/src/utils/complianceDistractors.ts` extended with `phonetic?: string`, `translationZhTw?: string | null`, `exampleSentence?: string`. Additive — existing callers ignore.
- **Both Compliance Check and Remediation Module inherit the richer payload**; only Remediation renders them (in the lane-aware StudyCard).

## Deploy / Start Script (added 2026-05-07)
- **`package.json` start**: `npx prisma migrate deploy && node dist/index.js`. Future migrations auto-apply on Railway boot. Idempotent — no-op when DB is in sync.
- **W4 problem (KNOWN, NOT YET FIXED 2026-05-08)**: `backend/prisma/seed.ts:884` is hardcoded `weeks 1-3` for `createQueueWeekMissions`. W4 has a WeekConfig (`d784aa4`) but the production DB has only legacy 7-step `Mission` rows from `createDefaultWeekMissions`. Will break scoring when first student crosses into W4. Fix shape: a startup hook (mirrors `migrateHarmonyAuthorLabels`) that reconciles WeekConfig vs Mission rows for any week with a queue config.

## Gradebook Remediation Events Payload (added 2026-05-08)
- **`GET /api/teacher/remediation-events` now returns `questions` and `results` JSON** alongside the existing trigger/score fields. Data was already stored on `RemediationModuleResult`; the endpoint was stripping it. Powers the expandable "Remediation Events" rows in the Gradebook.
