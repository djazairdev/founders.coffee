import { beforeEach, describe, expect, it } from 'vitest';

import {
  readHostCreateDraft,
  writeHostCreateDraft,
  type HostCreateDraft,
} from './host-create-draft';

const online: HostCreateDraft = {
  step: 2,
  venue: null,
  venueName: '',
  searchValue: '',
  startsAt: new Date('2099-01-15T18:00:00Z').getTime(),
  endsAt: new Date('2099-01-15T19:00:00Z').getTime(),
  title: 'Founder meetup',
  description: 'A complete founder meetup description.',
  kind: 'meetup',
  chosenLanguages: null,
  hostAs: null,
  tags: [],
  format: 'online',
  meetingUrl: 'https://meet.example.org/founders',
};

describe('the format in a host create draft (B-EVT-10)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('keeps an online draft’s format and link', () => {
    writeHostCreateDraft('DZ', online);

    expect(readHostCreateDraft('DZ')).toEqual(online);
  });

  it('reads a draft saved before the format, as in person with no link', () => {
    window.sessionStorage.setItem(
      'fc:event-draft:DZ',
      JSON.stringify({
        ...online,
        version: 6,
        savedAt: Date.now(),
        marketCode: 'DZ',
        format: undefined,
        meetingUrl: undefined,
      }),
    );

    expect(readHostCreateDraft('DZ')).toMatchObject({
      format: 'in_person',
      meetingUrl: '',
      title: 'Founder meetup',
    });
  });

  it('writes only a link it can read back', () => {
    writeHostCreateDraft('DZ', {
      ...online,
      meetingUrl: `https://meet.example.org/${'x'.repeat(3000)}`,
    });

    expect(readHostCreateDraft('DZ')?.meetingUrl.length).toBe(2048);
  });
});
