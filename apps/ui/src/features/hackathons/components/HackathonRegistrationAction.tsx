import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';

import type { EventFormat, HackathonPhase } from '@founders-coffee/core';
import {
  hackathon_disqualified,
  hackathon_register_full,
  hackathon_register_sign_in,
  hackathon_withdrawn,
  type Locale,
} from '@founders-coffee/i18n';

import { useAuth } from '../../../lib/app-providers';
import { localizedLogin } from '../../../lib/locale-routing';
import { useFocusAfterChange } from '../../../lib/useFocusAfterChange';
import type { HackathonRegistrationView, HackathonSchedule } from '../api';
import type { HackathonApplicationQuestion } from '../application-answers';
import { phaseSentence } from '../schedule';
import { HackathonParticipantLinks } from './HackathonParticipantLinks';
import { HackathonRegistrationForm } from './HackathonRegistrationForm';
import { HackathonRegistrationStanding } from './HackathonRegistrationStanding';

const WITHDRAWABLE: readonly HackathonPhase[] = [
  'upcoming',
  'registration_open',
  'registration_closed',
  'building',
];

type HackathonRegistrationActionProps = {
  eventId: string;
  format: EventFormat;
  minimumAge: number | null;
  schedule: HackathonSchedule;
  registration: HackathonRegistrationView;
  timeZone: string;
  locale: Locale;
  applicationQuestions: readonly HackathonApplicationQuestion[];
};

const Body = ({
  eventId,
  format,
  minimumAge,
  schedule,
  registration,
  timeZone,
  locale,
  applicationQuestions,
}: HackathonRegistrationActionProps) => {
  const options = { locale };
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { viewer, isFull } = registration;
  const isOpen = schedule.phase === 'registration_open';
  useEffect(() => setIsMounted(true), []);
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
      {isMounted && isAuthenticated ? (
        <HackathonRegistrationForm
          eventId={eventId}
          format={format}
          minimumAge={minimumAge}
          isFull={isFull}
          locale={locale}
          applicationQuestions={applicationQuestions}
        />
      ) : (
        <div>
          <Link
            {...localizedLogin(locale)}
            search={{ redirect: pathname }}
            className="btn btn-secondary btn-xs sm:btn-sm md:btn-md w-full rounded-full sm:w-auto"
          >
            {hackathon_register_sign_in({}, options)}
          </Link>
        </div>
      )}
    </div>
  );
};

export const HackathonRegistrationAction = (
  props: HackathonRegistrationActionProps,
) => {
  const action = useFocusAfterChange<HTMLDivElement>(
    props.registration.viewer?.status ?? 'none',
  );
  return (
    <div
      ref={action}
      tabIndex={-1}
      className="ms-auto grid w-full gap-3 sm:w-fit"
    >
      <Body {...props} />
      <HackathonParticipantLinks
        eventId={props.eventId}
        isRegistered={props.registration.viewer?.status === 'registered'}
        isJudge={props.registration.isJudge}
        isOrganiser={props.registration.isOrganiser}
        locale={props.locale}
      />
    </div>
  );
};
