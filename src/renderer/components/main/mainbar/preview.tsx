
/* IMPORT */

import * as React from 'react';
import {connect} from 'overstated';
import Config from '@common/config';
import Markdown from '@renderer/utils/markdown';
import Main from '@renderer/containers/main';

/* PREVIEW */

const Preview = ({ content }: { content: string }) => {

  const containerRef = React.useRef<HTMLDivElement> ( null );
  const html = Markdown.render ( content );

  React.useEffect ( () => {
    const container = containerRef.current;
    if ( !container ) return;
    const mermaidNodes = container.querySelectorAll<HTMLElement> ( '.mermaid' );
    if ( !mermaidNodes.length ) return;
    let cancelled = false;
    void import ( 'mermaid' ).then ( async ( { default: mermaid } ) => {
      if ( cancelled ) return;
      mermaid.initialize ( { ...Config.mermaid, startOnLoad: false } );
      await mermaid.run ( { nodes: Array.from ( mermaidNodes ) } );
    } ).catch ( e => console.error ( '[mermaid]', e ) );
    return () => { cancelled = true; };
  });

  return <div ref={containerRef} className="layout-content preview" dangerouslySetInnerHTML={{ __html: html }}></div>;

};

/* EXPORT */

export default connect ({
  container: Main,
  selector: ({ container, content }) => ({
    content: content || container.note.getPlainContent ()
  })
})( Preview );
