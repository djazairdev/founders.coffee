import {
  hackathon_desc_ph,
  hackathon_preview_description,
  hackathon_preview_empty,
  hackathon_title_ph,
  type Locale,
} from '@founders-coffee/i18n';
import { MarkdownDescription } from '../../../components/markdown/MarkdownDescription';

export const HackathonDescriptionPreview = ({
  locale,
  title,
  description,
}: {
  locale: Locale;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex h-full min-h-80 overflow-hidden bg-base-200 lg:min-h-0">
      <article className="flex min-h-0 w-full flex-1 flex-col bg-base-100 p-5 lg:p-8">
        <h2
          className={`font-display text-h3 font-semibold leading-snug text-base-content ${
            title.trim() ? '' : 'text-neutral'
          }`}
          dir="auto"
        >
          {title.trim() || hackathon_title_ph({}, { locale })}
        </h2>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-base-300 pt-4">
          {description.trim() ? (
            <MarkdownDescription
              locale={locale}
              value={description}
              label={hackathon_preview_description({}, { locale })}
            />
          ) : (
            <div>
              <p className="text-body text-neutral">
                {hackathon_preview_empty({}, { locale })}
              </p>
              <p className="mt-3 text-body-sm text-neutral/70" dir="auto">
                {hackathon_desc_ph({}, { locale })}
              </p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};
