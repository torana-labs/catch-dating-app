import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {
  collectGovernedDocuments,
  compareDocumentMetadata,
  compareSemanticVersions,
  parseDocumentLifecycleStatus,
  parseGovernedDocument,
  parseSemanticVersion,
  runSelfTest,
  widgetCatalogViolation,
  documentReferences,
  buildDocumentInventory,
  buildDocumentRetirementReport,
  retiredDocumentReferences,
  headingAnchors,
  machineReferenceFindings,
  uniqueRetiredNames,
} from "./check_doc_metadata.mjs";

const scriptPath = fileURLToPath(new URL("./check_doc_metadata.mjs", import.meta.url));

for (const mode of ["working tree", "ref", "base"]) {
  test(`CLI ${mode} reads fail locally when a promised document blob is missing`, () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "catch-doc-promisor-"));
    const repo = path.join(fixture, "repo");
    const receipt = path.join(fixture, "remote-invoked");
    const env = {
      ...process.env,
      PATH: `${fixture}${path.delimiter}${process.env.PATH}`,
      GIT_CONFIG_GLOBAL: os.devNull,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_NO_LAZY_FETCH: "0",
      GIT_OPTIONAL_LOCKS: "1",
      CATCH_DOC_TEST_RECEIPT: receipt,
    };
    const fixtureGit = (args) => execFileSync("git", args, {cwd: repo, env, encoding: "utf8"});
    const args = mode === "ref" ? ["--ref", "HEAD"] : mode === "base" ? ["--base", "HEAD"] : [];
    const run = () => spawnSync(process.execPath, [scriptPath, "--repo", repo, ...args, "--json"], {
      env, encoding: "utf8", timeout: 10000,
    });
    try {
      fs.mkdirSync(repo);
      // This protocol can only leave a receipt and refuse; it has no network destination.
      fs.writeFileSync(path.join(fixture, "git-remote-denydocs"),
        '#!/bin/sh\nprintf invoked > "$CATCH_DOC_TEST_RECEIPT"\nexit 1\n', {mode: 0o755});
      fixtureGit(["init", "-q"]);
      fixtureGit(["config", "user.email", "test@example.com"]);
      fixtureGit(["config", "user.name", "Catch Test"]);
      fixtureGit(["config", "core.hooksPath", os.devNull]);
      fixtureGit(["config", "commit.gpgSign", "false"]);
      writeDoc(repo, "1.2.0", "active");
      fixtureGit(["add", "."]);
      fixtureGit(["commit", "-qm", "local document"]);
      fixtureGit(["config", "remote.origin.url", "denydocs::fixture"]);
      fixtureGit(["config", "remote.origin.promisor", "true"]);
      fixtureGit(["config", "remote.origin.partialclonefilter", "blob:none"]);
      const blob = fixtureGit(["rev-parse", "HEAD:docs/sample.md"]).trim();
      const documentPath = path.join(repo, "docs/sample.md");
      if (mode === "working tree") {
        fixtureGit(["update-index", "--skip-worktree", "docs/sample.md"]);
        fs.unlinkSync(documentPath);
      }
      const complete = run();
      assert.equal(complete.status, 0, complete.stderr);
      assert.equal(JSON.parse(complete.stdout).pass, true);
      assert.equal(fs.existsSync(receipt), false);
      const preservedPaths = [".git/index", ".git/config", ".git/HEAD"];
      if (mode !== "working tree") preservedPaths.push("docs/sample.md");
      const before = preservedPaths.map((relative) => fs.readFileSync(path.join(repo, relative)));
      fs.unlinkSync(path.join(repo, ".git/objects", blob.slice(0, 2), blob.slice(2)));

      // Prove the fixture would actually attempt retrieval without the production guard.
      const control = spawnSync("git", ["show", "HEAD:docs/sample.md"], {
        cwd: repo, env, encoding: "utf8", timeout: 10000,
      });
      assert.equal(control.status, 128, control.stderr);
      assert.equal(fs.readFileSync(receipt, "utf8"), "invoked");
      fs.unlinkSync(receipt);

      const missing = run();
      assert.equal(missing.status, 1, missing.stderr);
      assert.match(missing.stderr, /bad object|unable to read|missing|invalid object/u);
      assert.equal(fs.existsSync(receipt), false, "documentation reads must not invoke the promisor helper");
      for (const [index, relative] of preservedPaths.entries()) {
        assert.deepEqual(fs.readFileSync(path.join(repo, relative)), before[index], relative);
      }
      if (mode === "working tree") assert.equal(fs.existsSync(documentPath), false);
    } finally {
      fs.rmSync(fixture, {recursive: true, force: true});
    }
  });
}

