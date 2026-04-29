import { Router, Request, Response } from 'express';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getOpenAI, OPENAI_MODEL } from '../utils/openai';
import { matchesTargetWord } from '../utils/stemmer';

const router = Router();
router.use(authenticate);

interface EvaluationRequest {
  pairId?: string;
  weekNumber: number;
  phaseId: string;
  activityType: string;
  content: string;
  metadata?: {
    grammarTarget?: string;
    targetVocab?: string[];
    missionId?: string;
    lane?: number;
    writingPrompt?: string;
    taskContext?: string;
  };
}

// ─── Writing rubric (post-2026-04-29 redesign) ───
// Grammar is no longer scored on open writing. The rubric is:
//   1. on-topic veto (binary) — off-topic submissions get score 0.0
//   2. meaningful vocab use (0-1) — the score itself
// Grammar still surfaces as advisory text for teachers, never affects score.
// Why: AI grammar scoring is unstable on short A2-B1 L2 text and double-tests
// what Cloze Fill / Error Correction Doc / Word Sort already test deterministically.
interface EvaluationResult {
  passed: boolean;
  onTopic: boolean;
  onTopicReason: string;
  vocabScore: number;
  vocabUsed: string[];
  vocabMissed: string[];
  grammarAdvisory: string;
  pearlFeedback: string;
  concernScoreChange: number;
  isDegraded: boolean;
}

