// Plans one Phase 4 screen-move group: which files move where (a library
// with its handwritten and generated parts), and whether the move keeps every
// import legal: nothing left in lib/ imports a file leaving for an app, no
// app imports another app's files, and a file moving into lib/pages or
// lib/contexts imports only the layers below it.
import path from "node:path";
import {packageOfPath, resolveUri} from "./dart_moves.mjs";
import {placePath} from "../check_context_map.mjs";
import {
  appWalks,
  closureOf,
  isGeneratedPart,
  reachableLibraries,
  unitOf,
  usedLibraries,
} from "./screen_move_graph.mjs";

export function appOf(file) {
  return /^apps\/([^/]+)\//u.exec(file)?.[1] ?? null;
}

function isTestPath(file) {
  return /^(?:test|integration_test)\//u.test(file);
}

// Files left for the move PRs: everything under lib/ outside the target
// roots.
export function isLegacyFile(file, map) {
  return file.startsWith("lib/") && !file.startsWith(map.roots.contexts) &&
    !file.startsWith(map.roots.pages);
}

export function groupEntries(map, group) {
  return map.legacy.filter((entry) => entry.group === group);
}

// The map entry that places a file: the longest matching path.
function placingEntry(file, map) {
  return map.legacy.find((entry) => file.startsWith(entry.path)) ?? null;
}

function entryTarget(file, entry) {
  if (entry.path.endsWith("/")) return `${entry.moveTo}${file.slice(entry.path.length)}`;
  return file === entry.path ? entry.moveTo : null;
}

// Where every file of a group lands. A folder entry moves each tracked file
// below it that no longer entry claims; a file entry moves that library. Each
// library takes its parts along, keeping their path relative to it; a part
// that an entry would place apart from its library is an error.
export function planSourceMoves({group, map, files, graph, read}) {
  const errors = [];
  const entries = groupEntries(map, group);
  if (entries.length === 0) {
    return {moves: new Map(), errors: [{kind: "group", message: `No context map entry has group ${group}.`}]};
  }
  const tracked = new Set(files);
  const desired = new Map();
  for (const file of files) {
    if (isGeneratedPart(file)) continue;
    const entry = placingEntry(file, map);
    if (entry?.group !== group) continue;
    const target = entryTarget(file, entry);
    if (target != null) desired.set(file, target);
  }
  for (const entry of entries) {
    if (![...desired.keys()].some((file) => file.startsWith(entry.path))) {
      errors.push({kind: "group", message: `${entry.path} (group ${group}) moves no tracked file.`});
    }
  }
  const moves = new Map();
  const libraries = new Set();
  for (const file of desired.keys()) {
    if (!file.endsWith(".dart")) {
      moves.set(file, desired.get(file));
      continue;
    }
    libraries.add(unitOf(graph, file, {files: tracked, read}).library);
  }
  for (const library of [...libraries].sort()) {
    const unit = unitOf(graph, library, {files: tracked, read});
    const libraryTarget = desired.get(library) ?? null;
    for (const part of unit.parts) {
      const implied = libraryTarget == null
        ? part
        : path.posix.normalize(path.posix.join(
          path.posix.dirname(libraryTarget),
          path.posix.relative(path.posix.dirname(library), part),
        ));
      const wanted = desired.get(part);
      if (wanted != null && wanted !== implied) {
        errors.push({
          kind: "part",
          file: part,
          message: libraryTarget == null
            ? `${part} is a part of ${library}, which does not move; move the library or neither.`
            : `${part} would land at ${wanted}, apart from its library ${library} (${libraryTarget}).`,
        });
      }
      if (libraryTarget != null) moves.set(part, implied);
    }
    if (libraryTarget != null) moves.set(library, libraryTarget);
  }
  const byTarget = new Map();
  for (const [from, to] of moves) byTarget.set(to, [...(byTarget.get(to) ?? []), from]);
  for (const [target, sources] of byTarget) {
    if (sources.length > 1) {
      errors.push({kind: "collision", file: target, message: `${sources.join(", ")} would all land on ${target}.`});
    } else if (tracked.has(target) && !moves.has(target)) {
      errors.push({kind: "collision", file: target, message: `${sources[0]} would overwrite ${target}.`});
    }
  }
  return {moves, errors};
}

