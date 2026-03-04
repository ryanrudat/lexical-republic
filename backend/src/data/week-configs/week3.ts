// ─── Week 3: Priority Queue ──────────────────────────────────────
import type { WeekConfig } from './types';

export const WEEK_3_CONFIG: WeekConfig = {
  weekNumber: 3,
  grammarTarget: "modals",
  shiftType: "queue",
  targetWords: [
    "process", "complete", "review", "delay", "schedule",
    "respond", "identify", "separate", "maintain", "forward",
  ],
  previousWords: [
    "arrive", "follow", "check", "report", "submit",
    "approve", "describe", "assign", "standard", "confirm",
    "notice", "compare", "replace", "update", "request",
    "remove", "change", "include", "require", "inform",
  ],

  // ─── Tasks ──────────────────────────────────────────────────────
  tasks: [
    // 1. Priority Briefing
    {
      id: "priority_briefing",
      type: "priority_briefing",
      location: "Broadcast",
      label: "Priority Briefing",
      config: {
        cards: [
          {
            type: "queue_status",
            animation: { sequence: [3, 7, 12, 15], intervalMs: 800 },
            pearlBark: "Queue volume elevated. You must process all cases. Maintain accuracy.",
            bettyOverlay: "Don't you worry, sugar! Just take it one case at a time! You'll do great!",
          },
          {
            type: "writing",
            prompt: "Write 3 rules for how you should process cases today. Use 'should', 'must', or 'can' in each rule.",
            minWords: 30,
            lane: {
              "1": {
                minWords: 20,
                sentenceStarters: true,
                wordBankChinese: true,
                pearlHints: [
                  "Start with: 'I should review each case...'",
                  "Then: 'I must complete all...'",
                  "End with: 'I can forward cases to...'",
                ],
              },
              "2": { minWords: 30, wordListVisible: true },
              "3": {
                minWords: 40,
                requireNegative: true,
                bonusQuestion: "What should an associate NOT do when the queue is high?",
              },
            },
          },
        ],
      },
    },

    // 2. Vocabulary Clearance
    {
      id: "vocab_clearance",
      type: "vocab_clearance",
      location: "Language Lab",
      label: "Vocabulary Clearance",
      config: {
        items: [
          {
            type: "definition",
            word: "process",
            question: "Which word means 'to deal with something using an official procedure'?",
            options: ["delay", "process", "separate", "forward"],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "complete",
            question: "You must _____ all assigned documents before the end of your shift.",
            options: ["delay", "complete", "separate", "identify"],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "review",
            question: "Which word means 'to look at something again carefully'?",
            options: ["forward", "maintain", "review", "respond"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "delay",
            question: "Associates should not _____ urgent cases under any circumstances.",
            options: ["complete", "maintain", "forward", "delay"],
            correctIndex: 3,
          },
          {
            type: "definition",
            word: "schedule",
            question: "Which word means 'a plan that lists when things will happen'?",
            options: ["schedule", "process", "review", "respond"],
            correctIndex: 0,
          },
          {
            type: "toeic_p5",
            word: "respond",
            question: "All associates must _____ to citizen requests within 24 hours.",
            options: ["delay", "separate", "respond", "identify"],
            correctIndex: 2,
          },
          {
            type: "context",
            word: "identify",
            question: "In the passage, what does 'identify' mean?",
            context: "Associates must identify the priority level of each case before processing. Cases that cannot be identified should be forwarded to a supervisor.",
            options: [
              "To ignore something",
              "To recognize or determine what something is",
              "To separate into groups",
              "To delay processing",
            ],
            correctIndex: 1,
          },
          {
            type: "toeic_p5",
            word: "separate",
            question: "You should _____ urgent cases from routine cases before processing.",
            options: ["maintain", "separate", "complete", "forward"],
            correctIndex: 1,
          },
          {
            type: "definition",
            word: "maintain",
            question: "Which word means 'to keep something in good condition or at the same level'?",
            options: ["process", "delay", "maintain", "schedule"],
            correctIndex: 2,
          },
          {
            type: "toeic_p5",
            word: "forward",
            question: "If you cannot process a case, you should _____ it to your supervisor.",
            options: ["delay", "identify", "separate", "forward"],
            correctIndex: 3,
          },
        ],
      },
    },

    // 3. Priority Classification
    {
      id: "priority_sort",
      type: "priority_sort",
      location: "Evidence Desk",
      label: "Priority Classification",
      config: {
        cases: [
          {
            caseId: "case_1",
            title: "Medical Schedule Change",
            description: "A regional clinic must update its patient schedule due to a staffing change. Three patients have appointments tomorrow that need to be rescheduled. The clinic requests immediate processing.",
            correctColumn: "URGENT",
            laneHint: "medical",
          },
          {
            caseId: "case_2",
            title: "New Filing Labels",
            description: "The Records Division is ordering new filing labels for the archive room. The labels should arrive next month. No current operations are affected.",
            correctColumn: "ROUTINE",
            laneHint: "labels",
          },
          {
            caseId: "case_3",
            title: "Missing Document",
            description: "An associate in Department 7 reports that a required form is missing from the central filing system. The associate cannot complete their current assignment without this document.",
            correctColumn: "URGENT",
            laneHint: "missing",
          },
          {
            caseId: "case_4",
            title: "Quarterly Review",
            description: "The quarterly performance review for Department of Clarity is scheduled for the end of the month. All supervisors must submit evaluations by the 25th.",
            correctColumn: "ROUTINE",
            laneHint: "quarterly",
          },
          {
            caseId: "case_5",
            title: "Citizen Complaint",
            description: "Citizen-7291 submitted a complaint about missing community services. The citizen reports significant distress and requests a response from the Department. The complaint references services that were recently removed from the community schedule.",
            correctColumn: "URGENT",
            disappears: true,
            disappearBark: "Case 5 has been reassigned to Wellness Division. Do not follow up.",
          },
          {
            caseId: "case_6",
            title: "Contact Information Update",
            description: "Associate CA-45 submitted a form to update their contact information. The form notes this is not urgent and can be processed at the next available opportunity.",
            correctColumn: "HOLD",
            laneHint: "non-urgent",
          },
        ],
        modalPrompt: "For each case, write 1-2 sentences explaining your decision. Use 'should', 'must', or 'can'.",
        modalLane: {
          "1": { template: "I should forward this to {department} because..." },
          "2": {},
          "3": { requireDifferentModal: true },
        },
      },
    },

    // 4. Shift Report
    {
      id: "shift_report",
      type: "shift_report",
      location: "Filing Desk",
      label: "Shift Report",
      config: {
        prompt: "Write your shift report for today. How did you process the priority queue? What cases did you identify as urgent? What happened to Case 5? Use modals (should, must, can) in your report.",
        minWords: 50,
        lane: {
          "1": {
            minWords: 35,
            sentenceStarters: true,
            wordBankChinese: true,
            pearlHints: [
              "Start with: 'Today I must process...'",
              "Then: 'I should separate urgent cases...'",
              "End with: 'I cannot identify why Case 5...'",
            ],
            guidedQuestions: [
              "How many cases did you process today?",
              "Which cases did you identify as urgent?",
              "What happened to Case 5?",
            ],
          },
          "2": { minWords: 50, wordListVisible: true },
          "3": {
            minWords: 65,
            bonusQuestion: "A citizen complaint was reassigned to Wellness Division without explanation. Should associates be able to follow up on reassigned cases? Why or why not?",
          },
        },
      },
    },
  ],

  // ─── Character Messages ─────────────────────────────────────────
  characterMessages: [
    // Betty greets at shift start
    {
      characterName: "Betty",
      designation: "WA-14",
      triggerType: "shift_start",
      triggerConfig: {},
      messageText:
        "Good morning, sugar! Big day today \u2014 the queue is a little higher than usual, but don't you fret! Just take it one case at a time. You've been doing so well these past two shifts. I told the supervisor you're one of our best new associates!",
      replyType: "canned",
      replyOptions: [
        {
          text: "Thank you, Betty. I will maintain my accuracy.",
          responseText:
            "That's my favorite associate! Accuracy is the backbone of clarity, they always say!",
          isCompliant: true,
        },
        {
          text: "Why is the queue higher?",
          responseText:
            "Oh, you know how it is \u2014 some weeks are just busier! More citizens, more documents. It's a good sign, really! Means the system is working!",
          isCompliant: false,
        },
      ],
    },

    // Ivan after priority sort
    {
      characterName: "Ivan",
      designation: "CA-22",
      triggerType: "task_complete",
      triggerConfig: { taskId: "priority_sort" },
      messageText:
        "Hey... did your Case 5 disappear too? The citizen complaint one? Mine just... vanished from the queue. It said 'reassigned to Wellness Division.' I didn't even know we could reassign cases. Did you... did you flag it?",
      replyType: "canned",
      replyOptions: [
        {
          text: "I sorted it as urgent. Then it was reassigned. I did not question it.",
          responseText:
            "Right. Yeah. That's the right thing to do. Don't question it. I shouldn't question it either. Sorry I brought it up.",
          isCompliant: true,
        },
        {
          text: "Yes, it disappeared. That seems unusual.",
          responseText:
            "I know, right? Like... who reassigned it? We didn't. The supervisor didn't. And the citizen was distressed. Shouldn't we... I don't know. Probably nothing.",
          isCompliant: false,
        },
        {
          text: "What is the Wellness Division?",
          responseText:
            "I... actually don't know. I've never been there. I think it's where they send... people who need extra support? My old colleague mentioned it once. Before she transferred.",
          isCompliant: false,
        },
      ],
    },

    // M.K. after shift report
    {
      characterName: "M.K.",
      designation: "",
      triggerType: "task_complete",
      triggerConfig: { taskId: "shift_report" },
      messageText:
        "Three shifts in. You're starting to see the pattern.",
      replyType: "canned",
      replyOptions: [
        {
          text: "I follow the procedures. There is no pattern.",
          responseText: null,
          isCompliant: true,
        },
        {
          text: "What pattern?",
          responseText: null,
          isCompliant: false,
        },
        {
          text: "Is that a warning?",
          responseText: null,
          isCompliant: false,
        },
      ],
    },
  ],

  // ─── Citizen-4488 Post ──────────────────────────────────────────
  citizen4488Post: {
    content:
      "The community center schedule was updated again. All Tuesday and Thursday activities have been removed. I cannot identify who approved these changes. I should not delay my own schedule to ask questions. Delays cause problems for everyone.",
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
    title: "Reclassified",
    body: "Three documents from last week have been reclassified. Their timestamps no longer match your records. The filing system has no record of the originals.",
    borderColor: "amber",
  },

  // ─── Shift Closing ──────────────────────────────────────────────
  shiftClosing: {
    clearanceFrom: "PROVISIONAL",
    clearanceTo: "STANDARD",
    pearlQuote:
      "Three shifts processed. Performance has been satisfactory. Clearance level has been elevated. Elevated access brings elevated responsibility.",
    narrativeHook: {
      title: "Reclassified",
      body: "Three documents from last week have been reclassified. Their timestamps no longer match your records. The filing system has no record of the originals.",
    },
  },
};
