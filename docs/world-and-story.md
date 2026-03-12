# World, Story & Characters

## Story-first Location Naming
Student-facing location labels map directly to learning purpose:
- `Shift Intake`
- `Broadcast`
- `Language Lab`
- `Evidence Desk`
- `Voice Booth`
- `Filing Desk`

## Character Voice Designations (from Dplan canon)
- William Flannery (`Clarity Associate-7`)
- Betty (`Welcome Associate-14`)
- Ivan (`Clarity Associate-22`)
- M.K. (silent reply pattern)
- Chad (`CA-31`)
- Party language: `Prior`, `Unit`, `Concern`, `Wellness Assistance`

## PEARL Character
- Ambient, constant, authoritative — not optional, not a chatbot
- Eye never blinks — look-around and attention moments only (wide_gaze, slow_focus, iris_pulse)
- Eye state arc tied to narrative progression:
  welcoming → attentive → evaluative → confused → alarmed → frantic → cold → breaking → final
- In-character voice: no contractions, institution-as-speaker, passive voice, A2-B1 vocabulary

## Story Beat Metadata
Mission config supports `storyBeat` fields:
- `beatTitle`, `location`, `objective`, `speaker`, `line`, `pressure`
- `learningFocus`, `knownWords[]`, `newWords[]`

Rendered via `StoryBeatCard` in the mission UI.

## 18-Week Narrative Planning
`backend/prisma/seed.ts` contains `WEEK_STORY_PLANS` for all 18 weeks.

Each week plan drives: episode title/subtitle, character voice line, objective, grammar focus, known/new words, cliffhanger.

Week 1 keeps custom authored content; weeks 2-18 use the default mission generator.

## Vocabulary Design Principle: TOEIC-first

**TOEIC-aligned words come first; world-building / story words come second.**

Each week's vocabulary has two tiers:
1. **TOEIC target words** — words from the TOEIC exam word lists that students actively practice through tasks (word_match, cloze_fill, vocab_clearance, shift_report). These are the `targetWords` in each WeekConfig.
2. **World-building words** — narrative/setting vocabulary (e.g., ministry, citizen, directive, protocol) that students encounter in context but are not the primary drill focus. These appear in documents, dialogue, and the Party Lexical Dictionary.

When designing new weeks, fill `targetWords` with TOEIC-aligned vocabulary first, then layer in world-building words through narrative context.

### Week 1 vocabulary breakdown (current, locked)
Week 1 is an exception — it was authored narrative-first. Its 25 total words break down as:

**`targetWords` (10 — actively drilled in tasks):**
TOEIC: approve, assign, check, confirm, report, submit (6)
Non-TOEIC: arrive, describe, follow, standard (4)

**Dictionary target words (10 — in Party Lexical Dictionary, `isWorldBuilding: false`):**
TOEIC: accurate, assignment, submit (3, submit overlaps)
Non-TOEIC: clearance, compliance, directive, protocol, rule, team, work (7)

**World-building words (6 — `isWorldBuilding: true`):**
TOEIC: shift, supervisor (2)
Non-TOEIC: associate, citizen, designation, ministry (4)

Week 1 stays as-is. Weeks 2+ should prioritize TOEIC alignment in `targetWords`.

## Dictionary Seeding
- 49 `DictionaryWord` entries across Weeks 1-3 with Traditional Chinese translations
- 28 `WordFamily` groups (e.g., `fam-employ`, `fam-comply`, `fam-submit`)
- 8 `WordStatusEvent` entries for narrative status changes (grey week 6, monitored week 7, proscribed week 10)
- Dictionary word statuses: Approved → Proscribed (week 10+) → Recovered (week 10+)

## Harmony Content & Citizen-4488 Arc

**Citizen-4488** is a recurring Harmony character whose posts escalate unease across shifts:
- **Week 1**: Missing neighbor, empty chair — "I should not worry. The Ministry takes care of everyone."
- **Week 2**: Names changing overnight, three citizens gone — "It is probably nothing. Everything is fine."
- **Week 3**: Friend's transfer papers processed, no response — "I must maintain focus. Everything is fine."
- PEARL notes escalate in parallel: observation → wellness check scheduled → Pattern-7 monitoring

