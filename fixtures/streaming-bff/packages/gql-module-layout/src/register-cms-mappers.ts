import { registerCmsDocMapper, registerCmsDocWithChildrenMapper } from '@streaming/core-services';
import { isCardElement } from '@streaming/layout-types';

export function registerCmsDocMappers(): void {
  registerCmsDocWithChildrenMapper('card_group', (doc, children) => ({
    kind: 'card_group',
    heading: String(doc.data.heading ?? ''),
    children: children.filter(isCardElement),
  }));

  // Generic swimlane with editor-picked items of any entity type.
  registerCmsDocMapper('swimlane', (doc) => ({
    kind: 'swimlane',
    heading: String(doc.data.heading ?? ''),
    items: ((doc.data.item_urns as string[] | undefined) ?? []).map((urn) => ({ urn })),
  }));
}
