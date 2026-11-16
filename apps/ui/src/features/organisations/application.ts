import { organisations } from '@founders-coffee/domain';

import type { ApplyForOrganisationRequest } from './api';

export type ApplicantKind = ApplyForOrganisationRequest['kind'];

export const APPLICANT_KINDS = organisations.applicantOrganisationKindSchema
  .options as readonly ApplicantKind[];

export const NAME_LENGTH = {
  min: organisations.ORGANISATION_NAME_MIN_LENGTH,
  max: organisations.ORGANISATION_NAME_MAX_LENGTH,
};
export const DESCRIPTION_LENGTH = {
  min: organisations.ORGANISATION_DESCRIPTION_MIN_LENGTH,
  max: organisations.ORGANISATION_DESCRIPTION_MAX_LENGTH,
};

export type ApplicationField = 'name' | 'kind' | 'description' | 'websiteUrl';

export type ApplicationDraft = {
  readonly name: string;
  readonly kind: ApplicantKind | '';
  readonly description: string;
  readonly websiteUrl: string;
};

export const FIELD_ORDER: readonly ApplicationField[] = [
  'name',
  'kind',
  'description',
  'websiteUrl',
];

/** An empty organiser application; the server supplies the address and Algeria scope. */
export const emptyApplication = (): ApplicationDraft => ({
  name: '',
  kind: '',
  description: '',
  websiteUrl: '',
});

const withScheme = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^[a-z][a-z0-9+.-]*:/iu.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * The application the server will accept, read through the schema it validates with, or the first
 * field (in the order the form shows them) that keeps it from being sent. A website typed without
 * a scheme (`oranmakers.dz`) is taken as `https://`.
 */
export const applicationFrom = (
  draft: ApplicationDraft,
):
  | { readonly ok: true; readonly application: ApplyForOrganisationRequest }
  | { readonly ok: false; readonly field: ApplicationField } => {
  const parsed = organisations.organisationApplicationSchema.safeParse({
    name: draft.name,
    kind: draft.kind,
    description: draft.description,
    websiteUrl: withScheme(draft.websiteUrl),
  });
  if (parsed.success) return { ok: true, application: parsed.data };
  const invalid = new Set(parsed.error.issues.map((issue) => issue.path[0]));
  return {
    ok: false,
    field: FIELD_ORDER.find((field) => invalid.has(field)) ?? 'name',
  };
};
