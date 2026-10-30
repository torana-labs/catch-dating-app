import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {scanDependencyDirection, scanFile} from "./check_dependency_direction.mjs";

test("scanFile flags domain framework imports", () => {
  const findings = scanFile({
    relativePath: "lib/events/domain/event.dart",
    source: "import 'package:cloud_firestore/cloud_firestore.dart';\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "domainFrameworkImport",
  ]);
  assert.equal(findings[0].import, "package:cloud_firestore/cloud_firestore.dart");
});

test("scanFile flags newly introduced non-allowlisted domain packages", () => {
  const findings = scanFile({
    relativePath: "lib/events/domain/event.dart",
    source: "import 'package:url_launcher/url_launcher.dart';\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "domainFrameworkImport",
  ]);
});

test("scanFile allows domain pure Dart, annotation, collection, and app imports", () => {
  const findings = scanFile({
    relativePath: "lib/events/domain/event.dart",
    source: [
      "import 'dart:convert';",
      "import 'package:catch_dating_app/core/firestore_converters.dart';",
      "import 'package:collection/collection.dart';",
      "import 'package:freezed_annotation/freezed_annotation.dart';",
      "import 'package:json_annotation/json_annotation.dart';",
      "import 'package:meta/meta.dart';",
      "import 'package:pub_semver/pub_semver.dart';",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile flags domain DateTime.now access", () => {
  const findings = scanFile({
    relativePath: "lib/events/domain/event.dart",
    source: [
      "class Event {",
      "  bool get isPast => startTime.isBefore(DateTime.now());",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "domainClockAccess",
  ]);
});

test("scanFile allows domain predicates that receive an injected clock", () => {
  const findings = scanFile({
    relativePath: "lib/events/domain/event.dart",
    source: [
      "class Event {",
      "  bool isPast(DateTime now) => startTime.isBefore(now);",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile ignores DateTime.now outside domain files", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: "final now = DateTime.now();\n",
  });

  assert.deepEqual(findings, []);
});

test("scanFile flags data/domain imports of feature presentation", () => {
  const findings = scanFile({
    relativePath: "lib/events/data/event_repository.dart",
    source:
      "import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "dataDomainPresentationImport",
  ]);
});

test("scanFile flags sibling feature widget imports", () => {
  const findings = scanFile({
    relativePath: "lib/dashboard/presentation/widgets/dashboard_full.dart",
    source:
      "import 'package:catch_dating_app/events/presentation/widgets/event_tiles/event_tiles.dart';\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "crossFeaturePresentationImport",
  ]);
});

test("scanFile allows sanctioned cross-feature controller seams from screens and controllers", () => {
  const screenFindings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source:
      "import 'package:catch_dating_app/organizers/presentation/detail/organizer_host_contact_controller.dart';\n",
  });
  const controllerFindings = scanFile({
    relativePath: "lib/auth/presentation/auth_session_controller.dart",
    source:
      "import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';\n",
  });

  assert.deepEqual(screenFindings, []);
  assert.deepEqual(controllerFindings, []);
});

test("scanFile keeps widget and state imports of sibling controllers as debt", () => {
  const widgetFindings = scanFile({
    relativePath: "lib/dashboard/presentation/widgets/dashboard_full.dart",
    source:
      "import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';\n",
  });
  const stateFindings = scanFile({
    relativePath: "lib/user_profile/presentation/self_profile_screen_state.dart",
    source:
      "import 'package:catch_dating_app/image_uploads/presentation/photo_upload_controller.dart';\n",
  });

  assert.deepEqual(widgetFindings.map((finding) => finding.rule), [
    "crossFeaturePresentationImport",
  ]);
  assert.deepEqual(stateFindings.map((finding) => finding.rule), [
    "crossFeaturePresentationImport",
  ]);
});

test("scanFile allows same-feature and core presentation imports", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: [
      "import 'package:catch_dating_app/core/presentation/catch_async_state.dart';",
      "import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("scanFile flags data stream timeouts", () => {
  const findings = scanFile({
    relativePath: "lib/events/data/event_repository.dart",
    source: "final stream = snapshots().timeout(const Duration(seconds: 5));\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "dataStreamTimeout",
  ]);
});

test("scanFile allows data streams without timeouts", () => {
  const findings = scanFile({
    relativePath: "lib/events/data/event_repository.dart",
    source: "final stream = snapshots().map((snapshot) => snapshot.docs);\n",
  });

  assert.deepEqual(findings, []);
});

test("scanFile honors stream timeout override comments", () => {
  const previousLineFindings = scanFile({
    relativePath: "lib/events/data/event_repository.dart",
    source: [
      "// architecture:allow stream-timeout -- reason: non-Firestore socket deadline",
      "final stream = socketEvents.timeout(const Duration(seconds: 5));",
    ].join("\n"),
  });
  const sameLineFindings = scanFile({
    relativePath: "lib/events/data/event_repository.dart",
    source:
      "final stream = socketEvents.timeout(const Duration(seconds: 5)); // architecture:allow stream-timeout -- reason: protocol deadline\n",
  });

  assert.deepEqual(previousLineFindings, []);
  assert.deepEqual(sameLineFindings, []);
});

test("scanFile flags presentation plugin imports outside controllers and services", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/widgets/event_pins_map.dart",
    source:
      "import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "presentationPluginImport",
  ]);
  assert.equal(
    findings[0].import,
    "package:google_maps_flutter/google_maps_flutter.dart",
  );
});

