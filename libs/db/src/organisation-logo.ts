import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { markets, member, organization } from './schema.js';

/** Replace a logo only while the active organiser and the editor still match the read. */
export const replaceOrganisationLogo = async (
  db: Db,
  input: {
    organisationId: string;
    userId: string;
    previous: string | null;
    expectedRole: string;
    logo: string | null;
  },
): Promise<boolean> => {
  const rows = await db
    .update(organization)
    .set({ logo: input.logo })
    .where(
      and(
        eq(organization.id, input.organisationId),
        eq(organization.status, 'approved'),
        input.previous === null
          ? isNull(organization.logo)
          : eq(organization.logo, input.previous),
        sql`exists (select 1 from ${member} where ${member.organizationId} = ${organization.id} and ${member.userId} = ${input.userId} and ${member.role} = ${input.expectedRole})`,
        sql`exists (select 1 from ${markets} where ${markets.code} = ${organization.marketCode} and json_type(${markets.featureFlags}, '$.hackathons') = 'true')`,
      ),
    )
    .returning({ id: organization.id });
  return rows.length === 1;
};

/** Read only the currently attached logo of an active organiser in an enabled market. */
export const readOrganisationLogo = async (
  db: Db,
  organisationId: string,
): Promise<string | null> => {
  const [row] = await db
    .select({ logo: organization.logo })
    .from(organization)
    .innerJoin(markets, eq(markets.code, organization.marketCode))
    .where(
      and(
        eq(organization.id, organisationId),
        eq(organization.status, 'approved'),
        inArray(markets.state, ['open', 'active']),
        sql`json_type(${markets.featureFlags}, '$.hackathons') = 'true'`,
      ),
    )
    .limit(1);
  return row?.logo ?? null;
};
