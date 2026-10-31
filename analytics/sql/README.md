# Analytics Warehouse

The warehouse layer serves host/admin historical aggregates from BigQuery marts.
Firestore remains the operational database; its exported documents join
first-party behavioral observations here. The host callable also reads bounded,
projected current internal registration outcomes directly from Firestore; those
separate stage counts are not historical cohort conversions.

## Host Inputs

- `catch_analytics.host_analytics_events`: aggregate-safe public organizer
  discovery events written by `recordOrganizerAnalyticsEvent`.
- `analytics_526484083.events_*`: optional historical GA4 organizer behavior
  diagnostics. The refresh can stage these exports, but host discovery counters
  read only `host_analytics_events`; GA4 is neither a fallback nor a larger-count
  override. Advertising-provider events do not increase first-party counters.
- `catch_analytics.*_raw_latest`: Firestore-to-BigQuery export views for
  `organizers`, `events`, `eventParticipations`, `payments`, `reviews`,
  `savedEvents`, `eventInviteLinks`, and `matches`, one extension instance per
  collection.
- `catch_marketplace_metrics.event_success_scorecards_raw_latest`: existing
  Event Success export, used for post-event connection/chat/repeat metrics.

## Host Outputs

- `catch_analytics.mart_host_event_daily`: host-safe daily grain used by
  `getHostAnalytics` and `adminGetHostAnalytics`. It includes discovery,
  demand, booking, checkout-start/drop-off, payment, attendance, review,
  connection, and chat metrics at organizer/event/date grain. Event and review
  rows name their organizer in a nonempty `organizerId`; a row without one is
  left out. `link_clicks` counts owner link clicks (CAT-254) on the organizer
  page.
- `catch_analytics.mart_host_link_daily`: owner link clicks at
  organizer/link/traffic-source/date grain, so the insights roll-up can show
  each link's clicks and where visitors came from. The traffic source is the
  page's fixed list (instagram, whatsapp, facebook, google, qr, email, direct,
  other), mapped from its referrer host or `?via=`; raw referrers and campaign
  values are never recorded. The same refresh rebuilds it in one transaction
  with the event mart.

Host behavioral counts use `COUNT(DISTINCT analytics_event_id)` at the
organizer/event/name/day grain. Streaming insert IDs alone are best-effort;
the distinct event ID also prevents retries from inflating the refreshed mart.
`outbound_booking_clicks` counts distinct `outboundClick` events only from
`external_event_card` and `external_event_booking`. These are provider handoffs,
not external purchases or confirmed bookings; ordinary source/contact links
are not provider booking clicks.

Website views are consented observations, deduplicated per page, tab session
and UTC day. The callable scopes session hashes to organizer/day and uses a
stable view event ID for repeated session views. Counts are not unique people
or all visits: new tabs, days, storage loss and clients without session IDs can
produce additional observations; denied consent and failed ingestion omit
activity. Authenticated canonical staff previews are excluded, but signed-out
owner previews cannot be recognised. App Check and rate protection limit abuse;
there is no complete bot or human-visitor classification. Never infer identity,
true visitor uniqueness, or external conversion from these counters.

Deploy order:

1. Run `node tool/run.mjs check analytics:check-host-bigquery`.
2. Run `ddl/host_analytics_events.sql` and `ddl/mart_host_event_daily.sql`.
   Apply the additive `outbound_booking_clicks` column before enabling the new
   refresh SQL, then explicitly refresh its window. The reader extracts this
   optional field from row JSON, so old schemas and unrefreshed null rows retain
   the other metrics while provider booking clicks remain unavailable. A grouped
   day with any unknown value also stays unavailable; unknown is not measured
   zero. Checked-in DDL/SQL and local tests do not update a live table or schedule.
   This compatibility uses BigQuery's documented [row range variables](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax#range_variables)
   and [JSON functions](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions),
   without a query that directly references the optional column.
3. For a new warehouse, deploy its planned Firestore-to-BigQuery instances one
   by one (`firebase deploy --only extensions:<instance>`); do not deploy all
   extensions as a shortcut.
4. Deploy the Functions callables that write/read host analytics.
5. Explicitly import existing documents for each exported collection, then
   verify source/export document IDs and latest values before refreshing and
   scheduling `marts/refresh_mart_host_event_daily.sql`. A view's existence or
   a successful scheduled run is not proof that the export is complete.

