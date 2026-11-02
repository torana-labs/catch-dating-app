import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {materializeInventories, materializeCiInventories, verifyMaterializedInventories} from "./generated_inventories.mjs";
import {buildInventory} from "../ui_capture/check_route_inventory.mjs";
import {catalogStart, catalogEnd, runCatalog} from "../design/generate_widget_catalog.mjs";

const routePath = "tool/ui_capture/route_inventory.json";
const catalogPath = "docs/widget_catalog.md";
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ci-inventories-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: root, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  write("lib/routing/route_contract.dart", "enum Routes {\n  home('/'),\n  ;\n}\n");
  write("lib/routing/go_router.dart", "GoRouter router() { return GoRouter(routes: [GoRoute(path: Routes.home.path, name: Routes.home.name, builder: (_) => const HomeScreen())]); }\n");
  write("apps/host/lib/feature.dart", "/// Host-only feature.\nclass HostScreen extends StatelessWidget {}\nvoid open() { MaterialPageRoute(builder: (_) => const HostScreen()); }\n");
  write("lib/home.dart", "/// Home contract.\nclass HomeScreen extends StatelessWidget {}\n");
  write("apps/consumer/lib/entry.dart", "// Consumer root.\n");
  write("packages/catch_ui/lib/entry.dart", "// Shared root.\n");
  write("design/components/catch.components.json", JSON.stringify({components: []}));
  write("authored-coverage.json", JSON.stringify({home: "explicitly planned"}));
  write("test/goldens/home.png", "real regression baseline bytes are outside this operation");
  write(routePath, "stale route inventory\n");
  write(catalogPath, `# Authored decisions\nKeep café and CRLF here.\r\n${catalogStart}\nStale rows\n${catalogEnd}\n## Authored footer\nKeep exactly.\n`);
  git("init", "-q");
  const commit = () => {
    git("add", ".");
    git("-c", "user.name=Inventory Test", "-c", "user.email=inventory@example.invalid", "commit", "-qm", "fixture");
    return git("rev-parse", "HEAD");
  };
  return {root, write, git, commit, sourceSha: commit(), read: file => fs.readFileSync(path.join(root, file), "utf8")};
}

test("actual generators replace stale outputs while preserving authored guidance, decisions and goldens", t => {
  const f = fixture(t);
  const catalog = f.read(catalogPath);
  const coverage = f.read("authored-coverage.json");
  const golden = f.read("test/goldens/home.png");
  assert.throws(() => runCatalog({repoRoot: f.root}), /stale or hand-edited/u);
  const result = materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha});
  assert.equal(result.routes, 1);
  assert.equal(result.widgets, 2);
  assert.deepEqual(result.files.map(file => file.changed), [true, true]);
  assert.deepEqual(JSON.parse(f.read(routePath)), buildInventory({repoRoot: f.root}));
  assert.equal(JSON.parse(f.read(routePath)).imperativePageRoutes[0].sourcePath, "apps/host/lib/feature.dart");
  assert.deepEqual(runCatalog({repoRoot: f.root}), {count: 2, changed: false});
  assert.equal(f.read(catalogPath).split(catalogStart)[0], catalog.split(catalogStart)[0]);
  assert.equal(f.read(catalogPath).split(catalogEnd)[1], catalog.split(catalogEnd)[1]);
  assert.equal(f.read("authored-coverage.json"), coverage);
  assert.equal(f.read("test/goldens/home.png"), golden);
  assert.deepEqual(materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}).files.map(file => file.changed), [false, false]);
});

test("wrong or mutable source identity and dirty authored inputs fail before either output changes", t => {
  const f = fixture(t);
  const originals = [f.read(routePath), f.read(catalogPath)];
  for (const sourceSha of ["main", "a".repeat(40), `${f.sourceSha}\n`]) {
    assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}));
  }
  f.write("lib/home.dart", "class ChangedScreen extends StatelessWidget {}\n");
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}), /Authored inventory inputs/);
  assert.deepEqual([f.read(routePath), f.read(catalogPath)], originals);
});

test("untracked production source cannot silently enter an exact-source inventory", t => {
  const f = fixture(t);
  f.write("lib/untracked.dart", "class UntrackedScreen extends StatelessWidget {}\n");
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}), /Untracked source/);
  assert.equal(f.read(routePath), "stale route inventory\n");
});

