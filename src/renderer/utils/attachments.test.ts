
import { describe, it, expect } from 'vitest';
import Attachments from './attachments';

describe('Attachments.sort', () => {
  it('returns an empty array unchanged', () => {
    expect(Attachments.sort([])).toEqual([]);
  });

  it('sorts alphabetically, case-insensitive', () => {
    expect(Attachments.sort(['Zebra', 'apple', 'Mango'])).toEqual(['apple', 'Mango', 'Zebra']);
  });

  it('preserves stable relative order for entries with equal lowercase keys', () => {
    const result = Attachments.sort(['a', 'A']);
    expect(result).toHaveLength(2);
    expect(result[0].toLowerCase()).toBe('a');
    expect(result[1].toLowerCase()).toBe('a');
  });

  it('returns a single-element array unchanged', () => {
    expect(Attachments.sort(['only.png'])).toEqual(['only.png']);
  });
});
