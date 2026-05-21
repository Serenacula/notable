
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
    rename: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn()
  },
  constants: { F_OK: 0 }
}));

import File from './file';
import * as fs from 'fs';

const mocked = fs.promises as unknown as {
  access: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  copyFile: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  unlink: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
};

describe('Storage', () => {
  it('isIdle returns true when no operations are pending', () => {
    expect(File.storage.isIdle()).toBe(true);
  });
});

describe('File.read', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns file content as a string', async () => {
    mocked.readFile.mockResolvedValue(Buffer.from('hello world'));
    const result = await File.read('/test/file.txt');
    expect(result).toBe('hello world');
  });

  it('returns undefined when the file cannot be read', async () => {
    mocked.readFile.mockRejectedValue(new Error('ENOENT'));
    const result = await File.read('/nonexistent.txt');
    expect(result).toBeUndefined();
  });
});

describe('File.exists', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when the file is accessible', async () => {
    mocked.access.mockResolvedValue(undefined);
    expect(await File.exists('/exists.txt')).toBe(true);
  });

  it('returns false when access throws', async () => {
    mocked.access.mockRejectedValue(new Error('ENOENT'));
    expect(await File.exists('/missing.txt')).toBe(false);
  });
});

describe('File.write', () => {
  beforeEach(() => vi.clearAllMocks());

  it('writes content to the given path', async () => {
    mocked.writeFile.mockResolvedValue(undefined);
    await File.write('/test/file.txt', 'content');
    expect(mocked.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content');
  });

  it('creates missing parent directories on ENOENT and retries', async () => {
    const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mocked.writeFile.mockRejectedValueOnce(error).mockResolvedValue(undefined);
    mocked.mkdir.mockResolvedValue(undefined);

    await File.write('/deep/path/file.txt', 'content');

    expect(mocked.mkdir).toHaveBeenCalledWith(
      path.dirname('/deep/path/file.txt'),
      { recursive: true }
    );
    expect(mocked.writeFile).toHaveBeenCalledTimes(2);
  });
});

describe('File.unlink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the file at the given path', async () => {
    mocked.unlink.mockResolvedValue(undefined);
    await File.unlink('/test/file.txt');
    expect(mocked.unlink).toHaveBeenCalledWith('/test/file.txt');
  });

  it('swallows errors silently', async () => {
    mocked.unlink.mockRejectedValue(new Error('ENOENT'));
    await expect(File.unlink('/missing.txt')).resolves.toBeUndefined();
  });
});

describe('File.stat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stat object on success', async () => {
    const mockStat = { size: 100 };
    mocked.stat.mockResolvedValue(mockStat);
    const result = await File.stat('/test/file.txt');
    expect(result).toBe(mockStat);
  });

  it('returns undefined on error', async () => {
    mocked.stat.mockRejectedValue(new Error('ENOENT'));
    const result = await File.stat('/missing.txt');
    expect(result).toBeUndefined();
  });
});

describe('File.copy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('copies a file from source to destination', async () => {
    mocked.copyFile.mockResolvedValue(undefined);
    await File.copy('/src/file.txt', '/dst/file.txt');
    expect(mocked.copyFile).toHaveBeenCalledWith('/src/file.txt', '/dst/file.txt');
  });

  it('creates missing destination directories on ENOENT and retries', async () => {
    const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    mocked.copyFile.mockRejectedValueOnce(error).mockResolvedValue(undefined);
    mocked.mkdir.mockResolvedValue(undefined);

    await File.copy('/src/file.txt', '/deep/dst/file.txt');

    expect(mocked.mkdir).toHaveBeenCalledWith(
      path.dirname('/deep/dst/file.txt'),
      { recursive: true }
    );
    expect(mocked.copyFile).toHaveBeenCalledTimes(2);
  });
});
