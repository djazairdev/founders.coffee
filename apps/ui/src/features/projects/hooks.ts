import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { projects } from '@founders-coffee/domain';

import { projectsApi, type ProjectEditor } from './api';

const editorKey = (slug: string) => ['projects', 'editor', slug] as const;

/** A project as one of its members sees it; always read fresh, since a teammate may have edited it. */
export const useProjectEditor = (slug: string) =>
  useQuery({
    queryKey: editorKey(slug),
    queryFn: () => projectsApi.editor(slug),
    staleTime: 0,
    retry: false,
  });

/** Save an owner's edit, and take its new version at once so a second save is not refused as stale. */
export const useSaveProject = (slug: string) => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (edit: projects.ProjectEdit) => projectsApi.save(edit),
    onSuccess: ({ version }) =>
      cache.setQueryData<ProjectEditor>(editorKey(slug), (editor) =>
        editor ? { ...editor, version } : editor,
      ),
  });
};

/** Leave a project, then let the team page read where its member now stands. */
export const useLeaveProject = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.leave(projectId),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ['hackathons', 'team'] }),
  });
};
