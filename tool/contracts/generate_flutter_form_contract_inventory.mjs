#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isAppSharedWidgetSource} from "../design/lib/component_naming.mjs";

const TOOL_FILE = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(TOOL_FILE), "../..");
const DEFAULT_OUTPUT =
  "build/reports/flutter_form_contract_inventory.json";
const FIELD_BINDINGS = "contracts/forms/field_constraint_bindings.json";
const FIELD_CONSTRAINTS_OUTPUT =
  "lib/platform/schema_contracts/generated/field_constraints.g.dart";
const EDITABLE_SYMBOLS = new Set([
  "choices",
  "choiceInputForm",
  "choiceInputDescribed",
  "control",
  "input",
  "inputActions",
  "choiceTile",
  "choiceInputSegmented",
  "optionCards",
  "rangeSlider",
  "searchField",
  "select",
  "selectableChip",
  "stepper",
  "topBarSearch",
  "toggle",
  "directToggle",
  "otpCodeField",
  "formCustomRow",
  "formMultiChoiceRow",
  "formSingleChoiceRow",
  "formTextRow",
  "selfProfileMultiChoiceDescriptor",
  "selfProfileRangeDescriptor",
  "selfProfileSingleChoiceDescriptor",
]);

export function buildFormContractInventory({repoRoot = DEFAULT_ROOT} = {}) {
  const callsites = [];
  for (const file of listDartFiles(path.join(repoRoot, "lib"))) {
    const relative = normalizePath(path.relative(repoRoot, file));
    if (
      isAppSharedWidgetSource(relative) ||
      relative.includes("/generated/") ||
      relative.endsWith(".g.dart") ||
      relative.endsWith(".freezed.dart")
    ) {
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    callsites.push(...scanCatchFieldCalls({source, file: relative}));
  }
  callsites.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.symbol.localeCompare(right.symbol),
  );

  return {
    schemaVersion: 2,
    generatedBy:
      "tool/contracts/generate_flutter_form_contract_inventory.mjs",
    summary: {
      editableCallsites: callsites.length,
      boundCallsites: callsites.filter(isBound).length,
      exemptCallsites: callsites.filter(
        (entry) => entry.contractExemption != null,
      ).length,
      unboundCallsites: callsites.filter(
        (entry) => !isBound(entry) && entry.contractExemption == null,
      ).length,
      bySymbol: countBy(callsites, (entry) => entry.symbol),
    },
    callsites,
  };
}

