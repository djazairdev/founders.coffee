# Product vision

| Field     | Value                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Status    | Agreed by Founder / Product on 2026-10-16; V16–V22 on 2026-10-17                                                         |
| Owner     | Founder / Product                                                                                                        |
| Replaces  | The future phases P2–P4 in the [implementation plan](./implementation-plan.md) and the retired SRS v1.7                  |
| Builds on | The retired hackathon engine plan (`HACK-*`) and sponsorship measurement plan (`SP-*`), in git history before `7e91ab0e` |

founders.coffee is where people in Algeria's technology and startup communities meet, build together, show what they made, and find the support to keep going. This document says what the product becomes, in what order, and which decisions are settled. The [implementation plan](./implementation-plan.md) turns each stage into tickets.

## 1. The idea in one line

**Meet → Build → Show → Support.** People meet at events, build at hackathons, show the results as projects, and sponsors and partners support all three. Each step feeds the next, and community participation is always free.

```text
  Meet          Build             Show             Support
  events  ──▶  hackathons  ──▶  projects  ──▶  sponsors and partners
    ▲              │                                  │
    └──────────────┴────── teams, contributions, credits, introductions
                          djazair.dev: the open-source track
```

## 2. Principles

These hold at every stage.

1. **No formalities.** Warm, informal and human. The coffee meetup stays the heart of the product.
2. **Participation is free.** Joining, attending, hosting a community event, entering a hackathon and posting a project never cost a member anything. Organisations pay only for clearly separate B2B services.
3. **The community is not mined.** No attendee lists sold or shared, no tracking vendors, no behavioural profiling. Sponsors see totals; a person is introduced to a sponsor only when they say yes, and can take it back.
4. **Sponsors are disclosed and never decide alone.** Every sponsored page, track and prize says who supports it. Several sponsors may support one hackathon, each disclosed; none controls moderation, attendance data or who takes part.
5. **Nothing is promised before it is confirmed.** A prize, credit or subscription appears on a page only after the partner confirms it in writing.
6. **Outcomes, not vanity numbers.** We count events that happened, people who came back, teams that kept going and work that was reviewed, not listings or sign-ups.
7. **Algeria first.** New products start in Algeria. Egypt and Saudi Arabia keep their meetups and get the new layers once they work in Algeria.

## 3. Who it serves

| Who                                                           | What they need                                      | What founders.coffee gives them                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Founders and builders                                         | Collaborators, users, feedback, visibility          | Meetups, hackathons that solve their problems, project pages, introductions                                       |
| Developers, designers and students                            | Real projects, teams, experience, prizes, a network | Workshops, hackathons with partner prizes, an open-source track, a portfolio profile, project pages, certificates |
| Organisers: clubs, universities, communities                  | A dependable way to run events and hackathons       | Event and hackathon tools, approval as an organiser, templates                                                    |
| Judges and mentors                                            | A fair, light way to review work                    | A judging page with a published rubric and conflict-of-interest recusal; office hours for mentors                 |
| Sponsors and partners: tech companies, startups, institutions | A credible way to reach and support builders        | Disclosed sponsorship, challenge tracks, a sponsor dashboard, opt-in introductions, impact reports                |
| The founders.coffee team                                      | Run the community safely                            | Approvals, moderation and operations in `apps/admin`                                                              |

## 4. The four layers

### 4.1 Meet: events

