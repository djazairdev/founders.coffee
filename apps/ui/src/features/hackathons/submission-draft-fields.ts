export type SubmissionDraftFields = {
  readonly trackId: string | null;
  readonly title: string;
  readonly description: string;
  readonly repositoryUrl: string | null;
  readonly demoVideoUrl: string | null;
  readonly pullRequestUrls: readonly string[];
  readonly aiTools: readonly string[];
  readonly aiStatement: string | null;
};
