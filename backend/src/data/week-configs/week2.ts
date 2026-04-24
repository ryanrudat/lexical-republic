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
  // Sequence: Input → Recognition → Guided Practice → Classification → Assessment → Analysis+Production
  // Follows SLA pedagogy: comprehensible input first, then practice, then production

  tasks: [
    // 1. Memo Briefing — comprehensible input, first encounter with target words in context
    //    clipBefore: teacher-uploaded briefing video plays first (movie theater mode)
    {
      id: "memo_briefing_w2",
      type: "intake_form",
      location: "Briefing Room",
      label: "Priority Briefing",
      config: {
        cards: [
          // Card 1: Read the memo — pure input, no interaction
          {
            type: "briefing",
            title: "INCOMING DOCUMENT — READ CAREFULLY",
            from: "Regional Oversight Division",
            paragraphs: [
              "INTERNAL MEMO 000328 — Department of Clarity",
              "Date: March 3 | FROM: Regional Oversight Division | TO: All Associates | RE: Monthly Activity Review — Clarity Bay Sector 7",
              "This memo is to inform all associates of changes to monthly operations.",
              "Section 1: The Department noticed problems in citizen activity records last week. The team completed a full review. The review included data from 847 citizen files. Three associates compared the old records with the new records. They found that some information was not correct. The Department updated these files and replaced the old information with correct information.",
              "Section 2: New rules now require supervisor approval before you can look at old records. Associates must submit a written request before viewing records older than five years. If you notice any differences between this memo and earlier versions, please report them through standard channels.",
              "This document replaces all earlier versions. Do not remove this memo from the office.",
            ],
          },
          // Card 2: Comprehension check — proves they processed the input
          {
            type: "intake_questions",
            title: "Memo Comprehension Check",
            questions: [
              {
                key: "q1",
                label: "What did the Department find in the citizen activity records?",
                options: [
                  "The records were too old",
                  "Some information was not correct",
                  "There were too many files",
                  "The records were missing",
                ],
                correctIndex: 1,
              },
              {
                key: "q2",
                label: "How many citizen files did the review include?",
                options: ["400", "612", "847", "1000"],
                correctIndex: 2,
              },
              {
                key: "q3",
                label: "What must associates do before viewing old records?",
                options: [
                  "Ask a friend",
                  "Wait five years",
                  "Submit a written request",
                  "Remove the old records",
                ],
                correctIndex: 2,
              },
              {
                key: "q4",
                label: "What should you do if you notice differences between memo versions?",
                options: [
                  "Ignore them",
                  "Report them through standard channels",
                  "Remove the old version",
                  "Change the new version",
                ],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
    },

    // 2. Word Match — vocabulary recognition, now grounded in memo context
    {
      id: "word_match_w2",
      type: "word_match",
      location: "Compliance Desk",
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

    // 3. Cloze Fill — guided recall of memo content using target vocabulary
    {
      id: "cloze_fill_w2",
      type: "cloze_fill",
      location: "Records Office",
      label: "Document Verification",
      config: {
        title: "INTERNAL MEMO 000328 — DEPARTMENT OF CLARITY",
        from: "Regional Oversight Division",
        passage:
          "This memo is to {0} all associates of {1} to monthly operations.\n\nSection 1: The Department {2} problems in citizen activity records last week. The team completed a full review. The review {3} data from 847 citizen files. Three associates {4} the old records with the new records. They found that some information was not correct. The Department {5} these files and {6} the old information with correct information.\n\nSection 2: New rules now {7} supervisor approval. Associates must {8} a written {9} before viewing old records. If you {10} any differences, please report them.",
        blanks: [
          { index: 0, correctWord: "inform" },
          { index: 1, correctWord: "changes" },
          { index: 2, correctWord: "noticed" },
          { index: 3, correctWord: "included" },
          { index: 4, correctWord: "compared" },
          { index: 5, correctWord: "updated" },
          { index: 6, correctWord: "replaced" },
          { index: 7, correctWord: "require" },
          { index: 8, correctWord: "submit" },
          { index: 9, correctWord: "request" },
          { index: 10, correctWord: "notice" },
        ],
        wordBank: [
          "inform", "changes", "noticed", "included", "compared",
          "updated", "replaced", "require", "submit", "request",
          "notice", "removed",
        ],
        pearlBarkOnComplete: "Document verified. Proceed to Archive Classification.",
      },
    },

    // 4. Word Sort — grammar classification, past vs present forms
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

    // 5. Vocab Clearance — TOEIC Part 5 assessment
    {
      id: "vocab_clearance_w2",
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

    // 6. Contradiction Report — real-time memo swap + recall + classify + write
    //    Students see Memo 000328 again, then it changes before their eyes.
    //    Recall questions (no going back), then classify + write (both shown).
    {
      id: "contradiction_report_w2",
      type: "contradiction_report",
      label: "Contradiction Report",
      location: "Review Station",
      config: {
        memo: {
          title: "INTERNAL MEMO 000328",
          department: "Department of Clarity",
          date: "March 3",
          from: "Regional Oversight Division",
          to: "All Associates",
          re: "Monthly Activity Review — Clarity Bay Sector 7",
          body: "This memo is to inform all associates of changes to monthly operations.\n\nSection 1: The Department noticed problems in citizen activity records last week. The team completed a full review. The review included data from 847 citizen files. Three associates compared the old records with the new records. They found that some information was not correct. The Department updated these files and replaced the old information with correct information.\n\nSection 2: New rules now require supervisor approval before you can look at old records. Associates must submit a written request before viewing records older than five years. If you notice any differences between this memo and earlier versions, please report them through standard channels.\n\nThis document replaces all earlier versions. Do not remove this memo from the office.",
        },
        memoRevised: {
          title: "INTERNAL MEMO 000328-R (REVISED)",
          department: "Department of Clarity",
          date: "March 10",
          from: "Regional Oversight Division",
          to: "All Associates",
          re: "Monthly Activity Review — Clarity Bay Sector 7",
          reviewedBy: "CA-19 — Lena Park",
          body: "This memo is to inform all associates of changes to monthly operations.\n\nSection 1: The Department noticed problems in citizen activity records last week. The team completed a routine review. The review included data from 612 citizen files. The Department updated these files and replaced the old information with correct information.\n\nSection 2: New rules now require supervisor approval before you can look at old records. Associates must submit a written request before viewing records older than three years.\n\nThis document replaces all earlier versions.",
        },
        differences: [
          {
            diffId: "diff_1",
            label: "Review scope",
            originalText: "full review",
            revisedText: "routine review",
            classification: "information_changed",
          },
          {
            diffId: "diff_2",
            label: "File count",
            originalText: "847 citizen files",
            revisedText: "612 citizen files",
            classification: "information_changed",
          },
          {
            diffId: "diff_3",
            label: "Associates who found errors",
            originalText: "Three associates compared the old records with the new records. They found that some information was not correct.",
            revisedText: "[Removed]",
            classification: "information_removed",
          },
          {
            diffId: "diff_4",
            label: "Record age requirement",
            originalText: "older than five years",
            revisedText: "older than three years",
            classification: "information_changed",
          },
          {
            diffId: "diff_5",
            label: "Reporting instruction",
            originalText: "If you notice any differences between this memo and earlier versions, please report them through standard channels.",
            revisedText: "[Removed]",
            classification: "information_removed",
          },
        ],
        recallQuestions: [
          {
            id: "recall_1",
            question: "What type of review did the original memo describe?",
            options: ["routine review", "full review", "quick review", "special review"],
            correctIndex: 1,
          },
          {
            id: "recall_2",
            question: "How many citizen files were in the original review?",
            options: ["612", "700", "847", "1000"],
            correctIndex: 2,
          },
          {
            id: "recall_3",
            question: "What happened to the sentence about three associates who compared the records?",
            options: [
              "It was changed",
              "It stayed the same",
              "It was removed",
              "New information was added",
            ],
            correctIndex: 2,
          },
          {
            id: "recall_4",
            question: "In the original, how old must records be before you need supervisor approval?",
            options: ["three years", "five years", "seven years", "ten years"],
            correctIndex: 1,
          },
          {
            id: "recall_5",
            question: "What instruction about noticing differences was removed from the revised memo?",
            options: [
              "Ask your supervisor for help",
              "Report differences through standard channels",
              "Compare the memo with a friend",
              "Remove the old version immediately",
            ],
            correctIndex: 1,
          },
        ],
        pearlSwapMessage: "Attention, Citizen. A routine document update has been applied to Memo 000328. The current version is always the correct version. Please continue your work.",
        writingPrompt:
          "Describe the differences between Memo 000328 (Original) and Memo 000328-R (Revised). What did the original say? What does the revised version say now? Use past simple for the original and present simple for the revised version.",
        writingMinWords: 40,
        writingLane: {
          "1": {
            minWords: 30,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "\"The original memo included _______. The revised memo now says _______.\"",
              "\"Yesterday, the report informed associates that _______. Today, it says _______.\"",
              "\"The Department removed _______ from the original. The updated version does not include this.\"",
              "\"I noticed that the original required _______. The revision changed this to _______.\"",
              "\"The earlier memo compared _______ and _______. The new version replaced this section.\"",
            ],
          },
          "2": { minWords: 40, wordListVisible: true },
          "3": {
            minWords: 55,
            bonusQuestion:
              "Did the revision add information or remove it? What did the original include that the revision does not? Why might the Ministry remove the instruction to report differences?",
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
      triggerConfig: { taskId: "contradiction_report_w2" },
      messageText:
        "Hey! You're the new associate right? CA-something? I'm Chad — CA-31. Well, technically I started three weeks before you but they fast-tracked my orientation because my uncle works in Administrative Division. Anyway, these contradiction reports? Super easy. I usually finish mine in like five minutes. Just compare the dates and you're done. Don't overthink it 😎",
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
      triggerConfig: { taskId: "contradiction_report_w2" },
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
            "Right? The original included more data. And that sentence about associates who found errors — it's just gone. Like it never existed. But maybe I'm overthinking this.",
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
      triggerConfig: { taskId: "contradiction_report_w2" },
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

    // Betty / WA-14 — appears on completion of contradiction_report (replaces old shift_report trigger)
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_complete",
      triggerConfig: { taskId: "contradiction_report_w2" },
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
