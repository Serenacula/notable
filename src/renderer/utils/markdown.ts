
/* IMPORT */

import * as _ from 'lodash';
import * as CRC32 from 'crc-32';
import {AllHtmlEntities as entities} from 'html-entities';
import isAbsoluteUrl from 'is-absolute-url';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import * as path from 'path';
import Config from '@common/config';
import AsciiMath from './asciimath';
import Highlighter from './highlighter';
import Utils from './utils';

const {encodeFilePath} = Utils;

/* HELPERS */

let katex: typeof import ( 'katex' );

const initKaTeX = _.once ( () => {
  katex = require ( 'katex' );
  require ( 'katex/dist/contrib/mhchem.min.js' );
});

function renderKaTeX ( tex: string, displayMode: boolean ): string {
  initKaTeX ();
  try {
    return katex.renderToString ( tex, { ...Config.katex, displayMode } );
  } catch ( e ) {
    console.error ( `[katex] ${(e as Error).message}` );
    return displayMode ? `$$${tex}$$` : `$${tex}$`;
  }
}

function renderAsciiMathToKaTeX ( asciimath: string, displayMode: boolean ): string {
  try {
    const tex = AsciiMath.toTeX ( asciimath );
    return renderKaTeX ( tex, displayMode );
  } catch ( e ) {
    console.error ( `[asciimath] ${(e as Error).message}` );
    return displayMode ? `&&${asciimath}&&` : `&${asciimath}&`;
  }
}

/* MARKDOWN-IT INSTANCE */

const md = new MarkdownIt ({
  html: true,
  linkify: true,
  breaks: false
});

md.use ( taskLists, { enabled: true } );

/* CUSTOM FENCE RENDERER */

md.renderer.rules.fence = ( tokens, idx, options, env, self ) => {

  const token = tokens[idx];
  const info = token.info.trim ();
  const lang = info.split ( /\s+/ )[0].toLowerCase ();
  const content = token.content;

  if ( lang === 'mermaid' ) {
    const hash = ( CRC32.str ( content ) >>> 0 ).toString ();
    return (
      `<div class="mermaid-wrapper">` +
      `<div class="mermaid" data-id="mermaid-${hash}">${md.utils.escapeHtml ( content )}</div>` +
      `<div class="mermaid-open-external" title="Open in Separate Window"><i class="icon small">open_in_new</i></div>` +
      `</div>`
    );
  }

  if ( lang === 'tex' || lang === 'latex' || lang === 'katex' ) {
    return renderKaTeX ( entities.decode ( content ), true );
  }

  if ( lang === 'asciimath' ) {
    return renderAsciiMathToKaTeX ( entities.decode ( content ), true );
  }

  const resolvedLang = (Highlighter.languagesAliases as Record<string, string>)[lang] || lang;
  const highlighted = lang ? Highlighter.highlight ( content, lang ) : '';
  const codeContent = highlighted || md.utils.escapeHtml ( content );
  const langAttr = lang ? ` class="language-${resolvedLang}"` : '';
  return (
    `<div class="copy-wrapper">` +
    `<div class="copy" title="Copy code to clipboard"><i class="icon small">content_copy</i></div>` +
    `<pre><code${langAttr}>${codeContent}</code></pre>` +
    `</div>`
  );

};

/* POST-PROCESSING UTILITIES */

const postUtils = {

  codeOutputRe: /<code[^>]*?>([^]*?)<\/code>/g,
  anchorOutputRe: /<a[^>]*>(.*?)<\/a>/g,

  isInside ( re: RegExp, str: string, index: number ): boolean {
    re.lastIndex = 0;
    let match;
    while ( match = re.exec ( str ) ) {
      if ( index < match.index ) return false;
      if ( index >= match.index && index < ( match.index + match[0].length ) ) return true;
    }
    return false;
  },

  isInsideCode ( str: string, index: number ): boolean {
    return postUtils.isInside ( postUtils.codeOutputRe, str, index );
  },

  isInsideAnchor ( str: string, index: number ): boolean {
    return postUtils.isInside ( postUtils.anchorOutputRe, str, index );
  }

};

