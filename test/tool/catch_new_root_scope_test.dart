import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:catch_ui_lints/src/architecture_context_map.dart';
import 'package:catch_ui_lints/src/architecture_findings.dart';
import 'package:catch_ui_lints/src/architecture_provider_free.dart';
import 'package:catch_ui_lints/src/migration_scope.dart';
import 'package:flutter_test/flutter_test.dart';

/// Every architecture finding code in [source] at [path], carried or not, the
/// refused exceptions included.
List<String> _arch(String path, String source, {String? carriedFrom}) {
  final unit = parseString(content: source, throwIfDiagnostics: false).unit;
  final findings = [
    ...dependencyDirectionFindings(
      relativePath: path,
      source: source,
      unit: unit,
      carriedFrom: carriedFrom,
    ),
    ...providerFreeFindings(
      relativePath: path,
      source: source,
      unit: unit,
      carriedFrom: carriedFrom,
    ),
  ];
  return [
    for (final finding in [
      ...findings,
      ...ignorePolicyFindings(
        relativePath: path,
        source: source,
        unit: unit,
        findings: findings,
        carriedFrom: carriedFrom,
      ),
    ])
      finding.code,
  ];
}

void main() {
  _carriedRuleTests();
  group('the carried list', () {
    final json =
        jsonDecode(File(carriedScreensPath).readAsStringSync())
            as Map<String, dynamic>;
    final entries = (json['carried'] as List).cast<Map<String, dynamic>>();

    test('is sorted, unique and names real new-root files', () {
      expect(json.keys.toSet(), {'description', 'carried'});
      final paths = [for (final entry in entries) entry['path'] as String];
      expect(paths, [...paths]..sort(), reason: 'sort entries by path');
      expect(paths.toSet().length, paths.length, reason: 'one entry a file');
      for (final entry in entries) {
        expect(entry.keys.toSet(), {'path', 'from'}, reason: '$entry');
        final path = entry['path'] as String;
        final from = entry['from'] as String;
        expect(
          File(path).existsSync(),
          isTrue,
          reason: '$path is gone, so its entry goes too.',
        );
        expect(newRootPath(path), isTrue, reason: '$path is not a new root');
        expect(path, isNot(matches(r'\.(?:g|freezed)\.dart$')));
        expect(path, endsWith('.dart'));
        expect(from, matches(r'^lib/.+\.dart$'), reason: path);
      }
      expect(parseCarriedScreens(jsonEncode(json)), {
        for (final entry in entries)
          entry['path'] as String: entry['from'] as String,
      });
    });

    test('carries moved files from legacy paths, and the two screens that '
        'predate D24 as their own path, which only shrinks', () {
      // Do not add to this set: redraw the screen instead. Removing an entry
      // from the list, and then from here, is how the set ends.
      const preD24 = {
        'lib/pages/celebration/celebration_screen.dart',
        'lib/pages/startup/splash_screen.dart',
      };
      for (final entry in entries) {
        final path = entry['path'] as String;
        final from = entry['from'] as String;
        if (from == path) {
          expect(preD24, contains(path), reason: '$path carries itself');
        } else {
          expect(
            newRootPath(from),
            isFalse,
            reason: '$path moved from a new root, so it carries nothing.',
          );
        }
      }
    });
  });

  test('a list that cannot be read carries nothing', () {
    expect(parseCarriedScreens('{'), isEmpty);
    expect(parseCarriedScreens('[]'), isEmpty);
    expect(parseCarriedScreens('{"carried": {}}'), isEmpty);
    expect(
      parseCarriedScreens(
        '{"carried": [{"path": "a.dart"}, {"path": "b.dart", "from": "c.dart"}]}',
      ),
      {'b.dart': 'c.dart'},
    );
  });

  test('the new roots are the app packages, lib/pages and the redrawn '
      'host destinations', () {
    for (final file in const [
      'apps/host/lib/main.dart',
      'apps/consumer/lib/explore/widgets/row.dart',
      'lib/pages/welcome/welcome_body.dart',
      'lib/hosts/today/host_today_body.dart',
      'lib/hosts/create/create_basics_body.dart',
      'lib/hosts/onboarding/sign_in_body.dart',
      'lib/hosts/door/door_body.dart',
      'lib/hosts/insights/host_insights_body.dart',
      'lib/hosts/live/live_body.dart',
      'lib/hosts/organizer/organizer_body.dart',
      'lib/hosts/people/people_body.dart',
      'lib/hosts/forms/forms_body.dart',
      'lib/hosts/programmes/staff/staff_door_body.dart',
      'lib/hosts/programmes/planner/programme_body.dart',
      'tool/catch_ui_lints_probe/run.x/1/apps/host/lib/a.dart',
      'tool/catch_ui_lints_probe/run.x/1/arch/lib/pages/a/a.dart',
    ]) {
      expect(newRootPath(file), isTrue, reason: file);
    }
    for (final file in const [
      'lib/hosts/presentation/host_screen.dart',
      'lib/hosts/todayish/a.dart',
      'lib/hosts/doorway/a.dart',
      'packages/platform/lib/pages/a.dart',
      'apps/host/test/a.dart',
      'apps/lib/a.dart',
      'packages/catch_ui/lib/pages/a.dart',
      'tool/catch_ui_lints_probe/run.x/1/lib/hosts/presentation/a.dart',
    ]) {
      expect(newRootPath(file), isFalse, reason: file);
    }
  });

  test('zero drawing leaves out carried files and generated code', () {
    final root = Directory.systemTemp.createTempSync('catch-new-root-');
    addTearDown(() => root.deleteSync(recursive: true));
    Directory('${root.path}/.git').createSync();
    void write(String relative, Object json) {
      File('${root.path}/$relative')
        ..parent.createSync(recursive: true)
        ..writeAsStringSync(jsonEncode(json));
    }

    write(carriedScreensPath, {
      'carried': [
        {
          'path': 'apps/host/lib/events/manage/host_event_screen.dart',
          'from': 'lib/hosts/presentation/host_event_screen.dart',
        },
      ],
    });
    write('tool/catch_ui_lints_probe/run.x/carried_screens.json', {
      'carried': [
        {
          'path': 'apps/host/lib/carried/probe_screen.dart',
          'from': 'lib/events/shared/probe_screen.dart',
        },
      ],
    });
    bool zero(String relative) => zeroDrawingPath('${root.path}/$relative');
    bool source(String relative) => newRootSourcePath('${root.path}/$relative');
    String? from(String relative) => carriedFrom('${root.path}/$relative');

    expect(zero('apps/host/lib/today/today_body.dart'), isTrue);
    expect(zero('apps/host/lib/today/today_view_model.g.dart'), isFalse);
    expect(zero('apps/host/lib/today/today.freezed.dart'), isFalse);
    expect(zero('lib/pages/celebration/celebration_effects.dart'), isTrue);
    expect(zero('lib/hosts/presentation/host_screen.dart'), isFalse);
    expect(zero('lib/hosts/today/host_today_screen.dart'), isTrue);
    expect(zero('lib/hosts/today/host_today_controller.g.dart'), isFalse);
    expect(zero('lib/hosts/create/create_screen.dart'), isTrue);
    expect(zero('lib/hosts/organizer/organizer_screen.dart'), isTrue);

    const carried = 'apps/host/lib/events/manage/host_event_screen.dart';
    expect(zero(carried), isFalse);
    expect(source(carried), isTrue, reason: 'the stale-carry shadow holds it');
    expect(from(carried), 'lib/hosts/presentation/host_event_screen.dart');
    expect(from('apps/host/lib/events/manage/other_screen.dart'), isNull);
    expect(
      from('tool/catch_ui_lints_probe/run.x/1/$carried'),
      'lib/hosts/presentation/host_event_screen.dart',
      reason: 'a fixture stands for a carried file',
    );
    expect(
      from(
        'tool/catch_ui_lints_probe/run.x/2/apps/host/lib/carried/'
        'probe_screen.dart',
      ),
      'lib/events/shared/probe_screen.dart',
      reason: "a fixture run carries its own list's entries",
    );
    expect(from('apps/host/lib/carried/probe_screen.dart'), isNull);
    expect(
      from(
        'tool/catch_ui_lints_probe/run.y/1/apps/host/lib/carried/'
        'probe_screen.dart',
      ),
      isNull,
      reason: "another run does not see this run's list",
    );
  });
}

