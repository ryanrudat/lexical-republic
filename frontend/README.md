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
- `/` - office home (default landing page on all reloads)
- `/terminal` - redirects to `/` on reload
- `/season` - redirects to `/` in guided mode
- `/shift/:weekNumber` - shift runner
- `/shift/:weekNumber/:stepId` - direct step route
- `/teacher` - teacher dashboard (role-gated, non-teachers redirected to `/`)

## Current student app structure
Terminal desktop tiles (in order): Office, Lexicon, Current Shift, Duty Roster, Harmony, My File.

In guided mode, visible apps are limited to:
- Current Shift (`clarity-queue`)
- Harmony (`harmony`, unlocks Shift 3)
- My File (`my-file`)

Office and Lexicon tiles are always visible (not gated by guided mode).
Duty Roster (`duty-roster`) is hidden in guided mode.

## Dictionary system
- **DictionarySidebar**: slides from left as an overlay (`z-[40]`), terminal-only (not in office view)
- **DictionaryIcon**: book-shape SVG in terminal header, opens sidebar
- **Lexicon tile**: app tile on terminal desktop grid, opens sidebar overlay

## Welcome video gate
- **WelcomeVideoModal**: one-time modal (`z-[70]`) shown to pair students with `hasWatchedWelcome === false`
- Mounted in `App.tsx` after boot sequence, before routes
- Teacher-uploadable video via `/api/dictionary/welcome-video`

## Shift structure
Each shift has 7 ordered steps:
1. Shift Start (`recap`)
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
