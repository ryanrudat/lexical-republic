// Shared constants for the Inscription Pool feature.
// Keep small numerics centralized so they can be tuned after live observation.

export const LANE_DURATIONS_SEC: Record<number, number> = {
  1: 120,
  2: 90,
  3: 60,
};

export function durationForLane(lane: number, base?: number): number {
  if (typeof base === 'number') {
    // Teacher-set trial: Lane 2 = base, Lane 1 = base+30, Lane 3 = base-30 (floored at 30s)
    if (lane === 1) return base + 30;
    if (lane === 3) return Math.max(30, base - 30);
    return base;
  }
  return LANE_DURATIONS_SEC[lane] ?? LANE_DURATIONS_SEC[2];
}

export const COOLDOWN_SECONDS = 5 * 60;            // 5 min between drills
export const DAILY_SOLO_PI_CAP = 3;                // 3 P.I.-earning solo drills per UTC day
export const DEFAULT_WORD_COUNT = 15;
export const DEFAULT_POOL_STRATEGY = 'recent';

export const POOL_STRATEGIES = ['current', 'recent', 'cumulative'] as const;
export type PoolStrategy = typeof POOL_STRATEGIES[number];

export const MODE_MULTIPLIERS: Record<string, number> = {
  solo: 0.5,
  open: 1.0,
  trial: 2.0,
};

export const LOBBY_AUTO_FILL_TIMEOUT_MS = 30_000;
export const COUNTDOWN_DURATION_MS = 5_000;
export const HEARTBEAT_TIMEOUT_MS = 15_000;
export const RECONNECT_WINDOW_MS = 60_000;
export const KEYSTROKE_PULSE_WINDOW_MS = 800;
export const LOBBY_EXPIRY_MS = 15 * 60_000;
export const BARK_BUDGET_PER_DRILL = 5;

// Anti-cheat: server-side soft flag if a student's typing exceeds this rate
export const MAX_INPUT_CHARS_PER_SEC = 30;

// Citizen number space: 1000–9999, with reservations
export const CITIZEN_NUMBER_MIN = 1000;
export const CITIZEN_NUMBER_MAX = 9999;
export const RESERVED_CITIZEN_NUMBERS: Set<string> = new Set([
  '4488', // Canon NPC — never assigned to a real student
]);
// Ministry Stenographer ghost slots use 0000–0099
export const MINISTRY_STENOGRAPHER_RANGE = { min: 0, max: 99 };

export type DrillMode = 'solo' | 'open' | 'trial';
export type LobbyStatus = 'waiting' | 'countdown' | 'active' | 'finished' | 'closed';
export type DrillStatus = 'active' | 'completed' | 'abandoned';
export type CommendationTier = 'bronze' | 'silver' | 'gold';
