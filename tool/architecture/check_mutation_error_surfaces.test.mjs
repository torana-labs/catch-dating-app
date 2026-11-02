import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {productionWidgetRoots} from "../design/lib/production_widget_roots.mjs";
import {
  appPackageSourceRoots,
  isAppPackageSource,
  isScreenSource,
  screenSourceRoots,
} from "../lib/flutter_source_roots.mjs";
import {repoRoot} from "../lib/repo_paths.mjs";
import {
  scanFile,
  scanMutationErrorSurfaces,
} from "./check_mutation_error_surfaces.mjs";

test("actual scanner CLI rejects missing, non-directory and empty source scopes", (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-mutation-scope-"));
  context.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const script = fileURLToPath(new URL("./check_mutation_error_surfaces.mjs", import.meta.url));
  const roots = ["missing", "root-file", "missing-lib", "lib-file", "empty-lib", "generated-only"];
  fs.writeFileSync(path.join(directory, "root-file"), "not a directory");
  fs.mkdirSync(path.join(directory, "missing-lib"));
  writeFile(directory, "lib-file/lib", "not a directory");
  fs.mkdirSync(path.join(directory, "empty-lib/lib"), {recursive: true});
  writeFile(directory, "generated-only/lib/state.g.dart", "class Generated {}");
  for (const name of roots) {
    const root = path.join(directory, name);
    const result = scanMutationErrorSurfaces({root});
    assert.equal(result.checkedFiles, 0, name);
    assert.equal(result.findings.length, 1, name);
    assert.equal(result.findings[0].path, "lib");
    assert.equal(result.findings[0].line, null);
    for (const json of [false, true]) {
      const execution = spawnSync(process.execPath, [script, "--root", root, ...(json ? ["--json"] : [])],
        {encoding: "utf8", cwd: directory});
      assert.equal(execution.status, 1, `${name}: ${execution.stderr}`);
      if (json) {
        assert.deepEqual(JSON.parse(execution.stdout), result);
      } else {
        assert.match(execution.stderr, /Check --root and materialize the production lib source/);
        assert.doesNotMatch(execution.stdout, /check passed/);
      }
    }
  }
});

test("actual scanner CLI preserves nonempty clean and violating scopes", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-mutation-valid-scope-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const script = fileURLToPath(new URL("./check_mutation_error_surfaces.mjs", import.meta.url));
  for (const [source, expectedStatus, expectedFindings] of [
    ["class DomainModel {}", 0, 0],
    ["class Screen { Widget build(context, ref) { final Mutation<void> save = ref.watch(Controller.saveMutation); return Text(save.isPending); } }", 1, 1],
    ["class Screen { Widget build(context, ref) { final Mutation<void> save = ref.watch(Controller.saveMutation); if (save.hasError) return Text('Failed'); return Text(save.isPending); } }", 0, 0],
  ]) {
    writeFile(root, "lib/core/example.dart", source);
    writeFile(root, "lib/core/example.g.dart", source);
    const execution = spawnSync(process.execPath, [script, "--root", root, "--json"], {encoding: "utf8"});
    assert.equal(execution.status, expectedStatus, execution.stderr);
    const result = JSON.parse(execution.stdout);
    assert.deepEqual(result, scanMutationErrorSurfaces({root}));
    assert.equal(result.checkedFiles, 1);
    assert.equal(result.findings.length, expectedFindings);
    if (expectedFindings) assert.equal(result.findings[0].variableName, "save");
  }
});

test("scanFile flags build methods that read mutation pending without errors", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.toggleSavedEventMutation);",
      "    return Text(save.isPending ? 'Saving' : 'Saved');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 4);
  assert.equal(findings[0].variableName, "save");
  assert.equal(
    findings[0].mutationExpression,
    "EventDetailController.toggleSavedEventMutation",
  );
});

test("scanFile allows pending mutations with an error surface", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.toggleSavedEventMutation);",
      "    if (save.hasError) return const Text('Failed');",
      "    return Text(save.isPending ? 'Saving' : 'Saved');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile flags a second pending mutation without its own error surface", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    final Mutation<void> delete = ref.watch(EventDetailController.deleteMutation);",
      "    if (save.hasError) return const Text('Failed');",
      "    return Text(delete.isPending ? 'Deleting' : 'Ready');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 6);
  assert.equal(findings[0].variableName, "delete");
});

