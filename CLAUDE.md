# The Lexical Republic — Project Memory

Last updated: 2026-03-01

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world.

Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Current Product State

### Student Experience (implemented)
- Login and boot sequence are live.
- Terminal view is the primary learning interface.
- Active terminal apps in guided mode are intentionally reduced to:
  - `clarity-queue` (main mission flow)
  - `harmony` (social feed)
  - `my-file` (student profile)
- `duty-roster` (18-shift progression) is hidden in guided mode; visible in free-roam mode.
- Harmony is locked until Shift 3.
- **Terminal header Home button**: `⌂ HOME` button in terminal header returns to terminal desktop and navigates URL to `/`. Always visible in shift views.
- **Terminal desktop tiles** (in order): Office, Lexicon (dictionary sidebar), Current Shift, Duty Roster, Harmony, My File.
- **Dictionary icon** in terminal header opens sidebar overlay.
- Students are guided (not free-roam) in the current phase.
- Students see a simple home desktop before entering the guided shift.

### Shift Runner (implemented)
Each shift uses a fixed 7-step sequence:
1. `recap`
2. `briefing`
3. `grammar`
4. `listening`
5. `voice_log`
6. `case_file`
7. `clock_out`

Step navigation is gated by completion status; students cannot skip ahead to locked future steps.

**Step video clips**: All 7 steps support optional video via `StepVideoClip` component. Renders `FrostedGlassPlayer` (frosted glass dark theme with cyan tint, loading spinner, retry button). Supports both embed URLs (iframe) and uploaded video files (via `resolveUploadUrl`).

### Story-first Location Naming (implemented)
Student-facing location labels map directly to learning purpose:
- `Shift Intake`
- `Broadcast`
- `Language Lab`
- `Evidence Desk`
- `Voice Booth`
- `Filing Desk`

### PEARL Presence (implemented)
- PEARL is visually anchored in the terminal header with a persistent eye + state label.
- Bottom message strip is one-way ambient system messaging (no student chat input).
- PEARL panel remains available via eye click.
- **PEARL eye never blinks** — all blink behavior removed. Eye has look-around and attention moments only (wide_gaze, slow_focus, iris_pulse).
- Eye state arc is wired to narrative progression:
  - welcoming → attentive → evaluative → confused → alarmed → frantic → cold → breaking → final

### PEARL AI Contextual Barks (implemented)
- PEARL barks are now contextually aware of grammar target, mastery state, vocabulary, and story beat.
- **Pattern**: Pool message shown immediately (zero latency), async AI request fires in parallel. If AI responds while bark is still visible, text swaps in-place. If AI fails or is slow, student sees the pool message.
- Backend: `POST /api/pearl/bark` — PEARL character system prompt, 3s timeout, fail-open with `isDegraded: true`.
- Frontend: `triggerAIBark(type, context, fallbackText)` in pearlStore, `useBarkContext()` hook assembles context from shift state.
- `triggerBark(type, text)` still works unchanged for custom narrative barks.
- GrammarStep wired to pass grammar target + mastery state to AI barks on correct/incorrect/concern.

### Party Lexical Dictionary (implemented)
- **Terminal-only** — dictionary lives exclusively in the terminal/shift view, NOT in the office view.
- **DictionarySidebar**: slides from LEFT (`z-[40]`), dark overlay behind (`z-[39]`). CRT scanline/vignette pseudo-elements via `.dict-panel` CSS class. PEARL panel stays on RIGHT — no mutual exclusion needed.
- **DictionaryIcon**: book-shape SVG in terminal header. Green glow pulse, gold word count badge, tilt-open hover.
- **Lexicon tile**: app tile on terminal desktop grid (alongside Office, Current Shift, etc.) — opens sidebar overlay.
- **Own CSS variable system**: `.dict-panel` class with `--dict-*` tokens (green, gold, red, amber). Does NOT touch existing Tailwind tokens.
- **Fonts**: Source Serif 4 (definitions), Noto Sans TC (Chinese translations) via Google Fonts.
- **Three card variants** based on `word.status`:
  - **Approved** (green): mastery bar, Chinese toggle (DB-persisted, one-way), notes, family chips, TOEIC
  - **Proscribed** (red, week 10+): struck-through definition, "REMOVED FOR COLLECTIVE SAFETY"
  - **Recovered** (amber, week 10+): restored definition, amber mastery bar
