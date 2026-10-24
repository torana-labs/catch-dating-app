import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:catch_ui_lints/src/catch_drawing_migration.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../tool/architecture/check_ui_composition_contracts.dart'
    show analysisDartSdkPath;

void main() {
  test(
    'drawing budgets belong to each part and family, with fresh cache',
    () async {
      final fixture = Directory.systemTemp.createTempSync(
        'catch-drawing-budget-',
      );
      addTearDown(() => fixture.deleteSync(recursive: true));
      Directory('${fixture.path}/.git').createSync();
      final original = File('.dart_tool/package_config.json');
      final config =
          jsonDecode(original.readAsStringSync()) as Map<String, dynamic>;
      for (final row
          in (config['packages'] as List).cast<Map<String, Object?>>()) {
        row['rootUri'] = original.absolute.uri
            .resolve(row['rootUri'] as String)
            .toString();
      }
      final packageConfig = File(
        '${fixture.path}/.dart_tool/package_config.json',
      );
      packageConfig.createSync(recursive: true);
      packageConfig.writeAsStringSync(jsonEncode(config));
      final host = File('${fixture.path}/lib/host.dart');
      host.createSync(recursive: true);
      host.writeAsStringSync(
        "import 'package:flutter/material.dart';\npart 'part.dart';\n",
      );
      final part = File('${fixture.path}/lib/part.dart');
      part.writeAsStringSync(
        "part of 'host.dart';\nWidget probe() => Column(children: [Container(), Container(), const ColoredBox(color: Colors.transparent), const Icon(Icons.close), const Icon(Icons.close)]);\n",
      );
      final baseline = File('${fixture.path}/$drawingMigrationBaseline');
      baseline.createSync(recursive: true);
      void record(int containers) => baseline.writeAsStringSync(
        jsonEncode({
          'version': 2,
          'files': {
            'lib/host.dart': {'Container': 100, 'ColoredBox': 100, 'Icon': 100},
            'lib/part.dart': {'Container': containers, 'Icon': 1},
          },
        }),
      );
      record(1);
      final collection = AnalysisContextCollection(
        includedPaths: [fixture.path],
        sdkPath: analysisDartSdkPath(),
      );
      addTearDown(collection.dispose);
      final result =
          await collection
                  .contextFor(part.path)
                  .currentSession
                  .getResolvedUnit(part.path)
              as ResolvedUnitResult;
      expect(result.diagnostics, isEmpty);
      expect(
        newDrawingMigrationSites(
          result.unit,
          part.path,
        ).map((site) => site.kind),
        ['Container', 'ColoredBox'],
      );
      // Publishing Icon activates only its original allowance, never host quotas.
      expect(
        newDrawingMigrationSites(
          result.unit,
          part.path,
          activeKinds: {...activeDrawingKinds, 'Icon'},
        ).map((site) => site.kind),
        ['Container', 'ColoredBox', 'Icon'],
      );
      record(2);
      baseline.setLastModifiedSync(
        DateTime.now().add(const Duration(seconds: 2)),
      );
      expect(
        newDrawingMigrationSites(result.unit, part.path).single.kind,
        'ColoredBox',
      );
      expect(
        newDrawingMigrationSites(
          result.unit,
          '${fixture.path}/packages/catch_ui/lib/a.dart',
        ),
        isEmpty,
      );
    },
  );

  test(
    'resolved drawing inventory distinguishes SDK identities and layout',
    () async {
      final fixture = Directory.systemTemp.createTempSync(
        'catch-drawing-resolved-',
      );
      addTearDown(() => fixture.deleteSync(recursive: true));
      final configFile = File('.dart_tool/package_config.json');
      final config =
          jsonDecode(configFile.readAsStringSync()) as Map<String, dynamic>;
      for (final row
          in (config['packages'] as List).cast<Map<String, Object?>>()) {
        row['rootUri'] = configFile.absolute.uri
            .resolve(row['rootUri'] as String)
            .toString();
      }
      Directory('${fixture.path}/.dart_tool').createSync();
      File(
        '${fixture.path}/.dart_tool/package_config.json',
      ).writeAsStringSync(jsonEncode(config));
      File('${fixture.path}/pubspec.yaml').writeAsStringSync(
        'name: drawing_migration_fixture\nenvironment:\n  sdk: ^3.12.0\n',
      );
      File('${fixture.path}/fake.dart').writeAsStringSync('''
class Container { const Container(); }
class BorderRadius { const BorderRadius.circular(double radius); }
class Icon { const Icon(); }
class CustomPainter { const CustomPainter(); }
''');
      final path = '${fixture.path}/probe.dart';
      File(path).writeAsStringSync('''
import 'dart:typed_data';
import 'package:flutter/material.dart' as fw;
import 'fake.dart' as app;
typedef Round = fw.BorderRadius;
class FeatureShell extends fw.ColoredBox { const FeatureShell():super(color:const fw.Color(0)); }
class IndirectShell extends FeatureShell { const IndirectShell(); }
typedef DrawBase = fw.CustomPainter;
abstract class FeaturePainter extends DrawBase {}
abstract class FeatureClipper extends fw.CustomClipper<fw.Path> {}
abstract class FeatureDecoration extends fw.Decoration {}
class LocalPainter extends app.CustomPainter {}
List<Object> probe() => [
  fw.Container(decoration: const fw.BoxDecoration()),
  const fw.ColoredBox(color: fw.Color(0)),
  const fw.Opacity(opacity: .5, child: fw.SizedBox()),
  const fw.CustomPaint(),
  fw.Image.memory(Uint8List(0)),
  Round.circular(4),
  const fw.Radius.circular(4),
  const fw.LinearGradient(colors: [fw.Color(0), fw.Color(1)]),
  const fw.Divider(),
  const fw.Icon(fw.Icons.close),
  const fw.Tooltip(message: 'Help', child: fw.SizedBox()),
  const fw.Row(), const fw.Column(), const fw.Stack(),
  const fw.Padding(padding: fw.EdgeInsets.zero),
  const fw.SizedBox(),
  const app.Container(), const app.BorderRadius.circular(4), const app.Icon(),
];
''');
      final collection = AnalysisContextCollection(
        includedPaths: [fixture.path],
        sdkPath: analysisDartSdkPath(),
      );
      addTearDown(collection.dispose);
      final result =
          await collection.contextFor(path).currentSession.getResolvedUnit(path)
              as ResolvedUnitResult;
      expect(result.diagnostics, isEmpty);
      final all = drawingMigrationSites(result.unit, null);
      expect(
        all.map((site) => site.kind),
        unorderedEquals([
          'Container',
          'BoxDecoration',
          'ColoredBox',
          'ColoredBox',
          'Opacity',
          'CustomPaint',
          'CustomPainter',
          'CustomClipper',
          'Decoration',
          'Image',
          'BorderRadius',
          'Radius',
          'LinearGradient',
          'Divider',
          'Icon',
          'Tooltip',
        ]),
      );
      final active = drawingMigrationSites(result.unit, activeDrawingKinds);
      expect(active, hasLength(14));
      expect(
        active.any((site) => unavailableDrawingKinds.contains(site.kind)),
        isFalse,
      );
      expect(
        drawingMigrationSites(result.unit, {'Icon', 'Tooltip'}),
        hasLength(2),
      );
    },
  );
}
