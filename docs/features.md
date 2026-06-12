# Implemented Features

## Student Experience
- Login and boot sequence are live.
- Terminal view is the primary learning interface.
- Active terminal apps in guided mode: `clarity-queue`, `harmony`, `my-file`
- `duty-roster` hidden in guided mode; visible in free-roam mode. Shows instruction text ("Choose an unlocked shift to start. Complete each shift in order to unlock the next one.").
- Harmony locked until teacher opens it for the class (`harmonyOpen` toggle in ClassManager).
- Terminal header `HOME` button returns to terminal desktop and navigates to `/`. **Exit confirmation**: When a student is inside the shift queue (`clarity-queue`), both the `⌂ HOME` button and `✕ CLOSE` button show a "Leave current shift?" confirmation dialog before navigating away. Warns that in-progress task work will be lost (completed tasks are preserved). Non-shift apps close immediately without prompt.
- Terminal desktop tiles (in order): Office, Lexicon, Current Shift, Duty Roster, Harmony, My File.
- Students are guided (not free-roam) in the current phase.

## ShiftQueue System (Weeks 1-4)
Config-driven task queue. Each week has 5–6 tasks driven by static `WeekConfig` TypeScript files.

- Backend: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts`, `week4.ts` — served via `GET /api/shifts/weeks/:weekId/config`. Built-weeks threshold tracked via `frontend/src/data/narrative-routes.ts` `MAX_BUILT_WEEK` (currently 4).
- Frontend: `ShiftQueue.tsx` renders tasks via `TASK_REGISTRY` lookup (extensible)
- Branching: `ClarityQueueApp.tsx` checks `weekConfig?.shiftType === 'queue'` before falling through to PhaseRunner
- **Between-shift UX**: When student has completed their current shift but the next shift isn't unlocked by the teacher, "Current Shift" shows a clean "Shift N Complete — Awaiting supervisor authorization for your next assignment. Stand by, Associate." screen instead of re-entering the completed shift queue.
- Stores: `shiftQueueStore` (task progress, concern delta), `messagingStore` (character messages, notifications)

**Task types (TypeScript union):** `intake_form`, `word_match`, `cloze_fill`, `word_sort`, `vocab_clearance`, `document_review`, `contradiction_report`, `shift_report`, `priority_briefing`, `priority_sort`, `evidence_assembly`, `custom`

**IntakeForm card types:** `personal_info`, `briefing`, `intake_questions`, `status_review`, `writing`, `acknowledgment`
- `briefing` card: read-only orientation memo with paragraphs + "I have read this document" button. Provides input before comprehension questions (correct SLA sequencing).

**VocabClearance:** Answer word no longer displayed at top of each question — students must select from options without seeing the correct answer.

**Option randomization:** All quiz/match tasks shuffle options on mount using Fisher-Yates:
- `WordMatch`: Both word and definition columns independently shuffled
- `VocabClearance`: Item order + option order within each item shuffled, `correctIndex` remapped
- `ErrorCorrectionDoc`: Dropdown options shuffled per error, `correctIndex` remapped
- `ClozeFill`: Word bank shows full words (not truncated prefixes), shuffled via `useMemo` so correct answers don't appear in blank order

**Touch support:** All interactive elements have `active:` Tailwind states for touchscreen Chromebooks (active:scale-95, active:bg-*, etc.)

**Shared components:**
- `TargetWordHighlighter` — word status chips (emerald=used, neutral=unused), progress bar, Porter Stemmer matching (inflected forms accepted)
- `WritingEvaluator` — 3-attempt system: full eval → relaxed threshold → auto-pass. Calls `POST /api/submissions/evaluate`
- `TaskCard` — stamp animation wrapper (idle → completing → stamped), light theme with emerald completion state
- `AuthorizationToast` — pOS-native digital confirmation replacing physical stamp metaphor. PEARL eye image (`pearl-eye-glow.png`, 128x128 retina) with radial transparency fade, SVG progress ring animation (1.2s), and checkmark pop on completion. Variants: received ("Submission Received"), verified ("Verification Complete"), filed ("Report Filed"), authorized ("Authorization Granted"), processed ("Processing Complete"). Custom button labels supported. Used in IntakeForm (briefing + questions) and ContradictionReport (read complete + filing).
- `BureauStamp` — Legacy stamp button, still used for `StampChoice` (two-stamp classification in ContradictionReport CHANGED/REMOVED). Variants: confirm, verified, received, reviewed, filed, changed, removed, deny. Compact mode for inline choices.
- `LaneScaffolding` — lane-aware scaffolding (L1: sentence starters + word bank, L2: word list, L3: bonus question)
- `DismissalBroadcast` — three-stage post-task overlay (red flash → video playback → green transition + "HAVE A HAPPY DAY" text). Triggered by `clipAfter` on any task config. Defers character message triggers until sequence completes.

**Writing evaluation:**
- Frontend sends `content`, `phaseId`, `activityType`, with `grammarTarget`/`targetVocab`/`lane`/`writingPrompt`/`taskContext` in `metadata`
- Backend: `POST /api/submissions/evaluate` — Layer 1 auto-checks (word count, vocab usage) + Layer 2 AI rubric (fail-open)
- **Context-aware relevance scoring**: AI evaluator receives the actual writing prompt and task context, scoring 3 dimensions: grammar, vocabulary, and **relevance** (does writing address the prompt?). Off-topic sentences with target words score low on relevance. `taskScore`/`taskNotes` fields carry relevance data (backward compatible).
- **Mastery updates wrapped in `prisma.$transaction`** (as of 2026-04-17): upsert + mastery increment are atomic — no more crash-window divergence between `encounters` and `mastery`.
- Vocabulary matching uses Porter Stemmer on both frontend (`frontend/src/utils/stemmer.ts`) and backend (`backend/src/utils/stemmer.ts`)
- Student writing persisted in `MissionScore.details` JSON blob
- Writing prompts are vocabulary-focused ("Use 3-5 sentences using as many target words as possible"), not content-recall
- Lane 1 guided questions use vocabulary-pairing exercises ("Write a sentence using 'arrive' and 'check'")
- **PEARL writing nudges**: "Request Guidance" button in WritingEvaluator sends student's current text + prompt to `POST /api/pearl/chat` with `isWritingNudge: true`. PEARL gives directional hints ("What happened when you arrived?") without writing for the student. Max 3 nudges per attempt, counts toward 20/shift PEARL rate limit. Layer 4 post-filter relaxed for nudges (target vocab allowed in responses).
- **PEARL in-character observation** (added 2026-04-17 via PR #8): After grammar/vocab evaluation completes, WritingEvaluator asynchronously calls `POST /api/pearl-feedback` with `{ taskType, taskContext, studentText, weekNumber }`. Response is a 150-200 char in-character PEARL comment focused on REASONING (not grammar). Rendered below the existing grammar result in a sky-50 card with PEARL eye glyph + "P.E.A.R.L. Observation" label. 8s OpenAI timeout with canned fallback rotation. Never throws to UI — student always sees a PEARL response.

**Shift Closing & Score Aggregation (refactored 2026-04-17 via PR #9, extended 2026-04-24 via PRs #18 + #20):**
- Canonical task result type: `frontend/src/types/taskResult.ts` defines `TaskResultDetails { taskType, itemsCorrect, itemsTotal, category: 'vocab'|'grammar'|'writing'|'mixed', errorsFound?, errorsTotal?, vocabUsed?: string[], answerLog?: TaskAnswerLogEntry[] }`. All 11 task components emit this shape. `TaskAnswerLogEntry { questionId, prompt, chosen, correct, wasCorrect, attempts? }` added 2026-04-24 for teacher-facing per-question review.
- Pure aggregator: `frontend/src/utils/scoreAggregator.ts` — `aggregateTaskResults()` returns `{ vocabAccuracy, grammarAccuracy, writingScore, errorsFound, errorsTotal, overallScore }`. Per-category values are `null` when no tasks contributed (NOT the old `completedTasks.length/totalTasks` inflated fallback). ShiftClosing renders "—" for null categories. Also exports `countTargetWordsHit(inputs)` (2026-04-24) — dedupes `details.vocabUsed` across writing tasks, returns `null` when no task contributed.
- **ShiftClosing 9-card grid** (2026-04-24, PR #18): Documents Processed, Errors Found, Vocabulary Score, Grammar Accuracy, **Writing Score**, **Final Score**, **Words Written** (renamed from "Target Words Used"), **Target Words Hit** (distinct target vocab the student actually used), Concern Score. Grid: `grid-cols-2 sm:grid-cols-3`. Student-view cards mirror the teacher-view Gradebook Shift Summary.
- **Submit Anyway fallback** (2026-04-24, PR #15): `WritingEvaluator` shows an amber "Submit Anyway" button after 1 failed attempt, gated on `minWords` (default 20) to prevent empty submissions. Fires `onResult({ passed: true, submittedAnyway: true })` using the last evaluation's grammar/vocab scores (or the 0.3 degraded floor). `ShiftReport.handleResult` uses gradient scoring `(grammarScore + vocabScore) / 2` clamped to 0.1 minimum — no more hardcoded `1`. Students never get stuck at ShiftReport; the shift always advances to ShiftClosing.
- `ShiftClosing` payload to `POST /shifts/weeks/:weekId/shift-result` now includes `writingScore`, `overallScore`, `wordsWritten`, `targetWordsHit`. Backend stashes those in `ShiftResult.taskResults` JSON (no schema change); accepts both old `targetWordsUsed` and new `wordsWritten` field names for backward compatibility.
- Legacy detail-key compatibility preserved so teacher Gradebook `QueueTaskDetails` + `WritingDisplay` render unchanged.
- Vitest coverage: `frontend/src/utils/scoreAggregator.test.ts` — 15 tests (was 11 before PR #18 added `countTargetWordsHit` coverage). `cd frontend && npm run test`.
- **Citizen-4488 Case File card**: Bottom of ShiftClosing. Reads `frontend/src/data/citizen4488Posts.ts` (frontend shim mirroring backend seed). Shows 4488's post for the completed week + student's concern-score delta. Tone accent emerald (stable) / amber (mild concern) / rose (concern rising). PR #12 (pending) adds a second post + collapsible "grammar watch" note per week.
- **PEARL Observation cards** (narrative-reactive, 2026-04-21): Before the ceremonial PEARL quote, week-specific "P.E.A.R.L. — Observation" cards render conditional on student's shift activity. **W3**: quotes the student's first `priority_briefing` rule verbatim, read from `taskProgress[].details.writingSubmissions` (no backend dependency). **W4**: conditional on `w4_recruitment_vote` choice value (added 2026-05-11; superseded the retired `w4_doc_review_frag3` key when the W4 mid-task popup was removed in the Activity Reconciliation redesign) — compliant / curious / guarded variants. **Status 2026-06: the W4 card is STILL NOT WIRED** — `ShiftClosing.tsx` has no `w4_recruitment_vote` consumer (tracked in `audit-remediation-2026-06.md` deferred items). Reads via `fetchNarrativeChoices(weekNumber)` on mount. Cards are mutually exclusive (different `weekNumber` gates).

## Narrative-Reactive Interaction Layers (2026-04-21)
Non-skippable interaction points inside the terminal flow — distinct from toasts (dismissible) and Harmony posts (students open voluntarily). Committed to after external feedback flagged that students were routing around narrative; implements the "Shape 1" commitment ("story-driven game that teaches English").

**Data model**: Student choices stored in `NarrativeChoice` Prisma model via `POST /api/narrative-choices` (`choiceKey`, `value`, `weekNumber` in `context` JSON). `GET /api/narrative-choices?weekNumber=N` reads back for cross-shift/within-shift consumers.

### Inter-Task Moments (B-layer)
- `frontend/src/components/shift-queue/InterTaskMoment.tsx` — full-surface, non-skippable. Two variants:
  - **`character`**: NPC message + 2–3 reply buttons. Click reply → POST NarrativeChoice → chosen text + character response + Continue. Reply `value` tags: `compliant` | `curious` | `guarded`.
  - **`ambient`**: glitch text + `durationMs` timer → Continue button after timer. No choice, just atmosphere.
- Config: `interTaskMoments?: Record<taskId, InterTaskMomentConfig>` on WeekConfig. Keyed by task ID the moment fires AFTER.
- Wiring: `ShiftQueue.tsx` cascade after task completes = dismissal video → vocab interstitial → inter-task moment → next task.
- **W4 content** (3 moments, language updated 2026-05-11):
  - Betty after `word_match_w4` (3 replies — "trust the system" / "what if gaps were intentional?" / "focus on what is assigned") — references updated to "observations" instead of "fragments"
  - Ivan after `cloze_fill_w4` (3 replies — "just a glitch" / "I saw something" / "haven't noticed anything") — reframed: Ivan senses the terminal flicker but doesn't see the hidden `[ ].edited` app; doesn't reference the old cloze passage anymore
  - Ambient `DON'T FORGET` glitch after `vocab_clearance` (2500ms timer)

