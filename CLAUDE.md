# The Lexical Republic — Project Instructions

## Vision
The Lexical Republic is a dystopian ESL learning game where Taiwanese Grade 10 students (A2-B1) learn English through 18 weekly "Shifts" inside an authoritarian language-control world.

Story and learning are coupled: grammar, listening, speaking, and writing tasks are delivered as in-world bureaucratic actions under Party supervision.

## Quick Reference

### Commands
**Frontend:** `npm run dev` | `npm run lint` | `npm run build`
**Backend:** `npm run dev` | `npm run build` | `npm run db:migrate` | `npm run seed` | `npm run test`

### Development Credentials
- Teacher: `teacher` / `teacher123`
- Test student: `CA-1` with PIN `1234`

### Key Paths
- Backend: `backend/` (Express 5 + TypeScript + Prisma + PostgreSQL) — see `backend/CLAUDE.md` for stack-specific gotchas
- Frontend: `frontend/` (Vite + React + TypeScript + Tailwind + Zustand) — see `frontend/CLAUDE.md` for stack-specific gotchas
- Week configs: `backend/src/data/week-configs/week1.ts`, `week2.ts`, `week3.ts`, `week4.ts` (weeks 5-6 planned in `Dplan/Weeks_04_06_Shift_Plan.md`)
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
- **pOS digital-first interactions** — task confirmations use `AuthorizationToast` (PEARL eye + progress ring + checkmark), NOT physical rubber stamps. The OS is the authority, not a bureaucrat with a stamp.
- **"Clarity Check" is the canonical in-world name** for pop-up vocab verifications — reuses the "Clarity" namespace (Clarity Queue, Clarity Tea, Clarity Associates) and mirrors the children's rhyme "Check your words, check your tone."
- **"Compliance Check" is the per-class teacher-scheduled lockout sibling of Clarity Check.** Configured per-class in the Shifts tab (NOT on-demand from ClassMonitor). Teachers pick exact words from a TOEIC-grouped picker; checks fire automatically at chosen placement points (`shift_start | shift_end | after_task`) inside the student's shift cascade. One-shot per `(pair, template)` enforced via DB unique constraint. Different classes can have different templates for the same shift.
- **"Remediation Module" is the behavior-triggered third sibling.** Fires automatically when the rate-trigger state machine in `sessionStore` detects intentional `concernScore` grinding (Stage A warning at +0.4/30s, Stage B modal at +0.7/60s OR second Stage-A within 90s, backstop at score≥3.0). Server-authoritative cooldown `−[0, 0.5, 1.0, 1.5][correctCount]` floored at 0; clawback if grinding resumes within 60s of close (restores cooldown, sets `clawedBack=true`); escalating debounce 90→60→30→0s. Amber accent (vs cyan Clarity/Compliance) so students know the trigger source is behavior, not schedule. PEARL voice stays forced-happy throughout — never punitive. **The "punishment" is more vocab review using words from prior shifts; worst case = student accidentally studied harder.**
- **Concern HUD chip is now clickable** — opens `ConcernTooltip` showing score, threshold band, recent activity from `concernRateBuffer`, threshold-to-next, forced-happy hint. Score drops animate via `useCountDownAnimation` (RAF, ease-out cubic, 1500ms, decrease-only).

## Detail Files
- [Architecture & Deployment](docs/architecture.md) — stack, data model, deployment, routing, endpoints
- [Features](docs/features.md) — current product state, all implemented systems
- [World, Story & Characters](docs/world-and-story.md) — canon, characters, content pipeline, narrative planning
- [Pedagogy Doctrine](docs/pedagogy.md) — foundational principles, vocabulary doctrine, scaffolding, task taxonomy/SLA, writing rubric (on-topic veto + vocab), retrieval, narrative-as-pedagogy, Mandarin L1, quick reference. **Source of truth for "how does this app teach?"**
- [Narrative & Pedagogy Review 2026-04-17](Dplan/Narrative_Pedagogy_Review_2026_04_17.md) — cross-cutting review of shift scripts, Harmony, PEARL voice; prioritized findings + W4-6 forward-look
- [Changelog](docs/changelog.md) — day-by-day work history (was the "Recent Work" sections in this file)
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend-specific gotchas (ShiftQueue, Harmony, MonitorPlayer, CSS/z-index, R3F, browser media, palette)
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — backend-specific gotchas (Prisma, Express, Railway deploy, uploads, PEARL rate limiting)