/* POST-PROCESSING STEPS */

function processCheckboxNth ( html: string ): string {
  let nth = 0;
  return html.replace ( /<input\b([^>]*)>/gm, ( match, attrs ) => {
    if ( !/\btype="checkbox"/.test ( attrs ) ) return match;
    return `<input${attrs} data-nth="${nth++}">`;
  });
}

function processKaTeX ( html: string ): string {
  // $$...$$ display mode
  html = html.replace ( /(?:\\)?\$\$(?!<)(\S(?:.*?\S)?)(?:\\)?\$\$(?!\d)/g, ( match, tex, index ) => {
    if ( match.startsWith ( '\\' ) ) return match;
    if ( postUtils.isInsideCode ( html, index ) ) return match;
    return renderKaTeX ( entities.decode ( tex ), true );
  });
  // $...$ inline mode
  html = html.replace ( /(?:\\)?\$(?!<)(\S(?:.*?\S)?)(?:\\)?\$(?!\d)/g, ( match, tex, index ) => {
    if ( match.startsWith ( '\\' ) ) return match;
    if ( postUtils.isInsideCode ( html, index ) ) return match;
    if ( postUtils.isInsideAnchor ( html, index ) ) return match;
    return renderKaTeX ( entities.decode ( tex ), false );
  });
  // Escape cleanup
  html = html.replace ( /\\\$/g, ( match, index ) => {
    if ( postUtils.isInsideCode ( html, index ) ) return match;
    return '$';
  });
  return html;
}

function processAsciiMath ( html: string ): string {
  const re = /(?:\\)?&&(?!<)(\S(?:.*?\S)?)(?:\\)?&&(?!\d)|(?:\\)?&amp;(?!<)&amp;(?!<)(\S(?:.*?\S)?)(?:\\)?&amp;(?!<)&amp;(?!\d)|(?:\\)?&(?!<|\w+;)(\S(?:.*?\S)?)(?:\\)?&(?!\d)|(?:\\)?&amp;(?!<)(\S(?:.*?\S)?)(?:\\)?&amp;(?!\d)/g;
  html = html.replace ( re, ( match, $1, $2, $3, $4, index ) => {
    if ( match.startsWith ( '\\' ) ) return match;
    if ( postUtils.isInsideCode ( html, index ) ) return match;
    if ( postUtils.isInsideAnchor ( html, index ) ) return match;
    const asciimath = $1 || $2 || $3 || $4;
    const displayMode = !!$1 || !!$2;
    return renderAsciiMathToKaTeX ( entities.decode ( asciimath ), displayMode );
  });
  // Escape cleanup
  html = html.replace ( /\\&(?:amp;)?/g, ( match, index ) => {
    if ( postUtils.isInsideCode ( html, index ) ) return match;
    if ( postUtils.isInsideAnchor ( html, index ) ) return match;
    return match.slice ( 1 );
  });
  return html;
}

function processRelativeLinks ( html: string ): string {
  const {path: attachmentsPath, token: attachmentsToken} = Config.attachments;
  const {path: notesPath, token: notesToken} = Config.notes;

  if ( !attachmentsPath || !notesPath ) return html;

  return html.replace ( /<(a|img|source)\s([^>]*?)(src|href)="(\.[^"]*)"([^>]*)>/gm, ( match, tag, before, attr, relPath, after ) => {
    const filePath = path.resolve ( notesPath, relPath );
    if ( filePath.startsWith ( attachmentsPath ) ) {
      return `<${tag} ${before}${attr}="${attachmentsToken}/${filePath.slice ( attachmentsPath.length + 1 )}"${after}>`;
    } else if ( filePath.startsWith ( notesPath ) ) {
      return `<${tag} ${before}${attr}="${notesToken}/${filePath.slice ( notesPath.length + 1 )}"${after}>`;
    } else {
      return `<${tag} ${before}${attr}="file://${encodeFilePath ( filePath )}"${after}>`;
    }
  });
}