test("source frontmatter is the sole governed Markdown authority", () => {
  const source = `---
doc_id: release_operations
version: 1.12.0
updated: 2026-08-07
owner: release_operations
status: active — current runbook
---

# Release operations
`;
  assert.deepEqual(parseGovernedDocument("docs/release_operations.md", source), {
    id: "release_operations",
    path: "docs/release_operations.md",
    version: "1.12.0",
    updated: "2026-08-07",
    owner: "release_operations",
    status: "active",
  });
  assert.equal(parseDocumentLifecycleStatus(source), "active");
  assert.equal(parseDocumentLifecycleStatus("# no metadata\n"), null);
});

test("governed source requires complete metadata and unique identity", () => {
  assert.throws(
    () => parseGovernedDocument(
      "docs/incomplete.md",
      "---\ndoc_id: incomplete\nversion: 1.0.0\n---\n",
    ),
    /missing owner, status/u,
  );
  assert.equal(
    parseGovernedDocument("docs/plain.md", "---\ndoc_id: plain\nowner: docs\nstatus: active\n---\n").version,
    null,
  );
  const source = "---\ndoc_id: duplicate\nversion: 1.0.0\nupdated: 2026-08-07\nowner: docs\nstatus: active\n---\n";
  assert.throws(
    () => collectGovernedDocuments({
      paths: ["docs/a.md", "docs/b.md"],
      readSource: () => source,
    }),
    /Duplicate doc_id duplicate/u,
  );
});

test("widget catalog stays current inventory instead of inline history", () => {
  const current = [
    "## Canonical Usage Decisions", "",
    "<!-- BEGIN GENERATED WIDGET INVENTORY -->",
    "<!-- Generated by tool/design/generate_widget_catalog.mjs. Do not edit this region. -->",
    "## Production Widget Inventory", "",
    "<!-- END GENERATED WIDGET INVENTORY -->", "",
  ].join("\n");
  assert.equal(widgetCatalogViolation(current), null);
  assert.match(widgetCatalogViolation(current.replace("## Canonical Usage Decisions", "## Old Decisions")), /usage decisions/u);
  assert.match(widgetCatalogViolation(current.replace("<!-- END GENERATED WIDGET INVENTORY -->", "")), /exactly one/u);
  assert.match(widgetCatalogViolation(current + "<!-- BEGIN GENERATED WIDGET INVENTORY -->"), /exactly one/u);
  assert.match(widgetCatalogViolation(current.replace("## Production Widget Inventory", "## Manual table")), /header is missing/u);
  assert.match(widgetCatalogViolation(current.replace("## Canonical Usage Decisions", "").concat("## Canonical Usage Decisions\n")), /must precede/u);

  assert.match(
    widgetCatalogViolation("## Maintenance Contract\n\n## Rule Changelog\n\n## App Entry Point\n"),
    /inline changelog/u,
  );

  const historical = `---
doc_id: widget_catalog
version: 1.0.0
updated: 2026-08-06
owner: design_system
status: active
---

## Maintenance Contract

## Rule Changelog

## App Entry Point
`;
  assert.doesNotThrow(() => parseGovernedDocument(
    "docs/widget_catalog.md",
    historical,
    {validateCurrentContracts: false},
  ));
  assert.throws(
    () => parseGovernedDocument("docs/widget_catalog.md", historical),
    /inline changelog/u,
  );
});

