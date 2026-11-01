#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo, relativeToRepo, repoRoot} from "../lib/repo_paths.mjs";

const componentRegistryPath = fromRepo("design/components/catch.components.json");
const screenContractsPath = fromRepo("design/screens/catch.screens.json");
const widgetbookDirectoriesPath = fromRepo("widgetbook/lib/main.directories.g.dart");
const widgetbookPrimitiveContractsPath = fromRepo("widgetbook/lib/primitives/contracts");
const requiredFoundationSpecimens = [
  {
    component: "FoundationColorTokens",
    useCase: "Color roles",
    builder: "foundationColorRoles",
  },
  {
    component: "FoundationSpacingTokens",
    useCase: "Spacing and layout",
    builder: "foundationSpacingAndLayout",
  },
  {
    component: "FoundationShapeTokens",
    useCase: "Radius elevation opacity",
    builder: "foundationShapeTokens",
  },
  {
    component: "FoundationTypographyTokens",
    useCase: "Typography roles",
    builder: "foundationTypographyRoles",
  },
  {
    component: "FoundationIconMediaTokens",
    useCase: "Icons and media geometry",
    builder: "foundationIconMediaTokens",
  },
  {
    component: "FoundationStrokeMotionTokens",
    useCase: "Stroke and motion",
    builder: "foundationStrokeMotionTokens",
  },
  {
    component: "FoundationDataPhotoTokens",
    useCase: "Data pairs and photo grade",
    builder: "foundationDataPhotoTokens",
  },
  {
    component: "FoundationBrandTokens",
    useCase: "Wordmark",
    builder: "foundationBrandTokens",
  },
];
const requiredGeometrySpecimens = [
  {
    component: "CatchSheet",
    builder: "modalGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/modals.dart",
  },
  {
    component: "CatchButton",
    builder: "buttonGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/buttons.dart",
  },
  {
    component: "CatchMenu",
    builder: "menuGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/menus.dart",
  },
  {
    component: "CatchSection",
    builder: "fieldAndSectionGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/fields.dart",
  },
  {
    component: "CatchTabBar",
    builder: "bottomNavigationGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/navigation.dart",
  },
  {
    component: "CatchTopBar",
    builder: "topBarGeometryMatrix",
    sourcePath: "widgetbook/lib/geometry/specimens/top_bars.dart",
  },
];

const args = process.argv.slice(2);
const command = args[0] ?? "--help";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
  } else if (command === "--check" || command === "check") {
    checkRefs();
  } else if (command === "--summary" || command === "summary") {
    checkRefs({summary: true});
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(64);
  }
}