### Mid-Task Choices (C-layer)
- Embedded in `DocumentReview.tsx`. When a completed doc has `midTaskChoice`, the component intercepts the normal stamp→advance flow, shows an overlay instead, POSTs the choice on selection, then advances.
- Config: `midTaskChoice?: MidTaskChoiceConfig` field on `DocumentConfig` (`{ id, title, message, options: [{text, value, responseText?}] }`).
- UI: amber-accented "P.E.A.R.L." card replaces doc view (non-skippable).
- **W4 content**: REMOVED 2026-05-11. The previous Fragment 3 reclassification popup was deprecated in the W4 Activity Reconciliation redesign. The reclassification beat is now a silent visual mutation (Observation E greys out + RESTRICTED stamp animates over it, no popup choice). Student engagement happens later via the `[ ].edited` Drop Box + end-of-shift recruitment NarrativeChoice modal (`w4_recruitment_vote`). C-layer infrastructure remains available for future shifts; the `midTaskChoice` field on `DocumentConfig` is still in the schema, just no active uses.

### Design invariants (per `Dplan/Character_Bible.md`)
- All reply option sets include one compliant choice.
- No character cross-references (W5+ rule for W1-W4).
- Character voices canon-compliant (Betty "sugar/darlin" + exclamations, Ivan ellipses + validation-seeking, M.K. silent replies preserved).
- Citizen-4488 self-censorship deepens — W4 post grammar is nearly error-free.

### Clarity Check (screen-locking vocab verification, added 2026-04-24)
Screen-locking pop-up vocabulary quizzes placeable at any point in a shift. In-world name: "Clarity Check" — reuses the Ministry "Clarity" namespace (Clarity Queue, Clarity Tea, Clarity Associates) and mirrors the Junior Associate Academy rhyme "Check your words, check your tone."

- **Config**: `clarityChecks?: ClarityCheckConfig[]` on `WeekConfig`. Each has `{ id, placement, title, subtitle?, questions }`.
- **Placements**: `'shift_start'` (before first task) | `'shift_end'` (before ShiftClosing) | `{ afterTaskId: string }` (in the post-task cascade, after inter-task moment).
- **Questions**: 2–4 MCQs. Each is `{ word, correctDefinition, distractors: string[] }`. Options shuffled per-instance (Fisher-Yates in `useMemo`, stable across re-renders).
- **Screen-lock**: `ClarityCheck.tsx` renders `fixed inset-0 z-[90]` with backdrop blur. ESC blocked, browser back blocked (`popstate` pushState trick), pointer events cover the terminal header so Home/Close are click-blocked.
- **Flow**: Pick definition → Verify → feedback (emerald correct, rose wrong) → Next → final "Verification Recorded" summary → Continue.
- **Scoring**: `POST /api/clarity-check/complete` with `{ checkId, weekNumber, words: [{word, correct}] }`. Correct answers bump dictionary mastery +0.03 (matches Harmony spaced-review rate). No MissionScore written — Clarity Checks are verifications, not tasks. Backend route: `backend/src/routes/clarity-check.ts`.
- **One-shot per shift**: `completedClarityCheckIdsRef` in `ShiftQueue.tsx` prevents re-fire on task reset within the same shift.
- **Cascade integration**: extends the post-task pipeline to `dismissal video → vocab interstitial → inter-task moment → clarity check → compliance check → next task`. Shift_end checks gated via render-time guard (`return null`) before `ShiftClosing` renders, avoiding a one-frame flicker.
- **Demo**: Week 2 has `clarity-w2-start` at `shift_start` (3 MCQs on notice/inform/require).

### Compliance Check (per-class teacher-scheduled lockout, added 2026-04-28)
Sibling to Clarity Check — same screen-locking modal, same MCQ shape — but **per-class scheduled by the teacher** in the Shifts tab, not built into the WeekConfig. Each class can have different Compliance Checks for the same shift.

**Teacher experience (Teacher Dashboard → Shifts tab)**:
- Below the Shift Storyboard, a "Compliance Checks" section appears for the currently-selected shift.
- Placement slots render INLINE in the Shift Storyboard as `ComplianceCheckMarker` chips (2026-05-08): above the first card (`Before shift starts`), after each card (`After {Task.label}`), below the last (`At shift end`). Each marker opens the editor ([Edit] when a template exists, [+ Add] when empty). The old standalone slot-list section was deleted.
- Editor modal: optional title, **WordPicker** (grouped by shift, expand/collapse, TOEIC-only filter, per-shift bulk `All`/`Clear`, search), question count 1–5, cumulative-review-count control (default 2 per prior shift, configurable 0–10), live preview with re-roll, save/remove.
- WordPicker auto-seeds on first open (no template yet): all current-shift TOEIC words pre-selected + `cumulativeReviewCount` random TOEIC words from each prior shift. Teacher deselects/selects per word in shift-grouped UI.
- Distractors are auto-generated server-side from definitions of words NOT in the selected list — pedagogically deliberate (never double-tests something this round).
- Per-class scoping: `(classId, weekNumber, placement, afterTaskId)` unique. Two classes running the same shift can have different checks.

