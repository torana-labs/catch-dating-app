// ignore_for_file: avoid_relative_lib_imports

import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';

import '../lib/src/fingerprint_extractor.dart';

void main() {
  final repoRoot = _findRepoRoot(Directory.current).path;
  final fixtureFiles = [
    'tool/widget_dedupe/fixtures/probe_dupe_a.dart',
    'tool/widget_dedupe/fixtures/probe_dupe_b.dart',
    'tool/widget_dedupe/fixtures/probe_near_c.dart',
    'tool/widget_dedupe/fixtures/probe_distinct.dart',
    'tool/widget_dedupe/fixtures/probe_alpha_status_pill.dart',
    'tool/widget_dedupe/fixtures/probe_beta_status_pill.dart',
    'tool/widget_dedupe/fixtures/probe_parameter_shapes.dart',
  ];

  test('seeded structural probes produce expected fingerprints', () {
    final result = extractFingerprints(
      repoRoot: repoRoot,
      files: fixtureFiles,
      generatedAt: DateTime.utc(2026, 7, 2),
    );
    expect(result['failures'], isEmpty);
    expect(result['version'], 2);
    expect(result['tokenClassSources'], [
      'packages/catch_tokens/lib',
      'packages/catch_ui/lib/src/foundations',
      'lib/platform/theme',
    ]);
    expect(
      result['tokenClasses'],
      containsAll([
        'CatchSpacing',
        'CatchTokens',
        'CatchWelcomeTokens',
        'CatchTextStyles',
      ]),
    );
    final widgets = {
      for (final widget in result['widgets'] as List<Object?>)
        (widget as Map<String, Object?>)['name'] as String: widget,
    };

    expect(
      widgets['ProbeDupeA']!['shapeHash'],
      widgets['ProbeDupeB']!['shapeHash'],
    );
    expect(
      widgets['ProbeDupeA']!['shapeHash'],
      isNot(widgets['ProbeNearC']!['shapeHash']),
    );
    expect(
      widgets['ProbeDupeA']!['shapeHash'],
      isNot(widgets['ProbeDistinct']!['shapeHash']),
    );
    expect(widgets['ProbeDupeA']!['tokensUsed'], contains('CatchSpacing.s4'));
    expect(widgets['ProbeParameterShapes']!['constructorParams'], [
      {'name': 'label', 'type': 'String', 'required': false},
      {'name': 'onTap', 'type': 'void', 'required': true},
      {'name': 'enabled', 'type': 'bool', 'required': false},
    ]);
  });

  test('coarse stream sorts args and coarsens token members', () {
    final result = extractFingerprints(
      repoRoot: repoRoot,
      files: [
        'tool/widget_dedupe/fixtures/probe_alpha_status_pill.dart',
        'tool/widget_dedupe/fixtures/probe_beta_status_pill.dart',
      ],
      generatedAt: DateTime.utc(2026, 7, 2),
    );
    expect(result['failures'], isEmpty);
    final widgets = {
      for (final widget in result['widgets'] as List<Object?>)
        (widget as Map<String, Object?>)['name'] as String: widget,
    };

    expect(
      widgets['ProbeAlphaStatusPill']!['shapeHash'],
      isNot(widgets['ProbeBetaStatusPill']!['shapeHash']),
    );
    expect(
      widgets['ProbeAlphaStatusPill']!['coarseShapeHash'],
      widgets['ProbeBetaStatusPill']!['coarseShapeHash'],
    );
    expect(
      widgets['ProbeAlphaStatusPill']!['coarseTokenStream'],
      contains('T:CatchSpacing'),
    );
    expect(
      widgets['ProbeAlphaStatusPill']!['coarseTokenStream'],
      isNot(contains('T:CatchSpacing.s2')),
    );
  });

  test('state class methods are folded into owning widget fingerprints', () {
    final result = extractFingerprints(
      repoRoot: repoRoot,
      files: ['packages/catch_ui/lib/src/components/catch_button.dart'],
      generatedAt: DateTime.utc(2026, 7, 2),
    );
    expect(result['failures'], isEmpty);
    final catchButton = (result['widgets'] as List<Object?>)
        .cast<Map<String, Object?>>()
        .singleWhere((widget) => widget['name'] == 'CatchButton');

    expect(catchButton['stateClass'], '_CatchButtonState');
    expect(catchButton['tokenStreamLength'] as int, greaterThan(20));
  });

  test('widget-returning helpers are folded into the owning fingerprint', () {
    final result = extractFingerprints(
      repoRoot: repoRoot,
      files: ['tool/widget_dedupe/fixtures/probe_stateful_helper.dart'],
      generatedAt: DateTime.utc(2026, 7, 2),
    );
    expect(result['failures'], isEmpty);
    final widget = (result['widgets'] as List<Object?>)
        .cast<Map<String, Object?>>()
        .singleWhere((entry) => entry['name'] == 'ProbeStatefulHelper');

    expect(widget['stateClass'], '_ProbeStatefulHelperState');
    expect(widget['hasWidgetHelpers'], isTrue);
    expect(widget['widgetsUsed'], contains('SizedBox'));
  });

  test('explicit classification drives targets and preserves metadata', () {
    final tempDirectory = Directory.systemTemp.createTempSync(
      'catch-widget-classification-',
    );
    addTearDown(() => tempDirectory.deleteSync(recursive: true));
    final classification =
        File('${tempDirectory.path}/widget_classification.json')
          ..writeAsStringSync(
            jsonEncode({
              'widgets': [
                {
                  'name': 'ProbeDupeA',
                  'file': 'tool/widget_dedupe/fixtures/probe_dupe_a.dart',
                  'classKind': 'widget',
                  'role': 'pattern',
                  'contractId': 'probe.dupe',
                },
              ],
            }),
          );

    final result = extractFingerprints(
      repoRoot: repoRoot,
      classificationPath: classification.path,
      generatedAt: DateTime.utc(2026, 7, 2),
    );

    expect(result['failures'], isEmpty);
    final widget = (result['widgets'] as List<Object?>)
        .cast<Map<String, Object?>>()
        .single;
    expect(widget['role'], 'pattern');
    expect(widget['contractId'], 'probe.dupe');
  });

  test('classification is required when no explicit files are supplied', () {
    expect(
      () => extractFingerprints(
        repoRoot: repoRoot,
        generatedAt: DateTime.utc(2026, 7, 2),
      ),
      throwsA(
        isA<ArgumentError>().having(
          (error) => error.message,
          'message',
          contains('classificationPath is required'),
        ),
      ),
    );
  });

  test('retirement CLI discovers multiple tracked and untracked Dart files', () {
    final temporary = Directory.systemTemp.createTempSync(
      'catch-retirement-cli-',
    );
    addTearDown(() => temporary.deleteSync(recursive: true));
    Directory('${temporary.path}/lib').createSync();
    Directory('${temporary.path}/tool').createSync();
    File('${temporary.path}/pubspec.yaml').writeAsStringSync('name: probe');
    File(
      '${temporary.path}/lib/a.dart',
    ).writeAsStringSync('class A extends StatelessWidget {}');
    expect(
      Process.runSync('git', [
        'init',
        '-q',
      ], workingDirectory: temporary.path).exitCode,
      0,
    );
    expect(
      Process.runSync('git', [
        'add',
        'lib/a.dart',
      ], workingDirectory: temporary.path).exitCode,
      0,
    );
    File(
      '${temporary.path}/lib/b.dart',
    ).writeAsStringSync('void main() { A(); }');
    final result = Process.runSync(Platform.resolvedExecutable, [
      '--packages=$repoRoot/tool/widget_dedupe/.dart_tool/package_config.json',
      '$repoRoot/tool/widget_dedupe/bin/extract_fingerprints.dart',
      '--retirement',
    ], workingDirectory: temporary.path);
    expect(result.exitCode, 0, reason: result.stderr.toString());
    final report = jsonDecode(result.stdout as String) as Map;
    expect(report['coverage']['files'], 2);
    expect(report['candidates'], isEmpty);
  });

  group('retirement reference analysis', () {
    Set<String> candidates(Map<String, String> sources) =>
        (analyzeRetirementSources(sources)['candidates'] as List)
            .map((row) => row['name'] as String)
            .toSet();

    test('preview and test uses do not mask a dead widget or its dependents', () {
      final report = analyzeRetirementSources({
        'lib/dead.dart':
            'class Dead extends ConsumerStatefulWidget { createState() => DeadState(); } '
            'class DeadState extends ConsumerState<Dead> { build(c) => Child(); } '
            'class Child extends StatelessWidget {}',
        'widgetbook/main.dart': 'void main() { Dead(); }',
        'test/dead_test.dart': 'void main() { Dead(); }',
      });
      final rows = report['candidates'] as List;
      expect(rows.map((row) => row['name']), ['Dead', 'Child']);
      expect(rows.map((row) => row['layer']), [0, 1]);
      expect(rows.first['references'], hasLength(2));
    });

    test(
      'same-file calls, generated calls and interpolations retain widgets',
      () {
        expect(
          candidates({
            'lib/widgets.dart':
                'class Local extends StatelessWidget {} '
                'class GeneratedUse extends StatelessWidget {} '
                'class Interpolated extends StatelessWidget {} '
                'void main() { Local(); print("value: \${Interpolated()}"); }',
            'lib/calls.g.dart':
                '// GENERATED CODE - DO NOT MODIFY BY HAND\n'
                'void generated({required final String name}) { GeneratedUse(); }',
          }),
          isEmpty,
        );
      },
    );

    test(
      'comments and plain strings are not callers; annotations are disclosed',
      () {
        final report = analyzeRetirementSources({
          'lib/a.dart':
              'class Dead extends StatelessWidget {} '
              '// Dead()\n'
              '@Catalog(Dead) void f() { print("Dead"); }',
        });
        final rows = report['candidates'] as List;
        expect(rows.single['name'], 'Dead');
        expect(rows.single['annotationReferences'], hasLength(1));
      },
    );

    test('private names respect Dart parts and unrelated libraries', () {
      expect(
        candidates({
          'lib/a.dart':
              "part 'a_part.dart'; class _Used extends StatelessWidget {}",
          'lib/a_part.dart': "part of 'a.dart'; void main() { _Used(); }",
          'lib/b.dart': 'class _Dead extends StatelessWidget {}',
          'lib/c.dart': 'void main() { _Dead(); }',
        }),
        {'_Dead'},
      );
    });

    test(
      'ambiguous names, entry points and cycles are conservatively retained',
      () {
        expect(
          candidates({
            'lib/a.dart':
                'class Shared extends StatelessWidget {} '
                '@pragma("vm:entry-point") class Entry extends StatelessWidget {} '
                'class A extends StatelessWidget { build(c) => B(); } '
                'class B extends StatelessWidget { build(c) => A(); }',
            'lib/b.dart': 'class Shared extends StatelessWidget {}',
          }),
          isEmpty,
        );
      },
    );

    test('incomplete parsing or missing parts suppresses all candidates', () {
      for (final invalid in ['class Broken {', "part 'missing.dart';"]) {
        final report = analyzeRetirementSources({
          'lib/dead.dart': 'class Dead extends StatelessWidget {}',
          'lib/broken.dart': invalid,
        });
        expect(report['failures'], isNotEmpty);
        expect(report['candidates'], isEmpty);
      }
    });

    test(
      'non-widget symbols are a separate review queue and main is retained',
      () {
        final report = analyzeRetirementSources({
          'lib/a.dart':
              'void main() { used(); } void used() {} void unused() {} '
              'class Model { factory Model.fromJson(json) => Model(); }',
          'lib/a.g.dart':
              '// GENERATED CODE\nvoid decode() { Model.fromJson({}); }',
        });
        expect(report['candidates'], isEmpty);
        expect(
          (report['unreferencedDeclarations'] as List).map(
            (row) => row['name'],
          ),
          ['unused'],
        );
      },
    );

    test(
      'source digest changes for dirty content and is independent of map order',
      () {
        const a = 'class A extends StatelessWidget {}';
        const b = 'class B extends StatelessWidget {}';
        Object? digest(Map<String, String> sources) =>
            (analyzeRetirementSources(sources)['coverage']
                as Map)['sourceDigest'];
        expect(
          digest({'lib/a.dart': a, 'lib/b.dart': b}),
          digest({'lib/b.dart': b, 'lib/a.dart': a}),
        );
        expect(
          digest({'lib/a.dart': a}),
          isNot(digest({'lib/a.dart': '$a // dirty'})),
        );
      },
    );
  });
}

Directory _findRepoRoot(Directory start) {
  var current = start.absolute;
  while (true) {
    if (File('${current.path}/AGENTS.md').existsSync() &&
        Directory('${current.path}/tool/widget_dedupe').existsSync()) {
      return current;
    }
    final parent = current.parent;
    if (parent.path == current.path) {
      throw StateError(
        'Could not find the Catch repository root from ${start.path}.',
      );
    }
    current = parent;
  }
}
