import type { CommendationTier, DrillMode } from './inscriptionConstants';
import { DAILY_SOLO_PI_CAP, MODE_MULTIPLIERS } from './inscriptionConstants';

export interface InscriptionScoreInput {
  wordsCorrect: number;
  wordsTotal: number;
  finalRank: number;          // 1 = first
  totalParticipants: number;  // includes ghosts
  mode: DrillMode;
  soloPiAwardsToday: number;  // pre-drill count for cap logic
}

export interface InscriptionScoreResult {
  piAwarded: number;
  commendationTier: CommendationTier | null;
  piCapped: boolean;
}

/**
 * Calculate P.I. and commendation tier for a completed drill.
 * Lane multiplier deliberately omitted — difficulty already scales via lane
 * (duration + hints + prompt). Net effect is fairness across lanes.
 */
export function calcInscriptionScore(input: InscriptionScoreInput): InscriptionScoreResult {
  const completion = input.wordsTotal > 0 ? input.wordsCorrect / input.wordsTotal : 0;
  const placementBonus = Math.max(0, input.totalParticipants - input.finalRank);
  const modeMultiplier = MODE_MULTIPLIERS[input.mode] ?? 1.0;

  const base = Math.round(completion * 20 + placementBonus * 5);
  let piAwarded = Math.round(base * modeMultiplier);
  let piCapped = false;

  // Daily solo P.I. cap
  if (input.mode === 'solo' && input.soloPiAwardsToday >= DAILY_SOLO_PI_CAP) {
    piAwarded = 0;
    piCapped = true;
  }

  let commendationTier: CommendationTier | null = null;
  if (completion === 1.0 && input.finalRank === 1) {
    commendationTier = 'gold';
  } else if (completion >= 0.9 && input.finalRank <= 2) {
    commendationTier = 'silver';
  } else if (completion >= 0.8) {
    commendationTier = 'bronze';
  }

  return { piAwarded, commendationTier, piCapped };
}

/** Today's UTC date string used as solo-cap reset key. Format YYYY-MM-DD. */
export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
