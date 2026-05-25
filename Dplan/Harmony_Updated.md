# Harmony Phase D — Censor Mechanic & Live Feed

**Date drafted:** 2026-05-08
**Status:** PLANNED — not yet implemented
**Prereqs:** Phase 0 / A / B / B+ / B++ / C all DONE (see root `CLAUDE.md` § Harmony Expansion Status)
**Replaces:** the open-ended ideas in `Harmony_Visual_Enhancement_Ideas.md` are superseded where they overlap; the ones that don't (propaganda ticker, 4488 glitch, typewriter bulletins) can layer on top.

---

## 1. The frame

Harmony Feed becomes a **Junior Compliance Reviewer's active queue**. The student verdicts posts: **Approve** or **Flag**. Every flag cites a real Party regulation already in the world bible. The underlying activity is cumulative vocabulary review + grammar drill, costumed as in-world censor work.

**Pedagogical anchor (re-stated):** Harmony is a review on the words a student has learned from the current shift back to the first shift. The censor mechanic is the surface; cumulative review is the engine.

**Doctrinal anchors:**
- Forced-happy supervisor tone — never punitive (same doctrine as Remediation Module).
- Story and immersion are sacred — no out-of-world language ever surfaces.
- Harmony is ambient. Each interaction <30s, capped per shift, never blocks the main shift cascade.
- Verdict-bearing posts are 100% hand-authored; AI can only generate ambient texture (replies).

---

## 2. Canon laws used (already in the world bible)

From `backend/src/data/harmonyWorldBible.ts` and `docs/world-and-story.md:117-125`:

| Rule | Citation | What gets flagged | Learning target |
|---|---|---|---|
| **Regulation 14-C** — Approved Vocabulary Usage | already in `MINISTRY_REGULATIONS` | Casual word in place of an approved target word | TOEIC vocab + register |
| **Harmony Conduct Code §1** — Collective Voice | sub-rule of Harmony Conduct Code (existing umbrella regulation) | Citizen used "I / me / my" instead of "we / us / our" | Pronouns + S–V agreement |
| **Harmony Conduct Code §2** — Declarative Form | sub-rule | Citizen asked a question instead of stating | Statement form |
| **Harmony Conduct Code §3** — Passive Voice Required | sub-rule (W4+, deferred) | Active-voice construction | Passive (TOEIC heavy) |
| **Harmony Conduct Code §4** — Black Word Restriction | sub-rule (W4+, narrative-coupled) | Use of *mother / father / freedom / truth / name* | Unedited foreshadowing |

Phase D ships rules 14-C, §1, §2 only. §3/§4 are W4+ work.

---

## 3. Week-by-week rule unlock

| Shift | Active rules | Pending posts/shift | Vocab pool |
|---|---|---|---|
| **W1** | Reg 14-C only | 2–3 | 100% W1 words |
| **W2** | + Conduct Code §1 (we/I) | 3–4 | ~70% W2 / ~30% W1 |
| **W3** | + Conduct Code §2 (no questions) | 4–5 | ~60% W3 / ~25% W2 / ~15% W1 |

---

## 4. The censor mechanic — UI states

### Active Feed (what the student sees)
```
HARMONY · SHIFT N
┌─────────────────────────────────────────────────────────┐
│ ◉ PEARL — Junior Compliance Reviewer Station            │
│   "Three posts await our review, Citizen."  Streak: 2 ✓ │
├─────────────────────────────────────────────────────────┤
│ ▣ Morning Voice: weekly slogan + playlist + soup        │
├─────────────────────────────────────────────────────────┤
│ DAILY VOCABULARY AUDIT (3-pair word↔definition match)   │
├─────────────────────────────────────────────────────────┤
│ Citizen-XXXX · 09:42                                    │
│ "Post body..."                            ✓ APPROVED    │
├─────────────────────────────────────────────────────────┤
│ Citizen-XXXX · 09:51        ⚠ PENDING REVIEW            │
│ "Post body..."                                          │
│            [ ✓ APPROVE ]    [ ✗ FLAG ]                  │
├─────────────────────────────────────────────────────────┤
│ Citizen-XXXX · 09:58                                    │
│   ↳ reply to 09:42 above (nested)         ✓ APPROVED    │
└─────────────────────────────────────────────────────────┘
```