test("scanFile allows presentation plugin imports in controllers and services", () => {
  const controllerFindings = scanFile({
    relativePath: "lib/hosts/presentation/create_event_controller.dart",
    source: "import 'package:image_picker/image_picker.dart';\n",
  });
  const serviceFindings = scanFile({
    relativePath: "lib/events/presentation/location_service.dart",
    source: "import 'package:geolocator/geolocator.dart';\n",
  });

  assert.deepEqual(controllerFindings, []);
  assert.deepEqual(serviceFindings, []);
});

test("scanFile allows non-plugin presentation imports", () => {
  const findings = scanFile({
    relativePath: "lib/events/presentation/event_detail_screen.dart",
    source: "import 'package:intl/intl.dart';\n",
  });

  assert.deepEqual(findings, []);
});

test("scanFile flags WidgetRef parameters below route build methods", () => {
  const findings = scanFile({
    relativePath: "lib/explore/presentation/widgets/explore_body.dart",
    source: "List<Widget> buildRows(BuildContext context, WidgetRef ref) => [];\n",
  });
  const buildFindings = scanFile({
    relativePath: "lib/explore/presentation/explore_screen.dart",
    source:
      "class ExploreScreen extends ConsumerWidget { Widget build(BuildContext context, WidgetRef ref) => const SizedBox(); }\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "widgetRefParameter",
  ]);
  assert.deepEqual(buildFindings, []);
});

test("scanFile flags repository provider reads from presentation widgets", () => {
  const widgetFindings = scanFile({
    relativePath: "lib/explore/presentation/widgets/explore_city_picker.dart",
    source: "final cities = ref.watch(cityRepositoryProvider);\n",
  });
  const viewModelFindings = scanFile({
    relativePath: "lib/explore/presentation/explore_view_model.dart",
    source: "final repository = ref.watch(exploreRepositoryProvider);\n",
  });

  assert.deepEqual(widgetFindings.map((finding) => finding.rule), [
    "widgetRepositoryProviderRead",
  ]);
  assert.deepEqual(viewModelFindings, []);
});