- **Merged filter tabs**: ALL / WEEK [dropdown] / MASTERED / STARRED / BY FAMILY / BY TOEIC / PROSCRIBED (hidden until week 10)
- **Rank ribbon**: Lexical Trainee → Associate → Officer → Commander → Director based on mastered word count
- **Starred words**: persisted to DB via `PairDictionaryProgress.starred`
- **Chinese reveal**: persisted to DB via `PairDictionaryProgress.chineseRevealed` (one-way, cannot un-reveal)
- **Stats ribbon**: word count, mastered count, mini mastery meter, rank title
- **Gold certificate border** title block with rotating tagline by `currentWeek`

### Welcome Video Gate (implemented)
- **One-time**: pair students with `hasWatchedWelcome === false` see `WelcomeVideoModal` (z-[70]) before any routes.
- Real `<video>` element pointing to `/api/dictionary/welcome-video` (teacher-uploadable).
- If no video uploaded: static fallback with "WELCOME TO THE MINISTRY" text, auto-proceeds after 5s.
- "PROCEED TO YOUR STATION" button fades in at 90% of video duration.
- **CA-1 bypass**: test pair sees "SKIP (TEST)" button immediately.
- After watching: `POST /api/dictionary/welcome-watched` → `pair.hasWatchedWelcome = true` → never shows again.
- Mounted in `App.tsx` after boot sequence, before routes.

### Teacher Dictionary Manager (implemented)
- Editable table in teacher dashboard "Dictionary" tab (indigo/slate palette).
- Columns: Word (ro), POS (ro), Definition (edit), 中文 (edit), Example (edit), Status (dropdown), Week (ro), Target (checkbox), TOEIC (dropdown).
- Inline edit → blur/Enter → PATCH `/api/teacher/dictionary/:wordId` → "Saved" indicator.
- Welcome video upload section at top (MP4/WebM/MOV).

### Voice Log Quality Gate (implemented)
Voice log completion requires:
- at least one rubric item checked
- AND successful recording upload

Upload passes `missionId` to backend and returns the created recording id to frontend.

## Story + Learning Integration

### Story beat metadata in missions
Mission config supports `storyBeat` fields:
- `beatTitle`, `location`, `objective`, `speaker`, `line`, `pressure`
- `learningFocus`, `knownWords[]`, `newWords[]`

This is rendered in the mission UI via `StoryBeatCard` so each activity explicitly shows narrative context and language target.

### 18-week narrative planning in seed
`backend/prisma/seed.ts` contains `WEEK_STORY_PLANS` for all 18 weeks.

Each week plan drives:
- episode title/subtitle
- character voice line
- objective
- grammar focus
- known words + new words
- cliffhanger

Week 1 keeps custom authored content; weeks 2-18 use the default mission generator with week-specific story/language values.

### Vocabulary seeding
Vocabulary now seeds:
- 15 Week-1 baseline words
- plus 72 story words from weekly plans (4 new words × 18 weeks)

### Dictionary seeding
Dictionary seeds separately from Vocabulary (different Prisma models):
- 49 `DictionaryWord` entries across Weeks 1-3 with Traditional Chinese translations (`translationZhTw`)
- 28 `WordFamily` groups (e.g., `fam-employ`, `fam-comply`, `fam-submit`)
- 8 `WordStatusEvent` entries for narrative status changes (grey week 6, monitored week 7, proscribed week 10)

