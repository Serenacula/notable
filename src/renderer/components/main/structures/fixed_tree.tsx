
/* IMPORT */

import * as React from 'react';
import Tree from './tree';

/* FIXED TREE */

const FixedTree = ( props: any ) => (
  <Tree {...props} isFixed={true} />
);

/* EXPORT */

export default FixedTree;