test("scanFile flags unannotated feature-root presentation barrel exports", () => {
  const missingFindings = scanFile({
    relativePath: "lib/events/events.dart",
    source: "export 'presentation/event_detail_screen.dart';\n",
  });
  const sameLineFindings = scanFile({
    relativePath: "lib/events/events.dart",
    source:
      "export 'presentation/event_detail_screen.dart'; // public-api: route entry point\n",
  });
  const previousLineFindings = scanFile({
    relativePath: "lib/events/events.dart",
    source:
      "// public-api: route entry point\nexport 'presentation/event_detail_screen.dart';\n",
  });
  const nestedBarrelFindings = scanFile({
    relativePath: "lib/events/presentation/widgets/event_tiles.dart",
    source: "export 'presentation/event_detail_screen.dart';\n",
  });

  assert.deepEqual(missingFindings.map((finding) => finding.rule), [
    "barrelPresentationExport",
  ]);
  assert.deepEqual(sameLineFindings, []);
  assert.deepEqual(previousLineFindings, []);
  assert.deepEqual(nestedBarrelFindings, []);
});

test("scanFile flags provider-coupled presentation state files", () => {
  const importFindings = scanFile({
    relativePath: "lib/chats/presentation/chat_route_state.dart",
    source: "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
  });
  const providerFindings = scanFile({
    relativePath: "lib/chats/presentation/chat_route_state.dart",
    source: "final value = Provider<int>((ref) => 1);\n",
  });
  const pureFindings = scanFile({
    relativePath: "lib/chats/presentation/chat_route_state.dart",
    source: "class ChatRouteState { const ChatRouteState(); }\n",
  });

  assert.deepEqual(importFindings.map((finding) => finding.rule), [
    "stateFileProviderImport",
  ]);
  assert.deepEqual(providerFindings.map((finding) => finding.rule), [
    "stateFileProviderImport",
    "manualProviderDeclaration",
  ]);
  assert.deepEqual(pureFindings, []);
});

test("scanFile flags undocumented keepAlive providers", () => {
  const missingFindings = scanFile({
    relativePath: "lib/chats/presentation/inbox/chats_list_view_model.dart",
    source: "@Riverpod(keepAlive: true)\nString chatSearchQuery(Ref ref) => '';\n",
  });
  const documentedFindings = scanFile({
    relativePath: "lib/chats/presentation/inbox/chats_list_view_model.dart",
    source:
      "// keepalive: preserve search text across tab switches\n@Riverpod(keepAlive: true)\nString chatSearchQuery(Ref ref) => '';\n",
  });

  assert.deepEqual(missingFindings.map((finding) => finding.rule), [
    "undocumentedKeepAlive",
  ]);
  assert.deepEqual(documentedFindings, []);
});

test("scanFile flags manual provider declarations outside core", () => {
  const featureFindings = scanFile({
    relativePath: "lib/chats/presentation/chat_route_view_model.dart",
    source: "final stateProvider = Provider.family<ChatRouteState, Args>((ref, args) {});\n",
  });
  const coreFindings = scanFile({
    relativePath: "lib/core/firebase_providers.dart",
    source: "final appProvider = Provider<FirebaseApp>((ref) => throw UnimplementedError());\n",
  });

  assert.deepEqual(featureFindings.map((finding) => finding.rule), [
    "manualProviderDeclaration",
  ]);
  assert.deepEqual(coreFindings, []);
});

test("manual provider ratchet identifies every declaration and builder shape", () => {
  const source = [
    "// final ignoredProvider = Provider<int>((ref) => 1);",
    "final text = 'final ignoredProvider = Provider<int>((ref) => 1);';",
    "final firstProvider = FutureProvider.autoDispose",
    "    .family<int, String>((ref, key) async => 1);",
    "final secondProvider = ChangeNotifierProvider.autoDispose<Owner>((ref) => Owner());",
  ].join("\n");
  const findings = scanFile({relativePath: "lib/sample/presentation/owners.dart", source});
  assert.deepEqual(findings.map(({rule, symbol, operation}) => ({rule, symbol, operation})), [
    {rule: "manualProviderDeclaration", symbol: "firstProvider", operation: "FutureProvider.autoDispose.family"},
    {rule: "manualProviderDeclaration", symbol: "secondProvider", operation: "ChangeNotifierProvider.autoDispose"},
  ]);
});

