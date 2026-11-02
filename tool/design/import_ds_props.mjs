#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {repoRoot} from "../lib/repo_paths.mjs";
import {widgetSlotNames} from "./lib/component_naming.mjs";
import {
  declaredSystemNames,
  guidelinesPath,
  systemComponents,
  systemTypesPath,
  tableSystemNames,
} from "./lib/system_components.mjs";

// Imports the design source's component contract into the repo: the `system`
// block of every registry record the table in lib/system_components.mjs assigns,
// a committed copy of index.d.ts, and one guideline per system component whose
// Flutter section comes from the record's `dart` field. Parity is on names,
// states and slots, so `system` is informational for Dart, whose props stay
// idiomatic; existing `dart` and `contract` fields are never rewritten.
//
// CI has no design source. There --check compares props, slots and Flutter
// sections against the committed copies, and reports what it could not compare.

const registryPath = "design/components/catch.components.json";
const flutterStart = "<!-- generated:flutter:start -->";
const flutterEnd = "<!-- generated:flutter:end -->";
const flutterPlaceholder = "@@flutter@@";

const usage = "Usage: node tool/design/import_ds_props.mjs [--check] [--source <catch-design-source>]";

function runCli() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const sourceIndex = args.indexOf("--source");
  const source = sourceIndex === -1 ? null : args[sourceIndex + 1];
  const known = args.filter((arg, index) => arg !== "--check" &&
    !(sourceIndex !== -1 && (index === sourceIndex || index === sourceIndex + 1)));
  if (known.length > 0 || (sourceIndex !== -1 && !source)) {
    console.error(usage);
    process.exit(64);
  }
  if (source && !fs.existsSync(source)) {
    console.error(`Design source not found: ${source}`);
    process.exit(1);
  }
  const sourceRoot = source ? path.resolve(source) : findDesignSource(repoRoot);
  const result = importDesignSource({root: repoRoot, sourceRoot, check});
  for (const notice of result.notices) console.log(notice);
  if (result.problems.length > 0) {
    console.error(check ? "Design system import is stale:" : "Design system import failed:");
    for (const problem of result.problems) console.error(`- ${problem}`);
    if (check) console.error("Run: node tool/design/import_ds_props.mjs");
    process.exit(1);
  }
  console.log(check
    ? `Design system import is current (${result.records} records, ${result.guidelines} guidelines).`
    : `Imported the design system (${result.records} records, ${result.guidelines} guidelines).`);
}

/** The sibling catch-design-source checkout of this repo or the worktree's parents. */
export function findDesignSource(root) {
  for (let directory = root; directory !== path.dirname(directory); directory = path.dirname(directory)) {
    const candidate = path.join(path.dirname(directory), "catch-design-source");
    if (fs.existsSync(path.join(candidate, "ds/catch/project/components/index.d.ts"))) return candidate;
  }
  return null;
}

