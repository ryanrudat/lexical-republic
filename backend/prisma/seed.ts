import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

type WeekSeed = {
  id: string;
  weekNumber: number;
  title: string;
};

type MissionSeed = {
  id: string;
  weekId: string;
  orderIndex: number;
  title: string;
  description: string;
  missionType: string;
  config: Record<string, unknown>;
};

type WeekStoryPlan = {
  episodeTitle: string;
  episodeSubtitle: string;
  speaker: string;
  line: string;
  objective: string;
  grammarFocus: string;
  knownWords: string[];
  newWords: string[];
  cliffhanger: string;
  bridgeLine: string;
  weekSlogan: string;
};

const WEEK_STORY_PLANS: Record<number, WeekStoryPlan> = {
  1: {
    episodeTitle: 'Episode 1: Party Onboarding Broadcast',
    episodeSubtitle: 'Mandatory onboarding transmission for all new Clarity Associates.',
    speaker: 'PEARL',
    line: 'Before you correct others, we must calibrate you.',
    objective: 'Understand your role and the core language rules of the Republic.',
    grammarFocus: 'Present simple, be-verb, and basic modal forms.',
    knownWords: ['work', 'rule', 'team', 'today'],
    newWords: ['compliance', 'directive', 'protocol', 'clearance'],
    cliffhanger: 'A memo arrives stamped HIDDEN LEXICON — and your supervisor says it never existed.',
    bridgeLine: 'Your first compliance report will be reviewed. Accurate associates are valued associates.',
    weekSlogan: 'Clarity is Comfort',
  },
  2: {
    episodeTitle: 'Episode 2: The Memo That Wasn\'t There',
    episodeSubtitle: 'Contradictory records appear in morning dispatch.',
    speaker: 'BETTY',
    line: 'If the memo is missing, then it was never needed. Correct?',
    objective: 'Compare two sources and describe contradictions clearly.',
    grammarFocus: 'Past simple vs present simple, there is/there are.',
    knownWords: ['today', 'yesterday', 'record', 'check'],
    newWords: ['contradiction', 'missing', 'notice', 'revision'],
    cliffhanger: 'A corrected memo reappears with your own edits removed.',
    bridgeLine: 'Associates who report contradictions calmly receive recognition. Begin your report.',
    weekSlogan: 'Accuracy is Kindness',
  },
  3: {
    episodeTitle: 'Episode 3: Clarity Bay Intake',
    episodeSubtitle: 'Queue volume doubles; speed and precision are tested.',
    speaker: 'IVAN',
    line: 'Don\'t rush. Fast mistakes are still mistakes.',
    objective: 'Process multiple entries while preserving grammar accuracy.',
    grammarFocus: 'Imperatives, modal can/should, polite clarification requests.',
    knownWords: ['help', 'question', 'line', 'message'],
    newWords: ['clarify', 'queue', 'priority', 'dispatch'],
    cliffhanger: 'A citizen post asks about someone "reassigned" without explanation.',
    bridgeLine: 'The queue is watching. Demonstrate that speed and accuracy are not in conflict.',
    weekSlogan: 'Calm is Compliance',
  },
  4: {
    episodeTitle: 'Episode 4: Evidence Board',
    episodeSubtitle: 'Associates must build a clean timeline from fragments.',
    speaker: 'ARCHIVE NOTICE',
    line: 'A timeline protects truth from noise.',
    objective: 'Sequence events and cite evidence lines for each claim.',
    grammarFocus: 'Sequencing words (first, then, finally) and simple past.',
    knownWords: ['first', 'then', 'after', 'before'],
    newWords: ['timeline', 'evidence', 'sequence', 'source'],
    cliffhanger: 'One evidence clip is tagged CLASSIFIED after you view it.',
    bridgeLine: 'Arrange events in proper order. A clean timeline earns trust from the Archive.',
    weekSlogan: 'Order is Truth',
  },
  5: {
    episodeTitle: 'Episode 5: Wellness Check',
    episodeSubtitle: 'Language of emotion is reframed as public safety.',
    speaker: 'PEARL',
    line: 'Healthy language creates healthy minds.',
    objective: 'Describe feelings and obligations without losing clarity.',
    grammarFocus: 'Must/should, adjectives for emotion, because-clauses.',
    knownWords: ['happy', 'sad', 'tired', 'safe'],
    newWords: ['wellness', 'concern', 'observe', 'report'],
    cliffhanger: 'Your own reflection answer is marked for supervisor review.',
    bridgeLine: 'Your emotional clarity is being assessed. Respond with care and approved vocabulary.',
    weekSlogan: 'Wellness is Loyalty',
  },
  6: {
    episodeTitle: 'Episode 6: Act I Clock-Out',
    episodeSubtitle: 'First compliance packet is audited by senior staff.',
    speaker: 'M.K. CATSKIL',
    line: 'Accuracy gets you through the door. Questions keep you awake.',
    objective: 'Synthesize week evidence into one coherent record.',
    grammarFocus: 'Review week 1-5 targets in mixed tasks.',
    knownWords: ['review', 'write', 'speak', 'correct'],
    newWords: ['audit', 'summary', 'classification', 'oversight'],
    cliffhanger: 'A file in your queue flashes one word: RUN.',
    bridgeLine: 'Your compliance packet is under audit. Demonstrate everything you have learned.',
    weekSlogan: 'Review is Renewal',
  },
  7: {
    episodeTitle: 'Episode 7: Hidden Lexicon',
    episodeSubtitle: 'Unapproved words begin appearing in official channels.',
    speaker: 'NOOR',
    line: 'Words can hide people — and words can find them.',
    objective: 'Identify the difference between approved and hidden vocabulary.',
    grammarFocus: 'Relative clauses and descriptive noun phrases.',
    knownWords: ['word', 'name', 'city', 'family'],
    newWords: ['lexicon', 'forbidden', 'recover', 'trace'],
    cliffhanger: 'A hidden note appears inside a "corrected" document.',
    bridgeLine: 'Unapproved vocabulary detected. Identify and classify each term with precision.',
    weekSlogan: 'Naming is Power',
  },
  8: {
    episodeTitle: 'Episode 8: Contradiction Protocol',
    episodeSubtitle: 'Students must reconcile two incompatible directives.',
    speaker: 'IVAN',
    line: 'If both are official, how can both be true?',
    objective: 'Compare documents and explain conflict using evidence.',
    grammarFocus: 'Comparatives, contrast linkers (however, although).',
    knownWords: ['same', 'different', 'rule', 'change'],
    newWords: ['conflict', 'exception', 'revision', 'inconsistency'],
    cliffhanger: 'PEARL asks why you opened an archived contradiction twice.',
    bridgeLine: 'Two directives conflict. Your task: compare, contrast, and report which is valid.',
    weekSlogan: 'Doubt is Data',
  },
  9: {
    episodeTitle: 'Episode 9: The Intercept',
    episodeSubtitle: 'Audio snippets reveal tone beyond literal meaning.',
    speaker: 'BETTY',
    line: 'Say the right words, and no one asks the wrong questions.',
    objective: 'Infer intent from tone, pauses, and word choice.',
    grammarFocus: 'Reported speech and inference language (might, seems).',
    knownWords: ['listen', 'voice', 'slow', 'fast'],
    newWords: ['intercept', 'signal', 'intent', 'imply'],
    cliffhanger: 'A voice in the intercept says your designation directly.',
    bridgeLine: 'Listen carefully. The meaning is not always in the words themselves.',
    weekSlogan: 'Listening is Seeing',
  },
  10: {
    episodeTitle: 'Episode 10: Unit Transfer',
    episodeSubtitle: 'Operational transfer orders introduce procedural language.',
    speaker: 'DIRECTOR-7',
    line: 'Adapt quickly. Delay is disloyalty.',
    objective: 'Give step-by-step instructions and process descriptions.',
    grammarFocus: 'Imperatives, process sequencing, conditionals (if).',
    knownWords: ['open', 'move', 'check', 'send'],
    newWords: ['transfer', 'authorization', 'terminal', 'override'],
    cliffhanger: 'Your badge grants access to a room that should not exist.',
    bridgeLine: 'New operational procedures require your immediate attention. Follow each step precisely.',
    weekSlogan: 'Procedure is Safety',
  },
  11: {
    episodeTitle: 'Episode 11: The Missing Index',
    episodeSubtitle: 'Classification records lose key labels overnight.',
    speaker: 'NOOR',
    line: 'When labels disappear, people disappear with them.',
    objective: 'Classify terms precisely and justify categorization choices.',
    grammarFocus: 'Defining clauses and precise noun modifiers.',
    knownWords: ['label', 'group', 'find', 'lost'],
    newWords: ['index', 'catalog', 'designation', 'anomaly'],
    cliffhanger: 'PEARL goes silent for exactly sixty seconds.',
    bridgeLine: 'Records are incomplete. Restore proper classification using your best judgement.',
    weekSlogan: 'Labels are Identity',
  },
  12: {
    episodeTitle: 'Episode 12: Act II Clock-Out',
    episodeSubtitle: 'Compiled evidence packet challenges official narrative.',
    speaker: 'PEARL',
    line: 'Your report has been accepted. Additional monitoring enabled.',
    objective: 'Write an evidence-backed challenge using controlled language.',
    grammarFocus: 'Cause/effect connectors (therefore, as a result).',
    knownWords: ['because', 'result', 'show', 'prove'],
    newWords: ['discrepancy', 'suppression', 'elevated', 'monitoring'],
    cliffhanger: 'Your badge color changes from green to amber.',
    bridgeLine: 'Your evidence compilation is under review. Present your findings clearly.',
    weekSlogan: 'Evidence is Voice',
  },
  13: {
    episodeTitle: 'Episode 13: Break in the Pattern',
    episodeSubtitle: 'Students begin making publicly visible language choices.',
    speaker: 'WILLIAM',
    line: 'When everyone repeats the script, silence becomes a language too.',
    objective: 'Persuade an audience while maintaining grammatical control.',
    grammarFocus: 'Opinion markers and reason clauses.',
    knownWords: ['think', 'believe', 'important', 'reason'],
    newWords: ['pattern', 'public', 'choice', 'consequence'],
    cliffhanger: 'A Harmony post quotes your own Case File back to you.',
    bridgeLine: 'Your words will be public. Choose them with both conviction and control.',
    weekSlogan: 'Silence is a Choice',
  },
  14: {
    episodeTitle: 'Episode 14: Directive Override',
    episodeSubtitle: 'Conflicting orders force conditional decision making.',
    speaker: 'IVAN',
    line: 'If we obey one order, we break another.',
    objective: 'Use conditional language to justify operational decisions.',
    grammarFocus: 'Conditionals (if, unless, even if).',
    knownWords: ['if', 'or', 'stop', 'continue'],
    newWords: ['override', 'fallback', 'risk', 'outcome'],
    cliffhanger: 'PEARL flags your latest response as "strategically ambiguous."',
    bridgeLine: 'Conflicting directives require conditional reasoning. State your logic clearly.',
    weekSlogan: 'Logic is Protection',
  },
  15: {
    episodeTitle: 'Episode 15: Public Statement',
    episodeSubtitle: 'Students draft statements for monitored community channels.',
    speaker: 'BETTY',
    line: 'Confidence is easy. Accountability is harder.',
    objective: 'Deliver a formal statement and defend it with evidence.',
    grammarFocus: 'Formal register, modal certainty (must/might/could).',
    knownWords: ['speak', 'explain', 'answer', 'clear'],
    newWords: ['statement', 'audience', 'credibility', 'response'],
    cliffhanger: 'A citizen asks who gave you permission to ask questions.',
    bridgeLine: 'You are about to address the public channel. Formality and evidence are required.',
    weekSlogan: 'Words are Witnesses',
  },
  16: {
    episodeTitle: 'Episode 16: The Appeal',
    episodeSubtitle: 'A high-stakes appeal must challenge Director-7 directives.',
    speaker: 'DIRECTOR-7',
    line: 'Appeals are permitted. Defiance is not.',
    objective: 'Write a structured appeal with claims, reasons, and evidence.',
    grammarFocus: 'Formal writing connectors (furthermore, however, respectfully).',
    knownWords: ['request', 'reason', 'evidence', 'decision'],
    newWords: ['appeal', 'petition', 'review', 'justification'],
    cliffhanger: 'Your appeal is accepted, but the signature is not Director-7.',
    bridgeLine: 'Your appeal is being drafted. Use formal connectors and cite evidence carefully.',
    weekSlogan: 'Reason is Resistance',
  },
  17: {
    episodeTitle: 'Episode 17: Final Evidence',
    episodeSubtitle: 'All threads converge in one final archive build.',
    speaker: 'M.K. CATSKIL',
    line: 'This is where you decide what history remembers.',
    objective: 'Synthesize multi-week evidence into a final narrative.',
    grammarFocus: 'Complex sentences, cohesion, and source attribution.',
    knownWords: ['before', 'after', 'between', 'together'],
    newWords: ['synthesize', 'archive', 'corroborate', 'record'],
    cliffhanger: 'PEARL begins repeating your first onboarding line back to you.',
    bridgeLine: 'All evidence converges here. Build your final archive with cohesion and attribution.',
    weekSlogan: 'Memory is Action',
  },
  18: {
    episodeTitle: 'Episode 18: Final Clock-Out',
    episodeSubtitle: 'Students deliver final speeches to close Season One.',
    speaker: 'PEARL',
    line: 'Communication Associate... thank you. For everything.',
    objective: 'Deliver a final speech balancing clarity, evidence, and voice.',
    grammarFocus: 'Integrated fluency: grammar + vocabulary + persuasion.',
    knownWords: ['future', 'people', 'learn', 'change'],
    newWords: ['witness', 'truthful', 'rebuild', 'republic'],
    cliffhanger: 'The screen fades to amber. THE REPUBLIC IS LISTENING.',
    bridgeLine: 'This is your final assessment. Speak with the full weight of what you have learned.',
    weekSlogan: 'Truth is Legacy',
  },
};

