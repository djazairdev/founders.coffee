import type { Locale } from '@founders-coffee/i18n';
import { ExternalLink } from 'lucide-react';

import type { PublicProfile } from '../api';
import { publicLinkLabel } from '../portfolio-labels';

export const PublicProfileLinks = ({
  locale,
  links,
}: {
  locale: Locale;
  links: PublicProfile['links'];
}) =>
  links.length > 0 ? (
    <ul className="flex shrink-0 flex-wrap gap-2 self-start sm:justify-end">
      {links.map((link) => {
        const label = publicLinkLabel(link.kind, locale);
        return (
          <li key={link.kind}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              aria-label={`${label}: ${link.url}`}
              className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
            >
              <span>{label}</span>
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  ) : null;