function checkRefs({summary = false} = {}) {
  const componentRegistry = readJson(componentRegistryPath);
  const screenContracts = readJson(screenContractsPath);
  const widgetbookSource = fs.readFileSync(widgetbookDirectoriesPath, "utf8");
  const widgetbook = parseWidgetbookDirectories(widgetbookSource);
  const primitiveContracts = collectPrimitiveContractUseCases();
  const widgetbookSources = collectWidgetbookUseCaseSources();

  const errors = [
    ...validateGeneratedWidgetbookUseCases(widgetbook, widgetbookSources),
    ...validateComponentPreviews(componentRegistry, widgetbook),
    ...validatePrimitiveContractUseCases(componentRegistry, primitiveContracts),
    ...validateFoundationSpecimens(widgetbook),
    ...validateGeometrySpecimens(widgetbook, widgetbookSources),
    ...validatePreviewRefs({screenContracts, widgetbook}),
  ];

  if (summary || errors.length === 0) {
    console.log(
      [
        `Widgetbook contract refs: ${relativeToRepo(widgetbookDirectoriesPath)}`,
        `Components: ${widgetbook.componentNames.size}`,
        `Use case builders: ${widgetbook.builderNames.size}`,
        `Generated builder refs: ${widgetbook.builderRefs.length}`,
        `Annotated Widgetbook use cases: ${widgetbookSources.useCases.length}`,
        `Formal primitive contract previews: ${primitiveContracts.contractIds.size}`,
        `Required foundation specimens: ${requiredFoundationSpecimens.length}`,
        `Required geometry specimens: ${requiredGeometrySpecimens.length}`,
        `Referenced preview ids: ${collectPreviewRefs(screenContracts).length}`,
      ].join("\n")
    );
  }

  if (errors.length > 0) {
    console.error("Widgetbook contract reference check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function validateGeneratedWidgetbookUseCases(widgetbook, widgetbookSources) {
  const errors = [];

  for (const ref of widgetbook.builderRefs) {
    if (!ref.sourcePath) {
      errors.push(
        `${relativeToRepo(widgetbookDirectoriesPath)}: generated builder ${ref.alias}.${ref.builder} has no matching widgetbook_workspace import.`
      );
      continue;
    }

    const sourceKey = `${ref.sourcePath}:${ref.builder}`;
    if (widgetbookSources.useCaseKeys.has(sourceKey)) continue;

    const sourceState = widgetbookSources.functionKeys.has(sourceKey)
      ? "the function exists but is not annotated with @widgetbook.UseCase"
      : "the function is missing";
    errors.push(
      `${relativeToRepo(widgetbookDirectoriesPath)}: generated builder ${ref.alias}.${ref.builder} is stale; ${sourceState} in ${ref.sourcePath}.`
    );
  }

  for (const useCase of widgetbookSources.useCases) {
    const generatedKey = `${useCase.sourcePath}:${useCase.builder}`;
    if (widgetbook.generatedUseCaseKeys.has(generatedKey)) continue;
    errors.push(
      `${useCase.sourcePath}:${useCase.builder}: annotated @widgetbook.UseCase is missing from ${relativeToRepo(widgetbookDirectoriesPath)}. Run Widgetbook build_runner and fix any generator errors.`
    );
  }

  return errors;
}

function validateComponentPreviews(componentRegistry, widgetbook) {
  const errors = [];
  for (const component of componentRegistry.components ?? []) {
    const symbol = component.dart?.symbol;
    if (!symbol) continue;
    if (!widgetbook.componentNames.has(symbol)) {
      errors.push(`${component.id}: missing Widgetbook component for Dart symbol ${symbol}.`);
    }
  }
  return errors;
}

export function validatePrimitiveContractUseCases(componentRegistry, primitiveContracts) {
  const errors = [];
  const contractEntries = collectComponentContractEntries(componentRegistry);
  const componentIds = new Set(contractEntries.map((entry) => entry.id));
  const componentSymbols = new Set(contractEntries.map((entry) => entry.symbol).filter(Boolean));

  for (const entry of contractEntries) {
    if (entry.primary && !primitiveContracts.contractIds.has(entry.id)) {
      errors.push(
        `${entry.id}: missing formal Widgetbook primitive contract preview in ${relativeToRepo(widgetbookPrimitiveContractsPath)}.`
      );
    }
    const expectedStates = entry.states ?? [];
    const actualStates = primitiveContracts.statesByContractId.get(entry.id);
    if (actualStates) {
      const expected = expectedStates.join(",");
      const actual = actualStates.join(",");
      if (actual !== expected) {
        errors.push(
          `${entry.id}: Widgetbook contract states [${actual}] do not match component contract states [${expected}].`
        );
      }
    }
    if (entry.primary && entry.symbol && !primitiveContracts.types.has(entry.symbol)) {
      errors.push(
        `${entry.id}: formal Widgetbook primitive contract preview is missing @UseCase type ${entry.symbol}.`
      );
    }
  }

  for (const contractId of primitiveContracts.contractIds) {
    if (!componentIds.has(contractId)) {
      errors.push(
        `${relativeToRepo(widgetbookPrimitiveContractsPath)}: contractId ${contractId} is not declared in ${relativeToRepo(componentRegistryPath)}.`
      );
    }
  }
  for (const type of primitiveContracts.types) {
    if (!componentSymbols.has(type)) {
      errors.push(
        `${relativeToRepo(widgetbookPrimitiveContractsPath)}: @UseCase type ${type} is not declared as a component contract Dart symbol.`
      );
    }
  }

  return errors;
}

function collectComponentContractEntries(componentRegistry) {
  const entries = [];
  for (const component of componentRegistry.components ?? []) {
    const requiresPrimitiveContractPreview = component.kind !== "screen-contract";
    entries.push({
      id: component.id,
      symbol: component.dart?.symbol,
      states: component.contract?.states ?? [],
      parentId: component.id,
      primary: requiresPrimitiveContractPreview,
    });
    for (const member of component.contract?.members ?? []) {
      entries.push({
        id: member.id,
        symbol: member.symbol,
        states: member.states ?? [],
        parentId: component.id,
        primary: false,
      });
    }
  }
  return entries;
}

function validateFoundationSpecimens(widgetbook) {
  const errors = [];
  for (const specimen of requiredFoundationSpecimens) {
    if (!widgetbook.componentNames.has(specimen.component)) {
      errors.push(
        `foundation.${slug(specimen.component)}: missing required Widgetbook foundation component ${specimen.component}.`
      );
    }
    if (!widgetbook.useCaseNames.has(specimen.useCase)) {
      errors.push(
        `foundation.${slug(specimen.component)}: missing required Widgetbook foundation use case "${specimen.useCase}".`
      );
    }
    if (!widgetbook.builderNames.has(specimen.builder)) {
      errors.push(
        `foundation.${slug(specimen.component)}: missing required Widgetbook foundation builder ${specimen.builder}.`
      );
    }
  }
  return errors;
}

export function validateGeometrySpecimens(widgetbook, widgetbookSources) {
  const errors = [];
  for (const specimen of requiredGeometrySpecimens) {
    const sourceKey = `${specimen.sourcePath}:${specimen.builder}`;
    const useCase = widgetbookSources.useCaseByKey.get(sourceKey);
    if (!useCase) {
      errors.push(
        `geometry.${slug(specimen.component)}: missing required Widgetbook geometry use case ${specimen.sourcePath}:${specimen.builder}.`
      );
      continue;
    }
    if (useCase.type !== specimen.component) {
      errors.push(
        `geometry.${slug(specimen.component)}: expected @UseCase type ${specimen.component}, found ${useCase.type ?? "none"}.`
      );
    }
    if (useCase.path !== "[Geometry system]") {
      errors.push(
        `geometry.${slug(specimen.component)}: expected @UseCase path "[Geometry system]", found ${useCase.path ?? "none"}.`
      );
    }
    if (!widgetbook.generatedUseCaseKeys.has(sourceKey)) {
      errors.push(
        `geometry.${slug(specimen.component)}: required geometry use case is missing from generated Widgetbook directories.`
      );
    }
  }
  return errors;
}

function validatePreviewRefs({screenContracts, widgetbook}) {
  const errors = [];
  for (const ref of collectPreviewRefs(screenContracts)) {
    if (!widgetbook.acceptedPreviewIds.has(ref.previewId)) {
      errors.push(`${ref.owner}: unknown Widgetbook previewId ${ref.previewId}.`);
    }
  }
  return errors;
}

function collectPreviewRefs(screenContracts) {
  const refs = [];
  for (const screen of screenContracts.screens ?? []) {
    for (const state of screen.states ?? []) {
      for (const previewId of state.previewIds ?? []) {
        refs.push({owner: `${screen.id}.${state.id}`, previewId});
      }
    }
    for (const section of screen.composition?.sections ?? []) {
      for (const previewId of section.previewIds ?? []) {
        refs.push({owner: `${screen.id}.${section.id}`, previewId});
      }
    }
  }
  return refs;
}

function parseWidgetbookDirectories(source) {
  const importAliases = parseWidgetbookWorkspaceImports(source);
  const builderRefs = [
    ...source.matchAll(/builder:\s*([A-Za-z0-9_]+)\s*\.\s*([A-Za-z0-9_]+),/gu),
  ].map((match) => ({
    alias: match[1],
    builder: match[2],
    sourcePath: importAliases.get(match[1]) ?? null,
  }));
  const generatedUseCaseKeys = new Set(
    builderRefs
      .filter((ref) => ref.sourcePath)
      .map((ref) => `${ref.sourcePath}:${ref.builder}`)
  );
  const componentNames = new Set(
    [...source.matchAll(/WidgetbookComponent\(\s*name: '([^']+)'/gu)].map(
      (match) => match[1]
    )
  );
  const useCaseNames = new Set(
    [...source.matchAll(/WidgetbookUseCase\(\s*name: '([^']+)'/gu)].map(
      (match) => match[1]
    )
  );
  const builderNames = new Set(builderRefs.map((ref) => ref.builder));
  const acceptedPreviewIds = new Set(builderNames);

  for (const componentName of componentNames) {
    acceptedPreviewIds.add(componentName);
    acceptedPreviewIds.add(slug(componentName));
    for (const useCaseName of useCaseNames) {
      acceptedPreviewIds.add(`${componentName}/${useCaseName}`);
      acceptedPreviewIds.add(`${slug(componentName)}/${slug(useCaseName)}`);
    }
  }

  return {
    componentNames,
    useCaseNames,
    builderNames,
    builderRefs,
    generatedUseCaseKeys,
    acceptedPreviewIds,
  };
}

function parseWidgetbookWorkspaceImports(source) {
  const imports = new Map();
  for (const match of source.matchAll(
    /import\s+'package:widgetbook_workspace\/([^']+)'\s+as\s+([A-Za-z0-9_]+);/gu
  )) {
    imports.set(match[2], `widgetbook/lib/${match[1]}`);
  }
  return imports;
}

