# Project Update Log

Last updated: 2026-03-06

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
