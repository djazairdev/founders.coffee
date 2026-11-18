import type { Market } from '@founders-coffee/db';
import {
  calendarDayParts,
  hackathon_announce_date,
  hackathon_announce_demo_day,
  hackathon_announce_gain_certificate,
  hackathon_announce_gain_profile,
  hackathon_announce_gain_project,
  hackathon_announce_gain_scores,
  hackathon_announce_gain_team,
  hackathon_announce_gains_title,
  hackathon_announce_how_demo,
  hackathon_announce_how_mentors,
  hackathon_announce_how_team,
  hackathon_announce_how_title,
  hackathon_announce_how_tracks,
  hackathon_announce_intro,
  hackathon_announce_kickoff,
  hackathon_announce_registration,
  hackathon_announce_submissions_close,
  hackathon_announce_title,
  hackathon_announce_when,
  type Locale,
} from '@founders-coffee/i18n';

import {
  FIRST_HACKATHON,
  isAnnouncementShown,
} from '../../content/hackathon/announcement';
import { HackathonAlertForm } from '../../features/hackathons/components/HackathonAlertForm';

type HackathonAnnouncementProps = {
  locale: Locale;
  market: Market;
  className?: string;
};

const GAINS = [
  { key: 'project', text: hackathon_announce_gain_project },
  { key: 'scores', text: hackathon_announce_gain_scores },
  { key: 'certificate', text: hackathon_announce_gain_certificate },
  { key: 'profile', text: hackathon_announce_gain_profile },
  { key: 'team', text: hackathon_announce_gain_team },
] as const;

const STEPS = [
  { key: 'team', text: hackathon_announce_how_team },
  { key: 'mentors', text: hackathon_announce_how_mentors },
  { key: 'tracks', text: hackathon_announce_how_tracks },
  { key: 'demo', text: hackathon_announce_how_demo },
] as const;

const DATES = [
  { key: 'kickoff', label: hackathon_announce_kickoff },
  { key: 'submissionsClose', label: hackathon_announce_submissions_close },
  { key: 'demoDay', label: hackathon_announce_demo_day },
] as const;

export const HackathonAnnouncement = ({
  locale,
  market,
  className = '',
}: HackathonAnnouncementProps) => {
  if (
    !isAnnouncementShown(
      FIRST_HACKATHON,
      market.code,
      market.timezone,
      Date.now(),
    )
  )
    return null;

  const partsOf = (day: string) => calendarDayParts(day, locale, market.code);
  const kickoff = partsOf(FIRST_HACKATHON.kickoff);
  const demoDay = partsOf(FIRST_HACKATHON.demoDay);
  const opens = partsOf(FIRST_HACKATHON.registrationOpens);

  return (
    <section
      aria-labelledby="hackathon-announcement-title"
      className={className}
    >
      <div className="graph-paper flex flex-col gap-6 rounded-box border border-base-300 bg-base-200 p-5 md:p-8">
        <header className="flex flex-col gap-2">
          <h2
            id="hackathon-announcement-title"
            className="font-display text-h3 font-semibold tracking-tight text-balance text-base-content md:text-h2"
          >
            {hackathon_announce_title({}, { locale })}
          </h2>
          <p className="text-body-sm font-semibold text-primary">
            {hackathon_announce_when(
              {
                startDay: kickoff.day,
                endDay: demoDay.day,
                month: demoDay.month,
                year: demoDay.year,
              },
              { locale },
            )}
          </p>
          <p className="text-body-sm leading-relaxed text-neutral md:text-body">
            {hackathon_announce_intro({}, { locale })}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-display text-body-lg font-semibold text-base-content">
              {hackathon_announce_gains_title({}, { locale })}
            </h3>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-body-sm leading-relaxed text-neutral">
              {GAINS.map(({ key, text }) => (
                <li key={key}>{text({}, { locale })}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-body-lg font-semibold text-base-content">
              {hackathon_announce_how_title({}, { locale })}
            </h3>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-body-sm leading-relaxed text-neutral">
              {STEPS.map(({ key, text }) => (
                <li key={key}>{text({}, { locale })}</li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="flex flex-col gap-1 text-body-sm font-semibold text-base-content sm:flex-row sm:flex-wrap sm:gap-x-6">
          {DATES.map(({ key, label }) => (
            <li key={key}>
              {label(
                {
                  date: hackathon_announce_date(partsOf(FIRST_HACKATHON[key]), {
                    locale,
                  }),
                },
                { locale },
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t border-base-300 pt-5">
          <p className="text-body-sm text-neutral">
            {hackathon_announce_registration(
              { day: opens.day, month: opens.month },
              { locale },
            )}
          </p>
          <div className="max-w-xl">
            <HackathonAlertForm locale={locale} marketCode={market.code} />
          </div>
        </div>
      </div>
    </section>
  );
};
