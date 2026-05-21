
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  promises: {
    access: vi.fn()
  }
}));

import Path from './path';
import { promises as fsPromises } from 'fs';

const mockAccess = fsPromises.access as ReturnType<typeof vi.fn>;

describe('Path.sanitize', () => {
  it('returns a clean filename unchanged', () => {
    expect(Path.sanitize('my-note')).toBe('my-note');
    expect(Path.sanitize('Hello World')).toBe('Hello World');
  });

  it('replaces # with a space and trims', () => {
    expect(Path.sanitize('note#1')).toBe('note 1');
    expect(Path.sanitize('#header')).toBe('header');
  });

  it('trims surrounding whitespace', () => {
    expect(Path.sanitize('  note  ')).toBe('note');
  });
});

describe('Path.getAllowedPath', () => {
  beforeEach(() => {
    (Path as any)._allowedPaths = {};
    vi.clearAllMocks();
  });

  it('returns the first path when the file does not exist', async () => {
    mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await Path.getAllowedPath('/notes', 'test.md');
    expect(result.fileName).toBe('test.md');
    expect(result.folderPath).toBe('/notes');
    expect(result.filePath).toBe('/notes/test.md');
  });

  it('increments the filename when the first path is already taken', async () => {
    mockAccess
      .mockResolvedValueOnce(undefined)  // test.md exists
      .mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await Path.getAllowedPath('/notes', 'test.md');
    expect(result.fileName).toBe('test (2).md');
  });

  it('strips an existing suffix before generating a new one', async () => {
    mockAccess
      .mockResolvedValueOnce(undefined)  // "test (2).md" exists
      .mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await Path.getAllowedPath('/notes', 'test (2).md');
    expect(result.fileName).toBe('test (2).md');
  });

  it('replaces forward slashes in the base name with the division character', async () => {
    mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const result = await Path.getAllowedPath('/notes', 'a/b.md');
    expect(result.fileName).not.toContain('/');
  });
});