### Character voice designations (from Dplan canon)
- William Flannery (`Clarity Associate-7`)
- Betty (`Welcome Associate-14`)
- Ivan (`Clarity Associate-22`)
- Party language: `Prior`, `Unit`, `Concern`, `Wellness Assistance`

## Teacher Controls (implemented)

### Backend endpoints
File: `backend/src/routes/teacher.ts`
- `GET /api/teacher/weeks` — returns week list plus briefing config snapshot
- `PATCH /api/teacher/weeks/:weekId/briefing` — updates briefing mission config fields:
  - `embedUrl`, `episodeTitle`, `episodeSubtitle`, `fallbackText`
- `PATCH /api/teacher/dictionary/:wordId` — edits dictionary word fields (partyDefinition, trueDefinition, exampleSentence, translationZhTw, initialStatus, isWorldBuilding, toeicCategory)

File: `backend/src/routes/dictionary.ts`
- `GET /api/dictionary` — full word list with `translationZhTw`, `starred`, `chineseRevealed`
- `GET /api/dictionary/:wordId` — single word detail
- `POST /api/dictionary/welcome-watched` — marks pair's welcome video as watched
- `POST /api/dictionary/welcome-video` — teacher upload (multer, MP4/WebM/MOV)
- `GET /api/dictionary/welcome-video` — serves uploaded welcome video
- `PATCH /api/dictionary/:wordId/starred` — toggles starred on PairDictionaryProgress
- `PATCH /api/dictionary/:wordId/chinese-revealed` — sets chineseRevealed=true (one-way)

### Teacher dashboard UI
File: `frontend/src/pages/TeacherDashboard.tsx`
- Tabs: Class, Grades, Shifts, Dictionary
- Episode Briefing Setup section:
  - Choose shift, edit episode title/subtitle
  - Set Canva/share/embed URL
  - Set fallback summary text
  - Save via PATCH endpoint
- Now Showing sequence control: `clip_a → activity → clip_b`
- Clip-specific media inputs (Clip A / Clip B upload or embed URL)
- Briefing video system supports both embed URL and true file upload (MP4/WebM/MOV)
- Uploaded briefing videos play in a Three.js retro TV presentation
- Dictionary tab: editable word table + welcome video upload (see Teacher Dictionary Manager above)
- Teacher is the only active operator in this phase — keep video upload open each week, use sequence control for class pacing

### 50-minute class structure
In a 50-minute class, required activities must stay lean:
- Broadcast (`clip_a → activity → clip_b`)
- One core practice block
- One production block
- Clock-out exit check

## Architecture Snapshot

### Backend
- Express 5 + TypeScript
- Prisma + PostgreSQL
- Auth via JWT in HTTP-only cookies + Bearer token fallback (Safari ITP)
- Major route groups: `/api/auth`, `/api/shifts`, `/api/recordings`, `/api/pearl`, `/api/harmony`, `/api/teacher`, `/api/vocabulary`, `/api/ai`, `/api/classes`, `/api/dictionary`, `/api/sessions`, `/api/submissions`
- Socket.IO for real-time teacher dashboard (student activity tracking, briefing stage broadcasts). Student socket connects on login (App.tsx), not just on shift entry. Socket auth supports both cookie and `auth.token` Bearer fallback.
- AI services (fail-open): OpenAI direct API (GPT-4.1-mini default) for grammar checking and PEARL contextual barks, Azure Whisper for transcription
- Shared OpenAI client: `backend/src/utils/openai.ts` — lazy-init singleton, exports `getOpenAI()` and `OPENAI_MODEL`

### Frontend
- Vite + React + TypeScript + Tailwind + Zustand
- React Router route entry points:
  - `/` — office home (default landing page on all reloads)
  - `/terminal` — redirects to `/` on reload
  - `/season` — redirects to `/` in guided mode
  - `/shift/:weekNumber` — student home
  - `/shift/:weekNumber/:stepId` — student home
  - `/teacher` — teacher dashboard (role-gated, non-teachers redirected to `/`)
