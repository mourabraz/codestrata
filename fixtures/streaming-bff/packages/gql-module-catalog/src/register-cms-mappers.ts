import { registerCmsDocMapper } from '@streaming/core-services';
import { toPointer } from '@streaming/urn-codecs';

export function registerCmsDocMappers(): void {
  // A rail of titles picked by an editor.
  registerCmsDocMapper('title_rail', (doc) => ({
    kind: 'swimlane',
    heading: String(doc.data.heading ?? ''),
    items: ((doc.data.title_ids as string[] | undefined) ?? []).map((id) => toPointer('title', id)),
  }));

  // A single title promoted as a card inside a card group.
  registerCmsDocMapper('title_card', (doc) => ({
    kind: 'card',
    label: String(doc.data.label ?? ''),
    imageUrl: doc.data.image_url as string | undefined,
    target: toPointer('title', String(doc.data.title_id)),
  }));
}
