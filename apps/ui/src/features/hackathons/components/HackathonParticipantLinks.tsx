import { Link } from '@tanstack/react-router';

import {
  hackathon_go_judging,
  hackathon_go_manage,
  hackathon_go_team,
  type Locale,
} from '@founders-coffee/i18n';

import {
  localizedHackathonJudge,
  localizedHackathonManage,
  localizedHackathonTeam,
} from '../../../lib/locale-routing';

const LINK_CLASS = 'btn btn-outline btn-xs sm:btn-sm md:btn-md';

export const HackathonParticipantLinks = ({
  eventId,
  isRegistered,
  isJudge,
  isOrganiser,
  locale,
}: {
  eventId: string;
  isRegistered: boolean;
  isJudge: boolean;
  isOrganiser: boolean;
  locale: Locale;
}) =>
  isRegistered || isJudge || isOrganiser ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {isRegistered ? (
        <Link
          {...localizedHackathonTeam(locale, eventId)}
          className={LINK_CLASS}
        >
          {hackathon_go_team({}, { locale })}
        </Link>
      ) : null}
      {isJudge ? (
        <Link
          {...localizedHackathonJudge(locale, eventId)}
          className={LINK_CLASS}
        >
          {hackathon_go_judging({}, { locale })}
        </Link>
      ) : null}
      {isOrganiser ? (
        <Link
          {...localizedHackathonManage(locale, eventId)}
          className={LINK_CLASS}
        >
          {hackathon_go_manage({}, { locale })}
        </Link>
      ) : null}
    </div>
  ) : null;