- **Routing**: `/teacher` is a dedicated route only for teacher-role users. All other routes show the student experience regardless of role. Teachers redirected to `/teacher` after login; students to `/`.
- **Auth tokens**: `sessionStorage` (per-tab isolation) — teacher and student tabs don't interfere. Token cleared on logout via `disconnectSocket()` + `clearStoredToken()`.
- **Stale chunk handling**: `vite:preloadError` listener in `main.tsx` auto-reloads once after deploys when lazy-loaded chunks have new hashes.
- **FrostedGlassPlayer**: `frontend/src/components/shift/media/FrostedGlassPlayer.tsx` — dark glass video player with cyan tint, frosted title/controls bars, seek bar, loading spinner, error state with retry button.

### Data model (Prisma)
Primary models: `User`, `Arc`, `Week`, `Mission`, `MissionScore`, `Recording`, `Vocabulary` (deprecated), `StudentVocabulary` (deprecated), `HarmonyPost`, `PearlMessage`, `Class`, `ClassEnrollment`, `ClassWeekUnlock`, `Character`, `DialogueNode`, `PearlConversation`, `NarrativeChoice`, `TeacherConfig`, `DictionaryWord`, `WordFamily`, `WordStatusEvent`, `PairDictionaryProgress`, `Pair`, `SessionConfig`

Dictionary-specific fields added:
- `DictionaryWord.translationZhTw` — Traditional Chinese translation (nullable)
- `PairDictionaryProgress.starred` — boolean, default false
- `PairDictionaryProgress.chineseRevealed` — boolean, default false (one-way)
- `Pair.hasWatchedWelcome` — boolean, default false

### Deployment (Railway — LIVE)
- **Platform**: Railway (project: `delightful-forgiveness`)
- **Backend service**: `lexical-republic` → `https://lexical-republic-production.up.railway.app`
  - Root directory: `backend`
  - Build: `npx prisma generate && npm run build`
  - Start: `npx prisma migrate deploy && npm run seed && npm run start`
- **Frontend service**: `accurate-transformation` → `https://accurate-transformation-production.up.railway.app`
  - Root directory: `frontend`
  - Build: `npm run build`
  - Start: `npx serve dist -s -l 3000`
  - Only env var: `VITE_API_BASE_URL=https://lexical-republic-production.up.railway.app/api`
- **PostgreSQL**: Railway-managed, connected via `${{Postgres.DATABASE_URL}}`
- **Volume**: 5 GB persistent disk mounted at `/data/uploads` on backend service — survives deploys/restarts
  - Stores briefing videos (`/data/uploads/briefings/`) and student audio recordings (`/data/uploads/`)
  - `upload.ts` `resolveDir()` handles absolute paths; `index.ts` `uploadPath` uses `path.isAbsolute()` check
  - `BRIEFING_URL_PREFIX = '/uploads/briefings'` — DB stores relative URLs, `express.static('/uploads', uploadPath)` serves files
- **Key env vars** (backend):
  - `UPLOAD_DIR` = `/data/uploads` (absolute path to Railway volume mount)
  - `OPENAI_API_KEY` = OpenAI direct API key (enables AI grammar checking + PEARL contextual barks)
  - `OPENAI_MODEL` = model override (optional, defaults to `gpt-4.1-mini`)
  - `FRONTEND_ORIGIN` = frontend Railway URL
  - `COOKIE_SAMESITE` = `none` (cross-domain)
  - `NODE_ENV` = `production`
  - `JWT_SECRET` = production secret (not dev-secret)
- **Auto-deploy**: pushes to `master` trigger both services
- **Local dev** still uses `VITE_API_BASE_URL=/api` (proxied by Vite or direct localhost:4000)

## Commands

### Frontend
- `npm run dev`
- `npm run lint`
- `npm run build`

### Backend
- `npm run dev`
- `npm run build`
- `npm run db:migrate`
- `npm run seed`

