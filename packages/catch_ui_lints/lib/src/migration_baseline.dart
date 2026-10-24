import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/error/error.dart';

typedef MigrationCounts = Map<String, Map<String, int>>;

bool migrationScope(String relative) =>
    (relative.startsWith('lib/') ||
        RegExp(r'^apps/[^/]+/lib/').hasMatch(relative) ||
        relative.startsWith('tool/catch_ui_lints_probe/')) &&
    !relative.startsWith('lib/core/theme/') &&
    !relative.startsWith('lib/core/schema_contracts/generated/') &&
    !relative.startsWith('lib/l10n/generated/') &&
    !relative.endsWith('.g.dart') &&
    !relative.endsWith('.freezed.dart');

MigrationCounts parseMigrationBaseline(String source, {required String label}) {
  final json = jsonDecode(source);
  if (json is! Map || json['version'] != 2 || json['files'] is! Map) {
    throw FormatException('Invalid $label migration baseline');
  }
  final counts = <String, Map<String, int>>{};
  for (final entry in (json['files'] as Map).entries) {
    if (entry.key is! String ||
        !migrationScope(entry.key as String) ||
        (entry.key as String).split('/').contains('..') ||
        entry.value is! Map ||
        (entry.value as Map).isEmpty) {
      throw FormatException('Invalid $label migration baseline row');
    }
    final kinds = <String, int>{};
    for (final kind in (entry.value as Map).entries) {
      if (kind.key is! String ||
          !RegExp(r'^[A-Za-z][A-Za-z0-9]*$').hasMatch(kind.key as String) ||
          kind.value is! int ||
          (kind.value as int) <= 0) {
        throw FormatException('Invalid $label migration kind budget');
      }
      kinds[kind.key as String] = kind.value as int;
    }
    counts[entry.key as String] = kinds;
  }
  return counts;
}

List<String> migrationGrowth(
  MigrationCounts actual,
  MigrationCounts budget,
) => [
  for (final entry in actual.entries)
    for (final kind in entry.value.entries)
      if (kind.value > (budget[entry.key]?[kind.key] ?? 0))
        '${entry.key}:${kind.key}: ${kind.value} exceeds ${budget[entry.key]?[kind.key] ?? 0}',
];

/// Dormant kinds can retain their original counts, but never reserve new debt.
MigrationCounts migrationPrunedCounts(
  MigrationCounts actual,
  MigrationCounts? recorded,
  Set<String> active,
) => {
  for (final file in actual.entries)
    if (file.value.entries.any(
      (kind) =>
          active.contains(kind.key) ||
          recorded == null ||
          (recorded[file.key]?[kind.key] ?? 0) > 0,
    ))
      file.key: {
        for (final kind in file.value.entries)
          if (active.contains(kind.key) ||
              recorded == null ||
              (recorded[file.key]?[kind.key] ?? 0) > 0)
            kind.key: active.contains(kind.key) || recorded == null
                ? kind.value
                : kind.value < recorded[file.key]![kind.key]!
                ? kind.value
                : recorded[file.key]![kind.key]!,
      },
};

String? migrationRepositoryRoot(String path) {
  var directory = File(path).parent;
  while (directory.parent.path != directory.path) {
    if (File('${directory.path}/.git').existsSync() ||
        Directory('${directory.path}/.git').existsSync()) {
      return directory.path;
    }
    directory = directory.parent;
  }
  return null;
}