test("ignored untracked Dart and index flags cannot hide inputs from the exact source binding", t => {
  const f = fixture(t);
  f.write(".gitignore", "lib/ignored.dart\n");
  const sourceSha = f.commit();
  f.write("lib/ignored.dart", "class IgnoredScreen extends StatelessWidget {}\n");
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /Ignored untracked Dart/);
  fs.unlinkSync(path.join(f.root, "lib/ignored.dart"));
  f.git("update-index", "--assume-unchanged", "lib/home.dart");
  f.write("lib/home.dart", "class HiddenScreen extends StatelessWidget {}\n");
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /assume-unchanged/);
  assert.equal(f.read(routePath), "stale route inventory\n");
});

test("partial sparse checkout fails even when every production root still exists", t => {
  const f = fixture(t);
  f.git("sparse-checkout", "init", "--no-cone");
  f.git("sparse-checkout", "set", "--no-cone", "/*", "!/lib/home.dart");
  assert.ok(fs.existsSync(path.join(f.root, "lib/routing/go_router.dart")));
  assert.ok(!fs.existsSync(path.join(f.root, "lib/home.dart")));
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}), /skip-worktree/);
  assert.equal(f.read(routePath), "stale route inventory\n");
});

test("edited catalog prose and sparse source roots cannot be mistaken for derived drift", t => {
  const f = fixture(t);
  f.write(catalogPath, f.read(catalogPath).replace("Authored decisions", "Changed policy"));
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}), /Authored catalog guidance/);
  fs.rmSync(path.join(f.root, "apps/consumer/lib"), {recursive: true});
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha: f.sourceSha}), /full source checkout/);
  assert.equal(f.read(routePath), "stale route inventory\n");
});

test("a newly generated route still fails the actual authored capture coverage gate", t => {
  const f = fixture(t);
  for (const file of ["tool/ui_capture/check_capture_coverage.mjs", "tool/lib/repo_paths.mjs"]) {
    f.write(file, fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));
  }
  const decisions = JSON.stringify({routes: [{routeId: "home", status: "planned", priority: "P1", reason: "Explicit authored decision"}]});
  f.write("tool/ui_capture/capture_coverage.json", decisions);
  f.write("test/ui_captures/catalog/screen_capture_catalog.dart", "// No captured routes yet.\n");
  f.write("tool/marketing/capture_manifest.json", JSON.stringify({captures: []}));
  let sourceSha = f.commit();
  materializeInventories({repoRoot: f.root, sourceSha});
  const check = () => spawnSync(process.execPath, ["tool/ui_capture/check_capture_coverage.mjs", "--check"], {cwd: f.root, encoding: "utf8"});
  const before = check();
  assert.equal(before.status, 0, before.stderr);
  f.write("lib/routing/route_contract.dart", "enum Routes {\n  home('/'),\n  detail('/detail'),\n  ;\n}\n");
  f.write("lib/routing/go_router.dart", "GoRouter router() { return GoRouter(routes: [GoRoute(path: Routes.home.path, name: Routes.home.name, builder: (_) => const HomeScreen()), GoRoute(path: Routes.detail.path, name: Routes.detail.name, builder: (_) => const DetailScreen())]); }\n");
  sourceSha = f.commit();
  materializeInventories({repoRoot: f.root, sourceSha});
  assert.deepEqual(JSON.parse(f.read(routePath)).routes.map(route => route.id), ["home", "detail"]);
  assert.equal(f.read("tool/ui_capture/capture_coverage.json"), decisions);
  const after = check();
  assert.equal(after.status, 1);
  assert.match(after.stderr, /detail: missing capture coverage entry/u);
});

test("invalid authored widget identity prevents both writes even after route derivation succeeds", t => {
  const f = fixture(t);
  f.write("packages/catch_ui/lib/src/components/catch_menu.dart", "class CatchMenu extends StatelessWidget {}\n");
  const sourceSha = f.commit();
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /no component-registry identity/);
  assert.equal(f.read(routePath), "stale route inventory\n");
  assert.match(f.read(catalogPath), /Stale rows/u);
});

