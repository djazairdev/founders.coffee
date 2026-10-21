import { organisations } from '@founders-coffee/domain';

import type { ApplyForOrganisationRequest } from './api';

export type ApplicantKind = ApplyForOrganisationRequest['kind'];

export const APPLICANT_KINDS = organisations.applicantOrganisationKindSchema
  .options as readonly ApplicantKind[];

export const NAME_LENGTH = {
  min: organisations.ORGANISATION_NAME_MIN_LENGTH,
  max: organisations.ORGANISATION_NAME_MAX_LENGTH,
};
export const SLUG_MAX_LENGTH = organisations.ORGANISATION_SLUG_MAX_LENGTH;
export const DESCRIPTION_LENGTH = {
  min: organisations.ORGANISATION_DESCRIPTION_MIN_LENGTH,
  max: organisations.ORGANISATION_DESCRIPTION_MAX_LENGTH,
};

export type ApplicationField =
  | 'name'
  | 'slug'
  | 'kind'
  | 'marketCode'
  | 'cityCode'
  | 'description'
  | 'websiteUrl';

export type ApplicationDraft = {
  readonly name: string;
  readonly slug: string;
  readonly isSlugEdited: boolean;
  readonly kind: ApplicantKind | '';
  readonly marketCode: string;
  readonly stateCode: string;
  readonly cityCode: string;
  readonly description: string;
  readonly websiteUrl: string;
};

export const FIELD_ORDER: readonly ApplicationField[] = [
  'name',
  'slug',
  'kind',
  'marketCode',
  'cityCode',
  'description',
  'websiteUrl',
];

/** An empty application in `marketCode`, the market the member is browsing. */
export const emptyApplication = (marketCode: string): ApplicationDraft => ({
  name: '',
  slug: '',
  isSlugEdited: false,
  kind: '',
  marketCode,
  stateCode: '',
  cityCode: '',
  description: '',
  websiteUrl: '',
});

/**
 * The draft after its name changes. Until the applicant edits the address themselves, it follows
 * the name, so most never have to think about it.
 */
export const withName = (
  draft: ApplicationDraft,
  name: string,
): ApplicationDraft => ({
  ...draft,
  name,
  slug: draft.isSlugEdited
    ? draft.slug
    : organisations.suggestOrganisationSlug(name),
});

/** The draft after the applicant edits the address; it stops following the name. */
export const withSlug = (
  draft: ApplicationDraft,
  slug: string,
): ApplicationDraft => ({
  ...draft,
  slug: slug.toLowerCase(),
  isSlugEdited: true,
});

/** The draft in another market: a state and city belong to one market, so both are cleared. */
export const withMarket = (
  draft: ApplicationDraft,
  marketCode: string,
): ApplicationDraft => ({ ...draft, marketCode, stateCode: '', cityCode: '' });

/** The draft in another state: its city belonged to the state before, so it is cleared. */
export const withState = (
  draft: ApplicationDraft,
  stateCode: string,
): ApplicationDraft => ({ ...draft, stateCode, cityCode: '' });

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
    slug: draft.slug,
    kind: draft.kind,
    marketCode: draft.marketCode,
    cityCode: draft.cityCode || null,
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