/// Shared resolved census/history protocol for existing lint-drift modes.
Future<void> runMigrationBaseline(
  List<String> args, {
  required String label,
  required String baselinePath,
  required String optionName,
  required Set<String> Function(String root) activeKinds,
  required Iterable<String> Function(CompilationUnit unit) kindsInUnit,
  required List<String> initialSources,
  bool recordActiveKinds = false,
  String countedUnit = 'calls',
}) async {
  try {
    if (args.length != 1 || !{'--check', '--update'}.contains(args.single)) {
      throw ArgumentError(
        'Use the lint-drift wrapper: --check-$optionName-baseline or --update-$optionName-baseline',
      );
    }
    final root = Directory.current.path;
    ProcessResult git(List<String> arguments) {
      final result = Process.runSync('git', arguments, workingDirectory: root);
      if (result.exitCode != 0) {
        throw StateError('git ${arguments.first} failed: ${result.stderr}');
      }
      return result;
    }

    final base = (git(['merge-base', 'origin/main', 'HEAD']).stdout as String)
        .trim();
    final hasBase =
        (git(['ls-tree', '--name-only', base, baselinePath]).stdout as String)
            .trim()
            .isNotEmpty;
    MigrationCounts parse(String source) =>
        parseMigrationBaseline(source, label: label);
    final previous = hasBase
        ? parse(git(['show', '$base:$baselinePath']).stdout as String)
        : null;
    final baseline = File('$root/$baselinePath');
    final recordedSource = baseline.existsSync()
        ? baseline.readAsStringSync()
        : null;
    final recorded = recordedSource == null ? null : parse(recordedSource);
    if (args.single == '--check' && recorded == null) {
      throw StateError('Missing $label migration baseline');
    }
    // A local initial record cannot conceal later app changes before adoption.
    if (previous == null) {
      final changed =
          git(['diff', '--name-only', base, '--', ...initialSources]).stdout
              as String;
      if (changed.trim().isNotEmpty) {
        throw StateError(
          'Initial $label reservations require unchanged app/library source at the merge base',
        );
      }
    }
    final files =
        (git(['ls-files', '-z', '--', 'lib', 'apps']).stdout as String)
            .split('\u0000')
            .where((path) => path.endsWith('.dart') && migrationScope(path))
            .toList()
          ..sort();
    if (files.isEmpty) throw StateError('$label scan has no source files');
    final active = activeKinds(root);
    if (active.isEmpty) throw StateError('$label has no active kinds');
    final counts = <String, Map<String, int>>{};
    final collection = AnalysisContextCollection(
      includedPaths: [root, '$root/apps/consumer', '$root/apps/host'],
    );
    try {
      for (final file in files) {
        final path = '$root/$file';
        final unit = await collection
            .contextFor(path)
            .currentSession
            .getResolvedUnit(path);
        if (unit is! ResolvedUnitResult ||
            unit.diagnostics.any(
              (error) =>
                  error.diagnosticCode.severity == DiagnosticSeverity.ERROR,
            )) {
          throw StateError('Incomplete resolved $label scan: $file');
        }
        final kinds = <String, int>{};
        for (final kind in kindsInUnit(unit.unit)) {
          kinds.update(kind, (count) => count + 1, ifAbsent: () => 1);
        }
        if (kinds.isNotEmpty) {
          counts[file] = Map.fromEntries(
            kinds.entries.toList()..sort((a, b) => a.key.compareTo(b.key)),
          );
        }
      }
    } finally {
      await collection.dispose();
    }

    final checking = args.single == '--check';
    final current = migrationPrunedCounts(counts, recorded, active);
    final proposed = checking ? recorded! : current;
    final growth = [
      if (previous != null) ...migrationGrowth(proposed, previous),
      if (!checking && recorded != null) ...migrationGrowth(proposed, recorded),
    ];
    if (growth.isNotEmpty) {
      throw StateError(
        '$label baseline may only shrink:\n${growth.join('\n')}',
      );
    }
    final differences = [
      for (final file in {...current.keys, ...?recorded?.keys})
        for (final kind in {...?current[file]?.keys, ...?recorded?[file]?.keys})
          if ((current[file]?[kind] ?? 0) != (recorded?[file]?[kind] ?? 0))
            '$file:$kind: recorded ${recorded?[file]?[kind] ?? 0}, actual ${current[file]?[kind] ?? 0}',
    ];
    final activeList = active.toList()..sort();
    if (recordActiveKinds &&
        checking &&
        jsonEncode((jsonDecode(recordedSource!) as Map)['activeKinds']) !=
            jsonEncode(activeList)) {
      differences.add('Active drawing families differ from the rule');
    }
    if (checking && differences.isNotEmpty) {
      throw StateError(
        '$label baseline is stale:\n${differences.join('\n')}\nRun bash tool/check_catch_ui_lint_drift.sh --update-$optionName-baseline',
      );
    }
    if (!checking) {
      baseline.writeAsStringSync(
        '${const JsonEncoder.withIndent('  ').convert({'version': 2, 'owner': 'app_architecture', 'targetPhase': 'docs/plans/ui_system_blueprint_and_conformance_audit.md#phase-7--cross-framework-conformance-react', if (recordActiveKinds) 'activeKinds': activeList, 'files': current})}\n',
      );
    }
    final enabled = current.values
        .expand((kinds) => kinds.entries)
        .where((kind) => active.contains(kind.key))
        .fold(0, (sum, kind) => sum + kind.value);
    final total = current.values
        .expand((kinds) => kinds.values)
        .fold(0, (sum, count) => sum + count);
    stdout.writeln(
      '$label migration baseline ${checking ? 'passed' : 'updated'}: $enabled covered $countedUnit, ${total - enabled} reserved legacy $countedUnit in ${current.length} files (${files.length} resolved files).',
    );
  } catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
