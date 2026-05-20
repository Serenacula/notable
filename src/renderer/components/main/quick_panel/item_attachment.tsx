
/* IMPORT */

import * as React from 'react';
import ItemRaw from './item_raw';

/* ITEM ATTACHMENT */

const ItemAttachment = ({ index, style, item }: { index: number; style: React.CSSProperties; item: AttachmentObj }) => (
  <ItemRaw index={index} style={style} item={{ icon: 'paperclip', title: item.fileName }} className="attachment" attributes={{ 'data-filename': item.fileName }} />
);

/* EXPORT */

export default ItemAttachment;