export function importDesignSource({root, sourceRoot, check, table = systemComponents}) {
  const problems = [];
  const notices = [];
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const originalRegistry = read(registryPath);
  const registry = JSON.parse(originalRegistry);
  const blocks = new Map();
  const byId = new Map(registry.components.map((component) => [component.id, component]));
  const components = sourceRoot ? path.join(sourceRoot, "ds/catch/project/components") : null;
  if (!sourceRoot) {
    if (!check) return {problems: ["No design source found. Pass --source <catch-design-source>."], notices, records: 0, guidelines: 0};
    notices.push("Design source not found: compared props, slots and Flutter sections against the committed copies; states and guideline text were not compared.");
  }
  const types = components
    ? fs.readFileSync(path.join(components, "index.d.ts"), "utf8")
    : read(systemTypesPath);
  const declarations = parseSystemTypes(types);
  const declared = declaredSystemNames(types);
  for (const name of tableSystemNames(table)) {
    if (!declared.has(name)) problems.push(`system table names ${name}, which index.d.ts does not declare`);
  }
  for (const name of declared) {
    if (!tableSystemNames(table).has(name)) problems.push(`index.d.ts declares ${name}, which the system table does not assign`);
  }
  if (sourceRoot) problems.push(...symbolMapProblems(sourceRoot, table), ...readmeFolderProblems(components, table));
  if (problems.length > 0) return {problems, notices, records: 0, guidelines: 0};

  const readReadme = (folder) => {
    const file = path.join(components, folder, "README.md");
    return fs.readFileSync(file, "utf8");
  };
  const readPreview = (folder) => {
    const file = path.join(components, folder, "preview.html");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  };

  const expectedGuidelines = new Map();
  let records = 0;
  for (const [name, entry] of Object.entries(table)) {
    const assigned = entry.records.map((id) => byId.get(id));
    const missing = entry.records.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      problems.push(`${name}: registry has no ${missing.join(", ")}`);
      continue;
    }
    const guideline = `${guidelinesPath}/${entry.records[0]}.md`;
    const body = components
      ? (entry.readme ? guidelineBody(readReadme(entry.readme)) : generatedBody({name, entry, declarations, table}))
      : committedBody(root, guideline, problems);
    if (body == null) continue;
    expectedGuidelines.set(guideline, withFlutterSection(body, assigned));

    const block = systemBlock({
      name,
      entry,
      declarations,
      provide: body,
      // A shared README's state text describes its sibling, so a part with none is `rest`.
      states: !components ? null : entry.readme
        ? statesFrom(section(readReadme(entry.readme), "States and motion"), previewTitles(readPreview(entry.readme)))
        : ["rest"],
    });
    for (const component of assigned) {
      // Without the source a state list cannot be derived; the committed one stands.
      blocks.set(component.id, {...block, states: block.states ?? component.system?.states ?? []});
      records += 1;
    }
  }

  const expectedRegistry = writeSystemBlocks(originalRegistry, blocks);
  if (check) {
    if (expectedRegistry !== originalRegistry) problems.push(`${registryPath}: system blocks are stale`);
    if (!fs.existsSync(path.join(root, systemTypesPath)) || read(systemTypesPath) !== types) {
      problems.push(`${systemTypesPath} differs from the design source`);
    }
    for (const [file, text] of expectedGuidelines) {
      if (!fs.existsSync(path.join(root, file))) problems.push(`${file} is missing`);
      else if (read(file) !== text) problems.push(`${file} is stale`);
    }
    for (const file of listGuidelines(root)) {
      if (!expectedGuidelines.has(file)) problems.push(`${file} belongs to no system component`);
    }
    return {problems, notices, records, guidelines: expectedGuidelines.size};
  }
  if (problems.length > 0) return {problems, notices, records, guidelines: 0};
  fs.mkdirSync(path.dirname(path.join(root, systemTypesPath)), {recursive: true});
  fs.writeFileSync(path.join(root, systemTypesPath), types);
  fs.writeFileSync(path.join(root, registryPath), expectedRegistry);
  fs.mkdirSync(path.join(root, guidelinesPath), {recursive: true});
  for (const file of listGuidelines(root)) {
    if (!expectedGuidelines.has(file)) fs.rmSync(path.join(root, file));
  }
  for (const [file, text] of expectedGuidelines) fs.writeFileSync(path.join(root, file), text);
  return {problems, notices, records, guidelines: expectedGuidelines.size};
}

function listGuidelines(root) {
  const directory = path.join(root, guidelinesPath);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith(".md"))
    .map((file) => `${guidelinesPath}/${file}`);
}

function committedBody(root, guideline, problems) {
  const file = path.join(root, guideline);
  if (!fs.existsSync(file)) {
    problems.push(`${guideline} is missing`);
    return null;
  }
  const text = fs.readFileSync(file, "utf8");
  const start = text.indexOf(flutterStart);
  const end = text.indexOf(flutterEnd);
  if (start === -1 || end === -1) {
    problems.push(`${guideline} has no generated Flutter section`);
    return null;
  }
  return `${text.slice(0, start)}${flutterPlaceholder}${text.slice(end + flutterEnd.length)}`;
}

