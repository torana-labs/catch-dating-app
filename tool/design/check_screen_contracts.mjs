#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import {fromRepo, repoRoot} from "../lib/repo_paths.mjs";
import {readCaptureCatalogSource} from "../ui_capture/lib/capture_catalog_sources.mjs";

const registryPath = fromRepo("design/screens/catch.screens.json");
const schemaPath = fromRepo("design/screens/catch.screens.schema.json");
const routeInventoryPath = fromRepo("tool/ui_capture/route_inventory.json");
const componentRegistryPath = fromRepo("design/components/catch.components.json");

const args = process.argv.slice(2);
const command = args[0] ?? "--help";

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else if (command === "--check" || command === "check") {
  checkContracts({summary: args.includes("--summary")});
} else if (command === "--summary" || command === "summary") {
  checkContracts({summary: true});
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(64);
}

function checkContracts({summary = false} = {}) {
  const registry = readJson(registryPath);
  const schema = readJson(schemaPath);
  const routeInventory = readJson(routeInventoryPath);
  const componentRegistry = readJson(componentRegistryPath);
  const captureCatalog = parseCaptureCatalog(readCaptureCatalogSource());

  const errors = validateRegistry({
    registry,
    routeInventory,
    componentRegistry,
    captureCatalog,
  });
  const ajv = new Ajv2020({allErrors: true, strict: false});
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      errors.unshift(`schema ${error.instancePath || "/"}: ${error.message}`);
    }
  }

  if (summary || errors.length === 0) {
    printSummary(registry);
  }

  if (errors.length > 0) {
    console.error("Screen contract check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function validateRegistry({registry, routeInventory, componentRegistry, captureCatalog}) {
  const errors = [];
  const routeById = new Map((routeInventory.routes ?? []).map((route) => [route.id, route]));
  const captureIds = new Set(captureCatalog.map((entry) => entry.id));
  const componentIds = new Set((componentRegistry.components ?? []).map((entry) => entry.id));
  const screenIds = new Set();

  if (registry.version !== 1) errors.push("version must be 1.");
  if (!isDate(registry.updated)) errors.push("updated must be YYYY-MM-DD.");
  if (!Array.isArray(registry.screens) || registry.screens.length === 0) {
    errors.push("screens must be a non-empty array.");
    return errors;
  }

  for (const screen of registry.screens) {
    validateScreen(errors, {screen, screenIds, routeById, captureIds, componentIds});
  }

  return errors;
}

function validateScreen(errors, {screen, screenIds, routeById, captureIds, componentIds}) {
  const screenLabel = screen?.id ?? "<missing screen id>";
  if (!/^screen\.[a-z0-9_.-]+$/u.test(screenLabel)) {
    errors.push(`${screenLabel}: screen id must start with screen. and use lowercase dot/dash/underscore.`);
    return;
  }
  if (screenIds.has(screenLabel)) errors.push(`${screenLabel}: duplicate screen id.`);
  screenIds.add(screenLabel);

  if (!screen.name) errors.push(`${screenLabel}: name is required.`);
  if (!screen.owner) errors.push(`${screenLabel}: owner is required.`);
  if (!["P1", "P2", "P3", "P4"].includes(screen.priority)) {
    errors.push(`${screenLabel}: invalid priority ${screen.priority}.`);
  }
  if (!["planned", "in_progress", "ready", "blocked"].includes(screen.status)) {
    errors.push(`${screenLabel}: invalid status ${screen.status}.`);
  }

  validateRoutes(errors, screenLabel, screen.routes, routeById);
  validateDartBinding(errors, `${screenLabel}.source`, screen.source, {requireSymbol: true});
  validateStateController(errors, screenLabel, screen.stateController);
  validateDesignRefs(errors, screenLabel, screen.designRefs);
  validateCaptures(errors, `${screenLabel}.captures`, screen.captures, captureIds);
  validateStates(errors, screenLabel, screen.states, captureIds);
  validateComposition(errors, screenLabel, screen.composition, componentIds);
  validateGaps(errors, `${screenLabel}.openGaps`, screen.openGaps);
}

function validateRoutes(errors, screenLabel, routes, routeById) {
  if (!Array.isArray(routes) || routes.length === 0) {
    errors.push(`${screenLabel}: routes must be a non-empty array.`);
    return;
  }
  const seen = new Set();
  for (const route of routes) {
    const label = `${screenLabel}.routes.${route?.id ?? "<missing route id>"}`;
    if (seen.has(route?.id)) errors.push(`${label}: duplicate route id.`);
    seen.add(route?.id);
    const inventoryRoute = routeById.get(route?.id);
    if (!inventoryRoute) {
      errors.push(`${label}: unknown route id.`);
      continue;
    }
    if (route.path !== inventoryRoute.path) {
      errors.push(`${label}: path '${route.path}' does not match route inventory '${inventoryRoute.path}'.`);
    }
    if (!["primary", "alias", "host"].includes(route.role)) {
      errors.push(`${label}: invalid role ${route.role}.`);
    }
  }
}

function validateStateController(errors, screenLabel, controller) {
  if (!controller?.primary) errors.push(`${screenLabel}.stateController.primary is required.`);
  for (const [key, values] of Object.entries({
    files: controller?.files,
    mutationOwners: controller?.mutationOwners,
  })) {
    if (!Array.isArray(values)) {
      errors.push(`${screenLabel}.stateController.${key} must be an array.`);
      continue;
    }
    for (const binding of values) {
      validateDartBinding(errors, `${screenLabel}.stateController.${key}.${binding?.symbol ?? "<missing symbol>"}`, binding, {
        requireSymbol: true,
      });
    }
  }
}

function validateDesignRefs(errors, screenLabel, refs) {
  if (!Array.isArray(refs)) {
    errors.push(`${screenLabel}.designRefs must be an array.`);
    return;
  }
  const seen = new Set();
  const allowedKinds = new Set(["claude", "figma", "repo", "external", "generated"]);
  const allowedStatuses = new Set(["available", "needs_export", "planned", "blocked"]);
  for (const ref of refs) {
    const label = `${screenLabel}.designRefs.${ref?.id ?? "<missing ref id>"}`;
    if (!/^[a-z0-9_.-]+$/u.test(ref?.id ?? "")) errors.push(`${label}: invalid id.`);
    if (seen.has(ref?.id)) errors.push(`${label}: duplicate id.`);
    seen.add(ref?.id);
    if (!allowedKinds.has(ref?.kind)) errors.push(`${label}: invalid kind ${ref?.kind}.`);
    if (!allowedStatuses.has(ref?.status)) errors.push(`${label}: invalid status ${ref?.status}.`);
    if ((ref?.kind === "repo" || ref?.kind === "generated") && ref.path) {
      validatePath(errors, `${label}.path`, ref.path);
    }
  }
}

function validateCaptures(errors, label, captures, captureIds) {
  if (!Array.isArray(captures)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const capture of captures) {
    const captureLabel = `${label}.${capture?.id ?? "<missing capture id>"}`;
    if (seen.has(capture?.id)) errors.push(`${captureLabel}: duplicate capture id.`);
    seen.add(capture?.id);
    if (!captureIds.has(capture?.id)) errors.push(`${captureLabel}: unknown capture id.`);
    if (!["planned", "captured", "ready", "blocked"].includes(capture?.status)) {
      errors.push(`${captureLabel}: invalid status ${capture?.status}.`);
    }
  }
}

function validateStates(errors, screenLabel, states, captureIds) {
  if (!Array.isArray(states) || states.length === 0) {
    errors.push(`${screenLabel}.states must be a non-empty array.`);
    return;
  }
  const stateIds = new Set();
  const allowedKinds = new Set([
    "loading",
    "populated",
    "empty",
    "error",
    "offline",
    "permission",
    "mutation",
    "theme",
    "accessibility",
  ]);
  const allowedStatuses = new Set(["planned", "implemented", "captured", "tested", "ready", "blocked"]);

  for (const state of states) {
    const label = `${screenLabel}.states.${state?.id ?? "<missing state id>"}`;
    if (!/^[a-z0-9_.-]+$/u.test(state?.id ?? "")) errors.push(`${label}: invalid state id.`);
    if (stateIds.has(state?.id)) errors.push(`${label}: duplicate state id.`);
    stateIds.add(state?.id);
    if (!allowedKinds.has(state?.kind)) errors.push(`${label}: invalid kind ${state?.kind}.`);
    if (!allowedStatuses.has(state?.status)) errors.push(`${label}: invalid status ${state?.status}.`);
    if (!state?.source) errors.push(`${label}: source is required.`);
    if (!state?.nextAction) errors.push(`${label}: nextAction is required.`);
    validateCaptureIdArray(errors, `${label}.captureIds`, state?.captureIds, captureIds);
    validatePathArray(errors, `${label}.tests`, state?.tests);
    if ((state?.status === "captured" || state?.status === "ready") && !state?.captureIds?.length) {
      errors.push(`${label}: ${state.status} states must list captureIds.`);
    }
    const staleCaptureTextField = staleCapturedStateTextField(state);
    if ((state?.status === "captured" || state?.status === "ready") && staleCaptureTextField) {
      errors.push(
        `${label}.${staleCaptureTextField}: ${state.status} state text says capture coverage is missing.`
      );
    }
  }
}

function staleCapturedStateTextField(state) {
  const staleCapturedStateTextPattern =
    /\b(?:no\b[^.]*\bcaptures?\b[^.]*\bexists?\s+yet|captures?\b[^.]*\bnot\s+yet\s+registered)\b/iu;
  const fields = ["source", "nextAction", "notes"];
  for (const field of fields) {
    if (typeof state?.[field] !== "string") continue;
    if (staleCapturedStateTextPattern.test(state[field])) return field;
  }
  return null;
}

function validateComposition(errors, screenLabel, composition, componentIds) {
  if (!composition) {
    errors.push(`${screenLabel}.composition is required.`);
    return;
  }
  if (!composition.currentLayout) errors.push(`${screenLabel}.composition.currentLayout is required.`);
  if (!composition.targetLayout) errors.push(`${screenLabel}.composition.targetLayout is required.`);
  if (!Array.isArray(composition.sections) || composition.sections.length === 0) {
    errors.push(`${screenLabel}.composition.sections must be a non-empty array.`);
    return;
  }

  const sectionIds = new Set();
  for (const section of composition.sections) {
    if (/^section\.[a-z0-9_.-]+$/u.test(section?.id ?? "")) {
      sectionIds.add(section.id);
    }
  }

  for (const section of composition.sections) {
    validateSection(errors, screenLabel, section, sectionIds, componentIds);
  }
}

function validateSection(errors, screenLabel, section, sectionIds, componentIds) {
  const label = `${screenLabel}.sections.${section?.id ?? "<missing section id>"}`;
  if (!/^section\.[a-z0-9_.-]+$/u.test(section?.id ?? "")) errors.push(`${label}: invalid section id.`);
  if (!section?.name) errors.push(`${label}: name is required.`);
  if (!["registered", "implemented_local", "candidate", "planned", "blocked"].includes(section?.status)) {
    errors.push(`${label}: invalid status ${section?.status}.`);
  }
  if (!["compound", "section", "screen-adapter"].includes(section?.layer)) {
    errors.push(`${label}: invalid layer ${section?.layer}.`);
  }
  if (!Array.isArray(section?.claudeComponents)) errors.push(`${label}.claudeComponents must be an array.`);
  validateDartBinding(errors, `${label}.flutter`, section?.flutter, {requireSymbol: true, allowPrivateSymbol: true});
  validateStringArray(errors, `${label}.states`, section?.states);
  if (!section?.currentOwner) errors.push(`${label}: currentOwner is required.`);
  if (!section?.targetOwner) errors.push(`${label}: targetOwner is required.`);
  if (!section?.migration) errors.push(`${label}: migration is required.`);

  if (!Array.isArray(section?.dependencies)) {
    errors.push(`${label}.dependencies must be an array.`);
    return;
  }
  for (const dependency of section.dependencies) {
    if (dependency.startsWith("catch.")) {
      if (!componentIds.has(dependency)) errors.push(`${label}: unknown component dependency ${dependency}.`);
    } else if (dependency.startsWith("section.")) {
      if (!sectionIds.has(dependency)) errors.push(`${label}: unknown section dependency ${dependency}.`);
    } else {
      errors.push(`${label}: dependency must be catch.* or section.*: ${dependency}.`);
    }
  }
}

function validateGaps(errors, label, gaps) {
  if (!Array.isArray(gaps)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const gap of gaps) {
    const gapLabel = `${label}.${gap?.id ?? "<missing gap id>"}`;
    if (!/^[A-Z0-9-]+$/u.test(gap?.id ?? "")) errors.push(`${gapLabel}: invalid gap id.`);
    if (seen.has(gap?.id)) errors.push(`${gapLabel}: duplicate gap id.`);
    seen.add(gap?.id);
    if (!["open", "in_progress", "blocked", "closed"].includes(gap?.status)) {
      errors.push(`${gapLabel}: invalid status ${gap?.status}.`);
    }
    if (!gap?.nextAction) errors.push(`${gapLabel}: nextAction is required.`);
  }
}

function validateDartBinding(errors, label, binding, {requireSymbol = true, allowPrivateSymbol = false} = {}) {
  if (!binding?.file) {
    errors.push(`${label}: file is required.`);
    return;
  }
  const filePath = fromRepo(binding.file);
  if (!fs.existsSync(filePath)) {
    errors.push(`${label}: missing file ${binding.file}.`);
    return;
  }
  if (!binding.symbol && requireSymbol) {
    errors.push(`${label}: symbol is required.`);
    return;
  }
  if (binding.symbol) {
    if (!allowPrivateSymbol && binding.symbol.startsWith("_")) {
      errors.push(`${label}: private symbol ${binding.symbol} cannot be used here.`);
    }
    const source = fs.readFileSync(filePath, "utf8");
    if (!new RegExp(`\\b${escapeRegExp(binding.symbol)}\\b`, "u").test(source)) {
      errors.push(`${label}: symbol ${binding.symbol} not found in ${binding.file}.`);
    }
  }
}

function validateCaptureIdArray(errors, label, values, captureIds) {
  if (values === undefined) return;
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label}: duplicate ${value}.`);
    seen.add(value);
    if (!captureIds.has(value)) errors.push(`${label}: unknown capture id ${value}.`);
  }
}

function validatePathArray(errors, label, values) {
  if (values === undefined) return;
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label}: duplicate ${value}.`);
    seen.add(value);
    validatePath(errors, label, value);
  }
}

