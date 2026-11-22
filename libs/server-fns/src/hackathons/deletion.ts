import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  deleteHackathon,
  searchHackathonsForDeletion,
  type Db,
  type HackathonDeletionCandidate,
} from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

export type HackathonDeleted = { readonly eventId: string };

export const searchHackathonsForDeletionResolver = (
  db: Db,
  query: string,
): Promise<Result<readonly HackathonDeletionCandidate[]>> =>
  searchHackathonsForDeletion(db, query).then(ok);

export const deleteHackathonResolver = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly organisationId?: string;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
  },
): Promise<Result<HackathonDeleted>> => {
  const isDeleted = await deleteHackathon(db, {
    ...input,
    auditId: id('aud'),
  });
  if (!isDeleted) return err(new AppError('not_found', 'Hackathon not found'));
  logger.info('hackathon.deleted', { eventId: input.eventId });
  return ok({ eventId: input.eventId });
};
