# Harmony Expansion — Design Review & Implementation Plan

Last reviewed: 2026-04-06

### Implementation Status
- **Phase 0 (bug fixes)**: DONE (2026-04-03) — generation race lock, dead gate code removal, censure action fix, orphaned post sweep
- **Phase A (cumulative review)**: DONE (2026-04-03) — 3-tier vocab, route-aware generation/queries/review, differentiated mastery, cumulative censure items
- **Phase B (world-building content)**: DONE (2026-04-03) — world bible, 5 NPC characters, 4 new content types, per-type generator, component registry, bulletin comprehension
- **Phase C (archives + polish)**: DONE (2026-04-09) — 5-tab UI, Archives tab (vocabulary/4488 timeline/bulletins), lastHarmonyVisit tracking, NEW badges, Harmony tile notification, PEARL ambient annotations, socket events

---

## 1. Vision

Harmony becomes the Daily Prophet of The Lexical Republic — not just a message board, but a window into a functioning dystopian society with its own news, culture, characters, regulations, and daily rhythms. Students learn vocabulary and grammar by reading about and interacting with this world.

**Design Principles:**
1. Pedagogy through immersion — Every post type teaches something but the student experiences it as "reading the news"
2. NPC-driven, not student-driven — The feed backbone is Ministry-controlled NPC posts
3. Cumulative review through world continuity — Old vocabulary resurfaces because the WORLD continues referencing those concepts
4. Depth through specificity — Named locations, recurring characters, Ministry policies with numbers, sector reports with data

---

## 2. World-Building Content Bible (New Asset)

New file: `backend/src/data/harmonyWorldBible.ts`

### Locations

| Location | Description |
|----------|-------------|
| Sector 4 Community Center | Where Citizen-4488's neighbor disappeared from |
| Central Filing Hall | Massive document processing center, 200+ associates |
| The Wellness Pavilion | Euphemism for reeducation/disappearance center |
| Cafeteria Block 7 | Where associates eat; has a notice board |
| Transit Hub Delta | Commuter station with propaganda screens |
| Residential Towers 11-15 | Where citizens live; tower assignments are status markers |
| Recreation Yard 3 | "Approved leisure area" with scheduled activities |
| The Archive | Restricted document storage, mentioned in whispers |

### Recurring NPC Characters (5 voices across 18 weeks)

| Character | Role | Arc | Voice |
|-----------|------|-----|-------|
| Citizen-2104 | Model employee | Weeks 1-6: genuinely happy. Weeks 7-12: notices things but self-corrects. Weeks 13-18: cracks show | Formal, uses target words precisely, never questions |
| CA-18 | Senior mentor | Weeks 1-6: helpful authority. Weeks 7-12: gives veiled warnings. Weeks 13-18: goes quiet | Advisory tone, references procedures, teaches by example |
| Citizen-4488 | The dissenter | Existing escalating arc — neighbor missing, activities cancelled, people vanishing | Self-reassuring, grammar errors, always ends "everything is fine" |
| WA-07 | Tired worker | Weeks 1-6: enthusiastic new hire. Weeks 7-12: exhausted, complains within approved limits. Weeks 13-18: robotic compliance | Casual, uses slang that gets corrected, relatable |
| Citizen-7291 | Efficiency bureaucrat | Weeks 1-6: obsessed with metrics. Weeks 7-12: proud of audit results. Weeks 13-18: realizes efficiency metrics hide something | Data-heavy, uses numbers, comic relief |

### Ministry Policies & Regulations

