# Project Update Log

Last updated: 2026-03-06

## 2026-03-06 — Harmony UI Redesign, PEARL Guardrails Hardening, Data Fixes, Hybrid Class Design

### PEARL AI Guardrails Hardened (4-layer defense)
- **Layer 3a (pre-filter)**: Expanded from 14 to 22 regex patterns. Now catches copy-pasted quiz question formats ("Which word means...", "Choose the correct...", fill-in-the-blank underscores).
- **Layer 3b (task context injection)**: Strengthened for quiz tasks (`vocab_clearance`, `document_review`, `grammar`). When student is on a quiz, AI gets aggressive "CRITICAL — QUIZ IN PROGRESS" instruction forbidding definitions, synonyms, and target word mentions.
- **Layer 4 (post-response filter, NEW)**: After AI responds, checks if response contains any of the target vocabulary words while student is on a quiz task. If leaked, response is replaced with an in-character deflection. Catches cases where GPT ignores system prompt.
- Bug found in production: student copy-pasted "Which word means 'to reach a place after traveling'?" and PEARL gave a full explanation pointing to "arrive". Layer 3a now catches the "which word means" format instantly.

### Harmony UI Redesign (frontend)
- **Thread/reply view**: Tap any post → see replies + compose reply. Back button returns to feed.
- **Citizen-4488 visual distinction**: Amber border/dot/text, "COMMUNITY POST — REVIEW FOR LANGUAGE COMPLIANCE" notice on NPC posts.
- **Censure action buttons**: APPROVE / CORRECT / FLAG on all NPC posts, wired to backend `/censure` endpoint with Citizen-4488 interaction logging.
- **Target word highlighting**: Focus words highlighted in cyan, review words in amber within post content.
- **Collapsible vocabulary section**: Show/hide toggle to save screen space.
- **Reply count indicators**: Posts show count, clicking opens thread.
- **API cleanup**: Added `censurePost` to `harmony.ts` API module.

### Data Consistency Fixes (seed)
- **TOEIC category casing**: Normalized 29 Title Case entries (`'General Business'` → `'business'`, `'Office Procedures'` → `'procedures'`, etc.) to match teacher dashboard dropdown options.
- **Duplicate `confirm` removed**: Was seeded in both Week 1 and Week 3; `confirm` is a Week 1 target word only.
- **Harmony vocabulary spine aligned**: `getHarmonyReviewContext()` now pulls from WeekConfig `targetWords` (what students practice in shift tasks) instead of storyPlans `newWords` (narrative anchor words). Falls back to storyPlans for weeks 4+ without a WeekConfig.
- **Harmony seed posts rewritten**: All 9 posts now naturally use actual shift target words (arrive, follow, check, report, submit, etc.) instead of story anchor words (compliance, directive, protocol, clearance). PEARL notes document which target words appear in each post.

### Hybrid Class Design (planning — not yet implemented in code)
- Established pedagogical framework for blended physical + digital learning.
- Key principle: "Teacher introduces. App drills. Physical activities produce."
- Designed 4-phase hybrid shift template for 50-minute classes:
  1. **Ministry Briefing** (teacher-led, 12-15 min): retrieval drill, new word introduction, Clip A + discussion
  2. **Field Assignment** (physical in-world activity, 10-12 min): rotating Ministry procedures
  3. **Station Work** (app-driven, 15-18 min): vocab_clearance MCQ + core analysis task
  4. **Debrief + Clock-Out** (hybrid, 8-10 min): Clip B reveal + Shift Report writing or verbal exit
- Designed 6 physical "Ministry Procedures" activity types: Oral Compliance Review, Evidence Board, Citizen Debrief, Ministry Dictation, Priority Board, Public Address Drill.
- Mapped Week 1 → Oral Compliance Review, Week 2 → Evidence Board, Week 3 → Priority Board.
- Identified minimal app changes needed: compact intake_form mode, `teacherLed` task gating, teacher "advance to Station Work" signal.
- Vocabulary encounter chain: 12+ encounters per word across teacher intro, pronunciation drill, physical activity, MCQ, document reading, writing, Harmony.
- Next steps: decide restructure depth (light/medium/full), generate printable Ministry materials, consider teacher Session Control panel.

## 2026-03-06 — Harmony Weekly Review Feed + Story/Vocab Wiring

### Harmony as Weekly Vocabulary Review Surface
- Harmony feed now uses the student pair's current shift progression to decide what posts are visible.
- Feed response now returns current-week `focusWords` and previous-week `reviewWords` so Harmony functions as retrieval practice, not just ambient flavor.
- Harmony is unlocked from Shift 1 instead of waiting until Shift 3.

