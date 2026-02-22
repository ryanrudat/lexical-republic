import OpenAI from 'openai';

// Shared OpenAI client — lazy init so the app boots even without keys
let openai: OpenAI | null = null;

/** Default model for all AI calls (barks, grammar check) */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

export function getOpenAI(): OpenAI | null {
  if (openai) return openai;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return null;

  openai = new OpenAI({ apiKey });
  return openai;
}
