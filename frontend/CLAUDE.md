# Frontend — Lexical Republic

Frontend-specific gotchas and conventions. For project-wide rules, vision, and locked decisions, see the root `CLAUDE.md`. For day-by-day shipped work, see `docs/changelog.md`.

**Stack:** Vite + React 19 + TypeScript + Tailwind + Zustand + react-three/fiber.

## Commands
`npm run dev` | `npm run lint` | `npm run build` | `npm run test`

## Build Verification
- **Always use `npm run build` (not `npx tsc --noEmit`) for pre-push verification.** `npm run build` runs `tsc -b` (build mode), which is strictly stricter than `tsc --noEmit`. Skipping this lets stale references slip through and Railway silently keeps serving the OLD bundle. JSX tag mismatches (e.g. `<>` swapped to `<div>` without updating the closing tag) are the #1 silent killer.
- **Bundle hash check**: if the JS filename hash doesn't change after push, the frontend didn't rebuild.

## ShiftQueue Gotchas
- **WritingEvaluator**: Frontend sends `content` (not `text`), with `grammarTarget`/`targetVocab`/`lane` inside `metadata`.
- **Message dedup requires 3 layers**: inFlightKeys Set + backend `$transaction` + GET response dedup.
- **Config field format mismatches are the #1 bug source**: Always verify config field names match component interface.
- **Message triggers must sequence after `loadMessages`**: Single mount effect with `.then()` chain + refs.
- **WordMatch inverted ternary was the original bug**: `pair.definition === ... ? false : ...` — when correct, returned false. Fixed with simple `selectedWord === defWord`.
- **All quiz/match tasks must shuffle options**: WordMatch (both columns), VocabClearance (items + options), ErrorCorrectionDoc (dropdown options), ClozeFill (word bank). All use Fisher-Yates + `correctIndex` remapping. Shuffle in `useRef`/`useMemo` to keep stable across re-renders.
- **VocabClearance answer leak**: `item.word` was rendered at top of each question — removed. Never show the correct answer before the student chooses.
- **Harmony unlock gate**: Gated by teacher `harmonyOpen` toggle on Class model. Old week-1 ShiftResult check was dead code (removed in Phase 0). Teacher opens Harmony when students are ready.
- **IntakeForm briefing card**: `type: 'briefing'` — read-only memo with `paragraphs[]` + `from` field. Provides input before comprehension questions (correct SLA sequencing).
- **Writing prompts are vocabulary-focused**: "Use 3-5 sentences using as many target words as possible" — NOT content-recall. PEARL evaluation criteria updated to match.
- **Touch support**: All interactive elements need `active:` Tailwind states (active:scale-95, active:bg-*) for touchscreen Chromebooks.
- **ClozeFill word bank shows full words** — `wordHint()` prefix truncation removed. Word bank and instruction text display complete words.
- **Messaging rendered in GameShell** — `MessagingPanel` + `MessageNotification` in GameShell (not TerminalView) so they're visible in both OfficeView and TerminalView. `MessageBadge` stays in TerminalView header.
- **Shift exit confirmation**: TerminalView `showExitConfirm` state. Both `⌂ HOME` and `✕ CLOSE` (via `onClose` prop to TerminalAppFrame) show modal when `terminalApp === 'clarity-queue'`. Non-shift apps bypass. `doExit()` calls `returnToDesktop()` + `navigate('/')`. Modal uses shift queue palette (cream/warm), z-[60].

