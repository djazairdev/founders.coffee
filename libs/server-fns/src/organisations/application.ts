import { id } from '@founders-coffee/core';
import {
  createOrganisationApplication,
  type Db,
  type Organization,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';

const MAX_ATTEMPTS = 8;

/** A fresh eight-digit suffix; the database's unique index decides whether the address is free. */
const randomSuffix = (): string => {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1));
  return String(10_000_000 + (value % 90_000_000));
};

/** Allocate the address through atomic inserts, retrying collisions without orphan memberships. */
export const createApplication = async (
  db: Db,
  userId: string,
  application: organisations.OrganisationApplication,
  marketCode: string,
): Promise<Organization | undefined> => {
  const base = organisations.suggestOrganisationSlug(application.name);
  const organisationId = id('org');
  const memberId = id('mem');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const slug =
      attempt === 0 && base
        ? base
        : organisations.organisationSlugFor(application.name, randomSuffix());
    const created = await createOrganisationApplication(db, {
      organisation: {
        ...application,
        id: organisationId,
        slug,
        marketCode,
        cityCode: null,
      },
      memberId,
      userId,
    });
    if (created) return created;
  }
  return undefined;
};