// Checks every import edge that the move changes. `after` maps a file to
// where it sits once the group (and its tests) have moved.
export function closureErrors({graph, moves, map, packages, widgetbookDependencies = []}) {
  const errors = [];
  const after = (file) => moves.get(file) ?? file;
  const movingLibraries = [...moves.keys()].filter((file) =>
    file.endsWith(".dart") && graph.libraryOf(file) === file);
  for (const library of movingLibraries) {
    const target = moves.get(library);
    const targetApp = appOf(target);
    for (const importer of graph.importers.get(library) ?? []) {
      const location = after(importer);
      const movedImporter = moves.has(importer);
      const importerApp = appOf(location);
      if (targetApp != null && importerApp != null && importerApp !== targetApp) {
        errors.push({
          kind: "crossApp",
          file: importer,
          message: `${importer} (apps/${importerApp}) imports ${library}, which moves to apps/${targetApp}.`,
        });
        continue;
      }
      if (targetApp == null || movedImporter || isTestPath(location)) continue;
      if (importerApp == null && location.startsWith("lib/")) {
        errors.push({
          kind: "closure",
          file: importer,
          target: library,
          message: `${importer} stays in lib/ but imports ${library}, which moves to apps/${targetApp}; add it to the group.`,
        });
      } else if (location.startsWith("widgetbook/")) {
        const appPackage = packageOfPath(target, packages)?.name;
        if (!widgetbookDependencies.includes(appPackage)) {
          errors.push({
            kind: "widgetbook",
            file: importer,
            message: `${importer} imports ${library}, but widgetbook/pubspec.yaml does not depend on ${appPackage} yet.`,
          });
        }
      } else if (location.startsWith("packages/")) {
        errors.push({
          kind: "layer",
          file: importer,
          message: `${importer} is a shared package and cannot import ${library} once it moves to apps/${targetApp}.`,
        });
      }
    }
    errors.push(...ownImportErrors({graph, library, target, after, map}));
  }
  return errors;
}

// What a moving library may import from its new home.
function ownImportErrors({graph, library, target, after, map}) {
  const errors = [];
  const targetApp = appOf(target);
  const into = target.startsWith(map.roots.pages)
    ? "pages"
    : target.startsWith(map.roots.contexts) ? "context" : null;
  const fromContext = into === "context"
    ? target.slice(map.roots.contexts.length).split("/")[0]
    : null;
  for (const file of [library, ...(graph.parts.get(library) ?? [])]) {
    for (const directive of graph.files.get(file)?.directives ?? []) {
      if (!["import", "export"].includes(directive.kind)) continue;
      for (const used of usedLibraries(directive)) {
        const location = after(used);
        const usedApp = appOf(location);
        if (targetApp != null && usedApp != null && usedApp !== targetApp) {
          errors.push({kind: "crossApp", file: library, message: `${library} moves to apps/${targetApp} but imports ${location} (apps/${usedApp}).`});
          continue;
        }
        if (into == null) continue;
        if (usedApp != null) {
          errors.push({kind: "upwardLayerImport", file: library, message: `${library} moves into ${into === "pages" ? "lib/pages" : "lib/contexts"} but imports ${location}, an app file.`});
          continue;
        }
        const place = location.startsWith("lib/") ? placePath(location, map) : null;
        if (place == null) continue;
        const rank = {kernel: 0, platform: 1, context: 2, pages: 3, app: 4};
        const ownRank = into === "pages" ? 3 : 2;
        if (rank[place.layer] > ownRank) {
          errors.push({kind: "upwardLayerImport", file: library, message: `${library} moves into ${into === "pages" ? "lib/pages" : "lib/contexts"} but imports ${location} (${place.layer} layer).`});
        } else if (fromContext != null && place.layer === "context" && place.context !== fromContext &&
            (map.contextRank.get(place.context) ?? -1) > (map.contextRank.get(fromContext) ?? -1)) {
          errors.push({kind: "contextOrderImport", file: library, message: `${library} moves into the ${fromContext} context but imports ${location} from ${place.context}, which is declared after it.`});
        }
      }
    }
  }
  return errors;
}

// The lib/ files that would have to join the group to clear its closure
// errors, found by following importers until none stays behind. Importers in
// lib/contexts, lib/pages or lib/routing cannot follow a screen into an app;
// they are reported as blockers.
export function suggestClosure({graph, moves, errors, map}) {
  const additions = new Set();
  const blockers = new Map();
  const queue = errors.filter((error) => error.kind === "closure").map((error) => error.file);
  while (queue.length > 0) {
    const file = queue.pop();
    const library = graph.libraryOf(file) ?? file;
    if (moves.has(library) || additions.has(library)) continue;
    if (!isLegacyFile(library, map) || library.startsWith("lib/routing/") ||
        !library.startsWith("lib/") || library.split("/").length === 2) {
      blockers.set(library, true);
      continue;
    }
    additions.add(library);
    for (const importer of graph.importers.get(library) ?? []) {
      if (importer.startsWith("lib/")) queue.push(importer);
    }
  }
  const byFolder = {};
  for (const file of additions) {
    const folder = path.posix.dirname(file);
    byFolder[folder] = (byFolder[folder] ?? 0) + 1;
  }
  return {
    additions: [...additions].sort(),
    byFolder: Object.fromEntries(Object.entries(byFolder).sort()),
    blockers: [...blockers.keys()].sort(),
  };
}

