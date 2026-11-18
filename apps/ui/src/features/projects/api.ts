import {
  getProjectEditor,
  getProjectPage,
  leaveProjectPage,
  updateProject,
  type ProjectEditor,
  type ProjectPage,
} from '@founders-coffee/server-fns';
import type { projects } from '@founders-coffee/domain';

export const projectsApi = {
  page: (slug: string) => getProjectPage({ data: { slug } }),
  editor: (slug: string): Promise<ProjectEditor> =>
    getProjectEditor({ data: { slug } }),
  save: (edit: projects.ProjectEdit): Promise<{ version: number }> =>
    updateProject({ data: edit }),
  leave: (projectId: string) => leaveProjectPage({ data: { projectId } }),
};

export type { ProjectEditor, ProjectPage };
