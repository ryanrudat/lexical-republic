# Narrative & Pedagogy Review — The Lexical Republic

**Date:** 2026-04-17
**Scope:** Shift scripts (W1-W3 live + W4-W6 planned), Harmony feed content + Citizen-4488 arc, PEARL voice across all surfaces.
**Method:** 3 parallel deep-read agents; findings synthesized below. Source chapters at the end of this document.

---

## Executive Summary

**The Lexical Republic's architecture is sound, but the narrative is drafted, not lived.**

All three reviewers independently reached the same core observation: the game has the right pieces — a textured world bible, structurally coherent NPC arcs, validated vocabulary scaffolding, an in-character AI overseer — but the pieces don't yet *work together* to carry the game's thesis ("grammar IS control") to an A2-B1 teenage reader. Students meeting this material today will experience competent bureaucratic tasks with pleasant character voice. They will not reliably experience the dystopian metaphor you designed.

The balance between storytelling and pedagogy is **tilted toward pedagogy**, but not in the way you'd want. Tasks achieve grammar targets through exposure, but the *story doesn't advance meaningfully week-to-week*, and the most powerful narrative element — Citizen-4488's self-censorship arc — is **invisible to students who don't explicitly hunt for it**. Meanwhile, grammar teaching is implicit where Mandarin-L1 learners need explicit instruction, and Lane 1 scaffolding occasionally breaks character voice into teacher mode.

This is **fixable without rewriting anything**. Most recommendations are 1-3 line text edits or small additions to existing content files. The fix is not a re-draft; it's a revelation. Make explicit what's implicit.

---

## The Core Tension

Three forces are pulling against each other:

1. **Story demand**: a dystopian thesis that requires subtle pattern-recognition over weeks.
2. **Pedagogy demand**: A2-B1 Mandarin-L1 learners who need explicit rules + examples + practice.
3. **Engagement demand**: 15-year-olds who need visible progression, stakes, and agency.

The current design gives (1) the most weight, assumes (2) will arrive through exposure, and underserves (3). Week 2's contradiction-report task is a brilliant counter-example where all three align — the narrative act of comparing memos IS the past/present grammar practice. Most other tasks don't achieve this; they're either story-dressed drills (word_match, cloze_fill) or narrative moments without pedagogical structure (Case 5 disappearance).

---

## What Works (Cross-Cutting Strengths)

1. **Betty + Ivan + M.K. + PEARL form a functional ensemble.** Betty's true-believer warmth never winks at the student. Ivan's arc (anxious → noticing → confused about compliance) models critical thinking without resolving it. M.K.'s restraint ("You're starting to see the pattern") respects the student's processing. PEARL stays procedural. All four maintain voice consistency across 3 weeks of scripts.

2. **Week 2's contradiction_report is the exemplar.** The memo-swap task IS the grammar exercise. Students must notice what past-tense statements got deleted from the present-tense revision. The writing prompt explicitly asks them to use past simple for the original and present simple for the revised version. Story and pedagogy are the same action. This is the template for everything else.

3. **Vocabulary spaced-repetition infrastructure is validated.** The Vitest suite (34 tests) confirms Week 2-3 posts recycle 50%+ of Week 1 words across new narrative contexts. `getHarmonyReviewContext()` correctly segments focus/recent/deep tiers.

4. **World bible texture is richly granular.** Details like "the window table at Cafeteria Block 7 has been empty for two years — no one remembers why" or citizens naming finches after disappeared colleagues do real atmospheric work. The world feels inhabited.

5. **Sector reports show-don't-tell dystopia.** Staffing 214→208→197 across three weeks with processing efficiency rising — a math-literate student realizes dystopia without being told. Citizen-7291 noticing this contradiction in-feed closes the loop.

6. **PEARL chat system genuinely teaches.** The system prompt permits rule explanation but forbids answer-giving. Writing nudges ("What happened when you first arrived?") scaffold without solving. This is the right pedagogy under the right narrative constraint.

7. **Citizen-2104's voice is the strongest character hit.** Her genuine belief that "a confirmed schedule feels beautiful" is the closest the corpus comes to lived internalization of compliance as *virtue*.

---

## Top Issues by Priority

### P0 — Critical (fix before building W4-6, or ship with known narrative holes)

