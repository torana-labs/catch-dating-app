#!/usr/bin/env node
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {isMain, parseCommonArgs} from "./lib/cli_args.mjs";
import {fromRepo} from "./lib/repo_paths.mjs";
import {componentAliasIndex, normalizeSymbol} from "./design/component_concepts.mjs";
import {roleNounRedirectAdvice, roleNouns} from "./design/lib/component_naming.mjs";

const usage = `Usage:
  node tool/scaffold.mjs context --name <ctx> [--dry-run]
  node tool/scaffold.mjs screen --app <host|consumer> --name <name> [--destination <folder>] [--dry-run]
  node tool/scaffold.mjs screen --page <name> [--dry-run]
  node tool/scaffold.mjs component --name <Name> --tier <T1|T2|T3|T4> [--dry-run]
  node tool/scaffold.mjs web-component --name <Name> [--dry-run]

Creates the files a new context package, screen, catch_ui component or web-ui
component starts from, in the shape docs/app_architecture.md (App Roots) fixes.
--dry-run prints the files and their contents and writes nothing. Every command
refuses to overwrite an existing file, and writes nothing when it refuses.`;

const tiers = ["T1", "T2", "T3", "T4"];
const bannedQualifier = /(?:^|[a-z0-9])(?:Custom|New|Modern|Legacy|Old|V\d+)(?=[A-Z]|$)/u;
const snakeName = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const pascalName = /^(?:[A-Z][a-z0-9]*)+$/u;

class UsageError extends Error {}
class RefusalError extends Error {}

const pascal = (name) => name.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join("");
const camel = (name) => pascal(name)[0].toLowerCase() + pascal(name).slice(1);
const snake = (name) => name.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toLowerCase();
const dartImports = (uris) => [...new Set(uris)].sort().map((uri) => `import '${uri}';`).join("\n");

function template(relativePath, values) {
  const source = fs.readFileSync(fromRepo("tool/scaffold/templates", `${relativePath}.tmpl`), "utf8");
  return source.replace(/%%([A-Za-z]+)%%/gu, (_, key) => {
    if (values[key] === undefined) throw new Error(`${relativePath}: no value for %%${key}%%`);
    return values[key];
  });
}

function requireOption(options, name) {
  const value = options[name];
  if (typeof value !== "string" || value === "") throw new UsageError(`--${name} requires a value.`);
  return value;
}

function requireSnake(value, flag) {
  if (!snakeName.test(value)) throw new UsageError(`--${flag} must be lower_snake_case, received '${value}'.`);
  return value;
}

/** A pubspec constraint as the root declares it, so new packages never drift from it. */
function rootConstraint(source, key) {
  const match = new RegExp(`^\\s*${key}:\\s*(\\S.*)$`, "mu").exec(source);
  if (!match) throw new Error(`No '${key}' constraint found in the root manifest.`);
  return match[1].trim();
}

function contextPlan(options) {
  const name = requireSnake(requireOption(options, "name"), "name");
  const lockfile = fs.readFileSync(fromRepo("pubspec.lock"), "utf8");
  if (new RegExp(`^  ${name}:$`, "mu").test(lockfile)) {
    throw new RefusalError(`pub name '${name}' is already taken: pubspec.lock holds a package of that name (blueprint D25).`);
  }
  const rootPubspec = fs.readFileSync(fromRepo("pubspec.yaml"), "utf8");
  const values = {
    name,
    Name: pascal(name),
    sdk: rootConstraint(rootPubspec, "sdk"),
    flutterLints: rootConstraint(rootPubspec, "flutter_lints"),
    imports: dartImports(["package:flutter_test/flutter_test.dart", `package:${name}/${name}.dart`]),
  };
  const root = `packages/contexts/${name}`;
  const map = JSON.parse(fs.readFileSync(fromRepo("tool/architecture/context_map.json"), "utf8"));
  const listed = map.contexts.some((context) => context.id === name);
  return {
    summary: `context package ${name}`,
    files: [
      [`${root}/pubspec.yaml`, template("context/pubspec.yaml", values)],
      [`${root}/analysis_options.yaml`, template("context/analysis_options.yaml", values)],
      [`${root}/lib/${name}.dart`, template("context/barrel.dart", values)],
      [`${root}/lib/src/domain/README.md`, template("context/domain_README.md", values)],
      [`${root}/lib/src/data/${name}_repository.dart`, template("context/repository.dart", values)],
      [`${root}/lib/src/actions/README.md`, template("context/actions_README.md", values)],
      [`${root}/lib/src/parts/README.md`, template("context/parts_README.md", values)],
      [`${root}/test/fakes/fake_${name}_repository.dart`, template("context/fake_repository.dart", values)],
      [`${root}/test/${name}_test.dart`, template("context/context_test.dart", values)],
    ],
    next: [
      `pubspec.yaml, under workspace:\n  - ${root}`,
      `pubspec.yaml, under dependencies, so legacy code keeps compiling:\n  ${name}:\n    path: ${root}`,
      listed
        ? `tool/architecture/context_map.json lists ${name}; keep the package's dependencies in that order.`
        : `tool/architecture/context_map.json must list ${name}: {"id": "${name}", "owns": "..."}, and the table in docs/app_architecture.md (Bounded Context Contract) with it.`,
      "flutter pub get",
    ],
  };
}

