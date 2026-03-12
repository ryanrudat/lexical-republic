import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { getWeekConfig } from '../src/data/week-configs';
import { HARMONY_SEED_POSTS } from '../src/data/harmonyFeed';
import { WEEK_STORY_PLANS } from '../src/data/storyPlans';

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

async function createQueueWeekMissions(weekId: string, weekNumber: number) {
  const config = getWeekConfig(weekNumber);
  if (!config) return;

  for (let i = 0; i < config.tasks.length; i++) {
    const task = config.tasks[i];

    // Find existing mission by weekId + missionType for idempotent upsert
    const existing = await prisma.mission.findFirst({
      where: { weekId, missionType: task.type },
    });

    const missionId = existing?.id ?? `mission-queue-${weekId}-${i}`;

    if (existing) {
      // Preserve teacherOverride on re-seed
      const existingCfg = (existing.config && typeof existing.config === 'object' && !Array.isArray(existing.config))
        ? existing.config as Record<string, unknown> : {};
      const preservedConfig = existingCfg.teacherOverride
        ? { weekConfigTask: task.id, teacherOverride: existingCfg.teacherOverride }
        : { weekConfigTask: task.id };
      await prisma.mission.update({
        where: { id: existing.id },
        data: {
          orderIndex: i,
          title: task.label,
          missionType: task.type,
          config: preservedConfig as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.mission.create({
        data: {
          id: missionId,
          weekId,
          orderIndex: i,
          title: task.label,
          description: `Queue task: ${task.label}`,
          missionType: task.type,
          config: { weekConfigTask: task.id } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(`  Queue missions: ${config.tasks.length} tasks seeded for week ${weekNumber}`);
}

async function seedHarmonyPosts() {
  const firstClass = await prisma.class.findFirst();
  if (!firstClass) {
    console.warn('  Warning: No class found, skipping Harmony posts');
    return;
  }

  let created = 0;
  let updated = 0;
  for (const post of HARMONY_SEED_POSTS) {
    const existing = await prisma.harmonyPost.findFirst({
      where: {
        OR: [
          { id: post.id },
          { content: post.content, classId: firstClass.id },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.harmonyPost.update({
        where: { id: existing.id },
        data: {
          authorLabel: post.authorLabel,
          content: post.content,
          status: 'approved',
          classId: firstClass.id,
          weekNumber: post.weekNumber,
          userId: null,
          pairId: null,
          pearlNote: post.pearlNote,
          postType: post.postType ?? 'feed',
          censureData: (post.censureData ?? undefined) as any,
        },
      });
      updated++;
      continue;
    }

    await prisma.harmonyPost.create({
      data: {
        id: post.id,
        authorLabel: post.authorLabel,
        content: post.content,
        status: 'approved',
        classId: firstClass.id,
        weekNumber: post.weekNumber,
        userId: null,
        pairId: null,
        pearlNote: post.pearlNote,
        postType: post.postType ?? 'feed',
        censureData: (post.censureData ?? undefined) as any,
      },
    });
    created++;
  }

  console.log(
    `  Harmony posts: ${created} created, ${updated} updated`,
  );
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

  // ─── Test Pair (CA-1 only — for development/testing) ───
  const pinHash = await bcrypt.hash('1234', 10);
  const testPair = await prisma.pair.upsert({
    where: { designation: 'CA-1' },
    update: {
      pin: pinHash,
      studentAName: 'Test',
      studentBName: 'Student',
      lane: 2,
      xp: 0,
      concernScore: 0,
      hasWatchedWelcome: false,
    },
    create: {
      designation: 'CA-1',
      pin: pinHash,
      studentAName: 'Test',
      studentBName: 'Student',
      lane: 2,
    },
  });
  console.log(`  Test Pair: ${testPair.designation} — ${testPair.studentAName} & ${testPair.studentBName}`);

  // Enroll test pair in default class
  await prisma.classEnrollment.upsert({
    where: { pairId_classId: { pairId: testPair.id, classId: defaultClass.id } },
    update: {},
    create: { pairId: testPair.id, classId: defaultClass.id },
  });

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

  // ─── Weeks 1-3 Queue Missions (from WeekConfig) ───
  for (const wk of weekData.filter((w) => w.weekNumber >= 1 && w.weekNumber <= 3)) {
    await createQueueWeekMissions(wk.id, wk.weekNumber);
  }

  // ─── Weeks 4-18 Default Missions (7-step legacy runner) ───
  const remainingWeekMissions = weekData
    .filter((week) => week.weekNumber >= 4)
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
  console.log(`  Default Missions: ${remainingWeekMissions.length} steps seeded for weeks 4–18`);

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
    definition: string;
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
      definition: 'The act of obeying rules, laws, or requests made by people in authority.',
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
      definition: 'An official instruction or order given by someone in authority.',
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
      definition: 'A set of rules or procedures for how something should be done, especially in official situations.',
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
      definition: 'Official permission or approval to do something, especially to access restricted areas or information.',
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
      definition: 'Activity involving mental or physical effort done to achieve a purpose or result.',
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
      definition: 'An official instruction that says how things must be done or what is allowed.',
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
      definition: 'A group of people who work together to achieve a shared goal.',
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
      definition: 'A task or piece of work given to someone as part of their job or studies.',
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
      definition: 'To give a document, plan, or piece of work to someone in authority for them to consider.',
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
      definition: 'Correct and exact, without any mistakes.',
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
      definition: 'A person connected with an organization, or a colleague at work.',
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
      definition: 'An official name, title, or label given to someone or something.',
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
      definition: 'A government department responsible for a particular area of activity.',
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
      definition: 'A person who legally belongs to a country and has rights and duties there.',
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
      definition: 'A set period of time during which a group of workers do their jobs before being replaced by others.',
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
      definition: 'A person whose job is to watch and direct other workers.',
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
      definition: 'A situation in which two facts, ideas, or statements cannot both be true at the same time.',
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
      definition: 'Not in the expected place; lost or absent.',
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
      definition: 'A written or printed announcement that gives information or a warning.',
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
      definition: 'A change or set of changes made to something in order to improve or correct it.',
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
      definition: 'A written account of something that is kept so that it can be looked at and used in the future.',
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
      definition: 'To check that something is true or correct.',
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
      definition: 'To examine two or more things to see how they are similar or different.',
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
      definition: 'To give a description of something or information about it to someone in authority.',
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
      definition: 'The most recent information or news about something.',
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
      definition: 'Facts, signs, or objects that make you believe something is true.',
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
      definition: 'A short written message or report used in a business or organization.',
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
      definition: 'The sending of something or someone to a destination for a particular purpose.',
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
      definition: 'A collection of historical records or documents, or the place where they are kept.',
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
      definition: 'A feeling of worry about something important, or something that worries you.',
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
      definition: 'A particular form of something that is slightly different from other forms of the same thing.',
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
      definition: 'The official or accepted way of doing something, especially in a particular job.',
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
      definition: 'To make something easier to understand by giving more details or a simpler explanation.',
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
      definition: 'A line of people or things waiting for something, or a list of items waiting to be dealt with.',
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
      definition: 'The thing that is regarded as more important than others and should be dealt with first.',
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
      definition: 'To officially agree to or accept something as satisfactory.',
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
      definition: 'To deal with something by following an established procedure or set of steps.',
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
      definition: 'A piece of written or spoken information sent from one person to another.',
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
      definition: 'To keep something in good condition by checking or repairing it regularly.',
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
      definition: 'The act of politely asking for something, or the thing that is asked for.',
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
      definition: 'A choice that you make about something after thinking about several possibilities.',
      exampleSentence: 'A safe priority decision protects both speed and accuracy.',
      translationZhTw: '決定',
      toeicCategory: 'business',
      wordFamilyGroup: 'decide',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    // ── Week 3: World-Building Words
    {
      word: 'dispatch',
      partOfSpeech: 'verb',
      phonetic: '/dɪˈspætʃ/',
      definition: 'To send someone or something to a particular place for a particular purpose.',
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
      definition: 'A limited amount of something that is officially allowed or expected.',
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
      definition: 'A place or building where a particular service or activity is based.',
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
      definition: 'A group of people who share the same interests or who work together.',
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
      definition: 'The act of pausing before doing something, especially because you are nervous or unsure.',
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
      definition: 'The amount or quantity of something, especially when it is large.',
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
      definition: 'The process of checking that something is true, accurate, or valid.',
      exampleSentence: 'Speed must never replace verification in case processing.',
      translationZhTw: '驗證',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'verify',
      isWorldBuilding: true,
      weekIntroduced: 3,
    },

    // ── Week 1: Target Vocabulary (queue system) ──
    {
      word: 'arrive',
      partOfSpeech: 'verb',
      phonetic: '/əˈraɪv/',
      definition: 'To reach a place after traveling.',
      exampleSentence: 'All associates arrive at their stations before the shift begins.',
      translationZhTw: '到達',
      toeicCategory: 'business',
      wordFamilyGroup: 'arrive',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'follow',
      partOfSpeech: 'verb',
      phonetic: '/ˈfɑː.loʊ/',
      definition: 'To act according to instructions or rules.',
      exampleSentence: 'Follow the protocol exactly as written in the directive.',
      translationZhTw: '遵循',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'follow',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'check',
      partOfSpeech: 'verb',
      phonetic: '/tʃek/',
      definition: 'To examine something to see if it is correct, safe, or suitable.',
      exampleSentence: 'Check each document before submitting it to the archive.',
      translationZhTw: '檢查',
      toeicCategory: 'procedures',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'report',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈpɔːrt/',
      definition: 'To give a description of something or information about it to someone in authority.',
      exampleSentence: 'Report any irregularities to your supervisor before the shift ends.',
      translationZhTw: '報告',
      toeicCategory: 'communication',
      wordFamilyGroup: 'report',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'submit',
      partOfSpeech: 'verb',
      phonetic: '/səbˈmɪt/',
      definition: 'To give a document or plan to someone in authority for them to consider.',
      exampleSentence: 'Submit your intake form before the end of the shift.',
      translationZhTw: '提交',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'submit',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'approve',
      partOfSpeech: 'verb',
      phonetic: '/əˈpruːv/',
      definition: 'To officially agree to or accept something as satisfactory.',
      exampleSentence: 'The supervisor must approve all outgoing documents.',
      translationZhTw: '批准',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'approve',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'describe',
      partOfSpeech: 'verb',
      phonetic: '/dɪˈskraɪb/',
      definition: 'To say or write what someone or something is like.',
      exampleSentence: 'Describe the contents of each memo in your shift report.',
      translationZhTw: '描述',
      toeicCategory: 'communication',
      wordFamilyGroup: 'describe',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'assign',
      partOfSpeech: 'verb',
      phonetic: '/əˈsaɪn/',
      definition: 'To give someone a particular job or task.',
      exampleSentence: 'The supervisor will assign your cases for the day.',
      translationZhTw: '指派',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'assign',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'standard',
      partOfSpeech: 'noun',
      phonetic: '/ˈstæn.dɚd/',
      definition: 'A level of quality or achievement that is considered acceptable.',
      exampleSentence: 'All documents must meet the Ministry standard before release.',
      translationZhTw: '標準',
      toeicCategory: 'business',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 1,
    },
    {
      word: 'confirm',
      partOfSpeech: 'verb',
      phonetic: '/kənˈfɜːrm/',
      definition: 'To state or show that something is definitely true or correct.',
      exampleSentence: 'Confirm the details before submitting your intake form.',
      translationZhTw: '確認',
      toeicCategory: 'business',
      wordFamilyGroup: 'confirm',
      isWorldBuilding: false,
      weekIntroduced: 1,
    },

    // ── Week 2: Target Vocabulary (queue system) ──
    {
      word: 'notice',
      partOfSpeech: 'verb',
      phonetic: '/ˈnoʊ.tɪs/',
      definition: 'To see or become aware of something.',
      exampleSentence: 'Did you notice that the memo was revised overnight?',
      translationZhTw: '注意到',
      toeicCategory: 'communication',
      wordFamilyGroup: 'notice',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'compare',
      partOfSpeech: 'verb',
      phonetic: '/kəmˈper/',
      definition: 'To examine two or more things to see how they are similar or different.',
      exampleSentence: 'Compare both versions of the memo and note the differences.',
      translationZhTw: '比較',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'compare',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'replace',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈpleɪs/',
      definition: 'To take the place of something, or put something new in the place of something.',
      exampleSentence: 'Replace any outdated forms with the latest revision.',
      translationZhTw: '替換',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'replace',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'update',
      partOfSpeech: 'verb',
      phonetic: '/ʌpˈdeɪt/',
      definition: 'To make something more modern or suitable for use now.',
      exampleSentence: 'Update the file with the latest information from dispatch.',
      translationZhTw: '更新',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'update',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'request',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈkwest/',
      definition: 'To ask for something politely or officially.',
      exampleSentence: 'You may request additional information through your supervisor.',
      translationZhTw: '請求',
      toeicCategory: 'communication',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'remove',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈmuːv/',
      definition: 'To take something away from its place.',
      exampleSentence: 'Remove all unapproved entries from the public record.',
      translationZhTw: '移除',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'remove',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'change',
      partOfSpeech: 'verb',
      phonetic: '/tʃeɪndʒ/',
      definition: 'To become different, or to make something different.',
      exampleSentence: 'The Ministry may change the schedule without prior notice.',
      translationZhTw: '改變',
      toeicCategory: 'business',
      wordFamilyGroup: null,
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'include',
      partOfSpeech: 'verb',
      phonetic: '/ɪnˈkluːd/',
      definition: 'To contain something as a part of something else.',
      exampleSentence: 'Include all required fields in your dispatch report.',
      translationZhTw: '包含',
      toeicCategory: 'business',
      wordFamilyGroup: 'include',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'require',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈkwaɪɚ/',
      definition: 'To need something or make something necessary.',
      exampleSentence: 'All reports require supervisor verification before filing.',
      translationZhTw: '要求',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'require',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },
    {
      word: 'inform',
      partOfSpeech: 'verb',
      phonetic: '/ɪnˈfɔːrm/',
      definition: 'To tell someone about something.',
      exampleSentence: 'Inform your supervisor if any records are missing.',
      translationZhTw: '通知',
      toeicCategory: 'communication',
      wordFamilyGroup: 'inform',
      isWorldBuilding: false,
      weekIntroduced: 2,
    },

    // ── Week 3: Target Vocabulary (queue system) ──
    {
      word: 'process',
      partOfSpeech: 'verb',
      phonetic: '/ˈprɑː.ses/',
      definition: 'To deal with something by following an established procedure or set of steps.',
      exampleSentence: 'Process each citizen request in the order it was received.',
      translationZhTw: '處理',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'process',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'complete',
      partOfSpeech: 'verb',
      phonetic: '/kəmˈpliːt/',
      definition: 'To finish doing or making something.',
      exampleSentence: 'Complete each form before moving to the next case.',
      translationZhTw: '完成',
      toeicCategory: 'business',
      wordFamilyGroup: 'complete',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'review',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈvjuː/',
      definition: 'To examine or consider something carefully.',
      exampleSentence: 'Review your shift report before submitting it to the archive.',
      translationZhTw: '審查',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'review',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'delay',
      partOfSpeech: 'noun',
      phonetic: '/dɪˈleɪ/',
      definition: 'A situation in which something happens later than expected or planned.',
      exampleSentence: 'Any delay in processing will be noted in your performance record.',
      translationZhTw: '延遲',
      toeicCategory: 'business',
      wordFamilyGroup: 'delay',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'schedule',
      partOfSpeech: 'noun',
      phonetic: '/ˈsked.juːl/',
      definition: 'A plan that lists all the work that you have to do and when you must do each thing.',
      exampleSentence: 'Check the schedule before beginning your shift.',
      translationZhTw: '時間表',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'schedule',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'respond',
      partOfSpeech: 'verb',
      phonetic: '/rɪˈspɑːnd/',
      definition: 'To say or do something as an answer or reaction to something.',
      exampleSentence: 'Respond to all citizen requests before the end of your shift.',
      translationZhTw: '回應',
      toeicCategory: 'communication',
      wordFamilyGroup: 'respond',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'identify',
      partOfSpeech: 'verb',
      phonetic: '/aɪˈden.tɪ.faɪ/',
      definition: 'To recognize someone or something and say who or what they are.',
      exampleSentence: 'Identify each case type before assigning a priority level.',
      translationZhTw: '識別',
      toeicCategory: 'personnel',
      wordFamilyGroup: 'identify',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'separate',
      partOfSpeech: 'verb',
      phonetic: '/ˈsep.ə.reɪt/',
      definition: 'To divide or split something into different parts or groups.',
      exampleSentence: 'Separate urgent cases from routine processing.',
      translationZhTw: '分開',
      toeicCategory: 'procedures',
      wordFamilyGroup: 'separate',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'maintain',
      partOfSpeech: 'verb',
      phonetic: '/meɪnˈteɪn/',
      definition: 'To keep something in good condition by checking or repairing it regularly.',
      exampleSentence: 'Maintain accurate records throughout your entire shift.',
      translationZhTw: '維持',
      toeicCategory: 'business',
      wordFamilyGroup: 'maintain',
      isWorldBuilding: false,
      weekIntroduced: 3,
    },
    {
      word: 'forward',
      partOfSpeech: 'verb',
      phonetic: '/ˈfɔːr.wɚd/',
      definition: 'To send a letter, email, or document to someone else.',
      exampleSentence: 'Forward all flagged cases to the supervisor immediately.',
      translationZhTw: '轉發',
      toeicCategory: 'communication',
      wordFamilyGroup: 'forward',
      isWorldBuilding: false,
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
        definition: dw.definition,
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
        definition: dw.definition,
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

  // ─── Harmony Review Feed ───
  await seedHarmonyPosts();

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
