# Audit Remediation Tracker — 2026-06

Single source of truth for the fix work coming out of the June 2026 audits:

1. **Shift-4 deep review** — wiring, narrative/dialogue, TOEIC vocab + answer-key integrity, pedagogy.
2. **Frontend bug sweep** — 10-subsystem verified sweep beyond Shift 4 (60 findings).
3. **2026-06-10 whole-app re-audit** — 32 adversarially-verified candidates (27 confirmed-new) + Shift-4 wiring/pedagogy synthesis. See "Batch 2" below + `memory/project_full_audit_2026_06_10.md`. **Verification COMPLETE (2026-06-11).** All finder claims adversarially verified across three chunks: Batch 4 (10/10 confirmed), Batch 5 (10/10), Batch 6 (14 verified: 9 confirmed, 5 partial, 0 refuted). Every actionable finding is fixed; deliberate deferrals are dispositioned in the Batch 6 footer.

Each finding was adversarially verified by a second agent; the load-bearing ones were re-verified by hand against source. Two cross-cutting assurances held up: **all 35 Shift-4 MCQ/cloze answer keys are correct**, and the backend scoring / JSON-merge / socket backbone is sound. This is a fix-the-edges list, not a rebuild.

**Status legend:** ✅ done (in working tree, build-verified) · 🔄 in progress · ⬜ pending
**Builds:** `frontend npm run build` and `backend npm run build` both pass after every ✅ batch.

---

## ✅ Done (applied + build-verified)

