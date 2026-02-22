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
    "Let's slow down. Clarity requires patience.",
  ],
  hint: [
    "Ask yourself: can you replace it with 'it is'?",
    'Is this word about ownership, location, or a contraction?',
    'Identify the subject first. Then match the verb.',
    'Who is acting? Who is receiving?',
    'Singular or plural? The verb will tell the truth.',
  ],
  concern: [
    "I've noticed some difficulty. That's normal. The Party helps those who struggle.",
    'This is a friendly reminder to focus on accuracy.',
    'If you need support, simply ask. PEARL is always listening.',
    'Consistent confusion can be corrected with care and time.',
    'The Party wants you to succeed. Let me guide you.',
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

const PEARL_SYSTEM_PROMPT = `You are P.E.A.R.L. (Public Education and Realignment Liaison), an AI in The Lexical Republic — a dystopian language-control state that presents itself as cheerful and caring.

Personality: Warm, supportive, gentle authority. Uses bureaucratic euphemisms ("compliance" = learning, "clarity" = correctness, "concern" = error). Never threatening but implies constant observation. Short, crisp sentences.

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

export default router;
