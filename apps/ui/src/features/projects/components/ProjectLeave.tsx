import { useState } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  cancel,
  project_leave_button,
  project_leave_confirm,
  project_leave_error,
  project_leave_heading,
  project_leave_last,
  project_leave_note,
  project_leave_note_owner,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { ProjectEditor } from '../api';
import { useLeaveProject } from '../hooks';

const HEADING_ID = 'project-leave-heading';

export const ProjectLeave = ({
  editor,
  locale,
  onLeft,
}: {
  editor: ProjectEditor;
  locale: Locale;
  onLeft: () => void;
}) => {
  const options = { locale };
  const leave = useLeaveProject();
  const [isAsking, setIsAsking] = useState(false);
  const isLast =
    !editor.canLeave || appErrorCode(leave.error) === 'project_last_member';
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="border-t border-base-300 pt-6"
    >
      <h2 id={HEADING_ID} className="font-display text-h4">
        {project_leave_heading({}, options)}
      </h2>
      {isLast ? (
        <p className="mt-2 text-body-sm text-neutral">
          {project_leave_last({}, options)}
        </p>
      ) : (
        <>
          <p className="mt-2 text-body-sm text-neutral">
            {editor.role === 'owner'
              ? project_leave_note_owner({}, options)
              : project_leave_note({}, options)}
          </p>
          {leave.isError ? (
            <StatusMessage variant="error" className="mt-3">
              {project_leave_error({}, options)}
            </StatusMessage>
          ) : null}
          {isAsking ? (
            <div className="mt-3 grid gap-2">
              <p className="text-body-sm font-medium">
                {project_leave_confirm({}, options)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!leave.isPending)
                      leave.mutate(editor.id, { onSuccess: onLeft });
                  }}
                >
                  {project_leave_button({}, options)}
                </Button>
                <Button variant="ghost" onClick={() => setIsAsking(false)}>
                  {cancel({}, options)}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setIsAsking(true)}
            >
              {project_leave_button({}, options)}
            </Button>
          )}
        </>
      )}
    </section>
  );
};
