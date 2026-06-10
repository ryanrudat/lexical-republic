// Per-pair "progress rewrite" epochs.
//
// Bumped whenever a teacher command rewrites a pair's MissionScores
// (move-to-shift, reset-shift, send-to-task, reset-task). Long-running
// writers — the writing eval holds an OpenAI round-trip for several seconds
// (20s ceiling) before writing its MissionScore — snapshot the epoch at
// request entry and skip the write if it changed. Without this, a submission
// already in flight when the teacher's command runs lands AFTER the command's
// deleteMany and re-creates the row: phantom progress on a fresh-start week,
// stale grades in the Gradebook, and (on backward moves) a stale later-week
// row that out-ranks the completedAt:null marker in getCurrentWeekNumberForPair.
//
// In-memory is acceptable on a single Railway instance — a restart only
// reopens the narrow pre-existing window until the next bump.

const epochs = new Map<string, number>();

export function getMoveEpoch(pairId: string): number {
  return epochs.get(pairId) ?? 0;
}

export function bumpMoveEpoch(pairId: string): void {
  epochs.set(pairId, (epochs.get(pairId) ?? 0) + 1);
}