### Flag modal (opens on ✗ FLAG)
1. **Cite the violation** — radio list of active rules (grows by week).
2. **Tap the offending word** in the post above (redact-tap).
3. **Replace with the Party-approved equivalent** — 3-chip word bank.
4. Submit.

### Wrong-approve handling
If the student approves a post that should have been flagged, the badge changes from `✓ APPROVED` to `⚠ AUDIT NOTICE — REVIEWED IN ERROR`, with a real-time PEARL reaction explaining the missed violation. Logged identically to wrong-flag — counts toward adaptive review pool. **Never punitive.**

### Shift-end summary card
Replaces final post slot once the queue clears. Shows posts reviewed, compliance accuracy %, active rules today, words exercised (with tier stars), forced-happy PEARL sign-off.

---

## 5. Live timeline — staggered drip-feed

**Cadence (locked):** random 60–120s between posts. Per-student schedule computed at shift open by walking the static post list and adding a random delay between each. Post 1 immediate, Post 2 at +random(60,120)s, etc.

**UX:** when a post's offset is reached, a `↑ 1 NEW POST` pill slides into view at the top of the Feed. Tap pill = scroll to top + insert post with slide-down animation.

**Ambient life touches** (cheap, hand-authored, no AI):
- Morning Voice scrolling banner at top — weekly slogan + playlist + soup of the week (already in `WEEKLY_CULTURE`).
- Compliance acknowledgments ticker on approved posts — *"+3 citizens acknowledged"* increments slowly.
- Citizen-4488 typing indicator — appears, holds, vanishes without posting. Narrative tension.
- Sector occupancy chip — *"218 citizens online in Sector 4"* nudges up/down.

---

## 6. Reply chains (some posts respond to others)

Add `replyToPostId?: string` to the post schema. When set, the post nests visually under its parent.

**Authoring rule:** ~30% of posts are replies; rest are standalone. Replies appear ~30–90s after the parent.

A few replies CAN be PENDING themselves (e.g., Citizen-9020 replies with "I" slipping in) — adds drama.

---

## 7. AI replies on hardcoded posts (texture only)

**The pattern:** hardcoded posts are the spine (carry all verdict metadata). AI generates **ambient replies on top** purely for life.

**Safety rules (non-negotiable):**
- AI replies are **never flaggable** — pure texture, no verdict footer. Verdict pool stays 100% hand-authored.
- System prompt locks Party canon: *"≤140 chars. Use 'we' not 'I'. Approved vocabulary only. Pick a Citizen-XXXX from the active roster. Forced-happy compliance tone."*
- Cached **per class** in a new `HarmonyAiReply` table; first student to load triggers generation, classmates see cached.
- Selective: only posts with `allowAiReplies: true` (~30–40% of posts).

**Cost:** ~30 short calls per class for the whole 3-week run, cached forever. Roughly $0.05–0.10 per class.

---

## 8. PEARL supervisor in Harmony

**Voice:** forced-happy supervisor of a Junior Compliance Reviewer. Always uses "we", never "I". Cites regulations. Praises vigilance, never grades intelligence. Never punitive on misses (*"we will improve"*, never *"you failed"*).

**Six speaking moments:**
1. **Onboarding** (first time per shift) — *"Welcome to our station, Citizen. Today we review under Reg 14-C..."*
2. **Idle / empty queue** — *"Three posts await our review, Citizen."*
3. **Mid-post tactical hint** (only on student-tap of `?` on a post — never auto-popped) — teaches the rule in-world.
4. **After verdict — correct** — auto-fires brief praise.
5. **After verdict — wrong** — auto-fires gentle correction, cites approved replacement + week-introduced.
6. **Shift-end summary** — accuracy + words exercised.

**Static-vs-dynamic split:**
- ~90% pre-written templates with token substitution. Lives in `frontend/src/data/harmonyPearlBarks.ts`.
- ~10% AI-generated for personalized "explain why I missed this specific word" — uses existing PEARL message infrastructure (200-char cap, rate limit shared with main shift).

**UI placement:**
- Persistent header card at top of Feed (eye + one rotating bark line).
- Inline footer reaction strip under each verdict button (3s, then fades).
- Tap-`?` opens hint card for that violation type.
- Shift-end card replaces final post slot.

