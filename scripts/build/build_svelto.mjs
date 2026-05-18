#!/usr/bin/env node
// Replaces pacco+node-sass: compiles svelto SCSS+JS using dart-sass and concatenation.
// Reads // @require dependency comments from each file to produce a topologically-sorted bundle.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname ( fileURLToPath ( import.meta.url ) );
const projectRoot = resolve ( __dirname, '../..' );
const sveltoSrc = resolve ( projectRoot, '../svelto/src' );
const appSrc = resolve ( projectRoot, 'src/renderer/template/src' );

// Disabled svelto components that use compound @extend (removed in dart-sass 1.42+).
// These are widgets/decorators not used by Notable — safe to exclude.
const SVELTO_EXCLUDE = new Set ( [
  'decorators/attached/directions/default.scss',
  'decorators/floated/directions/default.scss',
  'decorators/highlighted/directions/default.scss',
  'decorators/spaced/directions/default.scss',
  'widgets/tabs/directions/default.scss',
  'widgets/tabs/directions/top.scss',
  'widgets/tabs/directions/bottom.scss',
  'widgets/tabs/directions/left.scss',
  'widgets/tabs/directions/right.scss',
  'widgets/tooltip/tooltip.scss',
  'widgets/shape/triangle/directions/default.scss',
  'widgets/radio/radio.scss',
  'widgets/card/directions/default.scss',
  'widgets/panel/directions/default.scss',
  'widgets/chat/message/directions/default.scss',
  'widgets/accordion/directions/default.scss',
  'widgets/emoji/actionable/actionable.scss',
  'widgets/badge/directions/defult.scss',
  'widgets/label/corner/directions/default.scss',
  'widgets/popover/affixed/affixed.scss',
  'widgets/flippable/directions/default.scss',
  'widgets/table/truncated/truncated.scss',
  'widgets/table/celled/celled.scss',
  'widgets/carousel/slide/directions/default.scss',
  'widgets/divider/linear/directions/default.scss',
  'widgets/divider/default/default.scss',
  'widgets/layout_resizable/directions/default.scss',
  'widgets/textarea/autogrow/autogrow.scss',
  'widgets/textarea/disabled/disabled.scss',
  'widgets/divider/hr/directions/default.scss',
  'widgets/icons/corner/directions/default.scss',
].map ( p => resolve ( sveltoSrc, p ) ) );

/* UTILITIES */

function findFiles ( dir, ext ) {
  const results = [];
  for ( const entry of readdirSync ( dir, { withFileTypes: true } ) ) {
    const fullPath = join ( dir, entry.name );
    if ( entry.isDirectory () ) {
      results.push ( ...findFiles ( fullPath, ext ) );
    } else if ( entry.name.endsWith ( ext ) ) {
      results.push ( fullPath );
    }
  }
  return results;
}

function parseRequires ( filePath, ext ) {
  const content = readFileSync ( filePath, 'utf-8' );
  const requires = [];
  for ( const line of content.split ( '\n' ) ) {
    const match = line.match ( /^\/\/ @(?:require|optional) (.+)$/ );
    if ( match ) {
      const dep = match[1].trim ();
      if ( dep.endsWith ( ext ) ) {
        requires.push ( dep );
      }
    }
  }
  return requires;
}

function resolveRequire ( dep, currentFile, allFileMap ) {
  // Try: relative to current file's dir
  const relToFile = resolve ( dirname ( currentFile ), dep );
  if ( allFileMap.has ( relToFile ) ) return relToFile;

  // Try: relative to svelto src root
  const relToSvelto = resolve ( sveltoSrc, dep );
  if ( allFileMap.has ( relToSvelto ) ) return relToSvelto;

  // Try: relative to app src root
  const relToApp = resolve ( appSrc, dep );
  if ( allFileMap.has ( relToApp ) ) return relToApp;

  return null; // Not found (may be @optional)
}

// Pacco's implicit ordering (reconstructed):
// 1. Files in svelto's `_/` utility directory come first (cross-cutting helpers)
// 2. Within each group (_/ vs rest): variables → functions → mixins → component files
// 3. Explicit // @require deps always override this heuristic
function isUnderHelper ( filePath ) {
  return filePath.includes ( '/_/' ) || filePath.split ( '/' ).at ( -3 ) === '_';
}

function nameTypeRank ( filePath ) {
  const name = basename ( filePath, extname ( filePath ) );
  if ( name.includes ( 'variable' ) ) return 0;
  if ( name.includes ( 'function' ) ) return 1;
  if ( name.includes ( 'mixin' ) ) return 2;
  return 3;
}

function fileRank ( filePath ) {
  const helperOffset = isUnderHelper ( filePath ) ? 0 : 4;
  return helperOffset + nameTypeRank ( filePath );
}