test("manual provider baseline rejects same-count swaps and new symbols in an existing debt file", () => {
  const file = "lib/sample/presentation/owners.dart";
  const reviewed = {rule: "manualProviderDeclaration", path: file, symbol: "oldProvider", operation: "Provider", status: "planned", debtId: "CAT156", rationale: "Existing exact declaration debt."};
  const scan = (source, allowedFindings = [reviewed]) => scanDependencyDirection({
    snapshot: createFixtureSnapshot({[file]: source}), baseline: {allowedFindings},
  });
  assert.equal(scan("final oldProvider = Provider<int>((ref) => 1);").findings.length, 0);
  assert.equal(scan("final replacementProvider = Provider<int>((ref) => 1);").findings[0].symbol, "replacementProvider");
  assert.equal(scan("final oldProvider = FutureProvider<int>((ref) async => 1);").findings[0].operation, "FutureProvider");
  const expanded = scan("final oldProvider = Provider<int>((ref) => 1);\nfinal secondProvider = Provider<int>((ref) => 2);");
  assert.equal(expanded.baselineFindings.length, 1);
  assert.equal(expanded.findings[0].symbol, "secondProvider");
  assert.deepEqual(scan("final oldProvider = Provider<int>((ref) => 1);", [{rule: reviewed.rule, path: file}]).findings.map(finding => finding.rule),
    ["manualProviderDeclaration", "staleBaselineAllowance"]);
});

test("prefixed manual provider families retain canonical builder identity", () => {
  const findings = scanFile({relativePath: "lib/sample/presentation/owners.dart", source: [
    "import 'package:flutter_riverpod/flutter_riverpod.dart' as rp;",
    "final firstProvider = rp.FutureProvider.autoDispose.family<int, String>((ref, key) async => 1);",
  ].join("\n")});
  assert.equal(findings.length, 1);
  assert.equal(findings[0].symbol, "firstProvider");
  assert.equal(findings[0].operation, "FutureProvider.autoDispose.family");
});

test("scanFile flags display state classes misplaced outside state files", () => {
  const findings = scanFile({
    relativePath: "lib/hosts/presentation/host_operations_screen.dart",
    source: [
      "class HostOrganizersScreenState {",
      "  const HostOrganizersScreenState();",
      "  factory HostOrganizersScreenState.from(Object source) => const HostOrganizersScreenState();",
      "}",
    ].join("\n"),
  });
  const stateFileFindings = scanFile({
    relativePath: "lib/hosts/presentation/host_clubs_screen_state.dart",
    source: [
      "class HostOrganizersScreenState {",
      "  const HostOrganizersScreenState();",
      "  factory HostOrganizersScreenState.from(Object source) => const HostOrganizersScreenState();",
      "}",
    ].join("\n"),
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "misplacedStateClass",
  ]);
  assert.deepEqual(stateFileFindings, []);
});

test("scanFile flags presentation files with multiple route screens", () => {
  const findings = scanFile({
    relativePath: "lib/hosts/presentation/host_operations_screen.dart",
    source: [
      "class HostOperationsHomeScreen extends StatelessWidget {}",
      "class HostOrganizersScreen extends ConsumerWidget {}",
    ].join("\n"),
  });
  const singleFindings = scanFile({
    relativePath: "lib/hosts/presentation/host_clubs_screen.dart",
    source: "class HostOrganizersScreen extends StatelessWidget {}\n",
  });

  assert.deepEqual(findings.map((finding) => finding.rule), [
    "multiRouteScreenFile",
  ]);
  assert.deepEqual(singleFindings, []);
});

test("scanDependencyDirection flags untracked state adapters as a hard gate", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/presentation/event_detail_screen_state.dart":
      "class EventDetailScreenState { const EventDetailScreenState(); }\n",
    "tool/architecture/pattern_adoption.json": JSON.stringify({
      patterns: [],
    }),
  });

  const result = scanDependencyDirection({
    snapshot,
    baseline: {
      allowedFindings: [
        {
          rule: "untrackedStateAdapter",
          path: "lib/events/presentation/event_detail_screen_state.dart",
        },
      ],
    },
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, "untrackedStateAdapter");
});

