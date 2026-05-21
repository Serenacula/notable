
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prismLanguages, prismHighlight } = vi.hoisted(() => {
  const prismLanguages: Record<string, any> = { bash: { id: 'bash-grammar' } };
  const prismHighlight = vi.fn((str: string, _grammar: any, lang: string) => `[${lang}]${str}`);
  return { prismLanguages, prismHighlight };
});

vi.mock('prismjs', () => ({
  default: { languages: prismLanguages, highlight: prismHighlight },
  languages: prismLanguages,
  highlight: prismHighlight
}));

vi.mock('prismjs/components.js', () => ({
  languages: {
    bash: { title: 'Bash' },
    javascript: { title: 'JavaScript' }
  }
}));

import Highlighter from './highlighter';

describe('Highlighter.inferLanguage', () => {
  it('extracts the language from a class attribute string', () => {
    expect(Highlighter.inferLanguage('language-javascript')).toBe('javascript');
    expect(Highlighter.inferLanguage('foo language-python bar')).toBe('python');
  });

  it('returns undefined for an empty string', () => {
    expect(Highlighter.inferLanguage('')).toBeUndefined();
  });

  it('returns undefined when no language class is present', () => {
    expect(Highlighter.inferLanguage('no-match-here')).toBeUndefined();
  });
});

describe('Highlighter.highlight', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the input unchanged when no language is given', () => {
    expect(Highlighter.highlight('code')).toBe('code');
    expect(prismHighlight).not.toHaveBeenCalled();
  });

  it('returns the input unchanged when the language is not in Prism', () => {
    const result = Highlighter.highlight('code', 'ruby');
    expect(result).toBe('code');
  });

  it('highlights code using a known direct language', () => {
    Highlighter.highlight('some code', 'bash');
    expect(prismHighlight).toHaveBeenCalledWith(
      'some code',
      prismLanguages['bash'],
      'bash'
    );
  });

  it('regression: resolves alias before calling Prism.highlight (sh/shell/zsh → bash)', () => {
    // Before the Phase 7 fix, Prism.highlight was called with Prism.languages[language]
    // where language was still the alias ('sh'), not the resolved 'bash'.
    // That caused Prism.languages['sh'] (undefined) to be used as the grammar.
    // After the fix, the resolved `lang` is used for both grammar lookup and the label.
    for ( const alias of ['sh', 'shell', 'zsh'] ) {
      vi.clearAllMocks();
      Highlighter.highlight('code', alias);
      expect(prismHighlight).toHaveBeenCalledWith(
        'code',
        prismLanguages['bash'],  // resolved grammar — NOT prismLanguages['sh'] (undefined)
        'bash'                   // resolved label — NOT the original alias
      );
    }
  });
});
