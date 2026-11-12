#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {fromRepo} from "../lib/repo_paths.mjs";

const DEFAULT_SOURCE = "packages/catch_ui/lib/src/components/catch_field.dart";
const DEFAULT_SECTION_SOURCE = "packages/catch_ui/lib/src/components/catch_section.dart";
const DEFAULT_STATUS_SOURCE = "packages/catch_ui/lib/src/components/catch_field_status.dart";
const DEFAULT_CONTRACTS = "design/components/catch.components.json";
const DEFAULT_OUTPUT = "build/reports/field_facade_inventory.json";

export const facadeUseWhen = Object.freeze({
  read: "Display passive typed row content or a value, with Field-owned state and an optional secondary action.",
  content: "Display title and supporting copy as a stable content row with an optional action.",
  navigate: "Open a destination from a passive typed layout; Field owns activation, interaction state, semantics and secondary actions.",
  nav: "Open another destination or picker from a row that may show a current value.",
  sortable: "Reorder a compact one-line title and metadata row that also opens item details.",
  action: "Run a non-navigation row action without implying inline value editing.",
  toggle: "Edit one boolean value with a row-owned toggle control.",
  input: "Edit text directly in a field with validation, helper copy, and optional adornments.",
  control: "Reveal a caller-supplied inline control while the field owns disclosure and commit chrome.",
  choices: "Choose terse single- or multi-select labels in a field-owned disclosure control.",
  optionCards: "Choose one explanatory option when each choice needs a title and supporting description.",
  stepper: "Edit a bounded numeric value with the canonical decrement and increment control.",
  slider: "Edit a numeric value across a range with a field-owned disclosure slider that writes the value in the row.",
  inputActions: "Edit text in a controlled disclosure row with explicit cancel and submit actions.",
  add: "Offer a compact field-shaped action for adding a missing value or item.",
  select: "Choose one value from a conventional select control with field-owned label and support copy.",
});

export const forbiddenSurfaces = Object.freeze([
  {
    id: "browse",
    reason: "An editorial browse surface keeps its own story or card composition; ordinary record rows within it still use Field and Section.",
  },
  {
    id: "discovery",
    reason: "Discovery keeps its feed and recommendation hierarchy; ordinary list rows still use Field without turning the entire feed into a form.",
  },
  {
    id: "celebration",
    reason: "Celebration surfaces use outcome-specific composition rather than data-management fields and sections.",
  },
  {
    id: "insight-scorecard",
    reason: "Insight and scorecard surfaces communicate analysis and must not be flattened into form rows.",
  },
]);

const slotByParameter = Object.freeze({
  content: "content",
  title: "title",
  body: "body",
  leading: "leading",
  leadingExtent: "leading",
  icon: "leading",
  iconColor: "leading",
  leadingUnit: "leading",
  value: "value",
  valueText: "value",
  metadata: "value",
  valueLabelBuilder: "value",
  selected: "value",
  initialValue: "value",
  controller: "value",
  placeholder: "placeholder",
  emptyValueText: "placeholder",
  hintText: "placeholder",
  inputHint: "placeholder",
  values: "control",
  itemLabelBuilder: "control",
  itemTitleBuilder: "control",
  itemDescriptionBuilder: "control",
  helperText: "support",
  helperTone: "support",
  meta: "support",
  badgeLabel: "badge",
  badgeTone: "badge",
  prefixText: "prefix",
  trailing: "suffix",
  suffixText: "suffix",
  actions: "actions",
  secondaryAction: "secondary-action",
  status: "status",
  valid: "status",
  error: "error",
  errorText: "error",
  onValidate: "error",
  onCancel: "actions",
  onSubmit: "actions",
});

const slotOrder = Object.freeze([
  "content",
  "title",
  "body",
  "leading",
  "value",
  "placeholder",
  "control",
  "support",
  "badge",
  "prefix",
  "suffix",
  "feedback",
  "status",
  "error",
  "actions",
  "secondary-action",
]);

function fieldSlotForParameter(mode, name) {
  // The same public slot can have different semantic placement by recipe.
  if (name === "child") return mode === "inputActions" ? "feedback" : "control";
  if (name === "leading" && mode === "input") return "prefix";
  return slotByParameter[name];
}

const sectionSlotByParameter = Object.freeze({
  title: "title",
  subtitle: "subtitle",
  trailing: "trailing",
  count: "count",
  footer: "footer",
  groups: "groups",
  children: "children",
  itemBuilder: "children",
  child: "child",
  leading: "leading",
  message: "message",
  actionLabel: "action-label",
  onAction: "on-action",
  actionKey: "action-key",
  icon: "icon",
  actionEmphasis: "action-emphasis",
  actionStatus: "action-status",
});

