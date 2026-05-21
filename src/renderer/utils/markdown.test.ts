
import { describe, it, expect, vi } from 'vitest';

vi.mock('@common/config', () => ({
  default: {
    attachments: { path: '/data/attachments', token: '@attachment' },
    notes: {
      path: '/data/notes',
      token: '@note',
      ext: '.md',
      re: /\.(?:md)$/
    },
    tags: { token: '@tag' },
    search: { tokenizer: /\s+/g },
    katex: { throwOnError: false, displayMode: false, errorColor: '#F44336' }
  }
}));

vi.mock('prismjs', () => ({
  default: {
    languages: { javascript: {}, bash: {} },
    highlight: vi.fn((str: string) => str)
  },
  languages: { javascript: {}, bash: {} },
  highlight: vi.fn((str: string) => str)
}));

vi.mock('prismjs/components.js', () => ({
  languages: { javascript: { title: 'JavaScript' }, bash: { title: 'Bash' } }
}));

import Markdown from './markdown';

describe('Markdown.is', () => {
  it('returns false for plain prose', () => {
    expect(Markdown.is('Hello world')).toBe(false);
  });

  it('returns true for heading syntax', () => {
    expect(Markdown.is('# Heading')).toBe(true);
  });

  it('returns true for bold text', () => {
    expect(Markdown.is('**bold**')).toBe(true);
  });

  it('returns true for bullet lists', () => {
    expect(Markdown.is('- item')).toBe(true);
  });

  it('returns true for fenced code blocks', () => {
    expect(Markdown.is('```\ncode\n```')).toBe(true);
  });

  it('returns true for numbered lists', () => {
    expect(Markdown.is('1. first item')).toBe(true);
  });
});

describe('Markdown.render', () => {
  it('renders a heading to an h1 element', () => {
    const html = Markdown.render('# Hello');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('wraps plain text in a paragraph', () => {
    const html = Markdown.render('Plain paragraph');
    expect(html).toContain('<p>');
    expect(html).toContain('Plain paragraph');
  });

  it('renders task list checkboxes with data-nth attributes', () => {
    const html = Markdown.render('- [x] Done\n- [ ] Todo');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-nth="0"');
    expect(html).toContain('data-nth="1"');
  });

  it('wraps code blocks in copy-wrapper', () => {
    const html = Markdown.render('```\nconst x = 1;\n```');
    expect(html).toContain('copy-wrapper');
    expect(html).toContain('const x = 1;');
  });

  it('handles an empty string without throwing', () => {
    expect(() => Markdown.render('')).not.toThrow();
    expect(Markdown.render('')).toContain('<p>');
  });

  it('renders a mermaid block as a placeholder div', () => {
    const html = Markdown.render('```mermaid\ngraph TD;\n  A-->B;\n```');
    expect(html).toContain('class="mermaid"');
    expect(html).toContain('mermaid-wrapper');
  });

  it('regression: renders content longer than 25000 characters without truncation', () => {
    // Before Phase 7, there was a limiter that capped rendering at 25k characters.
    // This test verifies it was removed.
    const longContent = '# ' + 'A'.repeat(30000);
    const html = Markdown.render(longContent);
    expect(html.length).toBeGreaterThan(25000);
    // The full run of A's must appear in the output
    expect(html).toContain('A'.repeat(1000));
  });
});

describe('Markdown.strip', () => {
  it('strips heading markers', () => {
    expect(Markdown.strip('# Hello')).toBe('Hello');
  });

  it('strips bold markers', () => {
    expect(Markdown.strip('**bold text**')).toBe('bold text');
  });

  it('strips italic markers', () => {
    expect(Markdown.strip('_italic_')).toBe('italic');
  });

  it('strips bullet list markers', () => {
    expect(Markdown.strip('- item')).toBe('item');
  });

  it('removes image syntax', () => {
    const result = Markdown.strip('![alt](image.png)');
    expect(result).not.toContain('![');
    expect(result).not.toContain('.png');
  });

  it('keeps the link text and removes the URL', () => {
    const result = Markdown.strip('[click here](https://example.com)');
    expect(result).toBe('click here');
  });

  it('returns plain text unchanged', () => {
    expect(Markdown.strip('plain text')).toBe('plain text');
  });
});

describe('Markdown.extensions.utilities.toggleCheckbox', () => {
  const { toggleCheckbox } = Markdown.extensions.utilities;

  it('checks an unchecked checkbox by index', () => {
    const source = '- [ ] First\n- [ ] Second';
    const result = toggleCheckbox(source, 0, true);
    expect(result).toContain('[x]');
    expect(result).toContain('Second');
  });

  it('unchecks a checked checkbox by index', () => {
    const source = '- [x] First\n- [x] Second';
    const result = toggleCheckbox(source, 1, false);
    const lines = result.split('\n');
    expect(lines[0]).toContain('[x]');
    expect(lines[1]).toContain('[ ]');
  });

  it('returns the source unchanged when the index is out of range', () => {
    const source = '- [ ] Only one';
    expect(toggleCheckbox(source, 5)).toBe(source);
  });
});
