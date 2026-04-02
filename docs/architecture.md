# Architecture & Deployment

## Backend
- Express 5 + TypeScript
- Prisma + PostgreSQL
- Auth via JWT in HTTP-only cookies + Bearer token fallback (Safari ITP)
- Major route groups: `/api/auth`, `/api/shifts`, `/api/recordings`, `/api/pearl`, `/api/harmony`, `/api/teacher`, `/api/vocabulary`, `/api/ai`, `/api/classes`, `/api/dictionary`, `/api/sessions`, `/api/submissions`, `/api/messages`
- Socket.IO for real-time teacher dashboard (student activity tracking, briefing stage broadcasts). Student socket connects on login (App.tsx). Socket auth supports both cookie and `auth.token` Bearer fallback.
- Socket reconnection: `connectSocket()` reuses stale sockets via `socket.connect()` instead of destroying and recreating them, preserving event listeners registered by App.tsx (session:clarity-message, session:task-command, etc.)
- AI services (fail-open): OpenAI direct API (GPT-4.1-mini default) for grammar checking and PEARL contextual barks, Azure Whisper for transcription
- Shared OpenAI client: `backend/src/utils/openai.ts` — lazy-init singleton, exports `getOpenAI()` and `OPENAI_MODEL`

## Frontend
- Vite + React + TypeScript + Tailwind + Zustand
- React Router routes:
  - `/` — office home (default landing page on all reloads)
  - `/terminal` — redirects to `/` on reload
  - `/season` — redirects to `/` in guided mode
  - `/shift/:weekNumber` — student shift
  - `/shift/:weekNumber/:stepId` — student step
  - `/teacher` — teacher dashboard (role-gated)
- `/teacher` is a dedicated route only for teacher-role users. All other routes show the student experience.
- Auth tokens in `sessionStorage` (per-tab isolation). Token cleared on logout via `disconnectSocket()` + `clearStoredToken()`.
- Stale chunk handling: `vite:preloadError` listener in `main.tsx` auto-reloads once after deploys.
- `MonitorPlayer`: `frontend/src/components/shared/MonitorPlayer.tsx` — shared CRT monitor video player (used for welcome video, storyboard clips, shift queue task clips). Renders video inside retro monitor frame with clip-path, scanlines, vignette, seekable LED progress bar, brass volume knob.
- `FrostedGlassPlayer`: `frontend/src/components/shift/media/FrostedGlassPlayer.tsx` — DEPRECATED (no remaining imports). Was replaced by MonitorPlayer.

## Data Model (Prisma)
Primary models: `User`, `Arc`, `Week`, `Mission`, `MissionScore`, `Recording`, `HarmonyPost`, `PearlMessage`, `Class`, `ClassEnrollment`, `ClassWeekUnlock`, `Character`, `DialogueNode`, `PearlConversation`, `NarrativeChoice`, `TeacherConfig`, `DictionaryWord`, `WordFamily`, `WordStatusEvent`, `PairDictionaryProgress`, `Pair`, `SessionConfig`, `CharacterMessage`, `Citizen4488Interaction`, `ShiftResult`

Deprecated: `Vocabulary`, `StudentVocabulary`

## Deployment (Railway — LIVE)
- **Platform**: Railway (project: `delightful-forgiveness`)
- **Backend service**: `lexical-republic` → `https://lexical-republic-production.up.railway.app`
  - Root directory: `backend`
  - Build: `npx prisma generate && npm run build`
  - Start: `npx prisma migrate deploy && npm run seed && npm run start`
- **Frontend service**: `accurate-transformation` → `https://accurate-transformation-production.up.railway.app`
  - Root directory: `frontend`
  - Build: `npm run build` (via `nixpacks.toml`)
  - Start: `npx serve dist -s -l 3000` (via `nixpacks.toml`)
  - `nixpacks.toml` sets `NPM_CONFIG_PRODUCTION=""` to suppress deprecated npm flag warning
  - Only env var: `VITE_API_BASE_URL=https://lexical-republic-production.up.railway.app/api`
- **PostgreSQL**: Railway-managed, connected via `${{Postgres.DATABASE_URL}}`
- **Volume**: 5 GB persistent disk mounted at `/data/uploads` on backend service
  - Stores briefing videos (`/data/uploads/briefings/`), welcome video (`/data/uploads/welcome/`), and student audio recordings
  - `BRIEFING_URL_PREFIX = '/uploads/briefings'` — DB stores relative URLs, `express.static('/uploads', uploadPath)` serves files
  - Upload directories created at backend startup (`uploads/` + `uploads/briefings/` + `uploads/welcome/`)
  - **Critical**: multer `destination` callbacks read `process.env.UPLOAD_DIR` at request time (not import time) to ensure the Railway volume path is used. Module-level constants evaluated before env injection caused files to write to ephemeral `/app/uploads/` instead of persistent `/data/uploads/`.
- **Key env vars** (backend):
  - `UPLOAD_DIR` = `/data/uploads`
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
  - `FRONTEND_ORIGIN`, `COOKIE_SAMESITE` = `none`, `NODE_ENV` = `production`, `JWT_SECRET`
- **Auto-deploy**: pushes to `master` trigger both services
- **Local dev**: `VITE_API_BASE_URL=/api` (proxied by Vite or direct localhost:4000)

## Backend Endpoints

