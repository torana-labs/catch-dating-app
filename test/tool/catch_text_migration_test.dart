import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:catch_ui_lints/src/catch_text_migration.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../tool/architecture/check_ui_composition_contracts.dart'
    show analysisDartSdkPath;

void main() {
  test('baseline rejects malformed rows, growth, and new file allowances', () {
    for (final source in [
      '{}',
      '{"version":1,"files":{}}',
      '{"version":3,"files":{}}',
      '{"version":2,"files":{"lib/a.dart":{}}}',
      '{"version":2,"files":{"lib/a.dart":{"supporting":0}}}',
      '{"version":2,"files":{"lib/a.dart":{"supporting":1.5}}}',
      '{"version":2,"files":{"lib/../a.dart":{"supporting":1}}}',
      '{"version":2,"files":{"packages/catch_ui/lib/a.dart":{"supporting":1}}}',
    ]) {
      expect(() => parseTextMigrationBaseline(source), throwsFormatException);
    }
    const budget = {
      'lib/a.dart': {'supporting': 2},
    };
    expect(
      textMigrationGrowth({
        'lib/a.dart': {'supporting': 2},
      }, budget),
      isEmpty,
    );
    expect(
      textMigrationGrowth({
        'lib/a.dart': {'supporting': 1},
      }, budget),
      isEmpty,
    );
    expect(textMigrationGrowth({}, budget), isEmpty);
    expect(
      textMigrationGrowth({
        'lib/a.dart': {'supporting': 3},
      }, budget),
      hasLength(1),
    );
    expect(
      textMigrationGrowth({
        'lib/new.dart': {'supporting': 1},
      }, budget),
      hasLength(1),
    );
    expect(
      textMigrationGrowth({
        'lib/a.dart': {'bodyL': 2},
      }, budget),
      hasLength(1),
    );
  });

  test('new variants activate only original legacy role allowances', () {
    const initial = {
      'lib/a.dart': {'supporting': 2, 'bodyM': 1},
    };
    expect(
      textMigrationPrunedCounts(initial, initial, {'supporting'}),
      initial,
    );
    final activated = textMigrationPrunedCounts(initial, initial, {
      'supporting',
      'bodyM',
    });
    expect(textMigrationGrowth(activated, initial), isEmpty);
    const later = {
      'lib/a.dart': {'supporting': 2, 'bodyM': 2, 'labelM': 1},
    };
    expect(textMigrationPrunedCounts(later, initial, {'supporting'}), initial);
    expect(
      textMigrationGrowth(
        textMigrationPrunedCounts(later, initial, {'supporting', 'bodyM'}),
        initial,
      ),
      hasLength(1),
    );
    expect(
      textMigrationPrunedCounts(
        {
          'lib/a.dart': {'supporting': 1},
        },
        initial,
        {'supporting'},
      ),
      {
        'lib/a.dart': {'supporting': 1},
      },
    );
  });

  test(
    'scope includes shared code and both apps, with narrow generated exclusions',
    () {
      for (final file in [
        'lib/core/widgets/text.dart',
        'lib/shared/text.dart',
        'lib/generated/authored.dart',
        'apps/consumer/lib/text.dart',
        'apps/host/lib/text.dart',
        'tool/catch_ui_lints_probe/run.x/lib/probe.dart',
      ]) {
        expect(textMigrationScope(file), isTrue, reason: file);
      }
      for (final file in [
        'packages/catch_ui/lib/text.dart',
        'widgetbook/lib/text.dart',
        'lib/a.g.dart',
        'lib/a.freezed.dart',
        'lib/core/theme/a.dart',
        'lib/l10n/generated/a.dart',
      ]) {
        expect(textMigrationScope(file), isFalse, reason: file);
      }
    },
  );

  test(
    'resolved scan identifies canonical calls and preserves unsupported semantics',
    () async {
      final root = Directory.current.path;
      final fixture = Directory.systemTemp.createTempSync(
        'catch-text-resolved-',
      );
      addTearDown(() => fixture.deleteSync(recursive: true));
      final original = File('$root/.dart_tool/package_config.json');
      final config =
          jsonDecode(original.readAsStringSync()) as Map<String, dynamic>;
      final packages = config['packages'] as List<Object?>;
      for (final row in packages.cast<Map<String, Object?>>()) {
        row['rootUri'] = original.uri
            .resolve(row['rootUri'] as String)
            .toString();
      }
      Directory('${fixture.path}/.dart_tool').createSync();
      File(
        '${fixture.path}/.dart_tool/package_config.json',
      ).writeAsStringSync(jsonEncode(config));
      File('${fixture.path}/pubspec.yaml').writeAsStringSync(
        'name: text_migration_fixture\nenvironment:\n  sdk: ^3.12.0\n',
      );
      final path = '${fixture.path}/probe.dart';
      File(path).writeAsStringSync('''
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart' as fw;

Widget probe(BuildContext context, dynamic data, int? nullableLines) => Column(children: [
  Text('plain', style: CatchTextStyles.supporting(context)),
  fw.Text('clamped', maxLines: 1, overflow: TextOverflow.ellipsis,
    style: CatchTextStyles.sectionTitle(context)),
  Text('aligned', textAlign: TextAlign.center, style: CatchTextStyles.titleL(context)),
  Text('semantic', semanticsLabel: 'Label', style: CatchTextStyles.supporting(context)),
  Text('clipped', maxLines: 1, style: CatchTextStyles.supporting(context)),
  Text('modified', style: CatchTextStyles.supporting(context).copyWith(color: null)),
  Text('uncovered', style: CatchTextStyles.mono(context)),
  Text(data, style: CatchTextStyles.supporting(context)),
  Text('nullable clamp', maxLines: nullableLines, overflow: TextOverflow.ellipsis,
    style: CatchTextStyles.supporting(context)),
  const CatchText('library', variant: CatchTextVariant.supporting),
]);
''');
      // Parts own their budgets; a larger defining-library budget cannot hide
      // a new call in one part (the analyzer registers rules per library).
      Directory('${fixture.path}/.git').createSync();
      final variants = File(
        '${fixture.path}/packages/catch_ui/lib/src/primitives/catch_text_variant.dart',
      );
      variants.createSync(recursive: true);
      variants.writeAsStringSync(
        'enum CatchTextVariant { supporting, titleL; }',
      );
      final baseline = File('${fixture.path}/$textMigrationBaseline');
      baseline.createSync(recursive: true);
      baseline.writeAsStringSync(
        jsonEncode({
          'version': 2,
          'files': {
            'lib/host.dart': {'supporting': 100, 'titleL': 100, 'bodyM': 100},
            'lib/parts.dart': {'supporting': 1, 'bodyM': 1},
          },
        }),
      );
      Directory('${fixture.path}/lib').createSync();
      File('${fixture.path}/lib/host.dart').writeAsStringSync(
        "import 'package:catch_ui/catch_ui.dart';\nimport 'package:flutter/material.dart';\npart 'parts.dart';\n",
      );
      final partPath = '${fixture.path}/lib/parts.dart';
      File(partPath).writeAsStringSync(
        "part of 'host.dart';\nWidget partText(BuildContext context) => Column(children: [Text('existing', style: CatchTextStyles.supporting(context)), Text('new', style: CatchTextStyles.titleL(context)), Text('existing body', style: CatchTextStyles.bodyM(context)), Text('later body', style: CatchTextStyles.bodyM(context))]);\n",
      );
      final collection = AnalysisContextCollection(
        includedPaths: [fixture.path],
        sdkPath: analysisDartSdkPath(),
      );
      addTearDown(collection.dispose);
      final unit =
          await collection.contextFor(path).currentSession.getResolvedUnit(path)
              as ResolvedUnitResult;
      expect(unit.diagnostics, isEmpty);
      final sites = textMigrationSites(unit.unit, textMigrationVariants(root));
      expect(sites.map((site) => site.role), [
        'supporting',
        'sectionTitle',
        'titleL',
        'supporting',
      ]);
      expect(
        sites.map((site) => site.node.argumentList.arguments.first.toSource()),
        ["'plain'", "'clamped'", "'aligned'", 'data'],
      );
      final part =
          await collection
                  .contextFor(partPath)
                  .currentSession
                  .getResolvedUnit(partPath)
              as ResolvedUnitResult;
      expect(part.diagnostics, isEmpty);
      expect(newTextMigrationSites(part.unit, partPath).single.role, 'titleL');
      // Publishing a role activates its original allowance, not another role's
      // quota. A later unsupported call acquires no extra reservation.
      final enumSource = variants.readAsStringSync();
      expect(enumSource, contains('titleL;'));
      variants.writeAsStringSync(
        enumSource.replaceFirst('titleL;', 'titleL, bodyM;'),
      );
      variants.setLastModifiedSync(
        DateTime.now().add(const Duration(seconds: 1)),
      );
      expect(
        newTextMigrationSites(part.unit, partPath).map((site) => site.role),
        ['titleL', 'bodyM'],
      );
    },
  );
}
