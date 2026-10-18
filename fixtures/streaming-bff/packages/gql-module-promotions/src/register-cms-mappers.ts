import { registerCmsDocMapper } from '@streaming/core-services';
import { toPointer } from '@streaming/urn-codecs';

export function registerCmsDocMappers(): void {
  registerCmsDocMapper('promo_card', (doc) => ({
    kind: 'card',
    label: String(doc.data.headline ?? ''),
    imageUrl: doc.data.banner_url as string | undefined,
    target: toPointer('promotion', String(doc.data.promo_id)),
  }));
}
