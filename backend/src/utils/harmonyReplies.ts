import prisma from './prisma';
import { getOpenAI, OPENAI_MODEL } from './openai';
import { BACKGROUND_CITIZENS } from '../data/harmonyWorldBible';
import { getWeekConfig } from '../data/week-configs';
import { io } from '../socketServer';

/** Odds a student post receives any NPC replies at all. Kept < 1 so not every post gets a response. */
const REPLY_PROBABILITY = 0.6;

/** Plot-sensitive citizens whose voices must not be AI-generated (hand-authored only). */
const EXCLUDED_CITIZENS = new Set(['Citizen-4488']);

type ReplyPayload = { authorLabel: string; content: string };

/**
 * Generate 1–2 short NPC replies to a student's feed post. Fire-and-forget.
 * - Picks background citizens active for the given week.
 * - Calls OpenAI once, then staggers the inserts with setTimeout so replies arrive over time.
 * - Silent on any failure — never propagates to the caller.
 */
export function generateNpcReplies(
  parentPostId: string,
  studentContent: string,
  weekNumber: number,
  classId: string,
): void {
  // Intentionally not awaited — we return void and run fully in the background.
  void runReplies(parentPostId, studentContent, weekNumber, classId).catch((err) => {
    console.error('generateNpcReplies top-level failure:', err);
  });
}

async function runReplies(
  parentPostId: string,
  studentContent: string,
  weekNumber: number,
  classId: string,
): Promise<void> {
  if (Math.random() > REPLY_PROBABILITY) return;

  const openai = getOpenAI();
  if (!openai) return;

  const active = BACKGROUND_CITIZENS.filter(
    (c) =>
      weekNumber >= c.activeWeeks[0] &&
      weekNumber <= c.activeWeeks[1] &&
      !EXCLUDED_CITIZENS.has(c.id),
  );
  if (active.length === 0) return;

  const replyCount = Math.random() < 0.35 ? Math.min(2, active.length) : 1;
  const pool = [...active];
  const chosen: typeof active = [];
  for (let i = 0; i < replyCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]!);
  }

  const config = getWeekConfig(weekNumber);
  const targetWords = config?.targetWords ?? [];

  const prompt = `You write short replies for a government-moderated community feed in a dystopian ESL learning game. Tone is "forced happy" — cheerful on the surface, compliant, never openly critical.

Current week vocabulary focus: ${targetWords.join(', ') || '(none)'}.

Another citizen just posted:
"${studentContent.slice(0, 400)}"

Write ${chosen.length} short in-character reply/replies (40–90 characters each), one from each of these background citizens:
${chosen.map((c) => `- ${c.id} (${c.role}; ${c.trait})`).join('\n')}

Rules:
- Each reply is a normal neighbor comment: relate, agree, add a small everyday detail from their life.
- Never reference other citizens by name.
- Never voice dissent or conspiracy. Stay compliant.
- Prefer simple A2/B1 English. Use a target word naturally if it fits.

Return JSON in this exact shape: { "replies": [{ "authorLabel": "Citizen-XXXX", "content": "..." }] }`;

  let replies: ReplyPayload[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.85,
      max_tokens: 400,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return;
    const parsed = JSON.parse(raw) as { replies?: ReplyPayload[] };
    replies = Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (err) {
    console.error('NPC reply generation (OpenAI) failed:', err);
    return;
  }

  const validReplies = replies
    .filter((r) => typeof r?.authorLabel === 'string' && typeof r?.content === 'string' && r.content.trim().length > 0)
    .slice(0, 2);

  for (let i = 0; i < validReplies.length; i++) {
    const reply = validReplies[i]!;
    const delayMs = (30 + Math.random() * 120) * 1000 * (i + 1); // 30–150s, longer for later replies
    setTimeout(async () => {
      try {
        const parentStillExists = await prisma.harmonyPost.findUnique({
          where: { id: parentPostId },
          select: { id: true },
        });
        if (!parentStillExists) return;

        await prisma.harmonyPost.create({
          data: {
            authorLabel: reply.authorLabel.slice(0, 40),
            content: reply.content.trim().slice(0, 280),
            postType: 'feed',
            status: 'approved',
            parentId: parentPostId,
            classId,
            weekNumber,
            isGenerated: true,
          },
        });
        io?.to(`class:${classId}`).emit('harmony:new-content', { weekNumber, count: 1 });
      } catch (err) {
        console.error('NPC reply insert failed:', err);
      }
    }, delayMs);
  }
}
