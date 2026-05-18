
/* IMPORT */

import * as crypto from 'crypto';
import {ipcRenderer as ipc} from 'electron';
import Dialog from 'electron-dialog';
import {Container, autosuspend} from 'overstated';
import * as path from 'path';
import Config from '@common/config';
import File from '@renderer/utils/file';
import Metadata from '@renderer/utils/metadata';
import Path from '@renderer/utils/path';

/* IMPORT LAZY */

let _enexDumpModule: any;
function EnexDump ( options: any ) {
  if ( !_enexDumpModule ) _enexDumpModule = require ( 'enex-dump' );
  return _enexDumpModule ( options );
}

/* IMPORT */

class Import extends Container<ImportState, MainCTX> {

  /* CONSTRUCTOR */

  constructor () {

    super ();

    autosuspend ( this );

  }

  /* HELPERS */

  _getImportTag ( str: string ): string {

    const importId = crypto.createHash ( 'sha1' ).update ( str ).digest ( 'hex' ).slice ( 0, 4 ),
          importTag = `Import-${importId}`;

    return importTag;

  }

  _importEnex = async ( filePath: string ) => {

    const importTag = this._getImportTag ( filePath );

    await EnexDump ({
      path: {
        src: [filePath],
        dst: Config.cwd
      },
      dump: {
        tags: [importTag]
      }
    });

    const tag = await this.ctx.tag.get ( importTag );

    if ( tag ) this.ctx.tag.set ( importTag );

  }

  _importMarkdown = async ( filePath: string, importTag: string ) => {

    const notesPath = Config.notes.path;

    if ( !notesPath ) return;

    const content = await File.read ( filePath );

    if ( !content ) return;

    const metadata = Metadata.get ( content );

    if ( !metadata['tags'] ) metadata['tags'] = [];

    metadata['tags'].push ( importTag );

    const contentNext = Metadata.set ( content, metadata ),
          baseName = path.basename ( filePath ),
          {filePath: filePathNext} = await Path.getAllowedPath ( notesPath, baseName );

    File.write ( filePathNext, contentNext );

  }

  /* API */

  import = async ( filePaths: string[] ) => {

    const importTag = this._getImportTag ( filePaths.join ( '' ) );

    for ( let filePath of filePaths ) {

      const ext = path.extname ( filePath );

      switch ( ext ) {

        case '.enex':
          await this._importEnex ( filePath );
          break;

        case '.md':
        case '.mkd':
        case '.mdwn':
        case '.mdown':
        case '.markdown':
        case '.markdn':
        case '.mdtxt':
        case '.mdtext':
        case '.txt':
          await this._importMarkdown ( filePath, importTag );
          break;

        default:
          Dialog.alert ( 'Unsupported file type' );

      }

    }

  }

  select = async () => {

    const filePaths = await this.dialog ();

    return this.import ( filePaths );

  }

  dialog = async (): Promise<string[]> => {

    const filePaths: string[] = await ipc.invoke ( 'dialog:show-open-dialog', {
      title: 'Import Notes',
      buttonLabel: 'Import',
      filters: [
        { name: 'All Supported Formats', extensions: ['enex', 'md', 'mkd', 'mdwn', 'mdown', 'markdown', 'markdn', 'mdtxt', 'mdtext', 'txt'] },
        { name: 'Evernote', extensions: ['enex'] },
        { name: 'Markdown', extensions: ['md', 'mkd', 'mdwn', 'mdown', 'markdown', 'markdn', 'mdtxt', 'mdtext', 'txt'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    return filePaths || [];

  }

}

/* EXPORT */

export default Import;
