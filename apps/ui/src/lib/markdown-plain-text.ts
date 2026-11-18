const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;
const HTML_NAME_CHARACTER = /[a-z0-9:-]/u;

const readHtmlTag = (source: string, start: number) => {
  if (source[start] !== '<') return null;
  if (source.startsWith('<!--', start)) {
    const commentEnd = source.indexOf('-->', start + 4);
    return {
      name: '',
      closing: false,
      end: commentEnd < 0 ? source.length : commentEnd + 3,
    };
  }

  let cursor = start + 1;
  const closing = source[cursor] === '/';
  if (closing) cursor += 1;
  const nameStart = cursor;
  while (
    cursor < source.length &&
    HTML_NAME_CHARACTER.test(source[cursor]?.toLowerCase() ?? '')
  )
    cursor += 1;
  if (cursor === nameStart) return null;

  const delimiter = source[cursor];
  if (
    delimiter &&
    delimiter !== '>' &&
    delimiter !== '/' &&
    !/\s/u.test(delimiter)
  )
    return null;
  const name = source.slice(nameStart, cursor).toLowerCase();
  let quote = '';
  while (cursor < source.length) {
    const character = source[cursor] ?? '';
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return { name, closing, end: cursor + 1 };
    }
    cursor += 1;
  }

  return { name, closing, end: source.length };
};

const findClosingHtmlTag = (
  source: string,
  lowerSource: string,
  name: string,
  start: number,
): number => {
  let candidate = lowerSource.indexOf(`</${name}`, start);
  while (candidate >= 0) {
    const delimiter = source[candidate + name.length + 2];
    if (
      delimiter === '>' ||
      delimiter === '/' ||
      (delimiter && /\s/u.test(delimiter))
    ) {
      const closingTag = readHtmlTag(source, candidate);
      if (closingTag?.closing && closingTag.name === name)
        return closingTag.end;
    }
    candidate = lowerSource.indexOf(`</${name}`, candidate + name.length + 2);
  }
  return source.length;
};

const stripHtml = (source: string): string => {
  const lowerSource = source.replace(/[A-Z]/g, (character) =>
    character.toLowerCase(),
  );
  let result = '';
  let cursor = 0;
  while (cursor < source.length) {
    if (source[cursor] !== '<') {
      result += source[cursor];
      cursor += 1;
      continue;
    }

    const tag = readHtmlTag(source, cursor);
    if (!tag) {
      result += '＜';
      cursor += 1;
      continue;
    }
    if (!tag.closing && (tag.name === 'script' || tag.name === 'style')) {
      cursor = findClosingHtmlTag(source, lowerSource, tag.name, tag.end);
      continue;
    }
    cursor = tag.end;
  }
  return result;
};

export const markdownPlainText = (value: string): string => {
  const lines: string[] = [];
  let fence: string | null = null;
  let isTable = false;
  const sourceLines = value.replace(/\r\n?/gu, '\n').split('\n');

  for (const [index, line] of sourceLines.entries()) {
    const fenceMatch = line.match(FENCE);
    if (fence !== null) {
      if (
        fenceMatch &&
        fenceMatch[1]?.[0] === fence[0] &&
        (fenceMatch[1]?.length ?? 0) >= fence.length
      )
        fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1] ?? null;
      continue;
    }
    if (TABLE_DIVIDER.test(line)) {
      isTable = true;
      continue;
    }
    if (isTable && line.includes('|')) continue;
    if (isTable) {
      isTable = false;
      if (!line.trim()) continue;
    }
    if (TABLE_DIVIDER.test(sourceLines[index + 1] ?? '')) {
      isTable = true;
      continue;
    }
    if (/^\s*\|.*\|\s*$/u.test(line)) continue;
    lines.push(line);
  }

  return stripHtml(
    lines
      .join('\n')
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gmu, '')
      .replace(/^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+/gmu, '')
      .replace(/^[ \t]{0,3}>[ \t]?/gmu, '')
      .replace(/^[ \t]{0,3}[-*_]{3,}[ \t]*$/gmu, '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/gu, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
      .replace(/(\*\*|__|~~)(.*?)\1/gu, '$2')
      .replace(/(`|\*|_)(.*?)\1/gu, '$2'),
  )
    .replace(/https?:\/\/\S+/giu, '')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+$/gmu, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
};
