import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:catch_ui_lints/src/catch_text_migration.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../tool/architecture/check_ui_composition_contracts.dart'
    show analysisDartSdkPath;

void main() {
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
        'lib/platform/theme/a.dart',
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

Widget themeProbe(BuildContext context, TextTheme suppliedTheme, TextStyle suppliedStyle) {
  final textTheme = fw.Theme.of(context).textTheme;
  final metadataStyle = CatchTextStyles.supporting(context, color: Colors.red);
  var mutableTheme = fw.Theme.of(context).textTheme;
  return Column(children: [
    Text('headline slot', style: fw.Theme.of(context).textTheme.headlineSmall),
    Text('title large slot', style: fw.Theme.of(context).textTheme.titleLarge),
    Text('title medium slot', style: fw.Theme.of(context).textTheme.titleMedium),
    Text('title small slot', style: fw.Theme.of(context).textTheme.titleSmall),
    Text('body medium slot', style: fw.Theme.of(context).textTheme.bodyMedium),
    Text('body small slot', style: fw.Theme.of(context).textTheme.bodySmall),
    Text('label medium slot', style: fw.Theme.of(context).textTheme.labelMedium),
    Text('theme alias color', style: textTheme.bodySmall?.copyWith(color: Colors.red)),
    Text('style alias color', style: metadataStyle),
    Text('public theme', style: suppliedTheme.titleMedium),
    Text('public style', style: suppliedStyle),
    Text('mutable alias', style: mutableTheme.bodySmall),
    Text('unsupported theme slot', style: fw.Theme.of(context).textTheme.displayLarge),
    Text('modified theme metrics', style: textTheme.bodySmall?.copyWith(fontSize: 99)),
    Text('semantic theme', semanticsLabel: 'label', style: textTheme.bodySmall),
    Text('foreign theme', style: OtherTheme.of(context).textTheme.bodySmall),
  ]);
}

abstract final class OtherTheme {
  static ThemeData of(BuildContext context) => fw.Theme.of(context);
}
''');
      // A part is read on its own: the analyzer registers rules per library.
      Directory('${fixture.path}/.git').createSync();
      final variants = File(
        '${fixture.path}/packages/catch_ui/lib/src/primitives/catch_text_variant.dart',
      );
      variants.createSync(recursive: true);
      variants.writeAsStringSync(
        'enum CatchTextVariant { supporting, titleL; }',
      );
      Directory('${fixture.path}/lib').createSync();
      File('${fixture.path}/lib/host.dart').writeAsStringSync(
        "import 'package:catch_ui/catch_ui.dart';\nimport 'package:flutter/material.dart';\npart 'parts.dart';\n",
      );
      final partPath = '${fixture.path}/lib/parts.dart';
      File(partPath).writeAsStringSync(
        "part of 'host.dart';\nWidget partText(BuildContext context) => Column(children: [Text('covered', style: CatchTextStyles.supporting(context)), Text('covered', style: CatchTextStyles.titleL(context)), Text('no variant yet', style: CatchTextStyles.bodyM(context))]);\n",
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
        'titleL',
        'titleL',
        'sectionTitle',
        'supportingStrong',
        'bodyM',
        'bodyS',
        'statusLabel',
        'bodyS',
        'supporting',
      ]);
      expect(
        sites.map((site) => site.node.argumentList.arguments.first.toSource()),
        [
          "'plain'",
          "'clamped'",
          "'aligned'",
          'data',
          "'headline slot'",
          "'title large slot'",
          "'title medium slot'",
          "'title small slot'",
          "'body medium slot'",
          "'body small slot'",
          "'label medium slot'",
          "'theme alias color'",
          "'style alias color'",
        ],
      );
      final part =
          await collection
                  .contextFor(partPath)
                  .currentSession
                  .getResolvedUnit(partPath)
              as ResolvedUnitResult;
      expect(part.diagnostics, isEmpty);
      expect(
        newTextMigrationSites(part.unit, partPath).map((site) => site.role),
        ['supporting', 'titleL'],
      );
      // A new variant makes its existing calls report; nothing reserves them.
      variants.writeAsStringSync(
        'enum CatchTextVariant { supporting, titleL, bodyM; }',
      );
      variants.setLastModifiedSync(
        DateTime.now().add(const Duration(seconds: 2)),
      );
      expect(
        newTextMigrationSites(part.unit, partPath).map((site) => site.role),
        ['supporting', 'titleL', 'bodyM'],
      );
    },
  );
}