## Development Credentials
- Teacher: `teacher` / `teacher123`
- Students: `CA-1` through `CA-5` with PIN `1234`

## OfficeView PEARL 3D Sphere (implemented)
- Self-contained R3F Canvas component: `frontend/src/components/office/PearlSphere3D.tsx`
- Replaces the old CSS-based sphere (layered divs + backdrop-filter blur + DOM `<video>` element).
- **Scene layers (back to front):**
  1. **SwirlSphere** — custom GLSL `ShaderMaterial` on a sphere (r=1.0), animated slow vortex pattern with constant rotation. Has `uMood` uniform for rare "thinking" storm moments triggered randomly every 3-5 min for 5-10 sec.
  2. **VideoFace** — `circleGeometry` (r=0.88) with custom brightness-threshold shader: only white/bright pixels render (`smoothstep(0.45, 0.65, luma)`), dark areas transparent. UV crop matches old CSS `scale(1.8)` + `object-position: center 25%`.
  3. **GlassShell** — thin transparent `MeshStandardMaterial` sphere (r=1.0, opacity 0.08) for glass highlight sheen
- **Video is off-DOM** — `document.createElement('video')`, never added to DOM, wrapped in `VideoTexture`.
- **Camera**: position `[0, 0, 2.15]`, FOV 45 — sphere fills the container edge-to-edge.
- **Canvas**: `alpha: true` (transparent BG), `pointerEvents: 'none'` so monitor clicks pass through.
- **Split audio/video architecture**:
  - Visual: `public/video/office-backdrop-noaudio.mp4` — muted video, autoplays in all browsers including Safari
  - Audio: `public/video/office-backdrop-audio.m4a` — separate audio track, played via `new Audio()`
  - Synced: audio starts/stops/seeks alongside video; `isMuted` prop from parent controls `audio.muted`
  - Volume button in OfficeHUD provides the user gesture that unlocks audio playback
  - On replay (every 3 min), `video.load()` is called first to re-fetch media data (browsers evict idle off-DOM buffers), then waits for `canplay` before playing
- **First-login autoplay**: Face video autoplays once on first page load (login), but NOT when returning to office from terminal/shift. Module-level `pearlFacePlayedThisSession` flag resets only on full page reload.
- **Video resilience**: `startVideo()` force-resets `video.src` before `load()` to prevent stale off-DOM buffer issues. 8-second canplay timeout prevents infinite hangs.
- Behavior: autoplay muted on first login → click unmutes → ended fades out (swirl remains) → 3-min replay cycle

### Propaganda Chyron (implemented)
- `PropagandaChyron` component in `OfficeView.tsx` — per-character `requestAnimationFrame` animation
- **3D sphere-wrapping illusion**: cosine-curve scale (0.6 at edges → 1.1 at center), gentle opacity fade, subtle Y arc
- Positioned over the PEARL sphere, only visible when face video is not playing
- Frequency: shows every 15-25s for 14s, skips if face is active
- Container uses sphere bounds with `overflow: hidden`

## OfficeView Overlay Positioning System (implemented)
- **ALL overlays** use image-space percentages (`{ cx, cy, w, h }`) mapped to viewport pixels via `imageToViewport()`
- Background image: `public/images/office-bg.jpg` (**2528×1696**, 892 KB JPEG) with **`object-contain`** — entire image always visible, no cropping
- **Blurred background fill**: second `<img>` behind main with `object-cover` + `blur(40px)` + `scale(1.15)` — bleeds edge colors into padding areas
- `imageToViewport()` uses `object-contain` math: `scale = Math.min(vw/IMG_W, vh/IMG_H)` with `padX`/`padY` centering offsets
- All rects recompute on window resize
- **Constants** defined at top of `OfficeView.tsx`:
  - `SCREEN = { cx: 0.500, cy: 0.663, w: 0.236, h: 0.238 }` — monitor CRT glass
  - `SPHERE` — PEARL cyan sphere
  - `NEON_STRIP`, `LEFT_WALL`, `RIGHT_WALL`, `FLOOR_GLOW` — ambient effects
  - `IMAGE_FULL = { cx: 0.5, cy: 0.5, w: 1.0, h: 1.0 }` — full image bounds for HUD containment