test("semantic versions compare without a duplicate catalog", () => {
  assert.deepEqual(parseSemanticVersion("16"), {
    raw: "16",
    major: 16,
    minor: 0,
    patch: 0,
    prerelease: [],
  });
  assert.equal(compareSemanticVersions("1.2", "1.2.0"), 0);
  assert.equal(compareSemanticVersions("1.2.1", "1.2"), 1);
  assert.equal(compareSemanticVersions("2.0.0-rc.1", "2.0.0"), -1);
  assert.throws(() => parseSemanticVersion("1.02.0"), /Invalid semantic version/u);
});

test("comparison rejects decreases and identity swaps while reporting deletions", () => {
  const result = compareDocumentMetadata({
    baseDocuments: [
      doc("decrease", "docs/decrease.md", "2.0.0", "active"),
      doc("identity", "docs/identity.md", "1.0.0", "active"),
      doc("deleted", "docs/deleted.md", "1.0.0", "active"),
    ],
    currentDocuments: [
      doc("decrease", "docs/decrease.md", "1.9.9", "active"),
      doc("replacement", "docs/identity.md", "1.0.1", "active"),
    ],
  });
  assert.equal(result.pass, false);
  assert.deepEqual(
    result.findings.map((entry) => entry.kind).sort(),
    ["doc-id-changed", "version-decrease"],
  );
  assert.deepEqual(result.deletions.map((entry) => entry.id), ["deleted"]);
});

test("comparison allows additions, version increases, renames, and reviewed deletion", () => {
  const result = compareDocumentMetadata({
    baseDocuments: [
      doc("renamed", "docs/old.md", "1.0.0", "active"),
      doc("retired", "docs/retired.md", "1.0.0", "retirement_ready"),
    ],
    currentDocuments: [
      doc("renamed", "docs/new.md", "1.1.0", "active"),
      doc("addition", "docs/addition.md", "0.1.0", "draft"),
    ],
  });
  assert.equal(result.pass, true);
  assert.equal(result.increases.length, 1);
  assert.equal(result.additions.length, 1);
  assert.equal(result.deletions.length, 1);
});

test("known-bad self-test proves decrease detection and deletion reporting", () => {
  const selfTest = runSelfTest();
  assert.equal(selfTest.pass, true);
  const cli = spawnSync(process.execPath, [scriptPath, "--self-test", "--json"], {
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).selfTest.pass, true);
});

test("CLI compares source metadata at the working tree and an exact ref", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "catch-doc-metadata-"));
  git(repo, ["init", "-q"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "Catch Test"]);
  writeDoc(repo, "1.2.0", "active");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-qm", "base"]);
  const base = git(repo, ["rev-parse", "HEAD"]).trim();

  writeDoc(repo, "1.1.9", "active");
  const bad = spawnSync(process.execPath, [scriptPath, "--repo", repo, "--base", base, "--json"], {
    encoding: "utf8",
  });
  assert.equal(bad.status, 1, bad.stderr);
  assert.equal(JSON.parse(bad.stdout).findings[0].kind, "version-decrease");

  writeDoc(repo, "1.3.0", "active");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-qm", "increase"]);
  const target = git(repo, ["rev-parse", "HEAD"]).trim();
  const good = spawnSync(process.execPath, [
    scriptPath,
    "--repo",
    repo,
    "--base",
    base,
    "--ref",
    target,
    "--json",
  ], {encoding: "utf8"});
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).pass, true);
  assert.equal(JSON.parse(good.stdout).targetRevision, target);
});

function doc(id, documentPath, version, status) {
  return {
    id,
    path: documentPath,
    version,
    updated: "2026-08-07",
    owner: "docs",
    status,
  };
}

