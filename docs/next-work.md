# Status & Next Work

Where things stand and what's queued. For day-by-day shipped history see
[`changelog.md`](changelog.md); for specific past work prefer `git log` and the topic files in
`memory/`.

## ▶ Active: Audit Remediation (June 2026)
Two June audits (Shift-4 deep review + 60-finding frontend bug sweep) produced a prioritized fix
list tracked in **[`audit-remediation-2026-06.md`](audit-remediation-2026-06.md)**. First batch
landed (Lane-1 grammar scaffold, shared-device logout hygiene, `refresh()` 401-guard, concern-delta
reset, W4 `DictionaryWord` startup migration). Remaining: PEARL interrogation voice, W4 vocab
coverage, teacher class-switch staleness, Harmony own-post visibility, and a P1/P2 tail. **All 35
Shift-4 answer keys verified correct.** See the tracker for the full checklist + status.

## Harmony Expansion Status
Harmony expansion is in progress. See `Dplan/Harmony_Expansion_Review.md` for the full design review.
- **Phase 0 (bug fixes)**: DONE — generation race condition, dead gate code, censure action fix, orphaned post sweep
- **Phase A (cumulative review + route awareness)**: DONE — 3-tier vocab (focus/recent/deep), route-aware generation/queries, differentiated mastery (+0.05 current / +0.03 review), cumulative censure review items
- **Phase B (world-building content engine)**: DONE — world bible, 5 NPC character definitions with arc phases, 4 new content types (bulletin/pearl_tip/community_notice/sector_report), per-type generator, component registry, bulletin comprehension endpoint
- **Phase B+ (content overhaul)**: DONE — character-first post rewrites, expanded world bible (food/media/hobbies/traditions/citizen roster), unified Citizen-XXXX naming, AI prompt overhaul ("Write about PEOPLE, not vocabulary"), vocabulary recycling (spaced repetition), Vitest validation suite, startup authorLabel migration
- **Phase B++ (4-tab UI)**: DONE — government portal navigation (Feed / Ministry / Sector / Review), client-side post filtering, MinistryTab + SectorTab components
- **Phase C (archives + polish)**: DONE — 5-tab UI (Feed / Ministry / Sector / Review / Archives), Archives tab with 3 sub-sections (Vocabulary by Week with mastery bars, Citizen-4488 Case File timeline, Bulletin Archive), `lastHarmonyVisit` tracking (Prisma migration), NEW badges on unseen posts, notification dot on Harmony tile via `harmony:new-content` socket event, PEARL ambient annotations (session-based: censure streaks, 4488 flag/approve reactions), `GET /api/harmony/archives` + `GET /api/harmony/has-new` endpoints.
- **Phase D (bilingual + new censor activities)**: DONE — three Harmony interactive activities (Censure Queue, Bulletin MCQ, Archives Vocabulary) now lane-aware bilingual (Lane 1 always Mandarin, Lane 2 tap-to-reveal, Lane 3 English-only). Two new censor activity types: `censure_redact` (tap-in-text recognition) and `censure_triage` (3-bin classification). 18 new hand-authored static items (W1-W3, 3 of each new type per shift). Bulletin Mandarin enrichment happens at read time via `STATIC_TRANSLATION_BY_REF` so existing DB posts backfill without migration.
- **Visual enhancements**: Ideas saved in `Dplan/Harmony_Visual_Enhancement_Ideas.md` (propaganda ticker, 4488 glitch, typewriter bulletins, etc.)