test("scanDependencyDirection allows registered state adapters", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/presentation/event_detail_screen_state.dart":
      "class EventDetailScreenState { const EventDetailScreenState(); }\n",
    "tool/architecture/pattern_adoption.json": JSON.stringify({
      patterns: [
        {
          adopters: [
            {path: "lib/events/presentation/event_detail_screen_state.dart"},
          ],
        },
      ],
    }),
  });

  const result = scanDependencyDirection({
    snapshot,
    baseline: {allowedFindings: []},
  });

  assert.deepEqual(result.findings, []);
});

test("scanDependencyDirection ratchets baseline findings", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/domain/event.dart":
      "import 'package:cloud_firestore/cloud_firestore.dart';\n",
    "lib/hosts/presentation/host_event_manage_screen.dart":
      "import 'package:catch_dating_app/events/presentation/widgets/event_tiles/event_tiles.dart';\n",
    "lib/events/domain/event_time_policy.dart":
      "bool isPast(DateTime startTime) => startTime.isBefore(DateTime.now());\n",
  });

  const baseline = {
    allowedFindings: [
      {
        rule: "domainFrameworkImport",
        path: "lib/events/domain/event.dart",
        import: "package:cloud_firestore/cloud_firestore.dart",
      },
      {
        rule: "domainClockAccess",
        path: "lib/events/domain/event_time_policy.dart",
      },
    ],
  };

  const result = scanDependencyDirection({snapshot, baseline});

  assert.equal(result.baselineFindings.length, 2);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].rule, "crossFeaturePresentationImport");
});

test("scanDependencyDirection batches snapshot reads and ignores generated Dart", () => {
  const batches = [];
  const snapshot = createFixtureSnapshot(
    {
      "lib/events/domain/event.dart": "class Event {}\n",
      "lib/events/domain/event.g.dart": "generated\n",
      "lib/events/domain/event.freezed.dart": "generated\n",
      "lib/events/presentation/event_screen.dart": "class EventScreen {}\n",
      "tool/architecture/pattern_adoption.json": JSON.stringify({
        patterns: [],
      }),
    },
    {onReadTexts: (paths) => batches.push(paths)},
  );

  const result = scanDependencyDirection({
    snapshot,
    baseline: {allowedFindings: []},
  });

  assert.equal(result.checkedFiles, 2);
  assert.deepEqual(batches, [[
    "lib/events/domain/event.dart",
    "lib/events/presentation/event_screen.dart",
    "tool/architecture/pattern_adoption.json",
  ]]);
});

test("scanDependencyDirection fails closed when the repository view has no Dart", () => {
  const snapshot = createFixtureSnapshot({"README.md": "fixture\n"});

  assert.throws(
    () => scanDependencyDirection({snapshot, baseline: {allowedFindings: []}}),
    /cannot pass without handwritten lib Dart files/u,
  );
});

test("dependency baseline cleanup rejects stale keys and reintroduced debt through the CLI", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-dependency-baseline-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const init = spawnSync("git", ["init", "--quiet", root], {encoding: "utf8"});
  assert.equal(init.status, 0, init.stderr);
  const relative = "lib/sample/data/owner.dart";
  const source = path.join(root, relative);
  const baseline = path.join(root, "baseline.json");
  const declaration = "final oldProvider = Provider<int>((ref) => 1);\n";
  const allowance = {rule: "manualProviderDeclaration", path: relative,
    symbol: "oldProvider", operation: "Provider", status: "accepted-exception", rationale: "Reviewed exact provider."};
  fs.mkdirSync(path.dirname(source), {recursive: true});
  fs.writeFileSync(source, declaration);
  fs.writeFileSync(baseline, JSON.stringify({allowedFindings: [allowance]}));
  const check = (status, rule) => {
    const before = [source, baseline].map(file => fs.readFileSync(file, "utf8"));
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("./check_dependency_direction.mjs", import.meta.url)),
      "--root", root, "--baseline", baseline, "--json",
    ], {encoding: "utf8"});
    assert.equal(result.status, status, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.findings.map(finding => finding.rule), rule ? [rule] : []);
    assert.deepEqual([source, baseline].map(file => fs.readFileSync(file, "utf8")), before);
    return report;
  };
  assert.equal(check(0).baselineFindings.length, 1);
  fs.writeFileSync(source, "class Owner {}\n");
  assert.deepEqual(check(1, "staleBaselineAllowance").allFindings, []);
  fs.writeFileSync(baseline, JSON.stringify({allowedFindings: []}));
  check(0);
  fs.writeFileSync(source, declaration);
  check(1, "manualProviderDeclaration");
});

