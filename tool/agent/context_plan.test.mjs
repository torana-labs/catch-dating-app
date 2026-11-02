import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCheckSelection,
  isCanonicalPath,
  matchesScopePatterns,
  normalizeScopePaths,
  resolveCheckPlan,
  selectSourceRules,
  selectSkills,
} from "./lib/context_plan.mjs";

const manifest = {
  tools: [
    {
      id: "source-check",
      status: "active",
      path: "tool/source_check.mjs",
      safety: "local-readonly",
      checks: ["node tool/source_check.mjs"],
      alsoCheckIds: ["dependency-check"],
      ciRequirements: {repositoryView: "index", setup: ["node"]},
    },
    {
      id: "dependency-check",
      status: "active",
      path: "tool/dependency_check.mjs",
      safety: "local-readonly",
      checks: ["node tool/dependency_check.mjs"],
      alsoCheckIds: ["source-check"],
      ciRequirements: {repositoryView: "index", setup: ["node"]},
    },
    {
      id: "full-check",
      status: "active",
      path: "tool/full_check.mjs",
      safety: "local",
      checks: ["node tool/full_check.mjs"],
    },
    {
      id: "inactive-check",
      status: "retired",
      path: "tool/retired.mjs",
      checks: ["node tool/retired.mjs"],
    },
  ],
};

test("scope normalization accepts only explicit repository-relative paths", () => {
  assert.deepEqual(
    normalizeScopePaths(["./tool/", "docs/plan.md,tool", "lib/profile/"]),
    ["docs/plan.md", "lib/profile", "tool"],
  );
  for (const unsafe of ["../../outside", "/tmp/x", "//server/share", "C:\\tmp\\x", ".git/config"]) {
    assert.throws(() => normalizeScopePaths([unsafe]), /repository-relative/u);
  }
  assert.equal(isCanonicalPath("lib/profile/screen.dart"), true);
  assert.equal(isCanonicalPath("lib/*/screen.dart"), false);
});

test("scope patterns route nested files and directory roots", () => {
  assert.equal(matchesScopePatterns(["tool"], ["tool/**"]), true);
  assert.equal(matchesScopePatterns(
    ["lib/explore/presentation/screen.dart"],
    ["lib/**/presentation/**"],
  ), true);
  assert.equal(matchesScopePatterns(
    ["lib/explore/data/repository.dart"],
    ["lib/**/presentation/**"],
  ), false);
  assert.equal(matchesScopePatterns(["a/b"], ["a/**/b"]), true);
  assert.equal(matchesScopePatterns([".github/workflows/ci.yml"], ["**/*"]), true);
});

test("skill routing prefers path matches and uses task words only as a fallback", () => {
  const skills = [
    {skill_id: "catch-ui", applies_to: ["lib/**/presentation/**"]},
    {skill_id: "catch-data", applies_to: ["lib/**/data/**"]},
    {skill_id: "catch-doc-hygiene", applies_to: ["docs/**"]},
  ];
  assert.deepEqual(
    selectSkills(skills, "data-cleanup", ["lib/explore/presentation/screen.dart"])
      .map((entry) => entry.skill_id),
    ["catch-ui"],
  );
  assert.deepEqual(
    selectSkills(skills, "documentation hygiene", ["unknown/new.file"])
      .map((entry) => entry.skill_id),
    ["catch-doc-hygiene"],
  );
});

test("only path-matched source rules are selected", () => {
  const rules = {
    "RULE-A": {appliesTo: ["tool/**"]},
    "RULE-C": {appliesTo: ["lib/**"]},
  };
  assert.deepEqual(
    selectSourceRules(rules, ["tool/example.mjs"]).map((entry) => entry.id),
    ["RULE-A"],
  );
});

