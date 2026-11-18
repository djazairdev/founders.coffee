import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  org_apply_sent,
  org_apply_sent_link,
  org_apply_sent_title,
  org_apply_title,
  hackathon_create,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import {
  localizedHackathonCreate,
  localizedMyOrganisation,
} from '../../../lib/locale-routing';
import { OrganisationApplyForm } from './OrganisationApplyForm';

type Stage =
  | { readonly kind: 'form' }
  | { readonly kind: 'sent'; readonly name: string; readonly slug: string };

export const OrganisationApplyPage = ({ locale }: { locale: Locale }) => {
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-h3">
        {org_apply_title({}, { locale })}
      </h1>
      {stage.kind === 'sent' ? (
        <section aria-live="polite" className="mt-6 space-y-2">
          <h2 className="text-h4 font-medium">
            {org_apply_sent_title({}, { locale })}
          </h2>
          <StatusMessage variant="success">
            {org_apply_sent({ name: stage.name }, { locale })}
          </StatusMessage>
          <Link
            {...localizedHackathonCreate(locale, stage.slug)}
            className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
          >
            {hackathon_create({}, { locale })}
          </Link>
          <Link
            {...localizedMyOrganisation(locale, stage.slug)}
            className="link link-hover font-medium text-secondary"
          >
            {org_apply_sent_link({}, { locale })}
          </Link>
        </section>
      ) : (
        <div className="mt-6">
          <OrganisationApplyForm
            locale={locale}
            onSent={(sent) => setStage({ kind: 'sent', ...sent })}
          />
        </div>
      )}
    </div>
  );
};
