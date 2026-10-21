import { and, eq } from 'drizzle-orm';

import type { OrganisationStatus } from '@founders-coffee/core';

import type { Db } from './db.js';
import { member, organization } from './schema.js';

/**
 * A user's membership of an organisation, with the organisation's review status, in one read; null
 * when the user is not a member or there is no such organisation, which callers must not tell apart.
 */
export const readOrganisationMembership = async (
  db: Db,
  input: { organisationId: string; userId: string },
): Promise<{ status: OrganisationStatus; role: string } | null> => {
  const [row] = await db
    .select({ status: organization.status, role: member.role })
    .from(organization)
    .innerJoin(
      member,
      and(
        eq(member.organizationId, organization.id),
        eq(member.userId, input.userId),
      ),
    )
    .where(eq(organization.id, input.organisationId))
    .limit(1);
  return row ?? null;
};
