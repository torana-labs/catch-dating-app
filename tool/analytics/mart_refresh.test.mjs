import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fromRepo} from "../lib/repo_paths.mjs";

const read = (path) => fs.readFileSync(fromRepo(path), "utf8");
const marts = ["host_event", "user_analytics"];
const source = (mart) => read(`analytics/sql/marts/refresh_mart_${mart}_daily.sql`);
// Every published table a refresh replaces, in its one transaction. The host
// refresh also replaces the per-link click roll-up (CAT-254).
const published = {
  host_event: ["mart_host_event_daily", "mart_host_link_daily"],
  user_analytics: ["mart_user_analytics_daily"],
};
const columns = (mart, table = `mart_${mart}_daily`) => read(`analytics/sql/ddl/mart_${mart}_daily.sql`)
  .match(new RegExp(`CREATE TABLE IF NOT EXISTS \`%s\\.%s\\.${table}\` \\(([\\s\\S]+?)\\n\\)`))[1];

for (const mart of marts) {
  test(`${mart}: compute first, replace within one transaction, propagate failure`, () => {
    const sql = source(mart);
    const begin = sql.indexOf("BEGIN TRANSACTION;");
    const commit = sql.indexOf("COMMIT TRANSACTION;");
    assert.equal(sql.match(/DELETE FROM/g).length, published[mart].length);
    assert.equal(sql.match(/BEGIN TRANSACTION;/g).length, 1);
    assert.match(sql.slice(commit), /EXCEPTION WHEN ERROR THEN\s+ROLLBACK TRANSACTION;\s+RAISE;\s+END;/);
    for (const table of published[mart]) {
      const stage = sql.indexOf(`CREATE TEMP TABLE ${table.replace(/^mart_/, "refreshed_")} AS`);
      const deletion = sql.indexOf(`DELETE FROM \`%s.%s.${table}\``);
      const insertion = sql.indexOf(`INSERT INTO \`%s.%s.${table}\``);
      assert.ok(stage > 0 && stage < begin && begin < deletion &&
        deletion < insertion && insertion < commit, table);
      assert.match(sql.slice(deletion, insertion), /WHERE date BETWEEN @refresh_start AND @refresh_end/);
      const insert = sql.slice(insertion, commit);
      const projection = insert.match(/` \(([\s\S]+?)\)\s+SELECT\s+([\s\S]+?)\s+FROM refreshed_/);
      const list = (text) => text.split(",").map((value) => value.trim());
      assert.deepEqual(list(projection[1]), list(projection[2]), table);
      assert.deepEqual(list(projection[1]), columns(mart, table).trim().split(/,\n/)
        .map((column) => column.trim().split(/\s+/)[0]), table);
    }
  });
}

test("host: one organizerId function owns event/review projection and filtering", () => {
  const sql = source("host_event");
  const helper = sql.match(/CREATE TEMP FUNCTION organizer_id_of\(data STRING\) AS \(([\s\S]+?)\n\);/)[1];
  assert.equal(helper.trim(), "NULLIF(JSON_VALUE(data, '$.organizerId'), '')");
  assert.equal(sql.match(/organizer_id_of\(data\) AS organizer_id/g).length, 2);
  assert.equal(sql.match(/WHERE organizer_id_of\(data\) IS NOT NULL/g).length, 2);
  assert.match(sql, /WHERE key = 'organizer_id'/);
  assert.doesNotMatch(sql, /review_target_id/);
  const dimension = sql.match(/organizers AS \(([\s\S]+?)\n\),\nevents AS/)[1];
  assert.match(dimension, /^\s+SELECT\s+document_id AS organizer_id,\s+JSON_VALUE\(data, '\$\.name'\) AS organizer_name\s+FROM `%s\.%s\.organizers_raw_latest`$/);
});

// These fixtures execute the real SQL with only named temporary tables. They
// deliberately preserve FORMAT arguments and the SQL's dynamic statements so
// the opt-in BigQuery test checks their actual syntax and transaction behavior.
// No project dataset, source table, extension, or scheduled query is touched.
function fixture(mart, failure = null) {
  const fixtureSources = {
    organizers_raw_latest: "document_id STRING, data STRING",
    events_raw_latest: "document_id STRING, data STRING",
    event_participations_raw_latest: "data STRING",
    event_invite_links_raw_latest: "data STRING",
    payments_raw_latest: "data STRING",
    reviews_raw_latest: "data STRING",
    saved_events_raw_latest: "data STRING",
    event_success_scorecards_raw_latest: "document_id STRING, data STRING",
    participant_signal_facts_raw_latest: "data STRING",
    host_analytics_events: "event_date DATE, organizer_id STRING, target_event_id STRING, event_name STRING, analytics_event_id STRING, source STRING, link_id STRING, traffic_source STRING",
    user_profile_exposure_events: "event_date DATE, subject_uid STRING, viewer_uid STRING, event_id STRING, photo_id STRING, event_name STRING, dwell_ms INT64",
    "events_*": "_TABLE_SUFFIX STRING, event_date STRING, event_name STRING, user_id STRING, user_pseudo_id STRING, event_timestamp INT64, event_params ARRAY<STRUCT<key STRING, value STRUCT<string_value STRING, int_value INT64, float_value FLOAT64, double_value FLOAT64>>>",
  };
  let sql = source(mart);
  // Both metadata probes resolve true against the temporary GA4 input below.
  sql = sql.replace(/SELECT COUNT\(\*\) > 0\nFROM `%s.region-asia-south1.INFORMATION_SCHEMA.SCHEMATA`\nWHERE schema_name = @ga4_dataset/,
    "SELECT TRUE /* %s */");
  sql = sql.replace(/SELECT COUNT\(\*\) > 0\n  FROM `%s.%s.INFORMATION_SCHEMA.TABLES`\n  WHERE STARTS_WITH\(table_name, 'events_'\)/,
    "SELECT TRUE /* %s.%s */");
  const touched = new Set();
  sql = sql.replace(/`%s\.%s\.([^`]+)`/g, (_, name) => {
    assert.ok(published[mart].includes(name) || Object.hasOwn(fixtureSources, name), name);
    touched.add(name);
    return `fixture_${name.replace("*", "ga4")} /* %s.%s */`;
  });
  const table = `fixture_mart_${mart}_daily`;
  const identity = mart === "host_event" ? "organizer_id" : "uid";
  const seed = ["DECLARE caught BOOL DEFAULT FALSE;", "DECLARE caught_message STRING;"];
  for (const name of touched) {
    seed.push(`CREATE TEMP TABLE fixture_${name.replace("*", "ga4")} (${published[mart].includes(name) ? columns(mart, name) : fixtureSources[name]});`);
  }
  seed.push(`INSERT INTO ${table} (date, ${identity}, refreshed_at) VALUES
    (DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 500 DAY), 'history', CURRENT_TIMESTAMP()),
    (CURRENT_DATE('Asia/Kolkata'), 'previous', CURRENT_TIMESTAMP());`);
  if (mart === "host_event") {
    seed.push(`INSERT INTO fixture_mart_host_link_daily (date, organizer_id, link_id, traffic_source, link_clicks, refreshed_at) VALUES
    (DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 500 DAY), 'history', 'link', 'direct', 1, CURRENT_TIMESTAMP()),
    (CURRENT_DATE('Asia/Kolkata'), 'previous', 'link', 'direct', 1, CURRENT_TIMESTAMP());`);
  }
  if (mart === "host_event") {
    // A named, an unnamed and an absent organizer; an empty or missing
    // organizerId names none.
    const records = [
      {id: "canonical", organizerId: "canonical"},
      {id: "unnamed", organizerId: "unnamed"},
      {id: "orphan", organizerId: "orphan"},
      {id: "empty", organizerId: ""},
      {id: "missing"},
    ];
    for (const row of records) {
      const data = JSON.stringify(row).replaceAll("'", "''");
      seed.push(`INSERT INTO fixture_events_raw_latest VALUES ('${row.id}',
        JSON_SET(JSON '${data}', '$.startTime._seconds', UNIX_SECONDS(CURRENT_TIMESTAMP()), '$.bookedCount', 2).to_json_string());`);
      seed.push(`INSERT INTO fixture_reviews_raw_latest VALUES (
        JSON_SET(JSON '${data}', '$.createdAt._seconds', UNIX_SECONDS(CURRENT_TIMESTAMP()), '$.rating', 4).to_json_string());`);
    }
    seed.push(`INSERT INTO fixture_organizers_raw_latest VALUES
      ('canonical', '{"name":"Canonical name"}'),
      ('unnamed', '{"name":null}');`);
    // GA4 listing views, which must never reach the first-party counters.
    for (const organizerId of ["canonical", "orphan"]) {
      seed.push(`INSERT INTO fixture_events_ga4 (_TABLE_SUFFIX, event_date, event_name, event_params)
        VALUES (FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Kolkata')), FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Kolkata')), 'organizer_listingView', [STRUCT('organizer_id' AS key, STRUCT('${organizerId}' AS string_value, CAST(NULL AS INT64) AS int_value, CAST(NULL AS FLOAT64) AS float_value, CAST(NULL AS FLOAT64) AS double_value) AS value)]);`);
    }
    // One listing view, then link clicks: a repeated delivery, an unlisted
    // traffic source, and a click without a link that the roll-up must drop.
    seed.push(`INSERT INTO fixture_host_analytics_events (event_date, organizer_id, target_event_id, event_name, analytics_event_id, link_id, traffic_source) VALUES
      (CURRENT_DATE('Asia/Kolkata'), 'canonical', NULL, 'listingView', 'view', NULL, NULL),
      (CURRENT_DATE('Asia/Kolkata'), 'canonical', NULL, 'linkClick', 'click-1', 'tickets', 'instagram'),
      (CURRENT_DATE('Asia/Kolkata'), 'canonical', NULL, 'linkClick', 'click-1', 'tickets', 'instagram'),
      (CURRENT_DATE('Asia/Kolkata'), 'canonical', NULL, 'linkClick', 'click-2', 'tickets', 'tiktok'),
      (CURRENT_DATE('Asia/Kolkata'), 'canonical', NULL, 'linkClick', 'click-3', NULL, 'direct');`);
  } else {
    seed.push(`INSERT INTO fixture_event_participations_raw_latest VALUES (
      JSON_SET(JSON '{"uid":"member","status":"signedUp"}', '$.signedUpAt._seconds', UNIX_SECONDS(CURRENT_TIMESTAMP())).to_json_string());`);
  }
  if (failure === "insert") {
    sql = sql.replace(`FROM refreshed_${mart}_daily\n`, `FROM refreshed_${mart}_daily\nWHERE ERROR('fixture insert failure')\n`);
  } else if (failure === "compute") {
    sql = sql.replace("WHERE date BETWEEN @refresh_start AND @refresh_end\n\"\"\",", "WHERE ERROR('fixture compute failure')\n\"\"\",");
    if (mart === "host_event") {
      sql = sql.replace("WHERE u.date BETWEEN @refresh_start AND @refresh_end", "WHERE ERROR('fixture compute failure')");
    }
  }
  seed.push(`BEGIN\n${sql}\nEXCEPTION WHEN ERROR THEN\n  SET caught = TRUE;\n  SET caught_message = @@error.message;\nEND;`);
  if (failure) {
    seed.push(`IF STRPOS(caught_message, 'fixture ${failure} failure') = 0 THEN RAISE USING MESSAGE = caught_message; END IF;`);
  } else {
    seed.push("IF caught THEN RAISE USING MESSAGE = caught_message; END IF;");
  }
  seed.push(`ASSERT caught = ${failure !== null ? "TRUE" : "FALSE"} AS 'unexpected refresh outcome';`);
  seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE ${identity} = 'history') = 1 AS 'history must survive';`);
  seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE ${identity} = 'previous') = ${failure ? 1 : 0} AS 'old window must survive a failure only';`);
  if (mart === "host_event") {
    const links = "fixture_mart_host_link_daily";
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE organizer_id = 'history') = 1 AS 'link history must survive';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE organizer_id = 'previous') = ${failure ? 1 : 0} AS 'old link window must survive a failure only';`);
    if (!failure) {
      seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE organizer_id = 'canonical') = 2 AS 'one row per link and traffic source';`);
      seed.push(`ASSERT (SELECT SUM(link_clicks) FROM ${links} WHERE organizer_id = 'canonical' AND link_id = 'tickets' AND traffic_source IN ('instagram', 'other')) = 2 AS 'deduplicated clicks with unlisted sources as other';`);
    }
  }
  if (!failure && mart === "host_event") {
    seed.push(`ASSERT (SELECT COUNT(DISTINCT organizer_id) FROM ${table} WHERE organizer_id != 'history') = 3 AS 'only organizerId names an organizer';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE organizer_id = '') = 0 AS 'empty organizer ids excluded';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM (SELECT organizer_id FROM ${table} WHERE organizer_id != 'history' GROUP BY organizer_id HAVING SUM(booked_count) = 2 AND SUM(review_count) = 1 AND SUM(listing_views) = IF(organizer_id = 'canonical', 1, 0))) = 3 AS 'metrics, deduplicated direct views, no GA4 counts';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE organizer_id != 'history') = 6 AS 'one row per organizer event date grain';`);
    seed.push(`ASSERT (SELECT COUNTIF(organizer_name = 'Canonical name') FROM ${table} WHERE organizer_id = 'canonical') = 2 AS 'dimension name';`);
    seed.push(`ASSERT (SELECT COUNTIF(organizer_name IS NULL) FROM ${table} WHERE organizer_id IN ('unnamed', 'orphan')) = 4 AS 'null and missing names preserve rows';`);
  } else if (!failure) {
    seed.push(`ASSERT (SELECT SUM(events_booked_count) FROM ${table} WHERE uid = 'member') = 1 AS 'user metrics preserved';`);
  }
  seed.push(`SELECT '${mart}:${failure ?? "success"}' AS fixture_passed;`);
  const rendered = seed.join("\n").replaceAll("_TABLE_SUFFIX", "fixture_table_suffix");
  assert.doesNotMatch(rendered, /`|INFORMATION_SCHEMA/);
  return rendered;
}

for (const mart of marts) {
  for (const failure of [null, "compute", "insert"]) {
    test(`${mart}: isolated ${failure ?? "success"} fixture has no durable table references`, () => {
      assert.match(fixture(mart, failure), /CREATE TEMP TABLE fixture_/);
    });
    test(`${mart}: BigQuery ${failure ?? "success"}`, {
      skip: !process.env.CATCH_ANALYTICS_BQ_TEST_PROJECT,
    }, () => {
      // BigQuery's minimum billing per table exceeds these tiny fixtures'
      // physical bytes.
      const maximumBytes = 268435456;
      const result = spawnSync("bq", [
        `--project_id=${process.env.CATCH_ANALYTICS_BQ_TEST_PROJECT}`,
        "--location=asia-south1", "--format=json", "--quiet", "query",
        "--use_legacy_sql=false", `--maximum_bytes_billed=${maximumBytes}`,
      ], {input: fixture(mart, failure), encoding: "utf8", timeout: 120000});
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /fixture_passed/);
    });
  }
}
