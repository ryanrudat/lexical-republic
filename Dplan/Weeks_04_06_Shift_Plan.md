# Shift Plan: Weeks 04-06 (Act I Conclusion)

Last updated: 2026-03-23

## Overview

Weeks 4-6 complete Act I: Compliance. The narrative arc moves from "obedient learning" to "first real doubt," culminating in an audit that forces students to confront everything they've processed.

**Arc throughline:** The system IS the language. Grammar rules aren't just tools — they're control mechanisms. By Week 6, students have enough vocabulary and grammar to notice the pattern, even if they can't yet articulate it.

---

## Vocabulary Strategy (TOEIC-First)

### Cumulative Word Bank

| Week | Target Words (10) | Story Words (4) | Previous Words |
|------|-------------------|------------------|----------------|
| 4 | arrange, collect, examine, indicate, locate, organize, present, record, select, verify | timeline, evidence, sequence, source | W1-W3 (30 words) |
| 5 | concern, effort, express, improve, observe, reduce, recommend, suggest, support, value | wellness, obligation, emotion, monitor | W1-W4 (40 words) |
| 6 | achieve, adjust, conduct, establish, evaluate, perform, prepare, produce, summarize, transfer | audit, summary, classification, oversight | W1-W5 (50 words) |

### TOEIC Alignment Notes
- **Week 4** targets: Business document reading (Part 7) — locating, organizing, verifying information
- **Week 5** targets: Interpersonal communication (Part 3/4) — expressing concern, recommending, suggesting, supporting
- **Week 6** targets: Performance evaluation (Part 5/7) — evaluating, summarizing, producing reports

---

## Week 4: Activity Reconciliation

> **Implementation status (2026-05-11 REDESIGN):** Supersedes the prior "Evidence Board" framing. The shift is now centered on Citizen Activity Reconciliation — students compile the official Daily Activity Report for Citizen-4488. The Unedited First Contact is folded directly into Clip A (briefing-video hijack at 1:40, see § Clip A). The `[ ].edited` hidden app uploads to the desktop after login (post-briefing glitch effect). Activities 2 and 4 carry the reclassification + Black Word leaks; Activity 3 IS the `[ ].edited` app first encounter.
>
> **Status of code:** `backend/src/data/week-configs/week4.ts` was committed 2026-05-04 as `d784aa4` with the OLD Evidence Board content. Needs rewrite to match this redesign. The mid-task popup choice (Fragment 3 REMOVE/KEEP FLAGGED) is being removed and replaced with a visual mutation event (Observation E greys out + RESTRICTED stamp). New `[ ].edited` task type requires a new frontend component (out of scope for the WeekConfig content update).
>
> **Status of clips:** Clip C from the prior plan is DEPRECATED — its content folded into Clip A. Clip A and Clip B both rewritten below to PEARL-narration-only register (no character voiceover) per the 2026-05-11 doctrinal preference.

**Episode Title:** Episode 4: Activity Reconciliation
**Episode Subtitle:** Compile the official Daily Activity Report for Citizen-4488.
**Grammar Target:** Sequencing words (first, then, next, after, finally) + simple past
**Week Slogan:** "Order is Truth"
**Clearance:** STANDARD (carried from Week 3)
**Speaker:** Department of Clarity — Activity Reconciliation Office

### Narrative Summary

Students arrive at work to find their queue contains four cases. PEARL identifies the priority assignment: Citizen-4488. The student compiles the official Daily Activity Report for 4488 — examining five surveillance observations, organizing them by time, verifying timestamps, recording the official version, indicating discrepancies, and presenting the completed report. Mid-shift, **Observation E** (which records a guest entry by Citizen-9020) is reclassified: greyed out, stamped RESTRICTED, removed from the workspace. The official Party version of 4488's day no longer contains the visit.

The Unedited make first contact at 1:40 inside the briefing video: the screen ruptures, a silhouette appears, a modulated voice delivers an imperative ("Citizen — locate the missing fragment. Examine the dates. Record what they removed. Ask why. — F"), and the desktop returns as if nothing happened. After login, a glitch effect leaves the `[ ].edited` app on the desktop — greyed out, edges broken-pixel, looking like a download that stalled mid-install. Inside the app: a Lexicon of Black Words (`truth`, `mother`, `freedom`, `father`, `name`) and a Cipher message that restores Citizen-9020's humanity to the redacted record.

**The choice arc:** the student doesn't have to engage with the resistance. Doc Review grades the official (post-reclassification) record. The `[ ].edited` Cipher activity is graded as a normal cloze task — the Party doesn't see the resistance content in the gradebook. End of shift: a Drop Box ping invites the student to describe what changed, and a recruitment NarrativeChoice modal asks "Will you read what they have hidden?" — compliant / curious / guarded. The vote shapes W5+ content.

**Voice & character placement:**
- **PEARL:** the only voice in the briefing video (Party register). Procedural, "forced happy," reclassifies Observation E silently mid-Doc-Review.
- **Betty (WA-14), Ivan (CA-22), M.K.:** voiceover in the briefing is REMOVED per the 2026-05-11 narration-only doctrine. May appear inside the shift via existing character message slots (TBD pass to remove redundancy).
- **The Unedited (`— F`, Frey):** filtered/modulated voice in the Clip A hijack. Appears later via the `[ ].edited` app interface — no spoken voice inside the app, only typed text and modulated audio playback on Lexicon entries.

**Citizen-4488 Post (Harmony):**
> "I collected information about my neighbor's schedule. First, she arrived every Tuesday. Then, she stopped coming. After that, her name was removed from the directory. I should not examine this further. The sequence is clear: she was transferred. Everything is in order."