- **HUD containment**: OfficeHUD wrapped in `imageBounds` container
- **Monitor on-screen UI**: Clock (bottom-left) + LOG OFF (bottom-right) as frosted-glass iOS-style pills
- PEARL sphere bottom edge uses CSS `maskImage` gradient for seamless blend
- **Rule**: NEVER use fixed viewport percentages for overlays. Always use `imageToViewport()`.

## OfficeHUD Layout (implemented)
- File: `frontend/src/components/office/OfficeHUD.tsx`
- Wrapped in `imageBounds` container in OfficeView
- **Top bar**: Ministry title (left), citizen badge + Director Panel (teacher only) (right)
- **Bottom bar**: "HAPPINESS: OPTIMAL" (left), volume button + P.E.A.R.L. label + PEARL eye (right)
- **Monitor screen UI** (in OfficeView, not HUD): Clock pill (bottom-left), LOG OFF pill (bottom-right) — frosted glass, happy-dystopian iOS style
- Volume button: inline SVG `SpeakerIcon`, retro-card styling, neon cyan glow when active
- Props: `isMuted` / `setIsMuted` from OfficeView

## UI Design System — Dystopian Happy iOS (implemented)
- **Design bible**: `Dplan/UI_Design_System.md`
- **Core**: Frosted glass pills (`backdrop-blur`, `rounded-full`, semi-transparent gradients, soft shadows)
- **Color roles**: Cyan = primary action, Mint = status/safe, Pink = exit/danger (subtle), White = text
- **Monitor screen layout**: BEGIN SHIFT (centered pill) + Clock pill (bottom-left) + LOG OFF pill (bottom-right) + hint sign (below monitor)
- **All on-screen elements scale with monitor rect** — no fixed pixel sizes
- **HUD elements** use warm `retro-card` style, not frosted glass

## Content Pipeline

### Script-first working agreement
- Do not finalize or expand story questions until episode scripts are approved.
- Build content in this order:
  1. Weekly media plan (Clip A → Activity → Clip B + environment cue)
  2. Episode script
  3. Vocabulary bank (known words + new words)
  4. Grammar targets
  5. Comprehension checks
  6. Listening/voice/case-file tasks
- Keep each location tied to one clear learning job.
- Keep Week 1 onboarding broadcast as the canonical opening scene.

### Taiwan vocabulary baseline
- Use Taiwan national exam/curriculum-aligned word bands as the baseline.
- "Known words" should mostly come from foundational bands students are expected to have seen before Grade 10.
- "New words" should come from the Grade 10-11 target range, introduced in small weekly sets.
- Script readability: clip language should remain mostly known words; new words introduced in controlled repetition.

### Current content reality check
- The app flow is connected, but much of the weekly narrative content is still seeded placeholder copy.
- Placeholder prompts/checks come from `backend/prisma/seed.ts` default mission generation.
- Treat that content as temporary scaffolding, not final script.
- Week 1-3 authored lesson packages are in script-first classroom format and aligned to clip sequencing.

## Dplan Document Index
Key files in `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/`:
- `UI_Design_System.md` — visual design bible
- `Semester_Outcomes_Framework.md` — canonical semester outcomes
- `Script_Writing_Style_Guide.md` — authoring controls
- `World_Canon.md` — world terminology and character designations
- `Story_Learning_Environment_Timeline.md` — fixed semester media timeline
- `Canva_Production_Scripts_Weeks_01_03.md` — Canva build-ready export
- `Lesson_01_First_Shift_Orientation.md` — Week 1 lesson package
- `Lesson_02_Memo_Contradiction.md` — Week 2 lesson package
- `Lesson_03_Clarity_Bay_Intake.md` — Week 3 lesson package
- `Dplay_Source_Integration_Notes.md` — Desktop Dplan canon integration
- `Project_Update_Log.md` — session-level project updates and timeline locks
- `Weeks_01_03_Script_Pack.md` — consolidated Week 1-3 script pack (concatenation of Canva scripts + Lessons 01-03)

