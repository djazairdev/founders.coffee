import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  listPublicEventHosts,
  readOrganisationPageRows,
  type Db,
  type PublicOrganisation,
} from '@founders-coffee/db';
import { markets } from '@founders-coffee/domain';

import {
  attachCityNames,
  readEventOrganisers,
  type EventFeedItemBase,
} from '../events/feed.js';

export const ORGANISATION_PAGE_EVENT_LIMIT = 12;

export type OrganisationPage = {
  readonly organisation: PublicOrganisation;
  readonly upcoming: readonly EventFeedItemBase[];
  readonly past: readonly EventFeedItemBase[];
};

/**
 * An approved organisation's public page by its slug (B-ORG-11): what it is, and the events it
 * organises, the next twelve and the last twelve. Anything the page does not show, a pending or
 * suspended organisation or one in a market visitors cannot see, answers as not found.
 */
export const organisationPageResolver = async (
  db: Db,
  slug: string,
  now: Date = new Date(),
): Promise<Result<OrganisationPage>> => {
  const rows = await readOrganisationPageRows(db, {
    slug,
    marketStates: markets.VISIBLE_STATES,
    limit: ORGANISATION_PAGE_EVENT_LIMIT,
    now,
  });
  if (!rows.organisation)
    return err(
      new AppError('organisation_not_found', 'No organisation at this address'),
    );
  const all = [...rows.upcoming, ...rows.past];
  const [hosts, organisers] = await Promise.all([
    listPublicEventHosts(
      db,
      all.map((event) => event.hostId),
    ),
    readEventOrganisers(
      db,
      all.map((event) => event.id),
    ),
  ]);
  const hostMap = new Map(hosts.map((host) => [host.userId, host]));
  return ok({
    organisation: rows.organisation,
    upcoming: attachCityNames(rows.upcoming, hostMap, organisers),
    past: attachCityNames(rows.past, hostMap, organisers),
  });
};
