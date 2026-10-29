import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  INVENTORY_END_MARKER,
  INVENTORY_START_MARKER,
  extractDocumentedFunctionNames,
  extractFunctionExportModules,
  extractFunctionExports,
  scanFunctionReadmeInventory,
  writeFunctionReadmeInventory,
} from "./check_fn_readme_inventory.mjs";

test("extractFunctionExports reads direct and re-exported names", () => {
  const exports = extractFunctionExports(`
    export const directCallable = onCall(() => {});
    export function httpEndpoint() {}
    export {
      createEvent,
      updateEvent as updateEventCallable,
    } from "./events/mutateEvent";
  `);

  assert.deepEqual(exports, [
    "createEvent",
    "directCallable",
    "httpEndpoint",
    "updateEventCallable",
  ]);
});

test("extractDocumentedFunctionNames reads current inventory rows only", () => {
  const documented = extractDocumentedFunctionNames(
    "`retiredFunction` was removed.\n## Function inventory\n" +
    "| Function | File | Purpose |\n|---|---|---|\n" +
    "| `createEvent` / `updateEvent` | `src/events/` | active |\n" +
    "## History\n| `retiredFunction` | old | old |\n",
  );

  assert.deepEqual([...documented].sort(), ["createEvent", "updateEvent"]);
});

test("scanFunctionReadmeInventory flags exports missing from README", () => {
  const root = createFixture({
    "functions/src/index.ts": `
      export {createEvent, updateEvent} from "./events/mutateEvent";
    `,
    "functions/README.md": "## Function inventory\n| `createEvent` | `src/events/` |\n",
  });

  const result = scanFunctionReadmeInventory({root});

  assert.deepEqual(result.findings.map((finding) => finding.function), [
    "updateEvent",
  ]);
});

test("scanFunctionReadmeInventory passes documented exports", () => {
  const root = createFixture({
    "functions/src/index.ts": `
      export {createEvent, updateEvent} from "./events/mutateEvent";
    `,
    "functions/README.md": "## Function inventory\n| `createEvent` / `updateEvent` | `src/events/` |\n",
  });

  assert.deepEqual(scanFunctionReadmeInventory({root}).findings, []);
});

test("scanFunctionReadmeInventory rejects stale active rows but permits historical mentions", (t) => {
  const root = createFixture({
    "functions/src/index.ts": "export {organizerMomentSweep, dormantSweep} from './moments';\n",
    "functions/README.md": "# Functions\nThe retired `sendEventReminders` cron was replaced.\n" +
      "## Function inventory\n### Scheduled\n" +
      "| Function | File | Schedule |\n|---|---|---|\n" +
      "| `organizerMomentSweep` | `src/moments/` | Current |\n" +
      "| `dormantSweep` | `src/moments/` | Dormant pending activation |\n" +
      "| `sendEventReminders` | `src/events/` | Every 15 minutes |\n",
    "baseline.json": JSON.stringify({allowedFindings: []}),
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const readme = path.join(root, "functions/README.md");
  const check = () => {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("./check_fn_readme_inventory.mjs", import.meta.url)),
      "--root", root, "--baseline", path.join(root, "baseline.json"), "--json",
    ], {encoding: "utf8"});
    return {status: result.status, report: JSON.parse(result.stdout)};
  };
  const stale = check();
  assert.equal(stale.status, 1);
  assert.deepEqual(stale.report.findings.map(
    ({rule, function: name}) => [rule, name]),
  [["staleReadmeFunction", "sendEventReminders"]]);
  fs.writeFileSync(readme, fs.readFileSync(readme, "utf8").replace(
    /^\| `sendEventReminders`.*\n/mu, ""));
  const current = check();
  assert.equal(current.status, 0);
  assert.deepEqual(current.report.findings, []);
  assert.deepEqual(current.report.documented, ["dormantSweep", "organizerMomentSweep"]);
});

