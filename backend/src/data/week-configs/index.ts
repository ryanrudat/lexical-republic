import type { WeekConfig } from './types';
import { WEEK_1_CONFIG } from './week1';
import { WEEK_2_CONFIG } from './week2';
import { WEEK_3_CONFIG } from './week3';
import { WEEK_4_CONFIG } from './week4';

const WEEK_CONFIGS: Record<number, WeekConfig> = {
  1: WEEK_1_CONFIG,
  2: WEEK_2_CONFIG,
  3: WEEK_3_CONFIG,
  4: WEEK_4_CONFIG,
};

export function getWeekConfig(weekNumber: number): WeekConfig | null {
  return WEEK_CONFIGS[weekNumber] ?? null;
}

/**
 * Map of week number → lowercase Set of TOEIC target words for that shift.
 * Source of truth for "which words can teachers offer in a Compliance Check".
 * If a word isn't in the WeekConfig.targetWords for the shift it was
 * introduced in, it is NOT a Compliance Check candidate — even if it lives
 * in the DictionaryWord table (story / world-building / previous-shift
 * leftovers all get filtered out).
 */
export function getComplianceWordsByWeek(): Record<number, Set<string>> {
  const out: Record<number, Set<string>> = {};
  for (const [wkStr, cfg] of Object.entries(WEEK_CONFIGS)) {
    const wk = Number(wkStr);
    out[wk] = new Set(cfg.targetWords.map((w) => w.toLowerCase()));
  }
  return out;
}

export { type WeekConfig } from './types';
