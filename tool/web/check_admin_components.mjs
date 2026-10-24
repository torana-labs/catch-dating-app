#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {fromRepo} from "../lib/repo_paths.mjs";

// Blueprint D18: the library draws; features arrange and bind. A component
// that one feature (or only the app shell) renders is that owner's T4 entry,
// drawn in @catch/web-ui. Entries still under shared/ui await that move.
const libraryHome = "packages/web-ui/src/components/";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

const componentsPath = fromRepo(args.components ?? "design/admin/components.json");
const schemaPath = fromRepo("design/admin/admin.components.schema.json");

const errors = [];
const warnings = [];

const registry = readJson(componentsPath, "admin component registry");

validateRegistryShape(registry);
validateComponents(registry.components ?? []);
validateExportCoverage(registry.components ?? []);
validateAdminChrome();
validateAdminPresentationCopy();

if (errors.length > 0) {
  console.error("Admin component registry check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (args.summary || warnings.length > 0) {
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  console.log(
    [
      `Admin component registry ok: ${registry.components.length} component contract(s).`,
      `Preview-ready components: ${registry.components.filter((component) => component.preview?.status === "ready").length}.`,
      `Feature components awaiting their D18 move into @catch/web-ui: ${registry.components.filter((component) =>
        component.kind === "feature-component" &&
        normalizeRepoPath(component.source ?? "").startsWith("admin/src/shared/ui/")).length}.`,
      `Contract: ${path.relative(fromRepo("."), componentsPath)}`,
    ].join("\n"),
  );
}

function validateRegistryShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("components.json must be a JSON object.");
    return;
  }
  if (value.$schema !== "./admin.components.schema.json") {
    errors.push("components.json must reference ./admin.components.schema.json.");
  }
  if (!fs.existsSync(schemaPath)) {
    errors.push("missing design/admin/admin.components.schema.json.");
  }
  if (!Number.isInteger(value.version) || value.version < 1) {
    errors.push("components.json version must be a positive integer.");
  }
  if (value.owner !== "admin_dashboard") {
    errors.push("components.json owner must be admin_dashboard.");
  }
  if (value.coverage?.strategy !== "route-workspace-plus-shared-primitives") {
    errors.push("components.json coverage.strategy must be route-workspace-plus-shared-primitives.");
  }
  if (!Array.isArray(value.components) || value.components.length === 0) {
    errors.push("components.json must declare at least one component.");
  }
}

function validateComponents(components) {
  const componentIds = new Set();
  const componentById = new Map();
  const readyStorySources = new Map();
  const sourceExportsByPath = new Map();
  const allowedKinds = new Set(["route", "workspace", "shared-primitive", "feature-component", "provider"]);
  const allowedPreviewStatuses = new Set(["ready", "planned", "not-required"]);

  for (const component of components) {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      errors.push("component entries must be objects.");
      continue;
    }

    const label = component.id ?? "<missing-id>";
    if (!component.id) errors.push("component missing id.");
    if (component.id && componentIds.has(component.id)) {
      errors.push(`${label}: duplicate component id.`);
    }
    if (component.id) componentIds.add(component.id);
    if (component.id) componentById.set(component.id, component);

    if (!allowedKinds.has(component.kind)) errors.push(`${label}: invalid kind ${component.kind}.`);
    if (!component.owner) errors.push(`${label}: missing owner.`);
    if (!component.source) errors.push(`${label}: missing source.`);
    if (!component.exportName) errors.push(`${label}: missing exportName.`);

    const preview = component.preview;
    if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
      errors.push(`${label}: missing preview coverage object.`);
    } else {
      if (!allowedPreviewStatuses.has(preview.status)) {
        errors.push(`${label}: invalid preview.status ${preview.status}.`);
      }
      if (!Array.isArray(preview.states) || preview.states.length === 0) {
        errors.push(`${label}: preview.states must list at least one state.`);
      }
      if (preview.status === "ready" && (!preview.story || !preview.exportName)) {
        errors.push(`${label}: ready preview coverage needs story and exportName.`);
      } else if (preview.status === "ready") {
        validateReadyPreview(label, preview, component, readyStorySources);
      }
      if (preview.status !== "ready" && (preview.story || preview.exportName)) {
        warnings.push(`${label}: preview story metadata is ignored because status is ${preview.status}.`);
      }
    }

    if (!Array.isArray(component.css)) {
      errors.push(`${label}: css must be an array, even when empty.`);
    } else {
      for (const cssPath of component.css) {
        if (!fs.existsSync(fromRepo(cssPath))) {
          errors.push(`${label}: css file does not exist: ${cssPath}.`);
        }
      }
    }

    const sourcePath = component.source ? fromRepo(component.source) : null;
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      errors.push(`${label}: source file does not exist: ${component.source}.`);
      continue;
    }

    let exports = sourceExportsByPath.get(sourcePath);
    if (!exports) {
      exports = exportedReactComponents(fs.readFileSync(sourcePath, "utf8"));
      sourceExportsByPath.set(sourcePath, exports);
    }
    if (!exports.has(component.exportName)) {
      errors.push(`${label}: source does not export ${component.exportName}.`);
    }

    validateKindAgainstSource(component, label);
  }

  validateStoryDeclarations({componentById, readyStorySources});
}