function validateStringArray(errors, label, values) {
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${label}: duplicate ${value}.`);
    seen.add(value);
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${label}: values must be non-empty strings.`);
    }
  }
}

function validatePath(errors, label, value) {
  if (!value) {
    errors.push(`${label}: path is required.`);
    return;
  }
  if (!fs.existsSync(fromRepo(value))) {
    errors.push(`${label}: missing path ${value}.`);
  }
}

function parseCaptureCatalog(source) {
  return [...source.matchAll(/\bid:\s*'([^']+)'/gu)].map((match) => ({id: match[1]}));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Failed to parse ${path.relative(repoRoot, file)}: ${error.message}`);
    process.exit(1);
  }
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value ?? "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printSummary(registry) {
  const sectionCount = (registry.screens ?? []).reduce(
    (total, screen) => total + (screen.composition?.sections?.length ?? 0),
    0,
  );
  console.log(`Screen contract check passed (${registry.screens.length} screens, ${sectionCount} sections).`);
}

function printHelp() {
  console.log(`Usage:
  node tool/design/check_screen_contracts.mjs --check
  node tool/design/check_screen_contracts.mjs --summary

Validates design/screens/catch.screens.json against route inventory, capture
catalog entries, component dependencies, Flutter source paths, and Dart symbols.`);
}
