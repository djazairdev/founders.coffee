import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  optional,
  org_apply_description,
  org_apply_description_hint,
  org_apply_error_description,
  org_apply_error_failed,
  org_apply_error_kind,
  org_apply_error_name,
  org_apply_error_rate_limited,
  org_apply_error_slug,
  org_apply_error_slug_taken,
  org_apply_error_website,
  org_apply_kind,
  org_apply_kind_choose,
  org_apply_name,
  org_apply_slug,
  org_apply_slug_hint,
  org_apply_submit,
  org_apply_website,
  sending,
  type Locale,
} from '@founders-coffee/i18n';
import { Input, Select, StatusMessage } from '@founders-coffee/ui';

import { HackathonsUnavailable } from '../../hackathons/components/HackathonsUnavailable';
import type { RootMarket } from '../../markets/api';
import {
  APPLICANT_KINDS,
  applicationFrom,
  DESCRIPTION_LENGTH,
  emptyApplication,
  NAME_LENGTH,
  SLUG_MAX_LENGTH,
  withMarket,
  withName,
  withSlug,
  withState,
  type ApplicationField as Field,
  type ApplicationDraft,
} from '../application';
import { applicationRefusal } from '../errors';
import { useApplyForOrganisation } from '../hooks';
import { ApplicationField, fieldNoteId } from './ApplicationField';
import { KIND_LABELS } from '../kind-labels';
import { OrganisationLocationFields } from './OrganisationLocationFields';

type Problem = 'slug_taken' | 'unavailable' | 'rate_limited' | 'failed';
type Focusable = { focus: () => void };

