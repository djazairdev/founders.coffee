import { markdownPlainText } from '../../lib/markdown-plain-text';
import { clipAtWord } from '../../lib/seo-text';

const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
const HEADING = /^ {0,3}#{1,6}[ \t]+/u;
const LIST = /^ {0,3}(?:[-*+]|\d+[.)])[ \t]+/u;
const RULE = /^ {0,3}(?:[-*_]){3,}\s*$/u;

const isUsefulParagraph = (value: string): boolean => {
  const text = markdownPlainText(value)
    .replace(/https?:\/\/\S+/giu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return text.length > 0 && !/^\[[^\]]*\]$/u.test(text);
};

const readableParagraphs = (markdown: string): string[] => {
  const paragraphs: string[] = [];
  let paragraph: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    const value = paragraph.join(' ').trim();
    if (isUsefulParagraph(value)) paragraphs.push(value);
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n?/gu, '\n').split('\n')) {
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
      flush();
      fence = fenceMatch[1] ?? null;
      continue;
    }
    if (
      !line.trim() ||
      HEADING.test(line) ||
      LIST.test(line) ||
      RULE.test(line)
    ) {
      flush();
      continue;
    }
    if (line.includes('|') || /^ {0,3}</u.test(line)) {
      flush();
      continue;
    }
    paragraph.push(line.replace(/^ {0,3}>[ \t]?/u, ''));
  }

  flush();
  return paragraphs
    .map((paragraph) =>
      markdownPlainText(paragraph)
        .replace(/https?:\/\/\S+/giu, '')
        .replace(/\s+/gu, ' ')
        .trim(),
    )
    .filter(Boolean);
};

export const hackathonSummary = (markdown: string): string | null => {
  const paragraphs = readableParagraphs(markdown);
  let value = '';

  for (const paragraph of paragraphs) {
    value = `${value} ${paragraph}`.trim();
    if (Array.from(value).length >= 180) break;
  }

  const summary = clipAtWord(value, 240);
  return summary || null;
};
