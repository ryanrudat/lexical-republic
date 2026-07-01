# The Lexical Republic — Pedagogy Doctrine

Last updated: 2026-04-30 (post-Priority-Sort polish + Clip A script alignment)

This document codifies the pedagogical principles that drive content creation in The Lexical Republic. It describes what the app teaches, how it teaches it, and why specific design decisions were made. New shifts, characters, and features must align with the principles below — anything that deviates is a doctrine deviation and should be flagged in review.

**Audience:** Taiwanese Grade 10 students at A2-B1 CEFR, Mandarin L1, preparing for TOEIC.
**Format:** 18 weekly "Shifts" inside an authoritarian language-control fiction.
**Mode:** Hybrid class — teacher-led briefing video opens, app-based individual work fills the middle, debrief video closes.

---

## 1. Foundational principles

These are the locked commitments. Everything else follows from them.

1. **Story is the syllabus.** The Lexical Republic is committed to Shape 1 — *a story-driven game that teaches English*, not a gamified worksheet (`memory/project_narrative_strategic_tension_2026_04_21.md:8`). Tasks must do double duty: every grammar/vocab beat is also a narrative act. The W2 Contradiction Report — comparing two memos to identify what was deleted — is the exemplar (`Dplan/Narrative_Pedagogy_Review_2026_04_17.md:37`). Tasks that are merely story-dressed drills are deviations.
2. **Vocabulary is TOEIC-first.** `targetWords` in each `WeekConfig` prioritize TOEIC-aligned words; world-building words layer in through narrative context (`CLAUDE.md` Locked Decisions). Week 1 is locked as a narrative-first exception (6 TOEIC + 4 non-TOEIC); every subsequent shift is TOEIC-first.
3. **Tone is "forced happy" dystopian, never intimidating.** Pastels, neon, warm retrofuturism in the office; cyan CRT inside the terminal; cream cards with sky accents in the shift queue. PEARL is kind, welcoming, prominent; Betty's Southern warmth co-exists with PEARL's calm institutional surveillance. Care that masks control is the only register that sustains 18 weeks of engagement.
4. **PEARL is ambient, constant, authoritative — never a chatbot.** The eye never blinks. Instruction arrives as Ministry communication policy, not classroom rules.
5. **Failure must never be a hard block.** Submit Anyway, attempt-3 auto-pass, partial credit floors — frustration is itself a learning blocker for adolescent L2 learners.
6. **Differentiation is data, not branched code.** All three lanes (Guided / Standard / Independent) share one shift cascade; per-task `lane` configs scale supports without forking content.
7. **Story and learning targets live in mission config, not hardcoded UI logic.** Adding a week is data work in `backend/src/data/week-configs/weekN.ts` — no React.
8. **Each shift's centerpiece task must visually mirror its briefing video.** Recurring tasks (Word Match, Cloze Fill, Vocab Clearance) sustain spaced retrieval — they need to *look identical* across shifts to do their job. The single novel task per shift carries the shift's identity and must feel distinctive in UI, animation, and tone, bridging the briefing video's visual language directly into the app surface (W3 Priority Sort cascade with pink/tan/blue folders matches the briefing video frame-for-frame; commit `d2dd9ef`).
9. **Grammar is not scored on open writing.** AI grammar scoring on short A2-B1 L2 text is unstable across attempts and double-tests what Cloze Fill, Error Correction Doc, and Word Sort already test deterministically. Open writing scores on **vocab use only**, gated by a **lenient, escapable on-topic veto** (deterministic grader; one nudge, then Submit Anyway — never a hard lock, since 2026-06-22). Grammar still surfaces as advisory text for teachers, never as score (commit `b3ae4a0`, 2026-04-29 redesign; grading stabilised 2026-06-22 — see §5).

---

## 2. Vocabulary doctrine

### 2.1 Word selection criteria

Each `WeekConfig` exposes a `targetWords: string[]` of exactly ten words that the shift's tasks actively drill (`backend/src/data/week-configs/week1.ts:7-10`, `week2.ts:8-11`, `week3.ts:8-11`). A target word must recur across at least four surfaces — `word_match`, `cloze_fill`, `vocab_clearance`, `priority_briefing`/`shift_report`, and the post-task interstitial — covering recognition, guided production, assessment, and free production (`week3.ts:20-21`).

World-building vocabulary (ministry, citizen, directive, protocol) appears in documents and dialogue but is flagged `isWorldBuilding: true` on `DictionaryWord` and excluded from drill (`backend/prisma/schema.prisma:113-133`, `docs/world-and-story.md:62-66`). This protects bandwidth: only TOEIC-aligned vocabulary occupies the drill budget.

### 2.2 Spaced repetition mechanism

Every `WeekConfig` carries a `previousWords: string[]` cumulative list of every prior shift's target words (`week3.ts:12-17` carries all 20 words from W1+W2). `getHarmonyReviewContext()` segments these into three concentric tiers scoped to the student's narrative route (`backend/src/data/harmonyFeed.ts:29-55`):

- **Focus tier** — current week's `targetWords` (sky accent in UI)
- **Recent tier** — previous 1-2 route-weeks (amber accent)
- **Deep tier** — all older route-weeks (gray accent)

Mastery is differentiated by recency. Censure-queue retrieval adds **+0.05** for current-week items, **+0.03** for review-tier items (`backend/src/routes/harmony.ts:639-654`). `WritingEvaluator` adds **+0.10** per used target word for contextualized production — gated on the on-topic veto since 2026-06-11 (`backend/src/routes/submissions.ts`, vocab-encounter block); passive dictionary views accrue encounters only, never mastery. Clarity Check and Compliance Check both add **+0.03** per correct (`backend/src/routes/clarity-check.ts:73`, `compliance-check.ts:352`). All mastery upserts wrap in `prisma.$transaction` so encounter counts and mastery cannot diverge.

