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

/** Match the scorecard's source scope and exact newline count, per file. */
export function pageCssBudgets(root) {
  const result = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(file);
      } else if (file.endsWith(".css") && !sharedCss.has(file)) {
        const count = fs.readFileSync(path.join(root, file), "utf8").split("\n").length - 1;
        if (count > 0) result[file] = count;
      }
    }
  }
  for (const surface of ["website", "admin"]) walk(`${surface}/src`);
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
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
  if (!object(document) || document.version !== 1 || document.owner !== owner || document.targetPhase !== targetPhase ||
      !object(document.gates) || sorted(Object.keys(document.gates)).join() !== sorted(Object.keys(measuresByGate)).join()) {
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
  return document;
}

/** The record of stranded allowances that are still measured, or none. */
function carryStranded(snapshot, recorded) {
  const record = {};
  for (const [gate, entries] of Object.entries(recorded?.strandedByRetirement ?? {})) {
    record[gate] = Object.fromEntries(Object.entries(entries).filter(([id]) => snapshot.gates[gate].includes(id)).sort());
  }
  return Object.keys(record).length ? parseConsolidationBaseline({...snapshot, strandedByRetirement: record}) : snapshot;
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

/** Growth is illegal; a fixed allowance must also disappear on ordinary checks. */
export function consolidationDifferences(actual, budget, {freshness = true} = {}) {
  const findings = [];
  for (const [gate, entries] of Object.entries(actual.gates)) {
    const previous = budget.gates[gate];
    if (gate === cssGate) {
      for (const file of new Set([...Object.keys(entries), ...Object.keys(previous)])) {
        const now = entries[file] ?? 0;
        const before = previous[file] ?? 0;
        if (now > before) findings.push(`new debt ${gate}: ${file} ${now} exceeds ${before}`);
        else if (freshness && now < before) findings.push(`stale allowance ${gate}: ${file} ${before} -> ${now}`);
      }
    } else {
      const current = new Set(entries);
      const allowed = new Set(previous);
      for (const id of current) if (!allowed.has(id)) findings.push(`new debt ${gate}: ${id}`);
      if (freshness) for (const id of allowed) if (!current.has(id)) findings.push(`stale allowance ${gate}: ${id}`);
    }
  }
  return findings.sort();
}

export function previousConsolidationBaseline(root) {
  const git = (args) => execFileSync("git", args, {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
  const base = git(["merge-base", "origin/main", "HEAD"]);
  return git(["ls-tree", "--name-only", base, baselinePath])
    ? parseConsolidationBaseline(JSON.parse(git(["show", `${base}:${baselinePath}`]))) : null;
}

/** Called only by the existing check; scorecard --json inventory stays read-only. */
export function checkConsolidationRatchet({root, inventory, update = false}) {
  if (inventory.problems.length) throw new Error("Cannot ratchet an invalid React inventory");
  const definition = JSON.parse(fs.readFileSync(path.join(root, "design/components/consolidation_gates.json"), "utf8"));
  // measureAll asks the adoption tool for --json inventory, which does not
  // invoke this check again. --check --json still enforces the ratchet.
  const actual = consolidationSnapshot({
    measures: measureAll({root, priorityIds: definition.priorityT2}), inventory, css: pageCssBudgets(root),
  });
  const file = path.join(root, baselinePath);
  const recorded = fs.existsSync(file) ? parseConsolidationBaseline(JSON.parse(fs.readFileSync(file, "utf8"))) : null;
  const previous = previousConsolidationBaseline(root);
  if (!update && recorded === null) throw new Error(`Missing ${baselinePath}`);
  const proposed = update ? carryStranded(actual, recorded) : recorded;
  const findings = [...new Set([
    ...(previous ? strandedDifferences(consolidationDifferences(proposed, previous, {freshness: false}), proposed, previous) : []),
    ...(update ? recorded ? consolidationDifferences(actual, recorded, {freshness: false}) : []
      : consolidationDifferences(actual, recorded)),
  ])];
  if (update && findings.length === 0) fs.writeFileSync(file, `${JSON.stringify(proposed, null, 2)}\n`);
  return {findings, counts: Object.fromEntries(Object.entries(actual.gates).map(([gate, entries]) =>
    [gate, gate === cssGate ? Object.values(entries).reduce((sum, count) => sum + count, 0) : entries.length]))};
}