function collectWidgetbookUseCaseSources() {
  const useCases = [];
  const useCaseKeys = new Set();
  const useCaseByKey = new Map();
  const functionKeys = new Set();

  for (const file of collectDartFiles(fromRepo("widgetbook/lib"))) {
    const source = fs.readFileSync(file, "utf8");
    const sourcePath = relativeToRepo(file);

    for (const match of source.matchAll(/(?:^|\n)Widget\s+([A-Za-z0-9_]+)\s*\(/gu)) {
      functionKeys.add(`${sourcePath}:${match[1]}`);
    }

    for (const match of source.matchAll(
      /@widgetbook\.UseCase\(([\s\S]*?)\)\s*Widget\s+([A-Za-z0-9_]+)\s*\(/gu
    )) {
      const annotation = match[1];
      const builder = match[2];
      const useCase = {
        sourcePath,
        builder,
        path: matchString(annotation, /\bpath:\s*'([^']+)'/u),
        type: matchString(annotation, /\btype:\s*([A-Za-z0-9_]+)/u),
      };
      const sourceKey = `${sourcePath}:${builder}`;
      useCases.push(useCase);
      useCaseKeys.add(sourceKey);
      useCaseByKey.set(sourceKey, useCase);
    }
  }

  return {useCases, useCaseKeys, useCaseByKey, functionKeys};
}

function collectDartFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectDartFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".dart")) continue;
    if (entry.name.endsWith(".g.dart")) continue;
    files.push(fullPath);
  }
  return files;
}

