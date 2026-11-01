// Every schema under contracts/ is a schema spec: a generated TypeScript type,
// a validator and a registry entry. Adding a schema file is enough. A schema's
// title names its type, and tool/contracts/schema_spec_exceptions.json holds
// only what a schema file cannot say.
import fs from "node:fs";
import path from "node:path";

const SCHEMA_SUFFIX = ".schema.json";
const TYPE_OUTPUT_DIRECTORY = "functions/src/shared/generated";

const upperFirst = (value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const lowerFirst = (value) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

/** The type name a title gives: `Admin Get Overview Payload`, `adminGetOverview`. */
export function derivedName(schema) {
  const words = typeof schema.title === "string" ? schema.title.trim().split(/\s+/u) : [];
  if (words.length === 0 || !words.every((word) => /^[A-Za-z][A-Za-z0-9]*$/u.test(word))) return null;
  return words.map(upperFirst).join("");
}

export const defaultTypeOutput = (name) => `${TYPE_OUTPUT_DIRECTORY}/${lowerFirst(name)}.ts`;

function schemaFiles(contractRoot) {
  const found = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith(SCHEMA_SUFFIX)) found.push(path.relative(contractRoot, absolute));
    }
  };
  walk(contractRoot);
  return found.map((file) => file.split(path.sep).join("/")).sort();
}

function assertNoStaleExceptions(errors, label, listed, known) {
  for (const value of listed) {
    if (!known.has(value)) errors.push(`${label} names ${value}, which is not a schema spec.`);
  }
}

/**
 * Specs keep their order in `order`, because generated files render in spec
 * order and must not churn. A spec it does not name follows, sorted by source.
 */
export function discoverSchemaSpecs({contractRoot, exceptions, order}) {
  const errors = [];
  const files = schemaFiles(contractRoot);
  const fileSet = new Set(files);
  const helperDirectories = new Set(exceptions.helperDirectories);
  const specsInHelperDirectories = new Set(exceptions.specsInHelperDirectories);
  const notGenerated = new Set(exceptions.notGenerated);
  const additional = new Map();
  for (const [directory, names] of Object.entries(exceptions.additionalTypeOutputDirectories)) {
    for (const name of names) additional.set(name, [...(additional.get(name) ?? []), directory]);
  }
  for (const [label, listed] of [
    ["specsInHelperDirectories", specsInHelperDirectories],
    ["notGenerated", notGenerated],
    ["names", Object.keys(exceptions.names)],
  ]) {
    for (const source of listed) {
      if (!fileSet.has(source)) errors.push(`${label} names ${source}, which does not exist.`);
    }
  }

  const specs = [];
  for (const source of files) {
    if (notGenerated.has(source)) continue;
    if (helperDirectories.has(source.split("/")[0]) && !specsInHelperDirectories.has(source)) continue;
    const schema = JSON.parse(fs.readFileSync(path.join(contractRoot, source), "utf8"));
    const name = exceptions.names[source] ?? derivedName(schema);
    if (name == null) {
      errors.push(
        `contracts/${source} needs a title that names its type (for example ` +
        `"CreateEventCallablePayload"), or an entry in schema_spec_exceptions.json.`,
      );
      continue;
    }
    const outputs = additional.get(name) ?? [];
    const typeOutput = exceptions.typeOutputs[name] ?? defaultTypeOutput(name);
    specs.push({
      name,
      source,
      typeOutput,
      ...(outputs.length === 0 ? {} : {
        additionalTypeOutputs: outputs.map((directory) => `${directory}/${path.posix.basename(typeOutput)}`),
      }),
    });
  }

  for (const key of ["name", "typeOutput"]) {
    const seen = new Map();
    for (const spec of specs) {
      if (seen.has(spec[key])) {
        errors.push(`contracts/${seen.get(spec[key])} and contracts/${spec.source} both give ${key} ${spec[key]}.`);
      }
      seen.set(spec[key], spec.source);
    }
  }
  const known = new Set(specs.map(({name}) => name));
  assertNoStaleExceptions(errors, "typeOutputs", Object.keys(exceptions.typeOutputs), known);
  assertNoStaleExceptions(errors, "additionalTypeOutputDirectories", additional.keys(), known);
  if (errors.length > 0) {
    throw new Error(`Schema specs are not consistent:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const rank = new Map(order.map((name, index) => [name, index]));
  const position = ({name}) => rank.get(name) ?? order.length;
  return specs
    .map((spec, index) => ({spec, index}))
    .sort((a, b) => position(a.spec) - position(b.spec) || a.index - b.index)
    .map(({spec}) => spec);
}
