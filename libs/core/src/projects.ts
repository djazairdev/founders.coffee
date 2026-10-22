import { z } from 'zod';

export const PROJECT_STAGES = ['idea', 'prototype', 'mvp', 'launched'] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export const projectStageSchema = z.enum(PROJECT_STAGES);

export const PROJECT_STATUSES = ['draft', 'published', 'hidden'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export const PROJECT_MEMBER_ROLES = ['owner', 'member'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];
export const projectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);

export const PROJECT_SLUG_MIN = 3;
export const PROJECT_SLUG_MAX = 80;
export const PROJECT_TITLE_MAX = 100;
export const PROJECT_PROBLEM_MAX = 500;
export const PROJECT_DESCRIPTION_MAX = 2000;
export const PROJECT_URL_MAX = 2048;