/** A README with its hand-written Flutter section cut out. */
export function guidelineBody(readme) {
  const lines = readme.split("\n");
  const start = lines.indexOf("## Flutter");
  if (start === -1) throw new Error("README has no ## Flutter section");
  const next = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const after = next === -1 ? [] : lines.slice(next);
  return [...lines.slice(0, start), flutterPlaceholder, "", ...after].join("\n");
}

/** The design source has no README for this export; say what is known about it. */
function generatedBody({name, entry, declarations, table}) {
  const declaration = declarations.get(name);
  const summary = declaration.summary || `Part of the ${entry.sharedReadme} guideline.`;
  const shared = entry.sharedReadme
    ? Object.values(table).find((other) => other.readme === entry.sharedReadme)?.records[0]
    : null;
  const lines = [summary, "", `**Registry:** \`${entry.records.join(" · ")}\` · In this system: \`Catch.${name}\``, ""];
  if (shared) lines.push(`Its usage guidance is in [${shared}](${shared}.md).`, "");
  else lines.push("The design source has no README for this component; this text comes from its type declaration.", "");
  lines.push("## What you provide");
  lines.push(declaration.props.map((prop) => `\`${prop.name}\``).join(", ") || "Nothing.", "");
  return `${lines.join("\n")}\n${flutterPlaceholder}\n`;
}

function withFlutterSection(body, records) {
  return body.replace(flutterPlaceholder, () => flutterSection(records));
}

/** One line per constructor of each record, so the text cannot name a missing one. */
export function flutterSection(records) {
  const lines = [flutterStart, "## Flutter", ""];
  for (const record of records) {
    if (!record.dart) {
      lines.push(`\`${record.id}\`: No Flutter symbol yet.`);
      continue;
    }
    lines.push(`\`${record.id}\`:`);
    for (const constructor of record.dart.constructors ?? [record.dart.symbol]) {
      lines.push(`- \`${constructor}\``);
    }
  }
  lines.push(flutterEnd);
  return lines.join("\n");
}

