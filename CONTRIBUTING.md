# Contributing to founders.coffee

Thank you for helping. founders.coffee is a live service: founders in Algeria sign in to it and
meet through it. So every change goes through the same review and the same
gates, whoever writes it.

This guide covers how to propose a change, set up the project, and get a pull request merged. Taking
part in any project space means following the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug** with the [bug form](https://github.com/djazairdev/founders.coffee/issues/new/choose).
  A clear reproduction is a contribution in itself.
- **Fix wording or a translation.** The app speaks Arabic, French and English, and native speakers
  catch what reviewers miss. Use the wording form, or edit `libs/i18n/messages/` directly, even in
  the browser ([how](#a-small-fix-in-the-browser)). [`libs/i18n/glossary.json`](./libs/i18n/glossary.json)
  lists a few words to avoid in each language, such as دردشة for a meetup's chat, with the word to
  use instead; the tests fail on a message that uses one.
- **Improve accessibility** for keyboards, screen readers and right-to-left layouts; see
  [ACCESSIBILITY.md](./ACCESSIBILITY.md).
- **Pick up an issue** labelled
  [`good first issue`](https://github.com/djazairdev/founders.coffee/labels/good%20first%20issue)
  or [`help wanted`](https://github.com/djazairdev/founders.coffee/labels/help%20wanted).
- **Answer questions** in [djazairdev's discussions](https://github.com/orgs/djazairdev/discussions).

Security problems never go in a public issue, discussion or pull request: follow
[SECURITY.md](./SECURITY.md).

## Before you write code

1. **Find or open an issue.** Every change maps to an accepted issue or to a ticket in the
   [implementation plan](./docs/implementation-plan.md). A pull request without one is usually
   closed, however good the code.
2. **Check that it is in scope.** We build the local meetup community and
   [Stage B](./docs/stage-b-plan.md) of the [product vision](./docs/product-vision.md): event types,
   online events, organisations, hackathons, portfolio profiles, project pages from hackathon entries
   and certificates. Issues labelled `stage: B` are ready to take. Sponsorship, talent, projects for
   every member, payments and new markets come in later stages: propose them with the
   [feature form](https://github.com/djazairdev/founders.coffee/issues/new?template=feature_request.yml), not as code.
3. **Take it.** Comment `/take` on the issue to have it assigned to you, and start straight away:
   you don't need to wait for a maintainer. If someone already has it, the bot says who, so pick
   another one. Comment `/drop` if you stop; a maintainer may free an issue that has had no pull
   request or update for 7 days. An issue still labelled `needs-triage` has not been accepted yet,
   so its work may not be merged.
4. **Read [the conventions that bite](./docs/architecture.md#conventions-that-bite)**, the short list
   of rules that fail a build. [AGENTS.md](./AGENTS.md) is the full rulebook, for people and AI agents
   alike: read it before a larger change.

## Local setup

You need Node.js 22 (the version in `.nvmrc`, which `nvm use` picks up), npm and git. CI runs on
Linux and the maintainers work on macOS; on Windows, use WSL 2.

First [fork the repository](https://github.com/djazairdev/founders.coffee/fork) on GitHub. Then
clone your fork, and start from `develop`, the branch pull requests go to. The commands take it from
this repository, so they work even if your fork copied only `main`.

```sh
git clone https://github.com/<your-user>/founders.coffee.git
cd founders.coffee
git remote add upstream https://github.com/djazairdev/founders.coffee.git
git fetch upstream
git switch -c develop upstream/develop
npm ci
cp apps/ui/.dev.vars.example apps/ui/.dev.vars
npm run migrate:local
npm run seed:local
npm run ui:dev
```

The app runs at `http://localhost:3000` on a local D1 database. You need no Cloudflare account and
no production secret. `npm run ui:dev` frees port 3000 first, so it stops anything else listening
there.

Sign in as `dev-member@dev.invalid`, `dev-member-two@dev.invalid` or `dev-host@dev.invalid`. The
one-time code is printed in the dev server's log instead of being emailed. Turnstile is off locally:
the example file sets `TURNSTILE_DISABLED=true` and Cloudflare's always-pass test key.

Three features need accounts of your own, and the app runs without them:

- **Venue search and maps** in the meetup wizard need a Mapbox access token in `MAPBOX_TOKEN`.
  Mapbox's free tier is enough.
- **Google, GitHub and LinkedIn sign-in** need OAuth apps of your own. Leave them blank and sign in
  with an email code instead.
- **Push notifications** need a Firebase project. Without one, the app leaves push off.

`.dev.vars` is gitignored: never commit it, and never put a production credential in it.

## Making a change

- **Branch from `develop`, and open the pull request against `develop`.** `main` is what production
  runs, and it only takes release pull requests from `develop`.

  ```sh
  git fetch upstream
  git switch -c fix/rsvp-count upstream/develop
  ```

  Push the branch to your fork with `git push -u origin fix/rsvp-count`, and open the pull request
  from the link git prints. On GitHub, check that the base is `djazairdev/founders.coffee` and
  `develop`.

- **Keep to one concern.** One issue per pull request, as small as it can be.
- **Write the tests with the change.** Vitest for logic and components; Vitest with Miniflare for
  server functions and repositories, against real local bindings. Cloudflare bindings are never
  mocked.
- **Put every user-facing text in all three locales.** Add each new message to
  `libs/i18n/messages/ar.json`, `fr.json` and `en.json`, and hard-code none. Look at the screen in
  Arabic, which reads right to left, as well as in French or English.
- **Ask before adding anything.** A new dependency, Cloudflare service or external integration needs
  a maintainer's agreement in the issue first.

### A small fix in the browser

A wording fix needs no local setup. On GitHub, switch the branch menu above the file list to
`develop`, open the file, and select the pencil to edit it. GitHub makes a fork for you and opens the
pull request. If its base says `main`, select **Edit** next to the title and change the base to
`develop`. CI checks the change like any other.

### Run the gates before you push

```sh
npm run format:check
npx nx sync:check
npm run typecheck
npm run lint
npm run test
npx nx run public:integration-test
npm run build
```

CI runs the same gates on every pull request. The Playwright suite (`npx nx run public:e2e`) runs
locally and on staging, not in CI: run it if your change touches sign-in, creating a meetup or RSVP.

### Commit messages and pull request titles

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), scoped to the
domain:

```text
fix(events): count a cancelled RSVP once
feat(i18n): add the French wording for the waitlist notice
```

The types are `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore` and `style`.
A `!` after the type or scope marks a breaking change.

Pull requests are **squash-merged**, and **the pull request's title becomes the commit subject** on
`develop`. The release version and the release notes are built from those subjects, so CI checks
that the title follows the same format, and checks it again whenever you edit it.
Write `Fixes #123.` in the description: the issue then closes when the change reaches production.

## Review

- Fill in the pull request template. A maintainer is asked for a review automatically.
- **On your first pull request, CI waits until a maintainer approves the run.** That is a safety
  setting, not a judgement on your change. Once a pull request of yours has been merged, CI runs on
  your next ones straight away.
- We reply to every newcomer's pull request within 7 days, even if only to say when we'll review it.
  A review or a merge may take longer.
- Answer review comments with new commits rather than a force-push, so the conversation stays
  readable. The squash merge tidies the history.
- A maintainer merges once CI is green, the review is approved and every conversation is resolved.
- Nothing is closed automatically. If a pull request goes quiet for a long time, we ask before we
  close it.

## AI-assisted contributions

Much of this codebase is written with AI coding agents, under the rules in AGENTS.md. You are welcome
to use them too, on these terms:

- **You are the author.** Understand every line you submit, and be ready to explain it in review. "The
  model wrote it" does not answer a review comment.
- **Say so.** Tick the AI box in the pull request template, and name the tool and what it did. A
  commit may credit it in a `Co-Authored-By:` or `Assisted-by:` trailer.
- **Run the gates yourself,** and report results you actually got.
- **Point your agent at AGENTS.md.** Most coding agents read it on their own, and its rules bind them
  as they bind you.
- **No autonomous agents.** A person writes or reviews every issue, pull request and comment; an agent
  may not open them on its own.
- **Verify what a tool finds** before you report it, and report security findings privately through
  [SECURITY.md](./SECURITY.md). An unverified report is closed.
- **Keep private things out of AI tools:** unpublished security reports, other people's personal data,
  and any secret.
- Maintainers may close a low-effort generated pull request or issue without a detailed review.

## Licensing

founders.coffee is licensed under the [GNU Affero General Public License v3.0](./LICENSE). By
submitting a contribution, you agree that it is licensed under the same terms, as section D.6 of
[GitHub's Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
provides, and that you have the right to submit it. Do not submit code you did not write unless its
license allows it to be distributed under AGPL-3.0, and say where it came from.

## Getting help

Questions about the code or this guide belong in
[djazairdev's Q&A](https://github.com/orgs/djazairdev/discussions/categories/q-a). For
everything else, see [SUPPORT.md](./SUPPORT.md).