## Harmony Expansion Status
Harmony expansion is in progress. See `Dplan/Harmony_Expansion_Review.md` for the full design review.
- **Phase 0 (bug fixes)**: DONE — generation race condition, dead gate code, censure action fix, orphaned post sweep
- **Phase A (cumulative review + route awareness)**: DONE — 3-tier vocab (focus/recent/deep), route-aware generation/queries, differentiated mastery (+0.05 current / +0.03 review), cumulative censure review items
- **Phase B (world-building content engine)**: DONE — world bible, 5 NPC character definitions with arc phases, 4 new content types (bulletin/pearl_tip/community_notice/sector_report), per-type generator, component registry, bulletin comprehension endpoint
- **Phase B+ (content overhaul)**: DONE — character-first post rewrites, expanded world bible (food/media/hobbies/traditions/citizen roster), unified Citizen-XXXX naming, AI prompt overhaul ("Write about PEOPLE, not vocabulary"), vocabulary recycling (spaced repetition), Vitest validation suite, startup authorLabel migration
- **Phase B++ (4-tab UI)**: DONE — government portal navigation (Feed / Ministry / Sector / Review), client-side post filtering, MinistryTab + SectorTab components
- **Phase C (archives + polish)**: DONE — 5-tab UI (Feed / Ministry / Sector / Review / Archives), Archives tab with 3 sub-sections (Vocabulary by Week with mastery bars, Citizen-4488 Case File timeline, Bulletin Archive), `lastHarmonyVisit` tracking (Prisma migration), NEW badges on unseen posts, notification dot on Harmony tile via `harmony:new-content` socket event, PEARL ambient annotations (session-based: censure streaks, 4488 flag/approve reactions), `GET /api/harmony/archives` + `GET /api/harmony/has-new` endpoints.
- **Visual enhancements**: Ideas saved in `Dplan/Harmony_Visual_Enhancement_Ideas.md` (propaganda ticker, 4488 glitch, typewriter bulletins, etc.)

