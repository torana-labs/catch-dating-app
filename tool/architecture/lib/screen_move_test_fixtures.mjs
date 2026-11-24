// Fixture repositories for the screen-move codemod's tests: a git repo with
// the root and app pubspecs, a stand-in for dart_symbol_imports.dart, and a
// plan built from a fixture context map.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {loadContextMap} from "../check_context_map.mjs";
import {directivePattern, packageRoots, resolveUri, trackedFiles} from "./dart_moves.mjs";
import {createGraph} from "./screen_move_graph.mjs";
import {buildGroupPlan} from "./screen_move_apply.mjs";

export const baseFiles = {
  "pubspec.yaml": "name: catch_dating_app\n",
  "apps/host/pubspec.yaml": "name: catch_host_app\ndependencies:\n  catch_dating_app:\n    path: ../..\n  flutter:\n    sdk: flutter\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n",
  "apps/consumer/pubspec.yaml": "name: catch_consumer_app\ndependencies:\n  catch_dating_app:\n    path: ../..\n  flutter:\n    sdk: flutter\ndev_dependencies:\n  flutter_test:\n    sdk: flutter\n",
  "widgetbook/pubspec.yaml": "name: widgetbook_workspace\ndependencies:\n  catch_dating_app:\n    path: ..\n",
  "apps/host/lib/main.dart": "import 'package:catch_dating_app/routing/router.dart';\n\nvoid main() => hostRouter;\n",
  "apps/consumer/lib/main.dart": "import 'package:catch_dating_app/routing/router.dart';\n\nvoid main() => consumerRouter;\n",
  "lib/contexts/events/data/event_repository.dart": "class EventRepository {}\n",
  "lib/contexts/live/data/live_repository.dart": "class LiveRepository {}\n",
  "lib/pages/frame/frame.dart": "class Frame {}\n",
  "tool/nx/markdown_inputs.test.mjs": "export const markdownReaders = {\"tool/design/build_host_feature_responsibilities.mjs\": {\"apps/host/lib/**/README.md\": [\"tools\"], \"apps/consumer/lib/**/README.md\": [\"tools\"]}};\n",
};

export function mapSource(legacy) {
  return `${JSON.stringify({
    roots: {
      contexts: "lib/contexts/",
      pages: "lib/pages/",
      kernel: "packages/kernel/lib/",
      platform: "packages/platform/lib/",
    },
    contexts: [{id: "events", owns: "Events."}, {id: "live", owns: "Live."}],
    legacy: [],
  }, null, 2).replace(/"legacy": \[\]/u, `"legacy": [\n${legacy.map((entry) => `    ${JSON.stringify(entry).replace(/":/gu, "\": ").replace(/,"/gu, ", \"")}`).join(",\n")}\n  ]`)}\n`;
}

export function git(root, ...args) {
  return execFileSync("git", args, {cwd: root, encoding: "utf8"});
}

export function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "screen-move-"));
  for (const [file, text] of Object.entries({...baseFiles, ...files})) {
    fs.mkdirSync(path.join(root, path.dirname(file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  }
  git(root, "init", "-q");
  // The codemod commits with the ambient identity, which CI runners lack.
  git(root, "config", "user.name", "Fixture");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", "fixture");
  return root;
}

// A stand-in for dart_symbol_imports.dart: directives by their text, each
// import using its own target unless `uses` names the declaring libraries
// (a barrel).
export function fixtureGraph(root, uses = {}) {
  const files = trackedFiles(root);
  const packages = packageRoots(root, files);
  const graph = {version: 1, files: {}};
  for (const file of files.filter((candidate) => candidate.endsWith(".dart"))) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const partOf = /^part of '([^']+)';/mu.exec(source);
    const directives = [];
    for (const match of source.matchAll(directivePattern)) {
      const kind = match[1].replace(/\s+/gu, " ");
      const uri = /['"]([^'"]+)['"]/u.exec(match[2])?.[1];
      const target = uri == null ? null : resolveUri(file, uri, packages);
      directives.push({
        offset: match.index,
        end: match.index + match[0].length,
        kind,
        uri,
        target,
        prefix: /\bas\s+(\w+)/u.exec(match[2])?.[1] ?? null,
        deferred: false,
        show: /\bshow\s+([\w\s,]+)/u.exec(match[2])?.[1].split(",").map((name) => name.trim()) ?? null,
        hide: null,
        configurations: [],
        uses: kind === "import" ? (uses[file]?.[uri] ?? (target == null ? {} : {[target]: ["X"]})) : undefined,
      });
    }
    graph.files[file] = {
      library: partOf == null ? file : path.posix.normalize(path.posix.join(path.posix.dirname(file), partOf[1])),
      directives,
    };
  }
  return {graph: createGraph(graph, packages), packages, files};
}

export function planFor(root, group, {uses} = {}) {
  const {graph, packages, files} = fixtureGraph(root, uses);
  const map = loadContextMap(fs.readFileSync(path.join(root, "tool/architecture/context_map.json"), "utf8"));
  return {plan: buildGroupPlan({root, group, graph, files, packages, map}), graph, packages, files, map};
}
