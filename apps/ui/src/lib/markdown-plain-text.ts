export const markdownPlainText = (value: string) =>
  value
    .replace(/^[ \t]*```[^\n]*$/gmu, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gmu, '')
    .replace(/^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]+/gmu, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gmu, '')
    .replace(/^[ \t]{0,3}[-*_]{3,}[ \t]*$/gmu, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/<[^>]*>/gu, '')
    .replace(/(\*\*|__|~~)(.*?)\1/gu, '$2')
    .replace(/(`|\*|_)(.*?)\1/gu, '$2')
    .trim();
