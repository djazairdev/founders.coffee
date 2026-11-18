import { useState, type FormEvent } from 'react';

import {
  appErrorCode,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_STAGES,
  PROJECT_URL_MAX,
} from '@founders-coffee/core';
import {
  optional,
  profile_link_invalid,
  project_edit_description,
  project_edit_reload,
  project_edit_save,
  project_edit_save_error,
  project_edit_saved,
  project_edit_saving,
  project_edit_search,
  project_edit_search_hint,
  project_edit_stage,
  project_edit_stale,
  project_page_code,
  project_page_demo,
  project_page_stage_idea,
  project_page_stage_launched,
  project_page_stage_mvp,
  project_page_stage_prototype,
  project_page_website,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  fieldNoteId,
  FormField,
  StatusMessage,
} from '@founders-coffee/ui';

import type { ProjectEditor } from '../api';
import { useSaveProject } from '../hooks';
import {
  PROJECT_LINK_FIELDS,
  projectDraftOf,
  projectEditOf,
  type ProjectLinkField,
} from '../project-form';

const STAGE = {
  idea: project_page_stage_idea,
  prototype: project_page_stage_prototype,
  mvp: project_page_stage_mvp,
  launched: project_page_stage_launched,
};

const LINK_LABEL = {
  repositoryUrl: project_page_code,
  demoUrl: project_page_demo,
  websiteUrl: project_page_website,
};

const STAGE_ID = 'project-edit-stage';
const DESCRIPTION_ID = 'project-edit-description';
const SEARCH_ID = 'project-edit-search';
const linkId = (field: ProjectLinkField) => `project-edit-${field}`;

export const ProjectEditForm = ({
  editor,
  locale,
  onReload,
}: {
  editor: ProjectEditor;
  locale: Locale;
  onReload: () => void;
}) => {
  const options = { locale };
  const save = useSaveProject(editor.slug);
  const [draft, setDraft] = useState(() => projectDraftOf(editor));
  const [invalid, setInvalid] = useState<readonly ProjectLinkField[]>([]);
  const change = (next: Partial<typeof draft>) => {
    save.reset();
    setDraft({ ...draft, ...next });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const { edit, invalid: refused } = projectEditOf(draft, editor);
    setInvalid(refused ?? []);
    const [first] = refused ?? [];
    if (first) document.getElementById(linkId(first))?.focus();
    if (edit) save.mutate(edit);
  };
  const isStale = appErrorCode(save.error) === 'stale_version';
  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <FormField
        id={STAGE_ID}
        label={project_edit_stage({}, options)}
        optionalLabel={optional({}, options)}
      >
        <select
          id={STAGE_ID}
          className="select select-sm md:select-md w-full"
          value={draft.stage}
          onChange={(event) => {
            const stage = PROJECT_STAGES.find(
              (name) => name === event.target.value,
            );
            if (stage) change({ stage });
          }}
        >
          {PROJECT_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE[stage]({}, options)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id={DESCRIPTION_ID}
        label={project_edit_description({}, options)}
        isOptional
        optionalLabel={optional({}, options)}
      >
        <textarea
          id={DESCRIPTION_ID}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={6}
          dir="auto"
          maxLength={PROJECT_DESCRIPTION_MAX}
          value={draft.description}
          onChange={(event) => change({ description: event.target.value })}
        />
      </FormField>
      {PROJECT_LINK_FIELDS.map((field) => (
        <FormField
          key={field}
          id={linkId(field)}
          label={LINK_LABEL[field]({}, options)}
          isOptional
          optionalLabel={optional({}, options)}
          error={
            invalid.includes(field) ? profile_link_invalid({}, options) : null
          }
        >
          <input
            id={linkId(field)}
            type="url"
            dir="ltr"
            className="input input-sm md:input-md w-full"
            maxLength={PROJECT_URL_MAX}
            aria-invalid={invalid.includes(field)}
            aria-describedby={
              invalid.includes(field) ? fieldNoteId(linkId(field)) : undefined
            }
            value={draft[field]}
            onChange={(event) => change({ [field]: event.target.value })}
          />
        </FormField>
      ))}
      <div className="flex items-start gap-2">
        <input
          id={SEARCH_ID}
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary mt-0.5"
          aria-describedby={`${SEARCH_ID}-hint`}
          checked={draft.isSearchIndexable}
          onChange={(event) =>
            change({ isSearchIndexable: event.target.checked })
          }
        />
        <div className="grid gap-1">
          <label htmlFor={SEARCH_ID} className="text-label">
            {project_edit_search({}, options)}
          </label>
          <p id={`${SEARCH_ID}-hint`} className="text-body-sm text-neutral">
            {project_edit_search_hint({}, options)}
          </p>
        </div>
      </div>
      {isStale ? (
        <StatusMessage
          variant="error"
          action={
            <Button variant="outline" onClick={onReload}>
              {project_edit_reload({}, options)}
            </Button>
          }
        >
          {project_edit_stale({}, options)}
        </StatusMessage>
      ) : save.isError ? (
        <StatusMessage variant="error">
          {project_edit_save_error({}, options)}
        </StatusMessage>
      ) : null}
      {save.isSuccess ? (
        <StatusMessage variant="success">
          {project_edit_saved({}, options)}
        </StatusMessage>
      ) : null}
      <div>
        <Button type="submit" variant="primary">
          {save.isPending
            ? project_edit_saving({}, options)
            : project_edit_save({}, options)}
        </Button>
      </div>
    </form>
  );
};
