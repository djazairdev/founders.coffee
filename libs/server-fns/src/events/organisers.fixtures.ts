import {
  eventOrganisers,
  member,
  organization,
  user,
  type Db,
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

/** An approved organisation in Algeria with this member in it. */
export const organisation = async (db: Db, id: string, memberId: string) => {
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

/** Name the organisation as a co-host of the event. */
export const coOrganise = (db: Db, eventId: string, organisationId: string) =>
  db
    .insert(eventOrganisers)
    .values({ eventId, organisationId, role: 'co_host' })
    .run();
