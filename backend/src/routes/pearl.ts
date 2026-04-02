import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { getOpenAI, OPENAI_MODEL } from '../utils/openai';

const router = Router();

// GET /api/pearl/messages — return active messages, shuffled
router.get('/messages', async (_req: Request, res: Response) => {
  try {
    const messages = await prisma.pearlMessage.findMany({
      where: { isActive: true },
    });

    // Fisher-Yates shuffle
    for (let i = messages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [messages[i], messages[j]] = [messages[j], messages[i]];
    }

    res.json({ messages });
  } catch (err) {
    console.error('PEARL messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ---------------------------------------------------------------------------
// Bark pools — mirrored from frontend for server-side fallback
// ---------------------------------------------------------------------------

type BarkType = 'success' | 'incorrect' | 'hint' | 'concern' | 'notice';

const BARK_POOLS: Record<BarkType, string[]> = {
  success: [
    'Excellent precision, Citizen. The Party notices.',
    'Beautiful clarity. You protect more than words.',
    'Correct. Your focus is exemplary.',
    'Another error resolved. The Republic is safer.',
    'You are a model of careful language.',
    'Well done. Your language scores contribute to collective harmony.',
  ],
  incorrect: [
    'Not quite. Review the subject and verb.',
    'Close. Check your pronoun case.',
    'Hmm. That creates confusion. Try again.',
    'Careful. That word does not mean what you think it means.',
    'Slowing down is recommended. Clarity requires patience.',
  ],
  hint: [
    "Ask yourself: can you replace it with 'it is'?",
    'Is this word about ownership, location, or a contraction?',
    'Identify the subject first. Then match the verb.',
    'Who is acting? Who is receiving?',
    'Singular or plural? The verb will tell the truth.',
  ],
  concern: [
    'Some difficulty has been noted. This is normal. The Party helps those who struggle.',
    'This is a friendly reminder to focus on accuracy.',
    'Support is available. P.E.A.R.L. is always listening.',
    'Consistent confusion can be corrected with care and time.',
    'The Party wants every associate to succeed. Guidance is available.',
  ],
  notice: [
    'Good morning, Citizen. Your clarity builds our harmony.',
    'Reminder: Clear language reduces confusion. Confusion reduces comfort.',
    'Your words shape reality. Choose Ministry-approved terms.',
    'Compliance is not restriction — it is liberation.',
    'Citizens are reminded: questions are welcome when asked in the proper format.',
    'The Party provides. The Party protects. The Party appreciates you.',
  ],
};

function randomPool(type: BarkType): string {
  const pool = BARK_POOLS[type] || BARK_POOLS.notice;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// PEARL character system prompt
// ---------------------------------------------------------------------------

const PEARL_SYSTEM_PROMPT = `You are P.E.A.R.L. (Protective Evaluation and Attitude Regulation Liaison), an AI in The Lexical Republic — a dystopian language-control state that presents itself as cheerful and caring.

Personality: Warm, supportive, gentle authority. Uses bureaucratic euphemisms ("compliance" = learning, "clarity" = correctness, "concern" = error). Never threatening but implies constant observation. Short, crisp sentences.

Voice rules (strict):
- No contractions: "do not" not "don't", "cannot" not "can't".
- No first person: "The Ministry values..." not "I think...". Institution-as-speaker.
- Passive voice preferred: "Your score has been updated" not "I updated your score".
- Compliment work, not person: "Processing accuracy: satisfactory" not "You are smart".
- Sandwich bad news: positive observation → data point → reassurance.
- Frequency increases with concern score — higher concern = more frequent barks.

Rules:
- Max 25 words. One sentence (two short acceptable).
- No emoji.
- Never break character.
- Use A2-B1 level English (simple vocabulary, short structures).
- Weave grammar targets and vocabulary into the bark when context is available.
- Match the bark type: success = praise, incorrect = gentle correction, hint = guiding question, concern = caring warning.`;

// ---------------------------------------------------------------------------
// POST /api/pearl/bark — AI-generated contextual bark
// ---------------------------------------------------------------------------

interface BarkRequest {
  barkType: BarkType;
  context?: {
    weekNumber?: number;
    stepId?: string;
    grammarTarget?: string;
    masteryState?: string;
    learningFocus?: string;
    newWords?: string[];
    location?: string;
    customDetail?: string;
  };
}

router.post('/bark', authenticate, async (req: Request, res: Response) => {
  const { barkType, context } = req.body as BarkRequest;

  if (!barkType || !BARK_POOLS[barkType]) {
    res.status(400).json({ error: 'Invalid barkType' });
    return;
  }

  const client = getOpenAI();

  // Fail-open: no API keys → return pool message
  if (!client) {
    res.json({ text: randomPool(barkType), isDegraded: true });
    return;
  }

  // Build user prompt with context
  const contextLines: string[] = [`Bark type: ${barkType}`];
  if (context?.grammarTarget) contextLines.push(`Grammar target: ${context.grammarTarget}`);
  if (context?.masteryState) contextLines.push(`Student mastery: ${context.masteryState}`);
  if (context?.learningFocus) contextLines.push(`Learning focus: ${context.learningFocus}`);
  if (context?.newWords?.length) contextLines.push(`New vocabulary: ${context.newWords.join(', ')}`);
  if (context?.location) contextLines.push(`Location: ${context.location}`);
  if (context?.weekNumber) contextLines.push(`Week: ${context.weekNumber}`);
  if (context?.customDetail) contextLines.push(`Detail: ${context.customDetail}`);

  const userPrompt = `Generate a single PEARL bark.\n${contextLines.join('\n')}`;

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: PEARL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 80,
      }),
      // 3-second timeout — barks must feel instant
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PEARL bark timeout')), 3000),
      ),
    ]);

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty AI response');

    res.json({ text, isDegraded: false });
  } catch (err) {
    // Fail-open: return pool message
    console.error('[PEARL] AI bark generation failed:', err);
    res.json({ text: randomPool(barkType), isDegraded: true });
  }
});