/** The dependency lines an app package still needs for the imports its screens make. */
function missingAppDependencies(app) {
  const pubspec = fs.readFileSync(fromRepo(`apps/${app}/pubspec.yaml`), "utf8");
  const rootPubspec = fs.readFileSync(fromRepo("pubspec.yaml"), "utf8");
  const lists = (key) => new RegExp(`^  ${key}:`, "mu").test(pubspec);
  const lines = [];
  if (!lists("catch_ui")) lines.push("  catch_ui:\n    path: ../../packages/catch_ui");
  for (const key of ["flutter_riverpod", "riverpod_annotation"]) {
    if (!lists(key)) lines.push(`  ${key}: ${rootConstraint(rootPubspec, key)}`);
  }
  return lines;
}

function screenPlan(options) {
  const page = options.page;
  if (page !== undefined && (options.app !== undefined || options.name !== undefined || options.destination !== undefined)) {
    throw new UsageError("--page takes the place of --app, --name and --destination.");
  }
  const app = page === undefined ? requireOption(options, "app") : null;
  if (app !== null && !["host", "consumer"].includes(app)) {
    throw new UsageError(`--app must be host or consumer, received '${app}'.`);
  }
  const name = page === undefined
    ? requireSnake(requireOption(options, "name"), "name")
    : requireSnake(requireOption(options, "page"), "page");
  const destination = page === undefined && options.destination !== undefined
    ? requireSnake(requireOption(options, "destination"), "destination")
    : name;

  const packageName = app === null
    ? "catch_dating_app"
    : /^name:\s*(\S+)/mu.exec(fs.readFileSync(fromRepo(`apps/${app}/pubspec.yaml`), "utf8"))[1];
  const libFolder = app === null ? `pages/${destination}` : destination;
  const packageRoot = app === null ? "" : `apps/${app}/`;
  const folder = `${packageRoot}lib/${libFolder}`;
  const testFolder = `${packageRoot}test/${libFolder}`;
  const libUri = (file) => `package:${packageName}/${libFolder}/${file}`;

  const Name = pascal(name);
  const camelName = camel(name);
  // riverpod_generator hashes the provider's source as the analyzer prints it,
  // so the generated file below is byte-for-byte what build_runner writes.
  const providerSource = `@riverpod AsyncValue<${Name}ViewModel> ${camelName}ViewModel(Ref ref) => const AsyncData(${Name}ViewModel());`;
  const values = {
    name,
    Name,
    camel: camelName,
    hash: createHash("sha1").update(providerSource).digest("hex"),
  };
  const screenImports = dartImports([
    "package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart",
    "package:catch_ui/catch_ui.dart",
    "package:flutter/widgets.dart",
    "package:flutter_riverpod/flutter_riverpod.dart",
    libUri(`${name}_body.dart`),
    libUri(`${name}_view_model.dart`),
  ]);
  const testImports = dartImports([
    "package:catch_ui/catch_ui.dart",
    "package:flutter/material.dart",
    "package:flutter_test/flutter_test.dart",
    libUri(`${name}_body.dart`),
  ]);
  const routeId = `${app === "host" ? `host${Name}` : camelName}Screen`;
  const dependencies = app === null ? [] : missingAppDependencies(app);
  return {
    summary: `screen ${Name}Screen in ${folder}`,
    files: [
      [`${folder}/${name}_screen.dart`, template("screen/screen.dart", {...values, imports: screenImports})],
      [`${folder}/${name}_body.dart`, template("screen/body.dart", values)],
      [`${folder}/${name}_view_model.dart`, template("screen/view_model.dart", values)],
      [`${folder}/${name}_view_model.g.dart`, template("screen/view_model.g.dart", values)],
      [`${folder}/widgets/.gitkeep`, ""],
      [`${testFolder}/${name}_body_test.dart`, template("screen/body_test.dart", {...values, imports: testImports})],
    ],
    next: [
      ...(dependencies.length > 0
        ? [`apps/${app}/pubspec.yaml, under dependencies:\n${dependencies.join("\n")}\nthen flutter pub get`]
        : []),
      `lib/routing/route_contract.dart and go_router.dart: add the route ${routeId}, then node tool/ui_capture/check_route_inventory.mjs --update writes it to tool/ui_capture/route_inventory.json:\n  {"id": "${routeId}", ...}`,
      `tool/ui_capture/capture_coverage.json, under routes, until the capture lands:\n  {"routeId": "${routeId}", "status": "planned", "priority": "P1", "reason": "Redesigned screen; its capture lands with it."}`,
      "After editing the view model, run build_runner so its .g.dart matches.",
    ],
  };
}

