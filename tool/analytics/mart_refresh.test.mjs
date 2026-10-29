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

test("host: one canonical-first identity function owns event/review projection and filtering", () => {
  const sql = source("host_event");
  const helper = sql.match(/CREATE TEMP FUNCTION organizer_id\(data STRING\) AS \(([\s\S]+?)\n\);/)[1];
  assert.match(helper, /COALESCE\(\s+NULLIF\(JSON_VALUE\(data, '\$\.organizerId'\), ''\),\s+NULLIF\(JSON_VALUE\(data, '\$\.clubId'\), ''\)/);
  assert.equal(sql.match(/JSON_VALUE\(data, '\$\.clubId'\)/g).length, 1);
  assert.equal(sql.match(/organizer_id\(data\) AS club_id/g).length, 2);
  assert.equal(sql.match(/WHERE organizer_id\(data\) IS NOT NULL/g).length, 2);
  assert.match(sql, /WHERE key IN \('organizer_id', 'club_id'\)/);
  assert.match(sql, /ORDER BY IF\(key = 'organizer_id', 0, 1\)/);
  assert.doesNotMatch(sql, /review_target_id/);
  const dimension = sql.match(/clubs AS \(([\s\S]+?)\n\),\nevents AS/)[1];
  assert.match(dimension, /0 AS source_priority\s+FROM `%s\.%s\.organizers_raw_latest`/);
  assert.match(dimension, /1 AS source_priority\s+FROM `%s\.%s\.clubs_raw_latest`/);
  assert.match(dimension, /QUALIFY ROW_NUMBER\(\) OVER \(\s+PARTITION BY document_id ORDER BY source_priority\s+\) = 1/);
});

// These fixtures execute the real SQL with only named temporary tables. They
// deliberately preserve FORMAT arguments and the SQL's dynamic statements so
// the opt-in BigQuery test checks their actual syntax and transaction behavior.
// No project dataset, source table, extension, or scheduled query is touched.
function fixture(mart, failure = null) {
  const fixtureSources = {
    clubs_raw_latest: "document_id STRING, data STRING",
    organizers_raw_latest: "document_id STRING, data STRING",
    events_raw_latest: "document_id STRING, data STRING",
    event_participations_raw_latest: "data STRING",
    event_invite_links_raw_latest: "data STRING",
    payments_raw_latest: "data STRING",
    reviews_raw_latest: "data STRING",
    saved_events_raw_latest: "data STRING",
    event_success_scorecards_raw_latest: "document_id STRING, data STRING",
    participant_signal_facts_raw_latest: "data STRING",
    host_analytics_events: "event_date DATE, club_id STRING, target_event_id STRING, event_name STRING, analytics_event_id STRING, source STRING, link_id STRING, traffic_source STRING",
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
  const identity = mart === "host_event" ? "club_id" : "uid";
  const seed = ["DECLARE caught BOOL DEFAULT FALSE;", "DECLARE caught_message STRING;"];
  for (const name of touched) {
    seed.push(`CREATE TEMP TABLE fixture_${name.replace("*", "ga4")} (${published[mart].includes(name) ? columns(mart, name) : fixtureSources[name]});`);
  }
  seed.push(`INSERT INTO ${table} (date, ${identity}, refreshed_at) VALUES
    (DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 500 DAY), 'history', CURRENT_TIMESTAMP()),
    (CURRENT_DATE('Asia/Kolkata'), 'previous', CURRENT_TIMESTAMP());`);
  if (mart === "host_event") {
    seed.push(`INSERT INTO fixture_mart_host_link_daily (date, club_id, link_id, traffic_source, link_clicks, refreshed_at) VALUES
    (DATE_SUB(CURRENT_DATE('Asia/Kolkata'), INTERVAL 500 DAY), 'history', 'link', 'direct', 1, CURRENT_TIMESTAMP()),
    (CURRENT_DATE('Asia/Kolkata'), 'previous', 'link', 'direct', 1, CURRENT_TIMESTAMP());`);
  }
  if (mart === "host_event") {
    const records = [
      {id: "canonical", organizerId: "canonical"},
      {id: "legacy", clubId: "legacy"},
      {id: "dual", organizerId: "dual", clubId: "wrong"},
      {id: "empty", organizerId: "", clubId: "empty"},
      {id: "orphan", organizerId: "orphan"},
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
      ('dual', '{"name":"Renamed organizer"}'),
      ('empty', '{"name":null}');`);
    seed.push(`INSERT INTO fixture_clubs_raw_latest VALUES
      ('legacy', '{"name":"Historical name"}'),
      ('dual', '{"name":"Stale name"}'),
      ('empty', '{"name":"Stale deleted name"}');`);
    // Canonical, historical, conflicting dual-ID and empty-canonical GA4 rows.
    for (const [canonical, legacy] of [["canonical", null], [null, "legacy"], ["dual", "wrong"], ["", "empty"]]) {
      const params = [["organizer_id", canonical], ["club_id", legacy]].filter(([, value]) => value !== null)
        .map(([key, value]) => `STRUCT('${key}' AS key, STRUCT('${value}' AS string_value, CAST(NULL AS INT64) AS int_value, CAST(NULL AS FLOAT64) AS float_value, CAST(NULL AS FLOAT64) AS double_value) AS value)`).join(", ");
      seed.push(`INSERT INTO fixture_events_ga4 (_TABLE_SUFFIX, event_date, event_name, event_params)
        VALUES (FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Kolkata')), FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Kolkata')), 'organizer_listingView', [${params}]);`);
    }
    // One listing view, then link clicks: a repeated delivery, an unlisted
    // traffic source, and a click without a link that the roll-up must drop.
    seed.push(`INSERT INTO fixture_host_analytics_events (event_date, club_id, target_event_id, event_name, analytics_event_id, link_id, traffic_source) VALUES
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
  if (mart === "host_event" && !failure) {
    // Execute the actual SELECT with the old name dimension too. Every metric
    // and row key must match; only names and refresh timestamps may differ.
    const start = sql.indexOf('EXECUTE IMMEDIATE FORMAT("""\nCREATE TEMP TABLE refreshed_host_event_daily');
    const end = sql.indexOf("-- Build every replacement row", start);
    const baseline = sql.slice(start, end)
      .replace("CREATE TEMP TABLE refreshed_host_event_daily", "CREATE TEMP TABLE baseline_host_event_daily")
      .replace(/clubs AS \([\s\S]+?\n\),\nevents AS/, `clubs AS (
  SELECT document_id AS club_id, JSON_VALUE(data, '$.name') AS club_name
  FROM fixture_clubs_raw_latest /* %s.%s */
  /* Preserve the second FORMAT pair: %s.%s */
),
events AS`);
    const projection = (name) => `SELECT TO_JSON_STRING((SELECT AS STRUCT r.* EXCEPT (club_name, refreshed_at))) AS value FROM ${name} r`;
    const current = projection("refreshed_host_event_daily");
    const previous = projection("baseline_host_event_daily");
    const parity = `${baseline}
ASSERT (SELECT COUNT(*) FROM refreshed_host_event_daily) = (SELECT COUNT(*) FROM baseline_host_event_daily) AS 'dimension row-count parity';
ASSERT NOT EXISTS (${current} EXCEPT DISTINCT ${previous}) AS 'no changed metric rows';
ASSERT NOT EXISTS (${previous} EXCEPT DISTINCT ${current}) AS 'no lost metric rows';
`;
    sql = sql.slice(0, end) + parity + sql.slice(end);
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
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE club_id = 'history') = 1 AS 'link history must survive';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE club_id = 'previous') = ${failure ? 1 : 0} AS 'old link window must survive a failure only';`);
    if (!failure) {
      seed.push(`ASSERT (SELECT COUNT(*) FROM ${links} WHERE club_id = 'canonical') = 2 AS 'one row per link and traffic source';`);
      seed.push(`ASSERT (SELECT SUM(link_clicks) FROM ${links} WHERE club_id = 'canonical' AND link_id = 'tickets' AND traffic_source IN ('instagram', 'other')) = 2 AS 'deduplicated clicks with unlisted sources as other';`);
    }
  }
  if (!failure && mart === "host_event") {
    seed.push(`ASSERT (SELECT COUNT(DISTINCT club_id) FROM ${table} WHERE club_id != 'history') = 5 AS 'canonical and historical identities';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE club_id IN ('wrong', 'missing')) = 0 AS 'invalid identities excluded';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM (SELECT club_id FROM ${table} WHERE club_id != 'history' GROUP BY club_id HAVING SUM(booked_count) = 2 AND SUM(review_count) = 1 AND SUM(listing_views) = IF(club_id = 'orphan', 0, 1))) = 5 AS 'metrics and direct GA4 deduplication';`);
    seed.push(`ASSERT (SELECT COUNT(*) FROM ${table} WHERE club_id != 'history') = 10 AS 'one row per organizer event date grain';`);
    for (const [id, name] of [["canonical", "Canonical name"], ["dual", "Renamed organizer"], ["legacy", "Historical name"]]) {
      seed.push(`ASSERT (SELECT COUNTIF(club_name = '${name}') FROM ${table} WHERE club_id = '${id}') = 2 AS '${id} dimension name';`);
    }
    seed.push(`ASSERT (SELECT COUNTIF(club_name IS NULL) FROM ${table} WHERE club_id IN ('empty', 'orphan')) = 4 AS 'canonical deletion and missing dimension preserve rows';`);
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
      // The host success scenario computes both dimension variants. BigQuery's
      // minimum billing per table exceeds these tiny fixtures' physical bytes.
      const maximumBytes = mart === "host_event" && !failure ? 536870912 : 268435456;
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
