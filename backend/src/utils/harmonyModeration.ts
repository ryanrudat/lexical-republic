import { getOpenAI, OPENAI_MODEL } from './openai';
import { getWeekConfig } from '../data/week-configs';

export type ModerationVerdict = 'approved' | 'flagged';

export interface ModerationResult {
  verdict: ModerationVerdict;
  reason: string | null;
  pearlNote: string;
}

/** Keep this list short and obvious — a pre-filter before the AI call. */
const BANNED_PHRASES: string[] = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
];

function bannedPhraseHit(content: string): string | null {
  const lowered = content.toLowerCase();
  for (const p of BANNED_PHRASES) {
    if (lowered.includes(p)) return p;
  }
  return null;
}

function approvedFallback(): ModerationResult {
  return {
    verdict: 'approved',
    reason: null,
    pearlNote: 'Content reviewed and approved by the Ministry.',
  };
}

/**
 * Moderate a citizen's post against Party content rules.
 * Uses OpenAI to judge: English, tone, target vocabulary use, absence of dissent/off-topic.
 * On OpenAI failure or missing API key, defaults to approved (permissive fallback).
 */
export async function moderatePost(
  content: string,
  weekNumber: number,
): Promise<ModerationResult> {
  const trimmed = content.trim();
  if (trimmed.length === 0) return approvedFallback();

  // Cheap pre-filter for obvious profanity
  const banned = bannedPhraseHit(trimmed);
  if (banned) {
    return {
      verdict: 'flagged',
      reason: `contains prohibited language`,
      pearlNote:
        'Your communication contains language not approved for the public channel. Please revise and resubmit within standard parameters.',
    };
  }

  const openai = getOpenAI();
  if (!openai) return approvedFallback();

  const config = getWeekConfig(weekNumber);
  const targetWords = config?.targetWords ?? [];

  const prompt = `You are a content moderator for "Harmony," a state-controlled community feed in a dystopian ESL learning game for Taiwanese Grade 10 A2-B1 students. Your job is to enforce Party communication standards.

Current week target vocabulary: ${targetWords.join(', ') || '(none defined)'}

Evaluate this citizen post:
"""
${trimmed.slice(0, 400)}
"""

Return JSON matching this shape exactly:
{
  "verdict": "approved" | "flagged",
  "reason": string (short, internal — why flagged, or empty if approved),
  "pearlNote": string (an in-character message from PEARL — the Party's AI assistant — that the citizen will see. Dystopian "forced happy" tone: polite, firm, never cruel.)
}

Criteria for APPROVAL (all must be true):
- Written in English (not Chinese or other languages)
- Uses at least one of the target vocabulary words (or a close inflection)
- Tone is neutral, cheerful, compliant — no overt dissent or anti-Party sentiment
- On-topic for a community feed: daily life, work, food, hobbies, minor observations
- At least 8 words long

Criteria for FLAGGING (flag if any are true):
- Not in English
- Contains no target vocabulary words at all
- Expresses dissent, rebellion, anti-Party, or politically charged sentiment
- Off-topic (gibberish, spam, pure keyboard mashing)
- Too short or not a coherent sentence

pearlNote guidelines (stay in character):
- Approved example: "Content reviewed and approved by the Ministry."
- Approved variant: "Your communication meets Ministry standards, Citizen. Noted."
- Flagged (no target word): "Your communication did not reference this week's approved vocabulary. Please revise and resubmit."
- Flagged (dissent): "This submission requires clarification. Please restate your report within standard parameters."
- Flagged (not English): "All communications on the public channel must be submitted in the approved language. Please resubmit in English."
- Flagged (too short / gibberish): "Your submission is incomplete. A community report should be a full thought, Citizen."

Return ONLY the JSON object, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return approvedFallback();

    const parsed = JSON.parse(raw) as Partial<ModerationResult>;
    const verdict: ModerationVerdict = parsed.verdict === 'flagged' ? 'flagged' : 'approved';
    const pearlNote =
      typeof parsed.pearlNote === 'string' && parsed.pearlNote.trim().length > 0
        ? parsed.pearlNote.trim().slice(0, 280)
        : verdict === 'approved'
          ? 'Content reviewed and approved by the Ministry.'
          : 'Your submission requires revision. Please resubmit within standard parameters.';
    const reason =
      typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
        ? parsed.reason.trim().slice(0, 120)
        : null;

    return { verdict, reason, pearlNote };
  } catch (err) {
    console.error('Harmony moderation (OpenAI) failed, defaulting to approved:', err);
    return approvedFallback();
  }
}
