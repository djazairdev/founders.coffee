# Stage B plan: the first hackathon

| Field        | Value                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Status       | Active                                                                    |
| Owner        | Founder / Product, Engineering                                            |
| Last updated | 2026-10-16                                                                |
| Derived from | [Product vision](./product-vision.md), §6 Stage B and decisions V1 to V15 |

This file turns Stage B of the [product vision](./product-vision.md) into 140 small tickets. Each ticket is one pull request and one GitHub issue. The goal is an online hackathon open to every Algerian city (V15): registration opens on Monday 4 January 2027, kickoff on Friday 22 January, submissions close on Friday 29 January and the demo day is Saturday 30 January.

129 tickets are in the milestone **Stage B: first hackathon**, due on 15 December 2026 so January can be spent on staging rehearsals, partners and the call for participants. 11 tickets are in **Stage B: can follow**: useful, not needed for the first date. 35 are good first issues and 7 are done by a maintainer.

## 1. What we have today

An audit of `develop` on 16 October 2026:

| Area          | What exists                                                                                                                                                                                       | What Stage B needs                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Events        | One kind of event: an in-person meetup of 30 minutes to 8 hours. `venue`, address and coordinates are required. Statuses are `published` and `cancelled`. Hosts can repeat their own past events. | Types, online and hybrid formats, hackathons up to 14 days, drafts, organisations as owners |
| Organisers    | One global role per user (`member`, `host`, `moderator`, `admin`, `sponsor_contact`) through Better Auth's admin plugin                                                                           | Organisations with their own members and roles, and an approval step                        |
| Feature flags | `feature_flags.hackathons` exists in every market, set to `false`, and nothing reads it                                                                                                           | A reader and a clear state when it is off                                                   |
| Notifications | An outbox (`scheduled_notifications`) and `NotificationScheduleDO`, one alarm per event; push and email                                                                                           | Hackathon categories and reminders, on the same machinery                                   |
| Chat          | One chat per meetup for its host and everyone going                                                                                                                                               | The same chat for hackathon participants, organisers and judges                             |
| Admin         | `apps/admin`: sign-in and a status page behind Cloudflare Access                                                                                                                                  | Review queues for organisations, hackathons and reports                                     |
| Uploads       | Profile photos only, through R2 and Cloudflare Images                                                                                                                                             | Submission screenshots, if a new bucket is approved                                         |
| Payments      | `libs/payments` with a manual provider and order purposes for sponsorship, hosted challenges and prize payouts                                                                                    | Nothing in Stage B: no money moves (V2)                                                     |
| Privacy       | Account closure with a tombstone, retention sweeps, a privacy policy in three languages                                                                                                           | Every new table in erasure and retention, and an updated policy                             |
| Tooling       | Nx 23, TanStack Start on Workers, D1 and Drizzle, Better Auth 1.7, Paraglide (ar, fr, en), Tailwind 4 and DaisyUI 5, Vitest with Miniflare, Playwright                                            | Nothing new: Stage B adds no dependency                                                     |

`0044_retire_telegram_groups` waited in `libs/db/pending-migrations/`, and no migration can ship after a pending one. B-FND-01 promoted it on 2026-10-21, so Stage B's migrations follow it in `libs/db/migrations/`.

## 2. Decisions for Stage B

| #   | Decision                                                                                                                                                            | Why                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| B1  | A hackathon **is an event** with `kind = hackathon`, plus one row in a `hackathons` table.                                                                          | It reuses the event page, slugs, SEO, the chat, the notification outbox and its Durable Object without forking them. |
| B2  | The phase is **computed** from dates (`phaseAt`), never stored. Every deadline is checked on the server, in the same statement as the write.                        | No job has to move a hackathon from one phase to the next, so none can fail to.                                      |
| B3  | Reminders use the existing `NotificationScheduleDO`, keyed by the event.                                                                                            | AGENTS.md §11.5: Durable Object alarms, never a cron that scans D1.                                                  |
| B4  | Events gain a `draft` status; every public read path ignores drafts.                                                                                                | A hackathon stays a draft until an admin approves it.                                                                |
| B5  | Events gain a `format` (in person, online, hybrid) and a meeting link that only organisers and attendees see.                                                       | V3 and V15: the first hackathon is online, later ones hybrid by default.                                             |
| B6  | Organisations use **Better Auth's organization plugin** (§3).                                                                                                       | Members, roles, invitations by email and permission checks without new tables.                                       |
| B7  | `event_organisers` links events to organisations as lead or co-host; the _Hosted by founders.coffee_, _Co-hosted_ and _Community_ labels come from it.              | One rule for labels; co-hosts in Stage C need no migration.                                                          |
| B8  | Hackathon teams are our own tables, not Better Auth teams.                                                                                                          | Participants aren't members of the organising organisation.                                                          |
| B9  | Judges belong to a hackathon. In Stage B every judge sees every entry and recuses where there is a conflict. Results are **frozen** when published.                 | V12. Certificates and projects later read frozen results.                                                            |
| B10 | Prizes have a provider name and an optional indicative value as `Money`; only prizes confirmed in writing are public.                                               | V2. Stage C links prizes to sponsors; Stage E pays cash prizes.                                                      |
| B11 | Organisers record what maintainers did with each open-source pull request (submitted, reviewed, merged).                                                            | Reading GitHub automatically is an external integration that needs its own approval.                                 |
| B12 | No new dependency. One new Cloudflare resource at most: an R2 bucket for screenshots (B-SUB-09), only if the maintainer approves it.                                | AGENTS.md §1.8.                                                                                                      |
| B13 | The first hackathon is announced on the Algeria page **now**, with a list for people who want to hear when registration opens (B-ANN-01 to B-ANN-05).               | Visitors need a concrete reason to come back. The list also measures demand before January.                          |
| B14 | Participants **leave with** something: a portfolio profile, a project page made from their entry, a certificate and the judges' feedback (PRF, PRJ, CRT, B-JDG-12). | Product decisions V16 to V21: "build" is the activity; what people keep is the reason to come.                       |
| B15 | The `projects` table is built for Stage D now: an entry is its first source, a member's own project the second.                                                     | Stage D opens projects to everyone without a migration of what Stage B wrote.                                        |
| B16 | Certificates are pages with a verification code, printable as PDF from the browser.                                                                                 | No new Cloudflare service (Browser Rendering stays out).                                                             |

