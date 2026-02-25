import { Router, Request, Response } from 'express';
import { authenticate, requirePair, getPairId } from '../middleware/auth';
import prisma from '../utils/prisma';
import { getOpenAI, OPENAI_MODEL } from '../utils/openai';

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
  };
}

interface EvaluationResult {
  passed: boolean;
  grammarScore: number;
  grammarNotes: string[];
  vocabScore: number;
  vocabUsed: string[];
  vocabMissed: string[];
  taskScore: number;
  taskNotes: string;
  pearlFeedback: string;
  concernScoreChange: number;
  isDegraded: boolean;
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

    // Minimum word count check
    const minWordCount = activityType === 'd5_audio_log' ? 15 : 30;
    if (wordCount < minWordCount) {
      res.json({
        passed: false,
        reason: `Minimum ${minWordCount} words required. Current: ${wordCount}.`,
        pearlFeedback: `Your submission requires more detail, Citizen. The Ministry expects at least ${minWordCount} words.`,
      } as Partial<EvaluationResult> & { reason: string });
      return;
    }

    // Vocab usage check (case-insensitive string matching)
    const contentLower = content.toLowerCase();
    const vocabUsed = targetVocab.filter((v) =>
      contentLower.includes(v.toLowerCase())
    );
    const vocabMissed = targetVocab.filter(
      (v) => !contentLower.includes(v.toLowerCase())
    );

    const minVocabRequired = Math.max(1, Math.floor(targetVocab.length * 0.3));
    if (targetVocab.length > 0 && vocabUsed.length < minVocabRequired) {
      res.json({
        passed: false,
        reason: `Use at least ${minVocabRequired} target vocabulary words. Found: ${vocabUsed.length}.`,
        pearlFeedback: `Vocabulary compliance insufficient. ${vocabUsed.length} of ${targetVocab.length} target terms detected. Review your assigned vocabulary.`,
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
        const userMessage = `Student submission (${activityType}, Week ${weekNumber}):\n\n${content}\n\nTarget vocabulary: ${targetVocab.join(', ')}\nVocabulary used: ${vocabUsed.join(', ')}\nVocabulary missed: ${vocabMissed.join(', ')}`;

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
          aiResult = {
            passed: true,
            grammarScore: clamp(parsed.grammarScore ?? 0.5, 0, 1),
            grammarNotes: Array.isArray(parsed.grammarNotes) ? parsed.grammarNotes : [],
            vocabScore: clamp(parsed.vocabScore ?? 0.5, 0, 1),
            vocabUsed,
            vocabMissed,
            taskScore: clamp(parsed.taskScore ?? 0.5, 0, 1),
            taskNotes: parsed.taskNotes || '',
            pearlFeedback: parsed.pearlFeedback || 'Your submission has been received and filed.',
            concernScoreChange: 0,
            isDegraded: false,
          };
        } else {
          aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length);
        }
      } catch (err) {
        console.error('AI evaluation error (fail-open):', err);
        aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length);
      }
    } else {
      aiResult = buildFallbackResult(vocabUsed, vocabMissed, targetVocab.length);
    }

    // ─── Store results ───
    // Save score if we have a missionId
    if (metadata?.missionId) {
      await prisma.missionScore.upsert({
        where: { pairId_missionId: { pairId, missionId: metadata.missionId } },
        update: {
          score: (aiResult.grammarScore + aiResult.vocabScore + aiResult.taskScore) / 3,
          details: {
            grammarScore: aiResult.grammarScore,
            grammarNotes: aiResult.grammarNotes,
            vocabScore: aiResult.vocabScore,
            vocabUsed: aiResult.vocabUsed,
            vocabMissed: aiResult.vocabMissed,
            taskScore: aiResult.taskScore,
            taskNotes: aiResult.taskNotes,
            isDegraded: aiResult.isDegraded,
          },
        },
        create: {
          pairId,
          missionId: metadata.missionId,
          score: (aiResult.grammarScore + aiResult.vocabScore + aiResult.taskScore) / 3,
          details: {
            grammarScore: aiResult.grammarScore,
            grammarNotes: aiResult.grammarNotes,
            vocabScore: aiResult.vocabScore,
            vocabUsed: aiResult.vocabUsed,
            vocabMissed: aiResult.vocabMissed,
            taskScore: aiResult.taskScore,
            taskNotes: aiResult.taskNotes,
            isDegraded: aiResult.isDegraded,
          },
        },
      });
    }

    // Track vocabulary encounters for used words
    if (vocabUsed.length > 0) {
      const dictWords = await prisma.dictionaryWord.findMany({
        where: { word: { in: vocabUsed.map((v) => v.toLowerCase()) } },
        select: { id: true },
      });
      for (const dw of dictWords) {
        const existing = await prisma.pairDictionaryProgress.findUnique({
          where: { pairId_wordId: { pairId, wordId: dw.id } },
        });
        if (existing) {
          await prisma.pairDictionaryProgress.update({
            where: { id: existing.id },
            data: {
              encounters: existing.encounters + 1,
              mastery: Math.min(1.0, existing.mastery + 0.1),
              lastSeenAt: new Date(),
            },
          });
        } else {
          await prisma.pairDictionaryProgress.create({
            data: {
              pairId,
              wordId: dw.id,
              encounters: 1,
              mastery: 0.1,
              lastSeenAt: new Date(),
            },
          });
        }
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
  totalVocab: number
): EvaluationResult {
  return {
    passed: true,
    grammarScore: 0.5,
    grammarNotes: [],
    vocabScore: totalVocab > 0 ? vocabUsed.length / totalVocab : 0.5,
    vocabUsed,
    vocabMissed,
    taskScore: 0.5,
    taskNotes: '',
    pearlFeedback: `Your submission has been received and filed. Vocabulary compliance: ${vocabUsed.length} of ${totalVocab} terms detected. Processing complete.`,
    concernScoreChange: 0,
    isDegraded: true,
  };
}

function buildEvaluationPrompt(
  weekNumber: number,
  activityType: string,
  metadata?: { grammarTarget?: string; targetVocab?: string[]; lane?: number }
): string {
  return `You are PEARL (Programmatic Educational Assistant for Regulated Language), an AI overseer in a dystopian bureaucratic world called the Lexicon Republic. You evaluate student language submissions with precision and in-character feedback.

CONTEXT:
- Week ${weekNumber} of 18
- Activity type: ${activityType}
- Grammar target: ${metadata?.grammarTarget || 'general accuracy'}
- Student lane (1=support, 2=standard, 3=challenge): ${metadata?.lane || 2}

EVALUATION CRITERIA:
1. Grammar (0.0-1.0): Focus on the week's grammar target. For A2-B1 learners, reward correct usage rather than penalizing minor errors.
2. Vocabulary (0.0-1.0): Check target vocabulary usage in context (not just presence). Higher score for natural integration.
3. Task completion (0.0-1.0): Did the student address the prompt requirements fully?

RESPONSE FORMAT (JSON):
{
  "grammarScore": 0.0-1.0,
  "grammarNotes": ["specific observation about grammar usage"],
  "vocabScore": 0.0-1.0,
  "taskScore": 0.0-1.0,
  "taskNotes": "brief task completion assessment",
  "pearlFeedback": "In-character PEARL response. Ministry-bureaucratic tone. Reference vocabulary compliance as a metric. Never use grades or percentages — use Ministry language like 'detected', 'filed', 'compliance level'. 2-3 sentences max."
}

Be encouraging but maintain the dystopian bureaucratic tone. Students are A2-B1 level Taiwanese Grade 10 learners.`;
}

export default router;
