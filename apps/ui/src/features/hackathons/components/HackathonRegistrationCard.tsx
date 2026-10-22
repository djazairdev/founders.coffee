import { Link, useLocation } from '@tanstack/react-router';

import type { EventFormat, HackathonPhase } from '@founders-coffee/core';
import {
  hackathon_disqualified,
  hackathon_register_full,
  hackathon_register_heading,
  hackathon_register_sign_in,
  hackathon_withdrawn,
  type Locale,
} from '@founders-coffee/i18n';

import { useAuth } from '../../../lib/app-providers';
import { localizedLogin } from '../../../lib/locale-routing';
import type { HackathonRegistrationView, HackathonSchedule } from '../api';
import { phaseSentence } from '../schedule';
import { HackathonRegistrationForm } from './HackathonRegistrationForm';
import { HackathonRegistrationStanding } from './HackathonRegistrationStanding';

const HEADING_ID = 'hackathon-registration-heading';
const WITHDRAWABLE: readonly HackathonPhase[] = [
  'upcoming',
  'registration_open',
  'registration_closed',
  'building',
];

type HackathonRegistrationCardProps = {
  eventId: string;
  format: EventFormat;
  minimumAge: number | null;
  schedule: HackathonSchedule;
  registration: HackathonRegistrationView;
  timeZone: string;
  locale: Locale;
};

const Body = ({
  eventId,
  format,
  minimumAge,
  schedule,
  registration,
  timeZone,
  locale,
}: HackathonRegistrationCardProps) => {
  const options = { locale };
  const { isAuthenticated } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { viewer, isFull } = registration;
  const isOpen = schedule.phase === 'registration_open';
  if (viewer?.status === 'registered' || viewer?.status === 'waitlisted')
    return (
      <HackathonRegistrationStanding
        eventId={eventId}
        status={viewer.status}
        attendanceMode={viewer.attendanceMode}
        canWithdraw={WITHDRAWABLE.includes(schedule.phase)}
        locale={locale}
      />
    );
  if (viewer?.status === 'withdrawn')
    return <p className="text-body-sm">{hackathon_withdrawn({}, options)}</p>;
  if (viewer?.status === 'disqualified')
    return (
      <p className="text-body-sm">{hackathon_disqualified({}, options)}</p>
    );
  if (!isOpen)
    return (
      <p className="text-body-sm">
        {phaseSentence(schedule, locale, timeZone)}
      </p>
    );
  return (
    <div className="grid gap-3">
      {isFull ? (
        <p className="text-body-sm text-neutral">
          {hackathon_register_full({}, options)}
        </p>
      ) : null}
      {isAuthenticated ? (
        <HackathonRegistrationForm
          eventId={eventId}
          format={format}
          minimumAge={minimumAge}
          isFull={isFull}
          locale={locale}
        />
      ) : (
        <div>
          <Link
            {...localizedLogin(locale)}
            search={{ redirect: pathname }}
            className="btn btn-secondary btn-xs sm:btn-sm md:btn-md w-full sm:w-auto"
          >
            {hackathon_register_sign_in({}, options)}
          </Link>
        </div>
      )}
    </div>
  );
};

export const HackathonRegistrationCard = (
  props: HackathonRegistrationCardProps,
) => (
  <section
    aria-labelledby={HEADING_ID}
    className="rounded-box border-2 border-secondary bg-base-100 p-3 shadow-[var(--shadow-2)] sm:p-5"
  >
    <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
      {hackathon_register_heading({}, { locale: props.locale })}
    </h2>
    <div className="mt-3">
      <Body {...props} />
    </div>
  </section>
);
