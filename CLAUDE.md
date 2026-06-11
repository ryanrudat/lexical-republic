# The Lexical Republic — Project Instructions

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world. Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Quick Reference

### Commands
**Frontend:** `npm run dev` | `npm run lint` | `npm run build` (use `npm run build`, not `tsc --noEmit`, for pre-push verification — build mode is stricter)
**Backend:** `npm run dev` | `npm run build` | `npm run db:migrate` | `npm run seed` | `npm run test`

### Development Credentials
- Teacher: `teacher` / `teacher123`
- Test student: `CA-1` with PIN `1234`

### Key Paths
- Backend: `backend/` (Express 5 + TypeScript + Prisma + PostgreSQL) — see `backend/CLAUDE.md` for stack-specific gotchas
- Frontend: `frontend/` (Vite + React + TypeScript + Tailwind + Zustand) — see `frontend/CLAUDE.md` for stack-specific gotchas
- Week configs: `backend/src/data/week-configs/week1.ts` … `week4.ts` (weeks 5-6 planned in `Dplan/Weeks_04_06_Shift_Plan.md`)
- Dplan docs: `Dplan/` — in-repo planning. External canon: `~/Desktop/Dplan/` (iOS design docs; `docs/webapp-technical-design.md` = web spec, `docs/ambient-text-bank.md` = canonical PEARL barks)

## Locked Decisions — Core
The always-on canon. Full detailed decision log (backend audit rules, W4 spy arc, Word Pool, Harmony mechanics, teacher dashboard correctness, design guardrails): **[`docs/locked-decisions.md`](docs/locked-decisions.md)**.

- **PEARL** is ambient, constant, authoritative — not a chatbot. **Eye never blinks** (look-around / attention only). **Never change the PEARL sphere colors/style** unless explicitly asked.
- **Never touch background images, sizing, object-fit, or positioning** without explicit user permission. All OfficeView overlays use image-space % + `imageToViewport()`, never fixed viewport CSS percentages.
- Story and learning targets live in **mission config**, not hardcoded UI logic. Keep student UI focused (avoid empty app areas).
- **Vocabulary is TOEIC-first** — `targetWords` prioritize TOEIC-aligned words; world/story words layer in via narrative. Week 1 is locked as the narrative-first exception.
- **Never score grammar on open writing** — open writing is scored on vocabulary use + a strict on-topic veto only; grammar lives in constrained tasks, and on open writing is teacher-advisory text, never a score. Do not propose AI grammar scoring here. See [pedagogy.md](docs/pedagogy.md).
- **pOS is digital-first** — task confirmations use `AuthorizationToast` (PEARL eye + ring + checkmark), never physical stamps. The OS is the authority.
- **Tone is "forced-happy" dystopian, never punitive or intimidating.** PEARL is kind, welcoming, prominent — the student's connection to the Party.
- **Aesthetic split**: shift queue = warm "forced-happy" government iOS (cream/pastel), NOT a hacker terminal; green CRT lives ONLY inside the terminal view; office view = warm retrofuturist. No "Season" naming — use in-world bureaucratic terms.
- **Three verification siblings** (full detail in locked-decisions): **Clarity Check** (in-world name for pop-up vocab verifications), **Compliance Check** (per-class teacher-scheduled lockout, configured in the Shifts tab, renders inline in the Shift Storyboard), **Remediation Module** (behavior-triggered anti-grinding vocab review, amber accent — the worst case is a student accidentally studied harder).
- **Briefing** video is followed by comprehension/activity checks; **Clip A briefing uses PEARL narration only** (no other character voiceover). Preserve Week 1 onboarding as the canonical first narrative beat.
- **In-world bureaucratic locations** (Sector / Block / Filing Desk / Common Mess / Records Wing) — never American-school terms (cafeteria, classroom, dormitory). Citizens are workers, not students.
- **9-shift condensed route is canonical**: `[1, 2, 3, 4, 5, 6, 11, 14, 18]`, kept in sync in both `backend/` and `frontend/src/data/narrative-routes.ts`. Each shift ≈ 2 classroom weeks.
- **Don't-break infra**: socket rooms are role-split — students join `class:${classId}`, teachers join `class:${classId}:staff` + `teacher:${teacherId}` (the global `'teacher'` room is GONE, and teacher-bound payloads must NEVER target the plain class room — students' browsers sit in it) · `MissionScore.details` must be read-and-merged inside a `$transaction` before writing (never clobber) · every MissionScore writer enforces the ClassWeekUnlock gate · mastery moves only on VERIFIED surfaces (never on passive views; graded re-answer surfaces need a replay gate) · `JWT_SECRET` is mandatory at module load · swapping a `public/` image needs a filename rename to cache-bust.
- **Replay policy** (teacher reset / move-to-shift): tasks and delivered story beats replay (week's `CharacterMessage` rows cleared, `direct_message` always preserved); choices and consequences persist (`NarrativeChoice`, `Citizen4488Interaction`, all Harmony state).

## Detail Files
- [Locked Decisions — full detail](docs/locked-decisions.md) — complete themed decision log
- [Status & Next Work](docs/next-work.md) — Harmony expansion phases + backlog
- [Audit Remediation 2026-06](docs/audit-remediation-2026-06.md) — **active** prioritized fix list + status from the June Shift-4 review + frontend bug sweep
- [Code Map](docs/code-map.md) — key Harmony data files, task-result & scoring utilities
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning
- [Pedagogy Doctrine](docs/pedagogy.md) — **source of truth for "how does this app teach?"** (vocabulary doctrine, scaffolding, task taxonomy/SLA, writing rubric, retrieval, Mandarin L1)
- [Changelog](docs/changelog.md) — day-by-day work history
- [Narrative & Pedagogy Review 2026-04-17](Dplan/Narrative_Pedagogy_Review_2026_04_17.md) — cross-cutting review of shift scripts, Harmony, PEARL voice
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) / [`backend/CLAUDE.md`](backend/CLAUDE.md) — stack-specific gotchas
