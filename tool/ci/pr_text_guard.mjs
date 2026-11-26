#!/usr/bin/env node
// Fails a pull request whose title, body or commit messages @-mention an
// account that is not a collaborator, or name a social account (Instagram,
// Facebook, Luma, Meetup) outside the fictional allowlist. A bare @name in
// GitHub text notifies that account, and this repository is public: real
// organisers live only in the production database.
//
// The workflow runs this file from the base commit with the pull_request
// event's read-only token. It reads the event payload and the GitHub API only,
// never the pull request's code, and needs no secret. Findings name the place
// (title, body line, commit and line), never the matched text, because the
// run log is public.
//
//   GITHUB_EVENT_PATH=event.json GITHUB_TOKEN=... node tool/ci/pr_text_guard.mjs
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadAllowlist, scanText} from "../check_third_party_names.mjs";

// Apps whose mentions run commands rather than notify a person.
export const allowedBots = new Set(["dependabot", "github-actions", "copilot"]);

// GitHub logins: letters, digits and single hyphens, at most 39 characters,
// optionally followed by /team. An address like name@example.com is not one.
// The look-behind also skips `]` and `+`, which come before `@` in a bot's
// noreply address (`name[bot]@users.noreply.github.com`).
const mention = /(?<![\w`@./+\]-])@([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})(\/[A-Za-z0-9_.-]+)?(?![\w@-])/gu;

// Code, quoted HTML code and comments never notify anyone.
export function withoutCode(text) {
  return String(text ?? "")
    .replace(/<!--[\s\S]*?-->/gu, (block) => block.replace(/[^\n]/gu, " "))
    .replace(/^(\s*)(```|~~~)[\s\S]*?^\s*\2/gmu, (block) => block.replace(/[^\n]/gu, " "))
    .replace(/<code>[\s\S]*?<\/code>/giu, (block) => block.replace(/[^\n]/gu, " "))
    .replace(/(`+)[^`\n]*?\1/gu, (span) => " ".repeat(span.length));
}

export function mentionsIn(text) {
  const found = [];
  withoutCode(text).split("\n").forEach((line, index) => {
    for (const match of line.matchAll(mention)) {
      found.push({line: index + 1, login: match[1].toLowerCase(), team: match[2] ? match[2].slice(1) : null});
    }
  });
  return found;
}

export function socialFindingsIn(text, allowlist) {
  // A non-data file name: only social URLs are judged; @-mentions are checked
  // against collaborators instead.
  return scanText("pull-request.txt", withoutCode(text), allowlist).map(({line}) => line);
}

/**
 * @param {{sections: Array<{label: string, text: string}>, owner: string,
 *   isCollaborator: (login: string) => Promise<boolean | null>, allowlist: object}} input
 * @returns {Promise<string[]>} findings without the matched text
 */
export async function guardText({sections, owner, isCollaborator, allowlist}) {
  const findings = [];
  const verdicts = new Map();
  for (const {label, text} of sections) {
    for (const line of socialFindingsIn(text, allowlist)) {
      findings.push(`${label} line ${line}: names a social account that is not on the fictional allowlist`);
    }
    for (const {line, login, team} of mentionsIn(text)) {
      if (team !== null) {
        if (login !== owner.toLowerCase()) findings.push(`${label} line ${line}: mentions a team outside this organisation`);
        continue;
      }
      if (allowedBots.has(login)) continue;
      if (!verdicts.has(login)) verdicts.set(login, await isCollaborator(login));
      const verdict = verdicts.get(login);
      if (verdict === true) continue;
      findings.push(`${label} line ${line}: ` + (verdict === false ?
        "@-mentions an account that is not a collaborator" :
        "@-mentions an account whose collaborator status could not be checked"));
    }
  }
  return findings;
}

async function github(url, token) {
  return fetch(url, {headers: {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "pr-text-guard",
  }});
}

/**
 * The pull request's own commits: those on its head that the base branch does
 * not have now. The pulls/{n}/commits list compares with the base SHA GitHub
 * recorded for the pull request, which can be older than the branch's tip, so
 * after the author merges main it also lists main's commits, other people's
 * text the guard has no business re-judging (25 Nov 2026: two Dependabot bump
 * commits failed every pull request that merged main). Comparing with the
 * base branch by name leaves only what this pull request adds.
 * @param {{api: string, repo: string, base: string, head: string, token: string,
 *   fetchJson?: (url: string) => Promise<{ok: boolean, status: number, json: () => Promise<any>}>}} input
 * @returns {Promise<Array<{sha: string, message: string}>>}
 */
export async function ownCommitMessages({api, repo, base, head, token,
  fetchJson = (url) => github(url, token)}) {
  const messages = [];
  const range = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  for (let page = 1; page <= 3; page += 1) {
    const response = await fetchJson(`${api}/repos/${repo}/compare/${range}?per_page=100&page=${page}`);
    if (!response.ok) throw new Error(`Comparing the pull request with its base branch failed with HTTP ${response.status}.`);
    const commits = (await response.json()).commits ?? [];
    messages.push(...commits.map((commit) => ({sha: commit.sha, message: commit.commit?.message ?? ""})));
    if (commits.length < 100) break;
  }
  return messages;
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  if (!pr) {
    console.log("Not a pull request event; nothing to check.");
    return;
  }
  const repo = process.env.GITHUB_REPOSITORY;
  const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const token = process.env.GITHUB_TOKEN;
  const [owner] = repo.split("/");
  const commits = await ownCommitMessages({api, repo, base: pr.base.ref, head: pr.head.sha, token});
  const sections = [
    {label: "title", text: pr.title ?? ""},
    {label: "body", text: pr.body ?? ""},
    ...commits.map(({sha, message}) => ({label: `commit ${sha.slice(0, 9)}`, text: message})),
  ];
  const author = String(pr.user?.login ?? "").toLowerCase();
  const isCollaborator = async (login) => {
    if (login === author && pr.author_association && pr.author_association !== "NONE" &&
      pr.author_association !== "FIRST_TIMER" && pr.author_association !== "FIRST_TIME_CONTRIBUTOR") return true;
    const response = await github(`${api}/repos/${repo}/collaborators/${encodeURIComponent(login)}`, token);
    if (response.status === 204) return true;
    if (response.status === 404) return false;
    return null;
  };
  const findings = await guardText({sections, owner, isCollaborator, allowlist: loadAllowlist()});
  if (findings.length === 0) {
    console.log("The title, body and commit messages mention no outside account or social page.");
    return;
  }
  const report = [
    ...findings,
    "",
    "Real organisers live only in the production database. Describe one generically or by a case id,",
    "put code, handles and placeholders in backticks, and @-mention only collaborators you mean to notify.",
    "Edit the title or body to rerun this check; reword a commit message with a new commit or on merge.",
    "A notification already sent cannot be withdrawn.",
  ];
  console.error(report.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## PR text guard\n\n${report.map((line) => line ? `- ${line}` : "").join("\n")}\n`);
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
