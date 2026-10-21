import { isEventOrganiser, type Db, type Event } from '@founders-coffee/db';

/**
 * The meeting link this reader may have, or `null`.
 *
 * A public link invites strangers and spam into an online event, so it goes only to the people the
 * event is for: its host, always, and while it is published, the members going and the members of
 * an organisation that organises it. A reader who is signed out, or anyone else, gets `null`. The
 * host and the members going are known from what the page already read, so only another signed-in
 * reader of an event with a link costs the one read for organisers.
 */
export const meetingLinkFor = async (
  db: Db,
  event: Pick<Event, 'id' | 'hostId' | 'status' | 'meetingUrl'>,
  viewer: { readonly id: string | null | undefined; readonly isGoing: boolean },
): Promise<string | null> => {
  if (event.meetingUrl === null || !viewer.id) return null;
  if (event.hostId === viewer.id) return event.meetingUrl;
  if (event.status !== 'published') return null;
  if (viewer.isGoing) return event.meetingUrl;
  return (await isEventOrganiser(db, { eventId: event.id, userId: viewer.id }))
    ? event.meetingUrl
    : null;
};
