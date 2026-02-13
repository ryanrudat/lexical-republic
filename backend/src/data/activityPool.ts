/**
 * Activity Pool — pre-built alternative activity configs per mission type.
 *
 * Teachers can swap in any alternative via the Shift Storyboard.
 * Each alternative provides a complete `config` object that replaces the
 * default mission config for the step.
 *
 * Briefing and clock_out are excluded — briefing is video-driven (teacher
 * uploads clips) and clock_out is a fixed exit sequence.
 */

export interface ActivityAlternative {
  id: string;
  label: string;
  description: string;
  config: Record<string, unknown>;
}

export const ACTIVITY_POOL: Record<string, ActivityAlternative[]> = {
  recap: [
    {
      id: 'recap-alt-1',
      label: 'Quick Reflection',
      description: 'Students write 2-3 sentences about what they remember from last shift.',
      config: {
        prompts: [
          'What do you remember from last shift?',
          'Name one new word you learned.',
        ],
        minWords: 10,
      },
    },
    {
      id: 'recap-alt-2',
      label: 'Vocab Recall Challenge',
      description: 'Students must use 3 target words in a short paragraph.',
      config: {
        prompts: [
          'Write a short paragraph using at least 3 vocabulary words from last shift.',
        ],
        minWords: 20,
        requireTargetWords: true,
      },
    },
  ],

  grammar: [
    {
      id: 'grammar-alt-1',
      label: 'Error Correction',
      description: 'Students identify and fix errors in provided sentences.',
      config: {
        mode: 'error_correction',
        documents: [
          {
            id: 'alt_d01',
            type: 'error_correction',
            prompt: 'Find and fix the grammar error.',
            text: 'The citizens submits their reports every morning.',
            options: ['submits → submit', 'their → there', 'every → each', 'No error'],
            correctIndex: 0,
            targets: ['subject-verb-agreement'],
          },
          {
            id: 'alt_d02',
            type: 'error_correction',
            prompt: 'Find and fix the grammar error.',
            text: 'Yesterday the team are checking the archive.',
            options: ['are → were', 'checking → checked', 'the → a', 'No error'],
            correctIndex: 0,
            targets: ['past-tense', 'be-verb'],
          },
          {
            id: 'alt_d03',
            type: 'error_correction',
            prompt: 'Find and fix the grammar error.',
            text: 'She can goes to the briefing room now.',
            options: ['can goes → can go', 'to the → to a', 'now → later', 'No error'],
            correctIndex: 0,
            targets: ['modals', 'base-verb'],
          },
          {
            id: 'alt_d04',
            type: 'error_correction',
            prompt: 'Find and fix the grammar error.',
            text: 'There is many updates in the directive.',
            options: ['is → are', 'many → much', 'in → on', 'No error'],
            correctIndex: 0,
            targets: ['there-is-are'],
          },
        ],
      },
    },
    {
      id: 'grammar-alt-2',
      label: 'Sentence Building',
      description: 'Students arrange word groups into correct sentences.',
      config: {
        mode: 'sentence_building',
        documents: [
          {
            id: 'sb_d01',
            type: 'choose_correct',
            prompt: 'Choose the correctly ordered sentence.',
            text: 'Which sentence is correct?',
            options: [
              'The clerk should verify the records before filing.',
              'The clerk verify should the records before filing.',
              'Should the clerk verify before filing the records.',
              'Before filing should verify the clerk the records.',
            ],
            correctIndex: 0,
            targets: ['word-order', 'modals'],
          },
          {
            id: 'sb_d02',
            type: 'choose_correct',
            prompt: 'Choose the correctly ordered sentence.',
            text: 'Which sentence is correct?',
            options: [
              'If the report missing, we must notify.',
              'We must notify if the report is missing.',
              'If missing the report we must notify.',
              'Notify we must if report the is missing.',
            ],
            correctIndex: 1,
            targets: ['conditionals', 'word-order'],
          },
          {
            id: 'sb_d03',
            type: 'choose_correct',
            prompt: 'Choose the correctly ordered sentence.',
            text: 'Which sentence is correct?',
            options: [
              'Every citizen completed has their shift.',
              'Has every citizen completed their shift?',
              'Completed has every citizen their shift?',
              'Their shift every citizen has completed.',
            ],
            correctIndex: 1,
            targets: ['question-formation', 'present-perfect'],
          },
          {
            id: 'sb_d04',
            type: 'choose_correct',
            prompt: 'Choose the correctly ordered sentence.',
            text: 'Which sentence is correct?',
            options: [
              'Please carefully check your answers.',
              'Check please carefully your answers.',
              'Your answers please check carefully.',
              'Carefully your answers please check.',
            ],
            correctIndex: 0,
            targets: ['imperatives', 'adverb-placement'],
          },
        ],
      },
    },
  ],

  listening: [
    {
      id: 'listening-alt-1',
      label: 'Key Detail Focus',
      description: 'Students answer targeted detail questions from the audio transcript.',
      config: {
        mode: 'detail_focus',
        checks: [
          {
            id: 'lc_01',
            question: 'What was the main topic discussed in the broadcast?',
            choices: ['New regulations', 'Staff transfers', 'Equipment updates', 'Holiday schedule'],
            answerIndex: 0,
          },
          {
            id: 'lc_02',
            question: 'Who gave the instruction in the recording?',
            choices: ['PEARL', 'A supervisor', 'A citizen', 'Director-7'],
            answerIndex: 1,
          },
        ],
      },
    },
    {
      id: 'listening-alt-2',
      label: 'Inference Practice',
      description: 'Students infer meaning from tone and context rather than explicit words.',
      config: {
        mode: 'inference',
        checks: [
          {
            id: 'li_01',
            question: 'What can you infer about the speaker\'s attitude?',
            choices: ['They are confident', 'They are uncertain', 'They are angry', 'They are bored'],
            answerIndex: 1,
          },
          {
            id: 'li_02',
            question: 'Why might the speaker have paused before answering?',
            choices: ['They forgot the answer', 'They were thinking carefully', 'They were reading', 'They were distracted'],
            answerIndex: 1,
          },
        ],
      },
    },
  ],

  voice_log: [
    {
      id: 'voice_log-alt-1',
      label: 'Free Response',
      description: 'Students speak freely about the shift topic for 30-60 seconds.',
      config: {
        prompt: 'Speak freely about what you learned in this shift. Use at least two new vocabulary words.',
        targetPhrases: [],
        rubric: [
          'Used new vocabulary',
          'Spoke for at least 30 seconds',
          'Clear pronunciation',
        ],
      },
    },
    {
      id: 'voice_log-alt-2',
      label: 'Role Play Report',
      description: 'Students deliver a brief in-character report to their supervisor.',
      config: {
        prompt: 'You are reporting to your supervisor. Summarize what happened during your shift today.',
        targetPhrases: ['I observed', 'the evidence shows', 'I recommend'],
        rubric: [
          'Used formal register',
          'Included at least one recommendation',
          'Spoke clearly and with confidence',
        ],
      },
    },
  ],

  case_file: [
    {
      id: 'case_file-alt-1',
      label: 'Evidence Summary',
      description: 'Students write a brief evidence summary citing specific details.',
      config: {
        prompt: 'Write a brief summary of the evidence you reviewed today. Cite at least one specific detail.',
        minWords: 30,
      },
    },
    {
      id: 'case_file-alt-2',
      label: 'Letter to the Archive',
      description: 'Students write a formal letter requesting a record correction.',
      config: {
        prompt: 'Write a formal letter to the Archive Department requesting a correction to an official record. State what is wrong and what the correct information should be.',
        minWords: 50,
      },
    },
  ],
};

/** Get available alternatives for a mission type */
export function getAlternatives(missionType: string): ActivityAlternative[] {
  return ACTIVITY_POOL[missionType] || [];
}

/** Find a specific alternative by ID */
export function findAlternative(missionType: string, activityId: string): ActivityAlternative | undefined {
  return getAlternatives(missionType).find(a => a.id === activityId);
}
