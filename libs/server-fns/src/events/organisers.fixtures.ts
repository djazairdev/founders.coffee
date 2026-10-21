import {
  eventOrganisers,
  member,
  organization,
  user,
  type Db,
  type Organization,
} from '@founders-coffee/db';

/** A member account with this id, made once however often it is asked for. */
export const signUp = (db: Db, id: string) =>
  db
    .insert(user)
    .values({
      id,
      name: id,
      email: `${id}@test.coffee`,
      emailVerified: true,
      role: 'member',
    })
    .onConflictDoNothing()
    .run();

/** An approved organisation in Algeria with this member in it, unless told otherwise. */
export const organisation = async (
  db: Db,
  id: string,
  memberId: string,
  overrides: Partial<Pick<Organization, 'name' | 'kind' | 'status'>> = {},
) => {
  await db
    .insert(organization)
    .values({
      id,
      name: `Organisation ${id}`,
      slug: id,
      kind: 'club',
      status: 'approved',
      marketCode: 'DZ',
      description: 'Weekly coding evenings for students in Algiers.',
      ...overrides,
    })
    .onConflictDoNothing();
  await db
    .insert(member)
    .values({
      id: `mem_${id}`,
      organizationId: id,
      userId: memberId,
      role: 'member',
    })
    .onConflictDoNothing();
};

/** Name the organisation as an organiser of the event, a co-host unless told otherwise. */
export const coOrganise = (
  db: Db,
  eventId: string,
  organisationId: string,
  role: 'lead' | 'co_host' = 'co_host',
) => db.insert(eventOrganisers).values({ eventId, organisationId, role }).run();
