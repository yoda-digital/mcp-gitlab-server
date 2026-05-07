import { describe, it, expect } from 'vitest';
import { isValidISODate } from './utils.js';

describe('isValidISODate', () => {
  it('returns true for valid ISO 8601 date strings', () => {
    expect(isValidISODate('2024-01-15T10:30:00.000Z')).toBe(true);
    expect(isValidISODate('2026-05-07T08:00:00.000Z')).toBe(true);
  });

  it('returns true for date-only ISO strings that are substrings of toISOString()', () => {
    expect(isValidISODate('2024-01-15')).toBe(true);
  });

  it('returns false for non-date strings', () => {
    expect(isValidISODate('hello')).toBe(false);
    expect(isValidISODate('')).toBe(false);
    expect(isValidISODate('not-a-date')).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(isValidISODate('2024-13-45')).toBe(false);
    expect(isValidISODate('2024-02-30')).toBe(false);
  });

  it('returns false for date-like strings that are not ISO format', () => {
    // "January 1, 2024" creates a valid Date but toISOString() won't contain this string
    expect(isValidISODate('January 1, 2024')).toBe(false);
    expect(isValidISODate('01/15/2024')).toBe(false);
  });
});
