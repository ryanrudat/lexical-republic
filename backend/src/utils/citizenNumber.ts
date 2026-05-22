import { prisma } from './prisma';
import {
  CITIZEN_NUMBER_MIN,
  CITIZEN_NUMBER_MAX,
  RESERVED_CITIZEN_NUMBERS,
} from './inscriptionConstants';

/**
 * Format a 4-digit number as a Citizen-XXXX label.
 * Numbers <1000 are zero-padded.
 */
export function formatCitizenNumber(num: number | string): string {
  const s = String(num).padStart(4, '0');
  return `C-${s}`;
}

/** Parse "C-XXXX" or "Citizen-XXXX" back into a numeric digit string. Returns null if invalid. */
export function parseCitizenNumber(label: string): string | null {
  const m = label.match(/(?:C|Citizen)-(\d{4})/i);
  return m ? m[1] : null;
}

/** Pick a random 4-digit string in [1000, 9999], avoiding reservations. */
function randomCitizenDigits(reserved: Set<string> = RESERVED_CITIZEN_NUMBERS): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    const n = Math.floor(
      Math.random() * (CITIZEN_NUMBER_MAX - CITIZEN_NUMBER_MIN + 1) + CITIZEN_NUMBER_MIN,
    );
    const s = String(n);
    if (!reserved.has(s)) return s;
  }
  // Astronomically unlikely; fallback to a deterministic untaken number
  return '5050';
}

/**
 * Assign a Citizen-XXXX number to a Pair if one isn't already set.
 * Persists to DB. Number is stable for the semester.
 * Returns the assigned (or existing) full label e.g. "C-3019".
 */
export async function assignCitizenNumber(pairId: string): Promise<string> {
  const existing = await prisma.pair.findUnique({
    where: { id: pairId },
    select: { citizenNumber: true },
  });
  if (existing?.citizenNumber) return existing.citizenNumber;

  // Build reservation set from in-use Pair numbers to avoid collisions
  const used = await prisma.pair.findMany({
    where: { citizenNumber: { not: null } },
    select: { citizenNumber: true },
  });
  const reserved = new Set<string>(RESERVED_CITIZEN_NUMBERS);
  for (const row of used) {
    if (row.citizenNumber) {
      const parsed = parseCitizenNumber(row.citizenNumber);
      if (parsed) reserved.add(parsed);
    }
  }

  const digits = randomCitizenDigits(reserved);
  const label = formatCitizenNumber(digits);

  await prisma.pair.update({
    where: { id: pairId },
    data: { citizenNumber: label },
  });
  return label;
}

/**
 * Generate a fresh anonymized Citizen-XXXX number (NOT persisted, NOT real pair).
 * Used for ghost-fill display so past performance never leaks identity.
 * `excludeDigits` is a set of digit strings to avoid (other desks in same drill).
 */
export function anonymizedCitizenNumber(excludeDigits: Set<string> = new Set()): string {
  const reserved = new Set<string>(RESERVED_CITIZEN_NUMBERS);
  for (const d of excludeDigits) reserved.add(d);
  return formatCitizenNumber(randomCitizenDigits(reserved));
}
