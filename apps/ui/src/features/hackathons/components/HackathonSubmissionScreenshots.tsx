import { useRef } from 'react';

import {
  hackathon_screenshot_add,
  hackathon_screenshot_hint,
  hackathon_screenshot_remove,
  hackathon_screenshot_save_first,
  hackathon_screenshots_label,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { SubmissionPageView } from '../api';
import { screenshotErrorMessage } from '../screenshot-errors';
import {
  useAddSubmissionScreenshot,
  useRemoveSubmissionScreenshot,
} from '../submission-hooks';
import { HackathonScreenshotImage } from './HackathonScreenshotImage';

const SCREENSHOT_LIMIT = 3;
const ACCEPTED = 'image/jpeg,image/png,image/webp';

export const HackathonSubmissionScreenshots = ({
  eventId,
  entry,
  title,
  isReadOnly,
  locale,
}: {
  eventId: string;
  entry: SubmissionPageView['entry'];
  title: string;
  isReadOnly: boolean;
  locale: Locale;
}) => {
  const options = { locale };
  const input = useRef<HTMLInputElement>(null);
  const add = useAddSubmissionScreenshot(eventId);
  const remove = useRemoveSubmissionScreenshot(eventId);
  const screenshots = entry?.screenshots ?? [];
  if (isReadOnly && screenshots.length === 0) return null;
  const failure = add.error ?? remove.error;
  return (
    <fieldset className="grid gap-2">
      <legend className="text-label">
        {hackathon_screenshots_label({}, options)}{' '}
        <span className="ms-0.5 text-neutral">
          ({optional({}, options).toLowerCase()})
        </span>
      </legend>
      {isReadOnly ? null : (
        <p className="text-body-sm text-neutral">
          {entry
            ? hackathon_screenshot_hint({}, options)
            : hackathon_screenshot_save_first({}, options)}
        </p>
      )}
      {screenshots.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {screenshots.map((screenshot, index) => (
            <li key={screenshot.id} className="grid gap-2">
              <HackathonScreenshotImage
                screenshot={screenshot}
                position={index + 1}
                title={title}
                locale={locale}
              />
              {isReadOnly ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  isBusy={remove.isPending}
                  onClick={() => remove.mutate(screenshot.id)}
                >
                  {hackathon_screenshot_remove(
                    { position: index + 1 },
                    options,
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {failure ? (
        <StatusMessage variant="error">
          {screenshotErrorMessage(failure, locale)}
        </StatusMessage>
      ) : null}
      {isReadOnly || !entry || screenshots.length >= SCREENSHOT_LIMIT ? null : (
        <div>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) add.mutate(file);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            isBusy={add.isPending}
            onClick={() => input.current?.click()}
          >
            {hackathon_screenshot_add({}, options)}
          </Button>
        </div>
      )}
    </fieldset>
  );
};
