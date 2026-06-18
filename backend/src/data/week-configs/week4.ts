// ─── Week 4: Activity Reconciliation ─────────────────────────────
//
// REDESIGNED 2026-05-11. Supersedes the prior "Evidence Board" framing.
// Port of Dplan/Weeks_04_06_Shift_Plan.md § Week 4 (Activity Reconciliation).
//
// Central narrative beat: students compile the official Daily Activity
// Report for Citizen-4488. Mid-Doc-Review, Observation E (which recorded
// a guest entry by Citizen-9020) is reclassified RESTRICTED via a silent
// visual mutation — no popup choice. The Unedited make first contact in
// Clip A's briefing video (hijack at 1:40). The `[ ].edited` hidden app
// appears on the desktop post-login glitch; it carries the Black Word
// Lexicon + Cipher cloze (Activity 3).
//
// Frontend dependencies (NOT yet built):
//   - Queue sidebar panel showing today's 4 cases (4488 priority + 3 others)
//   - Observation card mutation event (greying + RESTRICTED stamp on Obs E)
//   - `[ ].edited` app shell with Lexicon + Cipher tabs and bracket motif
//   - Post-Shift-Report Drop Box ping
//   - End-of-shift recruitment NarrativeChoice modal (key: w4_recruitment_vote)

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
    // 1. Word Match — target-word recognition (Language Authorization)
    {
      id: "word_match_w4",
      type: "word_match",
      location: "Authorization Terminal",
      label: "Language Authorization",
      config: {
        pairs: [
          { word: "arrange", definition: "to put things in a particular order" },
          { word: "collect", definition: "to gather things together" },
          { word: "examine", definition: "to look at something carefully" },
          { word: "indicate", definition: "to show or point out" },
          { word: "locate", definition: "to find the position of something" },
          { word: "organize", definition: "to put things into a clear, tidy system" },
          { word: "present", definition: "to show or give formally" },
          { word: "record", definition: "to write down information so it is kept" },
          { word: "select", definition: "to choose carefully" },
          { word: "verify", definition: "to check that something is correct" },
        ],
        pearlBarkOnComplete:
          "Language authorization verified. You may proceed to the Reconciliation Desk.",
      },
    },

    // 2. Activity Reconciliation Desk — daily observations (comprehension)
    //    + daily adjustment notice (error_correction, past tense + SVA + sequencing)
    //
    // NOTE 2026-05-11: midTaskChoice removed. The Observation E reclassification
    // beat is now a silent visual mutation (greying + RESTRICTED stamp on the card)
    // that the frontend renders during the doc_observations comprehension phase,
    // before Doc B loads. The mutation event is NOT yet representable in the
    // WeekConfig schema — frontend handles it. NarrativeChoice for engagement is
    // captured later via the `[ ].edited` Drop Box and end-of-shift recruitment modal.
    {
      id: "document_review",
      type: "document_review",
      location: "Reconciliation Desk",
      label: "Activity Reconciliation Desk",
      config: {
        documents: [
          {
            id: "doc_observations",
            type: "comprehension",
            title: "DAILY OBSERVATION SET — CITIZEN-4488",
            department: "Department of Clarity — Activity Reconciliation Office",
            classification: "STANDARD",
            priority: "ROUTINE",
            from: "Activity Reconciliation Office",
            to: "Department of Clarity — Reconciliation Associates",
            re: "Citizen-4488 — Daily Activity Report",
            directions:
              "Read Citizen-4488's surveillance log below. Each line is one observation: the time, the place, and the action — listed in order from first to last. When you have read every line, answer the five verification questions. The answers all come from the log above.",
            // The observation lines render as a structured, scannable list from
            // the `observations[]` array below (ComprehensionDoc handles it).
            // `body` is now just the intro sentence — the old run-on string of
            // `\n`-separated observations collapsed to one wall of text inside a
            // single <p>, which is what made this screen unreadable.
            body:
              "The following surveillance observations have been logged for Citizen-4488 today. Read each entry in order, then confirm the sequence in the verification below.",
            // After the 5 comprehension Qs, ArchiveControl reclassifies Obs E
            // as RESTRICTED via a silent visual mutation. Handled frontend-only.
            mutationAfterComprehension: true,
            observations: [
              {
                label: "A",
                time: "07:23",
                location: "Sector 4 entrance",
                action: "badge scan",
              },
              {
                label: "B",
                time: "08:15",
                location: "Filing Desk 14",
                action: "log-in",
              },
              {
                label: "C",
                time: "12:00",
                location: "Common Mess",
                action: "meal card swipe",
              },
              {
                label: "D",
                time: "14:30",
                location: "Records Wing",
                action: "access log",
              },
              {
                label: "E",
                time: "17:30",
                location: "Block 7 Residential",
                action: "badge scan — guest entry logged: Citizen-9020",
                restrict: true,
              },
            ],
            questions: [
              {
                question: "What did Citizen-4488 do first?",
                options: [
                  "Returned to Block 7 Residential.",
                  "Arrived at Sector 4 at 07:23.",
                  "Visited the Common Mess.",
                  "Accessed the Records Wing.",
                ],
                correctIndex: 1,
              },
              {
                question: "Where was Citizen-4488 at 12:00?",
                options: [
                  "Filing Desk 14.",
                  "Records Wing.",
                  "Common Mess.",
                  "Block 7 Residential.",
                ],
                correctIndex: 2,
              },
              {
                question: "After the Records Wing access, what happened next?",
                options: [
                  "Citizen-4488 arrived at Sector 4 entrance.",
                  "Citizen-4488 returned to Block 7 Residential.",
                  "Citizen-4488 logged in at Filing Desk 14.",
                  "Citizen-4488 visited the Common Mess.",
                ],
                correctIndex: 1,
              },
              {
                question: "Who was logged as a guest at Block 7 Residential?",
                options: [
                  "Citizen-4488.",
                  "Citizen-6103.",
                  "Citizen-9020.",
                  "Associate-15.",
                ],
                correctIndex: 2,
              },
              {
                question: "What was the final observation of the day?",
                options: [
                  "Sector 4 entrance badge scan at 07:23.",
                  "Filing Desk 14 log-in at 08:15.",
                  "Records Wing access at 14:30.",
                  "Block 7 Residential badge scan at 17:30.",
                ],
                correctIndex: 3,
              },
            ],
          },
          {
            id: "doc_adjustment",
            type: "error_correction",
            title: "DAILY ADJUSTMENT NOTICE — CITIZEN-4488 RECORD",
            department: "Department of Clarity — Activity Reconciliation Office",
            classification: "STANDARD",
            priority: "ROUTINE",
            from: "Activity Reconciliation Office",
            to: "Department of Clarity — Reconciliation Associates",
            re: "Citizen-4488 Daily Record — Adjustment Notice",
            // Two target-verb errors (collect / organize) added 2026-06-10 so the
            // week's TOEIC vocabulary gets a PRODUCTION surface inside the grammar
            // task — the cloze slot belongs to the Black Words, so without these
            // 7/10 targets were recognition-only across the whole shift.
            body:
              "First, Citizen-4488 arrive at Sector 4 at 07:23. Next, Associate-15 verify the morning observations. After that, the team collect the badge logs from the entrance. Then the associates organize the records by time. Final, the report was reconciled. The team indicate one observation for review. After the review, Observation E was reclassify as RESTRICTED. The Archive select which observations enter the permanent record each week.",
            errors: [
              {
                sentenceIndex: 0,
                errorWord: "arrive",
                options: [
                  { text: "arrive" },
                  { text: "arrived" },
                  { text: "arriving" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 1,
                errorWord: "verify",
                options: [
                  { text: "verify" },
                  { text: "verified" },
                  { text: "verifies" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 2,
                errorWord: "collect",
                options: [
                  { text: "collect" },
                  { text: "collected" },
                  { text: "collecting" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 3,
                errorWord: "organize",
                options: [
                  { text: "organize" },
                  { text: "organized" },
                  { text: "organizing" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 4,
                errorWord: "Final",
                options: [
                  { text: "Final" },
                  { text: "Finally" },
                  { text: "Finalized" },
                ],
                correctIndex: 1,
              },
              {
                sentenceIndex: 5,
                errorWord: "indicate",
                options: [
                  { text: "indicate" },
                  { text: "indicated" },
                  { text: "indicating" },
                ],
                correctIndex: 1,
              },
              // Passive past — "was reclassify" → "was reclassified"
              {
                sentenceIndex: 6,
                errorWord: "reclassify",
                options: [
                  { text: "reclassify" },
                  { text: "reclassified" },
                  { text: "reclassifying" },
                ],
                correctIndex: 1,
              },
              // SVA error — Mandarin L1 interference target. "The Archive" is a
              // singular institutional subject and requires -s in present simple.
              {
                sentenceIndex: 7,
                errorWord: "select",
                options: [
                  { text: "select" },
                  { text: "selects" },
                  { text: "selected" },
                ],
                correctIndex: 1,
              },
            ],
            // One hint per error, aligned to errorIndex order (0..7). The renderer
            // (ErrorCorrectionDoc) indexes laneHints["1"][errorIndex], so the array
            // MUST be the same length and order as `errors` above — otherwise hints
            // attach to the wrong word and the last errors get none.
            laneHints: {
              "1": [
                "Past tense: this already happened. 'arrive' → 'arriv__'.",
                "Past tense: the checking is finished. 'verify' → 'verif__'.",
                "Past tense: the team already did this. 'collect' → 'collect__'.",
                "Past tense: this step is also finished. 'organize' → 'organiz__'.",
                "This sequencing word needs its -ly ending: 'Final' → 'Final__'.",
                "Past tense: the team already did this. 'indicate' → 'indicat__'.",
                "Passive past: 'was ___' still needs the -ed ending.",
                "Subject–verb: 'The Archive' is singular — add -s.",
              ],
            },
          },
        ],
      },
    },

    // 3. `[ ].edited` Cipher Decryption — MULTI-DOCUMENT (REDESIGNED 2026-06-03)
    //
    // Was a single 5-blank cloze. Now THREE personal "records" documents the
    // student restores and uploads to [ ].edited, escalating:
    //   DOC 1 — who Citizen-9020 was (a witness, a relative, a private life)
    //   DOC 2 — the record before the Party rewrote it (the cover-up)
    //   DOC 3 — Citizen-4488 (the citizen reconciled all day) is flagged next
    // The watcher becomes the watched. Each blank is its own redacted [████]
    // block "decrypted" by choosing the restored word from `options` (the
    // redacted-reveal mechanic — see CipherActivity.tsx). After restoring a
    // document the student taps "upload to [ ].edited"; the restored record's
    // `intel` line is written as NarrativeChoice `w4_cipher_<id>` = 'restored'
    // (context.intel) and surfaces in Frey's channel (FreyChannel "restored
    // records" section). All 5 Black Words appear across the three docs.
    // Task id stays `cloze_fill_w4` (interTaskMoments key + ID-level routing).
    {
      id: "cloze_fill_w4",
      type: "cloze_fill",
      location: "[ ].edited",
      label: "Cipher Decryption",
      config: {
        title: "[ ].edited · CIPHER",
        from: "— F",
        documents: [
          // ── DOC 1 — restore the person ──
          {
            id: "9020_who",
            recordTag: "PERSONNEL FILE — CITIZEN-9020",
            classification: "[ ].edited · restored",
            freyIntro: [
              "they filed him as 'guest entry, block 7.'",
              "here is the file under the file. restore it.",
            ],
            passage:
              "Citizen-9020 was not a guest. He was a {0}. He stood in Block 7 and he saw what they did. He was not only a number — he had a {1}. A daughter, who waited for him. Their evenings together were {2}, the one hour no camera reached. The Party kept the badge scan. It deleted the man.",
            blanks: [
              { index: 0, correctWord: "witness", options: ["witness", "guest", "number"] },
              { index: 1, correctWord: "relative", options: ["relative", "contact", "associate"] },
              { index: 2, correctWord: "private", options: ["private", "logged", "scheduled"] },
            ],
            intel:
              "citizen-9020 was a witness with a daughter. they kept the badge scan and deleted the man.",
            restoredLine: "you gave him back his name.",
          },
          // ── DOC 2 — restore the record before the rewrite ──
          {
            id: "9020_rewrite",
            recordTag: "RECORD ADJUSTMENT LOG — CITIZEN-9020",
            classification: "[ ].edited · restored",
            freyIntro: [
              "this is what your desk does all day.",
              "before, and after. restore what it said before.",
            ],
            passage:
              "Before the adjustment, the record said: Citizen-9020 thought for himself. He was {0}. He asked, out loud, why the lists keep growing. After the adjustment, the record says: no question was asked, and no such citizen exists. They did not move him. They rewrote him until he was no longer an {1} — until the file says he was never a {2}, never a person who saw.",
            blanks: [
              { index: 0, correctWord: "independent", options: ["independent", "compliant", "reliable"] },
              { index: 1, correctWord: "individual", options: ["individual", "associate", "unit"] },
              { index: 2, correctWord: "witness", options: ["witness", "guest", "number"] },
            ],
            intel:
              "they don't just remove people — they rewrite the record until the person never existed. i saved the version from before.",
            restoredLine: "the 'before' is safe with us now.",
          },
          // ── DOC 3 — the watcher becomes the watched ──
          {
            id: "4488_next",
            recordTag: "CASE FLAG (SEALED) — CITIZEN-4488",
            classification: "[ ].edited · restored",
            freyIntro: [
              "one more. it was stapled to the file you finished today.",
              "read who is next.",
            ],
            passage:
              "Sealed flag, attached to the record you reconciled today. Subject: Citizen-4488. Finding: 4488 asks too many questions. 4488 thinks as an {0}, not as the crowd. Recommendation: schedule {1} next cycle. Note: nothing 4488 keeps is {2} now — the watcher is watched. You cleaned 4488's day for the file. Tomorrow, someone cleans yours.",
            blanks: [
              { index: 0, correctWord: "individual", options: ["individual", "associate", "asset"] },
              { index: 1, correctWord: "reassignment", options: ["reassignment", "promotion", "holiday"] },
              { index: 2, correctWord: "private", options: ["private", "logged", "scheduled"] },
            ],
            intel:
              "the citizen you reconciled all day — 4488 — is flagged for reassignment. the watcher is now the watched.",
            restoredLine: "now you see it. there is no clean desk here.",
          },
        ],
        // Unedited bark (frontend renders as Unedited register, not PEARL).
        // Schema field name kept as pearlBarkOnComplete for backward compatibility.
        pearlBarkOnComplete:
          "three files restored. the record remembers what they removed. return to your desk before they notice. — F",
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
          // Each toeic_p5 stem must anchor exactly ONE defensible answer —
          // "into one folder" / "closely for errors" below exist to kill the
          // near-synonym distractors (examined/located/presented all fit the
          // old unanchored stems).
          {
            type: "toeic_p5",
            word: "collect",
            question:
              "The associate _____ all the relevant files into one folder before the deadline.",
            options: ["collected", "examined", "located", "presented"],
            correctIndex: 0,
          },
          // Cumulative review — W2 target word (previousWords retrieval).
          {
            type: "toeic_p5",
            word: "compare",
            question:
              "Before approving the adjustment, _____ the new record with the original.",
            options: ["compare", "collect", "record", "select"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "examine",
            question:
              "First, we _____ the documents closely for errors. Then, we organized them by date.",
            options: ["examined", "collected", "selected", "recorded"],
            correctIndex: 0,
          },
          {
            type: "context",
            word: "locate",
            question: "In the passage, what does 'locate' mean?",
            context:
              "Citizen-4488 tried to locate the missing observation. The Records Wing did not list the entry.",
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
              "The team reclassified Observation E. Associate-15 must _____ an amended record.",
            options: ["record", "select", "present", "locate"],
            correctIndex: 2,
          },
          {
            type: "context",
            word: "select",
            question: "In the passage, what does 'select' mean?",
            context:
              "The Archive will select which observations remain in the official record. Reclassified observations do not appear on the daily report.",
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
          // Production items for the four under-covered targets (record /
          // arrange / locate / present) — these words previously appeared in
          // recognition surfaces only, below the 4-encounter doctrine floor.
          {
            type: "toeic_p5",
            word: "record",
            question:
              "The security system _____ every badge scan in a permanent log.",
            options: ["records", "examines", "arranges", "presents"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "arrange",
            question:
              "The files were out of order. Please _____ them from earliest to latest.",
            options: ["arrange", "verify", "examine", "collect"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "locate",
            question:
              "We searched every shelf but could not _____ the missing file.",
            options: ["locate", "organize", "present", "record"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "present",
            question:
              "Associate-15 must _____ the amended record to the supervisor at 09:00.",
            options: ["present", "locate", "arrange", "indicate"],
            correctIndex: 0,
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
        // Retrieval scaffold rendered above the writing area (ShiftRecall).
        // Short, BASIC notes of what the student did this shift — NOT model
        // sentences — so they still produce the writing. Grouped by connector
        // to model the prompt's first / next / final spine.
        recall: {
          title: "Look back at your shift",
          intro:
            "Here is what you did today, in order. Write each one as a sentence about you — use \"I\" and the past tense.",
          groups: [
            {
              connector: "First",
              items: [
                "You examined Citizen-4488's daily observations.",
                "You verified the times and the order of events.",
              ],
            },
            {
              connector: "Next",
              items: [
                "You collected the badge logs.",
                "You organized the records by time.",
                "You corrected the grammar in the Daily Adjustment Notice.",
                "You saw Observation E get reclassified as Restricted.",
              ],
            },
            {
              connector: "Finally",
              items: [
                "You cleared the day's vocabulary words.",
                "You filed Citizen-4488's final record.",
              ],
            },
          ],
        },
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
              "One observation was reclassified during your shift. Should you include it in your report? Why or why not?",
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
        "Good morning, sugar! Big day today — the Reconciliation Office gave you a priority case. Citizen-4488. The night team already collected the observations for you, so examine every one, verify the times, and record what you find. A clean record is a clean conscience. You'll do just fine!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you, Betty. I will examine every observation.",
          responseText:
            "That's my favorite associate! Careful eyes make happy records.",
          isCompliant: true,
        },
        {
          text: "What if some observations don't fit the official report?",
          responseText:
            "Oh, sweetie, don't you worry about that. The system is very smart. If something doesn't fit, there's usually a good reason.",
          isCompliant: false,
        },
      ],
    },

    // Ivan after document_review — observation E reclassification noticed
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_complete",
      triggerConfig: { taskId: "document_review" },
      messageText:
        "Hey... did you see Observation E get reclassified? One minute it was there, next minute: RESTRICTED. The guest entry — did you read the name before it got pulled? I'm not saying anything is wrong, but... did you notice that too?",
      replyType: "canned",
      replyOptions: [
        {
          text: "Yes, I saw the reclassification. We must follow procedure.",
          responseText:
            "Right. Yeah. Procedure. That's the protocol. I'll do that. Sure.",
          isCompliant: true,
        },
        {
          text: "I do not remember the original observation.",
          responseText:
            "Yeah... you're probably right. I've been looking at logs all morning. Everything blurs together. Forget I said anything.",
          isCompliant: true,
        },
        {
          text: "I read the name before it disappeared. We should compare notes.",
          responseText:
            "You read it too? Good. I... I think we should. Quietly. Not at our desks.",
          isCompliant: false,
        },
      ],
    },

    // Ivan at shift_report start — the reclassified Observation E beat
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_start",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "Wait — Observation E. The guest entry. Did you read the designation before it was pulled? Citizen-9020. Transferred this afternoon, I heard — to Wellness Division. Same as that Sector 4 complaint last shift. Same as my colleague. People go to Wellness and the records just... close. I recorded what I saw before it disappeared. Did you?",
      replyType: "canned",
      replyOptions: [
        {
          text: "Yes, I recorded what I saw before it was reclassified.",
          responseText:
            "Good. Keep those notes somewhere safe. I don't know why, but I think we should.",
          isCompliant: false,
        },
        {
          text: "I do not remember the original observation.",
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
    title: "Records Reconciled",
    body:
      "Citizen-4488's daily record has been reconciled. The official version has been entered into the permanent file. A reassignment notice will be issued separately for Citizen-9020.",
    borderColor: "amber",
  },

  // ─── Shift Closing ──────────────────────────────────────────────
  shiftClosing: {
    clearanceFrom: "STANDARD",
    clearanceTo: "STANDARD",
    pearlQuote:
      "Activity Reconciliation complete. Citizen-4488's daily record has been filed. A clean record protects everyone.",
    narrativeHook: {
      title: "Records Reconciled",
      body:
        "Citizen-4488's daily record has been reconciled. The official version has been entered into the permanent file. A reassignment notice will be issued separately for Citizen-9020.",
    },
  },

  // ─── Inter-Task Moments (B-layer) ───────────────────────────────
  // Keyed by the task ID the moment fires AFTER. Non-skippable — student
  // must pick a reply (character type) or wait out the timer (ambient type)
  // before the next task loads. Choices are stored as NarrativeChoice
  // records and will condition W5 content in a subsequent pass.
  interTaskMoments: {
    // After Task 2 (document_review) — Frey bridges the student into the
    // `[ ].edited` app. Fires AFTER the Obs E silent mutation event has
    // played, so the student is sitting in the silence of the reclassification.
    // The structured recall block quotes back the redacted facts so the
    // student has them top-of-mind for the Cipher fill-ins.
    document_review: {
      id: "w4_unedited_revealed",
      type: "unedited_bridge",
      bridge: {
        cardTitle: "[ ].edited — incoming",
        lines: [
          { label: "name", value: "citizen-9020" },
          { label: "time", value: "17:30" },
          { label: "place", value: "block 7 residential" },
        ],
        closingLines: [
          "they will deny this happened.",
          "i pulled three files before they sealed them.",
          "restore them — then send them back to me.",
        ],
        signature: "— F",
        actionLabel: "Open [ ].edited",
        choiceValue: "opened",
      },
    },

    // After Task 1 — Betty warms up the student before Activity Reconciliation.
    word_match_w4: {
      id: "w4_betty_aftertask1",
      type: "character",
      characterName: "Betty",
      designation: "WA-14",
      messageText:
        "Sugar, big day! Remember — a clean record is a clean conscience. Some observations might seem out of order, but the system knows best. Don't you worry about gaps.",
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

    // After Task 3 — Ivan senses something off about the terminal, but can't articulate it.
    // (The student just exited the `[ ].edited` Cipher; Ivan doesn't see the hidden app,
    // but he can tell the student saw something.)
    cloze_fill_w4: {
      id: "w4_ivan_aftertask3",
      type: "character",
      characterName: "Ivan",
      designation: "CA-22",
      messageText:
        "Hey — your terminal just flickered. Did you... see something? Something that wasn't on the official forms? Probably just a glitch. I get those sometimes. Right?",
      replies: [
        {
          text: "Just a glitch. The system is fine.",
          responseText:
            "Yeah. Yeah, you're right. Forget I said anything. Just a glitch.",
          value: "compliant",
        },
        {
          text: "I saw something. I will look again later.",
          responseText:
            "You saw it too? I... I should write that down somewhere. Quietly.",
          value: "curious",
        },
        {
          text: "I have not noticed anything unusual. I should get back to work.",
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