test("scanFunctionReadmeInventory ratchets baseline findings", () => {
  const root = createFixture({
    "functions/src/index.ts": `
      export {createEvent, updateEvent} from "./events/mutateEvent";
      export {deleteEvent} from "./events/deleteEvent";
    `,
    "functions/README.md": "## Function inventory\n| `createEvent` | `src/events/` |\n",
  });
  const baseline = {
    allowedFindings: [
      {rule: "missingReadmeFunction", function: "updateEvent"},
    ],
  };

  const result = scanFunctionReadmeInventory({root, baseline});

  assert.deepEqual(result.baselineFindings.map((finding) => finding.function), [
    "updateEvent",
  ]);
  assert.deepEqual(result.findings.map((finding) => finding.function), [
    "deleteEvent",
  ]);
});

test("README baseline cleanup rejects resolved, removed and reintroduced omissions through the CLI", (t) => {
  const allowance = {rule: "missingReadmeFunction", function: "createEvent"};
  const root = createFixture({
    "functions/src/index.ts": "export {createEvent} from './events';\n",
    "functions/README.md": "# Functions\n## Function inventory\n",
    "baseline.json": JSON.stringify({allowedFindings: [allowance]}),
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const readme = path.join(root, "functions/README.md");
  const baseline = path.join(root, "baseline.json");
  const index = path.join(root, "functions/src/index.ts");
  const check = (status, rules = []) => {
    const before = [readme, baseline, index].map(file => fs.readFileSync(file, "utf8"));
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("./check_fn_readme_inventory.mjs", import.meta.url)),
      "--root", root, "--baseline", baseline, "--json",
    ], {encoding: "utf8"});
    assert.equal(result.status, status, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.findings.map(finding => finding.rule), rules);
    assert.deepEqual([readme, baseline, index].map(file => fs.readFileSync(file, "utf8")), before);
    return report;
  };
  assert.equal(check(0).baselineFindings.length, 1);
  fs.writeFileSync(readme, "## Function inventory\n| `createEvent` | documented |\n");
  assert.deepEqual(check(1, ["staleBaselineAllowance"]).allFindings, []);
  fs.writeFileSync(index, "// Export was removed.\n");
  check(1, ["staleReadmeFunction", "staleBaselineAllowance"]);
  fs.writeFileSync(baseline, JSON.stringify({allowedFindings: []}));
  fs.writeFileSync(readme, "# Functions\n## Function inventory\n");
  check(0);
  fs.writeFileSync(index, "export {createEvent} from './events';\n");
  fs.writeFileSync(readme, "# Functions\n## Function inventory\n");
  check(1, ["missingReadmeFunction"]);
});

const markedReadme = (rows) => "# Functions\n## Function inventory\nIntro prose.\n\n" +
  `${INVENTORY_START_MARKER}\n### Callable\n\n| Function | File | Purpose |\n|---|---|---|\n${rows}` +
  `\nA paragraph between tables stays.\n${INVENTORY_END_MARKER}\n\n## Shared modules\n| \`notAFunction\` | x |\n`;

test("extractFunctionExportModules maps each export to its module", () => {
  const modules = extractFunctionExportModules(`
    export {createEvent,
      updateEvent as updateEventCallable} from "./events/mutateEvent";
    export const local = onCall(() => {});
  `);
  assert.deepEqual([...modules], [
    ["local", null],
    ["createEvent", "./events/mutateEvent"],
    ["updateEventCallable", "./events/mutateEvent"],
  ]);
});