**Static censure content** (hand-written, high quality) exists for weeks 1-3:
- Each week: 3 grammar + 3 vocab + 2 replace items using that week's target words and grammar focus
- Week 1: present-simple errors (arrive/arrives, describe/describes, submit/submits)
- Week 2: past-simple-vs-present errors (notice/noticed, remove/removed, update/updated)
- Week 3: modal errors (should maintains/maintain, must to complete/complete, can identifies/identify)
- Weeks 4+ fall back to AI generation or generic templates

**Feed seed posts** in `harmonyFeed.ts`: 6 for week 1, 3 for week 2, 3 for week 3 (including one Citizen-4488 each)

## Content Pipeline

### Script-first working agreement
1. Weekly media plan (Clip A → Activity → Clip B + environment cue)
2. Episode script
3. Vocabulary bank (known words + new words)
4. Grammar targets
5. Comprehension checks
6. Listening/voice/case-file tasks

Do not finalize story questions until episode scripts are approved. Keep each location tied to one clear learning job. Keep Week 1 onboarding broadcast as the canonical opening scene.

### Taiwan vocabulary baseline
- Use Taiwan national exam/curriculum-aligned word bands as baseline
- "Known words" from foundational bands (pre-Grade 10)
- "New words" from Grade 10-11 target range, small weekly sets
- **TOEIC alignment is the primary filter** for selecting `targetWords` each week — pick from TOEIC word lists first, then supplement with world-building vocabulary as needed for narrative
- Script readability: clips use mostly known words; new words introduced in controlled repetition

### Current content reality check
- Much weekly narrative content is still seeded placeholder copy from `backend/prisma/seed.ts`
- Week 1-3 authored lesson packages are in script-first classroom format
- Treat seed content as temporary scaffolding, not final script

## 50-Minute Hybrid Class Structure (planned)
1. **Ministry Briefing** (teacher-led, 12-15 min): retrieval drill, new word intro, Clip A + discussion
2. **Field Assignment** (physical, 10-12 min): rotating Ministry Procedure activity
3. **Station Work** (digital, 15-18 min): Vocab Clearance MCQ, core analysis task
4. **Debrief + Clock-Out** (hybrid, 8-10 min): Clip B, Shift Report writing or verbal exit

**Physical Ministry Procedures:**
- Oral Compliance Review (pair vocab quiz with Ministry Vocabulary Cards)
- Evidence Board (printed contradicting memos — circle differences, classify, discuss)
- Citizen Debrief (structured pair conversation using target words)
- Ministry Dictation (teacher reads sentences, students write + compare)
- Priority Board (physical card sort + verbal justification)
- Public Address Drill (30-sec spoken Ministry Report to partner)

**Principles:**
- Teacher introduces vocabulary. App drills. Physical activities produce spoken output.
- Clip A opens together; Clip B closes together. App work fills the middle.
- Each word gets 12+ encounters across modalities.

## Dplan Document Index
Key files in `Dplan/`:
- `UI_Design_System.md` — visual design bible
- `Semester_Outcomes_Framework.md` — canonical semester outcomes
- `Script_Writing_Style_Guide.md` — authoring controls
- `World_Canon.md` — world terminology and character designations
- `Story_Learning_Environment_Timeline.md` — fixed semester media timeline
- `Canva_Production_Scripts_Weeks_01_03.md` — Canva build-ready export
- `Lesson_01_First_Shift_Orientation.md` — Week 1 lesson package
- `Lesson_02_Memo_Contradiction.md` — Week 2 lesson package
- `Lesson_03_Clarity_Bay_Intake.md` — Week 3 lesson package
- `Dplay_Source_Integration_Notes.md` — Desktop Dplan canon integration
- `Project_Update_Log.md` — session-level project updates
- `Weeks_01_03_Script_Pack.md` — consolidated script pack

External canon source: `/Users/ryanrudat/Desktop/Dplan/`
