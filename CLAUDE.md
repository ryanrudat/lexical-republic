# The Lexical Republic — Project Memory

Last updated: 2026-02-13

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world.

Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Current Product State

### Student Experience (implemented)
- Login and boot sequence are live.
- Terminal view is the primary learning interface.
- Active terminal apps are intentionally reduced to:
  - `clarity-queue` (main mission flow)
  - `duty-roster` (18-shift progression)
  - `harmony` (social feed)
  - `my-file` (student profile)
- Harmony is locked until Shift 3.
- **Terminal header Home button**: `⌂ HOME` button in terminal header returns to terminal desktop and navigates URL to `/`. Always visible in shift views.
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
- Eye state arc is wired to narrative progression:
  - welcoming → attentive → evaluative → confused → alarmed → frantic → cold → breaking → final

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

### Teacher dashboard UI
File: `frontend/src/pages/TeacherDashboard.tsx`
- Episode Briefing Setup section:
  - Choose shift, edit episode title/subtitle
  - Set Canva/share/embed URL
  - Set fallback summary text
  - Save via PATCH endpoint
- Now Showing sequence control: `clip_a → activity → clip_b`
- Clip-specific media inputs (Clip A / Clip B upload or embed URL)
- Briefing video system supports both embed URL and true file upload (MP4/WebM/MOV)
- Uploaded briefing videos play in a Three.js retro TV presentation
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
- Auth via JWT in HTTP-only cookies
- Major route groups: `/api/auth`, `/api/shifts`, `/api/recordings`, `/api/pearl`, `/api/harmony`, `/api/teacher`, `/api/vocabulary`

### Frontend
- Vite + React + TypeScript + Tailwind + Zustand
- React Router route entry points:
  - `/` — office home (default landing page on all reloads)
  - `/terminal` — redirects to `/` on reload
  - `/season` — redirects to `/` in guided mode
  - `/shift/:weekNumber` — redirects to `/` on reload
  - `/shift/:weekNumber/:stepId` — redirects to `/` on reload
  - `/teacher`
- **Reload behavior**: All routes except `/` and `/teacher` redirect to `/` on fresh page load. The office is always the entry point.

### Data model (Prisma)
Primary models: `User`, `Arc`, `Week`, `Mission`, `MissionScore`, `Recording`, `Vocabulary`, `StudentVocabulary`, `HarmonyPost`, `PearlMessage`

### Deployment config
- Backend CORS origin allowlist via `FRONTEND_ORIGIN`
- Cookie policy via `COOKIE_SAMESITE`
- Frontend API endpoint via `VITE_API_BASE_URL`

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
- Behavior: autoplay muted → click unmutes → ended fades out (swirl remains) → 3-min replay cycle

## OfficeView Overlay Positioning System (implemented)
- **ALL overlays** use image-space percentages (`{ cx, cy, w, h }`) mapped to viewport pixels via `imageToViewport()`
- Background image: `public/images/office-bg.png` (**2528×1696**) with **`object-contain`** — entire image always visible, no cropping
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
5. Deploy to Render with persistent media storage so uploaded videos survive restarts.
6. Full scripted dialogue pass for all character beats (especially Weeks 2-18).
7. Harmony moderation gameplay depth (basic feed exists; richer decision loops can expand).
8. Teacher week unlock controls not fully exposed as dedicated control panel.
9. Large OfficeView bundle warning in production build (non-blocking optimization).
10. Rank progression (Associate→Guardian), Dplan color palette alignment, end-to-end testing.

## Change Log
- 2026-02-13: Merged `CLAUDE.md` + `memory.md` into single canonical project memory.
- 2026-02-12: OfficeView overlay system overhauled — `object-contain`, `imageToViewport()`, new 2528×1696 background, monitor pills as frosted glass iOS style.
- 2026-02-12: OfficeHUD redesign + split audio/video + volume control.
- 2026-02-12: PEARL sphere upgraded from CSS to Three.js R3F Canvas with GLSL shader.
- 2026-02-11: Script-first working agreement locked. Desktop Dplan canon integrated. Week 1-3 lesson packages authored. Canva production scripts created. Deployment config wired. Guided UX flow simplified.