test("invalid route ownership and malformed catalog boundaries cannot partially materialize", t => {
  const f = fixture(t);
  f.write("lib/routing/go_router.dart", "GoRouter router() { return GoRouter(routes: []); }\n");
  let sourceSha = f.commit();
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /not wired/);
  assert.equal(f.read(routePath), "stale route inventory\n");
  f.write("lib/routing/go_router.dart", "GoRouter router() { return GoRouter(routes: [GoRoute(path: '/', name: Routes.home.name, builder: (_) => const HomeScreen())]); }\n");
  f.write(catalogPath, `${catalogStart}\n${catalogEnd}\n${catalogStart}`);
  sourceSha = f.commit();
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /exactly one/);
  assert.equal(f.read(routePath), "stale route inventory\n");
});

test("symlink destinations are rejected without modifying their targets", t => {
  const f = fixture(t);
  const target = path.join(f.root, "authored-coverage.json");
  const before = fs.readFileSync(target);
  fs.unlinkSync(path.join(f.root, routePath));
  fs.symlinkSync(target, path.join(f.root, routePath));
  const sourceSha = f.commit();
  assert.throws(() => materializeInventories({repoRoot: f.root, sourceSha}), /symlink/);
  assert.deepEqual(fs.readFileSync(target), before);
});