// External packages a moved file imports must be dependencies of its new
// package: depend_on_referenced_packages is fatal.
export function missingDependencies({moves, read, packages, dependenciesOf}) {
  const missing = new Map();
  for (const [from, to] of moves) {
    if (!to.endsWith(".dart")) continue;
    const owner = packageOfPath(to, packages);
    if (owner == null || owner.dir === "" || owner.dir === packageOfPath(from, packages)?.dir) continue;
    const source = read(from) ?? "";
    const isTest = !to.startsWith(owner.lib);
    const declared = dependenciesOf(owner, {dev: isTest});
    for (const match of source.matchAll(/^(?:import|export)\s+['"](package:([A-Za-z_][A-Za-z0-9_]*)\/[^'"]*)['"]/gmu)) {
      const name = match[2];
      if (name === owner.name || declared.has(name)) continue;
      // A file of the same group that lands in this package is no dependency:
      // the move rewrites the import to the owner package.
      const target = resolveUri(from, match[1], packages);
      const landing = target == null ? null : moves.get(target) ?? null;
      if (landing != null && packageOfPath(landing, packages)?.name === owner.name) continue;
      const key = `${owner.dir}pubspec.yaml`;
      const needed = missing.get(key) ?? new Map();
      needed.set(name, [...(needed.get(name) ?? []), from]);
      missing.set(key, needed);
    }
  }
  return [...missing].flatMap(([pubspec, needed]) => [...needed].map(([name, users]) => ({
    kind: "dependency",
    file: pubspec,
    message: `${pubspec} does not declare ${name}, which ${users.length} moving file(s) import (e.g. ${users[0]}); add ${name} to ${pubspec} in a separate PR first, since a move commit may not edit a pubspec.`,
  })));
}

// The dependency names a pubspec declares, read from its dependencies and
// (for tests) dev_dependencies blocks.
export function pubspecDependencies(source, {dev = false} = {}) {
  const names = new Set();
  let block = null;
  for (const line of source.split("\n")) {
    const top = /^([A-Za-z_]+):/u.exec(line);
    if (top != null) {
      block = top[1];
      continue;
    }
    if (block !== "dependencies" && !(dev && block === "dev_dependencies")) continue;
    const dependency = /^ {2}([A-Za-z_][A-Za-z0-9_]*):/u.exec(line);
    if (dependency != null) names.add(dependency[1]);
  }
  return names;
}