export function scanCatchFieldCalls({source, file = "fixture.dart"}) {
  const results = [];
  const patterns = [
    {
      expression:
        /CatchField(?:<[^>]+>)?\.(choices|control|input|inputActions|optionCards|select|stepper|toggle)\s*\(/g,
      symbol: (match) => match[1],
    },
    {
      expression: /CatchChoiceInput(?:<[^>]+>)?\.(form|described)\s*\(/g,
      symbol: (match) => match[1] === "form" ? "choiceInputForm" : "choiceInputDescribed",
    },
    {
      expression: /CatchChoiceInput(?:<[^>]+>)?\.segmented\s*\(/g,
      symbol: () => "choiceInputSegmented",
    },
    {
      expression: /CatchChoiceTile\s*\(/g,
      symbol: () => "choiceTile",
    },
    {
      expression: /CatchRangeInput\s*\(/g,
      symbol: () => "rangeSlider",
    },
    {
      expression: /CatchSearchField\s*\(/g,
      symbol: () => "searchField",
    },
    {
      expression: /CatchTopBarSearch\s*\(/g,
      symbol: () => "topBarSearch",
    },
    {
      expression: /CatchCodeInput\s*\(/g,
      symbol: () => "otpCodeField",
    },
    {
      expression: /CatchChip\.selectable\s*\(/g,
      symbol: () => "selectableChip",
    },
    {
      expression: /CatchToggleInput\s*\(/g,
      symbol: () => "directToggle",
    },
    {
      expression: /CatchFormTextRow(?:<[^>]+>)?\s*\(/g,
      symbol: () => "formTextRow",
    },
    {
      expression: /CatchFormCustomRow(?:<[^>]+>)?\s*\(/g,
      symbol: () => "formCustomRow",
    },
    {
      expression: /CatchFormSingleChoiceRow(?:<[^>]+>)?\s*\(/g,
      symbol: () => "formSingleChoiceRow",
    },
    {
      expression: /CatchFormMultiChoiceRow(?:<[^>]+>)?\s*\(/g,
      symbol: () => "formMultiChoiceRow",
    },
    {
      expression: /SelfProfileSingleChoiceFieldRowDescriptor(?:<[^>]+>)?\s*\(/g,
      symbol: () => "selfProfileSingleChoiceDescriptor",
    },
    {
      expression: /SelfProfileMultiChoiceFieldRowDescriptor(?:<[^>]+>)?\s*\(/g,
      symbol: () => "selfProfileMultiChoiceDescriptor",
    },
    {
      expression: /SelfProfileRangeFieldRowDescriptor\s*\(/g,
      symbol: () => "selfProfileRangeDescriptor",
    },
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.expression.exec(source)) != null) {
      const symbol = pattern.symbol(match);
      if (!EDITABLE_SYMBOLS.has(symbol)) continue;
      const openIndex = pattern.expression.lastIndex - 1;
      const closeIndex = matchingDelimiter(source, openIndex, "(", ")");
      if (closeIndex == null) {
        throw new Error(`${file}:${lineAt(source, match.index)}: unclosed call`);
      }
      const argumentsSource = source.slice(openIndex + 1, closeIndex);
      if (source[skipTrivia(source, openIndex + 1)] === "{") {
        pattern.expression.lastIndex = closeIndex + 1;
        continue;
      }
      const contract = namedArgumentExpression(argumentsSource, "contract");
      // Shared widgets name computations with Builder; domain descriptors
      // retain their value-serializer property. Keep the inventory key stable.
      const contractValue = namedArgumentExpression(
        argumentsSource,
        "contractValueBuilder",
      ) ?? namedArgumentExpression(argumentsSource, "contractValue");
      const minimumContract = namedArgumentExpression(
        argumentsSource,
        "minimumContract",
      );
      const maximumContract = namedArgumentExpression(
        argumentsSource,
        "maximumContract",
      );
      const contractExemption = namedArgumentExpression(
        argumentsSource,
        "contractExemption",
      );
      results.push({
        file,
        line: lineAt(source, match.index),
        symbol,
        contract,
        contractValue,
        minimumContract,
        maximumContract,
        contractExemption,
      });
      pattern.expression.lastIndex = closeIndex + 1;
    }
  }
  return results.sort((left, right) => left.line - right.line);
}

function isBound(entry) {
  if (entry.symbol === "rangeSlider") {
    return entry.minimumContract != null && entry.maximumContract != null;
  }
  if (entry.symbol === "selfProfileRangeDescriptor") {
    return entry.contract != null && entry.maximumContract != null;
  }
  if (
    entry.symbol === "formSingleChoiceRow" ||
    entry.symbol === "formMultiChoiceRow" ||
    entry.symbol === "selfProfileSingleChoiceDescriptor" ||
    entry.symbol === "selfProfileMultiChoiceDescriptor"
  ) {
    return entry.contract != null && entry.contractValue != null;
  }
  return entry.contract != null;
}

function namedArgumentExpression(source, name) {
  let index = 0;
  while (index < source.length) {
    index = skipTrivia(source, index);
    const identifier = readIdentifier(source, index);
    if (identifier != null) {
      const afterIdentifier = skipTrivia(source, identifier.end);
      if (source[afterIdentifier] === ":") {
        const expressionStart = skipTrivia(source, afterIdentifier + 1);
        const expressionEnd = topLevelComma(source, expressionStart);
        if (identifier.value === name) {
          return source
            .slice(expressionStart, expressionEnd)
            .trim()
            .replace(/\s+/g, " ");
        }
        index = expressionEnd + 1;
        continue;
      }
    }
    const comma = topLevelComma(source, index);
    if (comma >= source.length) break;
    index = comma + 1;
  }
  return null;
}

function topLevelComma(source, start) {
  const pairs = {"(": ")", "[": "]", "{": "}"};
  const stack = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote != null) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
    } else if (pairs[char] != null) {
      stack.push(pairs[char]);
    } else if (stack.at(-1) === char) {
      stack.pop();
    } else if (char === "," && stack.length === 0) {
      return index;
    }
  }
  return source.length;
}

function matchingDelimiter(source, openIndex, open, close) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote != null) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
    } else if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}

function skipTrivia(source, start) {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
      continue;
    }
    if (source[index] === "/" && source[index + 1] === "/") {
      index = source.indexOf("\n", index + 2);
      if (index < 0) return source.length;
      continue;
    }
    if (source[index] === "/" && source[index + 1] === "*") {
      index = source.indexOf("*/", index + 2);
      if (index < 0) return source.length;
      index += 2;
      continue;
    }
    break;
  }
  return index;
}

function readIdentifier(source, start) {
  const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(start));
  return match == null
    ? null
    : {value: match[0], end: start + match[0].length};
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function listDartFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...listDartFiles(file));
    } else if (entry.isFile() && entry.name.endsWith(".dart")) {
      results.push(file);
    }
  }
  return results;
}

function countBy(rows, keyFor) {
  return Object.fromEntries(
    [...rows.reduce((counts, row) => {
      const key = keyFor(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map()).entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function render(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Lists declared form field bindings whose generated constant no Dart source
 * references. The generator emits constants only for declared bindings, so a
 * stale declaration is the one way the projection can regrow unused code.
 * Lookup prefixes are exempt because their callers build paths at runtime.
 */
export function unreferencedFieldBindings({repoRoot = DEFAULT_ROOT} = {}) {
  const bindings = JSON.parse(fs.readFileSync(
    path.join(repoRoot, FIELD_BINDINGS), "utf8"));
  const generated = fs.readFileSync(
    path.join(repoRoot, FIELD_CONSTRAINTS_OUTPUT), "utf8");
  const nameByPath = new Map([...generated.matchAll(
    /static const (\w+) = CatchContractFieldConstraints\(\s*path: '([^']+)'/g,
  )].map((match) => [match[2], match[1]]));
  const referenced = new Set();
  for (const directory of ["lib", "test", "integration_test", "widgetbook"]) {
    for (const file of listDartFiles(path.join(repoRoot, directory))) {
      if (normalizePath(path.relative(repoRoot, file)) ===
        FIELD_CONSTRAINTS_OUTPUT) continue;
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /CatchContractConstraints\s*\.\s*(\w+)/g,
      )) referenced.add(match[1]);
    }
  }
  return Object.entries(bindings.fields ?? {}).flatMap(([root, fields]) =>
    fields.map((field) => `${root}.${field}`)
      .filter((fieldPath) => !referenced.has(nameByPath.get(fieldPath))));
}

function run() {
  const repoRoot = process.cwd();
  const output = path.join(repoRoot, DEFAULT_OUTPUT);
  const unreferenced = unreferencedFieldBindings({repoRoot});
  if (unreferenced.length > 0) {
    for (const fieldPath of unreferenced) {
      console.error(
        `${FIELD_BINDINGS}: ${fieldPath} is declared but no Dart source ` +
          "references its constant; remove the binding and regenerate.",
      );
    }
    process.exitCode = 1;
    return;
  }
  const inventory = buildFormContractInventory({repoRoot});
  const unbound = inventory.callsites.filter(
    (entry) => !isBound(entry) && entry.contractExemption == null,
  );
  if (unbound.length > 0) {
    for (const entry of unbound) {
      console.error(
        `${entry.file}:${entry.line}: ${entry.symbol} is missing ` +
          (entry.symbol === "rangeSlider"
            ? "generated minimum/maximum contract bindings"
            : entry.symbol === "selfProfileRangeDescriptor"
            ? "generated minimum/maximum descriptor bindings"
            : entry.symbol.includes("Choice") ||
              entry.symbol.includes("ChoiceDescriptor")
            ? "a generated contract binding and contractValue serializer"
            : "a generated contract binding"),
      );
    }
    process.exitCode = 1;
    return;
  }
  const expected = render(inventory);
  if (process.argv.includes("--check")) {
    console.log(
      `Flutter form contracts are valid (${inventory.summary.boundCallsites} ` +
        "bound editable callsites).",
    );
    return;
  }
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, expected);
  console.log(
    `Wrote ${DEFAULT_OUTPUT} (${inventory.summary.boundCallsites} bound ` +
      "editable callsites).",
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === TOOL_FILE) {
  run();
}