| Fix | Files | Notes |
|---|---|---|
| **Lane-1 grammar scaffold** (two stacked bugs) | `DocumentReview.tsx:81`, `week4.ts:268` | Read the student's real lane (was hardcoded `2`, so Lane-1 hints never rendered); **and** replaced the 4-hint array with 6 error-aligned hints (the last two errors had no hint, the rest were misaligned). |
| **`logout()` shared-device hygiene** | `studentStore.ts:99`, `seasonStore.ts`, `dictionaryStore.ts`, `sessionStore.ts` | logout now resets every session-scoped store (was spyStore-only → ~8 stores bled to the next student on a shared Chromebook). Added `reset()` to seasonStore + dictionaryStore; added `resetRateMachine()` to sessionStore (machine-only, preserves DB score) and routed `resetConcern()` through it (now also clears `inscriptionDrillActive`). |
| **`refresh()` 401-only guard** | `studentStore.ts:119` | Only clears the session on a genuine 401/403 (+ `disconnectSocket()`); a transient network error keeps the session — stops Chromebook wake-from-sleep logging students out mid-shift. |
| **Concern delta reset on self-driven shift change** | `shiftQueueStore.ts:46` | `loadWeekConfig` zeroes `concernScoreDelta`/`concernScorePersisted` when entering a different shift than the one in memory (X/Home re-entry bypassed `reset()` → double-counted concern). |
| **W4 `DictionaryWord` rows in prod** | `weekConfigMigrations.ts`, `wordEnrichment.ts` (new), `index.ts` | `ensureDictionaryWordsForAllWeeks()` startup migration upserts a row per `targetWords` entry from authored enrichment data (definition/IPA/zh-TW/example). Idempotent, create-only (never clobbers W1–3 seed rows), Black Words excluded. Fixes broken writing-mastery, Compliance authoring, and Remediation/Clarity coverage for the 8/10 W4 words that had no row (seed stops at W3 + doesn't run on Railway). **2026-06-10:** existence check now spans ALL weeks (seed already had W1-era `record`/`verify` rows — per-week check would have created cross-week duplicates that the submissions encounter loop double-bumps) + P2002 tolerance for overlapping Railway boots. |

## ✅ Batch 2 — 2026-06-10 (applied + build-verified, both builds + 55 tests pass)

| Fix | Files | Notes |
|---|---|---|
| **P0: ShiftClosing overwrote the final task's grade to 1.0** | `ShiftClosing.tsx` | Deleted the vestigial clock-out re-submit (`submitMissionScore(lastMission.id, 1, …)`) that ran on every shift close + remount, clobbering the Shift Report's real vocab score and reverting teacher edits (W1–W4). `completeTask` already persists `{status:'complete'}` with the real score. |
| **P0: "Delete All" wiped ALL classes** | `ClassMonitor.tsx`, `api/teacher.ts`, backend `teacher.ts` | `DELETE /teacher/students` now REQUIRES `?classId=` + ownership check; frontend passes the monitor's class; confirm copy says "in this class. Other classes are not affected." |
| **Censure respond mastery replay-farming** | backend `harmony.ts` | Mastery bump now gated to first answer OR a genuine ≥7-day spaced re-encounter (PR #37 class of bug; preserves the intended 7-day review loop). |
| **One student flagging a 4488 NPC post hid it class-wide** | backend `harmony.ts` | `status:'flagged'` now only applied to AUTHORED posts; NPC-post flags record the Citizen4488Interaction without hiding the shared arc. Student-side PEARL annotation unaffected (client-tracked). |
| **Teacher DELETE /harmony/posts/:id unscoped** | backend `harmony.ts` | Teacher branch now requires class ownership. |
| **/submissions/evaluate: unvalidated missionId + no AI timeout** | backend `submissions.ts` | Mission existence + ClassWeekUnlock gate before any work (was: FK 500 mid-submit / cross-week pre-credit); 20s `Promise.race` timeout on the OpenAI call → fail-open fallback. Encounter loop also dedups multi-week word rows (bumps one row per word, newest week). |
| **Unlock gate missing on sibling MissionScore writers** | backend `shifts.ts`, `sessions.ts` | `POST /progress/:weekId/:stepId` + legacy phase-complete now run the same ClassWeekUnlock gate as `/score`. |
| **Compliance: 6-question templates served 5; refresh served different questions than archived** | `complianceDistractors.ts`, `compliance-check.ts` | Cap literal raised to 6 (missed in the 77ae5d0 cap raise); `/pending` now serves the row's ARCHIVED question set so teacher drill-down matches what was answered. |
| **`GET /inscription/roll/:classId` leaked any class's standings** | backend `inscription.ts` | Pair → must be enrolled; teacher → must own the class. |
| **W4 Harmony fired a wasted OpenAI call per open** | `harmonyGenerator.ts` | Static-only guard extended to bulletin/pearl_tip/community_notice/sector_report (AI prompt can't produce them). |
| **W4 PEARL tip authored** (Input-phase gap) | `harmonyPearlTips.ts` | Past-simple-sequencing tip #4 in Ministry voice. |
| **VocabClearance scored any-attempt corrects** | `VocabClearance.tsx` | First-try-only scoring (matches WordMatch/ClozeFill/Cipher); retries remain as learning affordance; counter relabeled "first-try correct". Gradebook % now agrees with its own answer log. |
| **ErrorCorrectionDoc answer-change exploit** | `ErrorCorrectionDoc.tsx` | Picks final on first click (was changeable for 1s AFTER seeing rose/emerald feedback); completion math reads a synchronous ref (no stale-closure on near-simultaneous touches); completion timer tracked for unmount. |
| **DocumentReview score/analytics disagreement** | `DocumentReview.tsx` | Score = item-weighted `correctSum/totalSum` (was unweighted doc mean); `errorsFound/Total` restricted to error-correction docs (comprehension Qs no longer inflate "Errors found"). |
| **Obs-E mutation timer restarted on parent re-render** | `ObservationMutationView.tsx` | `onAdvance` held in a ref; effect runs once per mount. |
| **handleComplete persisted completion AFTER the compliance fetch** | `ShiftQueue.tsx` | `completeTask` now awaits FIRST — a slow compliance request can no longer delay the MissionScore write (refresh in that window lost the task). |
| **W4 epilogue silently dropped the recruitment vote** | `ShiftQueue.tsx`, `RecruitmentModal.tsx`, `DropBoxOverlay.tsx`, `spyStore.ts` | Resolver failure now re-runs the epilogue instead of skipping to 'done'; both modals stay open with an in-register retry line ("> the line dropped. say it again.") on POST failure; Drop Box 'skip' no longer persists/echoes typed-but-unsent drafts (fixes the tracked P2 echo at the source + display gate for old rows). |
| **patchConcern marked persisted even on failure** | `shiftQueueStore.ts` | Optimistic mark + rollback-on-failure at both flush sites — failed PATCHes no longer permanently undercount `Pair.concernScore`. |
| **logout() missed messaging/harmony/inscription stores** | `messagingStore.ts`, `harmonyStore.ts`, `inscriptionStore.ts`, `studentStore.ts` | All three gained `reset()` (messaging also clears the module-level `inFlightKeys` Set — fixes the tracked P2); shared `resetSessionStores()` cascade now runs on BOTH logout and `refresh()`'s genuine-401 path. |
| **Teacher pause state was one global boolean** | `teacherStore.ts`, `useTeacherSocket.ts`, `ClassMonitor.tsx`, backend `socketServer.ts` | Per-class `pausedClasses` map keyed by the `classId` the server already sent; server also replays pause state to TEACHERS on connect (refresh no longer loses the indicator). |
| **W1 doc_schedule laneHints off-by-one (6 hints / 7 errors)** | `week1.ts` | 7 aligned hints, one per error — same bug class as the W4 batch-1 fix. |
| **W4 vocab/content fixes** | `week4.ts` | vocab_clearance items #1/#3 disambiguated (anchors kill near-synonym distractors); +4 production items (record/arrange/locate/present — all were below the 4-encounter floor); duplicate examine-definition item converted to W2 `compare` review; `organize`/`record` word_match definitions fixed (circularity / dual-POS); doc_adjustment extended with `collect`/`organize` past-tense errors (8 errors, 8 aligned hints — production surface for target verbs); Betty's shift_start message now models collect/examine/verify/record in natural use (Input-phase patch until Clip A ships). |
| **Dead duplicate `EditedWindow 2.tsx` deleted** | — | Was untracked + unimported; one autocomplete away from shipping stale code. |

---

## ✅ Batch 3 — 2026-06-10 evening (resumed-sweep confirmations; applied + build-verified, both builds + 55 tests pass)

| Fix | Files | Notes |
|---|---|---|
| **P1: Clarity Check one-shot was client-memory only** | backend `clarity-check.ts`, `api/clarity-check.ts`, `ShiftQueue.tsx` | New `GET /clarity-check/completed?weekNumber=` + ShiftQueue hydrates `completedClarityCheckIdsRef` from the server before evaluating placements — a refresh no longer replays the screen-locking shift_start quiz (mastery was already deduped; the lockout wasn't). Fail-open. |
| **`GET /shifts/season` 500 for teacher tokens** | backend `shifts.ts` | ShiftResult supplement is now pair-gated (ShiftResult has no `userId` column; legacy-branch `scoreFilter` threw a Prisma validation error). |
| **`PATCH /shifts/concern` unfloored negative spam** | backend `shifts.ts` | Read-modify-write in a transaction with a `[0, 100]` clamp on the RESULT — scripted `delta:-1` spam can no longer bank a negative score that suppresses the 3.0 backstop and the teacher Concern chip. |
| **Shift-result re-post stomped `concernScoreDelta`** | backend `shifts.ts` | Update branch keeps the recorded delta when the re-post carries 0 (remount artifact); genuine redos hit the CREATE branch because reset-shift deletes the row. |
| **patchConcern rollback lacked a shift-epoch guard** | `shiftQueueStore.ts` | Batch-2's rollback now only applies if the store is still on the same shift — a late rejection from a prior shift can't corrupt the new shift's counters. |
| **Open Pool word queue used only group[0]'s mastery** | `inscriptionWordPool.ts`, `inscriptionMatchmaking.ts` | Picker accepts `pairIds[]`; anti-fatigue now excludes a word only when EVERY pool member mastered it. |
| **Trial dispatch `weekNumber ?? 1` fallback** | `TrialDispatchModal.tsx`, `InscriptionLobby.tsx` | Falls back to `getHighestUnlockedWeek(seasonStore.weeks)` instead of week 1; InscriptionLobby's duplicate inline copy of that walk replaced with the shared util. |

**Deferred with cause:** censure answer keys still ship in `censureData` pre-answer — the mastery-farming half is closed (Batch 2), so remaining exposure is DevTools-level answer reading; withholding the key requires reshaping the respond API + CensureCard reveal flow. Do it alongside the next Harmony content pass.

## ✅ Batch 4 — 2026-06-10 night (verification chunk 1 of the unverified claims: 10 verified → 10 confirmed → all fixed; builds + 55 tests pass)

| Fix | Files | Notes |
|---|---|---|
| **Layer-1 fails coerced to off-topic → Submit Anyway falsely blocked** | backend `submissions.ts`, `WritingEvaluator.tsx` | Both Layer-1 fail payloads now carry `onTopic: true` (a length/vocab verdict is not a topic verdict); frontend coercion relaxed to `data.onTopic !== false` (fail-open, mirrors the network-error catch). The false "must address the assigned topic" banner after a merely-short submission is gone. |
| **Attempt-3 permanent lock — rewrites never re-evaluated** | `WritingEvaluator.tsx` | Attempt ≥3 with an off-topic history now RE-EVALUATES the current text; a fresh on-topic verdict auto-passes (vocabScore floored 0.3) per §5.5. Off-topic stays non-negotiable but escapable by actually rewriting. |
| **Three contradictory word floors (10/20/30-40)** | `submissions.ts`, `WritingEvaluator.tsx`, `PrioritySort.tsx` | `metadata.minWordCount` threads the task's lane-resolved floor to the backend (clamped 5-100; legacy lane formula stays as fallback); evaluator sends its `minWords`; PrioritySort passes `minWords={10}` matching its on-screen counter + "1-2 sentences" prompt, and keys the evaluator per case so attempts reset. Also fixes W1 lane-2 shift report (25 vs hidden 30). |
| **On-topic veto structurally OFF for PriorityBriefing + PrioritySort** | `PriorityBriefing.tsx`, `PrioritySort.tsx` | Both now pass `writingPrompt` + `taskContext` (the AI rubric defaulted onTopic=true without them). The W3 "first principle" that ShiftClosing quotes back is now actually vetted. |
| **PriorityBriefing recorded a constant 1.0 under category 'writing'** | `PriorityBriefing.tsx`, `PrioritySort.tsx` | With writing cards: score = mean vocabScore clamped [0.1,1.0] (ShiftReport pattern) + full rubric fields (`onTopic`/`vocabScore`/`grammarAdvisory`/`submittedAnyway`) persisted in details for Writing Review. Acknowledgment-only flow keeps neutral 1/1 under 'mixed' (IntakeForm pattern). PrioritySort keeps its honest sort-accuracy score but now records per-case `justificationEvals` + a top-level `submittedAnyway` flag. |
| **Student live status lost after >5s reconnect** | `ClarityQueueApp.tsx`, `ShiftQueue.tsx`, `teacherStore.ts` | `once('connect')` emits → persistent `on('connect')` re-emits (with effect cleanup; ShiftQueue re-reads the LIVE task from the store, not the mount snapshot); `upsertStudent`/`setClassSnapshot` no longer let a hollow rebuilt status wipe the rich card — `mergeHollowStatus()` preserves task label/elapsed/attempts from the prior record. |
| **reset-shift deleted every current-week anchor (week regressed to N-1)** | backend `teacher.ts` | `reset-shift` re-creates the `completedAt:null` marker (mirroring moveOnePairToShift's same-week branch); the per-week progress DELETE re-creates it conditionally (only when resetting the pair's current week). A second reset click can no longer destroy the prior week's grades. |
| **send-to-task left the week clockedOut → re-draft student locked out** | backend `teacher.ts` | `send-to-task` converts a completed ShiftResult back to a marker (`completedAt: null`, row kept so the anchor + recorded concernScoreDelta survive); same conversion in `DELETE /scores/:scoreId` when the deleted row is the shift_report/clock_out score. The documented re-draft workflow now works for offline students. |
| **Move-to-current-shift soft-locked students into the dead legacy runner** | `ClarityQueueApp.tsx`, `App.tsx` | Load gate also fires when the queue store is empty-and-quiescent (the ref guard alone skipped the reload forever); `onShiftChanged` now resets `shiftStore` (stale missions) AND calls `sessionStore.resetRateMachine()` — which also closes the long-tracked P1 "shift transfer doesn't clear the rate machine". |
| **completeTask clobbered teacher commands landing mid-POST** | `shiftQueueStore.ts` | Post-await freshness guard: bail if `weekConfig.weekNumber` or the `taskProgress` reference changed during the score POST (every progress writer replaces the array, so identity = epoch). goToTask/resetShift/shift-change can no longer be silently undone. |

**~23 finder claims remain unverified** (chunk 2+ pending user approval). Top remaining by guessed severity: shift_end pending-ref clobber; task-completion failure path (stuck on finished task); loadWeekConfig cancellation token; writing mastery bump not gated by veto; degraded-path double-failure auto-pass; missionId never passed (pearlFeedback persistence dead); teacher-bound socket events readable by students; orderIndex vs config order; move-to-shift mid-write race; dictionary/season reset races.

## ✅ Batch 5 — 2026-06-10 late night (verification chunk 2: 10 verified → 10 confirmed → all fixed; builds + 55 tests pass; UNCOMMITTED)

| Fix | Files | Notes |
|---|---|---|
| **shift_end check clobbered by the after-task cascade** | `ShiftQueue.tsx` | shift_end effect now gates on cascade quiescence (dismissal idle, no interstitial/moment, empty pending refs) — a teacher-scheduled "After {final task}" + "At shift end" pair no longer silently loses one check. `ComplianceCheckShell` keyed by `checkId` so a mid-render swap remounts the MCQ. |
| **Failed score POST left students stuck on a dead task screen** | `ShiftQueue.tsx`, `shiftQueueStore.ts` | `completeTask` returns `'persisted' \| 'stale-dropped'`; `handleComplete` catches network throws into a rose "TRANSMISSION INTERRUPTED — ↻ Resubmit to Bureau" retry banner (work survives; no more redoing all 3 cipher docs after a Wi-Fi blip). Stale drops now also stop the cascade instead of replaying overlays against teacher-rewritten state. |
| **loadWeekConfig / loadWeek had no staleness token** | `shiftQueueStore.ts`, `shiftStore.ts` | Module-level load epochs (bumped on entry AND reset()) — a slow fetch for the previous shift can no longer resolve late and overwrite the new shift's config/missions (wrong-week MissionScore writes; the 54ca0b0 bug class applied to the stores' own loaders). |
| **Writing mastery bump ignored the on-topic veto** | backend `submissions.ts` | Encounter/mastery block now gated on `aiResult.onTopic` per §6.1 — off-topic word-stuffing no longer marks weak words mastered (which was also excluding them from Remediation). On-topic (not `passed`) per doctrine + outage fail-open. |
| **Degraded-path grade corruption** | `WritingEvaluator.tsx`, `ShiftReport.tsx`, `PriorityBriefing.tsx` | Submit Anyway floors vocabScore at 0.3 (`0 ?? 0.3` was 0 → clamped to 0.1 for a Wi-Fi blip); attempt-3 auto-pass + Submit Anyway carry `isDegraded`; ShiftReport/PriorityBriefing forward it — teachers can now tell "AI never saw this" from a genuine 0.3. |
| **missionId never passed — server-side eval persistence was dead code** | `ShiftQueue.tsx`, `types/shiftQueue.ts`, 4 writing tasks, `WritingEvaluator.tsx`, `api/pearl-feedback.ts`, backend `submissions.ts` | `TaskProps.missionId` resolved by ShiftQueue (same lookup completeTask uses) → forwarded by ShiftReport/PriorityBriefing/ContradictionReport/IntakeForm → eval + PEARL-feedback persistence now actually fire (§5.6). Server eval writes details/pearlFeedback every attempt but `score` only on pass; on-topic computedScore clamped [0.1,1.0]. PrioritySort deliberately NOT wired (per-case evals would churn one row). |
| **Teacher-bound socket events were broadcast to every student in class** | backend `socketServer.ts`, `remediation.ts`, `messages.ts`, `auth.ts`, `teacher.ts` | Teachers now join `class:{id}:staff`; retargeted: live status relays, remediation fired/completed/clawback, clarity replies, teacher comments, student connected/disconnected/deleted/registered (the last broadcast minors' REAL NAMES), pause-state. Class-wide events students consume (paused/resumed, gate-updated, presence, shift-changed, harmony) unchanged. |
| **Socket handlers registered after awaits — connect-time emits dropped** | backend `socketServer.ts` | Connection handler is now sync: bookkeeping first, async setup in a shared `ready` promise, every handler registered synchronously and gated on `await ready` (verified socket.io drops events with no listener). `disconnect` also awaits ready — closes the flap-during-setup leak that left dead socket ids showing students perpetually online. |
| **task-command ordered missions by frozen orderIndex** | backend `teacher.ts`, `weekConfigMigrations.ts` | task-command now maps missions through WeekConfig task order (same as shift-status + student queue) — prod W1-3 rows had deterministically transposed cloze_fill↔vocab_clearance, mistargeting skip/send-to/reset. Startup migration also heals drifted orderIndex values. |
| **`GET /online-students` cross-tenant + dead** | backend `teacher.ts`, `api/teacher.ts` | Deleted: unscoped (any teacher could enumerate every class) and never called by any code in any revision. |

**~13 finder claims remain unverified** (chunk 3 pending approval) — all P3-guess except: teacher socket never joins rooms for classes created after connect (P2), move-to-shift mid-write race (P2), dictionary/season reset loader races (P2), dictionary `/encounter` ungated mastery farming (NEW, found during chunk-2 verification — strictly easier to farm than the writing path).

## ✅ Batch 6 — 2026-06-11 (final verification chunk: 14 claims verified — 9 confirmed, 5 partial, 0 refuted — all actionable findings fixed; builds + 55 tests pass; UNCOMMITTED)

**The verification backlog is now CLOSED: every finder claim from the June sweep has been adversarially verified and either fixed or explicitly dispositioned.**

| Fix | Files | Notes |
|---|---|---|
| **P1: class created mid-session had dead live-monitoring + a pause trap** | backend `classes.ts` | Teacher's live sockets now `socketsJoin` the new class's staff room on creation — previously pause-all on a new class locked every student while the confirmation never reached the teacher (no Resume button until refresh). |
| **Move/reset race: in-flight writing eval re-created deleted rows** | backend `utils/moveEpochs.ts` (new), `teacher.ts`, `submissions.ts` | Per-pair move-epoch bumped by move-to-shift + all task-commands; `/evaluate` snapshots it before the OpenAI round-trip and skips MissionScore + mastery writes if it changed. Class moves also emit `session:shift-changed` per-pair inside the loop (was only after the whole sequential loop). |
| **Replay policy unified: story beats replay, choices don't** | backend `teacher.ts`, frontend `App.tsx` | reset-shift + all three move branches now clear the week's CharacterMessage rows (Betty/Ivan beats re-fire on replay; the dedup suppressed them forever) — always excluding `direct_message` (Clarity Minder threads; the per-week DELETE was wiping those too). Frontend re-syncs the inbox after reset/move. KEPT by design: NarrativeChoice (votes not re-cast, spy dice not re-rolled) + Citizen4488Interaction (Harmony state never reset by shift commands). |
| **Score validation** | backend `teacher.ts`, `shifts.ts` | Teacher PATCH + student POST both reject non-finite / out-of-[0,1] scores with a 400 (closes the tracked backend-P2 sibling — which needed no migration). |
| **Ungated mastery farming via dictionary/vocabulary encounter routes** | backend `dictionary.ts`, `vocabulary.ts`, frontend `dictionaryStore.ts` | The +0.1/call mastery bump (the verified-production rate, for a passive word view, with no dedup/rate limit) is gone — encounters/lastSeenAt only; one-time 0.1 first-encounter seed kept (doctrine-sanctioned). Legacy vocabulary route de-fanged identically. |
| **Loader staleness epochs (shared-Chromebook logout races)** | `dictionaryStore.ts`, `seasonStore.ts`, `messagingStore.ts`, `spyStore.ts` | Same epoch pattern as Batch 5's shiftQueue/shift stores: in-flight fetches that outlive logout can no longer write student A's words/weeks/inbox/spy-state back into B's cleared store (where the length-gates then suppressed B's refetch). |
| **pearlStore session teardown** | `pearlStore.ts`, `sessionStore.ts`, `studentStore.ts` | Full `reset()` (bark log was rendered to the next student via PearlPanel/MessagesApp "Recent Messages"; undismissed announcements; eye arc); `resetConcern` also clears latent `attemptCounts`/`lastGrammarError`. |
| **Open Pool reconnect resilience** | `inscriptionSocket.ts`, `inscriptionMatchmaking.ts`, `InscriptionDrill.tsx`, `inscriptionStore.ts`, `App.tsx` | Mid-race reconnect re-enters the drill AND lobby rooms (opponent desks froze; missed pause/resume now replayed from DB state); queued students re-join on reconnect (`queueWeekNumber` kept; server join dedups by pairId) and evicted entries get an in-register queue-error to their per-pair room (waiting room no longer hangs at 0s forever). |
| **Dead socket emits dispositioned** | `inscriptionSocket.ts`, `teacher.ts`, `App.tsx`, `InscriptionDrill.tsx` | `inscription:roll-updated` WIRED (Roll of Distinction now live-refreshes); keystroke-tick pipeline DELETED server-side (no renderer ever existed; the drill room only contains the owner; killed the never-evicting throttle map + per-keystroke traffic); `teacher:comment-updated` emit DELETED (+2 DB queries per comment save); `inscription:drill-complete` KEPT for a future live-standings wire-up (logged below). |
| **Render-phase status emits → parked-state effect** | `ShiftQueue.tsx` | gated/shift-complete emits moved into a transition-keyed effect with reconnect re-assert — was one staff-room broadcast per re-render for every parked student. |
| **Dismissal survives teacher reset** | `ShiftQueue.tsx` | Cleanup effect now also clears `dismissalState`/`dismissalUrlRef`/`showDismissalSkip`/`pendingTriggerRef` — no more full-screen video over a redirected shift + premature task_complete trigger. |
| **Stale mount-time task_start** | `ShiftQueue.tsx` | The loadMessages `.then` reads the LIVE task index (and bails if the week changed mid-load) — a fast first task no longer eats the real current task's character message. |
| **Mission.config RMW races (P3, verified-confirmed)** | — | DEFERRED with cause: ms-scale window, two of four sites UI-dead, single-teacher ops, trivial recovery. Logged here so it isn't re-found. Same for: per-drill live final-standings wire-up (`inscription:drill-complete`), the legacy `vocabulary.ts`/`SafeProperApp` dead-code deletion, and DrillPromptCard's now-inert keystroke plumbing. |

## ⬜ P0 — must fix (high user impact)

- [ ] **PEARL voice doctrine in the Clarity Inquiry** — `spyFiles.ts:246,294,345,398,399` use contractions + first-person `I'll`/`We'll`/`isn't`. PEARL is institution-as-speaker (no contractions, no "I", passive). Rewrites drafted: "…This will be withdrawn — and noted." / "This recording will be sealed…" / "That will be corrected — and noted." / "It will be corrected. You may run along." / "This will be sealed — and your terminal watched closely."
- [x] ✅ 2026-06-10 (Batch 2 — 4 production items added incl. `present`; floor wording note: doctrine says 4+, not ≥3×) **TOEIC vocab under-coverage** — `week4.ts` `vocab_clearance`. `arrange` + `record` tested once each (recognition only); `locate`/`organize`/`collect` reach only 2× for Standard/Independent lanes. Add `toeic_p5` production items: `record`→"The system _____ each entry automatically." (`records`); `arrange`→"Please _____ the observations in time order before filing."; `locate`→"We could not _____ the missing file." Doctrine floor is ≥3× across modalities.
- [ ] **Teacher class-switch shows stale / overwritten cards** — `ClassMonitor.tsx:139-149`. `loadStudents()` never clears `students` and has no cancellation token; slow Class-A fetch can overwrite Class-B. Add `key={classId}` + per-fetch `expectedClassId` guard.
- [ ] **Own freshly-submitted Harmony post hidden 15-40s** — `HarmonyApp.tsx:1876-1907`. Drip hold slices off the newest posts incl. the student's own. Split own vs others; always render own, drip only others.

## ⬜ P1 — should fix (wrong behavior / edge races)

- [ ] 🔄 **Teacher task-command targets wrong task** — `teacher.ts:1988` uses "first mission with no score row" while `:64`/student client use `details.status === 'complete'`; diverge during a Shift-Report re-draft. Use the completion predicate in both; fix the send-to-task "already scored" loop at `:2058` too. *(started, not committed)*
- [x] ✅ 2026-06-10 (Batch 4 — onShiftChanged now calls sessionStore.resetRateMachine()) **Teacher shift-transfer doesn't clear the rate machine** — `App.tsx:143` (`onShiftChanged`) calls `shiftQueueStore.reset()` but not sessionStore; leftover buffer/stage can fire a clawback against the prior shift. Call the new `sessionStore.resetRateMachine()` (NOT `resetConcern()` — score must persist across a transfer).
- [ ] **Gradebook score edit/delete swallow errors → phantom success** — `Gradebook.tsx:500-523`. try/finally with no catch closes the editor as if it saved. Add a catch, surface inline error, keep editor open.
- [ ] **Word Pool cooldown timer frozen** — `InscriptionLobby.tsx:74` / `inscriptionStore.ts:163`. Nothing decrements `cooldownRemainingSec`; Solo stuck-disabled until reopen. Add a 1s `setInterval`.
- [ ] **`useMediaRecorder` leaks an AudioContext per recording** — `useMediaRecorder.ts:30`. Store in a ref, `.close()` in onstop + unmount (Chrome caps ~6 → silent failure).
- [ ] **`WordSort` has no attempt cap + never calls `addConcern`** — `WordSort.tsx:45`. Mirror WordMatch (attempt counts, lane-gated `addConcern`, auto-place after max).
- [ ] **Live concern chip frozen** — `ClassMonitor.tsx:676`. `liveConcern[id]` never cleared, masks rising concern after any remediation fires. Reconcile per-pair on each poll.
- [ ] **`wordBankChinese: true` renders English-only chips** — `LaneScaffolding.tsx:44` (codebase-wide W1–4). Render `translationZhTw` (shown-by-default at Lane 1). *Depends on the dictionary-rows migration for data.*
- [ ] **Latent: legacy `addConcern` is 0-100 scale but forwards to the 0-5 rate buffer** — `sessionStore.ts:263`. Only dead legacy callers hit it today, but a single `addConcern(10)` would slam the HUD red the instant any non-queue week ships. Stop forwarding, or delete the 100-point path with the legacy system (see Dead Code).

## ⬜ P2 — latent / polish (batch when convenient)

- [ ] **"Swallowed error → false success" cluster** — Compliance/Clarity show "VERIFICATION RECORDED" on a failed POST (`ShiftQueue.tsx:462`, `ClarityCheck.tsx:104`); move the local "completed" mark into the success path so a transient failure re-prompts.
- [ ] **Timer-leak cluster** (post-unmount setState, silent under React 19) — `PrioritySort.tsx:226`, `WordMatch.tsx:130`, `ClozeFill.tsx:112`, `PearlMessageStrip.tsx:100`. Track timer ids in a ref, clear on unmount.
- [ ] **ConcernTooltip "recent activity" line permanently dead** — `ConcernTooltip.tsx:61` reads `concernRateBuffer` as a `number` (it's `RateBufferEntry[]`); sum the buffer in the selector.
- [ ] **ShiftReviewModal can render >100%** — `ShiftReviewModal.tsx:47`. Mirror `Gradebook.computeCell` (filter valid types + clamp [0,1]).
- [ ] **Harmony bulletin MCQ loses correct/incorrect markings on collapse+re-expand** — `HarmonyBulletin.tsx:130`; persist `{chosenIndex, correctIndex, isCorrect}`. **DailyVocabAudit re-shuffles mid-task** on feed refresh — `HarmonyApp.tsx:186`; key the shuffle on stable content.
- [ ] **IntakeForm comprehension options not shuffled** — `IntakeForm.tsx:354` (telemetry gameable). Also audit `ComprehensionDoc` / `ContradictionReport` for the same on graded questions.
- [ ] **PEARL bark strip** leaves `activeBark` set on unmount (stale re-type on re-entry) + untracked 8s collapse timer — `PearlMessageStrip.tsx:100,116`.
- [x] ✅ 2026-06-10 (Batch 2 — messagingStore.reset() clears it on logout/401) **`inFlightKeys` dedup Set never clears** — `messagingStore.ts:41`; can suppress a second student's bark. Delete the key on success or `clear()` in logout.
- [x] ✅ 2026-06-10 (Batch 2 — skip stores empty text + display gated on value===submitted) **Drop Box "skip" still echoes typed text** in Frey's channel — `spyStore.ts:111`; gate the echo on `c.value === 'submitted'`.
- [ ] **`WordgineeringDecoder`** has no guard if a future `truth ∉ options` (unwinnable) — add a DEV assert + degrade-to-correct.
- [ ] **App-root socket effect re-fires `loadMessages` on displayName/StrictMode churn** — `App.tsx:152,265`; narrow deps to `[user?.id, user?.role]`.
- [ ] **Remediation cooling-down fallback never starts the idle timer** — `RemediationOverlay.tsx:85` (dead today); set `'idle'` instead of `'cooling-down'`.
- [ ] **`auth:required` event dispatched with no listener** — `utils/socket.ts:66`; add an App-root listener or delete the dead signal.
- [ ] **boot-seen / chunk-reload sessionStorage survive logout** — `BootSequence.tsx:41`; `sessionStorage.removeItem('boot-seen')` in logout.
- [ ] **PauseOverlay mounted in GameShell, not App root** — `GameShell.tsx:51`; hoist to App root under the student guard.
- [ ] **RemediationModule lacks `key={moduleId}`** — `RemediationModule.tsx:63` (latent stale state; unreachable in prod).
- [ ] **Backstop trigger only fires from `idle`, not `warned`** — `sessionStore.ts:212`; hoist the `>= 3.0` check above the stage switch.
- [ ] **Mission lookup by `task.type` collapses duplicate-type tasks** — `shiftQueueStore.ts:59` (safe today; assert unique top-level types per WeekConfig).
- [ ] **PearlSphere3D leaks a `canplay` listener** — `PearlSphere3D.tsx:406`; return a cleanup.
- [ ] **Inscription stale `errorsRecovered`** on auto-advance keystroke — `DrillPromptCard.tsx:158`; use a ref.
- [ ] **DutyRosterApp refetches the whole season on every open** — `DutyRosterApp.tsx:11`; guard on `weeks.length === 0`.
- [ ] **Harmony minor** — `submitVerdict` answered-already guard (defense-in-depth); `classOnline` presence count never resets on disconnect.

### Backend P2 (need a DB migration — defer unless they bite)

- [ ] **Remediation `/trigger` findFirst+create is non-atomic** — `remediation.ts:107`. Code-only mitigation: add an in-flight guard in `sessionStore.fireTrigger` (snapshot stage before the await). Full fix needs a filtered partial-unique index (raw SQL) + `P2002` catch.
- [ ] **`NarrativeChoice` writes have no uniqueness** — only consumer that inflates is the cosmetic profile counter `narrativeChoicesMade` (`student.ts:80`). Code-only fix: make that `count` distinct-by-key. (Or `@@unique([pairId, choiceKey])` + upsert + a dup-collapse migration.)
- [ ] **`getCurrentWeekNumberForPair` returns "furthest reached"** — `progression.ts:3`; derive from latest incomplete shift, or document + audit the Harmony delta call site. (W4 linear path unaffected.)
- [x] ✅ 2026-06-11 (Batch 6 — rejects non-finite/out-of-[0,1] with 400; teacher PATCH sibling too) **`POST /shifts/.../score` writes `req.body.score` unchecked** — `shifts.ts:268`; validate `typeof score === 'number' && isFinite` before the transaction (dormant; 500s instead of 400 on bad input).

## ⬜ Shift-4 content / pedagogy (not code bugs)

- [ ] **Betty double-messages at Task 1** — `week4.ts:521` (shift_start) + `:705` (interTaskMoment) share the hook + a byte-identical response. Make the post-task beat forward-leaning toward the Reconciliation Desk.
- [ ] **Ivan re-asks the Obs-E question 3×** — `week4.ts:540-600`, `:733`. Escalate his anxiety instead of repeating.
- [ ] **Ivan toast collides with the silent Frey bridge** — `document_review` has no `clipAfter`, so the toast + bridge fire together (`ShiftQueue.tsx:378`). Defer the message to after the inter-task moment, or move Ivan to `task_start` on `cloze_fill_w4`.
- [x] ✅ 2026-06-10 (Batch 2 — word_match pair reworded; `record` dual-POS definition also fixed) **`organize` defined via `arrange`** (circular, co-taught) — `week4.ts:53,58`. Reword: "to put things into a clear, tidy system."

## ⬜ Dead code to delete (bundle + landmine removal)

- [x] ✅ 2026-06-10 (deleted) **`EditedWindow 2.tsx`** — stale macOS duplicate (untracked, unimported).
- [ ] **Legacy phase-shift system** — `components/shift/*`, `PhaseRunner`/`PhaseRenderer`/`PhaseNav`, the 7 step components, `components/activities/*`, `RecordingWidget`, `sessionConfigStore`, `api/sessions.ts`, the dead branches in `ClarityQueueApp.tsx:246`. Dead at runtime (every built week is `shiftType:"queue"`); removes the 0-100 concern-scale landmine. Keep `sessionStore`/`SystemAuditOverlay`/`seasonStore`.
- [ ] **Orphan components** — `MessagesApp`, `DailyProvisionApp`, `SafeProperApp`, `FrostedGlassPlayer`, `scenes/MinistryOffice`, `PearlBark`, `PearlMessageBar`, `TerminalLayout`, full-screen `EditedApp`. Zero importers; `npm run build` confirms.

---

## Coverage caveats

- The `app-frontend-sweep` and `w4-task-wiring` find-agents (first pass) and `shift-queue-runtime` (second pass) were blocked by a false-positive cyber-content filter; those surfaces were backfilled by hand and by adjacent dimensions, but a broad re-sweep of shift-queue runtime would add confidence.
- Several findings (shared-device leak symptoms, wake-from-sleep logout, class-switch race, Word Pool timer) are deterministic from the code but worth a **two-students-on-one-device / throttled-network live confirmation** after the fixes land.
- The two unbuilt Shift-4 headline beats (Frey briefing-video hijack + login-glitch reveal) are **deferred Canva assets**, not broken paths — tracked in `next-work.md`, not here.
