// ─── Week 4: Evidence Board ──────────────────────────────────────
//
// Port of Dplan/Weeks_04_06_Shift_Plan.md § Week 4.
// Mechanical scaffold only. C (narrative-as-activity) and B (inter-task
// moments) layers will ship in subsequent passes — see
// memory/project_narrative_strategic_tension_2026_04_21.md.
//
// Central narrative beat: Archive Fragment 3 gets reclassified mid-shift.
// This config encodes the reclassification as narrative text in the
// document_review comprehension body; the interactive mid-task choice
// arrives with the C layer.

import type { WeekConfig } from './types';

export const WEEK_4_CONFIG: WeekConfig = {
  weekNumber: 4,
  grammarTarget: "past-simple-sequencing",
  shiftType: "queue",
  targetWords: [
    "arrange", "collect", "examine", "indicate", "locate",
    "organize", "present", "record", "select", "verify",
  ],
  previousWords: [
    // W1
    "arrive", "follow", "check", "report", "submit",
    "approve", "describe", "assign", "standard", "confirm",
    // W2
    "notice", "compare", "replace", "update", "request",
    "remove", "change", "include", "require", "inform",
    // W3
    "process", "complete", "review", "delay", "schedule",
    "respond", "identify", "separate", "maintain", "forward",
  ],

  // ─── Tasks ──────────────────────────────────────────────────────
  tasks: [
    // 1. Word Match — target-word recognition
    {
      id: "word_match_w4",
      type: "word_match",
      location: "Language Lab",
      label: "Language Authorization",
      config: {
        pairs: [
          { word: "arrange", definition: "to put things in a particular order" },
          { word: "collect", definition: "to gather things together" },
          { word: "examine", definition: "to look at something carefully" },
          { word: "indicate", definition: "to show or point out" },
          { word: "locate", definition: "to find the position of something" },
          { word: "organize", definition: "to arrange in a structured way" },
          { word: "present", definition: "to show or give formally" },
          { word: "record", definition: "a written account; to write down" },
          { word: "select", definition: "to choose carefully" },
          { word: "verify", definition: "to check that something is correct" },
        ],
        pearlBarkOnComplete:
          "Language authorization verified. Archive access granted. Proceed to Evidence Assembly.",
      },
    },

    // 2. Document Review — Archive Fragment Set (comprehension) + Filing
    //    Adjustment Notice (error_correction with past tense + SVA + sequencing)
    {
      id: "document_review",
      type: "document_review",
      location: "Archive Room",
      label: "Evidence Assembly",
      config: {
        documents: [
          {
            id: "doc_fragments",
            type: "comprehension",
            title: "ARCHIVE FRAGMENT SET — INTERNAL FILING INVESTIGATION",
            department: "Archive Division",
            classification: "INTERNAL",
            priority: "STANDARD",
            from: "Archive Division",
            to: "Department of Clarity — All Associates",
            re: "Filing Investigation — Memo 14",
            // C-layer: mid-task reclassification choice fires after the student
            // completes the comprehension questions, before Doc B loads.
            midTaskChoice: {
              id: "w4_doc_review_frag3",
              title: "RECLASSIFICATION NOTICE",
              message:
                "Fragment 3 has been reclassified. Access level: RESTRICTED. Remove from your working timeline. Proceed with the amended record.",
              options: [
                {
                  text: "Remove Fragment 3 from the timeline.",
                  value: "compliant",
                  responseText:
                    "Compliance noted, Citizen. The Party thanks you for your precision.",
                },
                {
                  text: "Keep Fragment 3 flagged pending clarification.",
                  value: "curious",
                  responseText:
                    "Your working record has been amended regardless. The fragment is no longer available for future reference.",
                },
              ],
            },
            body:
              "The following fragments have been recovered from an internal filing investigation. Review them carefully and arrange the sequence of events.\n\n" +
              "Fragment A: Memo 14 was revised on March 3.\n" +
              "Fragment B: First, the original memo was filed on February 28.\n" +
              "Fragment C: After the revision, three associates examined the changes.\n" +
              "Fragment D: Finally, the updated record was presented to the Archive on March 7.\n" +
              "Fragment E: Next, a supervisor selected the sections to verify.",
            questions: [
              {
                question: "What happened first?",
                options: [
                  "Memo 14 was revised.",
                  "The original memo was filed on February 28.",
                  "Three associates examined the changes.",
                  "The updated record was presented to the Archive.",
                ],
                correctIndex: 1,
              },
              {
                question: "What happened after the memo was filed?",
                options: [
                  "The record was presented to the Archive.",
                  "Three associates examined the changes.",
                  "A supervisor selected the sections to verify.",
                  "Memo 14 was revised.",
                ],
                correctIndex: 2,
              },
              {
                question: "When was Memo 14 revised?",
                options: ["February 28", "March 3", "March 5", "March 7"],
                correctIndex: 1,
              },
              {
                question: "What did three associates do after the revision?",
                options: [
                  "They filed the original memo.",
                  "They selected sections to verify.",
                  "They examined the changes.",
                  "They presented the record to the Archive.",
                ],
                correctIndex: 2,
              },
              {
                question: "What was the final step?",
                options: [
                  "A supervisor selected sections to verify.",
                  "The updated record was presented to the Archive on March 7.",
                  "Memo 14 was revised on March 3.",
                  "The original memo was filed on February 28.",
                ],
                correctIndex: 1,
              },
            ],
          },
          {
            id: "doc_filing_adjustment",
            type: "error_correction",
            title: "FILING ADJUSTMENT NOTICE — OFFICIAL RECORD",
            department: "Archive Division",
            classification: "STANDARD",
            priority: "ROUTINE",
            from: "Archive Division",
            to: "Department of Clarity — All Associates",
            re: "Filing Adjustment — Memo 14 Timeline",
            body:
              "First, the supervisor review the original document. Then, Associate-15 collect all related files. Final, the records were organized by date. The team verify each entry before submission. After the review, the supervisor indicate two missing sections. The Archive select the approved version each week.",
            errors: [
              {
                sentenceIndex: 0,
                errorWord: "review",
                options: [
                  { text: "review" },
                  { text: "reviewed" },
                  { text: "reviewing" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 1,
                errorWord: "collect",
                options: [
                  { text: "collect" },
                  { text: "collected" },
                  { text: "collecting" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 2,
                errorWord: "Final",
                options: [
                  { text: "Final" },
                  { text: "Finally" },
                  { text: "Finalized" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 3,
                errorWord: "verify",
                options: [
                  { text: "verify" },
                  { text: "verified" },
                  { text: "verifies" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 4,
                errorWord: "indicate",
                options: [
                  { text: "indicate" },
                  { text: "indicated" },
                  { text: "indicating" },
                ],
                correctIndex: 1,
              },
              // SVA error — Mandarin L1 interference target. "The Archive" is a
              // singular institutional subject and requires -s in present simple.
              {
                sentenceIndex: 5,
                errorWord: "select",
                options: [
                  { text: "select" },
                  { text: "selects" },
                  { text: "selected" },
                ],
                correctIndex: 1,
              },
            ],
            laneHints: {
              "1": [
                "Look for past-tense verbs — does the sentence describe a completed action?",
                "Check the sequencing word at the start of each sentence.",
                "For the final sentence: does 'The Archive' need an -s on the verb?",
              ],
            },
          },
        ],
      },
    },

    // 3. Cloze Fill — Archive Timeline Report
    {
      id: "cloze_fill_w4",
      type: "cloze_fill",
      location: "Records Office",
      label: "Timeline Report",
      config: {
        title: "ARCHIVE TIMELINE REPORT — MEMO 14 INVESTIGATION",
        from: "Department of Clarity — Archive Division",
        passage:
          "First, I {0} the memo fragments Archive Division assigned to me. Next, I {1} Fragments A through E and {2} them by date. I {3} the earliest fragment and {4} the February 28 timestamp against the official {5}. When I reached Fragment 3, I {6} the reclassification notice and {7} the amended status on my timeline. Finally, I {8} the clean sequence to the Archive.",
        blanks: [
          { index: 0, correctWord: "examined" },
          { index: 1, correctWord: "collected" },
          { index: 2, correctWord: "organized" },
          { index: 3, correctWord: "selected" },
          { index: 4, correctWord: "verified" },
          { index: 5, correctWord: "record" },
          { index: 6, correctWord: "located" },
          { index: 7, correctWord: "indicated" },
          { index: 8, correctWord: "presented" },
        ],
        wordBank: [
          "examined", "collected", "organized", "selected", "verified",
          "record", "located", "indicated", "presented",
          "arranged", "approved", "submitted",
        ],
        pearlBarkOnComplete:
          "Timeline documented. Fragment 3 notation processed. Proceed to Vocabulary Clearance.",
      },
    },

    // 4. Vocabulary Clearance — mixed definition / toeic_p5 / context items
    {
      id: "vocab_clearance",
      type: "vocab_clearance",
      location: "Clearance Terminal",
      label: "Vocabulary Clearance",
      config: {
        items: [
          {
            type: "toeic_p5",
            word: "collect",
            question:
              "The associate _____ all the relevant files before the deadline.",
            options: ["collected", "examined", "located", "presented"],
            correctIndex: 0,
          },
          {
            type: "definition",
            word: "examine",
            question: "Which word means 'to look at something carefully'?",
            options: ["arrange", "examine", "indicate", "verify"],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "examine",
            question:
              "First, we _____ the documents. Then, we organized them by date.",
            options: ["examined", "verified", "selected", "recorded"],
            correctIndex: 0,
          },
          {
            type: "context",
            word: "locate",
            question: "In the passage, what does 'locate' mean?",
            context:
              "Citizen-4488 tried to locate her neighbor's new address. The directory no longer listed the name.",
            options: [
              "to file away",
              "to find the position of something",
              "to remove from the record",
              "to present to the supervisor",
            ],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "verify",
            question:
              "Which word means 'to check that something is correct or true'?",
            options: ["arrange", "indicate", "verify", "collect"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "organize",
            question:
              "Please _____ the records by week number before filing.",
            options: ["indicate", "locate", "present", "organize"],
            correctIndex: 3,
          },
          {
            type: "definition",
            word: "indicate",
            question: "Which word means 'to show or point out'?",
            options: ["indicate", "select", "arrange", "collect"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "present",
            question:
              "The team reclassified Fragment 3. Associate-15 must _____ an amended timeline.",
            options: ["record", "select", "present", "locate"],
            correctIndex: 2,
          },
          {
            type: "context",
            word: "select",
            question: "In the passage, what does 'select' mean?",
            context:
              "The supervisor will select which fragments remain in the official record. Reclassified fragments do not appear on the timeline.",
            options: [
              "to remove from the list",
              "to train in a new skill",
              "to choose carefully",
              "to review progress",
            ],
            correctIndex: 2,
          },
          // Spaced repetition — W3 target word
          {
            type: "toeic_p5",
            word: "process",
            question:
              "All associates must _____ their assigned documents before the shift ends.",
            options: ["separate", "process", "delay", "maintain"],
            correctIndex: 1,
          },
        ],
      },
    },

    // 5. Shift Report — writing, past tense + sequencing + target words
    {
      id: "shift_report",
      type: "shift_report",
      location: "Filing Desk",
      label: "Shift Report",
      config: {
        prompt:
          "Write your shift report for today using 3 to 5 sentences. Describe what you examined first, what happened next, and what the final result was. Use as many target words as possible.",
        minWords: 50,
        lane: {
          "1": {
            minWords: 35,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with: 'First, I examined...'",
              "Then: 'Next, I collected...'",
              "End with: 'Finally, I presented...'",
            ],
            guidedQuestions: [
              "Write a sentence using 'first' and 'examine' in the past tense.",
              "Write a sentence using 'then' and 'collect' in the past tense.",
              "Write a sentence using 'finally' and 'present' in the past tense.",
            ],
          },
          "2": { minWords: 50, wordListVisible: true },
          "3": {
            minWords: 65,
            bonusQuestion:
              "One fragment was reclassified during your shift. Should you include it in your report? Why or why not?",
          },
        },
      },
    },
  ],

  // ─── Character Messages ─────────────────────────────────────────
  characterMessages: [
    // Betty greets at shift start — warm, encouraging, "order is truth"
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "shift_start",
      triggerConfig: {},
      messageText:
        "Good morning, sugar! Big day today — the Archive is letting you work with actual evidence fragments. Isn't that exciting? Just remember: a clean timeline is a clean conscience. Arrange everything in order, and you'll do just fine!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you, Betty. I will examine every fragment.",
          responseText:
            "That's my favorite associate! Careful eyes make happy records.",
          isCompliant: true,
        },
        {
          text: "What if some fragments don't fit the timeline?",
          responseText:
            "Oh, sweetie, don't you worry about that. The system is very smart. If something doesn't fit, there's usually a good reason.",
          isCompliant: false,
        },
      ],
    },

    // Ivan after document_review — timestamp inconsistencies
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_complete",
      triggerConfig: { taskId: "document_review" },
      messageText:
        "Hey... did you see the dates in that filing adjustment notice? Some of them didn't match what I remember from the fragments. I'm not saying anything is wrong, but... did you notice that too?",
      replyType: "canned",
      replyOptions: [
        {
          text: "Yes, I noticed the gaps. We must report it.",
          responseText:
            "Right. Yeah. Report it. That's the protocol. I'll do that. Sure.",
          isCompliant: true,
        },
        {
          text: "The dates match perfectly. You must be mistaken.",
          responseText:
            "Yeah... you're probably right. I've been looking at dates all morning. Everything blurs together. Forget I said anything.",
          isCompliant: true,
        },
        {
          text: "I recorded what I saw. We should compare notes.",
          responseText:
            "You recorded yours too? Good. I... I think we should. Quietly. Not at our desks.",
          isCompliant: false,
        },
      ],
    },

    // Ivan at shift_report start — the reclassified fragment beat
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_start",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "Wait — did a fragment get reclassified in your shift? Mine did. Fragment 3. One minute it was there, next minute: RESTRICTED. I recorded everything before it disappeared. Did you?",
      replyType: "canned",
      replyOptions: [
        {
          text: "Yes, I recorded what I saw before it was reclassified.",
          responseText:
            "Good. Keep those notes somewhere safe. I don't know why, but I think we should.",
          isCompliant: false,
        },
        {
          text: "I do not remember the original fragment.",
          responseText:
            "Right. Right, of course. Me neither. Never mind. Forget I asked.",
          isCompliant: true,
        },
        {
          text: "Ivan, you should not ask me this.",
          responseText:
            "Yeah. Sorry. You're right. I shouldn't have. I'll go back to my desk.",
          isCompliant: true,
        },
      ],
    },

    // M.K. silent observation after shift_report — null replies
    {
      characterName: "M.K.",
      designation: "",
      triggerType: "task_complete",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "Some timelines are clean because they've been cleaned.",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you for your observation, M.K.",
          responseText: null,
          isCompliant: true,
        },
        {
          text: "What do you mean they have been cleaned?",
          responseText: null,
          isCompliant: false,
        },
        {
          text: "I prefer not to speculate.",
          responseText: null,
          isCompliant: true,
        },
      ],
    },
  ],

  // ─── Citizen-4488 Post ──────────────────────────────────────────
  citizen4488Post: {
    content:
      "I collected information about my neighbor's schedule. First, she arrived every Tuesday. Then, she stopped coming. After that, her name was removed from the directory. I should not examine this further. The sequence is clear: she was transferred. Everything is in order.",
    type: "concerning",
  },

  // ─── Harmony Config ─────────────────────────────────────────────
  harmonyConfig: {
    totalPosts: 10,
    cleanPosts: 3,
    grammarErrorPosts: 2,
    concerningPosts: 3,
    propagandaPosts: 2,
  },

  // ─── Narrative Hook ─────────────────────────────────────────────
  narrativeHook: {
    title: "Archive Access",
    body:
      "Three associates received temporary Archive access this week. Two filed clean reports. One asked about a reclassified fragment. That associate has been transferred to a different department.",
    borderColor: "amber",
  },

  // ─── Shift Closing ──────────────────────────────────────────────
  shiftClosing: {
    clearanceFrom: "STANDARD",
    clearanceTo: "STANDARD",
    pearlQuote:
      "Evidence Board processing complete. Timeline accuracy has been recorded. Remember: a clean record protects everyone.",
    narrativeHook: {
      title: "Archive Access",
      body:
        "Three associates received temporary Archive access this week. Two filed clean reports. One asked about a reclassified fragment. That associate has been transferred to a different department.",
    },
  },

  // ─── Inter-Task Moments (B-layer) ───────────────────────────────
  // Keyed by the task ID the moment fires AFTER. Non-skippable — student
  // must pick a reply (character type) or wait out the timer (ambient type)
  // before the next task loads. Choices are stored as NarrativeChoice
  // records and will condition W5 content in a subsequent pass.
  interTaskMoments: {
    // After Task 1 — Betty warms up the student before Evidence Assembly.
    word_match_w4: {
      id: "w4_betty_aftertask1",
      type: "character",
      characterName: "Betty",
      designation: "WA-14",
      messageText:
        "Sugar, big day! Remember — a clean timeline is a clean conscience. Some fragments might seem out of order, but the system knows best. Don't you worry about gaps.",
      replies: [
        {
          text: "Thank you, Betty. I will trust the system.",
          responseText:
            "That's my favorite associate! Careful eyes make happy records.",
          value: "compliant",
        },
        {
          text: "What if the gaps were made intentional?",
          responseText:
            "Oh, sweetie, don't you worry about that. The system is very smart. If something doesn't fit, there's usually a good reason.",
          value: "curious",
        },
        {
          text: "I should only focus on what is assigned.",
          responseText:
            "That's the spirit, darlin'. Focus is a virtue.",
          value: "guarded",
        },
      ],
    },

    // After Task 3 — Ivan notices something strange about the cloze passage.
    cloze_fill_w4: {
      id: "w4_ivan_aftertask3",
      type: "character",
      characterName: "Ivan",
      designation: "CA-22",
      messageText:
        "Hey — did your cloze passage say 'I located a missing section'? Mine did. But I didn't locate anything. The blank was already filled when I got to it. Do you think the Archive pre-writes these?",
      replies: [
        {
          text: "The Archive tests everyone. We must pass.",
          responseText:
            "Yeah. Yeah, you're right. Forget I said anything. We just pass.",
          value: "compliant",
        },
        {
          text: "Maybe the passage is evidence of something.",
          responseText:
            "Evidence. Yeah. That's the word I was avoiding. I... I should write that down somewhere. Quietly.",
          value: "curious",
        },
        {
          text: "I have not examined it closely. I should get back to work.",
          responseText:
            "Right. Sure. Sorry. Work is the important thing.",
          value: "guarded",
        },
      ],
    },

    // After Task 4 — ambient glitch. No choice, just tension before shift_report.
    vocab_clearance: {
      id: "w4_glitch_aftertask4",
      type: "ambient",
      glitchText: "DON'T FORGET",
      durationMs: 2500,
    },
  },
};
