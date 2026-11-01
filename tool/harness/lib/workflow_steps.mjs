/**
 * Derive local shell checks from the repository's canonical Actions syntax.
 * This is deliberately not a YAML executor: unfamiliar structure or effective
 * context stays an explicit hosted-CI obligation, never a guessed command.
 */
import {matchesCodegenInput, matchesGlob, validateComponentGraph} from "./component_graph.mjs";

const GITHUB_COUPLED = /\$\{\{|\$GITHUB_|GITHUB_OUTPUT|GITHUB_ENV|GITHUB_STEP_SUMMARY/;

// Only structural lines participate in scope discovery. Block scalar contents
// are opaque, including shell comments and strings that look like YAML keys.
function workflowStructure(source) {
  const lines = source.split("\n");
  const rows = [];
  let blockIndent = null;
  for (const [index, line] of lines.entries()) {
    const indent = /^ */u.exec(line)[0].length;
    if (blockIndent !== null && (!line.trim() || indent > blockIndent)) continue;
    blockIndent = null;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const text = line.slice(indent).replace(/\s+#.*$/u, "").trimEnd();
    rows.push({indent, text, line: index + 1});
    if (/^(?:- )?[\w-]+:\s*[|>]/u.test(text)) blockIndent = indent + (text.startsWith("- ") ? 2 : 0);
  }
  const unusualRoot = rows.find(row => row.indent === 0 && !/^[\w-]+:/u.test(row.text));
  const start = rows.findIndex(row => row.indent === 0 && row.text === "jobs:");
  const unsupported = reason => ({lines, jobs: [], reason});
  if (unusualRoot) return unsupported(`unsupported workflow field at line ${unusualRoot.line}`);
  if (start < 0) return unsupported("unsupported or missing jobs mapping");
  const end = rows.findIndex((row, index) => index > start && row.indent === 0);
  const jobRows = rows.slice(start + 1, end < 0 ? undefined : end);
  const jobs = [];
  let job;
  for (const row of jobRows) {
    if (row.indent <= 2) {
      if (row.indent !== 2 || !/^[\w-]+:$/u.test(row.text)) {
        return unsupported(`unsupported job structure at line ${row.line}`);
      }
      job = {name: row.text.slice(0, -1), line: row.line, rows: []};
      jobs.push(job);
    } else if (!job) {
      return unsupported(`unsupported job indentation at line ${row.line}`);
    } else job.rows.push(row);
  }
  if (!jobs.length) return unsupported("unsupported or empty jobs mapping");
  for (const [index, job] of jobs.entries()) {
    job.endLine = jobs[index + 1]?.line ?? (end < 0 ? lines.length + 1 : rows[end].line);
  }
  const inherited = rows.some(row => row.indent === 0 && /^(env|defaults):/u.test(row.text));
  return {lines, jobs, inherited};
}

function skipped(reason, job, line) {
  return {name: `(unsupported ${job ?? "workflow"})`, job, line, run: null,
    uses: null, if: null, workingDirectory: ".", runnable: false, skipReason: reason};
}

function jobFields(job) {
  const fields = job.rows.filter(row => row.indent === 4);
  const keys = new Set(["name", "needs", "if", "runs-on", "permissions", "environment",
    "concurrency", "outputs", "env", "defaults", "steps", "timeout-minutes", "strategy",
    "continue-on-error", "container", "services", "uses", "with", "secrets"]);
  if (job.rows.length && job.rows[0].indent !== 4 ||
      job.rows.some(row => row.indent < 4) ||
      fields.some(row => !keys.has(row.text.split(":")[0])) ||
      fields.filter(row => row.text.startsWith("steps:")).length > 1 ||
      fields.some(row => row.text.startsWith("steps:") && row.text !== "steps:")) return null;
  return fields;
}

export function extractSteps(source) {
  const {lines, jobs, inherited, reason} = workflowStructure(source);
  if (reason) return [skipped(reason)];
  return jobs.flatMap(job => {
    const fields = jobFields(job);
    if (!fields) return [skipped("unsupported job fields or steps structure", job.name, job.line)];
    const steps = fields.filter(row => row.text === "steps:");
    if (!steps.length) return [];
    const start = job.rows.indexOf(steps[0]);
    const end = job.rows.findIndex((row, index) => index > start && row.indent <= 4);
    const rows = job.rows.slice(start + 1, end < 0 ? undefined : end);
    const headers = rows.filter(row => row.indent === 6 && row.text.startsWith("- "));
    if (!headers.length || rows.some(row => row.indent < 6 ||
      row.indent === 6 && !row.text.startsWith("- "))) {
      return [skipped("unsupported step indentation or sequence", job.name, steps[0].line)];
    }
    const context = [
      ...(inherited ? ["workflow env/defaults"] : []),
      ...fields.filter(row => /^(env|defaults|container|services|strategy|if):/u.test(row.text))
        .map(row => `job ${row.text.split(":")[0]}`),
    ];
    return headers.map((header, index) => {
      const nextLine = headers[index + 1]?.line ??
        (end < 0 ? job.endLine : job.rows[end].line);
      const stepRows = rows.filter(row => row.line >= header.line && row.line < nextLine);
      const step = {name: "(unnamed)", job: job.name, line: header.line,
        run: null, uses: null, if: null, workingDirectory: ".", skipReason: null};
      const keys = new Set();
      for (const [position, row] of stepRows.entries()) {
        const text = position === 0 ? row.text.slice(2) : row.text;
        if (position > 0 && row.indent > 8) continue;
        const match = /^([\w-]+):(?:\s+(.*))?$/u.exec(text);
        if (!match || position > 0 && row.indent !== 8 || keys.has(match?.[1])) {
          step.skipReason = "unsupported step fields or indentation";
          continue;
        }
        const [, key, value = ""] = match;
        keys.add(key);
        const following = stepRows.slice(position + 1).find(item => item.indent <= 8);
        const body = lines.slice(row.line, (following?.line ?? nextLine) - 1);
        if (key === "run") {
          if (/^[|>]/u.test(value)) {
            if (!/^[|>]-?$/u.test(value)) {
              step.skipReason = `unsupported run block style (${value})`;
              continue;
            }
            const boundary = body.findIndex(line => line.trim() && /^ */u.exec(line)[0].length <= 8);
            const payload = boundary < 0 ? body : body.slice(0, boundary);
            const present = payload.filter(line => line.trim());
            const indent = present.length ? Math.min(...present.map(line => /^ */u.exec(line)[0].length)) : 0;
            if (value.startsWith(">") && present.some(line => /^ */u.exec(line)[0].length !== indent)) {
              step.skipReason = "unsupported more-indented folded run scalar";
              continue;
            }
            const text = payload.map(line => line.trim() ? line.slice(indent) : "").join("\n").trimEnd();
            // Fold one line break to a space and each additional break to a
            // newline. Literal payloads (including comments) remain untouched.
            step.run = value.startsWith(">") ? text.replace(/\n+/gu, breaks =>
              breaks.length === 1 ? " " : "\n".repeat(breaks.length - 1)) : text;
          } else if (/^["'&*!\[{]/u.test(value) || body.some(line => line.trim() && !line.trimStart().startsWith("#"))) {
            step.skipReason = "unsupported quoted, tagged, aliased, or multiline run scalar";
          } else step.run = value;
        } else if (key === "name") step.name = value.replace(/^["']|["']$/gu, "");
        else if (key === "working-directory") {
          if (!/^[\w./-]+$/u.test(value) || body.some(line => line.trim() && !line.trimStart().startsWith("#"))) step.skipReason = "unsupported working-directory scalar";
          else step.workingDirectory = value;
        } else if (key === "uses") step.uses = value;
        else if (key === "if") {
          // Policy tests inspect conditions even when local execution is
          // intentionally deferred. Preserve the declared metadata.
          step.if = value;
          step.skipReason = "requires an explicit environment, condition, or non-bash shell";
        } else if (key === "env" || key === "shell" && (value !== "bash" || body.some(line => line.trim() && !line.trimStart().startsWith("#")))) {
          step.skipReason = "requires an explicit environment, condition, or non-bash shell";
        }
      }
      const raw = lines.slice(header.line - 1, nextLine - 1).join("\n");
      if (!step.skipReason && !step.run) step.skipReason = step.uses ? `composite action (${step.uses})` : "no run block";
      if (step.run && GITHUB_COUPLED.test(raw)) step.skipReason = "references GitHub Actions runtime context";
      if (context.length && step.run) step.skipReason = `requires inherited execution context (${context.join(", ")})`;
      step.runnable = step.skipReason === null;
      return step;
    });
  });
}

/** Only a job's own planner predicate assigns ownership, never its inputs. */
export function deriveTargetWorkflows(orchestrator) {
  const {lines, jobs, reason} = workflowStructure(orchestrator);
  if (reason) throw new Error(`Cannot derive workflow ownership: ${reason}`);
  const mapping = new Map();
  for (const job of jobs) {
    const fields = jobFields(job);
    if (!fields) throw new Error(`Unsupported ownership job fields at ${job.name}:${job.line}`);
    const condition = fields.find(row => row.text.startsWith("if:"));
    if (!condition) continue;
    const next = fields.find(row => row.line > condition.line);
    const predicate = lines.slice(condition.line - 1,
      (next?.line ?? job.endLine) - 1)
      .map(line => line.replace(/\s+#.*$/u, "")).join("\n");
    const uses = fields.map(row => /^uses:\s*\.\/\.github\/workflows\/([\w.-]+\.yml)$/u.exec(row.text)).find(Boolean);
    const workflow = uses ? uses[1] : fields.some(row => row.text === "steps:") ? "ci.yml" : null;
    if (!workflow) continue;
    // Canonical planner flags are compared with the literal string 'true'.
    // Keep quoted expression strings opaque so format/contains payloads and
    // retry identity comparisons cannot become selectable target names.
    const tokens = predicate.match(/'(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_.]*|==|!=|\S/gu) ?? [];
    if (tokens.some(token => token === "'" || token === '"')) {
      throw new Error(`Unsupported ownership predicate string at ${job.name}:${condition.line}`);
    }
    for (const [index, token] of tokens.entries()) {
      const target = /^needs\.plan\.outputs\.([a-z0-9_]+)$/u.exec(token)?.[1];
      if (!target || tokens[index + 1] !== "==" || tokens[index + 2] !== "'true'") continue;
      const workflows = mapping.get(target) ?? [];
      if (!workflows.includes(workflow)) workflows.push(workflow);
      mapping.set(target, workflows);
    }
  }
  return mapping;
}

/**
 * Resolve a harness ciTarget to its workflow file(s).
 *
 * Callers must treat an unresolved target as a failure rather than as "nothing
 * to run" — an unmapped target means the harness graph and CI have diverged,
 * which is exactly the drift this module exists to catch.
 */
export function workflowForTarget(target, availableFiles, derived) {
  const fromCi = derived?.get(target)?.filter((f) => availableFiles.includes(f)) ?? [];
  if (fromCi.length > 0) return fromCi;
  const conventional = [
    `${target.replace(/_/g, "-")}-ci.yml`,
    `${target.replace(/_/g, "-")}.yml`,
  ].find((file) => availableFiles.includes(file));
  return conventional ? [conventional] : [];
}

/** Select declared freshness checks from the same graph plan as CI. Runtime
 * probes are injected so selection never guesses dependencies from shell text.
 * Missing source, tooling, or packages remain explicit required obligations.
 */
export function planCodegenFreshness({graph, codegenIds, repositoryPaths, sparsePaths = [],
  fileAvailable, executableAvailable, packageAvailable, platform = process.platform}) {
  const errors = validateComponentGraph(graph);
  if (errors.length) throw new Error(errors.join("\n"));
  if (!Array.isArray(codegenIds) || codegenIds.some((id) => typeof id !== "string")) {
    throw new Error("Freshness selection requires graph-declared codegenIds.");
  }
  const omitted = new Set(sparsePaths);
  const byId = new Map(graph.compileCodegen.map((entry) => [entry.id, entry]));
  const checks = [];
  for (const id of [...new Set(codegenIds)].sort()) {
    const entry = byId.get(id);
    if (!entry) throw new Error(`Unknown required compile-codegen id "${id}".`);
    const reasons = [];
    if (!entry.platforms.includes(platform)) reasons.push(`unsupported platform ${platform}`);
    for (const executable of entry.checkRequirements.executables) {
      if (!executableAvailable(executable)) reasons.push(`missing runtime ${executable}`);
    }
    for (const dependency of entry.checkRequirements.packages) {
      if (!packageAvailable(dependency)) {
        reasons.push(`missing ${dependency.kind} package ${dependency.name} from ${dependency.from}`);
      }
    }
    // Generators use ordinary filesystem reads, unlike index-safe structural
    // checks. Only index-marked sparse omissions defer a check. A missing file
    // in a full checkout must run the generator and fail its freshness check.
    for (const pattern of [...entry.inputs, ...entry.outputs]) {
      const output = entry.outputs.includes(pattern);
      const paths = /[*?]/u.test(pattern) ? repositoryPaths.filter((candidate) =>
        matchesGlob(candidate, pattern) && (output || matchesCodegenInput(candidate, entry))) :
        [pattern];
      if (paths.some((candidate) => omitted.has(candidate) && !fileAvailable(candidate))) {
        reasons.push(`unmaterialized ${output ? "output" : "input"} ${pattern}`);
      }
    }
    checks.push({codegenId: id, command: entry.checkCommand,
      writeCommand: entry.writeCommand, timeoutSeconds: entry.timeoutSeconds,
      runnable: reasons.length === 0, reasons});
  }
  return checks;
}

/** Early source gates share their executable owners with the selected CI lanes.
 * These are checks, never generators or deploy tools. Keep unavailable runtimes
 * explicit so a sparse planning checkout cannot claim a complete preflight.
 */
export function planSourcePreflight({targets, sparsePaths = [], executableAvailable, packageAvailable}) {
  if (!targets.some(target => target === "flutter" || target === "contracts" ||
      target === "visual_integration" || target === "tools" || target.startsWith("flutter_"))) return [];
  const commands = [
    ["node tool/architecture/check_mutation_error_surfaces.mjs"],
    ["node tool/architecture/check_route_string_literals.mjs"],
    ["node tool/architecture/check_flutter_source_size.mjs --check"],
    ["node tool/test/check_flutter_test_size.mjs --check"],
    ["node tool/ui_capture/check_route_inventory.mjs --check"],
    ["node tool/design/generate_widget_catalog.mjs --check"],
    ["node tool/design/build_host_feature_responsibilities.mjs --check"],
    ["node tool/design/build_design_sync_manifest.mjs --check"],
    ["dart run tool/architecture/provider_graph.dart --check", "analyzer"],
    ["dart run tool/architecture/check_ui_composition_contracts.dart --check", "analyzer"],
  ];
  return commands.map(([command, dependency]) => {
    const reasons = [];
    if (sparsePaths.length) reasons.push("source preflight requires a full checkout");
    if (!executableAvailable(command.split(" ")[0])) reasons.push("missing runtime for " + command);
    if (dependency && !packageAvailable({kind: "dart", name: dependency,
      from: ".dart_tool/package_config.json"})) reasons.push("missing Dart package " + dependency);
    return {command, timeoutSeconds: 180, runnable: reasons.length === 0, reasons};
  });
}
