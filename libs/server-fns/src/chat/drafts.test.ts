import { beforeEach, describe, expect, it } from 'vitest';

import { type Result } from '@founders-coffee/core';
import { eq, events, type Db } from '@founders-coffee/db';

import {
  goingMember,
  HOST_ID,
  publishMeetup,
  setupDb,
} from './chat.fixtures.js';
import {
  listChatMessagesResolver,
  sendChatMessageResolver,
} from './messages.js';

const codeOf = (result: Result<unknown>) =>
  result.ok ? 'ok' : result.error.code;

describe('the chat of a draft (real D1 via Miniflare, B-EVT-16)', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
  });

  const send = (eventId: string, authorId: string) =>
    sendChatMessageResolver(db, {
      eventId,
      authorId,
      body: 'Salam',
      clientId: crypto.randomUUID(),
    });

  const read = (eventId: string, viewerId: string) =>
    listChatMessagesResolver(db, { eventId, viewerId, limit: 50 });

  it('has no members, its host included, until it is published', async () => {
    const eventId = await publishMeetup(db, { status: 'draft' });
    const member = await goingMember(db, eventId);

    expect(codeOf(await send(eventId, HOST_ID))).toBe('chat_not_member');
    expect(codeOf(await send(eventId, member))).toBe('chat_not_member');
    expect(codeOf(await read(eventId, HOST_ID))).toBe('chat_not_member');

    await db
      .update(events)
      .set({ status: 'published' })
      .where(eq(events.id, eventId))
      .run();

    expect(codeOf(await send(eventId, member))).toBe('ok');
    expect(codeOf(await read(eventId, HOST_ID))).toBe('ok');
  });
});