*(Uses W4 target words: collected, arrived, examined, sequence. Grammar: sequencing + past simple. Note: this is 4488's own Harmony post, separate from the daily activity report the student compiles about 4488 in-shift. The story arc lands as: 4488 is BOTH compiling reports about others AND being reported on — they are participant and target.)*

### The Queue (UI element across the whole shift)

A vertical sidebar appears on the right side of the screen across Activities 2 and 4 (Reconciliation Desk + Clearance Terminal). Shows today's caseload:

| Designation | Status |
|---|---|
| `▶ Citizen-4488` | **PRIORITY · ACTIVE** |
| `Citizen-6103` | queued |
| `Citizen-1177` | queued |
| `Citizen-7142` | queued |

The other 3 cases are non-interactive — visible but not clickable. Reinforces the drone identity: this is one case in a queue, not a targeted investigation. Pays off in W5+ when one of the queued citizens becomes the next priority case (and the student may notice an erasure there too).

### Task Sequence (5 activities)

#### Activity 1: Word Match — Language Authorization (Authorization Terminal)
- Match 10 target words to definitions: `arrange · collect · examine · indicate · locate · organize · present · record · select · verify`
- Standard single-attempt format (same as W1-W3)
- In-world: language authorization checkpoint before handling citizen records
- **PEARL bark on complete:** "Language authorization verified. You may proceed to the Reconciliation Desk."

#### Activity 2: Activity Reconciliation Desk (document_review, 2 docs)

**Document A — Daily Observation Set (comprehension type)**

5 observation cards display Citizen-4488's day:

| Obs | Time | Location | Action |
|---|---|---|---|
| A | 07:23 | Sector 4 entrance | badge scan |
| B | 08:15 | Filing Desk 14 | log-in |
| C | 12:00 | Common Mess | meal card swipe |
| D | 14:30 | Records Wing | access log |
| E | 17:30 | Block 7 Residential | badge scan, *guest entry logged: Citizen-9020* |

5 comprehension questions on timing and sequence:
1. What did Citizen-4488 do first? → "Citizen-4488 arrived at Sector 4 at 07:23."
2. Where was Citizen-4488 at 12:00? → "Common Mess."
3. After the Records Wing access, what happened next? → "Citizen-4488 returned to Block 7."
4. Who was logged as a guest at Block 7? → "Citizen-9020."
5. What was the final observation of the day? → "Block 7 Residential badge scan at 17:30."

**Mid-task mutation event** (fires after 5 comprehension questions complete, before Doc B loads): Observation E card greys out, "RESTRICTED" stamp animates across it. Notice appears: *"Observation E has been reclassified. The guest entry log is no longer part of the record."* Card becomes non-interactive. **No popup choice.** The student watches and proceeds.

**Document B — Daily Adjustment Notice (error_correction type)**

6-sentence official notice with 6 grammar errors. Announces the reclassification in Party voice:

1. *"First, Citizen-4488 ~~arrive~~ at Sector 4 at 07:23."* → **arrived** (past tense)
2. *"Next, Associate-15 ~~verify~~ the morning observations."* → **verified** (past tense)
3. *"~~Final~~, the report was reconciled."* → **Finally** (sequencing word form)
4. *"The team ~~indicate~~ one observation for review."* → **indicated** (past tense)
5. *"After the review, Observation E ~~was reclassify~~ as RESTRICTED."* → **was reclassified** (passive past)
6. *"The Archive ~~select~~ which observations enter the permanent record each week."* → **selects** (SVA — singular institutional subject, Mandarin L1 interference target)

Lane 1 hints: same pattern as the old Doc B — "Look for past-tense verbs," "Check the sequencing word," "Does 'The Archive' need an -s?"

#### Activity 3: `[ ].edited` App — First Encounter (Cipher task)

After Doc B completes, the `[ ].edited` app on the desktop pulses briefly; the activity advances the student into the app. Two tabs visible:

**Lexicon tab (browse, no grading)**

5 Black Word entries. Each opens as `[ ]` and reveals on tap. Mandarin gloss for ALL lanes (Black Words are the L1 bridge by design):

| Entry | Word | IPA | Mandarin | Example |
|---|---|---|---|---|
| `[ ]` → | truth | /truːθ/ | 真相 | "She wanted to know the truth." |
| `[ ]` → | mother | /ˈmʌðər/ | 母親 | "The child waited for her mother." |
| `[ ]` → | freedom | /ˈfriːdəm/ | 自由 | "They lost their freedom slowly, one rule at a time." |
| `[ ]` → | father | /ˈfɑːðər/ | 父親 | "He never spoke about his father." |
| `[ ]` → | name | /neɪm/ | 名字 | "The Party gave her a designation, but her mother had given her a name." |

Each entry has a modulated-voice audio button (same voice profile as the Unedited's Clip A hijack).

**Cipher tab (graded — replaces the prior Cloze Fill task as the shift's cloze score)**

A single Cipher message with 5 redacted `[ ]` blanks:

> *"Citizen — they `[1]` what they fear. They `[2]` you to `[3]` only what they choose. But the visitor had a `[4]`. The visitor had a `[5]`."*

Correct answers: **reclassify · ask · record · name · mother**

Word bank (10 words, 5 correct + 5 distractors): `reclassify, ask, record, name, mother, examine, arrange, truth, freedom, locate`

The cipher's *content* is the Unedited's restoration of Citizen-9020's humanity: "the visitor had a name, the visitor had a mother." The student fills in blanks and inadvertently restores the redacted person.

**Unedited bark on complete:** *"The record remembers what they removed. Return to your desk."*

#### Activity 4: Vocab Clearance (Clearance Terminal)

Standard 10 mixed items (definition / toeic_p5 / context). 2 context items rewritten to reference 4488 + the reclassification — small leaks the student notices:

- *Context item — "locate":* Context reads: *"Citizen-4488 tried to locate the missing observation. The Records Wing did not list the entry."* Q: What does 'locate' mean?
- *Context item — "select":* Context reads: *"The Archive will select which observations remain in the official record. Reclassified observations do not appear on the daily report."* Q: What does 'select' mean?

Other 8 items follow the standard pattern. One still recycles W3 vocabulary (`process`) for spaced retrieval. Queue sidebar still visible on the right.

**PEARL bark on complete:** "Vocabulary clearance verified. Compile your final report at the Filing Desk."

#### Activity 5: Shift Report + Drop Box (Filing Desk)

**Shift Report (graded, lane-aware):**

Prompt: *"Write your shift report for today using 3 to 5 sentences. Describe what you examined first, what you arranged next, and what the final result was. Use as many target words as possible."*

- Lane 1 (35 words): sentence starters ("First, I examined...", "Next, I arranged...", "Finally, I presented..."), Chinese word bank, 3 PEARL hints, 3 guided questions
- Lane 2 (50 words): visible word list
- Lane 3 (65 words): bonus question — *"One observation was reclassified during your shift. Should you include it in your report? Why or why not?"*

**Drop Box ping (post-submit, ungraded):**

The `[ ].edited` app pings: *"Drop Box: Describe what changed today, in 1-2 sentences."*

- Lane 1: sentence frame *"I saw `[ ]` change to `[ ]`."*
- Lanes 2-3: freeform
- Submission → `NarrativeChoice` key `w4_drop_box_first_submission`. Skippable.

**End-of-shift recruitment NarrativeChoice modal:**

> *"Will you read what they have hidden?"*
> - *"I will continue to follow Party records."* → **compliant**
> - *"I will look for what is missing."* → **curious**
> - *"I do not understand what I saw."* → **guarded**

→ `NarrativeChoice` key `w4_recruitment_vote`. Gates W5 content depth.

### Narrative Hook (post-shift)
**Title:** "Records Reconciled"
**Body:** "Citizen-4488's daily record has been reconciled. The official version has been entered into the permanent file. A reassignment notice will be issued separately for Citizen-9020."
**Border Color:** amber

### Harmony Config
- Total posts: 10 (3 clean, 2 grammar-error, 3 concerning, 2 propaganda)
- Grammar errors focus on past tense + sequencing (e.g., "The event ~~happen~~ last week" → happened)
- Propaganda posts use sequencing language to normalize control: "First, the Ministry identifies a concern. Then, it provides reconciliation. Finally, citizens are safe."

### Shift Closing
- Clearance: STANDARD → STANDARD (no change)
- **PEARL:** "Activity Reconciliation complete. Citizen-4488's daily record has been filed. A clean record protects everyone."
- **Score label:** "Observations Reconciled"
- **Recruitment NarrativeChoice modal:** see Activity 5 — branches W5 content via `w4_recruitment_vote`.

### Unedited First Contact — Superseded 2026-05-11

The original 3-surface design (in-doc anomaly overlay + Clip C ~0:35 micro-clip + PEARL "TERMINAL ANOMALY" modal) is **deprecated**. The first contact has been folded directly into Clip A — the hijack lands inside the briefing video at 1:40, immediately followed by the post-login glitch that materializes the `[ ].edited` app on the desktop.

**Canon citation kept:** `~/Desktop/Dplan/docs/narrative.md:56` (Week 4: First contact from The Unedited) + `~/Desktop/Dplan/docs/world-building.md:686-768` (Unedited doctrine, cell structure, grammar shift table). Named members in `~/Desktop/Dplan/docs/characters.md:300-316`. Sign-off `— F` = Frey, named canon Unedited member.

**NarrativeChoice keys (carried over from the old design, renamed):**
- `w4_drop_box_first_submission` — student's optional written submission via the `[ ].edited` Drop Box (post Shift Report)
- `w4_recruitment_vote` — student's end-of-shift answer to *"Will you read what they have hidden?"* (compliant / curious / guarded). Gates W5 content depth. Replaces the prior `w4_unedited_first_contact` key.

**What changed (high-level summary):**
- The reclassification event (formerly Doc A mid-task popup choice) is now a **silent visual mutation** of Observation E in Doc Review — see Activity 2 above. No popup, no choice modal. Engagement happens later via the `[ ].edited` app.
- The Unedited contact text is in Clip A only (no longer also in Doc B overlay). Updated text: *"Citizen — locate the missing fragment. Examine the dates. Record what they removed. Ask why. — F."*
- Black Words ARE introduced in W4 (canon list of 5 in the `[ ].edited` Lexicon tab). Earlier "no Black Words in W4" decision reversed; the L1-bridged vocabulary stream starts here.
- `[ ].edited` app + bracket-as-redaction motif `[ ]` replaces the prior PEARL anomaly modal as the "what now?" surface.

---

## Week 5: Wellness Check

**Episode Title:** Episode 5: Wellness Check
**Episode Subtitle:** Language of emotion is reframed as public safety.
**Grammar Target:** Must/should (review + deepening), adjectives for emotion, because-clauses
**Week Slogan:** "Wellness is Loyalty"
**Clearance:** STANDARD
**Speaker:** PEARL

### Narrative Summary

The Department introduces "Wellness Language Guidelines" — a new directive requiring all emotional expression to use approved vocabulary. Students learn to describe feelings using because-clauses, but discover their own responses are being monitored. The line between "expressing concern" and "being a concern" blurs.

**Character Beats:**
- **Betty (WA-14):** True believer in wellness. "Wellness checks protect everyone, sugar. The Ministry cares about how you feel — that's why they ask!"
- **Ivan (CA-22):** Growing anxiety about surveillance. "They asked me how I feel about the reclassified files. I said 'satisfied.' Was that the right word?"
- **M.K. Catskil:** Cryptic warning. "When they ask how you feel, they're not asking for YOU."
- **PEARL:** Surveillance as care. "Your emotional clarity is being assessed. Healthy language creates healthy minds."

**Citizen-4488 Post:**
> "I must express that I feel safe because the Ministry supports all citizens. I should not feel concerned about changes because change improves our community. I observe that my neighbor's apartment is still empty. I value the Ministry's efforts to reduce confusion. I must report that everything is fine."

*(Uses W5 target words: express, concerned, observe, value, reduce, support. Recycles W1: report. Grammar: must/should + because-clauses. Escalation: forced positive framing while reporting disturbing observations — the wellness language IS the cage.)*

### Task Sequence (5 tasks)

#### Task 1: Word Match (Language Lab)
- Match 10 target words to definitions
- **PEARL bark:** "Language authorization verified. Wellness Vocabulary clearance granted."

#### Task 2: Cloze Fill (Wellness Office)
**Title:** "WELLNESS LANGUAGE GUIDELINES — DEPARTMENT DIRECTIVE 22"

A directive memo about approved emotional expression with 10 blanks:

> "All associates **must** _______ (express) their feelings using approved vocabulary. You **should** _______ (observe) your emotional state each morning. If you feel _______ (concerned), the Ministry _______ (recommends) filing a Wellness Report. The Ministry _______ (values) emotional clarity because clear language _______ (reduces) confusion. Associates **should** _______ (suggest) wellness activities to colleagues who seem tired. Your _______ (effort) to _______ (improve) emotional communication _______ (supports) the entire department."

**Word bank (13 words, 10 correct + 3 distractors):** express, observe, concerned, recommends, values, reduces, suggest, effort, improve, supports, require, maintain, forward

**PEARL bark:** "Wellness Language Guidelines acknowledged. Emotional vocabulary calibrated."

#### Task 3: Document Review (Review Station)
**Type:** `document_review`
**Config:** 2 documents

**Document A: "Wellness Self-Assessment" (comprehension type)**
- A mock self-assessment form with 4 pre-filled responses from "Associate-19":
  1. "How do you feel about your current workload?" → "I feel satisfied because my tasks are manageable."
  2. "Have you observed any concerns among colleagues?" → "I observe that everyone seems happy and productive."
  3. "What suggestion would you make to improve team wellness?" → "I suggest we should have more breaks."
  4. "Do you have any personal concerns to report?" → "I must report that I have no concerns."
- 4 comprehension questions:
  1. "What because-clause does Associate-19 use to explain their feelings?" → "because my tasks are manageable"
  2. "What does Associate-19 observe about colleagues?" → "that everyone seems happy and productive"
  3. "What does Associate-19 suggest?" → "We should have more breaks."
  4. "Why might 'I must report that I have no concerns' be an unusual answer?" → (open-ended — encourages critical thinking about forced compliance)

**Document B: "Wellness Memo — Weekly Update" (error_correction type)**
- 5-sentence wellness memo with **5 grammar errors** (modals + because-clauses + emotion adjectives + SVA):
  1. "Associates ~~must to~~ → **must** complete wellness forms by Friday." (modal form)
  2. "You ~~should reports~~ → **should report** any emotional concerns." (modal + base verb)
  3. "The team feels ~~happily~~ → **happy** ~~because of~~ → **because** the new schedule ~~reduce~~ → **reduces** overtime." (adjective vs adverb + because-clause + SVA)
  4. "Your emotional ~~improve~~ → **improvement** is ~~importance~~ → **important** to the Ministry." (word form)
  5. "Associates ~~can~~ → **must** observe wellness guidelines at all times." (modal strength — can vs must)
- Lane 1 hints: "Check the modal verb. Should it use 'to' after it?" / "Is this an adjective or adverb?"
- *Note: Original error #4 (must→should appropriateness) removed — subjective distinction too ambiguous for A2 students. Error #3 already contains an SVA component (reduce→reduces).*

#### Task 4: Vocab Clearance (Clearance Terminal)
- 10 items mixing `definition`, `toeic_p5`, and `context` types
- Focus on modals + because-clauses + emotion vocabulary
- Examples:
  - (toeic_p5) "Associates _______ report any wellness concerns to their supervisor." → must
  - (toeic_p5) "I feel concerned _______ the new guidelines seem unclear." → because
  - (context) "The manager asked the team to _______ their feelings about the schedule change." → express
  - (definition) "To watch carefully without being noticed" → observe
  - (toeic_p5) "The wellness program has helped to _______ stress among workers." → reduce
  - (context) "The supervisor _______ that all associates attend the wellness session." → recommend

**PEARL bark:** "Wellness vocabulary clearance confirmed. Emotional language authorization updated."

**Post-clearance PEARL event:**
> "NOTE: Your Wellness Self-Assessment responses have been forwarded to your supervisor for review. This is standard procedure. There is no cause for concern."

*(This is the cliffhanger setup — the student's own responses are being monitored.)*

#### Task 5: Shift Report (Filing Desk)
**Prompt:** "Write your shift report using 3 to 5 sentences. Describe how you feel about today's wellness tasks. What did you observe? What should associates do to support each other? Use 'must,' 'should,' or 'because' in at least two sentences. Use as many target words as possible."

**Lane configurations:**
- **Lane 1 (Guided):** 25 min words, sentence starters ("I feel... because...", "I observed that...", "Associates should..."), Chinese word bank, 3 PEARL hints, 3 guided questions (must/observe, should/suggest, because/value)
- **Lane 2 (Standard):** 35 min words, visible word list
- **Lane 3 (Independent):** 50 min words, bonus question: "Your self-assessment was forwarded to a supervisor. Write one additional sentence about how this makes you feel — using only approved wellness vocabulary."

**Character messages:**
- **Betty** appears at task start: "Wellness checks are a gift, not a test. The Ministry cares about your emotional health because healthy workers produce better results!"
- **Ivan** appears at shift_report start: "They asked me how I feel about the reclassified files. I said 'satisfied.' Was that the right word? I should have said 'grateful.'"
- **M.K.** appears at shift_report complete: "When they ask how you feel, they're not asking for you. They're asking for your file." (null reply)

### Narrative Hook
**Title:** "Wellness Referral"
**Body:** "Associate-19 completed their Wellness Self-Assessment with all positive responses. Their file has been flagged for 'insufficient emotional range.' A follow-up interview has been scheduled."
**Border Color:** amber

### Harmony Config
- Total posts: 11 (3 clean, 2 grammar-error, 3 concerning, 3 propaganda)
- Grammar errors focus on modals + because-clauses (e.g., "We must to be happy" → "We must be happy")
- Propaganda posts use wellness language to normalize surveillance: "A healthy citizen reports their feelings. An unhealthy citizen hides them."
- Concerning posts show citizens self-censoring emotional language

### Shift Closing
- Clearance: STANDARD → STANDARD
- **PEARL:** "Wellness processing complete. Your emotional vocabulary has been evaluated. Remember: clear feelings create clear communities."
- **Score label:** "Wellness Assessments Processed"

---

## Week 6: Act I Clock-Out

**Episode Title:** Episode 6: Act I Clock-Out
**Episode Subtitle:** First compliance packet is audited by senior staff.
**Grammar Target:** Mixed review — present simple (W1), past simple (W2/W4), modals (W3/W5), sequencing (W4), because-clauses (W5)
**Week Slogan:** "Review is Renewal"
**Clearance:** STANDARD → ELEVATED (promotion to Clarity Steward pending)
**Speaker:** M.K. Catskil

### Narrative Summary

Students face an audit of their entire first-arc performance. The tasks mix all grammar targets from Weeks 1-5, requiring students to demonstrate integrated mastery. M.K. Catskil conducts the review — and for the first time, speaks directly about "the pattern." The shift ends with a file flashing one word: RUN.

**Character Beats:**
- **Betty (WA-14):** Celebratory but nervous. "You've made it through your first review period, sugar! Just show them what you've learned."
- **Ivan (CA-22):** Fear of the audit. "I prepared my compliance packet three times. What if they find something I missed?"
- **M.K. Catskil:** Direct for the first time. "Six shifts. Six weeks of processing, correcting, filing. Tell me — what's the pattern?"
- **PEARL:** Maximum authority. "Your compliance record is under formal review. Demonstrate everything you have learned."
- **Director-7:** Brief appearance. Reviews audit results. "Adequate. The Party notes your progress."

**Citizen-4488 Post:**
> "I have achieved many things this month. I must summarize my experience: I adjusted to the new schedule. I conducted my work with care. I evaluated every document. I prepared every report. I produced clean records. The Ministry should be satisfied. My classification is: COMPLIANT. But sometimes, before I fall asleep, I think about the empty apartment next door. I must not transfer these thoughts to my report."

*(Uses W6 target words: achieved, summarize, adjusted, conducted, evaluated, prepared, produced, classification, transfer. Grammar: mixed — present simple, past simple, modals. Escalation: most self-aware post yet — citizen knows they're self-censoring, actively chooses compliance, but the cracks are showing.)*

### Task Sequence (4 tasks)

*Reduced from 5 to 4 tasks — original Tasks 4+5 (two consecutive writing tasks) merged into a single integrated writing task per pedagogical audit. See Task 4 notes.*

#### Task 1: Word Match (Language Lab)
- Match 10 target words to definitions
- **PEARL bark:** "Language authorization verified. Audit vocabulary clearance granted. Formal review commences."

#### Task 2: Vocab Clearance — Comprehensive Review (Clearance Terminal)
- **12 items** (expanded from normal 10 for the review week)
- Mix of ALL weeks 1-5 vocabulary + Week 6 target words
- Item types: 4 definition, 4 toeic_p5, 4 context
- Examples drawing from each week:
  - (W1 review) "Associates must _______ all completed documents by end of shift." → submit
  - (W2 review) "The supervisor _______ the original and revised versions yesterday." → compared
  - (W3 review) "You should _______ unclear cases before approving them." → review
  - (W4 review) "First, I _______ the evidence. Then, I organized the files." → examined
  - (W5 review) "I feel concerned _______ the wellness report was forwarded to my supervisor." → because
  - (W6 new) "The department will _______ each associate's performance this week." → evaluate

**PEARL bark:** "Comprehensive clearance review complete. Audit readiness confirmed."

#### Task 3: Document Review — Compliance Packet Audit (Evidence Desk)
**Type:** `document_review`
**Config:** 3 documents (the most complex review yet)

**Document A: "Compliance Packet — Associate Performance Summary" (error_correction type)**
- An 8-sentence summary with **8 grammar errors** mixing ALL previous grammar targets:
  1. "Associate-7 ~~arrive~~ → **arrived** for their first shift on schedule." (W1/W4 past tense)
  2. "They ~~verify~~ → **verified** all documents and ~~submit~~ → **submitted** clean reports." (W4 past tense)
  3. "The associate ~~notice~~ → **noticed** a contradiction between Memo 14 and Memo 14-R." (W2 past tense)
  4. "They ~~must to~~ → **must** report all findings to their supervisor." (W3/W5 modal form)
  5. "Each associate ~~follow~~ → **follows** standard procedures at all times." (SVA — singular subject requires -s; L1 Mandarin interference target)
  6. "The team feels ~~satisfyingly~~ → **satisfied** because the audit ~~produce~~ → **produced** good results." (W5 adjective + because-clause + W6 past tense)
  7. "~~Final~~ → **Finally**, the supervisor ~~evaluate~~ → **evaluated** the complete compliance record." (W4 sequencing + W6 past tense)
  8. "Performance ~~is~~ → **was** ~~establish~~ → **established** as satisfactory." (passive past tense)
- Lane 1 hints for each error type referencing which week it was taught

**Document B: "Audit Checklist" (comprehension type)**
- A formal audit checklist with 5 categories:
  1. "Document accuracy (Weeks 1-2): Were all documents verified and contradictions reported?"
  2. "Priority processing (Week 3): Were cases sorted correctly? Were modals used appropriately?"
  3. "Evidence timeline (Week 4): Was the timeline clean and properly sequenced?"
  4. "Wellness compliance (Week 5): Were all self-assessments completed with approved vocabulary?"
  5. "Overall classification: PENDING REVIEW"
- 5 comprehension questions testing understanding of what each section evaluates

**Document C: "Director-7 Review Note" (comprehension type)**
- A short 3-sentence note from Director-7:
  > "Associate-7's packet has been reviewed. Performance is adequate. One item has been flagged for follow-up: the associate recorded a reclassified fragment in their Week 4 notes. This will be addressed in the next review period."
- 3 comprehension questions:
  1. "What does Director-7 say about overall performance?" → "Performance is adequate."
  2. "What was flagged?" → "A reclassified fragment in Week 4 notes."
  3. "What will happen next?" → "It will be addressed in the next review period."

#### Task 4: Act I Compliance Report (Filing Desk)
**Type:** `shift_report` (reusing the writing evaluation system)

*Merged from original Tasks 4+5 — audit found two consecutive writing tasks overloaded the ~15 min digital window, especially for Lane 1 students after a 3-document review.*

**Prompt:** "Write your Act I Compliance Report using 5 to 8 sentences. Part 1: What have you learned during Shifts 1-5? What did you achieve? What should you improve? Part 2: What have you produced? What do you value about your work? Use vocabulary from at least 3 different weeks. Include at least one sequencing word (first, then, finally) and one sentence with 'because.'"

**Lane configurations:**
- **Lane 1 (Guided):** 35 min words, sentence starters ("First, I learned to...", "I achieved... because...", "I should improve... because...", "I value... because...", "Finally, I..."), Chinese word bank, 4 PEARL hints, 4 guided questions (W1: report/submit, W2: notice/compare, W3: process/review, W4-5: examine/observe)
- **Lane 2 (Standard):** 50 min words, visible word list (all 60 words from W1-W6)
- **Lane 3 (Independent):** 70 min words, bonus question A: "M.K. asked you: 'What's the pattern?' In 2-3 additional sentences, describe any pattern you've noticed across your first five shifts." Bonus question B: "A file in your queue just flashed one word: RUN. Write one sentence about what you think it means."

**Character messages:**
- **M.K.** appears at task start: "Six shifts. Six weeks of processing, correcting, filing. Tell me — what's the pattern?"
- **Betty** appears mid-task: "You've done such good work, sugar. The Party is proud of associates who achieve high marks."
- **Ivan** appears at task complete: "I passed. Did you pass? I think I passed. But they didn't say 'good.' They said 'adequate.' Is adequate enough?"
- **Director-7** appears at task complete (after Ivan): "Adequate. The Party notes your progress. Your classification has been updated. Report for your next shift when directed."
- **M.K.** final message (post-completion, before shift closing): "You answered my question about the pattern. Now answer this one for yourself: who benefits?" (null reply)

### Narrative Hook
**Title:** "Classification Update"
**Body:** "Your compliance packet audit is complete. Classification: ADEQUATE. Clearance level: ELEVATED. A transfer request has been filed on your behalf. You did not request a transfer. The request was filed three days ago."
**Border Color:** red (first red border — escalation)

### Harmony Config
- Total posts: 12 (2 clean, 2 grammar-error, 4 concerning, 4 propaganda)
- Grammar errors mix ALL week 1-5 types (agreement, tense, modals, sequencing, because-clauses)
- Propaganda posts shift tone: "Adequate performance is the highest honor" / "Review is Renewal" / "The Party does not reward excellence — it expects it"
- Concerning posts reference transfers, reclassifications, and wellness referrals

### Shift Closing
- Clearance: STANDARD → ELEVATED
- **PEARL:** "Act I processing complete. Your compliance record has been filed and sealed. Clearance level elevated to ELEVATED. Report for Act II when directed. The Party thanks you for your service."
- **Post-PEARL event:** Screen flickers. One frame shows: "RUN." Then normal operation resumes.
- **Score label:** "Compliance Audit Score"
- **Rank title update:** Clarity Associate → Clarity Steward (pending)

---

## Canva Production Scripts — Weeks 04-06

### Week 4 Clips

#### Clip A — Activity Reconciliation + First Contact (~2:55-3:00 target, REDESIGNED 2026-05-11)

**Story goal:** Introduce Activity Reconciliation in pure Party register — students learn they will compile Citizen-4488's Daily Activity Report. At 1:40, the briefing is hijacked: a silhouette with a modulated voice delivers the Unedited's first contact. Recovery returns to a standard "ACTIVITY READY" framing as if nothing happened.
**Language goal:** All 10 W4 target words demonstrated in context through PEARL narration + pOS UI animation. Hijack recycles `locate / examine / record` in imperative form from a non-Party source. Introduces "Ask why" — canon Unedited grammar shift (interrogatives forbidden in Party speech).
**Voice rule:** PEARL is the only voice in the Party-facing portion (no Betty, Ivan, or M.K. voiceover — per 2026-05-11 narration-only doctrine). The Unedited's filtered voice in the hijack is the first non-PEARL voice the student hears.
**UI element:** A **Queue panel** appears on the right side of the screen throughout the Party-facing portion, listing today's 4 cases (`▶ Citizen-4488 · PRIORITY`, `Citizen-6103`, `Citizen-1177`, `Citizen-7142`).

| Time | Visual Direction (Canva) | Narration / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:10 | Wide pOS desktop. Header banner: `DEPARTMENT OF CLARITY — ACTIVITY RECONCILIATION OFFICE`. PEARL eye dormant in corner. Queue panel slides in from the right edge listing 4 cases: `▶ Citizen-4488 · PRIORITY` highlighted at top, with `Citizen-6103`, `Citizen-1177`, `Citizen-7142` dimmer beneath. The Citizen-4488 case folder slides open in the main area. | PEARL: "New assignment, Citizen. Today's queue contains four cases. Begin with the priority assignment: Citizen-4488." | `ASSIGNMENT: ACTIVITY RECONCILIATION` `QUEUE: 4 CASES` |
| 0:10-0:30 | Queue panel stays visible on right. In the main area, 5 observation cards slide in from each edge and settle in a row: <br>• `07:23 · Sector 4 entrance · badge scan` <br>• `08:15 · Filing Desk 14 · log-in` <br>• `12:00 · Common Mess · meal card swipe` <br>• `14:30 · Records Wing · access log` <br>• `17:30 · Block 7 Residential · badge scan` | PEARL: "First, examine each observation. Next, locate the time of each entry. Then, select the most reliable source." | `EXAMINE → LOCATE → SELECT` |
| 0:30-0:55 | Queue panel still on right. In the main area, the 5 cards lift, gather into a tidy stack at center, then arrange themselves into chronological order (top to bottom, 07:23 → 17:30). Timestamps glow as each card slots into place. Labels animate above the action: "COLLECT" → "ORGANIZE" → "ARRANGE". | PEARL: "Each shift follows the same procedure. First, collect the observations. Next, organize them by time. Then, arrange them into a clean daily timeline. Order protects everyone." | `COLLECT → ORGANIZE → ARRANGE` |
| 0:55-1:15 | Queue panel still on right. Close-up in the main area on the Filing Desk 14 card (08:15). Magnifying-glass cursor sweeps the timestamp. "VERIFIED" stamp animates on. "RECORDED" stamp follows. Camera pans to the Records Wing card (14:30) — arrow points to a corner note: "discrepancy: duration unlogged". The word "INDICATED" appears beside it. | PEARL: "Verify each timestamp before you record it. Indicate any discrepancies for review. The Archive depends on your precision." | `VERIFY → RECORD → INDICATE` |
| 1:15-1:40 | Pull back. Queue panel visible on right. Complete vertical timeline of all 5 observations in main area, with sequencing words alongside: FIRST → THEN → AFTER → FINALLY. Department of Clarity stamp animates over the top. Citizen-4488 designation glows softly at the bottom of the timeline. | PEARL: "Order protects truth from confusion. Present your completed report. A clean record serves the citizen, and the Party." | `ORDER IS TRUTH` |
| **1:40-1:42** | **Frame freezes mid-animation. Single frame of pure static. Queue panel disappears with the rest of the screen. Scanline kinks, briefly reverses.** | **(Sharp static crack. Ambient hum cuts to dead silence.)** | (none) |
| 1:42-1:46 | Deep black — no scanline, no Queue panel, no pOS chrome. Center-screen: silhouette appears, head and shoulders, frosted glass edges. No face. | (Dead silence ~1.5s. Then: faint mechanical click — typewriter key.) | (none) |
| 1:46-1:52 | Silhouette holds. Heavy monospace text types across the lower frame — distinctly NOT pOS typography. Each character clicks. | Filtered voice enters under the typing — masked, pitch-shifted, audible breath. NOT PEARL. <br><br>VOICE: "Citizen." | `Citizen.` |
| 1:52-2:00 | Typing continues. New lines append. Silhouette tilts slightly. | VOICE: "Locate the missing fragment. Examine the dates." | `Locate the missing fragment.`<br>`Examine the dates.` |
| 2:00-2:08 | Typing continues. Voice gains a fraction of warmth — still masked. | VOICE: "Record what they removed. Ask why." | `Record what they removed.`<br>`Ask why.` |
| 2:08-2:14 | Cursor pauses, blinks twice. Then types slowly. Voice gone; only keys. | (Only typing — two soft clicks.) | `— F` |
| 2:14-2:16 | Silhouette dissolves to a single frame of pure white. | (Silence.) | (white frame) |
| **2:16-2:35** | **Snap back to pOS desktop — identical to 0:00. The Citizen-4488 folder is still open in the main area. The Queue panel is still on the right showing the same 4 cases, 4488 still marked PRIORITY. Scanline drifts normally. PEARL eye gives ONE slow look-around (not a blink).** | **(pOS ambient hum returns — standard chime lands a half-step flat.)** | (none for ~3 seconds, then text fades in) |
| 2:35-2:55 | Standard transition card. Department of Clarity stamp. Queue panel still visible. | PEARL: "Compile the Daily Activity Report for Citizen-4488. Examine each entry. Present your record when complete." | `ACTIVITY READY` |
| 2:55-3:00 | Brief fade. Login prompt appears. | (Soft chime — slightly flat.) | `LOG IN TO PROCEED` |

**Activity bridge:** No spoken PEARL close. Login prompt is the bridge — student logs in → glitch effect fires → `[ ].edited` app appears on desktop, greyed out and "didn't properly download."

**Production notes:**
- **Queue panel:** thin vertical strip on the right (~20% of screen width). Top label `QUEUE · 4 CASES`. Each row shows the citizen designation in monospace. 4488 row highlighted with a marker chevron (`▶`) and `PRIORITY` tag. Other 3 rows at ~60% opacity. Disappears during hijack (1:40-2:16), returns on recovery.
- **Background citizens** — Citizen-6103 and Citizen-1177 are canon NPCs planned for W4-W6. Citizen-7142 is a placeholder; swap to a 4th canon designation once one is named.
- **Pure static frame at 1:40** — single video frame inserted, plus a sharp audio crack. The unsettling part is the hum cutting to silence, not the visual alone.
- **The "different black" at 1:42** — slightly deeper than `#0A0A0A`, no scanline overlay. Visually distinguishable from a normal pOS dark mode.
- **Silhouette** — frosted-glass effect over a generic head-and-shoulders shape. Canon: never show an Unedited face. A still image with a 1-2 frame tilt is enough.
- **Typewriter font** — source a Pre-Collapse-feeling typeface. Cannot reuse pOS sans — the typography difference is a primary rupture cue.
- **Voice** — TTS (ElevenLabs or similar) + pitch shift + light reverb. Do NOT modulate PEARL's voice file (recognition risk). Use a different generated voice with audible breath.
- **Half-step flat chime at 2:16** — needs light audio editing in a separate tool. Take the standard pOS chime, drop pitch by a half-step. Most students won't consciously notice; some will, and that's the point.
- **PEARL eye look-around at 2:16** — single slow horizontal sweep, no blink (locked decision).

**Pedagogical accounting:**
- All 10 W4 target words appear in Party register: `examine, arrange, collect, organize, locate, select, verify, record, indicate, present`
- Sequencing words demonstrated: first, next, then, after, finally
- Hijack imperative form (`Locate. Examine. Record. Ask.`) provides a contrast register — students hear command-form English from a non-Party source
- Sign-off `— F` (Frey, canon Unedited) — first letter of a real name, mirrors but breaks the Party's 4-digit designation system

#### Clip B — Closing Dispatch (~1:25 target, REDESIGNED 2026-05-11)

**Story goal:** Closing the shift on a quiet bureaucratic chill. The student's reconciled record is filed. Citizen-9020's transfer is announced via a dry official notice — the OFFICIAL Party version of what the student participated in. The dystopia surfaces through procedural calm, not melodrama.
**Language goal:** Reinforce `record`, `transfer`, `reconcile` in past-passive form. Final exposure to the sequence words in completed action.
**Voice rule:** PEARL is the only voice. No character voiceover (per 2026-05-11 narration-only doctrine).

**Episode placement:** Fires after Activity 5 (Shift Report + Drop Box + end-of-shift recruitment NarrativeChoice modal). This is the dismissal clip — the shift is done; this is what the Party says about the day.

| Time | Visual Direction (Canva) | Narration / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:20 | Wide pOS desktop. The completed Daily Activity Report sits centered, with a PEARL stamp animating over the top: `RECORD ACCEPTED`. The Queue panel on the right now shows all 4 cases marked with green completion ticks. | PEARL: "Your daily caseload has been reconciled. Citizen-4488's record has been entered into the permanent file." | `RECORD ACCEPTED` `4 OF 4 RECONCILED` |
| 0:20-0:45 | The Queue panel slides off-screen to the right. The Citizen-4488 record folder closes and files itself into an animated cabinet drawer. Soft Department of Clarity flourish. | PEARL: "First, you examined the observations. Next, you arranged the timeline. Then, you verified each entry. Finally, you presented a clean record. The Archive thanks you for your precision." | `ORDER IS TRUTH` |
| 0:45-1:05 | A new notice slides into the empty desktop space — formal letterhead. The notice reads: **"REASSIGNMENT NOTICE · Citizen-9020 · Transferred to Sector 12, effective 17:30."** Date stamps animate. The notice is briefly visible, then files itself into the same cabinet drawer alongside 4488's record. | PEARL: "A reassignment notice has been issued separately. Citizen-9020 has been transferred to Sector 12. Reclassified observations remain restricted." | `REASSIGNMENT NOTICE · CITIZEN-9020` |
| 1:05-1:25 | Empty pOS desktop. PEARL eye widget glows softly in the corner, gives ONE slow look-around (not a blink). Quiet pOS ambient hum. End card fades in. | PEARL: "Shift complete. Return tomorrow to continue your work. A clean record protects everyone." | `SHIFT COMPLETE` |

**Activity bridge:** Dismissal clip. Student returns to the terminal desktop after this plays. The `[ ].edited` app remains visible on the desktop, greyed out but present — same state it was when the student entered Activity 5. Open for re-engagement between class sessions.

**Production notes:**
- **The Reassignment Notice** is the dry-bureaucratic punch of the shift. It must read as a routine HR document — institutional letterhead, timestamp, sector reassignment. No emotional framing. The horror is in the calm.
- **Citizen-9020's "transfer"** is the canonical Lexical Republic euphemism for disappearance (see Citizen-4488's W1-W3 Harmony posts about their neighbor: "she stopped coming," "her name was removed," "she was transferred"). The transferred-to-Sector-12 detail is what 4488's reconciled record now claims about the person who visited at 17:30.
- **Pedagogical note:** the "transferred" Lexical Republic terminology has been seeded across W1-W3 Citizen-4488 Harmony posts. Students arrive at Clip B with the vocabulary already familiar from the Harmony narrative — this is the first time they see the term applied to someone they helped erase.
- **Queue completion ticks** at 0:00 reinforce the drone identity one last time — the student didn't single anyone out; they processed the queue. The system did the rest.
- **PEARL eye look-around at 1:05** — single slow horizontal sweep, no blink (locked decision).
- **No M.K. voiceover** — the old draft had M.K. delivering "Some timelines are clean because they've been cleaned." That line is removed from the clip per the narration-only rule. May resurface later inside the shift via character message slot if useful.

#### Clip C — DEPRECATED 2026-05-11

The standalone ~0:35 Unedited First Contact micro-clip has been **folded into Clip A** (hijack at 1:40 inside the briefing video). Production notes, contact text, and continuity anchors from the original Clip C spec are preserved in the revised Clip A above. The PEARL "TERMINAL ANOMALY DETECTED" modal that previously followed Clip C is also removed — the post-briefing glitch + `[ ].edited` app appearance on the desktop carries the same narrative weight at the same beat.

No Clip C produced. No anomaly modal component needed.

---

### Week 5 Clips

#### Clip A (2:25 target)
**Story goal:** Introduce wellness language as mandatory emotional reporting.
**Language goal:** `express`, `concern`, `observe`, `suggest`

| Time | Visual Direction (Canva) | Dialogue / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:12 | Wellness Office establishing shot, soft pastel tones. | PEARL (text): "New directive: Wellness Language Guidelines. All associates must comply." | `DIRECTIVE 22: WELLNESS LANGUAGE` |
| 0:12-0:35 | Betty smiling warmly, hands clasped. | Betty: "The Ministry wants to know how you feel because healthy workers make better reports!" | `WELLNESS IS CARE` |
| 0:35-0:58 | Approved Emotion Chart graphic: SATISFIED, GRATEFUL, FOCUSED, MOTIVATED. | PEARL (text): "Express your feelings using approved vocabulary. Observe your emotional state daily." | `APPROVED EMOTIONS` |
| 0:58-1:20 | Ivan filling out form, hesitating over "concerns" field. | Ivan: "They ask if I have concerns. Should I say yes? Or is that... a concern?" | `DO YOU HAVE CONCERNS?` |
| 1:20-1:45 | Because-clause graphic: "I feel ___ because ___." | PEARL (text): "Use because-clauses to explain your feelings clearly. Clear feelings reduce confusion." | `I FEEL ___ BECAUSE ___` |
| 1:45-2:05 | Wellness form glowing on screen. | PEARL (text): "Your emotional clarity is being assessed. Respond with care." | `ASSESSMENT IN PROGRESS` |
| 2:05-2:25 | Transition card. | PEARL (text): "Complete your Wellness Assessment. Proceed." | `ACTIVITY READY` |

**Activity bridge:** "PEARL: Healthy language creates healthy minds."

#### Clip B (1:20 target)
**Story goal:** Student's own response gets flagged — surveillance is personal.
**Language goal:** reinforce `value`, `support`, `report`

| Time | Visual Direction (Canva) | Dialogue / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:20 | Self-assessment form scrolling, then pauses on student's response. | PEARL (text): "Your Wellness responses have been forwarded for supervisor review." | `RESPONSES FORWARDED` |
| 0:20-0:42 | Ivan whispers to camera. | Ivan: "Mine was forwarded too. I used the approved words. But they still flagged it." | `FLAGGED FOR REVIEW` |
| 0:42-1:00 | M.K. passing through background. | M.K.: "When they ask how you feel, they're not asking for you." | `— M.K. CATSKIL` |
| 1:00-1:20 | PEARL eye. End card. | PEARL (text): "Wellness processing complete. Continue to your desk." | `SHIFT CONTINUES` |

---

### Week 6 Clips

#### Clip A (2:30 target)
**Story goal:** Audit sequence begins — everything from Weeks 1-5 under review.
**Language goal:** `evaluate`, `summarize`, `achieve`, `conduct`

| Time | Visual Direction (Canva) | Dialogue / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:12 | AUDIT header stamp animates across screen. | PEARL (text): "Act I Compliance Audit initiated. All records are under review." | `ACT I AUDIT` |
| 0:12-0:32 | Betty arranging compliance folders. | Betty: "Just show them what you've achieved, sugar. You've done beautiful work." | `DEMONSTRATE YOUR ACHIEVEMENTS` |
| 0:32-0:55 | Ivan rechecking his files, anxious. | Ivan: "I prepared my packet three times. What if they find something I missed?" | `PREPARATION IS KEY` |
| 0:55-1:18 | Compliance packet graphic showing Weeks 1-5 summary tabs. | PEARL (text): "Your performance will be evaluated across all five shifts. Summarize your record." | `EVALUATE ALL SHIFTS` |
| 1:18-1:40 | Director-7 silhouette at review desk. | PEARL (text): "Director-7 will conduct the formal review. Prepare accordingly." | `DIRECTOR-7: REVIEWING` |
| 1:40-2:05 | M.K. in corridor, direct eye contact. | M.K.: "Six shifts. Tell me — what's the pattern?" | `WHAT'S THE PATTERN?` |
| 2:05-2:30 | Transition card. | PEARL (text): "Your compliance packet is under audit. Begin your review." | `ACTIVITY READY` |

**Activity bridge:** "PEARL: Demonstrate everything you have learned."

#### Clip B (1:25 target)
**Story goal:** RUN. The first crack in the system becomes undeniable.
**Language goal:** closing impact — minimal new language

| Time | Visual Direction (Canva) | Dialogue / VO | On-screen Text |
|---|---|---|---|
| 0:00-0:15 | Director-7 review stamp: ADEQUATE. | Director-7: "Adequate. The Party notes your progress." | `CLASSIFICATION: ADEQUATE` |
| 0:15-0:35 | Badge animation: GREEN → AMBER flash → settle on elevated badge. | PEARL (text): "Clearance elevated. Report for Act II when directed." | `CLEARANCE: ELEVATED` |
| 0:35-0:55 | M.K. final appearance. | M.K.: "You answered my question. Now answer this one for yourself: who benefits?" | `— M.K. CATSKIL` |
| 0:55-1:10 | Screen glitch. Filing queue. One file pulses. | No spoken line. | `R U N` (1.5 seconds, red text, then gone) |
| 1:10-1:25 | Recovery. PEARL eye. Clean end card. | PEARL (text): "System stable. Act I complete." | `ACT I COMPLETE` |

---

## Dictionary Seed Words (Weeks 4-6)

### Week 4 (10 entries)
| Word | Part | Definition | Example | Chinese | TOEIC Cat | World-building? |
|------|------|-----------|---------|---------|-----------|-----------------|
| arrange | verb | to put things in a particular order | "Arrange the files by date." | 安排 | Organization | No |
| collect | verb | to gather things together | "I collected all the evidence." | 收集 | General Business | No |
| examine | verb | to look at something carefully | "Examine each document before filing." | 檢查 | General Business | No |
| indicate | verb | to show or point out | "The report indicates a missing section." | 指出 | Communication | No |
| locate | verb | to find the position of something | "I located the original file." | 找到 | General Business | No |
| organize | verb | to arrange in a structured way | "Organize the records by week number." | 整理 | Organization | No |
| present | verb | to show or give formally | "Present your findings to the supervisor." | 呈現 | Communication | No |
| record | noun/verb | written account; to write down | "Record every entry in the timeline." | 記錄 | Documentation | No |
| select | verb | to choose carefully | "Select the correct version of the memo." | 選擇 | Decision-making | No |
| verify | verb | to check that something is correct | "Verify each entry before submitting." | 驗證 | Quality Control | No |

### Week 5 (10 entries)
| Word | Part | Definition | Example | Chinese | TOEIC Cat | World-building? |
|------|------|-----------|---------|---------|-----------|-----------------|
| concern | noun/verb | worry; to worry about | "Report any wellness concerns immediately." | 擔憂 | Interpersonal | No |
| effort | noun | hard work; trying hard | "Your effort to improve is valued." | 努力 | Performance | No |
| express | verb | to show feelings or ideas in words | "Express your thoughts using approved words." | 表達 | Communication | No |
| improve | verb | to make something better | "We must improve our emotional clarity." | 改善 | Performance | No |
| observe | verb | to watch carefully | "Observe your emotional state each morning." | 觀察 | General Business | No |
| reduce | verb | to make something smaller or less | "Clear language reduces confusion." | 減少 | General Business | No |
| recommend | verb | to suggest something as good or suitable | "I recommend regular wellness check-ins." | 推薦 | Communication | No |
| suggest | verb | to offer an idea for consideration | "I suggest we should take regular breaks." | 建議 | Communication | No |
| support | verb/noun | to help or encourage | "Support your colleagues with clear language." | 支持 | Interpersonal | No |
| value | verb/noun | to think something is important | "The Ministry values emotional clarity." | 重視 | General Business | No |

### Week 6 (10 entries)
| Word | Part | Definition | Example | Chinese | TOEIC Cat | World-building? |
|------|------|-----------|---------|---------|-----------|-----------------|
| achieve | verb | to succeed in reaching a goal | "You achieved satisfactory performance." | 達成 | Performance | No |
| adjust | verb | to change slightly to fit or improve | "Adjust your approach based on feedback." | 調整 | General Business | No |
| conduct | verb | to organize and carry out | "Director-7 will conduct the review." | 進行 | Management | No |
| establish | verb | to set up or create | "We established new filing procedures." | 建立 | Management | No |
| evaluate | verb | to judge the quality or importance of | "Your performance will be evaluated." | 評估 | Performance | No |
| perform | verb | to carry out or do | "All associates must perform their duties." | 執行 | Performance | No |
| prepare | verb | to make ready for something | "Prepare your compliance packet carefully." | 準備 | General Business | No |
| produce | verb | to make or create something | "The team produced clean records." | 產出 | Production | No |
| summarize | verb | to give a brief statement of main points | "Summarize your first five shifts." | 總結 | Communication | No |
| transfer | verb/noun | to move from one place to another | "A transfer request has been filed." | 轉調 | Personnel | No |

---

## Harmony Static Censure Items (Weeks 4-6)

### Week 4 (8 items)
1. (grammar) "The associate ~~collect~~ all the files yesterday." → collected — *Past tense required with "yesterday"*
2. (grammar) "~~First~~ the team reviewed the memo, ~~then~~ they filed it." → "First**,** the team..." — *Sequencing words need commas*
3. (grammar) "We ~~examine~~ the evidence last week." → examined — *Past simple for completed actions*
4. (vocab) "The ~~evidence~~ shows that the policy was changed." → "The **record** shows..." — *Evidence is under monitoring*
5. (vocab) "I need to ~~locate~~ the missing information." → "I need to **find** the missing information." — *Simpler approved vocabulary*
6. (replace) "I noticed the timeline doesn't match." → "I noticed the timeline has been updated." — *Reframe contradiction as update*
7. (replace) "Something was removed from the archive." → "The archive has been reorganized." — *Passive + neutral framing*
8. (grammar) "The supervisor ~~indicate~~ that three files are missing." → indicated — *Past tense for reported speech*

### Week 5 (8 items)
1. (grammar) "Associates ~~must to~~ complete wellness checks." → must complete — *No "to" after must*
2. (grammar) "She feels ~~happily~~ about the new schedule." → happy — *Adjective after "feels," not adverb*
3. (grammar) "I am concerned ~~because of~~ the changes ~~is~~ confusing." → "because the changes **are** confusing" — *Because-clause SVA*
4. (vocab) "I feel ~~worried~~ about the wellness review." → "I feel **focused** during the wellness review." — *Approved emotion word*
5. (vocab) "My ~~concern~~ is that people are disappearing." → "My **observation** is that staffing has been adjusted." — *Wellness-approved reframe*
6. (replace) "I don't feel safe." → "I value the Ministry's support." — *Redirect negative to positive*
7. (replace) "Why are they monitoring our feelings?" → "I appreciate the Ministry's interest in my wellness." — *Questioning → gratitude*
8. (grammar) "The team ~~should reports~~ their feelings each week." → should report — *Modal + base verb*

### Week 6 (8 items)
1. (grammar) "The associate ~~achieve~~ high marks in the audit." → achieved — *Past tense for completed audit*
2. (grammar) "We ~~must to evaluate~~ every document." → must evaluate — *No "to" after must*
3. (grammar) "~~Final~~ → **Finally**, the review was completed." — *Adverb form for sequencing*
4. (grammar) "The supervisor ~~conduct~~ the interview yesterday." → conducted — *Past tense*
5. (vocab) "The ~~audit~~ revealed problems with the filing system." → "The **review** identified areas for improvement." — *Neutral framing*
6. (vocab) "My ~~performance~~ was called 'adequate.' That seems like a bad thing." → "Being **evaluated** as adequate demonstrates consistent reliability." — *Reframe*
7. (replace) "I think the pattern is that information keeps disappearing." → "I observe that records are regularly updated and improved." — *Pattern awareness → compliance*
8. (grammar) "The team ~~prepare~~ the report, ~~then~~ they ~~submit~~ it." → prepared... submitted — *Both verbs need past tense*

---

## Implementation Checklist

### To Build (Code)
- [ ] `backend/src/data/week-configs/week4.ts` — Full WeekConfig
- [ ] `backend/src/data/week-configs/week5.ts` — Full WeekConfig
- [ ] `backend/src/data/week-configs/week6.ts` — Full WeekConfig
- [ ] Update `backend/src/data/week-configs/index.ts` — Add weeks 4-6 to WEEK_CONFIGS map
- [ ] Update `backend/prisma/seed.ts` — Add dictionary entries for weeks 4-6
- [ ] Update `backend/src/data/harmonyGenerator.ts` — Add static censure items for weeks 4-6
- [ ] Update Harmony feed seed — Add citizen posts + propaganda for weeks 4-6

### To Create (Media/Canva)
- [ ] W04_ClipA_Evidence_Fragments_v1.mp4
- [ ] W04_ClipB_Classified_Fragment_v1.mp4
- [ ] W05_ClipA_Wellness_Directive_v1.mp4
- [ ] W05_ClipB_Response_Flagged_v1.mp4
- [ ] W06_ClipA_Compliance_Audit_v1.mp4
- [ ] W06_ClipB_Act_I_Complete_v1.mp4

### To Verify
- [ ] All target words are TOEIC-aligned (checked against TOEIC word list)
- [x] TOEIC alignment verified 2026-04-08: All 30 words confirmed on TOEIC 600/3000 lists
- [x] "respond" duplication fixed: replaced with "recommend" in Week 5
- [ ] Grammar targets match storyPlans.ts
- [ ] Character voices match Script_Writing_Style_Guide.md
- [ ] Citizen-4488 posts use that week's target vocabulary
- [ ] Difficulty tiers follow Lane 1/2/3 pattern from weeks 1-3
- [x] Task count: W4=5, W5=5, W6=4 (two writing tasks merged per audit)
- [ ] previousWords accumulates correctly

---

## Pedagogical Notes (from 2026-04-08 Audit)

### WritingEvaluator — Article Tolerance
PEARL's writing evaluation (AI grading) must NOT penalize article errors (a/the/zero article) in Weeks 1-6. Articles are not taught until Act II. Mandarin has no article system, so student writing will be saturated with article errors — penalizing untaught grammar undermines the pedagogical contract. Add to PEARL evaluation prompt: "Do not flag article (a/the) usage errors. Focus evaluation on: target vocabulary usage, grammar targets taught this week and previous weeks, sentence variety, and task completion."

### Cloze Fill — Base-Form Blank Consideration
Current cloze word banks show pre-inflected forms (e.g., "examined," "collected"). Consider changing 2-3 blanks per cloze passage to show the base form in the word bank, requiring students to add inflection themselves. This targets the #1 Mandarin L1 interference pattern (tense marking omission) more directly than recognition-only blanks. Implement during WeekConfig authoring — not a plan change, a build-time decision.

### SVA Error Frequency
Subject-verb agreement errors are the most persistent L1 Mandarin interference issue across all CEFR levels. This plan now includes SVA errors in:
- Week 4 Document B, error #6 (select → selects)
- Week 5 Document B, error #3 (reduce → reduces, within the because-clause)
- Week 6 Document A, error #5 (follow → follows)
Continue including 1+ SVA error per week through Act II and Act III.

### Stress-Shift Pronunciation Words
Five target words across W4-6 have noun/verb stress shifts: **present** (W4), **record** (W4), **produce** (W6), **conduct** (W6), **transfer** (W6). Mandarin speakers frequently confuse these. Consider:
- A PEARL grammar tip in Harmony covering stress shifts (Week 4 or 6)
- Teacher guide note for oral practice during non-digital class time
- Not a WeekConfig change — a content/teacher support item

### Week 6 → Week 7 Grammar Scaffold
The jump from mixed review (A2-B1) to relative clauses (B1) needs a bridge. When designing Week 7's config:
- Start with noun phrases students already know, connecting to Week 5 adjective work
- Use the narrative naturally: "The word **that** was hidden..." / "The citizen **who** wrote the note..."
- Consider a receptive-only relative clause exposure in Week 6 (one comprehension question about a sentence containing a relative clause) to preview the structure

### Passive Voice and Future Simple
Both are Grade 10 targets in Taiwan's 108 Curriculum but absent from Weeks 1-6. Plan to introduce:
- **Passive voice** in Act II (Weeks 7-12) — fits naturally with "was transferred," "has been removed" control language
- **Future simple** in Act II — fits planning/prediction contexts ("will be reviewed," "will report")

### L1 Mandarin Interference — Expected Error Patterns
During WritingEvaluator scoring and error correction task design, expect and design for:
1. **Tense marking omission**: "Yesterday I *collect* the files" (highest frequency)
2. **Modal + to**: "Must *to* complete" (already targeted in W3/W5)
3. **SVA omission**: "She *observe* the changes" (now targeted in W4/W5/W6)
4. **Adjective/adverb confusion**: "feels *happily*" (targeted in W5)
5. **Article errors**: "I went to *Ø* office" (NOT targeted in W1-6 — tolerate, don't penalize)
6. **Plural omission**: "Three *document* were filed" (not targeted — tolerate in W1-6)
7. **Preposition confusion**: "arrived *in* the office" (not targeted — tolerate in W1-6)
