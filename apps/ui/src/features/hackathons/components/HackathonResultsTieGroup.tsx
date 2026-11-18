import { ArrowDown, ArrowUp } from 'lucide-react';

import {
  hackathon_results_panel_move_down,
  hackathon_results_panel_move_up,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonResultsEntry } from '../api';

const moveClass = (isAtEnd: boolean) =>
  `btn btn-ghost btn-xs sm:btn-sm md:btn-md ${isAtEnd ? 'btn-disabled' : ''}`;

export const HackathonResultsTieGroup = ({
  entries,
  isDisabled,
  locale,
  onMove,
}: {
  entries: readonly HackathonResultsEntry[];
  isDisabled: boolean;
  locale: Locale;
  onMove: (index: number, delta: -1 | 1) => void;
}) => (
  <ol className="divide-y divide-base-300 rounded-box border border-base-300">
    {entries.map((entry, index) => {
      const title = entry.title;
      const isFirst = index === 0;
      const isLast = index === entries.length - 1;
      return (
        <li
          key={entry.submissionId}
          className="flex items-center justify-between gap-2 p-2"
        >
          <span className="min-w-0 text-body-sm">
            <bdi className="break-words">{title}</bdi>
          </span>
          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              className={moveClass(isFirst)}
              aria-disabled={isFirst || isDisabled}
              aria-label={hackathon_results_panel_move_up(
                { title },
                { locale },
              )}
              onClick={() => {
                if (!isFirst && !isDisabled) onMove(index, -1);
              }}
            >
              <ArrowUp aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              className={moveClass(isLast)}
              aria-disabled={isLast || isDisabled}
              aria-label={hackathon_results_panel_move_down(
                { title },
                { locale },
              )}
              onClick={() => {
                if (!isLast && !isDisabled) onMove(index, 1);
              }}
            >
              <ArrowDown aria-hidden="true" className="size-4" />
            </button>
          </span>
        </li>
      );
    })}
  </ol>
);
