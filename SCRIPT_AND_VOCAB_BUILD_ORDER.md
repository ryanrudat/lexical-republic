# Script and Vocabulary Build Order (Canonical)

Last updated: 2026-03-06

## Core Rule
Write and approve in this exact order:

1. Weekly language outcome
2. Weekly story outcome
3. Weekly media plan (Clip A purpose, activity bridge, Clip B reveal, environment cue)
4. Full script (Clip A, in-app line triggers, Clip B)
5. Vocabulary list (known vs new)
6. Grammar targets
7. Activities (checks + one core practice + one production task)

If an activity is not tied to the approved script and weekly outcome, do not include it.

## 50-Minute Hybrid Class Rule (to prevent overload)
Use this required 4-phase hybrid structure each week:

1. `Ministry Briefing` — teacher-led, screens down (12-15 min)
   - Retrieval drill: last week's target words (2-3 min)
   - New word introduction: this week's 10 targets (5-7 min)
   - Broadcast Clip A + class discussion (5 min)
2. `Field Assignment` — physical in-world activity (10-12 min)
   - One rotating Ministry Procedure per week (Oral Compliance Review, Evidence Board, Citizen Debrief, Ministry Dictation, Priority Board, Public Address Drill)
   - Uses printed in-world materials; pairs work together
3. `Station Work` — digital app-driven (15-18 min)
   - Vocab Clearance MCQ + core analysis task (document review / contradiction / priority sort)
   - Teacher circulates and intervenes with struggling pairs
4. `Debrief + Clock-Out` — hybrid (8-10 min)
   - Broadcast Clip B reveal (teacher-led, shared reaction)
   - Shift Report writing (digital) OR verbal exit discussion (physical)
   - Optional: Harmony post if time remains

Key principle: Teacher introduces → App drills → Physical activities produce spoken output.
Clip A opens the session together; Clip B closes it together. App work fills the middle.

## Activity Roles by Area
- Shift Start: objective + quick retrieval
- Broadcast: story + comprehension checks
- Language Lab: grammar control
- Evidence Desk: source comparison / proof
- Voice Booth: spoken output
- Filing Desk: written output
- Harmony: spaced review surface for current-week anchor words plus previous-week retrieval

## Harmony Review Rule
- Harmony is not only lore flavor. It must reinforce the approved weekly vocabulary spine.
- Each week's Harmony feed should expose:
  - current-week anchor words as the visible `focusWords`
  - previous-week anchor words as periodic `reviewWords`
- Seeded Harmony posts should include the week's primary words naturally in context and continue recycling earlier high-value words.
- If Harmony copy does not reinforce the same vocabulary students are learning in class that week, it is out of spec.

## Week 1-3 Canon Package
- Semester outcomes and alignment:
  - `/Users/ryanrudat/Desktop/Lexical Republic/curriculum/Semester_Outcomes_Framework.md`
- World canon:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/World_Canon.md`
- Writing style and vocabulary controls:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Script_Writing_Style_Guide.md`
- Curriculum source (activities, prompts, vocab items):
  - `backend/src/data/week-configs/week1.ts`
  - `backend/src/data/week-configs/week2.ts`
  - `backend/src/data/week-configs/week3.ts`
- Video production scripts:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Weeks_01_03_Script_Pack.md`
- Source integration notes:
  - `/Users/ryanrudat/Desktop/Lexical Republic/Dplan/Dplay_Source_Integration_Notes.md`

## Character Use Rule
Keep character behavior stable:
- PEARL = procedural authority
- Betty = warm true believer (care-language + control)
- Ivan = anxious cohort buddy, seeks safety in rules
- M.K. = truth-framed elder line
- William Flannery = student proxy perspective

## Build Rule for Teacher-Guided Runtime
For each week briefing config:
- `nowShowingStage`: `clip_a` -> `activity` -> `clip_b`
- `videoSource`: `auto`
- Use Clip A/B upload slots first, embed links as fallback
- Keep teacher video upload open for both clip slots every week.

## Script Authoring Input Order (Now Mandatory)
1. Read `World_Canon.md`.
2. Read `Script_Writing_Style_Guide.md`.
3. Read `Story_Learning_Environment_Timeline.md`.
4. Lock weekly known/new words.
5. Write script draft.
6. Build activities only after script lock.
