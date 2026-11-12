import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {measureAll} from "../../design/consolidation_gates.mjs";

export const baselinePath = "tool/web/react_consolidation_baseline.json";
const owner = "web_surface_architecture";
const targetPhase = "docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-7--cross-framework-conformance-react";
const measuresByGate = {
  "library.t1_web": "t1WithoutStyledReact",
  "library.priority_t2_web": "priorityWithoutStyledReact",
  "library.headless_controls": "headlessControls",
  "library.cross_framework_parity": "t1WithoutCatalogParity",
  "screens.web_adapters": "webAdapters",
  "screens.web_single_use_shared": "webSingleUseShared",
  "screens.web_page_css_lines": "webPageCssLines",
};
const cssGate = "screens.web_page_css_lines";
const sharedCss = new Set(["website/src/styles/base.css", "website/src/styles/catch-language.css"]);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const sorted = (values) => [...values].sort();
const identityPattern = /^(?:website|admin|packages\/web-ui)\/src\/.+\.tsx::[A-Za-z_$][\w$]*$/u;

/**
 * Shared exports that retiring the old organiser page (CAT-251) left with one
 * consumer, each with the ticket that retires it. The baseline's
 * `strandedByRetirement` record may hold these and only these: it lets them
 * enter the single-use allowance once, then may only shrink, and a name it
 * drops never comes back. Delete this list with the record's last entry.
 */
export const strandedByRetirementCeiling = Object.freeze({
  "screens.web_single_use_shared": Object.freeze({
    "website/src/shared/ui/primitives/feedback.tsx::AuthStatusRow": "CAT-256",
    "website/src/shared/ui/primitives/forms.tsx::ClaimRequestForm": "CAT-256",
    "website/src/shared/ui/primitives/layout.tsx::ContentGrid": "CAT-256",
  }),
});

/**
 * Debt the owner accepted on 11 Nov 2026 so the website could release, each
 * with the issue that pays it down by its due date. The baseline's
 * `acceptedDebt` record may hold these and only these, as
 * "<issue> due <YYYY-MM-DD>". An entry still measured after its due date
 * fails the check; one that is paid down leaves both the gate and the record.
 * Delete this list with the record's last entry.
 */
const acceptedPlan = "#1670 due 2026-11-25";
export const acceptedDebtCeiling = Object.freeze({
  "library.cross_framework_parity": Object.freeze({
    "catch.notice": acceptedPlan,
    "catch.option_card": acceptedPlan,
    "catch.person_avatar": acceptedPlan,
  }),
  "screens.web_adapters": Object.freeze({
    "packages/web-ui/src/components/CatchChoiceInput.tsx::CatchChoiceInput": acceptedPlan,
  }),
  "screens.web_single_use_shared": Object.freeze({
    "website/src/shared/site/EventBookingFrame.tsx::EventBookingFrame": acceptedPlan,
    "website/src/shared/ui/primitives/actions.tsx::ActionGroup": acceptedPlan,
    "website/src/shared/ui/primitives/eventRuntime.tsx::EventRuntimeNoticeStack": acceptedPlan,
  }),
});
const acceptedPlanPattern = /^(#\d+) due (\d{4}-\d{2}-\d{2})$/u;

const sortedBudgets = (budgets) =>
  Object.fromEntries(Object.entries(budgets).sort(([left], [right]) => left.localeCompare(right)));
const newlines = (source) => source.split("\n").length - 1;

/** Match the scorecard's source scope and exact newline count, per file. */
export function pageCssBudgets(root) {
  const result = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(file);
      } else if (file.endsWith(".css") && !sharedCss.has(file)) {
        const count = newlines(fs.readFileSync(path.join(root, file), "utf8"));
        if (count > 0) result[file] = count;
      }
    }
  }
  for (const surface of ["website", "admin"]) walk(`${surface}/src`);
  return sortedBudgets(result);
}

/**
 * Page CSS line counts at the merge base. This is each file's ceiling, with no
 * recorded copy: a merged reduction lowers it and needs no edit from anyone.
 */
export function mergeBaseCssBudgets(root, base) {
  const git = (args) => execFileSync("git", args, {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024});
  const result = {};
  for (const file of git(["ls-tree", "-r", "--name-only", base, "website/src", "admin/src"]).split("\n")) {
    if (!file.endsWith(".css") || sharedCss.has(file) || file.split("/").includes("node_modules")) continue;
    const count = newlines(git(["show", `${base}:${file}`]));
    if (count > 0) result[file] = count;
  }
  return sortedBudgets(result);
}