function validateReadyPreview(label, preview, component, readyStorySources) {
  const storyPath = fromRepo(preview.story);
  if (!fs.existsSync(storyPath)) {
    errors.push(`${label}: preview story file does not exist: ${preview.story}.`);
    return;
  }

  let source = readyStorySources.get(storyPath);
  if (!source) {
    source = fs.readFileSync(storyPath, "utf8");
    readyStorySources.set(storyPath, source);
  }

  const storyExportPattern = new RegExp(`export\\s+const\\s+${escapeRegExp(preview.exportName)}\\b`, "u");
  if (!storyExportPattern.test(source)) {
    errors.push(`${label}: preview story file does not export ${preview.exportName}.`);
  }

  const coveredStates = storyStatesForComponent(source, component.id);
  for (const state of preview.states ?? []) {
    if (coveredStates.has(state)) continue;
    errors.push(`${label}: preview story does not declare state ${state}.`);
  }
}

function validateStoryDeclarations({componentById, readyStorySources}) {
  const exportsByComponent = new Map();

  for (const [storyPath, source] of readyStorySources.entries()) {
    const declarations = storyComponentDeclarations(source);
    for (const declaration of declarations) {
      const storyLabel = `${path.relative(fromRepo("."), storyPath)}:${declaration.exportName}`;
      const component = componentById.get(declaration.id);
      if (!component) {
        errors.push(`${storyLabel}: declares unknown catchComponent.id ${declaration.id}.`);
        continue;
      }
      if (component.preview?.status !== "ready") {
        errors.push(
          `${storyLabel}: declares ${declaration.id}, but registry status is ${component.preview?.status}.`,
        );
      }
      if (component.preview?.story && fromRepo(component.preview.story) !== storyPath) {
        errors.push(
          `${storyLabel}: declares ${declaration.id}, but registry points to ${component.preview.story}.`,
        );
      }
      if (declaration.states.length === 0) {
        errors.push(`${storyLabel}: catchComponent.states must list at least one state.`);
      }
      for (const state of declaration.states) {
        if (!component.preview.states.includes(state)) {
          errors.push(`${storyLabel}: state ${state} is not registered for ${declaration.id}.`);
        }
      }

      const exports = exportsByComponent.get(declaration.id) ?? new Set();
      exports.add(declaration.exportName);
      exportsByComponent.set(declaration.id, exports);
    }
  }

  for (const component of componentById.values()) {
    if (component.preview?.status !== "ready") continue;
    const exports = exportsByComponent.get(component.id) ?? new Set();
    if (!exports.has(component.preview.exportName)) {
      errors.push(
        `${component.id}: ready preview export ${component.preview.exportName} must declare catchComponent.id ${component.id}.`,
      );
    }
  }
}

