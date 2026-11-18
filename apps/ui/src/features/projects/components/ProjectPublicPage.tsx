import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

import {
  formatDate,
  hackathon_results_panel_rank,
  hackathon_results_panel_track_rank,
  hackathon_submission_ai_statement,
  hackathon_submission_track,
  project_page_about,
  project_page_built_at,
  project_page_code,
  project_page_demo,
  project_page_problem,
  project_page_stage_idea,
  project_page_stage_launched,
  project_page_stage_mvp,
  project_page_stage_prototype,
  project_page_team,
  project_page_updated,
  project_page_website,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge, IsolatedLines } from '@founders-coffee/ui';

import {
  localizedEvent,
  localizedPublicProfile,
} from '../../../lib/locale-routing';
import type { ProjectPage } from '../api';

const STAGE = {
  idea: project_page_stage_idea,
  prototype: project_page_stage_prototype,
  mvp: project_page_stage_mvp,
  launched: project_page_stage_launched,
};

const HEADING_CLASS = 'font-display text-h4';

export const ProjectPublicPage = ({
  project,
  locale,
}: {
  project: ProjectPage;
  locale: Locale;
}) => {
  const options = { locale };
  const links = [
    { url: project.repositoryUrl, label: project_page_code({}, options) },
    { url: project.demoUrl, label: project_page_demo({}, options) },
    { url: project.websiteUrl, label: project_page_website({}, options) },
  ];
  const updated = formatDate(new Date(project.updatedAt), locale, {
    timeZone: project.timeZone,
    hour12: false,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <section className="mx-auto grid max-w-3xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex min-w-0 flex-col items-start gap-2">
        <Badge variant="outline" size="sm" className="font-medium">
          {STAGE[project.stage]({}, options)}
        </Badge>
        <h1 className="font-display text-h2 font-semibold break-words">
          <bdi>{project.title}</bdi>
        </h1>
        <p className="text-body-sm text-neutral">
          {project_page_updated({ date: updated }, options)}
        </p>
      </header>

      <section>
        <h2 className={HEADING_CLASS}>{project_page_problem({}, options)}</h2>
        <p className="mt-2 whitespace-pre-line break-words">
          <IsolatedLines text={project.problem} />
        </p>
      </section>

      {project.description ? (
        <section>
          <h2 className={HEADING_CLASS}>{project_page_about({}, options)}</h2>
          <p className="mt-2 whitespace-pre-line break-words">
            <IsolatedLines text={project.description} />
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {links.map(({ url, label }) =>
          url ? (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
            >
              <span>{label}</span>
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : null,
        )}
      </div>

      {project.members.length > 0 ? (
        <section>
          <h2 className={HEADING_CLASS}>{project_page_team({}, options)}</h2>
          <ul className="mt-2 grid gap-1">
            {project.members.map((member) => (
              <li key={member.userId}>
                <Link
                  {...localizedPublicProfile(locale, member.userId)}
                  className="link break-words"
                >
                  <bdi>{member.name}</bdi>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {project.hackathon ? (
        <section>
          <h2 className={HEADING_CLASS}>
            {project_page_built_at({}, options)}
          </h2>
          <p className="mt-2">
            <Link
              {...localizedEvent(
                locale,
                project.marketSlug,
                project.hackathon.slug,
              )}
              className="link break-words"
            >
              <bdi>{project.hackathon.title}</bdi>
            </Link>
          </p>
          {project.trackTitle ? (
            <p className="mt-1 text-body-sm text-neutral">
              {hackathon_submission_track({}, options)}{' '}
              <bdi className="font-medium">{project.trackTitle}</bdi>
            </p>
          ) : null}
          {project.rank !== null ? (
            <p className="mt-1 text-body-sm font-medium">
              {hackathon_results_panel_rank({ rank: project.rank }, options)}
            </p>
          ) : null}
          {project.trackRank !== null ? (
            <p className="mt-1 text-body-sm font-medium">
              {hackathon_results_panel_track_rank(
                { rank: project.trackRank },
                options,
              )}
            </p>
          ) : null}
        </section>
      ) : null}

      {project.aiStatement ? (
        <section>
          <h2 className={HEADING_CLASS}>
            {hackathon_submission_ai_statement({}, options)}
          </h2>
          <p className="mt-2 whitespace-pre-line break-words">
            <IsolatedLines text={project.aiStatement} />
          </p>
        </section>
      ) : null}
    </section>
  );
};