- **Regulation 14-C**: Approved vocabulary usage in public spaces
- **Form 77-B**: Community activity registration (the form 4488's neighbor should have filed)
- **Directive 2031.4**: Schedule modification protocol (cited when Tuesday activities vanished)
- **Wellness Protocol 9**: "Voluntary" check-in for citizens flagged with communication irregularities
- **Harmony Conduct Code**: Rules for posting on the platform itself

### Cultural Details

- Approved beverages: "clarity tea" (served at 10:00 and 15:00)
- Approved music: "Synthetic Serenity" playlist (the login music!)
- Community slogans: Rotate weekly ("Harmony Starts With You", "Clear Words, Clear Minds")
- Credit system: Citizens earn "harmony credits" for compliance
- Weekly compliance scores: Posted publicly, creates social pressure

---

## 3. Content Types (7 Post Types)

### 1. Citizen Posts (existing, enhanced)
Regular NPC posts about daily life, enriched with world-bible references. Each post naturally uses 3-5 target/review words.

> *Another long day at Central Filing Hall. I should complete my review of the priority queue before the schedule changes at 15:00, but I cannot identify which cases to process first. At least clarity tea is ready. I need to maintain my energy. — WA-07*

### 2. Ministry Bulletins (new) — Reading Comprehension
Official announcements, 300-500 characters. Formal notices with headers, reference numbers, policy citations. Each includes 2-3 inline comprehension MCQs.

> *MINISTRY BULLETIN — REF: MB-2031-W03*
> *The Department of Community Scheduling confirms that Sector 4 Community Center will maintain a revised activity schedule effective immediately...*
>
> Q1: "What should citizens who attended Tuesday sessions do?"
> Q2: "Who approved the schedule changes?"

### 3. PEARL Wellness Tips (new) — Grammar Rules as Policy
PEARL posts "communication guidance" that teaches grammar rules in-character. The grammar lesson IS the post.

> *P.E.A.R.L. COMMUNICATION TIP #14*
> *Approved sentence structure reminder: When describing a single citizen's actions, the verb requires an "-s" ending...*

### 4. Community Notices (new) — Vocabulary in Context
Lost & found posts, event announcements, job postings, cafeteria menus, transit updates. World-building that uses target vocabulary naturally.

### 5. Sector Reports (new) — Data-Rich World-Building
Weekly updates from different departments/sectors. Include statistics, compliance scores, efficiency metrics. Citizen-7291 loves these.

### 6. Censure Items (existing, enhanced with cumulative review)
Grammar/vocab/replace MCQs. Now pull from cumulative word pool, not just current week. Tagged with source week.

### 7. Citizen-4488 Thread (existing, enriched)
4488's posts now get NPC responses — other citizens replying with dismissals, PEARL posting warnings. Creates a living narrative thread across weeks.

---

## 4. Architecture — Three Tabs

### Tab 1: Feed (enhanced)
- Ministry Bulletins pinned at top (1-2 per week)
- PEARL Wellness Tips (1 per week)
- NPC citizen posts (4-6 per week)
- Community Notices (2-3 per week)
- Sector Reports (1 per week)
- Student posts interspersed
- Vocabulary highlighting: focus (sky) + recent review (amber) + deep review (subtle underline)
- "NEW" badges on unseen posts
- Comprehension checks expand inline on bulletins

### Tab 2: Review Queue (renamed from "Censure Queue")
- Current-week censure items (5-8)
- Cumulative review items (2-3 from older weeks, tagged "REVIEW: Shift N")
- Progress tracking with mastery indicators
- Correct answers: +0.05 current week, +0.03 review items

### Tab 3: Archives
- **Vocabulary by Week** — Expandable sections per completed week. Each word shows definition, example, mastery bar. Tap for quick recall MCQ
- **Citizen-4488 Case File** — Chronological timeline of all 4488 posts + student's approve/flag decisions
- **Ministry Bulletin Archive** — Past bulletins re-readable, comprehension questions re-attemptable
- **Sector Reports Archive** — Past sector data (students notice discrepancies across weeks)

---

## 5. Content Population Strategy — Hybrid with World Bible

| Content Type | Weeks 1-6 | Weeks 7-12 | Weeks 13-18 |
|-------------|-----------|------------|-------------|
| Citizen Posts | Pre-written (uses world bible) | AI-generated with world bible context | AI + hand-written narrative moments |
| Ministry Bulletins | Pre-written + comprehension Qs | Pre-written Qs, AI body text | Pre-written for climax beats |
| PEARL Tips | Pre-written (matches grammar target) | Pre-written (1 per grammar rule) | Pre-written |
| Community Notices | Pre-written | AI-generated with world bible | AI-generated |
| Sector Reports | Pre-written (establish baseline data) | AI-generated (data shifts as narrative darkens) | Hand-written (data reveals the truth) |
| Censure Items | Pre-written (STATIC_CENSURE_ITEMS) | Hybrid (hand-write new vocab, AI for review) | AI for cumulative review pool |
| Citizen-4488 | Pre-written (existing arc) | Pre-written | Pre-written |

**Estimated authoring per week (after world bible is written):**
- 1 Ministry Bulletin + 2-3 comprehension Qs (~20 min)
- 1 PEARL Wellness Tip (~5 min)
- 1 Citizen-4488 post (~10 min)
- 2-3 Community Notices (~15 min)
- 1 Sector Report (~10 min)
- 5 Censure items for new vocabulary (~30 min)
- AI generates 3-4 supplementary citizen posts automatically

---

## 6. PEARL Ambient Annotations (Client-Side)

Session-based PEARL reactions rendered as pinned cards in the feed:

| Trigger | PEARL Says |
|---------|-----------|
| Student writes 3+ posts | "Your participation has been noted. Continued enthusiasm is valued." |
| 5 correct censure in a row | "Exceptional language accuracy. This has been added to your file." |
| 3 wrong in a row | "Additional review has been scheduled for your benefit, Citizen." |
| Flags Citizen-4488 | "Flag received. Your compliance protects the community." |
| Approves Citizen-4488 | "Noted. Citizens who approve concerning content may receive guidance." |
| First visit after new shift | "New community content available. Your review is expected." |
| Reads 5+ posts without acting | "P.E.A.R.L. has noted your observation period. Active participation is preferred." |

Computed in `frontend/src/utils/pearlAnnotations.ts` from session state. Not persisted to DB.

---

## 7. Technical Changes Summary

### New Files
- `backend/src/data/harmonyWorldBible.ts` — World-building constants
- `backend/src/data/harmonyCharacters.ts` — NPC character definitions with per-week arc data
- `backend/src/data/harmonyBulletins.ts` — Pre-written Ministry Bulletins with comprehension questions
- `frontend/src/components/terminal/apps/HarmonyFeed.tsx` — Extracted feed tab
- `frontend/src/components/terminal/apps/HarmonyCensureQueue.tsx` — Extracted review queue
- `frontend/src/components/terminal/apps/HarmonyArchives.tsx` — New archives tab
- `frontend/src/components/terminal/apps/HarmonyBulletin.tsx` — Bulletin card with inline MCQs
- `frontend/src/components/terminal/apps/HarmonyPostCard.tsx` — Extracted post card
- `frontend/src/components/terminal/apps/HarmonyCensureCard.tsx` — Extracted censure card
- `frontend/src/utils/pearlAnnotations.ts` — Client-side PEARL reaction logic

### Modified Files
- `backend/src/data/harmonyFeed.ts` — `getHarmonyReviewContext()` returns cumulative words in three tiers
- `backend/src/utils/harmonyGenerator.ts` — Enhanced prompts referencing world bible, new content type generation, cumulative review censure items
- `backend/src/routes/harmony.ts` — New endpoints for archives, bulletin comprehension responses; enhanced feed endpoint
- `frontend/src/components/terminal/apps/HarmonyApp.tsx` — Slim shell with 3 tabs, delegates to extracted components
- `frontend/src/stores/harmonyStore.ts` — New fields: `hasNewContent`, `archivesData`, `pearlAnnotations`, `activeContentTypes`
- `frontend/src/api/harmony.ts` — New API functions for archives, bulletin responses
- `frontend/src/components/shift-queue/ShiftClosing.tsx` — Triggers Harmony refresh on shift completion
- `frontend/src/components/terminal/TerminalDesktop.tsx` — Notification badge on Harmony tile

### New API Endpoints
- `GET /api/harmony/archives` — Vocabulary flashback + 4488 timeline + bulletin archive
- `POST /api/harmony/bulletins/:id/respond` — Submit bulletin comprehension answer

### Modified Endpoints
- `GET /api/harmony/posts` — Returns all content types interleaved. Cumulative `reviewWords` as three tiers. `hasNewContent` flag.
- `GET /api/harmony/censure-queue` — Includes cumulative review items tagged with source week

### No New Prisma Models Required
The existing `HarmonyPost` model handles all new types via `postType` field + `censureData` JSON. **Exception**: Bulletin comprehension should use a separate `bulletinData` JSON field (see Risk 3 fix below).

---

## 8. Code Review — What's Solid

- **The vision is right.** Current Harmony is thin. The "Daily Prophet" metaphor is a strong design target.
- **"No new Prisma models" is mostly true.** The `postType` string + `censureData` JSON can absorb new types without migration.
- **The world bible approach is pedagogically sound.** Giving AI generation specific locations, policies, and character voices will dramatically improve post quality.
- **Hybrid content strategy is correct.** Pre-written for narrative beats, AI for filler — right call for limited authoring time.

---

## 9. Code Review — What Could Break

### 9.1 `censureData` JSON is being overloaded dangerously
The plan stores bulletin comprehension questions in `censureData.questions[]`, but the current code assumes `censureData` has a fixed shape (`errorWord`, `correction`, `options`, `correctIndex`). The censure response endpoint does `if (isCorrect && censureData?.errorWord) { /* update mastery */ }`. Bulletins with `questions[]` won't crash this path but the **frontend** `CensureItem` interface hardcodes the censure shape. Bulletin comprehension answers need a different response flow.

### 9.2 Mixed content types in feed = polymorphic rendering problem
The current frontend renders every post with the same component. Each new type needs different card layout, interaction model, and `postType` discriminator. This is a significant frontend refactor masked as "just add more post types."

### 9.3 Cumulative censure review scaling
By week 12, the cumulative word pool is 120+ words. The plan doesn't specify: selection algorithm (random? lowest mastery? spaced repetition?), queue length cap, or generation dedup strategy.

### 9.4 Archives tab hits the DB hard
Vocabulary by week with per-word mastery bars + all 4488 posts chronologically + all bulletins with re-attemptable questions. For 30 students, this is 3+ heavy queries per student per Harmony open. Needs pagination or lazy-loading per section.

### 9.5 PEARL annotations require persistence that doesn't exist
Triggers like "5 correct censure in a row" require knowing the sequence of recent answers. Current `censureStats` only tracks `{ total, completed }` — not sequential correctness.

### 9.6 `harmonyConfig` in WeekConfig isn't designed for 7 content types
Current config has `totalPosts`, `cleanPosts`, `grammarErrorPosts`, `concerningPosts`, `propagandaPosts`. Doesn't cover bulletins, notices, tips, sector reports.

### 9.7 Condensed narrative route not accounted for
The entire design assumes linear 1-18 week progression. The condensed route plays only 9 weeks (`[1, 2, 3, 5, 6, 11, 14, 16, 18]`), skipping 9 weeks. This breaks NPC arc pacing (characters jump from "genuinely happy" at week 6 to "monitoring pressure" at week 11), creates gaps in the Citizen-4488 timeline, inflates cumulative review pool estimates (condensed students have ~50% of the vocabulary at any given week number), and means pre-written content for weeks 7-10, 12-13, 15, 17 would be generated but never seen. Harmony generation, archive queries, and all content authoring must be route-aware. See Section 16 for detailed analysis.

---

## 10. Code Review — What's Missing

1. **No content moderation strategy** — Student posts auto-approve after 2-5s. A student posting "lol this is boring" next to a formal sector report breaks immersion.
2. **No read-tracking for "NEW" badges** — No `lastSeenAt` or `readPosts` tracking exists anywhere.
3. **No notification badge infrastructure** — TerminalDesktop renders static tiles with no polling or socket event for new content.
4. **Character arc continuity in AI generation** — No mechanism prevents AI from generating a week-3 post where Citizen-2104 sounds worried (should be genuinely happy in weeks 1-6).
5. **No mastery differentiation for review items** — Plan says +0.03 for review vs +0.05 for current, but backend applies flat +0.05 unconditionally.
6. **Vocabulary highlighting for 3 tiers** — `getHarmonyReviewContext()` only returns 2 arrays (`focusWords`, `reviewWords`). Third tier not defined.
7. **No route-awareness in Harmony** — `harmonyGenerator.ts` and `harmony.ts` routes have zero references to `narrativeRoute`. Generation, queries, and archives all assume every student plays weeks 1-18 in order. Condensed-route classes (~9 weeks) would see content for weeks they never played and miss bridging context for skipped arcs.

---

## 11. Code Review — What's Not Being Recognized

1. **This is 3 separate features bundled as one.** Cumulative review, world-building content engine, and archives tab should be independently deployable PRs.
2. **Authoring time estimate is optimistic.** ~90 min/week assumes WeekConfig exists for that week. Weeks 4-6 configs aren't built yet. Dependency chain: WeekConfig -> world bible entries -> authored posts -> AI supplement.
3. **Lazy generation doesn't scale to 7 content types.** First student to open Harmony in week 12 triggers generation of ~100+ posts across all types. Needs background generation or per-type generation.

---

## 12. Concrete Fixes for Main Risks

### Fix 1: Ship 3 Independent PRs

**Phase A — Cumulative Review** (no new UI, no new content types)
- Update `getHarmonyReviewContext()` to return 3 tiers
- Add review items to censure queue from older weeks
- Update `VocabWord` component for 3 highlight tiers
- Update mastery increment logic (+0.05 current, +0.03 review)

**Phase B — World-Building Content** (new post types, world bible)
- Add `harmonyWorldBible.ts` + `harmonyCharacters.ts`
- Add new `postType` values + frontend card components
- Refactor feed to use discriminated union rendering

**Phase C — Archives + Polish** (new tab, badges, annotations)
- Archives tab, NEW badges, PEARL annotations

Each phase has its own PR, verification checklist, and can be rolled back independently.

### Fix 2: Character-Aware Arc Consistency

Structure `harmonyCharacters.ts` with per-week prompt fragments:

```ts
export interface HarmonyCharacter {
  id: string;           // "Citizen-2104"
  role: string;         // "Model employee"
  voiceRules: string;   // permanent voice description
  arcPhases: {
    weeks: [number, number];  // [1, 6], [7, 12], [13, 18]
    mood: string;
    promptFragment: string;   // injected into AI prompt
    examplePost: string;      // one-shot example for tone
  }[];
}
```

Change `buildGenerationPrompt()` to generate **one post per character** (5 targeted AI calls) instead of "three feed posts from anyone" (1 monolithic call). Each call is smaller, character-constrained, and arc-consistent.

For static/pre-written weeks (1-6), don't generate at all — add pre-authored posts directly.

### Fix 3: Frontend Discriminated Union + Component Registry

**Expand API types:**
```ts
export type HarmonyPostType =
  | 'feed' | 'bulletin' | 'pearl_tip'
  | 'community_notice' | 'sector_report'
  | 'censure_grammar' | 'censure_vocab' | 'censure_replace';

export interface HarmonyPost {
  // ... existing fields
  postType: HarmonyPostType;
  bulletinData?: {           // only when postType === 'bulletin'
    refNumber: string;
    questions: BulletinQuestion[];
  };
}
```

**Component registry instead of if/else:**
```tsx
const POST_COMPONENTS: Record<string, React.FC<{ post: HarmonyPost }>> = {
  feed:              HarmonyPostCard,
  bulletin:          HarmonyBulletin,
  pearl_tip:         HarmonyPearlTip,
  community_notice:  HarmonyNoticeCard,
  sector_report:     HarmonySectorReport,
};

// In render:
{posts.map(post => {
  const Component = POST_COMPONENTS[post.postType] ?? HarmonyPostCard;
  return <Component key={post.id} post={post} />;
})}
```

**Bulletin comprehension uses separate `bulletinData` JSON**, NOT overloaded `censureData`. Separate response endpoint, separate frontend flow.

### Fix 4: Missing Persistence

**NEW badges — single timestamp on Pair model:**
```prisma
model Pair {
  lastHarmonyVisit  DateTime?
}
```
On `GET /harmony/posts`, update timestamp. Return `hasNewContent: true` if any post `createdAt > lastHarmonyVisit`. Frontend checks once on terminal mount via `GET /harmony/has-new`.

**PEARL annotations — track sequences in store:**
```ts
// harmonyStore.ts
recentCensureResults: boolean[]  // push isCorrect after each response
```
Check `results.slice(-5).every(Boolean)` for streak. Resets on refresh (session-based per the plan).

**Notification badge — socket event:**
When `ensureHarmonyPostsExist()` creates posts, emit `harmony:new-content` to the class room. Frontend handler sets `hasNewContent = true`. Cleared when student opens Harmony.

### Fix 5: Cumulative Censure Scaling

**Selection: lowest mastery first, capped at 3 review items:**
```ts
const masteryScores = await prisma.pairDictionaryProgress.findMany({
  where: { pairId, dictionaryWord: { word: { in: reviewWords } } },
  include: { dictionaryWord: true },
});
const weakest = masteryScores
  .sort((a, b) => a.mastery - b.mastery)
  .slice(0, 3);
```
Weak words resurface, mastered words don't. Queue cap: 8 current + 3 review = 11 max.

### Fix 6: `harmonyConfig` Shape

Don't redesign. Use defaults in the generator:
```ts
const DEFAULT_CONTENT_COUNTS: Record<string, number> = {
  feed: 5, bulletin: 1, pearl_tip: 1,
  community_notice: 2, sector_report: 1,
  censure_grammar: 2, censure_vocab: 2, censure_replace: 1,
};
```
Existing `harmonyConfig` stays for backward compat. Generator checks it first, falls back to defaults.

---

## 13. Implementation Phases (Revised)

### Phase A: Cumulative Review (standalone PR)
1. Update `getHarmonyReviewContext()` — 3-tier vocabulary (focus / recent / deep)
2. **Route-aware vocabulary pool** — look up student's `class.narrativeRoute`, filter cumulative words to only weeks in that route's `weeks[]` array. Condensed students at week 11 review from `[1,2,3,5,6]`, not `[1-10]`.
3. Update `VocabWord` component — 3 highlight styles
4. Cumulative censure queue — lowest-mastery review items from older weeks, capped at 3
5. Differentiated mastery scoring (+0.05 current, +0.03 review)
6. **Verify:** Login at week 3 -> vocab chips show W1+W2+W3 in three tiers. Queue includes items tagged "REVIEW: Shift 1". Condensed-route student at week 11 sees review items from W1-W3+W5+W6 only (not W4, W7-W10).

### Phase B: World-Building Content Engine (standalone PR)
1. Write `harmonyWorldBible.ts` + `harmonyCharacters.ts`
2. **Route-aware NPC arcs** — `HarmonyCharacter.arcPhases` keyed by route milestones, not absolute weeks. Add `condensedArcPhases` or use a `routePhaseMap` so character mood/tone resolves correctly when condensed students jump from week 6→11. See Section 16 for detail.
3. **Route-aware generation** — `ensureHarmonyPostsExist()` checks `class.narrativeRoute` and only generates for weeks in that route. Pre-written content tagged with `routeScope: 'all' | 'full' | 'condensed'`.
4. **Condensed bridging Harmony posts** — for NPC characters and Citizen-4488, write short "catch-up" posts that appear when condensed students arrive at a week after a gap (mirrors how bridging briefings work for shift content).
5. Add new `postType` values to backend generator
6. Pre-write canonical content for weeks 1-6 (bulletins, tips, notices, reports)
7. Frontend: discriminated union types + component registry
8. `HarmonyBulletin.tsx` with inline comprehension MCQs + separate `bulletinData` field
9. `HarmonyPearlTip.tsx`, `HarmonyNoticeCard.tsx`, `HarmonySectorReport.tsx`
10. Decompose `HarmonyApp.tsx` into sub-components (Feed, CensureQueue shells)
11. **Verify:** Feed shows Ministry Bulletin -> tap "Test Understanding" -> MCQs expand inline. Posts reference specific locations/policies from world bible. Condensed-route student at week 11 sees bridging Harmony posts that cover skipped arc beats, NOT raw week 7-10 content.

### Phase C: Archives + Polish (standalone PR)
1. `HarmonyArchives.tsx` — vocabulary flashback, 4488 timeline, bulletin archive
2. `GET /api/harmony/archives` endpoint with lazy-loading per section
3. **Route-scoped archives** — vocabulary-by-week sections only show weeks in the student's route. 4488 timeline shows route-relevant posts + any condensed bridging posts. Bulletin archive filtered to route weeks.
4. Add `lastHarmonyVisit` to Pair model (migration)
5. "NEW" badges on unseen posts
6. Notification badge on Harmony tile via socket event
7. PEARL ambient annotations (session-based store tracking)
8. Auto-refresh on shift completion
9. **Verify:** Third tab shows vocabulary by week with mastery bars. 4488 timeline grows weekly. Badge appears after shift completion. Condensed-route student's archives show only 9 week sections (not 18), with 4488 bridging entries filling narrative gaps.

---

## 14. Verification Plan

1. **Cumulative review:** Log in at week 3 -> vocabulary chips show W1+W2+W3 in three tiers
2. **Review censure:** Queue includes items from W1/W2 tagged "REVIEW: Shift 1"
3. **Auto-refresh:** Complete shift -> Harmony tile shows badge -> new content loads
4. **Bulletins:** Feed shows Ministry Bulletin -> tap "Test Understanding" -> MCQs expand inline
5. **Archives:** Third tab shows vocabulary by week with mastery bars, 4488 timeline, bulletin archive
6. **PEARL annotations:** Get 5 correct censure items -> PEARL card appears at top of feed
7. **World depth:** Posts reference specific locations, policies, characters from world bible
8. **Condensed route — cumulative review:** Condensed student at week 11 -> review pool draws from W1-W3+W5+W6 only, NOT W4 or W7-W10
9. **Condensed route — feed content:** Condensed student at week 11 -> feed shows bridging Harmony posts covering skipped arcs, no raw W7-W10 content visible
10. **Condensed route — NPC arcs:** Condensed student at week 11 -> Citizen-2104 tone matches "noticing things" mood (not still "genuinely happy" from W6 or sudden "cracks show" from W13+)
11. **Condensed route — archives:** Condensed student archives show 9 week sections, 4488 timeline includes bridging entries, no orphaned content from skipped weeks
12. **Build:** `npm run build` passes in both `frontend/` and `backend/`

---

## 15. Dependencies & Blockers

- **WeekConfig for weeks 4-6 must exist before authoring Harmony content for those weeks.** Build configs from `Dplan/Weeks_04_06_Shift_Plan.md` first.
- **Phase A has no blockers** — can start immediately with existing week 1-3 data. Route-awareness adds a query join to `class.narrativeRoute` but doesn't require new content.
- **Phase B requires world bible authoring** (~2-3 hours one-time to write `harmonyWorldBible.ts`). Condensed bridging Harmony posts add ~30 min per gap point (4 gaps × 5 characters = 20 bridging posts, though not every character needs one at every gap).
- **Phase C requires Phase B** (archives display content types that Phase B creates).
- **Condensed route is already in production** — `Class.narrativeRoute` field exists, teacher can set it in ClassManager. Route-awareness in Harmony is not optional/future work; it must ship with each phase.

---

## 16. Condensed Narrative Route — Harmony Impact Analysis

The condensed route (`[1, 2, 3, 5, 6, 11, 14, 16, 18]`) is a class-level setting already live in production. Harmony currently has **zero route-awareness** — `harmonyGenerator.ts` and `harmony.ts` never check `class.narrativeRoute`. Every piece of the Harmony expansion must account for both routes.

### 16.1 How the Routes Diverge

| Full Route Week | Condensed? | Gap Impact on Harmony |
|-----------------|------------|----------------------|
| 1, 2, 3 | Yes | No gap — identical experience |
| 4 | **Skipped** | Minor — 1 week of NPC posts + vocabulary missed |
| 5, 6 | Yes | Bridging post covers W4 gap |
| 7, 8, 9, 10 | **Skipped** | Major — 4 weeks of escalation arc. NPC characters transition from Act I to Act II. 4488's neighbor disappearance deepens. ~40 vocabulary words unseen. |
| 11 | Yes | Needs heavy bridging — student arrives mid-Act-II |
| 12, 13 | **Skipped** | Moderate — monitoring pressure builds |
| 14 | Yes | Bridging post covers W12-W13 |
| 15 | **Skipped** | Moderate — public statement arc |
| 16 | Yes | Bridging post covers W15 |
| 17 | **Skipped** | Minor — pre-finale setup |
| 18 | Yes | Bridging post covers W17 |

### 16.2 NPC Arc Pacing for Condensed Route

The 5 NPC characters have 3-phase arcs defined by absolute week ranges (1-6 / 7-12 / 13-18). Condensed students experience these phases compressed:

| Phase | Full Route | Condensed Route | Condensed Duration |
|-------|-----------|----------------|-------------------|
| Act I: Normal | Weeks 1-6 (6 shifts) | Weeks 1-3, 5-6 (5 shifts) | Close to full — works fine |
| Act II: Cracks | Weeks 7-12 (6 shifts) | Week 11 only (1 shift) | **Severely compressed** — needs bridging |
| Act III: Collapse | Weeks 13-18 (6 shifts) | Weeks 14, 16, 18 (3 shifts) | Half-speed — manageable with bridging |

**Solution: Route-aware arc resolution in `harmonyCharacters.ts`**

```ts
export interface HarmonyCharacter {
  id: string;
  role: string;
  voiceRules: string;
  arcPhases: ArcPhase[];           // used for full route
  condensedArcPhases?: ArcPhase[]; // override for condensed route
}

// Resolution function
function getCharacterPhase(char: HarmonyCharacter, weekNumber: number, route: NarrativeRouteId): ArcPhase {
  const phases = (route === 'condensed' && char.condensedArcPhases) || char.arcPhases;
  return phases.find(p => weekNumber >= p.weeks[0] && weekNumber <= p.weeks[1])!;
}
```

For condensed, the Act II phase for each character is rewritten as a single concentrated beat at week 11, rather than a gradual 6-week arc. Example:
- **Citizen-2104 (full W7-12):** Slowly notices inconsistencies, self-corrects each time
- **Citizen-2104 (condensed W11):** Posts about "several recent observations" — compresses the noticing into one reflective post with bridging context

### 16.3 Citizen-4488 Timeline — Condensed Handling

4488's arc is the emotional spine of the narrative. Condensed students skip weeks where key 4488 events happen. Two options:

**Option A: Bridging 4488 Posts (recommended)**
Write dedicated condensed-only 4488 posts that appear when a condensed student arrives at a week after a gap. These summarize what happened in 4488's world during skipped weeks:

```ts
// In harmonyCharacters.ts or a dedicated 4488 arc file
export const CITIZEN_4488_BRIDGING: Record<number, { route: 'condensed'; post: string }[]> = {
  11: [{ route: 'condensed', post: "I haven't posted in a while. They said my neighbor was transferred. Three more people from my tower are gone now. The community board says they volunteered for a new program. I did not know there was a program. Everything is fine." }],
  14: [{ route: 'condensed', post: "They removed the bench outside Tower 12. The one where we used to sit. Someone painted over the names on the memorial wall. I asked about it and was told there was never a memorial wall. Everything is fine." }],
  // ...
};
```

These bridging posts appear in the feed AND the Archives 4488 Case File, labeled with a subtle "Filed during off-shift period" tag.

**Option B: Show all 4488 posts regardless of route**
Since 4488's posts are narrative-only (no vocabulary dependency), show them all — even from weeks the student didn't play. The Archives timeline would be complete, and the "gaps" in the student's awareness become part of the experience (they missed things while off-shift, just like 4488's neighbors went missing).