`EXCLUDE_OLD_DATA=no` retains the **before-update payload** in changelog rows;
it does not import documents that predate extension installation. Existing
documents require the extension's external import script **after** installation
and table creation. See the official [parameter definition](https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/README.md)
and [import procedure](https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/PREINSTALL.md#import-existing-documents).
Read the import tool version's current flags before running it, target the same
project/database/collection/dataset/table as the installed instance, and retain
the run output outside tracked source. Do not infer completion from this flag.

IAM ownership:

- Functions runtime: BigQuery job user on the project plus access to
  `catch_analytics` for raw event inserts and mart reads.
- Mart deployer / scheduled query identity: BigQuery job user, editor access to
  `catch_analytics`, and viewer access to `catch_marketplace_metrics`.
- Firestore-to-BigQuery extension service accounts: write access to the export
  tables owned by their extension instances.

## Organizer Column Migration

The warehouse names the organizer `organizer_id` and `organizer_name`. Tables
created before the organizer rename (2026-10-31) named those columns the old
way and clustered on them. Each deploy script's DDL step first renames such a
table in place, keeping its rows (`RENAME COLUMN club_id TO organizer_id`, and
`RENAME COLUMN club_name TO organizer_name` in the event mart). Clustering moves
off the old column before the rename and onto the DDL's `CLUSTER BY` after it.
An absent or already renamed table is left alone, so the step is a no-op on a
new or migrated warehouse. `--dry-run` reads each table and prints the commands
it would run.

Columns renamed live do not move with the code: once Functions write and read
`organizer_id`, an unmigrated table rejects inserts and mart reads until its
deploy script runs. For each environment, after the Functions deploy:

1. `tool/analytics/deploy_host_analytics_bigquery.sh <env> --skip-refresh --dry-run`,
   then the same without `--dry-run`. Repeat with
   `deploy_user_analytics_bigquery.sh` where `catch_user_analytics` exists.
2. Where a host schedule exists, `deploy_host_analytics_bigquery.sh <env>
   --refresh-only --create-schedule` replaces its query with this source SQL;
   the old query names the old columns and fails until then.
3. `node tool/analytics/host_analytics_live_status.mjs --env <env>` checks the
   exports and the schedule. It reports any `bq-host-*` extension instance not
   in `host_analytics_contract.mjs` as unexpected: install the declared instance
   before uninstalling the unexpected one, so the organizers export has no gap.

Deleting retired export tables or views is the owner's to run.

`host_analytics_contract.mjs` owns the shared export inventory used by the source
checker and live-status tool. The live check verifies structured extension
parameters/version, every export's latest view, and a unique enabled schedule whose
SQL exactly matches this checkout. It intentionally reports incomplete against
an older deployed configuration. It does not replace source/export content
parity or prove a refresh is recent merely because rows exist.

## Refresh Safety And Verification

Both marts build the complete replacement window in a temporary table before
changing the published table. Deletion and insertion then run in one
transaction; the exception handler rolls back and rethrows. Readers retain the
previous successful refresh if computation or publication fails. Rows older
than the refresh window remain untouched. This follows BigQuery's
[transaction semantics](https://docs.cloud.google.com/bigquery/docs/transactions).

Run the normal offline checks with:

```sh
node tool/run.mjs check analytics:check-host-bigquery analytics:check-user-bigquery
node --test tool/analytics/mart_refresh.test.mjs tool/analytics/host_analytics_contract.test.mjs
```

The same test file can validate the actual SQL in BigQuery using only tiny
synthetic temporary tables, including failures during computation and insertion,
named, unnamed and missing organizers, rows without an `organizerId`, and GA4
events that must not reach the first-party counters:

```sh
CATCH_ANALYTICS_BQ_TEST_PROJECT=<project-id> node --test tool/analytics/mart_refresh.test.mjs
```

It never uses application source tables or changes schedules/extensions. The
optional test requires BigQuery credentials and is not part of ordinary offline
CI. A script-level `bq --dry_run` does not execute or fully validate
[dynamic statements](https://docs.cloud.google.com/bigquery/docs/multi-statement-queries#dry-run), so it is not a substitute for these fixtures or
source/export parity checks before a live cutover.

## User Inputs

- `catch_marketplace_metrics.participant_signal_facts_raw_latest`: existing
  signal facts for likes, private interest, matches, chats, attendance, and
  feedback.
- `catch_analytics.event_participations_raw_latest`: roster edges for booked
  and attended event counts.
- `catch_user_analytics.user_profile_exposure_events`: aggregate-safe profile
  impression, dwell, and photo performance events. This table is the long-term
  denominator for profile/photo performance and internal composition models.
- `analytics_526484083.events_*`: optional GA4 export used for aggregate app
  active-minute counts when Firebase user IDs are present.

## User Outputs

- `catch_user_analytics.mart_user_analytics_daily`: user daily grain used by
  `getUserAnalytics` and `adminGetUserAnalytics`. It includes user-safe profile
  attention, interest, match, chat, attendance, and app engagement metrics.
  It also stores internal-only composition/scoring columns such as
  `profile_pull_score` and `internal_desirability_percentile`; those fields are
  not returned by the user-facing callable response.

Deploy order:

1. Run `node tool/run.mjs check analytics:check-user-bigquery`.
2. Run `ddl/user_profile_exposure_events.sql` and
   `ddl/mart_user_analytics_daily.sql`.
3. Deploy the Functions callables that read user analytics.
4. Refresh and schedule `marts/refresh_mart_user_analytics_daily.sql`.

IAM ownership:

- Functions runtime: BigQuery job user on the project plus read access to
  `catch_user_analytics.mart_user_analytics_daily`.
- Mart deployer / scheduled query identity: BigQuery job user, editor access to
  `catch_user_analytics`, and viewer access to `catch_analytics`,
  `catch_marketplace_metrics`, and GA4 export datasets.