const receiptPath = "build/ci/generated-inventories.json";
function ciFixture(t) {
  const f = fixture(t);
  f.write(".gitignore", "build/\n.dart_tool/\ntool/widget_dedupe/pubspec.lock\nlib/ignored.dart\n");
  const captures = Array.from({length: 12}, (_, index) => ({id: `capture-${index}`, fixtureKey: `fixture${index}`,
    status: "active", device: "iphone-17-pro", sourcePath: `artifacts/marketing/app-screenshots/capture-${index}.png`,
    websitePath: `website/public/assets/app-screenshots/capture-${index}.png`}));
  f.write("tool/marketing/capture_manifest.json", JSON.stringify({captures}));
  for (const c of captures) for (const file of [c.sourcePath, c.websitePath]) f.write(file, "committed capture");
  f.write("tool/marketing/app_screenshots_design_context.json", "{}\n");
  f.write("website/public/assets/app-screenshots/manifest.json", "{}\n");
  f.sourceSha = f.commit();
  const env = {GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: "owner/repo",
    GITHUB_WORKFLOW_REF: "owner/repo/.github/workflows/ci.yml@refs/heads/main",
    GITHUB_WORKFLOW_SHA: f.sourceSha, GITHUB_SHA: f.sourceSha, GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1"};
  return {...f, env, captures,
    materialize: () => materializeCiInventories({repoRoot: f.root, sourceSha: f.sourceSha, env}),
    verify: () => verifyMaterializedInventories({repoRoot: f.root, env})};
}

function editReceipt(f, edit) {
  const receipt = JSON.parse(f.read(receiptPath));
  edit(receipt);
  f.write(receiptPath, JSON.stringify(receipt));
}

test("CI materialization persists exact two-output proof and later bootstrap/media bytes do not become inventory authority", t => {
  const f = ciFixture(t);
  const receipt = f.materialize();
  assert.deepEqual(f.verify(), receipt);
  for (const c of f.captures) for (const file of [c.sourcePath, c.websitePath]) f.write(file, "separately verified imported media");
  f.write("tool/marketing/app_screenshots_design_context.json", "{\"imported\":true}\n");
  f.write("website/public/assets/app-screenshots/manifest.json", "{\"imported\":true}\n");
  f.write("tool/widget_dedupe/.dart_tool/package_config.json", "{}\n");
  f.write("tool/widget_dedupe/pubspec.lock", "bootstrap lock\n");
  assert.deepEqual(f.verify(), receipt);
  // Permission to verify after import never weakens the strict generation path.
  assert.throws(() => f.materialize(), /Authored inventory inputs/);
  assert.ok(!fs.existsSync(path.join(f.root, receiptPath)), "failed generation must not leave old valid proof");
});

test("inventory proof rejects every changed current CI identity and absent CI context", t => {
  const f = ciFixture(t);
  f.materialize();
  for (const key of ["GITHUB_REPOSITORY", "GITHUB_WORKFLOW_REF", "GITHUB_WORKFLOW_SHA", "GITHUB_SHA", "GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT"]) {
    const changed = {...f.env, [key]: key.endsWith("SHA") ? "a".repeat(40) : `${f.env[key]}2`};
    assert.throws(() => verifyMaterializedInventories({repoRoot: f.root, env: changed}), undefined, key);
  }
  assert.throws(() => verifyMaterializedInventories({repoRoot: f.root, env: {...f.env, GITHUB_ACTIONS: "false"}}), /GitHub Actions/);
});

test("receipt exact schema rejects incomplete, duplicate, foreign and malformed proof", t => {
  const f = ciFixture(t);
  const original = f.materialize();
  const mutations = [r => {r.version = 2;}, r => {r.extra = true;}, r => {delete r.binding;},
    r => {r.binding.extra = true;}, r => {r.sourceTree = "0".repeat(40);},
    r => {r.sourceSha = "0".repeat(40);}, r => {r.routes = -1;}, r => {r.widgets = "2";},
    r => {r.files.pop();}, r => {r.files[1] = r.files[0];}, r => {r.files.reverse();},
    r => {r.files[0].path = "../../outside";}, r => {r.files[0].sha256 = "0".repeat(64);},
    r => {r.files[0].changed = "true";}, r => {r.files[0].extra = "unchecked";}];
  for (const mutate of mutations) {
    f.write(receiptPath, JSON.stringify(original));
    editReceipt(f, mutate);
    assert.throws(f.verify);
  }
  f.write(receiptPath, "not JSON");
  assert.throws(f.verify);
  fs.unlinkSync(path.join(f.root, receiptPath));
  assert.throws(f.verify);
});

test("changed or missing inventory outputs fail even while their source and receipt match", t => {
  const f = ciFixture(t);
  f.materialize();
  for (const file of [routePath, catalogPath]) {
    const before = f.read(file);
    f.write(file, file === catalogPath ? before.replace("Home contract.", "Forged inventory row") : "{}\n");
    assert.throws(f.verify, /bytes changed/);
    f.write(file, before);
    fs.unlinkSync(path.join(f.root, file));
    assert.throws(f.verify);
    f.write(file, before);
  }
  assert.ok(f.verify());
});

test("authored guidance and real source cannot be blessed by changing receipt hashes", t => {
  const f = ciFixture(t);
  f.materialize();
  f.write(catalogPath, f.read(catalogPath).replace("Authored decisions", "Changed policy"));
  editReceipt(f, receipt => {receipt.files[1].sha256 = crypto.createHash("sha256").update(f.read(catalogPath)).digest("hex");});
  assert.throws(f.verify, /Authored catalog guidance/);
  const g = ciFixture(t);
  g.materialize();
  g.write("lib/home.dart", "class MutatedScreen extends StatelessWidget {}\n");
  assert.throws(g.verify, /Authored inventory inputs/);
  g.git("add", "lib/home.dart");
  assert.throws(g.verify, /Authored inventory inputs/);
});

test("late proof rejects hidden index flags, added source, ignored production Dart and arbitrary tracked changes", t => {
  const f = ciFixture(t);
  f.materialize();
  f.write("lib/ignored.dart", "class HiddenScreen extends StatelessWidget {}\n");
  assert.throws(f.verify, /Ignored untracked Dart/);
  fs.unlinkSync(path.join(f.root, "lib/ignored.dart"));
  f.write("lib/new.dart", "class NewScreen extends StatelessWidget {}\n");
  assert.throws(f.verify, /Untracked source/);
  fs.unlinkSync(path.join(f.root, "lib/new.dart"));
  f.git("update-index", "--assume-unchanged", "lib/home.dart");
  assert.throws(f.verify, /assume-unchanged/);
  f.git("update-index", "--no-assume-unchanged", "lib/home.dart");
  f.write("authored-coverage.json", "{\"home\":\"captured\"}\n");
  assert.throws(f.verify, /Authored inventory inputs/);
});

test("receipt, output, imported media and production-root symlinks cannot satisfy proof", t => {
  for (const file of [receiptPath, routePath, "artifacts/marketing/app-screenshots/capture-0.png"]) {
    const f = ciFixture(t);
    f.materialize();
    const destination = path.join(f.root, file);
    const bytes = fs.readFileSync(destination);
    const target = path.join(f.root, "build", `target-${path.basename(file)}`);
    fs.writeFileSync(target, bytes);
    fs.unlinkSync(destination);
    fs.symlinkSync(target, destination);
    assert.throws(f.verify, /symlink/);
    assert.deepEqual(fs.readFileSync(target), bytes);
  }
  const f = ciFixture(t);
  f.materialize();
  fs.renameSync(path.join(f.root, "lib"), path.join(f.root, "build", "lib"));
  fs.symlinkSync(path.join(f.root, "build", "lib"), path.join(f.root, "lib"));
  assert.throws(f.verify, /symlink/);
});

test("receipt destination must be ignored, untracked and regular before generation", t => {
  const f = ciFixture(t);
  f.write(receiptPath, "previous proof");
  f.git("add", "-f", receiptPath);
  assert.throws(f.materialize, /must not be tracked/);
  const g = ciFixture(t);
  g.write(".gitignore", "");
  g.sourceSha = g.commit();
  assert.throws(g.materialize, /must be ignored/);
  const h = ciFixture(t);
  h.write("build/keep", "preserve");
  fs.symlinkSync(path.join(h.root, "build"), path.join(h.root, "build", "ci"));
  assert.throws(h.materialize, /symlink/);
  assert.equal(h.read("build/keep"), "preserve");
});

test("committed semantic route errors prevent a fresh CI receipt, while coverage remains an authored gate", t => {
  const f = ciFixture(t);
  f.materialize();
  f.write("lib/routing/go_router.dart", "GoRouter router() { return GoRouter(routes: []); }\n");
  const sourceSha = f.commit();
  const env = {...f.env, GITHUB_SHA: sourceSha, GITHUB_WORKFLOW_SHA: sourceSha};
  assert.throws(() => materializeCiInventories({repoRoot: f.root, sourceSha, env}), /not wired/);
  assert.ok(!fs.existsSync(path.join(f.root, receiptPath)));
  // Existing actual coverage CLI control above proves inventory generation does
  // not bless newly added routes without their independent authored decisions.
});


test("actual CLI persists proof only in bound CI and preserves standalone generation", t => {
  const f = ciFixture(t);
  const files = ["tool/ci/generated_inventories.mjs", "tool/lib/repo_paths.mjs",
    "tool/ui_capture/check_route_inventory.mjs", "tool/marketing/export_hosted_captures.mjs",
    "tool/design/generate_widget_catalog.mjs", "tool/design/generate_widget_classification.mjs",
    "tool/design/component_concepts.mjs", "tool/design/lib/component_naming.mjs",
    "tool/design/lib/new_widget_inventory_declarations.mjs", "tool/design/lib/production_widget_roots.mjs",
    "design/components/catch.components.schema.json"];
  for (const file of files) f.write(file, fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));
  const sourceSha = f.commit();
  const env = {...process.env, ...f.env, GITHUB_SHA: sourceSha, GITHUB_WORKFLOW_SHA: sourceSha};
  const run = runtime => spawnSync(process.execPath, ["tool/ci/generated_inventories.mjs", "--source-sha", sourceSha],
    {cwd: f.root, env: runtime, encoding: "utf8"});
  const standalone = run({...env, GITHUB_ACTIONS: "false"});
  assert.equal(standalone.status, 0, standalone.stderr);
  assert.ok(!fs.existsSync(path.join(f.root, receiptPath)));
  const ci = run(env);
  assert.equal(ci.status, 0, ci.stderr);
  assert.deepEqual(JSON.parse(ci.stdout), verifyMaterializedInventories({repoRoot: f.root, env}));
  const verifyCli = () => spawnSync(process.execPath, ["tool/ci/generated_inventories.mjs", "--verify-materialized"],
    {cwd: f.root, env, encoding: "utf8"});
  const verified = verifyCli();
  assert.equal(verified.status, 0, verified.stderr);
  assert.deepEqual(JSON.parse(verified.stdout), JSON.parse(ci.stdout));
  const originalRoutes = f.read(routePath);
  f.write(routePath, "{}\n");
  const refused = verifyCli();
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Generated inventory bytes changed/);
  f.write(routePath, originalRoutes);
  const broken = run({...env, GITHUB_RUN_ATTEMPT: ""});
  assert.notEqual(broken.status, 0);
  assert.match(broken.stderr, /Invalid inventory runAttempt/);
});
