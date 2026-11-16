import { ArrowUpRight } from 'lucide-react';

import {
  formatNumber,
  innovation_stat_source,
  innovation_stat_statement,
  type Locale,
} from '@founders-coffee/i18n';

const SURVEY_SOURCE =
  'https://www.bcg.com/publications/2024/innovation-systems-need-a-reboot';

export const InnovationInsight = ({ locale }: { locale: Locale }) => {
  const percentage = formatNumber(0.83, locale, { style: 'percent' });

  return (
    <section
      aria-labelledby="innovation-insight-title"
      className="mx-auto max-w-content px-4 pt-10 md:px-8 md:pt-14"
    >
      <figure className="grid items-center gap-5 border-y border-base-300 py-8 text-center sm:grid-cols-[auto_1fr] sm:gap-x-8 sm:gap-y-4 sm:text-start md:gap-x-12 md:py-10">
        <p
          aria-hidden="true"
          className="relative w-fit justify-self-center font-display text-display leading-none font-semibold tracking-tight whitespace-nowrap text-accent"
        >
          <bdi>{percentage}</bdi>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 320 32"
            preserveAspectRatio="none"
            className="absolute inset-x-0 -bottom-2 h-3 w-full text-secondary md:bottom-0 md:h-4"
          >
            <path
              d="M5 25Q160 1 315 25"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </p>
        <figcaption className="sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:grid sm:grid-rows-subgrid sm:self-stretch">
          <h2
            id="innovation-insight-title"
            className="max-w-prose font-display text-h3 leading-snug font-bold text-pretty text-base-content sm:self-center md:text-h2"
          >
            <span className="sr-only">{percentage} </span>
            {innovation_stat_statement({}, { locale })}
          </h2>
          <a
            href={SURVEY_SOURCE}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-hover tap-target mt-4 inline-flex items-center gap-1 rounded-field text-caption text-neutral sm:mt-0 sm:justify-self-start"
          >
            {innovation_stat_source({}, { locale })}
            <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
          </a>
        </figcaption>
      </figure>
    </section>
  );
};