function writeDoc(repo, version, status) {
  const documentPath = path.join(repo, "docs", "sample.md");
  fs.mkdirSync(path.dirname(documentPath), {recursive: true});
  fs.writeFileSync(
    documentPath,
    `---\ndoc_id: sample\nversion: ${version}\nupdated: 2026-08-07\nowner: docs\nstatus: ${status}\n---\n\n# Sample\n`,
  );
}

function git(repo, args) {
  return execFileSync("git", args, {cwd: repo, encoding: "utf8"});
}

test("literal document references respect Markdown relativity and repository code paths", () => {
  const refs = documentReferences("docs/plans/current.md", [
    "[Owner](../owner.md#policy)",
    "`docs/owner.md:42` and `../../lib/README.md`",
    "[nested](docs/owner.md)",
    "[External](https://example.com/docs/owner.md)",
    "[space](<../old%20plan.md>)",
    "[ref]: ../owner.md#policy",
    "[not-doc](../owner.json) and `not a path`",
  ].join("\n"), new Set(["docs/owner.md"]));
  assert.deepEqual(refs, [
    {path: "docs/owner.md", line: 1},
    {path: "docs/owner.md", line: 2},
    {path: "lib/README.md", line: 2},
    {path: "docs/plans/docs/owner.md", line: 3},
    {path: "docs/old plan.md", line: 5},
    {path: "docs/owner.md", line: 6},
  ]);
});

test("inventory includes ungoverned Markdown and exposes headings and incoming references", () => {
  const sources = new Map([
    ["docs/README.md", "# Docs\n\n[Guide](guide.md)\n"],
    ["docs/guide.md", "<!-- GENERATED FROM contract.json. DO NOT EDIT. -->\n# Guide\n\n```md\n## Not a heading\n```\n## Usage\n"],
    ["lib/example.dart", "not Markdown"],
  ]);
  const inventory = buildDocumentInventory({paths: sources.keys(), readSource: (p) => sources.get(p)});
  assert.equal(inventory.documents.length, 2);
  const guide = inventory.documents.find((d) => d.path === "docs/guide.md");
  assert.equal(guide.metadata, null);
  assert.match(guide.generatedMarker, /GENERATED FROM/u);
  assert.deepEqual(guide.headings.map((h) => h.title), ["Guide", "Usage"]);
  assert.deepEqual(guide.referencedBy, [{path: "docs/README.md", line: 3}]);
  assert.match(inventory.coverage, /no semantic freshness/u);
});

test("retirement finds remaining references without blocking unrelated historical broken links", () => {
  const findings = retiredDocumentReferences({
    paths: new Set(["docs/README.md", "lib/README.md"]),
    readSource: (p) => p === "docs/README.md"
      ? "[Old](plans/old.md#acceptance)\n[Existing broken](already-missing.md)"
      : "See `docs/plans/old.md`.\n",
    retiredPaths: ["docs/plans/old.md"],
  });
  assert.deepEqual(findings.map((f) => [f.path, f.line, f.target]), [
    ["docs/README.md", 1, "docs/plans/old.md"],
    ["lib/README.md", 1, "docs/plans/old.md"],
  ]);
});