function createFixtureSnapshot(files, {onReadTexts = () => {}} = {}) {
  const sources = new Map(Object.entries(files));
  return {
    listFiles({prefix = ""} = {}) {
      return [...sources.keys()]
        .filter((relativePath) => relativePath.startsWith(prefix))
        .sort();
    },
    readTexts(relativePaths) {
      const paths = [...relativePaths];
      onReadTexts(paths);
      return new Map(paths.map((relativePath) => [
        relativePath,
        sources.get(relativePath) ?? null,
      ]));
    },
  };
}

test("relative and package presentation imports enforce the same dependency rules", () => {
  for (const layer of ["data", "domain"]) {
    for (const uri of [
      "../presentation/widget.dart",
      "../domain/../presentation/widget.dart",
      "../%70resentation/widget.dart",
      "package:catch_dating_app/sample/presentation/widget.dart",
    ]) {
      const findings = scanFile({relativePath: `lib/sample/${layer}/model.dart`,
        source: `import '${uri}';`});
      assert.deepEqual(findings.map(({rule, line}) => ({rule, line})),
        [{rule: "dataDomainPresentationImport", line: 1}], uri);
      assert.equal(findings[0].import, uri);
    }
  }
});

test("relative presentation imports preserve same-feature, core and controller seams", () => {
  const source = [
    "import '../../core/presentation/widget.dart';",
    "import 'widgets/local.dart';",
    "import '../../other/presentation/other_controller.dart';",
  ].join("\n");
  assert.deepEqual(scanFile({relativePath: "lib/sample/presentation/sample_screen.dart",
    source}), []);
  const findings = scanFile({relativePath: "lib/sample/presentation/sample_widget.dart",
    source});
  assert.deepEqual(findings.map(({rule, line}) => ({rule, line})),
    [{rule: "crossFeaturePresentationImport", line: 3}]);
});

test("dependency imports include every conditional URI with its source line", () => {
  const source = [
    "// Emoji keeps offsets honest: 🌟",
    "  import '../domain/model.dart'",
    "    if (dart.library.io) '../presentation/widget.dart'",
    "    if (dart.library.html) 'package:flutter/widgets.dart' as ui show Widget;",
  ].join("\n");
  const findings = scanFile({relativePath: "lib/sample/domain/model.dart", source});
  assert.deepEqual(findings.map(({rule, line, import: uri}) => ({rule, line, uri})), [
    {rule: "dataDomainPresentationImport", line: 3, uri: "../presentation/widget.dart"},
    {rule: "domainFrameworkImport", line: 4, uri: "package:flutter/widgets.dart"},
  ]);
  assert.equal(scanFile({relativePath: "lib/sample/presentation/sample_widget.dart",
    source: "import 'local.dart' if (dart.library.io) 'package:image_picker/image_picker.dart' deferred as picker;"})[0].rule,
  "presentationPluginImport");
});

test("dependency import parsing ignores commented and literal directives", () => {
  const source = [
    "/* outer /* nested */",
    "import 'package:flutter/widgets.dart';",
    "*/",
    "final documentation = r'''",
    "import 'package:flutter/widgets.dart';",
    "DateTime.now()",
    "''';",
    "// import '../presentation/widget.dart'; DateTime.now()",
    'final example = "DateTime.now()";',
    "class Sample {}",
  ].join("\n");
  assert.deepEqual(scanFile({relativePath: "lib/sample/domain/model.dart", source}), []);
  assert.throws(() => scanFile({relativePath: "lib/sample/domain/model.dart",
    source: "import '${dynamicPath}';"}), /Unsupported Dart import directive/u);
});

