import type { Result } from '@founders-coffee/core';
import type { Db } from '@founders-coffee/db';

import type { PermissionAction, PermissionResource } from '../../authz.js';
import type { Extra, World } from './world.fixtures.js';

export const ACTORS = [
  'organiser',
  'judge',
  'captain',
  'member',
  'registered',
  'stranger',
  'admin',
] as const;

export const PHASES = [
  'draft',
  'review',
  'open',
  'building',
  'judging',
  'judged',
  'results',
  'cancelled',
] as const;

export type Actor = (typeof ACTORS)[number];
export type Phase = (typeof PHASES)[number];
export type Row = Readonly<Record<Actor, string>>;
export type Cells = Readonly<Record<Phase, Row>>;

export type Gate =
  | { readonly kind: 'organiser'; readonly action: 'manage' }
  | {
      readonly kind: 'organisation';
      readonly resource: 'hackathon';
      readonly action: 'create';
    }
  | {
      readonly kind: 'permission';
      readonly resource: PermissionResource;
      readonly action: PermissionAction;
    };

export type Call = {
  readonly db: Db;
  readonly world: World;
  readonly actor: Actor;
  readonly userId: string;
};

export type Operation = {
  readonly gate: Gate;
  readonly changesWorld?: boolean;
  readonly needs?: Extra;
  readonly run: (call: Call) => Promise<Result<unknown>>;
  readonly cells: Cells;
};

export type Operations = Readonly<Record<string, Operation>>;

/** The ids most operations take: the hackathon and whoever is calling. */
export const selfOf = ({ world, userId }: Call) => ({
  eventId: world.eventId,
  userId,
});

export const ORGANISER: Gate = { kind: 'organiser', action: 'manage' };

/** The role permission a function's `requirePermission` middleware asks for. */
export const may = (
  resource: PermissionResource,
  action: PermissionAction,
): Gate => ({ kind: 'permission', resource, action });

/** One outcome for every actor. */
export const everyone = (outcome: string): Row =>
  Object.fromEntries(ACTORS.map((actor) => [actor, outcome])) as Row;

/** One outcome for every actor but those named. */
export const everyoneBut = (outcome: string, others: Partial<Row>): Row => ({
  ...everyone(outcome),
  ...others,
});

/** One row for every phase but those named. */
export const inEveryPhase = (usual: Row, others: Partial<Cells> = {}): Cells =>
  ({
    ...Object.fromEntries(PHASES.map((phase) => [phase, usual])),
    ...others,
  }) as Cells;

const onlyOne = (
  actor: Actor,
  usual: string,
  others: Partial<Record<Phase, string>>,
): Cells =>
  Object.fromEntries(
    PHASES.map((phase) => [
      phase,
      everyoneBut('forbidden', { [actor]: others[phase] ?? usual }),
    ]),
  ) as Cells;

/** Everyone is refused at the organiser gate; the organiser's outcome is named per phase. */
export const organiserOnly = (
  usual: string,
  others: Partial<Record<Phase, string>> = {},
): Cells => onlyOne('organiser', usual, others);

/** Everyone is refused at the moderation permission; the admin's outcome is named per phase. */
export const adminOnly = (
  usual: string,
  others: Partial<Record<Phase, string>> = {},
): Cells => onlyOne('admin', usual, others);

/** A team rule: not found unless published, the row while teams can change, locked after that. */
export const whileTeamsChange = (
  row: Row,
  others: Partial<Cells> = {},
): Cells =>
  inEveryPhase(everyone('event_not_found'), {
    open: row,
    building: row,
    judging: everyone('teams_locked'),
    judged: everyone('teams_locked'),
    results: everyone('teams_locked'),
    ...others,
  });

/** A published hackathon's page: not found until published and once cancelled, the row otherwise. */
export const whilePublished = (row: Row): Cells =>
  inEveryPhase(row, {
    draft: everyone('event_not_found'),
    review: everyone('event_not_found'),
    cancelled: everyone('event_not_found'),
  });

/** An accepted judge's rule: only they pass, and only while judging is open. */
export const judgeWhileJudging = (): Cells =>
  Object.fromEntries(
    PHASES.map((phase) => {
      const judge =
        phase === 'judging'
          ? 'ok'
          : ['judged', 'results', 'cancelled'].includes(phase)
            ? 'judging_closed'
            : 'judging_not_started';
      return [phase, everyoneBut('not_judge', { judge })];
    }),
  ) as Cells;