test("check selection comes only from matched skill and source-rule declarations", () => {
  const selection = deriveCheckSelection({
    task: "tooling",
    paths: ["tool/example.mjs"],
    skills: [{
      skill_id: "catch-tooling",
      applies_to: ["tool/**"],
      required_tools: ["source-check", "full-check"],
    }],
    rules: {
      "RULE-A": {appliesTo: ["tool/**"], tools: ["source-check"]},
      "RULE-B": {appliesTo: ["lib/**"], tools: ["unrelated-check"]},
    },
  });
  assert.deepEqual(selection.matchedSkills.map((entry) => entry.skill_id), ["catch-tooling"]);
  assert.deepEqual(selection.matchedRules.map((entry) => entry.id), ["RULE-A"]);
  assert.deepEqual(selection.requests, [
    {id: "source-check", sources: ["rule:RULE-A", "skill:catch-tooling"]},
    {id: "full-check", sources: ["skill:catch-tooling"]},
  ]);
  assert.equal(Object.hasOwn(selection, "mode"), false);
  assert.equal(Object.hasOwn(selection, "matchedRegressions"), false);
});

test("source check plans close dependencies without granting execution authority", () => {
  const plan = resolveCheckPlan({
    manifest,
    requestedChecks: [
      {id: "source-check", sources: ["skill:one"]},
      {id: "source-check", sources: ["rule:two"]},
      {id: "full-check", sources: ["skill:one"]},
    ],
  });
  assert.deepEqual(plan.unresolved, []);
  assert.deepEqual(plan.checks.map((entry) => entry.id), [
    "dependency-check",
    "full-check",
    "source-check",
  ]);
  const source = plan.checks.find((entry) => entry.id === "source-check");
  assert.deepEqual(source.sources, ["dependency:dependency-check", "rule:two", "skill:one"]);
  assert.equal(source.repositoryView, "index");
  assert.equal(source.run, "node tool/run.mjs check source-check");
  const full = plan.checks.find((entry) => entry.id === "full-check");
  assert.equal(full.repositoryView, "full");
  assert.equal(Object.hasOwn(plan, "task"), false);
  assert.equal(Object.hasOwn(plan, "integration"), false);
  assert.equal(Object.hasOwn(plan, "blockers"), false);
});

test("unknown, duplicate, malformed, and non-executable checks stay unresolved", () => {
  const cases = [
    {
      tools: manifest.tools,
      request: "inactive-check",
      expected: "unknown_or_inactive_check:inactive-check",
    },
    {
      tools: [
        {id: "bad", status: "active", path: "tool/a.mjs", checks: ["node tool/a.mjs"]},
        {id: "bad", status: "active", path: "tool/b.mjs", checks: ["node tool/b.mjs"]},
      ],
      request: "bad",
      expected: "duplicate_active_check_id:bad",
    },
    {
      tools: [{id: "bad", status: "active", path: "../bad.mjs", checks: ["node bad.mjs"]}],
      request: "bad",
      expected: "invalid_check_entrypoint:bad",
    },
    {
      tools: [{id: "bad", status: "active", path: "tool/bad.mjs"}],
      request: "bad",
      expected: "check_has_no_executable_commands:bad",
    },
    {
      tools: [{
        id: "bad",
        status: "active",
        path: "tool/bad.mjs",
        checks: ["node tool/bad.mjs"],
        ciRequirements: {repositoryView: "index", setup: []},
      }],
      request: "bad",
      expected: "invalid_ci_requirements:bad",
    },
    {
      tools: [{
        id: "bad",
        status: "active",
        path: "tool/bad.mjs",
        safety: "remote-write-explicit",
        checks: ["node tool/bad.mjs"],
      }],
      request: "bad",
      expected: "check_not_local_readonly:bad",
    },
  ];
  for (const fixture of cases) {
    const plan = resolveCheckPlan({
      manifest: {tools: fixture.tools},
      requestedChecks: [{id: fixture.request, sources: ["fixture"]}],
    });
    assert.ok(plan.unresolved.includes(fixture.expected), JSON.stringify(plan));
    assert.deepEqual(plan.checks, []);
  }
});

test("malformed source inputs fail locally instead of manufacturing guidance", () => {
  assert.throws(() => selectSourceRules([], ["tool"]), /keyed by rule id/u);
  assert.throws(() => resolveCheckPlan({manifest: {}, requestedChecks: []}), /tools array/u);
  assert.throws(() => resolveCheckPlan({
    manifest,
    requestedChecks: [{id: "source-check", sources: "skill:one"}],
  }), /requires string sources/u);
});
