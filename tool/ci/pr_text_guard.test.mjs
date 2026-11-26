import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {loadAllowlist} from "../check_third_party_names.mjs";
import {guardText, mentionsIn, ownCommitMessages, withoutCode} from "./pr_text_guard.mjs";

const allowlist = loadAllowlist();
const collaborators = new Set(["octo-maintainer"]);
const isCollaborator = async (login) => (login === "unreachable" ? null : collaborators.has(login));
const guard = (sections) => guardText({sections, owner: "torana-labs", isCollaborator, allowlist});

// "kestrelpointrunners" stands in for a real organiser's account.
test("a planted mention of an outside account and a real-looking social URL fail", async () => {
  const findings = await guard([
    {label: "title", text: "Approve the listing for @kestrelpointrunners"},
    {label: "body", text: "Summary\n\nSource: https://www.instagram.com/kestrelpointrunners/\nThanks @octo-maintainer"},
    {label: "commit 0123456789", text: "Fix intake\n\ncc @unreachable"},
  ]);
  assert.deepEqual(findings, [
    "title line 1: @-mentions an account that is not a collaborator",
    "body line 3: names a social account that is not on the fictional allowlist",
    "commit 0123456789 line 3: @-mentions an account whose collaborator status could not be checked",
  ]);
  assert.ok(findings.every((finding) => !finding.includes("kestrel")), "findings never repeat the matched text");
});

test("collaborators, bots, own-org teams, code, comments and e-mail addresses pass", async () => {
  const body = [
    "<!-- Template: no bare @name -->",
    "Ping @octo-maintainer and @torana-labs/catch-maintainers; @dependabot rebase.",
    "The parser reads `@moonmoth.example` and `@kestrelpointrunners` in code spans.",
    "```",
    "parseNominationMessage(\"@kestrelpointrunners\")",
    "```",
    "<code>@​someone</code> and actions/checkout@v6 and hello@kestrelpoint.in",
    "Fixtures use https://lu.ma/moonmoth and https://instagram.com/brindle.example.",
    "",
    "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
  ].join("\n");
  assert.deepEqual(await guard([{label: "body", text: body}]), []);
});

test("a bot's noreply address in a trailer is not a mention", async () => {
  const trailer = "Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>\n" +
    "Signed-off-by: dependabot[bot] <support@github.com>";
  assert.deepEqual(mentionsIn(trailer), []);
  assert.deepEqual(await guard([{label: "commit 0123456789", text: trailer}]), []);
});

test("only the pull request's own commits are read, compared with the base branch by name", async () => {
  const urls = [];
  const pages = [
    Array.from({length: 100}, (_, index) => ({sha: `a${index}`.padEnd(40, "0"), commit: {message: `own ${index}`}})),
    [{sha: "b".repeat(40), commit: {message: "last own commit"}}],
  ];
  const messages = await ownCommitMessages({api: "https://api.example.test", repo: "torana-labs/catch-dating-app",
    base: "main", head: "c".repeat(40), token: "t",
    fetchJson: async (url) => {
      urls.push(url);
      return {ok: true, status: 200, json: async () => ({commits: pages[urls.length - 1] ?? []})};
    }});
  assert.equal(messages.length, 101);
  assert.equal(messages.at(-1).message, "last own commit");
  assert.deepEqual(urls.map((url) => new URL(url).pathname),
    Array(2).fill(`/repos/torana-labs/catch-dating-app/compare/main...${"c".repeat(40)}`));
  assert.deepEqual(urls.map((url) => new URL(url).searchParams.get("page")), ["1", "2"]);
  await assert.rejects(ownCommitMessages({api: "https://api.example.test", repo: "o/r", base: "main", head: "h",
    token: "t", fetchJson: async () => ({ok: false, status: 404, json: async () => ({})})}), /HTTP 404/u);
});

test("teams outside the organisation fail", async () => {
  assert.deepEqual(await guard([{label: "body", text: "cc @other-org/team"}]),
    ["body line 1: mentions a team outside this organisation"]);
});

test("code stripping keeps line numbers", () => {
  const text = "a\n```\n@x\n```\n@kestrel `@y`";
  assert.equal(withoutCode(text).split("\n").length, 5);
  assert.deepEqual(mentionsIn(text), [{line: 5, login: "kestrel", team: null}]);
});

test("the workflow is keyless, read-only and runs only the base commit's guard", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/pr-text-guard.yml", import.meta.url), "utf8")
    .split("\n").filter((line) => !/^\s*#/u.test(line)).join("\n");
  assert.match(workflow, /^on:\n {2}pull_request:\n {4}types: \[opened, edited, synchronize, reopened\]$/mu);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\./u);
  assert.match(workflow, /^permissions:\n {2}contents: read\n {2}pull-requests: read\n\n/mu);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/u);
  assert.match(workflow, /persist-credentials: false/u);
  // No PR-controlled text is interpolated into a shell command.
  assert.doesNotMatch(workflow, /\$\{\{\s*github\.event\.pull_request\.(?:title|body|head)/u);
  for (const use of workflow.matchAll(/uses: (\S+)/gu)) assert.match(use[1], /@[0-9a-f]{40}$/u, `${use[1]} is pinned`);
});
