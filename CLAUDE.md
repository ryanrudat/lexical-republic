# The Lexical Republic — Project Instructions

Last updated: 2026-03-27

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world.

Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Quick Reference

### Commands
**Frontend:** `npm run dev` | `npm run lint` | `npm run build`
**Backend:** `npm run dev` | `npm run build` | `npm run db:migrate` | `npm run seed`

### Development Credentials
- Teacher: `teacher` / `teacher123`
- Test student: `CA-1` with PIN `1234`

### Key Paths
- Backend: `backend/` (Express 5 + TypeScript + Prisma + PostgreSQL)
- Frontend: `frontend/` (Vite + React + TypeScript + Tailwind + Zustand)
- Week configs: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts` (weeks 4-6 planned in `Dplan/Weeks_04_06_Shift_Plan.md`)
- Dplan docs: `Dplan/`
- External canon: `/Users/ryanrudat/Desktop/Dplan/`

## Locked Decisions
- PEARL should feel ambient, constant, and authoritative — not optional, not a chatbot.
- **PEARL eye never blinks** — eye has look-around and attention moments only.
- Story and learning targets live in mission config, not hardcoded UI logic.
- Avoid too many empty app areas; keep student UI focused.
- Briefing video should be followed by comprehension/activity checks.
- Preserve Week 1 onboarding as the canonical first narrative beat.
- **NEVER touch background images, image sizing, object-fit, or image positioning** without explicit user permission.
- **ALL OfficeView overlays** must use image-space percentages + `imageToViewport()` — never fixed viewport CSS percentages.
- **NEVER change the PEARL sphere colors/style** unless explicitly asked.
- **Vocabulary is TOEIC-first** — `targetWords` in each WeekConfig should prioritize TOEIC-aligned words; world-building/story words are layered in through narrative context. Week 1 is locked as-is (narrative-first exception).

## Detail Files
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning

## Next Work
- Build Weeks 4-6 WeekConfig files from `Dplan/Weeks_04_06_Shift_Plan.md` (full narrative, vocabulary, task sequences, and Canva scripts planned).
- Seed dictionary entries for Weeks 4-6 (30 words defined in shift plan).
- Seed Harmony static censure items for Weeks 4-6 (24 items defined in shift plan).
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for Weeks 7-18.
- Full scripted dialogue pass for all character beats (especially Weeks 7-18).
- Custom domain setup for student-friendly URLs (optional).
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume; redeploys preserve files but volume loss would delete all uploads.
- Lane auto-promote/demote evaluation after each shift (deferred to Phase B; manual teacher lane control is live).
- Hybrid class model app changes — compact intake_form mode, `teacherLed` task gating flag (multi-gate system implemented: `taskGates Int[]` supports multiple simultaneous gates), teacher "advance to Station Work" signal in dashboard.
- Printable Ministry materials — Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards.
