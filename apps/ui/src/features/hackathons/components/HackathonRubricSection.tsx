import { HACKATHON_CRITERION_SCALES } from '@founders-coffee/core';
import { Plus } from 'lucide-react';

import {
  hackathon_criterion_add,
  hackathon_details_saving,
  hackathon_rubric_heading,
  hackathon_rubric_hint,
  hackathon_rubric_locked,
  hackathon_rubric_needs_details,
  hackathon_rubric_save,
  hackathon_rubric_saved,
  hackathon_rubric_scale,
  hackathon_rubric_scale_10,
  hackathon_rubric_scale_5,
  hackathon_rubric_total,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import { WEIGHT_TOTAL } from '../hackathon-rubric-form';
import { useHackathonRubricForm } from '../useHackathonRubricForm';
import { HackathonCriterionEditor } from './HackathonCriterionEditor';

const HEADING_ID = 'hackathon-rubric-heading';
const SCALE_ID = 'hackathon-rubric-scale';

const SCALE_LABELS = {
  5: hackathon_rubric_scale_5,
  10: hackathon_rubric_scale_10,
} as const;

const RubricForm = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const form = useHackathonRubricForm({ draft, locale });
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div role="radiogroup" aria-labelledby={`${SCALE_ID}-label`}>
        <p id={`${SCALE_ID}-label`} className="text-label">
          {hackathon_rubric_scale({}, { locale })}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-4">
          {HACKATHON_CRITERION_SCALES.map((scale) => (
            <label key={scale} className="flex items-center gap-2 text-body-sm">
              <input
                type="radio"
                name={SCALE_ID}
                value={scale}
                className="radio radio-sm radio-primary"
                checked={form.scale === scale}
                onChange={() => form.setScale(scale)}
              />
              {SCALE_LABELS[scale]({}, { locale })}
            </label>
          ))}
        </div>
      </div>
      <ol className="grid gap-4">
        {form.criteria.map((criterion, index) => (
          <HackathonCriterionEditor
            key={criterion.key}
            form={form}
            criterion={criterion}
            index={index}
            locale={locale}
          />
        ))}
      </ol>
      <StatusMessage variant={form.total === WEIGHT_TOTAL ? 'success' : 'info'}>
        {hackathon_rubric_total({ total: form.total }, { locale })}
      </StatusMessage>
      <div>
        <Button variant="outline" disabled={!form.canAdd} onClick={form.add}>
          <Plus aria-hidden="true" className="size-4" />
          {hackathon_criterion_add({}, { locale })}
        </Button>
      </div>
      {form.rubricError ? (
        <StatusMessage variant="error">{form.rubricError}</StatusMessage>
      ) : null}
      {form.saveError ? (
        <StatusMessage variant="error">{form.saveError}</StatusMessage>
      ) : null}
      {form.isSaved ? (
        <StatusMessage variant="success">
          {hackathon_rubric_saved({}, { locale })}
        </StatusMessage>
      ) : null}
      <div>
        <Button type="submit" variant="primary" disabled={form.isSaving}>
          {form.isSaving
            ? hackathon_details_saving({}, { locale })
            : hackathon_rubric_save({}, { locale })}
        </Button>
      </div>
    </form>
  );
};

const LockedRubric = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => (
  <div className="grid gap-4">
    <StatusMessage variant="info">
      {hackathon_rubric_locked({}, { locale })}
    </StatusMessage>
    <ol className="grid gap-3">
      {draft.criteria.map((criterion) => (
        <li
          key={criterion.id}
          className="rounded-box border border-base-300 p-4"
        >
          <p className="flex justify-between gap-3 font-medium">
            <bdi>{criterion.name}</bdi>
            <span>{criterion.weight}</span>
          </p>
          <p className="mt-1 text-body-sm text-neutral">
            <bdi>{criterion.description}</bdi>
          </p>
        </li>
      ))}
    </ol>
  </div>
);

export const HackathonRubricSection = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-12">
    <h2 id={HEADING_ID} className="font-display text-h4">
      {hackathon_rubric_heading({}, { locale })}
    </h2>
    <p className="mt-1 mb-6 text-body-sm text-neutral">
      {hackathon_rubric_hint({}, { locale })}
    </p>
    {!draft.details ? (
      <StatusMessage variant="info">
        {hackathon_rubric_needs_details({}, { locale })}
      </StatusMessage>
    ) : draft.stage === 'open' ? (
      <RubricForm draft={draft} locale={locale} />
    ) : (
      <LockedRubric draft={draft} locale={locale} />
    )}
  </section>
);