function registryComponents() {
  return JSON.parse(fs.readFileSync(fromRepo("design/components/catch.components.json"), "utf8")).components;
}

/** The closed role noun a name ends in, or a refusal naming the role to use instead. */
function requireRoleNoun(name, flag) {
  if (!pascalName.test(name)) throw new UsageError(`--${flag} must be PascalCase, received '${name}'.`);
  if (bannedQualifier.test(name)) {
    throw new RefusalError(`${name}: Custom, New, Modern, Legacy, Old and version qualifiers do not describe a responsibility (docs/app_architecture.md, Naming Grammar).`);
  }
  const role = [...roleNouns].sort((a, b) => b.length - a.length).find((noun) => name.endsWith(noun));
  if (role) return role;
  const redirects = JSON.parse(fs.readFileSync(fromRepo("design/components/catch.components.json"), "utf8")).roleNounRedirects;
  const advice = roleNounRedirectAdvice(name, redirects);
  throw new RefusalError(`${name} must end in a closed role noun${advice ? ` (${advice})` : ""}; see docs/app_architecture.md, Naming Grammar.`);
}

function registryRecord({id, symbol, file, tier, useCase, roleNoun, components}) {
  const crossFramework = tier === "T1" || tier === "T2";
  const compared = useCase === ""
    ? {}
    : {
        comparedWith: components.filter((entry) => entry.roleNoun === roleNoun).map((entry) => entry.id),
        reason: `State what ${symbol} does that the compared contracts do not.`,
      };
  return {
    id,
    name: symbol,
    status: "active",
    kind: "primitive",
    tier,
    summary: `State what ${symbol} shows and when to use it.`,
    dart: {symbol, file, constructors: [symbol]},
    verification: {
      vehicle: "widgetbook-contract",
      reason: "Canonical states are exercised through the generated Widgetbook contract.",
    },
    design: {
      figma: {status: "unmapped", componentName: `Catch/${symbol.replace(/^Catch/u, "")}`, componentUrl: null},
      codeConnect: {status: "planned", snippetLanguage: "dart", template: null},
      claude: {handoffName: symbol.replace(/^Catch/u, ""), allowed: true},
    },
    contract: {
      props: [{
        name: "label",
        type: "string",
        required: true,
        dartType: "String",
        ...(crossFramework ? {tsType: "string"} : {}),
      }],
      states: ["default"],
      slots: [],
      tokens: [],
      dartRoles: [],
      goldens: [],
      accessibility: {
        largeText: {minimumScale: 2, policy: "Reflow before truncation and preserve primary meaning and actions at supported viewports."},
        reducedMotion: {policy: "Render the same stable resting state without requiring animation to understand or complete the interaction."},
        themes: ["light", "dark"],
      },
    },
    handoff: {allowedChildren: [], notes: []},
    governance: {
      role: "atom",
      canonicalFamily: id,
      publicApi: true,
      stateOwnership: "none",
      asyncOwnership: "none",
      layoutOwnership: "internal-only",
      actionOwnership: "none",
      allowedDependencyLevel: "tokens-and-primitives",
      reviewPolicy: "contract-page-canonical",
      conceptRole: "concept",
      conceptId: id,
    },
    level: "L3",
    roleNoun,
    naming: {useCase, ...compared},
  };
}