## Remediation Module Gotchas (added 2026-04-30)
- **`shiftQueueStore.addConcern` forwards positive deltas to `sessionStore.recordRateEvent(delta)`, NOT to `sessionStore.addConcern(delta)`** — this is critical. `concernScore` (sessionStore) and `concernScoreDelta` (shiftQueueStore) are independent values flushed only at task completion. Calling `addConcern` from both stores would double-count the score. Calling only `recordRateEvent` lets the state machine see grinding deltas in real time without modifying score.
- **Rate buffer lives in `sessionStore.concernRateBuffer`** — array of `{at, delta}` for positive deltas only, evicted >60s old. State machine sums 30s and 60s windows on every `recordRateEvent` call.
- **State machine stages**: `'idle' | 'warned' | 'modal-open' | 'cooling-down'`. Stage A bark at +0.4/30s while idle. Stage B modal at +0.7/60s OR second Stage-A within 90s. Backstop at `concernScore ≥ 3.0` AND idle. After modal closes → cooling-down (60s); ANY positive delta in window fires clawback. After 60s with no delta, transition to idle via setTimeout (cancel if state changes).
- **Async safety**: `fireTrigger` snapshots `expectedStage = get().remediationStage` BEFORE the `triggerRemediation()` await; drops the result if stage changed mid-flight (teacher reset, refresh, etc.). Prevents stale modal-open bleed.
- **Single-flight clawback guard**: module-level `clawbackInFlight` boolean flag prevents N concurrent `POST /clawback` calls when multiple deltas land within milliseconds.
- **Refresh restoration**: `RemediationOverlay` calls `fetchPendingRemediation()` on mount with cancellation token + `expectedWeek` snapshot from `useShiftQueueStore.getState().weekConfig?.weekNumber`. If pending row's weekNumber doesn't match expected, ignore (Compliance Check race-condition `54ca0b0` lesson applied).
- **App-root mount, NOT inside ShiftQueue**: `<RemediationOverlay />` at `App.tsx:262` inside `{user.role === 'student' && ...}` guard — never renders for teachers. Modal can fire from any app surface (terminal desktop, Office, Harmony, etc.), not just within a shift.
- **`body.remediation-active` CSS class** — added/removed by RemediationModule on mount/unmount. Hides PEARL Dynamic Island during modal (mirrors `body.compliance-check-active`). z-[1000].
- **Amber accent (NOT cyan)** — visually distinguishes from Clarity Check / Compliance Check (which are cyan). Students know amber = behavior-triggered.
- **PEARL voice in remediation copy stays forced-happy**. Bark pools `REMEDIATION_WARNING_BARKS` and `REMEDIATION_CLAWBACK_BARKS` exported from `pearlStore.ts`. Even at clawback ("Your readings remain elevated, Citizen. Disappointing — but we'll keep trying together.") never angry, never punitive. The dystopia is the saccharine concern.
- **No circular import**: `sessionStore` imports bark pools from `pearlStore`; `pearlStore` doesn't import from `sessionStore`. Zustand `getState()` resolves at call time + ES module live bindings — safe.
- **Concern HUD chip is now a `<button>`** wrapping the existing chip JSX in `TerminalView.tsx`. `useCountDownAnimation(concernScore)` returns `{ displayValue, isAnimating }`. Render `displayValue.toFixed(1)` instead of raw score. During `isAnimating`, override threshold color with emerald-400 tint. Existing >=3.0 pulse animation preserved.
- **Tune knobs** (when calibrating after live observation): thresholds in `sessionStore.ts` (`0.4`, `0.7`, `30000`, `60000`, `90000`, `3.0`). Don't pre-tune; calibrate on observed behavior.

## Harmony App Gotchas
- **Censure queue option shuffle**: Fisher-Yates in `useRef` with `mapping[displayIdx] = originalIdx` for backend validation — same pattern as VocabClearance/ErrorCorrectionDoc.
- **Static content across 5 data files**: Bulletins, PEARL tips, notices, sector reports, censure items — all keyed by week number in `Record<number, T[]>` pattern. Generator loads static first, AI fills remaining.
- **Per-type content counting**: `prisma.harmonyPost.groupBy({ by: ['postType'] })` with `DEFAULT_CONTENT_COUNTS` targets — replaced old dual-count (censure<5, feed<4) check.
- **Generation lock**: In-memory `Map<string, Promise<void>>` per classId prevents concurrent duplicate generation.
- **Route-aware generation**: `ensureHarmonyPostsExist()` only generates for weeks in the class's `narrativeRoute`.
- **FEED_POST_TYPES vs CENSURE_POST_TYPES**: Constants in harmony.ts. Feed filter uses `{ in: FEED_POST_TYPES }`, censure filter uses `{ in: CENSURE_POST_TYPES }`. CRITICAL: without this, bulletins/tips/notices would appear in censure queue.
- **3-tier vocabulary**: focus (current week, sky), recent (prev 2 route-weeks, amber), deep (older, gray). `getHarmonyReviewContext()` in harmonyFeed.ts resolves by route index, not absolute week number.
- **Component registry**: FeedTab routes `post.postType` to card components via switch. Default fallback is PostCard. New types: HarmonyBulletin (sky), HarmonyPearlTip (emerald), HarmonyNoticeCard (amber), HarmonySectorReport (gray).
- **Post deletion cascade order**: censure responses on replies → replies → censure responses on post → post.
- **Citizen-4488 narrative escalation**: Week-specific posts + NPC arc phases in `harmonyCharacters.ts`. `getCharacterPhase()` resolves mood/tone per week and route.
- **Bulletin comprehension is ephemeral**: `POST /bulletins/:id/respond` checks answer but writes nothing to DB. `bulletinAnswers` in store is session-only.
- **Archives tab (Phase C)**: 5th tab with 3 sub-sections (vocabulary/timeline/bulletins). `GET /api/harmony/archives?section=` for lazy loading. `lastHarmonyVisit` on Pair model tracks NEW badges.
- **PEARL annotations are session-only**: `recentCensureResults` + `citizen4488Actions` in harmonyStore. `computePearlAnnotations()` runs on every censure response or 4488 action.
- **harmony:new-content socket event**: Emitted from `harmonyGenerator.ts` when posts are inserted. Listener in App.tsx sets `hasNewContent` in harmonyStore. Cleared when student opens Harmony.