### Harmony Data Files
- `backend/src/data/harmonyWorldBible.ts` — 8 locations, 5 regulations, weekly culture, approved media, food culture, domestic life, traditions, children's world, citizen roster (`CORE_CITIZENS` + `BACKGROUND_CITIZENS` with `getActiveCitizens(week)`)
- `backend/src/data/harmonyCharacters.ts` — 5 NPCs with 3-phase arcs + condensed overrides (Citizen-XXXX naming)
- `backend/src/data/harmonyFeed.ts` — 12 character-first seed posts weeks 1-3 with spaced vocabulary recycling (15 once PR #12 lands: adds 2nd 4488 post per week)
- `backend/src/data/harmonyBulletins.ts` — static bulletins weeks 1-3 with comprehension MCQs
- `backend/src/data/harmonyPearlTips.ts` — static PEARL grammar tips weeks 1-3
- `backend/src/data/harmonyCommunityContent.ts` — immersive notices + sector reports weeks 1-3
- `backend/src/data/__tests__/harmony-vocabulary.test.ts` — Vitest suite (34 tests: word coverage, char limits, spaced repetition)
- `backend/src/utils/harmonyMigrations.ts` — startup migration: old authorLabels → Citizen-XXXX
- `frontend/src/data/citizen4488Posts.ts` — frontend shim mirroring 4488 posts for ShiftClosing "Case File Update" card (1 post per week on master; 2 per week once PR #12 lands)

### Task Result & Scoring Utilities
- `frontend/src/types/taskResult.ts` — canonical `TaskResultDetails` shape every task component emits: `{ taskType, itemsCorrect, itemsTotal, category, errorsFound?, errorsTotal? }`
- `frontend/src/utils/scoreAggregator.ts` — pure `aggregateTaskResults()` reducer used by ShiftClosing. Returns per-category `null` when no tasks contributed (no more inflated fallback).
- `frontend/src/utils/scoreAggregator.test.ts` — Vitest suite (15 tests) covering averaging, weighting, skipped-category fallback, legacy-shape graceful handling.
- **Frontend Vitest**: `cd frontend && npm run test` runs the scoreAggregator suite.

## Recent Work
For day-by-day history of shipped batches, commits, and decisions, see [`docs/changelog.md`](docs/changelog.md). For specific past work, prefer `git log` and the topic files in `memory/`.

## Next Work
- **W5 carry-over hooks** — read stored W4 `NarrativeChoice` values at W5 shift start, branch Betty/Ivan tones, Citizen-4488 W5 post variants, Harmony Wellness Division post tone. Requires W5 WeekConfig to exist first.
- **Build Weeks 5-6 WeekConfig files** from `Dplan/Weeks_04_06_Shift_Plan.md` — mechanical scaffold first (same W4 pattern), then C+B layers on top. **Audit fixes applied 2026-04-08:** W5 "respond"→"recommend" (duplication with W3), W5 Doc B reduced to 5 errors, W6 writing tasks merged (5→4 tasks), SVA errors added. See shift plan § Pedagogical Notes. **Pre-build pedagogy fixes 2026-04-17 (PR #11, pending):** W6 re-split 4→5 tasks to reduce Lane 1 cognitive load; W5 because-clause explicit teaching (Mandarin-L1 interference); W6 cumulative review must include one target word from EACH of W1/W2/W3; PEARL bark after W6 RUN flash; Wellness Division thread woven W3→W4→W5.
- **Harmony content authoring** — weeks 4-6 static content (new NPC introductions: Citizen-6103, Citizen-1177, Citizen-9020; first disappearance: Citizen-0031) + W4 static Harmony content (bulletins, PEARL tips, notices, sector reports, censure items).
- **Condensed route 4488 catch-up posts** — 3-5 posts at route-gap transitions ("I named her Tuesday").
- **Condensed route bridging Harmony posts** — ~20 NPC catch-up posts for gap weeks.
- Seed dictionary entries for Weeks 4-6 (30 words defined in shift plan; W5 "respond" replaced with "recommend"). W4's 10 words are used in W4 tasks but not yet in `DictionaryWord` table.
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for Weeks 7-18.
- Full scripted dialogue pass for all character beats (especially Weeks 7-18).
- Custom domain setup for student-friendly URLs (optional).
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume; redeploys preserve files but volume loss would delete all uploads.
- Lane auto-promote/demote evaluation after each shift (deferred; manual teacher lane control is live).
- Hybrid class model app changes — compact intake_form mode, `teacherLed` task gating flag (multi-gate system implemented: `taskGates Int[]` supports multiple simultaneous gates), teacher "advance to Station Work" signal in dashboard.
- Printable Ministry materials — Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards.
- **Admin "God Access"** — single admin login that sees all classes across all teachers + student impersonation. Full plan in `Dplan/Admin_God_Access_Plan.md`. Adds `admin` to Role enum, relaxes ownership checks, new `/api/admin/impersonate/:pairId` endpoint, ~140 lines across 11 files.

## Design Feedback Log
- Tone: "forced happy" dystopian, NOT intimidating
- PEARL: kind, welcoming, prominent — user's connection to The Party
- **No "Season" naming** — use in-world bureaucratic terms
- **User HATES monochrome green CRT everywhere** — green CRT only inside terminal view
- **User HATES dark CRT terminal for shift queue** — shift queue is a "forced happy" government iOS app, NOT a hacker terminal
- **Office view = warm retrofuturist** — pastels, neon accents, chrome
- **TerminalAppFrame stays dark** (device chrome), content area uses `crt-monitor-screen` cyan CRT background
- **Terminal desktop & app frame** both use `crt-monitor-screen` class for cyan CRT background with scan line effect
- **pOS digital-first, not physical stamps** — task confirmations use `AuthorizationToast` (PEARL eye + progress ring + checkmark), not BureauStamp. "The OS is the authority, not a bureaucrat with a stamp." StampChoice (CHANGED/REMOVED classification) still uses old stamp pattern.
- **AuthorizationToast image**: `pearl-eye-glow.png` (128x128, 22KB) — radial-gradient mask for feathered edges into transparency

## Dplan Canon Reference
- Location: `~/Desktop/Dplan/` — iOS version design docs, canonical reference
- Key file: `docs/webapp-technical-design.md` — authoritative web track spec
- Canonical PEARL barks: `docs/ambient-text-bank.md`