/** Counts stay canonical; identities prevent replacing old debt with new debt. */
export function consolidationSnapshot({measures, inventory, css}) {
  const gates = {};
  for (const [gate, measure] of Object.entries(measuresByGate)) {
    const canonical = measures[measure];
    if (!canonical || !Number.isInteger(canonical.value)) throw new Error(`${gate}: missing canonical measure`);
    const rows = gate === "screens.web_adapters"
      ? inventory.rows.filter((row) => row.mapping?.kind === "adapter")
      : inventory.rows.filter((row) => row.mapping?.kind === "t4" && row.mapping.move === true);
    const values = gate === cssGate ? css : sorted(canonical.ids ?? rows.map((row) => row.id));
    const count = gate === cssGate ? Object.values(values).reduce((sum, value) => sum + value, 0) : values.length;
    if (count !== canonical.value) throw new Error(`${gate}: source identities disagree with scorecard (${count} != ${canonical.value})`);
    for (const [surface, expected] of Object.entries(canonical.bySurface ?? {})) {
      const actual = gate === cssGate
        ? Object.entries(css).filter(([file]) => file.startsWith(`${surface}/`)).reduce((sum, [, lines]) => sum + lines, 0)
        : rows.filter((row) => row.surface === surface).length;
      if (actual !== expected) throw new Error(`${gate}: ${surface} disagrees with scorecard (${actual} != ${expected})`);
    }
    gates[gate] = values;
  }
  return parseConsolidationBaseline({version: 1, owner, targetPhase, gates});
}

export function parseConsolidationBaseline(document) {
  // The CSS gate is optional: measurements carry it, the recorded file does not,
  // and a merge base from before that change still records it.
  const withoutCss = (gates) => sorted(gates.filter((gate) => gate !== cssGate)).join();
  if (!object(document) || document.version !== 1 || document.owner !== owner || document.targetPhase !== targetPhase ||
      !object(document.gates) || withoutCss(Object.keys(document.gates)) !== withoutCss(Object.keys(measuresByGate))) {
    throw new Error("Invalid React consolidation baseline metadata or gate set");
  }
  for (const [gate, entries] of Object.entries(document.gates)) {
    if (gate === cssGate) {
      if (!object(entries) || Object.entries(entries).some(([file, lines]) =>
        !/^(?:website|admin)\/src\/.+\.css$/u.test(file) || file.split("/").includes("..") || sharedCss.has(file) ||
        !Number.isInteger(lines) || lines <= 0)) throw new Error(`Invalid CSS baseline: ${gate}`);
    } else if (!Array.isArray(entries) || new Set(entries).size !== entries.length || entries.some((id) =>
      typeof id !== "string" || (gate.startsWith("library.") ? !/^catch\.[a-z0-9_.]+$/u.test(id)
        : !identityPattern.test(id) || id.split("/").includes("..")))) {
      throw new Error(`Invalid identity baseline: ${gate}`);
    }
  }
  if (document.strandedByRetirement !== undefined) {
    if (!object(document.strandedByRetirement)) throw new Error("Invalid strandedByRetirement record");
    for (const [gate, record] of Object.entries(document.strandedByRetirement)) {
      const ceiling = strandedByRetirementCeiling[gate];
      if (!ceiling || !object(record)) throw new Error(`Invalid strandedByRetirement gate: ${gate}`);
      for (const [id, ticket] of Object.entries(record)) {
        if (ceiling[id] !== ticket) throw new Error(`strandedByRetirement ${gate}: ${id} is not in the tool's closed list as ${ticket}`);
        if (!document.gates[gate].includes(id)) throw new Error(`strandedByRetirement ${gate}: ${id} is not an allowance`);
      }
    }
  }
  if (document.acceptedDebt !== undefined) {
    if (!object(document.acceptedDebt)) throw new Error("Invalid acceptedDebt record");
    for (const [gate, record] of Object.entries(document.acceptedDebt)) {
      const ceiling = acceptedDebtCeiling[gate];
      if (!ceiling || !object(record)) throw new Error(`Invalid acceptedDebt gate: ${gate}`);
      for (const [id, plan] of Object.entries(record)) {
        if (ceiling[id] !== plan) throw new Error(`acceptedDebt ${gate}: ${id} is not in the tool's closed list as ${plan}`);
        if (!document.gates[gate].includes(id)) throw new Error(`acceptedDebt ${gate}: ${id} is not an allowance`);
      }
    }
  }
  return document;
}

/**
 * Accepted entries are not new debt against the merge base until their due
 * date; one still measured after it is a finding naming its issue.
 */
export function acceptedDifferences(findings, recorded, actual, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const exempt = new Set();
  const expired = [];
  for (const [gate, entries] of Object.entries(recorded?.acceptedDebt ?? {})) {
    for (const [id, plan] of Object.entries(entries)) {
      const [, issue, due] = acceptedPlanPattern.exec(plan) ?? [];
      if (!due) throw new Error(`acceptedDebt ${gate}: ${id} has no issue and due date`);
      exempt.add(`new debt ${gate}: ${id}`);
      if (today > due && actual.gates[gate]?.includes(id)) {
        expired.push(`accepted debt ${gate}: ${id} was due ${due}; pay it down (${issue})`);
      }
    }
  }
  return [...findings.filter((finding) => !exempt.has(finding)), ...expired].sort();
}

