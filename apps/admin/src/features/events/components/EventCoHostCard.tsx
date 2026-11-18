import {
  admin_cohost_none,
  admin_cohost_organisers,
  admin_cohost_remove,
  type Locale,
} from '@founders-coffee/i18n';

import type { EventCoHosts } from '../api';
import { roleLabel, statusLabel } from '../labels';
import { AddCoHostForm } from './AddCoHostForm';

export const EventCoHostCard = ({
  locale,
  coHosts,
  isChanging,
  onAdd,
  onRemove,
}: {
  locale: Locale;
  coHosts: EventCoHosts;
  isChanging: boolean;
  onAdd: (organisationId: string) => void;
  onRemove: (organisationId: string) => void;
}) => (
  <article className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 sm:p-6">
    <header>
      <h2 className="font-display text-h4">
        <bdi>{coHosts.event.title}</bdi>
      </h2>
      <p className="text-caption text-neutral" dir="ltr">
        {coHosts.event.marketCode} · {coHosts.event.slug}
      </p>
    </header>
    <section className="space-y-2">
      <h3 className="text-label">{admin_cohost_organisers({}, { locale })}</h3>
      {coHosts.organisers.length === 0 ? (
        <p className="text-body-sm text-neutral">
          {admin_cohost_none({}, { locale })}
        </p>
      ) : (
        <ul className="space-y-2">
          {coHosts.organisers.map((organiser) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2"
              key={organiser.organisationId}
            >
              <span className="min-w-0">
                <bdi className="font-medium">{organiser.name}</bdi>
                <span className="ms-2 text-caption text-neutral">
                  {roleLabel(organiser.role, locale)}
                  {organiser.status === 'approved'
                    ? null
                    : ` · ${statusLabel(organiser.status, locale)}`}
                </span>
              </span>
              {organiser.role === 'co_host' ? (
                <button
                  className="btn btn-error btn-outline btn-xs sm:btn-sm md:btn-md"
                  disabled={isChanging}
                  onClick={() => onRemove(organiser.organisationId)}
                  type="button"
                >
                  {admin_cohost_remove({}, { locale })}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
    <AddCoHostForm
      candidates={coHosts.candidates}
      isChanging={isChanging}
      locale={locale}
      onAdd={onAdd}
    />
  </article>
);