## 3. Organisations with Better Auth

Better Auth 1.7's `organization` plugin provides organisations, members with roles (`owner`, `admin`, `member`), email invitations, an active organisation on the session and `hasPermission` checks with our own access-control statements. Stage B uses it this way:

- **Fields we add** through `additionalFields`: `kind` (club, university, community, company, platform), `status` (pending, approved, rejected, suspended; never set by the client), `marketCode`, `cityCode`, `description` and `websiteUrl`.
- **Approval:** anyone signed in may apply; a hook stores every new organisation as `pending`; only an admin approves it in `apps/admin`. Unapproved or suspended organisations can do nothing.
- **No public endpoints:** every `/organization/*` HTTP endpoint is disabled. Our server functions call `auth.api.*`, so each action keeps our validation, rate limits, logs and error codes (AGENTS.md §10).
- **Permissions:** `requireOrganisationPermission(resource, action)` checks organisation roles in one middleware, as `requirePermission` does for global roles.
- **Invitations** expire after 7 days and need a verified email; the email goes through Cloudflare Email in three languages.
- **Teams are off:** hackathon teams are our own tables (B8).
- **Later:** sponsors become organisations of kind `company` in Stage C, so a sponsor's people sign in to the dashboard with their organisation role.

## 4. Data model

New tables, all with erasure (B-FND-07) and retention (B-SAFE-05) handled:

| Table                                                                                            | Holds                                                                                                          | Ticket               |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------- |
| `organization`, `member`, `invitation`                                                           | Better Auth's tables, with our fields on `organization`                                                        | B-ORG-01             |
| `event_organisers`                                                                               | Event, organisation, lead or co-host                                                                           | B-EVT-17             |
| `hackathons`                                                                                     | One row per hackathon event: rules, eligibility, team size, capacity, dates, AI policy, licence, review status | B-HKN-01             |
| `hackathon_tracks`, `hackathon_prizes`, `hackathon_criteria`                                     | What participants build, can win and are judged on                                                             | B-HKN-03 to B-HKN-05 |
| `hackathon_registrations`                                                                        | Who is in, how they attend, waitlist                                                                           | B-REG-01             |
| `hackathon_teams`, `hackathon_team_members`, `hackathon_team_invites`, `hackathon_team_requests` | Teams and how people join them                                                                                 | B-TEAM-01            |
| `hackathon_submissions`, `hackathon_submission_versions`                                         | Entries and a snapshot of each submit                                                                          | B-SUB-01             |
| `hackathon_judges`, `hackathon_recusals`, `hackathon_scores`                                     | Judging                                                                                                        | B-JDG-01             |
| `hackathon_results`                                                                              | Frozen ranks and totals                                                                                        | B-JDG-09             |
| `hackathon_prize_awards`                                                                         | Who won what, and delivery                                                                                     | B-PRZ-01             |
| `hackathon_reports`                                                                              | Reports about entries and teams                                                                                | B-SAFE-01            |
| `hackathon_interest`                                                                             | Emails of people who want to hear when registration opens                                                      | B-ANN-01             |
| `hackathon_mentors`                                                                              | Mentors, what they help with, office hours                                                                     | B-HKN-25             |
| `projects`, `project_members`                                                                    | Project pages and who is listed on them                                                                        | B-PRJ-01             |
| `hackathon_certificates`                                                                         | Certificates with a verification code                                                                          | B-CRT-01             |

Changed: `events` gains `kind`, `format`, `meeting_url`, `tags` and the `draft` status, and its venue fields become optional for online events (a table rebuild, B-EVT-08). `session` gains `activeOrganizationId`. `member_profiles` gains skills, links, _open to_, the hackathon-record switch and the search-engine switch, each off by default (B-PRF-01, B-PRF-04, B-PRF-05).

## 5. Staying open for Stages C to E

Stage B must not have to be undone later. What each later need finds in place:

| Later | Need                                                  | What Stage B leaves                                                                                                              |
| ----- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| C     | Sponsor dashboard: reach, challenge outcomes          | Metrics with fixed names and columns from the first registration (B-FND-05)                                                      |
| C     | Sponsors with their own people                        | Organisations with a `company` kind and roles (§3)                                                                               |
| C     | Sponsored tracks and prizes                           | Tracks and prizes with a provider; a nullable sponsor link is added, nothing is rewritten                                        |
| C     | Opt-in talent introductions                           | Registrations hold no consent yet; consent is a new table keyed by registration, never a default                                 |
| C     | Co-hosts                                              | `event_organisers` already has the `co_host` role (B-EVT-20 lets admins use it now)                                              |
| C     | Blind judging, balanced assignment                    | Judges, recusals and scores are separate tables; assignment adds one table                                                       |
| C     | PDF certificates or badges, if wanted                 | Certificate rows with codes (B-CRT-01); a PDF is another view of the same row                                                    |
| C     | Announcements and team chats                          | The hackathon already has the event chat and notification category                                                               |
| D     | Projects for every member, feedback, sponsor interest | The `projects` table and page already exist (B-PRJ-01, B-PRJ-03); Stage D adds a second way to create one, feedback and interest |
| D     | Hosted challenges                                     | A hackathon run for a company is an ordinary hackathon plus an order with `reference_type = hackathon`                           |
| E     | Cash prizes and payouts                               | Prize values are `Money`; an award can be linked to a payout order                                                               |
| E     | Other markets                                         | Everything carries `market_code`; the flag is per market                                                                         |