function refuseRegisteredName(symbol, components) {
  const owner = componentAliasIndex(components).get(normalizeSymbol(symbol));
  if (owner) {
    throw new RefusalError(`${symbol} is already registered: use ${owner.symbol} (${owner.id}), and add a recipe or slot to it if it lacks one.`);
  }
}

function insertSorted(source, line) {
  const lines = source.split("\n");
  if (lines.includes(line)) return source;
  const at = lines.findIndex((existing) => existing.startsWith("export '") && existing > line);
  const index = at === -1 ? lines.findLastIndex((existing) => existing.startsWith("export '")) + 1 : at;
  lines.splice(index, 0, line);
  return lines.join("\n");
}

function componentPlan(options) {
  const name = requireOption(options, "name").replace(/^Catch(?=[A-Z])/u, "");
  const tier = requireOption(options, "tier");
  if (!tiers.includes(tier)) throw new UsageError(`--tier must be one of ${tiers.join(", ")}, received '${tier}'.`);
  const roleNoun = requireRoleNoun(name, "name");
  const components = registryComponents();
  const symbol = `Catch${name}`;
  refuseRegisteredName(symbol, components);

  const fileStem = snake(symbol);
  const id = `catch.${snake(name)}`;
  const componentFile = `packages/catch_ui/lib/src/components/${fileStem}.dart`;
  const useCaseFile = `widgetbook/lib/primitives/contracts/${snake(name)}.dart`;
  const values = {
    Symbol: symbol,
    id,
    summary: `State what ${symbol} shows and when to use it.`,
    builder: `catch${name}ContractStates`,
  };
  const record = registryRecord({
    id, symbol, file: componentFile, tier, useCase: name.slice(0, -roleNoun.length), roleNoun, components,
  });
  const reactNote = [
    ...(tier === "T1"
      ? [`A T1 ships in both frameworks now: node tool/scaffold.mjs web-component --name ${symbol}, and add the react record it prints.`]
      : []),
    ...(tier === "T1" || tier === "T2"
      ? ["node tool/run.mjs check web:shared-ui-adoption, and record the comparisons it asks of website and admin exports with the same role noun."]
      : []),
  ];
  return {
    summary: `catch_ui component ${symbol} (${tier})`,
    files: [
      [componentFile, template("component/component.dart", values)],
      [useCaseFile, template("component/use_case.dart", values)],
      [`test/core/${fileStem}_test.dart`, template("component/component_test.dart", values)],
    ],
    edits: [{
      file: "packages/catch_ui/lib/catch_ui.dart",
      description: `export 'src/components/${fileStem}.dart';`,
      apply: (source) => insertSorted(source, `export 'src/components/${fileStem}.dart';`),
    }],
    next: [
      `design/components/catch.components.json, under components:\n${JSON.stringify(record, null, 2)}`,
      `Add "aliases" to that record: the other names an agent would write for ${symbol}. They land in this PR, and the schema rejects an empty list.`,
      ...reactNote,
      `Move the use case in ${useCaseFile} to the Widgetbook group it belongs in, then (cd widgetbook && dart run build_runner build) so widgetbook/lib/main.directories.g.dart lists it.`,
      "Raise the count in widgetbook/test/primitive_goldens_test.dart by one and regenerate its goldens with --update-goldens.",
      "node tool/design/generate_widget_catalog.mjs --write, then node tool/design/check_component_enforcement_coverage.mjs",
    ],
  };
}