export function collectPrimitiveContractUseCases({root = fromRepo()} = {}) {
  const directory = path.join(root, "widgetbook/lib/primitives/contracts");
  const files = collectDartFiles(directory).sort();
  if (files.length === 0) throw new Error("Primitive contract directory has no Dart sources.");
  return parsePrimitiveContractUseCases(files.map(file => fs.readFileSync(file, "utf8")).join("\n"));
}

export function parsePrimitiveContractUseCases(source) {
  const statesByContractId = new Map();
  for (const block of extractCallBlocks(source, "WidgetbookContractFrame")) {
    const contractId = matchString(block, /\bcontractId:\s*'([^']+)'/u);
    const statesMatch =
      /\bstates:\s*(?:const\s*)?(?:<String>\s*)?\[([\s\S]*?)\]/u.exec(block);
    const statesBlock = statesMatch?.[1] ?? null;
    if (!contractId) continue;
    // Named recipes share one component contract. Preserve declaration order
    // while collecting every recipe; a later preview must not hide earlier
    // states or let a missing recipe silently pass.
    statesByContractId.set(contractId, [...new Set([
      ...(statesByContractId.get(contractId) ?? []),
      ...parseStringList(statesBlock),
    ])]);
  }

  return {
    contractIds: new Set(
      [...source.matchAll(/contractId:\s*'([^']+)'/gu)].map((match) => match[1])
    ),
    types: new Set(
      [...source.matchAll(/@widgetbook\.UseCase\(\s*[\s\S]*?type:\s*([A-Za-z0-9_]+),/gu)].map(
        (match) => match[1]
      )
    ),
    statesByContractId,
  };
}

function parseStringList(value) {
  if (!value) return [];
  return [...value.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function matchString(source, pattern) {
  return pattern.exec(source)?.[1] ?? null;
}

function extractCallBlocks(source, callName) {
  const blocks = [];
  let searchIndex = 0;
  while (searchIndex < source.length) {
    const callIndex = source.indexOf(`${callName}(`, searchIndex);
    if (callIndex === -1) break;
    const openIndex = source.indexOf("(", callIndex);
    const endIndex = findBalancedEnd(source, openIndex, "(", ")");
    blocks.push(source.slice(callIndex, endIndex + 1));
    searchIndex = endIndex + 1;
  }
  return blocks;
}

function findBalancedEnd(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      stringQuote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Could not find balanced ${openChar}${closeChar} block.`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${path.relative(repoRoot, file)}: ${error.message}`);
    process.exit(1);
  }
}

function slug(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_widgetbook_contract_refs.mjs --check
  node tool/design/check_widgetbook_contract_refs.mjs --summary

Validates that component contracts have Widgetbook component entries, formal
primitive contract previews with matching contract-state lists, and that any
previewIds declared by screen/state contracts refer to generated Widgetbook
components, use cases, or builder ids. Also validates that required
foundation-token and comparative component-geometry specimen pages stay
present in generated Widgetbook output.`);
}
