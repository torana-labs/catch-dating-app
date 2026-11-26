// One open issue per title, even when runs write in parallel (release
// engineer, 26 Nov 2026). The Main CI alert runs once per CI run, and those
// runs no longer queue behind each other (a newer pending run used to replace
// an older one, which lost alerts), so two of them can open the same issue at
// once. openIssueOnce looks for an open issue with the title first, and after
// opening one lists again: if more than one is open, the lowest-numbered
// stays, and each other is closed as its duplicate with its content moved
// into a comment on the one kept.
//
// The issue functions take an `api` (githubIssueApi in production, a fake in
// tests) so every race is testable.
import assert from "node:assert/strict";

const MOVED_MARKER = /<!-- moved-duplicate (\d+) -->/gu;

/** Open issues (not pull requests) with this title, lowest number first. */
export function openWithTitle(issues, title) {
  return issues.filter((issue) => issue.title === title && !issue.pull_request && (issue.state ?? "open") === "open")
    .sort((left, right) => left.number - right.number);
}

/** The issue to act on: the lowest-numbered open issue with this title, or null. */
export const oldestOpen = (issues, title) => openWithTitle(issues, title)[0] ?? null;

/** Duplicate numbers whose content a comment among `texts` already carries. */
export function movedDuplicates(texts) {
  const moved = new Set();
  for (const text of texts) for (const match of String(text ?? "").matchAll(MOVED_MARKER)) moved.add(Number(match[1]));
  return moved;
}

/** The comment on the kept issue that carries a duplicate's body and comments. */
export function movedComment(duplicate, texts) {
  const [body, ...comments] = texts;
  return [
    `#${duplicate.number} was opened by a parallel run and closed as a duplicate of this issue. Its content:`,
    "",
    String(body ?? "").trim() || "_(empty body)_",
    ...comments.flatMap((comment) => ["", "---", "", String(comment ?? "").trim()]),
  ].join("\n") + `\n<!-- moved-duplicate ${duplicate.number} -->`;
}

/**
 * Closes every open issue with `title` but the lowest-numbered one, moving
 * each one's content into a comment on the one kept. A duplicate already
 * closed, or whose content the kept issue already carries, is not moved twice.
 *
 * @returns {{keep: object|null, closed: number[]}}
 */
export function settleDuplicates(api, title) {
  const [keep, ...duplicates] = openWithTitle(api.listOpen(), title);
  const closed = [];
  if (!keep) return {keep: null, closed};
  const moved = movedDuplicates(api.texts(keep));
  for (const duplicate of duplicates) {
    if (api.get(duplicate.number).state !== "open") continue;
    if (!moved.has(duplicate.number)) api.comment(keep.number, movedComment(duplicate, api.texts(duplicate)));
    api.comment(duplicate.number, `Duplicate of #${keep.number}, which a parallel run opened first; its content is there now.`);
    api.close(duplicate.number, "not_planned");
    closed.push(duplicate.number);
  }
  return {keep, closed};
}

/**
 * Opens an issue unless one with the title is open, then settles duplicates.
 * An issue already open gets `body` as a comment instead (with `labels`), or
 * whatever `onExisting(number)` does.
 *
 * @returns {{number:number, created:boolean, closed:number[]}} The issue that
 *   stays open and whether this call opened it.
 */
export function openIssueOnce(api, {title, body, labels = [], onExisting = null}) {
  assert.ok(title, "openIssueOnce needs a title");
  const existing = oldestOpen(api.listOpen(), title);
  if (existing) {
    if (onExisting) onExisting(existing.number);
    else {
      api.comment(existing.number, body);
      if (labels.length) api.label(existing.number, labels);
    }
    return {number: existing.number, created: false, closed: []};
  }
  const created = api.create({title, body, labels});
  const {keep, closed} = settleDuplicates(api, title);
  return {number: keep?.number ?? created.number, created: (keep?.number ?? created.number) === created.number, closed};
}

/**
 * The issue api over `gh` for one repository, limited to the issues the
 * Actions bot opened.
 *
 * @param {(args: string[], input?: string) => string} gh Runs gh and returns stdout.
 */
export function githubIssueApi(gh, repository) {
  return {
    listOpen: () => JSON.parse(gh(["api", "-H", "Cache-Control: no-cache",
      `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`])),
    get: (number) => JSON.parse(gh(["api", "-H", "Cache-Control: no-cache", `repos/${repository}/issues/${number}`])),
    texts: (issue) => [issue.body, ...JSON.parse(gh(["api", "--paginate", "--slurp",
      `repos/${repository}/issues/${issue.number}/comments?per_page=100`])).flat().map((comment) => comment.body)],
    create: ({title, body, labels = []}) => JSON.parse(gh(["api", "-X", "POST", `repos/${repository}/issues`,
      "-f", `title=${title}`, "-F", "body=@-", ...labels.flatMap((label) => ["-f", `labels[]=${label}`])], body)),
    comment: (number, body) => gh(["api", "-X", "POST", `repos/${repository}/issues/${number}/comments`, "-F", "body=@-"], body),
    label: (number, labels) => gh(["api", "-X", "POST", `repos/${repository}/issues/${number}/labels`,
      ...labels.flatMap((label) => ["-f", `labels[]=${label}`])]),
    update: (number, body) => gh(["api", "-X", "PATCH", `repos/${repository}/issues/${number}`, "-F", "body=@-"], body),
    close: (number, reason = "completed") => gh(["api", "-X", "PATCH", `repos/${repository}/issues/${number}`,
      "-f", "state=closed", "-f", `state_reason=${reason}`]),
  };
}

