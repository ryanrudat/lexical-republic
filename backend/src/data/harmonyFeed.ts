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
    id: 'harmony-w1-2104',
    weekNumber: 1,
    authorLabel: 'Citizen-2104',
    content:
      'The morning light arrived through my tower window at 06:14 today. I followed my standard routine — tea, desk check, walking route to Filing Hall. I cannot describe how satisfying a confirmed schedule feels. Some people find routine boring. I find it beautiful.',
    pearlNote: 'Citizen-2104 demonstrates consistent positive engagement. Target words: arrive, follow, standard, check, describe, confirm.',
  },
  {
    id: 'harmony-w1-0018',
    weekNumber: 1,
    authorLabel: 'Citizen-0018',
    content:
      'New associates: do not just follow the checklist. Understand it. When I was assigned to Filing Hall, my mentor described each step like it mattered. Check your documents the way you would check on a friend. Submit work you would approve yourself.',
    pearlNote: 'Citizen-0018 provides procedural guidance. Target words: follow, assign, describe, check, submit, approve.',
  },
  {
    id: 'harmony-w1-4488',
    weekNumber: 1,
    authorLabel: 'Citizen-4488',
    content:
      'My neighbor kept herbs on her windowsill and a small gray cat. She always arrive at the standard time for Tuesday calligraphy. I can describe her routine exactly. Her chair was empty this week. The herbs are dying. The cat still waits by her door. I should not worry.',
    pearlNote: 'Community post from Citizen-4488. Deliberate grammar error: "arrive" should be "arrives" (present simple, third person).',
  },
  {
    id: 'harmony-w1-4488-b',
    weekNumber: 1,
    authorLabel: 'Citizen-4488',
    content:
      'Tuesday quiet today. No calligraphy class assigned to my block. My neighbor\'s cat still sit on her step by the empty door. I bring water in the small dish. I follow the approved path back. I did not report this. It is standard. Some things do not need a form.',
    pearlNote: 'Community post from Citizen-4488. Deliberate grammar error: "cat still sit" should be "sits" (present simple, third person).',
  },
  {
    id: 'harmony-w1-0007',
    weekNumber: 1,
    authorLabel: 'Citizen-0007',
    content:
      "The lady in Cafeteria Block 7 — the one with the glasses — slipped me an extra bread roll at lunch. Should I report it? It's not standard procedure, right? I'll check the handbook later. I just want to submit my last three files and go home. My feet hurt.",
    pearlNote: 'Citizen-0007 discusses non-standard cafeteria interaction. Target words: report, standard, check, submit.',
  },
  {
    id: 'harmony-w1-5502',
    weekNumber: 1,
    authorLabel: 'Citizen-5502',
    content:
      'First week complete. I arrived not knowing anyone and now I can describe the exact sound the Filing Hall printer makes at 14:00. My assignment was confirmed before lunch. My mother would be proud. I should check if she got my letter.',
    pearlNote: 'New associate Citizen-5502 settling in. Target words: arrive, describe, assignment, confirm, check.',
  },
  {
    id: 'harmony-w1-0009',
    weekNumber: 1,
    authorLabel: 'Citizen-0009',
    content:
      'I always check Tower 12\'s notice board on my way to work. Someone drew a small bird on the standard memo. No one reported it. No one will. I followed the approved path and smiled the whole way. Some things do not need a form.',
    pearlNote: 'Citizen-0009 references unapproved artwork on public notices. Noted. Target words: check, standard, report, follow, approve.',
  },

  // ── Week 2: Target words — notice, compare, replace, update, request, remove, change, include, require, inform
  // Review words — arrive, follow, check, report, submit, approve, describe, assign, standard, confirm
  {
    id: 'harmony-w2-3319',
    weekNumber: 2,
    authorLabel: 'Citizen-3319',
    content:
      'I noticed the Community Soup changed from Mild Vegetable to Ginger Corn. Nobody was informed. I checked yesterday\'s menu and compared — three items were removed. I updated my log. Some people do not notice. I always notice.',
    pearlNote: 'Citizen-3319 tracks cafeteria changes. Target words: notice, change, inform, compare, remove, update. Review: check (W1).',
  },
  {
    id: 'harmony-w2-0031',
    weekNumber: 2,
    authorLabel: 'Citizen-0031',
    content:
      'The knitting circle requested cream-colored yarn again. The supply update removed cream and replaced it with standard gray. No one was informed why. I included a note in my log. Some changes require no explanation. That is what they tell us.',
    pearlNote: 'Citizen-0031 documents supply changes to approved hobby materials. Target words: request, update, remove, replace, inform, include, change, require. Review: standard (W1).',
  },
  {
    id: 'harmony-w2-4488',
    weekNumber: 2,
    authorLabel: 'Citizen-4488',
    content:
      "I noticed the community center updated its schedule. Tuesday calligraphy was removed. My neighbor used to attend — her ink stones are still on the shelf. Nobody informed me of the change. I requested information but heard nothing. The cat follows me home now. Everything is fine.",
    pearlNote: 'Community post from Citizen-4488. Continued reference to absent neighbor. Target words: notice, update, remove, inform, change, request.',
  },
  {
    id: 'harmony-w2-4488-b',
    weekNumber: 2,
    authorLabel: 'Citizen-4488',
    content:
      "I noticed — I mean, observed — a detail. The knitting circle replaced cream yarn with gray. My former neighbor used to attend. The supply list was updated. Tuesday was already removed. I changed my request. No one informed me. The cat follows standard routes now.",
    pearlNote: 'Community post from Citizen-4488. Self-correction visible ("I noticed — I mean, observed"). Grammar is correct. Target words: notice, replace, update, remove, change, request, inform.',
  },

  // ── Week 3: Target words — process, complete, review, delay, schedule, respond, identify, separate, maintain, forward
  // Review words — notice, compare, replace, update, request, remove, change, include, require, inform
  {
    id: 'harmony-w3-7291',
    weekNumber: 3,
    authorLabel: 'Citizen-7291',
    content:
      'I completed my review on schedule and forwarded the results. Processing time: 3.1 minutes per case. I noticed fewer cases this week but cannot identify why. The delay has increased. I will maintain my metrics and not respond to patterns that are not there.',
    pearlNote: 'Citizen-7291 reports efficiency data. Target words: complete, review, schedule, forward, process, identify, delay, maintain, respond. Review: notice (W2).',
  },
  {
    id: 'harmony-w3-0022',
    weekNumber: 3,
    authorLabel: 'Citizen-0022',
    content:
      "My grandmother's recipe required you to separate the dough carefully and process each piece by hand. She never followed a cookbook — she reviewed every bun by touch. No delays. I maintain that same patience at my desk. Some skills forward across generations.",
    pearlNote: 'Citizen-0022 connects personal heritage to work ethic. Target words: separate, process, review, delay, maintain, forward. Review: require (W2), follow (W1).',
  },
  {
    id: 'harmony-w3-4488',
    weekNumber: 3,
    authorLabel: 'Citizen-4488',
    content:
      "The schedule was updated again. Thursday activities also removed. I cannot identify who approved these changes. I should not delay my own routine to ask. My neighbor's cat sleeps at my door now. I completed the adoption form but no one has responded. Everything is fine.",
    pearlNote: 'Community post from Citizen-4488. Cat adoption form pending — no response expected. Target words: schedule, identify, delay, complete, respond.',
  },
  {
    id: 'harmony-w3-4488-b',
    weekNumber: 3,
    authorLabel: 'Citizen-4488',
    content:
      "Thank you, Ministry, for the updated schedule. I have completed all required forms. My morning routine processes efficiently. I respond to every notice in the standard timeframe. I maintain my desk. I review each memo. I do not delay. Change is normal. Everything is fine.",
    pearlNote: 'Community post from Citizen-4488. Grammar now strict. Tone emotionally flat — internalized compliance voice. Target words: schedule, complete, process, respond, maintain, review, delay.',
  },
];
