#!/usr/bin/env node
import fs from "node:fs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {hostExports as expectedExtensions, hostExportSource} from "./host_analytics_contract.mjs";

const expectedMartColumns = [
  "date",
  "organizer_id",
  "organizer_name",
  "event_id",
  "event_title",
  "event_start_time",
  "event_status",
  "capacity_limit",
  "booked_count",
  "checked_in_count",
  "waitlisted_count",
  "gross_revenue_minor",
  "currency",
  "checkout_started_count",
  "checkout_dropoff_count",
  "payment_completed_count",
  "payment_failed_count",
  "payment_refunded_count",
  "review_count",
  "rating_total",
  "verified_review_count",
  "public_review_count",
  "owner_response_count",
  "demand_count",
  "invite_open_count",
  "mutual_match_count",
  "chat_started_count",
  "repeat_attendee_count",
  "listing_views",
  "search_appearances",
  "event_views",
  "organizer_saves",
  "event_saves",
  "contact_clicks",
  "claim_clicks",
  "outbound_clicks",
  "outbound_booking_clicks",
  "link_clicks",
  "refreshed_at",
];

const errors = [];

const firebaseJson = readJson("firebase.json");
const declaredExtensions = firebaseJson.extensions ?? {};
for (const [instanceId, expected] of Object.entries(expectedExtensions)) {
  const source = declaredExtensions[instanceId];
  if (source !== hostExportSource) {
    errors.push(
      `${instanceId}: expected firestore-bigquery-export@0.3.2, found ${source ?? "missing"}.`,
    );
  }
  checkExtensionEnv(instanceId, expected);
}

for (const instanceId of Object.keys(declaredExtensions)) {
  if (instanceId.startsWith("bq-host-") && !expectedExtensions[instanceId]) {
    errors.push(`${instanceId}: unexpected bq-host extension declaration.`);
  }
}

const hostEnvFiles = fs.readdirSync(fromRepo("extensions"))
  .filter((file) => /^bq-host-.*\.env$/.test(file))
  .sort();
for (const file of hostEnvFiles) {
  const instanceId = file.replace(/\.env$/, "");
  if (!expectedExtensions[instanceId]) {
    errors.push(`${file}: unexpected host BigQuery extension env file.`);
  }
}

const ddlEvents = readText("analytics/sql/ddl/host_analytics_events.sql");
const ddlMart = readText("analytics/sql/ddl/mart_host_event_daily.sql");
const refresh = readText("analytics/sql/marts/refresh_mart_host_event_daily.sql");
const deploy = readText("tool/analytics/deploy_host_analytics_bigquery.sh");
const bqSource = readText("functions/src/analytics/hostAnalyticsBigQuery.ts");
const publicEvents = readText("functions/src/analytics/organizerAnalyticsEvents.ts");

requireText(ddlEvents, "CREATE TABLE IF NOT EXISTS `%s.%s.host_analytics_events`");
requireText(ddlEvents, "PARTITION BY event_date");
requireText(ddlEvents, "CLUSTER BY organizer_id, target_event_id, event_name");
requireText(ddlEvents, "ADD COLUMN IF NOT EXISTS link_id STRING");
requireText(ddlEvents, "ADD COLUMN IF NOT EXISTS traffic_source STRING");

requireText(ddlMart, "CREATE TABLE IF NOT EXISTS `%s.%s.mart_host_event_daily`");
requireText(ddlMart, "ADD COLUMN IF NOT EXISTS checkout_started_count INT64");
requireText(ddlMart, "ADD COLUMN IF NOT EXISTS checkout_dropoff_count INT64");
requireText(ddlMart, "PARTITION BY date");
requireText(ddlMart, "CLUSTER BY organizer_id, event_id");
requireText(ddlMart, "ADD COLUMN IF NOT EXISTS link_clicks INT64");
requireText(ddlMart, "CREATE TABLE IF NOT EXISTS `%s.%s.mart_host_link_daily`");
requireText(ddlMart, "CLUSTER BY organizer_id, link_id");
for (const column of expectedMartColumns) {
  requireText(ddlMart, `${column} `, `mart DDL missing column ${column}`);
}