// Merge details JSON but protect non-empty string fields from being overwritten
// by an empty-string update. Writing tasks sometimes send writingText='' when
// state is reset or attempt-3 auto-pass fires without typed text — that should
// not wipe a writingText this endpoint already stored from a passing attempt.
function mergeDetails(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'string' && value.length === 0) {
      const existingVal = out[key];
      if (typeof existingVal === 'string' && existingVal.length > 0) {
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

// POST /api/submissions/evaluate — two-layer evaluation pipeline
router.post('/evaluate', requirePair, async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req)!;
    const body = req.body as EvaluationRequest;
    const { weekNumber, phaseId, activityType, content, metadata } = body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // ─── Layer 1: Auto-checks ───
    const targetVocab = metadata?.targetVocab || [];
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Minimum word count check — respect lane-specific minimums
    const lane = metadata?.lane ?? 2;
    const baseMin = activityType === 'd5_audio_log' ? 15 : 30;
    const minWordCount = lane === 1 ? Math.min(baseMin, 20) : lane === 3 ? baseMin + 10 : baseMin;
    if (wordCount < minWordCount) {
      res.json({
        passed: false,
        reason: `Minimum ${minWordCount} words required. Current: ${wordCount}.`,
        pearlFeedback: `Your submission requires more detail, Citizen. The Ministry expects at least ${minWordCount} words.`,
      } as Partial<EvaluationResult> & { reason: string });
      return;
    }

    // Vocab usage check via Porter stemming — "arrived" counts as "arrive", etc.
    const vocabUsed = targetVocab.filter((v) => matchesTargetWord(content, v));
    const vocabMissed = targetVocab.filter((v) => !matchesTargetWord(content, v));

    const minVocabRequired = Math.max(1, Math.floor(targetVocab.length * 0.3));
    if (targetVocab.length > 0 && vocabUsed.length < minVocabRequired) {
      res.json({
        passed: false,
        reason: `Use at least ${minVocabRequired} target vocabulary words. Found: ${vocabUsed.length}.`,
        pearlFeedback: `Vocabulary growth takes practice, Citizen. ${vocabUsed.length} of ${targetVocab.length} target terms noted. Review your assigned words and try again.`,
        vocabUsed,
        vocabMissed,
      });
      return;
    }

    // ─── Layer 2: AI Rubric Evaluation ───
    const openai = getOpenAI();
    let aiResult: EvaluationResult;

    if (openai) {
      try {
        const systemPrompt = buildEvaluationPrompt(weekNumber, activityType, metadata);
        const writingPromptLine = metadata?.writingPrompt
          ? `\nWRITING PROMPT GIVEN TO STUDENT: ${metadata.writingPrompt}\n`
          : '';
        const userMessage = `Student submission (${activityType}, Week ${weekNumber}):\n${writingPromptLine}\nSTUDENT'S WRITING:\n${content}\n\nTarget vocabulary: ${targetVocab.join(', ')}\nVocabulary used: ${vocabUsed.join(', ')}\nVocabulary missed: ${vocabMissed.join(', ')}`;

        const completion = await openai.chat.completions.create(
          {
            model: OPENAI_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 500,
          },
        );

        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          const onTopic = parsed.onTopic === true;
          const vs = clamp(parsed.vocabScore ?? 0.5, 0, 1);
          // Veto: off-topic submissions cannot pass, regardless of vocab use.
          // Pass requires both on-topic AND vocabScore >= 0.4 (lenient for A2-B1).
          aiResult = {
            passed: onTopic && vs >= 0.4,
            onTopic,
            onTopicReason: typeof parsed.onTopicReason === 'string' ? parsed.onTopicReason : '',
            vocabScore: vs,
            vocabUsed,
            vocabMissed,
            grammarAdvisory: typeof parsed.grammarAdvisory === 'string' ? parsed.grammarAdvisory : '',
            pearlFeedback: parsed.pearlFeedback || 'Your submission has been filed, Citizen. The Ministry thanks you for your contribution.',
            concernScoreChange: 0,
            isDegraded: false,
          };
        } else {
          aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length, content);
        }
      } catch (err) {
        console.error('AI evaluation error (fail-open):', err);
        aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length, content);
      }
    } else {
      aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length, content);
    }

    // ─── Store results ───
    // Save score if we have a missionId
    if (metadata?.missionId) {
      // Pin to a local const so TS narrowing survives the async transaction callback.
      const missionId: string = metadata.missionId;
      const detailsPayload = {
        // New rubric fields
        onTopic: aiResult.onTopic,
        onTopicReason: aiResult.onTopicReason,
        vocabScore: aiResult.vocabScore,
        vocabUsed: aiResult.vocabUsed,
        vocabMissed: aiResult.vocabMissed,
        grammarAdvisory: aiResult.grammarAdvisory,
        isDegraded: aiResult.isDegraded,
        // Persist writing in details so teacher review can display it even if
        // the client didn't mirror it into taskProgress details.
        writingText: content,
        pearlFeedback: aiResult.pearlFeedback,
      };
      // Off-topic submissions score 0.0 regardless of vocab use. On-topic
      // submissions score = vocabScore (the only remaining numeric axis).
      const computedScore = aiResult.onTopic ? aiResult.vocabScore : 0;

      // Merge new AI eval fields on top of whatever's stored, so we don't wipe
      // out fields that the /shifts/.../score call (or a previous attempt) put
      // there — answerLog, writingText on task-side, etc. Both endpoints write
      // to the same MissionScore row and used to race-overwrite each other.
      // mergeDetails also protects non-empty string fields from empty-string
      // overrides (e.g. writingText='' from a degraded path).
      await prisma.$transaction(async (tx) => {
        const existing = await tx.missionScore.findUnique({
          where: { pairId_missionId: { pairId, missionId } },
          select: { details: true },
        });
        const existingDetails =
          existing?.details && typeof existing.details === 'object' && !Array.isArray(existing.details)
            ? (existing.details as Record<string, unknown>)
            : {};
        const mergedDetails = mergeDetails(existingDetails, detailsPayload) as any;
        await tx.missionScore.upsert({
          where: { pairId_missionId: { pairId, missionId } },
          update: {
            score: computedScore,
            details: mergedDetails,
            pearlFeedback: aiResult.pearlFeedback,
          },
          create: {
            pairId,
            missionId,
            score: computedScore,
            details: mergedDetails,
            pearlFeedback: aiResult.pearlFeedback,
          },
        });
      });
    }

    // Track vocabulary encounters for used words
    if (vocabUsed.length > 0) {
      const dictWords = await prisma.dictionaryWord.findMany({
        where: { word: { in: vocabUsed.map((v) => v.toLowerCase()) } },
        select: { id: true },
      });
      for (const dw of dictWords) {
        await prisma.$transaction(async (tx) => {
          const progress = await tx.pairDictionaryProgress.upsert({
            where: { pairId_wordId: { pairId, wordId: dw.id } },
            update: {
              encounters: { increment: 1 },
              lastSeenAt: new Date(),
            },
            create: {
              pairId,
              wordId: dw.id,
              encounters: 1,
              mastery: 0.1,
              lastSeenAt: new Date(),
            },
          });
          // Cap mastery at 1.0 (upsert increment doesn't support clamping)
          if (progress.mastery < 1.0) {
            await tx.pairDictionaryProgress.update({
              where: { id: progress.id },
              data: { mastery: Math.min(1.0, progress.mastery + 0.1) },
            });
          }
        });
      }
    }

    res.json(aiResult);
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: 'Failed to evaluate submission' });
  }
});

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function buildFallbackResult(
  vocabUsed: string[],
  vocabMissed: string[],
  totalVocab: number,
  content: string,
): EvaluationResult {
  const coherence = checkCoherence(content);
  const vocabScore = totalVocab > 0 ? vocabUsed.length / totalVocab : 0.5;
  // Without OpenAI we cannot judge on-topic — fail open and assume on-topic
  // so the student isn't penalised for our outage. Grammar advisory text
  // falls back to the heuristic coherence note.
  const onTopic = true;
  const passed = coherence.passed && vocabScore >= 0.3;

  return {
    passed,
    onTopic,
    onTopicReason: 'Topic check unavailable — assumed on-topic.',
    vocabScore,
    vocabUsed,
    vocabMissed,
    grammarAdvisory: coherence.notes.join(' ') || '',
    pearlFeedback: passed
      ? `Your submission has been filed, Citizen. Vocabulary compliance: ${vocabUsed.length} of ${totalVocab} terms noted. Continue refining your word choices — clarity builds with care.`
      : coherence.feedback,
    concernScoreChange: 0,
    isDegraded: true,
  };
}