## MonitorPlayer Gotchas
- **Autoplay timeout fallback**: 4-second timer shows manual play button if video stalls. Catches: stalled loads, slow networks, silent autoplay rejection, suspended downloads.
- **Muted autoplay fallback**: `tryPlay()` attempts unmuted first, falls back to `v.muted = true` + retry. Browsers always allow muted autoplay. Manual play button only if both fail.
- **CSS style prop: no multi-line template literals**: `background` with literal newlines in inline style can cause browsers to reject the entire value. Use `backgroundColor` + single-line `backgroundImage` as separate properties.
- **Edge fade mask**: `maskImage` + `WebkitMaskImage` (Safari needs webkit prefix) radial gradient on root div dissolves bezel edges.
- **Volume knob at left:62%**: Moved right to avoid overlapping play/pause controls (which span left:30% width:40%).

## Browser Media Gotchas
- **Off-DOM video elements lose media data after idle** — must call `video.load()` + wait for `canplay` before replaying.
- **Split audio/video for Safari autoplay** — use silent `.mp4` for visual + separate `new Audio()` for sound.
- **`<video>` tags can't send auth headers** — routes serving video must be BEFORE `router.use(authenticate)`. Use express.static `/uploads/` path instead of API routes.
- **Browser autoplay rejection is SILENT** — `onError` does NOT fire. Must call `v.play().catch()` and show manual play button on rejection.
- **FormData uploads must use `Content-Type: undefined`**: Never set `Content-Type: 'multipart/form-data'` explicitly — it strips the boundary parameter. Use `undefined` to let the browser auto-generate the correct header with boundary.

## Teacher Shifts Tab Gotchas (added 2026-05-03)
- **Split error state in `ShiftStoryboard.tsx`**: `loadError` (blanks the view, only set on initial fetch failure) vs `opError` (dismissible inline banner above the cards, set on per-step upload/embed/gate failures). Never use a single `error` state — a single failed upload would replace the entire storyboard render and the teacher loses every task card.
- **`describeError(err, fallback)` helper** at top of `ShiftStoryboard.tsx` extracts axios `error.response.status` + JSON `error` field so teacher sees the actual cause (e.g. "413 File too large [LIMIT_FILE_SIZE]") instead of the generic fallback. Reuse this pattern for any teacher-facing operation that hits a server endpoint.

