const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;

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

  return lines
    .join('\n')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gmu, '')
    .replace(/^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+/gmu, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gmu, '')
    .replace(/^[ \t]{0,3}[-*_]{3,}[ \t]*$/gmu, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/https?:\/\/\S+/giu, '')
    .replace(/(\*\*|__|~~)(.*?)\1/gu, '$2')
    .replace(/(`|\*|_)(.*?)\1/gu, '$2')
    .replace(/<[^>]*>/gu, '')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+$/gmu, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
};
