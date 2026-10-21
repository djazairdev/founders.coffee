# Staged contractions

Empty is the normal state. This directory holds migrations whose SQL is written and reviewed but
must not run until compatible code is live on every environment — a contraction that lands ahead
of its Workers takes the schema out from under them.

`0044_retire_telegram_groups` (CH-12) waited here until 2026-10-21 (B-FND-01, #172). It dropped
`event_telegram_groups` and `event_telegram_invites`, which every release before v0.18.0 read, and
deleted the Telegram rows left in `scheduled_notifications`. It was promoted once v0.24.2 was live
on production and develop on staging, neither of which reads those tables, so Stage B's migrations
can follow it.

`0021`-`0024` (the PF-03 profile contractions) and `0025` (CO-03's operations schema, which followed
them in the journal and so had to wait) were promoted on 2026-09-10, after `v0.4.0` put PF-03a-
compatible code on staging and production and both Worker versions were recorded. They now live in
`libs/db/migrations/` with every other applied migration.

## When something belongs here

Put a generated migration here, not in `migrations/`, when either is true:

- it drops or rewrites a column that deployed code still reads, so the code has to ship first;
- an earlier migration is already pending, because journal order is absolute. `migration-quarantine.test.ts`
  rejects a shipped migration that follows a pending entry and permits a fully pending suffix, so a
  later additive migration has nowhere else to go while an earlier contraction waits.

Promotion is a release ticket, never a code change: record the deployed Worker version on every
environment, a D1 recovery point and the compatible rollback version, then move the file unchanged
into `libs/db/migrations/`, declare it `irreversible` in `compatibility.json`, and apply it through
the canonical worker-jobs Wrangler config (`npm run migrate:staging`, `npm run migrate:production`)
before the deploy that carries it reaches that environment: the deploy refuses to run an
irreversible migration itself. Never split a rebuild across separate executions, and never promote
a later migration ahead of an earlier one. Historical SQL and snapshots stay immutable.

After a contraction is promoted, do not deploy a Worker predating it.
