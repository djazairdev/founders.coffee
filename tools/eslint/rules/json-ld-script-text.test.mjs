import path from 'node:path';

import tsParser from '@typescript-eslint/parser';
import { ESLint, RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';

import { jsonLdScriptText } from './json-ld-script-text.mjs';

const rootDirectory = path.resolve(import.meta.dirname, '../../..');

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const filename = '/repo/apps/ui/src/lib/seo-event.ts';

const withFilename = (test) => ({
  ...test,
  filename: test.code.includes('<script')
    ? '/repo/apps/ui/src/components/Schema.tsx'
    : filename,
});

const head = (entry, preamble = '') =>
  `${preamble}export const pageHead = (schema) => ({ scripts: [${entry}] });`;

const script = (attributes) =>
  `export const Schema = ({ schema }) => <script ${attributes} />;`;

const unescaped = [{ messageId: 'unescaped' }];

describe('local/json-ld-script-text', () => {
  it('lets a JSON-LD script carry only jsonLdText', () => {
    tester.run('json-ld-script-text', jsonLdScriptText, {
      valid: [
        {
          code: head(
            "{ type: 'application/ld+json', children: jsonLdText(schema) }",
          ),
        },
        {
          code: head(
            "{ type: 'application/ld+json', children: jsonLdText(schema) as string }",
          ),
        },
        { code: head("{ children: 'window.ready = true' }") },
        {
          code: head("{ type: 'module', children: JSON.stringify(schema) }"),
        },
        { code: head('{ type: kind, children: JSON.stringify(schema) }') },
        {
          code: script(
            'type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(schema) }}',
          ),
        },
        { code: script('src="/app.js"') },
        { code: "export const MEDIA = { type: 'application/json' };" },
      ].map(withFilename),
      invalid: [
        {
          code: head(
            "{ type: 'application/ld+json', children: JSON.stringify(schema) }",
          ),
          errors: unescaped,
        },
        {
          code: head(
            "{ 'type': `application/ld+json`, 'children': JSON.stringify(schema) }",
          ),
          errors: unescaped,
        },
        {
          name: 'a builder that already returns text hides its JSON.stringify',
          code: head("{ type: 'application/ld+json', children: faqJsonLd() }"),
          errors: unescaped,
        },
        {
          code: head("{ type: 'application/ld+json', children: text }"),
          errors: unescaped,
        },
        {
          code: head("{ type: 'application/ld+json', ...rest }"),
          errors: unescaped,
        },
        {
          code: head(
            '{ type: JSON_LD, children: JSON.stringify(schema) }',
            "const JSON_LD = 'application/ld+json';\n",
          ),
          errors: unescaped,
        },
        {
          code: script(
            'type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}',
          ),
          errors: unescaped,
        },
        {
          code: script("type={'application/ld+json'}"),
          errors: unescaped,
        },
      ].map(withFilename),
    });
  });

  it('does not loop on constants that name each other', () => {
    tester.run('json-ld-script-text', jsonLdScriptText, {
      valid: [
        {
          code: head(
            '{ type: first, children: JSON.stringify(schema) }',
            'const first = second;\nconst second = first;\n',
          ),
          filename,
        },
      ],
      invalid: [],
    });
  });
});

describe('local/json-ld-script-text in the workspace config', () => {
  const eslint = new ESLint({ cwd: rootDirectory });

  it('is an error wherever a page head is written', async () => {
    for (const file of [
      'apps/ui/src/lib/seo-event.ts',
      'apps/ui/src/routes/__root.tsx',
      'apps/admin/src/routes/__root.tsx',
      'libs/ui/src/components/Button.tsx',
    ]) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config.rules['local/json-ld-script-text']?.[0], file).toBe(2);
    }
  });
});
