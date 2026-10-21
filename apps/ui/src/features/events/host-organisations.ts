import type { OrganisationView } from './api';

export type HostOrganisation = { readonly id: string; readonly name: string };

/**
 * The organisations a member can host this market's event as: approved ones in the same market.
 * A pending or rejected organisation cannot host yet, and one in another market cannot host here.
 */
export const hostableOrganisations = (
  organisations: readonly OrganisationView[] | undefined,
  marketCode: string,
): HostOrganisation[] =>
  (organisations ?? [])
    .filter(
      (organisation) =>
        organisation.status === 'approved' &&
        organisation.marketCode === marketCode,
    )
    .map(({ id, name }) => ({ id, name }));

/**
 * The organisation the event is hosted as, or `null` for the member themself. A choice saved in a
 * draft for an organisation the member no longer belongs to falls back to themself.
 */
export const chosenHostOrganisation = (
  hostAs: string | null,
  organisations: readonly HostOrganisation[],
): HostOrganisation | null =>
  organisations.find((organisation) => organisation.id === hostAs) ?? null;