**Student experience**:
- Modal mounts inside `ShiftQueue` cascade at the configured placement (shift_start, after_task X, or shift_end).
- Same lockout shell as the visual scaffold: cyan PEARL eye SVG with iris look-around (no blink, locked decision), sonar ring entrance, scan-line sweep, typewriter "P.E.A.R.L. — COMPLIANCE CHECK ISSUED" label, MCQ card slides in. Modal-level scale+blur entrance (450ms) + exit (380ms).
- Non-dismissible: ESC blocked, browser back blocked, modal at `z-[1000]` covers terminal header. While active, the ambient PEARL Dynamic Island is hidden (`body.compliance-check-active` class) so it doesn't overlap the eye.
- One-shot per `(pair, template)` — refresh-safe, account-bound. Student can't re-take the same check on reload.
- On completion: dictionary mastery bumps +0.03 per correct word via `PairDictionaryProgress` upsert (atomic in `prisma.$transaction`). Same rate as Clarity Check + Harmony spaced-review.

**Architecture notes**:
- Backend: `ComplianceCheckTemplate` Prisma model holds the teacher's curated word list + question count + placement. `ComplianceCheckResult` (with `templateId` FK) stores the completed result + answers. See `docs/architecture.md` for the full route surface.
- Frontend cascade: `ShiftQueue.tsx` fires `fetchComplianceCheckFor(placement, afterTaskId?)` at each placement point. Result mounts `<ComplianceCheckShell>`. **Cancellation token + `expectedWeek` snapshot** required to prevent prior-shift bleed-through during teacher-driven shift moves (see Architecture race-condition gotcha).
- Reusable components live under `frontend/src/components/teacher/compliance-check/` (`WordPicker`, `ComplianceCheckEditor`, `ComplianceCheckMarker` — `ComplianceCheckSlotList` was deleted 2026-05-08).
- Visual preview at `/preview/compliance-check` (auth-bypassed) renders the lockout shell with sample MCQ data — useful for iterating on look without touching real templates.

**No on-demand fire path**: an earlier iteration shipped a "Issue Compliance Check" button in ClassMonitor with a separate IssueComplianceCheckModal + `compliance-check:issued` socket event + Zustand store. All removed in the redesign — Compliance Checks fire only from scheduled templates.

### Remediation Module (behavior-triggered vocab review, added 2026-04-30)
Third member of the screen-locking-MCQ family — same lockout shell as Clarity Check / Compliance Check, but **fires automatically when the system detects intentional `concernScore` grinding**, not from a teacher schedule or shift placement. Pedagogical philosophy: turn the abuse loop into a study loop. The "punishment" for grinding is more vocabulary review using words from shifts the student has already done. Worst-case outcome of trolling = the student accidentally studied harder. PEARL voice stays warm and forced-happy throughout — the dystopia is that the system never gets angry, it just *cheerfully helps* the student "re-center."

**Why it exists**: students figured out that `concernScore` (the HUD chip in `TerminalView`) was fun to grind on purpose. Without consequence, the chip became a toy and ate class time. The Module makes deliberate grinding cost ~3 minutes of vocabulary review — and if the student grinds again immediately after closing it, the cooldown is **clawed back** (they wasted their time).

**Two-stage trigger** (calibrated for the 0–5 score range; deltas are 0.05–0.1 per wrong answer):
- **Stage A — soft warning** (no modal): cumulative `+0.4 within 30s` while state is `'idle'` → PEARL ambient bark via Dynamic Island ("Citizen, your readings are climbing — steady on."). Single-shot, non-blocking. A genuinely struggling student sees it, slows down, and never hits Stage B. A troll sees it and laughs, keeps going, and trips Stage B.
- **Stage B — fire modal**: cumulative `+0.7 within 60s` OR a second Stage-A condition trips within 90s of the first (the *intent detector*). Triggers the screen-locking modal.
- **Backstop**: `concernScore ≥ 3.0` AND `state === 'idle'` (catches slow-drift cases that never trip the rate trigger).

**Modal**: `frontend/src/components/remediation/RemediationModule.tsx`. Forked from `ClarityCheck.tsx`. **Amber accent** (border-amber-500, header bg amber-50) at `z-[1000]` — visually distinct from cyan Clarity / Compliance modals so the student instantly knows *this fired because of behavior*, not because the teacher scheduled it. Title: `REMEDIATION MODULE — STANDARD VOCABULARY VERIFICATION`. Sub-subtitle: `For citizens experiencing focus difficulty.` (forced-happy euphemism). Same MCQ flow as ClarityCheck (shuffled options, verify per question, finale screen). ESC + browser back blocked. `body.remediation-active` class hides the PEARL Dynamic Island during the modal (mirrors `body.compliance-check-active`).

**Forced-happy completion copy** across three score bands:
- 3/3 correct (emerald): "Excellent work, Citizen. Engagement restored."
- 1-2/3 correct (amber): "Verification recorded. Continue to monitor your focus."
- 0/3 correct (rose, but warm): "Verification recorded. We will continue to support your engagement."

**Cooldown** (server-authoritative, see `backend/src/routes/remediation.ts`):
- 3/3 → `−1.5` concernScore
- 2/3 → `−1.0`
- 1/3 → `−0.5`
- 0/3 → `0` (row recorded, no score change)
- Floor at 0 (no negative scores).

**Clawback** (the intent-detector payoff): for 60 seconds after the modal closes, the state machine watches `addConcern(delta>0)`. If ANY positive delta lands in that window, `POST /api/remediation/:id/clawback` fires server-side; the cooldown delta is restored to `Pair.concernScore`, the row's `clawedBack` flag is set to `true` for teacher review, and PEARL bark fires: *"Your readings remain elevated, Citizen. Disappointing — but we'll keep trying together."* A genuinely engaged student doesn't trigger this (their concernScore stays flat or decreases naturally). A troll who grinds again to "win" wipes their own cooldown. A single-flight `clawbackInFlight` module flag prevents N concurrent POSTs when multiple deltas land within milliseconds.

**Re-fire debounce** (escalating, server-side): 1st remediation in shift → 90s lockout, 2nd → 60s, 3rd → 30s, 4th+ → 0s (continuous until shift ends). Server checks count of `RemediationModuleResult` rows with completedAt for this pair+week, picks the matching debounce, returns `{ debounced: true, retryInSeconds }` if still locked out.

**Question source**: `PairDictionaryProgress` weighted by mastery — pulls words with `mastery < 0.6` and `weekIntroduced ≤ currentWeek`, ordered by mastery ascending then lastSeenAt ascending (low mastery, recently unseen). Falls back to all dictionary words at-or-before the current week if fewer than 5 candidates (handles fresh students). Distractors built via existing `buildComplianceQuestions` (definitions of words NOT in the candidate list — never double-tests). Mastery bumps `+0.03` per correct word (mirrors Clarity Check + Compliance Check + Harmony spaced-review rate).

**State machine** (`frontend/src/stores/sessionStore.ts`): ring buffer `concernRateBuffer: Array<{ at: number; delta: number }>`, stages `'idle' | 'warned' | 'modal-open' | 'cooling-down'`. `recordRateEvent(delta)` is the entry point — appends to buffer, evicts >60s old, runs the state machine without modifying `concernScore` itself. `sessionStore.addConcern` calls `recordRateEvent` AND updates score. **Critical wiring**: `shiftQueueStore.addConcern` ALSO calls `sessionStore.recordRateEvent` directly — but NOT `sessionStore.addConcern` — so the state machine sees grinding deltas in real time without double-counting score (sessionStore.concernScore and shiftQueueStore.concernScoreDelta are independent values, flushed only at task completion).

**Async safety**: `fireTrigger` snapshots `expectedStage` before the await; drops the result if stage changed mid-flight (teacher reset, shift change, refresh). `RemediationOverlay`'s `fetchPendingRemediation` on mount uses cancellation token + `expectedWeek` snapshot from `useShiftQueueStore.getState().weekConfig?.weekNumber` (the Compliance Check race-condition `54ca0b0` lesson applied). Refresh during a modal restores via `GET /api/remediation/pending`.

**App-root mount**: `<RemediationOverlay />` mounted at `App.tsx:262` inside `{user.role === 'student' && ...}` guard — never fires for teachers.

**Clickable HUD tooltip**: the existing `concernScore` chip in `TerminalView.tsx` is now a button. Click → `<ConcernTooltip />` expands with score, threshold band (GOOD STANDING / MONITORED / UNDER REVIEW), "Recent activity: +X.X over last 30s" line (reads from `concernRateBuffer`), threshold-to-next text, and italic forced-happy hint *"Complete tasks correctly and your readings will naturally normalize, Citizen."* Closes on ESC or outside click. Reduces the "this feels like harassment" risk by making the system legible.

**Count-down animation**: when the score drops (post-cooldown), the chip number ticks down smoothly via `useCountDownAnimation` hook (requestAnimationFrame, ease-out cubic, 1500ms, animates only on decrease). Brief emerald-400 tint during descent; threshold colors return at the new value. Existing >=3.0 pulse animation preserved.

