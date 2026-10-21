import { useState } from 'react';

import {
  org_apply_intro,
  org_apply_sent,
  org_apply_sent_title,
  org_apply_title,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { RootMarket } from '../../markets/api';
import { OrganisationApplyForm } from './OrganisationApplyForm';

type Stage =
  { readonly kind: 'form' } | { readonly kind: 'sent'; readonly name: string };

export const OrganisationApplyPage = ({
  locale,
  markets,
  defaultMarketCode,
}: {
  locale: Locale;
  markets: readonly RootMarket[];
  defaultMarketCode: string;
}) => {
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
        </section>
      ) : (
        <>
          <p className="mt-2 text-body text-neutral">
            {org_apply_intro({}, { locale })}
          </p>
          <div className="mt-6">
            <OrganisationApplyForm
              defaultMarketCode={defaultMarketCode}
              locale={locale}
              markets={markets}
              onSent={(name) => setStage({ kind: 'sent', name })}
            />
          </div>
        </>
      )}
    </div>
  );
};