// Advisory destinations for --classify, from the placement table in the
// Phase 4 plan. A context map moveTo always wins.
const hostSuggestions = [
  [/^lib\/hosts\/(today|door|organizer|forms|insights|onboarding|create|people|live|programmes)\//u, "apps/host/lib/$1/"],
  [/^lib\/hosts\/events\/presentation\/moments\//u, "apps/host/lib/events/moments/"],
  [/^lib\/hosts\/events\//u, "apps/host/lib/events/"],
  [/^lib\/hosts\/audience\/phone_import\//u, "apps/host/lib/programmes/phone_import/"],
  [/^lib\/programs\/presentation\//u, "apps/host/lib/programmes/desk/"],
  [/^lib\/event_rehearsal\//u, "apps/host/lib/live/rehearsal/"],
  [/^lib\/hosts\/presentation\/(inbox|customers)\//u, "apps/host/lib/people/$1/"],
  [/^lib\/hosts\/presentation\/forms\//u, "apps/host/lib/forms/workspace/"],
  [/^lib\/hosts\/presentation\/applications\//u, "apps/host/lib/forms/applications/"],
  [/^lib\/hosts\/presentation\/event_management\//u, "apps/host/lib/create/event_form/"],
  [/^lib\/hosts\/presentation\/organizer_management\//u, "apps/host/lib/organizer/management/"],
  [/^lib\/hosts\/presentation\/(payments|memberships)\//u, "apps/host/lib/organizer/$1/"],
  [/^lib\/hosts\/presentation\/host_operations\//u, "apps/host/lib/organizer/operations/"],
  [/^lib\/hosts\/presentation\/organizer_journey\//u, "apps/host/lib/today/"],
  [/^lib\/hosts\/presentation\/widgets\//u, "apps/host/lib/events/roster/"],
  [/^lib\/hosts\/presentation\/host_audience_/u, "apps/host/lib/people/audience/host_audience_"],
  [/^lib\/hosts\/presentation\//u, "apps/host/lib/events/manage/"],
  [/^lib\/event_success\/(?:presentation\/)?/u, "apps/host/lib/live/assistance/"],
];
const consumerSuggestions = [
  [/^lib\/dashboard\/(?:presentation\/)?/u, "apps/consumer/lib/home/"],
  [/^lib\/(?:explore\/(?:presentation\/)?|organizers\/presentation\/discovery\/)/u, "apps/consumer/lib/explore/"],
  [/^lib\/events\/presentation\/calendar\//u, "apps/consumer/lib/calendar/"],
  [/^lib\/swipes\/(?:presentation\/)?/u, "apps/consumer/lib/catches/"],
  [/^lib\/(?:user_profile|image_uploads|user_analytics)\/(?:presentation\/)?/u, "apps/consumer/lib/profile/"],
  [/^lib\/public_profile\/(?:presentation\/)?/u, "apps/consumer/lib/public_profile/"],
  [/^lib\/onboarding\/presentation\//u, "apps/consumer/lib/onboarding/"],
  [/^lib\/event_success\/(?:presentation\/)?/u, "apps/consumer/lib/companion/"],
  [/^lib\/payments\/(?:presentation\/)?/u, "apps/consumer/lib/payments/"],
  [/^lib\/host_memberships\/(?:presentation\/)?/u, "apps/consumer/lib/memberships/"],
  [/^lib\/reviews\/presentation\//u, "apps/consumer/lib/reviews/"],
  [/^lib\/launch_access\/(?:presentation\/)?/u, "apps/consumer/lib/launch_access/"],
  [/^lib\/safety\/(?:presentation\/)?/u, "apps/consumer/lib/settings/"],
  [/^lib\/chats\/presentation\/inbox\//u, "apps/consumer/lib/chats/"],
];

function suggest(file, rules, app) {
  for (const [pattern, replacement] of rules) {
    if (pattern.test(file)) return file.replace(pattern, replacement);
  }
  return `apps/${app}/lib/${file.slice("lib/".length).replace(/(^|\/)presentation\//u, "$1")}`;
}

// The shared pages and the files that open them. A file both apps reach is
// suggested for the first page whose closure holds it.
export const pageSeeds = [
  {page: "frame", files: ["lib/app.dart", "lib/app_bootstrap.dart", "lib/consumer_bootstrap.dart"]},
  {page: "start", files: ["lib/pages/start/start_welcome_route_screen.dart"]},
  {page: "sign_in", files: ["lib/auth/presentation/auth_screen.dart"]},
  {page: "event", files: ["lib/pages/event/event_detail_screen.dart"]},
  {page: "organizer", files: ["lib/organizers/presentation/detail/organizer_detail_screen.dart"]},
  {page: "chat", files: [
    "lib/chats/presentation/chat_screen.dart",
    "lib/chats/presentation/event_chat_screen.dart",
    "lib/chats/presentation/event_chat_participants_screen.dart",
    "lib/chats/presentation/event_profile_screen.dart",
  ]},
];

// Labels every legacy file host, consumer, shared or unreached by walking
// each app from its own lib/ folder. Parts take their library's label.
export function classify({graph, files, map}) {
  const reach = Object.fromEntries(appWalks.map((walk) =>
    [walk.app, reachableLibraries(graph, walk).libraries]));
  const pageClosures = pageSeeds.map((seed) => ({page: seed.page, closure: closureOf(graph, seed.files)}));
  const rows = [];
  for (const file of files) {
    if (!file.endsWith(".dart") || isGeneratedPart(file) || !isLegacyFile(file, map)) continue;
    const library = graph.libraryOf(file) ?? file;
    const host = reach.host.has(library);
    const consumer = reach.consumer.has(library);
    const label = host && consumer ? "shared" : host ? "host" : consumer ? "consumer" : "unreached";
    const entry = placingEntry(file, map);
    let suggestedTarget = entry?.moveTo != null ? entryTarget(file, entry) : null;
    let page = null;
    if (label === "shared") {
      page = pageClosures.find((candidate) => candidate.closure.has(library))?.page ?? null;
      suggestedTarget ??= page == null
        ? null
        : `${map.roots.pages}${page}/${path.posix.basename(file)}`;
    } else if (label === "host") {
      suggestedTarget ??= suggest(file, hostSuggestions, "host");
    } else if (label === "consumer") {
      suggestedTarget ??= suggest(file, consumerSuggestions, "consumer");
    }
    rows.push({
      path: file,
      label,
      scope: /^lib\/[^/]+\.dart$/u.test(file) ? "root" : file.startsWith("lib/routing/") ? "routing" : "legacy",
      ...(library === file ? {} : {library}),
      ...(page == null ? {} : {page}),
      suggestedTarget,
    });
  }
  const summary = {};
  for (const row of rows) {
    summary[row.scope] ??= {host: 0, consumer: 0, shared: 0, unreached: 0};
    summary[row.scope][row.label] += 1;
  }
  return {summary, files: rows};
}