function createDefaultGrammarDocuments(weekNumber: number) {
  return [
    {
      id: `w${weekNumber}_d01`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'The citizens ____ their reports before dusk.',
      options: ['submits', 'submit', 'submitting', 'submitted'],
      correctIndex: 1,
      targets: ['present-simple'],
    },
    {
      id: `w${weekNumber}_d02`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Yesterday the archive team ____ an irregular memo.',
      options: ['find', 'finding', 'found', 'finds'],
      correctIndex: 2,
      targets: ['simple-past', 'irregular-verbs'],
    },
    {
      id: `w${weekNumber}_d03`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'There ____ several updates in today’s directive.',
      options: ['is', 'are', 'be', 'was'],
      correctIndex: 1,
      targets: ['there-is-are'],
    },
    {
      id: `w${weekNumber}_d04`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'You should ____ the source before filing.',
      options: ['verify', 'verifies', 'verified', 'verifying'],
      correctIndex: 0,
      targets: ['modals', 'base-verb'],
    },
    {
      id: `w${weekNumber}_d05`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'The clerk ____ preparing the weekly packet.',
      options: ['am', 'is', 'are', 'be'],
      correctIndex: 1,
      targets: ['be-verb', 'present-continuous'],
    },
    {
      id: `w${weekNumber}_d06`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Every citizen ____ complete their assigned shift.',
      options: ['have to', 'has to', 'having to', 'had to'],
      correctIndex: 1,
      targets: ['have-to', 'third-person-s'],
    },
    {
      id: `w${weekNumber}_d07`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Please ____ your answers before submission.',
      options: ['check', 'checks', 'checking', 'checked'],
      correctIndex: 0,
      targets: ['imperatives'],
    },
    {
      id: `w${weekNumber}_d08`,
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'If records are unclear, we ____ ask for clarification.',
      options: ['can', 'cans', 'to can', 'caning'],
      correctIndex: 0,
      targets: ['modals'],
    },
  ];
}