/** Text under a README heading. */
export function section(markdown, heading) {
  const start = markdown.search(new RegExp(`^## ${heading}$`, "mu"));
  if (start === -1) return "";
  const rest = markdown.slice(start).split("\n").slice(1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

export function previewTitles(html) {
  return [...html.matchAll(/\bpart\('((?:[^'\\]|\\.)*)'/gu)].map((match) => match[1]);
}

const stateOrder = [
  "rest", "hover", "pressed", "focus", "filled", "selected", "on", "off", "toggled", "attention",
  "unread", "done", "loading", "error", "failed", "disabled", "live", "open", "used", "refunded",
];
const proseStates = [
  ["pressed", /\bpressed\b/iu],
  ["hover", /\bhover\b/iu],
  ["focus", /\bfocus\b/iu],
  ["selected", /\bselected\b/iu],
  ["disabled", /\bdisabled\b/iu],
  ["loading", /\bloading\b/iu],
  ["error", /\berror\b/iu],
  ["failed", /\bfail(?:ed|ing|s)\b/iu],
];
const readmeOnlyProseStates = [
  ["live", /\blive\b/iu],
  ["open", /\bopens over\b/iu],
  ["toggled", /\btoggles\b/iu],
  ["used", /\bused\b/iu],
  ["refunded", /\brefunded\b/iu],
];

/**
 * States from the README's "States and motion" text and the preview's part
 * titles: a "Rest, hover, pressed" list by its items, prose by a closed set of
 * words. Most READMEs describe motion and name none, which leaves `rest`.
 */
export function statesFrom(readmeSection, titles = []) {
  const found = new Set(["rest"]);
  const scan = (text, prose) => {
    const sentence = text.replace(/`/gu, "").replace(/\([^)]*\)/gu, "").split(/\.(?:\s|$)/u)[0];
    const items = sentence.replace(/^[^,:]*:/u, "").split(",").map((item) => item.trim().toLowerCase());
    const words = items.map((item) => item.split(/\s+/u)[0]);
    if (words.length > 1 && words.every((word) => stateOrder.includes(word))) {
      for (const word of words) found.add(word);
    }
    for (const [state, pattern] of prose) if (pattern.test(text)) found.add(state);
  };
  scan(readmeSection, [...proseStates, ...readmeOnlyProseStates]);
  for (const title of titles) scan(title, proseStates);
  return [...found].sort((left, right) => stateOrder.indexOf(left) - stateOrder.indexOf(right));
}

function systemBlock({name, entry, declarations, provide, states}) {
  const main = declarations.get(name);
  const block = {
    name,
    states,
    slots: slotsOf(main, provide),
    props: main.props,
  };
  if (entry.parts?.length) {
    block.parts = entry.parts.map((part) => ({
      name: part,
      slots: slotsOf(declarations.get(part), ""),
      props: declarations.get(part).props,
    }));
  }
  return block;
}

const actionShape = /^(?:Act\b|Pick<ButtonProps|SectionHeaderProps\["action"\])/u;

function isSlot({name, tsType: type}) {
  if (widgetSlotNames.includes(name) || name === "caption") return true;
  if (type.startsWith("(") || type.startsWith("Array<") || type.endsWith("[]")) return false;
  return /\bReact\.ReactNode\b/u.test(type) || actionShape.test(type) ||
    (type.startsWith("{") && /\blabel\b/u.test(type) && /\b(?:onPressed|href)\b/u.test(type));
}

/**
 * The named composition regions: props that take content or an action, and
 * children where the component takes them, in declaration order.
 */
function slotsOf(declaration, provide) {
  const slots = declaration.props.filter(isSlot).map((prop) => prop.name);
  if (!slots.includes("children") &&
      (declaration.destructuresChildren || /\bchildren\b/u.test(section(provide, "What you provide")))) {
    slots.push("children");
  }
  return slots;
}

/** Each component's own declared props from index.d.ts; inherited HTML attributes are not its API. */
export function parseSystemTypes(source) {
  const file = ts.createSourceFile("index.d.ts", source, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({removeComments: true});
  const print = (node) => printer.printNode(ts.EmitHint.Unspecified, node, file).replace(/\s+/gu, " ").trim();
  const interfaces = new Map();
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) interfaces.set(statement.name.text, statement);
  }
  const membersOf = (type) => {
    if (!type) return [];
    if (ts.isTypeLiteralNode(type)) return [...type.members];
    if (ts.isIntersectionTypeNode(type)) return type.types.flatMap(membersOf);
    if (ts.isTypeReferenceNode(type)) {
      const name = type.typeName.getText(file);
      if (interfaces.has(name)) return [...interfaces.get(name).members];
      // React.ForwardRefExoticComponent<ButtonProps & ...> declares a component as a const.
      return (type.typeArguments ?? []).flatMap(membersOf);
    }
    return [];
  };
  const propsFrom = (type) => {
    const seen = new Set();
    const props = [];
    for (const member of membersOf(type)) {
      if (!ts.isPropertySignature(member)) continue;
      const name = member.name.getText(file);
      if (seen.has(name)) continue;
      seen.add(name);
      props.push({name, tsType: member.type ? print(member.type) : "unknown", required: !member.questionToken});
    }
    return props;
  };
  const summaryOf = (node) => {
    const doc = node.jsDoc?.[0]?.comment;
    return typeof doc === "string" ? doc.replace(/\s+/gu, " ").trim() : "";
  };
  const declarations = new Map();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/u.test(statement.name.text)) {
      const parameter = statement.parameters[0];
      declarations.set(statement.name.text, {
        props: propsFrom(parameter?.type),
        summary: summaryOf(statement),
        destructuresChildren: Boolean(parameter && ts.isObjectBindingPattern(parameter.name) &&
          parameter.name.elements.some((element) => element.name.getText(file) === "children")),
      });
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText(file);
        if (/^[A-Z]/u.test(name)) {
          declarations.set(name, {props: propsFrom(declaration.type), summary: summaryOf(statement), destructuresChildren: false});
        }
      }
    }
  }
  return declarations;
}

/** ds/src/index.ts exports each system component under its registry symbol. */
function symbolMapProblems(sourceRoot, table) {
  const file = path.join(sourceRoot, "ds/src/index.ts");
  if (!fs.existsSync(file)) return [`${file} is missing`];
  const problems = [];
  const exported = new Map();
  for (const match of fs.readFileSync(file, "utf8").matchAll(/^export const (\w+) = (\w+);/gmu)) {
    exported.set(match[2], match[1]);
  }
  for (const [name, symbol] of exported) {
    if (table[name]?.symbol !== symbol) {
      problems.push(`ds/src/index.ts exports ${name} as ${symbol}; the system table says ${table[name]?.symbol ?? "nothing"}`);
    }
  }
  for (const name of Object.keys(table)) {
    if (!exported.has(name)) problems.push(`ds/src/index.ts has no registry symbol for ${name}`);
  }
  return problems;
}

function readmeFolderProblems(components, table) {
  const claimed = new Set(Object.values(table).map((entry) => entry.readme).filter(Boolean));
  const problems = [];
  for (const folder of fs.readdirSync(components)) {
    const hasReadme = fs.existsSync(path.join(components, folder, "README.md"));
    if (hasReadme && !claimed.has(folder)) problems.push(`${folder}/README.md belongs to no entry in the system table`);
  }
  for (const folder of claimed) {
    if (!fs.existsSync(path.join(components, folder, "README.md"))) problems.push(`${folder}/README.md is missing`);
  }
  return problems;
}

/**
 * The registry text with each record's `system` block replaced by `blocks[id]`.
 * It edits only those lines: aliases and redirects keep their hand-kept layout.
 */
export function writeSystemBlocks(text, blocks) {
  const lines = text.split("\n");
  const output = [];
  let record = null;
  for (const line of lines) {
    if (line === "    {") {
      record = [line];
    } else if (record && (line === "    }" || line === "    },")) {
      output.push(...recordWithSystem(record, blocks), line);
      record = null;
    } else if (record) {
      record.push(line);
    } else {
      output.push(line);
    }
  }
  return output.join("\n");
}

function recordWithSystem(lines, blocks) {
  const id = /^ {6}"id": "([^"]+)"/mu.exec(lines.join("\n"))?.[1];
  if (!id || !blocks.has(id)) return lines;
  const kept = [];
  let inSystem = false;
  for (const line of lines) {
    if (line === '      "system": {') inSystem = true;
    else if (inSystem && (line === "      }" || line === "      },")) inSystem = false;
    else if (!inSystem) kept.push(line);
  }
  const last = kept.length - 1;
  kept[last] = kept[last].replace(/,?$/u, ",");
  return [...kept, ...formatSystemBlock(blocks.get(id))];
}

function formatSystemBlock(block) {
  const list = (values) => `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
  const props = (values, indent) => values.length === 0 ? "[]" : [
    "[",
    values.map((prop) => `${indent}  {"name": ${JSON.stringify(prop.name)}, "tsType": ${JSON.stringify(prop.tsType)}, "required": ${prop.required}}`).join(",\n"),
    `${indent}]`,
  ].join("\n");
  const fields = [
    `        "name": ${JSON.stringify(block.name)}`,
    `        "states": ${list(block.states)}`,
    `        "slots": ${list(block.slots)}`,
    `        "props": ${props(block.props, "        ")}`,
  ];
  if (block.parts) {
    const parts = block.parts.map((part) => [
      "          {",
      `            "name": ${JSON.stringify(part.name)},`,
      `            "slots": ${list(part.slots)},`,
      `            "props": ${props(part.props, "            ")}`,
      "          }",
    ].join("\n"));
    fields.push(`        "parts": [\n${parts.join(",\n")}\n        ]`);
  }
  return ['      "system": {', fields.join(",\n"), "      }"];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
