import {
  hackathon_team_prize_delivered,
  hackathon_team_prize_pending,
  hackathon_team_prizes_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge } from '@founders-coffee/ui';

import type { TeamPageView } from '../api';

export const HackathonTeamPrizes = ({
  prizes,
  locale,
}: {
  prizes: TeamPageView['prizes'];
  locale: Locale;
}) =>
  prizes.length === 0 ? null : (
    <section aria-labelledby="hackathon-team-prizes-heading" className="mt-6">
      <h2 id="hackathon-team-prizes-heading" className="font-display text-h4">
        {hackathon_team_prizes_heading({}, { locale })}
      </h2>
      <ul className="mt-2 grid gap-2">
        {prizes.map((prize) => (
          <li
            key={prize.prizeId}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <bdi className="min-w-0 break-words">{prize.title}</bdi>
            <Badge variant="outline" size="sm">
              {prize.isDelivered
                ? hackathon_team_prize_delivered({}, { locale })
                : hackathon_team_prize_pending({}, { locale })}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
