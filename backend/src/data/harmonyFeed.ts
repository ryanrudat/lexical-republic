import { getStoryPlan } from './storyPlans';
import { getWeekConfig } from './week-configs';
import { getRouteWeeks } from './narrative-routes';

export type HarmonySeedPost = {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  pearlNote: string;
  postType?: string;
  censureData?: Record<string, unknown>;
};

/** Extract target words for a single week from WeekConfig or StoryPlan. */
function getWordsForWeek(weekNumber: number): string[] {
  const config = getWeekConfig(weekNumber);
  if (config) return config.targetWords;
  const story = getStoryPlan(weekNumber);
  return story?.newWords ?? [];
}

/**
 * Returns 3-tier vocabulary for Harmony display, scoped to the class's narrative route.
 * - focus: current week's target words
 * - recentWords: previous 2 route-weeks
 * - deepReviewWords: all older route-weeks
 */
export function getHarmonyReviewContext(weekNumber: number, routeId: string = 'full') {
  const routeWeeks = getRouteWeeks(routeId);
  const currentIdx = routeWeeks.indexOf(weekNumber);

  // Focus: current week
  const focusWords = getWordsForWeek(weekNumber);

  // Recent: previous 1-2 route-weeks
  const recentStart = Math.max(0, currentIdx - 2);
  const recentWeeks = currentIdx > 0
    ? routeWeeks.slice(recentStart, currentIdx)
    : [];
  const recentWords = recentWeeks.flatMap(w => getWordsForWeek(w));

  // Deep: everything older than recent in the route
  const deepWeeks = recentStart > 0
    ? routeWeeks.slice(0, recentStart)
    : [];
  const deepReviewWords = deepWeeks.flatMap(w => getWordsForWeek(w));

  return {
    currentWeekNumber: weekNumber,
    focusWords,
    recentWords,
    deepReviewWords,
  };
}

export const HARMONY_SEED_POSTS: HarmonySeedPost[] = [
  // ── Week 1: Target words — arrive, follow, check, report, submit, approve, describe, assign, standard, confirm
  {
    id: 'harmony-w1-briefing',
    weekNumber: 1,
    authorLabel: 'Citizen-2104',
    content:
      'I arrived early and followed every step on the checklist. My supervisor confirmed my assignment before I could submit anything. The standard is clear: check your work twice.',
    pearlNote: 'Shift 1 review feed: target words (arrive, follow, check, confirm, submit, standard) in circulation.',
  },
  {
    id: 'harmony-w1-workflow',
    weekNumber: 1,
    authorLabel: 'CA-18',
    content:
      'New associates: always check each line before you submit. My mentor described the process and I followed it exactly. Once the supervisor approved my report, my assignment was confirmed.',
    pearlNote: 'Shift 1 review feed: target words (check, submit, describe, follow, approve, report, confirm, assign) plus support words.',
  },
  {
    id: 'harmony-w1-c4488',
    weekNumber: 1,
    authorLabel: 'Citizen-4488',
    content:
      'Has anyone seen my neighbor? She always arrive at the community center on Tuesday, but her chair was empty this week. I am sure she is fine. The Ministry takes care of everyone. I should not worry.',
    pearlNote: 'Community post from Citizen-4488 — deliberate grammar error (arrive → arrives).',
  },
  {
    id: 'harmony-w1-routine',
    weekNumber: 1,
    authorLabel: 'WA-15',
    content:
      'I always follow the standard checklist. Today I had to describe an unusual document to my supervisor. She approved it after a careful check. Another productive day.',
    pearlNote: 'Shift 1 review feed: target words (follow, standard, describe, approve, check).',
  },
  {
    id: 'harmony-w1-pride',
    weekNumber: 1,
    authorLabel: 'Citizen-5502',
    content:
      'My first assignment is complete. I arrived on time, checked every document, and submitted my report before noon. The supervisor confirmed my work meets the standard. I feel proud.',
    pearlNote: 'Shift 1 review feed: target words (arrive, check, submit, report, confirm, standard).',
  },
  {
    id: 'harmony-w1-advice',
    weekNumber: 1,
    authorLabel: 'CA-09',
    content:
      'Reminder for new associates: always confirm your assignment number before you submit. If you follow the steps and check twice, your reports will be approved every time.',
    pearlNote: 'Shift 1 review feed: target words (confirm, assign, submit, follow, check, report, approve).',
  },
  // ── Week 2: Target words — notice, compare, replace, update, request, remove, change, include, require, inform
  // Review words — arrive, follow, check, report, submit, approve, describe, assign, standard, confirm
  {
    id: 'harmony-w2-revision',
    weekNumber: 2,
    authorLabel: 'Citizen-3319',
    content:
      'I noticed the update immediately. The new version removed two lines and replaced them with shorter text. I compared both documents and requested clarification, but no one informed me who required the change.',
    pearlNote: 'Shift 2 review feed: target words (notice, update, remove, replace, compare, request, inform, require, change).',
  },
  {
    id: 'harmony-w2-records',
    weekNumber: 2,
    authorLabel: 'CA-31',
    content:
      'When I check updated records, I compare every line against the approved standard. If something was removed, I include the original text in my report and request a review before I submit.',
    pearlNote: 'Shift 2 review feed: target words (update, compare, remove, include, report, request, review, submit) with Week 1 carryover (check, approved, standard).',
  },
  {
    id: 'harmony-w2-c4488',
    weekNumber: 2,
    authorLabel: 'Citizen-4488',
    content:
      'I noticed the community center updated its schedule. Tuesday activities were removed. My neighbor used to attend on Tuesdays. I requested information but no one informed me of changes. Everything is fine. Change is normal.',
    pearlNote: 'Community post from Citizen-4488 — target words (notice, update, remove, request, inform, change).',
  },
  // ── Week 3: Target words — process, complete, review, delay, schedule, respond, identify, separate, maintain, forward
  // Review words — notice, compare, replace, update, request, remove, change, include, require, inform
  {
    id: 'harmony-w3-queue',
    weekNumber: 3,
    authorLabel: 'Citizen-7291',
    content:
      'I completed my review on schedule, but no one responded when I tried to identify who changed the process. The delay was short. I forwarded my report and maintained my position in the queue.',
    pearlNote: 'Shift 3 review feed: target words (complete, review, schedule, respond, identify, change, process, delay, forward, maintain).',
  },
  {
    id: 'harmony-w3-dispatch',
    weekNumber: 3,
    authorLabel: 'CA-22',
    content:
      'You should review each case separately before you process it. If you notice a delay, respond quickly and forward the details. Do not include anything that requires a separate update.',
    pearlNote: 'Shift 3 review feed: target words (review, separate, process, notice, delay, respond, forward, include, require, update) with Week 2 carryover.',
  },
  {
    id: 'harmony-w3-c4488',
    weekNumber: 3,
    authorLabel: 'Citizen-4488',
    content:
      'The community center schedule was updated again. All Tuesday and Thursday activities have been removed. I cannot identify who approved these changes. I should not delay my own schedule to ask questions. Delays cause problems for everyone.',
    pearlNote: 'Community post from Citizen-4488 — target words (schedule, update, remove, identify, approve, delay).',
  },
];
