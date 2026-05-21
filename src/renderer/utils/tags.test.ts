
import { describe, it, expect } from 'vitest';
import Tags, { TagSpecials, TagSpecialsNames } from './tags';

describe('TagSpecials', () => {
  it('has stable string values', () => {
    expect(TagSpecials.ALL).toBe('__ALL__');
    expect(TagSpecials.FAVORITES).toBe('__FAVORITES__');
    expect(TagSpecials.NOTEBOOKS).toBe('Notebooks');
    expect(TagSpecials.TAGS).toBe('__TAGS__');
    expect(TagSpecials.TEMPLATES).toBe('Templates');
    expect(TagSpecials.UNTAGGED).toBe('__UNTAGGED__');
    expect(TagSpecials.TRASH).toBe('__TRASH__');
  });
});

describe('TagSpecialsNames', () => {
  it('has human-readable display names', () => {
    expect(TagSpecialsNames.ALL).toBe('All Notes');
    expect(TagSpecialsNames.FAVORITES).toBe('Favorites');
    expect(TagSpecialsNames.NOTEBOOKS).toBe('Notebooks');
    expect(TagSpecialsNames.TAGS).toBe('Tags');
    expect(TagSpecialsNames.TEMPLATES).toBe('Templates');
    expect(TagSpecialsNames.UNTAGGED).toBe('Untagged');
    expect(TagSpecialsNames.TRASH).toBe('Trash');
  });
});

describe('Tags.SEPARATOR', () => {
  it('is a forward slash', () => {
    expect(Tags.SEPARATOR).toBe('/');
  });
});

describe('Tags.isPrivate', () => {
  it('returns true for double-underscore-wrapped specials', () => {
    expect(Tags.isPrivate('__ALL__')).toBe(true);
    expect(Tags.isPrivate('__TRASH__')).toBe(true);
    expect(Tags.isPrivate('__FAVORITES__')).toBe(true);
    expect(Tags.isPrivate('__UNTAGGED__')).toBe(true);
    expect(Tags.isPrivate('__TAGS__')).toBe(true);
  });

  it('returns false for regular tags', () => {
    expect(Tags.isPrivate('foo')).toBe(false);
    expect(Tags.isPrivate('Notebooks')).toBe(false);
    expect(Tags.isPrivate('Templates')).toBe(false);
    expect(Tags.isPrivate('foo/bar')).toBe(false);
  });

  it('accepts a TagObj by checking its name field', () => {
    const tagObj = { name: '__ALL__', collapsed: false, path: '__ALL__', notes: [], tags: {} };
    expect(Tags.isPrivate(tagObj as any)).toBe(true);

    const regularObj = { name: 'MyTag', collapsed: false, path: 'MyTag', notes: [], tags: {} };
    expect(Tags.isPrivate(regularObj as any)).toBe(false);
  });
});

describe('Tags.sort', () => {
  it('sorts strings case-insensitively', () => {
    const sorted = Tags.sort(['Zebra', 'apple', 'mango', 'Banana']);
    expect(sorted).toEqual(['apple', 'Banana', 'mango', 'Zebra']);
  });

  it('returns an empty array unchanged', () => {
    expect(Tags.sort([])).toEqual([]);
  });

  it('sorts TagObj arrays by name', () => {
    const objs = [
      { name: 'Zebra', collapsed: false, path: 'Zebra', notes: [], tags: {} },
      { name: 'apple', collapsed: false, path: 'apple', notes: [], tags: {} },
    ];
    const sorted = Tags.sort(objs as any[]);
    expect((sorted[0] as any).name).toBe('apple');
    expect((sorted[1] as any).name).toBe('Zebra');
  });

  it('is stable — equal strings keep their relative order', () => {
    const input = ['b', 'a', 'c'];
    const sorted = Tags.sort(input);
    expect(sorted).toEqual(['a', 'b', 'c']);
  });
});
