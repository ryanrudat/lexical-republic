# Implemented Features

## Student Experience
- Login and boot sequence are live.
- Terminal view is the primary learning interface.
- Active terminal apps in guided mode: `clarity-queue`, `harmony`, `my-file`
- `duty-roster` hidden in guided mode; visible in free-roam mode. Shows instruction text ("Choose an unlocked shift to start. Complete each shift in order to unlock the next one.").
- Harmony locked until Shift 1 is completed (checks `ShiftResult` record, not `currentWeekNumber`).
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
- `LaneScaffolding` — lane-aware scaffolding (L1: sentence starters + word bank, L2: word list, L3: bonus question)

**Writing evaluation:**
- Frontend sends `content`, `phaseId`, `activityType`, with `grammarTarget`/`targetVocab`/`lane` in `metadata`
- Backend: `POST /api/submissions/evaluate` — Layer 1 auto-checks (word count, vocab usage) + Layer 2 AI rubric (fail-open)
- Vocabulary matching uses Porter Stemmer on both frontend (`frontend/src/utils/stemmer.ts`) and backend (`backend/src/utils/stemmer.ts`)
- Student writing persisted in `MissionScore.details` JSON blob
- Writing prompts are vocabulary-focused ("Use 3-5 sentences using as many target words as possible"), not content-recall
- Lane 1 guided questions use vocabulary-pairing exercises ("Write a sentence using 'arrive' and 'check'")

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

**Chat Rate Limiting:**
- 20 messages per shift per student (in-memory counter keyed by `pairId-weekN`)
- In-world dystopian responses when limit reached ("Communication allocation exhausted, Citizen")
- Frontend disables input field and send button when rate-limited
- 5-second cooldown between messages, 200-character max per message
- Resets on new shift (different week key) or server restart

## Character Messaging System
- `MessagingPanel` — slides from right (360px, z-[41]), inbox/conversation navigation
- `InboxView` — messages grouped by character name into conversation threads; one card per character with message count badge, preview from latest message, and unread indicator
- `ThreadView` — full conversation: character message → reply options → student reply → typing indicator → character response. When opened from grouped inbox, all messages from that character render in chronological order
- `MessageNotification` — toast stays until student clicks (body opens full conversation with that character, X dismisses)
- Messages triggered by `task_start`, `task_complete`, `shift_start` events from WeekConfig
- Dedup: module-level `inFlightKeys` + backend `$transaction` + GET response dedup
- Header icon layout: [Dictionary] [Messages] | [PEARL eye + label] (Ministry text and PEARL label hidden on mobile)
- Store: `selectedConversation` (character name) for grouped view, `selectedMessageId` for legacy single-message navigation

## Harmony App (State Social Network)
- Locked until Shift 1 completed (checks `ShiftResult` record)
- Two tabs: **Feed** (citizen posts) and **Censure Queue** (language correction exercises)
- Content accumulates across shifts — queries scoped by `weekNumber: { lte: currentWeekNumber }`

**Feed:**
- AI-generated + seed + student posts, sorted newest-first
- Citizen-4488 recurring character with escalating narrative across weeks
- Students can delete their own posts (cascade: replies → censure responses → post)
- Tappable highlighted vocabulary words show "Target word" / "Review word" tooltips
- Citizen-4488 posts have Approve/Flag interaction buttons

**Censure Queue (language exercises):**
- Three types: `censure_grammar` (verb form), `censure_vocab` (word meaning MCQ), `censure_replace` (fill-in-blank)
- Error word highlighted in post text (pink pill for grammar, cyan for vocab, amber brackets for replace)
- Question prompt names the specific error word: `Find the correct form of "arrives":`
- Options shuffled via Fisher-Yates with index mapping back to original for validation
- Post-answer feedback: correct option (green + checkmark), wrong pick (red + X), others dimmed
- Neon stamp overlay (`ResultOverlay`): large check or X renders for 3.5 seconds after submission
- Tab badge shows unreviewed item count (pink pill)

