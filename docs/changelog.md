# Changelog — The Lexical Republic

Day-by-day work history. Moved here from `CLAUDE.md` on 2026-04-30 to keep the always-loaded instruction file lean. New entries go at the top.

---

## 2026-06-11 PM (spy visibility fix + Frey onboarding + dark-lead retry)

Three commits, all pushed. `60c4eca`: `[ ].edited` spy surfaces (`.edited-pill`/`.edited-window`) hidden during Compliance AND Clarity Check lockouts — ClarityCheck now broadcasts `body.clarity-check-active`; the spy window's z-90 tied with ClarityCheck's and won by DOM order. `46f4013`: `FreyIntroOverlay` — one-time Frey-voiced note on the first terminal-desktop visit with W4 unlocked explaining the Records Wing tile and the corner `[ ]`; persists as NarrativeChoice `w4_funnel_intro`; PEARL island suppressed via `body.frey-intro-active`. `5858853`: dark Records Wing leads reopen after a 10-min cooldown (`SNOOP_RETRY_COOLDOWN_MS`) — `spyStore.darkAt` + time-aware `startExtract` + `DarkLead` retry card; one bad roll no longer locks the spy loop permanently (`funneled` stays locked). Parked, known-unfixed: compliance `/complete` trusts client `correct` flags (grade forgery); `cumulativeReviewCount` POST default is NaN (`Number(...) ?? 2`).

---

## 2026-06-11 (audit batch 6 — verification backlog CLOSED)

Final chunk: 14 claims verified (9 confirmed, 5 partial, 0 refuted) — every finder claim from the June sweep is now adversarially verified, and all actionable findings are fixed. Highlights: a class created mid-session now joins the teacher's live sockets to its staff room (the pause-trap with no Resume button is gone); a per-pair move-epoch stops in-flight writing evals from re-creating rows a teacher command just deleted; the replay policy is unified (story beats replay on reset/move — Betty/Ivan re-fire — while votes/spy-rolls/Harmony state persist by design; Clarity Minder threads are never wiped); the ungated +0.1/view dictionary mastery bump is gone (encounters only); four more stores got logout staleness epochs (dictionary/season/messaging/spy) and pearlStore got a real reset (student B no longer sees A's bark log); Open Pool survives reconnects (drill+lobby room re-entry with pause/resume replay, queue re-join + eviction notice — no more waiting rooms hanging at 0s); the Roll of Distinction live-refreshes (its update event had never been bound); the keystroke rebroadcast pipeline and the comment-updated emit are deleted (dead wire traffic); gated/shift-complete teacher-monitor emits moved out of the render phase; dismissal videos no longer survive teacher resets; the mount-time task_start race is closed; score writes validate [0,1] on both teacher and student endpoints. Deferred with cause (logged in the tracker): Mission.config RMW races, live final-standings wire-up, legacy vocabulary dead-code deletion. Builds + 55 tests pass.

---

## 2026-06-10 (whole-app re-audit + remediation batch 2)

Multi-agent whole-app audit (grounding → 32 adversarially-verified bug candidates → Shift-4 wiring/pedagogy synthesis → 48-idea activity brainstorm) followed by a 23-fix batch. Full table in **[`audit-remediation-2026-06.md`](audit-remediation-2026-06.md)** "Batch 2"; session state + resume pointers in `memory/project_full_audit_2026_06_10.md`.

### Headlines

- **P0 grade corruption fixed**: `ShiftClosing` was re-submitting the final task's mission with `score=1` on every shift close AND remount, overwriting the Shift Report's real vocab score and reverting teacher edits (W1–W4). The vestigial clock-out block is deleted.
- **P0 data-loss footgun fixed**: teacher "Delete All" deleted students across ALL classes while confirming with one class's count — now class-scoped end-to-end (`?classId=` required + ownership check).
- **Grade-integrity batch**: VocabClearance → first-try scoring (matches siblings; Gradebook % now agrees with its own answer log); ErrorCorrectionDoc answer-change-after-feedback exploit closed; DocumentReview score = item-weighted sum + `errorsFound` restricted to real errors; `/submissions/evaluate` validates missionId + ClassWeekUnlock + 20s OpenAI timeout; unlock gate added to the two sibling MissionScore writers.
- **Shift-4 pedagogy batch** (config-only): vocab_clearance items #1/#3 disambiguated; +4 production items for under-covered targets (record/arrange/locate/present) + W2 `compare` review item; doc_adjustment extended with collect/organize past-tense errors (8 aligned Lane-1 hints); `organize`/`record` definitions fixed; Betty's shift-start message now models collect/examine/verify/record (Input-phase patch until Clip A ships); W4 PEARL tip authored. W1 doc_schedule's 6-hints-for-7-errors misalignment fixed (same class as the W4 batch-1 bug).
- **W4 epilogue hardened**: recruitment vote (W5 gate) no longer silently lost on a failed request — resolver re-runs the epilogue, modals retry in-register; Drop Box skip no longer echoes unsent drafts.
- **Shared-device + multi-class**: `resetSessionStores()` cascade now covers messaging/harmony/inscription stores and runs on BOTH logout and `refresh()` 401; teacher pause state is per-class (map keyed by the classId the server already sent) + replayed to teachers on reconnect.
- **Other backend**: censure-respond mastery replay-farming closed (first answer or ≥7-day re-encounter); NPC-post flag no longer hides the 4488 arc class-wide; teacher harmony delete + inscription roll now ownership-scoped; compliance 6-question cap honored + `/pending` serves the archived question set; W4 Harmony no longer burns an OpenAI call per open; dictionary migration dup-row fix (`record`/`verify` existed as W1 seed rows).
- **Builds + 55 vitest pass.** `EditedWindow 2.tsx` duplicate deleted.

### Batch 3 (same day, evening — after the resumed sweep re-confirmed the open list against the fixed tree)

Seven more fixes: Clarity Check one-shot is now server-backed (`GET /clarity-check/completed` + ShiftQueue hydration — refresh no longer replays the lockout quiz); `GET /shifts/season` teacher 500 (ShiftResult has no `userId` column); `PATCH /shifts/concern` result clamped `[0,100]` in a transaction (negative-spam floor); shift-result re-post no longer stomps `concernScoreDelta`; Batch-2's patchConcern rollback gained a shift-epoch guard; Open Pool anti-fatigue now considers ALL members (`pairIds[]` intersection, was group[0] only); trial dispatch falls back to the highest unlocked week instead of week 1 (+ InscriptionLobby now uses the shared `getHighestUnlockedWeek` util). Deferred with cause: censure answer-key shipping pre-answer (farming already closed; needs respond-API reshape). The resumed sweep also independently re-verified the Batch-2 fixes against the working tree ("already fixed" verdicts). Builds + 55 tests pass.

### Batch 4 (night — verification chunk 1: 10 claims verified, 10/10 confirmed, all fixed)

The writing pipeline was as broken as the finders guessed: Layer-1 fails (too short / low vocab) were coerced to "off-topic", falsely blocking Submit Anyway and feeding a permanent attempt-3 lock that never re-evaluated rewrites; PrioritySort held students to a hidden 30/40-word backend floor against its own "1-2 sentences"/10-word guidance; the on-topic veto was structurally OFF for PriorityBriefing/PrioritySort (no prompt/context sent to the rubric); PriorityBriefing recorded a flat 1.0 under category 'writing'. All fixed: Layer-1 fails carry `onTopic: true` + fail-open frontend coercion; attempt-3 re-evaluates and auto-passes fresh on-topic rewrites; `metadata.minWordCount` threads each task's real floor to the backend; both tasks pass writingPrompt/taskContext; PriorityBriefing emits its real vocabScore + full rubric fields. Plus: persistent socket reconnect re-emits + `mergeHollowStatus` (teacher card no longer blanks after a >5s Wi-Fi blip); reset-shift/per-week-reset re-create the current-week marker (no more week regression / second-click grade destruction); send-to-task + score-delete convert ShiftResult to a marker (re-draft students no longer locked out); move-to-current-shift soft-lock fixed (queue-empty reload gate + shiftStore reset + `resetRateMachine()` — also closing the long-tracked rate-machine P1); completeTask post-await freshness guard (teacher commands can't be clobbered mid-POST). Builds + 55 tests pass.

### Batch 5 (late night — verification chunk 2: 10 verified, 10/10 confirmed, all fixed)

Another clean sweep, with the privacy finding upgraded: `student:registered` was broadcasting minors' REAL NAMES to every classmate's browser, alongside live fail counts, remediation triggers, private clarity replies, and teacher comments — teachers now sit in a separate `class:{id}:staff` room and all teacher-bound emits target it. The socket connection handler was restructured (sync registration + shared `ready` gate) so connect-time emits are never dropped during the enrollment query (the unlogged cause of "Loading task info…" cards — also fixes a flap-window leak that showed students perpetually online). Grade integrity: the writing mastery bump is now veto-gated per §6.1; Submit Anyway after a network failure floors at the documented 0.3 (was clamping to 0.1); degraded auto-passes carry `isDegraded` so teachers can tell "AI never saw this" from a real 0.3; and the entire server-side eval/pearlFeedback persistence path turned out to be DEAD CODE since March (no caller ever passed missionId) — now wired through ShiftQueue → writing tasks, so rubric data and PEARL feedback survive crashes. Classroom resilience: a failed score POST now shows an in-world retry banner ("TRANSMISSION INTERRUPTED — ↻ Resubmit to Bureau") instead of silently stranding the student; loadWeekConfig/loadWeek gained staleness epochs (wrong-week score writes); the shift_end check can no longer be clobbered by the after-task cascade; task-command now follows WeekConfig order (prod W1-3 DB order had cloze_fill↔vocab_clearance transposed — teacher skip/send-to were mistargeting); the unscoped, never-used `GET /online-students` endpoint is deleted. Builds + 55 tests pass.

### Still open

- ~13 unverified finder claims (chunk 3 awaiting approval) — mostly P3-guess; notable P2s: teacher socket misses rooms for classes created after connect, move-to-shift mid-write race, dictionary/season reset loader races, and the newly-spotted ungated `POST /dictionary/:wordId/encounter` mastery bump (easier to farm than the writing path was).
- Activity-brainstorm judging/synthesis paused (48 ideas generated; resume pointers in memory).
- Deferred from the audit: Cipher `[ lexicon ]` tab functional + auto-reveal study line; mutation→Doc-B blank flash; ShiftClosing W4 PEARL Observation card wiring; W4 Harmony static content authoring; censure answer-key withholding.

---

## 2026-06-09 (June audit + remediation batch 1)

Two verified multi-agent audits + the first batch of fixes. Full prioritized checklist + status in **[`audit-remediation-2026-06.md`](audit-remediation-2026-06.md)**.

### Audits

- **Shift-4 deep review** (8 dimensions, adversarially verified): wiring, narrative/dialogue, TOEIC vocab + answer-key integrity, pedagogy. **All 35 MCQ/cloze answer keys recomputed correct.** Surfaced a prod data gap (W4 dictionary rows), a PEARL voice-doctrine violation in the interrogation lines, vocab under-coverage, and the Lane-1 hint misalignment.
- **Frontend bug sweep** (10 subsystems, 60 verified findings): dominant theme = shared-device state leakage on logout; plus `refresh()` mid-shift logout, teacher class-switch staleness, Harmony own-post hidden by the drip, and a large latent/dead-code tail. *(Three find-agents were blocked by a false-positive cyber-content filter and backfilled by hand.)*

### Remediation batch 1 (applied, both builds pass)