for (const [instanceId, expected] of Object.entries(expectedExtensions)) {
  if (!expected.requiredInMart) continue;
  requireText(
    refresh,
    `${expected.tableId}_raw_latest`,
    `refresh SQL must read ${instanceId} export view ${expected.tableId}_raw_latest`,
  );
}
requireText(refresh, "event_success_scorecards_raw_latest");
requireText(refresh, "host_analytics_events");
requireText(refresh, "mart_host_event_daily");
requireText(refresh, "DECLARE refresh_start DATE");
requireText(refresh, 'DECLARE ga4_dataset STRING DEFAULT "analytics_526484083"');
requireText(refresh, "CREATE TEMP TABLE ga4_host_analytics_events");
requireText(refresh, "organizer_listingView");
requireText(refresh, "direct_discovery_counts");
requireText(refresh, "ga4_discovery_counts");
requireText(refresh, "COUNT(DISTINCT analytics_event_id)");
requireText(refresh, "FROM direct_discovery_counts");
requireText(refresh, "SUM(u.link_clicks) AS link_clicks");
requireText(refresh, "DELETE FROM `%s.%s.mart_host_link_daily`");
requireText(refresh, "INSERT INTO `%s.%s.mart_host_link_daily`");
forbidText(refresh, "FULL OUTER JOIN ga4_discovery_counts", "Ad events must not inflate first-party counters");

requireText(deploy, "ddl/host_analytics_events.sql");
requireText(deploy, "ddl/mart_host_event_daily.sql");
requireText(deploy, "marts/refresh_mart_host_event_daily.sql");
// Pre-organizer tables are renamed in place before the DDL runs, and their
// clustering follows the DDL's CLUSTER BY.
requireText(deploy, 'rename_to_organizer host_analytics_events "RENAME COLUMN club_id TO organizer_id"');
requireText(deploy, '"target_event_id,event_name" "organizer_id,target_event_id,event_name"');
requireText(deploy, '"RENAME COLUMN club_id TO organizer_id, RENAME COLUMN club_name TO organizer_name"');
requireText(deploy, '"event_id" "organizer_id,event_id"');
requireText(deploy, 'rename_to_organizer mart_host_link_daily "RENAME COLUMN club_id TO organizer_id"');
requireText(deploy, '"link_id" "organizer_id,link_id"');
requireText(deploy, "--service-account <email>");
requireText(deploy, "--service_account_name=");
requireText(deploy, "--update_credentials");
forbidText(
  deploy,
  "--target_dataset=catch_analytics",
  "scheduled DML query should not set a destination dataset",
);

requireText(bqSource, "mart_host_event_daily");
requireText(bqSource, "HOST_ANALYTICS_MART_TABLE");
requireText(bqSource, "mart_host_link_daily");
requireText(publicEvents, "host_analytics_events");
requireText(publicEvents, "sessionHash(");
requireText(publicEvents, "assertOrganizerScope(");

if (errors.length > 0) {
  console.error("Host analytics BigQuery validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Host analytics BigQuery validation passed: " +
    `${Object.keys(expectedExtensions).length} exports, ` +
    `${expectedMartColumns.length} mart columns, DDL, refresh SQL, and callables.`,
);

function checkExtensionEnv(instanceId, expected) {
  const file = `extensions/${instanceId}.env`;
  if (!fs.existsSync(fromRepo(file))) {
    errors.push(`${file}: missing extension env file.`);
    return;
  }
  const env = parseEnv(readText(file));
  const required = {
    DATASET_LOCATION: "asia-south1",
    BIGQUERY_PROJECT_ID: "${param:PROJECT_ID}",
    DATABASE: "(default)",
    DATABASE_REGION: "asia-south1",
    COLLECTION_PATH: expected.collectionPath,
    WILDCARD_IDS: "false",
    DATASET_ID: "catch_analytics",
    TABLE_ID: expected.tableId,
    TABLE_PARTITIONING: "DAY",
    VIEW_TYPE: "view",
    BACKUP_COLLECTION: "bigQueryExportFailures",
    USE_NEW_SNAPSHOT_QUERY_SYNTAX: "yes",
    EXCLUDE_OLD_DATA: "no",
    MAX_ENQUEUE_ATTEMPTS: "3",
  };
  for (const [key, value] of Object.entries(required)) {
    if (env[key] !== value) {
      errors.push(
        `${file}: expected ${key}=${value}, found ${env[key] ?? "missing"}.`,
      );
    }
  }
}

function parseEnv(contents) {
  const parsed = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    parsed[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return parsed;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

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
