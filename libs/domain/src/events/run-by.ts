import type {
  EventOrganiserRole,
  OrganisationKind,
} from '@founders-coffee/core';

export type EventOrganiserSummary = {
  readonly name: string;
  readonly kind: OrganisationKind;
  readonly role: EventOrganiserRole;
};

export type EventRunBy =
  | { readonly kind: 'platform' }
  | { readonly kind: 'co_hosted'; readonly names: readonly string[] }
  | { readonly kind: 'community' };

/**
 * Who runs an event, from the organisations that organise it (B-EVT-19). An event led by the
 * platform's own organisation is hosted by founders.coffee, whoever co-hosts it. One organised by
 * more than one organisation is co-hosted and names every one of them, the lead first. Anything
 * else, an event with no organisation or with one, is a community event.
 */
export const eventRunBy = (
  organisers: readonly EventOrganiserSummary[],
): EventRunBy => {
  const lead = organisers.find((organiser) => organiser.role === 'lead');
  if (lead?.kind === 'platform') return { kind: 'platform' };
  if (organisers.length < 2) return { kind: 'community' };
  const coHosts = organisers.filter((organiser) => organiser !== lead);
  return {
    kind: 'co_hosted',
    names: [...(lead ? [lead] : []), ...coHosts].map(
      (organiser) => organiser.name,
    ),
  };
};