test("scanFile reports one finding per uncovered pending mutation", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    final Mutation<void> delete = ref.watch(EventDetailController.deleteMutation);",
      "    return Text(save.isPending || delete.isPending ? 'Working' : 'Ready');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.equal(findings.length, 2);
  assert.deepEqual(
    findings.map((finding) => finding.variableName),
    ["save", "delete"],
  );
  assert.deepEqual(
    findings.map((finding) => finding.mutationExpression),
    [
      "EventDetailController.saveMutation",
      "EventDetailController.deleteMutation",
    ],
  );
});

test("scanFile allows a listener for the matching pending mutation", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    final Mutation<void> delete = ref.watch(EventDetailController.deleteMutation);",
      "    if (save.hasError) return const Text('Failed');",
      "    listenToCatchMutationErrors(context, ref, mutations: [EventDetailController.deleteMutation]);",
      "    return Text(delete.isPending ? 'Deleting' : 'Ready');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile allows mutation error helper lists for matching mutations", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    final Mutation<void> delete = ref.watch(EventDetailController.deleteMutation);",
      "    final error = _firstMutationError([save, delete]);",
      "    return Text(save.isPending || delete.isPending ? 'Saving' : '$error');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile allows inline firstWhere hasError mutation lists", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    final Mutation<void> delete = ref.watch(EventDetailController.deleteMutation);",
      "    final errorMutation = [save, delete].firstWhere((m) => m.hasError, orElse: () => save);",
      "    return Text(save.isPending || delete.isPending ? 'Saving' : '$errorMutation');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile normalizes multiline watch expressions with trailing commas", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(",
      "      EventDetailController.saveMutation,",
      "    );",
      "    listenToCatchMutationErrors(context, ref, mutations: [EventDetailController.saveMutation]);",
      "    return Text(save.isPending ? 'Saving' : 'Ready');",
      "  }",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile ignores direct pending guards outside build helpers", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.saveMutation);",
      "    if (save.hasError) return const Text('Failed');",
      "    return Text(save.isPending ? 'Saving' : 'Ready');",
      "  }",
      "}",
      "void runGuard(WidgetRef ref, Mutation<void> mutation) {",
      "  if (ref.read(mutation).isPending) return;",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile ignores non-build mutation pending reads", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_controller.dart",
    source: [
      "bool pending(EventDetailController controller) {",
      "  return controller.toggleSavedEventMutation.isPending;",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanMutationErrorSurfaces scans lib Dart files and ignores generated files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-mutations-"));
  writeFile(
    root,
    "lib/events/presentation/event_detail_screen.dart",
    [
      "class EventDetailScreen extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.toggleSavedEventMutation);",
      "    return Text(save.isPending ? 'Saving' : 'Saved');",
      "  }",
      "}",
    ].join("\n"),
  );
  writeFile(
    root,
    "lib/events/presentation/event_detail_screen.g.dart",
    [
      "class Generated extends ConsumerWidget {",
      "  Widget build(BuildContext context, WidgetRef ref) {",
      "    final Mutation<void> save = ref.watch(EventDetailController.toggleSavedEventMutation);",
      "    return Text(save.isPending ? 'Saving' : 'Saved');",
      "  }",
      "}",
    ].join("\n"),
  );

  const result = scanMutationErrorSurfaces({root});

  assert.equal(result.checkedFiles, 1);
  assert.equal(result.findings.length, 1);
  assert.equal(
    result.findings[0].path,
    "lib/events/presentation/event_detail_screen.dart",
  );
});

test("an app-package build method is held to the same mutation error surface", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-mutation-apps-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const violation = "class Screen { Widget build(context, ref) { final Mutation<void> save = ref.watch(Controller.saveMutation); return Text(save.isPending); } }";
  writeFile(root, "lib/core/example.dart", "class DomainModel {}");
  writeFile(root, "apps/host/lib/today/today_screen.dart", violation);
  writeFile(root, "apps/host/lib/today/today_screen.g.dart", violation);
  writeFile(root, "apps/consumer/lib/explore/explore_screen.dart", violation);
  writeFile(root, "apps/host/test/today/today_screen_test.dart", violation);

  const result = scanMutationErrorSurfaces({root});

  assert.equal(result.checkedFiles, 3);
  assert.deepEqual(result.findings.map((finding) => finding.path), [
    "apps/consumer/lib/explore/explore_screen.dart",
    "apps/host/lib/today/today_screen.dart",
  ]);
});

