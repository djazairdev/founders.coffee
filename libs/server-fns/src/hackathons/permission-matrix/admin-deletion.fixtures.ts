import { ok } from '@founders-coffee/core';
import type { EmailProvider } from '@founders-coffee/email';

import { sendHackathonDraftEmailResolver } from '../../admin/hackathon-draft-email.js';
import {
  deleteHackathonResolver,
  searchHackathonsForDeletionResolver,
} from '../deletion.js';
import {
  adminOnly,
  may,
  type Operations,
  type Phase,
} from './matrix.fixtures.js';

const emailProvider: EmailProvider = {
  name: 'permission-matrix',
  send: async () => ok({ messageId: 'matrix-message' }),
};

const draftEmailOutcomes: Partial<Record<Phase, string>> = {
  draft: 'ok',
  review: 'ok',
};

export const ADMIN_DELETION_OPERATIONS: Operations = {
  findHackathonsForDeletion: {
    gate: may('moderation', 'hackathon'),
    run: ({ db, world }) =>
      searchHackathonsForDeletionResolver(db, world.eventId),
    cells: adminOnly('ok'),
  },
  sendHackathonDraftEmail: {
    gate: may('moderation', 'hackathon'),
    run: ({ db, world, userId }) =>
      sendHackathonDraftEmailResolver(
        db,
        emailProvider,
        {
          eventId: world.eventId,
          template: 'hackathon-outreach',
          recipient: 'organiser@example.com',
          locale: 'en',
        },
        { actorUserId: userId, accessSubject: 'operator@example.com' },
      ),
    cells: adminOnly('hackathon_draft_not_found', draftEmailOutcomes),
  },
  deleteAnyHackathon: {
    gate: may('moderation', 'hackathon'),
    changesWorld: true,
    run: ({ db, world, userId }) =>
      deleteHackathonResolver(db, {
        eventId: world.eventId,
        actorUserId: userId,
        accessSubject: 'operator@example.com',
      }),
    cells: adminOnly('ok'),
  },
};