test("CLI retirement protects ungoverned docs and handles dirty, committed, and renamed files", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "catch-doc-retirement-"));
  try {
    git(repo, ["init", "-q"]);
    git(repo, ["config", "user.email", "test@example.com"]);
    git(repo, ["config", "user.name", "Catch Test"]);
    fs.mkdirSync(path.join(repo, "docs"));
    fs.writeFileSync(path.join(repo, "docs/old.md"), "# Old\n");
    fs.writeFileSync(path.join(repo, "docs/README.md"), "[Old](old.md)\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);
    const base = git(repo, ["rev-parse", "HEAD"]).trim();
    fs.renameSync(path.join(repo, "docs/old.md"), path.join(repo, "docs/new.md"));
    const run = (...args) => spawnSync(process.execPath, [scriptPath, "--repo", repo, "--base", base, "--json", ...args], {encoding: "utf8"});
    const bad = run();
    assert.equal(bad.status, 1, bad.stderr);
    assert.equal(JSON.parse(bad.stdout).findings[0].kind, "retired-document-reference");
    fs.writeFileSync(path.join(repo, "docs/README.md"), "[Current](new.md)\n");
    const good = run("--inventory");
    assert.equal(good.status, 0, good.stderr);
    assert.equal(JSON.parse(good.stdout).inventory.documents.length, 2);
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-qm", "rename and repair"]);
    assert.equal(run("--ref", "HEAD").status, 0);
    fs.writeFileSync(path.join(repo, "docs/README.md"), "[Old](old.md)\n");
    assert.equal(run().status, 1);
    assert.equal(run("--ref", "HEAD").status, 0);
    assert.equal(run("--ref", "").status, 1);
  } finally {
    fs.rmSync(repo, {recursive: true, force: true});
  }
});

test("references handle nested and escaped destinations, root literals, and fenced samples", () => {
  const refs = documentReferences("docs/guide.md", [
    "[other](image.png) [one](notes/a(b(c)).md) [two](<notes/a(b).md>)",
    String.raw`[escaped](notes/a\(b\).md "Title")`,
    "`AGENTS.md` and `README.md`",
    "```md",
    "[Sample](old.md) and `docs/old.md`",
    "```",
    "[real]: <notes/a(b).md> \"Title\"",
  ].join("\n"), new Set(["AGENTS.md", "README.md", "docs/README.md"]));
  assert.deepEqual(refs, [
    {path: "docs/notes/a(b(c)).md", line: 1},
    {path: "docs/notes/a(b).md", line: 1},
    {path: "docs/notes/a(b).md", line: 2},
    {path: "AGENTS.md", line: 3},
    {path: "docs/README.md", line: 3},
    {path: "docs/notes/a(b).md", line: 7},
  ]);
  assert.equal(retiredDocumentReferences({
    paths: ["docs/guide.md"], readSource: () => "Read `AGENTS.md` and `operations/README.md`.",
    retiredPaths: ["AGENTS.md", "operations/README.md"],
  }).length, 2);
});


test("retirement signals protect history and generators and disclose pending work", () => {
  const sources = new Map([
    ["docs/completed.md", "---\nstatus: completed\n---\n# Plan\n- [ ] Still needed\n"],
    ["docs/historical/old.md", "---\nstatus: completed\n---\n`lib/gone.dart`"],
    ["docs/generated.md", "<!-- Generated by tool/demo.mjs -->\n`lib/gone.dart`"],
    ["docs/current.md", "[Plan](completed.md)\n[Gone](gone.md)\n`lib/gone.dart:10`\n`lib/exists.dart`\n```\n`lib/example.dart`\n```\n`lib/<name>.dart`\n`lib/*.dart`"],
    ["lib/exists.dart", "void main() {}"],
  ]);
  const report = buildDocumentRetirementReport({paths: sources.keys(), readSource: (file) => sources.get(file)});
  assert.equal(report.documents, 4);
  assert.equal(report.protectedDocuments.length, 2);
  const retirement = report.findings.find((row) => row.kind === "retirement-review");
  assert.equal(retirement.pendingItems, 1);
  assert.deepEqual(retirement.referencedBy, [{path: "docs/current.md", line: 1}]);
  assert.deepEqual(report.findings.filter((row) => row.kind.startsWith("missing-")).map((row) => row.target),
    ["docs/gone.md", "lib/gone.dart"]);
  assert.ok(report.findings.some((row) => row.kind === "no-inbound-markdown-links" && row.path === "docs/current.md"));
  assert.ok(!report.findings.some((row) => row.path === "docs/generated.md"));
});

