#!/usr/bin/env node
// Builds the icon font (IconFont.woff2) from SVG sources.
// Replaces icon-font-buildr by directly using its underlying packages.

import { readFileSync, writeFileSync, mkdirSync, createReadStream, createWriteStream } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const __dirname = dirname ( fileURLToPath ( import.meta.url ) );
const projectRoot = resolve ( __dirname, '../..' );

async function buildFont () {
  const config = JSON.parse ( readFileSync ( join ( projectRoot, 'icon_font.json' ), 'utf-8' ) );
  const iconsDir = resolve ( projectRoot, 'resources/font_icons' );
  const outDir = resolve ( projectRoot, config.output.fonts );
  const fontName = config.output.fontName;

  mkdirSync ( outDir, { recursive: true } );

  const tempDir = join ( tmpdir (), randomUUID () );
  mkdirSync ( tempDir, { recursive: true } );

  const svgFontPath = join ( tempDir, `${fontName}.svg` );
  const ttfPath = join ( tempDir, `${fontName}.ttf` );
  const woff2Path = join ( outDir, `${fontName}.woff2` );

  const { SVGIcons2SVGFontStream: svgicons2svgfont } = await import ( 'svgicons2svgfont' );
  const wawoff2 = await import ( 'wawoff2' );

  // Step 1: SVG icons → SVG font
  console.log ( 'Building SVG font...' );
  await new Promise ( ( res, rej ) => {
    const stream = new svgicons2svgfont ({
      centerHorizontally: true,
      fontHeight: 4096,
      fontName,
      normalize: true,
      log: () => {}
    });

    stream
      .pipe ( createWriteStream ( svgFontPath ) )
      .on ( 'finish', res )
      .on ( 'error', rej );

    for ( const iconName of config.icons ) {
      const iconPath = join ( iconsDir, `${iconName}.svg` );
      const glyph = createReadStream ( iconPath );
      const ligature = iconName.replace ( /-/g, '_' );
      glyph['metadata'] = { unicode: [ligature], name: iconName };
      stream.write ( glyph );
    }

    stream.end ();
  });

  // Step 2: SVG font → TTF
  console.log ( 'Converting to TTF...' );
  const ttfResult = spawnSync ( 'npx', ['svg2ttf', svgFontPath, ttfPath], { shell: true, stdio: 'inherit' } );
  if ( ttfResult.status !== 0 ) {
    console.error ( 'svg2ttf failed' );
    process.exit ( ttfResult.status || 1 );
  }

  // Step 3: TTF → WOFF2
  console.log ( 'Converting to WOFF2...' );
  const ttf = readFileSync ( ttfPath );
  const compress = wawoff2.compress ?? wawoff2.default?.compress;
  const woff2 = await compress ( ttf );
  writeFileSync ( woff2Path, woff2 );

  console.log ( `Font written to ${woff2Path}` );
}

buildFont ().catch ( err => {
  console.error ( err );
  process.exit ( 1 );
});