**Exists today** ([architecture](./architecture.md#what-works-today)): city discovery, the event creation wizard, RSVP and guest RSVP, live attendance, waitlists, the meetup chat with reports and moderators, cancellation notices, close-outs with attendance and feedback.

**Added in Stage B:**

- **Event types:** Meetup, Workshop and Hackathon. Tags describe the topic, level, language and audience.
- **Online and hybrid events:** a meeting link instead of, or as well as, a venue.
- **Who runs it:** each event is labelled _Hosted by founders.coffee_, _Co-hosted_ (every organiser named) or _Community_.
- **Repeat an event:** create the next one from a past one.

### 4.2 Build: hackathons

A hackathon is an event with a brief, a schedule, teams, submissions, judges and prizes. The default format is **hybrid**: registration, teams, building and submissions happen online, with an in-person kickoff or demo day in one city that online teams can follow and present at. Fully **online** hackathons are also supported.

- **Who creates them:** the founders.coffee team and organisations we approve (clubs, universities, companies). Other hosts later.
- **Tracks:** a hackathon has one or more tracks. A track can be a founder's real problem, a sponsor's technology, or the **open-source track** (§4.5).
- **Teams:** created on founders.coffee: create a team, invite by link, request to join, or appear on a _Looking for a team_ list. The organiser sets the team size.
- **Submissions:** on founders.coffee: repository link, demo video link, description, screenshots, the track, an AI-use statement and an original-work statement. The server enforces the deadline; edits before it keep earlier versions.
- **Judging:** named judges score 3–4 published, weighted criteria. A judge with a conflict of interest steps out of that submission. Scores are averaged, ties are broken by a published rule, and results are published with the scores.
- **AI tools:** the organiser sets the policy for each hackathon: allowed with disclosure, AI-native (built around AI coding tools), or restricted. Every submission says which tools were used and what the team built itself, whatever the policy.
- **Prizes:** partner credits, tools, subscriptions and opportunities, confirmed in writing before they're announced. No money moves through founders.coffee until Stage E.
- **Rules published before registration:** eligibility, schedule, time commitment, rubric, prizes, team size, submission format, the AI policy, and who owns the code and under which licence. Minors need a guardian's consent.
- **Learning during the week:** two or three workshops before kickoff (ordinary Workshop events), and named mentors who hold office hours in the hackathon chat. The hackathon page lists them.
- **What participants leave with:** the judges' scores and comments on their own entry; a certificate anyone can verify (participant, winner or judge); a project page made from their entry; and, if they choose, the hackathon on their profile.
- **After the event:** the hackathon chat stays open for 30 days after results. A follow-up one week later (reviews, feedback) and one month later (teams still building). Strong teams are invited to demo at a meetup.

### 4.3 Show: projects and profiles

A **project page** shows what a team or founder is building: the problem, the stage (idea, prototype, MVP, launched), links, the team, and, for a hackathon entry, its result.

- **First (Stage B):** hackathon entries become project pages when the team agrees, from the first hackathon's results.
- **Then (Stage D):** any member can post a project.
- Members react and answer 1–3 guided feedback questions the owner chose.
- A project can be linked to the events where it was discussed, and can become the brief of the next challenge.
- Sponsors can bookmark a project and say they're interested; the owner decides whether to be introduced.

The **profile** becomes a builder's portfolio (Stage B): skills, links (GitHub, LinkedIn, a website), what the member is _open to_ (jobs, internships, co-founding), their projects, and their hackathon record (took part, placed, judged). Each part is published by its own switch. A profile appears in search engines only if its owner turns that on. Four safety rules stay: no direct messages, no followers, no ratings or scores of people, and no public posts or feed.

### 4.4 Support: sponsors and partners

**What a sponsor can support:** an event or a series of events, a hackathon or one of its tracks, prizes (credits, tools, opportunities), mentors and judges.

**What a sponsor sees,** in the sponsor dashboard (`apps/dashboard`, the `sponsor_contact` role):

1. **Reach and engagement:** people reached on sponsored pages, link and QR-code clicks, credits redeemed. Totals only.
2. **Challenge outcomes:** registrations, teams, submissions, finalists, and use of the sponsor's technology in submissions.
3. **Talent, opt-in only:** participants who chose to be introduced to the sponsor, and what came of it. Consent is recorded and can be withdrawn; nobody is shared without it.
4. **Impact reports:** a report after each event or each month, by email.

**Revenue,** two B2B lines, never charged to members:

- **Sponsorship** of events, series, hackathons and tracks.
- **Hosted challenges:** a company or institution pays founders.coffee to design and run a challenge, for example to find talent or test an idea. Participation stays free.

Prices and the partner list are kept outside this repository.

### 4.5 djazair.dev: the open-source track

[djazair.dev](https://djazair.dev) runs the open-source side; founders.coffee runs the events. They link to each other and keep separate accounts.

- A hackathon can include an **open-source track** built from issues in the [djazair.dev Hub](https://djazair.dev/en/hub/). Participants take an issue with `/take`, work in the project's repository, and follow its rules (licence, sign-off, AI disclosure).
- **Maintainers decide what is merged, not judges.** The results show what was submitted, reviewed and merged, separately.
- Merged pull requests appear on the hackathon's results with links to GitHub.

## 5. Decisions

Agreed by Founder / Product on 2026-10-16. A change to any of them is a pull request to this file that says why.

| #   | Decision                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Start with the product (Stage B), not with hackathons run by hand: a hackathon needs prizes and a credible page from the first one.                                                                  |
| V2  | Prizes are partner credits, tools, subscriptions and opportunities, confirmed in writing before they're announced. No money moves through the platform until Stage E.                                |
| V3  | Hackathons are hybrid by default; online-only is supported.                                                                                                                                          |
| V4  | The founders.coffee team and approved organisations create hackathons first; other hosts later.                                                                                                      |
| V5  | The challenge engine is built without waiting for the meetup density gate. Stages follow each other as they're delivered. The density gate still decides when a new market or city becomes `active`. |
| V6  | Talent introductions stay, opt-in only, as part of the sponsor offer. They are never recruiting fees.                                                                                                |
| V7  | Projects start from hackathon results, in Stage B; any member can post one from Stage D.                                                                                                             |
| V8  | The sponsor dashboard shows reach and engagement, challenge outcomes, opt-in talent and impact reports.                                                                                              |
| V9  | Revenue comes from sponsorship and hosted challenges. Community participation stays free.                                                                                                            |
| V10 | Hackathons and sponsors start in Algeria.                                                                                                                                                            |
| V11 | djazair.dev and founders.coffee connect through the open-source track; accounts stay separate.                                                                                                       |
| V12 | Winners are chosen by named judges with a published rubric and conflict-of-interest recusal.                                                                                                         |
| V13 | Teams and submissions live on founders.coffee.                                                                                                                                                       |
| V14 | Each organiser sets the hackathon's AI policy; every submission discloses its AI use.                                                                                                                |
| V15 | The first hackathon on founders.coffee takes place in late January 2027.                                                                                                                             |
| V16 | The profile is a builder's portfolio: skills, links, _open to_, projects and a hackathon record, each published by its own switch.                                                                   |
| V17 | Each member chooses whether their profile appears in search engines; it starts off. Project pages are indexed when their team agrees.                                                                |
| V18 | The profile still has no direct messages, no followers, no ratings or scores of people, and no public posts or feed.                                                                                 |
| V19 | Projects start in Stage B, from hackathon entries the team agrees to publish.                                                                                                                        |
| V20 | The hackathon chat stays open for 30 days after results.                                                                                                                                             |
| V21 | Certificates for participants, winners and judges are verifiable pages in Stage B.                                                                                                                   |
| V22 | Participants learn through workshops before kickoff and mentors' office hours during the week; no booking feature.                                                                                   |

These replace SRS decisions D7 (monetization deferred) and D8 (hackathon engine deferred) and the "post-community gate" status of the challenge, sponsorship and talent requirements. V16 to V18 replace rules 1 (the profile stays `noindex`) and 4 (no resume or credentials) of the public profile decision (#92) in the implementation plan; its other rules stay.

## 6. Stages

Each stage ships, is used, and is reviewed before the next one starts. The evidence to look at is listed, but it doesn't block the next stage (V5).

### Stage B: the first hackathon (now → late January 2027)

| Area                | What ships                                                                                                                                                                                                | From the retired plans    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Events              | Event types, online and hybrid events, _Hosted by / Co-hosted / Community_ labels, repeat an event                                                                                                        | —                         |
| Organisers          | Organisation profiles; approval in `apps/admin`                                                                                                                                                           | HACK-018 (part)           |
| Hackathon page      | Brief, rules, schedule, tracks (including open-source), confirmed prizes, judges, AI policy, eligibility, licence and ownership                                                                           | HACK-001, HACK-003        |
| Registration        | Eligibility, code of conduct, capacity and waitlist, in-person or online attendance                                                                                                                       | HACK-004                  |
| Teams               | Create, invite link, request to join, _Looking for a team_, size limits, captain                                                                                                                          | HACK-005                  |
| Submissions         | Links, description, screenshots, AI and original-work statements, server-side deadline, versions                                                                                                          | HACK-006, HACK-007        |
| Schedule            | Phases computed from the dates; reminders through the existing Durable Object alarm per event                                                                                                             | HACK-002, HACK-014 (part) |
| Judging and results | Rubric, judges, recusal, scoring, averages, tie-break, results page, each team's feedback from the judges                                                                                                 | HACK-008 to HACK-011      |
| Leave with          | A portfolio profile (skills, links, _open to_, hackathon record, a search-engine choice), project pages from entries, verifiable certificates, mentors and workshops, the chat open 30 days after results | HACK-017 (as pages)       |
| Prizes              | Award records and delivery tracking for credits and codes; no payments                                                                                                                                    | HACK-012 (no money)       |
| Safety              | Permissions on every server function, reports and disqualification, rate limits                                                                                                                           | HACK-015, HACK-019        |
| Tests               | The full flow in Miniflare and Playwright                                                                                                                                                                 | HACK-020                  |

The [Stage B plan](./stage-b-plan.md) splits this into tickets. Screenshots, prize delivery tracking and a few others are in its _can follow_ milestone and may move to Stage C if the date is tight.

**Evidence to review after it:** registrations and how many came; teams that submitted; judges who finished; follow-ups at one week and one month; partner feedback.

### Stage C: sponsors and the full engine (February → April 2027)

- **Sponsor dashboard,** the four views of §4.4: tracking links and QR codes, totals, challenge outcomes, opt-in introductions with recorded consent, impact reports by email (SP-001 to SP-009, SP-011, SP-014).
- **Sponsor pages** on events and hackathons, with disclosure.
- **Engine additions:** co-hosts, blind judging, announcements and Q&A (HACK-013), observability (HACK-021, SP-017).
- Hackathon creation opens to more approved organisations.

**Evidence:** sponsors who renew; hackathons run by organisations other than founders.coffee.

### Stage D: projects and hosted challenges (from May 2027)

- **Projects for everyone** (§4.3): any member posts a project, not only hackathon teams; guided feedback; sponsor interest; a project becomes a challenge brief.
- **Hosted challenges** as a B2B service: an order recorded on founders.coffee and confirmed by an admin after external payment (SP-015, `libs/payments` manual provider).

**Evidence:** projects that keep being updated; hosted challenges that are paid for and repeated.

### Stage E: money and expansion (when ready)

- Cash prizes and automated payouts, after a compliance review.
- Hackathons and sponsors in Egypt and Saudi Arabia, and in more Algerian cities, when each meets the density gate.
- CRM export, brand-lift surveys and semantic search (SP-010, SP-012, HACK-016).

## 7. The first hackathon

A working plan for late January 2027. Dates are targets; the team confirms them in November.

| When                    | What                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| By 31 October 2026      | This vision merged; Stage B issues opened                                                                                                       |
| November                | Event types, online events, labels; hackathon data model and pages                                                                              |
| By 15 December          | Teams, submissions and judging on staging; partner prizes confirmed in writing; OpenAI's hackathon support applied for (at least a month ahead) |
| Monday 4 January 2027   | Hackathon published, registration opens, with only confirmed prizes                                                                             |
| Friday 22 January       | Kickoff, online and in person; build week starts                                                                                                |
| Friday 29 January       | Submission deadline                                                                                                                             |
| Saturday 30 January     | Demo day in Algiers, streamed; judging and results                                                                                              |
| Early and late February | One-week and one-month follow-ups                                                                                                               |

Proposed tracks: one founder problem, one partner technology, and the open-source track with djazair.dev projects.

## 8. Roles

| Role                                | Can                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Member                              | Attend events, enter hackathons, join teams, publish projects from entries (Stage B) and their own (Stage D), keep a portfolio profile |
| Mentor                              | Help teams during a hackathon, in office hours in its chat                                                                             |
| Host                                | Create community events                                                                                                                |
| Organiser (approved organisation)   | Create hackathons, set tracks, rules, AI policy and prizes, invite judges                                                              |
| Judge                               | Score the submissions assigned to them, recuse themselves                                                                              |
| Team captain                        | Invite members, submit for the team                                                                                                    |
| Sponsor contact (`sponsor_contact`) | See the sponsor dashboard and their sponsored pages; never members' personal data                                                      |
| Moderator, admin                    | Approve organisers and hackathons, moderate, disqualify, confirm hosted-challenge payments                                             |

## 9. Privacy and trust

- Collect only what an event or hackathon needs. Sponsors see totals; personal data reaches a sponsor only through an introduction the person accepted.
- Algeria's personal data protection law (Law 18-07) applies; its authority is the ANPDP. Check new data flows with qualified counsel as the product grows.
- Retention follows the existing rules for close-outs, attendance and feedback, extended to submissions and scores.
- Every portfolio field is published by its own switch, and a profile is in search engines only if its owner turns that on. A certificate page is reachable by its link, never listed.
- Every hackathon publishes its rules, rubric, prizes and AI policy before registration, and its results with scores after judging.
- Disqualification needs a reason and evidence, decided by a person.

## 10. How we measure it

| Layer   | Measures                                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meet    | Events that took place; RSVP to attendance; members who come back within 90 days; organisers other than founders.coffee                                  |
| Build   | Registrations to teams to submissions; judges who finished; teams still building after a month; open-source pull requests submitted, reviewed and merged |
| Show    | Entries that became projects; projects updated after a month; feedback given; projects that became challenges                                            |
| Support | Sponsors who renew; credits redeemed; introductions accepted; hosted challenges paid for and repeated                                                    |

Registrations and sign-ups are never reported as outcomes. Open-source work is counted as submitted, reviewed and merged, separately.

## 11. What changes elsewhere

With this file:

- **[Implementation plan](./implementation-plan.md):** P2–P4 are replaced by the stages in §6, and the [Stage B plan](./stage-b-plan.md) holds the Stage B tickets. Its public profile section follows V16 to V18.
- **[CONTRIBUTING](../CONTRIBUTING.md) and [AGENTS.md](../AGENTS.md):** hackathons, sponsors and projects move into scope, stage by stage.
- **[Architecture](./architecture.md):** `apps/dashboard` is the sponsor dashboard from Stage C.

## 12. Risks

| Risk                                       | What we do                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Visitors don't RSVP or register            | Measure each step from page to attendance; fix the biggest drop before adding features                    |
| Partner prizes don't arrive in time        | Announce only confirmed prizes; keep a hackathon worth entering with opportunities and recognition alone  |
| Stage B is too big for the first date      | Cut Stage B to the hackathon page, registration, teams, submissions and judging; move the rest to Stage C |
| Low-quality or fully generated submissions | Published rubric, AI disclosure, original-work statement, judges, disqualification with evidence          |
| Open-source maintainers overloaded         | Few, well-scoped issues; maintainers can decline; merges stay their decision                              |
| Sponsors want attendee data                | Totals only; introductions only with consent                                                              |
| One person does everything                 | Name an owner and a backup for each hackathon role: organiser, technical lead, moderator, partner contact |