const sectionSlotOrder = Object.freeze([
  "title",
  "subtitle",
  "trailing",
  "count",
  "footer",
  "groups",
  "children",
  "child",
  "leading",
  "message",
  "details",
  "action-label",
  "on-action",
  "action-key",
  "icon",
  "action-emphasis",
  "action-status",
  "feedback",
]);

function sectionSlotForParameter(variant, name) {
  if (variant === "action" && name === "meta") return "details";
  if (variant === "action" && name === "footer") return "feedback";
  return sectionSlotByParameter[name];
}

export function extractCatchFieldFacades(source, {useWhen = facadeUseWhen} = {}) {
  const declarations = [
    ...extractDeclarations(
      source,
      /\bconst\s+CatchField\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
      "constructor",
      "CatchField",
    ),
    ...extractDeclarations(
      source,
      /\bfactory\s+CatchField\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
      "factory",
      "CatchField",
    ),
  ].filter((declaration) => !declaration.internal)
    .sort((left, right) => left.offset - right.offset);

  if (declarations.length === 0) {
    throw new Error("No public CatchField facades were found.");
  }

  const seen = new Set();
  return declarations.map(({name, kind, parameters}) => {
    if (seen.has(name)) throw new Error(`Duplicate CatchField facade: ${name}`);
    seen.add(name);
    if (!useWhen[name]) {
      throw new Error(`CatchField.${name} is missing owner-reviewed use-when metadata.`);
    }
    const observedSlots = new Set(
      parameters.map((parameter) => fieldSlotForParameter(name, parameter.name)).filter(Boolean),
    );
    return {
      facade: `CatchField.${name}`,
      mode: name,
      kind,
      parameters,
      slots: slotOrder.filter((slot) => observedSlots.has(slot)),
      useWhen: useWhen[name],
    };
  });
}

export function extractCatchSectionVariants(source) {
  return extractCatchSectionContract(source).variants;
}

export function extractCatchSectionContract(source) {
  const declarations = [
    ...extractDeclarations(
      source,
      /\bconst\s+CatchSection\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
      "constructor",
      "CatchSection",
    ),
    ...extractDeclarations(
      source,
      /\bfactory\s+CatchSection\.([A-Za-z][A-Za-z0-9_]*)\s*\(/gu,
      "factory",
      "CatchSection",
    ),
  ].filter((declaration) => !declaration.internal)
    .sort((left, right) => left.offset - right.offset);
  if (declarations.length === 0) throw new Error("No public CatchSection variants were found.");
  const observedSlots = new Set(
    declarations.flatMap((declaration) =>
      declaration.parameters
        .map((parameter) => sectionSlotForParameter(declaration.name, parameter.name))
        .filter(Boolean),
    ),
  );
  return {
    variants: declarations.map((declaration) => declaration.name),
    slots: sectionSlotOrder.filter((slot) => observedSlots.has(slot)),
  };
}

export function buildFieldFacadeInventory({
  fieldSource,
  sectionSource,
  statusSource,
  interactionContracts,
  sourcePath = DEFAULT_SOURCE,
  sectionSourcePath = DEFAULT_SECTION_SOURCE,
  statusSourcePath = DEFAULT_STATUS_SOURCE,
} = {}) {
  const facades = extractCatchFieldFacades(fieldSource);
  const section = extractCatchSectionContract(sectionSource);
  const saveStates = extractEnumValues(statusSource, "CatchFieldStatus");
  const fieldContract = interactionContracts?.field_row;
  const sectionContract = interactionContracts?.field_section;
  if (!fieldContract || !sectionContract) {
    throw new Error("interactionContracts must define field_row and field_section.");
  }

  const modes = facades.map((entry) => entry.mode);
  const slots = slotOrder.filter((slot) => facades.some((entry) => entry.slots.includes(slot)));
  assertExactArray(fieldContract.modes, modes, "interactionContracts.field_row.modes");
  assertExactArray(fieldContract.slots, slots, "interactionContracts.field_row.slots");
  assertExactArray(
    fieldContract.saveStates,
    saveStates,
    "interactionContracts.field_row.saveStates",
  );
  assertExactArray(
    sectionContract.variants,
    section.variants,
    "interactionContracts.field_section.variants",
  );
  assertExactArray(
    sectionContract.slots,
    section.slots,
    "interactionContracts.field_section.slots",
  );

  return {
    schemaVersion: 1,
    generatedBy: "tool/design/generate_field_inventory.mjs",
    source: {
      catchField: sourcePath,
      catchFieldApiSha256: sha256(JSON.stringify(facades)),
      catchSection: sectionSourcePath,
      catchSectionApiSha256: sha256(JSON.stringify(section)),
      catchFieldStatus: statusSourcePath,
      catchFieldStatusApiSha256: sha256(JSON.stringify(saveStates)),
      interactionContracts: DEFAULT_CONTRACTS,
    },
    summary: {
      facadeCount: facades.length,
      modeCount: modes.length,
      slotCount: slots.length,
      saveStateCount: saveStates.length,
      sectionVariantCount: section.variants.length,
      forbiddenSurfaceCount: forbiddenSurfaces.length,
    },
    forbiddenSurfaces,
    facades,
  };
}

export function buildFromRepo({repoRoot = process.cwd()} = {}) {
  const fieldSource = fs.readFileSync(path.resolve(repoRoot, DEFAULT_SOURCE), "utf8");
  const sectionSource = fs.readFileSync(path.resolve(repoRoot, DEFAULT_SECTION_SOURCE), "utf8");
  const statusSource = fs.readFileSync(path.resolve(repoRoot, DEFAULT_STATUS_SOURCE), "utf8");
  const componentContracts = JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, DEFAULT_CONTRACTS), "utf8"),
  );
  return buildFieldFacadeInventory({
    fieldSource,
    sectionSource,
    statusSource,
    interactionContracts: componentContracts.interactionContracts,
  });
}