## Compliance Check Editor Gotchas (added 2026-05-03)
- **2-step wizard, NOT a single form**: Step 1 = Configure (title + question count + prior-shift count). Step 2 = Words (WordPicker + live preview + Save). Save button is gated to Step 2; Step 1 only has "Next: Pick Words →". The teacher must consciously walk through both choices. Reverting to a single-form view re-introduces the "modal opens then jumps" complaint — past `useEffect` auto-seed flashed empty for ~100-300ms then filled itself, reading as an unwanted auto-advance.
- **NO auto-seed on open**: editor opens with `words: []`. The "↻ Auto-fill" button on Step 2 is the only seed path; teacher must click it. Auto-seed `useEffect` was removed 2026-04-30; do not re-add.
- **Question count cap = 6** (not 5). Both frontend buttons `[1,2,3,4,5,6]` and backend `Math.min(6, ...)` on POST and PUT.
- **Word picker is gated to per-shift `WeekConfig.targetWords`**, NOT the full TOEIC dictionary. Three layers must stay in sync:
  1. Backend `getComplianceWordsByWeek()` in `backend/src/data/week-configs/index.ts` (source of truth — reads each WeekConfig).
  2. Backend `/teacher/dictionary-words/grouped?toeicOnly=true` and POST/PUT `/templates` filter against this set.
  3. Frontend `TARGET_WORDS_BY_WEEK` in `WordPicker.tsx` mirrors the backend list as defense-in-depth (covers Railway redeploy lag). **When adding a new shift, update both `week{N}.ts` AND the frontend list.**
- **No "TOEIC only" toggle**: removed 2026-05-03. Hardcoded to TOEIC-only with a static pill. The toggle was misleading — Compliance Checks are TOEIC-only by doctrine.

## ClassMonitor: current-shift highlight (added 2026-05-03)
- **Mode of `(weeksCompleted + 1)`** across enrolled students = the shift most of the class is on. Ties resolve to the lowest shift. The matching "Move all to Shift N" button renders emerald with a "• current" tag. Computed inside ClassMonitor render — no store action needed.

## Pause-All & Send-to-Task (KNOWN BUGS — diagnosed 2026-05-03, NOT YET FIXED)
- **`sessionPauseStore` is in-memory only** — no localStorage, no DB. New connections (refresh, late join, reconnect after Wi-Fi blip) do NOT receive the pause state because Socket.IO doesn't replay missed events. Teacher pauses → some students get the overlay, some don't.
- **`PauseOverlay.tsx:9`** uses `fixed inset-0 z-[100] pointer-events-auto` — covers Submit buttons. Students stuck under the overlay literally cannot click any task control. This is why a paused class can present as "writing submit failed" for the cohort still online from the pause click while late-joiners proceed normally.
- **`session:task-command` is fire-and-forget** — same root cause. `useTeacherSocket` cleanup calls `disconnectSocket()` which uses `socket.removeAllListeners()` (destructive primitive); should switch to per-handler `s.off(...)` only and not call `disconnectSocket()` on unmount. Backend `onlineStudents` Map wipes on every restart (Railway redeploys churn this state) — needs server-side persistence + replay-on-connect for both pause and online-state.
- **Proposed fix** (waiting on user call): in-memory `Map<classId, { paused, message, ts }>` in `socketServer.ts` + replay on student connection; OR `Class.pausedAt` + `Class.pauseMessage` Prisma columns; OR both.

## CSS / Layout / Stacking Context
- **`overflow-hidden` clips absolutely-positioned children** — if a parent card has `overflow-hidden` (e.g. for stamp watermarks), dropdowns inside child components will be clipped. Fix: wrap the overflow-needing element in its own container instead of applying overflow to the whole card.
- **Chromebook viewports are short** — UI elements below a large hero image may be pushed off-screen. Prefer overlaying buttons inside the image area rather than constraining image size.
- **`relative z-[N]` creates stacking context** — any `fixed` overlay inside it is trapped. The overlay's z-index is evaluated WITHIN the parent context, not above sibling elements. This caused video clip overlay flicker (z-50 inside z-1 context couldn't reliably cover the header).
- **CRT scan line uses `z-index: -1`** (not 0) so TerminalAppFrame content doesn't need a stacking context to appear above it.
- **TerminalAppFrame content wrapper**: `relative` only (NO z-index) — intentionally avoids creating stacking context.
- **Tailwind z-index syntax**: use `z-[25]` bracket syntax, not `z-25`.
- **Inline `style` overrides Tailwind classes** — never mix inline `position` with Tailwind positioning.

## R3F / Three.js Gotchas
- **`@react-three/postprocessing` v3.0.4 BROKEN** with R3F v9 + three.js 0.182 + React 19 StrictMode — use raw `postprocessing` + `n8ao` libs directly.
- **drei `<Environment preset="...">` requires `<Suspense>` boundary**.
- **Vite HMR caches stale modules** — after removing imports, clear `node_modules/.vite` and hard refresh.

