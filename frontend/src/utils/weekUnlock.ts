// Shared shift-unlock helper.
//
// The "highest unlocked week" is the first week whose predecessor isn't yet
// clocked out — i.e. the shift the student is currently allowed to be on.
// Used to gate W4+ surfaces (the [ ].edited app, the Records Wing tile, and
// the covert funnel drawer) so they all agree on one source of truth.

export function getHighestUnlockedWeek(
  weeks: Array<{ weekNumber: number; clockedOut: boolean }>,
): number {
  if (weeks.length === 0) return 1;
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let highest = sorted[0].weekNumber;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].clockedOut) {
      highest = sorted[i].weekNumber;
    } else {
      break;
    }
  }
  return highest;
}
