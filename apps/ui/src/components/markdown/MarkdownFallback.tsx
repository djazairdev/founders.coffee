import type { ReactNode } from 'react';

import { MarkdownInline } from './MarkdownInline';
import { markdownSubdocumentSource } from './markdown-subdocument-source';

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/u;
const LIST_ITEM = /^ {0,3}(?:([-*+])|(\d+)[.)])[ \t]+(.*)$/u;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/u;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;

const isolatedInline = (value: string): ReactNode => (
  <MarkdownInline value={value} />
);

const tableCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/gu, '')
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.replace(/\\\|/gu, '|').trim());

const isBlockStart = (lines: readonly string[], index: number): boolean => {
  const line = lines[index] ?? '';
  return (
    HEADING.test(line) ||
    FENCE.test(line) ||
    /^ {0,3}>/u.test(line) ||
    LIST_ITEM.test(line) ||
    /^ {0,3}(?:[-*_]){3,}\s*$/u.test(line) ||
    (index + 1 < lines.length && TABLE_DIVIDER.test(lines[index + 1] ?? ''))
  );
};

const renderBlocks = (value: string): ReactNode[] => {
  const lines = value.replace(/\r\n?/gu, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !new RegExp(
          `^ {0,3}${fence[1][0]}{${fence[1].length},}\\s*$`,
          'u',
        ).test(lines[index] ?? '')
      ) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="my-4 overflow-x-auto rounded-box bg-base-200 p-4"
        >
          <code className="font-mono text-body-sm">{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      const content = isolatedInline(heading[2]);
      const className = 'my-4 font-display font-semibold text-base-content';
      const key = `heading-${index}`;
      blocks.push(
        level === 1 ? (
          <h1 key={key} className={`${className} text-h3`}>
            {content}
          </h1>
        ) : level === 2 ? (
          <h2 key={key} className={`${className} text-h4`}>
            {content}
          </h2>
        ) : level === 3 ? (
          <h3 key={key} className={`${className} text-h5`}>
            {content}
          </h3>
        ) : level === 4 ? (
          <h4 key={key} className={`${className} text-h6`}>
            {content}
          </h4>
        ) : level === 5 ? (
          <h5 key={key} className={`${className} text-body-lg`}>
            {content}
          </h5>
        ) : (
          <h6 key={key} className={`${className} text-body-md`}>
            {content}
          </h6>
        ),
      );
      index += 1;
      continue;
    }

    if (/^ {0,3}(?:[-*_]){3,}\s*$/u.test(line)) {
      blocks.push(
        <hr key={`rule-${index}`} className="my-5 border-base-300" />,
      );
      index += 1;
      continue;
    }

    if (/^ {0,3}>/u.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^ {0,3}>/u.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^ {0,3}>[ \t]?/u, ''));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-4 border-s-4 border-base-300 ps-4 text-neutral"
        >
          {renderBlocks(quote.join('\n'))}
        </blockquote>,
      );
      continue;
    }

    if (
      index + 1 < lines.length &&
      TABLE_DIVIDER.test(lines[index + 1] ?? '')
    ) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|')) {
        rows.push(tableCells(lines[index] ?? ''));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={cellIndex}>{isolatedInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex}>
                      {isolatedInline(row[cellIndex] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const listItem = line.match(LIST_ITEM);
    if (listItem) {
      const isOrdered = listItem[2] !== undefined;
      const items: string[] = [listItem[3] ?? ''];
      index += 1;
      while (index < lines.length) {
        const next = (lines[index] ?? '').match(LIST_ITEM);
        if (!next || (next[2] !== undefined) !== isOrdered) break;
        items.push(next[3] ?? '');
        index += 1;
      }
      const content = items.map((item, itemIndex) => (
        <li key={itemIndex}>{isolatedInline(item)}</li>
      ));
      blocks.push(
        isOrdered ? (
          <ol
            key={`list-${index}`}
            start={Number(listItem[2])}
            className="my-4 list-decimal space-y-1 ps-6"
          >
            {content}
          </ol>
        ) : (
          <ul key={`list-${index}`} className="my-4 list-disc space-y-1 ps-6">
            {content}
          </ul>
        ),
      );
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() !== '' &&
      !isBlockStart(lines, index)
    ) {
      paragraph.push(lines[index] ?? '');
      index += 1;
    }
    blocks.push(
      <p
        key={`paragraph-${index}`}
        className="my-4 leading-relaxed text-neutral"
      >
        {paragraph.map((part, partIndex) => (
          <span key={partIndex}>
            {partIndex > 0 ? <br /> : null}
            {isolatedInline(part)}
          </span>
        ))}
      </p>,
    );
  }

  return blocks;
};

export const MarkdownFallback = ({ value }: { value: string }) => (
  <div className="markdown-fallback text-body-md text-base-content">
    {renderBlocks(markdownSubdocumentSource(value))}
  </div>
);
