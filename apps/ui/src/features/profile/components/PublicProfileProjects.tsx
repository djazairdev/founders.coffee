import { Link } from '@tanstack/react-router';

import {
  hackathon_results_panel_rank,
  hackathon_results_panel_track_rank,
  profile_projects_label,
  project_page_stage_idea,
  project_page_stage_launched,
  project_page_stage_mvp,
  project_page_stage_prototype,
  type Locale,
} from '@founders-coffee/i18n';

import { localizedProject } from '../../../lib/locale-routing';
import type { PublicProfile } from '../api';

const STAGE = {
  idea: project_page_stage_idea,
  prototype: project_page_stage_prototype,
  mvp: project_page_stage_mvp,
  launched: project_page_stage_launched,
};

export const PublicProfileProjects = ({
  locale,
  profile,
}: {
  locale: Locale;
  profile: PublicProfile;
}) => {
  const options = { locale };
  if (profile.projects.length === 0) return null;
  return (
    <div>
      <h2 className="eyebrow">{profile_projects_label({}, options)}</h2>
      <ul className="mt-1.5 grid gap-3">
        {profile.projects.map((project) => (
          <li key={project.slug} className="min-w-0">
            <Link
              {...localizedProject(locale, project.slug)}
              className="link font-medium break-words"
            >
              <bdi>{project.title}</bdi>
            </Link>
            <p className="text-body-sm text-neutral">
              {STAGE[project.stage]({}, options)}
              {project.hackathonTitle ? (
                <>
                  {' · '}
                  <bdi>{project.hackathonTitle}</bdi>
                </>
              ) : null}
              {project.rank !== null ? (
                <>
                  {' · '}
                  {hackathon_results_panel_rank(
                    { rank: project.rank },
                    options,
                  )}
                </>
              ) : project.trackRank !== null ? (
                <>
                  {' · '}
                  {hackathon_results_panel_track_rank(
                    { rank: project.trackRank },
                    options,
                  )}
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