export const OrganisationApplyForm = ({
  locale,
  markets,
  defaultMarketCode,
  onSent,
}: {
  locale: Locale;
  markets: readonly RootMarket[];
  defaultMarketCode: string;
  onSent: (name: string) => void;
}) => {
  const [draft, setDraft] = useState(() => emptyApplication(defaultMarketCode));
  const [invalid, setInvalid] = useState<Field | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const apply = useApplyForOrganisation();
  const controls = useRef<Partial<Record<Field, Focusable | null>>>({});
  const bind = (field: Field) => (element: Focusable | null) => {
    controls.current[field] = element;
  };
  const isBusy = apply.isPending;
  const [focusOn, setFocusOn] = useState<Field | null>(null);

  useEffect(() => {
    if (!focusOn || isBusy) return;
    controls.current[focusOn]?.focus();
    setFocusOn(null);
  }, [focusOn, isBusy]);

  const change = (field: Field, next: ApplicationDraft) => {
    setDraft(next);
    if (invalid === field) setInvalid(null);
    if (field === 'slug' && problem === 'slug_taken') setProblem(null);
  };

  const point = (field: Field) => {
    setInvalid(field);
    setFocusOn(field);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    setProblem(null);
    const checked = applicationFrom(draft);
    if (!checked.ok) {
      point(checked.field);
      return;
    }
    try {
      await apply.mutateAsync(checked.application);
      onSent(checked.application.name);
    } catch (caught) {
      const refusal = applicationRefusal(caught);
      if (refusal.kind === 'hackathons_disabled') setProblem('unavailable');
      else if (refusal.kind === 'field') point(refusal.field);
      else if (refusal.kind === 'slug_taken') {
        setProblem('slug_taken');
        point('slug');
      } else
        setProblem(refusal.kind === 'rate_limited' ? 'rate_limited' : 'failed');
    }
  };

  const errorFor = (field: Field): string | null => {
    if (field === 'slug' && problem === 'slug_taken')
      return org_apply_error_slug_taken({}, { locale });
    if (invalid !== field) return null;
    if (field === 'name') return org_apply_error_name(NAME_LENGTH, { locale });
    if (field === 'slug') return org_apply_error_slug({}, { locale });
    if (field === 'kind') return org_apply_error_kind({}, { locale });
    if (field === 'description')
      return org_apply_error_description(DESCRIPTION_LENGTH, { locale });
    if (field === 'websiteUrl') return org_apply_error_website({}, { locale });
    return null;
  };

  const describe = (field: Field, id: string, hasHint = false) => ({
    'aria-invalid': errorFor(field) ? true : undefined,
    'aria-describedby':
      errorFor(field) || hasHint ? fieldNoteId(id) : undefined,
  });
  const optionalLabel = optional({}, { locale });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <ApplicationField
        error={errorFor('name')}
        id="organisation-name"
        label={org_apply_name({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Input
          {...describe('name', 'organisation-name')}
          autoComplete="organization"
          disabled={isBusy}
          id="organisation-name"
          maxLength={NAME_LENGTH.max}
          onChange={(event) =>
            change('name', withName(draft, event.target.value))
          }
          ref={bind('name')}
          value={draft.name}
        />
      </ApplicationField>
      <ApplicationField
        error={errorFor('slug')}
        hint={org_apply_slug_hint({}, { locale })}
        id="organisation-slug"
        label={org_apply_slug({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Input
          {...describe('slug', 'organisation-slug', true)}
          autoCapitalize="off"
          autoComplete="off"
          dir="ltr"
          disabled={isBusy}
          id="organisation-slug"
          maxLength={SLUG_MAX_LENGTH}
          onChange={(event) =>
            change('slug', withSlug(draft, event.target.value))
          }
          ref={bind('slug')}
          spellCheck={false}
          value={draft.slug}
        />
      </ApplicationField>
      <ApplicationField
        error={errorFor('kind')}
        id="organisation-kind"
        label={org_apply_kind({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Select
          {...describe('kind', 'organisation-kind')}
          disabled={isBusy}
          id="organisation-kind"
          onChange={(event) =>
            change('kind', {
              ...draft,
              kind: event.target.value as ApplicationDraft['kind'],
            })
          }
          ref={bind('kind')}
          value={draft.kind}
        >
          <option disabled value="">
            {org_apply_kind_choose({}, { locale })}
          </option>
          {APPLICANT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]({}, { locale })}
            </option>
          ))}
        </Select>
      </ApplicationField>
      <OrganisationLocationFields
        cityCode={draft.cityCode}
        cityRef={bind('cityCode')}
        isCityInvalid={invalid === 'cityCode'}
        isDisabled={isBusy}
        locale={locale}
        marketCode={draft.marketCode}
        markets={markets}
        onCity={(cityCode) => change('cityCode', { ...draft, cityCode })}
        onMarket={(marketCode) =>
          change('marketCode', withMarket(draft, marketCode))
        }
        onState={(stateCode) => change('cityCode', withState(draft, stateCode))}
        stateCode={draft.stateCode}
      />
      <ApplicationField
        aside={
          <span className="shrink-0 text-caption text-neutral" dir="ltr">
            {draft.description.trim().length} / {DESCRIPTION_LENGTH.max}
          </span>
        }
        error={errorFor('description')}
        hint={org_apply_description_hint({}, { locale })}
        id="organisation-description"
        label={org_apply_description({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <textarea
          {...describe('description', 'organisation-description', true)}
          className="textarea textarea-sm md:textarea-md w-full"
          dir="auto"
          disabled={isBusy}
          id="organisation-description"
          maxLength={DESCRIPTION_LENGTH.max}
          onChange={(event) =>
            change('description', {
              ...draft,
              description: event.target.value,
            })
          }
          ref={bind('description')}
          rows={5}
          value={draft.description}
        />
      </ApplicationField>
      <ApplicationField
        error={errorFor('websiteUrl')}
        id="organisation-website"
        isOptional
        label={org_apply_website({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Input
          {...describe('websiteUrl', 'organisation-website')}
          autoComplete="url"
          disabled={isBusy}
          id="organisation-website"
          inputMode="url"
          onChange={(event) =>
            change('websiteUrl', { ...draft, websiteUrl: event.target.value })
          }
          placeholder="https://"
          ref={bind('websiteUrl')}
          type="url"
          value={draft.websiteUrl}
        />
      </ApplicationField>
      {problem === 'unavailable' ? (
        <HackathonsUnavailable locale={locale} />
      ) : null}
      {problem === 'rate_limited' || problem === 'failed' ? (
        <StatusMessage variant="error">
          {problem === 'rate_limited'
            ? org_apply_error_rate_limited({}, { locale })
            : org_apply_error_failed({}, { locale })}
        </StatusMessage>
      ) : null}
      <button
        className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
        disabled={isBusy}
        type="submit"
      >
        {isBusy ? sending({}, { locale }) : org_apply_submit({}, { locale })}
      </button>
    </form>
  );
};
