
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('os', () => ({
  platform: vi.fn(() => 'linux')
}));

vi.mock('calls-batch', () => ({
  default: class CallsBatch {
    add = vi.fn();
  }
}));

import * as os from 'os';
import Utils from './utils';

describe('Utils.encodeFilePath', () => {
  it('percent-encodes spaces', () => {
    expect(Utils.encodeFilePath('/path/to/my file.md')).toBe('/path/to/my%20file.md');
  });

  it('normalises backslashes to forward slashes', () => {
    expect(Utils.encodeFilePath('C:\\Users\\foo\\note.md')).toBe('C:/Users/foo/note.md');
  });

  it('collapses consecutive slashes to one', () => {
    expect(Utils.encodeFilePath('/path//to///file.md')).toBe('/path/to/file.md');
  });

  it('returns a plain path unchanged', () => {
    expect(Utils.encodeFilePath('/notes/simple.md')).toBe('/notes/simple.md');
  });
});

describe('Utils.getFirstUnemptyLine', () => {
  it('returns null for an empty string', () => {
    expect(Utils.getFirstUnemptyLine('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(Utils.getFirstUnemptyLine('   \n\n   ')).toBeNull();
  });

  it('skips leading blank lines and returns the first non-blank line', () => {
    expect(Utils.getFirstUnemptyLine('\n\nHello\nWorld')).toBe('Hello');
  });

  it('returns the first line when it is non-empty', () => {
    expect(Utils.getFirstUnemptyLine('First line\nSecond line')).toBe('First line');
  });
});

describe('Utils.normalizeFilePaths', () => {
  beforeEach(() => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
  });

  it('returns paths unchanged on non-win32', () => {
    const paths = ['/home/user/note.md', '/home/user/other.md'];
    expect(Utils.normalizeFilePaths(paths)).toEqual(paths);
  });

  it('normalises forward slashes to backslashes on win32', () => {
    vi.mocked(os.platform).mockReturnValue('win32' as any);
    expect(Utils.normalizeFilePaths(['/notes/foo.md'])).toEqual(['\\notes\\foo.md']);
  });

  it('collapses mixed slashes to backslashes on win32', () => {
    vi.mocked(os.platform).mockReturnValue('win32' as any);
    expect(Utils.normalizeFilePaths(['C:/Users//foo.md'])).toEqual(['C:\\Users\\foo.md']);
  });
});

describe('Utils.batchify', () => {
  it('returns a function that calls batch.add with the wrapped fn and args', () => {
    const batch = { add: vi.fn() };
    const fn = vi.fn();
    const wrapped = Utils.batchify(batch as any, fn);

    wrapped('arg1', 'arg2');

    expect(batch.add).toHaveBeenCalledOnce();
    expect(batch.add).toHaveBeenCalledWith(fn, ['arg1', 'arg2']);
  });

  it('forwards multiple calls independently', () => {
    const batch = { add: vi.fn() };
    const fn = vi.fn();
    const wrapped = Utils.batchify(batch as any, fn);

    wrapped(1);
    wrapped(2);

    expect(batch.add).toHaveBeenCalledTimes(2);
    expect(batch.add).toHaveBeenNthCalledWith(1, fn, [1]);
    expect(batch.add).toHaveBeenNthCalledWith(2, fn, [2]);
  });
});
