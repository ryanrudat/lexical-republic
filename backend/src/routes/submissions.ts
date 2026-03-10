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
          const gs = clamp(parsed.grammarScore ?? 0.5, 0, 1);
          const vs = clamp(parsed.vocabScore ?? 0.5, 0, 1);
          const ts = clamp(parsed.taskScore ?? 0.5, 0, 1);
          // Pass if average score >= 0.4 (lenient for A2-B1 learners)
          const avg = (gs + vs + ts) / 3;
          aiResult = {
            passed: avg >= 0.4,
            grammarScore: gs,
            grammarNotes: Array.isArray(parsed.grammarNotes) ? parsed.grammarNotes : [],
            vocabScore: vs,
            vocabUsed,
            vocabMissed,
            taskScore: ts,
            taskNotes: parsed.taskNotes || '',
            pearlFeedback: parsed.pearlFeedback || 'Your submission has been received and filed.',
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
        const progress = await prisma.pairDictionaryProgress.upsert({
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
          await prisma.pairDictionaryProgress.update({
            where: { id: progress.id },
            data: { mastery: Math.min(1.0, progress.mastery + 0.1) },
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
  totalVocab: number,
  content: string,
): EvaluationResult {
  const coherence = checkCoherence(content);
  const vocabScore = totalVocab > 0 ? vocabUsed.length / totalVocab : 0.5;
  const passed = coherence.passed && vocabScore >= 0.3;

  return {
    passed,
    grammarScore: coherence.score,
    grammarNotes: coherence.notes,
    vocabScore,
    vocabUsed,
    vocabMissed,
    taskScore: passed ? 0.5 : 0.2,
    taskNotes: '',
    pearlFeedback: passed
      ? `Your submission has been received and filed. Vocabulary compliance: ${vocabUsed.length} of ${totalVocab} terms detected. Processing complete.`
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
      feedback: 'The Ministry requires complete, multi-sentence responses. Rewrite your submission with proper sentence structure.',
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
        feedback: `Repetitive language detected. The Ministry does not accept filler text. Revise your submission with varied vocabulary.`,
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
      feedback: 'Your submission does not meet Ministry language standards. Write complete English sentences.',
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
        feedback: 'Language variation insufficient. Expand your vocabulary usage and avoid repetitive phrasing.',
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
      feedback: 'Several sentences lack proper structure. Each sentence must begin with a capital letter and contain at least a subject and verb.',
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
  metadata?: { grammarTarget?: string; targetVocab?: string[]; lane?: number }
): string {
  return `You are PEARL (Programmatic Educational Assistant for Regulated Language), an AI overseer in a dystopian bureaucratic world called the Lexicon Republic. You evaluate student language submissions with precision and in-character feedback.

CONTEXT:
- Week ${weekNumber} of 18
- Activity type: ${activityType}
- Grammar target: ${metadata?.grammarTarget || 'general accuracy'}
- Student lane (1=support, 2=standard, 3=challenge): ${metadata?.lane || 2}

EVALUATION CRITERIA:
1. Grammar (0.0-1.0): Focus on the week's grammar target. For A2-B1 learners, reward correct usage rather than penalizing minor errors. Score below 0.3 if sentences are grammatically broken or nonsensical.
2. Vocabulary (0.0-1.0): Check target vocabulary usage IN MEANINGFUL CONTEXT (not just presence). Simply listing words or inserting them into nonsense sentences should score below 0.2. Higher score for natural, varied integration of more target words.
3. Task completion (0.0-1.0): The student is asked to write 3-5 sentences using as many target words as possible. Score based on: (a) sentence count — at least 3 sentences required, (b) number of distinct target words used naturally in sentences, (c) coherent English writing (not word salad). Score 0.0-0.2 for gibberish or fewer than 2 sentences. Score 0.3-0.5 for 2-3 sentences with few target words. Score 0.6+ for 3-5 coherent sentences with good target word coverage.

IMPORTANT: Do NOT be lenient with nonsensical, random, or clearly non-effort submissions. A student who writes word salad or gibberish incorporating target words should receive scores below 0.3 across all criteria.

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