**1. The Citizen-4488 arc is invisible to its target audience.**
The design is correct: W1 grammar error ("arrive" not "arrives") → W2 perfect grammar → W3 internalized compliance language. This is meant to reveal self-censorship through inverse literacy. **But**: A2-B1 Mandarin speakers have no baseline expectation of agreement rules (Chinese has none), so the W1 error is invisible. 4488 posts are one-per-week among 4-5 other voices. The cat thread is personal, not systemic. **Result:** the game's central metaphor fails to reach the student.

**Fix direction:** (a) add a second 4488 post per week, (b) add instructor/PEARL scaffolding on first Harmony visit: "Watch the community posts. One citizen is noticing something others are not. What do you notice?", (c) in the ShiftClosing 4488 card just shipped, highlight the *grammar shift* explicitly: "Citizen-4488's writing last week had an agreement error. This week, it is perfect. What changed?"

**2. No narrative throughline connects W1 → W2 → W3.**
W1 ends with "Two versions of the same memo." W2 opens with an unrelated memo. W3 introduces Case 5, which immediately vanishes. Each week is a self-contained incident. Students process tasks; they don't develop investment in an unfolding story. By Week 3 students have no reason to care about Week 4 beyond "more bureaucracy."

**Fix direction:** Thread Case 5 forward into W4. In W4's evidence_assembly, include a reference to Citizen-7291's missing neighbor (the same neighbor from W3's Case 5). Pay off mystery threads — even with one line — to show the story moves.

**3. Grammar teaching is implicit; A2-B1 Mandarin-L1 learners need explicit.**
PEARL tips (`harmonyPearlTips.ts:19-55`) describe rules but don't *teach* them. Lane 1 error-correction hints ("Look at the subject. Is it singular or plural?") require students to derive the rule themselves. Chinese has no subject-verb agreement or tense morphology, so Mandarin speakers don't have the conceptual hook to latch onto. Errors will calcify into Act II.

**Fix direction:** Reframe PEARL tips as *institutional policy with reason*: "P.E.A.R.L. detected a tense inconsistency. Third-person singular verbs require the '-s' suffix in Clarity documents. Example: The associate checks (not check) the queue. Failure to comply will trigger manual review." Include at least one actionable "spot the error" example per tip. Add a short grammar-rule card at the start of each week that introduces a new grammar target.

**4. Writing prompts treat vocabulary as decoration, not necessity.**
W1 and W3 shift_report prompts say "Use 3 to 5 sentences. Try to use as many of the target words as possible." (`week1.ts:376-377`, `week3.ts:273`). This teaches students that target words are padding, not meaning. Compare to Week 2's prompt, which asks them to *describe differences using past and present simple* — vocabulary choice is load-bearing there.

**Fix direction:** Rewrite W1 and W3 prompts so vocabulary choice carries meaning. Example W1: "Write your shift report. Describe: one action you did (use 'arrive' or 'check'), one rule you learned (use 'follow' or 'standard'), one task you finished (use 'submit' or 'report')."

**5. PEARL's voice breaks into cold-procedural in failure states.**
Coherence check rejections ("Your submission does not meet Ministry language standards. Write complete English sentences.") and eval fallbacks ("Processing complete. Vocabulary compliance: X of Y terms detected.") drop the "forced happy" warmth. Students see kindness when they succeed and bureaucratic rejection when they fail. This breaks the design-locked tone.

**Fix direction:** Rewrite failure messages to preserve warmth + direction. "Your submission shows effort, Citizen. Clarity strengthens with more complete sentences. Review and rebuild."

### P1 — High-impact (do before new content authoring stalls)

**6. The new `/api/pearl-feedback` endpoint is underbaked.**
Shorter system prompt than chat/bark (~230 chars vs 1200+), no explicit voice rules (no-contractions, institution-as-speaker, passive voice), cold fallback lines ("Your contribution to compliance has been catalogued."). This endpoint is supposed to be the "in-character reasoning observation" layer — if it sounds like a different PEARL, it undermines what it set out to do.

**Fix direction:** Expand the system prompt to match chat/bark structure. Warm the canned fallbacks. Add a safety clause for bizarre student inputs.

**7. Bulletin MCQs test spot-the-keyword, not inference.**
W2 asks "What happened to Tuesday sessions?" with options Remove/Moved/Require/Update. The answer is literally in the bulletin text ("Tuesday sessions have been removed"). Students pass by matching keywords. Critical reading — which is the *entire* pedagogical function of reading dystopian propaganda — isn't happening.

**Fix direction:** Add at least one inference-required MCQ per bulletin. Example: "Why do you think the Ministry did not explain why Tuesday sessions were removed?" with plausible-to-sophisticated distractors.

**8. Lane 1 scaffolding breaks character voice into teacher mode.**
Ivan's anxious dialogue sits alongside PEARL's pedagogical hints in the same task. The student is reading fiction and grammar explanation in different voices. Immersion breaks.

**Fix direction:** Move hints into character voices. Ivan can say "Check your subjects first — that's what my supervisor told me." M.K. can ask "Is the subject one person or many?" This keeps voice consistent and makes grammar *dramatic*, not *educational*.

**9. Character posts prioritize word-inclusion over authentic voice.**
Citizen-0007's W1 post ("I should complete my review of the priority queue before the schedule changes at 15:00, but I can't identify which cases to process first") is grammatically correct but sounds constructed around `complete` and `identify` rather than around 0007's anxiety. Per locked design: "Write about PEOPLE, not vocabulary." Some posts don't live up to this.

**Fix direction:** Audit each character's W1-W3 posts. If a sentence sounds like it was built around a target word rather than around the character's emotional state, rewrite it.

**10. Wellness Division plot thread is introduced in W3 and dropped.**
Ivan reveals in W3 that a former colleague transferred to Wellness Division and hasn't returned. W5 then introduces "Wellness Language Guidelines" as if it's a new topic, with no connection to the ominous institution. These should collide: W5's Wellness being taught should feel *sinister* because of W3's revelation.

**Fix direction:** In W4's evidence_assembly, include a fragment referencing a Wellness Division transfer of a disappeared associate. In W5, when Wellness Language is introduced, have Ivan say one line: "Wait — Wellness Language? Like the Wellness Division? Do we have to give them... our feelings too?"

**11. Background characters blur together.**
Citizen-5502, 0009, 0031, 0022, 3319 all speak in similar registers — introspective, observant, slightly anxious. They're drawn from the same template.

**Fix direction:** Give each background citizen one distinctive verbal tic (5502 writes like a letter, 0031 uses textile metaphors, 3319 uses precise metrics). This is a small edit per character but transforms the cast.

**12. "Forced happy" tone is underexecuted in bulletins.**
Current Ministry bulletins are dry and neutral. True "forced happy" dystopia sounds cheerful about things that should alarm you: "SCHEDULE OPTIMIZATION — Excellent news! Tuesday sessions have concluded their service mission. All associates are encouraged to redirect this freed time into additional productivity goals! Isn't it wonderful to have more time for important work?"

**Fix direction:** Rewrite 2-3 W1-3 bulletins in affect-flattened cheerful tone. Keep the meta structure (form numbers, directives), but add the tonal layer.

### P2 — Polish (deferrable)

- PEARL session-start/end announcements (ambient presence).
- Escalate PEARL barks on repeated failures (concern pool after 3rd miss on same task).
- Regulations Reference card (clickable glossary of Form 77-B / Directive 2031.4 / etc.).
- Vocabulary Bridge card at week start (showing cumulative load + word connections).
- Glossary pass on Harmony feed (define "log," "staffing," "forwarded," etc. on first use).
- Citizen-4401 introduced in W5-6 to establish alliance before Act II.
- Food preferences assigned to each core citizen (adds domestic texture).
- Post-task PEARL annotation on vocab review in Dictionary app.
- Teacher rubric for "forced happy dystopia" tone, for future script writers.
- Document PEARL style guide (`docs/pearl-voice-guide.md`) — currently consistency is emergent.

---

## Citizen-4488 Arc: Standalone Verdict

The 4488 arc is the **most important narrative element** in the game. It's also the **most underserved**.

**What's right:** The three W1-W3 posts (now mirrored in `frontend/src/data/citizen4488Posts.ts` for the ShiftClosing card) follow the designed grammar arc: W1 deliberate error → W2 improved grammar → W3 internalized compliance. The cat thread provides emotional through-line. The arc is thematically correct.

**What's wrong:**
- The W1 grammar error ("arrive" not "arrives") is invisible to A2-B1 Mandarin speakers without a baseline expectation of agreement rules.
- Students get one 4488 post per week among 4-5 other voices. Easy to miss entirely.
- The cat arc (personal, sweet, lonely) is *orthogonal* to the grammar-censorship arc (systemic). Students track the cat and miss the grammar.
- No setup hook tells students to watch 4488. They have no reason to compare this week's post to last week's.
- If students don't click into the Archive tab, they see the arc only in fragments.

**What to do:**
1. Add a second 4488 post per week (brings weekly count to 2-per-week visibility).
2. In the just-shipped ShiftClosing 4488 card, add a "grammar watch" line: "Last week, Citizen-4488 wrote 'she always arrive.' This week, every verb is correct. What changed?" Make the pattern visible.
3. On first Harmony visit of the term, PEARL says: "New citizens often notice patterns in community posts. Some citizens write more carefully than others. Pay attention to who."
4. In W4 or W5, show 4488 *in the act of self-censoring*: a draft with a crossed-out phrase, replaced with a compliant one. Visualize the surrender.

---

## W4-W6 Forward-Look — Fix Before Building

Before the Weeks 4-6 WeekConfig files are written, these gaps in the plan should be addressed:

1. **Evidence Assembly task type doesn't exist in code.** W4 Plan Task 2 calls for it; current fallback is document_review. Decide: build the new task type, or rewrite the W4 plan to use existing types and defer Evidence Assembly to Act II.

2. **W6's merged writing task is cognitively overloaded** for Lane 1. Part 1 + Part 2 + one sequencing word + one because-clause + metacognitive reflection on 5 weeks = too many simultaneous demands. Split back to 5 tasks, keeping the final task narrower.

3. **W5 introduces because-clauses without teaching them.** Because-clauses are not intuitive for Mandarin speakers (who use 因為...所以... or omit connectors). Add a PEARL tip + Ivan-modeled example before the W5 error_correction task.

4. **W6 cumulative review doesn't force W1-3 vocabulary production.** Current spec: "vocabulary from at least 3 different weeks." A student can pass using only W4/5/6 words, failing to retain W1-3. Require one word from each of W1, W2, W3 specifically.

5. **The "RUN" flash at end of W6 has high narrative impact but zero pedagogical integration.** Consider adding a PEARL bark immediately after: "System instability detected. This file will be quarantined. Continue to your next assignment." Frames the glitch as *dangerous* and sets up Act II.

6. **Wellness Division / Wellness Language thread** (see Issue #10). Must connect W3's ominous institution to W5's pedagogical content.

---

## Recommended Action Path

### Immediate (1-2 days, ~300-500 lines of text edits, no code)
- Add second Citizen-4488 post per week (W1-W3) — item #1
- Rewrite W1 + W3 shift_report prompts — item #4
- Warm up PEARL failure-state messages — item #5
- Add Harmony intro prompt pointing at 4488 — item #1

### Short-term (3-5 days, mostly content, small code)
- Reframe PEARL grammar tips as institutional policy + examples — item #3
- Add inference MCQs to W1-W3 bulletins — item #7
- Move Lane 1 hints into character voices — item #8
- Audit character posts for voice vs. word-vehicle — item #9
- Strengthen /api/pearl-feedback prompt + fallbacks — item #6
- Rewrite 2-3 bulletins in "forced happy" tone — item #12
- Thread Wellness Division from W3 into W4-5 plan — item #10

### Before building W4-6 WeekConfig
- Resolve Evidence Assembly task type question.
- Split W6 back to 5 tasks.
- Add because-clause teaching to W5.
- Require W1-3 vocabulary in W6 cumulative review.
- Add PEARL bark after "RUN" flash.

### Deferrable (when content dust settles)
- All P2 polish items.
- Document PEARL style guide.
- Background character verbal-tic pass.

---

## One-Line Summary

> **The game is 80% of the way to being transformative. The remaining 20% is making implicit things visible — to students who have no reason yet to look closely.**

---

---

# Appendix A — Shift Scripts Review (source)

Full review: Betty/Ivan/M.K. voices work; Week 2's contradiction_report is exemplary; Weeks 1/3 shift_report prompts are vocabulary-decoration; grammar is implicit at a level that needs explicit (Mandarin-L1 + A2-B1); Lane 1 hints break character; no narrative throughline W1→W2→W3; Case 5 / Wellness Division dropped; W4-6 plan has cognitive-overload risks in W6.

Top callouts (file:line):
- `week1.ts:376-377` — generic shift_report prompt
- `week1.ts:312-321` — Lane 1 hints in English-teacher voice
- `week2.ts:269-401` — contradiction_report exemplar; the story IS the grammar
- `week2.ts:525-529` — Citizen-4488 W2 internalized compliance
- `week3.ts:241-248` — Case 5 appears and vanishes mid-task
- `week3.ts:273` — W3 shift_report prompt copy-pasted from W1
- `week3.ts:328-357` — Ivan reveals Wellness Division mystery (dropped)
- `Dplan/Weeks_04_06_Shift_Plan.md` — W6 merged writing task, cognitive overload

---

# Appendix B — Harmony Content Review (source)

Full review: world bible richly textured and consistent; NPC arc structure sound; Citizen-2104 voice excellent; sector reports show-don't-tell dystopia; spaced-repetition validated. But: posts prioritize word-inclusion over character voice; bulletin MCQs are keyword-match not inference; PEARL grammar tips are style notes not teaching; background citizens blur; Wellness Pavilion described but never present; locations don't become characters; forced-happy tone underexecuted in bulletins.

Top callouts (file:line):
- `harmonyFeed.ts` — Citizen-2104 voice exemplar ("I find it beautiful")
- `harmonyFeed.ts` — Citizen-0007 W1 post reads as vocabulary-constructed
- `harmonyBulletins.ts` — W2 Tuesday-sessions MCQ is spot-the-keyword
- `harmonyPearlTips.ts:19-55` — tips describe rules, don't teach
- `harmonyCharacters.ts` — `condensedArcPhases` defined but no seed posts for condensed route
- `harmonyWorldBible.ts` — locations (Wellness Pavilion, Archive) exist but never appear in posts
- `frontend/src/data/citizen4488Posts.ts` — newly shipped; 3 posts but visibility limited to ShiftClosing card

---

# Appendix C — PEARL Voice Review (source)

Full review: system prompts and bark pools are voice-locked and consistent; chat-system deflections work; grammar tips stay in-world. But: eval failure-state messages drift cold; `/api/pearl-feedback` endpoint has weaker prompt than chat/bark; rate-limit messages block without redirecting; no PEARL at session boundaries; no escalation on repeated failures; grammar tips teach passively; coherence-check failures read punitive not supportive.

Top callouts (file:line):
- `pearl.ts:83-101, 181-229` — locked voice rules, well-structured
- `pearl.ts:34-72` — bark pool exemplar ("The Party notices")
- `pearl.ts:309-315` — in-character deflection when students ask for answers
- `pearl.ts:449-458` — rate-limit messages in-world but missed redirection opportunity
- `pearl-feedback.ts:12-31` — new endpoint prompt underbaked (shorter than chat)
- `pearl-feedback.ts:37-45` — canned fallbacks; 3rd is cold ("catalogued")
- `submissions.ts:243` — offline fallback is sterile metric-only
- `submissions.ts:254-350` — coherence-check feedback punitive ("does not meet Ministry language standards")
- `harmonyPearlTips.ts:19-55` — tips = rule + example but no active practice prompt

---

## How to Use This Document

1. **Read the Executive Summary and Core Tension.** Decide if the diagnosis matches your intent.
2. **Walk through P0 items.** These are the ones that break the design promise if unfixed.
3. **For each P0 you agree with, decide: edit now, or schedule.** Most are text edits, not code changes.
4. **Don't build W4-6 WeekConfig until the Forward-Look issues are resolved.** The plan document can be edited without touching shipped code.
5. **P1 items: batch them.** Most are content audits across existing files — good candidate for a future /batch once you've decided priorities.
6. **P2 items: keep on a list.** Revisit after the next 2-3 shifts of content land.

No code has been modified as part of this review. All recommendations are editorial or structural; none block current shipped features.
