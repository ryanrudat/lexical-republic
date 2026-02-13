# Lexical Republic Frontend

Student and teacher web interface for The Lexical Republic.

## Stack
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router

## Run locally

From `/Users/ryanrudat/Desktop/Lexical Republic/frontend`:

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

It proxies `/api/*` to backend `http://localhost:4000` (configured in `vite.config.ts`).

## Build and lint

```bash
npm run lint
npm run build
```

## Main routes
- `/terminal` - student terminal desktop
- `/season` - duty roster
- `/shift/:weekNumber` - shift runner
- `/shift/:weekNumber/:stepId` - direct step route
- `/teacher` - teacher dashboard

## Current student app structure
Terminal desktop intentionally exposes only:
- Current Shift (`clarity-queue`)
- Duty Roster (`duty-roster`)
- Harmony (`harmony`, unlocks Shift 3)
- My File (`my-file`)

## Shift structure
Each shift has 7 ordered steps:
1. Check-In (`recap`)
2. Briefing (`briefing`)
3. Language Desk (`grammar`)
4. Evidence (`listening`)
5. Voice Booth (`voice_log`)
6. Case File (`case_file`)
7. Clock-Out (`clock_out`)

## PEARL behavior
- Persistent PEARL eye in terminal header
- One-way bottom message strip (ambient system messages)
- PEARL panel opens from eye click
- Eye state changes by story week arc

## Teacher briefing controls
Teacher Dashboard includes **Episode Briefing Setup** for each shift:
- episode title
- episode subtitle
- video URL (Canva/share/embed)
- fallback summary text

This updates briefing mission config through:
- `GET /api/teacher/weeks`
- `PATCH /api/teacher/weeks/:weekId/briefing`

## Content model expectations
Briefing, story beats, and language targets are data-driven from backend mission config (`seed.ts`), not hardcoded in the frontend.
