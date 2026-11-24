import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {importsHelper, runRecordProblems} from "./check_run_records.mjs";

const writer = (file, surface = "remote-write") =>
  ({id: `data:${file}`, path: file, surface});
const sources = (map) => (file) => map[file] ?? null;
const USES = "import {withRunRecord} from \"./lib/run_record.mjs\";\n";

test("a new writing tool under tool/data/ must use the run-record helper",
  () => {
    const problems = runRecordProblems({
      entries: [writer("tool/data/new_backfill.mjs"),
        writer("tool/data/new_purge.mjs", "remote-destructive")],
      read: sources({"tool/data/new_backfill.mjs": "import fs from \"node:fs\";",
        "tool/data/new_purge.mjs": "// no imports"}),
      legacy: new Set(),
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /new_backfill\.mjs\) writes to Firestore/u);
  });

test("a tool that imports the helper, a reader, or a tool elsewhere passes",
  () => {
    assert.deepEqual(runRecordProblems({
      entries: [writer("tool/data/new_backfill.mjs"),
        writer("tool/data/validate.mjs", "remote-read"),
        writer("functions/scripts/backfill-x.cjs")],
      read: sources({"tool/data/new_backfill.mjs": USES}),
      legacy: new Set(),
    }), []);
  });

test("the legacy list only shrinks", () => {
  const legacy = new Set(["tool/data/old.mjs", "tool/data/gone.mjs"]);
  const problems = runRecordProblems({
    entries: [writer("tool/data/old.mjs")],
    read: sources({"tool/data/old.mjs": USES}),
    legacy,
  });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /old\.mjs uses .*remove it from LEGACY/u);
  assert.match(problems[1], /gone\.mjs is in LEGACY/u);
});

test("relative imports resolve from the tool's own folder", () => {
  assert.equal(importsHelper("tool/data/x.mjs", USES), true);
  assert.equal(importsHelper("tool/data/lib/y.mjs",
    "import {a} from './run_record.mjs';"), true);
  assert.equal(importsHelper("tool/data/x.mjs",
    "const m = await import(\"./lib/run_record.mjs\");"), true);
  assert.equal(importsHelper("tool/data/x.mjs",
    "import {a} from \"./lib/run_record_other.mjs\";"), false);
  assert.equal(importsHelper("tool/data/x.mjs",
    "// see ./lib/run_record.mjs"), false);
});

test("the repository passes: the consolidation runner records its runs", () => {
  const script = fileURLToPath(new URL("./check_run_records.mjs",
    import.meta.url));
  const out = execFileSync(process.execPath, [script], {encoding: "utf8"});
  assert.match(out, /Data tool run records/u);
});