function processAttachmentLinks ( html: string ): string {
  const {path: attachmentsPath, token} = Config.attachments;

  if ( !attachmentsPath ) return html;

  // <img>, <source>
  html = html.replace ( new RegExp ( `<(img|source)(.*?)src="${token}/([^"]+)"(.*?)>`, 'g' ), ( match, tag, before, filename, after ) => {
    filename = decodeURI ( filename );
    const filePath = path.join ( attachmentsPath, filename );
    return `<${tag}${before}src="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${filename}"${after}>`;
  });

  // Link button (empty anchor)
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)></a>`, 'g' ), ( match, before, filename, after ) => {
    filename = decodeURI ( filename );
    const basename = path.basename ( filename );
    const filePath = path.join ( attachmentsPath, filename );
    return `<a${before}href="file://${encodeFilePath ( filePath )}" class="attachment button highlight" data-filename="${filename}"${after}><i class="icon small">paperclip</i><span>${basename}</span></a>`;
  });

  // Regular link
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)>`, 'g' ), ( match, before, filename, after ) => {
    filename = decodeURI ( filename );
    const filePath = path.join ( attachmentsPath, filename );
    return `<a${before}href="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${filename}"${after}><i class="icon xsmall">paperclip</i>`;
  });

  return html;
}

function processNoteLinks ( html: string ): string {
  const {path: notesPath, token} = Config.notes;

  if ( !notesPath ) return html;

  // Link button (empty anchor)
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)></a>`, 'g' ), ( match, before, notePath, after ) => {
    notePath = decodeURI ( notePath );
    const basename = path.basename ( notePath );
    const filePath = path.join ( notesPath, notePath );
    return `<a${before}href="file://${encodeFilePath ( filePath )}" class="note button highlight" data-filepath="${filePath}"${after}><i class="icon small">note</i><span>${basename}</span></a>`;
  });

  // Regular link
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)>`, 'g' ), ( match, before, notePath, after ) => {
    notePath = decodeURI ( notePath );
    const filePath = path.join ( notesPath, notePath );
    return `<a${before}href="file://${encodeFilePath ( filePath )}" class="note" data-filepath="${filePath}"${after}><i class="icon xsmall">note</i>`;
  });

  return html;
}

function processTagLinks ( html: string ): string {
  const {token} = Config.tags;

  // Link button (empty anchor)
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)></a>`, 'g' ), ( match, before, tagName, after ) => {
    tagName = decodeURI ( tagName );
    return `<a${before}href="#" class="tag button highlight" data-tag="${tagName}"${after}><i class="icon small">tag</i><span>${tagName}</span></a>`;
  });

  // Regular link
  html = html.replace ( new RegExp ( `<a(.*?)href="${token}/([^"]+)"(.*?)>`, 'g' ), ( match, before, tagName, after ) => {
    tagName = decodeURI ( tagName );
    return `<a${before}href="#" class="tag" data-tag="${tagName}"${after}><i class="icon xsmall">tag</i>`;
  });

  return html;
}

function processTargetBlankLinks ( html: string ): string {
  return html.replace ( /<a(.*?)href="(.*?)>/g, ( match, attrs, href ) => {
    if ( href.startsWith ( '#' ) ) return match;
    return `<a${attrs}target="_blank" href="${href}>`;
  });
}

function processNoProtocolLinks ( html: string ): string {
  return html.replace ( /<a(.*?)href="(.*?)>/g, ( match, attrs, href ) => {
    if ( href.startsWith ( '#' ) || isAbsoluteUrl ( href ) ) return match;
    return `<a${attrs}href="https://${href}>`;
  });
}

function postProcess ( html: string ): string {
  html = processCheckboxNth ( html );
  html = processKaTeX ( html );
  html = processAsciiMath ( html );
  html = processRelativeLinks ( html );
  html = processAttachmentLinks ( html );
  html = processNoteLinks ( html );
  html = processTagLinks ( html );
  html = processTargetBlankLinks ( html );
  html = processNoProtocolLinks ( html );
  return html;
}

/* PRE-PROCESSING */