Option A is recommended because it's more intentional and avoids vocabulary in 4488 posts that condensed students haven't learned.

### 16.4 Content Generation — Route Filtering

`ensureHarmonyPostsExist()` currently generates for all weeks up to `currentWeekNumber`. For route-awareness:

```ts
async function ensureHarmonyPostsExist(classId: number, currentWeek: number) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { narrativeRoute: true } });
  const route = getNarrativeRoute(cls?.narrativeRoute);
  const weeksToGenerate = route.weeks.filter(w => w <= currentWeek);

  for (const week of weeksToGenerate) {
    // Generate content only for weeks in this class's route
    await generateWeekContent(classId, week, route.id);
  }
}
```

Pre-written static content (bulletins, 4488 posts, sector reports) should be tagged:
- `routeScope: 'all'` — appears in both routes (most content)
- `routeScope: 'full'` — only appears for full-route classes
- `routeScope: 'condensed'` — bridging content only for condensed classes

### 16.5 Cumulative Review Pool — Route-Scoped

The review doc estimates 120+ words by week 12. Condensed students at week 11 have vocabulary from only 6 weeks (~60 words). The mastery-based selection (Fix 5) handles this gracefully — smaller pool just means fewer candidates — but the query must filter:

```ts
const route = getNarrativeRoute(cls?.narrativeRoute);
const completedWeeks = route.weeks.filter(w => w < currentWeek);

const reviewWords = await prisma.dictionaryWord.findMany({
  where: { weekNumber: { in: completedWeeks } },
  // ...
});
```

### 16.6 Ministry Bulletins & Sector Reports — Self-Contained Content

Pre-written bulletins and sector reports must NOT reference events from skipped weeks. Two strategies:

1. **Write self-contained:** Each bulletin/report stands alone — references "recent changes" not "last week's Directive update." This works for most content and reduces authoring burden.
2. **Route-conditional variants:** For narrative-critical bulletins (e.g., the week-11 bulletin that establishes Act II monitoring), write a condensed variant that provides more context. Tag with `routeScope`.

Strategy 1 is preferred for most content. Strategy 2 only needed for ~3-4 pivotal bulletins.

### 16.7 Authoring Overhead

Condensed route adds to the authoring budget:
- ~20 bridging Harmony posts (5 characters × 4 gap points, not all need one) — **~2 hours one-time**
- ~4-5 Citizen-4488 bridging posts — **~30 min one-time**
- ~3-4 condensed-variant bulletins — **~30 min one-time**
- Self-contained writing discipline for all other content — **no extra time, just awareness**

Total: ~3 hours one-time, folded into Phase B world bible authoring.
