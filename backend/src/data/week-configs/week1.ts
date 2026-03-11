// ─── Week 1: First Shift Orientation ─────────────────────────────
import type { WeekConfig } from './types';

export const WEEK_1_CONFIG: WeekConfig = {
  weekNumber: 1,
  grammarTarget: "present-simple",
  targetWords: [
    "arrive", "follow", "check", "report", "submit",
    "approve", "describe", "assign", "standard", "confirm",
  ],
  previousWords: [],
  shiftType: "queue",

  // ─── Tasks ──────────────────────────────────────────────────────
  tasks: [
    // 1. Intake Form
    {
      id: "intake_form",
      type: "intake_form",
      location: "Shift Intake",
      label: "Intake Processing",
      config: {
        cards: [
          {
            type: "personal_info",
            fields: [
              { key: "designation", label: "Designation", type: "readonly", value: "{designation}" },
              { key: "department", label: "Department", type: "readonly", value: "Clarity" },
              { key: "date", label: "Date", type: "readonly", value: "{date}" },
            ],
          },
          {
            type: "briefing",
            title: "New Associate Orientation Memo",
            from: "Department of Clarity — Human Resources Division",
            paragraphs: [
              "Welcome to the Ministry for Healthy and Safe Communication. Please read the following orientation guidelines before proceeding with your intake assessment.",
              "All new associates arrive at 08:00 for morning briefing. Upon arrival, check your schedule for the day's assignments. If there are any changes to your schedule, report them to your supervisor immediately.",
              "The Ministry values associates who follow standard procedures. All documents must be submitted before 16:00. Late submissions will be flagged by P.E.A.R.L.",
              "Your cooperation ensures clarity for all citizens. Proceed to the comprehension check when ready.",
            ],
          },
          {
            type: "intake_questions",
            title: "Orientation Comprehension",
            questions: [
              {
                key: "arrive_time",
                label: "What time do new associates arrive for morning briefing?",
                options: ["07:00", "08:00", "09:00", "10:00"],
                correctIndex: 1,
              },
              {
                key: "check_daily",
                label: "What should you check each morning?",
                options: ["Your email", "Your schedule", "The news", "Your phone"],
                correctIndex: 1,
              },
              {
                key: "report_changes",
                label: "Who should you report schedule changes to?",
                options: ["Betty", "Your supervisor", "The Ministry", "CA-31"],
                correctIndex: 1,
              },
              {
                key: "standard_word",
                label: "The Ministry values associates who follow _____ procedures.",
                options: ["special", "normal", "standard", "different"],
                correctIndex: 2,
              },
              {
                key: "submit_time",
                label: "When must all documents be submitted?",
                options: ["Before 12:00", "Before 16:00", "Before 17:00", "Before 20:00"],
                correctIndex: 1,
              },
            ],
          },
          {
            type: "acknowledgment",
            blanks: [
              {
                text: "I, {designation}, confirm that I will follow all Ministry _____ and maintain full _____ with Department _____.",
                answers: ["directives", "compliance", "protocol"],
              },
            ],
            checkbox:
              "I understand that my work will be monitored by P.E.A.R.L. at all times.",
          },
        ],
      },
    },

    // 2. Word Match — match target words to approved definitions
    {
      id: "word_match",
      type: "word_match",
      location: "Language Lab",
      label: "Language Authorization Check",
      config: {
        pairs: [
          { word: "arrive", definition: "to reach a place after traveling" },
          { word: "follow", definition: "to do what someone tells you to do" },
          { word: "check", definition: "to look at something to make sure it is correct" },
          { word: "report", definition: "to give information about something" },
          { word: "submit", definition: "to give a document to someone in authority" },
          { word: "approve", definition: "to officially agree that something is correct" },
          { word: "describe", definition: "to say what something is like" },
          { word: "assign", definition: "to give someone a job or task" },
          { word: "standard", definition: "an expected level of quality or rules" },
          { word: "confirm", definition: "to say that something is definitely true" },
        ],
        pearlBarkOnComplete: "Language authorization verified. Your vocabulary clearance has been updated.",
      },
    },

    // 3. Cloze Fill — complete Betty's Welcome Notice
    {
      id: "cloze_fill",
      type: "cloze_fill",
      location: "Records Office",
      label: "Document Completion",
      config: {
        title: "WELCOME NOTICE — NEW ASSOCIATE ORIENTATION",
        from: "Betty Lyle — WA-14",
        passage: "Welcome to the Department of Clarity. All new associates {0} at 08:00 for morning briefing. You will {1} your assigned supervisor to your workstation. Please {2} your schedule each morning and {3} any changes to your supervisor. The supervisor will {4} your documents before filing. In your report, {5} what you observed during the shift. The Ministry values every associate who follows {6} procedures.",
        blanks: [
          { index: 0, correctWord: "arrive" },
          { index: 1, correctWord: "follow" },
          { index: 2, correctWord: "check" },
          { index: 3, correctWord: "report" },
          { index: 4, correctWord: "confirm" },
          { index: 5, correctWord: "describe" },
          { index: 6, correctWord: "standard" },
        ],
        wordBank: ["arrive", "follow", "check", "report", "confirm", "describe", "standard", "submit", "approve", "assign"],
        pearlBarkOnComplete: "Document verified. Filing clearance granted.",
      },
    },

    // 4. Vocabulary Clearance
    {
      id: "vocab_clearance",
      type: "vocab_clearance",
      location: "Language Lab",
      label: "Vocabulary Clearance",
      config: {
        items: [
          {
            type: "definition",
            word: "arrive",
            question: "Which word means 'to reach a place after traveling'?",
            options: ["arrive", "approve", "assign", "describe"],
            correctIndex: 0,
          },
          {
            type: "definition",
            word: "follow",
            question: "Which word means 'to do what someone tells you to do'?",
            options: ["check", "submit", "follow", "report"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "check",
            question:
              "PEARL said: 'Review carefully, then continue to _____.'",
            options: ["check", "arrive", "describe", "assign"],
            correctIndex: 0,
          },
          {
            type: "definition",
            word: "report",
            question:
              "Which word means 'to give information about something'?",
            options: ["standard", "confirm", "approve", "report"],
            correctIndex: 3,
          },
          {
            type: "toeic_p5",
            word: "submit",
            question:
              "Ivan said: 'Read twice before you _____.'",
            options: ["follow", "submit", "arrive", "check"],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "approve",
            question:
              "Which word means 'to officially agree that something is correct'?",
            options: ["assign", "approve", "describe", "follow"],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "describe",
            question:
              "In your report, _____ what you observed during the shift.",
            options: ["confirm", "standard", "describe", "submit"],
            correctIndex: 2,
          },
          {
            type: "definition",
            word: "assign",
            question: "Which word means 'to give someone a job or task'?",
            options: ["assign", "arrive", "report", "check"],
            correctIndex: 0,
          },
          {
            type: "context",
            word: "standard",
            question:
              "In the passage, what does 'standard' most likely mean?",
            context:
              "All documents must meet the standard format required by the Ministry. Documents that do not follow the standard will be returned.",
            options: [
              "A type of flag",
              "An expected level of quality",
              "A piece of furniture",
              "A greeting",
            ],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "confirm",
            question:
              "Betty said she will _____ your clearance level after orientation.",
            options: ["arrive", "confirm", "describe", "follow"],
            correctIndex: 1,
          },
        ],
      },
    },

    // 5. Document Review
    {
      id: "document_review",
      type: "document_review",
      location: "Evidence Desk",
      label: "Document Review",
      config: {
        documents: [
          {
            id: "doc_welcome",
            type: "approve",
            title: "WELCOME NOTICE \u2014 NEW ASSOCIATE ORIENTATION",
            department: "Human Resources",
            classification: "STANDARD",
            priority: "ROUTINE",
            from: "Betty Lyle \u2014 WA-14",
            to: "All New Associates",
            re: "Welcome and Orientation Schedule",
            body: "Welcome to the Department of Clarity. All new associates arrive at 08:00 for morning briefing. You will follow your assigned supervisor to your workstation. Please check your schedule each morning and report any changes to your supervisor. Associate CA-31 will assist with your first week of filing. The Ministry values every associate who follows standard procedures.",
          },
          {
            id: "doc_schedule",
            type: "error_correction",
            title: "SHIFT SCHEDULE \u2014 WEEKLY ASSIGNMENTS",
            department: "Operations",
            classification: "STANDARD",
            priority: "ROUTINE",
            from: "Scheduling Division",
            to: "Department of Clarity \u2014 All Associates",
            re: "Weekly Schedule Update",
            body: "Each associate arrive at their assigned station by 08:00. Morning briefing take place in Room B-7. Associates follows the daily checklist without exception. All report is submitted before 17:00. The supervisor confirm each document before filing. Associates does not leave until the shift report is approve. New associates is assigned a mentor for the first week.",
            errors: [
              {
                sentenceIndex: 0,
                errorWord: "arrive",
                options: [{ text: "arrive" }, { text: "arrives" }, { text: "arriving" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 1,
                errorWord: "take",
                options: [{ text: "take" }, { text: "takes" }, { text: "taking" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 2,
                errorWord: "follows",
                options: [{ text: "follows" }, { text: "follow" }, { text: "following" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 3,
                errorWord: "report",
                options: [{ text: "report" }, { text: "reports" }, { text: "reporting" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 4,
                errorWord: "confirm",
                options: [{ text: "confirm" }, { text: "confirms" }, { text: "confirmed" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 5,
                errorWord: "approve",
                options: [{ text: "approve" }, { text: "approved" }, { text: "approves" }],
                correctIndex: 1,
              },
              {
                sentenceIndex: 6,
                errorWord: "is",
                options: [{ text: "is" }, { text: "are" }, { text: "was" }],
                correctIndex: 1,
              },
            ],
            laneHints: {
              "1": [
                "Look at the subject. Is it singular or plural?",
                "The subject is 'Associates' \u2014 that is plural.",
                "Check: does the verb match a singular or plural subject?",
                "The subject is 'supervisor' \u2014 that is singular.",
                "Look for the passive voice pattern: is/are + past participle.",
                "The subject is 'New associates' \u2014 that is plural.",
              ],
            },
          },
          {
            id: "doc_memo",
            type: "comprehension",
            title: "DEPARTMENT MEMO 14 \u2014 UPDATED FILING PROCEDURE",
            department: "Records Management",
            classification: "INTERNAL",
            priority: "STANDARD",
            from: "Records Division",
            to: "Department of Clarity \u2014 All Associates",
            re: "Updated Filing Procedure",
            reviewedBy: "CA-19 \u2014 Lena Park",
            body: "Effective immediately, all associates must submit completed documents to the central filing system before 16:00. Documents submitted after 16:00 will not be processed until the following day. Associates must check that all required fields are complete before submission. The supervisor will confirm receipt of each document. This procedure replaces the previous paper-based filing system. All associates are expected to follow the new standard without exception.",
            questions: [
              {
                question:
                  "What is the new deadline for document submission?",
                options: ["08:00", "16:00", "17:00", "12:00"],
                correctIndex: 1,
              },
              {
                question:
                  "What happens to documents submitted after the deadline?",
                options: [
                  "They are rejected",
                  "They are processed the next day",
                  "They are filed by the supervisor",
                  "They are returned to the associate",
                ],
                correctIndex: 1,
              },
              {
                question: "What does this new procedure replace?",
                options: [
                  "The digital filing system",
                  "The paper-based filing system",
                  "The supervisor approval system",
                  "The morning briefing schedule",
                ],
                correctIndex: 1,
              },
            ],
          },
        ],
      },
    },

    // 6. Shift Report — absorbs the old intake writing prompt
    {
      id: "shift_report",
      type: "shift_report",
      location: "Filing Desk",
      label: "Shift Report",
      config: {
        prompt:
          "Your first shift is complete. Write your shift report using 3 to 5 sentences. Try to use as many of the target words as possible.",
        minWords: 40,
        lane: {
          "1": {
            minWords: 20,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with: 'Today I arrived at...'",
              "Then: 'I had to follow...'",
              "End with: 'I submitted my report and...'",
            ],
            guidedQuestions: [
              "Write a sentence using 'arrive' and 'check'.",
              "Write a sentence using 'follow' and 'report'.",
              "Write a sentence using 'submit' and 'approve'.",
            ],
          },
          "2": { minWords: 25, wordListVisible: true },
          "3": {
            minWords: 45,
            bonusQuestion:
              "M.K. said 'Write what you can prove. Not more. Not less.' Why is that important advice for a Clarity Associate?",
          },
        },
      },
    },
  ],

  // ─── Character Messages ─────────────────────────────────────────
  characterMessages: [
    // Betty greets at intake
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_start",
      triggerConfig: { taskId: "intake_form" },
      messageText:
        "Well hi there, sugar! Welcome to the Department of Clarity! I'm Betty \u2014 WA-14, your Welcome Associate. Don't you worry about a thing \u2014 we'll get you settled in no time! Just fill out your intake form and we'll have you processing documents before you know it!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you, Betty. I will follow all procedures.",
          responseText:
            "That's the spirit, darlin'! The Ministry just loves a cooperative associate!",
          isCompliant: true,
        },
        {
          text: "What exactly will I be doing here?",
          responseText:
            "Oh, you'll be checking documents, sugar! Making sure everything is clear and correct. It's important work!",
          isCompliant: false,
        },
        {
          text: "This seems like a lot of paperwork.",
          responseText:
            "Ha! You sound just like my first day! But trust me, honey \u2014 every form has a purpose. The Ministry wouldn't waste your time!",
          isCompliant: false,
        },
      ],
    },

    // Betty introduces the cloze fill document
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_start",
      triggerConfig: { taskId: "cloze_fill" },
      messageText:
        "Oh! This is my Welcome Notice, sugar! I wrote it myself — well, the Ministry approved the language, of course. Could you fill in the missing words for me? My computer had a little glitch and some words disappeared!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Of course, Betty. I'll complete it right away.",
          responseText:
            "That's so sweet of you! You're already fitting in perfectly!",
          isCompliant: true,
        },
        {
          text: "Why are there words missing?",
          responseText:
            "Oh, you know how computers are! Sometimes things just... disappear. Nothing to worry about!",
          isCompliant: false,
        },
      ],
    },

    // Ivan warns before document review
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_start",
      triggerConfig: { taskId: "document_review" },
      messageText:
        "Hey... it's Ivan. CA-22. I sit two desks over from you, I think. Quick tip about the document review \u2014 read everything twice. The first time you miss things. Probably. I mean, I did when I started. Just... pay attention to the details, okay?",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thanks for the advice. I will be careful.",
          responseText:
            "Yeah... careful is good. That's what they want. I mean, it's what we should be. Right?",
          isCompliant: true,
        },
        {
          text: "Do a lot of people make mistakes?",
          responseText:
            "I mean... some do. Some documents are tricky. Like, the wording changes sometimes? But that's probably normal... Right?",
          isCompliant: false,
        },
        {
          text: "I'll be fine. I don't need help.",
          responseText:
            "Oh, sure. Yeah. Sorry. I just... never mind. Good luck with the review.",
          isCompliant: false,
        },
      ],
    },

    // M.K. silent observation after document review
    {
      characterName: "M.K.",
      designation: "",
      triggerType: "task_complete",
      triggerConfig: { taskId: "document_review" },
      messageText:
        "You found all the errors. Most new associates miss at least two.",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you. I tried to be thorough.",
          responseText: null,
          isCompliant: true,
        },
        {
          text: "How do you know my score?",
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

    // Betty congratulates after shift report
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "task_complete",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "Look at you, finishing your very first shift report! I knew you were going to be a good one, sugar! The Department needs associates like you. See you next shift, darlin'!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you, Betty. See you next shift.",
          responseText:
            "You take care now, hear? And remember \u2014 clear language makes a happy Republic!",
          isCompliant: true,
        },
        {
          text: "Is it always this much work?",
          responseText:
            "Oh honey, you haven't seen anything yet! But don't worry \u2014 it gets easier. Or... well, you get used to it!",
          isCompliant: false,
        },
      ],
    },
  ],

  // ─── Citizen-4488 Post ──────────────────────────────────────────
  citizen4488Post: {
    content:
      "Has anyone seen my neighbor? She always arrive at the community center on Tuesday, but her chair was empty this week. I am sure she is fine. The Ministry takes care of everyone. I should not worry.",
    type: "concerning",
    grammarError: { original: "arrive", corrected: "arrives" },
  },

  // ─── Harmony Config ─────────────────────────────────────────────
  harmonyConfig: {
    totalPosts: 8,
    cleanPosts: 3,
    grammarErrorPosts: 2,
    concerningPosts: 2,
    propagandaPosts: 1,
  },

  // ─── Narrative Hook ─────────────────────────────────────────────
  narrativeHook: {
    title: "Two Versions",
    body: "Two versions of the same memo arrived in your queue today. Both carry official Ministry seals. Both are signed by the same supervisor. But they do not say the same thing.",
    borderColor: "amber",
  },

  // ─── Shift Closing ──────────────────────────────────────────────
  shiftClosing: {
    clearanceFrom: "PROBATIONARY",
    clearanceTo: "PROVISIONAL",
    pearlQuote:
      "First shift processing complete. Accuracy metrics have been recorded. The Ministry appreciates diligent service.",
    narrativeHook: {
      title: "Two Versions",
      body: "Two versions of the same memo arrived in your queue today. Both carry official Ministry seals. Both are signed by the same supervisor. But they do not say the same thing.",
    },
  },
};