Censure items unanswered or wrong stay surfaced; correct items go dormant for 7 days then re-eligible (`harmony.ts:528-538`).

### 2.3 Verification & retrieval surfaces

Every target word is encountered four or more times within a single shift across distinct verification surfaces, never the same mode twice in a row.

- **Vocab Clearance** — decontextualized definition-recall MCQ delivered as a graded mission task (`week3.ts:122-207`)
- **Cloze Fill** — contextualized within-sentence retrieval with morphological variants forcing form selection (`week3.ts:90-119`)
- **Clarity Check** — screen-locking pop-up MCQ at scheduled `shift_start | shift_end | after_task` placements; one-shot per check id (`frontend/src/components/shift-queue/ClarityCheck.tsx:46-64`)
- **Compliance Check** — per-class teacher-scheduled lockout with curated TOEIC-grouped word picker; distractors pulled from words *outside* the curated list to avoid double-testing (`backend/src/utils/complianceDistractors.ts:48-56`)
- **Censure Queue** — peer-error retrieval where students review AI-generated grammar-error posts and select the correct fix
- **Bulletin Comprehension** — ephemeral comprehension MCQ on Ministry bulletins, formative-only (no DB write)
- **Vocabulary Completion Interstitial** — post-task chip strip (emerald `≥0.7` / amber `≥0.3` / rose `<0.3`) per target word, 4s auto-advance (`frontend/src/components/shift-queue/VocabularyInterstitial.tsx:65-127`)

### 2.4 Dictionary as cross-reference

The `DictionaryWord` table is the single source of truth for definitions, part-of-speech, phonetic, Traditional Chinese translation, TOEIC category, word-family group, week introduced, and the world-building flag (`backend/prisma/schema.prisma:113-133`). Every verification surface reads from it — Compliance Check distractor pool, Clarity Check mastery write, Censure mastery write, Writing Evaluator vocab tracking, and the student My File Vocabulary Ledger. **One word, one definition, used everywhere.**

---

## 3. Scaffolding & lane differentiation

### 3.1 Three lanes, one shift

Three teacher-controlled difficulty tiers share a single shift cascade — every student sees the same tasks, story beats, and target words, but the supports surrounding production scale.

- **Tier 1 — Guided** — sentence starters, Mandarin word bank, PEARL hint cards, guided questions, lower attempt pressure
- **Tier 2 — Standard** — word list visible, default `minWords`
- **Tier 3 — Independent** — bonus questions, `requireNegative`, `requireDifferentModal`, no scaffolding cards, harder per-error penalties

The lane integer lives on `Pair.lane` with default 2 (`backend/prisma/schema.prisma:80`). `Class.defaultLane` governs new-student inheritance; registration writes `lane: cls.defaultLane` (`backend/src/routes/auth.ts:271`).

### 3.2 Per-task lane payload

Differentiation is data, not branched code. Each task config carries a `lane` (or `writingLane` / `modalLane`) record keyed `"1" | "2" | "3"`. Concrete example — Week 3 Shift Report at `backend/src/data/week-configs/week3.ts:279-300`:

```
"1": minWords 35, sentenceStarters: true, wordBankChinese: true, 3 pearlHints, 3 guidedQuestions
"2": minWords 50, wordListVisible: true
"3": minWords 65, bonusQuestion (dystopian probe — "Must you obey?")
```

`LaneScaffolding.tsx:17-57` renders the supports declaratively from this payload.

### 3.3 Tier-1 supports — i+1 production scaffolding

Tier 1 is i+1 scaffolded production for A2 learners with limited English output. The Mandarin word bank (`wordBankChinese: true`) reduces L1-to-L2 retrieval cost so working memory can stay on syntax rather than vocabulary recall. `pearlHints` model the discourse frame ("Start with: 'I should review each case…'"; `week3.ts:46-50`). `guidedQuestions` (`week1.ts:389-393`) constrain *what* to write, not just how much.

Lower attempt-pressure pairs with this: VocabClearance, WordMatch, and ClozeFill grant **3 attempts** at tier 1, **2** at tier 2, **1** at tier 3 (`VocabClearance.tsx:34-37`, `WordMatch.tsx:32`, `ClozeFill.tsx:28`). Lock behaviour is itself a tier.

### 3.4 Tier-3 stretch — dystopian critical engagement

Tier 3 strips supports and adds dystopian-themed `bonusQuestion` prompts that force critical engagement with the world (`week2.ts:298`, `week3.ts:298`). Production constraints tighten — `requireNegative: true` (`week3.ts:55`) demands negative modal use; `requireDifferentModal: true` (`week3.ts:265`) bans repeating the same modal across justifications. Concern penalties also weight harder: PrioritySort docks `0.15` per wrong sort at tier 3 vs `0.05` at tier 1 (`PrioritySort.tsx:89`).

### 3.5 Teacher-controlled, not auto-promoted

Lane assignment is teacher-driven end-to-end. `PATCH /api/teacher/students/:pairId/lane` validates `lane ∈ {1,2,3}` and emits `session:lane-changed` to the student room (`backend/src/routes/teacher.ts:1107-1128`); the frontend listener updates `studentStore.user.lane` without re-login. Auto-promote/demote based on shift performance is explicitly **deferred** (`CLAUDE.md` Next Work) — manual control is the ground truth.

---

## 4. Task taxonomy & SLA sequencing

### 4.1 The six-phase shift cascade

Every shift orders its tasks along the SLA scaffold **Input → Recognition → Guided Practice → Assessment → Application → Production**, declared verbatim at the top of each `WeekConfig` (`week3.ts:20`, `week2.ts:18`).

Week 3 worked example:

| Phase | Task | File |
|---|---|---|
| 1. Input | `priority_briefing` (queue pressure + writing card) | `week3.ts:25-62` |
| 2. Recognition | `word_match_w3` (10 word-definition pairs) | `week3.ts:66-86` |
| 3. Guided Practice | `cloze_fill_w3` (10 blanks, closed word bank) | `week3.ts:90-119` |
| 4. Assessment | `vocab_clearance` (10 MCQs, lane-tiered attempts) | `week3.ts:123-207` |
| 5. Application | `priority_sort` (6 cases sorted + modal justifications) | `week3.ts:211-268` |
| 6. Production | `shift_report` (lane-gated free writing 35-65 words) | `week3.ts:272-302` |

### 4.2 Why this order

Briefing input must precede comprehension questions because students cannot answer about content they have not yet processed; the canonical pattern is `IntakeForm`'s `briefing` card type immediately followed by `intake_questions` (`week1.ts:33-78`, `frontend/src/components/shift-queue/tasks/IntakeForm.tsx:42`). Receptive recognition (`word_match`) precedes any productive use because the lexical entry must be available for retrieval before it can be deployed. Decontextualized MCQs in the assessment phase prepare contextualized usage in the application phase (`PrioritySort.tsx:31-37` reads the same `lane` and routes to `WritingEvaluator`). Writing tasks always last — `ShiftReport` reads `weekConfig.targetWords` plus `previousWords` for highlighting, presupposing the cumulative ledger has already been activated.

### 4.3 Task templates are configs, not code

The same `WordMatch.tsx` component renders W1 and W3 pairs (`week1.ts:101-112`, `week3.ts:71-82`). Task IDs carry a `_wN` suffix (`word_match_w2`, `cloze_fill_w3`) while `type` stays canonical — `backend/src/data/week-configs/types.ts:3-15` enumerates twelve `TaskType` values.

### 4.4 Per-task pedagogical role

| Task | Mode | Context | Scope |
|---|---|---|---|
| `IntakeForm` | receptive | decontextualized | individual; briefing → MCQ |
| `PriorityBriefing` | receptive → productive | contextualized | input + scaffolded production |
| `WordMatch` | receptive | decontextualized | recognition retrieval |
| `WordSort` | receptive | decontextualized | classification recognition |
| `ClozeFill` | productive-constrained | contextualized | cued recall with form selection |
| `VocabClearance` | receptive | decontextualized | gated recognition assessment |
| `ContradictionReport` | receptive → productive | contextualized | recall + classify + write |
| `DocumentReview` | receptive → productive | contextualized | comprehension/error/approve hybrid; optional mid-task choice |
| `ErrorCorrectionDoc` | productive-constrained | contextualized | targeted form recall |
| `PrioritySort` | productive | contextualized | one-by-one classification cascade with CSS-folder UI + modal-justification writing; **cinematic centerpiece for W3** (commit `d2dd9ef`) |
| `ShiftReport` | productive | contextualized | cumulative-target-words free production |

---

## 5. Writing, grammar & feedback

### 5.1 The writing rubric (post-2026-04-29 redesign, commit `b3ae4a0`; grading stabilised 2026-06-22)

Open writing is evaluated on **two axes**, one of which is an on-topic veto. As of **2026-06-22** the grader is **deterministic and lenient** (same draft → same verdict) and the veto **no longer hard-locks completion** (see §5.5):

1. **On-topic** (boolean, **veto axis — defaults to TRUE**) — does the writing make any reasonable attempt at the assigned prompt? A2-B1 learners write simply; shaky, short, or partial on-topic writing is *still* on-topic. Only writing that is clearly about an unrelated subject (song lyrics, random anecdotes about food/pets, copy-paste) or is gibberish is *off-topic*. Off-topic **caps the recorded score and flags the teacher**, but is escapable after one nudge.
2. **Vocabulary** (0.0–1.0) — are target vocabulary words used in **meaningful, prompt-relevant context**? This is the only numeric axis.

Recorded score (the `/evaluate` persist path):
```
  if onTopic == false:  score = 0.0
  else:                 score = vocabScore (clamped [0.1, 1.0])
```
An off-topic draft that the student **Submit-Anyways** after the nudge instead records a low floored score (~0.2) with `submittedAnyway: true` + `onTopic: false` for teacher review (§5.5).

Pass is now **one rule for every attempt** (no per-attempt bar changes): `passed = onTopic AND meetsWordFloor AND vocabScore >= 0.3`, plus an attempt-3 on-topic auto-pass safety net.

Checks run *before* the AI is called (`backend/src/routes/submissions.ts`):

- **Layer 1 (the single hard floor)** — the task's own lane-resolved `minWordCount` (clamped 5–100). That is the *only* hard gate; a too-short draft gets a crisp "Minimum N words required. Current: M."
- **Layer 2 (AI rubric, deterministic at `temperature: 0`)** — on-topic + vocab, lane-aware so PEARL calibrates against support / standard / challenge tracks.

Vocabulary is the **scored axis, not a gate** — the old 30%-of-target-words hard block was removed (2026-06-22); low vocab now yields a low `vocabScore` + a plain "use more target words — try: X" hint, never a wall. Detection uses Porter stemming so morphological variants count.

**Why not grammar?** AI grammar scoring on short A2-B1 L2 text is unstable across attempts (the same submission can score 0.6 then 0.9), and it double-tests what constrained tasks already test deterministically. Penalising rough grammar in writing trains students to write *less*, not better — Krashen's affective filter is real for adolescent learners. The pre-redesign rubric let a submission about "I should fart. I should poop" score 100% because grammar+vocab averaged above the old 0.4 pass threshold even when topical relevance was low. The on-topic veto closes that loophole — off-topic writing is capped + flagged, even though (post-2026-06-22) the student can still move on after one nudge.

### 5.2 Grammar lives in constrained tasks, not open writing

Grammar is taught and assessed in tasks where the right answer is unambiguous and per-item scoring is honest:

- **Cloze Fill** — closed word bank, exact-form match (e.g. `separated` vs `separate`).
- **Error Correction Doc** — explicit error spans with known fixes.
- **Word Sort** — past vs present classification (W2).
- **Document Review** — comprehension + error-spot hybrid.
- **Contradiction Report** — past-vs-present compare-and-mark.