function validateKindAgainstSource(component, label) {
  const source = normalizeRepoPath(component.source);
  if (component.kind === "route" && !source.startsWith("admin/src/features/")) {
    errors.push(`${label}: route components must live under admin/src/features.`);
  }
  if (component.kind === "workspace" && !source.startsWith("admin/src/features/")) {
    errors.push(`${label}: workspace components must live under admin/src/features.`);
  }
  if (component.kind === "shared-primitive" && !isDrawingHome(source)) {
    errors.push(`${label}: shared-primitive components must live under ${libraryHome} (or await their D18 move from admin/src/shared/ui).`);
  }
  if (component.kind === "feature-component") {
    errors.push(...featureComponentPlacementErrors(component, label));
  }
  if (component.kind === "provider" && !source.startsWith("admin/src/shared/feedback/")) {
    errors.push(`${label}: provider components must live under admin/src/shared/feedback.`);
  }
}

function isDrawingHome(source) {
  return source.startsWith(libraryHome) || source.startsWith("admin/src/shared/ui/");
}

function featureComponentPlacementErrors(component, label) {
  const source = normalizeRepoPath(component.source ?? "");
  const owner = component.owner ?? "";
  if (!/^(?:features\/[a-z0-9-]+|app)$/u.test(owner)) {
    return [`${label}: feature-component owner must be features/<feature> or app, not ${owner}.`];
  }
  if (isDrawingHome(source)) return [];
  return [`${label}: feature-component owned by ${owner} must live under ${libraryHome} (or await its D18 move from admin/src/shared/ui); its feature keeps only the binding.`];
}

function validateExportCoverage(components) {
  const registeredExports = new Set(
    components.map((component) =>
      `${normalizeRepoPath(component.source)}::${component.exportName}`,
    ),
  );

  const requiredExports = [
    ...featureComponentExports(),
    ...sharedComponentExports("admin/src/shared/ui", "shared UI primitive"),
    ...sharedComponentExports("admin/src/shared/feedback", "shared feedback provider"),
  ];

  for (const exported of requiredExports) {
    if (registeredExports.has(`${exported.source}::${exported.name}`)) continue;
    errors.push(
      `${exported.source}: exported ${exported.label} ${exported.name} must be registered in design/admin/components.json.`,
    );
  }
}

function validateAdminChrome() {
  const appPath = fromRepo("admin/src/app/App.tsx");
  if (!fs.existsSync(appPath)) {
    errors.push("missing admin/src/app/App.tsx for admin chrome validation.");
    return;
  }
  errors.push(...adminChromeErrors(fs.readFileSync(appPath, "utf8")));
}

function validateAdminPresentationCopy() {
  const sourcePaths = [
    ...walkFiles(fromRepo("admin/src"), ".ts"),
    ...walkFiles(fromRepo("admin/src"), ".tsx"),
  ];
  for (const filePath of sourcePaths) {
    if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) continue;
    errors.push(...adminPresentationCopyErrors(
      fs.readFileSync(filePath, "utf8"),
      relativeToRepo(filePath),
    ));
  }
}

function adminPresentationCopyErrors(source, label = "admin source") {
  const forbiddenCopy = [
    "sample access application",
    "sample safety item",
    "sample organizer",
    "sample event",
    "sample draft created",
    "sample queue item",
    "generated sample",
    "generated sample bridge",
    "sample-mode review",
  ];
  const normalizedSource = source.toLowerCase();
  const copyErrors = [];
  for (const phrase of forbiddenCopy) {
    if (!normalizedSource.includes(phrase)) continue;
    copyErrors.push(`${label}: admin-facing copy must not expose prototype phrase ${phrase}.`);
  }
  return copyErrors;
}

function adminChromeErrors(source) {
  const chromeErrors = [];
  if (!source.includes("<AdminBrandTitle>Catch Admin</AdminBrandTitle>")) {
    chromeErrors.push("admin shell brand must be the single product label Catch Admin.");
  }

  const {topbars, headings, subtitle} = adminTopbarContent(source);
  if (topbars !== 1 || headings.length !== 1 || headings[0].element !== "h1" || !headings[0].routeTitle) {
    chromeErrors.push("admin top bar must render the route-owned topbarTitle as its single heading.");
  }
  if (subtitle) {
    chromeErrors.push("admin top bar must not add a kicker, secondary PageHeader, or subtitle.");
  }

  const forbiddenLabels = ["Catch Ops", "sample console", "dev · sample"];
  for (const label of forbiddenLabels) {
    if (!source.toLowerCase().includes(label.toLowerCase())) continue;
    chromeErrors.push(`admin shell must not expose prototype label ${label}.`);
  }
  return chromeErrors;
}