test("app-package roots are read from disk, so a new package is covered on arrival", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-source-roots-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.deepEqual(screenSourceRoots(root), ["lib"]);
  writeFile(root, "apps/zeta/lib/main.dart", "");
  writeFile(root, "apps/alpha/lib/main.dart", "");
  writeFile(root, "apps/no_source/pubspec.yaml", "");
  assert.deepEqual(screenSourceRoots(root), ["lib", "apps/alpha/lib", "apps/zeta/lib"]);

  for (const file of ["lib/a.dart", "apps/host/lib/a.dart"]) assert.equal(isScreenSource(file), true, file);
  for (const file of ["apps/host/test/a.dart", "packages/catch_ui/lib/a.dart", "test/a.dart"]) {
    assert.equal(isScreenSource(file), false, file);
  }
  assert.equal(isAppPackageSource("lib/a.dart"), false);
  assert.equal(isAppPackageSource("apps/host/lib/a.dart"), true);
});

test("the widget inventory's listed roots name every app package on disk", () => {
  const apps = appPackageSourceRoots(repoRoot);
  assert.ok(apps.length >= 2);
  assert.deepEqual(apps.filter((root) => !productionWidgetRoots.includes(root)), []);
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}

for (const [surface, expected] of [
  ["CatchLocalizedErrorBanner.mutation(mutation: save)", 0],
  ["CatchLocalizedErrorBanner.mutation(mutation: other)", 1],
  ["CatchLocalizedErrorBanner(error)", 1],
  ["CatchLocalizedErrorBanner.mutation(mutation: EventController.saveMutation)", 0],
]) {
  test(`named mutation recipe covers only its matching input: ${surface}`, () => {
    const findings = scanFile({
      relativePath: "lib/events/presentation/event_editor.dart",
      source: `import 'package:flutter_riverpod/experimental/mutation.dart';
      class EventEditor extends ConsumerWidget {
        Widget build(BuildContext context, WidgetRef ref) {
          final save = ref.watch(EventController.saveMutation);
          return Column(children: [
            Text(save.isPending ? 'Saving' : 'Ready'),
            ${surface},
          ]);
        }
      }`,
    });
    assert.equal(findings.length, expected);
  });
}

for (const [handles, expected] of [
  ["handle", 0],
  ["other", 1],
  ["other, handle", 0],
  ["EventController.saveMutation('other')", 1],
]) {
  test(`subscription covers only its matching handle: ${handles}`, () => {
    const findings = scanFile({
      relativePath: "lib/events/presentation/event_editor.dart",
      source: `import 'package:flutter_riverpod/experimental/mutation.dart';
      class EventEditor extends ConsumerWidget {
        Widget build(BuildContext context, WidgetRef ref) {
          final handle = EventController.saveMutation('event');
          final MutationState<void> save = ref.watch(handle);
          listenToCatchMutationErrors(context, ref, mutations: [${handles}]);
          return Text(save.isPending ? 'Saving' : 'Ready');
        }
      }`,
    });
    assert.equal(findings.length, expected);
  });
}

test("subscription named argument order does not change matching", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_editor.dart",
    source: `import 'package:flutter_riverpod/experimental/mutation.dart';
    class EventEditor extends ConsumerWidget {
      Widget build(BuildContext context, WidgetRef ref) {
        final save = ref.watch(EventController.saveMutation);
        listenToCatchMutationErrors(context, ref,
          errorContext: AppErrorContext.event,
          mutations: [EventController.saveMutation]);
        return Text(save.isPending ? 'Saving' : 'Ready');
      }
    }`,
  });
  assert.deepEqual(findings, []);
});
