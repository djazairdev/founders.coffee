import { z } from 'zod';

import {
  HACKATHON_CERTIFICATE_KINDS,
  type HackathonCertificateKind,
} from '@founders-coffee/core';

export const hackathonRecordEntrySchema = z.strictObject({
  title: z.string(),
  slug: z.string(),
  marketSlug: z.string(),
  kind: z.enum(HACKATHON_CERTIFICATE_KINDS),
  placements: z.array(z.string()),
  certificateCode: z.string(),
  projectSlug: z.string().nullable(),
});

export type HackathonRecordEntry = z.infer<typeof hackathonRecordEntrySchema>;

const STRONGEST_FIRST: readonly HackathonCertificateKind[] = [
  'winner',
  'participant',
  'judge',
];

/**
 * What a member's profile says about their hackathons (B-PRF-05, product decision V16): one line per
 * hackathon, the newest first, built from the certificates they still hold, so an entry disqualified
 * has already gone. It says what happened, under the strongest certificate held there, and never
 * ranks the person. A project is named only where the member is listed on its published page.
 */
export const hackathonRecordOf = (
  certificates: readonly {
    readonly eventId: string;
    readonly title: string;
    readonly slug: string;
    readonly marketSlug: string;
    readonly kind: HackathonCertificateKind;
    readonly placement: string | null;
    readonly verificationCode: string;
    readonly startsAt: Date;
  }[],
  projects: readonly { readonly eventId: string; readonly slug: string }[],
): readonly HackathonRecordEntry[] => {
  const newestFirst = [...certificates].sort(
    (a, b) => b.startsAt.getTime() - a.startsAt.getTime(),
  );
  const eventIds = [...new Set(newestFirst.map((row) => row.eventId))];
  return eventIds.flatMap((eventId) => {
    const held = newestFirst.filter((row) => row.eventId === eventId);
    const strongest = STRONGEST_FIRST.flatMap((kind) =>
      held.filter((row) => row.kind === kind),
    )[0];
    if (!strongest) return [];
    return [
      {
        title: strongest.title,
        slug: strongest.slug,
        marketSlug: strongest.marketSlug,
        kind: strongest.kind,
        placements: held.flatMap((row) =>
          row.kind === 'winner' && row.placement ? [row.placement] : [],
        ),
        certificateCode: strongest.verificationCode,
        projectSlug:
          projects.find((project) => project.eventId === eventId)?.slug ?? null,
      },
    ];
  });
};
