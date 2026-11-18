import {
  ok,
  type HackathonCertificateKind,
  type Result,
} from '@founders-coffee/core';
import { readCertificatePage, type Db } from '@founders-coffee/db';

export type OwnCertificate = {
  readonly code: string;
  readonly kind: HackathonCertificateKind;
  readonly placement: string | null;
};

export type CertificatePage =
  | { readonly status: 'unknown' | 'revoked' }
  | {
      readonly status: 'valid';
      readonly memberName: string;
      readonly kind: HackathonCertificateKind;
      readonly placement: string | null;
      readonly hackathonTitle: string;
      readonly startsAt: number;
      readonly endsAt: number | null;
      readonly timeZone: string;
      readonly organisers: readonly string[];
    };

/**
 * What a certificate's code proves, for anyone who has it (B-CRT-02). A revoked certificate says only
 * that: it no longer shows who held it or what for. A code never issued is not an error, since saying
 * so is what the page is for.
 */
export const certificatePageResolver = async (
  db: Db,
  code: string,
): Promise<Result<CertificatePage>> => {
  const row = await readCertificatePage(db, code);
  if (!row) return ok({ status: 'unknown' });
  if (row.revokedAt) return ok({ status: 'revoked' });
  return ok({
    status: 'valid',
    memberName: row.memberName,
    kind: row.kind,
    placement: row.placement,
    hackathonTitle: row.hackathonTitle,
    startsAt: row.startsAt.getTime(),
    endsAt: row.endsAt?.getTime() ?? null,
    timeZone: row.timeZone,
    organisers: row.organisers,
  });
};
