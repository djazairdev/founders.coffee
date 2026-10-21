import { z } from 'zod';

export const TOPICS = [
  'bootstrapping',
  'product',
  'design',
  'engineering',
  'finding_customers',
  'community',
  'investing',
  'software_development',
  'building_products',
  'idea_validation',
  'cofounders',
  'partnerships',
  'experience_sharing',
  'learning_new_skills',
] as const;
export type Topic = (typeof TOPICS)[number];
export const topicSchema = z.enum(TOPICS);
