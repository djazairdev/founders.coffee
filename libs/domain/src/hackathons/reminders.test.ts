import { describe, expect, it } from 'vitest';

import { hackathonReminders } from './reminders.js';

const timeline = {
  registrationOpensAt: Date.parse('2099-01-01T00:00:00Z'),
  registrationClosesAt: Date.parse('2099-01-10T00:00:00Z'),
  kickoffAt: Date.parse('2099-01-15T09:00:00Z'),
  submissionDeadlineAt: Date.parse('2099-01-16T12:00:00Z'),
  endsAt: Date.parse('2099-01-16T18:00:00Z'),
  judgingEndsAt: Date.parse('2099-01-20T18:00:00Z'),
};

describe('hackathon reminders (B-HKN-21)', () => {
  it('times each reminder from the dates, for the organisers or the participants', () => {
    expect(
      hackathonReminders(timeline).map((reminder) => ({
        ...reminder,
        sendAt: new Date(reminder.sendAt).toISOString(),
      })),
    ).toEqual([
      {
        templateKey: 'hackathon_registration_closing',
        audience: 'organisers',
        sendAt: '2099-01-09T00:00:00.000Z',
      },
      {
        templateKey: 'hackathon_kickoff',
        audience: 'participants',
        sendAt: '2099-01-15T08:00:00.000Z',
      },
      {
        templateKey: 'hackathon_deadline_24h',
        audience: 'participants',
        sendAt: '2099-01-15T12:00:00.000Z',
      },
      {
        templateKey: 'hackathon_deadline_1h',
        audience: 'participants',
        sendAt: '2099-01-16T11:00:00.000Z',
      },
      {
        templateKey: 'hackathon_judging_open',
        audience: 'organisers',
        sendAt: '2099-01-16T12:00:00.000Z',
      },
    ]);
  });
});