function extractDeclarations(source, expression, kind, owner) {
  const declarations = [];
  for (const match of source.matchAll(expression)) {
    const openIndex = match.index + match[0].lastIndexOf("(");
    const closeIndex = findMatching(source, openIndex, "(", ")");
    const body = source.slice(openIndex + 1, closeIndex).trim();
    if (!body.startsWith("{") || !body.endsWith("}")) {
      throw new Error(`${owner}.${match[1]} must use named parameters.`);
    }
    declarations.push({
      name: match[1],
      kind,
      offset: match.index,
      internal: /@(?:[A-Za-z_]\w*\.)?internal\s*$/u.test(
        source.slice(0, match.index),
      ),
      parameters: splitParameters(body.slice(1, -1)).map(parseParameter),
    });
  }
  return declarations;
}

function extractEnumValues(source, enumName) {
  const expression = new RegExp(`\\benum\\s+${enumName}\\s*\\{([^}]*)\\}`, "u");
  const body = source.match(expression)?.[1];
  if (!body) throw new Error(`Unable to find enum ${enumName}.`);
  const values = body
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.some((value) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value))) {
    throw new Error(`Unable to parse enum ${enumName}.`);
  }
  return values;
}

function findMatching(source, start, open, close) {
  let depth = 0;
  let quote = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === open) depth += 1;
    if (character === close) depth -= 1;
    if (depth === 0) return index;
  }
  throw new Error(`Unbalanced ${open}${close} declaration.`);
}

function splitParameters(source) {
  const parts = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let angle = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") round += 1;
    else if (character === ")") round -= 1;
    else if (character === "[") square += 1;
    else if (character === "]") square -= 1;
    else if (character === "<") angle += 1;
    else if (character === ">") angle = Math.max(0, angle - 1);
    else if (character === "," && round === 0 && square === 0 && angle === 0) {
      const part = source.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }
  const last = source.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function parseParameter(source) {
  const equalsIndex = source.indexOf("=");
  const declaration = (equalsIndex === -1 ? source : source.slice(0, equalsIndex)).trim();
  const fieldName = declaration.match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/u)?.[1];
  // Dart 3.12 exposes a private named initializing formal by its public name.
  const name = /\bthis\._/u.test(declaration)
    ? fieldName?.replace(/^_+/u, "")
    : fieldName;
  if (!name) throw new Error(`Unable to parse CatchField parameter: ${source}`);
  return {
    name,
    required: /^required\b/u.test(declaration),
    hasDefault: equalsIndex !== -1,
  };
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} drifted from the Flutter API. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

function sha256(source) {
  return crypto.createHash("sha256").update(source).digest("hex");
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function runCli(argv) {
  const check = argv.includes("--check");
  const unknown = argv.filter((arg) => arg !== "--check");
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown[0]}`);
    process.exit(64);
  }
  const outputPath = fromRepo(DEFAULT_OUTPUT);
  const expected = serialize(buildFromRepo({repoRoot: fromRepo(".")}));
  if (check) {
    const repeated = serialize(buildFromRepo({repoRoot: fromRepo(".")}));
    if (repeated !== expected) throw new Error("Field facade inventory generation is not deterministic.");
    console.log("Field facade source contract is valid and deterministic.");
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, expected);
  console.log(`Wrote ${DEFAULT_OUTPUT}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli(process.argv.slice(2));
}
