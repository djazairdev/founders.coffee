import { projects } from '@founders-coffee/domain';

import type { ProjectEditor } from './api';

export const PROJECT_LINK_FIELDS = [
  'repositoryUrl',
  'demoUrl',
  'websiteUrl',
] as const;
export type ProjectLinkField = (typeof PROJECT_LINK_FIELDS)[number];

export type ProjectDraft = Pick<
  ProjectEditor,
  'stage' | 'description' | 'isSearchIndexable'
> &
  Record<ProjectLinkField, string>;

/** The form's starting values, from what is saved. */
export const projectDraftOf = (editor: ProjectEditor): ProjectDraft => ({
  stage: editor.stage,
  description: editor.description,
  repositoryUrl: editor.repositoryUrl ?? '',
  demoUrl: editor.demoUrl ?? '',
  websiteUrl: editor.websiteUrl ?? '',
  isSearchIndexable: editor.isSearchIndexable,
});

const linkOf = (value: string): string | null => value.trim() || null;

const isLinkField = (field: unknown): field is ProjectLinkField =>
  PROJECT_LINK_FIELDS.some((name) => name === field);

/**
 * Check the form against the shared schema, for the version it was opened at. An empty link means
 * no link. Returns the edit to send, or the links the schema refused.
 */
export const projectEditOf = (
  draft: ProjectDraft,
  editor: Pick<ProjectEditor, 'id' | 'version'>,
):
  | { readonly edit: projects.ProjectEdit; readonly invalid: null }
  | { readonly edit: null; readonly invalid: readonly ProjectLinkField[] } => {
  const parsed = projects.projectEditSchema.safeParse({
    projectId: editor.id,
    expectedVersion: editor.version,
    stage: draft.stage,
    description: draft.description,
    repositoryUrl: linkOf(draft.repositoryUrl),
    demoUrl: linkOf(draft.demoUrl),
    websiteUrl: linkOf(draft.websiteUrl),
    isSearchIndexable: draft.isSearchIndexable,
  });
  if (parsed.success) return { edit: parsed.data, invalid: null };
  return {
    edit: null,
    invalid: parsed.error.issues
      .map((issue) => issue.path[0])
      .filter(isLinkField),
  };
};
