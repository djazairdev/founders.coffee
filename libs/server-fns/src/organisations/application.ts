import { id } from '@founders-coffee/core';
import {
  createOrganisationApplication,
  type Db,
  type Organization,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';

const MAX_ATTEMPTS = 8;
const RANDOM_SUFFIX_RANGE = 90_000_000;
const RANDOM_SUFFIX_LIMIT =
  Math.floor(0x1_0000_0000 / RANDOM_SUFFIX_RANGE) * RANDOM_SUFFIX_RANGE;

/** A fresh eight-digit suffix; the database's unique index decides whether the address is free. */
const randomSuffix = (): string => {
  let value = RANDOM_SUFFIX_LIMIT;
  while (value >= RANDOM_SUFFIX_LIMIT) {
    const [candidate = RANDOM_SUFFIX_LIMIT] = crypto.getRandomValues(
      new Uint32Array(1),
    );
    value = candidate;
  }
  return String(10_000_000 + (value % RANDOM_SUFFIX_RANGE));
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
