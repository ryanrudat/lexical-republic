// ─── Week 2: The Memo That Wasn't There ──────────────────────────
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
    // 1. Word Match — pure recognition, first encounter with new vocabulary
    {
      id: "word_match_w2",
      type: "word_match",
      location: "Language Lab",
      label: "Language Authorization",
      config: {
        pairs: [
          { word: "notice", definition: "to see or become aware of something" },
          { word: "compare", definition: "to look at two things to find differences" },
          { word: "replace", definition: "to put something new in place of the old" },
          { word: "update", definition: "to make something more current or recent" },
          { word: "request", definition: "to ask for something in a formal way" },
          { word: "remove", definition: "to take something away from its place" },
          { word: "change", definition: "to make something different from before" },
          { word: "include", definition: "to contain something as part of a whole" },
          { word: "require", definition: "to need something as necessary or essential" },
          { word: "inform", definition: "to give someone facts or information" },
        ],
        pearlBarkOnComplete: "Language authorization verified. File access granted. Proceed to Document Verification.",
      },
    },

    // 2. Cloze Fill — Memo 14 (original), recognition in context
    {
      id: "cloze_fill_w2",
      type: "cloze_fill",
      location: "Records Office",
      label: "Document Verification",
      config: {
        title: "INTERNAL MEMO 14 — DEPARTMENT OF CLARITY",
        from: "Regional Oversight Division",
        passage:
          "This memo is to {0} all associates of the following updates to monthly operations. Please {1} any differences between this document and previous versions.\n\nSection 1: The Department {2} a full review of citizen activity records last week. The review {3} data from 847 citizen files. Three associates {4} that certain records contained errors. The Department {5} these files and {6} the original entries with corrected versions.\n\nSection 2: Effective immediately, archive access {7} supervisor approval. Associates must {8} a written {9} before viewing records older than five years.\n\nThis document supersedes all previous versions. If you {10} any differences between versions, file a Contradiction Report through standard channels.",
        blanks: [
          { index: 0, correctWord: "inform" },
          { index: 1, correctWord: "notice" },
          { index: 2, correctWord: "completed" },
          { index: 3, correctWord: "included" },
          { index: 4, correctWord: "noticed" },
          { index: 5, correctWord: "updated" },
          { index: 6, correctWord: "replaced" },
          { index: 7, correctWord: "requires" },
          { index: 8, correctWord: "submit" },
          { index: 9, correctWord: "request" },
          { index: 10, correctWord: "notice" },
        ],
        wordBank: [
          "inform", "notice", "completed", "included", "noticed",
          "updated", "replaced", "requires", "submit", "request",
          "notice", "removed", "compared",
        ],
        pearlBarkOnComplete: "Document verified. Proceed to Archive Classification.",
      },
    },

    // 3. Word Sort — sort past vs. present forms, grammar target
    {
      id: "word_sort_w2",
      type: "word_sort",
      location: "Evidence Desk",
      label: "Archive Classification",
      config: {
        instruction: "Classify each term by time reference for the archive record.",
        columns: [
          {
            id: "past",
            label: "YESTERDAY (PAST SIMPLE)",
            correctWords: [
              "noticed", "compared", "replaced", "updated", "requested",
              "removed", "changed", "included", "required", "informed",
            ],
          },
          {
            id: "present",
            label: "TODAY (PRESENT SIMPLE)",
            correctWords: [
              "notice", "compare", "replace", "update", "request",
              "remove", "change", "include", "require", "inform",
            ],
          },
        ],
        words: [
          "noticed", "notice", "compared", "compare", "replaced", "replace",
          "updated", "update", "requested", "request", "removed", "remove",
          "changed", "change", "included", "include", "required", "require",
          "informed", "inform",
        ],
        pearlBarkOnComplete: "Archive classification accepted. Temporal records filed.",
      },
    },

    // 4. Vocab Clearance — TOEIC Part 5 style, past/present mix
    {
      id: "vocab_clearance",
      type: "vocab_clearance",
      location: "Clearance Terminal",
      label: "Vocabulary Clearance",
      config: {
        items: [
          {
            type: "toeic_p5",
            word: "notice",
            question: "Did you _______ the difference between the two reports?",
            options: ["notice", "remove", "replace", "require"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "compare",
            question: "The supervisor asked us to _______ the original document with the updated version.",
            options: ["compare", "include", "inform", "request"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "replace",
            question: "The old policy was _______ by a new one last month.",
            options: ["compared", "informed", "noticed", "replaced"],
            correctIndex: 3,
          },
          {
            type: "toeic_p5",
            word: "update",
            question: "Please _______ the file before the end of today.",
            options: ["remove", "replace", "require", "update"],
            correctIndex: 3,
          },
          {
            type: "toeic_p5",
            word: "request",
            question: "The manager _______ a copy of the original memo.",
            options: ["changed", "noticed", "replaced", "requested"],
            correctIndex: 3,
          },
          {
            type: "toeic_p5",
            word: "remove",
            question: "Three paragraphs were _______ from the revised version.",
            options: ["included", "informed", "removed", "updated"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "change",
            question: "The schedule _______ after the meeting yesterday.",
            options: ["changed", "includes", "informs", "requires"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "include",
            question: "The final report must _______ data from all departments.",
            options: ["change", "include", "notice", "remove"],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "require",
            question: "This procedure _______ approval from two supervisors.",
            options: ["changes", "compares", "removes", "requires"],
            correctIndex: 3,
          },
          {
            type: "toeic_p5",
            word: "inform",
            question: "Nobody _______ the staff about the policy change.",
            options: ["informed", "noticed", "requested", "updated"],
            correctIndex: 0,
          },
        ],
      },
    },

    // 5. Contradiction Report — compare Memo 14 vs Memo 14-R, full production
    {
      id: "contradiction_report",
      type: "contradiction_report",
      label: "Contradiction Report",
      location: "Review Station",
      config: {
        memoA: {
          title: "INTERNAL MEMO 14",
          department: "Department of Clarity",
          date: "March 3",
          from: "Regional Oversight Division",
          to: "All Associates",
          re: "Monthly Activity Review — Clarity Bay Sector 7",
          body: "This memo is to inform all associates of the following updates to monthly operations. Please notice any differences between this document and previous versions. Section 1: The Department completed a full review of citizen activity records last week. The review included data from 847 citizen files. Three associates noticed that certain records contained errors. The Department updated these files and replaced the original entries with corrected versions. Section 2: Effective immediately, archive access requires supervisor approval. Associates must submit a written request before viewing records older than five years. This document supersedes all previous versions. If you notice any differences between versions, file a Contradiction Report through standard channels.",
        },
        memoB: {
          title: "INTERNAL MEMO 14-R (REVISED)",
          department: "Department of Clarity",
          date: "March 10",
          from: "Regional Oversight Division",
          to: "All Associates",
          re: "Monthly Activity Review — Clarity Bay Sector 7",
          reviewedBy: "CA-19 — Lena Park",
          body: "This memo is to inform all associates of the following updates to monthly operations. Please notice any differences between this document and previous versions. Section 1: The Department completed a routine review of citizen activity records last week. The review included data from 612 citizen files. The Department updated these files and replaced the original entries with corrected versions. Section 2: Effective immediately, archive access requires supervisor approval. Associates must submit a written request before viewing records older than three years. This document supersedes all previous versions.",
        },
        differences: [
          {
            diffId: "diff_1",
            label: "Review scope",
            memoAText: "full review",
            memoBText: "routine review",
            classification: "information_changed",
          },
          {
            diffId: "diff_2",
            label: "File count",
            memoAText: "847 citizen files",
            memoBText: "612 citizen files",
            classification: "information_changed",
          },
          {
            diffId: "diff_3",
            label: "Error reporters",
            memoAText: "Three associates noticed that certain records contained errors.",
            memoBText: "[Sentence removed]",
            removedAfterText: "The review included data from 612 citizen files.",
            classification: "information_removed",
          },
          {
            diffId: "diff_4",
            label: "Archive access period",
            memoAText: "older than five years",
            memoBText: "older than three years",
            classification: "information_changed",
          },
          {
            diffId: "diff_5",
            label: "Comparison instruction",
            memoAText: "If you notice any differences between versions, file a Contradiction Report through standard channels.",
            memoBText: "[Sentence removed]",
            removedAfterText: "This document supersedes all previous versions.",
            classification: "information_removed",
          },
        ],
        writingPrompt:
          "Compare Memo 14 (Original) and Memo 14-R (Revised). For each difference you found, describe what changed. Use past simple for the original version and present simple for the current version.",
        writingMinWords: 40,
        writingLane: {
          "1": {
            minWords: 30,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "\"The original memo included _______. The revised memo now says _______.\"",
              "\"Yesterday, the report informed associates that _______. Today, it states _______.\"",
              "\"The Department removed _______ from the original. The updated version does not include this information.\"",
              "\"I noticed that the original version required _______. The revision changed this to _______.\"",
              "\"The earlier memo compared _______ and _______. The new version replaced this section.\"",
            ],
          },
          "2": { minWords: 40, wordListVisible: true },
          "3": {
            minWords: 55,
            bonusQuestion:
              "Did the revision add information or remove it? What did the original include that the revision does not?",
          },
        },
      },
    },

    // 6. Shift Report — end-of-shift written reflection
    {
      id: "shift_report",
      type: "shift_report",
      label: "Shift Report",
      location: "Reporting Desk",
      config: {
        prompt:
          "Describe what you found during today's contradiction review. What did the original memo include? What does the revision say now? What was removed or replaced? Use as many target words as possible.",
        minWords: 45,
        lane: {
          "1": {
            minWords: 30,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with a past simple sentence about the original memo.",
              "Then write a present simple sentence about the revised memo.",
              "Describe what changed between the two versions.",
            ],
            guidedQuestions: [
              "What did the original memo include?",
              "What does the revised memo say now?",
              "What changed between the two versions?",
              "Were associates informed of the changes?",
            ],
          },
          "2": { minWords: 45, wordListVisible: true },
          "3": {
            minWords: 60,
            bonusQuestion:
              "What does it mean for associates who relied on the original information? Why might the Ministry remove the instruction to compare documents?",
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
        "Hey! You're the new associate right? CA-something? I'm Chad — CA-31. Well, technically I started three weeks before you but they fast-tracked my orientation because my uncle works in Administrative Division. Anyway, these contradiction reports? Super easy. I usually finish mine in like five minutes. Just compare the dates and you're done. Oh, and don't worry about the footer text on 14-R. Nobody reads that part. Don't overthink it 😎",
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
        "Have you seen the two memos? I compared them during my shift. Some of the changes don't make sense. Why would they remove information? Betty says revisions are normal but... I don't know.",
      replyType: "canned",
      replyOptions: [
        {
          text: "The revision is the current version. That is all we need to know.",
          isCompliant: true,
          responseText:
            "Yeah... you're probably right. The system updates things. That's normal. I just... noticed, that's all.",
        },
        {
          text: "I noticed the same thing. Some information was removed.",
          isCompliant: false,
          responseText:
            "Right? The original included more data. And that sentence about associates who noticed errors — it's just gone. Like it never existed. But maybe I'm overthinking this.",
        },
        {
          text: "What did Betty say exactly?",
          isCompliant: false,
          responseText:
            "She said revisions are how good systems improve. She said the current version is always the correct one. She said it with that smile. You know the one.",
        },
      ],
    },

    // M.K. — appears on completion of contradiction_report
    {
      characterName: "M.K.",
      designation: "",
      triggerType: "task_complete",
      triggerConfig: { taskId: "contradiction_report" },
      messageText:
        "Two versions. One replaces the other. Ask yourself which direction the changes go. Do they add information, or remove it.",
      replyType: "canned",
      replyOptions: [
        {
          text: "I filed my report accurately. That is my job.",
          responseText: null,
          isCompliant: true,
        },
        {
          text: "They removed information.",
          responseText: null,
          isCompliant: false,
        },
        {
          text: "Who are you?",
          responseText: null,
          isCompliant: false,
        },
      ],
    },

    // Betty / WA-14 — appears on completion of shift_report
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_complete",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "I see you completed your discrepancy review! You know, revisions happen because leadership is always improving our records. That's what good organizations do, sugar — they update! The current version is always the correct version. Easy as pie!",
      replyType: "canned",
      replyOptions: [
        {
          text: "You're right. The current version is the correct version.",
          isCompliant: true,
          responseText:
            "See? You're catching on fast! I just love how quickly you're settling in, darlin'!",
        },
        {
          text: "But some information was removed, not just updated.",
          isCompliant: false,
          responseText:
            "Oh, honey. Sometimes old information just isn't needed anymore. Less clutter, more clarity! That's our motto, right?",
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
