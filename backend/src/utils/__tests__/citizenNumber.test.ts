import { describe, it, expect } from 'vitest';
import { formatCitizenNumber, parseCitizenNumber, anonymizedCitizenNumber } from '../citizenNumber';

describe('formatCitizenNumber', () => {
  it('pads short numbers to 4 digits', () => {
    expect(formatCitizenNumber(42)).toBe('C-0042');
    expect(formatCitizenNumber('7')).toBe('C-0007');
  });

  it('preserves 4-digit numbers', () => {
    expect(formatCitizenNumber(3019)).toBe('C-3019');
    expect(formatCitizenNumber('4488')).toBe('C-4488');
  });
});

describe('parseCitizenNumber', () => {
  it('extracts digits from C-XXXX format', () => {
    expect(parseCitizenNumber('C-3019')).toBe('3019');
    expect(parseCitizenNumber('C-0042')).toBe('0042');
  });

  it('extracts digits from Citizen-XXXX format', () => {
    expect(parseCitizenNumber('Citizen-7748')).toBe('7748');
  });

  it('returns null for malformed input', () => {
    expect(parseCitizenNumber('foo')).toBe(null);
    expect(parseCitizenNumber('C-12')).toBe(null);
  });
});

describe('anonymizedCitizenNumber', () => {
  it('returns a valid C-XXXX format', () => {
    const cn = anonymizedCitizenNumber();
    expect(cn).toMatch(/^C-\d{4}$/);
  });

  it('avoids reserved numbers (4488)', () => {
    // Run many iterations to ensure 4488 never appears
    for (let i = 0; i < 200; i++) {
      const cn = anonymizedCitizenNumber();
      expect(cn).not.toBe('C-4488');
    }
  });

  it('avoids numbers in excludeDigits set', () => {
    const exclude = new Set(['3019', '7748', '2204']);
    for (let i = 0; i < 100; i++) {
      const cn = anonymizedCitizenNumber(exclude);
      const digits = cn.replace(/[^0-9]/g, '');
      expect(exclude.has(digits)).toBe(false);
    }
  });

  it('produces numbers in [1000, 9999] range', () => {
    for (let i = 0; i < 50; i++) {
      const cn = anonymizedCitizenNumber();
      const n = parseInt(cn.replace(/[^0-9]/g, ''), 10);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(9999);
    }
  });
});
