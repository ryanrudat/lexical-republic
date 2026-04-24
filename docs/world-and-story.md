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
All NPCs use unified `Citizen-XXXX` format. 5 core recurring voices with 3-phase arcs + condensed overrides:

| Character | Role | Act I (W1-6) | Act II (W7-12) | Act III (W13-18) |
|-----------|------|-------------|---------------|-----------------|
| Citizen-2104 | Model employee | Genuinely happy, loves routine | Notices things, self-corrects | Cracks show |
| Citizen-0018 | Senior mentor | Helpful authority, teaches through story | Veiled warnings | Goes quiet |
| Citizen-4488 | The dissenter | Herbs, cat, "I should not worry" | Notices patterns, improving grammar | Self-censoring, grammar perfect |
| Citizen-0007 | Tired worker | Enthusiastic new hire, funny | Exhausted, complains within limits | Robotic compliance |
| Citizen-7291 | Efficiency bureaucrat | Obsessed with metrics | Proud of audit results | Realizes metrics hide something |

10 background citizens with scripted appearances/departures (defined in `BACKGROUND_CITIZENS` array in `harmonyWorldBible.ts`). Key citizens: Citizen-5502 (homesick, gone W7), Citizen-0031 (knitter, gone W6), Citizen-8844 (cafeteria worker, never disappears), Citizen-4401 (4488's cautious ally from W6).

Condensed route compresses Act II into a single week-11 beat per character. `getCharacterPhase(char, weekNumber, routeId)` resolves the correct arc.

### Citizen-4488 Arc (single-neighbor thread)
- **Week 1**: Neighbor's herbs dying, small gray cat waits by door. Grammar error ("arrive" → "arrives"). "I should not worry."
- **Week 2**: Calligraphy removed, ink stones still on shelf. Cat follows 4488 home. "Everything is fine."
- **Week 3**: Adoption form filed, no one responds. Cat sleeps at 4488's door. "Everything is fine."
- **Condensed catch-up** (deferred): "I named her Tuesday." — after the day her owner disappeared.
- PEARL notes escalate: observation → wellness check → Pattern-7 monitoring

### World Bible (`harmonyWorldBible.ts`)
- **8 Locations**: Sector 4 Community Center, Central Filing Hall, Wellness Pavilion, Cafeteria Block 7, Transit Hub Delta, Residential Towers 11-15, Recreation Yard 3, The Archive
- **5 Regulations**: Regulation 14-C (vocabulary), Form 77-B (activity registration), Directive 2031.4 (schedule changes), Wellness Protocol 9 (check-ins), Harmony Conduct Code
- **Approved Media**: Our Harmonious Kitchen (cooking show), Junior Associate Sparky (kids' cartoon), Clarity Challenge (quiz show), Evening Serenity Hour, Synthetic Serenity playlist
- **Food Culture**: Harmony Congee, Standard Noodle Bowl, Efficiency Bun (red bean), Community Soup (seasonal), Celebration Cake (monthly, always vanilla), the window table mystery
- **Domestic Life**: Tower specs (18 sqm, one window), balcony plants (Form 19-B), approved pets (finches/canaries via Form 22-D, cats unlicensed but tolerated), corridor lights dim at 22:00
- **Hobbies**: Walking groups (3-6 citizens), calligraphy, puzzle assembly, knitting circle (gray/blue/cream only), container gardening, listening groups
- **Traditions**: Morning Voice (07:30 intercom, identity classified), Celebration Cake, anonymous poetry, Productivity Festival / Harmony Day / Reflection Week / Year-End Gala
- **Children**: Junior Associate Academy, Compliance Stars (gold pins), Sparky mascot, nursery rhyme

### Static Content (Weeks 1-3)
- **Seed feed posts** (`harmonyFeed.ts`): 12 character-first posts with spaced vocabulary recycling (6 W1, 3 W2, 3 W3)
- **Bulletins** (`harmonyBulletins.ts`): 4 Ministry Bulletins with comprehension MCQs
- **PEARL Tips** (`harmonyPearlTips.ts`): 3 grammar-as-policy tips
- **Notices** (`harmonyCommunityContent.ts`): 7 immersive notices (named dishes, approved icebreaker, cream scarf in lost-and-found, abandoned 847/1000 puzzle, unclaimed ink stones)
- **Sector Reports** (`harmonyCommunityContent.ts`): 3 narrative reports (214→208→197 associates, declining headcount, rising "efficiency")
- **Censure items** (`STATIC_CENSURE_ITEMS` in `harmonyGenerator.ts`): 8 per week (3 grammar + 3 vocab + 2 replace)
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

### Weeks 4-6 content status
Full shift plan with narrative, vocabulary, task sequences, Canva scripts, dictionary words, and Harmony censure items defined in `Dplan/Weeks_04_06_Shift_Plan.md`. Summary:

- **Week 4: Evidence Board** — **SHIPPED 2026-04-21**. Sequencing words + simple past + 1 SVA error (L1 Mandarin target). Students build timelines from evidence fragments; one fragment gets reclassified mid-task **as an interactive C choice (REMOVE vs KEEP FLAGGED)**. 10 TOEIC words (arrange, collect, examine, indicate, locate, organize, present, record, select, verify). Includes 3 B moments (Betty, Ivan, ambient glitch) and a shift-close PEARL Observation card conditional on the Fragment 3 choice value.
- **Week 5: Wellness Check** — Must/should + emotion adjectives + because-clauses. Wellness Language Guidelines require approved emotional vocabulary; student self-assessment gets forwarded to supervisor. 10 TOEIC words (concern, effort, express, improve, observe, reduce, recommend, suggest, support, value). **Planned with W4 carry-over hooks** (Betty/Ivan tones, Citizen-4488 post variants, Harmony Wellness Division tone all condition on stored W4 NarrativeChoice values).
- **Week 6: Act I Clock-Out** — Mixed review of all W1-5 grammar. Full compliance audit, M.K. asks "What's the pattern?", Director-7 reviews, file flashes "RUN." Clearance elevated to Steward. 5 tasks per pedagogy audit (W6 re-split 4→5 to reduce Lane 1 cognitive load). 10 TOEIC words (achieve, adjust, conduct, establish, evaluate, perform, prepare, produce, summarize, transfer).

Citizen-4488 arc across W4-6: self-censorship deepens from constructing compliant narratives (W4 — grammar nearly error-free) through forced positive framing (W5) to active awareness of self-censorship (W6).

### Narrative-Reactive Interaction Layers (2026-04-21)
From W4 onward, narrative lives in **non-skippable interaction points** inside the terminal flow, not just toasts and Harmony posts. Two layer types:

- **B (inter-task moments)**: full-surface non-skippable card between tasks. NPC sends a message, student picks a reply (each uses current-week grammar target). Stored as `NarrativeChoice` for future branching.
- **C (mid-task choices)**: interrupts a task mid-flow. E.g. PEARL reclassifies Fragment 3 during Document Review; student must choose how to respond before Doc B loads.

Every NPC reply set includes one compliant choice (Character Bible interaction rule 4). Choices flow into:
- Same-shift payoff: shift-close PEARL Observation card branching on the stored choice value.
- Cross-shift payoff (planned, W5+): Betty/Ivan tone variants, Citizen-4488 post variants, Harmony content tone — all conditioned on stored W4 choices.

Full architecture in `docs/architecture.md` § Narrative-Reactive UI Layer.

### Pedagogical audit notes (2026-04-08)
- All 60 TOEIC target words (W1-6) verified against TOEIC 600/3000 word lists — all confirmed
- "respond" was duplicated in W3 and W5 — replaced with "recommend" in W5
- Week 6 reduced from 5 to 4 tasks (two writing tasks merged)
- SVA errors now included in W4/W5/W6 error correction (L1 Mandarin interference)
- WritingEvaluator must not penalize article errors in W1-6 (not yet taught)
- Grammar progression W1-6 validated against Taiwan 108 Curriculum and CEFR A2-B1
- Passive voice and future simple absent from W1-6 — planned for Act II
- Full pedagogical notes in `Dplan/Weeks_04_06_Shift_Plan.md` § Pedagogical Notes

### Current content reality check
- Much weekly narrative content is still seeded placeholder copy from `backend/prisma/seed.ts`
- Week 1-3 authored lesson packages are in script-first classroom format
- Week 4 WeekConfig shipped 2026-04-21 with C+B interactive layers; W4 Harmony static content + W4 dictionary seed entries still deferred
- Weeks 5-6 fully planned but not yet built as WeekConfig files
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
