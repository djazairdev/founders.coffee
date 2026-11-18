import { describe, expect, it } from 'vitest';

import type { Topic } from '@founders-coffee/core';

import type { RepeatEventTemplate } from './api';
import { repeatDraftFrom } from './host-create-repeat';

const template: RepeatEventTemplate = {
  sourceEventId: 'evt_previous',
  marketCode: 'DZ',
  cityCode: '1',
  title: 'Founders breakfast',
  description: 'A relaxed breakfast for local founders.',
  venue: 'Café Atlas',
  venueAddress: '12 Rue des Entrepreneurs, Alger',
  latitude: 36.7538,
  longitude: 3.0588,
  languages: ['ar'],
  kind: 'meetup',
  format: 'in_person',
  meetingUrl: null,
  tags: [],
  organisationId: null,
};

describe('repeatDraftFrom', () => {
  it('copies only safe editable values and clears the schedule', () => {
    expect(repeatDraftFrom(template)).toEqual({
      step: 1,
      venue: {
        providerId: 'repeat:evt_previous',
        kind: 'address',
        name: 'Café Atlas',
        address: '12 Rue des Entrepreneurs, Alger',
        latitude: 36.7538,
        longitude: 3.0588,
      },
      venueName: 'Café Atlas',
      searchValue: '',
      startsAt: null,
      endsAt: null,
      title: 'Founders breakfast',
      description: 'A relaxed breakfast for local founders.',
      kind: 'meetup',
      hostAs: null,
      tags: [],
      format: 'in_person',
      meetingUrl: '',
      chosenLanguages: ['ar'],
    });
  });

  it('keeps the format, the link, the tags and the lead organisation (B-EVT-21)', () => {
    const draft = repeatDraftFrom({
      ...template,
      venue: null,
      venueAddress: null,
      latitude: null,
      longitude: null,
      format: 'online',
      meetingUrl: 'https://meet.example.org/founders',
      tags: ['product', 'design'],
      organisationId: 'org_lead',
    });

    expect(draft).toMatchObject({
      venue: null,
      venueName: '',
      format: 'online',
      meetingUrl: 'https://meet.example.org/founders',
      tags: ['product', 'design'],
      hostAs: 'org_lead',
    });
  });

  it('keeps both the venue and the link of a hybrid event', () => {
    const draft = repeatDraftFrom({
      ...template,
      format: 'hybrid',
      meetingUrl: 'https://meet.example.org/founders',
    });

    expect(draft.venue?.name).toBe('Café Atlas');
    expect(draft.format).toBe('hybrid');
    expect(draft.meetingUrl).toBe('https://meet.example.org/founders');
  });

  it('drops tags the event page would no longer take', () => {
    const tags = ['product', 'retired-topic'] as unknown as Topic[];

    expect(repeatDraftFrom({ ...template, tags }).tags).toEqual([]);
  });

  it('repeats a workshop as a workshop', () => {
    expect(repeatDraftFrom({ ...template, kind: 'workshop' }).kind).toBe(
      'workshop',
    );
  });

  it('holds the meetup in the languages the last one was held in', () => {
    expect(
      repeatDraftFrom({ ...template, languages: ['fr', 'ber'] })
        .chosenLanguages,
    ).toEqual(['fr', 'ber']);
  });

  it('falls back to the page language when the last one names none that can be chosen', () => {
    expect(
      repeatDraftFrom({ ...template, languages: ['xx'] }).chosenLanguages,
    ).toBeNull();
  });

  it('leaves the venue empty when the source has no complete location', () => {
    expect(
      repeatDraftFrom({ ...template, venueAddress: null, latitude: null }),
    ).toMatchObject({ venue: null, venueName: '' });
  });
});
