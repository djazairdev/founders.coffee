import type { HackathonCertificateKind } from '@founders-coffee/core';

import { prizeHolderOf } from './public-results.js';

export type CertificateGrant = {
  readonly userId: string;
  readonly kind: HackathonCertificateKind;
  readonly placement: string | null;
};

/**
 * Who earned what from a hackathon's results (B-CRT-01). Every member of a submitted entry took part.
 * The members of an entry holding a prize's place also won it, the placement being the prize's title
 * and its track's. A judge who accepted and scored every criterion of every entry they did not recuse
 * from, at least one, finished judging. Two prizes alike earn one certificate.
 */
export const certificateGrantsOf = (input: {
  readonly entries: readonly {
    readonly submissionId: string;
    readonly teamId: string;
    readonly trackId: string | null;
    readonly trackTitle: string | null;
    readonly rank: number | null;
    readonly trackRank: number | null;
  }[];
  readonly teamMembers: readonly {
    readonly teamId: string;
    readonly userId: string;
  }[];
  readonly prizes: readonly {
    readonly title: string;
    readonly place: number;
    readonly trackId: string | null;
  }[];
  readonly judges: readonly {
    readonly id: string;
    readonly userId: string | null;
  }[];
  readonly criteriaCount: number;
  readonly scores: readonly {
    readonly entryId: string;
    readonly judgeId: string;
  }[];
  readonly recusals: readonly {
    readonly entryId: string;
    readonly judgeId: string;
  }[];
}): readonly CertificateGrant[] => {
  const membersOf = (teamId: string) =>
    input.teamMembers.filter((member) => member.teamId === teamId);
  const participants = input.entries.flatMap((entry) =>
    membersOf(entry.teamId).map(({ userId }) => ({
      userId,
      kind: 'participant' as const,
      placement: null,
    })),
  );
  const winners = input.prizes.flatMap((prize) => {
    const holder = prizeHolderOf(input.entries, prize);
    if (!holder) return [];
    const placement =
      prize.trackId && holder.trackTitle
        ? `${holder.trackTitle} · ${prize.title}`
        : prize.title;
    return membersOf(holder.teamId).map(({ userId }) => ({
      userId,
      kind: 'winner' as const,
      placement,
    }));
  });
  const judges = input.judges.flatMap(({ id, userId }) => {
    const toScore = input.entries.filter(
      (entry) =>
        !input.recusals.some(
          (recusal) =>
            recusal.judgeId === id && recusal.entryId === entry.submissionId,
        ),
    );
    const isFinished =
      toScore.length > 0 &&
      input.criteriaCount > 0 &&
      toScore.every(
        (entry) =>
          input.scores.filter(
            (score) =>
              score.judgeId === id && score.entryId === entry.submissionId,
          ).length >= input.criteriaCount,
      );
    return userId && isFinished
      ? [{ userId, kind: 'judge' as const, placement: null }]
      : [];
  });
  const unique = new Map(
    [...participants, ...winners, ...judges].map((grant) => [
      JSON.stringify([grant.userId, grant.kind, grant.placement]),
      grant,
    ]),
  );
  return [...unique.values()];
};
