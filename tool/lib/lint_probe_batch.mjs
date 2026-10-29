import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";

export function parseProbeExpectations(text, {repositoryRoot, probeRoot}) {
  const cases = new Map();
  const expectations = [];
  const root = path.resolve(repositoryRoot, probeRoot);
  for (const line of text.trimEnd().split("\n")) {
    const fields = line.split("\t");
    if (fields.length !== 4) throw new Error("Malformed lint probe expectation");
    const [relative, kind, code, countText] = fields;
    const file = path.resolve(repositoryRoot, relative);
    if (!file.startsWith(root + path.sep) || !file.endsWith(".dart")) {
      throw new Error(`Lint fixture escapes its temporary root: ${relative}`);
    }
    if (kind === "case") {
      if (cases.has(file) || !code || countText !== "0") throw new Error("Invalid or duplicate lint fixture");
      cases.set(file, {label: code, assertions: 0});
      continue;
    }
    if (!cases.has(file)) throw new Error("Expectation does not belong to a declared fixture");
    if (!["min", "exact", "clean", "nonzero"].includes(kind) || !/^\d+$/.test(countText)) {
      throw new Error("Unsupported lint probe assertion");
    }
    const count = Number(countText);
    if (!Number.isSafeInteger(count) ||
        (["min", "exact"].includes(kind) ? !/^catch_[a-z0-9_]+$/.test(code) : code !== "-" || count !== 0)) {
      throw new Error("Invalid lint probe diagnostic expectation");
    }
    cases.get(file).assertions += 1;
    expectations.push({file, kind, code, count});
  }
  if (!cases.size || [...cases.values()].some((entry) => !entry.assertions)) {
    throw new Error("Every lint fixture must declare an assertion");
  }
  return {cases, expectations};
}

// The SDK escapes pipes, backslashes, newlines and returns in file/message
// fields. Splitting on a raw pipe can misattribute a diagnostic to another file.
function machineFields(line) {
  const fields = [""];
  for (let index = 0; index < line.length; index += 1) {
    let character = line[index];
    if (character === "\\") {
      const escaped = line[++index];
      if (escaped === undefined) throw new Error("Truncated analyzer escape");
      character = {n: "\n", r: "\r"}[escaped] ?? escaped;
    } else if (character === "|") {
      fields.push("");
      continue;
    }
    fields[fields.length - 1] += character;
  }
  return fields;
}

export function parseProbeDiagnostics(output) {
  if (/An error occurred while executing an analyzer plugin|analysis server shut down unexpectedly/i.test(output)) {
    throw new Error("Analyzer plugin or server failed; probe results are invalid");
  }
  return output.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const fields = machineFields(line);
    if (fields.length !== 8 || !["ERROR", "WARNING", "INFO"].includes(fields[0]) ||
        !fields[1] || !fields[2] || !path.isAbsolute(fields[3]) ||
        !fields.slice(4, 7).every((value) => /^\d+$/.test(value))) {
      throw new Error(`Unrecognized analyzer output: ${line}`);
    }
    return {severity: fields[0], code: fields[2].toLowerCase(), file: path.resolve(fields[3])};
  });
}

// Flutter's bin/dart wrapper (bin/internal/shared.sh) prints this exact block
// to stderr when it runs as root outside Docker or CI, as cloud agent sessions
// do. It is not analyzer output, so only this verbatim block is removed; any
// other unrecognized line still fails the probe run.
const flutterRootBanner = [
  "   Woah! You appear to be trying to run flutter as root.",
  "   We strongly recommend running the flutter tool without superuser privileges.",
  "  /",
  "\u{1F4CE}",
];

function withoutFlutterRootBanner(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((_, index) => flutterRootBanner.every(
    (expected, offset) => lines[index + offset]?.replace(/\r$/u, "") === expected));
  if (start === -1) return text;
  lines.splice(start, flutterRootBanner.length);
  return lines.join("\n");
}

export function verifyProbeResult({cases, expectations}, result) {
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Analyzer terminated by ${result.signal}`);
  const diagnostics = parseProbeDiagnostics(
    (result.stdout ?? "") + withoutFlutterRootBanner(result.stderr ?? ""));
  const expectedStatus = diagnostics.some((entry) => entry.severity === "ERROR") ? 3 :
    diagnostics.some((entry) => entry.severity === "WARNING") ? 2 : 0;
  if (result.status !== expectedStatus) throw new Error(`Analyzer status ${result.status} contradicts its diagnostics`);
  const byFile = new Map([...cases.keys()].map((file) => [file, []]));
  for (const entry of diagnostics) {
    if (!byFile.has(entry.file)) throw new Error(`Unexpected diagnostic outside lint fixtures: ${entry.file}`);
    byFile.get(entry.file).push(entry);
  }
  for (const {file, kind, code, count} of expectations) {
    const found = byFile.get(file);
    const actual = found.filter((entry) => entry.code === code).length;
    const failed = kind === "min" && actual < count || kind === "exact" && actual !== count ||
      kind === "nonzero" && !found.some((entry) => entry.severity !== "INFO") ||
      kind === "clean" && found.some((entry) => entry.severity !== "INFO" || entry.code.startsWith("catch_"));
    if (failed) throw new Error(`${cases.get(file).label}: ${kind} ${code} expected ${count}, got ${actual}; diagnostics: ${found.map((entry) => entry.code).join(", ")}`);
  }
  return {fixtures: cases.size, assertions: expectations.length, diagnostics: diagnostics.length, analyzerStarts: 1};
}

export function runLintProbeBatch({repositoryRoot = process.cwd(), probeRoot, manifestPath, dartBin = "dart", runner = spawnSync}) {
  const plan = parseProbeExpectations(fs.readFileSync(manifestPath, "utf8"), {repositoryRoot, probeRoot});
  const files = [...plan.cases.keys()];
  for (const file of files) {
    if (!fs.lstatSync(file).isFile()) throw new Error(`Missing or non-file lint fixture: ${file}`);
  }
  // Pass exact files. A nested-directory target can omit analyzer plugins in
  // the pinned SDK (dart-lang/sdk#62710), which the positive cases must expose.
  const result = runner(dartBin, ["analyze", "--format", "machine", ...files], {
    cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  return verifyProbeResult(plan, result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [probeRoot, manifestPath, dartBin, ...extra] = process.argv.slice(2);
    if (!probeRoot || !manifestPath || !dartBin || extra.length) throw new Error("Usage: lint_probe_batch.mjs PROBE_ROOT EXPECTATIONS DART_BIN");
    const start = performance.now();
    const result = runLintProbeBatch({probeRoot, manifestPath, dartBin});
    console.log(`Catch UI lint probes passed: ${result.fixtures} fixtures, ${result.assertions} assertions, one analyzer in ${((performance.now() - start) / 1000).toFixed(1)}s.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