/**
 * An in-memory issue api for tests. `between` runs once before each call, so
 * a test can interleave another run's writes at any point.
 */
export function fakeIssueApi({issues = [], between = () => {}} = {}) {
  const state = {issues: issues.map((issue) => ({comments: [], labels: [], state: "open", ...issue})), log: []};
  let next = Math.max(0, ...state.issues.map((issue) => issue.number)) + 1;
  const find = (number) => state.issues.find((issue) => issue.number === number);
  const step = (name, fn) => (...args) => {
    between(name, ...args);
    state.log.push([name, ...args.map((arg) => (typeof arg === "object" && arg?.number ? arg.number : arg))]);
    return fn(...args);
  };
  const api = {
    listOpen: step("listOpen", () => state.issues.filter((issue) => issue.state === "open").map((issue) => ({...issue}))
      .sort((left, right) => right.number - left.number)),
    get: step("get", (number) => ({...find(number)})),
    texts: step("texts", (issue) => [find(issue.number).body, ...find(issue.number).comments]),
    create: step("create", ({title, body, labels = []}) => {
      const issue = {number: next++, title, body, labels: [...labels], comments: [], state: "open"};
      state.issues.push(issue);
      return {...issue};
    }),
    comment: step("comment", (number, body) => {
      find(number).comments.push(body);
    }),
    label: step("label", (number, labels) => {
      find(number).labels.push(...labels);
    }),
    update: step("update", (number, body) => {
      find(number).body = body;
    }),
    close: step("close", (number, reason = "completed") => {
      Object.assign(find(number), {state: "closed", stateReason: reason});
    }),
  };
  return {api, state};
}

// A close racing an open settles to the state of the latest head run. Two
// alert runs read the issue, then write it: an older red run can open the
// issue after a newer green run found nothing to close, and an older green run
// can close it after a newer red run commented. So after writing, each run
// looks for a newer completed CI run of main. Once that run's own alert run has
// finished (it will not write again), this run applies that run's decision as
// well, limited to opening or closing, so the issue ends in the head run's
// state. A head alert run still queued reads the issue after this write, so
// nothing is needed; one running is waited for.

/**
 * The newest completed CI run of main that `counts` (a push or a nightly) and
 * that started after `run`, or null when `run` is the latest.
 */
export function newerHeadRun({run, runs, counts}) {
  const started = (candidate) => Date.parse(candidate.created_at);
  const head = runs.filter((candidate) => candidate.head_branch === "main" && candidate.status === "completed" &&
    counts(candidate) && candidate.id !== run.id && started(candidate) > started(run))
    .sort((left, right) => started(right) - started(left) || right.id - left.id)[0];
  return head ?? null;
}

/**
 * Where the head run's own alert stands: `settle` once an alert run titled
 * for it finished, `wait` while one runs, else `pending` (none started yet,
 * so it reads the issue after this run's write).
 */
export function headAlertState(alertRuns, title) {
  const runs = alertRuns.filter((candidate) => candidate.display_title === title);
  if (runs.some((candidate) => candidate.status === "in_progress")) return "wait";
  if (runs.some((candidate) => candidate.status === "completed")) return "settle";
  return "pending";
}

/**
 * After this run's own write: finds a newer head run, waits (up to `attempts`
 * polls) while its alert run is still running, and once it finished calls
 * `settle(head)`.
 *
 * @returns {{status: "latest"|"pending"|"timed_out"|"settled", head?: number}}
 */
export function settleToHead({run, listRuns, listAlertRuns, counts, alertTitle, settle, sleep, attempts = 12}) {
  const head = newerHeadRun({run, runs: listRuns(), counts});
  if (!head) return {status: "latest"};
  let state = headAlertState(listAlertRuns(), alertTitle(head.id));
  for (let attempt = 0; state === "wait" && attempt < attempts; attempt += 1) {
    sleep();
    state = headAlertState(listAlertRuns(), alertTitle(head.id));
  }
  if (state === "pending") return {status: "pending", head: head.id};
  if (state === "wait") return {status: "timed_out", head: head.id};
  settle(head);
  return {status: "settled", head: head.id};
}

/** Blocks for `ms` milliseconds (the alert scripts are synchronous). */
export const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