test("duplicate bodies ignore metadata but protect short snippets and generated content", () => {
  const body = "Shared guidance. ".repeat(30);
  const sources = new Map([
    ["docs/a.md", `---\nstatus: active\n---\n${body}`],
    ["docs/b.md", `---\nstatus: draft\n---\n${body}`],
    ["docs/c.md", "Tiny snippet"],
    ["docs/d.md", "Tiny snippet"],
    ["docs/generated.md", `<!-- Generated by tool/demo.mjs -->\n${body}`],
  ]);
  const inspect = () => buildDocumentRetirementReport({paths: sources.keys(), readSource: (file) => sources.get(file)});
  const before = inspect();
  assert.deepEqual(before.exactDuplicateBodies, [["docs/a.md", "docs/b.md"]]);
  sources.set("docs/a.md", body + "Changed");
  assert.notEqual(inspect().sourceDigest, before.sourceDigest);
});


test("completed checklist signals are advisory and historical prose is protected", () => {
  const sources = new Map([
    ["docs/rollout.md", "# Rollout\n✅ DONE a\n✅ DONE b\n✅ DONE c\n- [ ] Open decision"],
    ["docs/old.md", "> Historical implementation record.\n`lib/old.dart`"],
    ["docs/research.md", "> Retained only as historical product research.\n`lib/old.dart`"],
    ["docs/current.md", "`node tool/run.mjs --paths docs/demo.md`\n`lib/*/README.md`"],
    ["widgetbook/README.md", "`lib/main.dart`"],
    ["widgetbook/lib/main.dart", "void main() {}"],
  ]);
  const report = buildDocumentRetirementReport({paths: sources.keys(), readSource: (file) => sources.get(file)});
  assert.equal(report.protectedDocuments.length, 2);
  assert.equal(report.findings.filter((row) => row.kind === "completed-checklist-review").length, 1);
  assert.equal(report.findings.filter((row) => row.kind.startsWith("missing-")).length, 0);
});

test("heading anchors follow GitHub slugs and ignore fenced examples", () => {
  const anchors = headingAnchors([
    "# Release `deploy` Order",
    "## Phase 6 — Continuous conformance ##",
    "```md",
    "## Not A Heading",
    "```",
  ].join("\n"));
  assert.ok(anchors.has("release-deploy-order"));
  assert.ok(anchors.has("phase-6--continuous-conformance"));
  assert.ok(!anchors.has("not-a-heading"));
});

test("machine references to removed documents and headings fail; old gaps are advisory", () => {
  const matches = [
    {path: "tool/policy/rules.json", line: 4, text: '"docAnchor": "docs/plans/old.md#scope"'},
    {path: "tool/check.mjs", line: 7, text: 'read("../../docs/plans/old.md")'},
    {path: "website/README.txt", line: 1, text: "website/docs/plans/old.md and docs/plans/old.mdx"},
    {path: "tool/owner.json", line: 2, text: '"docs/guide.md#usage", "docs/guide.md#kept"'},
    {path: "tool/owner.json", line: 3, text: '"docs/guide.md#never-existed", "docs/guide.md"'},
    {path: "tool/other.json", line: 1, text: '"docs/untouched.md#anything"'},
    {path: "lib/styles.dart", line: 9, text: "/// approved in `old.md` and `README.md`."},
  ];
  const sources = {
    base: {"docs/guide.md": "# Guide\n## Usage\n## Kept\n"},
    target: {"docs/guide.md": "# Guide\n## Kept\n```\n## Usage\n```\n"},
  };
  const result = machineReferenceFindings({
    matches,
    retiredPaths: ["docs/plans/old.md"],
    retiredByName: uniqueRetiredNames(
      ["docs/plans/old.md", "docs/README.md", "lib/README.md", "docs/guide.md"],
      ["docs/plans/old.md", "docs/README.md"]),
    changedPaths: ["docs/guide.md"],
    readBase: (file) => sources.base[file],
    readTarget: (file) => sources.target[file],
  });
  assert.deepEqual(result.findings.map((row) => [row.kind, row.path, row.line, row.target, row.fragment]), [
    ["retired-document-machine-reference", "tool/policy/rules.json", 4, "docs/plans/old.md", undefined],
    ["retired-document-machine-reference", "tool/check.mjs", 7, "docs/plans/old.md", undefined],
    ["removed-document-anchor", "tool/owner.json", 2, "docs/guide.md", "usage"],
    ["retired-document-machine-reference", "lib/styles.dart", 9, "docs/plans/old.md", undefined],
  ]);
  assert.deepEqual(result.advisories.map((row) => [row.kind, row.fragment]),
    [["unresolved-document-anchor", "never-existed"]]);
});