### Shift routes (`backend/src/routes/shifts.ts`)
- `GET /api/shifts/weeks/:weekId/config` — week config for task queue (merges teacher overrides from Mission DB records into static WeekConfig, populates `clipAfter` from `teacherOverride.dismissalClipUrl`, includes `taskGates` array from student's class)
- `DELETE /api/shifts/weeks/:weekId/scores` — reset all MissionScore records for a week (used by teacher task controls)

### Teacher Task Commands
- **REST API** (works for online AND offline students): `POST /api/teacher/students/:studentId/task-command` — accepts `{ action, taskId? }`, persists directly to MissionScore/ShiftResult tables, also relays via socket for instant UI update on online students
- Supported actions: `skip-task` (mark current task complete), `reset-task` (delete current task score), `reset-shift` (delete all scores + ShiftResult), `send-to-task` (mark preceding tasks complete, clear target and later)
- Backend resolves student's current week and task position from DB (no client state needed)
- **Legacy Socket.IO path** still works for online students: student client handles `session:task-command` events, persists via its own API calls

### Teacher routes (`backend/src/routes/teacher.ts`)
- `GET /api/teacher/weeks` — week list + briefing config
- `GET /api/teacher/weeks/:weekId/storyboard` — shift storyboard (derived from WeekConfig tasks, auto-creates missing Mission records)
- `PATCH /api/teacher/weeks/:weekId/steps/:missionType` — update step: swap activity, set embed URL, toggle `videoClipHidden`, remove video, remove dismissal video (`removeDismissalVideo`), reset override
- `POST /api/teacher/weeks/:weekId/steps/:missionType/video` — upload video clip for storyboard step (stored in `uploads/briefings/`). Supports `?slot=primary` (default, plays before task) or `?slot=dismissal` (plays after task via `clipAfter`)
- `PATCH /api/teacher/weeks/:weekId/briefing` — update briefing config (`embedUrl`, `episodeTitle`, `episodeSubtitle`, `fallbackText`)
- `PATCH /api/teacher/dictionary/:wordId` — edit dictionary word fields
- `PATCH /api/teacher/scores/:scoreId` — edit individual score
- `DELETE /api/teacher/scores/:scoreId` — delete individual score
- `DELETE /api/teacher/students/:pairId/weeks/:weekId/progress` — reset week progress (cascading delete)
- `PATCH /api/teacher/students/:pairId/concern` — override pair concern score
- `PATCH /api/teacher/students/:pairId/lane` — set student difficulty tier (validates 1-3), emits `session:lane-changed` socket event for real-time update
- `DELETE /api/teacher/students/:studentId` — cascade delete single student (Pair or User, 11+ related tables), emits `student:deleted` socket event + purges in-memory tracking
- `DELETE /api/teacher/students` — bulk delete ALL students (iterates all pairs + legacy users)
- `POST /api/teacher/students/:studentId/task-command` — REST-based task control (skip-task, reset-task, reset-shift, send-to-task), works for online and offline students

### Class routes (`backend/src/routes/classes.ts`)
- `DELETE /api/classes/:classId` — cascade delete class (enrollments, week unlocks, harmony posts)
- `DELETE /api/classes/:classId/students/:studentId` — remove student enrollment from class
- `GET /api/classes/:classId/weeks/:weekId/task-gate` — read active gates (returns `taskGates: number[]`)
- `PATCH /api/classes/:classId/weeks/:weekId/task-gate` — set gates (accepts `{ taskGates: number[] }`), broadcasts `session:gate-updated` to class room
- `PATCH /api/classes/:classId` — update class name, active status, or `defaultLane` (1-3)

### Dictionary routes (`backend/src/routes/dictionary.ts`)
- `GET /api/dictionary` — full word list with `translationZhTw`, `starred`, `chineseRevealed`
- `GET /api/dictionary/:wordId` — single word detail
- `POST /api/dictionary/welcome-watched` — marks pair's welcome video as watched
- `POST /api/dictionary/welcome-video` — teacher upload (multer, MP4/WebM/MOV, 200MB limit)
- `GET /api/dictionary/welcome-video` — serves uploaded welcome video (BEFORE auth middleware — `<video>` tags can't send auth headers)
- `DELETE /api/dictionary/welcome-video` — teacher deletes welcome video
- `PATCH /api/dictionary/:wordId/starred` — toggle starred
- `PATCH /api/dictionary/:wordId/chinese-revealed` — set chineseRevealed=true (one-way)

### Harmony routes (`backend/src/routes/harmony.ts`)
- `GET /api/harmony/posts` — feed posts (locked until Shift 1 completed, triggers lazy generation)
- `POST /api/harmony/posts` — create student post
- `DELETE /api/harmony/posts/:id` — delete post (own posts only for students, cascade: replies → censure responses → post)
- `GET /api/harmony/posts/:id/replies` — fetch replies for a post
- `POST /api/harmony/posts/:id/replies` — create reply
- `POST /api/harmony/posts/:id/censure` — approve/correct/flag a post
- `GET /api/harmony/censure-queue` — censure queue items (locked until Shift 1 completed, triggers lazy generation)
- `POST /api/harmony/censure-queue/:id/respond` — submit censure response (action + selectedIndex)

### PEARL routes (`backend/src/routes/pearl.ts`)
- `GET /api/pearl/messages` — active ambient messages (shuffled)
- `POST /api/pearl/bark` — AI-generated contextual bark (3s timeout, fail-open to pool)
- `POST /api/pearl/chat` — AI chat with 4-layer guardrails, per-shift rate limit (20 messages per `pairId-weekN`). Supports `isWritingNudge` mode: specialized writing guidance context injection, Layer 4 filter relaxed to allow target vocab references in hints.
