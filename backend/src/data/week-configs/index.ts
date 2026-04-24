import type { WeekConfig } from './types';
import { WEEK_1_CONFIG } from './week1';
import { WEEK_2_CONFIG } from './week2';
import { WEEK_3_CONFIG } from './week3';

const WEEK_CONFIGS: Record<number, WeekConfig> = {
  1: WEEK_1_CONFIG,
  2: WEEK_2_CONFIG,
  3: WEEK_3_CONFIG,
};

export function getWeekConfig(weekNumber: number): WeekConfig | null {
  return WEEK_CONFIGS[weekNumber] ?? null;
}

export { type WeekConfig } from './types';
