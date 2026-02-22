import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getOpenAI, OPENAI_MODEL } from '../utils/openai';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrammarError {
  word: string;
  startIndex: number;
  endIndex: number;
  rule: string;
  suggestion: string;
  explanation: string;
}

interface GrammarCheckRequest {
  text: string;
  weekNumber?: number;
  grammarTargets?: string[];
  knownWords?: string[];
  newWords?: string[];
}

interface GrammarCheckResponse {
  errors: GrammarError[];
  errorCount: number;
  isClean: boolean;
  isDegraded: boolean;
}

// ---------------------------------------------------------------------------
// System prompt with few-shot examples for Taiwanese A2-B1 ESL learners
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  grammarTargets?: string[],
  knownWords?: string[],
  newWords?: string[],
): string {
  const targetSection = grammarTargets?.length
    ? `\nFocus especially on these grammar targets for this week: ${grammarTargets.join(', ')}.`
    : '';

  const vocabSection =
    knownWords?.length || newWords?.length
      ? `\nKnown vocabulary: ${(knownWords || []).join(', ')}.\nNew vocabulary being learned: ${(newWords || []).join(', ')}.`
      : '';

  return `You are a grammar checker for Taiwanese Grade 10 ESL students (CEFR A2-B1 level).

Your job is to identify CLEAR grammar errors in student writing. Be lenient — only flag errors that are unambiguously wrong. Do NOT flag:
- Stylistic choices or awkward but grammatically acceptable phrasing
- Minor punctuation preferences
- Vocabulary that is simple but correct
- Developmental simplifications that are acceptable at A2-B1 level

Common error patterns for Mandarin-speaking learners to watch for:
- Missing articles (a/an/the) — only flag when clearly required
- Subject-verb agreement (he go → he goes)
- Verb tense errors (Yesterday I go → Yesterday I went)
- Missing plural -s on countable nouns
- Double modals (must should, can will)
- Missing copula (He happy → He is happy)
${targetSection}${vocabSection}

Return a JSON object with this exact shape:
{
  "errors": [
    {
      "word": "the exact word or phrase that is wrong (copy from the text)",
      "rule": "short rule name like subject-verb-agreement",
      "suggestion": "the corrected word or phrase",
      "explanation": "brief, simple explanation a student can understand"
    }
  ]
}

If the text has no grammar errors, return: { "errors": [] }

IMPORTANT: The "word" field must be an EXACT substring copy from the student's text. Do not paraphrase or modify it.

Here are examples of expected behavior:

Example 1:
Student text: "William submit the report yesterday and he go home."
Expected output:
{
  "errors": [
    { "word": "submit", "rule": "past-tense", "suggestion": "submitted", "explanation": "Use past tense because this happened yesterday." },
    { "word": "go", "rule": "past-tense", "suggestion": "went", "explanation": "Use past tense to match 'yesterday'." }
  ]
}

Example 2:
Student text: "The citizen must should follow the rule carefully."
Expected output:
{
  "errors": [
    { "word": "must should", "rule": "double-modal", "suggestion": "must" or "should", "explanation": "Use only one modal verb. Say 'must follow' or 'should follow'." }
  ]
}

Example 3:
Student text: "He is happy because the report look correct."
Expected output:
{
  "errors": [
    { "word": "look", "rule": "subject-verb-agreement", "suggestion": "looks", "explanation": "The subject 'report' is singular, so use 'looks'." }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Substring-match to compute real indices (NEVER trust LLM positions)
// ---------------------------------------------------------------------------

function resolveIndices(
  text: string,
  aiErrors: Array<{ word: string; rule: string; suggestion: string; explanation: string }>,
): GrammarError[] {
  const resolved: GrammarError[] = [];
  const used = new Set<string>(); // track "word@index" to avoid duplicate spans

  for (const err of aiErrors) {
    if (!err.word || !err.rule) continue;

    // Find the word in the original text (case-insensitive search, prefer exact)
    let idx = text.indexOf(err.word);
    if (idx === -1) {
      idx = text.toLowerCase().indexOf(err.word.toLowerCase());
    }
    if (idx === -1) continue; // Drop errors we can't locate

    const key = `${err.word}@${idx}`;
    if (used.has(key)) continue;
    used.add(key);

    resolved.push({
      word: text.slice(idx, idx + err.word.length), // Use actual text slice
      startIndex: idx,
      endIndex: idx + err.word.length,
      rule: err.rule,
      suggestion: err.suggestion || '',
      explanation: err.explanation || '',
    });
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Merge overlapping spans — sort + union
// ---------------------------------------------------------------------------

function mergeOverlapping(errors: GrammarError[]): GrammarError[] {
  if (errors.length <= 1) return errors;

  const sorted = [...errors].sort((a, b) => a.startIndex - b.startIndex);
  const merged: GrammarError[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.startIndex <= prev.endIndex) {
      // Overlapping — extend the previous span
      prev.endIndex = Math.max(prev.endIndex, curr.endIndex);
      prev.word = prev.word; // Keep original word
      prev.explanation = `${prev.explanation}; ${curr.explanation}`;
      prev.suggestion = `${prev.suggestion}; ${curr.suggestion}`;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// POST /api/ai/grammar-check
// ---------------------------------------------------------------------------

router.post('/grammar-check', authenticate, async (req: Request, res: Response) => {
  const { text, weekNumber, grammarTargets, knownWords, newWords } =
    req.body as GrammarCheckRequest;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  const client = getOpenAI();

  // Fail-open: if no API keys configured, auto-approve
  if (!client) {
    console.warn('[AI] No OpenAI API key configured — auto-approving');
    const degraded: GrammarCheckResponse = {
      errors: [],
      errorCount: 0,
      isClean: true,
      isDegraded: true,
    };
    res.json(degraded);
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt(grammarTargets, knownWords, newWords);

    const completion = await Promise.race([
      client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
      // 6-second timeout
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), 6000),
      ),
    ]);

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error('Empty AI response');
    }

    const parsed = JSON.parse(raw);
    const aiErrors: Array<{
      word: string;
      rule: string;
      suggestion: string;
      explanation: string;
    }> = Array.isArray(parsed.errors) ? parsed.errors : [];

    // Resolve indices via substring match (never trust LLM positions)
    const resolved = resolveIndices(text, aiErrors);

    // Merge overlapping spans
    const errors = mergeOverlapping(resolved);

    const result: GrammarCheckResponse = {
      errors,
      errorCount: errors.length,
      isClean: errors.length === 0,
      isDegraded: false,
    };

    res.json(result);
  } catch (err) {
    // Fail-open: auto-approve on any error
    console.error('[AI] Grammar check failed (fail-open):', err);
    const degraded: GrammarCheckResponse = {
      errors: [],
      errorCount: 0,
      isClean: true,
      isDegraded: true,
    };
    res.json(degraded);
  }
});

export default router;