## 6. What Stage B leaves out

Sponsor pages and the dashboard, talent introductions (the _open to_ field is shown, but nobody is introduced yet), blind judging, team-only chats, announcements and Q&A, reading GitHub automatically, payments of any kind, and hackathons outside Algeria. If the date gets tight, the vision's risk plan applies: keep the page, registration, teams, submissions and judging, and move the rest to Stage C.

## 7. Labels and milestones

| Label                                                                                                                      | Meaning                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `stage: B`                                                                                                                 | Part of this plan                                                        |
| `area: hackathons`, `area: organisations`, `area: events`, `area: admin`, `area: data`, `area: seo` and the existing areas | Where the change lives                                                   |
| `size: S`                                                                                                                  | About a day of work, under ~200 changed lines                            |
| `size: M`                                                                                                                  | Two to four days                                                         |
| `good first issue`                                                                                                         | Small and self-contained, a good start                                   |
| `help wanted`                                                                                                              | Open to anyone                                                           |
| `maintainer`                                                                                                               | Needs a decision, production access or a review of shared infrastructure |

## 8. Working on a ticket

Comment `/take` on the issue to have it assigned to you, as [CONTRIBUTING](../CONTRIBUTING.md) explains. A ticket can be taken before the tickets it depends on are merged, but it can only be merged after them. Put the ticket ID (`B-HKN-01`) in the pull request description with `Fixes #<issue>.`, and keep to [AGENTS.md](../AGENTS.md): permissions on every server function, Zod validation, typed errors, atomic D1 writes, three languages, RTL and LTR.

## 9. Order of work

Each wave needs only tickets from earlier waves. Tickets in the same wave can be built at the same time.

