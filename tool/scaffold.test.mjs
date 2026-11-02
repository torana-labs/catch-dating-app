import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {after, before, describe, test} from "node:test";
import {fromRepo, repoRoot} from "./lib/repo_paths.mjs";

const scaffold = fromRepo("tool/scaffold.mjs");
const templates = fromRepo("tool/scaffold/templates");

function run(command, args, cwd = repoRoot) {
  return spawnSync(command, args, {cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
}

function scaffoldIn(cwd, ...args) {
  return run(process.execPath, [path.join(cwd, "tool/scaffold.mjs"), ...args], cwd);
}

function assertOk(result, label) {
  assert.equal(result.status, 0, `${label} failed:\n${result.stdout}\n${result.stderr}`);
}

const listedFiles = (stdout) => stdout.split("\n")
  .filter((line) => /^ {2}\S/u.test(line))
  .map((line) => line.trim());

const dryRuns = [
  {
    args: ["context", "--name", "zebras"],
    files: [
      "packages/contexts/zebras/pubspec.yaml",
      "packages/contexts/zebras/analysis_options.yaml",
      "packages/contexts/zebras/lib/zebras.dart",
      "packages/contexts/zebras/lib/src/domain/README.md",
      "packages/contexts/zebras/lib/src/data/zebras_repository.dart",
      "packages/contexts/zebras/lib/src/actions/README.md",
      "packages/contexts/zebras/lib/src/parts/README.md",
      "packages/contexts/zebras/test/fakes/fake_zebras_repository.dart",
      "packages/contexts/zebras/test/zebras_test.dart",
    ],
  },
  {
    args: ["screen", "--app", "host", "--name", "today_probe"],
    files: [
      "apps/host/lib/today_probe/today_probe_screen.dart",
      "apps/host/lib/today_probe/today_probe_body.dart",
      "apps/host/lib/today_probe/today_probe_view_model.dart",
      "apps/host/lib/today_probe/today_probe_view_model.g.dart",
      "apps/host/lib/today_probe/widgets/.gitkeep",
      "apps/host/test/today_probe/today_probe_body_test.dart",
    ],
  },
  {
    args: ["screen", "--app", "consumer", "--name", "probe", "--destination", "discover_probe"],
    files: [
      "apps/consumer/lib/discover_probe/probe_screen.dart",
      "apps/consumer/lib/discover_probe/probe_body.dart",
      "apps/consumer/lib/discover_probe/probe_view_model.dart",
      "apps/consumer/lib/discover_probe/probe_view_model.g.dart",
      "apps/consumer/lib/discover_probe/widgets/.gitkeep",
      "apps/consumer/test/discover_probe/probe_body_test.dart",
    ],
  },
  {
    args: ["screen", "--page", "page_probe"],
    files: [
      "lib/pages/page_probe/page_probe_screen.dart",
      "lib/pages/page_probe/page_probe_body.dart",
      "lib/pages/page_probe/page_probe_view_model.dart",
      "lib/pages/page_probe/page_probe_view_model.g.dart",
      "lib/pages/page_probe/widgets/.gitkeep",
      "test/pages/page_probe/page_probe_body_test.dart",
    ],
  },
  {
    args: ["component", "--name", "VenueProbeRow", "--tier", "T2"],
    files: [
      "packages/catch_ui/lib/src/components/catch_venue_probe_row.dart",
      "widgetbook/lib/primitives/contracts/venue_probe_row.dart",
      "test/core/catch_venue_probe_row_test.dart",
      "packages/catch_ui/lib/catch_ui.dart: would add export 'src/components/catch_venue_probe_row.dart';",
    ],
  },
  {
    args: ["web-component", "--name", "CatchVenueProbeRow"],
    files: [
      "packages/web-ui/src/components/CatchVenueProbeRow.tsx",
      "packages/web-ui/src/components/CatchVenueProbeRow.module.css",
      "packages/web-ui/src/components/CatchVenueProbeRow.stories.tsx",
      "packages/web-ui/src/components/CatchVenueProbeRow.test.tsx",
    ],
  },
];

describe("dry runs", () => {
  for (const {args, files} of dryRuns) {
    test(`${args.join(" ")} lists its files and writes nothing`, () => {
      const result = scaffoldIn(repoRoot, ...args, "--dry-run");
      assertOk(result, "dry run");
      const listed = listedFiles(result.stdout).filter((line) => files.includes(line));
      assert.deepEqual(listed, files);
      for (const file of files.filter((entry) => !entry.includes(": would add"))) {
        assert.equal(fs.existsSync(fromRepo(file)), false, `${file} was written`);
      }
    });
  }

  test("prints file contents", () => {
    const {stdout} = scaffoldIn(repoRoot, "screen", "--page", "page_probe", "--dry-run");
    assert.match(stdout, /class PageProbeBody extends StatelessWidget/u);
    assert.match(stdout, /part 'page_probe_view_model\.g\.dart';/u);
  });

  test("a screen prints the ids its route and capture coverage need", () => {
    const host = scaffoldIn(repoRoot, "screen", "--app", "host", "--name", "today_probe", "--dry-run").stdout;
    assert.match(host, /"id": "hostTodayProbeScreen"/u);
    assert.match(host, /"routeId": "hostTodayProbeScreen"/u);
    const consumer = scaffoldIn(repoRoot, "screen", "--page", "page_probe", "--dry-run").stdout;
    assert.match(consumer, /"id": "pageProbeScreen"/u);
  });

  test("a context prints its workspace line and the context map duty", () => {
    const {stdout} = scaffoldIn(repoRoot, "context", "--name", "zebras", "--dry-run");
    assert.match(stdout, /^ {2}- packages\/contexts\/zebras$/mu);
    assert.match(stdout, /tool\/architecture\/context_map\.json must list zebras/u);
    const listed = scaffoldIn(repoRoot, "context", "--name", "events", "--dry-run").stdout;
    assert.match(listed, /tool\/architecture\/context_map\.json lists events/u);
  });
});

describe("arguments and names", () => {
  const refusals = [
    [["component", "--name", "Badge", "--tier", "T1"], 1, /already registered: use CatchBadge \(catch\.badge\)/u],
    [["component", "--name", "MetaBadge", "--tier", "T1"], 1, /already registered: use CatchBadge/u],
    [["component", "--name", "StatusPill", "--tier", "T1"], 1, /Pill is spelled Chip here/u],
    [["component", "--name", "VenuePanel", "--tier", "T2"], 1, /Panel is spelled Section or Surface here/u],
    [["component", "--name", "NewVenueRow", "--tier", "T2"], 1, /do not describe a responsibility/u],
    [["component", "--name", "VenueRow", "--tier", "T9"], 64, /--tier must be one of/u],
    [["component", "--name", "venue_row", "--tier", "T2"], 64, /must be PascalCase/u],
    [["component", "--name", "VenueRow"], 64, /--tier requires a value/u],
    [["web-component", "--name", "CatchVenuePanel"], 1, /Panel is spelled Section or Surface here/u],
    [["context", "--name", "platform"], 1, /pub name 'platform' is already taken/u],
    [["context", "--name", "NotSnake"], 64, /must be lower_snake_case/u],
    [["screen", "--name", "today"], 64, /--app requires a value/u],
    [["screen", "--app", "admin", "--name", "today"], 64, /--app must be host or consumer/u],
    [["screen", "--page", "today", "--app", "host"], 64, /--page takes the place of/u],
    [["nope"], 64, /Unknown command: nope/u],
    [[], 64, /A command is required/u],
  ];
  for (const [args, status, message] of refusals) {
    test(`${args.join(" ") || "(no command)"} exits ${status}`, () => {
      const result = scaffoldIn(repoRoot, ...args, "--dry-run");
      assert.equal(result.status, status, result.stderr);
      assert.match(result.stderr, message);
    });
  }

  test("--help prints usage and exits 0", () => {
    const result = scaffoldIn(repoRoot, "--help");
    assertOk(result, "--help");
    assert.match(result.stdout, /node tool\/scaffold\.mjs web-component/u);
  });
});

describe("templates", () => {
  // PR 1.4's lints enforce this on new roots; until they land, nothing else does.
  const zeroDrawing = /\b(?:Color|Colors|Container|DecoratedBox|Text|TextStyle|BoxDecoration|SizedBox|Padding|EdgeInsets|BorderRadius|Border|BoxShadow|Theme)\b(?:\.|\()/u;

  for (const file of ["screen.dart", "body.dart", "view_model.dart"]) {
    test(`screen/${file} draws nothing`, () => {
      const source = fs.readFileSync(path.join(templates, `screen/${file}.tmpl`), "utf8");
      assert.doesNotMatch(source, zeroDrawing);
      assert.doesNotMatch(source, /\b\d+(?:\.\d+)?\b/u, "no numeric literal in a screen template");
    });
  }

  test("the body is provider-free and imports only catch_ui and framework layout", () => {
    const source = fs.readFileSync(path.join(templates, "screen/body.dart.tmpl"), "utf8");
    assert.match(source, /^\/\/ architecture: provider-free$/mu);
    const imports = [...source.matchAll(/^import '([^']+)';$/gmu)].map((match) => match[1]);
    assert.deepEqual(imports, ["package:catch_ui/catch_ui.dart", "package:flutter/widgets.dart"]);
    assert.doesNotMatch(source, /\bref\b|WidgetRef|Consumer/u);
  });

  test("the screen declares one screen class built on CatchViewport", () => {
    const source = fs.readFileSync(path.join(templates, "screen/screen.dart.tmpl"), "utf8");
    assert.equal([...source.matchAll(/^class /gmu)].length, 1);
    assert.match(source, /return CatchViewport\(/u);
    assert.match(source, /CatchAsyncBoundary</u);
  });

  test("the web stylesheet holds tokens and no raw values", () => {
    const source = fs.readFileSync(path.join(templates, "web-component/component.module.css.tmpl"), "utf8");
    const values = [...source.matchAll(/^\s*[a-z-]+:\s*(.+);$/gmu)].map((match) => match[1]);
    assert.ok(values.length > 0);
    for (const value of values) assert.match(value, /^var\(--catch-[a-z0-9-]+\)$/u);
  });
});

// A real run needs the Flutter toolchain and the root install. CI sets them up
// through the manifest; a machine without them skips, and CI never does.
const toolchainMissing = !process.env.CI &&
  (run("flutter", ["--version"]).status !== 0 || !fs.existsSync(fromRepo("node_modules/.bin/tsc")));

describe("a real run in a temp copy of the tree", {skip: toolchainMissing && "flutter or node_modules is missing"}, () => {
  // A stable path, so the analyzer's per-path plugin build is reused between runs.
  const tree = path.join(fs.realpathSync(os.tmpdir()), `catch-scaffold-test-${createHash("sha1").update(repoRoot).digest("hex").slice(0, 8)}`);
  const inTree = (...segments) => path.join(tree, ...segments);
  const created = new Set();
  const outputs = new Map();

  const commands = [
    ["context", "--name", "zebras"],
    ["screen", "--app", "host", "--name", "today_probe"],
    // Long enough that the formatter must move line breaks in every file.
    ["screen", "--app", "consumer", "--name", "event_setup_review_probe", "--destination", "discover_probe"],
    ["screen", "--page", "page_probe"],
    ["component", "--name", "VenueProbeRow", "--tier", "T2"],
    ["component", "--name", "ProbeBadge", "--tier", "T4"],
    ["web-component", "--name", "CatchVenueProbeRow"],
  ];

  function applyPrintedLines() {
    const root = fs.readFileSync(inTree("pubspec.yaml"), "utf8");
    const workspaceLine = /under workspace:\n( {2}- \S+)/u.exec(outputs.get("context"))[1];
    fs.writeFileSync(inTree("pubspec.yaml"), root.replace("workspace:\n", `workspace:\n${workspaceLine}\n`));
    for (const app of ["host", "consumer"]) {
      const printed = [...outputs.values()].map((stdout) =>
        new RegExp(`apps/${app}/pubspec\\.yaml, under dependencies:\\n((?:.*\\n)*?)then flutter pub get`, "u").exec(stdout)?.[1]).find(Boolean);
      if (!printed) continue;
      const pubspec = fs.readFileSync(inTree(`apps/${app}/pubspec.yaml`), "utf8");
      fs.writeFileSync(inTree(`apps/${app}/pubspec.yaml`), pubspec.replace("dependencies:\n", `dependencies:\n${printed}`));
    }
  }

  before(() => {
    fs.rmSync(tree, {recursive: true, force: true});
    fs.mkdirSync(tree, {recursive: true});
    const copy = run("sh", ["-c", `git archive HEAD -- . ${[
      "artifacts", "test/goldens", "website", "admin", "functions",
      "apps/host/android", "apps/host/ios", "apps/host/web", "apps/consumer/android", "apps/consumer/ios", "apps/consumer/web",
    ].map((entry) => `':(exclude)${entry}'`).join(" ")} | tar -x -C '${tree}'`]);
    assertOk(copy, "copying the tree");
    // The tool under test may not be committed yet.
    fs.copyFileSync(scaffold, inTree("tool/scaffold.mjs"));
    fs.cpSync(fromRepo("tool/scaffold"), inTree("tool/scaffold"), {recursive: true});
    fs.symlinkSync(fromRepo("node_modules"), inTree("node_modules"));

    for (const args of commands) {
      const result = scaffoldIn(tree, ...args);
      assertOk(result, args.join(" "));
      outputs.set(args[0] === "screen" ? `${args[0]}:${args[1]}:${args[2]}` : args[0] === "component" ? `component:${args[2]}` : args[0], result.stdout);
      for (const line of listedFiles(result.stdout)) {
        if (!line.includes(":")) created.add(line);
      }
    }
    applyPrintedLines();
    assertOk(run("flutter", ["pub", "get", "--offline"], tree), "flutter pub get");
  });

  after(() => fs.rmSync(tree, {recursive: true, force: true}));

  test("every Dart file it writes is already formatted", () => {
    const dart = [...created].filter((file) => file.endsWith(".dart"));
    assert.ok(dart.length > 20);
    assertOk(run("dart", ["format", "--output=none", "--set-exit-if-changed", ...dart], tree), "dart format");
  });

  test("the catch_ui barrel stays sorted", () => {
    const exports = fs.readFileSync(inTree("packages/catch_ui/lib/catch_ui.dart"), "utf8")
      .split("\n").filter((line) => line.startsWith("export '"));
    assert.ok(exports.includes("export 'src/components/catch_venue_probe_row.dart';"));
    assert.deepEqual(exports, [...exports].sort());
  });

  test("each package's own analysis gate passes", () => {
    // These are the steps tool/ci/check_flutter_workspace_analysis.mjs runs.
    assertOk(run("flutter", ["analyze", "--fatal-infos", "--no-pub"], inTree("packages/contexts/zebras")), "context package");
    assertOk(run("flutter", ["analyze", "--fatal-infos", "--no-pub"], inTree("apps/host")), "host app");
    assertOk(run("flutter", ["analyze", "--fatal-infos", "--no-pub"], inTree("apps/consumer")), "consumer app");
    assertOk(run("dart", ["analyze", "lib/catch_ui.dart", "lib/src/components/catch_venue_probe_row.dart",
      "lib/src/components/catch_probe_badge.dart", "--fatal-infos"], inTree("packages/catch_ui")), "catch_ui");
  });

  test("root analysis with the plugins finds nothing in the output and catches seeded probes", () => {
    // The plugins load only from the workspace root. Seeded files prove this
    // run reaches each new root, so a clean result means something.
    const probe = "import 'package:flutter/material.dart';\n\nclass ProbeBody extends StatelessWidget {\n" +
      "  const ProbeBody({super.key});\n\n  @override\n  Widget build(BuildContext context) =>\n" +
      "      Container(color: const Color(0xFF112233));\n}\n";
    const probes = [
      "apps/host/lib/today_probe/widgets/probe_body.dart",
      "packages/contexts/zebras/lib/src/parts/probe_body.dart",
      "lib/pages/page_probe/widgets/probe_body.dart",
    ];
    for (const file of probes) fs.writeFileSync(inTree(file), probe);
    const result = run("dart", ["analyze", "--format", "machine", "--fatal-infos"], tree);
    for (const file of probes) fs.rmSync(inTree(file));

    const findings = (result.stdout + result.stderr).split("\n").filter((line) => line.includes("|"))
      .map((line) => {
        const [severity, type, code, file, lineNumber] = line.split("|");
        return {severity, type, code, file: path.isAbsolute(file) ? path.relative(tree, file) : file, line: lineNumber};
      });
    for (const file of probes) {
      assert.ok(findings.some((finding) => finding.file === file && finding.code === "CATCH_NO_RAW_COLOR"),
        `the plugins did not reach ${file}`);
    }
    const inOutput = findings.filter((finding) => created.has(finding.file));
    assert.deepEqual(inOutput, []);
  });

  test("Widgetbook's use cases analyse clean", () => {
    const widgetbook = inTree("widgetbook");
    assertOk(run("flutter", ["pub", "get", "--offline"], widgetbook), "widgetbook pub get");
    assertOk(run("dart", ["analyze", "--fatal-infos", "lib/primitives/contracts/venue_probe_row.dart",
      "lib/primitives/contracts/probe_badge.dart"], widgetbook), "widgetbook use cases");
  });

  test("generated tests pass", () => {
    assertOk(run("flutter", ["test", "--no-pub"], inTree("packages/contexts/zebras")), "context test");
    assertOk(run("flutter", ["test", "--no-pub", "test/today_probe"], inTree("apps/host")), "host body test");
    assertOk(run("flutter", ["test", "--no-pub", "test/discover_probe"], inTree("apps/consumer")), "consumer body test");
    assertOk(run("flutter", ["test", "--no-pub", "test/pages/page_probe", "test/core/catch_venue_probe_row_test.dart",
      "test/core/catch_probe_badge_test.dart"], tree), "root tests");
  });

  test("build_runner writes the same provider, whatever the name's length", () => {
    const lock = fs.readFileSync(inTree("pubspec.lock"), "utf8");
    const pinned = (name) => new RegExp(`^ {2}${name}:\\n(?: {4}.*\\n)*? {4}version: "([^"]+)"`, "mu").exec(lock)[1];
    const probe = fs.mkdtempSync(path.join(os.tmpdir(), "catch-scaffold-generator-"));
    try {
      fs.mkdirSync(path.join(probe, "lib"));
      fs.writeFileSync(path.join(probe, "pubspec.yaml"), [
        "name: scaffold_generator_probe",
        "publish_to: none",
        "environment:",
        "  sdk: ^3.12.0",
        "dependencies:",
        `  riverpod_annotation: ${pinned("riverpod_annotation")}`,
        "dev_dependencies:",
        `  build_runner: ${pinned("build_runner")}`,
        `  riverpod_generator: ${pinned("riverpod_generator")}`,
        "",
      ].join("\n"));
      const screens = [
        ["apps/host/lib/today_probe", "today_probe"],
        ["apps/consumer/lib/discover_probe", "event_setup_review_probe"],
      ];
      for (const [folder, name] of screens) {
        fs.copyFileSync(inTree(folder, `${name}_view_model.dart`), path.join(probe, "lib", `${name}_view_model.dart`));
      }
      assertOk(run("dart", ["pub", "get", "--offline"], probe), "generator pub get");
      assertOk(run("dart", ["run", "build_runner", "build", "--delete-conflicting-outputs"], probe), "build_runner");
      for (const [folder, name] of screens) {
        assert.equal(
          fs.readFileSync(inTree(folder, `${name}_view_model.g.dart`), "utf8"),
          fs.readFileSync(path.join(probe, "lib", `${name}_view_model.g.dart`), "utf8"),
          `${name}_view_model.g.dart differs from build_runner's output; update tool/scaffold/templates/screen/view_model.g.dart.tmpl`,
        );
      }
    } finally {
      fs.rmSync(probe, {recursive: true, force: true});
    }
  });

  test("a second run refuses and changes nothing", () => {
    const barrel = fs.readFileSync(inTree("packages/catch_ui/lib/catch_ui.dart"), "utf8");
    for (const args of commands) {
      const result = scaffoldIn(tree, ...args);
      assert.equal(result.status, 1, `${args.join(" ")} did not refuse`);
      assert.match(result.stderr, /Refusing to overwrite/u);
    }
    assert.equal(fs.readFileSync(inTree("packages/catch_ui/lib/catch_ui.dart"), "utf8"), barrel);
  });

  test("a refusal writes none of the missing files", () => {
    const removed = inTree("apps/host/lib/today_probe/today_probe_body.dart");
    fs.rmSync(removed);
    const result = scaffoldIn(tree, "screen", "--app", "host", "--name", "today_probe");
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(removed), false);
  });

  test("the printed registry records satisfy the registry's checks", () => {
    const registryPath = inTree("design/components/catch.components.json");
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    for (const name of ["VenueProbeRow", "ProbeBadge"]) {
      const stdout = outputs.get(`component:${name}`);
      const start = stdout.indexOf("{\n");
      const end = stdout.indexOf("\n}\n", start) + 2;
      registry.components.push(JSON.parse(stdout.slice(start, end)));
    }
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    assertOk(run(process.execPath, ["tool/design/check_component_contracts.mjs"], tree), "component contracts");
    assertOk(run(process.execPath, ["tool/design/check_component_lexicon.mjs", "--surfaces-only"], tree), "component lexicon");
  });

  test("the printed top-bar contract satisfies its check", () => {
    const manifestPath = inTree("tool/design/screen_top_bar_contracts.json");
    const before = run(process.execPath, ["tool/design/check_screen_top_bar_contracts.mjs", "--check"], tree);
    assert.notEqual(before.status, 0, "a new screen should need a contract");
    assert.match(before.stdout + before.stderr, /page_probe_screen\.dart: unregistered-app-bar/u);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const printed = /screen_top_bar_contracts\.json, under contracts:\n {2}(\{.*\})/u.exec(outputs.get("screen:--page:page_probe"))[1];
    manifest.contracts.push(JSON.parse(printed));
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    assertOk(run(process.execPath, ["tool/design/check_screen_top_bar_contracts.mjs", "--check"], tree), "top-bar contracts");
  });

  test("the web component typechecks and its test passes", () => {
    const webUi = inTree("packages/web-ui");
    const binary = (name) => inTree("node_modules/.bin", name);
    assertOk(run(binary("tsc"), ["-p", "tsconfig.json", "--noEmit", "--pretty", "false"], webUi), "tsc");
    assertOk(run(binary("vitest"), ["run", "src/components/CatchVenueProbeRow.test.tsx"], webUi), "vitest");
  });
});
