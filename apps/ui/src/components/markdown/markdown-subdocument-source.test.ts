import { describe, expect, it } from 'vitest';

import { markdownSubdocumentSource } from './markdown-subdocument-source';

describe('markdownSubdocumentSource', () => {
  it('demotes document headings while preserving fenced code examples', () => {
    expect(
      markdownSubdocumentSource(
        '# Event title\n## Section\n\n```md\n# Literal heading\n```\n~~~~\n## Literal section\n~~~~',
      ),
    ).toBe(
      '## Event title\n### Section\n\n```md\n# Literal heading\n```\n~~~~\n## Literal section\n~~~~',
    );
  });

  it('keeps headings within the supported six-level range', () => {
    expect(markdownSubdocumentSource('###### Subsection')).toBe(
      '###### Subsection',
    );
  });
});
