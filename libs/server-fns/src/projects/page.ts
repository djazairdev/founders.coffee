import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  hackathonsEnabled,
  listListedProjectMembers,
  readPublicProject,
  type Db,
  type PublicProject,
} from '@founders-coffee/db';

export type ProjectPage = Omit<
  PublicProject,
  'id' | 'updatedAt' | 'hackathonTitle' | 'hackathonSlug'
> & {
  readonly updatedAt: number;
  readonly hackathon: {
    readonly title: string;
    readonly slug: string;
  } | null;
  readonly members: readonly {
    readonly userId: string;
    readonly name: string;
  }[];
};

const notFound = () =>
  err(new AppError('project_not_found', 'This project is not public'));

/**
 * A project's public page, for anyone (B-PRJ-03). A draft, a hidden project and a project in a market
 * that has hackathons off all read as not found, so the page says nothing about which it was.
 */
export const projectPageResolver = async (
  db: Db,
  slug: string,
): Promise<Result<ProjectPage>> => {
  const project = await readPublicProject(db, slug);
  if (!project || !(await hackathonsEnabled(db, project.marketCode)))
    return notFound();
  const { id, updatedAt, hackathonTitle, hackathonSlug, ...rest } = project;
  return ok({
    ...rest,
    updatedAt: updatedAt.getTime(),
    hackathon:
      hackathonTitle !== null && hackathonSlug !== null
        ? { title: hackathonTitle, slug: hackathonSlug }
        : null,
    members: await listListedProjectMembers(db, id),
  });
};
