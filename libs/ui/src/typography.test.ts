import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('P1-002 date badge typography', () => {
  it('uses the shared caption size and line-height instead of the tight overline scale', () => {
    const styles = readFileSync(
      new URL('./styles.css', import.meta.url),
      'utf8',
    );
    const dateStyle = styles.match(/\.datechip-line\s*\{([^}]+)\}/)?.[1];
    expect(dateStyle).toContain('font-size: var(--text-caption)');
    expect(dateStyle).toContain(
      'line-height: var(--text-caption--line-height)',
    );
    expect(dateStyle).not.toContain('overline');
  });
});

describe('the sticky header and keyboard focus', () => {
  it('keeps a field reached with Shift+Tab out from under the header (#472)', () => {
    const styles = readFileSync(
      new URL('./styles.css', import.meta.url),
      'utf8',
    );

    expect(styles).toMatch(/html\s*\{\s*scroll-padding-block-start: 4\.5rem;/u);
  });
});

describe('a side panel in right-to-left', () => {
  it('sits on the page once it is open, as daisyUI leaves it off the page', () => {
    const styles = readFileSync(
      new URL('./styles.css', import.meta.url),
      'utf8',
    );

    expect(styles).toMatch(
      /\[dir='rtl'\] \.modal\[open\]\.modal-end > \.modal-box,[^{]*\{\s*translate: 0;/u,
    );
  });
});