| Wave | Tickets                                                                                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | B-FND-01 (#172), B-FND-02 (#173), B-FND-03 (#174), B-FND-04 (#175), B-FND-05 (#176), B-FND-06 (#177), B-FND-07 (#178), B-ANN-02 (#294), B-HKN-02 (#213), B-ORG-03 (#181), B-EVT-01 (#191), B-HKN-23 (#241), B-I18N-01 (#284)                                                                                  |
| 2    | B-ANN-01 (#293), B-EVT-02 (#192), B-ORG-01 (#179), B-REG-02 (#238), B-TEAM-02 (#249), B-SUB-02 (#257), B-PRF-01 (#303)                                                                                                                                                                                        |
| 3    | B-ANN-03 (#295), B-ANN-04 (#296), B-EVT-15 (#205), B-EVT-17 (#207), B-ORG-02 (#180), B-EVT-14 (#204), B-ORG-07 (#185), B-ORG-12 (#190), B-EVT-03 (#193), B-EVT-04 (#194), B-EVT-08 (#198), B-REG-05 (#244), B-PRF-02 (#304), B-PRF-03 (#305), B-PRF-04 (#306) · can follow: B-EVT-06 (#196)                   |
| 4    | B-HKN-01 (#212), B-ORG-04 (#182), B-EVT-09 (#199), B-EVT-11 (#201), B-EVT-16 (#206), B-EVT-18 (#208), B-EVT-19 (#209) · can follow: B-EVT-05 (#195), B-EVT-07 (#197), B-EVT-21 (#211)                                                                                                                         |
| 5    | B-HKN-06 (#217), B-HKN-03 (#214), B-HKN-05 (#216), B-ORG-05 (#183), B-ORG-06 (#184), B-ORG-08 (#186), B-EVT-10 (#200), B-EVT-12 (#202), B-EVT-13 (#203), B-REG-01 (#230)                                                                                                                                      |
| 6    | B-HKN-04 (#215), B-ORG-09 (#187), B-ORG-10 (#188), B-HKN-11 (#222), B-TEAM-01 (#231), B-REG-03 (#239), B-JDG-02 (#265), B-LCH-01 (#285) · can follow: B-ORG-11 (#189), B-EVT-20 (#210)                                                                                                                        |
| 7    | B-HKN-07 (#218), B-HKN-12 (#223), B-HKN-13 (#224), B-HKN-15 (#226), B-SUB-01 (#232), B-REG-04 (#243), B-REG-07 (#246), B-TEAM-03 (#250)                                                                                                                                                                       |
| 8    | B-HKN-08 (#219), B-HKN-10 (#221), B-JDG-01 (#233), B-TEAM-04 (#251), B-TEAM-05 (#252), B-TEAM-06 (#253), B-SUB-03 (#258), B-PRJ-01 (#309)                                                                                                                                                                     |
| 9    | B-HKN-21 (#237), B-HKN-09 (#220), B-HKN-14 (#225), B-HKN-17 (#228), B-JDG-03 (#234), B-HKN-25 (#301), B-OPS-01 (#247), B-TEAM-07 (#254), B-TEAM-08 (#255), B-TEAM-09 (#256), B-SUB-04 (#259), B-SUB-05 (#260)                                                                                                 |
| 10   | B-ANN-05 (#297), B-HKN-16 (#227), B-HKN-18 (#229), B-HKN-19 (#235), B-HKN-20 (#236), B-HKN-22 (#240), B-HKN-26 (#302), B-HKN-24 (#242), B-REG-06 (#245), B-REG-08 (#248), B-SUB-06 (#261), B-SUB-07 (#262), B-SUB-08 (#263), B-JDG-04 (#266), B-OPS-02 (#276), B-SAFE-01 (#278) · can follow: B-SUB-09 (#264) |
| 11   | B-JDG-05 (#267), B-JDG-06 (#268), B-SAFE-02 (#279), B-LCH-02 (#286), B-LCH-03 (#287)                                                                                                                                                                                                                          |
| 12   | B-JDG-07 (#269), B-JDG-09 (#271) · can follow: B-JDG-08 (#270)                                                                                                                                                                                                                                                |
| 13   | B-JDG-10 (#272), B-JDG-11 (#273), B-JDG-12 (#299), B-CRT-01 (#307), B-PRJ-02 (#310), B-SAFE-03 (#280), B-SAFE-04 (#281), B-SAFE-05 (#282) · can follow: B-PRZ-01 (#274), B-OPS-03 (#277)                                                                                                                      |
| 14   | B-PRF-05 (#308), B-PRJ-03 (#311), B-CRT-02 (#314), B-SAFE-06 (#283), B-LCH-04 (#288), B-LCH-05 (#289) · can follow: B-PRZ-02 (#275)                                                                                                                                                                           |
| 15   | B-PRJ-04 (#312), B-PRJ-05 (#313), B-CRT-03 (#315), B-LCH-06 (#290)                                                                                                                                                                                                                                            |

## 10. Tickets

140 tickets: 129 in **Stage B: first hackathon** (due 15 December 2026) and 11 in **Stage B: can follow**, which may move to Stage C if the date is tight. Each ticket is one pull request. The issue holds the details: what done means, where to start and what you need to know.

Labels on every issue: `enhancement` or `documentation`, `stage: B`, `accepted`, a size, its areas, and one of `good first issue`, `help wanted` or `maintainer`.

### Foundations

Flags, permissions, audit, metrics and a privacy guard every other group uses.

| Ticket                          | Issue | What                                                                                   | Size | Depends on | Milestone       |
| ------------------------------- | ----- | -------------------------------------------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-fnd-01"></a>B-FND-01 ⚙ | #172  | Promote migration 0044 so Stage B migrations can ship                                  | S    | —          | First hackathon |
| <a id="b-fnd-02"></a>B-FND-02   | #173  | Read the `hackathons` market flag on the server, and show a clear state when it is off | S    | —          | First hackathon |
| <a id="b-fnd-03"></a>B-FND-03   | #174  | Add the hackathon resources to RBAC                                                    | S    | —          | First hackathon |
| <a id="b-fnd-04"></a>B-FND-04 ★ | #175  | Extend the audit log for Stage B decisions                                             | S    | —          | First hackathon |
| <a id="b-fnd-05"></a>B-FND-05   | #176  | Define the Stage B metrics in Analytics Engine                                         | S    | —          | First hackathon |
| <a id="b-fnd-06"></a>B-FND-06   | #177  | Add a Hackathons notification category with its own preference                         | S    | —          | First hackathon |
| <a id="b-fnd-07"></a>B-FND-07 ★ | #178  | Fail a test when a table with a user reference is missing from account closure         | S    | —          | First hackathon |

### Announcement

Announce the first hackathon now, and collect who wants to take part, before the product exists.

| Ticket                          | Issue | What                                                                 | Size | Depends on | Milestone       |
| ------------------------------- | ----- | -------------------------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-ann-01"></a>B-ANN-01   | #293  | A "tell me when registration opens" list for the first hackathon     | M    | #172       | First hackathon |
| <a id="b-ann-02"></a>B-ANN-02 ★ | #294  | Announce the first hackathon on the Algeria page and every city page | S    | —          | First hackathon |
| <a id="b-ann-03"></a>B-ANN-03   | #295  | The form on the announcement: tell me when registration opens        | S    | #293, #294 | First hackathon |
| <a id="b-ann-04"></a>B-ANN-04 ⚙ | #296  | Add the hackathon interest list to the privacy policy                | S    | #293       | First hackathon |
| <a id="b-ann-05"></a>B-ANN-05   | #297  | Email the interest list when registration opens                      | S    | #293, #237 | First hackathon |

### Organisations

Clubs, universities and companies apply, an admin approves them, and their members create events and hackathons.

| Ticket                          | Issue | What                                                                              | Size | Depends on       | Milestone       |
| ------------------------------- | ----- | --------------------------------------------------------------------------------- | ---- | ---------------- | --------------- |
| <a id="b-org-01"></a>B-ORG-01 ⚙ | #179  | Enable Better Auth's organization plugin for organisers, with our own fields      | M    | #172             | First hackathon |
| <a id="b-org-02"></a>B-ORG-02   | #180  | Check organisation permissions in one middleware                                  | S    | #179, #174       | First hackathon |
| <a id="b-org-03"></a>B-ORG-03 ★ | #181  | Organisation schemas and status rules in the domain                               | S    | —                | First hackathon |
| <a id="b-org-04"></a>B-ORG-04   | #182  | Server functions: apply for an organisation, list mine, edit its profile          | M    | #180, #181, #173 | First hackathon |
| <a id="b-org-05"></a>B-ORG-05   | #183  | Invite members to an organisation by email                                        | M    | #182             | First hackathon |
| <a id="b-org-06"></a>B-ORG-06   | #184  | Admin: review organisation applications                                           | M    | #182, #175       | First hackathon |
| <a id="b-org-07"></a>B-ORG-07 ★ | #185  | Seed the founders.coffee organisation                                             | S    | #179             | First hackathon |
| <a id="b-org-08"></a>B-ORG-08   | #186  | Page: apply for an organisation                                                   | S    | #182             | First hackathon |
| <a id="b-org-09"></a>B-ORG-09   | #187  | Page: my organisation (status, members, invitations)                              | M    | #183, #186       | First hackathon |
| <a id="b-org-10"></a>B-ORG-10 ★ | #188  | Page: accept or decline an organisation invitation                                | S    | #183             | First hackathon |
| <a id="b-org-11"></a>B-ORG-11   | #189  | Public organisation page, with its SEO route type                                 | M    | #184             | Can follow      |
| <a id="b-org-12"></a>B-ORG-12   | #190  | Account closure removes memberships and flags organisations left without an owner | S    | #179, #178       | First hackathon |

### Events

Event types, online and hybrid events, drafts, and who runs each event.

| Ticket                          | Issue | What                                                                  | Size | Depends on | Milestone       |
| ------------------------------- | ----- | --------------------------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-evt-01"></a>B-EVT-01   | #191  | Split HostCreatePage before adding fields                             | S    | —          | First hackathon |
| <a id="b-evt-02"></a>B-EVT-02   | #192  | Add the event type: meetup, workshop, hackathon                       | S    | #172       | First hackathon |
| <a id="b-evt-03"></a>B-EVT-03 ★ | #193  | Choose meetup or workshop in the host wizard                          | S    | #191, #192 | First hackathon |
| <a id="b-evt-04"></a>B-EVT-04 ★ | #194  | Show the event type on cards and the event page                       | S    | #192       | First hackathon |
| <a id="b-evt-05"></a>B-EVT-05   | #195  | Filter market and city pages by event type                            | S    | #194       | Can follow      |
| <a id="b-evt-06"></a>B-EVT-06   | #196  | Topic tags for events                                                 | S    | #192       | Can follow      |
| <a id="b-evt-07"></a>B-EVT-07 ★ | #197  | Pick tags in the wizard and show them on events                       | S    | #196, #193 | Can follow      |
| <a id="b-evt-08"></a>B-EVT-08 ⚙ | #198  | Online and hybrid events in the database                              | M    | #192       | First hackathon |
| <a id="b-evt-09"></a>B-EVT-09 ★ | #199  | Format rules: venue for in-person, link for online, both for hybrid   | S    | #198       | First hackathon |
| <a id="b-evt-10"></a>B-EVT-10   | #200  | Choose the format in the wizard; online skips the map                 | M    | #199, #191 | First hackathon |
| <a id="b-evt-11"></a>B-EVT-11   | #201  | Show the meeting link only to the host and members going              | M    | #198       | First hackathon |
| <a id="b-evt-12"></a>B-EVT-12   | #202  | Online and hybrid on the event page, cards, calendar file and JSON-LD | S    | #201       | First hackathon |
| <a id="b-evt-13"></a>B-EVT-13   | #203  | Notifications for online events                                       | S    | #201       | First hackathon |
| <a id="b-evt-14"></a>B-EVT-14 ★ | #204  | Duration rules by event type                                          | S    | #192       | First hackathon |
| <a id="b-evt-15"></a>B-EVT-15 ★ | #205  | A draft status for events                                             | S    | #192       | First hackathon |
| <a id="b-evt-16"></a>B-EVT-16   | #206  | Keep drafts out of every public read                                  | M    | #205       | First hackathon |
| <a id="b-evt-17"></a>B-EVT-17   | #207  | Link events to organisations                                          | M    | #179, #192 | First hackathon |
| <a id="b-evt-18"></a>B-EVT-18   | #208  | Host an event as your organisation                                    | S    | #207, #193 | First hackathon |
| <a id="b-evt-19"></a>B-EVT-19 ★ | #209  | Show who runs each event                                              | S    | #207       | First hackathon |
| <a id="b-evt-20"></a>B-EVT-20   | #210  | Admin: add a co-host organisation to an event                         | S    | #207, #184 | Can follow      |
| <a id="b-evt-21"></a>B-EVT-21   | #211  | Repeat an event keeps its type, format, tags and organisation         | S    | #207, #198 | Can follow      |

### Hackathons

The hackathon itself: its details, timeline, tracks, prizes and rubric, the organiser flow, the public page and reminders.

| Ticket                          | Issue | What                                                                                                  | Size | Depends on                   | Milestone       |
| ------------------------------- | ----- | ----------------------------------------------------------------------------------------------------- | ---- | ---------------------------- | --------------- |
| <a id="b-hkn-01"></a>B-HKN-01   | #212  | Hackathon details table                                                                               | M    | #205, #207                   | First hackathon |
| <a id="b-hkn-02"></a>B-HKN-02 ★ | #213  | Hackathon timeline rules and the current phase                                                        | M    | —                            | First hackathon |
| <a id="b-hkn-03"></a>B-HKN-03   | #214  | Tracks, including the open-source track                                                               | S    | #212                         | First hackathon |
| <a id="b-hkn-04"></a>B-HKN-04   | #215  | Prizes, public only once confirmed                                                                    | S    | #214                         | First hackathon |
| <a id="b-hkn-05"></a>B-HKN-05 ★ | #216  | Judging criteria                                                                                      | S    | #212                         | First hackathon |
| <a id="b-hkn-06"></a>B-HKN-06   | #217  | Create a hackathon draft as an approved organisation                                                  | M    | #213, #212, #180, #173, #204 | First hackathon |
| <a id="b-hkn-07"></a>B-HKN-07   | #218  | Edit a hackathon, with fields locked once it moves on                                                 | M    | #217, #214, #215, #216       | First hackathon |
| <a id="b-hkn-08"></a>B-HKN-08   | #219  | Submit for review; an admin approves or rejects                                                       | M    | #218, #175                   | First hackathon |
| <a id="b-hkn-09"></a>B-HKN-09   | #220  | Admin: hackathon review queue                                                                         | M    | #219, #184                   | First hackathon |
| <a id="b-hkn-10"></a>B-HKN-10 ★ | #221  | Record a prize confirmation                                                                           | S    | #218                         | First hackathon |
| <a id="b-hkn-11"></a>B-HKN-11   | #222  | Organiser flow, step 1: the basics                                                                    | M    | #217, #200                   | First hackathon |
| <a id="b-hkn-12"></a>B-HKN-12   | #223  | Organiser flow, step 2: rules, eligibility, AI policy, licence                                        | S    | #222                         | First hackathon |
| <a id="b-hkn-13"></a>B-HKN-13   | #224  | Organiser flow, step 3: tracks                                                                        | S    | #222, #214                   | First hackathon |
| <a id="b-hkn-14"></a>B-HKN-14   | #225  | Organiser flow, step 4: prizes                                                                        | S    | #222, #221                   | First hackathon |
| <a id="b-hkn-15"></a>B-HKN-15 ★ | #226  | Organiser flow, step 5: the judging rubric                                                            | S    | #222, #216                   | First hackathon |
| <a id="b-hkn-16"></a>B-HKN-16   | #227  | Organiser flow, step 6: review and submit                                                             | S    | #223, #224, #225, #226, #219 | First hackathon |
| <a id="b-hkn-17"></a>B-HKN-17 ★ | #228  | Hackathon page: schedule and current phase                                                            | S    | #213, #219                   | First hackathon |
| <a id="b-hkn-18"></a>B-HKN-18 ★ | #229  | Hackathon page: tracks and confirmed prizes                                                           | S    | #228, #215                   | First hackathon |
| <a id="b-hkn-19"></a>B-HKN-19   | #235  | Hackathon page: rules, eligibility, AI policy and judges                                              | S    | #228, #234                   | First hackathon |
| <a id="b-hkn-20"></a>B-HKN-20   | #236  | Hackathons on the market page                                                                         | S    | #228                         | First hackathon |
| <a id="b-hkn-21"></a>B-HKN-21   | #237  | Schedule hackathon reminders                                                                          | M    | #219, #177                   | First hackathon |
| <a id="b-hkn-22"></a>B-HKN-22   | #240  | Participants, organisers, judges and mentors use the hackathon chat, open until 30 days after results | S    | #239, #234                   | First hackathon |
| <a id="b-hkn-25"></a>B-HKN-25   | #301  | Mentors for a hackathon                                                                               | S    | #218, #233                   | First hackathon |
| <a id="b-hkn-26"></a>B-HKN-26 ★ | #302  | Hackathon page: mentors and their office hours                                                        | S    | #301, #228                   | First hackathon |
| <a id="b-hkn-23"></a>B-HKN-23 ★ | #241  | Register the private hackathon routes                                                                 | S    | —                            | First hackathon |
| <a id="b-hkn-24"></a>B-HKN-24   | #242  | Hackathons in JSON-LD and the sitemap                                                                 | S    | #228, #202                   | First hackathon |

### Registration

Registering with eligibility, capacity and a waitlist.

| Ticket                          | Issue | What                                            | Size | Depends on       | Milestone       |
| ------------------------------- | ----- | ----------------------------------------------- | ---- | ---------------- | --------------- |
| <a id="b-reg-01"></a>B-REG-01   | #230  | Registrations table                             | S    | #212             | First hackathon |
| <a id="b-reg-02"></a>B-REG-02 ★ | #238  | Registration rules                              | S    | #213             | First hackathon |
| <a id="b-reg-03"></a>B-REG-03   | #239  | Register for a hackathon                        | M    | #230, #238, #174 | First hackathon |
| <a id="b-reg-04"></a>B-REG-04   | #243  | Withdraw, and promote the first on the waitlist | S    | #239             | First hackathon |
| <a id="b-reg-05"></a>B-REG-05 ★ | #244  | Hackathon events use registration, not RSVP     | S    | #192             | First hackathon |
| <a id="b-reg-06"></a>B-REG-06   | #245  | Registration card on the hackathon page         | M    | #239, #243, #228 | First hackathon |
| <a id="b-reg-07"></a>B-REG-07 ★ | #246  | Registration notifications                      | S    | #239, #177       | First hackathon |
| <a id="b-reg-08"></a>B-REG-08   | #248  | Organiser: registrations list                   | S    | #239, #247       | First hackathon |

### Teams

Teams with a captain, invite links, requests and _Looking for a team_.

| Ticket                            | Issue | What                                                 | Size | Depends on             | Milestone       |
| --------------------------------- | ----- | ---------------------------------------------------- | ---- | ---------------------- | --------------- |
| <a id="b-team-01"></a>B-TEAM-01   | #231  | Teams tables                                         | M    | #230                   | First hackathon |
| <a id="b-team-02"></a>B-TEAM-02 ★ | #249  | Team rules                                           | S    | #213                   | First hackathon |
| <a id="b-team-03"></a>B-TEAM-03   | #250  | Create a team                                        | S    | #231, #249, #239       | First hackathon |
| <a id="b-team-04"></a>B-TEAM-04   | #251  | Invite links and joining a team                      | M    | #250                   | First hackathon |
| <a id="b-team-05"></a>B-TEAM-05   | #252  | Ask to join a team; the captain decides              | S    | #250                   | First hackathon |
| <a id="b-team-06"></a>B-TEAM-06   | #253  | Leave a team, remove a member, pass on the captaincy | S    | #250                   | First hackathon |
| <a id="b-team-07"></a>B-TEAM-07   | #254  | Page: my team                                        | M    | #251, #252, #253, #241 | First hackathon |
| <a id="b-team-08"></a>B-TEAM-08   | #255  | Page: looking for a team                             | S    | #252                   | First hackathon |
| <a id="b-team-09"></a>B-TEAM-09 ★ | #256  | Team notifications                                   | S    | #252, #177             | First hackathon |

### Submissions

Entries with links, AI and original-work statements, a server-side deadline and versions.

| Ticket                          | Issue | What                                                           | Size | Depends on | Milestone       |
| ------------------------------- | ----- | -------------------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-sub-01"></a>B-SUB-01   | #232  | Submissions tables                                             | S    | #231, #214 | First hackathon |
| <a id="b-sub-02"></a>B-SUB-02 ★ | #257  | Submission rules                                               | S    | #213       | First hackathon |
| <a id="b-sub-03"></a>B-SUB-03   | #258  | Save a submission draft                                        | S    | #232, #257 | First hackathon |
| <a id="b-sub-04"></a>B-SUB-04   | #259  | Submit before the deadline                                     | S    | #258       | First hackathon |
| <a id="b-sub-05"></a>B-SUB-05   | #260  | Submission form: the project                                   | M    | #258, #241 | First hackathon |
| <a id="b-sub-06"></a>B-SUB-06   | #261  | Submission form: AI use, statements and states                 | S    | #260, #259 | First hackathon |
| <a id="b-sub-07"></a>B-SUB-07   | #262  | Deadline reminders and submission receipts                     | S    | #259, #237 | First hackathon |
| <a id="b-sub-08"></a>B-SUB-08   | #263  | Open-source track: record what maintainers reviewed and merged | S    | #259       | First hackathon |
| <a id="b-sub-09"></a>B-SUB-09 ⚙ | #264  | Screenshots on submissions                                     | M    | #260       | Can follow      |

### Judging and results

Judges, recusal, scores, ranking and frozen results.

| Ticket                          | Issue | What                                          | Size | Depends on       | Milestone       |
| ------------------------------- | ----- | --------------------------------------------- | ---- | ---------------- | --------------- |
| <a id="b-jdg-01"></a>B-JDG-01   | #233  | Judging tables                                | S    | #232, #216       | First hackathon |
| <a id="b-jdg-02"></a>B-JDG-02 ★ | #265  | Score aggregation, ranking and tie-breaks     | M    | #216             | First hackathon |
| <a id="b-jdg-03"></a>B-JDG-03   | #234  | Invite judges; judges accept or decline       | S    | #233, #218       | First hackathon |
| <a id="b-jdg-04"></a>B-JDG-04   | #266  | Judges read submissions and recuse themselves | S    | #234, #259, #175 | First hackathon |
| <a id="b-jdg-05"></a>B-JDG-05   | #267  | Save scores                                   | S    | #266             | First hackathon |
| <a id="b-jdg-06"></a>B-JDG-06   | #268  | Judge page: entries and progress              | S    | #266, #241       | First hackathon |
| <a id="b-jdg-07"></a>B-JDG-07   | #269  | Judge page: score an entry or recuse          | M    | #268, #267       | First hackathon |
| <a id="b-jdg-08"></a>B-JDG-08   | #270  | Organiser: judging progress and reminders     | S    | #267, #247       | Can follow      |
| <a id="b-jdg-09"></a>B-JDG-09   | #271  | Publish the results                           | M    | #265, #267, #175 | First hackathon |
| <a id="b-jdg-10"></a>B-JDG-10   | #272  | Results on the hackathon page                 | M    | #271, #263       | First hackathon |
| <a id="b-jdg-11"></a>B-JDG-11 ★ | #273  | Judging and results notifications             | S    | #234, #271, #177 | First hackathon |
| <a id="b-jdg-12"></a>B-JDG-12   | #299  | Show each team the judges' feedback           | S    | #271, #254       | First hackathon |

### Profiles

The profile becomes a builder's portfolio: skills, links, _open to_, a hackathon record, and a choice to appear in search engines.

| Ticket                          | Issue | What                                                         | Size | Depends on       | Milestone       |
| ------------------------------- | ----- | ------------------------------------------------------------ | ---- | ---------------- | --------------- |
| <a id="b-prf-01"></a>B-PRF-01   | #303  | Portfolio fields on the profile: skills, links and _open to_ | M    | #172             | First hackathon |
| <a id="b-prf-02"></a>B-PRF-02   | #304  | Edit skills, links and _open to_ in the profile form         | M    | #303             | First hackathon |
| <a id="b-prf-03"></a>B-PRF-03 ★ | #305  | Show skills, links and _open to_ on the public profile       | S    | #303             | First hackathon |
| <a id="b-prf-04"></a>B-PRF-04   | #306  | Let each member choose to appear in search engines           | M    | #303             | First hackathon |
| <a id="b-prf-05"></a>B-PRF-05   | #308  | Hackathon record on the profile                              | S    | #271, #307, #305 | First hackathon |

### Projects

Hackathon entries become project pages, built so Stage D can open projects to every member.

| Ticket                          | Issue | What                                   | Size | Depends on | Milestone       |
| ------------------------------- | ----- | -------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-prj-01"></a>B-PRJ-01   | #309  | Projects tables                        | M    | #172, #232 | First hackathon |
| <a id="b-prj-02"></a>B-PRJ-02   | #310  | Turn a hackathon entry into a project  | M    | #309, #271 | First hackathon |
| <a id="b-prj-03"></a>B-PRJ-03   | #311  | Public project page                    | M    | #310       | First hackathon |
| <a id="b-prj-04"></a>B-PRJ-04   | #312  | Edit a project and keep it up to date  | S    | #311       | First hackathon |
| <a id="b-prj-05"></a>B-PRJ-05 ★ | #313  | Projects section on the public profile | S    | #311, #305 | First hackathon |

### Certificates

Verifiable certificate pages for participants, winners and judges.

| Ticket                          | Issue | What                                       | Size | Depends on | Milestone       |
| ------------------------------- | ----- | ------------------------------------------ | ---- | ---------- | --------------- |
| <a id="b-crt-01"></a>B-CRT-01   | #307  | Issue certificates from the frozen results | M    | #271       | First hackathon |
| <a id="b-crt-02"></a>B-CRT-02   | #314  | Certificate page anyone can verify         | M    | #307       | First hackathon |
| <a id="b-crt-03"></a>B-CRT-03 ★ | #315  | Members find and share their certificates  | S    | #314, #273 | First hackathon |

### Prizes

Who won what, and whether it reached them. No money moves.

| Ticket                        | Issue | What                                                                      | Size | Depends on | Milestone  |
| ----------------------------- | ----- | ------------------------------------------------------------------------- | ---- | ---------- | ---------- |
| <a id="b-prz-01"></a>B-PRZ-01 | #274  | Prize awards and delivery tracking                                        | S    | #215, #271 | Can follow |
| <a id="b-prz-02"></a>B-PRZ-02 | #275  | Organiser: award prizes and mark them delivered; winners see their status | M    | #274, #247 | Can follow |

### Organiser console

What an organiser needs during the hackathon.

| Ticket                        | Issue | What                                                | Size | Depends on | Milestone       |
| ----------------------------- | ----- | --------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-ops-01"></a>B-OPS-01 | #247  | Organiser dashboard for a hackathon                 | M    | #219, #241 | First hackathon |
| <a id="b-ops-02"></a>B-OPS-02 | #276  | Organiser: teams and submissions list               | S    | #247, #259 | First hackathon |
| <a id="b-ops-03"></a>B-OPS-03 | #277  | Follow-ups one week and one month after a hackathon | S    | #271       | Can follow      |

### Safety and privacy

Reports, disqualification, the permission matrix, retention and the privacy policy.

| Ticket                            | Issue | What                                                                                           | Size | Depends on             | Milestone       |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------------------- | ---- | ---------------------- | --------------- |
| <a id="b-safe-01"></a>B-SAFE-01   | #278  | Report a submission or a team                                                                  | S    | #259                   | First hackathon |
| <a id="b-safe-02"></a>B-SAFE-02   | #279  | Admin: reports queue and disqualification                                                      | M    | #278, #184             | First hackathon |
| <a id="b-safe-03"></a>B-SAFE-03   | #280  | What disqualification changes                                                                  | S    | #279, #271             | First hackathon |
| <a id="b-safe-04"></a>B-SAFE-04   | #281  | Permission matrix for every hackathon action                                                   | M    | #271, #253             | First hackathon |
| <a id="b-safe-05"></a>B-SAFE-05   | #282  | Retention for Stage B data                                                                     | S    | #271, #251             | First hackathon |
| <a id="b-safe-06"></a>B-SAFE-06 ⚙ | #283  | Update the privacy policy for hackathons, organisations, portfolios, projects and certificates | S    | #282, #306, #309, #307 | First hackathon |

### Language

One set of words in Arabic, French and English.

| Ticket                            | Issue | What                                              | Size | Depends on | Milestone       |
| --------------------------------- | ----- | ------------------------------------------------- | ---- | ---------- | --------------- |
| <a id="b-i18n-01"></a>B-I18N-01 ★ | #284  | Glossary for hackathon words in Arabic and French | S    | —          | First hackathon |

### Launch

Seed data, end-to-end tests, an accessibility check, and turning it on.

| Ticket                          | Issue | What                                                                  | Size | Depends on                   | Milestone       |
| ------------------------------- | ----- | --------------------------------------------------------------------- | ---- | ---------------------------- | --------------- |
| <a id="b-lch-01"></a>B-LCH-01 ★ | #285  | Dev seed: an organisation and a hackathon in every phase              | S    | #217, #185                   | First hackathon |
| <a id="b-lch-02"></a>B-LCH-02   | #286  | Playwright: an organiser creates a hackathon and an admin approves it | M    | #227, #220                   | First hackathon |
| <a id="b-lch-03"></a>B-LCH-03   | #287  | Playwright: register, form a team, submit                             | M    | #245, #254, #261             | First hackathon |
| <a id="b-lch-04"></a>B-LCH-04   | #288  | Playwright: judge and publish results                                 | M    | #269, #272                   | First hackathon |
| <a id="b-lch-05"></a>B-LCH-05 ★ | #289  | Accessibility check of the hackathon pages in Arabic                  | S    | #272, #254                   | First hackathon |
| <a id="b-lch-06"></a>B-LCH-06 ⚙ | #290  | Turn on hackathons in Algeria                                         | S    | #286, #287, #288, #281, #283 | First hackathon |

★ good first issue · ⚙ done by a maintainer