**Teacher visibility**:
- **ClassMonitor chip** (`frontend/src/components/teacher/ClassMonitor.tsx`): per-student, hidden at count===0, amber pill at 1, rose+pulse at 2+. Hover tooltip lists last 3 trigger reasons. Live-updates via `student:remediation-fired` socket listener in `useTeacherSocket`. Hydrates on dashboard mount via `fetchRemediationEvents()`.
- **Gradebook drill-down panel** (`frontend/src/components/teacher/Gradebook.tsx`): collapsible "Remediation Events ({count})" section between Shift Summary and per-task list (shift-scoped). Lazy-loads on first expand. Compact table: Time | Trigger | Score | Clawback. Trigger labels: 'rate_warned' → "Warning", 'rate_double' → "Repeated grinding", 'absolute_3' → "Threshold exceeded". Score column: `2/3` for completed, `— (incomplete)` for open rows, `3/3 (clawed back)` for clawed-back rows.

**Database**: `RemediationModuleResult` table (`pairId`, `weekNumber`, `triggerReason`, `concernAtTrigger`, `concernAfterCooldown`, `correctCount`, `totalCount`, `clawedBack`, `triggeredAt`, `completedAt`, `questions Json`, `results Json?`). One open row per pair allowed; refresh-safe restoration via `GET /api/remediation/pending`.

**Tune knobs** (calibration when needed):
- Trigger thresholds in `frontend/src/stores/sessionStore.ts` — look for `0.4`, `0.7`, `30000`, `60000`, `90000`, `3.0`.
- Cooldown ladder in `backend/src/routes/remediation.ts` — `COOLDOWN_BY_CORRECT = [0, 0.5, 1.0, 1.5]`.
- Debounce ladder in `backend/src/routes/remediation.ts` — `DEBOUNCE_BY_PRIOR_COUNT_SECS = [0, 90, 60, 30, 0]`.

**Watch-for**: in the first week of deployment, monitor for false positives — students who fire 3+ remediations per shift while completing tasks honestly (not trolling). If observed, raise the rate thresholds (e.g. 0.4→0.5, 0.7→0.85). Don't pre-tune for hypothetical cases; tune based on observed behavior.

