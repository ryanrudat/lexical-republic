# World, Story & Characters

## Story-first Location Naming
Student-facing location labels map directly to learning purpose:
- `Shift Intake`
- `Broadcast`
- `Compliance Desk`
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

## Harmony Content & World Bible

### Harmony NPC Characters (`harmonyCharacters.ts`)
5 recurring NPC voices with 3-phase arcs (Act I / Act II / Act III) + condensed-route overrides:

| Character | Role | Act I (W1-6) | Act II (W7-12) | Act III (W13-18) |
|-----------|------|-------------|---------------|-----------------|
| Citizen-2104 | Model employee | Genuinely happy | Notices things, self-corrects | Cracks show |
| CA-18 | Senior mentor | Helpful authority | Veiled warnings | Goes quiet |
| Citizen-4488 | The dissenter | Grammar errors, "everything is fine" | Notices patterns, improving grammar | Self-censoring, grammar perfect |
| WA-07 | Tired worker | Enthusiastic new hire | Exhausted, complains within limits | Robotic compliance |
| Citizen-7291 | Efficiency bureaucrat | Obsessed with metrics | Proud of audit results | Realizes metrics hide something |

Condensed route compresses Act II into a single week-11 beat per character. `getCharacterPhase(char, weekNumber, routeId)` resolves the correct arc.

### Citizen-4488 Arc (inverse literacy)
- **Week 1**: Grammar error ("arrive" → "arrives"), anxious, "I should not worry"
- **Week 2**: Grammar perfect, notices removals, "Everything is fine. Change is normal."
- **Week 3**: Grammar flawless, uses modals correctly, self-censors — "I should not delay my own schedule to ask questions"
- PEARL notes escalate: observation → wellness check → Pattern-7 monitoring

### World Bible (`harmonyWorldBible.ts`)
- **8 Locations**: Sector 4 Community Center, Central Filing Hall, Wellness Pavilion, Cafeteria Block 7, Transit Hub Delta, Residential Towers 11-15, Recreation Yard 3, The Archive
- **5 Regulations**: Regulation 14-C (vocabulary), Form 77-B (activity registration), Directive 2031.4 (schedule changes), Wellness Protocol 9 (check-ins), Harmony Conduct Code
- **Cultural details**: Clarity tea (10:00/15:00), Synthetic Serenity playlist, weekly rotating slogans, harmony credits

### Static Content (Weeks 1-3)
- **Bulletins** (`harmonyBulletins.ts`): 4 Ministry Bulletins with 2-3 comprehension MCQs each
- **PEARL Tips** (`harmonyPearlTips.ts`): 3 grammar-as-policy tips matching each week's grammar target
- **Notices** (`harmonyCommunityContent.ts`): 7 community notices (cafeteria menus, events, transit, schedule changes)
- **Sector Reports** (`harmonyCommunityContent.ts`): 3 data-rich weekly reports from Central Filing Hall (baseline metrics that subtly shift across weeks)
- **Censure items** (`STATIC_CENSURE_ITEMS` in `harmonyGenerator.ts`): 8 per week (3 grammar + 3 vocab + 2 replace)
- **Seed feed posts** (`harmonyFeed.ts`): 6 for week 1, 3 for week 2, 3 for week 3
- Weeks 4-6 planned in `Dplan/Weeks_04_06_Shift_Plan.md`. Weeks 7+ fall back to AI generation.

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

### Weeks 4-6 content status (planned, not yet built)
Full shift plan with narrative, vocabulary, task sequences, Canva scripts, dictionary words, and Harmony censure items defined in `Dplan/Weeks_04_06_Shift_Plan.md`. Summary:

- **Week 4: Evidence Board** — Sequencing words + simple past. Students build timelines from evidence fragments; one fragment gets reclassified mid-task. 10 TOEIC words (arrange, collect, examine, indicate, locate, organize, present, record, select, verify).
- **Week 5: Wellness Check** — Must/should + emotion adjectives + because-clauses. Wellness Language Guidelines require approved emotional vocabulary; student self-assessment gets forwarded to supervisor. 10 TOEIC words (concern, effort, express, improve, observe, reduce, respond, suggest, support, value).
- **Week 6: Act I Clock-Out** — Mixed review of all W1-5 grammar. Full compliance audit, M.K. asks "What's the pattern?", Director-7 reviews, file flashes "RUN." Clearance elevated to Steward. 10 TOEIC words (achieve, adjust, conduct, establish, evaluate, perform, prepare, produce, summarize, transfer).

Citizen-4488 arc across W4-6: self-censorship deepens from constructing compliant narratives (W4) through forced positive framing (W5) to active awareness of self-censorship (W6).

### Current content reality check
- Much weekly narrative content is still seeded placeholder copy from `backend/prisma/seed.ts`
- Week 1-3 authored lesson packages are in script-first classroom format
- Weeks 4-6 fully planned but not yet built as WeekConfig files
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
