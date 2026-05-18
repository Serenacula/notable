
/* IMPORT */

import * as React from 'react';
import {connect} from 'overstated';
import Markdown from '@renderer/utils/markdown';
import Main from '@renderer/containers/main';

/* PREVIEW */

const Preview = ({ content }) => {

  const containerRef = React.useRef<HTMLDivElement> ( null );
  const html = Markdown.render ( content );

  React.useEffect ( () => {
    const container = containerRef.current;
    if ( !container ) return;
    const mermaidNodes = container.querySelectorAll<HTMLElement> ( '.mermaid' );
    if ( !mermaidNodes.length ) return;
    try {
      const mermaid = require ( 'mermaid' );
      const Config = require ( '@common/config' ).default;
      mermaid.initialize ( { ...Config.mermaid, startOnLoad: false } );
      mermaid.init ( undefined, mermaidNodes );
    } catch ( e ) {
      console.error ( '[mermaid]', e );
    }
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