function adminTopbarContent(source) {
  const unit = ts.createSourceFile("admin.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const textNames = new Set();
  for (const statement of unit.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== "@catch/web-ui") continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      if ((specifier.propertyName?.text ?? specifier.name.text) === "CatchText") textNames.add(specifier.name.text);
    }
  }
  const topbars = [];
  function collect(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(unit) === "AdminTopbar") topbars.push(node);
    ts.forEachChild(node, collect);
  }
  collect(unit);
  const headings = [];
  let subtitle = false;
  function inspect(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const name = opening.tagName.getText(unit);
      const attributes = opening.attributes.properties;
      const literal = (name) => {
        const attribute = attributes.find((item) => ts.isJsxAttribute(item) && item.name.getText(unit) === name);
        const value = attribute?.initializer;
        if (value && ts.isStringLiteral(value)) return value.text;
        if (value && ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression)) return value.expression.text;
        return null;
      };
      const element = textNames.has(name)
        ? (attributes.some(ts.isJsxSpreadAttribute) ? null : literal("as") ?? "p")
        : name;
      if (/^h[1-6]$/u.test(element ?? "") || literal("role") === "heading") {
        const children = ts.isJsxElement(node) ? node.children.filter((child) => !ts.isJsxText(child) || child.text.trim()) : [];
        const content = children.length === 1 && ts.isJsxExpression(children[0]) ? children[0].expression : null;
        headings.push({element, routeTitle: Boolean(content && ts.isIdentifier(content) && content.text === "topbarTitle")});
      }
      if (["AdminEyebrow", "PageHeader"].includes(name) || element === "p") subtitle = true;
    }
    ts.forEachChild(node, inspect);
  }
  for (const topbar of topbars) for (const child of topbar.children) inspect(child);
  return {topbars: topbars.length, headings, subtitle};
}

function featureComponentExports() {
  const exports = [];
  for (const filePath of walkFiles(fromRepo("admin/src/features"), ".tsx")) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = relativeToRepo(filePath);
    for (const name of exportedReactComponents(source)) {
      if (!/(?:Screen|Workspace)$/u.test(name)) continue;
      exports.push({source: relativePath, name, label: "feature route/workspace component"});
    }
  }
  return exports;
}

function sharedComponentExports(root, label) {
  const exports = [];
  for (const filePath of walkFiles(fromRepo(root), ".tsx")) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = relativeToRepo(filePath);
    for (const name of exportedReactComponents(source)) {
      exports.push({source: relativePath, name, label});
    }
  }
  return exports;
}

function exportedReactComponents(source) {
  const components = new Set();
  const pattern =
    /\bexport\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\b|\bexport\s+const\s+([A-Z][A-Za-z0-9_]*)\b|\bexport\s+class\s+([A-Z][A-Za-z0-9_]*)\b/gu;
  for (const match of source.matchAll(pattern)) {
    components.add(match[1] ?? match[2] ?? match[3]);
  }
  return components;
}

function walkFiles(directory, extension) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "storybook-static") continue;
      files.push(...walkFiles(fullPath, extension));
      continue;
    }
    if (entry.name.endsWith(extension)) files.push(fullPath);
  }
  return files;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
}

function normalizeRepoPath(value) {
  return String(value ?? "").split(path.sep).join("/");
}

function relativeToRepo(filePath) {
  return normalizeRepoPath(path.relative(fromRepo("."), filePath));
}

function storyStatesForComponent(source, componentId) {
  const states = new Set();
  for (const declaration of storyComponentDeclarations(source)) {
    if (declaration.id !== componentId) continue;
    for (const state of declaration.states) states.add(state);
  }
  return states;
}