test("CLI rejects registry and code references to removed documents and headings", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "catch-doc-machine-refs-"));
  try {
    git(repo, ["init", "-q"]);
    git(repo, ["config", "user.email", "test@example.com"]);
    git(repo, ["config", "user.name", "Catch Test"]);
    const write = (relative, content) => {
      fs.mkdirSync(path.dirname(path.join(repo, relative)), {recursive: true});
      fs.writeFileSync(path.join(repo, relative), content);
    };
    write("docs/old.md", "# Old\n");
    write("docs/guide.md", "# Guide\n\n## Scope\n");
    write("tool/policy/rules.json", '{"docAnchor": "docs/guide.md#scope"}\n');
    write("tool/check.mjs", 'const owner = "docs/old.md";\n');
    write("lib/styles.dart", "/// Approved in `old.md`.\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);
    const base = git(repo, ["rev-parse", "HEAD"]).trim();
    const run = (...args) => spawnSync(process.execPath,
      [scriptPath, "--repo", repo, "--base", base, "--json", ...args], {encoding: "utf8"});
    const kinds = (result) => JSON.parse(result.stdout).findings.map((row) => row.kind).sort();

    fs.unlinkSync(path.join(repo, "docs/old.md"));
    write("docs/guide.md", "# Guide\n\n## Ownership\n");
    const bad = run();
    assert.equal(bad.status, 1, bad.stderr);
    assert.deepEqual(kinds(bad), ["removed-document-anchor", "retired-document-machine-reference",
      "retired-document-machine-reference"]);

    // Sparse CI working trees omit consumers; the index still binds them.
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "-qm", "break consumers"]);
    const broken = git(repo, ["rev-parse", "HEAD"]).trim();
    git(repo, ["update-index", "--skip-worktree", "tool/policy/rules.json", "tool/check.mjs"]);
    fs.rmSync(path.join(repo, "tool"), {recursive: true});
    assert.deepEqual(kinds(run()), ["removed-document-anchor", "retired-document-machine-reference",
      "retired-document-machine-reference"]);
    git(repo, ["update-index", "--no-skip-worktree", "tool/policy/rules.json", "tool/check.mjs"]);
    git(repo, ["checkout", "--", "tool"]);
    assert.deepEqual(kinds(run("--ref", broken)), ["removed-document-anchor", "retired-document-machine-reference",
      "retired-document-machine-reference"]);

    write("tool/policy/rules.json", '{"docAnchor": "docs/guide.md#ownership"}\n');
    write("tool/check.mjs", 'const owner = "docs/guide.md";\n');
    const bare = run();
    assert.equal(bare.status, 1, bare.stderr);
    assert.deepEqual(JSON.parse(bare.stdout).findings.map((row) => [row.path, row.target]),
      [["lib/styles.dart", "docs/old.md"]]);
    write("lib/styles.dart", "/// Approved by the owner.\n");
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    assert.deepEqual(JSON.parse(good.stdout).advisories, []);
  } finally {
    fs.rmSync(repo, {recursive: true, force: true});
  }
});
