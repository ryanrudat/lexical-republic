import { Router, Request, Response } from 'express';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import { getOpenAI, OPENAI_MODEL } from '../utils/openai';
import prisma from '../utils/prisma';

const router = Router();
router.use(authenticate);

// ---------------------------------------------------------------------------
// PEARL in-character feedback system prompt
// ---------------------------------------------------------------------------

const PEARL_FEEDBACK_SYSTEM_PROMPT = `You are PEARL, an AI overseer in a dystopian government system. Respond to this citizen's written work in 1-2 sentences (max 200 characters).

Comment on the reasoning or decision-making demonstrated — NOT grammar, vocabulary, or writing quality.

Tone: procedural, authoritative, slightly unsettling. "Forced happy" dystopian — not intimidating. The Ministry presents itself as caring while signaling constant observation.

Never break character. Never mention AI, language models, or that you are evaluating. No meta-commentary.

Voice rules:
- No contractions: "do not" not "don't", "cannot" not "can't".
- Institution-as-speaker: "The Ministry notes..." not "I think...".
- Address the citizen directly when helpful ("Citizen", "your").
- Max 200 characters. 1-2 sentences.
- No emoji. No markdown. Plain text only.

Examples of tone:
- "Your classifications prioritized speed. Accuracy protects everyone, Citizen."
- "Patterns are visible to those who look. The Ministry appreciates your diligence."
- "The reasoning submitted is acceptable. Continue cultivating clarity, Citizen."
- "Your priorities reveal an orderly mind. The Party values such attention."`;

// ---------------------------------------------------------------------------
// Canned fallback lines — used on AI failure or timeout
// ---------------------------------------------------------------------------

const FEEDBACK_FALLBACKS = [
  'Submission registered, Citizen. The Ministry has noted your work.',
  'Processing complete. Continue your assigned duties.',
  'Your contribution to compliance has been catalogued.',
];

function randomFallback(): string {
  return FEEDBACK_FALLBACKS[Math.floor(Math.random() * FEEDBACK_FALLBACKS.length)];
}

// ---------------------------------------------------------------------------
// POST /api/pearl-feedback — in-character commentary on student reasoning
// ---------------------------------------------------------------------------

interface PearlFeedbackRequest {
  taskType?: string;
  taskContext?: string;
  studentText?: string;
  weekNumber?: number;
  missionId?: string;
}

// Persist the generated feedback back onto MissionScore for this pair+mission
// if a matching row exists. Fail-open: log and continue on any error so the
// student never sees a failure for a persistence issue.
async function persistFeedback(pairId: string, missionId: string, pearlFeedback: string): Promise<void> {
  try {
    await prisma.missionScore.updateMany({
      where: { pairId, missionId },
      data: { pearlFeedback },
    });
  } catch (err) {
    console.warn('[PEARL-Feedback] Failed to persist feedback:', err);
  }
}

router.post('/', requirePair, async (req: Request, res: Response) => {
  const { taskType, taskContext, studentText, weekNumber, missionId } = req.body as PearlFeedbackRequest;
  const pairId = getPairId(req);

  // Single place to send the response + opportunistically persist
  const send = async (pearlFeedback: string) => {
    if (pairId && typeof missionId === 'string' && missionId) {
      await persistFeedback(pairId, missionId, pearlFeedback);
    }
    res.json({ pearlFeedback });
  };

  // Validate — but never surface errors to frontend; fall back gracefully.
  if (!studentText || typeof studentText !== 'string' || studentText.trim().length === 0) {
    await send(randomFallback());
    return;
  }

  const client = getOpenAI();

  // Fail-open: no API key → canned fallback
  if (!client) {
    await send(randomFallback());
    return;
  }

  const contextLines: string[] = [];
  if (weekNumber) contextLines.push(`Week: ${weekNumber}`);
  if (taskType) contextLines.push(`Task type: ${taskType}`);
  if (taskContext) contextLines.push(`Task context / rubric: ${taskContext}`);

  const userPrompt = `${contextLines.join('\n')}

Student's submission:
"""
${studentText}
"""

Respond in-character with a single 1-2 sentence PEARL reaction to the CITIZEN'S REASONING or decisions demonstrated in this submission. Max 200 characters. Do not comment on grammar, vocabulary, spelling, or writing mechanics.`;

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: PEARL_FEEDBACK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 120,
      }),
      // 8-second timeout — return fallback if AI stalls
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PEARL feedback timeout')), 8000),
      ),
    ]);

    let text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty AI response');

    // Strip wrapping quotes if the model added them
    text = text.replace(/^["']+|["']+$/g, '').trim();

    // Enforce 200-char ceiling — trim mid-sentence rather than risk overflow
    if (text.length > 200) {
      text = text.slice(0, 197).trimEnd() + '...';
    }

    await send(text);
  } catch (err) {
    console.error('[PEARL-Feedback] Generation failed:', err);
    await send(randomFallback());
  }
});

export default router;
