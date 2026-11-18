import { beforeAll, describe, expect, it } from 'vitest';

import { AppError } from '@founders-coffee/core';
import type { Db } from '@founders-coffee/db';

import { setupHackathonDb } from '../edit.fixtures.js';
import { passGate } from './gates.fixtures.js';
import {
  ACTORS,
  PHASES,
  type Actor,
  type Operation,
  type Phase,
} from './matrix.fixtures.js';
import { OPERATIONS } from './operations.fixtures.js';
import { seedWorld } from './seeds.fixtures.js';
import { signInCast, type Cast, type World } from './world.fixtures.js';

const shared = new Map<string, Promise<World>>();

describe('the hackathon permission matrix', () => {
  let db: Db;
  let cast: Cast;

  beforeAll(async () => {
    db = await setupHackathonDb();
    cast = await signInCast(db);
  });

  const sharedWorld = (operation: Operation, phase: Phase) => {
    const key = `${phase}:${operation.needs ?? ''}`;
    const known = shared.get(key);
    if (known) return known;
    const made = seedWorld(db, cast, phase, operation.needs);
    shared.set(key, made);
    return made;
  };

  const outcomeOf = async (
    operation: Operation,
    world: World,
    actor: Actor,
  ): Promise<string> => {
    try {
      await passGate(operation.gate, db, world.cast[actor], world);
      const result = await operation.run({
        db,
        world,
        actor,
        userId: world.cast[actor].userId,
      });
      return result.ok ? 'ok' : result.error.code;
    } catch (error) {
      if (error instanceof AppError) return error.code;
      throw error;
    }
  };

  for (const [name, operation] of Object.entries(OPERATIONS))
    for (const phase of PHASES)
      for (const actor of ACTORS) {
        const expected = operation.cells[phase][actor];
        it(`${name}: ${actor} ${phase} → ${expected}`, async () => {
          const world =
            operation.changesWorld && expected === 'ok'
              ? await seedWorld(db, cast, phase, operation.needs)
              : await sharedWorld(operation, phase);
          const outcome = await outcomeOf(operation, world, actor);
          expect(
            outcome,
            `the table says ${actor} calling ${name} in ${phase} gets ${expected}, and it got ${outcome}`,
          ).toBe(expected);
        }, 30_000);
      }
});