/**
 * Basic offline coherence check — catches word salad, gibberish, and
 * repetitive filler without requiring an AI model.
 */
function checkCoherence(content: string): {
  passed: boolean;
  score: number;
  notes: string[];
  feedback: string;
} {
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const words = content.toLowerCase().split(/\s+/).filter(Boolean);
  const notes: string[] = [];

  // 1. Must have at least 2 sentences
  if (sentences.length < 2) {
    return {
      passed: false,
      score: 0.2,
      notes: ['Submission contains fewer than 2 sentences.'],
      feedback: 'Your submission shows effort, Citizen. Clarity strengthens with more complete sentences. Review and rebuild with care.',
    };
  }

  // 2. Excessive word repetition — if any single word (excluding common ones) is >40% of total
  const commonWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not',
    'that', 'this', 'it', 'i', 'you', 'he', 'she', 'we', 'they', 'my',
    'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them',
  ]);
  const contentWords = words.filter(w => !commonWords.has(w) && w.length > 2);
  if (contentWords.length > 0) {
    const freq: Record<string, number> = {};
    for (const w of contentWords) freq[w] = (freq[w] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq / contentWords.length > 0.4) {
      const repeated = Object.entries(freq).find(([, c]) => c === maxFreq)?.[0];
      notes.push(`Excessive repetition of "${repeated}".`);
      return {
        passed: false,
        score: 0.15,
        notes,
        feedback: 'Language variety supports clarity, Citizen. Try using different phrasing to strengthen your writing.',
      };
    }
  }

  // 3. Average word length sanity — gibberish tends to have very short or very long avg
  const avgWordLen = words.reduce((sum, w) => sum + w.replace(/[^a-z]/gi, '').length, 0) / words.length;
  if (avgWordLen < 2.5) {
    notes.push('Average word length too short — possible gibberish.');
    return {
      passed: false,
      score: 0.1,
      notes,
      feedback: 'This response needs more structure, Citizen. Complete English sentences bring stronger Ministry alignment. Try again with clearer phrasing.',
    };
  }

  // 4. Unique word ratio — word salad with no repetition is fine, but
  //    having <30% unique content words suggests copy-paste filler
  if (contentWords.length >= 8) {
    const uniqueRatio = new Set(contentWords).size / contentWords.length;
    if (uniqueRatio < 0.3) {
      notes.push('Too many repeated content words.');
      return {
        passed: false,
        score: 0.2,
        notes,
        feedback: 'Language variety supports clarity, Citizen. Try different phrasing to lift your writing.',
      };
    }
  }

  // 5. Sentence structure — at least half of sentences should start with a capital letter
  //    and contain a verb-like pattern (basic subject-verb check)
  const properSentences = sentences.filter(s => /^[A-Z]/.test(s) && s.split(/\s+/).length >= 3);
  if (properSentences.length < sentences.length * 0.5) {
    notes.push('Many sentences lack proper structure.');
    return {
      passed: false,
      score: 0.25,
      notes,
      feedback: 'Your sentences need firmer shape, Citizen. Begin each with a capital letter and include a subject and verb for stronger alignment.',
    };
  }

  // Passed basic coherence
  return {
    passed: true,
    score: 0.5,
    notes,
    feedback: '',
  };
}