**Anti-patterns explicitly banned:**
- No randomly-popping barks.
- No metalanguage ("vocabulary review", "grammar drill"). Always *vigilance*, *Approved List*, *infraction*, *service*.
- No chat input (Harmony PEARL is one-way; chat lives in main shift cascade).

---

## 9. Adaptive review

- Per-word accuracy logged in `MissionScore.details` keyed by `harmonyVerdicts.{postId}` + `harmonyWordAccuracy.{word}`.
- Words missed twice get **boosted weight** in next shift's Audit card pool.
- Repeat-miss (3+) escalates into a new **Audit Cases** sub-section of the Censure Queue (Ministry tab) — remedial loop fully in canon.

---

## 10. Daily Vocabulary Audit card

Top of Feed, once per shift. 3-pair word↔definition match.

**Pulls from:**
- W1 → from W1 itself (no prior weeks).
- W2 → from W1 only.
- W3 → from W1 + W2.

This is pure spaced retrieval — never tests current-shift words (those are drilled via verdicts).

---

## 11. Cross-shift scoping

| Layer | Scope | Why |
|---|---|---|
| **Active Feed posts** | Current shift only | A W3 student doesn't re-verdict W1 posts; the censor's queue moves on |
| **Vocabulary** | Cumulative | Words from W1 keep appearing in W3 verdicts and Audit cards |
| **Archives tab** | Everything, forever | Full historical browse extends with new "Past Shifts Feed" sub-section |
| **Narrative threads** | Continuous | NPCs reference prior posts; running storylines (4488, Wellness Division) carry across shifts |

**Verdicts don't repeat** — once judged, post moves to Archive at shift close.

---

## 12. Other tabs across shifts

All four other tabs already cycle per shift (content keyed by `weekNumber` in static data files). Phase D adds:

- **NEW badges per tab** when this shift's content is unread (extends existing `lastHarmonyVisit` infra from Phase C).
- **"This Shift" header** on each tab (*"Bulletin · Shift 2"*, *"Sector Report · Shift 2"*).
- **Audit Cases sub-section** in Ministry tab's Censure Queue — repeat-miss escalations.
- **Past Shifts Feed sub-section** in Archives tab — read-only browse of old posts by shift number, no verdict buttons.

---

## 13. Data shape

### Extend `HarmonyPost` (Prisma model in `backend/prisma/schema.prisma`)

```typescript
HarmonyPost {
  id: string
  authorLabel: string                   // Citizen-XXXX
  body: string
  weekIntroduced: number
  postType: ...                          // existing enum

  // Live timeline
  delayAfterPreviousSec: { min: 60, max: 120 }

  // Threading
  replyToPostId?: string

  // Censor mechanic (PENDING posts only)
  pendingReview: boolean
  correctVerdict?: 'approve' | 'flag'
  violations?: [{
    rule: 'reg_14c' | 'conduct_s1' | 'conduct_s2'
    forbiddenWord?: string
    approvedWord?: string
    weekApproved?: number
  }]

  // AI texture
  allowAiReplies?: boolean
  aiReplyTargetCount?: number           // default 1–2
}
```

### New table

```typescript
HarmonyAiReply {
  id: string
  parentPostId: string
  classId: string
  authorLabel: string
  body: string
  createdAt: DateTime
  @@unique([parentPostId, classId, authorLabel])
}
```

### Verdict storage

Stash in `MissionScore.details` for the relevant week:
```json
{
  "harmonyVerdicts": {
    "<postId>": { "verdict": "flag", "correct": true, "rule": "reg_14c", "ts": "..." }
  },
  "harmonyWordAccuracy": {
    "<word>": { "seen": 4, "correct": 3, "lastSeenWeek": 3 }
  }
}
```

Use the existing `mergeDetails()` helper (audit batch 2026-05-04 — see CLAUDE.md "MissionScore.details merges everywhere"). **Do NOT** clobber the field — merge inside `prisma.$transaction`.

### PEARL bark bank

```
frontend/src/data/harmonyPearlBarks.ts
  onboardingBarks: per-week
  idleBarks: rotation
  hintBarks: keyed by violation rule
  correctBarks / wrongBarks: keyed by rule + streak band
  shiftEndBarks: parameterized by accuracy
```

Tokens: `{forbiddenWord} {approvedWord} {regulation} {weekApproved} {streak} {accuracy} {citizenId}`.

---

## 14. Implementation sequence (the order)

