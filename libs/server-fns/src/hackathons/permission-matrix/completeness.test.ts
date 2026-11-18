import { describe, expect, it } from 'vitest';

import { ACTORS, PHASES, type Gate } from './matrix.fixtures.js';
import { EXEMPT, OPERATIONS } from './operations.fixtures.js';

const sources = import.meta.glob<string>(
  ['../*-rpc.ts', '../../projects/*-rpc.ts', '../../admin/hackathon-*-rpc.ts'],
  { query: '?raw', import: 'default', eager: true },
);

type Declared = {
  readonly name: string;
  readonly middleware: string;
  readonly handler: string;
};

/** A function's middleware list, with any `...shared` array spelled out from its declaration. */
const expandMiddleware = (source: string, middleware: string): string =>
  middleware.replace(
    /\.\.\.(\w+)/g,
    (_, shared: string) =>
      new RegExp(`const ${shared} = \\[([\\s\\S]*?)\\] as const`).exec(
        source,
      )?.[1] ?? '',
  );

const declaredIn = (source: string): readonly Declared[] =>
  source.split(/^export const /m).flatMap((chunk) => {
    const name = /^(\w+) = createServerFn/.exec(chunk)?.[1];
    if (!name) return [];
    const [beforeValidator = '', afterValidator = ''] =
      chunk.split('.validator(');
    return [
      {
        name,
        middleware: expandMiddleware(source, beforeValidator),
        handler: afterValidator,
      },
    ];
  });

const DECLARED = Object.values(sources).flatMap(declaredIn);

const gateOf = ({ middleware }: Declared): Gate | null => {
  const organiser = /requireHackathonOrganiser\(\s*'(\w+)'/.exec(middleware);
  if (organiser) return { kind: 'organiser', action: 'manage' };
  const organisation =
    /requireOrganisationPermission\(\s*'(\w+)',\s*'(\w+)'/.exec(middleware);
  if (organisation)
    return { kind: 'organisation', resource: 'hackathon', action: 'create' };
  const permission = /requirePermission\(\s*'(\w+)',\s*'(\w+)'/.exec(
    middleware,
  );
  return permission
    ? ({
        kind: 'permission',
        resource: permission[1],
        action: permission[2],
      } as Gate)
    : null;
};

describe('the hackathon permission matrix covers what it says', () => {
  it('finds the server functions it is about', () => {
    expect(DECLARED.length).toBeGreaterThan(50);
  });

  it('has a row or an exemption for every server function', () => {
    const missing = DECLARED.map(({ name }) => name).filter(
      (name) => !OPERATIONS[name] && !EXEMPT[name],
    );
    expect(
      missing,
      'a new hackathon server function needs a row in the matrix',
    ).toEqual([]);
  });

  it('has no row or exemption for a function that does not exist', () => {
    const names = new Set(DECLARED.map(({ name }) => name));
    expect(
      [...Object.keys(OPERATIONS), ...Object.keys(EXEMPT)].filter(
        (name) => !names.has(name),
      ),
    ).toEqual([]);
  });

  it('exempts only what no session reaches, and never a function with a row', () => {
    for (const name of Object.keys(EXEMPT)) {
      expect(OPERATIONS[name]).toBeUndefined();
      const declared = DECLARED.find((row) => row.name === name);
      expect(declared && gateOf(declared)).toBeNull();
    }
  });

  it('declares the gate each function really composes', () => {
    for (const declared of DECLARED) {
      const operation = OPERATIONS[declared.name];
      if (operation)
        expect(operation.gate, `${declared.name}'s gate`).toEqual(
          gateOf(declared),
        );
    }
  });

  it('runs the resolver each function really calls', () => {
    for (const declared of DECLARED) {
      const operation = OPERATIONS[declared.name];
      const resolver = /(\w+Resolver)\(/.exec(declared.handler)?.[1];
      if (operation) {
        expect(resolver, `${declared.name} has a resolver`).toBeDefined();
        expect(String(operation.run), declared.name).toContain(resolver);
      }
    }
  });

  it('states an outcome for every phase and actor', () => {
    for (const [name, operation] of Object.entries(OPERATIONS)) {
      expect(Object.keys(operation.cells).sort(), name).toEqual(
        [...PHASES].sort(),
      );
      for (const phase of PHASES)
        expect(Object.keys(operation.cells[phase]).sort(), name).toEqual(
          [...ACTORS].sort(),
        );
    }
  });
});
