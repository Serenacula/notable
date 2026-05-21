
import { describe, it, expect, vi } from 'vitest';

vi.mock('@common/config', () => ({
  default: {
    attachments: { path: '/data/attachments', token: '@attachment' },
    notes: { path: '/data/notes', token: '@note', ext: '.md', re: /\.(?:md)$/ },
    tags: { token: '@tag' },
    search: { tokenizer: /\s+/g },
    katex: { throwOnError: false, displayMode: false, errorColor: '#F44336' }
  }
}));

vi.mock('electron', () => ({
  shell: { showItemInFolder: vi.fn(), openPath: vi.fn() }
}));

vi.mock('electron-dialog', () => ({
  default: { alert: vi.fn(), confirm: vi.fn(() => true) }
}));

vi.mock('@renderer/utils/file', () => ({
  default: {
    read: vi.fn(),
    write: vi.fn(),
    unlink: vi.fn(),
    copy: vi.fn(),
    exists: vi.fn(() => Promise.resolve(false)),
    stat: vi.fn(() => Promise.resolve(null)),
    rename: vi.fn()
  }
}));

vi.mock('prismjs', () => ({
  default: { languages: {}, highlight: vi.fn((str: string) => str) },
  languages: {},
  highlight: vi.fn((str: string) => str)
}));

vi.mock('prismjs/components.js', () => ({ languages: {} }));

import Note from './note';

function makeNote(overrides: Partial<NoteObj> = {}): NoteObj {
  return {
    filePath: '/notes/test.md',
    checksum: 1234,
    content: '',
    plainContent: '',
    metadata: {
      attachments: [],
      created: new Date('2024-01-01'),
      modified: new Date('2024-06-01'),
      deleted: false,
      favorited: false,
      pinned: false,
      stat: {} as import('fs').Stats,
      tags: [],
      title: 'Test'
    },
    ...overrides
  };
}

function makeContainer() {
  const container = new Note();
  (container as any).ctx = {};
  return container;
}

describe('Note._inferTitleFromFilePath', () => {
  const container = makeContainer();

  it('strips the extension and returns the basename', () => {
    expect(container._inferTitleFromFilePath('/notes/my-note.md')).toBe('my-note');
  });

  it('substitutes the dash-like ∕ character back to /', () => {
    expect(container._inferTitleFromFilePath('/notes/foo∕bar.md')).toBe('foo/bar');
  });

  it('collapses consecutive spaces to a single space', () => {
    expect(container._inferTitleFromFilePath('/notes/a  b.md')).toBe('a b');
  });
});

describe('Note._inferTitleFromLine', () => {
  const container = makeContainer();

  it('returns the fallback when line is null', () => {
    expect(container._inferTitleFromLine(null)).toBe('Untitled');
  });

  it('returns the fallback when line is an empty string', () => {
    expect(container._inferTitleFromLine('')).toBe('Untitled');
  });

  it('strips markdown heading syntax', () => {
    expect(container._inferTitleFromLine('# My Heading')).toBe('My Heading');
  });

  it('trims surrounding whitespace', () => {
    expect(container._inferTitleFromLine('  padded  ')).toBe('padded');
  });

  it('uses a custom fallback', () => {
    expect(container._inferTitleFromLine(null, 'No Title')).toBe('No Title');
  });
});

describe('Note.sanitizeTags', () => {
  const container = makeContainer();

  it('filters out non-string entries', () => {
    const result = container.sanitizeTags([42, 'valid', null, 'other'] as any);
    expect(result).toEqual(['valid', 'other']);
  });

  it('trims leading and trailing separators', () => {
    expect(container.sanitizeTags(['/foo/'])).toEqual(['foo']);
  });

  it('removes tags with consecutive empty segments', () => {
    expect(container.sanitizeTags(['foo//bar'])).toEqual([]);
  });

  it('removes empty strings', () => {
    expect(container.sanitizeTags([''])).toEqual([]);
  });

  it('keeps well-formed nested tags', () => {
    expect(container.sanitizeTags(['Notebooks/work'])).toEqual(['Notebooks/work']);
  });
});

describe('Note.sanitizeAttachments', () => {
  const container = makeContainer();

  it('filters out non-strings', () => {
    const result = container.sanitizeAttachments([42, 'image.png', null] as any);
    expect(result).toEqual(['image.png']);
  });

  it('filters out empty strings', () => {
    expect(container.sanitizeAttachments(['', 'file.pdf'])).toEqual(['file.pdf']);
  });

  it('returns an empty array for empty input', () => {
    expect(container.sanitizeAttachments([])).toEqual([]);
  });
});

