import type { UrnPointer } from '@streaming/urn-codecs';

export interface CardElement {
  kind: 'card';
  label: string;
  imageUrl?: string;
  target: UrnPointer;
}

export interface CardGroupElement {
  kind: 'card_group';
  heading: string;
  children: CardElement[];
}

export interface SwimlaneElement {
  kind: 'swimlane';
  heading: string;
  items: UrnPointer[];
}

export type SectionElement = CardGroupElement | SwimlaneElement;

export type ViewElement = CardElement | SectionElement;

export interface ViewDefinition {
  urn: string;
  title: string;
  sections: SectionElement[];
}

export function isSectionElement(element: ViewElement | null): element is SectionElement {
  return element?.kind === 'card_group' || element?.kind === 'swimlane';
}

export function isCardElement(element: ViewElement): element is CardElement {
  return element.kind === 'card';
}
