import type { HackathonPullRequestStatus } from '@founders-coffee/core';

export type PublicResultInput = {
  readonly submissionId: string;
  readonly teamName: string;
  readonly title: string;
  readonly trackId: string | null;
  readonly trackTitle: string | null;
  readonly total: number | null;
  readonly rank: number | null;
  readonly trackRank: number | null;
  readonly tieNote: string | null;
  readonly disqualifiedAt: Date | null;
  readonly criteria: readonly {
    readonly criterionId: string;
    readonly name: string;
    readonly scale: number;
    readonly mean: number | null;
  }[];
  readonly pullRequestUrls: readonly string[];
};

export type PublicPullRequest = {
  readonly url: string;
  readonly status: HackathonPullRequestStatus;
};

export type PublicResult = Omit<
  PublicResultInput,
  'pullRequestUrls' | 'disqualifiedAt'
> & {
  readonly isDisqualified: boolean;
  readonly pullRequests: readonly PublicPullRequest[];
};

export type PublicWinner = {
  readonly prizeId: string;
  readonly place: number;
  readonly prizeTitle: string;
  readonly trackTitle: string | null;
  readonly title: string;
  readonly teamName: string;
  readonly isDisqualified: boolean;
};

export type PublicTrackResults = {
  readonly trackId: string;
  readonly title: string;
  readonly entries: readonly PublicResult[];
};

export type PublicResults = {
  readonly winners: readonly PublicWinner[];
  readonly overall: readonly PublicResult[];
  readonly tracks: readonly PublicTrackResults[];
};

/** The entry a prize goes to: the one holding its place, in its track or overall. */
export const prizeHolderOf = <
  Entry extends {
    readonly trackId: string | null;
    readonly rank: number | null;
    readonly trackRank: number | null;
  },
>(
  entries: readonly Entry[],
  prize: { readonly place: number; readonly trackId: string | null },
): Entry | undefined =>
  entries.find((entry) =>
    prize.trackId
      ? entry.trackId === prize.trackId && entry.trackRank === prize.place
      : entry.rank === prize.place,
  );

/** Who each prize goes to by the frozen ranks (B-PRZ-01); a prize nobody holds the place for, nobody. */
export const defaultPrizeAwardsOf = (
  entries: readonly {
    readonly submissionId: string;
    readonly trackId: string | null;
    readonly rank: number | null;
    readonly trackRank: number | null;
  }[],
  prizes: readonly {
    readonly id: string;
    readonly place: number;
    readonly trackId: string | null;
  }[],
): readonly { readonly prizeId: string; readonly submissionId: string }[] =>
  prizes.flatMap((prize) => {
    const holder = prizeHolderOf(entries, prize);
    return holder
      ? [{ prizeId: prize.id, submissionId: holder.submissionId }]
      : [];
  });

/**
 * What a hackathon's page shows of its frozen results (B-JDG-10): the entries ranked overall, the
 * unranked last; the ranks within each track; and the winner of each confirmed prize, the entry
 * the organisers gave it to, or else the one holding its place overall or in its track (B-PRZ-02). A
 * prize nobody holds that place for has no winner. An entry disqualified after the results keeps its place, marked, until its prize is
 * decided (B-SAFE-03). A pull request nobody reviewed stands as submitted. `null` until the results
 * are out.
 */
export const publicResultsOf = (input: {
  readonly results: readonly PublicResultInput[];
  readonly prizes: readonly {
    readonly id: string;
    readonly title: string;
    readonly place: number;
    readonly trackId: string | null;
    readonly awardedSubmissionId?: string | null;
  }[];
  readonly pullRequests: readonly (PublicPullRequest & {
    readonly submissionId: string;
  })[];
}): PublicResults | null => {
  if (input.results.length === 0) return null;
  const overall = input.results.map(
    ({ pullRequestUrls, disqualifiedAt, ...result }) => ({
      ...result,
      isDisqualified: disqualifiedAt !== null,
      pullRequests: pullRequestUrls.map((url) => ({
        url,
        status:
          input.pullRequests.find(
            (recorded) =>
              recorded.submissionId === result.submissionId &&
              recorded.url === url,
          )?.status ?? ('submitted' as const),
      })),
    }),
  );
  const trackIds = [
    ...new Set(
      overall.flatMap((result) =>
        result.trackId && result.trackRank !== null ? [result.trackId] : [],
      ),
    ),
  ];
  return {
    overall,
    tracks: trackIds.map((trackId) => {
      const entries = overall
        .filter(
          (result) => result.trackId === trackId && result.trackRank !== null,
        )
        .sort((a, b) => (a.trackRank ?? 0) - (b.trackRank ?? 0));
      return {
        trackId,
        title: entries[0]?.trackTitle ?? '',
        entries,
      };
    }),
    winners: input.prizes.flatMap((prize) => {
      const holder = prize.awardedSubmissionId
        ? overall.find(
            (entry) => entry.submissionId === prize.awardedSubmissionId,
          )
        : prizeHolderOf(overall, prize);
      return holder
        ? [
            {
              prizeId: prize.id,
              place: prize.place,
              prizeTitle: prize.title,
              trackTitle: prize.trackId ? holder.trackTitle : null,
              title: holder.title,
              teamName: holder.teamName,
              isDisqualified: holder.isDisqualified,
            },
          ]
        : [];
    }),
  };
};
