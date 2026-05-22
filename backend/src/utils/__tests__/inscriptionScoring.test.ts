import { describe, it, expect } from 'vitest';
import { calcInscriptionScore, utcDateKey } from '../inscriptionScoring';

describe('calcInscriptionScore', () => {
  it('awards gold tier for first-place perfect run', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 15,
      wordsTotal: 15,
      finalRank: 1,
      totalParticipants: 4,
      mode: 'open',
      soloPiAwardsToday: 0,
    });
    expect(r.commendationTier).toBe('gold');
    expect(r.piAwarded).toBeGreaterThan(0);
    expect(r.piCapped).toBe(false);
  });

  it('awards silver tier for 90% completion at rank 2', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 14,
      wordsTotal: 15,
      finalRank: 2,
      totalParticipants: 4,
      mode: 'open',
      soloPiAwardsToday: 0,
    });
    expect(r.commendationTier).toBe('silver');
  });

  it('awards bronze tier for 80% completion at any rank', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 12,
      wordsTotal: 15,
      finalRank: 4,
      totalParticipants: 4,
      mode: 'open',
      soloPiAwardsToday: 0,
    });
    expect(r.commendationTier).toBe('bronze');
  });

  it('awards no commendation below 80%', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 10,
      wordsTotal: 15,
      finalRank: 3,
      totalParticipants: 4,
      mode: 'open',
      soloPiAwardsToday: 0,
    });
    expect(r.commendationTier).toBe(null);
  });

  it('caps solo P.I. when daily limit reached', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 15,
      wordsTotal: 15,
      finalRank: 1,
      totalParticipants: 2,
      mode: 'solo',
      soloPiAwardsToday: 3,
    });
    expect(r.piAwarded).toBe(0);
    expect(r.piCapped).toBe(true);
    // Commendation tier still awarded even when capped — recognition is free
    expect(r.commendationTier).toBe('gold');
  });

  it('does NOT cap open / trial drills regardless of solo count', () => {
    for (const mode of ['open', 'trial'] as const) {
      const r = calcInscriptionScore({
        wordsCorrect: 15,
        wordsTotal: 15,
        finalRank: 1,
        totalParticipants: 4,
        mode,
        soloPiAwardsToday: 99,
      });
      expect(r.piCapped).toBe(false);
      expect(r.piAwarded).toBeGreaterThan(0);
    }
  });

  it('trial mode awards double P.I. of open mode for same performance', () => {
    const input = {
      wordsCorrect: 15,
      wordsTotal: 15,
      finalRank: 1,
      totalParticipants: 4,
      soloPiAwardsToday: 0,
    };
    const open = calcInscriptionScore({ ...input, mode: 'open' });
    const trial = calcInscriptionScore({ ...input, mode: 'trial' });
    expect(trial.piAwarded).toBe(open.piAwarded * 2);
  });

  it('solo mode awards half of open mode', () => {
    const input = {
      wordsCorrect: 15,
      wordsTotal: 15,
      finalRank: 1,
      totalParticipants: 4,
      soloPiAwardsToday: 0,
    };
    const open = calcInscriptionScore({ ...input, mode: 'open' });
    const solo = calcInscriptionScore({ ...input, mode: 'solo' });
    expect(solo.piAwarded).toBeLessThan(open.piAwarded);
    expect(solo.piAwarded).toBe(Math.round(open.piAwarded * 0.5));
  });

  it('rewards completion + placement together (lower rank = more P.I.)', () => {
    const base = {
      wordsCorrect: 15,
      wordsTotal: 15,
      totalParticipants: 4,
      mode: 'open' as const,
      soloPiAwardsToday: 0,
    };
    const first = calcInscriptionScore({ ...base, finalRank: 1 });
    const fourth = calcInscriptionScore({ ...base, finalRank: 4 });
    expect(first.piAwarded).toBeGreaterThan(fourth.piAwarded);
  });

  it('handles zero-word edge case without throwing', () => {
    const r = calcInscriptionScore({
      wordsCorrect: 0,
      wordsTotal: 0,
      finalRank: 1,
      totalParticipants: 1,
      mode: 'open',
      soloPiAwardsToday: 0,
    });
    expect(r.piAwarded).toBeGreaterThanOrEqual(0);
    expect(r.commendationTier).toBe(null);
  });
});

describe('utcDateKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const key = utcDateKey(new Date('2026-05-19T14:23:45Z'));
    expect(key).toBe('2026-05-19');
  });

  it('uses UTC, not local time', () => {
    const key = utcDateKey(new Date('2026-05-19T23:59:59Z'));
    expect(key).toBe('2026-05-19');
  });
});
