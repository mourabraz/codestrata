import type { RestClient } from '@streaming/http-client';
import { isSectionElement, type ViewDefinition } from '@streaming/layout-types';
import { decodeUrnOfType } from '@streaming/urn-codecs';
import DataLoader from 'dataloader';
import { LRUCache } from 'lru-cache';
import { mapCmsDocument } from './cms/cms-mapper-registry';
import { getCmsDocumentByUid } from './cms/cms-retrievers';
import type { RequestInfo } from './request-info';

const viewCache = new LRUCache<string, ViewDefinition>({ max: 200, ttl: 60_000 });

/** Loads view definitions (which sections, in which order) from the CMS and maps them to layout elements. */
export class ContentDefinitionService {
  private readonly loader: DataLoader<string, ViewDefinition | null>;

  constructor(
    private readonly cmsApi: RestClient,
    private readonly request: RequestInfo,
  ) {
    this.loader = new DataLoader((urns) => Promise.all(urns.map((urn) => this.loadView(urn))));
  }

  getView(urn: string): Promise<ViewDefinition | null> {
    return this.loader.load(urn);
  }

  private async loadView(urn: string): Promise<ViewDefinition | null> {
    const { brand, region, channel, locale } = this.request;
    const cacheKey = `${brand}:${region}:${channel}:${locale}:${urn}`;
    const cached = viewCache.get(cacheKey);
    if (cached) return cached;

    const doc = await getCmsDocumentByUid(this.cmsApi, 'view', decodeUrnOfType(urn, 'view'), {
      region,
      channel,
      locale,
    });
    if (!doc) return null;

    const view: ViewDefinition = {
      urn,
      title: String(doc.data.title ?? ''),
      sections: (doc.children ?? []).map(mapCmsDocument).filter(isSectionElement),
    };
    viewCache.set(cacheKey, view);
    return view;
  }
}