### Seeded Story/Vocabulary Integration
- Added shared `WEEK_STORY_PLANS` source so Harmony review context and seeded narrative posts use the same weekly story words.
- Added week-tagged Harmony seed posts for Weeks 1-3 with visible author labels (`Citizen-2104`, `CA-18`, `Citizen-4488`, etc.) instead of anonymous NPC posts.
- Seeded posts now deliberately recycle prior-week anchor vocabulary inside new-week Harmony content:
  - Week 1 posts circulate `directive`, `protocol`, `compliance`, `clearance`
  - Week 2 posts introduce `contradiction`, `missing`, `notice`, `revision` while carrying Week 1 terms
  - Week 3 posts introduce `clarify`, `queue`, `priority`, `dispatch` while carrying Week 2 terms

### Runtime/Backend Changes
- Added Harmony post metadata fields for `authorLabel` and `weekNumber`.
- New Harmony API behavior:
  - filter seeded posts by current unlocked week
  - preserve class scoping
  - assign student-created posts to the student's current week
  - inherit `weekNumber` on replies
- Added shared progression helper so week-aware logic is not duplicated between Dictionary and Harmony routes.

### Verification Notes
- Backend build, frontend build, Prisma client generation, and database seed completed successfully after implementation.
- Local Prisma migration engine returned a generic schema-engine error during `migrate deploy`; migration SQL was still added to the repo, and the two Harmony columns were applied directly to the local dev DB to verify seed/runtime behavior end to end.

### Remaining Follow-Up
- ~~Align live Week 1-3 queue `targetWords` and `previousWords` with the canonical story-plan anchor vocabulary~~ — DONE: `getHarmonyReviewContext()` now pulls from WeekConfig targetWords. Harmony seed posts rewritten with actual shift target words.

## 2026-03-06 — Student Work Persistence, Teacher Grades, Vocab Stemmer

### Student Data Persistence
- Student writing text now saved in `MissionScore.details` JSON blob (writingSubmissions, justifications, writingText) across all writing tasks (IntakeForm, PriorityBriefing, ContradictionReport, PrioritySort, ShiftReport)
- Concern score hydrated from DB on login/refresh (was always 0 before)
- Fixed stale closure bugs in IntakeForm, PriorityBriefing, PrioritySort where last card's writing was lost

### Teacher Grade Management
- 4 new backend endpoints: edit score, delete score, reset week progress (cascade), override concern
- Gradebook rewrite: detects dual week types (ShiftQueue weeks 1-3 vs PhaseRunner weeks 4+), inline score editing, per-task writing viewer, week reset with confirmation
- Moved welcome video upload from Dictionary tab to Shifts tab
- Fixed Dictionary tab readability (dark theme → light palette)
- Removed fake test pairs CA-2 through CA-5 from seed

### Porter Stemmer for Vocabulary Matching
- Replaced ad-hoc suffix regex (which failed on e-dropping, consonant doubling) with Porter Stemmer (1980)
- Applied to both frontend `TargetWordHighlighter` chips and backend `POST /api/submissions/evaluate`
- "arrived", "submitted", "following" all correctly match their base target words
- Aligned with CEFR A2-B1 word family standards (Bauer & Nation, 1993 Level 2)
- Shared stemmer: `frontend/src/utils/stemmer.ts` and `backend/src/utils/stemmer.ts`

## 2026-02-11 — Timeline + Media Authoring Lock
- Added fixed 18-shift story/learning/environment media plan:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Story_Learning_Environment_Timeline.md`
- Locked authoring order so media plan is defined before activity design:
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
- Confirmed operational preference:
  - keep teacher video upload open
  - run class flow in sequence (`clip_a -> activity -> clip_b`)
- Added downloadable Canva production script pack for Weeks 1-3:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.md`
- Added downloadable Word exports for script distribution:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Canva_Production_Scripts_Weeks_01_03.docx`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Weeks_01_03_Script_Pack.docx`

## 2026-02-11 — Content/Design Progress
- Locked guided student flow and teacher-controlled sequence (`clip_a -> activity -> clip_b`).
- Added dual video pipeline (embed + true upload) and Three.js TV playback support.
- Built Week 1-3 lesson packages in script-first format.
- Integrated Desktop Dplan canon into Week 1-3 scripts.
- Added semester outcomes framework aligned to 50-minute class reality.

## 2026-02-11 — Knowledge/Canon Documentation
- Added world canon summary:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/World_Canon.md`
- Added script writing style + vocabulary control guide:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Script_Writing_Style_Guide.md`
- Added Desktop source integration notes:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Dplay_Source_Integration_Notes.md`
- Updated core knowledge files:
  - `/Users/ryanrudat/Desktop/Lexical Republic/memory.md` _(merged into CLAUDE.md on 2026-02-13)_
  - `/Users/ryanrudat/Desktop/Lexical Republic/SCRIPT_AND_VOCAB_BUILD_ORDER.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/TAIWAN_G10_VOCAB_WORKING_LIST.md`
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Semester_Outcomes_Framework.md`

## Next Confirmed Step
- Write/lock the next script set using:
  1. `World_Canon.md`
  2. `Script_Writing_Style_Guide.md`
  3. weekly known/new vocabulary list
