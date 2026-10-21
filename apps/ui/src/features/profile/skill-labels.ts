import { PROFILE_SKILLS, type ProfileSkill } from '@founders-coffee/core';
import {
  skill_frontend,
  skill_backend,
  skill_mobile,
  skill_devops,
  skill_cloud,
  skill_data,
  skill_ai_ml,
  skill_security,
  skill_embedded,
  skill_game_dev,
  skill_ui_design,
  skill_ux_research,
  skill_product,
  skill_project_management,
  skill_marketing,
  skill_sales,
  skill_finance,
  skill_legal,
  skill_operations,
  skill_community,
  skill_content,
  skill_fundraising,
  skill_teaching,
  type Locale,
} from '@founders-coffee/i18n';

const SKILL_MESSAGES = {
  frontend: skill_frontend,
  backend: skill_backend,
  mobile: skill_mobile,
  devops: skill_devops,
  cloud: skill_cloud,
  data: skill_data,
  ai_ml: skill_ai_ml,
  security: skill_security,
  embedded: skill_embedded,
  game_dev: skill_game_dev,
  ui_design: skill_ui_design,
  ux_research: skill_ux_research,
  product: skill_product,
  project_management: skill_project_management,
  marketing: skill_marketing,
  sales: skill_sales,
  finance: skill_finance,
  legal: skill_legal,
  operations: skill_operations,
  community: skill_community,
  content: skill_content,
  fundraising: skill_fundraising,
  teaching: skill_teaching,
} as const satisfies Record<
  ProfileSkill,
  (input: Record<string, never>, options: { locale: Locale }) => string
>;

export const SKILL_OPTIONS = PROFILE_SKILLS;

/** Name a skill from the fixed list in the reader's language. */
export const skillLabel = (skill: ProfileSkill, locale: Locale): string =>
  SKILL_MESSAGES[skill]({}, { locale });
