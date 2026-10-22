import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { HackathonCriterionScale } from '@founders-coffee/core';
import { hackathon_rubric_locked, type Locale } from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView } from './api';
import { hackathonEditError } from './edit-errors';
import {
  checkRubric,
  CRITERIA_MAX,
  CRITERIA_MIN,
  criterionFieldId,
  emptyCriterion,
  initialRubric,
  rubricTotal,
  type CriterionDraft,
  type CriterionField,
  type RubricErrors,
} from './hackathon-rubric-form';
import { useSaveHackathonRubric } from './hooks';

const seekId = (id: string) => {
  const element = document.getElementById(id);
  if (element) seekField(element);
};

/**
 * A hackathon's judging rubric as a form (B-HKN-15): three or four criteria with their weights and
 * the scale judges score on, with a running total that has to reach 100 before Save sends it.
 *
 * Save checks every criterion, then the whole rubric, with the rules the server applies, and takes
 * the organiser to the first field holding it back. After a save the rubric is read again from the
 * hackathon, so new criteria carry the ids the server gave them.
 */
export const useHackathonRubricForm = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const save = useSaveHackathonRubric();
  const counter = useRef(0);
  const newKey = () => {
    counter.current += 1;
    return `new-${counter.current}`;
  };
  const [initial] = useState(() => initialRubric(draft, newKey));
  const [criteria, setCriteria] = useState<readonly CriterionDraft[]>(
    initial.criteria,
  );
  const [scale, setScale] = useState<HackathonCriterionScale>(initial.scale);
  const [errors, setErrors] = useState<RubricErrors>({});
  const [rubricError, setRubricError] = useState<string | null>(null);
  const [syncedVersion, setSyncedVersion] = useState(draft.version);

  if (save.isSuccess && save.data.version !== syncedVersion) {
    setSyncedVersion(save.data.version);
    setCriteria(initialRubric(draft, newKey).criteria);
  }

  const edited = (next: readonly CriterionDraft[]) => {
    setCriteria(next);
    setRubricError(null);
    save.reset();
  };

  const set = (key: string, field: CriterionField) => (value: string) => {
    edited(
      criteria.map((criterion) =>
        criterion.key === key ? { ...criterion, [field]: value } : criterion,
      ),
    );
    setErrors((current) => ({
      ...current,
      [key]: { ...current[key], [field]: undefined },
    }));
  };

  const add = () => {
    if (criteria.length >= CRITERIA_MAX) return;
    const key = newKey();
    flushSync(() => edited([...criteria, emptyCriterion(key)]));
    seekId(criterionFieldId(key, 'name'));
  };

  const remove = (key: string) => {
    if (criteria.length <= CRITERIA_MIN) return;
    const at = criteria.findIndex((criterion) => criterion.key === key);
    const rest = criteria.filter((criterion) => criterion.key !== key);
    flushSync(() => edited(rest));
    const next = rest[Math.min(at, rest.length - 1)];
    if (next) seekId(criterionFieldId(next.key, 'name'));
  };

  const submit = () => {
    if (save.isPending) return;
    const check = checkRubric(criteria, scale, locale);
    if (!check.ok) {
      flushSync(() => {
        setErrors(check.errors);
        setRubricError(check.rubricError);
      });
      if (check.first) seekId(check.first);
      return;
    }
    setErrors({});
    save.mutate({
      eventId: draft.event.id,
      version: draft.version,
      criteria: check.criteria,
    });
  };

  return {
    criteria,
    scale,
    errors,
    rubricError,
    total: rubricTotal(criteria),
    set,
    setScale: (next: HackathonCriterionScale) => {
      setScale(next);
      save.reset();
    },
    add,
    remove,
    canAdd: criteria.length < CRITERIA_MAX,
    canRemove: criteria.length > CRITERIA_MIN,
    submit,
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveError: save.isError
      ? hackathonEditError(
          save.error,
          locale,
          hackathon_rubric_locked({}, { locale }),
        )
      : null,
  };
};