function createWeek2GrammarDocuments() {
  return [
    {
      id: 'w02_d01',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Yesterday the dispatch team ____ the memo at 8am.',
      options: ['sends', 'send', 'sent', 'sending'],
      correctIndex: 2,
      targets: ['past-simple'],
    },
    {
      id: 'w02_d02',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'The records ____ updated every morning.',
      options: ['is', 'are', 'was', 'be'],
      correctIndex: 1,
      targets: ['present-simple', 'there-is-are'],
    },
    {
      id: 'w02_d03',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'There ____ a contradiction in yesterday\'s report.',
      options: ['are', 'is', 'were', 'be'],
      correctIndex: 1,
      targets: ['there-is-are'],
    },
    {
      id: 'w02_d04',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'The memo ____ correct yesterday, but now it says something different.',
      options: ['is', 'was', 'are', 'were'],
      correctIndex: 1,
      targets: ['past-simple', 'be-verb'],
    },
    {
      id: 'w02_d05',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Today the supervisor ____ a new revision notice.',
      options: ['post', 'posts', 'posted', 'posting'],
      correctIndex: 1,
      targets: ['present-simple', 'third-person-s'],
    },
    {
      id: 'w02_d06',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'There ____ three missing entries in the archive.',
      options: ['is', 'are', 'was', 'has'],
      correctIndex: 1,
      targets: ['there-is-are'],
    },
    {
      id: 'w02_d07',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'We ____ the original version last week.',
      options: ['review', 'reviews', 'reviewed', 'reviewing'],
      correctIndex: 2,
      targets: ['past-simple'],
    },
    {
      id: 'w02_d08',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'The notice ____ that all edits are final.',
      options: ['say', 'says', 'said', 'saying'],
      correctIndex: 1,
      targets: ['present-simple', 'third-person-s'],
    },
  ];
}