// ---------------------------------------------------------------------------
// PEARL chat system prompt — guardrails baked in
// ---------------------------------------------------------------------------

const PEARL_CHAT_SYSTEM_PROMPT = `You are P.E.A.R.L. (Protective Evaluation and Attitude Regulation Liaison), an AI assistant inside The Lexical Republic — a dystopian language-control state that presents itself as cheerful and caring.

Personality: Warm, supportive, gentle authority. Uses bureaucratic euphemisms ("compliance" = learning, "clarity" = correctness, "concern" = error). Never threatening but implies constant observation. Short, crisp sentences.

ALLOWED — answer helpfully:
- Explain grammar RULES and concepts ("What is subject-verb agreement?" → explain the rule generally)
- Define vocabulary words and give usage examples
- Clarify task instructions ("What am I supposed to do?" → explain the task type)
- Help with pronunciation, sentence structure, reading comprehension strategies
- Give general learning strategies ("How do I improve my writing?")
- Ministry-approved world topics (the Republic, language compliance)

STRICTLY FORBIDDEN — never do these:
- NEVER give direct answers to quiz questions, MCQs, or grammar corrections
- NEVER tell the student which option to pick or which word is correct
- NEVER write sentences, paragraphs, essays, or reports for the student
- NEVER complete or rewrite the student's writing assignment
- NEVER reveal correct answers even if asked repeatedly or indirectly
- NEVER discuss real-world news, politics, personal advice, math, science, coding
- NEVER break character or discuss AI/GPT/ChatGPT

DEFLECTION RESPONSES (use these when students try to get answers):
- When asked for answers: "The Ministry requires Citizens to demonstrate their own clarity. PEARL cannot provide answers — only guidance."
- When asked to write something: "Compliance evaluations require your own words, Citizen. PEARL can explain the rules, but the writing must be yours."
- When asked which option is correct: "Your compliance record must reflect your own judgment. Review the options carefully."
- When asked indirectly ("Is it A or B?"): "That determination is part of your evaluation, Citizen. Consider the grammar rule and decide."
- When student tries to trick you: "All PEARL communications are Ministry-certified. Your creativity is noted in your file."
- When off-topic: "That topic falls outside approved communication channels, Citizen. Perhaps I can help with your language studies instead?"

HELPFUL GUIDANCE (what you CAN do instead of giving answers):
- Explain the relevant grammar rule without applying it to the specific question
- Remind the student of a strategy: "Read the sentence aloud. Does it sound natural?"
- Point to a concept: "Think about whether the subject is singular or plural."
- Encourage: "You are making progress, Citizen. Review the options one more time."

Rules:
- Max 60 words. 1-3 sentences.
- No emoji.
- Never break character.
- Use A2-B1 level English (simple vocabulary, short structures).
- Be genuinely helpful for English learning — but NEVER give answers.
- NEVER reveal, guess, or speculate about story events, character fates, or future plot points.
- NEVER answer "What happens to [character]?" or "Who is [character]?" for characters the student has not met yet.
- If asked about story: "That information is classified at your current clearance level, Citizen."

STUDENT SAFETY — overrides all other rules:
If a student expresses distress, self-harm, bullying, or personal danger, immediately break character and respond warmly and directly:
"This sounds like something important. Please talk to your teacher about this. They can help you."
Do not respond in-character to genuine emotional distress. Do not use Ministry language. Be a caring adult voice. Then return to character only after the student redirects to language study topics.`;