test("writeFunctionReadmeInventory changes only missing and removed rows", (t) => {
  const root = createFixture({
    "functions/src/index.ts": "export {kept, shared} from './kept';\nexport {added} from './events/added';\n",
    "functions/src/events/added.ts": "export const added = 1;\n",
    "functions/README.md": markedReadme(
      "| `shared` / `retiredPartner` | `src/kept.ts` | Shared row keeps its purpose. |\n" +
      "| `retired` | `src/old.ts` | Gone. |\n" +
      "| `kept` | `src/kept.ts` | Kept as written. |\n"),
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const readme = path.join(root, "functions/README.md");

  const written = writeFunctionReadmeInventory({root});
  assert.deepEqual([written.changed, written.added, written.removed], [true, ["added"], ["retired", "retiredPartner"]]);
  const source = fs.readFileSync(readme, "utf8");
  assert.equal(source, markedReadme(
    "| `shared` | `src/kept.ts` | Shared row keeps its purpose. |\n" +
    "| `kept` | `src/kept.ts` | Kept as written. |\n").replace(`\n${INVENTORY_END_MARKER}`,
    "\n\n### Not yet described\n\n" +
    "`--write` adds each export missing from this inventory here; move its row to its section and describe it.\n\n" +
    "| Function | File | Purpose |\n|----------|------|---------|\n" +
    "| `added` | `src/events/added.ts` | Not yet described. |\n" + INVENTORY_END_MARKER));
  assert.deepEqual(scanFunctionReadmeInventory({root}).findings, []);
  assert.equal(writeFunctionReadmeInventory({root}).changed, false, "a second write is a no-op");

  // Once the export goes, its undescribed row and the empty section go too.
  fs.writeFileSync(path.join(root, "functions/src/index.ts"), "export {kept, shared} from './kept';\n");
  writeFunctionReadmeInventory({root});
  assert.equal(fs.readFileSync(readme, "utf8"), markedReadme(
    "| `shared` | `src/kept.ts` | Shared row keeps its purpose. |\n" +
    "| `kept` | `src/kept.ts` | Kept as written. |\n"));
});

test("--check fails on drift and names --write, which repairs it and leaves baseline omissions", (t) => {
  const root = createFixture({
    "functions/src/index.ts": "export {kept, added, legacy} from './kept';\n",
    "functions/README.md": markedReadme("| `kept` | `src/kept.ts` | Kept. |\n| `retired` | `src/old.ts` | Gone. |\n"),
    "baseline.json": JSON.stringify({allowedFindings: [{rule: "missingReadmeFunction", function: "legacy"}]}),
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const run = (...args) => spawnSync(process.execPath, [
    fileURLToPath(new URL("./check_fn_readme_inventory.mjs", import.meta.url)),
    "--root", root, "--baseline", path.join(root, "baseline.json"), ...args,
  ], {encoding: "utf8"});

  const drift = run("--check");
  assert.equal(drift.status, 1);
  assert.match(drift.stderr, /added: functions\/README\.md must list every exported function/);
  assert.match(drift.stderr, /retired: Current functions\/README\.md inventory row has no index\.ts export/);
  assert.match(drift.stderr, /Run `node tool\/audit\/check_fn_readme_inventory\.mjs --write`/);
  assert.equal(run().status, 1, "the default mode is --check");

  const write = run("--write");
  assert.equal(write.status, 0, write.stderr);
  assert.match(write.stdout, /1 row\(s\) added, 1 removed export\(s\) dropped/);
  const source = fs.readFileSync(path.join(root, "functions/README.md"), "utf8");
  assert.match(source, /\| `added` \| `src\/kept` \| Not yet described\. \|/);
  assert.doesNotMatch(source, /`retired`|`legacy`/);
  assert.equal(run("--check").status, 0);
});

test("--write refuses a README without inventory markers", (t) => {
  const original = "## Function inventory\n| `kept` | `src/kept.ts` |\n";
  const root = createFixture({
    "functions/src/index.ts": "export {kept, added} from './kept';\n",
    "functions/README.md": original,
  });
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("./check_fn_readme_inventory.mjs", import.meta.url)),
    "--root", root, "--baseline", path.join(root, "missing-baseline.json"), "--write",
  ], {encoding: "utf8"});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /needs the .*fn-inventory:start.* markers/);
  assert.equal(fs.readFileSync(path.join(root, "functions/README.md"), "utf8"), original);
});

function createFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-fn-readme-"));
  for (const [relativePath, source] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, source);
  }
  return root;
}