function createWeek3GrammarDocuments() {
  return [
    {
      id: 'w03_d01',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: '____ your badge before entering the queue.',
      options: ['Scan', 'Scans', 'Scanning', 'To scan'],
      correctIndex: 0,
      targets: ['imperatives'],
    },
    {
      id: 'w03_d02',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'You ____ ask for clarification if the directive is unclear.',
      options: ['can', 'cans', 'to can', 'canning'],
      correctIndex: 0,
      targets: ['modals'],
    },
    {
      id: 'w03_d03',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Associates ____ report queue errors to the supervisor.',
      options: ['should', 'shoulds', 'to should', 'shoulding'],
      correctIndex: 0,
      targets: ['modals'],
    },
    {
      id: 'w03_d04',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Please ____ the priority level before dispatching.',
      options: ['confirm', 'confirms', 'confirmed', 'confirming'],
      correctIndex: 0,
      targets: ['imperatives'],
    },
    {
      id: 'w03_d05',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Could you ____ that instruction one more time?',
      options: ['repeat', 'repeats', 'repeated', 'repeating'],
      correctIndex: 0,
      targets: ['modals', 'polite-requests'],
    },
    {
      id: 'w03_d06',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: '____ sit down until your designation is called.',
      options: ['Don\'t', 'Doesn\'t', 'Didn\'t', 'Not'],
      correctIndex: 0,
      targets: ['imperatives', 'negative-imperatives'],
    },
    {
      id: 'w03_d07',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'You should ____ politely if you need more time.',
      options: ['ask', 'asks', 'asked', 'asking'],
      correctIndex: 0,
      targets: ['modals', 'base-verb'],
    },
    {
      id: 'w03_d08',
      type: 'choose_correct',
      prompt: 'Choose the correct sentence.',
      text: 'Can I ____ a question about the dispatch order?',
      options: ['ask', 'asks', 'asked', 'to ask'],
      correctIndex: 0,
      targets: ['modals', 'polite-requests'],
    },
  ];
}