Each step is independently shippable. Steps 1–3 are foundation; 4–6 are content; 7–11 are polish.

### Step 1 — Schema + verdict footer (no rules wired)
- Prisma migration for new `HarmonyPost` fields + `HarmonyAiReply` table.
- `npx prisma generate`.
- Add verdict footer to `PostCard` — buttons present but inert. Authored seed posts get `pendingReview: true` for testing.
- Frontend: `harmonyStore` action `submitVerdict(postId, verdict, ...)`, persists to `MissionScore.details`.

### Step 2 — W1 content + Reg 14-C rule
- Hand-author ~10 W1 posts in `harmonyFeed.ts` (extend existing 6 seeds; add ~4 new). Mix clean + 2-3 PENDING with Reg 14-C violations.
- Each PENDING post carries full violation packet.
- Wire flag modal (Step 1: rule picker, Step 2: redact-tap, Step 3: replacement chip bank).
- Wire verdict outcome → PEARL inline reaction.
- Add Daily Vocabulary Audit card component, pulls from W1 words.

### Step 3 — PEARL bark bank + persistent header
- Create `frontend/src/data/harmonyPearlBarks.ts` with all 6 categories and W1 templates.
- Token substitution helper.
- Persistent supervisor header at top of Feed.
- Inline reaction strip under each verdict.
- Tap-`?` hint card for active rules.
- Shift-end summary card (replaces final post slot when queue clears).

### Step 4 — W2 content + Conduct Code §1
- Hand-author ~10 W2 posts (extend existing 3 seeds + 7 new). Some PENDING for §1 ("I/me/my" violations) plus some still 14-C.
- Add §1 to flag-reason picker (visible from W2 only).
- Add §1 templates to PEARL bark bank.
- Audit card for W2 pulls W1 words only.

### Step 5 — W3 content + Conduct Code §2
- Hand-author ~12 W3 posts (extend existing 3 seeds + 9 new). Some PENDING for §2 (questions), some for multiple violations.
- Add §2 to flag-reason picker.
- Add §2 templates to PEARL bark bank.
- Audit card for W3 pulls W1 + W2 words.

### Step 6 — Adaptive review pool boosting
- On verdict outcome write, update `harmonyWordAccuracy` in `MissionScore.details` (via `mergeDetails`).
- Audit card generator weights words inversely to accuracy.
- Repeat-miss (3+) creates entry in Audit Cases sub-section of Censure Queue.

### Step 7 — Wrong-approve audit notice
- After verdict, if approved-but-should-have-flagged, mutate post UI: badge → `⚠ AUDIT NOTICE`, fire wrong-verdict PEARL reaction.
- Same logging path as wrong-flag.

### Step 8 — AI reply system
- New endpoint `POST /api/harmony/posts/:postId/ensure-ai-replies` — checks `HarmonyAiReply` cache for `(postId, classId)`, generates if absent.
- AI prompt: ≤140 chars, "we" only, approved vocab, citizen from active roster, forced-happy.
- OpenAI moderation pass (existing infra in `harmonyModeration.ts`).
- Frontend: when a post with `allowAiReplies` enters viewport, fire ensure call; render replies inline.

### Step 9 — Live timeline drip-feed + NEW POST pill
- Frontend computes per-student schedule on shift open (random 60–120s between posts).
- `setInterval` checks every 5s for newly-due posts.
- "↑ 1 NEW POST" pill slides in at top of feed; tap = insert + scroll-to-top.
- Replies inherit parent's slot + 30–90s offset.

### Step 10 — Reply chain UI
- `replyToPostId` → visual nesting (`↳` indent under parent).
- Author 30% of posts as replies in static data.

### Step 11 — Ambient life touches
- Morning Voice scrolling banner (data from `WEEKLY_CULTURE`).
- Compliance acknowledgments ticker on approved posts (slow random increments, persisted per class).
- Citizen-4488 typing indicator (timed appearance + disappearance, no actual post).
- Sector occupancy chip (cosmetic counter, drifts).

### Step 12 (cross-shift) — Other tabs polish
- NEW badges per tab (extend `lastHarmonyVisit` per-tab tracking).
- "This Shift" headers on Ministry / Sector / Review tabs.
- Past Shifts Feed sub-section in Archives tab.

---

## 15. Open questions to confirm before starting

