/** A document as returned by the headless CMS. `type` selects the mapper that turns it into a layout element. */
export interface CmsDocument {
  id: string;
  uid: string;
  type: string;
  data: Record<string, unknown>;
  children?: CmsDocument[];
}

export interface CmsFilters {
  region: string;
  channel: string;
  locale: string;
}