External canon source: `/Users/ryanrudat/Desktop/Dplan/`

## Locked Decisions
- PEARL should feel ambient, constant, and authoritative — not optional, not a chatbot.
- Story and learning targets live in mission config, not hardcoded UI logic.
- Avoid too many empty app areas; keep student UI focused.
- Briefing video should be followed by comprehension/activity checks.
- Replace "Clock-In Ritual" language with cleaner naming: Week 1 title = "First Shift Orientation", first step = "Shift Start".
- Preserve Week 1 onboarding as the canonical first narrative beat and use teacher-configurable video URL.
- **NEVER touch background images, image sizing, object-fit, or image positioning** without explicit user permission.
- **ALL OfficeView overlays** must use image-space percentages + `imageToViewport()` — never fixed viewport CSS percentages.

## Known Gaps / Next Work
1. Convert approved Week 1-3 scripts + media map into `backend/prisma/seed.ts` mission configs.
2. Write Weeks 4-6 full script packs using fixed media timeline.
3. Define per-week vocabulary ladders (known vs new words) for all 18 shifts.
4. Add teacher-facing per-week video checklist (Clip A/B upload status and sequence readiness).
5. ~~Persistent media storage~~ — DONE: Railway volume mounted at `/data/uploads`.
6. Full scripted dialogue pass for all character beats (especially Weeks 2-18).
7. Harmony moderation gameplay depth (basic feed exists; richer decision loops can expand).
8. ~~Large OfficeView bundle warning~~ — DONE: office-bg.png → JPEG (6.6 MB → 892 KB), video preload deferred.
9. ~~Rank progression~~ — DONE: Lexical rank system in dictionary (Trainee → Director). Dplan color palette alignment, end-to-end testing still pending.
10. Custom domain setup for student-friendly URLs (optional).
11. Expand dictionary seed data beyond Weeks 1-3 (currently 49 words, target ~120+ across 18 weeks).

