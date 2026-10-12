# First-party action tracking (AT-01 / P1-019 / CO-10)

Implemented locally on 12 October 2026. Deployment and production ingestion verification are separate release steps.

## What is measured

| Signal                                    | Source                             | Meaning                                                                                                                  |
| ----------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `landing_view`, `city_view`, `event_view` | Resolved public browser routes     | Page was displayed; not a unique person                                                                                  |
| `host_start`                              | Resolved host wizard               | Wizard opened; not a published or completed meetup                                                                       |
| `rsvp_start`                              | Join button                        | Intent; not a saved RSVP or attendance                                                                                   |
| `events_created`                          | Existing post-persistence recorder | Meetup saved; optional campaign dimensions enrich the existing single event                                              |
| `rsvps_created`                           | Successful non-host RSVP insert    | Seat saved; duplicates and rejected requests do not count; cancellations/rejoins can generate additional seats over time |
| `share_open`                              | Share button                       | Share flow opened                                                                                                        |
| `share_complete`                          | Resolved native share API          | OS accepted the share; not proof of delivery or a referral                                                               |
| `share_copy`                              | Successful clipboard write         | Link copied; not proof of delivery                                                                                       |

Browser reports use POST `/api/actions`, strict 1 KiB JSON, exact same-origin checks and the existing Durable Object limiter (120 attempts per IP per ten minutes). The limiting address is security infrastructure, never an Analytics Engine dimension. Reports omit cookies, are best effort and do not delay navigation. Browser caps: 50 reports per document and a 400 ms duplicate guard. Views are emitted after resolved navigation, not hover/preload, failed loaders or router invalidation. Private/account/auth pages have no view reports. Backend reporting failures do not undo saved meetups or RSVPs.

## Attribution and privacy

Only lowercase campaign codes (letters, digits, underscore, hyphen; at most 64 characters) are accepted for `utm_source`, `utm_medium`, `utm_campaign`. Invalid or absent values become `none`. Validated campaign query parameters survive internal navigation, authentication return paths, and short-event redirects. No attribution cookie, local-storage record, visitor ID, account ID, event ID, full URL, free text or referrer is added to the action dataset. A reload or new visit without tags is unattributed: this is URL-based attribution, not persistent first/last-touch tracking.

New action collection respects browser Do Not Track and Global Privacy Control at both browser and HTTP boundaries. New acquisition dimensions are omitted under those signals. Existing operational `events_created` totals continue without campaign dimensions. `ACTION_ANALYTICS_ENABLED=false` disables the anonymous endpoint and new RSVP acquisition metric, and strips campaign dimensions from existing creation metrics. This switch does not disable the product's existing operational records or unrelated observability.

Shared event links get fresh `community / share / local-meetups` codes when privacy signals permit, rather than inheriting a sender's paid label. Sharing-button counts and incoming visits carrying that label are different measures. Link tags do not prove a personal referral or identify the sender.

Arabic, English and French privacy disclosures describe this collection. Existing operational attendance records remain private; the anonymous action stream is not joined to private identities. Campaign-level long-term attendance or retention is therefore not claimed. There is no Meta Pixel, Conversions API, new vendor or new dependency in this change.

## Analytics Engine reporting

The existing dataset is `founders-coffee-metrics`. Keep its first three blobs compatible with existing queries:

| Column    | Value                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| `index1`  | Market code                                                                        |
| `blob1`   | Action/event                                                                       |
| `blob2`   | City code or empty                                                                 |
| `blob3`   | UI locale for browser actions; event lead language for server outcomes             |
| `blob4`   | Server-assigned environment (`development`, `staging`, `production`, or `unknown`) |
| `blob5`   | Source or `none`                                                                   |
| `blob6`   | Medium or `none`                                                                   |
| `blob7`   | Campaign or `none`                                                                 |
| `blob8`   | Page kind or `server`                                                              |
| `double1` | Count increment, normally 1                                                        |

Production reports must filter `blob4 = 'production'` and exclude activation/test campaign codes. Historical rows without an environment are not silently treated as production. Browser, staging and local verification traffic never belongs in the paid campaign's results.

Use sample-weighted totals, as described in [Cloudflare's SQL API documentation](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/): `SUM(_sample_interval * double1)`, not a raw row count. Export weekly; sampled totals can be estimates, and blocked/failed/opted-out browser reports are missing observations. Anonymous counts cannot establish unique people or a person-level conversion rate. Verify the dataset table name with `SHOW TABLES` before running reports.

## Private community report

The admin Worker serves GET `/api/community-health` behind its existing Access JWT and correlated Better Auth operator session, plus the central `metrics:read` permission. No public read endpoint was added. It returns unavailable when `communityOperations` is off; missing evidence is not a zero retention rate.

Parameters: `market=DZ`, optional `city`, required ISO `from`, `to`, `asOf`, optional `operatorHostId`. Bounds are `[from,to)`, `to <= asOf <= now`, and at most one reporting year. Encode offsets such as `+01:00` properly. Reporting is Algeria-specific: local calendar dates use UTC+1 year-round. The operator identifier is an input to a private exclusion filter and is not echoed in report output. Without that filter, `operatorExcluded=false`: host counts must not be presented as independent-host validation.

A completed meetup must be published, ended, reported held, and have at least one recorded non-host attendee or walk-in. A listing, elapsed date, host-only attendance, no-show, cancelled event, or missing closeout does not qualify. This is host/operations-reported evidence, not independent verification of physical presence. Closeout coverage is reported so sparse records remain visible. Walk-ins can support completion and turnout, but cannot establish unique people or return.

The report includes period completions, operator-filtered completions and host counts, unique identified non-host attendees, first-time hosts/attendees, returning attendees, and pending/mature 30-day cohorts. Campaign 30-day retention requires a second qualifying hosting/attendance on a later Algeria calendar date within 30 days of the first. Only first occurrences in the requested reporting period with a full observation window enter the denominator. Rates are `null` when no mature cohort exists, with numerator and denominator always included. Recurring hosts require at least two separate dates in the trailing 90 days. Returning non-hosts in the reporting period require an earlier qualifying attendance on a separate date within the preceding 90 days.

The repository's existing 60-day host-retention and 90-day repeat-participation measures remain separately labelled. They do not replace the campaign's 30-day measures, and the repository's expansion gate is unchanged. Query successive calendar months using Algeria offsets for monthly reporting, or the campaign's agreed 30-day periods for validation. Do not pool periods to claim three consecutive months met a target.

History comes from the available two-year operational records. Closed accounts, corrections and retention cleanup can change the available evidence. `asOf` is an observation cutoff, not an immutable historical snapshot. Archive dated aggregate exports for comparisons. Track organizer workload and qualitative feedback separately; quantitative host recurrence alone does not prove someone actually does the organizing work independently.

## Release verification

Before production use: pass the repository checks; deploy through the normal release process; confirm real tagged landing, host and RSVP reports in the production dataset; verify privacy opt-out; confirm edge rules admit bounded anonymous reports; and check that the private closeout/attendance feature is enabled and usable before promising completion/retention reporting. No paid ad should be launched as part of this procedure.