Each emits `category: 'grammar'` (or `'mixed'`) so the **Grammar Accuracy** card on `ShiftClosing` is fed *exclusively* from these deterministic sources — never from AI-evaluated writing. The grammar number students see at shift close is a real measurement, not a noisy AI estimate.

### 5.3 Grammar advisory text (teacher-only, non-scoring)

The OpenAI rubric still emits one short observation about grammar (`grammarAdvisory: string`, ≤80 chars typical) — but it never affects the score and is **never shown to the student**. It surfaces in:

- **Gradebook drill-down** PEARL & AI panel — labeled "Grammar note (advisory only)"
- **Writing Review** AI Evaluation block — italicised under the on-topic verdict

Teachers use it to spot trending L1-transfer patterns in their class without the noise of a numeric score driving student affect.

### 5.4 Grammar progression W1→W4+

`grammarTarget` still steers what counts as the week's grammar focus — but now only in two places: (a) the constrained-task content (Cloze blanks, Error Correction spans), and (b) the advisory-text prompt sent to the AI. It no longer drives a numeric writing score.

| Week | `grammarTarget` | Anchor constrained task | Writing-side use |
|---|---|---|---|
| W1 | `present-simple` | IntakeForm acknowledgments + Cloze | Advisory text only |
| W2 | `past-simple-vs-present` | ContradictionReport + Word Sort | Advisory text only |
| W3 | `modals` (must / should / can) | Cloze Fill `cloze_fill_w3` | Advisory text only |
| W4 | `past-simple-sequencing` | DocumentReview + ErrorCorrectionDoc | Advisory text only |

### 5.5 Submit Anyway — one nudge, then escapable (reworked 2026-06-22)

Completion is **always reachable** — a genuine attempt never traps the student. After one failed AI eval, an amber **Submit Anyway** button appears (`WritingEvaluator.tsx`), gated on the task's `minWords` floor. The forced submission floors `vocabScore` (0.3 on-topic / 0.2 off-topic); `ShiftReport.tsx` clamps to `[0.1, 1.0]` so no submission registers as zero or perfect, and `submittedAnyway: true` flags it for teacher review.

- **On-topic drafts** can Submit Anyway immediately after the first failed attempt (e.g. thin vocab).
- **Off-topic drafts** get **one nudge** — *"Try writing about your shift — what you examined, what happened, and the result. Then submit again."* — and after one revise (attempt 3) the escape hatch opens **even if still off-topic**, recording the real `onTopic: false` + `submittedAnyway` so the teacher sees the truth. An attempt-3 on-topic draft auto-passes outright.

