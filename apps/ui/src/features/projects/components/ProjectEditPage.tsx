import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_project_status_draft,
  hackathon_project_status_hidden,
  hackathon_project_status_published,
  hackathon_project_view,
  project_edit_load_error,
  project_edit_loading,
  project_edit_not_found,
  project_edit_not_owner,
  project_edit_title,
  project_left,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import { localizedProject } from '../../../lib/locale-routing';
import { useProjectEditor } from '../hooks';
import { ProjectEditForm } from './ProjectEditForm';
import { ProjectLeave } from './ProjectLeave';

const STATUS = {
  draft: hackathon_project_status_draft,
  published: hackathon_project_status_published,
  hidden: hackathon_project_status_hidden,
};

export const ProjectEditPage = ({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) => {
  const options = { locale };
  const query = useProjectEditor(slug);
  const [hasLeft, setHasLeft] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const editor = query.data;
  const reload = async () => {
    await query.refetch();
    setFormKey((key) => key + 1);
  };
  return (
    <section className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-h2 font-semibold">
        {project_edit_title({}, options)}
      </h1>
      {hasLeft ? (
        <StatusMessage variant="success">
          {project_left({}, options)}
        </StatusMessage>
      ) : editor ? (
        <>
          <div className="grid gap-1">
            <p className="font-medium">
              <bdi className="break-words">{editor.title}</bdi>
            </p>
            <p className="text-body-sm text-neutral">
              {STATUS[editor.status]({}, options)}
            </p>
            {editor.status === 'published' ? (
              <Link
                {...localizedProject(locale, editor.slug)}
                className="link w-fit text-body-sm"
              >
                {hackathon_project_view({}, options)}
              </Link>
            ) : null}
          </div>
          {editor.role === 'owner' ? (
            <ProjectEditForm
              key={formKey}
              editor={editor}
              locale={locale}
              onReload={() => void reload()}
            />
          ) : (
            <StatusMessage variant="info">
              {project_edit_not_owner({}, options)}
            </StatusMessage>
          )}
          <ProjectLeave
            editor={editor}
            locale={locale}
            onLeft={() => setHasLeft(true)}
          />
        </>
      ) : query.isError ? (
        appErrorCode(query.error) === 'project_not_found' ? (
          <StatusMessage variant="error">
            {project_edit_not_found({}, options)}
          </StatusMessage>
        ) : (
          <StatusMessage
            variant="error"
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                {retry({}, options)}
              </Button>
            }
          >
            {project_edit_load_error({}, options)}
          </StatusMessage>
        )
      ) : (
        <LoadingStatus label={project_edit_loading({}, options)} />
      )}
    </section>
  );
};
