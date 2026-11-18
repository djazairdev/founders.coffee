import type { ReactNode } from 'react';

const INLINE_MARKDOWN =
  /(!?)\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+"([^"]*)")?\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_/gu;

const safeDestination = (value: string): string | null => {
  const destination = value.replace(/^<|>$/gu, '');
  if (/^(?:https?:|mailto:)/iu.test(destination)) {
    try {
      const url = new URL(destination);
      return ['http:', 'https:', 'mailto:'].includes(url.protocol)
        ? destination
        : null;
    } catch {
      return null;
    }
  }
  return /^(?:\/|#|\?|\.\/|\.\.\/)/u.test(destination) ? destination : null;
};

const inlineNodes = (value: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(INLINE_MARKDOWN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(value.slice(cursor, index));
    const image = match[1] === '!';
    const label = match[2] ?? '';
    const destination = safeDestination(match[3] ?? '');
    if (match[3] !== undefined) {
      if (image && destination) {
        nodes.push(
          <img
            key={index}
            src={destination}
            alt={label}
            loading="lazy"
            className="my-3 max-h-96 max-w-full rounded-box object-contain"
          />,
        );
      } else if (destination) {
        nodes.push(
          <a
            key={index}
            href={destination}
            title={match[4]}
            className="text-accent underline underline-offset-2"
          >
            {inlineNodes(label)}
          </a>,
        );
      } else {
        nodes.push(label);
      }
    } else if (match[5] !== undefined || match[6] !== undefined) {
      nodes.push(
        <strong key={index}>{inlineNodes(match[5] ?? match[6] ?? '')}</strong>,
      );
    } else if (match[7] !== undefined) {
      nodes.push(<del key={index}>{inlineNodes(match[7])}</del>);
    } else if (match[8] !== undefined) {
      nodes.push(
        <code key={index} className="rounded bg-base-200 px-1 py-0.5">
          {match[8]}
        </code>,
      );
    } else {
      nodes.push(
        <em key={index}>{inlineNodes(match[9] ?? match[10] ?? '')}</em>,
      );
    }
    cursor = index + match[0].length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
};

export const MarkdownInline = ({ value }: { value: string }) => (
  <bdi dir="auto">{inlineNodes(value)}</bdi>
);