1. **Drip-feed cadence detail** — random 60–120s confirmed; should the FIRST post be immediate (0s) or also delayed (e.g., 30s after entering Harmony)? Default: first post immediate.
2. **Verdict gating** — must the student clear all PENDING posts to "complete" the Harmony shift, or stay opportunistic? Default: opportunistic (Harmony stays ambient).
3. **Concern score coupling** — should wrong verdicts feed `concernScore` (the Remediation rate-buffer)? Default: NO. Keeps Feed truly ambient and outside the punitive loop.
4. **Morning Voice banner content** — hand-authored per week or fixed pool with weekly slogan swap? Default: hand-authored per week (richer; ~15 min/week of writing).

---

## 16. Cost summary

| Item | Cost |
|---|---|
| One-time post authoring (W1–3) | ~30 posts × 140 chars + verdict packets — ~half-day work |
| PEARL bark bank authoring | ~50 templates across 6 categories — ~2 hours |
| Per-class AI replies (3-week run) | ~30 calls cached forever — ~$0.05–0.10 per class |
| Per-student runtime | Zero AI calls (replies pre-cached per class) |

---

## 17. What's UNCHANGED from current Harmony

- 5-tab structure (Feed / Ministry / Sector / Review / Archives).
- Bulletins, PEARL Tips, Notices, Sector Reports — same components, render alongside posts in the Feed.
- Censure Queue (Ministry tab) — already does flag/approve work; gets new Audit Cases sub-section.
- 3-tier vocabulary system (`focus / recent / deep`) in `getHarmonyReviewContext()` — powers the verdict word pool.
- Archives tab structure — extended with Past Shifts Feed sub-section.
- `lastHarmonyVisit` tracking + `harmony:new-content` socket — already in place from Phase C.
- OpenAI moderation pipeline — reused for AI reply generation.
- PEARL voice + 200-char + 20/shift rate limit — reused for personalized miss explanations.

---

## 18. Files this plan touches (estimated)

**Backend:**
- `backend/prisma/schema.prisma` — `HarmonyPost` field additions + new `HarmonyAiReply` table
- `backend/src/data/harmonyFeed.ts` — extend post schema, add ~18 new posts across W1–3
- `backend/src/routes/harmony.ts` — new endpoints for verdict submission, AI reply generation, audit cases
- `backend/src/utils/harmonyAiReplies.ts` — NEW: cached AI reply generator
- `backend/src/utils/harmonyAdaptiveReview.ts` — NEW: word accuracy boosting for Audit card
- Existing `mergeDetails()` pattern in routes — extend to handle `harmonyVerdicts` + `harmonyWordAccuracy`

**Frontend:**
- `frontend/src/components/harmony/PostCard.tsx` — verdict footer + threading + audit notice state
- `frontend/src/components/harmony/FlagModal.tsx` — NEW: 3-step flag UI
- `frontend/src/components/harmony/DailyVocabularyAudit.tsx` — NEW: top-of-feed match card
- `frontend/src/components/harmony/PearlSupervisor.tsx` — NEW: persistent header + inline reactions + hint cards
- `frontend/src/components/harmony/ShiftEndSummary.tsx` — NEW
- `frontend/src/components/harmony/MorningVoiceBanner.tsx` — NEW
- `frontend/src/components/harmony/FeedTab.tsx` — orchestration (drip-feed timing, NEW POST pill, ordering)
- `frontend/src/data/harmonyPearlBarks.ts` — NEW: bark bank
- `frontend/src/store/harmonyStore.ts` — verdict actions, AI reply caching, drip schedule state

---

## 19. Calibration after live observation (don't pre-tune)

Following the Remediation Module precedent — ship with sane defaults, then calibrate:

- **Pending posts per shift** — 2–3 / 3–4 / 4–5 may be too few or too many. Watch student dwell time + completion rate.
- **Drip cadence 60–120s** — may need to widen or narrow based on average shift session length.
- **AI reply target count (1–2)** — may bump to 2–3 if classes feel sparse.
- **Adaptive review boost weight** — start at 2× weight for missed words; tune from observed mastery curves.

---

**To begin in a future session:**
1. Read this file + root `CLAUDE.md` § Harmony Expansion Status.
2. Read the open questions in § 15 and confirm with user.
3. Start with Step 1 (schema + verdict footer). Each subsequent step is independently shippable.