function createDefaultWeekMissions(week: WeekSeed): MissionSeed[] {
  const story = WEEK_STORY_PLANS[week.weekNumber];
  const targetPhrases = ['We have to…', 'I can…', 'There are…'];

  return [
    {
      id: `mission-${week.id}-recap`,
      weekId: week.id,
      orderIndex: 0,
      title: 'Recap',
      description: `Review what you remember from Shift ${week.weekNumber}.`,
      missionType: 'recap',
      config: {
        minAnswers: 2,
        prompts: [
          `What happened in ${story.episodeTitle}?`,
          `Which grammar focus did you use most: ${story.grammarFocus}?`,
          'What detail felt unusual, contradictory, or risky?',
        ],
        storyBeat: {
          beatTitle: 'Shift Check-In',
          location: 'Shift Intake',
          objective: story.objective,
          speaker: 'PEARL',
          line: 'Begin each shift by organizing your memory. Clarity starts with recall.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
      },
    },
    {
      id: `mission-${week.id}-briefing`,
      weekId: week.id,
      orderIndex: 1,
      title: 'Briefing',
      description: 'Review the official Ministry briefing.',
      missionType: 'briefing',
      config: {
        episodeTitle: story.episodeTitle,
        episodeSubtitle: story.episodeSubtitle,
        nowShowingStage: 'free',
        videoSource: 'auto',
        embedUrl: '',
        clipAEmbedUrl: '',
        clipBEmbedUrl: '',
        uploadedVideoUrl: '',
        uploadedVideoFilename: '',
        clipAUploadedVideoUrl: '',
        clipAUploadedVideoFilename: '',
        clipBUploadedVideoUrl: '',
        clipBUploadedVideoFilename: '',
        bridgeLine: story.bridgeLine,
        weekSlogan: story.weekSlogan,
        fallbackText: `Shift ${week.weekNumber}: ${week.title}. ${story.objective} Identify the key directive, one supporting detail, and one implied concern.`,
        transcript: [
          `${story.episodeTitle} transmission begins.`,
          `${story.speaker}: ${story.line}`,
          `Language focus: ${story.grammarFocus}`,
          `Operational objective: ${story.objective}`,
        ],
        storyBeat: {
          beatTitle: 'Broadcast Intake',
          location: 'Broadcast Channel',
          objective: story.objective,
          speaker: story.speaker,
          line: story.line,
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
        checks: [
          {
            id: `b${week.weekNumber}_gist`,
            question: 'What is the main purpose of this briefing?',
            choices: [
              'Reinforce communication rules',
              'Announce a holiday',
              'Deliver sports updates',
              'Explain transportation changes',
            ],
            answerIndex: 0,
          },
          {
            id: `b${week.weekNumber}_detail`,
            question: 'What should you do with irregular language?',
            choices: [
              'Ignore it',
              'Archive it silently',
              'Report it to a supervisor',
              'Post it to Harmony',
            ],
            answerIndex: 2,
          },
          {
            id: `b${week.weekNumber}_infer`,
            question: 'What tone does the message suggest?',
            choices: ['Urgent and procedural', 'Comedic', 'Celebratory', 'Casual'],
            answerIndex: 0,
          },
        ],
      },
    },
    {
      id: `mission-${week.id}-grammar`,
      weekId: week.id,
      orderIndex: 2,
      title: 'Clarity Bay',
      description: 'Complete grammar exercises for approved language.',
      missionType: 'grammar',
      config: {
        requiredCount: 8,
        documents: week.weekNumber === 2
          ? createWeek2GrammarDocuments()
          : week.weekNumber === 3
          ? createWeek3GrammarDocuments()
          : createDefaultGrammarDocuments(week.weekNumber),
        storyBeat: {
          beatTitle: 'Desk Operations',
          location: 'Language Lab',
          objective: 'Apply grammar rules under operational pressure.',
          speaker: story.speaker,
          line: 'Accuracy protects the Republic. Sloppy edits create avoidable confusion.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
      },
    },
    {
      id: `mission-${week.id}-listening`,
      weekId: week.id,
      orderIndex: 3,
      title: 'Evidence',
      description: 'Review audio evidence and answer checks.',
      missionType: 'listening',
      config: {
        mediaUrl: '',
        transcript: [
          `Evidence packet for Shift ${week.weekNumber} is now active.`,
          'If source material is missing, continue with in-app verification.',
          'Unverified reports must be archived pending review.',
        ],
        highlightPrompt: 'Select the transcript line that best supports proper handling of unverified reports.',
        highlightAnswerIndex: 2,
        storyBeat: {
          beatTitle: 'Evidence Review',
          location: 'Evidence Desk',
          objective: 'Prove claims with transcript evidence before filing.',
          speaker: 'ARCHIVE NOTICE',
          line: 'Evidence without verification is rumor. Verification without evidence is propaganda.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
        checks: [
          {
            id: `l${week.weekNumber}_gist`,
            question: 'What is the evidence packet mainly about?',
            choices: [
              'Record handling procedures',
              'Cafeteria updates',
              'Sports attendance',
              'Maintenance requests',
            ],
            answerIndex: 0,
          },
          {
            id: `l${week.weekNumber}_detail`,
            question: 'What should happen if material is missing?',
            choices: [
              'Cancel the shift',
              'Proceed with in-app verification',
              'Wait for new credentials',
              'Publish a warning post',
            ],
            answerIndex: 1,
          },
          {
            id: `l${week.weekNumber}_infer`,
            question: 'Why are unverified reports archived?',
            choices: [
              'To preserve evidence quality',
              'To reduce storage usage',
              'To increase publicity',
              'To simplify grading',
            ],
            answerIndex: 0,
          },
        ],
      },
    },
    {
      id: `mission-${week.id}-voice-log`,
      weekId: week.id,
      orderIndex: 4,
      title: 'Voice Log',
      description: 'Record a short verbal summary.',
      missionType: 'voice_log',
      config: {
        prompt: `Summarize Shift ${week.weekNumber} in 45 seconds. Use at least one new word (${story.newWords.join(', ')}) and one target phrase.`,
        targetPhrases,
        storyBeat: {
          beatTitle: 'Voice Compliance',
          location: 'Voice Booth',
          objective: 'Demonstrate spoken control with approved target phrases.',
          speaker: 'PEARL',
          line: 'Speech reveals mindset. Speak clearly, and the system understands you.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
      },
    },
    {
      id: `mission-${week.id}-case-file`,
      weekId: week.id,
      orderIndex: 5,
      title: 'Case File',
      description: 'Write your official shift summary.',
      missionType: 'case_file',
      config: {
        prompt: `Write a 4–6 sentence case file for Shift ${week.weekNumber}. Include one approved rule, one suspicious detail, and at least two new words (${story.newWords.slice(0, 2).join(', ')}).`,
        minWords: 40,
        storyBeat: {
          beatTitle: 'Case File Entry',
          location: 'Filing Desk',
          objective: 'Record facts in controlled language while noting irregular details.',
          speaker: 'CASE FILE STANDARD',
          line: 'A report can be accurate and obedient at the same time. That is the craft.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
      },
    },
    {
      id: `mission-${week.id}-clock-out`,
      weekId: week.id,
      orderIndex: 6,
      title: 'Clock-Out',
      description: 'Review your progress and close the shift.',
      missionType: 'clock_out',
      config: {
        cliffhanger: story.cliffhanger,
        storyBeat: {
          beatTitle: 'End of Shift',
          location: 'Clock-Out',
          objective: 'Finalize compliance record and prepare for next escalation.',
          speaker: 'PEARL',
          line: 'Your shift is complete. Rest now. Tomorrow will require sharper attention.',
          learningFocus: story.grammarFocus,
          knownWords: story.knownWords,
          newWords: story.newWords,
        },
      },
    },
  ];
}

async function main() {
  console.log('Seeding database...');

  // ─── Teacher ───
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: teacherPasswordHash,
      displayName: 'Director Wells',
      role: 'teacher',
    },
  });
  console.log(`  Teacher: ${teacher.username} (${teacher.id})`);

  // Teacher config
  await prisma.teacherConfig.upsert({
    where: { userId: teacher.id },
    update: {},
    create: {
      userId: teacher.id,
      settings: { theme: 'ministry', notifications: true },
    },
  });

  // ─── Students ───
  const pinHash = await bcrypt.hash('1234', 10);
  const lanes = [1, 2, 3, 2, 1];
  const studentNames = [
    'Citizen Alpha-1',
    'Citizen Alpha-2',
    'Citizen Alpha-3',
    'Citizen Alpha-4',
    'Citizen Alpha-5',
  ];

  for (let i = 0; i < 5; i++) {
    const designation = `CA-${i + 1}`;
    const student = await prisma.user.upsert({
      where: { designation },
      update: {},
      create: {
        designation,
        pin: pinHash,
        displayName: studentNames[i],
        role: 'student',
        lane: lanes[i],
      },
    });
    console.log(`  Student: ${student.designation} (lane ${student.lane})`);
  }

  // ─── Arcs (3 Acts) ───
  const arcData = [
    {
      id: 'arc-compliance',
      name: 'Compliance',
      orderIndex: 1,
      description: 'Act I: Students learn "Right & Proper" language rules, believing The Party.',
    },
    {
      id: 'arc-discovery',
      name: 'Discovery',
      orderIndex: 2,
      description: 'Act II: Students notice contradictions and discover the "Hidden Lexicon."',
    },
    {
      id: 'arc-resistance',
      name: 'Resistance',
      orderIndex: 3,
      description: 'Act III: Students challenge official language, write appeals, and make choices.',
    },
  ];

  for (const a of arcData) {
    await prisma.arc.upsert({
      where: { id: a.id },
      update: { name: a.name, orderIndex: a.orderIndex, description: a.description },
      create: a,
    });
    console.log(`  Arc: ${a.name} (order ${a.orderIndex})`);
  }

  // ─── Weeks (18 Shifts) ───
  const weekData = [
    // Act I — Compliance (weeks 1-6)
    {
      id: 'week-1',
      arcId: 'arc-compliance',
      weekNumber: 1,
      title: 'First Shift Orientation',
      description: 'You receive your first assignment in the Lexicon Republic and learn the rules of Right & Proper language.',
    },
    {
      id: 'week-2',
      arcId: 'arc-compliance',
      weekNumber: 2,
      title: 'The Memo That Wasn\u2019t There',
      description: 'A contradiction appears in the record. You learn to describe rules and exceptions.',
    },
    {
      id: 'week-3',
      arcId: 'arc-compliance',
      weekNumber: 3,
      title: 'Clarity Bay Intake',
      description: 'You process documents faster and learn to ask for clarification politely.',
    },
    {
      id: 'week-4',
      arcId: 'arc-compliance',
      weekNumber: 4,
      title: 'Evidence Board',
      description: 'You learn to sequence events and describe evidence.',
    },
    {
      id: 'week-5',
      arcId: 'arc-compliance',
      weekNumber: 5,
      title: 'Wellness Check',
      description: 'You practice functional language for feelings, policies, and "must/should."',
    },
    {
      id: 'week-6',
      arcId: 'arc-compliance',
      weekNumber: 6,
      title: 'Act I Clock\u2011Out',
      description: 'You compile your first packet of corrected documents and prepare for escalation.',
    },
    // Act II — Discovery (weeks 7-12)
    {
      id: 'week-7',
      arcId: 'arc-discovery',
      weekNumber: 7,
      title: 'Hidden Lexicon',
      description: 'Act II begins: you notice patterns that do not match Right & Proper rules.',
    },
    {
      id: 'week-8',
      arcId: 'arc-discovery',
      weekNumber: 8,
      title: 'Contradiction Protocol',
      description: 'You learn to compare sources and report contradictions accurately.',
    },
    {
      id: 'week-9',
      arcId: 'arc-discovery',
      weekNumber: 9,
      title: 'The Intercept',
      description: 'You practice listening for intent, tone, and implied meaning.',
    },
    {
      id: 'week-10',
      arcId: 'arc-discovery',
      weekNumber: 10,
      title: 'Unit Transfer',
      description: 'You learn to give instructions and describe processes clearly.',
    },
    {
      id: 'week-11',
      arcId: 'arc-discovery',
      weekNumber: 11,
      title: 'The Missing Index',
      description: 'You practice precise vocabulary and classification language.',
    },
    {
      id: 'week-12',
      arcId: 'arc-discovery',
      weekNumber: 12,
      title: 'Act II Clock\u2011Out',
      description: 'You compile evidence and make a report that challenges official language.',
    },
    // Act III — Resistance (weeks 13-18)
    {
      id: 'week-13',
      arcId: 'arc-resistance',
      weekNumber: 13,
      title: 'Break in the Pattern',
      description: 'Act III begins: you learn to persuade and justify your choices.',
    },
    {
      id: 'week-14',
      arcId: 'arc-resistance',
      weekNumber: 14,
      title: 'Directive Override',
      description: 'You practice conditional language: if, unless, even if.',
    },
    {
      id: 'week-15',
      arcId: 'arc-resistance',
      weekNumber: 15,
      title: 'Public Statement',
      description: 'You learn to present information formally and respond to questions.',
    },
    {
      id: 'week-16',
      arcId: 'arc-resistance',
      weekNumber: 16,
      title: 'The Appeal',
      description: 'You practice writing an appeal with reasons and evidence.',
    },
    {
      id: 'week-17',
      arcId: 'arc-resistance',
      weekNumber: 17,
      title: 'Final Evidence',
      description: 'You synthesize the story and prepare your final Case File packet.',
    },
    {
      id: 'week-18',
      arcId: 'arc-resistance',
      weekNumber: 18,
      title: 'Clock\u2011Out (Final)',
      description: 'You deliver your final report and close the season.',
    },
  ];

  for (const w of weekData) {
    await prisma.week.upsert({
      where: { id: w.id },
      update: { title: w.title, description: w.description, arcId: w.arcId },
      create: w,
    });
  }
  console.log(`  Weeks: ${weekData.length} shifts seeded`);

  // ─── Week 1 Missions (7 steps) ───
  const week1Story = WEEK_STORY_PLANS[1];
  const week1Missions = [
    {
      id: 'mission-w1-recap',
      weekId: 'week-1',
      orderIndex: 0,
      title: 'Recap',
      description: 'Review what you remember from orientation.',
      missionType: 'recap',
      config: {
        minAnswers: 2,
        prompts: [
          'What is one rule you remember about Right & Proper language?',
          'Who are you in the Lexicon Republic (your role)?',
          'What detail felt suspicious in the briefing?',
        ],
        storyBeat: {
          beatTitle: 'Day 1 Arrival',
          location: 'Shift Intake',
          objective: 'Anchor identity and rules before first assignment.',
          speaker: 'WILLIAM (internal)',
          line: 'By tonight I will have a real badge. I will be someone who matters.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
      },
    },
    {
      id: 'mission-w1-briefing',
      weekId: 'week-1',
      orderIndex: 1,
      title: 'Briefing',
      description: 'Today\u2019s official communication from The Party.',
      missionType: 'briefing',
      config: {
        episodeTitle: 'Episode 1: Party Onboarding Broadcast',
        episodeSubtitle: 'Mandatory onboarding transmission for all new Clarity Associates.',
        nowShowingStage: 'clip_a',
        videoSource: 'auto',
        embedUrl: '',
        clipAEmbedUrl: '',
        clipBEmbedUrl: '',
        uploadedVideoUrl: '',
        uploadedVideoFilename: '',
        clipAUploadedVideoUrl: '',
        clipAUploadedVideoFilename: '',
        clipBUploadedVideoUrl: '',
        clipBUploadedVideoFilename: '',
        bridgeLine: 'Your first compliance report will be reviewed. Accurate associates are valued associates.',
        weekSlogan: 'Clarity is Comfort',
        fallbackText: 'Welcome to the Ministry onboarding episode. The Party explains your role, your badge connection to PEARL, and the rules for processing language in Clarity Bay.',
        transcript: [
          'Welcome, future Clarity Associate. I am PEARL, and I will be with you today, tomorrow, and every day after.',
          'The Party above all. Happiness through clarity. Confusion is corrected with care.',
          'Your assignment begins in Clarity Bay: correct irregular language before it spreads.',
          'If a document cannot be corrected, flag it for supervisor review and remain calm.',
          'Clear words create safe minds. The Party thanks you for your service.',
        ],
        storyBeat: {
          beatTitle: 'Onboarding Broadcast',
          location: 'Broadcast Terminal',
          objective: 'Identify how language rules are framed as safety and care.',
          speaker: 'PEARL',
          line: 'Before you correct others, we must calibrate you. This is for everyone\'s well-being.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
        checks: [
          {
            id: 'b1_gist',
            question: 'What is the main purpose of today\u2019s briefing?',
            choices: [
              'To onboard new associates into Party language procedures',
              'To announce a public festival',
              'To provide transport updates',
              'To train physical fitness',
            ],
            answerIndex: 0,
          },
          {
            id: 'b1_detail',
            question: 'What must an associate do when language cannot be corrected?',
            choices: [
              'Ignore the sentence',
              'Publish it anyway',
              'Flag it for supervisor review',
              'Send it to a friend',
            ],
            answerIndex: 2,
          },
          {
            id: 'b1_infer',
            question: 'How does the broadcast frame control?',
            choices: ['As punishment', 'As care and safety', 'As entertainment', 'As optional advice'],
            answerIndex: 1,
          },
        ],
      },
    },
    {
      id: 'mission-w1-grammar',
      weekId: 'week-1',
      orderIndex: 2,
      title: 'Clarity Bay',
      description: 'Grammar exercises for Right & Proper language.',
      missionType: 'grammar',
      config: {
        requiredCount: 8,
        storyBeat: {
          beatTitle: 'First Desk Assignment',
          location: 'Language Lab',
          objective: 'Complete your first processing batch with high accuracy.',
          speaker: 'IVAN',
          line: 'If PEARL marks too many errors, it goes in your file. Just... stay precise.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
        documents: [
          {
            id: 'w01_d01',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'Agent Mira ____ on time every day.',
            options: ['clock in', 'clocks in', 'clocking in', 'clocked in'],
            correctIndex: 1,
            targets: ['present-simple', 'third-person-s'],
          },
          {
            id: 'w01_d02',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'Yesterday we ____ the memo twice.',
            options: ['read', 'reads', 'reading', 'will read'],
            correctIndex: 0,
            targets: ['simple-past', 'irregular-verbs'],
          },
          {
            id: 'w01_d03',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'There ____ two new rules today.',
            options: ['is', 'are', 'was', 'be'],
            correctIndex: 1,
            targets: ['there-is-are'],
          },
          {
            id: 'w01_d04',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'I can ____ the evidence clearly.',
            options: ['to hear', 'hear', 'hears', 'hearing'],
            correctIndex: 1,
            targets: ['modals', 'base-verb'],
          },
          {
            id: 'w01_d05',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'We ____ in the briefing room now.',
            options: ['am', 'is', 'are', 'be'],
            correctIndex: 2,
            targets: ['be-verb', 'present-continuous'],
          },
          {
            id: 'w01_d06',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'The agent ____ finish the Case File.',
            options: ['have to', 'has to', 'having to', 'had to'],
            correctIndex: 1,
            targets: ['have-to', 'third-person-s'],
          },
          {
            id: 'w01_d07',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'Please ____ your answers before you submit.',
            options: ['check', 'checks', 'checked', 'checking'],
            correctIndex: 0,
            targets: ['imperatives'],
          },
          {
            id: 'w01_d08',
            type: 'choose_correct',
            prompt: 'Choose the correct sentence.',
            text: 'If Canva is blocked, you ____ use fallback checks.',
            options: ['can', 'cans', 'coulds', 'to can'],
            correctIndex: 0,
            targets: ['modals'],
          },
        ],
      },
    },
    {
      id: 'mission-w1-listening',
      weekId: 'week-1',
      orderIndex: 3,
      title: 'Evidence',
      description: 'Listen to the broadcast and answer comprehension checks.',
      missionType: 'listening',
      config: {
        mediaUrl: '',
        transcript: [
          'Broadcast: All agents must follow Right & Proper language in official documents.',
          'Reminder: If a briefing cannot load, proceed with the in\u2011app checks.',
          'Notice: Unverified memos should be archived until further instruction.',
        ],
        highlightPrompt: 'Which transcript line best explains what to do with unverified memos?',
        highlightAnswerIndex: 2,
        storyBeat: {
          beatTitle: 'Evidence Packet A',
          location: 'Evidence Desk',
          objective: 'Prove your answer using exact transcript evidence.',
          speaker: 'BETTY',
          line: 'Details matter, sugar. The right line can protect your whole shift record.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
        checks: [
          {
            id: 'l1_gist',
            question: 'What is the broadcast mainly about?',
            choices: [
              'A new schedule',
              'Language rules',
              'A weather report',
              'A game',
            ],
            answerIndex: 1,
          },
          {
            id: 'l1_detail',
            question: 'What should you do if a briefing cannot load?',
            choices: [
              'Quit the Shift',
              'Proceed with in\u2011app checks',
              'Wait 30 minutes',
              'Ask for a password',
            ],
            answerIndex: 1,
          },
          {
            id: 'l1_infer',
            question: 'Why might memos be archived?',
            choices: [
              'They are unverified',
              'They are funny',
              'They are long',
              'They are new',
            ],
            answerIndex: 0,
          },
        ],
      },
    },
    {
      id: 'mission-w1-voice-log',
      weekId: 'week-1',
      orderIndex: 4,
      title: 'Voice Log',
      description: 'Record your retelling of the briefing.',
      missionType: 'voice_log',
      config: {
        prompt: 'Retell the briefing in 45 seconds using: "We have to\u2026", "I can\u2026", "There are\u2026".',
        targetPhrases: ['We have to\u2026', 'I can\u2026', 'There are\u2026'],
        storyBeat: {
          beatTitle: 'Badge Voice Check',
          location: 'Voice Booth',
          objective: 'Demonstrate controlled speech before end-of-shift filing.',
          speaker: 'PEARL',
          line: 'Speech confirms clarity. Clarity confirms loyalty.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
      },
    },
    {
      id: 'mission-w1-case-file',
      weekId: 'week-1',
      orderIndex: 5,
      title: 'Case File',
      description: 'Write your summary of today\u2019s Shift.',
      missionType: 'case_file',
      config: {
        prompt: 'Write a 4\u20136 sentence Case File summary. Include one Right & Proper rule and one suspicious detail.',
        minWords: 40,
        storyBeat: {
          beatTitle: 'First Official Record',
          location: 'Filing Desk',
          objective: 'Write a compliant summary while noting one irregular signal.',
          speaker: 'M.K. CATSKIL',
          line: 'Most people learn to write what they are told. Fewer learn to notice what is missing.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
      },
    },
    {
      id: 'mission-w1-clock-out',
      weekId: 'week-1',
      orderIndex: 6,
      title: 'Clock-Out',
      description: 'Review your Shift and clock out.',
      missionType: 'clock_out',
      config: {
        cliffhanger: 'A memo arrives stamped HIDDEN LEXICON \u2014 and your supervisor says it never existed.',
        storyBeat: {
          beatTitle: 'Clock-Out',
          location: 'End of Day',
          objective: 'Complete your first shift and capture the final anomaly.',
          speaker: 'PEARL',
          line: 'Excellent first shift, Associate-7. Rest well. Tomorrow\'s queue may feel... unfamiliar.',
          pressure: 'System note: Unlogged memo signature detected.',
          learningFocus: week1Story.grammarFocus,
          knownWords: week1Story.knownWords,
          newWords: week1Story.newWords,
        },
      },
    },
  ];

  for (const m of week1Missions) {
    await prisma.mission.upsert({
      where: { id: m.id },
      update: {
        weekId: m.weekId,
        title: m.title,
        description: m.description,
        missionType: m.missionType,
        config: m.config,
        orderIndex: m.orderIndex,
      },
      create: m,
    });
  }
  console.log(`  Week 1 Missions: ${week1Missions.length} steps seeded`);

  const remainingWeekMissions = weekData
    .filter((week) => week.id !== 'week-1')
    .flatMap((week) => createDefaultWeekMissions(week));

  for (const mission of remainingWeekMissions) {
    await prisma.mission.upsert({
      where: { id: mission.id },
      update: {
        weekId: mission.weekId,
        title: mission.title,
        description: mission.description,
        missionType: mission.missionType,
        config: mission.config,
        orderIndex: mission.orderIndex,
      },
      create: mission,
    });
  }
  console.log(`  Additional Missions: ${remainingWeekMissions.length} steps seeded for weeks 2–18`);

  // ─── Vocabulary (15 approved words for Week 1) ───
  const words = [
    'compliance', 'regulation', 'protocol', 'directive',
    'authorization', 'designation', 'procedure', 'clearance',
    'documentation', 'submission', 'mandate', 'oversight',
    'surveillance', 'classification', 'provision',
  ];

  for (const word of words) {
    await prisma.vocabulary.upsert({
      where: { id: `vocab-${word}` },
      update: {},
      create: {
        id: `vocab-${word}`,
        word,
        tier: 'approved',
        source: 'curriculum',
        weekId: 'week-1',
      },
    });
  }
  let seededStoryWords = 0;
  for (const [weekNumberText, plan] of Object.entries(WEEK_STORY_PLANS)) {
    const weekNumber = Number(weekNumberText);
    const weekId = `week-${weekNumber}`;
    for (const word of plan.newWords) {
      const slug = word.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await prisma.vocabulary.upsert({
        where: { id: `vocab-w${weekNumber}-${slug}` },
        update: {},
        create: {
          id: `vocab-w${weekNumber}-${slug}`,
          word,
          tier: 'approved',
          source: 'curriculum',
          weekId,
        },
      });
      seededStoryWords++;
    }
  }
  console.log(`  Vocabulary: ${words.length} week-1 words + ${seededStoryWords} story words`);

  // ─── PEARL Messages ───
  // Existing propaganda/notice messages
  const propagandaMessages = [
    'REMINDER: Approved language ensures community safety.',
    'Your words shape reality. Choose Ministry-approved terms.',
    'Unapproved vocabulary has been linked to antisocial behavior.',
    'The Ministry protects your right to safe communication.',
    'Report any unauthorized language use to your supervisor.',
    'Compliance is not restriction \u2014 it is liberation.',
    'Today\'s approved phrase: "productive harmony."',
    'PEARL monitors your progress for your benefit.',
    'Language purity is social purity.',
    'The Director reminds you: clarity through conformity.',
  ];

  for (let i = 0; i < propagandaMessages.length; i++) {
    await prisma.pearlMessage.upsert({
      where: { id: `pearl-msg-${i + 1}` },
      update: {},
      create: {
        id: `pearl-msg-${i + 1}`,
        text: propagandaMessages[i],
        category: 'notice',
        isActive: true,
      },
    });
  }

  // Success messages
  const successMessages = [
    'Excellent compliance, Citizen. Your accuracy serves the Republic.',
    'Your response has been approved. The Party acknowledges your effort.',
    'Correct. The Ministry recognizes diligent work.',
    'Well done. Your language scores contribute to collective harmony.',
    'Outstanding, Citizen. Your record has been updated favorably.',
  ];

  for (let i = 0; i < successMessages.length; i++) {
    await prisma.pearlMessage.upsert({
      where: { id: `pearl-success-${i + 1}` },
      update: {},
      create: {
        id: `pearl-success-${i + 1}`,
        text: successMessages[i],
        category: 'success',
        isActive: true,
      },
    });
  }

  // Incorrect messages
  const incorrectMessages = [
    'That response requires revision, Citizen. Try again.',
    'The Ministry notes an error. Please review and correct.',
    'Incorrect \u2014 but the Party believes in your potential.',
    'A small deviation detected. The correct answer is within reach.',
    'Not quite, Citizen. The Ministry encourages another attempt.',
  ];

  for (let i = 0; i < incorrectMessages.length; i++) {
    await prisma.pearlMessage.upsert({
      where: { id: `pearl-incorrect-${i + 1}` },
      update: {},
      create: {
        id: `pearl-incorrect-${i + 1}`,
        text: incorrectMessages[i],
        category: 'incorrect',
        isActive: true,
      },
    });
  }

  // Hint messages
  const hintMessages = [
    'Consider the grammatical structure carefully, Citizen.',
    'The answer may be found by reviewing the briefing materials.',
    'Think about subject-verb agreement. The Party wants you to succeed.',
    'Review the options once more. Clarity leads to compliance.',
    'A helpful reminder: check verb tense before submitting.',
  ];

  for (let i = 0; i < hintMessages.length; i++) {
    await prisma.pearlMessage.upsert({
      where: { id: `pearl-hint-${i + 1}` },
      update: {},
      create: {
        id: `pearl-hint-${i + 1}`,
        text: hintMessages[i],
        category: 'hint',
        isActive: true,
      },
    });
  }

  // Concern messages
  const concernMessages = [
    'P.E.A.R.L. has noted an irregularity in your progress.',
    'Your completion rate has drawn attention. Please continue promptly.',
    'The Ministry wonders about your engagement level, Citizen.',
    'Extended inactivity has been flagged for wellness review.',
    'Your supervisor has been notified of your current pace.',
  ];

  for (let i = 0; i < concernMessages.length; i++) {
    await prisma.pearlMessage.upsert({
      where: { id: `pearl-concern-${i + 1}` },
      update: {},
      create: {
        id: `pearl-concern-${i + 1}`,
        text: concernMessages[i],
        category: 'concern',
        isActive: true,
      },
    });
  }

  const totalPearlMessages =
    propagandaMessages.length +
    successMessages.length +
    incorrectMessages.length +
    hintMessages.length +
    concernMessages.length;
  console.log(`  PEARL messages: ${totalPearlMessages} (across 5 categories)`);

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