describe('Note.is', () => {
  const container = makeContainer();

  it('returns true for the same reference', () => {
    const note = makeNote();
    expect(container.is(note, note)).toBe(true);
  });

  it('returns true for different references with same filePath and content (strict)', () => {
    const note1 = makeNote({ content: 'hello' });
    const note2 = makeNote({ content: 'hello' });
    expect(note1).not.toBe(note2);
    expect(container.is(note1, note2)).toBe(true);
  });

  it('returns false for same filePath but different content (strict)', () => {
    const note1 = makeNote({ content: 'hello' });
    const note2 = makeNote({ content: 'world' });
    expect(container.is(note1, note2)).toBe(false);
  });

  it('returns true for same filePath but different content when loose=true', () => {
    const note1 = makeNote({ content: 'hello' });
    const note2 = makeNote({ content: 'world' });
    expect(container.is(note1, note2, true)).toBe(true);
  });

  it('returns false when one argument is undefined', () => {
    const note = makeNote();
    expect(container.is(note, undefined)).toBe(false);
    expect(container.is(undefined, note)).toBe(false);
  });

  it('returns true for two undefined values (same reference)', () => {
    expect(container.is(undefined, undefined)).toBe(true);
  });
});

describe('Note getters — undefined note fallbacks', () => {
  const container = makeContainer();

  it('getAttachments returns []', () => {
    expect(container.getAttachments(undefined)).toEqual([]);
  });

  it('getContent returns empty string', () => {
    expect(container.getContent(undefined)).toBe('');
  });

  it('getPlainContent returns empty string', () => {
    expect(container.getPlainContent(undefined)).toBe('');
  });

  it('getTitle returns empty string', () => {
    expect(container.getTitle(undefined)).toBe('');
  });

  it('getTags returns []', () => {
    expect(container.getTags(undefined)).toEqual([]);
  });

  it('getChecksum returns NaN', () => {
    expect(container.getChecksum(undefined)).toBeNaN();
  });

  it('isDeleted returns false', () => {
    expect(container.isDeleted(undefined)).toBe(false);
  });

  it('isFavorited returns false', () => {
    expect(container.isFavorited(undefined)).toBe(false);
  });

  it('isPinned returns false', () => {
    expect(container.isPinned(undefined)).toBe(false);
  });
});

describe('Note getters — with a defined note', () => {
  const container = makeContainer();
  const created = new Date('2024-01-01');
  const modified = new Date('2024-06-01');
  const note = makeNote({
    content: 'raw content',
    plainContent: 'plain',
    checksum: 9999,
    metadata: {
      attachments: ['image.png'],
      created,
      modified,
      deleted: true,
      favorited: true,
      pinned: true,
      stat: {} as import('fs').Stats,
      tags: ['work'],
      title: 'My Note'
    }
  });

  it('getAttachments returns the attachments array', () => {
    expect(container.getAttachments(note)).toEqual(['image.png']);
  });

  it('getContent returns the raw content', () => {
    expect(container.getContent(note)).toBe('raw content');
  });

  it('getPlainContent returns the plain content', () => {
    expect(container.getPlainContent(note)).toBe('plain');
  });

  it('getTitle returns the title', () => {
    expect(container.getTitle(note)).toBe('My Note');
  });

  it('getTags returns all tags', () => {
    expect(container.getTags(note)).toEqual(['work']);
  });

  it('getChecksum returns the checksum', () => {
    expect(container.getChecksum(note)).toBe(9999);
  });

  it('getCreated returns the created date', () => {
    expect(container.getCreated(note)).toBe(created);
  });

  it('getModified returns the modified date', () => {
    expect(container.getModified(note)).toBe(modified);
  });

  it('isDeleted returns true', () => {
    expect(container.isDeleted(note)).toBe(true);
  });

  it('isFavorited returns true', () => {
    expect(container.isFavorited(note)).toBe(true);
  });

  it('isPinned returns true', () => {
    expect(container.isPinned(note)).toBe(true);
  });
});

describe('Note.getTags with startingWith prefix', () => {
  const container = makeContainer();
  const note = makeNote({
    metadata: {
      attachments: [],
      created: new Date(),
      modified: new Date(),
      deleted: false,
      favorited: false,
      pinned: false,
      stat: {} as import('fs').Stats,
      tags: ['Notebooks', 'Notebooks/work', 'Notebooks/personal', 'other-tag'],
      title: 'Test'
    }
  });

  it('returns only tags equal to or starting with the prefix', () => {
    const result = container.getTags(note, 'Notebooks');
    expect(result).toContain('Notebooks');
    expect(result).toContain('Notebooks/work');
    expect(result).toContain('Notebooks/personal');
    expect(result).not.toContain('other-tag');
  });

  it('does not include tags that merely contain the prefix as a substring', () => {
    const result = container.getTags(note, 'work');
    expect(result).toEqual([]);
  });
});