function preprocessWikilinks ( str: string ): string {

  const {ext, re, token} = Config.notes;

  return str.replace ( /\[\[([^|\]]+?)(?:\|([^\]]+?))?\]\]/g, ( match, title, display, index ) => {
    const codeLanguageRe = /(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm;
    codeLanguageRe.lastIndex = 0;
    let codeMatch;
    while ( codeMatch = codeLanguageRe.exec ( str ) ) {
      if ( index < codeMatch.index ) break;
      if ( index >= codeMatch.index && index < ( codeMatch.index + codeMatch[0].length ) ) return match;
    }
    const label = display || title;
    const isNotePath = re.test ( title );
    const href = encodeFilePath ( `${token}/${title}${isNotePath ? '' : ext}` );
    return `[${label}](${href})`;
  });

}

/* MARKDOWN */

const Markdown = {

  re: /_.*?_|\*.*?\*|~.*?~|`.*?`|<.*?>|:\w+?:|^\s*>|^\s*#|\[.*?\]|--|==|```|~~~|^\s*\d+\.|^\s*[*+-]\s|\n\s*\n/m,

  extensions: {

    utilities: {

      checkboxLanguageRe: /^(\s*[*+-][ \t]+\[(?:x|X| )?\])(?!\[|\()/gm,
      checkboxCheckmarkRe: /\[([^\]]*?)\]/g,
      checkboxCheckedRe: /\[(x|X)\]/g,
      codeLanguageRe: /(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,

      isInsideCode ( str: string, index: number ): boolean {
        const re = Markdown.extensions.utilities.codeLanguageRe;
        re.lastIndex = 0;
        let match;
        while ( match = re.exec ( str ) ) {
          if ( index < match.index ) return false;
          if ( index >= match.index && index < ( match.index + match[0].length ) ) return true;
        }
        return false;
      },

      toggleCheckbox ( str: string, nth: number, force?: boolean ): string {

        const {checkboxLanguageRe, checkboxCheckmarkRe, checkboxCheckedRe} = Markdown.extensions.utilities;

        checkboxLanguageRe.lastIndex = 0;

        let checkbox, nthCurrent = -1;

        while ( checkbox = checkboxLanguageRe.exec ( str ) ) {

          if ( Markdown.extensions.utilities.isInsideCode ( str, checkbox.index ) ) continue;

          nthCurrent++;

          if ( nthCurrent !== nth ) continue;

          force = _.isBoolean ( force ) ? force : !checkboxCheckedRe.test ( checkbox[0] );

          const checkboxNext = checkbox[0].replace ( checkboxCheckmarkRe, force ? '[x]' : '[ ]' );

          return `${str.slice ( 0, checkbox.index )}${checkboxNext}${str.slice ( checkbox.index + checkbox[0].length, Infinity )}`;

        }

        return str;

      }

    }

  },

  is: ( str: string ): boolean => {

    return Markdown.re.test ( str );

  },

  render: ( str: string ): string => {

    if ( !str || !Markdown.is ( str ) ) return `<p>${str}</p>`;

    const preprocessed = preprocessWikilinks ( str );
    const html = md.render ( preprocessed.trim () );
    return postProcess ( html );

  },

  strip: ( str: string ): string => {

    if ( !str || !Markdown.is ( str ) ) return str;

    return str
      .replace ( /--+|==+|```+|~~~+/gm, '' )
      .replace ( /_.*?_|\*.*?\*|~.*?~|`.*?`/gm, match => match.slice ( 1, -1 ) )
      .replace ( /!\[[^\]]+?\]\([^)]+?\)/gm, '' )
      .replace ( /\[([^\]]+?)\](?:\([^)]+?\)|\[[^)]+?\])/gm, '$1' )
      .replace ( /\[\[([^|\]]+?)(?:\|([^\]]+?))?\]\]/gm, '$1' )
      .replace ( /^(\s*#+\s.*?)(#+\s*?$)/gm, '$1' )
      .replace ( /^(\s*)(?:>(?:\s*?>)*|#+\s|\d+\.|[*+-](?=\s)(?:\s*\[[xX ]\]\s*)?|\[[^\]]+?\]:.*)/gm, '$1' )
      .trim ();

  }

};

/* EXPORT */

export default Markdown;