**Vocabulary Completion Interstitial (added 2026-04-17 via PR #7):**
- `frontend/src/components/shift-queue/VocabularyInterstitial.tsx`
- Shown after `vocab_clearance` or `cloze_fill` tasks, before advancing to the next task
- Header: "VOCABULARY STATUS — WEEK {N}"
- Progress bar: "{mastered}/{weekTarget} words mastered" with sky-600 accent
- Grid of word chips color-coded by mastery: emerald ≥0.7, amber 0.3-0.7, rose <0.3
- Data source: `useDictionaryStore` (cached) filtered to current week's `targetWords` from WeekConfig
- Auto-advances after 4s, or click CONTINUE to skip immediately
- Hook point: `ShiftQueue.tsx` gates the interstitial phase via matching on `currentTask.type === 'vocab_clearance' | 'cloze_fill'` (NOT task ID — handles `_w2`/`_w3` suffixes via normalized `type`)
- Teacher skip/reset flows bypass the interstitial (they mutate the store directly without going through `handleComplete`). Effect clears any pending interstitial on `taskResetKey` change.

**Dictionary word gating:** Words gated by student progress (MissionScore/ShiftResult), not ClassWeekUnlock.

## Shift Runner (LEGACY — no live weeks)

> **Stale-section notice (2026-06-11):** every built week (1-4) is a `shiftType: "queue"` week rendered by ShiftQueue; this 7-step PhaseRunner path is dead at runtime and slated for deletion (see audit tracker "Dead code"). Kept for historical reference only.

Fixed 7-step sequence: `recap` → `briefing` → `grammar` → `listening` → `voice_log` → `case_file` → `clock_out`

Step navigation gated by completion. All steps support optional video via `StepVideoClip` component.

## Party Lexical Dictionary
- Terminal-only sidebar (slides from LEFT, `z-[40]`), dark overlay behind (`z-[39]`)
- **Cream/warm palette** (matches shift queue aesthetic) — bg=#F5F1EB, sky-600 accent, paper shadow for depth against dark terminal
- Sky-600 top accent stripe, rounded-r-2xl, `font-special-elite` title
- DictionaryIcon: book-shape SVG (32x36) in terminal header with gold glow pulse, gold badge
- Lexicon tile on terminal desktop grid
- Own CSS variable system: `.dict-panel` class with `--dict-*` tokens (cream palette, no green CRT)
- Fonts: Source Serif 4 (definitions), Noto Sans TC (Chinese translations)
- **Target/world-building word separation**: Target words (TOEIC) shown prominently; world-building words collapsed under "REPUBLIC TERMS" toggle per group (collapsed by default)
- Word card `variant` prop: `target` (full prominence, sky-600 accent) vs `worldBuilding` (muted, compact, "WB" badge)
- Three status variants:
  - **Approved** (sky-600): mastery bar, Chinese toggle (one-way), notes, family chips, TOEIC
  - **Proscribed** (rose, week 10+): struck-through definition, "REMOVED FOR COLLECTIVE SAFETY"
  - **Recovered** (amber, week 10+): restored definition, amber mastery bar
- Filter tabs: ALL / WEEK / MASTERED / STARRED / BY FAMILY / BY TOEIC / PROSCRIBED (hidden until week 10)
- Rank ribbon: Lexical Trainee → Associate → Officer → Commander → Director
- Starred words and Chinese reveal persisted to DB
- Stats ribbon: target count, world-building count, mastered count (target words only), mini mastery meter, rank title

## PEARL System
- Visually anchored in terminal header with persistent eye + state label
- **Dynamic Island** broadcast pill floats at top center of terminal view (absolute positioned, no layout shift)
  - Idle: compact pill showing "P.E.A.R.L. BROADCAST" with pulsing green dot
  - Active bark: smoothly expands to show message with typewriter effect, bark-type-tinted background
  - Auto-contracts when bark expires
  - Always visible on terminal (desktop + all apps)
- PEARL panel available via eye click

**AI Contextual Barks:**
- Pool message shown immediately (zero latency), async AI fires in parallel
- Backend: `POST /api/pearl/bark` — 3s timeout, fail-open with `isDegraded: true`
- Frontend: `triggerAIBark(type, context, fallbackText)` in pearlStore
- `triggerBark(type, text)` still works for custom narrative barks

**AI Chat Guardrails (4-layer defense):**
- Layer 1: Hardened system prompt (ALLOWED/FORBIDDEN/DEFLECTION sections)
- Layer 2: In-character voice rules (no contractions, institution-as-speaker, passive voice, A2-B1 vocab)
- Layer 3a: 22 regex pre-filter patterns (catches answer-seeking, copy-pasted quiz questions, delegation)
- Layer 3b: Task context injection (aggressive "QUIZ IN PROGRESS" instruction for quiz tasks)
- Layer 4: Post-response filter catches leaked target words, replaces with in-character deflection

**Chat Rate Limiting:**
- 20 messages per shift per student (in-memory counter keyed by `pairId-weekN`)
- In-world dystopian responses when limit reached ("Communication allocation exhausted, Citizen")
- Frontend disables input field and send button when rate-limited
- 5-second cooldown between messages, 200-character max per message
- Resets on new shift (different week key) or server restart

## Character Messaging System
- `MessagingPanel` + `MessageNotification` — rendered in **GameShell** (visible in both OfficeView and TerminalView). Panel slides from right (360px, z-[41]), inbox/conversation navigation.
- `MessageBadge` — remains in TerminalView header (unread count on message icon)
- `InboxView` — messages grouped by character name into conversation threads; one card per character with message count badge, preview from latest message, and unread indicator
- `ThreadView` — full conversation: character message → reply options → student reply → typing indicator → character response. When opened from grouped inbox, all messages from that character render in chronological order
- `MessageNotification` — toast stays until student clicks (body opens full conversation with that character, X dismisses)
- **Login notification**: On `loadMessages`, if there are unread thread messages (Clarity Minder) and no active notification, the most recent unread thread triggers a toast — so students see teacher messages even if they arrived while offline
- Messages triggered by `task_start`, `task_complete`, `shift_start` events from WeekConfig
- Dedup (3 layers): module-level `inFlightKeys` + backend `$transaction` + GET response dedup. Both frontend and backend include `messageText` fallback match to prevent duplicates when `triggerConfig.taskId` JSON path match fails across sessions.
- Header icon layout: [Dictionary] [Messages] | [PEARL eye + label] (Ministry text and PEARL label hidden on mobile)
- Store: `selectedConversation` (character name) for grouped view, `selectedMessageId` for legacy single-message navigation

## Harmony App (State Social Network)
- Locked until teacher opens Harmony for the class (`harmonyOpen` toggle)
- **5-tab government portal navigation**: Feed / Ministry / Sector / Review / Archives
- Content accumulates across shifts — queries scoped by narrative route weeks (full or condensed)
- Route-aware: condensed-route students only see content from their 9-week route, never skipped weeks
- All NPC designations use unified `Citizen-XXXX` format (4-digit, zero-padded). Students remain `CA-X`.

**Feed tab** (citizen posts):
- `feed` — character-first citizen posts with embedded target vocabulary (AI-generated + seed + student posts)
- Compose box for student posts (280-char limit via `HARMONY_POST_MAX_LENGTH`)
- 3-tier vocabulary highlighting: Focus (sky, current week), Recent (amber, previous 2 route-weeks), Deep Review (gray, older)
- Citizen-4488 recurring character with single-neighbor thread: herbs → ink stones → cat adoption form
- Students can delete their own posts (cascade: replies → censure responses → post)
- Citizen-4488 posts have Approve/Flag interaction buttons

**Ministry tab** (official communications):
- `bulletin` — Ministry Bulletins with inline comprehension MCQs (`HarmonyBulletin.tsx`, sky-blue card)
- `pearl_tip` — PEARL grammar tips disguised as communication policy (`HarmonyPearlTip.tsx`, emerald card)
- Section header: "Ministry Dispatches" with sky accent
- Bulletins render first, then PEARL tips with "P.E.A.R.L. Language Guidance" divider

**Sector tab** (local information):
- `community_notice` — Lost & found, events, menus, transit updates (`HarmonyNoticeCard.tsx`, amber card)
- `sector_report` — Weekly department statistics with narrative in the data (`HarmonySectorReport.tsx`, gray mono card)
- Section header: "Sector Board" with amber accent
- Notices render first, then reports with "Sector Performance Data" divider

**Review Queue (language exercises):**
- **Five censure types** as of 2026-05-18:
  - `censure_grammar` (verb form MCQ) — pink pill
  - `censure_vocab` (word meaning MCQ) — cyan pill
  - `censure_replace` (fill-in-blank MCQ) — amber brackets
  - `censure_redact` (tap-the-unapproved-word inside the post text) — rose pill, "WORD REDACTION"
  - `censure_triage` (3-bin classification: Approve / Forward to Wellness / Flag for Reg 14-C) — emerald pill, "QUEUE TRIAGE"
- **Three cognitive verbs**: *spot it* (redact), *sort it* (triage), *fix it* (grammar/vocab/replace).
- **Per-shift queue**: ~13 items (3 redact + 3 triage + 3 grammar + 3 vocab + 1 replace per week W1-W3).
- Error word highlighted in post text for grammar/vocab/replace; redact renders the post as tappable word spans (selected ringed in sky; after review the correct word green-underlines and a wrong pick strikes red); triage shows a full-width 3-bin picker below the post.
- **Triage bins render in FIXED order** (Approve / Wellness / Flag) — the Fisher-Yates shuffle is skipped for triage so students learn the taught layout. Other censure types continue to shuffle.
- **Redact uses word-match instead of index-match**: frontend sends `selectedWord` (string) alongside `selectedIndex: -1`; backend strips punctuation, lowercases, compares to `censureData.errorWord`.
- Cumulative review: up to 3 items from older weeks selected by lowest mastery, tagged "REVIEW".
- Differentiated mastery scoring: +0.05 for current-week items, +0.03 for review items.
- Neon stamp overlay (`ResultOverlay`): large check or X renders for 3.5 seconds after submission.
- Tab badge shows unreviewed item count (pink pill).

**Lane-aware bilingual study card (added 2026-05-14):**
- After any censure submission, the backend returns an optional `studyCard: { word, phonetic, translationZhTw, exampleSentence }` looked up from `DictionaryWord` via `lookupStudyWord()` with inflection fallback (`-s`/`-ed`/`-ing`/`-ies` so `describes` → `describe`, `arrived` → `arrive`).
- Per-type lookup target: vocab → `errorWord` (student needs the misused word's real meaning); redact → `approvedWord` (the TOEIC word they should have demanded); grammar/replace → `correction` then `errorWord`; triage → null (decision-based, no single teaching target).
- Frontend `CensureCard` renders a sky-blue card below the explanation: Lane 1 always shows Mandarin gloss, Lane 2 has a "Show 中文" toggle, Lane 3 English-only. Mirrors the [[RemediationModule]] pattern.
- Word Redaction is TOEIC-anchored: every *correct* word is in the shift's WeekConfig `targetWords`; the *wrong* word is everyday A2 English used as an informal foil (`give`/`tell`/`answer` etc., NOT in `DictionaryWord` and never taught).

**Content generation pipeline:**
- `ensureHarmonyPostsExist()` called lazily when student opens Harmony
- Per-type counting via `prisma.harmonyPost.groupBy({ by: ['postType'] })` with `DEFAULT_CONTENT_COUNTS` targets
- Static content loaded first from data files, then AI fills remaining
- AI prompt: "Write about PEOPLE, not about vocabulary" — character-first with world texture, good/bad examples, active citizen roster per week
- Vocabulary recycling: 3-5 current target words + 1-2 review words in new contexts (spaced repetition)
- Generation lock (`Map<string, Promise<void>>`) prevents concurrent duplicate generation per class
- Route-aware: only generates for weeks in the class's narrative route
- Fallback posts reference world bible texture (congee, tower life, cats) if AI fails
- Vitest validation: 34 tests run via `prebuild` — word coverage, char limits, spaced repetition checks

**World-building data:**
- `harmonyWorldBible.ts` — 8 locations, 5 regulations, weekly culture, approved media, food culture, domestic life, traditions, children's world, citizen roster (15 named citizens with scripted appearance/departure weeks)
- `harmonyCharacters.ts` — 5 core NPCs (Citizen-XXXX naming) with 3-phase arcs + condensed overrides
- `harmonyFeed.ts` — 12 character-first seed posts with vocabulary recycling (weeks 1-3)
- `harmonyBulletins.ts` — bulletins with comprehension MCQs (weeks 1-3)
- `harmonyPearlTips.ts` — grammar rules as communication policy (weeks 1-3)
- `harmonyCommunityContent.ts` — immersive notices + narrative sector reports (weeks 1-3)
- `harmonyMigrations.ts` — startup migration renames old authorLabels (CA-18 → Citizen-0018, etc.)

**Bulletin comprehension:**
- `POST /api/harmony/bulletins/:id/respond` — ephemeral answer check (no DB write)
- Frontend tracks answers in session-only `bulletinAnswers` store state
- "Test Understanding" expands inline MCQs with shuffled options and green/red feedback
- **Lane-aware Mandarin question stem (added 2026-05-14)**: `BulletinQuestion.translationZhTw?` carries the Traditional Chinese gloss of each question. Lane 1 shows it inline below the English; Lane 2 has a "Show 中文" toggle; Lane 3 is hidden. All 9 W1-W3 static bulletin questions now have hand-written zh-TW.
- **Live read-time enrichment**: bulletins inserted into the DB before the Mandarin field existed are backfilled at response time via `STATIC_TRANSLATION_BY_REF` (built once at module load from current `STATIC_BULLETINS`). In-DB value wins on conflict, so newly seeded posts carry the field directly and forward-compat is preserved.

**Archives tab** (Phase C):
- Three lazy-loaded sub-sections: Vocabulary by Week, Citizen-4488 Case File, Bulletin Archive
- **Vocabulary by Week**: Expandable per-week sections showing each word with definition, example sentence, and mastery bar (color-coded: emerald ≥80%, amber ≥40%, rose <40%). Route-scoped — condensed students see only their 9 weeks.
- **Citizen-4488 Case File**: Chronological timeline of all 4488 posts with student's approve/flag decision history. Timeline dots color-coded by action (rose=flagged, emerald=approved, amber=no action).
- **Bulletin Archive**: Past Ministry Bulletins re-readable with comprehension MCQs re-attemptable via existing `HarmonyBulletin` component.
- **Vocabulary entries are lane-aware bilingual** (added 2026-05-14): backend returns `translationZhTw` + `phonetic` on every archive word. Frontend `ArchiveWordEntry` component owns per-word `showMandarin` state so Lane 2 tap-to-reveal works without parent bookkeeping.
- Backend: `GET /api/harmony/archives?section=vocabulary|timeline|bulletins` — supports section-level lazy loading.

**NEW badges and notifications** (Phase C):
- `lastHarmonyVisit DateTime?` on Pair model — updated when student opens Harmony feed
- Posts with `createdAt > lastHarmonyVisit` display "NEW" badge (sky-500 pill)
- `GET /api/harmony/has-new` lightweight endpoint polled on TerminalDesktop mount
- `harmony:new-content` socket event emitted when `ensureHarmonyPostsExist()` creates new posts
- Pulsing rose-500 notification dot on Harmony tile in TerminalDesktop when `hasNewContent` is true
- Badge clears when student opens Harmony

**PEARL ambient annotations** (Phase C):
- Session-based (not persisted to DB). Computed from `recentCensureResults` and `citizen4488Actions` in harmonyStore.
- Displayed as pinned cards at bottom of Feed tab with emerald PEARL branding.
- Triggers: 5 correct censure streak ("Exceptional language accuracy. Added to your file."), 3 wrong streak ("Additional review scheduled for your benefit."), flag 4488 ("Your compliance protects the community."), approve 4488 ("Citizens who approve concerning content may receive guidance.")

**OpenAI content moderation (2026-04-24):**
- Replaces the prior 2-5s fake-approve setTimeout on `POST /api/harmony/posts` and `/posts/:id/replies` with a real review via `backend/src/utils/harmonyModeration.ts`.
- Cheap profanity pre-filter runs first; if clean, a single OpenAI call scores the post against a rubric: written in English, uses at least one target vocab word, compliant tone, on-topic, minimum length.
- Returns `{ verdict: 'approved'|'flagged', reason, pearlNote }`. PEARL writes the in-character rejection note itself.
- Approved posts broadcast `harmony:new-content` to the class room; flagged posts visible ONLY to the author (no public shaming).
- OpenAI failure or missing key defaults to approved (permissive fallback). Latency impact: ~1-2s per submission.
- Frontend: `FLAGGED` chip in post card, `pearlNote` rendered under the post with emerald PEARL glyph.

**Live post rendering (2026-04-24):**
- `App.tsx`'s `onHarmonyNewContent` socket handler now calls `loadPosts()` + `loadCensureQueue()` when `viewStore.terminalApp === 'harmony'` — previously it only toggled `hasNewContent` for the notification dot, so peers had to sign out/in to see new class posts.
- Backend emits `harmony:new-content` to the class room on every approved post or reply creation.

**Staggered post timestamps + NPC replies (2026-04-24):**
- `harmonyGenerator.ts` spreads inserted-post `createdAt` across per-type windows (bulletin 2.5-5h ago, feed 10min-3.5h, etc.) so a freshly-seeded class doesn't have every post at the same instant.
- `harmonyReplies.ts` (new): 60% probability gate — when a student post is approved, an OpenAI call generates 1-2 in-character replies from `BACKGROUND_CITIZENS` active that week. Inserts are staggered 30-150s apart. Citizen-4488 excluded from AI voicing (hand-authored only).

**Security & reliability hardening (2026-04-17, PR #2):**
- **Cross-class censure auth fix**: `POST /posts/:id/censure` now explicitly rejects (403) when `post.classId !== viewer.classId` — previous code compared a variable to itself, always passed. A pair in Class A could theoretically censure posts in Class B if they knew the ID. Closed.
- **Mastery transaction**: `pairDictionaryProgress` upsert + update wrapped in `prisma.$transaction(async (tx) => {...})` so `encounters` and `mastery` cannot diverge on process crash.
- **Stale-pending sweep**: threshold lowered from 10s → 3s. Closes the orphan window where auto-approve `setTimeout` (2-5s) could lose posts if the server restarted in the gap.
- **`lastHarmonyVisit` awaited**: replaced `void prisma.pair.update(...).catch(() => {})` fire-and-forget with awaited update. Also fixed a latent bug where the old read-after-write pattern was suppressing NEW badges by seeing the just-updated "now" value.

## My File (Student Dossier)
Added 2026-04-17 via PR #6. Rewritten from placeholder to a real citizen dossier.

- **Backend endpoint**: `GET /api/student/profile-summary` (new file `backend/src/routes/student.ts`) — pair-authed, aggregates in parallel via `Promise.all`:
  - `citizen`: designation, lane, xp, streak, concernScore, consecutiveQualifyingShifts, laneLocked, harmonyUnlockedAt, createdAt
  - `shifts`: totalCompleted, totalAvailable, recentResults[] (weekNumber, completedAt, vocabScore, grammarAccuracy, targetWordsUsed, errorsFound/Total, concernScoreDelta)
  - `vocabulary`: totalWords, averageMastery, totalEncounters, byStatus {approved/monitored/grey/proscribed/recovered}, starredCount
  - `harmony`: postsWritten, censureResponsesTotal, censureCorrect, censureCorrectnessRate
  - `character`: narrativeChoicesMade, citizen4488InteractionsCount
- **Frontend** (`frontend/src/components/terminal/apps/MyFileApp.tsx`): full rewrite in cream shift-queue palette (Ministry dossier aesthetic, NOT terminal CRT). Five sections:
  - **Citizen Record**: designation, clearance level (Standard/Associate/Director), XP, streak, concern gauge, promotion eligibility ("X of 3 qualifying shifts")
  - **Shift History**: 18-cell grid (one per week). Completed cells show week # + vocabScore %. Tap a cell for detail popover with full per-shift stats.
  - **Vocabulary Ledger**: total words, average mastery bar, status breakdown dots (emerald=approved, amber=monitored, gray=grey, rose=proscribed, sky=recovered), total encounters
  - **Harmony Activity**: posts written, censure responses, "Ministry alignment: X%" (from censureCorrectnessRate)
  - **Character Dossier**: narrative choices made, Citizen-4488 interactions logged
- In-world tone ("Ministry alignment" not "correctness rate"; "GOOD STANDING" / "UNDER REVIEW" by concern score).
- Loading + error states with retry button. Dystopian-appropriate error copy ("Ministry records temporarily unavailable").

## MonitorPlayer (Shared CRT Video Player)
- **Single source of truth** for all video playback: `frontend/src/components/shared/MonitorPlayer.tsx`
- Used by: WelcomeVideoModal, ShiftQueue task clip gate, DismissalBroadcast, PhaseClipPlayer, BriefingStep, StepVideoClip, ShiftStoryboard previews
- **Retro CRT monitor frame**: Video plays inside vintage monitor image (`public/images/welcome-monitor.jpg`, 2744x1568, compressed to ~550KB)
- **Loading state**: Shows "INITIALIZING DISPLAY..." text while monitor image loads, then fades in over 300ms
- **Video preload**: `preload="metadata"` on video element for faster initial load
- Screen positioned with `clip-path: polygon()` tracing the exact glossy black glass shape
- CRT visual effects: scanline overlay, vignette edge blending (inset box-shadow), radial glare gradient
- Seekable progress bar overlaid on the monitor's green LED strip
- Playback controls: rewind 10s + pause/play buttons on bezel, vintage brass volume knob — all touch-friendly
- Autoplay rejection handling: "Play Transmission" manual play button overlay
- **Autoplay timeout fallback**: 4-second timer shows manual play button if video doesn't start (covers stalled loads, slow networks, silent autoplay rejection). Stalled/suspend event handlers catch mid-stream buffering.
- STANDBY screen when no video source; auto-skip after 2s on video load error (404/missing file)
- **Edge fade mask**: Radial CSS mask (`maskImage`) dissolves monitor bezel edges into the dark background — screen area stays fully opaque
- **Ambient glow background**: All video player contexts (WelcomeVideoModal, ShiftQueue clip gate, DismissalBroadcast) use layered radial gradients matching monitor colors (warm bronze bezel + green CRT emission) instead of flat black
- Props: `src?`, `embedUrl?`, `autoPlay?`, `onEnded?`, `screenOverlay?`
- Replaced: FrostedGlassPlayer (deprecated, no remaining imports)

## Welcome Video Gate
- One-time modal for pairs with `hasWatchedWelcome === false`
- Uses MonitorPlayer with `screenOverlay` for proceed/skip buttons inside CRT screen area
- CA-1 test bypass: "SKIP (TEST)" button inside CRT screen area
- Teacher-uploadable video via `/api/dictionary/welcome-video` (multer, 200MB limit)
- Teacher delete video via `DELETE /api/dictionary/welcome-video`
- Video served via static `/uploads/welcome/welcome-video.mp4` (no auth needed for `<video>` tags)
- Static fallback: green CRT "WELCOME TO THE MINISTRY" text inside screen, auto-proceeds after 5s
- Mounted in `App.tsx` after boot sequence, before routes

## Shift Storyboard & Teacher Video Clips
- **Storyboard derived from WeekConfig**: `GET /api/teacher/weeks/:weekId/storyboard` returns steps matching the actual student task sequence (intake_form, word_match, etc.)
- **Auto-creates Mission records**: Opening the storyboard ensures DB Mission records exist for all WeekConfig tasks — no manual seed needed
- **Video upload per step**: Teacher can upload a video clip or embed URL for any storyboard step
- **Hide/Show toggle**: Teacher can hide uploaded videos without deleting them (`videoClipHidden` field in teacherOverride)
- **Teacher override pipeline**: Uploads stored as `teacherOverride` in Mission.config JSON → merged into WeekConfig at `GET /api/shifts/weeks/:weekId/config` → frontend reads override in task config
- **Movie theater mode**: When a task has a video clip, students see a full-screen black overlay with the CRT monitor centered — no header, progress bar, or PEARL bar visible during playback
- **Skip button**: Appears after 3 seconds; auto-skip after 2s if video fails to load
- **Seed preservation**: Re-running seed preserves existing teacherOverride data on Mission records

### Dismissal Video System (clipAfter)
- **Two upload slots per step**: Primary video (`videoClipUrl`, plays before task) and dismissal video (`dismissalClipUrl`, plays after task completion)
- **Upload endpoint**: `POST /api/teacher/weeks/:weekId/steps/:missionType/video?slot=dismissal` stores dismissal video in `teacherOverride.dismissalClipUrl`
- **Auto-population**: `GET /api/shifts/weeks/:weekId/config` maps `teacherOverride.dismissalClipUrl` → `task.clipAfter` at serve time — no hardcoded URLs in WeekConfig
- **Teacher dashboard**: Each storyboard step shows a "Dismissal Video" section below the primary video, with upload/preview/remove controls
- **DismissalBroadcast component** (`frontend/src/components/shift-queue/DismissalBroadcast.tsx`): Three stages — red flash (2s) → video playback in MonitorPlayer → green color transition + "HAVE A HAPPY DAY" text (3s)
- **Deferred message triggers**: Character messages (`task_complete`) are held in `pendingTriggerRef` during dismissal and fired after the sequence completes
- **Graceful fallback**: If no dismissal video is uploaded, task completes normally. If video fails to load, MonitorPlayer's auto-skip (2s) chains through to the outro
- **Reusable**: Any future week can use the pattern by uploading a dismissal video to the relevant task's slot

## Task Gating (Teacher Pace Control)
- **Multiple simultaneous gates**: `taskGates Int[]` on `ClassWeekUnlock` — empty array = all unlocked (default), `[1,3]` = students gated before tasks 1 and 3
- **Teacher storyboard UI**: Clickable gate markers between storyboard steps — toggle any combination independently. Gate control bar shows active gate count with Advance (removes lowest) and Remove All buttons
- **Student gate screen**: "Station Hold" overlay with rotating Party-style waiting messages, amber pulse animation
- **Real-time push**: `session:gate-updated` socket event broadcasts to `class:${classId}` room — all waiting students proceed instantly when teacher advances
- **PEARL bark**: Students get in-world notification when gate lifts ("PROCESSING AUTHORIZED: Your station has been cleared...")
- **Backend**: `GET/PATCH /api/classes/:classId/weeks/:weekId/task-gate` — single DB query, O(1) broadcast
- **Edge cases**: Gate only prevents forward progress, never moves students backward; refresh while gated resumes correctly; gate at 0 blocks all tasks; students only blocked when their current task matches a gate position
- **Class-filtered monitor**: Live Class Monitor filters by selected class; "Students" button on class card scrolls to filtered monitor

## Teacher Dashboard (`frontend/src/pages/TeacherDashboard.tsx`)
- Tabs: Class, Grades, **Writing Review**, Shifts, Dictionary
- Briefing Setup: episode title/subtitle, Canva/embed URL, fallback text
- Now Showing sequence: `clip_a → activity → clip_b`
- Clip-specific media inputs (upload or embed URL)
- Grades: per-student drill-down, inline score editing, writing viewer, week reset, concern override (dual ShiftQueue/PhaseRunner support). **Cell average uses ShiftResult summary** (vocabScore + grammarAccuracy average) when available, matching what the student sees on ShiftClosing. Falls back to MissionScore average for in-progress weeks. **Drill-down now shows 9-card "Shift Summary (Student View)" mirroring ShiftClosing**: Docs Processed, Errors Found, Words Written, Vocab Score %, Grammar Accuracy %, Writing Score %, Final Score %, Target Words Hit, Concern Score. The new Writing Score / Final Score / Target Words Hit cards render em-dash fallback for legacy rows whose `ShiftResult.taskResults` JSON doesn't yet include those metrics. When `completedAt` is null, an amber "Not finalized — student hasn't reached ShiftClosing yet" pill surfaces (clarifies that teacher-Move-to-Shift marker rows with all-zero stats aren't broken data).
- **Gradebook drill-down: three new collapsible subsections per task row (added 2026-04-24)**:
  - **Student Answers** — compact table rendering `details.answerLog[]` with Prompt / Chosen / Correct / Result (✓/✗) columns. Populated by all multi-choice task types (WordMatch, VocabClearance, ClozeFill, ContradictionReport, DocumentReview, PrioritySort, ErrorCorrectionDoc, IntakeForm, WordSort) on new completions. Shows "Not recorded for this task" for rows submitted before the answerLog rollout (2026-04-24) — that data was never captured and is not retroactively recoverable.
  - **PEARL & AI** — two-column panel rendering `details.grammarScore` + bulleted `grammarNotes`, `details.vocabScore` + emerald `vocabUsed` pills + rose `vocabMissed` pills, plus `taskScore` / `taskNotes`. Top-level `pearlFeedback` column (added via Prisma migration 2026-04-24) shown as italic quote with PEARL eye glyph. Empty-state for legacy rows.
  - **Teacher Comment** — textarea (max 2000 chars, character counter) + Save button wired to `PATCH /api/teacher/scores/:scoreId/comment`. Optimistic save with Modified (amber) / Saved (emerald) / Server-not-ready (rose) state pills. Auto-expands if a saved comment exists.
- **Writing Review page** (`frontend/src/components/teacher/WritingReview.tsx`, top-level tab added 2026-04-24): class-wide per-shift essay review. Shift selector defaults to most recently completed week. Sort by **"Needs attention"** (default: `submittedAnyway || score < 0.5 || missing comment`), designation (asc/desc), or score (asc/desc). Each card shows: student designation + displayName (clicks through to Gradebook cell), task title, score pill (emerald ≥75% / amber 50-74% / rose <50%), amber "Submitted Anyway" flag when the student used the Submit Anyway fallback, full writing text, inline AI evaluation panel, PEARL feedback quote, and teacher comment textarea. Backed by `GET /api/teacher/classes/:classId/writing-review?week=N` (returns flat `{ weekNumber, weekTitle, entries[] }`). Falls back to transforming `/teacher/gradebook` client-side if the endpoint is missing.
- Dictionary: editable word table (inline edit → PATCH save)
- Shifts: welcome video upload + Shift Storyboard (per-task video upload, embed URL, hide/show toggle)
- **ClassManager**: expandable students/weeks panels per class, delete class (cascade), remove individual students with confirmation dialogs
- **ClassMonitor**: per-student delete button, bulk "Delete All Students" in header, both with destructive confirmation dialogs
- **Task controls work for all students** (online and offline): Skip Task, Reset Task, Reset Shift, Send to Task use REST API (`POST /api/teacher/students/:studentId/task-command`) that persists directly to DB. Online students also get instant socket relay. Student cards are always expandable regardless of connection status.
- **Send to Task**: Works for all shifts (1-3). Backend translates config task IDs (e.g. `word_match_w2`) to mission types (e.g. `word_match`) via `configIdToType` map. Shift-status endpoint returns config `id` (not `type`) so online and offline students use the same identifiers.
- **Student deletion cascade**: Pair → pairDictionaryProgress, missionScore, recording, pearlConversation, narrativeChoice, harmonyPost, harmonyCensureResponse, classEnrollment, characterMessage, citizen4488Interaction, shiftResult (11 related tables)
- **Shift Review modal** (`frontend/src/components/teacher/ShiftReviewModal.tsx`, added 2026-04-24): "Review Shift" button in ClassMonitor header next to "Move Class to Shift." Opens a read-only class-wide snapshot of one specific shift. Per-student rows show status chip (Not started / In progress / Complete), average score %, per-task chips (emerald ≥70%, amber done <70%, gray not done) with tooltips, expandable writing submissions (intake cards, report, contradiction, justifications), compact shift-summary stats (docs, errors, vocab %, grammar %, target words, concern delta), and a "Gradebook →" drill-through that switches to Gradebook tab + sets class context. Read-only by design — score edits stay in Gradebook as the single editing surface. Pure frontend; reuses `/api/teacher/gradebook` endpoint. Intended workflow: quick class roll-up check before using Move-Class-to-Shift to force-advance.

## Move Student/Class to Shift (Teacher Shift Control)
Teachers can move individual students or entire classes to any shift that has content (currently Weeks 1-3).

**Per-student:** ClassMonitor expanded cards show a "Move to Shift" button row below Difficulty Tier. Current shift highlighted in indigo. Clicking a shift opens confirmation dialog explaining that progress from that shift onward will be reset.

**Per-class:** ClassMonitor header has a "Move Class to Shift" toggle that reveals a shift selector row. Confirmation warns that ALL students will be moved and progress reset.

**Backend endpoints:**
- `POST /api/teacher/students/:studentId/move-to-shift` — moves one student
- `POST /api/teacher/classes/:classId/move-to-shift` — moves all enrolled students

**Move mechanics:**
- **Forward move:** Creates `ShiftResult` records with `completedAt` for skipped weeks + marker `ShiftResult` (completedAt=null) at target week for correct `getCurrentWeekNumberForPair()` result. Deletes target week MissionScores for fresh start.
- **Backward move:** Deletes all `ShiftResult` and `MissionScore` records from target week onward. Creates marker ShiftResult at target.
- **Same week:** Resets the shift (deletes scores + ShiftResult, creates marker).
- **Auto-unlock:** Target week + all prior weeks auto-unlocked in `ClassWeekUnlock` for the class.
- **Validation:** Rejects moves to weeks without `WeekConfig` content.

**Real-time push:** `session:shift-changed` socket event navigates online students to the new shift immediately. PEARL bark: "SUPERVISOR OVERRIDE: Transfer directive received. Report to Shift N."

**Season endpoint fix:** `GET /api/shifts/season` now checks `ShiftResult.completedAt` in addition to MissionScore for `clockedOut` status, so teacher-skipped weeks correctly show as completed.

## Difficulty Tier System (Teacher-Controlled Lanes)
Teachers can set student difficulty tiers (1=Guided, 2=Standard, 3=Independent) at per-student and per-class-default levels. Changes apply in real-time without student re-login.

**Per-student control:** ClassMonitor expanded cards show a 3-button tier selector (Guided / Standard / Independent) with description of what each tier provides. Calls `PATCH /api/teacher/students/:pairId/lane`.

**Per-class default:** ClassManager header shows G1/S2/I3 segmented toggle. New students registering with that class code inherit the class default lane. Stored as `Class.defaultLane` (migration: `20260320071340_add_class_default_lane`).

**Real-time updates:** Backend emits `session:lane-changed` socket event to the student. Frontend `studentStore.setLane()` updates the cached user object immediately. PEARL bark: "CLASSIFICATION UPDATE: Your operational tier has been adjusted by a supervisor."

**What tiers control:**
- **Writing tasks** (ShiftReport, ContradictionReport, PriorityBriefing): Tier 1 gets sentence starters + Chinese word bank + per-lane minWords (e.g. 30); Tier 3 gets bonus prompts + higher minWords (e.g. 55) + `requireNegative`
- **ContradictionReport diff requirements**: Tier 1 must find 3/5 diffs, Tier 2 must find 4/5, Tier 3 must find all 5. Scoring denominator matches lane requirement (capped at 100%). Classification options: `information_changed` and `information_removed` only. Removed sentences show tappable `[...]` placeholders on the revised memo (anchored via `removedAfterText` in config). Submitting phase shows "P.E.A.R.L. is reviewing your report..." spinner (1.5s) before completion.
- **Error Correction Doc**: Tier 1 gets sequential grammar hints via `laneHints`
- **VocabClearance**: Tier 1 gets 3 attempts (concern only on final miss, 2.5s correct-answer display); Tier 2 gets 2 attempts; Tier 3 gets 1 attempt (immediate lock)
- **AI evaluation**: Prompt includes lane context; unified pass threshold (avg >= 0.4) across all tiers
- **WordMatch**: Per-word attempt limits — Tier 1 gets 3 attempts before auto-resolve (shows correct match, concern only on final miss, 2s flash for learning), Tier 2 gets 2 attempts (concern every miss), Tier 3 gets 1 attempt (immediate auto-resolve, concern every miss). Tier 1 PEARL barks show remaining attempts. Render-time completion detection with functional state updaters (no stale closures).
- **ClozeFill**: Per-blank attempt limits — Tier 1 gets 3 attempts before auto-fill (concern only on final miss, 1.5s delay), Tier 2 gets 2 attempts (concern every miss), Tier 3 gets 1 attempt (immediate auto-fill, 800ms delay, concern every miss). Auto-filled blanks don't count toward first-try score.
- **PrioritySort**: Tiered concern penalty per wrong sort — Tier 1 = 0.05 (gentler), Tier 2 = 0.1 (default), Tier 3 = 0.15 (stricter). Justify phase is lane-aware via WritingEvaluator's `lane` prop (`modalLane` in week3.ts is config-only — NOT consumed by the component). Justify card re-displays the student's own filed folder (glyph + colored label) and a "YOUR TASK" directions panel naming all three folders (2026-06-11, `965dd18`).

## Login Form Persistence
Login form state persisted in `loginFormStore.ts` (Zustand) so navigation away from `/login` doesn't reset partially filled fields. Form clears only on successful login/register.

## Student Deletion Socket Cleanup
When a student is deleted (single or bulk), backend now:
1. Calls `purgeOnlineStudent()` to clear in-memory `onlineStudents` + `entitySockets` + `disconnectTimers` maps
2. Emits `student:deleted` socket event to teacher room
3. Frontend `useTeacherSocket` listens for `student:deleted` and calls `purgeStudent()` which clears both `onlineStudents` AND `lastKnownStatus` maps

Previously, deleted students persisted as "Offline" cards in ClassMonitor due to stale `lastKnownStatus` entries.

## OfficeView
- PEARL 3D Sphere: R3F Canvas (`frontend/src/components/office/PearlSphere3D.tsx`)
  - SwirlSphere (GLSL shader, animated vortex), VideoFace (brightness-threshold shader), GlassShell (transparent highlight)
  - Off-DOM video element wrapped in `VideoTexture`
  - Split audio/video: silent `.mp4` for visual + separate `Audio()` for sound (Safari autoplay compatibility)
  - First-login autoplay only, module-level `pearlFacePlayedThisSession` flag
  - Replay cycle every 3 min with `video.load()` + `canplay` wait
- Propaganda Chyron: per-character RAF animation, 3D sphere-wrapping illusion (cosine-curve scale/opacity/arc), shows every 15-25s for 14s
- Overlay positioning: ALL overlays use image-space percentages (`{ cx, cy, w, h }`) via `imageToViewport()`
- Background: `public/images/office-bg.jpg` (2528x1696) with `object-contain`
- Blurred background fill behind main image for edge padding
- Constants in `OfficeView.tsx`: `SCREEN`, `SPHERE`, `NEON_STRIP`, `LEFT_WALL`, `RIGHT_WALL`, `FLOOR_GLOW`, `IMAGE_FULL`
- Monitor screen UI: Clock pill (bottom-left) + LOG OFF pill (bottom-right) — frosted glass iOS style
- OfficeHUD (`frontend/src/components/office/OfficeHUD.tsx`): top bar (Ministry title, citizen badge), bottom bar (HAPPINESS: OPTIMAL, volume, PEARL eye)

## UI Design System — Dystopian Happy iOS
- Design bible: `Dplan/UI_Design_System.md`
- **Shift queue uses "forced happy" light pastel aesthetic** — NOT dark CRT terminal:
  - Cream backgrounds (#F5F1EB), white cards, sky-600 action accents, emerald success, rose errors, warm gray borders (#D4CFC6)
  - TerminalAppFrame device chrome stays dark; content area uses `crt-monitor-screen` cyan CRT background
  - No ios-glass-card, no neon-* colors, no dseg7 font, no text-white/* in shift queue
  - All 16 shift queue components rethemed: ShiftClosing, ShiftQueue, TaskCard, ClarityQueueApp, IntakeForm, ClozeFill, VocabClearance, WordMatch, DocumentCard, ErrorCorrectionDoc, ComprehensionDoc, DocumentReview, ShiftReport, PriorityBriefing, PrioritySort, ContradictionReport, WordSort, LaneScaffolding, TargetWordHighlighter, WritingEvaluator
- Office/HUD: Frosted glass pills (`backdrop-blur`, `rounded-full`, semi-transparent gradients, soft shadows)
- Color roles: Sky = primary action, Emerald = success/safe, Rose = error/danger, Amber = warning/narrative
- All on-screen elements scale with monitor rect — no fixed pixel sizes
- HUD elements use warm `retro-card` style, not frosted glass

## Terminal Desktop Visual Design
- **Background**: Pure black (`#000000`) surround with near-black header/taskbar bezels
- **Monitor screen**: Muted cyan CRT gradient (`#8EBCC1` → `#95C2C6` → `#82B0B5`) via `crt-monitor-screen` CSS class — applied to both desktop and app frame content areas
- **CRT scan line**: White horizontal line sweeps down the monitor screen every 6s (`crt-monitor-screen::after`), rendered behind app content (`z-index: -1`). TerminalAppFrame content wrapper uses `relative` (no z-index) so `fixed` overlays like video clip gate participate in the parent stacking context correctly.
- **Animated grid**: Cyan grid lines (`rgba(0, 229, 255, 0.03)`) drift slowly across the black surround
- **CRT vignette**: Inset box-shadow darkens edges of the full terminal frame
- **App tiles**: All 6 tiles (Office, Lexicon, Current Shift, Harmony, My File, Duty Roster) use custom PNG icons at 240px width with transparent backgrounds — no clipping, cyan CRT shows through
- **App icon files**: `office-icon.png`, `lexicon-icon.png`, `current-shift-icon.png`, `harmony-icon.png`, `my-file-icon.png` in `frontend/public/images/`
- **Desktop text**: Dark teal tones (`#1A3035`, `#2A4A4E`, `#3A5A5E`) readable on cyan background

## File Upload System
- **Content-Type**: All FormData uploads use `Content-Type: undefined` so the browser auto-generates the correct `multipart/form-data; boundary=...` header. Setting it explicitly strips the boundary and breaks multer parsing in production.
- **Startup directory creation**: Backend creates `uploads/` and `uploads/briefings/` at startup (not lazily on first upload), preventing errors on fresh Railway volume mounts.
- **Multer limits**: Video uploads: 150MB (`MAX_VIDEO_FILE_SIZE`). Audio uploads: 10MB (`MAX_FILE_SIZE`). Welcome video: 200MB.

## Voice Log Quality Gate
- Requires at least one rubric item checked AND successful recording upload
- Upload passes `missionId` to backend and returns created recording id