function storyComponentDeclarations(source) {
  const declarations = [];
  const constants = stringArrayConstants(source);
  const exportPattern = /^export\s+const\s+([A-Za-z0-9_]+)\b/gmu;
  const matches = [...source.matchAll(exportPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const exportName = match[1];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    const block = source.slice(start, end);
    if (!block.includes("catchComponent")) continue;

    const catchComponentIndex = block.indexOf("catchComponent");
    const catchComponentBlock = block.slice(catchComponentIndex);
    const id = firstStringProperty(catchComponentBlock, "id");
    if (!id) continue;

    declarations.push({
      exportName,
      id,
      states: stringArrayProperty(catchComponentBlock, "states", constants),
    });
  }

  return declarations;
}

function stringArrayConstants(source) {
  const constants = new Map();
  const constPattern =
    /const\s+([A-Za-z0-9_]+)\s*=\s*\[([\s\S]*?)\]\s*(?:as\s+const)?\s*;/gu;
  for (const match of source.matchAll(constPattern)) {
    constants.set(match[1], stringValues(match[2]));
  }
  return constants;
}

function firstStringProperty(source, propertyName) {
  const pattern = new RegExp(`${escapeRegExp(propertyName)}:\\s*"([^"]+)"`, "u");
  return source.match(pattern)?.[1] ?? null;
}

function stringArrayProperty(source, propertyName, constants) {
  const inlinePattern = new RegExp(
    `${escapeRegExp(propertyName)}:\\s*\\[([\\s\\S]*?)\\]`,
    "u",
  );
  const inline = source.match(inlinePattern);
  if (inline) return stringValues(inline[1]);

  const referencePattern = new RegExp(
    `${escapeRegExp(propertyName)}:\\s*([A-Za-z0-9_]+)`,
    "u",
  );
  const reference = source.match(referencePattern)?.[1] ?? null;
  return reference ? constants.get(reference) ?? [] : [];
}

function stringValues(source) {
  return [...source.matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs(argv) {
  const parsed = {components: null, help: false, selfTest: false, summary: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--summary") parsed.summary = true;
    else if (arg === "--check") {
      // Default mode; accepted for parity with other repo checkers.
    } else if (arg === "--components") parsed.components = requiredValue(argv, ++index, arg);
    else fail(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function printHelp() {
  console.log(`Usage: node tool/web/check_admin_components.mjs [--check] [--summary] [--self-test]

Validates design/admin/components.json against admin feature route/workspace
exports, shared UI primitive exports, shared feedback provider exports, and
ready Storybook catchComponent coverage. It also enforces the restrained admin
shell brand and single-title top-bar contract. Completed design-adoption history
belongs to Git; actionable debt belongs to GitHub Issues.
`);
}

function runSelfTest() {
  const source = `
export function AccessReviewScreen() {
  return null;
}

export const AdminMetricCard = () => null;
function PrivateCard() {
  return null;
}
`;
  assert.deepEqual([...exportedReactComponents(source)], ["AccessReviewScreen", "AdminMetricCard"]);

  const relative = relativeToRepo(fromRepo("admin/src/shared/ui/AdminPrimitives/index.ts"));
  assert.equal(relative, "admin/src/shared/ui/AdminPrimitives/index.ts");

  const declarations = storyComponentDeclarations(`
const metricStates = ["default", "attention"];

export const MetricCardStory = {
  parameters: {
    catchComponent: {
      id: "shared_admin_metric_card",
      states: metricStates,
    },
  },
};

export const StatusBannerStory = {
  parameters: {
    catchComponent: {
      id: "shared_status_banner",
      states: ["success", "error"],
    },
  },
};
`);
  assert.deepEqual(declarations, [
    {
      exportName: "MetricCardStory",
      id: "shared_admin_metric_card",
      states: ["default", "attention"],
    },
    {
      exportName: "StatusBannerStory",
      id: "shared_status_banner",
      states: ["success", "error"],
    },
  ]);

  const featureComponent = (owner, source) => ({kind: "feature-component", owner, source});
  for (const [owner, source] of [
    ["features/marketing", "packages/web-ui/src/components/CatchMarketingStudioGrid.tsx"],
    ["features/marketing", "admin/src/shared/ui/AdminPrimitives/marketing-library.tsx"],
    ["app", "packages/web-ui/src/components/CatchAdminShell.tsx"],
  ]) {
    assert.deepEqual(featureComponentPlacementErrors(featureComponent(owner, source), "probe"), []);
  }
  assert.deepEqual(
    featureComponentPlacementErrors(featureComponent("shared/ui", "admin/src/shared/ui/AdminPrimitives/cards.tsx"), "probe"),
    ["probe: feature-component owner must be features/<feature> or app, not shared/ui."],
  );
  // D18: a component that draws never lives in its feature, even the feature that owns it.
  assert.deepEqual(
    featureComponentPlacementErrors(featureComponent("features/marketing", "admin/src/features/marketing/ui/Grid.tsx"), "probe"),
    ["probe: feature-component owned by features/marketing must live under packages/web-ui/src/components/ (or await its D18 move from admin/src/shared/ui); its feature keeps only the binding."],
  );

  const validChrome = `
    <AdminBrandTitle>Catch Admin</AdminBrandTitle>
    <AdminTopbar><h1>{topbarTitle}</h1><AdminTopbarActions /></AdminTopbar>
  `;
  assert.deepEqual(adminChromeErrors(validChrome), []);
  const libraryChrome = (title, extra = "", imported = "CatchText") => `
    import {CatchText as ${imported}} from "@catch/web-ui";
    const Chrome = () => <>
      <AdminBrandTitle>Catch Admin</AdminBrandTitle>
      <AdminTopbar>${title}${extra}<AdminTopbarActions /></AdminTopbar>
    </>;
  `;
  for (const title of [
    '<CatchText as="h1" variant="titleL">{topbarTitle}</CatchText>',
    '<CatchText variant="titleL" as={"h1"}>{topbarTitle}</CatchText>',
  ]) assert.deepEqual(adminChromeErrors(libraryChrome(title)), []);
  assert.deepEqual(adminChromeErrors(libraryChrome(
    '<Copy as="h1" variant="titleL">{topbarTitle}</Copy>', "", "Copy",
  )), []);
  for (const title of [
    '<CatchText as="h2" variant="titleL">{topbarTitle}</CatchText>',
    '<CatchText variant="titleL">{topbarTitle}</CatchText>',
    '<CatchText as="h1" variant="titleL">{otherTitle}</CatchText>',
    '<CatchText as="h1" {...props} variant="titleL">{topbarTitle}</CatchText>',
    '<h1>{topbarTitle}</h1><h2>Duplicate</h2>',
    '<h1>{topbarTitle}</h1><CatchText as="h3" variant="titleL">Extra</CatchText>',
  ]) assert.ok(adminChromeErrors(libraryChrome(title)).includes(
    "admin top bar must render the route-owned topbarTitle as its single heading.",
  ));
  assert.ok(adminChromeErrors(libraryChrome(
    '<CatchText as="h1" variant="titleL">{topbarTitle}</CatchText>',
    '<CatchText as="p" variant="supporting">Subtitle</CatchText>',
  )).includes("admin top bar must not add a kicker, secondary PageHeader, or subtitle."));
  assert.ok(adminChromeErrors(libraryChrome(
    '{/* <h1>{topbarTitle}</h1> */}<span>{"<h1>{topbarTitle}</h1>"}</span>',
  )).includes("admin top bar must render the route-owned topbarTitle as its single heading."));

  assert.deepEqual(adminChromeErrors(`
    <AdminBrandTitle>Catch Ops</AdminBrandTitle>
    <AdminTopbar><AdminEyebrow>Supply</AdminEyebrow><h1>Organizers</h1><p>Copy</p></AdminTopbar>
    <span>dev · sample</span>
  `), [
    "admin shell brand must be the single product label Catch Admin.",
    "admin top bar must render the route-owned topbarTitle as its single heading.",
    "admin top bar must not add a kicker, secondary PageHeader, or subtitle.",
    "admin shell must not expose prototype label Catch Ops.",
    "admin shell must not expose prototype label dev · sample.",
  ]);
  assert.deepEqual(adminPresentationCopyErrors("Local preview data is read-only."), []);
  assert.ok(adminPresentationCopyErrors(
    "Sample access application was not found. Generated sample bridge.",
    "fixture.ts",
  ).every((error) => error.startsWith("fixture.ts:")));

  console.log("Admin component registry checker self-test passed.");
}

function fail(message) {
  console.error(message);
  process.exit(64);
}
