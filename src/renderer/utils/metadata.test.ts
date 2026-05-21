
import { describe, it, expect } from 'vitest';
import Metadata from './metadata';

describe('Metadata.get', () => {
  it('returns empty object when there is no frontmatter', () => {
    expect(Metadata.get('# Hello\n\nWorld')).toEqual({});
  });

  it('parses YAML frontmatter', () => {
    const content = '---\ntitle: My Note\ntags: [foo, bar]\n---\n# Body';
    const result = Metadata.get(content) as any;
    expect(result.title).toBe('My Note');
    expect(result.tags).toEqual(['foo', 'bar']);
  });

  it('returns empty object for an empty string', () => {
    expect(Metadata.get('')).toEqual({});
  });

  it('handles boolean and numeric YAML values', () => {
    const content = '---\ndeleted: false\npinned: true\n---\nbody';
    const result = Metadata.get(content) as any;
    expect(result.deleted).toBe(false);
    expect(result.pinned).toBe(true);
  });

  it('handles multi-line YAML string values', () => {
    const content = '---\ntitle: "Hello World"\n---\nbody';
    const result = Metadata.get(content) as any;
    expect(result.title).toBe('Hello World');
  });
});

describe('Metadata.set', () => {
  it('adds frontmatter to plain content', () => {
    const result = Metadata.set('\nHello\n', { title: 'Test' });
    expect(result).toContain('title: Test');
    expect(result).toContain('Hello');
  });

  it('replaces existing frontmatter with new values', () => {
    const original = '---\ntitle: Old\n---\n\nBody\n';
    const result = Metadata.set(original, { title: 'New' });
    expect(result).toContain('title: New');
    expect(result).not.toContain('title: Old');
  });

  it('does not add a frontmatter block when metadata object is empty', () => {
    const result = Metadata.set('\nHello\n', {});
    expect(result).not.toContain('---');
    expect(result).toContain('Hello');
  });

  it('preserves the body content after replacing frontmatter', () => {
    const original = '---\ntitle: Old\n---\n\nBody text here\n';
    const result = Metadata.set(original, { title: 'New' });
    expect(result).toContain('Body text here');
  });
});

describe('Metadata.remove', () => {
  it('strips frontmatter and returns only the body', () => {
    const content = '---\ntitle: Test\n---\n\nBody text';
    const result = Metadata.remove(content);
    expect(result).toBe('Body text');
    expect(result).not.toContain('title');
  });

  it('returns content unchanged when there is no frontmatter', () => {
    expect(Metadata.remove('Plain text')).toBe('Plain text');
  });

  it('handles empty content after frontmatter removal', () => {
    const content = '---\ntitle: Test\n---\n\n';
    const result = Metadata.remove(content);
    expect(result).toBe('');
  });
});