## Socket / Reconnect
- **Socket reconnection must NOT destroy listeners**: `connectSocket()` reconnects stale sockets via `socket.connect()` instead of `removeAllListeners()` + recreate. Destroying would wipe App.tsx event handlers.

## Visual Palette (CANONICAL)
- **Shift queue palette**: bg=#F5F1EB (cream), cards=white, border=#D4CFC6, border-light=#E8E4DC, panel-bg=#FAFAF7, text-primary=#2C3340, text-body=#4B5563, text-muted=#8B8578, text-label=#B8B3AA, text-meta=#9CA3AF, accent=sky-600, success=emerald, error=rose, warning=amber.
- **No dark theme classes in shift queue**: ios-glass-card, ios-glass-pill, font-dseg7, text-neon-*, text-white/*, border-neon-* are ALL banned.
- **Terminal desktop palette**: outer bg=#000000 (pure black), monitor screen=cyan CRT gradient (#8EBCC1→#95C2C6→#82B0B5), desktop text=#1A3035/#2A4A4E/#3A5A5E (dark teal), header/taskbar bezels=#0A0A0A→#050505.
- **CRT scan line**: `crt-monitor-screen::after` — white horizontal sweep, 6s cycle, z-index:0 (behind content).
- **App tile icons**: 240px width (`w-[240px]`), `object-contain`, transparent backgrounds — Office, Lexicon, Current Shift, Harmony, My File PNGs in `frontend/public/images/`.
- 3D Office: light oak desk (#D4C4A8), brushed steel (#C0C0C0), warm walls (#E0DDD8).
- Authoritative Dplan palette: Mint Cream #E8F5E9, Powder Blue #B3E5FC, Pale Rose #FCE4EC, Buttercream #FFF9C4, Lavender Mist #E1BEE7.
- Typography target: DM Serif Display (titles), Inter (body), JetBrains Mono (terminal).
- DSEG7 font: self-hosted at `public/fonts/` — **NO LONGER USED in shift queue** (removed in retheme).

## Welcome Video System
- **Monitor frame**: `frontend/public/images/welcome-monitor.jpg` (2744x1568, compressed to ~550KB at quality 70) — retro CRT monitor.
- **Loading state**: MonitorPlayer shows "INITIALIZING DISPLAY..." while image loads, then fades in (300ms transition).
- **Video preload**: `preload="metadata"` on `<video>` for faster initial load.
- **Screen positioning**: `clip-path: polygon()` with 13 points tracing the glossy black glass area.
- **Video URL**: `resolveUploadUrl('/uploads/welcome/welcome-video.mp4')` — static serving, no auth.
- **Student UI**: WelcomeVideoModal.tsx — autoplay + manual play fallback + volume toggle.
- **Proceed/Skip buttons**: Inside CRT screen area (not below monitor) for Chromebook visibility.
- **CRT effects**: Scanline overlay + vignette (inset box-shadow) + radial glare.
- **Playback controls**: Rewind 10s + pause/play on bezel, vintage brass volume knob.
- **Login music**: `Synthetic_Serenity.mp3` (replaced `The_Iron_Grip_Overture.mp3`).

## Teacher Dashboard
- **ClassManager.tsx**: expandable students/weeks panels, delete class/remove student with confirmations, class default tier toggle (G1/S2/I3).
- **ClassMonitor.tsx**: per-student delete + bulk "Delete All" in header, task controls for all students (online + offline), per-student difficulty tier selector, per-student + class-wide "Move to Shift" controls.
- **ClassMonitor cards always expandable** — no longer gated on `student.online`.
- **Send-to-task uses 3-tier fallback** — `taskList` resolves: `student.online?.tasks` → `lastKnownStatus.tasks` → `shiftStatus?.tasks`. `lastKnownStatus` preserved on disconnect keeps buttons visible without manual card expand.
- **AVAILABLE_SHIFTS constant** in ClassMonitor.tsx — currently `[1, 2, 3]`, update when new weeks are built.

## TS / Vite
- `import type` needed for type-only imports (Vite warnings).
