import { describe, expect, it } from 'vitest';

import {
  checkTracks,
  emptyTrack,
  trackDraftOf,
  trackFieldId,
  type TrackDraft,
} from './hackathon-tracks-form';

const BRIEF = 'Build a tool that a founder in Algiers would use every week.';

const founder: TrackDraft = {
  ...emptyTrack('a'),
  title: 'Payments',
  brief: BRIEF,
};

describe('trackDraftOf', () => {
  it('holds a saved track under its id, with one empty link to type into', () => {
    expect(
      trackDraftOf({
        id: 'trk_1',
        kind: 'founder_problem',
        title: 'Payments',
        brief: BRIEF,
        partnerName: null,
        sourceUrls: [],
      }),
    ).toEqual({
      key: 'trk_1',
      id: 'trk_1',
      kind: 'founder_problem',
      title: 'Payments',
      brief: BRIEF,
      partnerName: '',
      sourceUrls: [''],
    });
  });
});

describe('checkTracks (B-HKN-13)', () => {
  it('sends each track as the server takes it, in order, with only its kind’s fields', () => {
    const checked = checkTracks(
      [
        { ...founder, id: 'trk_1', partnerName: 'Left over' },
        {
          ...emptyTrack('b'),
          kind: 'open_source',
          title: 'Open source',
          brief: BRIEF,
          sourceUrls: [' https://github.com/djazairdev/founders.coffee ', ''],
        },
        {
          ...emptyTrack('c'),
          kind: 'partner_technology',
          title: 'Maps',
          brief: BRIEF,
          partnerName: 'Mapbox',
        },
      ],
      'en',
    );

    expect(checked).toEqual({
      ok: true,
      tracks: [
        {
          id: 'trk_1',
          track: { kind: 'founder_problem', title: 'Payments', brief: BRIEF },
        },
        {
          id: null,
          track: {
            kind: 'open_source',
            title: 'Open source',
            brief: BRIEF,
            sourceUrls: ['https://github.com/djazairdev/founders.coffee'],
          },
        },
        {
          id: null,
          track: {
            kind: 'partner_technology',
            title: 'Maps',
            brief: BRIEF,
            partnerName: 'Mapbox',
          },
        },
      ],
    });
  });

  it('names what each track needs and where to go first', () => {
    const checked = checkTracks(
      [
        founder,
        { ...emptyTrack('b'), title: 'No', brief: 'Too short' },
        {
          ...emptyTrack('c'),
          kind: 'partner_technology',
          title: 'Maps',
          brief: BRIEF,
        },
      ],
      'en',
    );

    expect(checked.ok ? null : checked.first).toEqual({
      key: 'b',
      target: trackFieldId('b', 'title'),
    });
    expect(checked.ok ? null : checked.errors).toEqual({
      b: {
        fields: {
          title: 'Give the track a title of 3 to 100 characters.',
          brief: 'Describe the track in 20 to 2,000 characters.',
        },
        sources: {},
      },
      c: {
        fields: { partnerName: 'Name the partner in 2 to 100 characters.' },
        sources: {},
      },
    });
  });

  it('puts a refused link’s message under the link the organiser typed it in', () => {
    const checked = checkTracks(
      [
        {
          ...emptyTrack('a'),
          kind: 'open_source',
          title: 'Open source',
          brief: BRIEF,
          sourceUrls: [
            '',
            'https://github.com/djazairdev/founders.coffee',
            'https://example.com/not-a-repository',
          ],
        },
      ],
      'fr',
    );

    expect(checked.ok ? null : checked.errors).toEqual({
      a: {
        fields: {},
        sources: {
          2: 'Utilisez un dépôt ou un ticket GitHub, ou un lien du Hub djazair.dev.',
        },
      },
    });
    expect(checked.ok ? null : checked.first?.target).toBe(
      trackFieldId('a', 2),
    );
  });

  it('asks an open-source track for a link, once each, in Arabic', () => {
    const none = checkTracks(
      [
        {
          ...emptyTrack('a'),
          kind: 'open_source',
          title: 'Open source',
          brief: BRIEF,
        },
      ],
      'ar',
    );
    const twice = checkTracks(
      [
        {
          ...emptyTrack('a'),
          kind: 'open_source',
          title: 'Open source',
          brief: BRIEF,
          sourceUrls: [
            'https://github.com/djazairdev/founders.coffee',
            'https://github.com/djazairdev/founders.coffee',
          ],
        },
      ],
      'ar',
    );

    for (const checked of [none, twice])
      expect(checked.ok ? null : checked.errors.a?.fields.sourceUrls).toBe(
        'أضف رابطًا واحدًا على الأقل، وكل رابط مرة واحدة.',
      );
    expect(none.ok ? null : none.first?.target).toBe(trackFieldId('a', 0));
  });
});
