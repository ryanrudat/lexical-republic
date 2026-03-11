# Architecture & Deployment

## Backend
- Express 5 + TypeScript
- Prisma + PostgreSQL
- Auth via JWT in HTTP-only cookies + Bearer token fallback (Safari ITP)
- Major route groups: `/api/auth`, `/api/shifts`, `/api/recordings`, `/api/pearl`, `/api/harmony`, `/api/teacher`, `/api/vocabulary`, `/api/ai`, `/api/classes`, `/api/dictionary`, `/api/sessions`, `/api/submissions`, `/api/messages`
- Socket.IO for real-time teacher dashboard (student activity tracking, briefing stage broadcasts). Student socket connects on login (App.tsx). Socket auth supports both cookie and `auth.token` Bearer fallback.
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
- `FrostedGlassPlayer`: `frontend/src/components/shift/media/FrostedGlassPlayer.tsx` — dark glass video player with cyan tint, frosted bars, loading spinner, error retry.

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
  - Build: `npm run build`
  - Start: `npx serve dist -s -l 3000`
  - Only env var: `VITE_API_BASE_URL=https://lexical-republic-production.up.railway.app/api`
- **PostgreSQL**: Railway-managed, connected via `${{Postgres.DATABASE_URL}}`
- **Volume**: 5 GB persistent disk mounted at `/data/uploads` on backend service
  - Stores briefing videos (`/data/uploads/briefings/`) and student audio recordings
  - `BRIEFING_URL_PREFIX = '/uploads/briefings'` — DB stores relative URLs, `express.static('/uploads', uploadPath)` serves files
- **Key env vars** (backend):
  - `UPLOAD_DIR` = `/data/uploads`
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (optional, defaults to `gpt-4.1-mini`)
  - `FRONTEND_ORIGIN`, `COOKIE_SAMESITE` = `none`, `NODE_ENV` = `production`, `JWT_SECRET`
- **Auto-deploy**: pushes to `master` trigger both services
- **Local dev**: `VITE_API_BASE_URL=/api` (proxied by Vite or direct localhost:4000)

## Backend Endpoints

### Shift routes (`backend/src/routes/shifts.ts`)
- `GET /api/shifts/weeks/:weekId/config` — week config for task queue
- `DELETE /api/shifts/weeks/:weekId/scores` — reset all MissionScore records for a week (used by teacher task controls)

### Socket.IO Teacher Task Commands
- Teacher dashboard emits `task-command` events via Socket.IO
- Supported actions: `skip` (skip current task), `goToTask` (jump to specific task), `resetShift` (clear all progress), `resetTask` (restart current task)
- All commands persist to server (MissionScore creation/deletion) before updating local Zustand state
- Null weekConfig guard returns PEARL feedback instead of silent failure

### Teacher routes (`backend/src/routes/teacher.ts`)
- `GET /api/teacher/weeks` — week list + briefing config
- `PATCH /api/teacher/weeks/:weekId/briefing` — update briefing config (`embedUrl`, `episodeTitle`, `episodeSubtitle`, `fallbackText`)
- `PATCH /api/teacher/dictionary/:wordId` — edit dictionary word fields
- `PATCH /api/teacher/scores/:scoreId` — edit individual score
- `DELETE /api/teacher/scores/:scoreId` — delete individual score
- `DELETE /api/teacher/students/:pairId/weeks/:weekId/progress` — reset week progress (cascading delete)
- `PATCH /api/teacher/students/:pairId/concern` — override pair concern score
- `DELETE /api/teacher/students/:studentId` — cascade delete single student (Pair or User, 11+ related tables)
- `DELETE /api/teacher/students` — bulk delete ALL students (iterates all pairs + legacy users)

### Class routes (`backend/src/routes/classes.ts`)
- `DELETE /api/classes/:classId` — cascade delete class (enrollments, week unlocks, harmony posts)
- `DELETE /api/classes/:classId/students/:studentId` — remove student enrollment from class

### Dictionary routes (`backend/src/routes/dictionary.ts`)
- `GET /api/dictionary` — full word list with `translationZhTw`, `starred`, `chineseRevealed`
- `GET /api/dictionary/:wordId` — single word detail
- `POST /api/dictionary/welcome-watched` — marks pair's welcome video as watched
- `POST /api/dictionary/welcome-video` — teacher upload (multer, MP4/WebM/MOV, 200MB limit)
- `GET /api/dictionary/welcome-video` — serves uploaded welcome video (BEFORE auth middleware — `<video>` tags can't send auth headers)
- `DELETE /api/dictionary/welcome-video` — teacher deletes welcome video
- `PATCH /api/dictionary/:wordId/starred` — toggle starred
- `PATCH /api/dictionary/:wordId/chinese-revealed` — set chineseRevealed=true (one-way)