function buildEvaluationPrompt(
  weekNumber: number,
  activityType: string,
  metadata?: { grammarTarget?: string; targetVocab?: string[]; lane?: number; writingPrompt?: string; taskContext?: string }
): string {
  const promptSection = metadata?.writingPrompt
    ? `\nWRITING PROMPT GIVEN TO STUDENT:\n"${metadata.writingPrompt}"\n`
    : '';
  const contextSection = metadata?.taskContext
    ? `- Task context: ${metadata.taskContext}`
    : '';

  return `You are PEARL (Programmatic Educational Assistant for Regulated Language), an AI overseer in a dystopian bureaucratic world called the Lexicon Republic. You evaluate student language submissions with precision and in-character feedback.

CONTEXT:
- Week ${weekNumber} of 18
- Activity type: ${activityType}
- Grammar target (for advisory text only — DO NOT score grammar): ${metadata?.grammarTarget || 'general accuracy'}
- Student lane (1=support, 2=standard, 3=challenge): ${metadata?.lane || 2}
${contextSection}
${promptSection}
EVALUATION CRITERIA:

1. ON-TOPIC (boolean) — STRICT VETO AXIS. Does the writing address the assigned writing prompt?
   - true: The writing makes a recognizable attempt to answer the prompt, even shallowly. Partial or imperfect on-topic writing is still on-topic.
   - false: The writing is about an unrelated subject. A grammatically correct sentence using target vocabulary about an unrelated topic (e.g., bodily functions, random anecdotes, song lyrics) is OFF-TOPIC. Off-topic submissions cannot pass — be strict here.
   If no writing prompt is provided, judge against the task context. If no context either, default onTopic=true.

2. VOCABULARY (0.0-1.0) — Are target vocabulary words used in MEANINGFUL, prompt-relevant context?
   - 0.0-0.2: Words appear in nonsense or off-topic context (e.g., padding, listing)
   - 0.3-0.5: Words appear correctly but in shallow or filler-like contexts
   - 0.6-0.8: Words used naturally with reasonable accuracy
   - 0.9-1.0: Words integrated naturally with varied, accurate usage that serves the prompt

GRAMMAR (advisory text only — NEVER scored):
   Optionally include ONE short observation about grammar that the teacher may want to address. Keep it under 80 characters. Do not output a list. Do not output a number. Examples:
   - "Subject-verb agreement issue in sentence 2."
   - "Modal usage is consistent and correct."
   - "Several missing articles — typical L1 transfer."
   - "" (empty string when no advisory needed)

IMPORTANT:
- Do NOT score grammar. Grammar is observational text only.
- A grammatically perfect sentence about an unrelated topic is OFF-TOPIC. Mark onTopic=false.
- A grammatically rough but on-topic attempt is ON-TOPIC. Score on vocabulary, not grammar.
- If onTopic=false, set vocabScore=0.0 and write a PEARL feedback line that explicitly cites the topic mismatch.

RESPONSE FORMAT (JSON):
{
  "onTopic": true|false,
  "onTopicReason": "one short sentence — why on-topic or off-topic, ≤120 chars",
  "vocabScore": 0.0-1.0,
  "grammarAdvisory": "short observation for the teacher, or empty string",
  "pearlFeedback": "In-character PEARL response, 2-3 sentences max. Ministry-bureaucratic tone. If off-topic, EXPLICITLY state that the submission does not address the day's directive. Never use grades or percentages — use Ministry language like 'detected', 'filed', 'compliance level'."
}

Be encouraging but firm. Students are A2-B1 level Taiwanese Grade 10 learners.`;
}

export default router;