- **Lane-1 grammar scaffold** — `DocumentReview` now reads the student's real lane (was hardcoded `2`, so Lane-1 students never got `ErrorCorrectionDoc` hints); `week4.ts` `laneHints` rewritten to 6 error-aligned entries (was 4, misaligned, last two errors hint-less).
- **Shared-device logout hygiene** — `studentStore.logout()` now resets every session-scoped store (was spyStore-only). Added `seasonStore.reset()`, `dictionaryStore.reset()`, and `sessionStore.resetRateMachine()` (machine-only, preserves DB-backed concern score; `resetConcern()` now routes through it + clears `inscriptionDrillActive`).
- **`refresh()` 401-only guard** — transient network errors (Chromebook wake-from-sleep) no longer log the student out mid-shift; genuine 401/403 still clears + disconnects the socket.
- **Concern-delta reset on self-driven shift change** — `shiftQueueStore.loadWeekConfig` zeroes the carried delta when entering a different shift (X/Home re-entry bypassed `reset()`).
- **W4 `DictionaryWord` rows in prod** — new `ensureDictionaryWordsForAllWeeks()` startup migration (`weekConfigMigrations.ts`) + authored enrichment (`week-configs/wordEnrichment.ts`), wired fire-and-forget in `index.ts`. Idempotent, create-only, Black Words excluded. Restores writing-mastery, Compliance authoring, and Remediation/Clarity coverage for the 8/10 W4 words that had no row (seed stops at W3 and doesn't run on Railway).

---

## 2026-06-03 (CLAUDE.md slim-down + W4 multi-document Cipher Decryption)

Full daily summary in `Dplan/Daily_2026_06_03.md`. Two commits, fast-forwarded to `master`.

### CLAUDE.md slim-down (`94067a8`)

Root `CLAUDE.md` 166→49 lines (−87%). Moved the full ~64-entry Locked Decisions log, status/backlog, and code-map into themed `docs/` files — **`docs/locked-decisions.md`**, **`docs/code-map.md`**, **`docs/next-work.md`** — keeping only always-on canon + an index in the root. A 7-agent audit verified zero content loss; promoted **"never score grammar on open writing"** back into the root as a one-liner.

### W4 multi-document Cipher Decryption (`57465e9`)

`cloze_fill_w4` rebuilt from a single cloze into a **3-document redacted-reveal**: restore Citizen-9020 (the person — witness/relative/private) → the rewritten record (cover-up — independent/individual) → Citizen-4488 flagged next (the watcher becomes watched — reassignment/private). Each restored record **uploads to `[ ].edited`** via a transfer animation + `w4_cipher_<id>` NarrativeChoice, surfacing in Frey's channel under "the files you restored." `CipherActivity.tsx` full rewrite (redacted `████` tap-to-decrypt, lane-aware, forced-exposure, multi-doc state machine, scores once); `spyStore` gains `restoredCiphers` + idempotent `uploadCipherDoc`; `FreyChannel` + `EditedWindow` updated. All 5 Black Words covered. 4-agent review → fixed 2 answer-key ambiguities + timer/upload hardening. Both builds pass. Optional Records Room snoop layer untouched.

### Local-dev login

Diagnosed the local teacher/CA-1 login failure: backend crash-loops because `backend/.env` lacks `JWT_SECRET` (mandatory at module load). Local-only — deployed site unaffected.

---

## 2026-05-29 (audit + Harmony overhaul M0–M3 + Shift 3 cleanup + teacher real-time)

Full daily summary in `Dplan/Daily_2026_05_29.md`. Highlights below. Five commits, all fast-forwarded to `master`.

### Fine-comb audit (40-agent workflow)

22 confirmed findings / 7 refuted. `[ ].edited` verified working end-to-end. Narrative arc coherent (Shift 4 strongest-built). Records Room → two redesign directions; user chose **Direction B (case-file dossier)** — not yet built. Harmony diagnosed loop-poor → drove M0–M3.

### Bug-fix batch (`6d7f4c0`)

- HIGH: `InscriptionDrill` added to the Pair cascade-delete (students who used Word Pool were undeletable — P2003).
- HIGH: Citizen-4488 arc stalled at W4 — `harmonyGenerator` now reads `WeekConfig.citizen4488Post` for W4+, `ShiftClosing` falls back to it.
- MED: routed `remediation.ts` (×3) + `socketServer.ts:382` emits off the dead global `'teacher'` room to per-class rooms.
- MED: `spyStore.reset()` now fires on logout (shared-Chromebook leak).
- MED: guarded the unfillable W4 `censure_redact`/`censure_triage` quota (was a wasted OpenAI call every open) + authored 13 W4 static censure items.
- SEC: `GET /pearl/messages` auth; `censure-respond` non-censure/cross-class guards.

### Harmony engagement overhaul M0–M3 (`6d7f4c0`)

- **M0:** censure double-count fix; transient/dismissible PEARL annotations; W4 Review queue.
- **M1:** PEARL goal banner + shift-end Compliance Report; Harmony Credits (HC); propaganda ticker + 4488 glitch + PEARL-eye glyph.
- **M2:** client-side feed drip + "↑ N NEW" pill + per-tab NEW dots; live class-presence chip (new `class:presence` socket, class-scoped); 4488 "typing…" indicator.
- **M3 — verdict loop:** new `feed_review` post type (verdict packet in `censureData`, no migration); inline Approve/Flag; 3-step flag modal (rule → tap word → replacement chip); verdicts in `HarmonyCensureResponse` (refresh-safe). New `backend/src/data/harmonyVerdictPosts.ts`.

### Live-feedback round (`d18975a`)

- Feed drip rewritten **index-based** (filing a verdict no longer reshuffles the board); slower/randomized cadence; background generation for instant steady-state load.
- **Approved-Sentiment** rule (`conduct_sentiment`, "Conduct Code §5") — fault/condemn flagged via tap-word → Party euphemism (dystopian inversion). 6 posts/week spanning praise→fault→condemn with woven target words.
- **Daily Vocabulary Audit** match-card (`auditPairs` from `DictionaryWord`; once/shift; awards HC).

### Shift 3 cleanup (`d8dd96c`)

No bugs found — coherence + data hygiene. Recast Case 5 complainant 7291→7720; paid off the **Wellness Division** thread in W4 via Ivan's beat; re-threaded the 4488 cat line; `delay` noun→verb + de-duped dictionary rows (`seed.ts`, fresh-seeds only); refreshed the stale W3 `storyPlan`.

### Teacher real-time (`f201729`)

Core pipeline verified live. Fixed: cold-socket initial task list (`once('connect')`); ClassMonitor `now`-tick 30s→5s; bound `student:remediation-completed/-clawback` (live "↩ clawed back" badge + "Concern: X.X" chip); WritingEvaluator unconditional progress-clear; `emitToStudentClass` warns on null `classId`.

### ClassMonitor grid (uncommitted)

`items-start` on the student-card grid so only the clicked card expands (default `align-items: stretch` was stretching row-mates).

---

## 2026-05-27 (`[ ].edited` reborn as a draggable, glitchy contraband window)

Full daily summary in `Dplan/Daily_2026_05_27.md`. Highlights below.

### Draggable glitchy `[ ].edited` window + upload bar (`967c03d`)

Rebuilt the `[ ].edited` channel (the `FunnelDrawer` panel) from a fixed right-anchored side drawer into a **draggable, deliberately rough/suspicious floating window** — `frontend/src/components/terminal/apps/EditedApp/EditedWindow.tsx`.

- **Drag** by the title bar via Pointer Events (mouse + touch, `setPointerCapture`, `touch-action: none`), viewport-clamped, position persisted in a module-level `savedPos` (the drawer unmounts off-terminal). **No backdrop** — the wrapper is `pointer-events-none`, only the window box is `pointer-events-auto`, so it floats over the live Party work (peek behind it = the insider feel).
- **Rough chrome:** square corners, dashed hairline border, `⠿` grip, `unsigned build · source unknown` subtitle, fake-broken `[–]`/`[▢]` controls (only `[✕]` works).
- **Upload bar** at the bottom climbs → stalls → resets → retries but never completes (a covert transmission that can't be trusted to hold; throttled `setInterval` ~320ms, "N packets queued" reads `spyStore.resolved`).
- **Glitch** (`.edited-window` in `index.css`): rare window stutter, rose tear line, title chromatic-split, baked scanlines, upload-fill flicker, glitchy pill — all paused while dragging + killed by the global `prefers-reduced-motion` rule.
- `FunnelDrawer.tsx` renders `EditedWindow` instead of the side drawer. Honors the dead-internet aesthetic. The commit also bundled in-flight spy WIP (rename `DoublespeakDecoder → WordgineeringDecoder` + `ExtractionOverlay`/`spyFiles`/`spyStore` edits).

### Corner `[ ]` launcher itself draggable (`e536c78`)

The window was draggable but the corner `[ ]` pill that opens it was still a fixed button — so dragging the *visible* launcher did nothing (the reported bug). Made the pill (`FunnelPill`) **drag-to-move**: Pointer Events, viewport-clamped, position persists; a clean tap (movement < 4px) still opens the channel, a drag swallows the trailing click so it won't open. `onClick` kept for keyboard (Enter/Space). Mouse + touch.

### Git

Both commits landed on `docs/remediation-module` and were fast-forwarded onto `master` (tip `e536c78`, server-verified with `git ls-remote`, never force-pushed). Frontend `npm run build` (`tsc -b` + Vite) clean throughout.

---

## 2026-05-26 (Live Open Pool matchmaking + Word Pool names/polish + terminal cleanup)

Full daily summary in `Dplan/Daily_2026_05_26.md`. Highlights below.

### Word Pool icon — normalize + cache-bust (`13a0853`, `8d78cdb`; late 05-25)

The uploaded icon was byte-identical to the deployed one; the real issue was format (1254×1254 opaque square vs the peers' 1536×1024 transparent landscape). Reformatted the asset to the canonical format (flood-fill the uniform bg to transparency, center the tile to match peers) and deleted the special-case `h-[160px]` render branch — Word Pool now uses the identical full-image tile path. **Supersedes** the 05-25 "square + `h-[160px]`" approach. Then renamed `inscription-pool-icon.png` → `-v2.png` to cache-bust (the stable `/images/` path is 1-day cached, so an in-place swap left clients on the old image rendered at 240×240 with an opaque "box").

### Real identities in races (`6484193`)

Players were labeled with a `Math.random()` `C-XXXX`. Now self + lobby + Roll of Distinction show the pair's `designation` (`CA-1`); classmate ghost opponents show their real designation (resolved in `pickGhostRecordings` via `drill.pair.designation` — reverses the prior anonymization, per user request); Ministry NPCs keep `C-000X`. Also excluded the player's own past recordings from the ghost pool. **Gotcha:** `InscriptionRecording.citizenNumber` / the `citizenNumber` field now holds a display label, not necessarily a number.

### Live Open Pool matchmaking (`76292cf`) — the big one

"Open Pool" now matches real online classmates into a synchronized live race (was async ghost-racing). **Per-player drills linked by a shared `lobbyId`** (reuses the dormant scaffolding). New `backend/src/socket/inscriptionMatchmaking.ts`: in-memory queue keyed `classId:lane:weekNumber`; forms on cap (`POOL_MAX_PLAYERS=5`) or wait window; same-lane only; ghost top-up to `POOL_TARGET_DESKS=4`; lone player falls back to solo-with-ghosts. Socket protocol: `join-queue`/`leave-queue`/`queue-update`/`pool-formed`/`participant-progress` (keyed by `pairId`)/`queue-error`. Completion ranks the pool from sibling drills + snapshots it (refresh-safe). Open exempt from the 5-min cooldown. Schema: `InscriptionRecording.pairId` + migration `20260526120000_add_recording_pair_id`. Frontend: `WaitingRoom.tsx`, store `queue` screen, synchronized countdown overlay, live opponent desks via socket. v1 limits: reconnect mid-race doesn't rejoin the feed; in-race drop-out just freezes the desk.

### Prompt polish + 20s countdown (`1caa010`)

Per-character prompt grouped each char as its own flex item, so lines broke mid-word ("sec"/"tor"); now chars are grouped into word-units (`inline-flex`, nowrap) and only break between words. Framed the prompt in a bordered panel + brightened untyped chars (`faint` → standard `phosphor-text`). `POOL_WAIT_MS` 12s → 20s; matchmaker sends a shared `formsAt_ms` deadline; waiting room shows a "starts in Ns" countdown.

### Terminal app frame fills full height (`7584a13`)

`TerminalAppFrame` wrapped children in a `height:auto` `relative` div, so full-height apps (Word Pool's `crt-phosphor-monitor h-full`) only grew to content height and let the cyan desktop bg peek through at the bottom. Made the wrapper `flex-1` in a flex column → definite height → `h-full` fills. One fix covers all Word Pool screens; other apps still sit on the cyan as before.

### `[ ].edited` tile removal + Records rename (`2527c0a`, `30e4a8e`, `e467feb`)

Layered on the user's insider-spy rebuild (`c79f6b3` — reworked `[ ].edited` into a `FreyChannel` reachable via a corner `FunnelDrawer` `[ ]` pill + added a Records archive app; see `Dplan/W4_Edited_App_Spy_Redesign.md`). Removed the redundant large `[ ].edited` desktop tile (it rendered the same `FreyChannel` as the pill); purged the now-dead tile code (render branch, `playEditedGlitch` state/effect, `EDITED_REVEALED_KEY`, unused `useState` import, `.edited-tile-materialize` keyframes — −76 lines); renamed the **"Records Wing" app → "Records"** (display only: tile label, window title, in-app header; id stays `records-room`).

---

## 2026-05-25 (W4 frontend complete + Word Pool 2.0 redesign + class-monitor polish — 15 commits)

Long session covering three threads. Full daily summary in `Dplan/Daily_2026_05_25.md`; highlights below.

### Shift 4 frontend build (commit `91ec935`)

Closed the 5-piece W4 redesign backlog in one large commit. Now functionally complete code-wise — only Clip A and Clip B Canva videos remain.

- **`[ ].edited` app shell** in `frontend/src/components/terminal/apps/EditedApp/`: EditedApp.tsx + LexiconTab.tsx + CipherTab.tsx + DropBoxTab.tsx. Dead-internet aesthetic (plain monospace on dark slate, NOT collage, NOT hand-scrawled). Tap-to-reveal Mandarin. No audio buttons on Lexicon entries.
- **5 TOEIC B1 Black Words** (replaces earlier A1 list): `witness / relative / individual / independent / private`. Mandarin glosses: 證人 / 親屬 / 個人 / 獨立 / 私人. Cipher passage in `week4.ts` rewritten to use `witness` + `relative` for blanks 3 and 4.
- **`CipherActivity.tsx`** wraps the same cloze-fill scoring + lifecycle in `[ ].edited` chrome (`[ ]` brackets instead of underscores, Frey signature on completion). `ShiftQueue.tsx` ID-routes `cloze_fill_w4` to it. Vocab interstitial bypassed for this one task so Unedited register survives until Ivan's next moment.
- **`DropBoxOverlay.tsx` + `RecruitmentModal.tsx`** in `w4/` subdir. `w4Stage` state machine in `ShiftQueue.tsx` cascades them between Shift Report and ShiftClosing, refresh-safe via `fetchNarrativeChoices`. Recruitment vote uses full-sentence buttons (compliant/curious/guarded) — the label IS the narrative beat. Gates W5 content depth.
- **`CaseQueueSidebar.tsx`** — right-column panel (lg+ only) listing today's 4 cases on the Reconciliation Desk. Citizen-4488 marked PRIORITY.
- **`.edited-tile-materialize`** CSS animation — 1.4s stuttery materialize, localStorage-gated to one-shot per pair on first W4 desktop visit.
- **Frey bridge** in `InterTaskMoment.tsx` simplified from styled card chrome to plain monospace dead-internet (matches `[ ].edited`). Removed dead `.unedited-bridge-card` / `.unedited-line-in` / `.unedited-action-button` CSS.
- **Stale code cleaned**: removed `w4FragmentObservation` block in `ShiftClosing.tsx` that read the deprecated `w4_doc_review_frag3` NarrativeChoice from the pre-redesign Evidence Board. Orphan `narrativeChoices` state + fetch + imports removed too.

### Word Pool redesign (commits `5373a19` + 10 follow-ups)

- **Initial commit** (`5373a19`): Inscription Pool feature (multiplayer TOEIC typing drill — built earlier, committed today as the first step of the session).
- **Freeze fix #1** (`72a3780`): `useGhostTicker` throttled from RAF 60fps → setInterval 100ms (10fps), which was choking the input via constant re-renders. Also fixed `abandoned: false && abandoned` typo (always evaluated false; timer-expired drills weren't being recorded as abandoned).
- **Amber DOS-CRT redesign** (`00b99f9`): visual register overhaul. All 8 components rewritten in `.crt-amber-monitor` style + `.amber-text*` palette. Layout reads top to bottom as monospace text — no cards, no panels.
- **Hybrid word/sentence drills** (same commit): new `backend/src/utils/inscriptionSentencePool.ts` with 7 hand-authored in-world sentences per shift (W1–4). `pickInscriptionPrompts()` wraps `pickInscriptionWords()` and appends sentence-shaped prompts. Default split: ~60% words + ~40% sentences for solo/open; trial stays words-only.
- **Stale-frontend fallback** (`a3c59fe`): backend accepts bare target word OR full sentence on sentence prompts so the Railway deploy window doesn't penalize in-flight students.
- **Pixel art icon added** (`e3ec613`): replaced dark text tile with PNG icon.
- **Amber → phosphor green** (`00547e5`): user preference. CSS classes renamed `.amber-*` → `.phosphor-*`, `.crt-amber-monitor` → `.crt-phosphor-monitor`. Hardcoded hex updated. Lobby layout tightened (top padding reduced, status strip compressed, mode picker now bordered button cards with `[1]`/`[2]` prefixes).
- **"Word Pool" display rename** (`101898e`): tile label + window title only. Backend route remains `/api/inscription/*`, tables remain `inscription_drills`, component dirs remain `InscriptionPool/`.
- **Icon sizing iterations** (`101898e` → `ad0b9e5` → `98fc343` → `ea59d24`): user wanted size + background to match other tiles. Final: 1254×1254 square PNG constrained by `h-[160px] w-auto` so displayed height matches the other 1536×1024 (240×160) tiles.
- **Racing-track redesign** (`c3689c9`): completely changed the drill UX. `PoolStandings.tsx` rewritten as horizontal racing lanes at the TOP showing per-citizen progress as 24-cell tracks. `DrillPromptCard.tsx` rewritten as per-character display with hidden `<input>` + auto-advance on exact match. No submit button. Eliminated the submit-cycle race condition that left the input frozen after word 1.
- **Wrong-char unfreeze + viewport fix** (`26964a7`): wrong-character freeze fixed by allowing input past target length (monkeytype overflow + red overflow chars + "> backspace to correct." hint). Bottom cyan bleed fixed via `flex flex-col` + `flex-1 w-full` on the wrapper.

### ClassMonitor visibility batch (commit `c6c9b15`)

Teacher dashboard polish (per `memory/project_classmonitor_visibility_2026_05_08.md`):

- Task-aware flag thresholds: default warn 7m / 2 attempts, alert 12m / 4 attempts. Writing: warn 10m / 3 attempts, alert 18m / 5 attempts. Writing tolerates more time because each draft re-evaluation is iteration, not struggle.
- Always-visible 4-state activity-dot legend pill above the student grid.
- Idle window 30 → 10 min (more classroom-realistic).
- "fails" → "attempts" label (neutral slate, not accusatory red).
- WritingEvaluator emits debounced `student:task-progress` socket event so the dashboard shows "Writing: 47 words" sub-line without needing to expand the card.

### Docs (commit `06ffa58`)

Three new Dplan documents committed:

- `Admin_God_Access_Plan.md` — full plan for admin role with cross-class visibility + student impersonation. ~140 lines across 11 files. Not yet built.
- `Harmony_Updated.md` — Phase D design: Junior Compliance Reviewer censor mechanic, Reg 14-C + Conduct Code §1/§2 across W1/W2/W3.
- `Narrative_Pedagogy_Review_2026_04_17.md` — cross-cutting corpus review of shift scripts, Harmony posts, and PEARL voice with prioritized findings + W4–6 forward-look.
- `Harmony_Expansion_Review.md` updated: Phase D status → PARTIAL with PR #2/#6 landed and PR #12 (Citizen-4488 visibility) pending.

### Cleanup

- Three macOS Finder duplicate files deleted (`Admin_God_Access_Plan 2.md`, `Narrative_Pedagogy_Review_2026_04_17 2.md`, `backend/src/data/week-configs/week4 2.ts`).

### Working tree state at end of session

Clean. All commits live on master via fast-forward merges from `docs/remediation-module`. Working branch back to clean state.

---

## 2026-05-19 (Shift 4 end-to-end hookup + teacher dashboard "current shift" fixes)

Three commits to master in one session. W4 was committed as a WeekConfig (`d784aa4`) and content-redesigned (`77e5937`) earlier, but the wiring that lets teachers see it / students play it had several gaps. Plus a separate display bug surfaced that made the dashboard appear to auto-advance the class to Shift 4 when students were still on Shift 3.

### Shipped (commits `6e2544b`, `912602c`, `9c76b92` on master)

**1. W4 hooked up end-to-end (`6e2544b`)**

- **Backend auto-migration on boot** — new `backend/src/utils/weekConfigMigrations.ts::ensureQueueMissionsForAllWeeks()` mirrors the harmony-label migration pattern. Scans every `Week` row, looks up its `WeekConfig` by `weekNumber`, and inserts only the missing queue `Mission` rows (idempotent, fire-and-forget with `.catch()`). Fixes the W4 problem diagnosed 2026-05-08: Railway prod runs `prisma migrate deploy` on every deploy but NOT `npm run seed`, so weeks added after the initial seed had no queue Mission rows and student scoring writes would have broken on first W4 entry. Wired into `src/index.ts` alongside `migrateHarmonyAuthorLabels()`.
- **Seed extended** — `createQueueWeekMissions` loop in `backend/prisma/seed.ts:884` and default class unlock list both extended W1‑3 → W1‑4. Legacy 7-step seeding now starts at W5. Affects fresh seeds only; existing prod uses the auto-migration above.
- **Condensed narrative route updated** — both `backend/src/data/narrative-routes.ts` and `frontend/src/data/narrative-routes.ts`: `[1,2,3,5,6,11,14,16,18] → [1,2,3,4,5,6,11,14,18]` per the 2026-05-11 locked canon. Stale Week 5 bridging entry deleted (it described the pre-redesign Evidence Board W4 and would now misfire on every condensed-route Week 5 entry).
- **Frontend `MAX_BUILT_WEEK` bumped 3 → 4** so `ClassMonitor` "Move to Shift" / "Review which shift" / "Move Class to Shift" buttons surface Shift 4.

**2. `weeksCompleted` double-count fix (`912602c`)**

`GET /api/teacher/students` computed `weeksCompleted` as the size of a `Set<string>` that mixed two different key formats for the same week: `String(sr.weekNumber)` yields `"3"` while `ms.mission.weekId` yields `"week-3"`. `ShiftClosing` writes BOTH records on every shift completion (`postShiftResult` + `submitMissionScore({status:'complete'})` on `shift_report`), so every real completion contributed two distinct Set entries — except on partial-completion edge cases where only one of the two records existed, leaving most cards inflated by 1.

**Symptom:** students currently working on Shift 3 with N/6 tasks done were rendered with `weeksCompleted=3`, which `ClassMonitor` maps to `currentClassShift = mode(weeksCompleted+1) = 4`, so the "Shift N • current" badge landed one shift ahead of reality. **The class was never being auto-advanced** — students were on Shift 3 the whole time (the per-student "Shift 3: 4/6 tasks done" line was correct); only the class-level badge was wrong.

**Fix:** include `mission.week.weekNumber` in the include, normalize both sources to numeric `weekNumber` in a `Set<number>`. Same shift completion = same key = no double count. Legacy User branch (line 273-281) already uses a single-key Set (`weekId` only), so no change there.

**3. ClassMonitor "On Shift N" pill + Review-Shift highlight (`9c76b92`)**

Previously the "Shift N • current" badge only rendered inside the *Move Class to Shift* expanded row, so the teacher had to open that dropdown just to see where the class was. Two visibility fixes:

- **Always-visible "On Shift {N}" emerald pill** in the action button row, alongside Pause All / Review Shift / Move Class to Shift. Same source-of-truth as before (mode of `weeksCompleted + 1`).
- **Review Shift selector now highlights current** with the same emerald + ring + "• current" suffix that the Move Class to Shift selector already had.

### W4 still pending (frontend work documented in CLAUDE.md, NOT introduced by this batch)

The Shift will **play through** as a 5-task queue (Word Match → Document Review → Cloze Fill → Vocab Clearance → Shift Report) with character beats and inter-task moments wired, but the redesign-specific UX is still unbuilt:

- `[ ].edited` desktop app shell (Lexicon tab with 5 Black Words + Cipher tab + Drop Box tab). Currently the cipher renders in the standard ClozeFill UI (`{0}..{4}` placeholders match the regex; passage parses; `title: "[ ].edited · CIPHER"` and `from: "— F"` config fields are unused).
- Mid-`doc_observations` silent RESTRICTED mutation on Observation E.
- Queue sidebar with 4 priority cases (4488 + 3 others).
- End-of-shift `w4_recruitment_vote` NarrativeChoice modal. Without this, W5 carry-over hooks have no data.
- Drop Box ping after Shift Report.
- New Clip A (with Unedited hijack at 1:40) and Clip B videos.

### Teacher must still unlock W4 per existing class

The new seed unlock (W1-4) only applies to fresh seeds. Existing classes keep their current `ClassWeekUnlock` rows — teacher must toggle the `4` chip green in TeacherDashboard → Manage Classes → Weeks for each class once.

### Verified

- Backend `npm run build` + 34 vitest tests pass.
- Frontend `npm run build` (tsc -b strict + Vite) passes.
- Railway redeploy confirmed: `accurate-transformation-production.up.railway.app/version.json` reflects the latest build IDs.
- Backend uptime reset on each push confirms the auto-migration ran.

### Doctrine added (locked in CLAUDE.md)

- **`weeksCompleted` must normalize ShiftResult.weekNumber and Mission.weekId to numeric `weekNumber`** — any new endpoint deriving "shifts completed" from BOTH sources must use a `Set<number>` and look up `mission.week.weekNumber` (NOT add `mission.weekId`).
- **`MAX_BUILT_WEEK` is the frontend gate for shift visibility in `ClassMonitor`** — bump when a new week's WeekConfig ships AND backend auto-migration has had time to populate Mission rows.
- **The W4 problem (2026-05-08 diagnosis) is RESOLVED** — `ensureQueueMissionsForAllWeeks()` runs on every backend boot, idempotent. Future weeks with `shiftType: 'queue'` pick up Mission rows automatically.

---

## 2026-05-18 (Harmony censor role expanded: Redact-a-Word + Triage to Bin)

Two new censor activity types added to the Harmony Review tab, turning the queue from "MCQ × 3 variations" into a real day-of-work simulation with three distinct cognitive verbs: **spot it** (Redact), **sort it** (Triage), **fix it** (existing grammar/vocab/replace).

### Shipped (commit `1af1014` on `docs/remediation-module`)

**`censure_redact` — tap-in-text recognition**
- Post text rendered as tappable word tokens via new `TappableWords` React component. Student taps the unapproved word directly inside the sentence; selected word ringed in sky.
- Backend response endpoint (`POST /api/harmony/censure-queue/:id/respond`) accepts new optional `selectedWord` body field. For `censure_redact` items, isCorrect uses word-match (case-insensitive, punctuation-stripped) against `censureData.errorWord` instead of `selectedIndex === correctIndex`.
- After review: correct word green-underlines in the post; wrong pick strikes through red.
- StudyCard lookup branches: redact prefers `approvedWord` (the TOEIC word they should have demanded) so the lane-aware Mandarin card always teaches a TOEIC word.

**`censure_triage` — 3-bin classification**
- Full-width vertical bin picker below the post: **Approve** / **Forward to Wellness** / **Flag for Reg 14-C**.
- Bins render in FIXED pedagogical order — the Fisher-Yates shuffle is skipped when `item.postType === 'censure_triage'` so students learn the taught layout.
- Reuses existing `selectedIndex` flow; backend treats it as a standard index match.
- Triage skips studyCard lookup (decision-based; no single vocab teaching target).

**Content authored (18 hand-written static items, W1-W3)**
- 3 redact + 3 triage per shift, appended to `STATIC_CENSURE_ITEMS` in `harmonyGenerator.ts`.
- All redact pairs are TOEIC-anchored on the correct side: every approved word is in the shift's `WeekConfig.targetWords` (W1: `submit`/`check`/`arrive`; W2: `notice`/`inform`/`replace`; W3: `respond`/`complete`/`review`). Wrong words (`give`/`look`/`come`/`saw`/`tell`/`fix`/`answer`/`do`/`read`) are everyday A2 English foils — NOT in `DictionaryWord` and never become teaching targets. Same doctrine as `censure_replace`.
- Triage items split across the three bin categories: compliant posts → Approve; missing-citizen / behavioral-change posts → Forward to Wellness; informal-register posts (super/kinda/honestly/tbh) → Flag for Reg 14-C.

**Plumbing**
- `CENSURE_POST_TYPES` in `routes/harmony.ts` expanded to `['censure_grammar', 'censure_vocab', 'censure_replace', 'censure_redact', 'censure_triage']`.
- `DEFAULT_CONTENT_COUNTS` in `harmonyGenerator.ts` adds `censure_redact: 2, censure_triage: 2`. AI generator does NOT produce these types yet (prompt unchanged); they rely on static content. W4+ won't have redact/triage items until static content is authored or the AI prompt is extended.
- Frontend `CensureItem.postType` union extended; `censureData` shape gains optional `approvedWord` and `regulation` fields. `submitCensureResponse()` accepts optional `selectedWord` arg threaded through `harmonyStore.respondToCensure`.

### Per-shift queue now ~13 items (was ~7)

| Type | Items per shift | Cognitive verb |
|---|---|---|
| Word Redaction | 3 | Spot it |
| Queue Triage | 3 | Sort it |
| Grammar Check | 3 | Fix it |
| Vocabulary Check | 3 | Fix it |
| Word Replacement | 1 | Fix it |

### Doctrine added (locked in CLAUDE.md)

- **Censor role has 5 activity types** with distinct cognitive verbs.
- **Triage bins render in fixed order** — never shuffled.
- **Word Redaction is TOEIC-anchored on the approved side only** — wrong words are everyday foils, never teaching targets.

### Verified

- Backend tsc + 34 vitest tests pass.
- Frontend tsc -b strict + Vite build pass.
- No new lint errors in changed files (verified by stash-and-diff).
- Commit `1af1014` pushed to `origin/docs/remediation-module` (5 files, 531 insertions, 70 deletions).

---

## 2026-05-14 (Harmony bilingual fix: Censure Queue + Bulletin MCQ + Archives Vocabulary now lane-aware)

Audit of Harmony's interactive activities found that only the [[RemediationModule]] honored the Cummins/Krashen lane-aware L1 scaffolding doctrine. The three other interactive activities — Censure Queue, Bulletin Comprehension MCQ, and Archives Vocabulary — rendered English-only despite the backend already carrying `DictionaryWord.translationZhTw` in seed data. Real pedagogical defect for Lane 1 (Guided) students.

### Shipped (commit `98cb2df` on `docs/remediation-module`)

**Lane-aware Mandarin study card on Censure responses**
- `POST /api/harmony/censure-queue/:id/respond` now returns optional `studyCard: { word, phonetic, translationZhTw, exampleSentence }`.
- New helper `lookupStudyWord(raw)` in `routes/harmony.ts` resolves a word against `DictionaryWord` with inflection fallback (`-s` / `-ed` / `-ing` / `-ies` → `arrives → arrive`, `described → describe`).
- Per-type lookup key: vocab → `errorWord` (the misused word's true meaning); grammar/replace → `correction` then `errorWord`.
- Lookup wrapped in try/catch so a transient DB issue NEVER 500s an otherwise-successful submission.
- Frontend `CensureCard` renders a sky-blue panel below the explanation: Lane 1 shows Mandarin inline, Lane 2 has a "Show 中文" toggle, Lane 3 English-only. Mirrors `RemediationModule.tsx`.

**Bulletin Comprehension question stem now glossed**
- `BulletinQuestion` interface gains optional `translationZhTw?: string`. All 9 W1-W3 static questions authored with hand-written Traditional Chinese.
- Frontend `BulletinMCQ` reads lane, renders Mandarin gloss inline (Lane 1) or behind a "Show 中文" toggle (Lane 2).
- **Critical**: existing bulletin posts already in the DB were inserted before this field existed. Read-time enrichment via new `STATIC_TRANSLATION_BY_REF` map (built at module load in `routes/harmony.ts`) backfills the field on every `/posts` and `/archives` response. DB value wins on conflict for forward-compat. **No migration needed.**

**Archives Vocabulary entries now bilingual**
- `/archives` endpoint selects `translationZhTw` + `phonetic` from `DictionaryWord`.
- New `ArchiveWordEntry` component owns per-word `showMandarin` state so Lane 2 tap-to-reveal works without parent bookkeeping. Lane 1 always-visible; Lane 3 hidden.

### Doctrine added (locked in CLAUDE.md)

- **Harmony interactive activities are lane-aware bilingual.** Same gold-standard pattern as RemediationModule: Lane 1 always Mandarin, Lane 2 tap-to-reveal, Lane 3 English-only. Future Harmony interactive activities must follow this pattern from day one.

### Verified

- Backend tsc + 34 vitest tests pass.
- Frontend tsc -b strict + Vite build pass.
- Commit `98cb2df` pushed to `origin/docs/remediation-module` (6 files, 269 insertions, 30 deletions).
- W1-W3 seed spot-check: `arrive` (到達), `submit` (提交), `review` etc. — all TOEIC target words have full `translationZhTw` + `phonetic` + `exampleSentence` populated.

---

## 2026-05-11 (W4 redesigned: Activity Reconciliation + Unedited contact folded into Clip A + `[ ].edited` hidden app)

Long design session that rebuilt Shift 4 around two new commitments: (1) the shift's narrative center is **Citizen Activity Reconciliation** — students compile the official Daily Activity Report for Citizen-4488 from 5 surveillance observations, watch one observation get reclassified mid-shift, and choose how to engage with the resistance; (2) the Unedited's first contact happens INSIDE the briefing video (Clip A hijack at 1:40) and uploads a hidden **`[ ].edited`** app to the desktop. The 3-surface Unedited design from 2026-05-07 (in-doc anomaly overlay + Clip C micro-clip + PEARL "TERMINAL ANOMALY" modal) is now deprecated.

### Shipped (commit `77e5937` on `docs/remediation-module`)

**`Dplan/Weeks_04_06_Shift_Plan.md`** — Week 4 section fully rewritten:
- Frame swap: "Evidence Board" → "Activity Reconciliation Office" (under Department of Clarity)
- 5-activity sequence documented: Word Match → Reconciliation Desk (with mid-Doc-Review mutation event) → `[ ].edited` Cipher → Vocab Clearance → Shift Report + post-submit Drop Box + end-of-shift recruitment NarrativeChoice modal
- **Queue sidebar** documented as a UI element across the shift: 4 cases visible on the right (`▶ Citizen-4488 · PRIORITY` + 3 dimmer background citizens: Citizen-6103, Citizen-1177, Citizen-7142). Reinforces drone identity; seeds future shifts.
- **Clip A** replaced with new ~2:55-3:00 PEARL-narration-only briefing + queue panel + hijack at 1:40 (silhouette + modulated voice "Citizen — locate the missing fragment. Examine the dates. Record what they removed. Ask why." + `— F` sign-off) + recovery to standard "ACTIVITY READY"
- **Clip B** replaced with ~1:25 closing dispatch — Daily Activity Report stamped RECORD ACCEPTED, queue completion ticks, REASSIGNMENT NOTICE for Citizen-9020 (transferred to Sector 12), SHIFT COMPLETE. PEARL-only narration.
- **Clip C** marked DEPRECATED — content folded into Clip A
- Old "Unedited First Contact" planning section condensed to a brief redirect note

**`backend/src/data/week-configs/week4.ts`** — content rewritten (schema unchanged, all 5 activities still grade-able):
- Doc Review Doc A → "DAILY OBSERVATION SET — CITIZEN-4488" with 5 observations (Sector 4 entrance · 07:23 / Filing Desk 14 · 08:15 / Common Mess · 12:00 / Records Wing · 14:30 / Block 7 Residential · 17:30 with guest entry logged: Citizen-9020) + 5 new comprehension questions
- **`midTaskChoice` popup REMOVED** — Observation E reclassification is now a silent visual mutation (greying + RESTRICTED stamp) handled by the frontend. No popup choice. Engagement happens later via the `[ ].edited` Drop Box + end-of-shift recruitment modal.
- Doc B → "DAILY ADJUSTMENT NOTICE — CITIZEN-4488 RECORD" with 6 errors referencing 4488 + the reclassification (4 past-tense + 1 sequencing-word-form + 1 passive-past "was reclassify" → "was reclassified" + 1 SVA "The Archive select" → "selects")
- `cloze_fill_w4` content replaced with `[ ].edited` Cipher message (5 blanks introducing 5 Black Words: truth/mother/freedom/father/name; passage: *"Citizen — they `[reclassify]` what they fear. They `[ask]` you to `[record]` only what they choose. But the visitor had a `[name]`. The visitor had a `[mother]`."*) — task id preserved to avoid breaking `interTaskMoments` key references
- Vocab Clearance: 2 context items + 1 toeic_p5 rewritten to reference 4488 + missing observation (stale "Fragment 3" references removed)
- Character messages + inter-task moments: language updates to remove "fragment"/"Fragment 3" references; Ivan after document_review now references "Observation E reclassification"; Ivan after Cipher now senses the terminal flicker without naming the hidden app
- Narrative hook + shift closing → "Records Reconciled" / Citizen-9020 reassignment notice
- Verified: `npm run build` passes (tsc clean, 34/34 vitest tests passing)

### Doctrine added (saved to memory + locked decisions)

- **PEARL narration only in Clip A briefings** — no Betty/Ivan/M.K. voiceover. Maximizes contrast for the Unedited hijack moment. `feedback_briefing_video_narration_only.md`
- **In-world bureaucratic locations, not American-school** — Sector/Block/Filing Desk/Common Mess. Avoid cafeteria/library/classroom. Citizens are workers, not students. `feedback_inworld_locations_not_american_school.md`
- **9-shift condensed route is canonical** — `[1, 2, 3, 4, 5, 6, 11, 14, 18]`. The existing `condensedRoute` value in `narrative-routes.ts` is `[1, 2, 3, 5, 6, 11, 14, 16, 18]` (skips W4) — stale, contradicts W4 being a pivotal beat; needs updating in a follow-up.
- **Bracket motif `[ ]`** — anything redacted inside `[ ].edited` renders as `[ ]`. The app's own name visualizes this: `[ ].edited` reads as the Party-redacted form of `[un].edited`.

### Pending frontend work (out of scope this batch)

- Queue sidebar panel UI (right column, 4 cases, 4488 priority + 3 background)
- Observation card mutation event handler (greying + RESTRICTED stamp on Obs E)
- `[ ].edited` desktop app — tile state machine (greyed/broken-pixel on appearance, persistent thereafter), Lexicon tab (5 Black Word entries with modulated-voice audio + all-lanes Mandarin gloss), Cipher tab (renders `cloze_fill_w4` content with bracket motif `[ ]` blanks instead of underscores), Drop Box tab
- Post-login glitch effect that materializes the `[ ].edited` app
- Post-Shift-Report Drop Box ping
- End-of-shift recruitment NarrativeChoice modal (key `w4_recruitment_vote`: compliant/curious/guarded; gates W5 depth)
- Canva production of new Clip A and new Clip B

### Process / docs follow-up

- 8 file edits across shift plan + week4.ts in a single commit; Clip A and Clip B rewritten in the same pass
- Doc updates in this session: `CLAUDE.md` (added 4 locked decisions + redesign note in Next Work), `docs/world-and-story.md` (W4 narrative entry + canon translation + recruitment cracks rewritten), this changelog entry
- Memory saved: `feedback_briefing_video_narration_only.md`, `feedback_inworld_locations_not_american_school.md`

---

## 2026-05-08 (ClassMonitor: task-aware flag thresholds + writing word-count visibility + activity legend + idle window 10 min)

Two-part session triggered by user observation that the teacher dashboard was firing red "stuck" alerts on every Writing task (Aaron 2m/3 attempts, Iris 5m/4 attempts) — both students drafting normally — and separately, that the colored activity dot next to student names had become opaque ("I don't remember what these mean"). Both fixed in the same uncommitted edit batch on `docs/remediation-module` after merging master in.

### Shipped (uncommitted on `docs/remediation-module`; pending teacher review before commit)

**Task-aware getFlag in `ClassMonitor.tsx`**
- Old single-pair thresholds (5min warn / 8min alert + 1 fail warn / 2 fail alert) replaced with `DEFAULT_THRESHOLDS` and `WRITING_THRESHOLDS` selected via `thresholdsFor(taskKind)`.
- **DEFAULT** (quiz / cloze / match): warn at 7m / alert at 12m, warn at 2 attempts / alert at 4. Globally relaxed.
- **WRITING**: warn at 10m / alert at 18m, warn at 3 attempts / alert at 5. Each "attempt" is a draft re-evaluation, not a struggle signal — students legitimately use 2–3 of their 3 evaluation attempts before passing.
- **"fails" → "attempts" in card text** with neutral slate color (was red); tooltip distinguishes Writing (draft revisions) vs other (submission attempts).

**`progressLabel` + `taskKind` on `StudentStatus`**
- New optional fields on `StudentStatus` (`backend/src/socketServer.ts`) and `OnlineStudent` (`frontend/src/stores/teacherStore.ts`).
- `taskKind` drives task-aware threshold selection; `progressLabel` renders as a sub-line under the task label (e.g. "Writing: 47 words").
- Cleared on taskId change in the existing `student:task-update` handler so labels don't bleed across tasks.

**New `student:task-progress` socket event (backend `socketServer.ts`)**
- Partial-update event that does NOT mutate `taskId`/`taskLabel` and does NOT reset `taskStartedAt`. Used by sub-component progress emits (currently only `WritingEvaluator`).
- Updates only the fields explicitly set on the payload (`taskKind`, `progressLabel`, `failCount`). Lets composite-task children push progress without overriding the parent's label.

**`WritingEvaluator.tsx` emits writing progress + failure attempts**
- New debounced `useEffect` on `text` change (800ms): emits `student:task-progress` with `taskKind: 'writing'` + `progressLabel: \`Writing: N words\``. `lastSentLabelRef` dedup prevents redundant emits.
- Unmount cleanup emits `{ taskKind: null, progressLabel: null }` so the teacher card clears when student leaves the writing card.
- Failed-submission emit migrated from `student:task-update` to `student:task-progress`. Fixes prior bug: WritingEvaluator was sending `taskId: missionId ?? 'writing'` which differed from the parent's taskId (e.g. `priority_briefing` in W3), tripping the `if (existing.taskId !== data.taskId)` reset path on first failure → reset `taskStartedAt` and overwrote the parent label. Now elapsed time correctly reflects total time on the composite task; parent label preserved.

**Activity legend pill in `ClassMonitor.tsx`**
- New always-visible legend row above the student grid, mirrors the struggle-flag summary pattern (white bg, slate border, 4 dots inline). Renders whenever `students.length > 0`.
- Each dot has a tooltip: emerald=Active (in app now), sky=Recent (<5 min), amber=Idle (5–10 min), slate=Offline (gone).
- Triggered by user feedback: "I don't remember what these mean."

**Idle window 30 min → 10 min**
- `IDLE_WINDOW_MS` shrunk in `ClassMonitor.tsx` from 30min to 10min. Past 10 min the dot goes slate (Offline).
- Rationale: classroom-realistic. A student who hasn't pinged in 10 min has left. 30 min was generous for a 50-minute class period.

### Process / git
- Session opened on `docs/remediation-module` which was 5 commits behind `master` (the deployed branch). The activity-indicator code (commit `0af94bd`) lived only on master — first round of changes layered on top of an older `ClassMonitor.tsx`.
- After user noticed the activity-indicator code missing, stashed WIP, `git merge master --no-edit` (clean), `git stash pop` (clean). All four files (ClassMonitor, WritingEvaluator, socketServer, teacherStore) carry both batches of changes correctly.
- Frontend + backend builds green; nothing committed yet pending user review.

### Builds
- Frontend `npm run build`: 542KB main bundle, 2.71s.
- Backend `npm run build`: 34/34 vitest pass + tsc clean.

---

## 2026-05-08 (Teacher Shifts: current-shift highlight fix + Compliance Checks folded into Storyboard)

Short session triggered by the user noticing the ClassMonitor "Move all to Shift N" highlight didn't follow the class to Shift 3 after a `Move Class to Shift` action — and separately, that the standalone Compliance Checks editor was hard to read because slot order didn't visually correspond to where checks fired. Both diagnosed, both fixed in a single commit cherry-picked to master.

### Shipped (1 commit cherry-picked to master via worktree)

**`1408f5b Teacher Shifts: fix current-shift highlight + fold Compliance Checks into storyboard`** (master)

- **`/api/teacher/students` ShiftResults filter**: the include `shiftResults: { select: { weekNumber: true } }` had no `where`, so `Move-to-Shift` markers (`completedAt: null`) were being added to `completedWeeks` alongside real completions. Inflated `weeksCompleted` by 1 whenever a marker existed, off-by-one'ing the ClassMonitor "current shift" highlight on the Move-all-to-Shift selector. Fix: add `where: { completedAt: { not: null } }` to the include. Side benefit: per-student "X/18 shifts" badge becomes accurate for moved students.
- **Compliance Check label semantics**: `placement: 'after_task'` with `afterTaskId: X` fires AFTER task X completes (`ShiftQueue.tsx:320` triggers via `handleComplete` → `fetchComplianceCheckFor('after_task', completedTaskId)`). But the slot list / editor labeled rows `Before {task}` — backwards. Renamed every after_task label to `After {task}` everywhere (`ComplianceCheckEditor.tsx:30` + slot rendering). Teacher who configured "Before Priority Briefing" was actually configuring "fires after Priority Briefing completes" — visible mismatch resolved.
- **Compliance Checks moved into Shift Storyboard**: standalone `Compliance Checks` section in `ShiftsTab.tsx:158-186` removed entirely. Slots now render as inline cyan dotted-line markers in `ShiftStoryboard`, alongside the existing amber gate markers, at:
  - Above the first card: `P.E.A.R.L. Before shift starts + Add check`
  - After each task card: `P.E.A.R.L. After {Task} + Add check` (or, if configured, `· Vocab Check · Nw · NQ`)
  - Below the last card: `P.E.A.R.L. At shift end`
  - Click any marker → opens the same `ComplianceCheckEditor` modal (2-step wizard, unchanged).
- **New component**: `frontend/src/components/teacher/compliance-check/ComplianceCheckMarker.tsx` — stateless inline chip mirroring the GateMarker pattern (cyan dotted vs amber dashed).
- **Deleted**: `frontend/src/components/teacher/compliance-check/ComplianceCheckSlotList.tsx` — no consumers after the storyboard integration.
- **`StoryboardStep.taskId` field added** (backend `teacher.ts:1362` + frontend type `api/teacher.ts:636`): backend storyboard step previously exposed only `missionType` (e.g. `word_match`), not the WeekConfig task `id` (e.g. `word_match_w3`). Compliance Check `afterTaskId` references the task `id`, so the markers couldn't match templates without it. Now exposed alongside `missionType`.

### Diagnosed but not fixed
- **Pre-existing `completedWeeks` dedup smell** in `/students` (lines 107–117): the ShiftResult loop adds `String(weekNumber)` while the `clock_out`/`shift_report` fallback adds `weekId` (cuid). They don't dedupe against each other. Probably never bites for new pairs (canonical path is ShiftResult only) but flagged for future cleanup.

### Process / git
- Two commits originally landed on `docs/remediation-module` (`b6ea93d` + earlier `35b4526` doc commit), but Railway deploys from master and master had diverged 21 commits ahead via the audit batch (PRs #28-#41) + W4 WeekConfig + stale-bundle defense + activity indicator. A naïve fast-forward push would have force-deleted those 21 commits.
- Recovery: cherry-picked `b6ea93d` onto master inside a temporary `git worktree add` (so the user's uncommitted working-tree changes on `docs/remediation-module` stayed untouched). Auto-merge succeeded on `teacher.ts` + `api/teacher.ts`. Built clean in the worktree, pushed master as `1408f5b`, removed worktree.
- **Lesson**: Always check `git log master..HEAD` AND `git log HEAD..master` before recommending a "fast-forward" push. If the second is non-empty, fast-forward is impossible and you have to choose between cherry-pick / merge / branch reconfig.

---

## 2026-05-07 / 08 (Stale-bundle defense + teacher activity indicator + remediation pedagogy)

Long iterative session triggered by the user observing two students on Shift 3 seeing different Priority Sort UIs (old typing input vs new cinematic cascade). Diagnosis: stale browser bundles, not code divergence. Fix shipped as a layered system; while in there, also closed several smaller answer-log display bugs and built the bilingual lane-aware remediation study card.

### Shipped (8 commits direct-to-master + 3 PRs)

**PR #39 `fix(harmony): track real arrival time for NEW badge`** (merged)
- New `HarmonyPost.ingestedAt DateTime @default(now())` column. `staggeredCreatedAt()` deliberately backdates `createdAt` 10 min – 5.5 h for narrative texture; that broke `/has-new` and per-post `isNew` badges (compared backdated time to `lastHarmonyVisit`, false-negatived when student visited Harmony recently before new content arrived).
- Migration backfills existing rows from `createdAt` so old posts don't all flash NEW.
- Includes start-script change `npx prisma migrate deploy && node dist/index.js` so future migrations auto-apply on Railway boot.

**PR #40 `feat(teacher): show shift progress on initial load + remediation questions in Gradebook`** (merged)
- ClassMonitor was lazy-loading shift progress per click; now `GET /api/teacher/students` parallel-fetches via new `buildShiftStatusForPair()` helper and returns `currentShiftProgress` for every pair. Click-to-refresh path preserved.
- Gradebook → Remediation Events table rows now expandable. New `RemediationQuestionsPanel` shows each word, the correct definition, the three distractors, and a per-word ✓/✗ from stored results. `ComplianceQuestion` payload extended with `phonetic`, `translationZhTw`, `exampleSentence` (additive — Compliance Check inherits but doesn't render yet).
- Removed a duplicate `RemediationEvent` interface in `frontend/src/api/teacher.ts` that TypeScript declaration-merging was masking.

**PR #41 `fix(word-match): show student's actual wrong pick on non-first-try`** (merged)
- WordMatch answer log was showing canonical correct definition in `chosen` whenever a student got an item wrong then recovered (only auto-resolved rows surfaced the wrong pick). Same bug in VocabClearance and ClozeFill — fixed in a follow-up commit `5b73c11` direct to master.
- For any non-first-try row, `chosen` now shows the student's actual first wrong pick. First-try-correct rows unchanged.

**`8372507 feat(remediation): TOEIC-only word gate + lane-aware bilingual study card`** (direct to master)
- `pickRemediationWords` now intersects candidates with `getComplianceWordsByWeek()` for shifts ≤ current. Same gate Compliance Check uses; story / world-building / future-shift words excluded.
- After a wrong answer in the remediation modal, a study card renders below the options:
  - Lane 1 (Guided): word + IPA + correct definition + Mandarin + example sentence
  - Lane 2 (Standard): same as Lane 1 but Mandarin tap-to-reveal
  - Lane 3 (Independent): word + IPA + correct definition only
  - Continue button disabled for 5 seconds with countdown ("Next (5)" → "Next (4)" → …)
- Dev-only `RemediationDevTrigger` floating button gated by `import.meta.env.DEV` so the user can preview without grinding concern score.

**`684476f fix(deploy): cache headers stop students from running stale JS bundles`** (Layer 1)
- `frontend/public/serve.json` (copied to `dist/serve.json` at build time) sets `Cache-Control: no-cache, no-store, must-revalidate` on `index.html` + `version.json`; long-immutable cache on hashed `assets/**`; 1-day on images/audio/video.

**`3c390ac feat(deploy): build-version polling + update banner so stale tabs self-detect`** (Layer 2)
- Vite injects `__BUILD_ID__` (git short SHA, fallback timestamp) into the bundle and writes `dist/version.json` via a custom plugin.
- `useUpdateChecker` polls `/version.json` every 5 min and on tab focus. On mismatch, `useUpdateStore.updateAvailable = true`.
- `UpdateBanner` (sky accent, top of screen) renders "A new version is available — Reload" with manual button. Skipped in dev (`__BUILD_ID__ === 'dev'`).

**`0af94bd feat(teacher-dashboard): persistent activity indicator (Active/Recent/Idle/Offline)`** (direct to master)
- `Pair.lastSeenAt` and `User.lastSeenAt` columns. `authenticate` middleware updates the actor's `lastSeenAt` on every authenticated request, throttled to once per 60s per actor via in-memory Map. Fire-and-forget.
- `ClassMonitor` derives 4-state ActivityState from `online + lastSeenAt + now`:
  - Active (currently socket-connected) → emerald
  - Recent (lastSeenAt < 5 min) → sky
  - Idle (lastSeenAt < 30 min) → amber
  - Offline (older or never) → slate
- Survives Railway redeploys (the in-memory `onlineStudents` Map gets wiped on every restart; this is DB-backed).

### Diagnoses (no code changes)

- **W4 problem.** `backend/prisma/seed.ts:884` is hardcoded `weeks 1-3` for `createQueueWeekMissions`. W4 has a WeekConfig (`week4.ts`, committed `d784aa4`) but the production DB has only legacy 7-step `Mission` rows for W4 from `createDefaultWeekMissions`. When students promote to W4, `weekConfig?.shiftType === 'queue'` triggers ShiftQueue mount, but new task types have no matching `Mission` rows — scoring writes break. Not blocking yet (all classes on W3); needs Layer 6 (auto-data-migration on backend boot) before any class advances.
- **Priority Sort "two paths" was browser cache, not a code fork.** Read-only audit (Explore agent + manual verification) confirmed: only one `PrioritySort.tsx` exists, single `SortStage` state machine (`'training' | 'cascade' | 'verifying' | 'verified'`), no legacy renderer, no feature flags, no random branches. Verdict: two students with same lane and same up-to-date bundle cannot see different versions of any W3 task at the code level.
- **Confirmed `socketServer.ts` per-class scoping IS on master** (PRs #36/#38). Earlier read of `docs/remediation-module` branch was misleading because that branch is behind master. Teachers join `class:${classId}` rooms; emits go to those rooms; the global `'teacher'` room was removed.

### Doctrine ratified

- **Forced exposure, not punishment** (Krashen affective filter, Cummins on strategic L1, Nation/Schmitt on context exposure). Bilingual study card replaces a punitive "WRONG" beat with a 5-second study moment showing form + meaning + L1 gloss + example. Doctrine: "the worst case is a student accidentally studied harder."
- **No force-pass loops** for ESL learners. Trapping an A2 student in "you can't escape until 3/3 correct" is a textbook affective-filter trigger. The system accepts variable performance; spaced repetition catches up.

### What's NOT done (deferred)

- **Layer 6 (auto-data-migrations).** Pattern: small startup hook like `migrateHarmonyAuthorLabels` that detects WeekConfig vs Mission row drift and reconciles. Highest-value for the W4 problem before any class advances. Not built today.
- **Layer 3 (richer banner UX — wait until end-of-task before nagging).** Current banner is dismissible; no auto-reload. Sufficient for now.
- **Force-reload-all teacher button.** Designed but not built — chicken-and-egg problem (the listener has to be in the bundle students are running). Recommended workaround for current stuck students: teacher rotates `JWT_SECRET` on Railway → all students get logged out → fresh login picks up new bundle.

### Critical files (today)

- `backend/prisma/schema.prisma` + 2 new migrations (`20260507051505_add_harmonypost_ingested_at`, `20260508020000_add_last_seen_at`)
- `backend/package.json` — start script runs `prisma migrate deploy` first
- `backend/src/middleware/auth.ts` — activity tracker + 60s throttle
- `backend/src/routes/harmony.ts` — `ingestedAt` queries
- `backend/src/routes/teacher.ts` — `buildShiftStatusForPair` helper, `/students` returns `currentShiftProgress` + `lastSeenAt`, `/remediation-events` returns questions+results JSON
- `backend/src/routes/remediation.ts` — TOEIC gate via `getComplianceWordsByWeek()`
- `backend/src/utils/complianceDistractors.ts` — `ComplianceQuestion` carries phonetic/translationZhTw/exampleSentence
- `frontend/public/serve.json` — Cache-Control rules
- `frontend/vite.config.ts` — `__BUILD_ID__` define + version.json plugin
- `frontend/src/build-id.d.ts`, `frontend/src/stores/updateStore.ts`, `frontend/src/hooks/useUpdateChecker.ts`, `frontend/src/components/system/UpdateBanner.tsx` — version polling + banner
- `frontend/src/components/dev/RemediationDevTrigger.tsx` — DEV-only preview button
- `frontend/src/components/remediation/RemediationModule.tsx` — lane-aware StudyCard + 5s countdown
- `frontend/src/components/teacher/Gradebook.tsx` — `RemediationQuestionsPanel` expandable rows
- `frontend/src/components/teacher/ClassMonitor.tsx` — 4-state ActivityState + relative-time labels
- `frontend/src/components/shift-queue/tasks/{WordMatch,VocabClearance,ClozeFill}.tsx` — answer-log shows actual wrong pick
- `frontend/src/api/teacher.ts` — `RemediationEvent` extended; duplicate declaration removed
- `frontend/src/types/shifts.ts` — `StudentSummary` extended with `lastSeenAt` and `currentShiftProgress`

---

## 2026-05-07 (W4 Unedited First Contact — design + Clip C script, no code)

Planning-only session with the user. Decided how W4 introduces "The Unedited" — the canon resistance per `~/Desktop/Dplan/docs/narrative.md:56` ("Week 4: First contact from The Unedited"). Full design spec + Clip C 0:35 script committed to `Dplan/Weeks_04_06_Shift_Plan.md` § Week 4 § Unedited First Contact, plus a new "Unedited (Resistance) — canon-to-web translation" subsection in `docs/world-and-story.md`.

User initially framed the contact as "the Unedited hack into their mainframe." Pushed back: canon is explicit that all Unedited contact mechanisms are **analog** (notes in restroom, hidden text in documents the player corrects, coworker reveals, Hidden Lexicon access). User accepted the canon-aligned redesign — translation uses canon mechanism #2 (hidden text in documents).

### Decisions ratified

- **Universal contact** — every W4 student is contacted. Curious-branch deepening reserved for W5+.
- **Mechanism = three surfaces** firing within ~90s window between Task 2 (Document Review) and Task 3 (Cloze Fill):
  1. In-document anomaly overlay inside Doc B (Filing Adjustment Notice) — phantom 7th line fades in for ~3s, not graded, outside the error-correction system
  2. ~0:35 Unedited micro-clip (Clip C) — typewriter sequence on black, modulated voice, hard cuts from/to pOS desktop
  3. PEARL "TERMINAL ANOMALY DETECTED" full-screen modal — 3-reply choice (compliant/curious/guarded) stored as `NarrativeChoice.choiceKey = "w4_unedited_first_contact"`
- **Contact text:** `Citizen — locate Fragment 3. Examine the dates. Record what they removed. Ask why. — F`
  - Recycles W4 target words: `locate`, `examine`, `record` (3 of 10) — pedagogical anchoring
  - Imperative + past tense matches W4 grammar target (`past-simple-sequencing`)
  - "Ask why" = canon Unedited grammar shift (questions are forbidden in Party speech, `world-building.md:756`)
  - "They" = first non-Party pronoun for authority — students learn the unspoken referent IS the Party
  - Sign-off `— F` = Frey (named canon Unedited member, `characters.md:313`). Single real letter mirrors-but-breaks the Party's 4-digit designation system.
- **No Black Words in W4** — held for second contact (W5+) inside Wellness Self-Assessment doc
- **0:35 runtime** — sweet spot between 0:25 (rushed) and 0:45 (loses classroom attention)
- **Continuity anchors** — pOS desktop frame and chime carry over from W1-W3 (they bookend the rupture); typography/voice/grammar inside the intrusion break pOS rules; recovery chime returns half-step flat as subliminal anomaly cue before PEARL modal fires
- **PEARL eye stays canon** — one "look-around" on recovery, never blinks (locked decision)

### Open creative questions (waiting on user)

1. Voice casting — TTS + post-processing (ElevenLabs + pitch shift + reverb) vs real voice
2. Typewriter as forbidden equipment lore — diegetic Pre-Collapse artifact (drop "unauthorized typographic equipment" line in W5 PEARL response) vs purely aesthetic
3. Briefing Clip A 4-frame cursor pre-flash — subtler intro vs preserving cold shock
4. Citizen-4488 W4 post — clean victim narrative (current recommendation) vs single hint of awareness

### Implementation pieces required (NOT built this session)

1. New `DocumentConfig.anomaly?: { text, triggerAfterMs, durationMs, signature }` field on `backend/src/data/week-configs/types.ts`
2. `UneditedClipPlayer` component reusing `MonitorPlayer` infrastructure; new `type: "clip"` variant on `InterTaskMomentConfig`
3. `AnomalyAlertModal` component mirroring `ClarityCheckModal` shape with amber/static styling, writes `NarrativeChoice`
4. WeekConfig wiring in `week4.ts` — anomaly on Doc B, replace `vocab_clearance`-slot ambient glitch with anomaly modal moment, add `clipBefore` for Clip C on inter-task slot after `document_review`
5. Canva production — Clip C (~0:35)

No backend changes (NarrativeChoice already exists; no new migrations).

### Notes

- W4 WeekConfig was already committed to master 2026-05-04 as `d784aa4`; the audit follow-up "commit week4.ts" is no longer pending.
- macOS Finder duplicate `backend/src/data/week-configs/week4 2.ts` confirmed byte-identical to `week4.ts` — should be deleted (zero risk, cosmetic).
- W4 Harmony static content (feed posts, bulletin, PEARL tip, notices, sector report, censure items) and W4 dictionary seeds remain deferred — same status as 2026-04-22 Implementation Status block.

### Critical files (today)

- `Dplan/Weeks_04_06_Shift_Plan.md` — added W4 Unedited First Contact design subsection + Clip C script entry in Canva Production Scripts
- `docs/world-and-story.md` — added "The Unedited (Resistance) — canon-to-web translation" subsection; updated W4 status line in "Weeks 4-6 content status"
- `CLAUDE.md` — Next Work bullet for the W4 Unedited First Contact planning
- `memory/project_w4_unedited_contact_planning_2026_05_07.md` (NEW) + MEMORY.md index entry

---

## 2026-05-04 (Audit batch 1–14: 11 PRs across 14 critical/high security & data bugs)

A 5-agent audit surfaced 27 bugs in security, data integrity, sockets, and frontend hygiene. Bugs 1–14 (critical + high tier) were batched into 11 file-disjoint PRs ran in parallel via background workers (each in its own git worktree), then merged sequentially. All PRs landed on `master` the same day; verified in a fresh `origin/master` worktree (backend `tsc` + 34/34 vitest, frontend build + 15/15 vitest).

### Shipped (PR → audit bugs)

- **#34 — `fix(auth): require JWT_SECRET + rate-limit student login (audit bugs #2, #3)`.** `backend/src/utils/jwt.ts` no longer falls back to `'dev-secret'` — throws at module load if env var unset (fail-fast in prod). `express-rate-limit` (NEW dep) added to `auth.ts` student `/login` route: 10 attempts / 15 min keyed on IP + designation (teacher path skipped via `skip` predicate). New `backend/.env.example`. **Manual follow-up landed:** `JWT_SECRET` rotated in Railway prod with fresh `openssl rand -hex 32` value.
- **#35 — `fix(teacher): scope bulk delete + add ownership/admin gates + merge JSON details (audit bugs #1, #5p, #13)`.** `DELETE /api/teacher/students` (was deleting EVERY student in EVERY teacher's class) now scoped via `enrollments: { some: { class: { teacherId } } }`. Single-delete adds `teacherOwnsPair`. `PATCH /dictionary/:wordId` returns 403 (admin role pending — see `Dplan/Admin_God_Access_Plan.md`). Skip-task and `PATCH /scores/:scoreId` now wrap upserts in `prisma.$transaction` + `mergeDetails` to stop wiping student writingText/answerLog/pearlFeedback.
- **#30 — `fix(messages): teacherOwnsPair check on direct + thread endpoints (audit bug #4)`.** `POST /direct`, `GET /direct/:pairId`, and `POST /:id/thread` (teacher branch) all gate on `teacherOwnsPair`. Stops cross-tenant DM/thread access between teachers.
- **#31 — `fix(shifts): unlock check + JSON merge + concern delta clamp (audit bugs #5p, #9)`.** `POST /weeks/:weekId/missions/:missionId/score` verifies the pair's class has unlocked the week (presence in `ClassWeekUnlock` — model has no `unlocked` boolean). `POST /progress/:weekId/:stepId` reads existing details and merges via `mergeDetails`. `POST /concern` rejects non-finite delta and clamps to ±1.0 per request.
- **#28 — `fix(sessions): mergeDetails on phase complete (audit bug #5p)`.** `POST /sessions/.../complete` upsert now read-modify-write through `prisma.$transaction`. `mergeDetails` helper copied from shifts.ts (matching duplicate-helper convention).
- **#36 — `fix(socket): per-class rooms + pause replay + ownership on teacher commands (audit bugs #6, #7, #8)`.** Replaces global `'teacher'` socket room (cross-tenant leak) with `class:${classId}` rooms (one per teacher-owned class) plus personal `teacher:${teacherId}` room. New in-memory `classPauseState: Map<classId, ...>` persists pause state across reconnects within a backend lifetime. Student-connect handler replays `session:paused` if the class is paused — fixes the W3 writing-submit overlay bypass for refreshed/late-join students. `teacher:pause-all` / `teacher:resume-all` validate `classId` and ownership before broadcasting (no more accidental "pause every class in the app"). Per-student commands (`skip-task`/`reset-task`/`reset-shift`/`send-to-task`) gated via inline `prisma.classEnrollment.findFirst` ownership check.
- **#38 — `fix(socket): convert remaining io.to('teacher') route emits to per-class (post Unit 6 follow-up)`.** Follow-up to #36 — without it, teacher real-time updates for student deletes/registrations/remediation events would silently break after #36 lands. Converted 9 emit sites in `auth.ts`, `messages.ts`, `remediation.ts` (3), `teacher.ts` (4) to `io.to('class:' + classId)`. `classId` resolved via `prisma.classEnrollment.findFirst({ OR: [{ pairId }, { userId }] })` (option chosen over exporting `onlineStudents` from socketServer to avoid #36 conflict + works for offline students).
- **#32 — `fix(health): drop filesystem listing from /api/health (audit bug #10)`.** Public `/api/health` no longer returns `briefingFiles`, `__dirname`, or other path info. Returns `{ status, timestamp, uptime }` only. `/uploads` static mount stays public per CLAUDE.md gotcha (`<video>` tags can't send auth headers; UUID filenames are sufficiently unguessable).
- **#37 — `fix(clarity-check): idempotent completion via ClarityCheckResult (audit bug #11)`.** New Prisma model `ClarityCheckResult { pairId, checkId, ... @@unique([pairId, checkId]) }` mirrors `ComplianceCheckResult`'s shape. `POST /clarity-check/complete` short-circuits with `{ alreadyCompleted: true }` when `existing.completedAt` is set. Stops infinite mastery-grinding via `+0.03/word` replay.
- **#29 — `fix(useTeacherSocket): remove destructive disconnectSocket() in cleanup (audit bug #12)`.** `frontend/src/hooks/useTeacherSocket.ts:92` no longer calls the destructive `disconnectSocket()` which was wiping ALL App.tsx-level student listeners on every TeacherDashboard unmount. Per-handler `s.off(...)` was already correct; just stopped also calling the singleton-killer.
- **#33 — `fix(compliance-check): atomic upsert on /pending (audit bug #14)`.** `GET /pending` race condition (two concurrent fetches → second 500's on unique constraint) replaced with single `prisma.complianceCheckResult.upsert({ update: {}, ... })`. Pre-existing `findUnique` short-circuit on `completedAt` retained to skip `buildComplianceQuestions(...)` when already done.

### Also shipped (related)

- **`d784aa4` — Add W4 WeekConfig committed.** `backend/src/data/week-configs/week4.ts` was untracked locally but referenced by `week-configs/index.ts`. Master couldn't build cleanly until committed; Railway deploys would have failed. Pushed directly to master after build verification (646 lines).

### Remaining manual follow-ups

- **Browser smoke test post-deploy** — login as two teachers in two browsers, verify pause-all locks students (and a refreshed student stays locked), verify dashboard does NOT show the other teacher's students.
- **Pause persistence across backend restart** — `classPauseState` is in-memory; Railway redeploys lose it. If this becomes a real classroom problem, persist via `Class.pausedAt` + `Class.pauseMessage` columns + read on socket connect.
- **Bugs 15–27 (medium severity)** — frontend setTimeouts not cleaned up in 6 task components, ComprehensionDoc/IntakeForm don't shuffle MCQ options, PEARL rate-limit increment timing, orphan ComplianceCheckResult rows on Class delete, brittle Pair cascade-delete pattern, etc. Saved for a follow-up `/batch`.

### Critical files (today)

- `backend/.env.example` (NEW), `backend/src/utils/jwt.ts`, `backend/src/routes/auth.ts`, `backend/package.json` (#34)
- `backend/src/routes/teacher.ts` (#35)
- `backend/src/routes/messages.ts` (#30)
- `backend/src/routes/shifts.ts` (#31)
- `backend/src/routes/sessions.ts` (#28)
- `backend/src/socketServer.ts` (#36)
- `backend/src/routes/auth.ts`, `messages.ts`, `remediation.ts`, `teacher.ts` (#38, narrow per-emit edits)
- `backend/src/index.ts` (#32)
- `backend/prisma/schema.prisma` + new migration `add_clarity_check_result`, `backend/src/routes/clarity-check.ts` (#37)
- `frontend/src/hooks/useTeacherSocket.ts` (#29)
- `backend/src/routes/compliance-check.ts` (#33)
- `backend/src/data/week-configs/week4.ts` (NEW commit on master, d784aa4)

---

## 2026-05-03 (Compliance Check hardening + teacher Shifts UX + diagnoses)

Mixed batch — five shipped fixes around the Compliance Check editor and teacher Shifts tab, one Shift 3 narrative tweak, plus deep diagnoses for two systemic socket issues that are *not* yet fixed (waiting on user call).

### Shipped

**`c25c8e7` — Shifts tab error UX + multer error wrapper.** Teacher report: "video upload fails and all shift task cards disappear." Root cause: `ShiftStoryboard.tsx` had a single `error` state — any operation failure (upload, embed, gate toggle) hit the early-return error block and replaced the entire steps render. Fix: split into `loadError` (still blanks the view, only set on initial fetch fail) and `opError` (dismissible inline banner above the cards). All upload/gate/embed catches now route to `setOpError` with `describeError(err, fallback)` that pulls the actual server status + JSON message. Backend gets `withMulterError()` wrapper in `backend/src/middleware/upload.ts` that converts multer errors (LIMIT_FILE_SIZE, mime rejection, fileFilter) into JSON 413/400 responses instead of Express' default HTML 500. Wired into all 4 video upload routes (welcome, briefing primary, briefing clipA/B, per-step).

**`3d18cd7` — Compliance Check editor: 2-step wizard.** Teacher report: "modal briefly opens then automatically advances without input." Root cause: `useEffect` auto-seeded ~21 dictionary words once the dictionary fetched — the empty form flashed for ~100-300ms before being replaced with the seeded state, reading as "modal jumped." Fix: removed auto-seed, then redesigned as wizard. Step 1 (Configure) = title + question count + prior-shift word count, Next button. Step 2 (Words) = WordPicker + live preview + Save. Step indicator pill at top. Save is only reachable on Step 2 so the teacher consciously walks through both choices.

**`77ae5d0` — Question count cap 5 → 6.** Frontend buttons + backend `Math.min(6, ...)` on POST and PUT.

**`b69e36b` + `69b815b` + `b078553` — Compliance Check picker gated to per-shift TOEIC target lists.** Three-layer fix:
1. (b69e36b) WordPicker no longer offers a "TOEIC only" toggle — hardcoded to TOEIC-only with a static "TOEIC ONLY" pill. Backend `filterToToeicOnly()` enforced via `DictionaryWord.isWorldBuilding=false`.
2. (69b815b) Tightened to *per-shift* `WeekConfig.targetWords`. New `getComplianceWordsByWeek()` in `backend/src/data/week-configs/index.ts` returns `Record<weekNumber, Set<lowercase>>`. `/teacher/dictionary-words/grouped?toeicOnly=true` intersects each row against the allowed set for `row.weekIntroduced`. POST/PUT `/templates` use `filterToTargetWords()` (replacing `filterToToeicOnly`).
3. (b078553) Defense-in-depth client-side filter `TARGET_WORDS_BY_WEEK` in `WordPicker.tsx` mirrors the backend list — picker stays correct even if backend redeploy lags. Backend still gates on save; frontend list must be kept in sync with `backend/src/data/week-configs/week{N}.ts`.

**`4b0a8bf` — ClassMonitor highlight class's current shift.** Mode of `(weeksCompleted + 1)` across enrolled students; ties → lowest. Matching button renders emerald with "• current" tag and ring.

**`e81ae1f` — W3 Betty overlay expansion.** Old line modeled `should` once and gave students nothing to build rule 2 or rule 3 from. New line keeps Betty's voice and adds: "you should review each case before you respond" (should + review/respond) and "you can forward it to a supervisor" (can + forward). PEARL still owns `must` (process, maintain accuracy). All three modals now have explicit, paraphrasable seeds on the same briefing card.

### Diagnosed but NOT yet fixed (waiting on user call)

**Send-to-task / live updates flake (no commit).** Symptom: teacher's "send to task" doesn't reflect immediately, websocket "breaks." Root causes identified:
1. `useTeacherSocket` cleanup calls `disconnectSocket()` which uses `socket.removeAllListeners()` — destructive primitive that wipes App.tsx listeners too. Should call `s.off(...)` per-handler only and skip `disconnectSocket()` (already does the per-handler off; just stop calling disconnectSocket on unmount).
2. Backend `onlineStudents` Map (`backend/src/socketServer.ts:33`) is in-memory and wipes on every backend restart. Railway redeploys (especially with the recent string of failed 8-second image-build retries) churn this state. Teacher gets a fresh empty snapshot on reconnect.
3. `session:task-command` is fire-and-forget; emit-to-room doesn't replay on later connect. DB state is correct (REST persisted) but live event is lost.

**Pause-all is purely client-side and doesn't replay (no commit).** Symptom: teacher paused, forgot to unpause, ungated Shift 3 — *some* students kept progressing, *some* couldn't submit writing on W3 Priority Briefing. Root cause: same fire-and-forget pattern as send-to-task.
- `frontend/src/stores/sessionPauseStore.ts` is in-memory only — no localStorage, no DB.
- `backend/src/socketServer.ts:132-148` emits `session:paused` to currently-connected sockets in the class room and forgets. No server-side persisted state.
- `socketServer.ts:225-235` (student-connection block) joins class room but never replays the pause state.
- Result: students online at click time get the lock-screen overlay (`PauseOverlay.tsx:9` — `fixed inset-0 z-[100] pointer-events-auto`). Anyone who refreshed/reconnected/joined late bypasses the pause entirely.
- The "writing submit failure" on W3 priority_briefing is the *same* bug — the cohort still under the overlay literally couldn't click Submit because `pointer-events-auto` covers everything.
- Proposed fixes (deferred): `Map<classId, { paused, message, ts }>` in socketServer + replay on connect; OR `Class.pausedAt` + `Class.pauseMessage` Prisma columns for restart-survivable state; OR both.

### Notes

- Railway backend showed 3 FAILED builds this session — all failing at `Build → Build image` in 00:08 (way too fast for `npm install + tsc + vitest`). Diagnosed as Railway-side runner/registry flake, not our code (local `npm run build` clean). Active backend stuck at `b69e36b` for some of the session; user can manually click ⋯ → Redeploy on a failed row to retry. Frontend client-side filter `b078553` covers the picker correctness during backend lag.
- Compliance Check answers ARE persisted: `ComplianceCheckResult` table holds `pairId`, `templateId`, `weekIssued`, full `questions` JSON, full `results` JSON, `correctCount`, timestamps. `GET /api/compliance-check/teacher/classes/:classId/results` endpoint + `fetchComplianceCheckResults()` client wrapper exist but **no teacher UI consumes them yet**. Future work: Gradebook drill-down panel mirroring Remediation Events pattern (PR #24).
- "Awaiting Clearance" displayed as a task name in ClassMonitor is actually a gate-blocked state emitted by `frontend/src/components/shift-queue/ShiftQueue.tsx:529`. Working as designed; just labeled ambiguously on the teacher side.

### Critical files (today)

- `frontend/src/components/teacher/ShiftStoryboard.tsx` — split error state, inline banner, `describeError()`
- `frontend/src/components/teacher/compliance-check/ComplianceCheckEditor.tsx` — 2-step wizard
- `frontend/src/components/teacher/compliance-check/WordPicker.tsx` — TOEIC-only static pill + `TARGET_WORDS_BY_WEEK` client filter
- `frontend/src/components/teacher/ClassMonitor.tsx` — `currentClassShift` mode + emerald highlight
- `backend/src/middleware/upload.ts` — `withMulterError()` helper
- `backend/src/routes/teacher.ts`, `backend/src/routes/dictionary.ts` — wired multer wrapper into upload routes
- `backend/src/data/week-configs/index.ts` — `getComplianceWordsByWeek()` exporter
- `backend/src/data/week-configs/week3.ts` — Betty overlay expansion
- `backend/src/routes/compliance-check.ts` — `filterToTargetWords()`, question cap → 6, target-word error message

---

## 2026-04-30 (afternoon batch — Remediation Module shipped)

Six PRs landed end-to-end via foundation-first `/batch` (Phase 0 by hand, Phase 1 = 5 parallel worktree agents). New feature: a behavior-triggered screen-locking 3-question vocab MCQ ("Remediation Module") that fires when the system detects intentional grinding of `concernScore`. The "punishment" is more vocabulary review — worst-case outcome of trolling = student accidentally studied harder. PEARL voice stays forced-happy throughout.

**`#21` (commit `e4c537d`) — Foundation: DB model + backend routes + frontend API client.** Adds Prisma model `RemediationModuleResult` (per-pair, per-week, with `triggerReason`, `concernAtTrigger`, `concernAfterCooldown`, `correctCount`, `clawedBack`) + migration `20260430120000_add_remediation_module_result`. Backend routes at `/api/remediation/`: `POST /trigger` (server-authoritative escalating debounce 90→60→30→0s; pulls low-mastery words via `PairDictionaryProgress` weighted by `mastery < 0.6 AND weekIntroduced ≤ currentWeek`, falls back to all dict words for fresh students; builds 3 MCQs via existing `buildComplianceQuestions`), `POST /:id/complete` (server-authoritative cooldown `−[0, 0.5, 1.0, 1.5][correctCount]` floored at 0, bumps `PairDictionaryProgress.mastery +0.03` per correct word in `prisma.$transaction`), `POST /:id/clawback` (restores cooldown, sets `clawedBack=true`), `GET /pending` (refresh-safe restoration). Socket emissions to teacher room: `student:remediation-fired/completed/clawback`. Teacher route `GET /api/teacher/remediation-events` with `classId`/`pairId`/`week` filters + ownership check. Frontend `frontend/src/api/remediation.ts` typed wrappers; `sessionStore` declares `activeRemediation`, `remediationStage`, setters as stubs.

**`#26` (commit `80bf186`) — Unit 1: Rate-trigger state machine + PEARL barks.** Implements the full state machine: ring buffer of `(timestamp, delta)` tuples, stages `'idle' | 'warned' | 'modal-open' | 'cooling-down'`. Stage A (warning bark only): cumulative `+0.4 within 30s` while `stage==='idle'`. Stage B (fire modal): cumulative `+0.7 within 60s` OR a second Stage-A trip within 90s of the first (intent detector). Backstop: `concernScore ≥ 3.0` AND `stage==='idle'`. Async-safe `fireTrigger` snapshots `expectedStage` before await; drops result if stage changed mid-flight (teacher reset, refresh, etc.). `closeRemediation` calls `completeRemediation()` API, hydrates new score, transitions to `'cooling-down'`, snapshots `modalClosedAt` + `lastCompletedModuleId`. During cooling-down, ANY positive delta within 60s triggers `clawbackRemediation` API + clawback bark + restored score; `clawbackInFlight` module flag prevents N concurrent POSTs when multiple deltas land within ms. After 60s in cooling-down with no positive delta, transition to idle via setTimeout. **Critical wiring decision**: `shiftQueueStore.addConcern` forwards positive deltas to `sessionStore.recordRateEvent(delta)` — NOT `sessionStore.addConcern(delta)` — to avoid double-counting score (sessionStore.concernScore and shiftQueueStore.concernScoreDelta are independent values). PEARL bark pools `REMEDIATION_WARNING_BARKS` / `REMEDIATION_CLAWBACK_BARKS` exported from `pearlStore.ts`; sessionStore imports + picks at fire time (no circular import — Zustand `getState()` resolves at call time, ES module live bindings).

**`#22` (commit `a2ce8cd`) — Unit 2: RemediationModule UI + App-root mount.** Forked `ClarityCheck.tsx`. Amber accent (border-amber-500, header bg amber-50) at `z-[1000]`. Title "REMEDIATION MODULE" / "STANDARD VOCABULARY VERIFICATION" / sub-subtitle "For citizens experiencing focus difficulty." (forced-happy euphemism). Forced-happy completion copy across three score bands: 3/3 emerald "Engagement restored.", 1-2/3 amber "Continue to monitor your focus.", 0/3 rose "We will continue to support your engagement." ESC + browser back blocked. `body.remediation-active` class added/removed on mount (mirrors `body.compliance-check-active` to hide PEARL Dynamic Island during modal). Refresh-safe restoration: `RemediationOverlay` component fetches `GET /api/remediation/pending` on mount with cancellation token + `expectedWeek` snapshot from `useShiftQueueStore.getState().weekConfig?.weekNumber` (Compliance Check race-condition `54ca0b0` lesson applied). `RemediationOverlay` mounted at App.tsx:262 inside `{user.role === 'student' && ...}` guard so it never fires for teachers. `onComplete` prefers Unit 1's `closeRemediation` action when present, falls back to direct `completeRemediation` API call so this unit merges independently.

**`#25` (commit `0744c1a`) — Unit 3: Clickable concern HUD tooltip + count-down animation.** New `useCountDownAnimation` hook: requestAnimationFrame-driven, ease-out cubic over 1500ms, animates only on decrease (snaps on increase). New `ConcernTooltip.tsx`: frosted dark theme matching terminal HUD, shows score + threshold band (GOOD STANDING / MONITORED / UNDER REVIEW), "Recent activity" line gated on `concernRateBuffer` existence (graceful fallback if Unit 1 not yet merged), threshold-to-next text, italic forced-happy hint *"Complete tasks correctly and your readings will naturally normalize, Citizen."* Closes on ESC or outside click. Existing concern chip in `TerminalView.tsx:137-155` wrapped in `<button>` inside `relative shrink-0` parent, displays `animatedConcern.toFixed(1)` from the hook, tints emerald-400 during descent then returns to threshold colors. Existing >=3.0 pulse animation preserved.

**`#23` (commit `6be4570`) — Unit 4: ClassMonitor remediation chip + socket listener.** New `frontend/src/api/teacher.ts` exports: `RemediationEvent` interface + `fetchRemediationEvents({ classId?, pairId?, week? })`. New `teacherStore` state: `remediationCounts: Record<pairId, number>` + `remediationLastTriggers: Record<pairId, string[]>` (last 3, capped); `incrementRemediation(pairId, triggerReason)` setter. `useTeacherSocket` listens for `student:remediation-fired` → `incrementRemediation()`; uses existing on/off pattern (does NOT touch socket reconnection per CLAUDE.md "must NOT call removeAllListeners()"). ClassMonitor chip in per-student card: hidden when count===0, amber pill at count===1, rose+pulse at count>=2. Hover tooltip lists last 3 trigger reasons. Hydration useEffect with cancellation token + `setRemediationCounts({})` BEFORE fetch resolves to avoid stale-class flash on class switch.

**`#24` (commit `03c0161`) — Unit 5: Gradebook drill-down "Remediation Events" panel.** New `fetchRemediationEventsForShift(pairId, weekNumber)` in `api/teacher.ts`. New collapsible section in `Gradebook.tsx` `DrillDown`, placed between Shift Summary and per-task list (shift-scoped, NOT per-task — diverges from spec which suggested "after PEARL & AI panel inside TaskRow"; the agent rightly noted those are per-task buttons and remediation events are per-shift). Lazy-loads on first expand. Compact table: Time | Trigger | Score | Clawback. Trigger labels: 'rate_warned' → "Warning", 'rate_double' → "Repeated grinding", 'absolute_3' → "Threshold exceeded". Score column: `2/3` for completed, `— (incomplete)` for open rows, `3/3 (clawed back)` for clawed-back rows. Empty state: "No remediation events for this shift."

**Verification batch:** all 6 PRs verified locally on master at `03c0161`. Backend `tsc` clean + vitest 34/34. Frontend `tsc -b` strict clean + vitest 15/15. Backend boots cleanly; `/api/remediation/pending` answers 401 unauthenticated. Prisma migration applied to dev DB (`prisma migrate status` reports schema up-to-date). Live e2e click-through deferred to user (no browser automation skill).

**Critical files (today's batch):**
- `backend/prisma/schema.prisma` — `RemediationModuleResult` model + `Pair.remediationResults` relation
- `backend/prisma/migrations/20260430120000_add_remediation_module_result/migration.sql`
- `backend/src/routes/remediation.ts` — 4 endpoints, server-authoritative cooldown + debounce
- `backend/src/routes/teacher.ts` — `GET /remediation-events`
- `backend/src/index.ts` — route registration
- `frontend/src/api/remediation.ts` — typed client
- `frontend/src/stores/sessionStore.ts` — full state machine
- `frontend/src/stores/shiftQueueStore.ts` — forward delta to recordRateEvent
- `frontend/src/stores/pearlStore.ts` — bark pool exports
- `frontend/src/components/remediation/{RemediationModule,RemediationOverlay}.tsx`
- `frontend/src/components/terminal/{TerminalView,ConcernTooltip}.tsx`
- `frontend/src/hooks/useCountDownAnimation.ts`
- `frontend/src/components/teacher/{ClassMonitor,Gradebook}.tsx`
- `frontend/src/hooks/useTeacherSocket.ts` + `frontend/src/stores/teacherStore.ts`
- `frontend/src/App.tsx` — mounts `<RemediationOverlay />` behind student-role guard
- `frontend/src/index.css` — `body.remediation-active .pearl-island { display: none !important; }`

**Pattern lessons confirmed (no new ones):** cancellation token + `expectedWeek` snapshot pattern continues to be mandatory for any async work in App-root or shift-cascade modals (Unit 2 uses it on `fetchPendingRemediation`; Unit 4 uses it on hydration). Server-authoritative score math prevents client tampering; the cooldown ladder lives entirely on the backend. PEARL voice doctrine held throughout — no punitive copy snuck in even at clawback.

---

## 2026-04-30

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

## 2026-04-29

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

## 2026-04-27 / 28

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

---

## 2026-04-23 / 24

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

## 2026-04-21 / 22

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

## 2026-04-17

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
