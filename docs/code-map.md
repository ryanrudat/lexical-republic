# Code Map — Key Data Files & Utilities

Pointers to the data files and utilities that are referenced often but don't need to sit in the
root [`CLAUDE.md`](../CLAUDE.md). For the full data model and endpoints see
[`architecture.md`](architecture.md); for product systems see [`features.md`](features.md).

## Harmony Data Files
- `backend/src/data/harmonyWorldBible.ts` — 8 locations, 5 regulations, weekly culture, approved media, food culture, domestic life, traditions, children's world, citizen roster (`CORE_CITIZENS` + `BACKGROUND_CITIZENS` with `getActiveCitizens(week)`)
- `backend/src/data/harmonyCharacters.ts` — 5 NPCs with 3-phase arcs + condensed overrides (Citizen-XXXX naming)
- `backend/src/data/harmonyFeed.ts` — 12 character-first seed posts weeks 1-3 with spaced vocabulary recycling (15 once PR #12 lands: adds 2nd 4488 post per week)
- `backend/src/data/harmonyBulletins.ts` — static bulletins weeks 1-3 with comprehension MCQs
- `backend/src/data/harmonyPearlTips.ts` — static PEARL grammar tips weeks 1-3
- `backend/src/data/harmonyCommunityContent.ts` — immersive notices + sector reports weeks 1-3
- `backend/src/data/harmonyVerdictPosts.ts` — `feed_review` verdict-loop posts (Junior Compliance Reviewer)
- `backend/src/data/__tests__/harmony-vocabulary.test.ts` — Vitest suite (34 tests: word coverage, char limits, spaced repetition)
- `backend/src/utils/harmonyMigrations.ts` — startup migration: old authorLabels → Citizen-XXXX
- `frontend/src/data/citizen4488Posts.ts` — frontend shim mirroring 4488 posts for ShiftClosing "Case File Update" card (1 post per week on master; 2 per week once PR #12 lands)

## Task Result & Scoring Utilities
- `frontend/src/types/taskResult.ts` — canonical `TaskResultDetails` shape every task component emits: `{ taskType, itemsCorrect, itemsTotal, category }` + optional `errorsFound/errorsTotal`, `writingText/wordCount`, `vocabUsed`, `answerLog[]`, and the post-rubric fields `onTopic/onTopicReason/vocabScore/vocabMissed/grammarAdvisory/submittedAnyway/isDegraded`
- `frontend/src/utils/scoreAggregator.ts` — pure `aggregateTaskResults()` reducer used by ShiftClosing. Returns per-category `null` when no tasks contributed (no more inflated fallback).
- `frontend/src/utils/scoreAggregator.test.ts` — Vitest suite (15 tests) covering averaging, weighting, skipped-category fallback, legacy-shape graceful handling.
- **Frontend Vitest**: `cd frontend && npm run test` runs the scoreAggregator suite.

- `backend/src/utils/moveEpochs.ts` — per-pair progress-rewrite epochs; long-running writers (writing eval) snapshot + re-check before persisting (added 2026-06-11)
- `backend/src/routes/clarity-check.ts` — `POST /complete` (idempotent mastery) + `GET /completed?weekNumber=` (server-backed one-shot hydration for the frontend gate)
