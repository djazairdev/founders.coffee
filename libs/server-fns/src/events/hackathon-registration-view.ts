import type {
  AttendanceMode,
  HackathonRegistrationStatus,
} from '@founders-coffee/core';
import { readHackathonRegistration, type Db } from '@founders-coffee/db';

export type HackathonRegistrationView = {
  readonly isFull: boolean;
  readonly viewer: {
    readonly status: HackathonRegistrationStatus;
    readonly attendanceMode: AttendanceMode;
  } | null;
};

/**
 * What a hackathon page's registration card needs (B-REG-06): whether every place is taken, so a
 * new registration joins the waitlist, and the reader's own registration, read only for a reader
 * who is signed in. `null` for anything but a hackathon with its details.
 */
export const hackathonRegistrationView = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly places: {
      readonly capacity: number | null;
      readonly registeredCount: number;
    } | null;
    readonly viewerId: string | undefined;
  },
): Promise<HackathonRegistrationView | null> => {
  if (!input.places) return null;
  const { capacity, registeredCount } = input.places;
  return {
    isFull: capacity !== null && registeredCount >= capacity,
    viewer: input.viewerId
      ? await readHackathonRegistration(db, {
          eventId: input.eventId,
          userId: input.viewerId,
        })
      : null,
  };
};
