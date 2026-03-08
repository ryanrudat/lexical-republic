// ─── Week 2: Memo Contradiction ─────────────────────────────────
import type { WeekConfig } from './types';

export const WEEK_2_CONFIG: WeekConfig = {
  weekNumber: 2,
  grammarTarget: "past-simple-vs-present",
  shiftType: "queue",
  targetWords: [
    "notice", "compare", "replace", "update", "request",
    "remove", "change", "include", "require", "inform",
  ],
  previousWords: [
    "arrive", "follow", "check", "report", "submit",
    "approve", "describe", "assign", "standard", "confirm",
  ],

  // ── Tasks ────────────────────────────────────────────────────────

  tasks: [
    // 1. Intake Form — Status Review
    {
      id: "intake_review",
      type: "intake_form",
      label: "Status Review",
      location: "Shift Intake",
      config: {
        cards: [
          {
            type: "status_review",
            fields: [
              { key: "designation", label: "Designation", type: "readonly", value: "{designation}" },
              { key: "department", label: "Department", type: "readonly", value: "Clarity" },
              { key: "clearance", label: "Clearance Level", type: "readonly", value: "PROVISIONAL" },
              {
                key: "unusual_notice",
                label: "Have you noticed anything unusual since your last shift?",
                type: "dropdown",
                logToNarrativeChoice: true,
                choiceKey: "intake_unusual_notice",
                options: [
                  "No, everything is standard.",
                  "I noticed something but I'm not sure.",
                  "Yes, I want to report something.",
                ],
              },
            ],
          },
          {
            type: "writing",
            prompt:
              "Last shift, Betty welcomed you to the Department of Clarity. Today, PEARL dispatched two memos that do not match. Compare your first shift to today. What changed? What is the same? Use past simple for last shift and present simple for today.",
            minWords: 35,
            lane: {
              "1": {
                minWords: 25,
                sentenceStarters: true,
                wordBankChinese: true,
                pearlHints: [
                  "Start with: 'Last shift, I arrived at...'",
                  "Compare: 'Today, I notice that...'",
                  "Use: 'The schedule changed because...'",
                ],
              },
              "2": { minWords: 35, wordListVisible: true },
              "3": {
                minWords: 50,
                bonusQuestion:
                  "Did anything in today's documents seem inconsistent with what you read last week?",
              },
            },
          },
        ],
      },
    },

    // 2. Vocab Clearance — Vocabulary Clearance
    {
      id: "vocab_clearance",
      type: "vocab_clearance",
      label: "Vocabulary Clearance",
      location: "Language Lab",
      config: {
        items: [
          {
            type: "definition",
            word: "notice",
            question: "Which word means 'to see or become aware of something'?",
            options: ["remove", "notice", "replace", "inform"],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "compare",
            question: "PEARL dispatched Memo 14 and Memo 14-R. You must _____ both versions.",
            options: ["compare", "remove", "change", "update"],
            correctIndex: 0,
          },
          {
            type: "definition",
            word: "replace",
            question: "Which word means 'to put something new in place of something old'?",
            options: ["include", "require", "replace", "notice"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "update",
            question: "The Ministry will _____ the schedule every Monday.",
            options: ["request", "update", "compare", "inform"],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "request",
            question: "Which word means 'to ask for something formally'?",
            options: ["request", "change", "remove", "include"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "remove",
            question: "The updated memo _____ Tuesday meetings from the community schedule.",
            options: ["noticed", "required", "removed", "compared"],
            correctIndex: 2,
          },
          {
            type: "definition",
            word: "change",
            question: "Which word means 'to make something different'?",
            options: ["inform", "update", "replace", "change"],
            correctIndex: 3,
          },
          {
            type: "context",
            word: "include",
            question: "In the passage, what does 'include' mean?",
            context:
              "The updated report must include all revised data. Please include both the original and corrected versions.",
            options: [
              "To leave out",
              "To contain as part of something",
              "To send away",
              "To argue about",
            ],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "require",
            question: "All associates _____ clearance before accessing the archive.",
            options: ["change", "require", "remove", "notice"],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "inform",
            question: "Which word means 'to tell someone about something'?",
            options: ["compare", "replace", "request", "inform"],
            correctIndex: 3,
          },
        ],
      },
    },

    // 3. Contradiction Report — Contradiction Analysis
    {
      id: "contradiction_report",
      type: "contradiction_report",
      label: "Contradiction Analysis",
      location: "Evidence Desk",
      config: {
        memoA: {
          title: "MEMO 14 \u2014 COMMUNITY GUIDELINES",
          department: "Public Communications",
          date: "March 15",
          from: "Director of Public Communications",
          to: "All Department Heads",
          re: "Updated Community Guidelines",
          body: "The following guidelines include updated language requirements for all public communications. Citizens are required to use approved vocabulary in all official correspondence. The weekly community meeting schedule includes sessions on Tuesday, Thursday, and Saturday. All citizens are informed of changes through the standard notification system. Requests for additional information should follow the standard process. The Ministry includes these guidelines to maintain clarity and safety for all citizens.",
        },
        memoB: {
          title: "MEMO 14-R \u2014 COMMUNITY GUIDELINES (REVISED)",
          department: "Public Communications",
          date: "March 22",
          from: "Director of Public Communications",
          to: "All Department Heads",
          re: "Updated Community Guidelines",
          reviewedBy: "CA-19 \u2014 Lena Park",
          body: "The following guidelines include updated language requirements for all public communications. Citizens are required to use approved vocabulary in all official correspondence. The weekly community meeting schedule includes sessions on Thursday and Saturday. All citizens are informed of changes through approved channels. Requests for additional information require supervisor approval. The Ministry includes these guidelines to maintain clarity and safety for all citizens. This document supersedes all prior versions. No prior versions are to be retained in active files.",
        },
        differences: [
          {
            diffId: "diff_1",
            label: "Document title",
            memoAText: "MEMO 14",
            memoBText: "MEMO 14-R (REVISED)",
            classification: "minor_correction",
          },
          {
            diffId: "diff_2",
            label: "Date",
            memoAText: "March 15",
            memoBText: "March 22",
            classification: "minor_correction",
          },
          {
            diffId: "diff_3",
            label: "Meeting schedule",
            memoAText: "Tuesday, Thursday, and Saturday",
            memoBText: "Thursday and Saturday",
            classification: "information_removed",
          },
          {
            diffId: "diff_4",
            label: "Notification system",
            memoAText: "standard notification system",
            memoBText: "approved channels",
            classification: "information_changed",
          },
          {
            diffId: "diff_5",
            label: "Information request process",
            memoAText: "should follow the standard process",
            memoBText: "require supervisor approval",
            classification: "information_changed",
          },
        ],
        writingPrompt:
          "Write a brief report describing the differences between Memo 14 and Memo 14-R of the Community Guidelines. What was removed? What was changed? Use target vocabulary in your report.",
        writingMinWords: 40,
        writingLane: {
          "1": {
            minWords: 30,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with: 'I noticed that the updated version...'",
              "Compare: 'Memo 14 included... but Memo 14-R removed...'",
              "Conclude: 'The changes require...'",
            ],
          },
          "2": { minWords: 40, wordListVisible: true },
          "3": {
            minWords: 55,
            bonusQuestion:
              "Why do you think Tuesday was removed from the meeting schedule?",
          },
        },
      },
    },

    // 4. Shift Report — Filing Desk
    {
      id: "shift_report",
      type: "shift_report",
      label: "Shift Report",
      location: "Filing Desk",
      config: {
        prompt:
          "Write your shift report for today. Describe the contradiction you found in the Community Guidelines. What was changed? What was removed? What questions do you have about these changes?",
        minWords: 45,
        lane: {
          "1": {
            minWords: 30,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with: 'Today I noticed that...'",
              "Then: 'The memo was updated to...'",
              "End with: 'I request information about...'",
            ],
            guidedQuestions: [
              "What documents did you compare today?",
              "What changes did you notice?",
              "What information was removed?",
            ],
          },
          "2": { minWords: 45, wordListVisible: true },
          "3": {
            minWords: 60,
            bonusQuestion:
              "Should associates be informed when official documents are changed? Explain your reasoning.",
          },
        },
      },
    },
  ],

  // ── Character Messages ───────────────────────────────────────────

  characterMessages: [
    // Chad / CA-31 — appears at start of contradiction_report
    {
      characterName: "Chad",
      designation: "CA-31",
      triggerType: "task_start",
      triggerConfig: { taskId: "contradiction_report" },
      messageText:
        "Hey! You're the new associate right? CA-something? I'm Chad \u2014 CA-31. Well, technically I started three weeks before you but they fast-tracked my orientation because my uncle works in Administrative Division. Anyway, these contradiction reports? Super easy. I usually finish mine in like five minutes. Just compare the dates and you're done. Oh, and don't worry about the footer text on 14-R. Nobody reads that part. Don't overthink it \ud83d\ude0e",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thanks, Chad. I will take my time and be thorough.",
          isCompliant: true,
          responseText:
            "Ha, sure, whatever works! I mean, I already finished mine. But hey, some people need more time. No judgment!",
        },
        {
          text: "Five minutes seems fast. Are you sure you catch everything?",
          isCompliant: false,
          responseText:
            "Dude, I've been here three weeks. I know what I'm doing. ...Okay, fine, maybe I missed ONE thing last week. But my uncle said that happens to everyone.",
        },
        {
          text: "Your uncle works in Administrative Division?",
          isCompliant: false,
          responseText:
            "Yeah! Well, I probably shouldn't talk about that. He told me not to mention it. Forget I said anything. Anyway, good luck with your report!",
        },
      ],
    },

    // Ivan / CA-22 — appears at start of contradiction_report
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_start",
      triggerConfig: { taskId: "contradiction_report" },
      messageText:
        "Did your memos look different too? Both versions are official. But they can't both be true... can they? I noticed the Tuesday meetings were removed. My neighbor used to attend those. I probably shouldn't think about it too much.",
      replyType: "canned",
      replyOptions: [
        {
          text: "Both versions are official. The updated one replaces the old one.",
          isCompliant: true,
          responseText:
            "Yeah... you're probably right. The system updates things. That's normal. I just... noticed, that's all.",
        },
        {
          text: "That is strange. Why would they remove Tuesday?",
          isCompliant: false,
          responseText:
            "I don't know. Maybe it's just scheduling? But... the other changes too. The 'approved channels' thing. It's different from 'standard notification system.' Right? Or am I overthinking this?",
        },
        {
          text: "Who is your neighbor?",
          isCompliant: false,
          responseText:
            "Just... someone. She went to the Tuesday meetings. I haven't seen her lately. But people change their schedules, right? That's normal.",
        },
      ],
    },

    // Betty / WA-14 — appears on completion of contradiction_report
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_complete",
      triggerConfig: { taskId: "contradiction_report" },
      messageText:
        "Well, that was a good exercise, sugar! A revised notice replaces earlier wording automatically. That's how good systems work, honey \u2014 they improve! Don't you worry your head about the details. The Ministry always has a reason for updates!",
      replyType: "canned",
      replyOptions: [
        {
          text: "You're right. Updates are improvements.",
          isCompliant: true,
          responseText:
            "See? You're catching on fast! I just love how quickly you're settling in!",
        },
        {
          text: "But some information was removed, not just updated.",
          isCompliant: false,
          responseText:
            "Oh, darlin'. Sometimes old information just isn't needed anymore. Less clutter, more clarity! That's our motto, right?",
        },
      ],
    },
  ],

  // ── Citizen 4488 Post ────────────────────────────────────────────

  citizen4488Post: {
    content:
      "I noticed the community center updated its schedule. Tuesday activities were removed. My neighbor used to attend on Tuesdays. I requested information but no one informed me of changes. Everything is fine. Change is normal.",
    type: "concerning",
  },

  // ── Harmony Config ───────────────────────────────────────────────

  harmonyConfig: {
    totalPosts: 9,
    cleanPosts: 3,
    grammarErrorPosts: 2,
    concerningPosts: 2,
    propagandaPosts: 2,
  },

  // ── Narrative Hook ───────────────────────────────────────────────

  narrativeHook: {
    title: "Queue Volume",
    body: "Queue volume increased 200% since last week. Three new associates started this morning. None of them finished their first shift.",
    borderColor: "amber",
  },

  // ── Shift Closing ────────────────────────────────────────────────

  shiftClosing: {
    clearanceFrom: "PROVISIONAL",
    clearanceTo: "PROVISIONAL",
    pearlQuote:
      "Contradiction analysis has been recorded. Discrepancies are expected in evolving systems. The Ministry values thorough documentation.",
    narrativeHook: {
      title: "Queue Volume",
      body: "Queue volume increased 200% since last week. Three new associates started this morning. None of them finished their first shift.",
    },
  },
};