function topoSort ( files, ext ) {
  const allFileMap = new Map ( files.map ( f => [f, true] ) );
  const depGraph = new Map ();

  for ( const file of files ) {
    const rawDeps = parseRequires ( file, ext );
    const resolved = rawDeps.map ( dep => resolveRequire ( dep, file, allFileMap ) ).filter ( Boolean );
    depGraph.set ( file, resolved );
  }

  // Sort seed order: `_/` directory first, then by name type, then alphabetically
  const seedOrder = [...files].sort ( ( a, b ) => {
    const rankDiff = fileRank ( a ) - fileRank ( b );
    if ( rankDiff !== 0 ) return rankDiff;
    return a.localeCompare ( b );
  });

  const sorted = [];
  const visited = new Set ();
  const inStack = new Set ();

  function visit ( file ) {
    if ( visited.has ( file ) ) return;
    if ( inStack.has ( file ) ) return; // Skip cycles
    inStack.add ( file );
    for ( const dep of depGraph.get ( file ) || [] ) {
      visit ( dep );
    }
    inStack.delete ( file );
    visited.add ( file );
    sorted.push ( file );
  }

  for ( const file of seedOrder ) visit ( file );
  return sorted;
}

/* CSS BUILD */

function buildCSS () {
  console.log ( 'Building CSS...' );

  const sveltoFiles = findFiles ( sveltoSrc, '.scss' ).filter ( f => !SVELTO_EXCLUDE.has ( f ) );
  const appFiles = findFiles ( appSrc, '.scss' );

  const isBefore = f => basename ( f ).includes ( '.before.' );
  const isAfter = f => basename ( f ).includes ( '.after.' );
  const isOverride = f => basename ( f ).includes ( '.override.' );
  const isRegular = f => !isBefore ( f ) && !isAfter ( f ) && !isOverride ( f );

  // Build a map: for each svelto variable file, find the corresponding app .before.scss
  // e.g. svelto/widgets/modal/variables.scss -> app/widgets/modal/variables.before.scss
  const beforeByTarget = new Map ();
  for ( const appFile of appFiles.filter ( isBefore ) ) {
    const rel = appFile.slice ( appSrc.length + 1 ); // e.g. widgets/modal/variables.before.scss
    const sveltoCandidateName = rel.replace ( '.before.scss', '.scss' );
    const sveltoTarget = join ( sveltoSrc, sveltoCandidateName );
    beforeByTarget.set ( sveltoTarget, appFile );
  }

  const afterFiles = appFiles.filter ( isAfter );
  const overrideFiles = appFiles.filter ( isOverride );
  const regularAppFiles = appFiles.filter ( isRegular );

  // Interleave: for each svelto file, insert app's .before.scss just before it
  const sortedSvelto = topoSort ( sveltoFiles, '.scss' );
  const interleavedSvelto = [];
  for ( const sveltoFile of sortedSvelto ) {
    const before = beforeByTarget.get ( sveltoFile );
    if ( before ) interleavedSvelto.push ( before );
    interleavedSvelto.push ( sveltoFile );
  }

  const sortedAfterFiles = topoSort ( afterFiles, '.scss' );
  const sortedRegularApp = topoSort ( regularAppFiles, '.scss' );

  const allInOrder = [
    ...interleavedSvelto,
    ...sortedAfterFiles,
    ...sortedRegularApp,
    ...overrideFiles,
  ];

  const imports = allInOrder
    .map ( f => `@import '${f.replace ( /\\/g, '/' ).replace ( /\.scss$/, '' )}';` )
    .join ( '\n' );

  const distDir = resolve ( projectRoot, 'src/renderer/template/dist' );
  mkdirSync ( distDir, { recursive: true } );
  const entryFile = join ( distDir, '_svelto_bundle.scss' );
  writeFileSync ( entryFile, imports );

  const outDir = resolve ( projectRoot, 'src/renderer/template/dist/css' );
  mkdirSync ( outDir, { recursive: true } );
  const outFile = join ( outDir, 'notable.min.css' );

  const result = spawnSync (
    'npx',
    [ 'sass', entryFile, outFile, `--load-path=${projectRoot}`, '--style=compressed', '--no-source-map', '--silence-deprecation=import' ],
    { cwd: projectRoot, stdio: 'inherit', shell: true }
  );

  try { unlinkSync ( entryFile ); } catch {}

  if ( result.status !== 0 ) {
    console.error ( 'CSS build failed' );
    process.exit ( result.status || 1 );
  }

  console.log ( `CSS written to ${outFile}` );
}

/* JS BUILD */

function buildJS () {
  console.log ( 'Building JS...' );

  const sveltoJS = findFiles ( sveltoSrc, '.js' );
  const sorted = topoSort ( sveltoJS, '.js' );

  const chunks = sorted.map ( f => readFileSync ( f, 'utf-8' ) );
  const bundle = chunks.join ( '\n' );

  const outDir = resolve ( projectRoot, 'src/renderer/template/dist/javascript' );
  mkdirSync ( outDir, { recursive: true } );
  const outFile = join ( outDir, 'notable.min.js' );
  writeFileSync ( outFile, bundle );

  console.log ( `JS written to ${outFile}` );
}

/* RUN */

buildCSS ();
buildJS ();
