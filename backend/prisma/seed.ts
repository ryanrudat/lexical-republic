import { PrismaClient, Prisma } from '@prisma/client';
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

  // ─── Default Class ───
  const defaultClass = await prisma.class.upsert({
    where: { joinCode: 'ALPHA1' },
    update: { name: '110-A', teacherId: teacher.id },
    create: {
      name: '110-A',
      joinCode: 'ALPHA1',
      teacherId: teacher.id,
    },
  });
  console.log(`  Class: ${defaultClass.name} (code: ${defaultClass.joinCode})`);

  // ─── Pairs (student pairs — new system) ───
  const pinHash = await bcrypt.hash('1234', 10);
  const lanes = [1, 2, 3, 2, 1];
  const pairNames: [string, string][] = [
    ['Alice', 'Bob'],
    ['Charlie', 'Diana'],
    ['Ethan', 'Fiona'],
    ['Grace', 'Henry'],
    ['Iris', ''],
  ];

  for (let i = 0; i < 5; i++) {
    const designation = `CA-${i + 1}`;
    const pair = await prisma.pair.upsert({
      where: { designation },
      update: {},
      create: {
        designation,
        pin: pinHash,
        studentAName: pairNames[i][0],
        studentBName: pairNames[i][1],
        lane: lanes[i],
      },
    });
    console.log(`  Pair: ${pair.designation} (lane ${pair.lane}) — ${pair.studentAName}${pair.studentBName ? ` & ${pair.studentBName}` : ''}`);

    // Enroll pair in default class
    await prisma.classEnrollment.upsert({
      where: { pairId_classId: { pairId: pair.id, classId: defaultClass.id } },
      update: {},
      create: { pairId: pair.id, classId: defaultClass.id },
    });
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

  // ─── Unlock Weeks 1-3 for default class ───
  for (const wkId of ['week-1', 'week-2', 'week-3']) {
    await prisma.classWeekUnlock.upsert({
      where: { classId_weekId: { classId: defaultClass.id, weekId: wkId } },
      update: {},
      create: { classId: defaultClass.id, weekId: wkId },
    });
  }
  console.log(`  Weeks 1-3 unlocked for class ${defaultClass.name}`);

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

  // ─── Party Lexical Dictionary (Weeks 1-3) ───
  console.log('  Seeding dictionary...');

  type DictWordSeed = {
    word: string;
    partOfSpeech: string;
    phonetic: string;
    partyDefinition: string;
    trueDefinition: string;
    exampleSentence: string;
    translationZhTw?: string;
    toeicCategory: string;
    wordFamilyGroup: string | null;
    isWorldBuilding: boolean;
    weekIntroduced: number;
  };

  const dictionaryWords: DictWordSeed[] = [
    // ── Week 1: First Shift Orientation ── Target Words
    {
      word: 'compliance',
      partOfSpeech: 'noun',
      phonetic: '/kəmˈplaɪ.əns/',
      partyDefinition: 'The natural state of a healthy citizen who follows Ministry guidelines without hesitation.',
      trueDefinition: 'The act of obeying rules, laws, or requests made by people in authority.',
      exampleSentence: 'Strong compliance protects citizens from confusion.',
      translationZhTw: '遵守；服從',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'comply',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'directive',
      partOfSpeech: 'noun',
      phonetic: '/dɪˈrek.tɪv/',
      partyDefinition: 'An official order issued by the Ministry for the well-being of all citizens.',
      trueDefinition: 'An official instruction or order given by someone in authority.',
      exampleSentence: 'A directive is an official order. Follow each protocol step exactly.',
      translationZhTw: '指令',
      toeicCategory: 'communication',
      wordFamilyGroup: 'direct',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'protocol',
      partOfSpeech: 'noun',
      phonetic: '/ˈproʊ.tə.kɑːl/',
      partyDefinition: 'The approved sequence of actions that ensures safety and order in all Ministry operations.',
      trueDefinition: 'A set of rules or procedures for how something should be done, especially in official situations.',
      exampleSentence: 'Follow each protocol step exactly to maintain clarity.',
      translationZhTw: '規程；協議',
      toeicCategory: 'procedures',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'clearance',
      partOfSpeech: 'noun',
      phonetic: '/ˈklɪr.əns/',
      partyDefinition: 'Permission granted by the Ministry to access files, areas, or information at your approved level.',
      trueDefinition: 'Official permission or approval to do something, especially to access restricted areas or information.',
      exampleSentence: 'You have temporary clearance for your first set of files.',
      translationZhTw: '許可；通行證',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'clear',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'work',
      partOfSpeech: 'noun',
      phonetic: '/wɜːrk/',
      partyDefinition: 'Productive labor performed in service of the Republic. All work is meaningful.',
      trueDefinition: 'Activity involving mental or physical effort done to achieve a purpose or result.',
      exampleSentence: 'Your work begins now, Clarity Associate.',
      translationZhTw: '工作',
      toeicCategory: 'business',
      wordFamilyGroup: 'work',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'rule',
      partOfSpeech: 'noun',
      phonetic: '/ruːl/',
      partyDefinition: 'A guideline established by the Party to protect citizens from language confusion.',
      trueDefinition: 'An official instruction that says how things must be done or what is allowed.',
      exampleSentence: 'Every rule exists to keep language safe and clear.',
      translationZhTw: '規則',
      toeicCategory: 'procedures',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'team',
      partOfSpeech: 'noun',
      phonetic: '/tiːm/',
      partyDefinition: 'A designated group of associates working together under Ministry coordination.',
      trueDefinition: 'A group of people who work together to achieve a shared goal.',
      exampleSentence: 'Your team in Clarity Bay processes language together.',
      translationZhTw: '團隊',
      toeicCategory: 'personnel',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'assignment',
      partOfSpeech: 'noun',
      phonetic: '/əˈsaɪn.mənt/',
      partyDefinition: 'A task allocated by the Ministry based on your competence level and clearance.',
      trueDefinition: 'A task or piece of work given to someone as part of their job or studies.',
      exampleSentence: 'Your first assignment begins in Clarity Bay.',
      translationZhTw: '任務；指派工作',
      toeicCategory: 'business',
      wordFamilyGroup: 'assign',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'submit',
      partOfSpeech: 'verb',
      phonetic: '/səbˈmɪt/',
      partyDefinition: 'To deliver completed work to the Ministry review system for approval.',
      trueDefinition: 'To give a document, plan, or piece of work to someone in authority for them to consider.',
      exampleSentence: 'Read twice before you submit. It helps.',
      translationZhTw: '提交',
      toeicCategory: 'office',
      wordFamilyGroup: 'submit',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'accurate',
      partOfSpeech: 'adjective',
      phonetic: '/ˈæk.jʊ.rət/',
      partyDefinition: 'Precisely aligned with Ministry-approved information. Accuracy is the highest virtue.',
      trueDefinition: 'Correct and exact, without any mistakes.',
      exampleSentence: 'Accurate associates are valued associates.',
      translationZhTw: '準確的',
      toeicCategory: 'business',
      wordFamilyGroup: 'accurate',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    // ── Week 1: World-Building Words
    {
      word: 'associate',
      partOfSpeech: 'noun',
      phonetic: '/əˈsoʊ.si.ət/',
      partyDefinition: 'A Ministry employee at entry level, assigned to a Bay for language processing duties.',
      trueDefinition: 'A person connected with an organization, or a colleague at work.',
      exampleSentence: 'Welcome, Clarity Associate-7. Your shift begins now.',
      translationZhTw: '員工；夥伴',
      toeicCategory: 'personnel',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 1,
    },
    {
      word: 'designation',
      partOfSpeech: 'noun',
      phonetic: '/ˌdez.ɪɡˈneɪ.ʃən/',
      partyDefinition: 'Your official Ministry identity code. Personal names are not used in professional settings.',
      trueDefinition: 'An official name, title, or label given to someone or something.',
      exampleSentence: 'Please use your designation, not your personal name.',
      translationZhTw: '稱號；指定名稱',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'designate',
      isWorldBuilding: true,
      weekIntroduced: 1,
    },
    {
      word: 'ministry',
      partOfSpeech: 'noun',
      phonetic: '/ˈmɪn.ɪ.stri/',
      partyDefinition: 'The governing body responsible for maintaining healthy and safe information across the Republic.',
      trueDefinition: 'A government department responsible for a particular area of activity.',
      exampleSentence: 'The Ministry of Healthy and Safe Information protects all citizens.',
      translationZhTw: '部；部門',
      toeicCategory: 'business',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 1,
    },
    {
      word: 'citizen',
      partOfSpeech: 'noun',
      phonetic: '/ˈsɪt.ɪ.zən/',
      partyDefinition: 'A registered member of the Lexicon Republic entitled to safety through language clarity.',
      trueDefinition: 'A person who legally belongs to a country and has rights and duties there.',
      exampleSentence: 'Clear words create safe minds. Every citizen deserves clarity.',
      translationZhTw: '公民',
      toeicCategory: 'personnel',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 1,
    },
    {
      word: 'shift',
      partOfSpeech: 'noun',
      phonetic: '/ʃɪft/',
      partyDefinition: 'A scheduled period of productive service at your assigned Ministry station.',
      trueDefinition: 'A set period of time during which a group of workers do their jobs before being replaced by others.',
      exampleSentence: 'Your shift begins now. Report to your station.',
      translationZhTw: '班次；輪班',
      toeicCategory: 'office',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 1,
    },
    {
      word: 'supervisor',
      partOfSpeech: 'noun',
      phonetic: '/ˈsuː.pɚ.vaɪ.zɚ/',
      partyDefinition: 'A senior associate who guides your development and reviews flagged items for the Ministry.',
      trueDefinition: 'A person whose job is to watch and direct other workers.',
      exampleSentence: 'Flag unclear documents for supervisor review and remain calm.',
      translationZhTw: '主管；監督者',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'supervise',
      isWorldBuilding: true,
      weekIntroduced: 1,
    },

    // ── Week 2: The Memo That Wasn't There ── Target Words
    {
      word: 'contradiction',
      partOfSpeech: 'noun',
      phonetic: '/ˌkɑːn.trəˈdɪk.ʃən/',
      partyDefinition: 'A temporary misalignment between records, always resolved through proper revision channels.',
      trueDefinition: 'A situation in which two facts, ideas, or statements cannot both be true at the same time.',
      exampleSentence: 'Identify any contradiction. Report only verified differences.',
      translationZhTw: '矛盾',
      toeicCategory: 'communication',
      wordFamilyGroup: 'contradict',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'missing',
      partOfSpeech: 'adjective',
      phonetic: '/ˈmɪs.ɪŋ/',
      partyDefinition: 'Absent from the current record. Missing items were likely removed for citizen protection.',
      trueDefinition: 'Not in the expected place; lost or absent.',
      exampleSentence: 'If a line is missing, check the latest revision before raising a concern.',
      translationZhTw: '遺失的；缺少的',
      toeicCategory: 'office',
      wordFamilyGroup: 'miss',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'notice',
      partOfSpeech: 'noun',
      phonetic: '/ˈnoʊ.tɪs/',
      partyDefinition: 'An official announcement distributed through approved Ministry channels.',
      trueDefinition: 'A written or printed announcement that gives information or a warning.',
      exampleSentence: 'A revised notice replaces earlier wording automatically.',
      translationZhTw: '通知；公告',
      toeicCategory: 'communication',
      wordFamilyGroup: 'notice',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'revision',
      partOfSpeech: 'noun',
      phonetic: '/rɪˈvɪʒ.ən/',
      partyDefinition: 'An approved update to an existing document. All revisions improve clarity and safety.',
      trueDefinition: 'A change or set of changes made to something in order to improve or correct it.',
      exampleSentence: "Today the revision says something different from yesterday's memo.",
      translationZhTw: '修訂；修改',
      toeicCategory: 'office',
      wordFamilyGroup: 'revise',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'record',
      partOfSpeech: 'noun',
      phonetic: '/ˈrek.ɚd/',
      partyDefinition: 'An official Ministry document stored in the Archive for reference and verification.',
      trueDefinition: 'A written account of something that is kept so that it can be looked at and used in the future.',
      exampleSentence: "The record from yesterday does not match today's version.",
      translationZhTw: '紀錄',
      toeicCategory: 'office',
      wordFamilyGroup: 'record',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'verify',
      partOfSpeech: 'verb',
      phonetic: '/ˈver.ɪ.faɪ/',
      partyDefinition: 'To confirm that information matches the latest Ministry-approved version.',
      trueDefinition: 'To check that something is true or correct.',
      exampleSentence: 'Associates must verify all differences before submitting a report.',
      translationZhTw: '驗證；核實',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'verify',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'compare',
      partOfSpeech: 'verb',
      phonetic: '/kəmˈper/',
      partyDefinition: 'To examine two Ministry documents side by side and note approved differences.',
      trueDefinition: 'To examine two or more things to see how they are similar or different.',
      exampleSentence: 'Compare Memo 14 and Memo 14-R to find what changed.',
      translationZhTw: '比較',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'compare',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'report',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈpɔːrt/',
      partyDefinition: 'To deliver verified observations to the Ministry through proper documentation channels.',
      trueDefinition: 'To give a description of something or information about it to someone in authority.',
      exampleSentence: 'Associates report differences with calm precision.',
      translationZhTw: '報告',
      toeicCategory: 'communication',
      wordFamilyGroup: 'report',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'update',
      partOfSpeech: 'noun',
      phonetic: '/ˈʌp.deɪt/',
      partyDefinition: 'New information issued by the Ministry to replace outdated records. Always trust the latest update.',
      trueDefinition: 'The most recent information or news about something.',
      exampleSentence: 'Updates happen because leadership cares about clarity.',
      translationZhTw: '更新',
      toeicCategory: 'communication',
      wordFamilyGroup: 'update',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'evidence',
      partOfSpeech: 'noun',
      phonetic: '/ˈev.ɪ.dəns/',
      partyDefinition: 'Verified information that supports a Ministry-approved conclusion.',
      trueDefinition: 'Facts, signs, or objects that make you believe something is true.',
      exampleSentence: 'Write one evidence sentence describing what changed between versions.',
      translationZhTw: '證據',
      toeicCategory: 'procedures',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    // ── Week 2: World-Building Words
    {
      word: 'memo',
      partOfSpeech: 'noun',
      phonetic: '/ˈmem.oʊ/',
      partyDefinition: 'An internal Ministry communication containing directives or procedural updates.',
      trueDefinition: 'A short written message or report used in a business or organization.',
      exampleSentence: 'Morning dispatch includes Memo 14 and Memo 14-R.',
      translationZhTw: '備忘錄',
      toeicCategory: 'communication',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 2,
    },
    {
      word: 'dispatch',
      partOfSpeech: 'noun',
      phonetic: '/dɪˈspætʃ/',
      partyDefinition: 'The official morning distribution of memos, notices, and case files to all associate stations.',
      trueDefinition: 'The sending of something or someone to a destination for a particular purpose.',
      exampleSentence: 'Contradictory records appeared in the morning dispatch.',
      translationZhTw: '派遣；發送',
      toeicCategory: 'office',
      wordFamilyGroup: 'dispatch',
      isWorldBuilding: true,
      weekIntroduced: 2,
    },
    {
      word: 'archive',
      partOfSpeech: 'noun',
      phonetic: '/ˈɑːr.kaɪv/',
      partyDefinition: "The Ministry's permanent record storage. All finalized documents are preserved in the Archive.",
      trueDefinition: 'A collection of historical records or documents, or the place where they are kept.',
      exampleSentence: 'Check the Archive for the original version of the memo.',
      translationZhTw: '檔案庫',
      toeicCategory: 'office',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 2,
    },
    {
      word: 'concern',
      partOfSpeech: 'noun',
      phonetic: '/kənˈsɜːrn/',
      partyDefinition: 'A formally registered observation that something may deviate from Ministry standards.',
      trueDefinition: 'A feeling of worry about something important, or something that worries you.',
      exampleSentence: 'Check the latest revision before raising a concern.',
      translationZhTw: '疑慮；擔憂',
      toeicCategory: 'procedures',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 2,
    },
    {
      word: 'version',
      partOfSpeech: 'noun',
      phonetic: '/ˈvɜːr.ʒən/',
      partyDefinition: 'A numbered iteration of a Ministry document. Only the latest version is considered valid.',
      trueDefinition: 'A particular form of something that is slightly different from other forms of the same thing.',
      exampleSentence: 'Which version is the latest? Only the current version matters.',
      translationZhTw: '版本',
      toeicCategory: 'office',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 2,
    },
    {
      word: 'procedure',
      partOfSpeech: 'noun',
      phonetic: '/prəˈsiː.dʒɚ/',
      partyDefinition: 'The official method for completing a task, as defined by Ministry operational standards.',
      trueDefinition: 'The official or accepted way of doing something, especially in a particular job.',
      exampleSentence: 'Follow standard procedure when handling contradictory records.',
      translationZhTw: '程序；手續',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'proceed',
      isWorldBuilding: true,
      weekIntroduced: 2,
    },

    // ── Week 3: Clarity Bay Intake ── Target Words
    {
      word: 'clarify',
      partOfSpeech: 'verb',
      phonetic: '/ˈkler.ɪ.faɪ/',
      partyDefinition: 'To make language clear and aligned with Ministry standards before processing.',
      trueDefinition: 'To make something easier to understand by giving more details or a simpler explanation.',
      exampleSentence: 'If a message is unclear, clarify before you approve.',
      translationZhTw: '澄清；說明',
      toeicCategory: 'communication',
      wordFamilyGroup: 'clear',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'queue',
      partOfSpeech: 'noun',
      phonetic: '/kjuː/',
      partyDefinition: 'The ordered list of cases awaiting processing at your station. A moving queue is a healthy queue.',
      trueDefinition: 'A line of people or things waiting for something, or a list of items waiting to be dealt with.',
      exampleSentence: 'A calm associate keeps the queue moving.',
      translationZhTw: '排隊；佇列',
      toeicCategory: 'office',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'priority',
      partOfSpeech: 'noun',
      phonetic: '/praɪˈɔːr.ə.ti/',
      partyDefinition: 'The Ministry-assigned importance level of a case. High priority cases serve the collective first.',
      trueDefinition: 'The thing that is regarded as more important than others and should be dealt with first.',
      exampleSentence: 'High priority cases should be processed first.',
      translationZhTw: '優先順序',
      toeicCategory: 'business',
      wordFamilyGroup: 'prior',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'approve',
      partOfSpeech: 'verb',
      phonetic: '/əˈpruːv/',
      partyDefinition: 'To officially confirm that language meets Ministry standards and may be released to citizens.',
      trueDefinition: 'To officially agree to or accept something as satisfactory.',
      exampleSentence: 'Do not approve unclear content without verification.',
      translationZhTw: '批准；核可',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'approve',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'process',
      partOfSpeech: 'verb',
      phonetic: '/ˈprɑː.ses/',
      partyDefinition: 'To review, correct, and finalize language materials according to Ministry protocol.',
      trueDefinition: 'To deal with something by following an established procedure or set of steps.',
      exampleSentence: 'Process each case carefully before moving to the next.',
      translationZhTw: '處理',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'process',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'message',
      partOfSpeech: 'noun',
      phonetic: '/ˈmes.ɪdʒ/',
      partyDefinition: 'Any text-based communication passing through Ministry review channels.',
      trueDefinition: 'A piece of written or spoken information sent from one person to another.',
      exampleSentence: 'When a message is unclear, we can ask for clarification.',
      translationZhTw: '訊息',
      toeicCategory: 'communication',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'maintain',
      partOfSpeech: 'verb',
      phonetic: '/meɪnˈteɪn/',
      partyDefinition: 'To keep systems, standards, and language quality at Ministry-approved levels at all times.',
      trueDefinition: 'To keep something in good condition by checking or repairing it regularly.',
      exampleSentence: 'Maintain quality and speed at your processing station.',
      translationZhTw: '維持；保養',
      toeicCategory: 'business',
      wordFamilyGroup: 'maintain',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'request',
      partOfSpeech: 'noun',
      phonetic: '/rɪˈkwest/',
      partyDefinition: 'A formal appeal submitted through Ministry channels. All requests are logged and reviewed.',
      trueDefinition: 'The act of politely asking for something, or the thing that is asked for.',
      exampleSentence: 'Submit a polite clarification request before dispatch.',
      translationZhTw: '請求；要求',
      toeicCategory: 'communication',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'decision',
      partOfSpeech: 'noun',
      phonetic: '/dɪˈsɪʒ.ən/',
      partyDefinition: 'A processing choice made by an associate, subject to Ministry review and quality audit.',
      trueDefinition: 'A choice that you make about something after thinking about several possibilities.',
      exampleSentence: 'A safe priority decision protects both speed and accuracy.',
      translationZhTw: '決定',
      toeicCategory: 'business',
      wordFamilyGroup: 'decide',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'confirm',
      partOfSpeech: 'verb',
      phonetic: '/kənˈfɜːrm/',
      partyDefinition: 'To verify and officially approve that information matches Ministry records.',
      trueDefinition: 'To state or show that something is definitely true or correct.',
      exampleSentence: 'Confirm the priority level before dispatching any case.',
      translationZhTw: '確認',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'confirm',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    // ── Week 3: World-Building Words
    {
      word: 'dispatch',
      partOfSpeech: 'verb',
      phonetic: '/dɪˈspætʃ/',
      partyDefinition: 'To send a processed case file to its next destination in the Ministry workflow.',
      trueDefinition: 'To send someone or something to a particular place for a particular purpose.',
      exampleSentence: 'Fast, accurate dispatch protects the collective.',
      translationZhTw: '派遣；發送',
      toeicCategory: 'office',
      wordFamilyGroup: 'dispatch',
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'quota',
      partOfSpeech: 'noun',
      phonetic: '/ˈkwoʊ.tə/',
      partyDefinition: 'The minimum number of cases an associate must process per shift. Meeting quota demonstrates dedication.',
      trueDefinition: 'A limited amount of something that is officially allowed or expected.',
      exampleSentence: 'The daily quota has increased. Maintain speed and accuracy.',
      translationZhTw: '配額',
      toeicCategory: 'business',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'station',
      partOfSpeech: 'noun',
      phonetic: '/ˈsteɪ.ʃən/',
      partyDefinition: 'Your assigned Ministry workstation where all processing duties are performed.',
      trueDefinition: 'A place or building where a particular service or activity is based.',
      exampleSentence: 'Return to your station and continue processing the queue.',
      translationZhTw: '站；工作站',
      toeicCategory: 'office',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'collective',
      partOfSpeech: 'noun',
      phonetic: '/kəˈlek.tɪv/',
      partyDefinition: 'All citizens of the Republic, unified under Party guidance. The collective comes before the individual.',
      trueDefinition: 'A group of people who share the same interests or who work together.',
      exampleSentence: 'Fast, accurate dispatch protects the collective.',
      translationZhTw: '集體',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'collect',
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'hesitation',
      partOfSpeech: 'noun',
      phonetic: '/ˌhez.ɪˈteɪ.ʃən/',
      partyDefinition: 'A delay in processing caused by doubt. Hesitation spreads uncertainty and should be resolved quickly.',
      trueDefinition: 'The act of pausing before doing something, especially because you are nervous or unsure.',
      exampleSentence: 'Confidence matters. Hesitation spreads doubt.',
      translationZhTw: '猶豫',
      toeicCategory: 'communication',
      wordFamilyGroup: 'hesitate',
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'volume',
      partOfSpeech: 'noun',
      phonetic: '/ˈvɑːl.juːm/',
      partyDefinition: 'The quantity of cases in the processing queue. High volume is a sign of Republic productivity.',
      trueDefinition: 'The amount or quantity of something, especially when it is large.',
      exampleSentence: 'Queue volume has doubled. Maintain quality and speed.',
      translationZhTw: '量；音量',
      toeicCategory: 'business',
      wordFamilyGroup: null,
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
    {
      word: 'verification',
      partOfSpeech: 'noun',
      phonetic: '/ˌver.ɪ.fɪˈkeɪ.ʃən/',
      partyDefinition: 'The process of confirming that content meets Ministry approval standards before release.',
      trueDefinition: 'The process of checking that something is true, accurate, or valid.',
      exampleSentence: 'Speed must never replace verification in case processing.',
      translationZhTw: '驗證',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'verify',
      isWorldBuilding: true,
      weekIntroduced: 3,
    },
  ];

  for (const dw of dictionaryWords) {
    const id = `dict-w${dw.weekIntroduced}-${dw.word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await prisma.dictionaryWord.upsert({
      where: { word_weekIntroduced: { word: dw.word, weekIntroduced: dw.weekIntroduced } },
      update: {
        partOfSpeech: dw.partOfSpeech,
        phonetic: dw.phonetic,
        partyDefinition: dw.partyDefinition,
        trueDefinition: dw.trueDefinition,
        exampleSentence: dw.exampleSentence,
        translationZhTw: dw.translationZhTw ?? null,
        toeicCategory: dw.toeicCategory,
        wordFamilyGroup: dw.wordFamilyGroup,
        isWorldBuilding: dw.isWorldBuilding,
      },
      create: {
        id,
        word: dw.word,
        partOfSpeech: dw.partOfSpeech,
        phonetic: dw.phonetic,
        partyDefinition: dw.partyDefinition,
        trueDefinition: dw.trueDefinition,
        exampleSentence: dw.exampleSentence,
        translationZhTw: dw.translationZhTw ?? null,
        toeicCategory: dw.toeicCategory,
        wordFamilyGroup: dw.wordFamilyGroup,
        weekIntroduced: dw.weekIntroduced,
        initialStatus: 'approved',
        isWorldBuilding: dw.isWorldBuilding,
      },
    });
  }
  console.log(`  Dictionary: ${dictionaryWords.length} words seeded (weeks 1-3)`);

  // ─── Word Families ───
  const wordFamilies = [
    { groupId: 'comply', rootWord: 'comply', members: ['compliance'] },
    { groupId: 'direct', rootWord: 'direct', members: ['directive'] },
    { groupId: 'clear', rootWord: 'clear', members: ['clearance', 'clarify'] },
    { groupId: 'assign', rootWord: 'assign', members: ['assignment'] },
    { groupId: 'submit', rootWord: 'submit', members: ['submit', 'submission'] },
    { groupId: 'accurate', rootWord: 'accurate', members: ['accurate', 'accuracy'] },
    { groupId: 'designate', rootWord: 'designate', members: ['designation'] },
    { groupId: 'supervise', rootWord: 'supervise', members: ['supervisor'] },
    { groupId: 'contradict', rootWord: 'contradict', members: ['contradiction'] },
    { groupId: 'revise', rootWord: 'revise', members: ['revision'] },
    { groupId: 'verify', rootWord: 'verify', members: ['verify', 'verification'] },
    { groupId: 'compare', rootWord: 'compare', members: ['compare', 'comparison'] },
    { groupId: 'report', rootWord: 'report', members: ['report'] },
    { groupId: 'dispatch', rootWord: 'dispatch', members: ['dispatch'] },
    { groupId: 'approve', rootWord: 'approve', members: ['approve', 'approval'] },
    { groupId: 'process', rootWord: 'process', members: ['process', 'processing'] },
    { groupId: 'maintain', rootWord: 'maintain', members: ['maintain', 'maintenance'] },
    { groupId: 'decide', rootWord: 'decide', members: ['decision'] },
    { groupId: 'confirm', rootWord: 'confirm', members: ['confirm', 'confirmation'] },
    { groupId: 'hesitate', rootWord: 'hesitate', members: ['hesitation'] },
    { groupId: 'collect', rootWord: 'collect', members: ['collective', 'collection'] },
    { groupId: 'miss', rootWord: 'miss', members: ['missing'] },
    { groupId: 'notice', rootWord: 'notice', members: ['notice', 'notification'] },
    { groupId: 'update', rootWord: 'update', members: ['update'] },
    { groupId: 'record', rootWord: 'record', members: ['record', 'recording'] },
    { groupId: 'prior', rootWord: 'prior', members: ['priority'] },
    { groupId: 'work', rootWord: 'work', members: ['work', 'worker'] },
    { groupId: 'proceed', rootWord: 'proceed', members: ['procedure'] },
  ];

  for (const wf of wordFamilies) {
    await prisma.wordFamily.upsert({
      where: { groupId: wf.groupId },
      update: { rootWord: wf.rootWord, members: wf.members },
      create: {
        id: `family-${wf.groupId}`,
        groupId: wf.groupId,
        rootWord: wf.rootWord,
        members: wf.members,
      },
    });
  }
  console.log(`  Word families: ${wordFamilies.length} groups seeded`);

  // ─── Word Status Events (narrative beats for future weeks) ───
  // These define when word statuses change as the story progresses.
  // Week 6: Some words become "grey" (uncertain status) at end of Act I
  // Week 7: Act II begins — "grey" words become "monitored"
  // Week 10: Some monitored words become "proscribed" (banned)
  // Week 12: End of Act II — recovery mechanic unlocked
  // For now, seed events for representative words from each week

  type StatusEventSeed = {
    wordKey: { word: string; weekIntroduced: number };
    fromStatus: 'approved' | 'monitored' | 'grey' | 'proscribed' | 'recovered';
    toStatus: 'approved' | 'monitored' | 'grey' | 'proscribed' | 'recovered';
    weekNumber: number;
    reason: string;
  };

  const statusEvents: StatusEventSeed[] = [
    // Week 6: End of Act I — some words become grey (uncertain)
    { wordKey: { word: 'contradiction', weekIntroduced: 2 }, fromStatus: 'approved', toStatus: 'grey', weekNumber: 6, reason: 'Ministry Review Notice: Usage frequency under review.' },
    { wordKey: { word: 'evidence', weekIntroduced: 2 }, fromStatus: 'approved', toStatus: 'grey', weekNumber: 6, reason: 'Ministry Review Notice: Context restrictions pending.' },
    { wordKey: { word: 'clarify', weekIntroduced: 3 }, fromStatus: 'approved', toStatus: 'grey', weekNumber: 6, reason: 'Ministry Review Notice: Clarification requests now require supervisor approval.' },

    // Week 7: Act II begins — grey words escalate to monitored
    { wordKey: { word: 'contradiction', weekIntroduced: 2 }, fromStatus: 'grey', toStatus: 'monitored', weekNumber: 7, reason: 'Active monitoring initiated. Usage will be logged.' },
    { wordKey: { word: 'evidence', weekIntroduced: 2 }, fromStatus: 'grey', toStatus: 'monitored', weekNumber: 7, reason: 'Active monitoring initiated. Usage will be logged.' },
    { wordKey: { word: 'clarify', weekIntroduced: 3 }, fromStatus: 'grey', toStatus: 'monitored', weekNumber: 7, reason: 'Active monitoring initiated. Usage will be logged.' },

    // Week 10: Monitored words become proscribed
    { wordKey: { word: 'contradiction', weekIntroduced: 2 }, fromStatus: 'monitored', toStatus: 'proscribed', weekNumber: 10, reason: 'PROSCRIBED — This term has been removed from approved vocabulary. Use "revision opportunity" instead.' },
    { wordKey: { word: 'evidence', weekIntroduced: 2 }, fromStatus: 'monitored', toStatus: 'proscribed', weekNumber: 10, reason: 'PROSCRIBED — This term has been restricted. Use "verified information" instead.' },
  ];

  for (const evt of statusEvents) {
    // Look up the word to get its ID
    const dictWord = await prisma.dictionaryWord.findUnique({
      where: { word_weekIntroduced: evt.wordKey },
    });
    if (!dictWord) {
      console.warn(`  Warning: Word "${evt.wordKey.word}" (week ${evt.wordKey.weekIntroduced}) not found for status event`);
      continue;
    }
    const evtId = `evt-${dictWord.id}-w${evt.weekNumber}-${evt.toStatus}`;
    await prisma.wordStatusEvent.upsert({
      where: { id: evtId },
      update: {
        fromStatus: evt.fromStatus,
        toStatus: evt.toStatus,
        reason: evt.reason,
      },
      create: {
        id: evtId,
        wordId: dictWord.id,
        fromStatus: evt.fromStatus,
        toStatus: evt.toStatus,
        weekNumber: evt.weekNumber,
        reason: evt.reason,
      },
    });
  }
  console.log(`  Word status events: ${statusEvents.length} narrative beats seeded`);

  // ─── Session Configs (Weeks 1-3 Phase-Based Runner) ───
  // Each phase gets a backing Mission row for score storage via MissionScore.
  // Phase IDs are deterministic: `phase-w{week}-{orderIndex}`
  // Mission IDs are deterministic: `mission-phase-w{week}-{orderIndex}`

  const sessionConfigs = [
    // ── Week 1: First Shift Orientation ──
    {
      weekId: 'week-1',
      totalMinutes: 35,
      phases: [
        {
          id: 'phase-w1-0',
          type: 'settle',
          label: 'Shift Intake',
          location: 'shift-intake',
          minutes: 3,
          missionId: 'mission-phase-w1-0',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            atmosphereText: 'The fluorescent lights hum overhead. Your badge reads CA-7. The office smells of recycled air and institutional carpet. A screen on the wall cycles through approved slogans. Everything here is designed to be helpful.',
            pearlGreeting: 'Good morning, Clarity Associate. Your shift begins now. Please follow all posted directives.',
          },
        },
        {
          id: 'phase-w1-1',
          type: 'grammar_toeic',
          label: 'Language Lab',
          location: 'language-lab',
          minutes: 4,
          missionId: 'mission-phase-w1-1',
          clipBefore: {
            title: 'Party Onboarding Broadcast',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'Welcome to the Department of Clarity. You are now Clarity Associate-7. A directive is an official order. A protocol is a step-by-step process. Compliance means following the rules correctly. Your job is to process documents with accuracy and speed.',
          },
          clipAfter: null,
          dictionaryLocked: true,
          config: {
            requiredCount: 3,
            documents: [
              {
                id: 'w1-g1',
                prompt: 'Choose the correct answer:',
                text: 'What is a directive?',
                options: ['A rumor', 'An official order', 'A celebration', 'A private message'],
                correctIndex: 1,
                targets: ['vocabulary-directive'],
              },
              {
                id: 'w1-g2',
                prompt: 'Choose the correct answer:',
                text: 'What should an associate do first?',
                options: ['Guess quickly', 'Follow protocol carefully', 'Ignore unclear parts', 'Ask social feed users'],
                correctIndex: 1,
                targets: ['vocabulary-protocol'],
              },
              {
                id: 'w1-g3',
                prompt: 'Choose the correct answer:',
                text: 'What does compliance mean in the broadcast?',
                options: ['Following rules correctly', 'Speaking loudly', 'Working alone', 'Skipping review'],
                correctIndex: 0,
                targets: ['vocabulary-compliance'],
              },
            ],
          },
        },
        {
          id: 'phase-w1-2',
          type: 'd1_structured_writing',
          label: 'Filing Desk',
          location: 'filing-desk',
          minutes: 20,
          missionId: 'mission-phase-w1-2',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            prompt: 'Complete your first shift intake note. Describe your role as a Clarity Associate, the rules you must follow, and one directive you received. Use at least 4 sentences.',
            minWords: 30,
            grammarTarget: 'present simple + be-verb + basic agreement',
            targetVocab: ['compliance', 'directive', 'protocol', 'clearance', 'associate', 'process', 'submit', 'schedule', 'employee', 'register'],
            formHeader: {
              department: 'DEPARTMENT OF CLARITY',
              formTitle: 'SHIFT INTAKE NOTE',
              formSubtitle: 'Form CL-7 — First Shift Documentation',
            },
            sentenceFrames: [
              'My name is ___ and I am a Clarity Associate.',
              'A directive is ___.',
              'I must follow protocol by ___.',
              'My first task is to ___.',
            ],
            vocabBank: ['compliance', 'directive', 'protocol', 'clearance', 'associate', 'process', 'submit'],
            ambientMessages: [
              'Excellent start. Accurate language creates safe communities.',
              'A directive is an order. Follow each step exactly.',
              'Strong compliance protects citizens from confusion.',
              'System stable. Continue to processing.',
            ],
          },
        },
        {
          id: 'phase-w1-3',
          type: 'debrief',
          label: 'Shift Debrief',
          location: 'debrief',
          minutes: 6,
          missionId: 'mission-phase-w1-3',
          clipBefore: null,
          clipAfter: {
            title: 'Assignment Confirmation',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'You have temporary clearance for your first set of files. Write what you can prove. System stable. Continue to processing.',
          },
          dictionaryLocked: false,
          config: {
            discussionTiers: [
              {
                tier: 'Comprehension',
                questions: [
                  'What is a directive?',
                  'In this system, what does compliance mean?',
                ],
              },
              {
                tier: 'Analysis',
                questions: [
                  'Why does PEARL describe language rules as "safety"?',
                  'What might happen to an associate who does not comply?',
                ],
              },
              {
                tier: 'Reflection',
                questions: [
                  'Does following rules always mean being safe? Why or why not?',
                  'Hook: Two versions of the same memo. This is normal.',
                ],
              },
            ],
          },
        },
      ],
    },

    // ── Week 2: The Memo That Wasn't There ──
    {
      weekId: 'week-2',
      totalMinutes: 35,
      phases: [
        {
          id: 'phase-w2-0',
          type: 'settle',
          label: 'Shift Intake',
          location: 'shift-intake',
          minutes: 3,
          missionId: 'mission-phase-w2-0',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            atmosphereText: 'The morning dispatch has arrived. Two documents sit on your desk — Memo 14 and a revised version, Memo 14-R. The dates are different. The wording has changed. No one else seems concerned.',
            pearlGreeting: 'Morning dispatch begins. Review the evidence desk. Updates happen because leadership cares about clarity.',
          },
        },
        {
          id: 'phase-w2-1',
          type: 'grammar_toeic',
          label: 'Language Lab',
          location: 'language-lab',
          minutes: 4,
          missionId: 'mission-phase-w2-1',
          clipBefore: {
            title: 'Dispatch Conflict',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'Morning dispatch includes Memo 14 and Memo 14-R. Updates happen because leadership cares about clarity. Yesterday the memo said one thing. Today it says another. Identify any contradiction. If a line is missing, check the latest revision before concern.',
          },
          clipAfter: null,
          dictionaryLocked: true,
          config: {
            requiredCount: 3,
            documents: [
              {
                id: 'w2-g1',
                prompt: 'Choose the correct answer:',
                text: 'Which statement shows a contradiction?',
                options: [
                  'Two memos give the same rule',
                  'Yesterday and today show different instructions',
                  'Both memos are blank',
                  'Both memos are deleted',
                ],
                correctIndex: 1,
                targets: ['vocabulary-contradiction'],
              },
              {
                id: 'w2-g2',
                prompt: 'Choose the best sentence:',
                text: 'Which is the best way to report a contradiction?',
                options: [
                  'There is a contradiction between Memo 14 and Memo 14-R.',
                  'Memo weird.',
                  'I feel not good.',
                  'Nothing changed.',
                ],
                correctIndex: 0,
                targets: ['grammar-there_be'],
              },
              {
                id: 'w2-g3',
                prompt: 'Choose the correct answer:',
                text: 'In this lesson, "revision" means:',
                options: [
                  'Correction or update',
                  'Personal opinion',
                  'Holiday activity',
                  'Password reset',
                ],
                correctIndex: 0,
                targets: ['vocabulary-revision'],
              },
            ],
          },
        },
        {
          id: 'phase-w2-2',
          type: 'd2_document_compare',
          label: 'Evidence Desk',
          location: 'evidence-desk',
          minutes: 20,
          missionId: 'mission-phase-w2-2',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            prompt: 'Compare Memo 14 and Memo 14-R below. Click on the differences you find, then write your contradiction report.',
            grammarTarget: 'past vs present simple + there is/are reporting',
            targetVocab: ['contradiction', 'missing', 'notice', 'revision', 'evidence', 'record', 'report', 'verify', 'document', 'update'],
            requiredDiffs: { 1: 3, 2: 4, 3: 5 },
            requiredSentences: { 1: 3, 2: 5, 3: 8 },
            reportPrompt: 'Describe the differences you found. Use "there is" / "there are" to report each contradiction. Include at least one past tense and one present tense sentence.',
            dismissalText: 'The latest version is the correct version. Thank you for your diligence. Your contradiction report has been filed and archived.',
            ambientMessages: [
              'Associates report differences with calm precision.',
              'Identify any contradiction. Report only verified differences.',
              'Morning dispatch includes Memo 14 and Memo 14-R.',
              'A revised notice replaces earlier wording automatically.',
            ],
            originalMemo: {
              title: 'Memo 14',
              subtitle: 'Issued: Monday — Department of Clarity',
              segments: [
                'All Clarity Associates ',
                { id: 'diff-1', text: 'process cases in order received', side: 'original' },
                '. Each associate must ',
                { id: 'diff-2', text: 'verify all documents before filing', side: 'original' },
                '. The department operates under ',
                { id: 'diff-3', text: 'Director Chen', side: 'original' },
                '\'s supervision. ',
                { id: 'diff-4', text: 'Break periods are scheduled at 10:00 and 14:00.', side: 'original' },
                ' ',
                { id: 'diff-5', text: 'Associates may request schedule adjustments through their supervisor.', side: 'original' },
              ],
            },
            revisedMemo: {
              title: 'Memo 14-R',
              subtitle: 'Issued: Tuesday — Department of Clarity',
              segments: [
                'All Clarity Associates ',
                { id: 'diff-1r', text: 'process priority cases first', side: 'revised' },
                '. Each associate must ',
                { id: 'diff-2r', text: 'submit documents directly to processing', side: 'revised' },
                '. The department operates under ',
                { id: 'diff-3r', text: 'the Department Committee', side: 'revised' },
                '\'s supervision. ',
                { id: 'diff-4r', text: 'Break periods are determined by workload requirements.', side: 'revised' },
                ' ',
                { id: 'diff-5r', text: '[This line has been removed from the current revision.]', side: 'revised' },
              ],
            },
          },
        },
        {
          id: 'phase-w2-3',
          type: 'debrief',
          label: 'Shift Debrief',
          location: 'debrief',
          minutes: 6,
          missionId: 'mission-phase-w2-3',
          clipBefore: null,
          clipAfter: {
            title: 'Official Reframe',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'A revised notice replaces earlier wording automatically. What if the earlier one was true? Contradiction report accepted. Continue standard operations.',
          },
          dictionaryLocked: false,
          config: {
            discussionTiers: [
              {
                tier: 'Comprehension',
                questions: [
                  'What changed between Memo 14 and Memo 14-R?',
                  'Which version is the "correct" one according to the Ministry?',
                ],
              },
              {
                tier: 'Analysis',
                questions: [
                  'Why might a memo be revised without explanation?',
                  'What happens when yesterday\'s rules change today?',
                ],
              },
              {
                tier: 'Reflection',
                questions: [
                  'Should you always trust the latest version? Why or why not?',
                  'Hook: The queue is getting longer. Everyone looks calm.',
                ],
              },
            ],
          },
        },
      ],
    },

    // ── Week 3: Clarity Bay Intake ──
    {
      weekId: 'week-3',
      totalMinutes: 35,
      phases: [
        {
          id: 'phase-w3-0',
          type: 'settle',
          label: 'Shift Intake',
          location: 'shift-intake',
          minutes: 3,
          missionId: 'mission-phase-w3-0',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            atmosphereText: 'The queue counter on the wall shows 14 citizens waiting. The number keeps climbing. No one is leaving. Betty gives you a look that says: just keep moving. Ivan hasn\'t looked up from his desk in twenty minutes.',
            pearlGreeting: 'Welcome back. Queue volume awaits your attention. Maintain quality and speed.',
          },
        },
        {
          id: 'phase-w3-1',
          type: 'grammar_toeic',
          label: 'Language Lab',
          location: 'language-lab',
          minutes: 4,
          missionId: 'mission-phase-w3-1',
          clipBefore: {
            title: 'Queue Pressure',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'Queue volume has doubled. Maintain quality and speed. High priority cases should be processed first. If a message is unclear, clarify before you approve. Fast, accurate dispatch protects the collective. A calm associate keeps the queue moving.',
          },
          clipAfter: null,
          dictionaryLocked: true,
          config: {
            requiredCount: 3,
            documents: [
              {
                id: 'w3-g1',
                prompt: 'Choose the correct answer:',
                text: 'What is the best first action when content is unclear?',
                options: [
                  'Approve immediately',
                  'Clarify before processing',
                  'Skip the case',
                  'Delete the post',
                ],
                correctIndex: 1,
                targets: ['grammar-modality'],
              },
              {
                id: 'w3-g2',
                prompt: 'Choose the best sentence using "priority":',
                text: 'Which sentence correctly uses "priority"?',
                options: [
                  'This case has priority, so we should dispatch it first.',
                  'Priority not important.',
                  'I dispatch random files.',
                  'Queue waits forever.',
                ],
                correctIndex: 0,
                targets: ['vocabulary-priority'],
              },
              {
                id: 'w3-g3',
                prompt: 'Choose the correct answer:',
                text: 'Which sentence matches Ministry process language?',
                options: [
                  'You should verify before dispatch.',
                  'You send maybe maybe.',
                  'You skip all checks.',
                  'You stop all work now.',
                ],
                correctIndex: 0,
                targets: ['grammar-imperative'],
              },
            ],
          },
        },
        {
          id: 'phase-w3-2',
          type: 'd5_audio_log',
          label: 'Voice Booth',
          location: 'voice-booth',
          minutes: 20,
          missionId: 'mission-phase-w3-2',
          clipBefore: null,
          clipAfter: null,
          dictionaryLocked: false,
          config: {
            prompt: 'Record your observation for each citizen scenario. Describe what happened using past tense. Use "should" to suggest what the citizen needs to do.',
            grammarTarget: 'modal can/should + past tense observation',
            targetVocab: ['clarify', 'queue', 'priority', 'dispatch', 'verify', 'process', 'submit', 'approve', 'register', 'schedule'],
            requiredScenarios: { 1: 2, 2: 3, 3: 4 },
            queueCounter: {
              startCount: 14,
              incrementInterval: 30,
              thresholds: [20, 30],
            },
            pearlResponses: [
              'Observation filed. Standard processing.',
              'Noted. Added to your case log. Queue volume increasing.',
              'Monitoring increased. Your observations are being reviewed.',
              'Concern level elevated. Your observations have been escalated to the Committee.',
            ],
            scenarios: [
              {
                id: 'w3-s1',
                title: 'Citizen Request: Schedule Change',
                description: 'A citizen arrived at the desk requesting a schedule change. They said their work hours were updated last week, but the system still shows the old schedule. They seem confused but calm.',
                prompt: 'Describe what happened. What should the citizen do next?',
                grammarHint: 'Use past tense to describe + "should" for advice',
              },
              {
                id: 'w3-s2',
                title: 'Citizen Report: Missing Document',
                description: 'A citizen reported that their registration form is missing from the system. They submitted it two days ago. The system shows no record. The citizen is becoming anxious.',
                prompt: 'Describe the situation. What can you do to help?',
                grammarHint: 'Use past tense to describe + "can" for possibility',
              },
              {
                id: 'w3-s3',
                title: 'Citizen Complaint: Priority Processing',
                description: 'A citizen complained that priority cases are being processed before regular cases. They waited for three hours. Another citizen with a priority stamp was processed in fifteen minutes.',
                prompt: 'Describe what you observed. Should the system be different?',
                grammarHint: 'Use past tense + "should" for opinion',
              },
              {
                id: 'w3-s4',
                title: 'Citizen Concern: Unclear Instructions',
                description: 'A citizen cannot understand the new dispatch form. The instructions were changed overnight. The old form had clear steps. The new form uses unfamiliar vocabulary. The citizen asked you to clarify.',
                prompt: 'Describe the problem. What should the Ministry do about unclear instructions?',
                grammarHint: 'Use past tense + "should" + personal observation',
              },
            ],
          },
        },
        {
          id: 'phase-w3-3',
          type: 'debrief',
          label: 'Shift Debrief',
          location: 'debrief',
          minutes: 6,
          missionId: 'mission-phase-w3-3',
          clipBefore: null,
          clipAfter: {
            title: 'Pressure Choice Beat',
            embedUrl: null,
            uploadPath: null,
            fallbackText: 'Fast work can hide mistakes. Confidence matters. Hesitation spreads doubt. Priority queue updated. Continue to Language Desk.',
          },
          dictionaryLocked: false,
          config: {
            discussionTiers: [
              {
                tier: 'Comprehension',
                questions: [
                  'Before dispatch, what should an associate do?',
                  'When a message is unclear, what can you do?',
                ],
              },
              {
                tier: 'Analysis',
                questions: [
                  'Why does the queue counter keep increasing?',
                  'Is speed or accuracy more important? Can you have both?',
                ],
              },
              {
                tier: 'Reflection',
                questions: [
                  'How did the queue pressure affect your decisions?',
                  'What would change if the queue wasn\'t real?',
                ],
              },
            ],
            revealText: 'This counter was not real. The queue was never moving. The numbers were designed to create urgency. How did that pressure affect your language?',
          },
        },
      ],
    },
  ];

  // Create backing Mission rows for each phase, then upsert SessionConfig
  for (const sc of sessionConfigs) {
    const phases = sc.phases as Array<{ id: string; missionId: string; label: string; type: string }>;
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      await prisma.mission.upsert({
        where: { id: phase.missionId },
        update: {
          title: phase.label,
          orderIndex: 100 + i, // High orderIndex to not conflict with legacy missions
        },
        create: {
          id: phase.missionId,
          weekId: sc.weekId,
          orderIndex: 100 + i,
          title: phase.label,
          description: `Phase: ${phase.type}`,
          missionType: phase.type,
          config: {},
        },
      });
    }

    await prisma.sessionConfig.upsert({
      where: { weekId: sc.weekId },
      update: {
        phases: sc.phases as unknown as Prisma.InputJsonValue,
        totalMinutes: sc.totalMinutes,
        isActive: true,
      },
      create: {
        weekId: sc.weekId,
        phases: sc.phases as unknown as Prisma.InputJsonValue,
        totalMinutes: sc.totalMinutes,
        isActive: true,
      },
    });
  }
  console.log(`  Session configs: ${sessionConfigs.length} weeks seeded (${sessionConfigs.reduce((s, c) => s + c.phases.length, 0)} phases, backing missions created)`);

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
