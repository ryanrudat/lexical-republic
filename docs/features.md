# Implemented Features

## Student Experience
- Login and boot sequence are live.
- Terminal view is the primary learning interface.
- Active terminal apps in guided mode: `clarity-queue`, `harmony`, `my-file`
- `duty-roster` hidden in guided mode; visible in free-roam mode.
- Harmony locked until Shift 3.
- Terminal header `HOME` button returns to terminal desktop and navigates to `/`.
- Terminal desktop tiles (in order): Office, Lexicon, Current Shift, Duty Roster, Harmony, My File.
- Students are guided (not free-roam) in the current phase.

## ShiftQueue System (Weeks 1-3)
Config-driven task queue. Each week has 4 tasks driven by static `WeekConfig` TypeScript files.

- Backend: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts` — served via `GET /api/shifts/weeks/:weekId/config`
- Frontend: `ShiftQueue.tsx` renders tasks via `TASK_REGISTRY` lookup (extensible)
- Branching: `ClarityQueueApp.tsx` checks `weekConfig?.shiftType === 'queue'` before falling through to PhaseRunner
- Stores: `shiftQueueStore` (task progress, concern delta), `messagingStore` (character messages, notifications)

**Task types:** `intake_form`, `vocab_clearance`, `document_review`, `contradiction_report`, `shift_report`, `word_match`, `word_sort`, `priority_briefing`, `priority_sort`, `cloze_fill`

**Shared components:**
- `TargetWordHighlighter` — word status chips (emerald=used, neutral=unused), progress bar, Porter Stemmer matching (inflected forms accepted)
- `WritingEvaluator` — 3-attempt system: full eval → relaxed threshold → auto-pass. Calls `POST /api/submissions/evaluate`
- `TaskCard` — stamp animation wrapper (idle → completing → stamped), light theme with emerald completion state
- `LaneScaffolding` — lane-aware scaffolding (L1: sentence starters + word bank, L2: word list, L3: bonus question)

**Writing evaluation:**
- Frontend sends `content`, `phaseId`, `activityType`, with `grammarTarget`/`targetVocab`/`lane` in `metadata`
- Backend: `POST /api/submissions/evaluate` — Layer 1 auto-checks (word count, vocab usage) + Layer 2 AI rubric (fail-open)
- Vocabulary matching uses Porter Stemmer on both frontend (`frontend/src/utils/stemmer.ts`) and backend (`backend/src/utils/stemmer.ts`)
- Student writing persisted in `MissionScore.details` JSON blob

**Dictionary word gating:** Words gated by student progress (MissionScore/ShiftResult), not ClassWeekUnlock.

## Shift Runner (Weeks 4+)
Fixed 7-step sequence: `recap` → `briefing` → `grammar` → `listening` → `voice_log` → `case_file` → `clock_out`

Step navigation gated by completion. All steps support optional video via `StepVideoClip` component.

## Party Lexical Dictionary
- Terminal-only sidebar (slides from LEFT, `z-[40]`), dark overlay behind (`z-[39]`)
- DictionaryIcon: book-shape SVG (32x36) in terminal header with green glow pulse, gold badge
- Lexicon tile on terminal desktop grid
- Own CSS variable system: `.dict-panel` class with `--dict-*` tokens
- Fonts: Source Serif 4 (definitions), Noto Sans TC (Chinese translations)
- Three card variants based on `word.status`:
  - **Approved** (green): mastery bar, Chinese toggle (one-way), notes, family chips, TOEIC
  - **Proscribed** (red, week 10+): struck-through definition, "REMOVED FOR COLLECTIVE SAFETY"
  - **Recovered** (amber, week 10+): restored definition, amber mastery bar
- Filter tabs: ALL / WEEK / MASTERED / STARRED / BY FAMILY / BY TOEIC / PROSCRIBED (hidden until week 10)
- Rank ribbon: Lexical Trainee → Associate → Officer → Commander → Director
- Starred words and Chinese reveal persisted to DB
- Stats ribbon: word count, mastered count, mini mastery meter, rank title

## PEARL System
- Visually anchored in terminal header with persistent eye + state label
- Bottom message strip is one-way ambient messaging (no student chat input)
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

## Character Messaging System
- `MessagingPanel` — slides from right (360px, z-[41]), inbox/thread navigation
- `InboxView` — preview cards sorted most-recent-first with color dot, designation, preview, timestamp
- `ThreadView` — full conversation: character message → reply options → student reply → typing indicator → character response
- `MessageNotification` — toast stays until student clicks (body deep-links to thread, X dismisses)
- Messages triggered by `task_start`, `task_complete`, `shift_start` events from WeekConfig
- Dedup: module-level `inFlightKeys` + backend `$transaction` + GET response dedup
- Header icon layout: [Dictionary] [Messages] | [PEARL eye + label] (Ministry text and PEARL label hidden on mobile)

## Welcome Video Gate
- One-time modal for pairs with `hasWatchedWelcome === false`
- **Retro CRT monitor frame**: Video plays inside a vintage monitor image (`public/images/welcome-monitor.jpg`), positioned with `clip-path: polygon()` tracing the exact glossy black screen shape
- CRT visual effects: scanline overlay + radial glare gradient
- Progress bar overlaid on the monitor's green LED strip position
- Volume mute/unmute toggle inside the screen area
- Autoplay rejection handling: "Begin Orientation" manual play button overlay
- Teacher-uploadable video via `/api/dictionary/welcome-video` (multer, 200MB limit)
- Teacher delete video via `DELETE /api/dictionary/welcome-video`
- Video served via static `/uploads/welcome/welcome-video.mp4` (no auth needed for `<video>` tags)
- Static fallback: green CRT "WELCOME TO THE MINISTRY" text inside screen, auto-proceeds after 5s
- CA-1 test pair gets "SKIP (TEST)" button below monitor
- Mounted in `App.tsx` after boot sequence, before routes

## Teacher Dashboard (`frontend/src/pages/TeacherDashboard.tsx`)
- Tabs: Class, Grades, Shifts, Dictionary
- Briefing Setup: episode title/subtitle, Canva/embed URL, fallback text
- Now Showing sequence: `clip_a → activity → clip_b`
- Clip-specific media inputs (upload or embed URL)
- Grades: per-student drill-down, inline score editing, writing viewer, week reset, concern override (dual ShiftQueue/PhaseRunner support)
- Dictionary: editable word table (inline edit → PATCH save)
- Shifts: welcome video upload + Shift Storyboard
- **ClassManager**: expandable students/weeks panels per class, delete class (cascade), remove individual students with confirmation dialogs
- **ClassMonitor**: per-student delete button, bulk "Delete All Students" in header, both with destructive confirmation dialogs
- **Student deletion cascade**: Pair → pairDictionaryProgress, missionScore, recording, pearlConversation, narrativeChoice, harmonyPost, harmonyCensureResponse, classEnrollment, characterMessage, citizen4488Interaction, shiftResult (11 related tables)

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
  - TerminalAppFrame stays dark (device chrome), content area is cream/white (government app content)
  - No ios-glass-card, no neon-* colors, no dseg7 font, no text-white/* in shift queue
  - All 16 shift queue components rethemed: ShiftClosing, ShiftQueue, TaskCard, ClarityQueueApp, IntakeForm, ClozeFill, VocabClearance, WordMatch, DocumentCard, ErrorCorrectionDoc, ComprehensionDoc, DocumentReview, ShiftReport, PriorityBriefing, PrioritySort, ContradictionReport, WordSort, LaneScaffolding, TargetWordHighlighter, WritingEvaluator
- Office/HUD: Frosted glass pills (`backdrop-blur`, `rounded-full`, semi-transparent gradients, soft shadows)
- Color roles: Sky = primary action, Emerald = success/safe, Rose = error/danger, Amber = warning/narrative
- All on-screen elements scale with monitor rect — no fixed pixel sizes
- HUD elements use warm `retro-card` style, not frosted glass

## Voice Log Quality Gate
- Requires at least one rubric item checked AND successful recording upload
- Upload passes `missionId` to backend and returns created recording id
