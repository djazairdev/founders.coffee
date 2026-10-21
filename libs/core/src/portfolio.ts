import { z } from 'zod';

export const PROFILE_SKILLS = [
  'frontend',
  'backend',
  'mobile',
  'devops',
  'cloud',
  'data',
  'ai_ml',
  'security',
  'embedded',
  'game_dev',
  'ui_design',
  'ux_research',
  'product',
  'project_management',
  'marketing',
  'sales',
  'finance',
  'legal',
  'operations',
  'community',
  'content',
  'fundraising',
  'teaching',
] as const;
export type ProfileSkill = (typeof PROFILE_SKILLS)[number];
export const profileSkillSchema = z.enum(PROFILE_SKILLS);

export const PROFILE_LINK_KINDS = ['github', 'linkedin', 'website'] as const;
export type ProfileLinkKind = (typeof PROFILE_LINK_KINDS)[number];
export const profileLinkKindSchema = z.enum(PROFILE_LINK_KINDS);

export const PROFILE_OPEN_TO = ['jobs', 'internships', 'co_founding'] as const;
export type ProfileOpenTo = (typeof PROFILE_OPEN_TO)[number];
export const profileOpenToSchema = z.enum(PROFILE_OPEN_TO);