test("domain clocks scan executable interpolation and preserve offsets and scope", () => {
  const source = [
    "// 🌟 DateTime.now() is documentation",
    "final example = r'${DateTime.now()}';",
    "final value = '${DateTime /* comment */ . now()}';",
  ].join("\n");
  assert.deepEqual(scanFile({relativePath: "lib/sample/domain/model.dart", source})
    .map(({rule, line}) => ({rule, line})), [{rule: "domainClockAccess", line: 3}]);
  assert.deepEqual(scanFile({relativePath: "lib/sample/data/model.dart", source}), []);
  assert.deepEqual(scanFile({relativePath: "lib/sample/domain/model.dart",
    source: "final value = MyDateTime.now();"}), []);
});

test("dependency CLI rejects relative and conditional violations but accepts lexical controls", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-dependency-lexical-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const init = spawnSync("git", ["init", "--quiet", root], {encoding: "utf8"});
  assert.equal(init.status, 0, init.stderr);
  const file = path.join(root, "lib/sample/domain/model.dart");
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const cases = [
    ["import '../presentation/widget.dart';", 1, "dataDomainPresentationImport"],
    ["import 'package:catch_dating_app/sample/presentation/widget.dart';", 1, "dataDomainPresentationImport"],
    ["import 'model.dart' if (dart.library.io) 'package:flutter/widgets.dart';", 1, "domainFrameworkImport"],
    ["// DateTime.now()\nfinal text = 'DateTime.now()';", 0, null],
    ["/* import 'package:flutter/widgets.dart'; */\nclass Sample {}", 0, null],
    ["final now = DateTime.now();", 1, "domainClockAccess"],
    ["final label = '${DateTime.now()}';", 1, "domainClockAccess"],
  ];
  for (const [source, status, rule] of cases) {
    fs.writeFileSync(file, source);
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("./check_dependency_direction.mjs", import.meta.url)),
      "--root", root, "--json",
    ], {encoding: "utf8"});
    assert.equal(result.status, status, `${source}\n${result.stderr}\n${result.stdout}`);
    assert.deepEqual(JSON.parse(result.stdout).findings.map((finding) => finding.rule),
      rule ? [rule] : [], source);
    assert.equal(fs.readFileSync(file, "utf8"), source);
  }
});

test("scanFile holds context domain and kernel files to the domain rules", () => {
  const rules = (relativePath, source) =>
    scanFile({relativePath, source}).map((finding) => finding.rule);

  assert.deepEqual(rules("lib/contexts/events/domain/event.dart",
    "import 'package:cloud_firestore/cloud_firestore.dart';\n"), ["domainFrameworkImport"]);
  assert.deepEqual(rules("lib/kernel/ids.dart",
    "import 'package:flutter/widgets.dart';\n"), ["domainFrameworkImport"]);
  assert.deepEqual(rules("lib/kernel/clock.dart",
    "bool isPast(DateTime at) => at.isBefore(DateTime.now());\n"), ["domainClockAccess"]);
  assert.deepEqual(rules("lib/contexts/events/data/event_repository.dart",
    "Stream<int> watch() => source.timeout(limit);\n"), ["dataStreamTimeout"]);
});

test("scanFile flags context data and domain imports of actions, parts and screens", () => {
  for (const target of [
    "package:catch_dating_app/contexts/bookings/actions/check_in_controller.dart",
    "package:catch_dating_app/contexts/bookings/parts/guest_row.dart",
    "package:catch_dating_app/pages/event_page/event_page_body.dart",
    "../actions/check_in_controller.dart",
  ]) {
    const findings = scanFile({
      relativePath: "lib/contexts/bookings/data/booking_repository.dart",
      source: `import '${target}';\n`,
    });
    assert.deepEqual(findings.map((finding) => finding.rule),
      ["dataDomainPresentationImport"], target);
  }
});

