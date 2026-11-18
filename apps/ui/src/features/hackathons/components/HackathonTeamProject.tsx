import { Link } from '@tanstack/react-router';

import {
  hackathon_project_confirm,
  hackathon_project_confirm_note,
  hackathon_project_confirmed_count,
  hackathon_project_create,
  hackathon_project_create_note,
  hackathon_project_heading,
  hackathon_project_listed,
  hackathon_project_manage,
  hackathon_project_needs_confirmation,
  hackathon_project_publish,
  hackathon_project_status_draft,
  hackathon_project_status_hidden,
  hackathon_project_status_published,
  hackathon_project_view,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import {
  localizedProject,
  localizedProjectEdit,
} from '../../../lib/locale-routing';
import { useFocusAfterChange } from '../../../lib/useFocusAfterChange';
import type { TeamPageView } from '../api';
import { teamErrorMessage } from '../team-errors';
import {
  useConfirmProject,
  useCreateProject,
  usePublishProject,
} from '../team-hooks';

const STATUS = {
  draft: hackathon_project_status_draft,
  published: hackathon_project_status_published,
  hidden: hackathon_project_status_hidden,
};

const BUTTON_CLASS = 'btn-primary btn-xs sm:btn-sm md:btn-md mt-3';

export const HackathonTeamProject = ({
  eventId,
  project,
  locale,
}: {
  eventId: string;
  project: NonNullable<TeamPageView['project']>;
  locale: Locale;
}) => {
  const options = { locale };
  const create = useCreateProject(eventId);
  const confirm = useConfirmProject(eventId);
  const publish = usePublishProject(eventId);
  const failed = [create, confirm, publish].find((change) => change.isError);
  const isBusy = create.isPending || confirm.isPending || publish.isPending;
  const heading = useFocusAfterChange<HTMLHeadingElement>(
    project.stage === 'can_create'
      ? project.stage
      : `${project.status}:${project.isListed}`,
  );
  return (
    <section aria-labelledby="hackathon-team-project-heading" className="mt-6">
      <h2
        ref={heading}
        tabIndex={-1}
        id="hackathon-team-project-heading"
        className="font-display text-h4"
      >
        {hackathon_project_heading({}, options)}
      </h2>
      {project.stage === 'can_create' ? (
        <>
          <p className="mt-1 text-body-sm text-neutral">
            {hackathon_project_create_note({}, options)}
          </p>
          <Button
            className={BUTTON_CLASS}
            isBusy={isBusy}
            onClick={() => create.mutate()}
          >
            {hackathon_project_create({}, options)}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-1 font-medium">
            <bdi className="break-words">{project.title}</bdi>
          </p>
          <p className="mt-1 text-body-sm text-neutral">
            {STATUS[project.status]({}, options)}
          </p>
          {project.status === 'published' ? (
            <Link
              {...localizedProject(locale, project.slug)}
              className="link mt-1 inline-block text-body-sm"
            >
              {hackathon_project_view({}, options)}
            </Link>
          ) : null}
          {project.isOnProject ? (
            <Link
              {...localizedProjectEdit(locale, project.slug)}
              className="link mt-1 block w-fit text-body-sm"
            >
              {hackathon_project_manage({}, options)}
            </Link>
          ) : null}
          {project.teammates > 0 ? (
            <p className="mt-1 text-body-sm text-neutral">
              {hackathon_project_confirmed_count(
                {
                  count: project.confirmedTeammates,
                  total: project.teammates,
                },
                options,
              )}
            </p>
          ) : null}
          {project.isOnProject && !project.isListed ? (
            <>
              <p className="mt-2 text-body-sm">
                {hackathon_project_confirm_note({}, options)}
              </p>
              <Button
                className={BUTTON_CLASS}
                isBusy={isBusy}
                onClick={() => confirm.mutate(project.id)}
              >
                {hackathon_project_confirm({}, options)}
              </Button>
            </>
          ) : null}
          {project.isListed && !project.isOwner ? (
            <p className="mt-2 text-body-sm">
              {hackathon_project_listed({}, options)}
            </p>
          ) : null}
          {project.isOwner && project.status === 'draft' ? (
            <>
              {project.canPublish ? null : (
                <p className="mt-2 text-body-sm">
                  {hackathon_project_needs_confirmation({}, options)}
                </p>
              )}
              <Button
                className={BUTTON_CLASS}
                disabled={!project.canPublish}
                isBusy={isBusy}
                onClick={() => publish.mutate(project.id)}
              >
                {hackathon_project_publish({}, options)}
              </Button>
            </>
          ) : null}
        </>
      )}
      {failed ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(failed.error, locale)}
        </StatusMessage>
      ) : null}
    </section>
  );
};
