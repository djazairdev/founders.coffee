import { describe, expect, it } from 'vitest';

import { certificateGrantsOf } from './certificates.js';

const ENTRIES = [
  {
    submissionId: 'sub_a',
    teamId: 'tea_a',
    trackId: 'trk_pay',
    trackTitle: 'Payments',
    rank: 1,
    trackRank: 1,
  },
  {
    submissionId: 'sub_b',
    teamId: 'tea_b',
    trackId: 'trk_pay',
    trackTitle: 'Payments',
    rank: 2,
    trackRank: 2,
  },
];
const MEMBERS = [
  { teamId: 'tea_a', userId: 'usr_a1' },
  { teamId: 'tea_a', userId: 'usr_a2' },
  { teamId: 'tea_b', userId: 'usr_b1' },
];
const BASE = {
  entries: ENTRIES,
  teamMembers: MEMBERS,
  prizes: [],
  judges: [],
  criteriaCount: 2,
  scores: [],
  recusals: [],
};
const scoresFor = (judgeId: string, entryId: string) => [
  { judgeId, entryId },
  { judgeId, entryId },
];

describe('certificateGrantsOf', () => {
  it('gives every member of a submitted entry a participant certificate', () => {
    expect(certificateGrantsOf(BASE)).toEqual(
      ['usr_a1', 'usr_a2', 'usr_b1'].map((userId) => ({
        userId,
        kind: 'participant',
        placement: null,
      })),
    );
  });

  it('gives the holders of a prize’s place a winner certificate, overall and in a track', () => {
    const grants = certificateGrantsOf({
      ...BASE,
      prizes: [
        { title: 'First prize', place: 1, trackId: null },
        { title: 'Best runner-up', place: 2, trackId: 'trk_pay' },
        { title: 'Third prize', place: 3, trackId: null },
      ],
    });

    expect(grants.filter((grant) => grant.kind === 'winner')).toEqual([
      { userId: 'usr_a1', kind: 'winner', placement: 'First prize' },
      { userId: 'usr_a2', kind: 'winner', placement: 'First prize' },
      {
        userId: 'usr_b1',
        kind: 'winner',
        placement: 'Payments · Best runner-up',
      },
    ]);
  });

  it('gives one certificate for two prizes alike', () => {
    const grants = certificateGrantsOf({
      ...BASE,
      prizes: [
        { title: 'First prize', place: 1, trackId: null },
        { title: 'First prize', place: 1, trackId: null },
      ],
    });

    expect(grants.filter((grant) => grant.kind === 'winner')).toHaveLength(2);
  });

  it('gives a judge one only for finishing every entry they did not recuse from', () => {
    const grants = certificateGrantsOf({
      ...BASE,
      judges: [
        { id: 'jdg_done', userId: 'usr_done' },
        { id: 'jdg_recused', userId: 'usr_recused' },
        { id: 'jdg_partial', userId: 'usr_partial' },
        { id: 'jdg_away', userId: 'usr_away' },
        { id: 'jdg_all_recused', userId: 'usr_all_recused' },
      ],
      scores: [
        ...scoresFor('jdg_done', 'sub_a'),
        ...scoresFor('jdg_done', 'sub_b'),
        ...scoresFor('jdg_recused', 'sub_b'),
        ...scoresFor('jdg_partial', 'sub_a'),
        { judgeId: 'jdg_partial', entryId: 'sub_b' },
      ],
      recusals: [
        { judgeId: 'jdg_recused', entryId: 'sub_a' },
        { judgeId: 'jdg_all_recused', entryId: 'sub_a' },
        { judgeId: 'jdg_all_recused', entryId: 'sub_b' },
      ],
    });

    expect(
      grants
        .filter((grant) => grant.kind === 'judge')
        .map((grant) => grant.userId),
    ).toEqual(['usr_done', 'usr_recused']);
  });
});