void _carriedRuleTests() {
  group('a carried file keeps the rules of the path it moved from', () {
    const moved = 'apps/host/lib/events/manage/host_event_widget.dart';

    test('placeSource places it as that legacy path', () {
      expect(placeSource(moved), (
        root: 'app',
        owner: 'apps/host/events',
        layer: 'presentation',
      ));
      expect(
        placeSource(
          moved,
          carriedFrom: 'lib/hosts/presentation/host_event_widget.dart',
        ),
        (root: 'legacy', owner: 'hosts', layer: 'presentation'),
      );
      expect(
        placeSource(moved, carriedFrom: 'lib/events/shared/event_tile.dart'),
        isNull,
        reason: 'shared/ had no layer before the move, so it has none after',
      );
    });

    test('its reasoned exceptions stand; the new roots refuse them', () {
      const source =
          '// ignore: catch_ui_lints/catch_arch_cross_feature_presentation_import -- seam\n'
          "import 'package:catch_dating_app/events/presentation/event_tile.dart';\n";
      expect(
        _arch(
          moved,
          source,
          carriedFrom: 'lib/hosts/presentation/host_event_widget.dart',
        ),
        [ArchitectureCodes.crossFeaturePresentationImport],
        reason: 'the live finding the analyzer then hides behind the ignore',
      );
      expect(_arch(moved, source), [
        ArchitectureCodes.invalidIgnore,
        ArchitectureCodes.invalidIgnore,
      ], reason: 'a clean root refuses it, and nothing reports it there');
    });

    test('it gains no layer or provider-free rule its old path lacked', () {
      const helper =
          "import 'package:flutter_riverpod/flutter_riverpod.dart';\n"
          'int read(WidgetRef ref) => 1;\n';
      const body = 'apps/host/lib/events/manage/host_event_body.dart';
      expect(
        _arch(body, helper),
        containsAll([
          ArchitectureCodes.widgetRefParameter,
          ArchitectureCodes.providerFreeBoundary,
        ]),
      );
      expect(
        _arch(body, helper, carriedFrom: 'lib/events/shared/event_body.dart'),
        isEmpty,
      );
    });

    test('catch_arch_stale_carry is a hard gate', () {
      expect(
        ArchitectureCodes.hardGates,
        contains(ArchitectureCodes.staleCarry),
      );
      expect(
        ArchitectureCodes.all,
        isNot(contains(ArchitectureCodes.staleCarry)),
      );
      expect(
        _arch(
          moved,
          '// ignore: catch_ui_lints/catch_arch_stale_carry -- not yet\n'
          'const a = 1;\n',
          carriedFrom: 'lib/hosts/presentation/host_event_widget.dart',
        ),
        [ArchitectureCodes.invalidIgnore, ArchitectureCodes.invalidIgnore],
      );
    });
  });
}