/** The record of stranded allowances that are still measured, or none. */
function carryStranded(snapshot, recorded) {
  const record = {};
  for (const [gate, entries] of Object.entries(recorded?.strandedByRetirement ?? {})) {
    record[gate] = Object.fromEntries(Object.entries(entries).filter(([id]) => snapshot.gates[gate].includes(id)).sort());
  }
  const accepted = {};
  for (const [gate, entries] of Object.entries(recorded?.acceptedDebt ?? {})) {
    const kept = Object.fromEntries(Object.entries(entries).filter(([id]) => snapshot.gates[gate].includes(id)).sort());
    if (Object.keys(kept).length) accepted[gate] = kept;
  }
  return parseConsolidationBaseline({...snapshot,
    ...(Object.keys(record).length ? {strandedByRetirement: record} : {}),
    ...(Object.keys(accepted).length ? {acceptedDebt: accepted} : {})});
}

/**
 * A recorded stranded name is not new debt against the merge base, the first
 * time it is recorded or while the merge base still records it. Once the
 * merge base has a record, the record may only shrink.
 */
export function strandedDifferences(findings, proposed, previous) {
  const extra = [];
  const exempt = new Set();
  for (const [gate, entries] of Object.entries(proposed.strandedByRetirement ?? {})) {
    const before = previous.strandedByRetirement?.[gate];
    for (const id of Object.keys(entries)) {
      if (before && !(id in before)) extra.push(`new stranded name ${gate}: ${id}`);
      else exempt.add(`new debt ${gate}: ${id}`);
    }
  }
  return [...findings.filter((finding) => !exempt.has(finding)), ...extra].sort();
}

/** Only growth fails. A budget is a ceiling, so reducing debt always passes. */
export function consolidationDifferences(actual, budget) {
  const findings = [];
  for (const [gate, entries] of Object.entries(actual.gates)) {
    const previous = budget.gates[gate];
    if (gate === cssGate) {
      for (const [file, now] of Object.entries(entries)) {
        const before = previous[file] ?? 0;
        if (now > before) findings.push(`new debt ${gate}: ${file} ${now} exceeds ${before}`);
      }
    } else {
      const allowed = new Set(previous);
      for (const id of entries) if (!allowed.has(id)) findings.push(`new debt ${gate}: ${id}`);
    }
  }
  return findings.sort();
}

/** Recorded identity allowances that are no longer measured; never a failure. */
export function fixedAllowanceCount(actual, recorded) {
  return Object.keys(recorded.gates).filter((gate) => gate !== cssGate).reduce((count, gate) => {
    const current = new Set(actual.gates[gate]);
    return count + recorded.gates[gate].filter((id) => !current.has(id)).length;
  }, 0);
}

function withoutCssGate(document) {
  const {[cssGate]: _css, ...gates} = document.gates;
  return {...document, gates};
}

function mergeBase(root) {
  return execFileSync("git", ["merge-base", "origin/main", "HEAD"], {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
}

export function previousConsolidationBaseline(root, base = mergeBase(root)) {
  const git = (args) => execFileSync("git", args, {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
  return git(["ls-tree", "--name-only", base, baselinePath])
    ? parseConsolidationBaseline(JSON.parse(git(["show", `${base}:${baselinePath}`]))) : null;
}

/** Called only by the existing check; scorecard --json inventory stays read-only. */
export function checkConsolidationRatchet({root, inventory, update = false, now = new Date()}) {
  if (inventory.problems.length) throw new Error("Cannot ratchet an invalid React inventory");
  const definition = JSON.parse(fs.readFileSync(path.join(root, "design/components/consolidation_gates.json"), "utf8"));
  // measureAll asks the adoption tool for --json inventory, which does not
  // invoke this check again. --check --json still enforces the ratchet.
  const actual = consolidationSnapshot({
    measures: measureAll({root, priorityIds: definition.priorityT2}), inventory, css: pageCssBudgets(root),
  });
  const file = path.join(root, baselinePath);
  const recorded = fs.existsSync(file) ? parseConsolidationBaseline(JSON.parse(fs.readFileSync(file, "utf8"))) : null;
  const base = mergeBase(root);
  const previous = previousConsolidationBaseline(root, base);
  if (!update && recorded === null) throw new Error(`Missing ${baselinePath}`);
  const proposed = withoutCssGate(update ? carryStranded(actual, recorded) : recorded);
  const ceiling = recorded ? {gates: {...recorded.gates, [cssGate]: mergeBaseCssBudgets(root, base)}} : null;
  const findings = acceptedDifferences([...new Set([
    ...(previous ? strandedDifferences(consolidationDifferences(proposed, previous), proposed, previous) : []),
    ...(ceiling ? consolidationDifferences(actual, ceiling) : []),
  ])], proposed, actual, now);
  if (update && findings.length === 0) fs.writeFileSync(file, `${JSON.stringify(proposed, null, 2)}\n`);
  return {findings, fixedAllowances: recorded && !update ? fixedAllowanceCount(actual, withoutCssGate(recorded)) : 0,
    counts: Object.fromEntries(Object.entries(actual.gates).map(([gate, entries]) =>
      [gate, gate === cssGate ? Object.values(entries).reduce((sum, count) => sum + count, 0) : entries.length]))};
}
