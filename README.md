# founders.coffee

[![CI](https://github.com/djazairdev/founders.coffee/actions/workflows/ci.yml/badge.svg)](https://github.com/djazairdev/founders.coffee/actions/workflows/ci.yml)
[![Deploy](https://github.com/djazairdev/founders.coffee/actions/workflows/deploy.yml/badge.svg)](https://github.com/djazairdev/founders.coffee/actions/workflows/deploy.yml)
[![Latest release](https://img.shields.io/github/v/release/djazairdev/founders.coffee?sort=semver)](https://github.com/djazairdev/founders.coffee/releases/latest)
[![Good first issues](https://img.shields.io/github/issues/djazairdev/founders.coffee/good%20first%20issue?label=good%20first%20issues&color=7057ff)](https://github.com/djazairdev/founders.coffee/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
[![Improvements](https://img.shields.io/github/issues/djazairdev/founders.coffee/enhancement?label=improvements&color=a2eeef)](https://github.com/djazairdev/founders.coffee/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement+sort%3Areactions-%2B1-desc)

**An Arabic-first platform for informal local founder meetups.** Founders in Algeria find each
other at free café and coworking meetups, host them, RSVP and come back. Live at
[founders.coffee](https://founders.coffee), which also has pages for Egypt and Saudi Arabia.

## Quick start

Node.js 22.

```sh
npm ci
cp apps/ui/.dev.vars.example apps/ui/.dev.vars
npm run migrate:local
npm run seed:local
npm run ui:dev
```

The app runs at `http://localhost:3000`, with a seeded host and two members to sign in as. The
one-time sign-in code is printed in the dev server's log.

Everything else is in [`docs/`](./docs/): [the architecture](./docs/architecture.md), [local
development and the quality gates](./docs/development.md), [environments and
releases](./docs/releases.md), and [the implementation plan](./docs/implementation-plan.md).
[`AGENTS.md`](./AGENTS.md) holds the binding engineering rules.

## Make your first contribution

1. Pick an issue labelled
   [good first issue](https://github.com/djazairdev/founders.coffee/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
2. Comment on it to say you're working on it.
3. Follow [CONTRIBUTING.md](./CONTRIBUTING.md) to set up, test and open a pull request against
   `develop`.
4. We reply to newcomers' pull requests within 7 days. A review or a merge may take longer.

You can help without writing code, too: fix wording in Arabic, French or English, test the app on
your phone, or check it with assistive technology ([ACCESSIBILITY.md](./ACCESSIBILITY.md)).

## Feedback

- [Ask a question](https://github.com/orgs/djazairdev/discussions/categories/q-a) in djazairdev's discussions
- [Report a bug](https://github.com/djazairdev/founders.coffee/issues/new?template=bug_report.yml)
- [Report wrong wording](https://github.com/djazairdev/founders.coffee/issues/new?template=wording.yml) in any language
- [Suggest an improvement](https://github.com/djazairdev/founders.coffee/issues/new?template=feature_request.yml), or 👍 the
  [improvements](https://github.com/djazairdev/founders.coffee/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement+sort%3Areactions-%2B1-desc)
  you want most
- [Propose a new project](https://github.com/djazairdev/djazair.dev/discussions/categories/ideas)
- Help with your account or a meetup: [SUPPORT.md](./SUPPORT.md)
- Follow djazairdev on [Facebook](https://www.facebook.com/djazairdev) and
  [X](https://x.com/djazairdev) for news

Report security problems [privately](./SECURITY.md), never in an issue.

## License

[GNU Affero General Public License v3.0](./LICENSE). Anyone may use, change and share the code, and
whoever runs a modified version as a service must offer its users that version's source.

The license covers the code, not the founders.coffee name or logo. A public deployment of a modified
version should carry a name and logo of its own.
