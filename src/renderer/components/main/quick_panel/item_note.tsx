
/* IMPORT */

import * as React from 'react';
import ItemRaw from './item_raw';

/* ITEM NOTE */

const ItemNote = ({ index, style, item }: { index: number; style: React.CSSProperties; item: NoteObj }) => (
  <ItemRaw index={index} style={style} item={{ icon: 'note', title: item.metadata.title }} className="note" attributes={{ 'data-filepath': item.filePath }} />
);

/* EXPORT */

export default ItemNote;
