import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {parseCommonArgs, parseRecomputeArgs} from "./cli_args.mjs";

test("common arguments preserve command fields while accepting standard option syntax", () => {
  assert.deepEqual(
    parseCommonArgs([
      "--env=dev",
      "--project", "catch-dev",
      "--apply",
      "--allow-prod",
      "--confirm-prod",
      "--json",
      "--check",
      "--import-plan=plans/import.json",
      "task-id",
    ], {
      booleanFlags: ["--check"],
      valueFlags: ["--import-plan"],
    }),
    {
      env: "dev",
      project: "catch-dev",
      emulatorHost: null,
      apply: true,
      allowProd: true,
      confirmProd: true,
      json: true,
      help: false,
      positionals: ["task-id"],
      check: true,
      import_plan: "plans/import.json",
    },
  );
});

test("common arguments retain repeat and emulator precedence in token order", () => {
  assert.equal(
    parseCommonArgs(["--emulator-host", "custom:9000", "--emulator"]).emulatorHost,
    "127.0.0.1:8080",
  );
  assert.equal(
    parseCommonArgs(["--emulator", "--emulator-host=custom:9000"]).emulatorHost,
    "custom:9000",
  );
  assert.equal(
    parseCommonArgs(["--env", "staging", "--env=prod"]).env,
    "prod",
  );
  assert.equal(parseCommonArgs(["-h"]).help, true);
});

test("common arguments can project strict command-specific flags as camel case", () => {
  const parsed = parseCommonArgs([
    "--allow-empty",
    "--summary-only",
    "--source-label=fixture",
  ], {
    booleanFlags: ["--allow-empty", "--summary-only"],
    valueFlags: ["--source-label"],
    allowPositionals: false,
    customFieldCase: "camel",
  });

  assert.equal(parsed.allowEmpty, true);
  assert.equal(parsed.summaryOnly, true);
  assert.equal(parsed.sourceLabel, "fixture");
  assert.throws(
    () => parseCommonArgs(["unexpected"], {allowPositionals: false}),
    /Unexpected argument 'unexpected'/u,
  );
});

test("common arguments fail closed on malformed option input and declarations", () => {
  assert.throws(
    () => parseCommonArgs(["--unknown"]),
    /Unknown option '--unknown'/u,
  );
  assert.throws(
    () => parseCommonArgs(["--env", "--json"]),
    /argument is ambiguous/u,
  );
  assert.throws(
    () => parseCommonArgs([], {booleanFlags: ["-q"]}),
    /must be a long flag/u,
  );
  assert.throws(
    () => parseCommonArgs([], {customFieldCase: "pascal"}),
    /Unsupported custom CLI field case/u,
  );
});

test("the eight common migration commands retain the shared parser", () => {
  for (const path of [
    "tool/firebase/create_config_cities.mjs",
    "tool/data/backfill_location_market_fields.mjs",
    "tool/data/backfill_event_meeting_locations.mjs",
    "tool/data/migrate_clubs_to_organizers.mjs",
    "tool/data/backfill_event_admin_search.mjs",
    "tool/data/backfill_event_discovery_fields.mjs",
    "tool/data/backfill_organizer_admin_search.mjs",
    "tool/data/recompute_public_profiles.mjs",
  ]) {
    assert.match(
      fs.readFileSync(path, "utf8"),
      /parseCommonArgs.*cli_args\.mjs|cli_args\.mjs.*parseCommonArgs/su,
      path,
    );
  }
});

test("recompute arguments preserve the six legacy fields and literal values", () => {
  const empty = {env: null, project: null, emulatorHost: null,
    apply: false, json: false, help: false};
  assert.deepEqual(parseRecomputeArgs([]), empty);
  for (const flag of ["--env", "--project", "--emulator-host"]) {
    const field = {"--env": "env", "--project": "project", "--emulator-host": "emulatorHost"}[flag];
    for (const value of ["-h", "-x", "-", "a=b", "  ", "项目"]) {
      assert.deepEqual(parseRecomputeArgs([flag, value]), {...empty, [field]: value});
    }
    assert.equal(parseRecomputeArgs([flag, "first", flag, "last"])[field], "last");
  }
  assert.deepEqual(parseRecomputeArgs(["--apply", "--json", "-h", "--help"]),
    {...empty, apply: true, json: true, help: true});
  assert.equal(parseRecomputeArgs(["--emulator-host", "custom", "--emulator"]).emulatorHost,
    "127.0.0.1:8080");
  assert.equal(parseRecomputeArgs(["--emulator", "--emulator-host", "custom"]).emulatorHost,
    "custom");
});

test("recompute arguments reject broader common syntax with legacy errors", () => {
  for (const arg of ["--allow-prod", "--confirm-prod", "--env=dev", "--project=x",
    "--emulator-host=x", "--apply=true", "--json=false", "--", "-hh", "value", "--unknown"]) {
    for (const prefix of [[], ["--help"]]) {
      assert.throws(() => parseRecomputeArgs([...prefix, arg]),
        {message: `Unknown argument: ${arg}`});
    }
  }
  for (const flag of ["--env", "--project", "--emulator-host"]) {
    for (const tail of [[], [""], ["--apply"], ["--"]]) {
      assert.throws(() => parseRecomputeArgs([flag, ...tail]),
        {message: `${flag} requires a value.`});
    }
  }
  // Narrowing the adapter must not narrow existing common-parser consumers.
  assert.equal(parseCommonArgs(["--project=x", "--allow-prod", "-hh"]).allowProd, true);
});

test("all four recompute commands use the shared bounded parser", () => {
  for (const name of ["organizer_host_profiles", "organizer_member_counts",
    "event_aggregate_counts", "review_author_profiles"]) {
    const source = fs.readFileSync(`tool/data/recompute_${name}.mjs`, "utf8");
    assert.match(source, /import \{isMain, parseRecomputeArgs\} from "\.\.\/lib\/cli_args\.mjs"/u);
    assert.match(source, /const args = parseRecomputeArgs\(argv\)/u);
    assert.doesNotMatch(source, /function (?:parseArgs|requireValue)\(/u);
  }
});
