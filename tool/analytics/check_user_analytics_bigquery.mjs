#!/usr/bin/env node
import fs from "node:fs";
import {fromRepo} from "../lib/repo_paths.mjs";

const expectedMartColumns = [
  "date",
  "uid",
  "events_booked_count",
  "events_attended_count",
  "outgoing_like_count",
  "incoming_like_count",
  "private_interest_sent_count",
  "private_interest_received_count",
  "match_count",
  "chat_started_sent_count",
  "chat_started_received_count",
  "chat_message_sent_count",
  "chat_message_received_count",
  "feedback_submitted_count",
  "profile_view_count",
  "unique_profile_viewer_count",
  "profile_dwell_ms",
  "photo_impression_count",
  "photo_dwell_ms",
  "top_photo_id",
  "top_photo_score",
  "app_active_minutes",
  "app_event_count",
  "profile_pull_score",
  "connection_followthrough_score",
  "event_anchor_score",
  "internal_desirability_percentile",
  "data_completeness_score",
  "refreshed_at",
];

const errors = [];

const ddlEvents = readText("analytics/sql/ddl/user_profile_exposure_events.sql");
const ddlMart = readText("analytics/sql/ddl/mart_user_analytics_daily.sql");
const refresh = readText("analytics/sql/marts/refresh_mart_user_analytics_daily.sql");
const deploy = readText("tool/analytics/deploy_user_analytics_bigquery.sh");
const bqSource = readText("functions/src/analytics/userAnalyticsBigQuery.ts");
const callable = readText("functions/src/analytics/userAnalytics.ts");
const copy = readText("lib/user_analytics/shared/user_analytics_copy.dart");

requireText(
  ddlEvents,
  "CREATE TABLE IF NOT EXISTS `%s.%s.user_profile_exposure_events`",
);
requireText(ddlEvents, "PARTITION BY event_date");
requireText(ddlEvents, "CLUSTER BY subject_uid, viewer_uid, event_id, event_name");
requireText(ddlEvents, "  organizer_id STRING,");

requireText(ddlMart, "CREATE TABLE IF NOT EXISTS `%s.%s.mart_user_analytics_daily`");
requireText(ddlMart, "PARTITION BY date");
requireText(ddlMart, "CLUSTER BY uid");
for (const column of expectedMartColumns) {
  requireText(ddlMart, `${column} `, `mart DDL missing column ${column}`);
}
requireText(ddlMart, "Internal scoring columns");

requireText(refresh, "participant_signal_facts_raw_latest");
requireText(refresh, "event_participations_raw_latest");
requireText(refresh, "user_profile_exposure_events");
requireText(refresh, "mart_user_analytics_daily");
requireText(refresh, "profile_pull_score");
requireText(refresh, "connection_followthrough_score");
requireText(refresh, "internal_desirability_percentile");
requireText(refresh, "ga4_user_daily");
requireText(refresh, "analytics_526484083");

requireText(deploy, "ddl/user_profile_exposure_events.sql");
requireText(deploy, "ddl/mart_user_analytics_daily.sql");
requireText(deploy, "marts/refresh_mart_user_analytics_daily.sql");
// A pre-organizer exposure table is renamed in place before the DDL runs.
requireText(deploy, 'rename_to_organizer user_profile_exposure_events \\\n    "RENAME COLUMN club_id TO organizer_id"');
requireText(deploy, "--service-account <email>");
requireText(deploy, "--service_account_name=");
requireText(deploy, "--update_credentials");
forbidText(
  deploy,
  "--target_dataset=catch_user_analytics",
  "scheduled DML query should not set a destination dataset",
);

requireText(bqSource, "mart_user_analytics_daily");
requireText(bqSource, "USER_ANALYTICS_MART_TABLE");
requireText(callable, "getUserAnalytics");
requireText(callable, "adminGetUserAnalytics");
requireText(callable, "validateUserAnalyticsCallableResponse");
forbidText(
  callable,
  "internal_desirability_percentile",
  "user-facing callable must not expose internal percentile fields",
);
requireText(copy, "UserAnalyticsCopy");
requireText(copy, "static UserAnalyticsTipCopy tip(");

if (errors.length > 0) {
  console.error("User analytics BigQuery validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "User analytics BigQuery validation passed: " +
    `${expectedMartColumns.length} mart columns, DDL, refresh SQL, callables, and copy refs.`,
);

function readText(relativePath) {
  return fs.readFileSync(fromRepo(relativePath), "utf8");
}

function requireText(contents, needle, message = null) {
  if (!contents.includes(needle)) {
    errors.push(message ?? `Missing expected text: ${needle}`);
  }
}

function forbidText(contents, needle, message = null) {
  if (contents.includes(needle)) {
    errors.push(message ?? `Unexpected text: ${needle}`);
  }
}
