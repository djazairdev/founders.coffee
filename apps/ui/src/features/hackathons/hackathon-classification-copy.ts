import type { HackathonField, HackathonTypeTag } from '@founders-coffee/core';
import {
  hackathon_field_artificial_intelligence,
  hackathon_field_blockchain,
  hackathon_field_cloud_computing,
  hackathon_field_cybersecurity,
  hackathon_field_design,
  hackathon_field_education,
  hackathon_field_entrepreneurship,
  hackathon_field_environment_sustainability,
  hackathon_field_fintech,
  hackathon_field_games,
  hackathon_field_health,
  hackathon_field_internet_of_things,
  hackathon_field_mobile_apps,
  hackathon_field_robotics,
  hackathon_field_smart_agriculture,
  hackathon_field_smart_cities,
  hackathon_field_social_innovation,
  hackathon_field_software_development,
  hackathon_field_web_development,
  hackathon_fields_hint,
  hackathon_fields_label,
  hackathon_type_beginner_friendly,
  hackathon_type_company_challenges,
  hackathon_type_no_code,
  hackathon_type_open_source,
  hackathon_type_open_topics,
  hackathon_type_tags_label,
  hackathon_type_tags_question,
  host_required,
  type Locale,
} from '@founders-coffee/i18n';

const FIELD_LABELS = {
  artificial_intelligence: hackathon_field_artificial_intelligence,
  software_development: hackathon_field_software_development,
  cybersecurity: hackathon_field_cybersecurity,
  web_development: hackathon_field_web_development,
  mobile_apps: hackathon_field_mobile_apps,
  robotics: hackathon_field_robotics,
  internet_of_things: hackathon_field_internet_of_things,
  blockchain: hackathon_field_blockchain,
  fintech: hackathon_field_fintech,
  health: hackathon_field_health,
  education: hackathon_field_education,
  environment_sustainability: hackathon_field_environment_sustainability,
  smart_agriculture: hackathon_field_smart_agriculture,
  smart_cities: hackathon_field_smart_cities,
  games: hackathon_field_games,
  design: hackathon_field_design,
  social_innovation: hackathon_field_social_innovation,
  entrepreneurship: hackathon_field_entrepreneurship,
  cloud_computing: hackathon_field_cloud_computing,
} satisfies Record<
  HackathonField,
  (input: Record<string, never>, options: { locale: Locale }) => string
>;

const TYPE_LABELS = {
  open_topics: hackathon_type_open_topics,
  beginner_friendly: hackathon_type_beginner_friendly,
  company_challenges: hackathon_type_company_challenges,
  open_source: hackathon_type_open_source,
  no_code: hackathon_type_no_code,
} satisfies Record<
  HackathonTypeTag,
  (input: Record<string, never>, options: { locale: Locale }) => string
>;

export const hackathonClassificationCopy = (locale: Locale) => ({
  fieldsLabel: hackathon_fields_label({}, { locale }),
  fieldsHint: hackathon_fields_hint({}, { locale }),
  fieldsRequired: host_required({}, { locale }),
  typeTagsLabel: hackathon_type_tags_label({}, { locale }),
  typeTagsQuestion: hackathon_type_tags_question({}, { locale }),
  typeTagsRequired: host_required({}, { locale }),
  required: host_required({}, { locale }),
  fieldLabel: (field: HackathonField) => FIELD_LABELS[field]({}, { locale }),
  typeTagLabel: (tag: HackathonTypeTag) => TYPE_LABELS[tag]({}, { locale }),
});