**Content generation pipeline:**
- `ensureHarmonyPostsExist()` called lazily when student opens Harmony
- Checks censure (<5) and feed (<4) thresholds separately per week per class
- Static hand-written censure items for weeks 1-3 (`STATIC_CENSURE_ITEMS` in `harmonyGenerator.ts`): 8 items each (3 grammar + 3 vocab + 2 replace)
- AI generation via OpenAI when available, falls back to static + template content
- Seed feed posts in `backend/src/data/harmonyFeed.ts` for weeks 1-3

## MonitorPlayer (Shared CRT Video Player)
- **Single source of truth** for all video playback: `frontend/src/components/shared/MonitorPlayer.tsx`
- Used by: WelcomeVideoModal, ShiftQueue task clip gate, PhaseClipPlayer, BriefingStep, StepVideoClip
- **Retro CRT monitor frame**: Video plays inside vintage monitor image (`public/images/welcome-monitor.jpg`, 2744x1568, compressed to ~550KB)
- **Loading state**: Shows "INITIALIZING DISPLAY..." text while monitor image loads, then fades in over 300ms
- **Video preload**: `preload="metadata"` on video element for faster initial load
- Screen positioned with `clip-path: polygon()` tracing the exact glossy black glass shape
- CRT visual effects: scanline overlay, vignette edge blending (inset box-shadow), radial glare gradient
- Seekable progress bar overlaid on the monitor's green LED strip
- Playback controls: rewind 10s + pause/play buttons on bezel, vintage brass volume knob — all touch-friendly
- Autoplay rejection handling: "Play Transmission" manual play button overlay
- STANDBY screen when no video source; auto-skip after 2s on video load error (404/missing file)
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
- Tabs: Class, Grades, Shifts, Dictionary
- Briefing Setup: episode title/subtitle, Canva/embed URL, fallback text
- Now Showing sequence: `clip_a → activity → clip_b`
- Clip-specific media inputs (upload or embed URL)
- Grades: per-student drill-down, inline score editing, writing viewer, week reset, concern override (dual ShiftQueue/PhaseRunner support)
- Dictionary: editable word table (inline edit → PATCH save)
- Shifts: welcome video upload + Shift Storyboard (per-task video upload, embed URL, hide/show toggle)
- **ClassManager**: expandable students/weeks panels per class, delete class (cascade), remove individual students with confirmation dialogs
- **ClassMonitor**: per-student delete button, bulk "Delete All Students" in header, both with destructive confirmation dialogs
- **Task controls work for all students** (online and offline): Skip Task, Reset Task, Reset Shift use REST API (`POST /api/teacher/students/:studentId/task-command`) that persists directly to DB. Online students also get instant socket relay. Student cards are always expandable regardless of connection status.
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
- **CRT scan line**: White horizontal line sweeps down the monitor screen every 6s (`crt-monitor-screen::after`), rendered behind app content (`z-index: 0`)
- **Animated grid**: Cyan grid lines (`rgba(0, 229, 255, 0.03)`) drift slowly across the black surround
- **CRT vignette**: Inset box-shadow darkens edges of the full terminal frame
- **App tiles**: All 6 tiles (Office, Lexicon, Current Shift, Harmony, My File, Duty Roster) use custom PNG icons at 240px width with transparent backgrounds — no clipping, cyan CRT shows through
- **App icon files**: `office-icon.png`, `lexicon-icon.png`, `current-shift-icon.png`, `harmony-icon.png`, `my-file-icon.png` in `frontend/public/images/`
- **Desktop text**: Dark teal tones (`#1A3035`, `#2A4A4E`, `#3A5A5E`) readable on cyan background

## Voice Log Quality Gate
- Requires at least one rubric item checked AND successful recording upload
- Upload passes `missionId` to backend and returns created recording id