## Change Log
- 2026-03-01: Fix shift progression saving — PhaseRunner now marks `clock_out` mission as complete (was never persisted, blocking Duty Roster unlock). Added "Return to Office" button to both PhaseRunner and ClockOutStep shift-complete screens. Season data refreshed after clock-out so next shift unlocks immediately.
- 2026-03-01: Documentation audit and cleanup — fixed "Lexicon Republic" → "Lexical Republic" in World_Canon.md, deleted stale Render_Deployment_Checklist.md, added missing `/api/sessions` + `/api/submissions` routes and `SessionConfig` + `WordStatusEvent` models to CLAUDE.md, marked deprecated Prisma models, fixed duty-roster guided-mode docs, updated frontend README.md, fixed duplicate "override" in vocab list, deleted stale worktree, trimmed MEMORY.md from 210→80 lines.
- 2026-02-26: Party Lexical Dictionary — full implementation: sidebar (terminal-only, slides from LEFT), 3 card variants (approved/proscribed/recovered), Chinese translations with DB-persisted reveal, starred words, merged filter tabs (ALL/WEEK/MASTERED/STARRED/FAMILY/TOEIC/PROSCRIBED), rank ribbon, gold mastery celebration, DictionaryIcon in terminal header, Lexicon tile on terminal desktop.
- 2026-02-26: Welcome Video Gate — WelcomeVideoModal for first-login pairs, teacher-uploadable video, CA-1 test bypass, DB-persisted `hasWatchedWelcome` flag.
- 2026-02-26: Teacher Dictionary Manager — editable word table in teacher dashboard Dictionary tab, welcome video upload, inline edit with PATCH save.
- 2026-02-26: Schema migration — `translationZhTw` on DictionaryWord, `starred`/`chineseRevealed` on PairDictionaryProgress, `hasWatchedWelcome` on Pair.
- 2026-02-26: Dictionary seed — 49 words with Traditional Chinese translations across Weeks 1-3, 28 word families, 8 status events.
- 2026-02-24: Propaganda chyron 3D sphere-wrapping effect — per-character RAF animation with cosine-curve scale/opacity/arc. Display widened (visibleHalf 0.8, gentle fade) and duration extended to 14s to show full slogans. Frequency 15-25s.
- 2026-02-24: PEARL face first-login-only autoplay — module-level `pearlFacePlayedThisSession` flag. Video resilience: force-reset `video.src` + 8s canplay timeout.
- 2026-02-24: PEARL eye blink removed — all blink state, intervals, and double_blink attention moment deleted. Eye never blinks.
- 2026-02-24: Terminal desktop Office tile — prominent grid tile (first position) replaces hard-to-find bottom text link.
- 2026-02-24: StepVideoClip wired into all 7 shift steps with embed URL + uploaded file support. FrostedGlassPlayer redesigned with frosted glass dark theme, loading spinner, error retry.
- 2026-02-24: Backend upload directory startup diagnostics — logs UPLOAD_DIR, briefing dir existence, file count.
- 2026-02-24: PEARL sphere face mask gradient widened from 70% to 88% (less cutoff).
- 2026-02-23: Cross-domain auth fixes — Bearer token fallback for Safari (sessionStorage per-tab isolation), login designation case normalization, stale localStorage cleanup migration.
- 2026-02-23: Teacher dashboard fixes — green text → black, grid-cols-18 config, useEffect dep loop fix, class creation error feedback, teacher-scoped scrollbar styling.
- 2026-02-23: Student online tracking — socket connects on login (App.tsx) not just shift entry, race condition fix (wait for connect before emitting), teacher socket error logging.
- 2026-02-23: Office page performance — office-bg.png (6.6 MB) → office-bg.jpg (892 KB), video preload `metadata` instead of `auto`, audio preload `none`, deleted unused backup videos (9.2 MB).
- 2026-02-23: Upload URL resolution — `resolveUploadUrl()` in `client.ts` prefixes backend origin for `/uploads` paths in production cross-domain setup.
- 2026-02-23: Routing fix — `/teacher` is dedicated route (role-gated), student pages no longer redirect to teacher view on reload. Auto-reload on stale chunk errors after deploy.
- 2026-02-23: Railway volume for persistent uploads — 5 GB disk at `/data/uploads`, `UPLOAD_DIR` env var, `resolveDir()` helper for absolute paths, `BRIEFING_URL_PREFIX` constant for stable DB URLs.
- 2026-02-22: PEARL AI contextual barks — async AI-generated barks with pool fallback. Switched from Azure OpenAI to OpenAI direct API (single `OPENAI_API_KEY` env var). Shared `getOpenAI()` client extracted to `backend/src/utils/openai.ts`. Default model: `gpt-4.1-mini`.
- 2026-02-22: Railway deployment live — backend + frontend + PostgreSQL. Multi-class support committed and pushed. MicCalibration type fix for production build. `serve` added as frontend dependency.
- 2026-02-13: Merged `CLAUDE.md` + `memory.md` into single canonical project memory.
- 2026-02-12: OfficeView overlay system overhauled — `object-contain`, `imageToViewport()`, new 2528×1696 background, monitor pills as frosted glass iOS style.
- 2026-02-12: OfficeHUD redesign + split audio/video + volume control.
- 2026-02-12: PEARL sphere upgraded from CSS to Three.js R3F Canvas with GLSL shader.
- 2026-02-11: Script-first working agreement locked. Desktop Dplan canon integrated. Week 1-3 lesson packages authored. Canva production scripts created. Deployment config wired. Guided UX flow simplified.
