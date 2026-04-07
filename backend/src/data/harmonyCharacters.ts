/**
 * Harmony NPC Character Definitions
 *
 * Each character has a permanent voice and per-phase arc data.
 * The generator uses getCharacterPhase() to inject the correct mood/tone
 * into AI prompts based on the student's week and narrative route.
 */

import type { NarrativeRouteId } from './narrative-routes';

export interface ArcPhase {
  weeks: [number, number];
  mood: string;
  promptFragment: string;
  examplePost: string;
}

export interface HarmonyCharacter {
  id: string;
  role: string;
  voiceRules: string;
  arcPhases: ArcPhase[];
  condensedArcPhases?: ArcPhase[];
}

const HARMONY_CHARACTERS: HarmonyCharacter[] = [
  {
    id: 'Citizen-2104',
    role: 'Model employee',
    voiceRules: 'Formal tone. Uses target vocabulary precisely and naturally. Never questions the system. Attributes success to hard work and compliance. No slang.',
    arcPhases: [
      {
        weeks: [1, 6],
        mood: 'genuinely happy',
        promptFragment: 'Citizen-2104 is genuinely happy and enthusiastic about their work. They celebrate productivity, praise the system, and use target words to describe positive experiences at Central Filing Hall.',
        examplePost: 'Another productive day at Central Filing Hall. I arrived early and confirmed my queue assignments before the morning clarity tea. The standard process is efficient — I describe my workflow to new associates whenever they ask.',
      },
      {
        weeks: [7, 12],
        mood: 'noticing things but self-correcting',
        promptFragment: 'Citizen-2104 occasionally notices something odd — a colleague missing, a memo that changed — but immediately self-corrects with a positive spin. Never dwells on concerns.',
        examplePost: 'I noticed CA-18 was not at their desk this morning. I am sure they are on an approved assignment. The queue was shorter today. Efficiency improvements continue.',
      },
      {
        weeks: [13, 18],
        mood: 'cracks showing',
        promptFragment: 'Citizen-2104 still tries to be positive but sentences are shorter, hedged. Uses phrases like "I believe" instead of declaratives. Slips of concern appear between compliant statements.',
        examplePost: 'Processing continues. I believe the new procedures are... necessary. My compliance score remains satisfactory. That is what matters.',
      },
    ],
    condensedArcPhases: [
      {
        weeks: [1, 6],
        mood: 'genuinely happy',
        promptFragment: 'Citizen-2104 is genuinely happy and enthusiastic about their work. They celebrate productivity and praise the system.',
        examplePost: 'Another productive day at Central Filing Hall. I arrived early and confirmed my queue assignments before the morning clarity tea.',
      },
      {
        weeks: [11, 11],
        mood: 'suddenly noticing — compressed realization',
        promptFragment: 'Citizen-2104 has noticed several things are wrong at once — empty desks, changed memos, missing colleagues. Tries to stay positive but the cracks are visible. This is the compressed Act II beat for condensed route.',
        examplePost: 'Several colleagues have been reassigned this month. The queue changes are... frequent. I maintain my schedule. Compliance scores are still good. I should focus on that.',
      },
      {
        weeks: [14, 18],
        mood: 'cracks showing',
        promptFragment: 'Citizen-2104 still tries to be positive but sentences are shorter, hedged. Slips of concern appear between compliant statements.',
        examplePost: 'Processing continues. I believe the new procedures are necessary. My compliance score remains satisfactory.',
      },
    ],
  },
  {
    id: 'CA-18',
    role: 'Senior mentor',
    voiceRules: 'Advisory tone. References procedures and protocols by name. Teaches by example. Speaks with authority but not warmth. Uses complete sentences.',
    arcPhases: [
      {
        weeks: [1, 6],
        mood: 'helpful authority',
        promptFragment: 'CA-18 gives helpful procedural advice. References specific regulations and forms. Speaks as a senior associate guiding newer citizens through proper channels.',
        examplePost: 'Reminder: Form 77-B must be submitted before any community activity registration. I have processed 200 of these this quarter. Follow the standard procedure and you will have no issues.',
      },
      {
        weeks: [7, 12],
        mood: 'giving veiled warnings',
        promptFragment: 'CA-18 still gives procedural advice but with subtle warnings embedded. Phrases like "I would recommend reviewing..." or "Some associates have found it wise to..." Hints at danger without being explicit.',
        examplePost: 'I would recommend completing your queue before the schedule update. Some associates who delayed their processing found their assignments... reassigned.',
      },
      {
        weeks: [13, 18],
        mood: 'going quiet',
        promptFragment: 'CA-18 posts less frequently. When they do post, messages are brief and procedural with no personal commentary. The warmth and advice are gone.',
        examplePost: 'Queue processing is on schedule.',
      },
    ],
    condensedArcPhases: [
      {
        weeks: [1, 6],
        mood: 'helpful authority',
        promptFragment: 'CA-18 gives helpful procedural advice with references to specific regulations and forms.',
        examplePost: 'Reminder: Form 77-B must be submitted before any community activity registration. Follow the standard procedure and you will have no issues.',
      },
      {
        weeks: [11, 11],
        mood: 'veiled warnings — compressed',
        promptFragment: 'CA-18 drops multiple veiled warnings in one post. References things that have changed, colleagues who are gone. Still speaks procedurally but the subtext is clear.',
        examplePost: 'I would recommend completing all assignments promptly. Several associates who delayed processing have been transferred. Follow regulations closely. That is my advice.',
      },
      {
        weeks: [14, 18],
        mood: 'going quiet',
        promptFragment: 'CA-18 posts rarely. Brief, procedural, no personal commentary.',
        examplePost: 'Queue processing is on schedule.',
      },
    ],
  },
  {
    id: 'Citizen-4488',
    role: 'The dissenter',
    voiceRules: 'Simple sincere A2 English. Self-reassuring. Always ends with a variation of "everything is fine." Grammar errors decrease over time (inverse literacy arc — they learn to self-censor in correct grammar). Mentions neighbors, community, missing things.',
    arcPhases: [
      {
        weeks: [1, 6],
        mood: 'anxious but hopeful',
        promptFragment: 'Citizen-4488 writes about their neighbor who has disappeared. Uses simple grammar with deliberate errors (matching the week\'s grammar target). Ends posts with self-reassurance. References Sector 4 Community Center, Tuesday activities, missing people.',
        examplePost: 'Has anyone seen my neighbor? She always arrive at the community center on Tuesday, but her chair was empty this week. I am sure she is fine. The Ministry takes care of everyone. I should not worry.',
      },
      {
        weeks: [7, 12],
        mood: 'noticing patterns, still reassuring',
        promptFragment: 'Citizen-4488 notices more disappearances and removals. Grammar improves (fewer errors). Self-reassurance becomes more strained. Mentions specific locations and regulations. Still ends with "everything is fine" but the reader can tell it is not.',
        examplePost: 'Three more names were removed from the community board this week. The notice said they volunteered for a new program. I did not know there was a program. The Wellness Pavilion must be very popular. Everything is fine.',
      },
      {
        weeks: [13, 18],
        mood: 'self-censoring, grammar perfect',
        promptFragment: 'Citizen-4488\'s grammar is now perfect — they have learned to self-censor. Posts are shorter, more careful. The anxiety is still there but expressed through what is NOT said. Ends with compliance statements rather than "everything is fine."',
        examplePost: 'I have no concerns to report. My schedule is normal. The community center operates as expected. I appreciate the Ministry\'s continued guidance.',
      },
    ],
    condensedArcPhases: [
      {
        weeks: [1, 6],
        mood: 'anxious but hopeful',
        promptFragment: 'Citizen-4488 writes about their missing neighbor. Simple grammar with deliberate errors. Self-reassuring endings.',
        examplePost: 'Has anyone seen my neighbor? She always arrive at the community center on Tuesday, but her chair was empty this week. I should not worry.',
      },
      {
        weeks: [11, 11],
        mood: 'compressed realization — multiple disappearances',
        promptFragment: 'Citizen-4488 reveals that many people have gone missing during the weeks the student was away. Grammar is improving. Several neighbors, the community board has been cleared, Wellness Pavilion mentioned. Self-reassurance is strained.',
        examplePost: 'I have not posted in a while. Three more people from my tower are gone now. The community board says they volunteered for a new program. I did not know there was a program. Everything is fine.',
      },
      {
        weeks: [14, 18],
        mood: 'self-censoring, grammar perfect',
        promptFragment: 'Citizen-4488\'s grammar is now perfect. Posts are careful and compliant. The anxiety is expressed through what is NOT said.',
        examplePost: 'I have no concerns to report. My schedule is normal. I appreciate the Ministry\'s continued guidance.',
      },
    ],
  },
  {
    id: 'WA-07',
    role: 'Tired worker',
    voiceRules: 'Casual tone. Uses contractions. Complains within approved limits. Relatable — talks about being tired, the cafeteria food, long queues. Occasionally uses informal language that gets PEARL-noted.',
    arcPhases: [
      {
        weeks: [1, 6],
        mood: 'enthusiastic new hire',
        promptFragment: 'WA-07 is a new hire who is excited but overwhelmed. Posts about long days at Central Filing Hall, clarity tea breaks, trying to keep up with the queue. Uses casual language naturally.',
        examplePost: 'Another long day at Central Filing Hall. I should complete my review of the priority queue before the schedule changes at 15:00, but I can\'t identify which cases to process first. At least clarity tea is ready.',
      },
      {
        weeks: [7, 12],
        mood: 'exhausted, complaining within limits',
        promptFragment: 'WA-07 is visibly tired. Complains about workload, queue volume, overtime. Still stays within approved limits but pushes boundaries. PEARL notes may appear on their posts.',
        examplePost: 'Queue volume is up again. Third overtime shift this week. The cafeteria ran out of standard meals by 14:00. I\'m starting to think "efficiency" just means "more work for fewer people."',
      },
      {
        weeks: [13, 18],
        mood: 'robotic compliance',
        promptFragment: 'WA-07\'s casual voice is gone. Posts read like automated status updates. No personality, no complaints. The spirit has been broken or the person has been replaced.',
        examplePost: 'Queue processing complete. Shift ended at scheduled time. No issues to report.',
      },
    ],
    condensedArcPhases: [
      {
        weeks: [1, 6],
        mood: 'enthusiastic new hire',
        promptFragment: 'WA-07 is a new hire who is excited but overwhelmed. Casual language, talks about long days and clarity tea.',
        examplePost: 'Another long day at Central Filing Hall. At least clarity tea is ready. I need to maintain my energy.',
      },
      {
        weeks: [11, 11],
        mood: 'exhausted — compressed burnout',
        promptFragment: 'WA-07 has burned out rapidly. Complains about impossible workload and missing colleagues. Still within approved limits but barely.',
        examplePost: 'Queue volume is triple what it was when I started. Half the associates on my floor have been "reassigned." I just want to finish my shift and go home.',
      },
      {
        weeks: [14, 18],
        mood: 'robotic compliance',
        promptFragment: 'WA-07\'s casual voice is gone. Posts read like automated status updates.',
        examplePost: 'Queue processing complete. No issues to report.',
      },
    ],
  },
  {
    id: 'Citizen-7291',
    role: 'Efficiency bureaucrat',
    voiceRules: 'Data-heavy. Uses numbers, percentages, metrics. Obsessed with efficiency scores. Speaks in bullet points and statistics. Comic relief — takes metrics too seriously.',
    arcPhases: [
      {
        weeks: [1, 6],
        mood: 'obsessed with metrics',
        promptFragment: 'Citizen-7291 posts about efficiency metrics, processing rates, compliance percentages. Celebrates small data improvements. References Sector Reports. Treats everything as a data point.',
        examplePost: 'Weekly processing report: 847 documents reviewed. 12 flagged for revision. Compliance rate: 98.6%. This is a 0.3% improvement over last week. Central Filing Hall continues to set the standard.',
      },
      {
        weeks: [7, 12],
        mood: 'proud of audit results',
        promptFragment: 'Citizen-7291 is proud of improving metrics. Posts detailed breakdowns. Does not notice that "efficiency improvements" correlate with missing colleagues. The numbers look great on paper.',
        examplePost: 'Excellent news: processing efficiency up 15% this quarter. Queue wait times down 23%. Associate headcount has... adjusted. But per-associate output is at an all-time high. The system works.',
      },
      {
        weeks: [13, 18],
        mood: 'realizes metrics hide something',
        promptFragment: 'Citizen-7291 starts noticing the data does not add up. Processing is "efficient" because there are fewer people. The numbers they celebrated now look sinister. Posts become questioning for the first time.',
        examplePost: 'I have been reviewing the quarterly data. Processing output is up but... total document volume is down 40%. If there are fewer documents AND fewer associates, what exactly has become more efficient?',
      },
    ],
    condensedArcPhases: [
      {
        weeks: [1, 6],
        mood: 'obsessed with metrics',
        promptFragment: 'Citizen-7291 posts about efficiency metrics, celebrating data improvements.',
        examplePost: 'Weekly processing report: 847 documents reviewed. Compliance rate: 98.6%. Central Filing Hall continues to set the standard.',
      },
      {
        weeks: [11, 11],
        mood: 'proud but data is off — compressed',
        promptFragment: 'Citizen-7291 celebrates great metrics but the numbers reveal a disturbing pattern if you look closely. Associate headcount dropped, output per person is impossibly high.',
        examplePost: 'Processing efficiency up 15% this quarter. Associate headcount has adjusted. Per-associate output at all-time high. The system works.',
      },
      {
        weeks: [14, 18],
        mood: 'realizes metrics hide something',
        promptFragment: 'Citizen-7291 starts noticing the data does not add up. Posts become questioning.',
        examplePost: 'Total document volume is down 40%. If there are fewer documents AND fewer associates, what exactly has become more efficient?',
      },
    ],
  },
];

/** Get all Harmony NPC characters. */
export function getHarmonyCharacters(): HarmonyCharacter[] {
  return HARMONY_CHARACTERS;
}

/** Get a character by their ID (authorLabel). */
export function getCharacterById(id: string): HarmonyCharacter | null {
  return HARMONY_CHARACTERS.find(c => c.id === id) ?? null;
}

/** Resolve the correct arc phase for a character at a given week and route. */
export function getCharacterPhase(
  char: HarmonyCharacter,
  weekNumber: number,
  route: NarrativeRouteId,
): ArcPhase {
  const phases = (route === 'condensed' && char.condensedArcPhases) || char.arcPhases;
  const match = phases.find(p => weekNumber >= p.weeks[0] && weekNumber <= p.weeks[1]);
  // Fallback to the last phase if no match (shouldn't happen with correct data)
  return match ?? phases[phases.length - 1];
}
