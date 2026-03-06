import { getStoryPlan } from './storyPlans';

export type HarmonySeedPost = {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  pearlNote: string;
};

export function getHarmonyReviewContext(weekNumber: number) {
  const current = getStoryPlan(weekNumber);
  const previous = getStoryPlan(weekNumber - 1);

  return {
    currentWeekNumber: weekNumber,
    focusWords: current?.newWords ?? [],
    reviewWords: previous?.newWords ?? [],
  };
}

export const HARMONY_SEED_POSTS: HarmonySeedPost[] = [
  {
    id: 'harmony-w1-briefing',
    weekNumber: 1,
    authorLabel: 'Citizen-2104',
    content:
      'Today the onboarding directive was very clear. I copied each protocol step twice so my compliance record would stay clean.',
    pearlNote: 'Shift 1 review feed: focus words in circulation.',
  },
  {
    id: 'harmony-w1-workflow',
    weekNumber: 1,
    authorLabel: 'CA-18',
    content:
      'My supervisor confirmed my assignment and temporary clearance before intake. New associates should check every line before they submit.',
    pearlNote: 'Shift 1 review feed: current lesson vocabulary plus support words.',
  },
  {
    id: 'harmony-w1-c4488',
    weekNumber: 1,
    authorLabel: 'Citizen-4488',
    content:
      'Has anyone seen my neighbor? She always arrive at the community center on Tuesday, but her chair was empty this week. I am sure she is fine. The Ministry takes care of everyone. I should not worry.',
    pearlNote: 'Community post from Citizen-4488',
  },
  {
    id: 'harmony-w2-revision',
    weekNumber: 2,
    authorLabel: 'Citizen-3319',
    content:
      'The latest notice said the revision improved clarity, but the earlier directive included more detail. I noticed the change right away.',
    pearlNote: 'Shift 2 review feed: current words plus Week 1 carryover.',
  },
  {
    id: 'harmony-w2-records',
    weekNumber: 2,
    authorLabel: 'CA-31',
    content:
      'I compare every record against the updated protocol now. If a line is missing, I log the contradiction, note the compliance risk, and wait for clearance to report it.',
    pearlNote: 'Shift 2 review feed: contradiction language recycled in context.',
  },
  {
    id: 'harmony-w2-c4488',
    weekNumber: 2,
    authorLabel: 'Citizen-4488',
    content:
      'I noticed the community center updated its schedule. Tuesday activities were removed. My neighbor used to attend on Tuesdays. I requested information but no one informed me of changes. Everything is fine. Change is normal.',
    pearlNote: 'Community post from Citizen-4488',
  },
  {
    id: 'harmony-w3-queue',
    weekNumber: 3,
    authorLabel: 'Citizen-7291',
    content:
      'The service queue moved faster today, but no one could clarify who changed the priority list. I remember last week\'s notice, and the revision still feels incomplete because one supporting record is missing.',
    pearlNote: 'Shift 3 review feed: queue language with Week 2 review words.',
  },
  {
    id: 'harmony-w3-dispatch',
    weekNumber: 3,
    authorLabel: 'CA-22',
    content:
      'You should verify before dispatch, even when the queue is high. A fast report without clarification can create another contradiction.',
    pearlNote: 'Shift 3 review feed: current focus plus carryover review.',
  },
  {
    id: 'harmony-w3-c4488',
    weekNumber: 3,
    authorLabel: 'Citizen-4488',
    content:
      'The community center schedule was updated again. All Tuesday and Thursday activities have been removed. I cannot identify who approved these changes. I should not delay my own schedule to ask questions. Delays cause problems for everyone.',
    pearlNote: 'Community post from Citizen-4488',
  },
];
