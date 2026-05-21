
import { describe, it, expect } from 'vitest';
import { SortingBys, SortingTypes } from './sorting';

describe('SortingBys', () => {
  it('has stable enum values', () => {
    expect(SortingBys.TITLE).toBe('title');
    expect(SortingBys.DATE_CREATED).toBe('date_created');
    expect(SortingBys.DATE_MODIFIED).toBe('date_modified');
  });
});

describe('SortingTypes', () => {
  it('has stable enum values', () => {
    expect(SortingTypes.DESC).toBe('descending');
    expect(SortingTypes.ASC).toBe('ascending');
  });
});