This satisfies principle 1.5 (failure must never be a hard block) for *both* effort and topic failures, while still steering students toward the prompt with a single nudge. (Supersedes the pre-2026-06-22 rule where off-topic permanently blocked Submit Anyway — that hard lock, combined with the old non-deterministic grader, was the main reason students couldn't finish.)

### 5.6 PEARL as in-character feedback engine

A separate AI pass at `POST /api/pearl-feedback` generates 1-2 sentence in-character commentary on the citizen's *reasoning*, never grammar or mechanics (`backend/src/routes/pearl-feedback.ts:13-32`). Hard 200-character ceiling. Voice doctrine: no contractions, institution-as-speaker ("The Ministry notes..."), forced-happy dystopian. Fired fire-and-forget so the eval renders immediately; persisted to `MissionScore.pearlFeedback`. When a submission is off-topic, the PEARL feedback line **explicitly cites the topic mismatch** in Ministry voice — students get a clear in-world signal without a wall of red text.

### 5.7 Self-reflection at shift close

`ShiftClosing` renders a 9-card grid (`frontend/src/components/shift-queue/ShiftClosing.tsx:137-156`): Documents Processed, Errors Found, Vocabulary Score, Grammar Accuracy, Writing Score, Final Score, Words Written, Target Words Hit, Concern Score. Categories with no contributing task render `—`, never a bogus default. **Grammar Accuracy** is now exclusively sourced from constrained tasks (see §5.2) — the number is honest.

When any writing task in the shift was off-topic, an amber/rose banner renders above the grid: *"Topic compliance noted — N written submissions did not address their assigned prompts. The Ministry registers vocabulary effort but cannot file off-topic reports."* This is in-world feedback that explains why the Writing Score may be low without breaking the dystopian register.

Narrative-reactive cards layer on top:

- **W3** Party Observation — quotes the student's own first principle from `priority_briefing` writing (`ShiftClosing.tsx:120-135`)
- **W4** PEARL Observation — branches on the stored `w4_recruitment_vote` narrative choice (added 2026-05-11; superseded the retired `w4_doc_review_frag3` key when the W4 mid-task popup was removed in the Activity Reconciliation redesign). `ShiftClosing.tsx` consumer code STILL needs the wiring (tracked in `audit-remediation-2026-06.md` deferred items).
- **All weeks** Citizen-4488 Case File — tones rose / amber / emerald against `concernScoreDelta` (`ShiftClosing.tsx:265-267, 370-398`)

Reflection mirrors action — the dashboard teaches that every keystroke registered.

### 5.8 Canonical task-result shape

Every task component emits `onComplete(score, details)` where `details` conforms to `TaskResultDetails` (`frontend/src/types/taskResult.ts:32-77`): `{ taskType, itemsCorrect, itemsTotal, category }` plus optional `errorsFound`, `errorsTotal`, `writingText`, `wordCount`, `vocabUsed`, `skipped`, `answerLog`, and (post-2026-04-29) `onTopic`, `onTopicReason`, `vocabScore`, `vocabMissed`, `grammarAdvisory`, `submittedAnyway`. Legacy fields (`grammarScore`, `grammarNotes`, `taskScore`, `taskNotes`) are no longer written by new code but remain readable on pre-redesign `MissionScore` rows.

`aggregateTaskResults` is a pure reducer (`frontend/src/utils/scoreAggregator.ts:53-136`): vocab and grammar sum `itemsCorrect / itemsTotal` so a 10-item task outweighs a 2-item task; writing tasks contribute their raw 0-1 score; skipped tasks are excluded; empty buckets return `null`.

### 5.9 Teacher visibility loop

Each task records per-question `answerLog` entries — `{ questionId, prompt, chosen, correct, wasCorrect, attempts? }` (`taskResult.ts:17-30`). The aggregator intentionally ignores it; it is teacher-UI data only.

The Gradebook drill-down and Writing Review surfaces both render:

- **Student Answers** — from `details.answerLog`
- **PEARL & AI** panel — On-Topic verdict + reason (new), Vocab score + used + missed, Grammar advisory (italicised, "advisory only"), PEARL feedback. Pre-redesign rows still render their legacy grammar score with a "(legacy)" suffix.
- **Teacher Comment** textarea — wired to `PATCH /api/teacher/scores/:scoreId/comment`, persisted to `MissionScore.teacherComment`.

Writing Review also stamps each entry with an **On-Topic** (emerald) or **Off-Topic** (rose) chip, and the "Needs attention" sort surfaces off-topic entries first.

Two endpoints write to the same `MissionScore.details` JSON, so both wrap upserts in `prisma.$transaction` and merge through `mergeDetails()` to protect non-empty strings from empty-string clobber (`submissions.ts:44-59, 191-216`).

---

## 6. Retrieval practice & assessment

### 6.1 Retrieval doctrine

Every TOEIC-aligned target word is encountered four or more times within a single shift-week across distinct verification surfaces, never the same mode twice in a row. Within one shift, the cadence runs:

```
decontextualized recall (Vocab Clearance MCQ)
  → contextualized production (writing tasks → WritingEvaluator vocab axis)
  → randomized reinforcement (Clarity Check)
  → teacher-scheduled spaced retrieval (Compliance Check)
  → peer-context retrieval (Censure Queue)
  → behavior-corrective retrieval (Remediation Module, opportunistic)
```

Bulletin comprehension layers ambiently on top. Note: writing tasks contribute to *retrieval* via the vocab-use axis (still **+0.10** mastery per used target word, gated by the on-topic veto — see §5.1) but no longer contribute to grammar accrual. Grammar mastery is measured only in constrained tasks.

### 6.1.1 Remediation Module — behavioral-correction-as-pedagogy

Added 2026-04-30. The Remediation Module fires automatically when the system detects intentional `concernScore` grinding (rate-trigger state machine, see `frontend/src/stores/sessionStore.ts`). It is screen-locking, amber-accented, and pulls from low-mastery dictionary words within the current and prior shifts.

**Pedagogically defensible because:**
- The questions are real spaced retrieval — TOEIC vocab from earlier shifts the student has already seen, weighted toward words they haven't mastered (`PairDictionaryProgress.mastery < 0.6`).
- The cost is time + attention, never grade. The on-topic + vocab writing rubric stays clean (§5.1); concernScore changes never propagate to academic scoring.
- The dystopian frame *makes sense* of it. PEARL's voice stays warm and forced-happy throughout — even at clawback ("Your readings remain elevated, Citizen. Disappointing — but we'll keep trying together."). The Module never punishes; it cheerfully *helps* the student "re-center."
- Worst-case outcome: a determined troll fires multiple remediations in a shift and *accidentally studies harder* than the compliant student. That's the core insight — turning the abuse loop into a study loop.

**Pedagogical guardrails (must remain):**
- **No grade impact.** The cooldown delta touches only `Pair.concernScore`, never `MissionScore`, `ShiftResult.aggregate.overallScore`, or any other academic field.
- **Two-stage filter** (Stage A warning → Stage B modal) ensures honest strugglers aren't punished. A student who slowly accumulates concern from real mistakes rarely trips both stages within 90s.
- **Mastery accrues normally** during remediation: `+0.03` per correct answer (same rate as Clarity Check / Compliance Check / Harmony spaced-review).
- **PEARL voice stays in character.** No bark, no copy, no completion message becomes punitive. The dystopia is the saccharine concern.

**Watch for** in the first deployment week: students firing 3+ remediations per shift while completing tasks honestly (false positives). If observed, raise rate thresholds. Don't pre-tune for hypothetical cases — calibrate based on observed data.

### 6.2 Mastery accrual rates (summary)

| Surface | Delta | Mode |
|---|---|---|
| WritingEvaluator (target word used in production) | **+0.10** | productive, contextualized |
| Censure Queue (current-week correct) | **+0.05** | receptive, peer-context |
| Censure Queue (review-week correct) | **+0.03** | receptive, peer-context |
| Clarity Check (correct) | **+0.03** | receptive, randomized |
| Compliance Check (correct) | **+0.03** | receptive, teacher-scheduled |
| Remediation Module (correct) | **+0.03** | receptive, behavior-triggered |

Mastery accrues to `PairDictionaryProgress.mastery` (Float, capped at 1.0, seeded at 0.1 on first encounter; `backend/prisma/schema.prisma:142-148`). Every update is atomic.

### 6.3 Spaced repetition windows

Three concentric tiers, route-aware (`harmonyFeed.ts:33-47`):

- `focusWords` = current week's `targetWords`
- `recentWords` = previous 2 route-weeks
- `deepReviewWords` = all older route-weeks

Censure items obey the same scoping plus a 7-day re-eligibility clock (`harmony.ts:528`).

### 6.4 Formative vs summative

| Surface | Persistence |
|---|---|
| Bulletin Comprehension MCQ | **Formative only** — no DB write, no MissionScore |
| Mission tasks | `MissionScore`, `@@unique([pairId, missionId])` (`schema.prisma:334-351`) |
| Shift aggregation | `ShiftResult`, `@@unique([pairId, weekNumber])` (`schema.prisma:560-579`) |
| Compliance Check | `ComplianceCheckResult` reviewed at `GET /compliance-check/teacher/classes/:classId/results` |

### 6.5 Compliance Check — pedagogy as classroom-management tool

Compliance Check is dual-purpose: spaced retrieval that doubles as a focusing mechanism. Per-class scheduling lets teachers convert pedagogy into classroom control — `ComplianceCheckShell` renders at `z-[1000]` and hides the ambient PEARL Dynamic Island via `body.compliance-check-active`, physically blocking advancement until the curated retrieval set is cleared. Different classes can hold different templates for the same shift; teachers pick exact words from a TOEIC-grouped picker and choose `cumulativeReviewCount` (clamp 0-10) for cumulative review pulls (`compliance-check.ts:95, 170-172`).

---

## 7. Narrative-as-pedagogy / immersion

### 7.1 Vocab in voice before vocab in MCQ

Target vocabulary arrives in narrative voice **before** it appears in any quiz item. Clip A front-loads the week's target words in a single calm Ministry Training Broadcast at ~2:20 (`Dplan/Canva_Production_Scripts_Weeks_01_03.md:114-128`); Clip B (~1:20) reinforces them under a different character lens. The same words then surface in PEARL barks, character messages, cloze-fill blanks, then MCQ. The hybrid class model is built around this pacing: video opens together, app fills the middle, video closes together.

**Multiple contexts, narrative precedence — the word is heard as story before it is tested as item.**

### 7.2 World as cumulative reading practice

Every world artifact is a contextualized reading + retrieval surface. Eight named locations, five regulations, weekly slogan/tea/playlist/soup/event, approved media, food culture, traditions, and a 15-citizen roster (`backend/src/data/harmonyWorldBible.ts:33-284`) feed Harmony posts, bulletins, sector reports, and PEARL tips. Sector reports show-don't-tell dystopia (staffing 214→208→197 with rising "efficiency"). The 3-tier vocabulary engine recycles target words across these surfaces with validated 50%+ overlap (34 Vitest tests in `backend/src/data/__tests__/harmony-vocabulary.test.ts`).

**Reading is not a worksheet; reading is the citizenship.**

### 7.3 Character voices as input variation

Each NPC provides distinct register exposure inside the same A2-B1 ceiling.

| Character | Register | L2 use |
|---|---|---|
| Betty | warmth + reframes + rhetorical questions; "sugar"/"darlin'"; exclamations | high-frequency conversational chunks |
| Ivan | ellipses, qualifiers ("probably," "I think"), validation-seeking ("Right?") | hedging structures, modality |
| M.K. | terse, periods, silence-as-reply | minimalist pragmatics — silence is information |
| Citizen-4488 | self-censorship arc — see §7.4 | grammar erosion as plot |

Background citizens (Citizen-2104 model employee, Citizen-0007 tired-casual, Citizen-7291 metric-obsessed, Citizen-0018 advisory-procedural; `backend/src/data/harmonyCharacters.ts`) get verbal tics. Students get five registers reading as one character bible, not five textbooks.

### 7.4 Citizen-4488 grammar arc

Citizen-4488 is the spine of the doctrine.

- **W1**: deliberate agreement error ("she always arrive")
- **W2**: grammar perfect but content self-reassuring
- **W3**: grammar perfect, content self-censoring (`Dplan/Character_Bible.md:86-101`; `frontend/src/data/citizen4488Posts.ts:14-33`; `backend/src/data/harmonyCharacters.ts:118-160`)

The student watches L2 production politicized — **declining error count is increasing surrender**. Inverse literacy as plot. Because Mandarin L1 has no agreement morphology, this arc must be made visible to students: shift-close grammar-watch annotations and a 2nd weekly post are the sanctioned levers (`Dplan/Narrative_Pedagogy_Review_2026_04_17.md:132-149`).

### 7.5 Narrative-reactive payoffs

Student linguistic output drives world state. Three layers:

- **C-layer (mid-task choice)** — `DocumentReview.tsx` `midTaskChoice` config. Infrastructure remains, no active uses as of 2026-05-11 (the prior W4 Fragment 3 reclassification popup was removed in the Activity Reconciliation redesign — replaced by a silent visual mutation of Observation E + later `[ ].edited` Drop Box for engagement capture).
- **B-layer (inter-task moment)** — `InterTaskMoment.tsx`. Non-skippable character beats between tasks (W4: Betty after `word_match`, Ivan after `cloze_fill`/Cipher with terminal-flicker reframe, ambient `DON'T FORGET` glitch).
- **Shift-close echo** — W3 Party Observation quotes the student's own first rule verbatim; W4 PEARL Observation reflects the day's reconciliation and the Citizen-9020 reassignment notice.
- **End-of-shift recruitment vote (added W4 2026-05-11)** — `w4_recruitment_vote` NarrativeChoice modal ("Will you read what they have hidden?" → compliant/curious/guarded). Gates W5 content depth.

Choices persist via the `NarrativeChoice` Prisma model and pay off at shift close. Every triadic choice includes one compliant option — agency without forced dissent (`Dplan/Character_Bible.md:81`).

### 7.6 PEARL as ambient instructor

PEARL teaches without breaking immersion. Grammar tips are framed as Ministry communication policy, not classroom rules: *"When describing a single citizen's actions, the verb requires an '-s' ending… Correct verb forms demonstrate linguistic compliance"* (`backend/src/data/harmonyPearlTips.ts:25-26`). The institution is the teacher. Failure-state copy preserves "forced happy" warmth — pure-procedural rejection is a tone violation.

### 7.7 Centerpiece task as video continuity (per principle 1.8)

The single novel task per shift is the visual + narrative bridge from the briefing video into the app. Repeating tasks (Word Match, Cloze, Vocab Clearance) need uniform UI to do their spaced-retrieval job; the centerpiece task carries the shift's identity and must mirror what students just saw on screen.

**Exemplar — W3 Priority Sort cascade** (`frontend/src/components/shift-queue/tasks/PrioritySort.tsx`, commits `d2dd9ef`, `31587bb`, `17d94a6`, `813b65b`):

- Briefing video shows a CRT terminal with header `6 CASES — PRIORITY CLASSIFICATION REQUIRED`, three color-coded folders (pink URGENT, tan ROUTINE, blue HOLD), a `0/6` counter beneath each, and a terminal footer (`MINISTRY OF CLARITY · CASE PROCESSING TERMINAL · v3.2.1`).
- The app surface replicates every element: identical typography, identical folder colors (CSS-rendered manila folders with tabs and inset shadows), identical counter format, identical footer string. The video and the app are the same diegetic terminal.
- Cases arrive **one at a time, in shuffled order** (Fisher-Yates on mount via `useMemo` so peers don't see the same sequence and re-attempts don't memorise position) with a slide-in animation; an "INCOMING CASE N OF 6" pip fades in/out. Click a folder → the case animates directionally toward that column (translate + scale-down + fade), the folder bounces, the counter ticks, then a brief **"FORWARDED TO STANDARD CHANNEL ✓"** pip fires (~650ms) before the next case slides in. The pip enacts Clip A Scene 4's *"Forward each complete classification through the standard channel"* — students see what they heard.
- Auto-verification follows the last case; the case-5 disappearance ("reassigned to Wellness Division") plays as a glitch-out animation while PEARL announces the reassignment in a slide-in bark — preserving the dystopian narrative beat as a *cinematic moment* rather than a paragraph of text.
- A one-time **ClassificationTraining** overlay precedes the cascade with three folder explainers + identification heuristics. Lane 1 receives simpler example sentences; Lane 2/3 share the standard copy.
- Once the cascade is running, **two persistent reference surfaces** stay accessible (see §7.7.1):
  - A compact **Directions card** (3 numbered steps + one-line color key) — always visible
  - A collapsible **Examples & Tips panel** with three folder explainers + the 5-bullet identification heuristics — Lane 1 expanded by default, Lane 2/3 collapsed

Pedagogical effect: the centerpiece becomes the *application phase* of W3 in the SLA scaffold (§4.1). One-by-one cascade forces deliberate per-case classification rather than gut-pattern-matching across a vertical list. The training overlay teaches discrimination criteria explicitly; the persistent panels keep them accessible during performance. The visual continuity from video to app reinforces "vocab in voice before vocab in MCQ" (§7.1) at the *whole-task* level: students apply what the narrator showed them in the same visual frame the narrator used.

Future shifts must apply the same principle: the centerpiece task's UI must visually echo its briefing video. A briefing video showing color-coded folders → app surface uses the same color-coded folders. A briefing video showing a clipboard with checkboxes → app surface uses the same clipboard. Brand mismatch between video and app surface is a doctrine deviation.

### 7.7.1 Reference accessibility during application phase (Cognitive Load Theory)

A2-B1 working memory holds roughly 4±1 chunks for L2 processing (Sweller / Paas / van Merriënboer). Each Priority Sort case already costs 3-4 chunks: parse English, identify time/impact signals, form a classification hypothesis, justify in writing. Forcing students to also hold the discrimination heuristics in working memory ("URGENT means lives/deadlines/safety, ROUTINE means standard schedule...") **pushes total load over capacity**. The behavioural consequence: students stop applying the rules and revert to gut/keyword-matching — exactly the pedagogical failure we're trying to prevent.

**Doctrine:** Discrimination criteria, examples, and identification heuristics MUST be reliably accessible during the application phase of any centerpiece task. Hidden after a one-time training overlay = wrong; behind a persistent always-visible panel = right; behind a collapsible disclosure = also right (and reduces visual clutter for stronger learners).

**Two-tier reference architecture (W3 Priority Sort exemplar):**

1. **Always-visible Directions card** — terse procedural recap (3 steps + one-line color key). Cognitively cheap; all lanes see it.
2. **Collapsible Examples & Tips panel** — full discrimination heuristics + per-folder examples. Lane-aware default state:
   - **Lane 1 (Guided):** expanded by default — these students need the maximum scaffold during their first exposure.
   - **Lane 2 (Standard):** collapsed by default, available on click — student decides when they need a refresher.
   - **Lane 3 (Independent):** collapsed by default but present — even strong learners benefit from a quick check, and removing it would inconsistently signal that the task is somehow "less serious" for them.

This is **not** a crutch. The thing being learned is *discrimination under reading load* — the ability to read an English case body, identify the signals, and choose the right category. The criteria themselves are tools, not the lesson; the lesson is using the tools repeatedly and successfully across many cases. By the third or fourth case, most students will have stopped consulting the panel — the criteria have moved into automatic processing (Anderson's ACT-R, automaticity research). Forcing memory at first encounter risks **incorrect** consolidation: students who guess wrong six times in a row encode wrong patterns.

Long-term internalisation comes from repeated successful application across many cases, not from rule-memorisation at first encounter. If you want to assess memory of the criteria, do it as a separate retrieval check (a Clarity Check or Compliance Check pulling category criteria as MCQ items at shift close), not by withholding reference during the application phase.

**Justify-phase referent visibility (added 2026-06-11, `965dd18`):** when a later phase asks the student to write about an earlier in-task decision, the decision itself must be re-displayed on the writing screen. A2-B1 students cannot hold six classification choices across a phase boundary, and "explain your decision" with no visible referent reads as a comprehension puzzle, not a writing prompt — the classroom symptom was students not knowing what they were supposed to explain. The W3 justify card now shows the student's own filing (folder glyph + colored label from cascade state — their own answer, so nothing leaks) and the directions name all three folders explicitly ("Think back: which folder did you put this case in — URGENT, ROUTINE, or HOLD?").

Future centerpiece tasks must include both a persistent terse-directions surface AND a collapsible full-reference surface with lane-aware default state, and any later phase that references an earlier in-task decision must re-display that decision. Hiding all reference after the training overlay is a doctrine deviation.

---

## 8. Mandarin L1 considerations

Pedagogy is calibrated to L1 transfer.

- **Subject-verb agreement** is treated as the most persistent interference (Mandarin has no agreement morphology). SVA errors are seeded into W4 Doc B and W6 Doc A (`Dplan/Weeks_04_06_Shift_Plan.md:607-609`).
- **Because-clauses** are explicitly taught at W5, never assumed. Mandarin uses 因為...所以... or omits connectors; the conjunction-as-discourse-marker pattern needs scaffolding (`Dplan/Narrative_Pedagogy_Review_2026_04_17.md:161`).
- **Articles (a/the)** are never penalized in W1-6 — Mandarin has no article system. Penalizing untaught grammar breaks the pedagogical contract (`Dplan/Weeks_04_06_Shift_Plan.md:601`).
- **Sentence starters** in Lane 1 are always in PEARL or character voice — never English-teacher hints that crack immersion (`backend/src/data/week-configs/week4.ts:390-405`).
- **Mandarin word bank** (`wordBankChinese: true`) is offered at Lane 1 only, not Lane 2/3, to avoid undermining target-language immersion for stronger learners.
- **Cumulative review** in W6 must include one target word from each of W1/W2/W3 — Mandarin learners need explicit return cycles, not just additive presentation (`CLAUDE.md` Next Work, PR #11).

### 8.1 Bilingual remediation study card (added 2026-05-08)

Wrong answers in the Remediation Module trigger a 5-second study card that surfaces the correct form-meaning mapping with lane-aware density. Codifies the principles that informed the design:

- **Krashen's affective-filter hypothesis.** Punishment, embarrassment, and forced failure raise the cognitive filter and *reduce* L2 uptake. A red ✗ + buzzer teaches the kid less than a calm "the correct answer is X — here's an example." Doctrine: **forced exposure not punishment**. The 5-second pause is a study moment, never a punitive lockout.
- **Cummins on strategic L1.** The English-only classroom is a debunked myth for lower-proficiency learners. A Mandarin gloss flashed at the moment of confusion lowers cognitive load enough for the form-meaning link to actually form. The trick is *briefly*, *as a glue*, *not as a crutch*. Lane 1 surfaces L1 always; Lane 2 hides it behind a tap; Lane 3 doesn't show it by default.
- **Nation & Schmitt on context exposure.** The biggest replicated finding in vocabulary acquisition: learners need a word in *context* to acquire it. Definition + example sentence + IPA creates deeper traces than any one of those alone. Lane 1 + Lane 2 see all four signals (English form, definition, Mandarin gloss, example sentence); Lane 3 sees three.
- **Spaced retrieval, not massed practice.** The Remediation Module fits *into* the existing spaced-repetition rhythm (Compliance Check + Clarity Check + Harmony review). It's not a separate hammer; it's another exposure surface in the same loop.
- **No force-pass loops.** Trapping an A2 student in "you can't escape until 3/3 correct" is a textbook affective-filter trigger. The system accepts variable performance; the score-based completion copy stays forced-happy regardless ("Verification recorded. We will continue to support your engagement."). Spaced repetition catches up.
- **Worst case is studied harder.** The doctrine line carries the design: a grinder hits the wrong-answer pause three times and sees the correct definition three times. They got "punished" by being exposed to vocabulary. Net positive.

### 8.2 Why MCQ alone isn't enough — and how the study card extends it

MCQ tests recognition (pick the right answer from four), not recall (produce the word from meaning). Recognition is the shallowest measure of acquisition. The study card doesn't fix that — production tasks (cloze, sentence-write, speaking) do — but it deepens the encoding of every wrong attempt by adding form + L1 + context to the moment of error. Combined with the existing shift task variety (cloze, error correction, writing), the cumulative exposure across surfaces is what produces acquisition. The remediation moment is one input, not a complete loop.

---

## 9. Quick reference

| Doctrine | One-line summary |
|---|---|
| Vocabulary | TOEIC-first, 10/week, recurring across 4+ surfaces, recycled in 3 tiers |
| Differentiation | 3 lanes, one cascade, data-driven scaffolds |
| Sequencing | Input → Recognition → Guided → Assessment → Application → Production |
| Writing rubric | **Lenient/escapable on-topic veto + Vocab score**; deterministic grader (`temp 0`); grammar removed from scoring (advisory only); Submit Anyway opens after one nudge (off-topic escapable on attempt 3) |
| Grammar | Lives in constrained tasks (Cloze, Error Correction, Word Sort); never scored on open writing |
| Feedback | PEARL in-character (200 chars), persisted, off-topic explicitly cited; never blocks effort failures |
| Retrieval | 4+ encounters/word/week across distinct modes; writing contributes vocab only; +0.10 production / +0.05 current / +0.03 review |
| Narrative | Story is the syllabus; vocab in voice before vocab in MCQ |
| Centerpiece UI | Each shift's novel task must visually mirror its briefing video; W3 Priority Sort cascade is the exemplar |
| Tone | Forced happy dystopian; warmth that masks control |
| L1 | SVA seeded but not yet penalized below W4; articles never penalized W1-6; because-clauses taught explicitly W5 |

---

## 10. What this document does not cover

- **Specific shift content** — see `Dplan/Weeks_01_03_Script_Pack.md`, `Dplan/Weeks_04_06_Shift_Plan.md`, `Dplan/Canva_Production_Scripts_Weeks_01_03.md`.
- **Architecture & data model** — see `docs/architecture.md`.
- **Feature catalog** — see `docs/features.md`.
- **World canon, characters, locations** — see `docs/world-and-story.md` and `Dplan/Character_Bible.md`.
- **Cross-cutting narrative review findings** — see `Dplan/Narrative_Pedagogy_Review_2026_04_17.md`.