function webComponentPlan(options) {
  const name = requireOption(options, "name");
  requireRoleNoun(name, "name");
  const values = {Name: name};
  const folder = "packages/web-ui/src/components";
  const reactRecord = {
    symbol: name,
    file: `${folder}/${name}.tsx`,
    api: "styled",
    storybook: {status: "ready", story: `${folder}/${name}.stories.tsx`, exportName: "Contract", states: ["default"]},
  };
  return {
    summary: `web-ui component ${name}`,
    files: [
      [`${folder}/${name}.tsx`, template("web-component/component.tsx", values)],
      [`${folder}/${name}.module.css`, template("web-component/component.module.css", values)],
      [`${folder}/${name}.stories.tsx`, template("web-component/component.stories.tsx", values)],
      [`${folder}/${name}.test.tsx`, template("web-component/component.test.tsx", values)],
    ],
    next: [
      `packages/web-ui/src/index.ts, in its alphabetical place:\nexport {${name}} from "./components/${name}";\nexport type {${name}Props} from "./components/${name}";`,
      `design/components/catch.components.json, on the T1 or T2 contract it implements, as react:\n${JSON.stringify(reactRecord, null, 2)}\nA T4 instead takes an entry in the registry of the one surface that renders it (design/website/components.json or design/admin/components/).`,
    ],
  };
}

const planners = {
  context: contextPlan,
  screen: screenPlan,
  component: componentPlan,
  "web-component": webComponentPlan,
};

function printPlan(plan, {dryRun}) {
  console.log(`${dryRun ? "Would create" : "Created"} ${plan.summary}:`);
  for (const [file, content] of plan.files) {
    console.log(`  ${file}`);
    if (dryRun && content !== "") {
      console.log(content.replace(/^(?=.)/gmu, "    | ").trimEnd());
    }
  }
  for (const edit of plan.edits ?? []) {
    console.log(`  ${edit.file}: ${dryRun ? "would add" : "added"} ${edit.description}`);
  }
  if (plan.next.length > 0) {
    console.log("\nNext, by hand:");
    plan.next.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  }
}

function writePlan(plan) {
  const existing = plan.files.map(([file]) => file).filter((file) => fs.existsSync(fromRepo(file)));
  if (existing.length > 0) {
    throw new RefusalError(`Refusing to overwrite:\n${existing.map((file) => `  ${file}`).join("\n")}`);
  }
  for (const [file, content] of plan.files) {
    fs.mkdirSync(path.dirname(fromRepo(file)), {recursive: true});
    fs.writeFileSync(fromRepo(file), content);
  }
  for (const edit of plan.edits ?? []) {
    fs.writeFileSync(fromRepo(edit.file), edit.apply(fs.readFileSync(fromRepo(edit.file), "utf8")));
  }
  // A long name moves line breaks, in the generated provider as well.
  const dartFiles = plan.files.map(([file]) => file).filter((file) => file.endsWith(".dart"));
  const format = spawnSync("dart", ["format", ...dartFiles.map((file) => fromRepo(file))], {encoding: "utf8"});
  if (format.error || format.status !== 0) {
    console.error(`dart format did not run (${format.error?.message ?? format.stderr.trim()}); format the new files before committing.`);
  }
}

function main(argv) {
  const options = parseCommonArgs(argv, {
    booleanFlags: ["--dry-run"],
    valueFlags: ["--name", "--app", "--page", "--destination", "--tier"],
  });
  if (options.help) {
    console.log(usage);
    return 0;
  }
  const [command, ...rest] = options.positionals;
  if (!planners[command] || rest.length > 0) {
    throw new UsageError(command ? `Unknown command: ${[command, ...rest].join(" ")}` : "A command is required.");
  }
  const plan = planners[command](options);
  const dryRun = options.dry_run === true;
  if (!dryRun) writePlan(plan);
  printPlan(plan, {dryRun});
  return 0;
}

if (isMain(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    if (error instanceof RefusalError) process.exit(1);
    if (error instanceof UsageError || error.code?.startsWith("ERR_PARSE_ARGS")) {
      console.error(`\n${usage}`);
      process.exit(64);
    }
    throw error;
  }
}
