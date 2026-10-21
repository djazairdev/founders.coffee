import type { Event } from '@founders-coffee/db';

export type PublicEvent = Omit<Event, 'meetingUrl'>;

/**
 * An event as anyone may read it. A public meeting link invites strangers into an online event, so
 * every shape that leaves for a reader passes through here without it; the people going get it on
 * their own terms (B-EVT-11).
 */
export const publicEvent = <
  T extends PublicEvent & { readonly meetingUrl?: string | null },
>(
  event: T,
): Omit<T, 'meetingUrl'> => {
  const { meetingUrl: _withheld, ...rest } = event;
  void _withheld;
  return rest;
};