test("scanFile flags provider-coupled context parts as a hard gate", () => {
  const findings = scanFile({
    relativePath: "lib/contexts/events/parts/event_row.dart",
    source: "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
  });
  assert.deepEqual(findings.map((finding) => finding.rule), ["partsProviderCoupling"]);

  const snapshot = createFixtureSnapshot({
    "lib/contexts/events/parts/event_row.dart": "final row = ref.watch(eventProvider);\n",
  });
  const result = scanDependencyDirection({snapshot, baseline: {allowedFindings: [{
    rule: "partsProviderCoupling",
    path: "lib/contexts/events/parts/event_row.dart",
  }]}});
  assert.ok(result.findings.some((finding) => finding.rule === "partsProviderCoupling"));
});

test("scanFile lets context actions read repositories and plugins", () => {
  assert.deepEqual(scanFile({
    relativePath: "lib/contexts/bookings/actions/check_in.dart",
    source: [
      "import 'package:mobile_scanner/mobile_scanner.dart';",
      "final repository = ref.read(bookingRepositoryProvider);",
    ].join("\n"),
  }), []);
});

test("scanFile applies screen rules to app-package destinations and shared pages", () => {
  const rules = (relativePath, source) =>
    scanFile({relativePath, source}).map((finding) => finding.rule);

  assert.deepEqual(rules("apps/host/lib/today/widgets/today_needs_you.dart",
    "final events = ref.watch(eventRepositoryProvider);\n"), ["widgetRepositoryProviderRead"]);
  assert.deepEqual(rules("apps/host/lib/today/today_state.dart",
    "import 'package:flutter_riverpod/flutter_riverpod.dart';\n"), ["stateFileProviderImport"]);
  assert.deepEqual(rules("lib/pages/event_page/event_page_body.dart",
    "List<Widget> rows(BuildContext context, WidgetRef ref) => [];\n"), ["widgetRefParameter"]);
  assert.deepEqual(rules("apps/consumer/lib/explore/widgets/map_button.dart",
    "import 'package:url_launcher/url_launcher.dart';\n"), ["presentationPluginImport"]);
  assert.deepEqual(rules("apps/consumer/lib/razorpay_checkout_adapter.dart",
    "import 'package:razorpay_flutter/razorpay_flutter.dart';\n"), []);
});

test("scanDependencyDirection scans app packages and never baselines the context roots", () => {
  const snapshot = createFixtureSnapshot({
    "lib/events/domain/event.dart": "class Event {}\n",
    "apps/host/lib/today/widgets/today_list.dart":
      "final events = ref.watch(eventRepositoryProvider);\n",
    "apps/host/test/today_test.dart": "final x = ref.watch(eventRepositoryProvider);\n",
    "lib/contexts/events/domain/event.dart":
      "import 'package:cloud_firestore/cloud_firestore.dart';\n",
  });
  const result = scanDependencyDirection({snapshot, baseline: {allowedFindings: [
    {
      rule: "widgetRepositoryProviderRead",
      path: "apps/host/lib/today/widgets/today_list.dart",
    },
    {
      rule: "domainFrameworkImport",
      path: "lib/contexts/events/domain/event.dart",
      import: "package:cloud_firestore/cloud_firestore.dart",
    },
  ]}});

  assert.equal(result.checkedFiles, 3);
  assert.deepEqual(result.baselineFindings, []);
  assert.deepEqual(result.findings.map(({rule, path: findingPath}) => `${rule} ${findingPath}`).sort(), [
    "domainFrameworkImport lib/contexts/events/domain/event.dart",
    "widgetRepositoryProviderRead apps/host/lib/today/widgets/today_list.dart",
  ]);
});

test("manual provider declarations are allowed in the platform root like core", () => {
  for (const relativePath of ["lib/core/firebase_providers.dart", "lib/platform/firebase_providers.dart"]) {
    assert.deepEqual(scanFile({
      relativePath,
      source: "final firestoreProvider = Provider((ref) => FirebaseFirestore.instance);\n",
    }), [], relativePath);
  }
});
