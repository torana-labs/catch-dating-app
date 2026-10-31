// Local Nx plugin for the parts of the repository Nx does not infer itself.
//
// - Every pubspec.yaml becomes a Dart project with `analyze` and `test`
//   targets; `path:` dependencies become static graph edges.
// - Every npm package with its own package-lock.json outside the root npm
//   workspaces (functions, operations, tool/impact) becomes a project whose
//   npm scripts are targets, like the ones Nx infers for workspace packages.
// - `sourceProjects` in this plugin's nx.json options declares source-only
//   projects, such as contracts and design tokens, each with command targets
//   (`{command, inputs?}`); `implicitDependencies` maps each project to the
//   sources its committed generated code comes from.
//
// Pub workspace membership is modelled as an input (members read the shared
// root pubspec.lock), not an edge: the root package already depends on its
// members by path, so a membership edge would only add cycles.
import fs from "node:fs";
import path from "node:path";
import {parse} from "yaml";

const DEPENDENCY_SECTIONS = ["dependencies", "dev_dependencies", "dependency_overrides"];
const TEST_DIRECTORIES = ["test", "integration_test"];

// The root Dart package sits at the repository root, so it owns every file no
// other project claims (docs, tool, .github, ...). Its inputs name the Dart
// files explicitly; other Dart projects own only their own directory.
const ROOT_DART_FILES = [
  "pubspec.yaml", "analysis_options.yaml", "build.yaml", "l10n.yaml", "dart_test.yaml",
  "lib/**/*", "bin/**/*", "assets/**/*", "test/**/*", "integration_test/**/*",
];
const PLATFORM_DIRECTORIES = ["android", "ios", "macos", "web", "linux", "windows", "build"];

function readPubspec(workspaceRoot, file) {
  return parse(fs.readFileSync(path.join(workspaceRoot, file), "utf8")) ?? {};
}

function usesFlutter(pubspec) {
  return DEPENDENCY_SECTIONS.some((section) => pubspec[section]?.flutter?.sdk === "flutter");
}

function dartNamedInputs(root, pubspec) {
  const own = root === "."
    ? ROOT_DART_FILES.map((file) => `{projectRoot}/${file}`)
    : ["{projectRoot}/**/*", ...PLATFORM_DIRECTORIES.map((dir) => `!{projectRoot}/${dir}/**/*`)];
  const lock = pubspec.resolution === "workspace" ? "{workspaceRoot}/pubspec.lock" : "{projectRoot}/pubspec.lock";
  return {
    default: [...own, lock],
    production: ["default", ...TEST_DIRECTORIES.map((dir) => `!{projectRoot}/${dir}/**/*`)],
  };
}

function dartTargets(workspaceRoot, root, pubspec) {
  const tool = usesFlutter(pubspec) ? "flutter" : "dart";
  const exists = (entry) => fs.existsSync(path.join(workspaceRoot, root, entry));
  // Name the package's own source directories so the root package does not
  // analyze every nested package in the repository.
  const analyzed = ["lib", "bin", ...TEST_DIRECTORIES].filter(exists);
  const command = (args) => ({executor: "nx:run-commands", options: {command: `${tool} ${args}`, cwd: root}});
  const targets = {analyze: command(`analyze --fatal-infos ${analyzed.join(" ")}`.trim())};
  if (exists("test")) targets.test = command("test");
  return targets;
}

function dartProject(workspaceRoot, file) {
  const root = path.dirname(file);
  const pubspec = readPubspec(workspaceRoot, file);
  return {
    name: pubspec.name,
    root,
    projectType: pubspec.workspace || root.startsWith("apps/") ? "application" : "library",
    tags: ["lang:dart"],
    namedInputs: dartNamedInputs(root, pubspec),
    targets: dartTargets(workspaceRoot, root, pubspec),
  };
}

function npmPackageProject(workspaceRoot, root) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, root, "package.json"), "utf8"));
  const targets = Object.keys(packageJson.scripts ?? {})
    .map((script) => [script, {executor: "nx:run-script", options: {script}}]);
  return {name: packageJson.name, root, tags: ["lang:js"], targets: Object.fromEntries(targets)};
}

export const createNodesV2 = [
  "{nx.json,**/pubspec.yaml,**/package-lock.json}",
  async (configFiles, options, context) => configFiles.map((file) => {
    const root = path.dirname(file);
    if (file === "nx.json") {
      const projects = (options?.sourceProjects ?? []).map(({name, root: sourceRoot, targets = {}}) => [sourceRoot, {
        name,
        root: sourceRoot,
        tags: ["type:source"],
        // A target that reads code outside the source root (a conformance scan
        // over consumers, say) names those files in its own inputs.
        targets: Object.fromEntries(Object.entries(targets).map(([target, {command, inputs}]) => [target, {
          executor: "nx:run-commands",
          options: {command, cwd: "."},
          ...(inputs ? {inputs} : {}),
        }])),
      }]);
      return [file, {projects: Object.fromEntries(projects)}];
    }
    if (path.basename(file) === "pubspec.yaml") {
      return [file, {projects: {[root]: dartProject(context.workspaceRoot, file)}}];
    }
    // The root lockfile belongs to the npm workspaces Nx already infers.
    if (root === ".") return [file, {}];
    return [file, {projects: {[root]: npmPackageProject(context.workspaceRoot, root)}}];
  }),
];

export function createDependencies(options, context) {
  const projectsByRoot = new Map(
    Object.entries(context.projects).map(([name, project]) => [project.root, name]),
  );
  const dependencies = [];
  for (const [name, project] of Object.entries(context.projects)) {
    const pubspecFile = project.root === "." ? "pubspec.yaml" : `${project.root}/pubspec.yaml`;
    if (!fs.existsSync(path.join(context.workspaceRoot, pubspecFile))) continue;
    const pubspec = readPubspec(context.workspaceRoot, pubspecFile);
    for (const section of DEPENDENCY_SECTIONS) {
      for (const spec of Object.values(pubspec[section] ?? {})) {
        if (typeof spec?.path !== "string") continue;
        const target = projectsByRoot.get(path.posix.join(project.root, spec.path).replace(/\/$/, ""));
        if (target && target !== name) {
          dependencies.push({source: name, target, type: "static", sourceFile: pubspecFile});
        }
      }
    }
  }
  for (const [consumer, sources] of Object.entries(options?.implicitDependencies ?? {})) {
    for (const source of sources) dependencies.push({source: consumer, target: source, type: "implicit"});
  }
  return dependencies;
}