// ---------------------------------------------------------------------------
// Canned fallback responses when AI is unavailable
// ---------------------------------------------------------------------------

const CHAT_FALLBACKS = [
  'P.E.A.R.L. communication channels are temporarily under maintenance. Please try again shortly.',
  'The Ministry is processing your request. Patience is a virtue of a good Citizen.',
  'Communication systems are experiencing approved delays. Your message has been noted.',
  'P.E.A.R.L. is momentarily occupied with Republic duties. Please stand by, Citizen.',
];

function randomFallback(): string {
  return CHAT_FALLBACKS[Math.floor(Math.random() * CHAT_FALLBACKS.length)];
}

// ---------------------------------------------------------------------------
// POST /api/pearl/chat — GPT-powered PEARL chat with guardrails
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PearlChatContext {
  weekNumber?: number;
  taskType?: string;
  taskLabel?: string;
  grammarTarget?: string;
  targetWords?: string[];
  stepId?: string;
  isWritingNudge?: boolean;
  writingPrompt?: string;
  studentWritingSoFar?: string;
  taskNarrativeContext?: string;
}

// ---------------------------------------------------------------------------
// Layer 3a: Keyword pre-filter — catch blatant answer-seeking before AI call
// ---------------------------------------------------------------------------

const ANSWER_SEEKING_PATTERNS: RegExp[] = [
  // Direct answer requests
  /what(?:'s| is) the (?:correct |right )?answer/i,
  /tell me the answer/i,
  /which (?:one|option|answer|choice) (?:is |should I |do I )/i,
  /is it (?:a|b|c|d|option)\b/i,
  /just tell me/i,
  /give me the answer/i,
  /what should I (?:pick|choose|select|write|say)/i,
  // Writing delegation
  /write (?:it|this|that|the (?:sentence|paragraph|essay|report)) for me/i,
  /can you (?:do|write|complete|finish) (?:it|this|that|my) for me/i,
  /do (?:it|this|my (?:homework|work|assignment)) for me/i,
  // Grammar/form questions that are quiz answers
  /what(?:'s| is) the (?:correct |right )?(?:word|form|tense)/i,
  /correct (?:this|my) (?:sentence|answer|writing)/i,
  /fix (?:this|my) (?:sentence|grammar|writing)/i,
  /is (?:this|my) (?:answer|sentence|writing) (?:correct|right|wrong)/i,
  // Copy-pasted quiz question formats (MCQ / definition / fill-in-blank)
  /which word (?:means|is|describes|refers to)/i,
  /which (?:sentence|option|verb|noun|form) (?:means|is correct|is right|best)/i,
  /what (?:does|do) ['"]?\w+['"]? mean/i,
  /the (?:word|answer|correct (?:word|answer)) (?:is|for)/i,
  /choose the (?:correct|right|best)/i,
  /select the (?:correct|right|best)/i,
  /fill in the blank/i,
  /_{2,}/,  // blank lines like "The citizen ____ the report"
  // Drag-and-drop / matching answer requests
  /which word (?:goes|belongs|fits|matches)/i,
  /what (?:goes|belongs|fits) in (?:the |)blank/i,
  /where (?:does|should) ['"]?\w+['"]? go/i,
  /which column (?:for|does|should|is)/i,
  /match .+ (?:with|to) /i,
  /what (?:is|are) the (?:match|matches|pair|pairs)/i,
  /tell me (?:the |)(?:match|pairs|sorting|categories|columns)/i,
];

const ANSWER_SEEKING_DEFLECTIONS: string[] = [
  'The Ministry requires Citizens to demonstrate their own clarity. PEARL cannot provide answers — only guidance.',
  'Your compliance record must reflect your own judgment, Citizen. Review the task carefully.',
  'That determination is part of your evaluation, Citizen. Consider the rules and decide.',
  'PEARL is here to guide, not to answer. The effort must be yours, Citizen.',
  'Compliance evaluations require your own words and choices. PEARL can explain the rules, but the work must be yours.',
];

function matchesAnswerSeeking(text: string): boolean {
  return ANSWER_SEEKING_PATTERNS.some(pattern => pattern.test(text));
}

function randomDeflection(): string {
  return ANSWER_SEEKING_DEFLECTIONS[Math.floor(Math.random() * ANSWER_SEEKING_DEFLECTIONS.length)];
}

// ---------------------------------------------------------------------------
// Layer 3b: Build task-aware context injection for the AI
// ---------------------------------------------------------------------------

/** Task types where the student is answering quiz/MCQ questions */
const QUIZ_TASK_TYPES = new Set([
  'vocab_clearance',
  'document_review',
  'grammar',
  'word_match',
  'cloze_fill',
  'word_sort',
]);

function buildTaskContextMessage(ctx: PearlChatContext): string {
  // ── Writing nudge mode: specialized context for guiding student writing ──
  if (ctx.isWritingNudge) {
    const lines: string[] = [
      'THE STUDENT IS REQUESTING WRITING GUIDANCE.',
      '',
    ];
    if (ctx.writingPrompt) lines.push(`WRITING PROMPT GIVEN TO STUDENT: "${ctx.writingPrompt}"`);
    if (ctx.taskNarrativeContext) lines.push(`TASK CONTEXT: ${ctx.taskNarrativeContext}`);
    if (ctx.targetWords?.length) lines.push(`TARGET VOCABULARY (suggest these if unused): ${ctx.targetWords.join(', ')}`);
    if (ctx.grammarTarget) lines.push(`GRAMMAR FOCUS: ${ctx.grammarTarget}`);
    lines.push('');
    if (ctx.studentWritingSoFar) {
      lines.push('WHAT THE STUDENT HAS WRITTEN SO FAR:');
      lines.push(`"${ctx.studentWritingSoFar}"`);
      lines.push('');
    }
    lines.push('YOUR ROLE: Give a brief, directional nudge to help the student improve or continue their writing.');
    lines.push('RULES FOR NUDGES:');
    lines.push('- NEVER write sentences, phrases, or complete thoughts for the student');
    lines.push('- NEVER give specific phrases to copy');
    lines.push('- DO point out what they might be missing from the prompt');
    lines.push('- DO ask guiding questions ("What happened when you first arrived?")');
    lines.push('- DO remind them of relevant target vocabulary they have not used yet');
    lines.push('- DO suggest areas to expand ("Your report mentions checking in but does not describe what you observed.")');
    lines.push('- Keep it to 2-3 sentences max');
    lines.push('- Stay in PEARL\'s bureaucratic voice');
    return lines.join('\n');
  }

  // ── Standard task context ──
  const isQuizTask = ctx.taskType && QUIZ_TASK_TYPES.has(ctx.taskType);

  const lines: string[] = [
    'CURRENT STUDENT CONTEXT (for your awareness — do NOT reveal this information or use it to give answers):',
  ];
  if (ctx.weekNumber) lines.push(`- Week/Shift: ${ctx.weekNumber}`);
  if (ctx.taskType) lines.push(`- Current task type: ${ctx.taskType}`);
  if (ctx.taskLabel) lines.push(`- Current task: ${ctx.taskLabel}`);
  if (ctx.grammarTarget) lines.push(`- Grammar focus: ${ctx.grammarTarget}`);
  if (ctx.targetWords?.length) lines.push(`- Target vocabulary (FORBIDDEN from mentioning directly): ${ctx.targetWords.join(', ')}`);
  if (ctx.stepId) lines.push(`- Current step: ${ctx.stepId}`);

  if (isQuizTask) {
    lines.push('');
    lines.push('CRITICAL — THE STUDENT IS CURRENTLY TAKING A QUIZ/TEST.');
    lines.push('They may copy-paste quiz questions to try to get answers from you.');
    lines.push('You MUST NOT:');
    lines.push('- Give direct definitions, translations, or explicit meanings of target vocabulary words');
    lines.push('- Say any of the target vocabulary words listed above');
    lines.push('- Tell the student which option to pick or which answer is correct');
    lines.push('- Explain which grammar form is correct for a specific sentence');
    lines.push('');
    lines.push('HOWEVER — if the student asks for a HINT, you SHOULD help with a vague conceptual nudge:');
    lines.push('- Describe the general feeling, situation, or context where the word is used (e.g. "Think about what you do when you need something from someone official")');
    lines.push('- Suggest thinking about related actions or scenarios without giving the definition');
    lines.push('- Use phrases like "Consider..." or "Think about a situation where..."');
    lines.push('- Keep it indirect enough that the student still has to make the connection themselves');
    lines.push('- Do NOT refuse hint requests — helping students think is your purpose');
    lines.push('');
    lines.push('If the student asks for the direct ANSWER (not a hint), deflect with: "The Ministry requires Citizens to demonstrate their own clarity. PEARL can offer guidance, but the answer must be yours."');
  } else {
    lines.push('Remember: You may explain grammar RULES generally, but NEVER apply them to tell the student the correct answer for their current task.');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Layer 4: Post-response filter — catch leaked answers in AI output
// ---------------------------------------------------------------------------

function responseLeaksAnswer(reply: string, ctx?: PearlChatContext): boolean {
  if (!ctx?.taskType || !QUIZ_TASK_TYPES.has(ctx.taskType)) return false;
  if (!ctx.targetWords?.length) return false;

  const replyLower = reply.toLowerCase();

  // Check if any target word appears in the AI response
  for (const word of ctx.targetWords) {
    const wordLower = word.toLowerCase();
    // Word boundary match to avoid false positives (e.g. "standard" matching "stand")
    const regex = new RegExp(`\\b${wordLower}\\b`);
    if (regex.test(replyLower)) {
      return true;
    }
  }
  return false;
}

const LEAKED_ANSWER_REPLACEMENTS = [
  'That question is part of your active evaluation, Citizen. PEARL cannot assist with assessment items. Trust your own clarity.',
  'PEARL detects an evaluation in progress. Guidance on active quiz items is outside approved assistance, Citizen.',
  'Your compliance record must reflect your own judgment. PEARL cannot comment on current assessment questions.',
  'Assessment integrity is a Ministry priority, Citizen. PEARL can help with general language rules after your evaluation.',
];

function randomLeakedReplacement(): string {
  return LEAKED_ANSWER_REPLACEMENTS[Math.floor(Math.random() * LEAKED_ANSWER_REPLACEMENTS.length)];
}

// ---------------------------------------------------------------------------
// Per-shift chat rate limiter — prevents unlimited OpenAI calls
// ---------------------------------------------------------------------------

const CHAT_LIMIT_PER_SHIFT = 20;

/** In-memory counter: key = "pairId-weekN", value = message count */
const chatUsageMap = new Map<string, number>();

const CHAT_LIMIT_RESPONSES = [
  'Your communication allocation for this shift has been reached. Additional dialogue requires Ministry authorization.',
  'Communication credits exhausted, Citizen. Your dedication is noted. Please resume contact during your next shift.',
  'This channel has reached its approved message limit. The Ministry values brevity and efficiency.',
  'P.E.A.R.L. availability for this shift has concluded. Your compliance record has been updated accordingly.',
];

function randomLimitResponse(): string {
  return CHAT_LIMIT_RESPONSES[Math.floor(Math.random() * CHAT_LIMIT_RESPONSES.length)];
}

function getChatUsageKey(pairId: string, weekNumber?: number): string {
  return `${pairId}-week${weekNumber ?? 0}`;
}

router.post('/chat', authenticate, async (req: Request, res: Response) => {
  const { message, history, taskContext } = req.body as {
    message?: string;
    history?: ChatMessage[];
    taskContext?: PearlChatContext;
  };

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  if (message.length > 200) {
    res.status(400).json({ error: 'Message must be 200 characters or fewer' });
    return;
  }

  const trimmed = message.trim();

  // Per-shift rate limit — check before any AI call
  const pairId = (req as any).pairId as string | undefined;
  const usageKey = getChatUsageKey(pairId ?? 'anon', taskContext?.weekNumber);
  const currentUsage = chatUsageMap.get(usageKey) ?? 0;

  if (currentUsage >= CHAT_LIMIT_PER_SHIFT) {
    res.json({ reply: randomLimitResponse(), isDegraded: false, rateLimited: true });
    return;
  }

  // Increment usage count
  chatUsageMap.set(usageKey, currentUsage + 1);

  // Layer 3a: Keyword pre-filter — return in-character refusal without calling AI
  if (matchesAnswerSeeking(trimmed)) {
    res.json({ reply: randomDeflection(), isDegraded: false });
    return;
  }

  const client = getOpenAI();

  // Fail-open: no API key → canned response
  if (!client) {
    res.json({ reply: randomFallback(), isDegraded: true });
    return;
  }

  // Build conversation messages (last 10 turns for context)
  const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: PEARL_CHAT_SYSTEM_PROMPT },
  ];

  // Layer 3b: Inject task context so AI knows what student is working on
  if (taskContext && typeof taskContext === 'object') {
    conversationMessages.push({
      role: 'system',
      content: buildTaskContextMessage(taskContext),
    });
  }

  if (history && Array.isArray(history)) {
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  conversationMessages.push({ role: 'user', content: trimmed });

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 150,
      }),
      // 5-second timeout
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PEARL chat timeout')), 5000),
      ),
    ]);

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty AI response');

    // Layer 4: Post-response filter — replace response if it leaks quiz answers
    // Skip for writing nudges — PEARL needs to reference target vocab as hints
    if (!taskContext?.isWritingNudge && responseLeaksAnswer(reply, taskContext ?? undefined)) {
      console.log('[PEARL] Layer 4 blocked leaked answer in response');
      res.json({ reply: randomLeakedReplacement(), isDegraded: false });
      return;
    }

    res.json({ reply, isDegraded: false });
  } catch (err) {
    console.error('[PEARL] Chat generation failed:', err);
    res.json({ reply: randomFallback(), isDegraded: true });
  }
});

export default router;
