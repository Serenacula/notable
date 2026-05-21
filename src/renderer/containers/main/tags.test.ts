
import { describe, it, expect } from 'vitest';
import Tags from './tags';
import { TagSpecials, TagSpecialsNames } from '@renderer/utils/tags';

const { ALL, FAVORITES, UNTAGGED, TRASH, NOTEBOOKS, TEMPLATES, TAGS: TAGS_SPECIAL } = TagSpecials;

function makeNote(overrides: {
  filePath?: string;
  checksum?: number;
  deleted?: boolean;
  favorited?: boolean;
  tags?: string[];
} = {}): NoteObj {
  return {
    filePath: overrides.filePath ?? '/notes/test.md',
    checksum: overrides.checksum ?? 1234,
    content: '',
    plainContent: '',
    metadata: {
      attachments: [],
      created: new Date(),
      modified: new Date(),
      deleted: overrides.deleted ?? false,
      favorited: overrides.favorited ?? false,
      pinned: false,
      stat: {} as import('fs').Stats,
      tags: overrides.tags ?? [],
      title: 'Test'
    }
  };
}

function makeTagsStructure(): any {
  return {
    [ALL]:          { path: ALL,          name: TagSpecialsNames.ALL,          collapsed: false, notes: [], tags: {} },
    [FAVORITES]:    { path: FAVORITES,    name: TagSpecialsNames.FAVORITES,    collapsed: false, notes: [], tags: {} },
    [NOTEBOOKS]:    { path: NOTEBOOKS,    name: TagSpecialsNames.NOTEBOOKS,    collapsed: false, notes: [], tags: {} },
    [TAGS_SPECIAL]: { path: TAGS_SPECIAL, name: TagSpecialsNames.TAGS,         collapsed: false, notes: [], tags: {} },
    [TEMPLATES]:    { path: TEMPLATES,    name: TagSpecialsNames.TEMPLATES,    collapsed: false, notes: [], tags: {} },
    [UNTAGGED]:     { path: UNTAGGED,     name: TagSpecialsNames.UNTAGGED,     collapsed: false, notes: [], tags: {} },
    [TRASH]:        { path: TRASH,        name: TagSpecialsNames.TRASH,        collapsed: false, notes: [], tags: {} }
  };
}

function makeContainer() {
  const container = new Tags();
  (container as any).ctx = {
    note: {
      isDeleted: (note: NoteObj) => note.metadata.deleted,
      getTags: (note: NoteObj, prefix?: string) => {
        const tags = note.metadata.tags;
        if (!prefix) return tags;
        return tags.filter((tag: string) => tag === prefix || tag.startsWith(prefix + '/'));
      },
      isFavorited: (note: NoteObj) => note.metadata.favorited
    },
    tag: {
      isCollapsed: () => false
    }
  };
  return container;
}

describe('Tags._toggleNote', () => {
  it('adds a plain note to ALL and UNTAGGED', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote();

    container._toggleNote(tags, note, true);

    expect(tags[ALL].notes).toContain(note);
    expect(tags[UNTAGGED].notes).toContain(note);
    expect(tags[FAVORITES].notes).not.toContain(note);
    expect(tags[TRASH].notes).not.toContain(note);
  });

  it('adds a favorited note to FAVORITES as well as ALL', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote({ favorited: true });

    container._toggleNote(tags, note, true);

    expect(tags[ALL].notes).toContain(note);
    expect(tags[FAVORITES].notes).toContain(note);
  });

  it('adds a deleted note only to TRASH, not to ALL', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote({ deleted: true });

    container._toggleNote(tags, note, true);

    expect(tags[TRASH].notes).toContain(note);
    expect(tags[ALL].notes).not.toContain(note);
    expect(tags[UNTAGGED].notes).not.toContain(note);
  });

  it('removes a note when add=false', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote();

    container._toggleNote(tags, note, true);
    expect(tags[ALL].notes).toHaveLength(1);

    container._toggleNote(tags, note, false);
    expect(tags[ALL].notes).toHaveLength(0);
    expect(tags[UNTAGGED].notes).toHaveLength(0);
  });

  it('adds a tagged note to the correct user tag and to TAGS', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote({ tags: ['work'] });

    container._toggleNote(tags, note, true);

    expect(tags[ALL].notes).toContain(note);
    expect(tags[UNTAGGED].notes).not.toContain(note);
    expect(tags['work'].notes).toContain(note);
    expect(tags[TAGS_SPECIAL].notes).toContain(note);
  });

  it('does not add a template note to ALL', () => {
    const container = makeContainer();
    const tags = makeTagsStructure();
    const note = makeNote({ tags: ['Templates/my-template'] });

    container._toggleNote(tags, note, true);

    expect(tags[ALL].notes).not.toContain(note);
    expect(tags[TEMPLATES].tags['my-template'].notes).toContain(note);
  });

  it('regression: findIndex removes a cloned note that shares checksum and filePath', () => {
    // Before the Phase 7 fix, _toggleNote used indexOf(note) which fails for
    // cloned objects (different reference). Now it uses findIndex with checksum+filePath.
    const container = makeContainer();
    const tags = makeTagsStructure();
    const original = makeNote({ filePath: '/notes/unique.md', checksum: 9999 });

    container._toggleNote(tags, original, true);
    expect(tags[ALL].notes).toHaveLength(1);

    // Clone the note — same data, different object reference
    const cloned = { ...original, metadata: { ...original.metadata } };
    expect(cloned).not.toBe(original);
    expect(cloned.filePath).toBe(original.filePath);
    expect(cloned.checksum).toBe(original.checksum);

    container._toggleNote(tags, cloned, false);
    // With indexOf (old bug), cloned !== original so indexOf returns -1 and nothing is removed.
    // With findIndex by checksum+filePath, the note is found and removed correctly.
    expect(tags[ALL].notes).toHaveLength(0);
    expect(tags[UNTAGGED].notes).toHaveLength(0);
  });
});
