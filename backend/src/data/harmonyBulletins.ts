/**
 * Static Ministry Bulletins — pre-written for weeks 1-3.
 * Each bulletin includes 2-3 comprehension MCQs for inline testing.
 * Uses target vocabulary from each week's WeekConfig.
 */

export interface BulletinQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface StaticBulletin {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  refNumber: string;
  questions: BulletinQuestion[];
  pearlNote: string | null;
}

export const STATIC_BULLETINS: Record<number, StaticBulletin[]> = {
  // ── Week 1: arrive, follow, check, report, submit, approve, describe, assign, standard, confirm ──
  1: [
    {
      id: 'bulletin-w1-orientation',
      weekNumber: 1,
      authorLabel: 'Ministry of Communication',
      refNumber: 'MB-2031-W01',
      content: 'MINISTRY BULLETIN — REF: MB-2031-W01\n\nAll new associates must follow the standard orientation procedure. Arrive at Central Filing Hall by 08:00. Check your assigned queue number on the main display. Submit your intake form to your supervisor for approval. Associates who do not confirm their assignment by 09:00 will be reported to Personnel Division.',
      questions: [
        {
          question: 'What must new associates do by 09:00?',
          options: [
            'Submit their intake form',
            'Confirm their assignment',
            'Arrive at Central Filing Hall',
            'Check the main display',
          ],
          correctIndex: 1,
        },
        {
          question: 'Where should associates check their queue number?',
          options: [
            'On the supervisor\'s desk',
            'In the cafeteria',
            'On the main display',
            'At the Personnel Division',
          ],
          correctIndex: 2,
        },
      ],
      pearlNote: 'Community orientation procedures updated for this shift cycle.',
    },
    {
      id: 'bulletin-w1-standards',
      weekNumber: 1,
      authorLabel: 'Department of Clarity',
      refNumber: 'MB-2031-W01b',
      content: 'COMMUNITY STANDARDS UPDATE — REF: MB-2031-W01b\n\nThe Department of Clarity reminds all citizens: approved vocabulary must be used in public spaces per Regulation 14-C. Citizens should describe their work using standard terminology. Any language not approved by the Ministry should be reported through proper channels.',
      questions: [
        {
          question: 'What does Regulation 14-C require?',
          options: [
            'Citizens must arrive by 08:00',
            'Approved vocabulary in public spaces',
            'Weekly compliance reports',
            'Standard meal selections at cafeteria',
          ],
          correctIndex: 1,
        },
        {
          question: 'What should citizens do with unapproved language?',
          options: [
            'Ignore it',
            'Use it only at home',
            'Report it through proper channels',
            'Discuss it with colleagues',
          ],
          correctIndex: 2,
        },
      ],
      pearlNote: null,
    },
  ],

  // ── Week 2: notice, compare, replace, update, request, remove, change, include, require, inform ──
  2: [
    {
      id: 'bulletin-w2-schedule',
      weekNumber: 2,
      authorLabel: 'Ministry of Communication',
      refNumber: 'MB-2031-W02',
      content: 'SCHEDULE MODIFICATION NOTICE — REF: MB-2031-W02\n\nThe Department of Community Scheduling confirms that Sector 4 Community Center will update its activity schedule effective immediately. Tuesday sessions have been removed per Directive 2031.4. Citizens who noticed changes to their regular schedule should not request additional information. The change includes all approved activities for that day.',
      questions: [
        {
          question: 'What happened to Tuesday sessions?',
          options: [
            'They were moved to Wednesday',
            'They were removed',
            'They require new registration',
            'They were updated with new activities',
          ],
          correctIndex: 1,
        },
        {
          question: 'What should citizens who noticed the change do?',
          options: [
            'Request additional information',
            'Compare the old and new schedules',
            'Not request additional information',
            'Inform their supervisor immediately',
          ],
          correctIndex: 2,
        },
        {
          question: 'Which directive authorized the schedule change?',
          options: [
            'Regulation 14-C',
            'Form 77-B',
            'Wellness Protocol 9',
            'Directive 2031.4',
          ],
          correctIndex: 3,
        },
      ],
      pearlNote: 'Schedule modifications are routine operational adjustments.',
    },
  ],

  // ── Week 3: process, complete, review, delay, schedule, respond, identify, separate, maintain, forward ──
  3: [
    {
      id: 'bulletin-w3-queue',
      weekNumber: 3,
      authorLabel: 'Ministry of Communication',
      refNumber: 'MB-2031-W03',
      content: 'QUEUE EFFICIENCY DIRECTIVE — REF: MB-2031-W03\n\nAll associates must complete their assigned queue before the end of each shift. Do not delay processing to review cases that have been forwarded to other divisions. If you cannot identify the correct classification for a document, separate it and maintain it in your pending queue. Do not respond to cases marked "Wellness Division" — these have been processed.',
      questions: [
        {
          question: 'What should associates do with forwarded cases?',
          options: [
            'Review them carefully',
            'Delay processing until confirmed',
            'Not delay processing to review them',
            'Forward them again to a supervisor',
          ],
          correctIndex: 2,
        },
        {
          question: 'What should you do if you cannot identify a document\'s classification?',
          options: [
            'Forward it to Wellness Division',
            'Respond to the original sender',
            'Separate it and maintain it in pending queue',
            'Complete it with a best guess',
          ],
          correctIndex: 2,
        },
      ],
      pearlNote: 'Queue efficiency is a measure of associate commitment to clarity.',
    },
  ],
};
