# Development

Setting up founders.coffee locally, and the gates CI runs.

## Local development

Node.js 22.

```sh
npm ci
cp apps/ui/.dev.vars.example apps/ui/.dev.vars
npm run migrate:local
npm run seed:local
npm run ui:dev
```

The public app runs at `http://localhost:3000`. `apps/ui/.dev.vars` holds its local secrets, and
the example works as it is: it sets a development auth secret and turns Turnstile off. Without the
file, the endpoints that send a sign-in code answer 503. The operations console, `apps/admin`, has a
`.dev.vars.example` of its own, needed only to run it. [`CONTRIBUTING.md`](../CONTRIBUTING.md#local-setup)
has the full setup, including the features that need accounts of your own.

`seed:local` fills the local database with the three markets the site serves (Algeria, Egypt and Saudi Arabia), five accounts, three
meetups and four hackathons, and is safe to re-run — every row yields to whatever is already there, so it never
overwrites something you changed by hand. The one exception is the hackathons flag, which it turns on in Algeria on every run. The events exist so that each operations path has
something to run against: one has already ended and holds RSVPs, which is what the closeout and
feedback commands require; one is still ahead, because RSVP intent freezes at `startsAt`; one sits
in a second market. Sign in as `dev-host@dev.invalid`, `dev-member@dev.invalid` or
`dev-member-two@dev.invalid` — the addresses are unroutable, so the one-time code is written to the
dev server log rather than sent. The seed only ever writes to the local database and refuses
`--remote` and `--env`.

The hackathons show each phase without clicking through one: `dev-hackathon-registration`,
`dev-hackathon-building`, `dev-hackathon-judging` and `dev-hackathon-results`, at
`/ar/algeria/e/{slug}`. `dev-host` organises them through the club Code Club Alger, `dev-member`
captains a team, `dev-member-two` judges, and `dev-teammate@dev.invalid` and
`dev-rival@dev.invalid` fill out the teams. The dates are relative to the first run, so reset the
local database to move a hackathon back to its phase.

## Quality gates

```sh
npx nx sync:check      # committed tsconfig project references
npm run format:check
npm run typecheck
npm run lint           # includes the Nx module-boundary rules
npm run test
npm run build
npx nx run public:e2e  # Playwright — local/staging only, not in CI
```

Integration tests run against Miniflare with real local D1, Durable Object, Queue and Email
bindings. **Cloudflare bindings are never mocked.** The Playwright flow is deliberately a
local/staging release gate rather than a CI step.