## Next Work
- **Pause-All replay survives backend restart (deferred from audit batch 2026-05-04).** Audit fix landed an in-memory `classPauseState` Map in `socketServer.ts` that replays `session:paused` to students on connect — fixes refresh/late-join bypass. Still in-memory only, so Railway redeploys lose pause state. Persist via `Class.pausedAt` + `Class.pauseMessage` Prisma columns when needed (rare classroom case; not blocking).
- **Compliance Check teacher results UI**: data is already saved (`ComplianceCheckResult` table, full questions+answers JSON). `GET /compliance-check/teacher/classes/:classId/results` endpoint + `fetchComplianceCheckResults()` client wrapper exist. Need a Gradebook drill-down panel mirroring the Remediation Events pattern (PR #24) to render attempts, scores, time-to-complete, and per-question correctness.
- **W5 carry-over hooks** — read stored W4 `NarrativeChoice` values at W5 shift start (`w4_recruitment_vote` is the primary gate: compliant/curious/guarded; `w4_drop_box_first_submission` carries the student's free-text observation). Branch Betty/Ivan tones, Citizen-4488 W5 post variants, Harmony Wellness Division post tone, and second `[ ].edited` message depth. Requires W5 WeekConfig to exist first.
- **Build Weeks 5-6 WeekConfig files** from `Dplan/Weeks_04_06_Shift_Plan.md` — mechanical scaffold first (same W4 pattern), then C+B layers on top. **Audit fixes applied 2026-04-08:** W5 "respond"→"recommend" (duplication with W3), W5 Doc B reduced to 5 errors, W6 writing tasks merged (5→4 tasks), SVA errors added. See shift plan § Pedagogical Notes. **Pre-build pedagogy fixes 2026-04-17 (PR #11, pending):** W6 re-split 4→5 tasks to reduce Lane 1 cognitive load; W5 because-clause explicit teaching (Mandarin-L1 interference); W6 cumulative review must include one target word from EACH of W1/W2/W3; PEARL bark after W6 RUN flash; Wellness Division thread woven W3→W4→W5.
- **Harmony content authoring** — weeks 4-6 static content (new NPC introductions: Citizen-6103, Citizen-1177, Citizen-9020; first disappearance: Citizen-0031) + W4 static Harmony content (bulletins, PEARL tips, notices, sector reports, censure items).
- **W4 Activity Reconciliation — DONE 2026-05-25 (commits `91ec935` + `ea59d24` and others).** All 6 frontend pieces from the redesign backlog shipped: (1) queue sidebar `CaseQueueSidebar.tsx` lg+ only; (2) Observation E silent mutation `ObservationMutationView.tsx`; (3) `[ ].edited` desktop app shell in `EditedApp/` with Lexicon (5 TOEIC B1 Black Words: witness/relative/individual/independent/private) + Cipher (`CipherActivity.tsx`) + Drop Box tabs; (4) `.edited-tile-materialize` glitch animation, localStorage-gated; (5) `DropBoxOverlay.tsx` post-Shift-Report; (6) `RecruitmentModal.tsx` end-of-shift vote (`w4_recruitment_vote`). **Cipher Decryption rebuilt 2026-06-03 (`57465e9`)** into a 3-document redacted-reveal that uploads each restored record to `[ ].edited` — see [[project-w4-cipher-multidoc-2026-06-03]]. **Clip A + Clip B Canva videos remain the only non-code W4 work.** See [[project-w4-complete-2026-05-25]].
- **Condensed route 4488 catch-up posts** — 3-5 posts at route-gap transitions ("I named her Tuesday").
- **Condensed route bridging Harmony posts** — ~20 NPC catch-up posts for gap weeks.
- Seed dictionary entries for Weeks 5-6 (W5 "respond" replaced with "recommend"). **W4's 10 words now ship via the `ensureDictionaryWordsForAllWeeks` startup migration** (enrichment in `backend/src/data/week-configs/wordEnrichment.ts`) — add W5/W6 enrichment there too so the same migration covers them (no seed run needed on Railway). See [`audit-remediation-2026-06.md`](audit-remediation-2026-06.md).
- Define per-week vocabulary ladders (TOEIC target words vs world-building words) for Weeks 7-18.
- Full scripted dialogue pass for all character beats (especially Weeks 7-18).
- Custom domain setup for student-friendly URLs (optional).
- Persistent file storage for Railway (S3/R2) — currently uses Railway volume; redeploys preserve files but volume loss would delete all uploads.
- Lane auto-promote/demote evaluation after each shift (deferred; manual teacher lane control is live).
- Hybrid class model app changes — compact intake_form mode, `teacherLed` task gating flag (multi-gate system implemented: `taskGates Int[]` supports multiple simultaneous gates), teacher "advance to Station Work" signal in dashboard.
- Printable Ministry materials — Vocabulary Cards, Evidence Board memos, Priority Board case cards, Conversation Frame cards.
- **Admin "God Access"** — single admin login that sees all classes across all teachers + student impersonation. Full plan in `Dplan/Admin_God_Access_Plan.md`. Adds `admin` to Role enum, relaxes ownership checks, new `/api/admin/impersonate/:pairId` endpoint, ~140 lines across 11 files.
