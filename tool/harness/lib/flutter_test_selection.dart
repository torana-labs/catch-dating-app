import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

bool _testFile(String name) =>
    name.startsWith('test/') &&
    name.endsWith('_test.dart') &&
    !name.startsWith('test/goldens/') &&
    !name.startsWith('test/integration/');

const _componentGraph = 'tool/harness/component_graph.json';

const _uiProbeScript = 'tool/check_catch_ui_lints.sh';
const _generatedProbe =
    'packages/catch_ui_lints/probes/catch_ui_lint_probes.dart';

/// Tests of the lint engine depend on its probe APIs, not every screen that
/// uses those APIs. Product diagnostics still run on every selected Flutter CI.
bool needsUiLintSmoke({
  required Map<String, String> before,
  required Map<String, String> after,
  required Set<String> changed,
  bool full = false,
  Set<String> ordinaryDocuments = const {},
}) {
  final sourceChanges = changed.difference(ordinaryDocuments);
  if (full ||
      sourceChanges.isEmpty ||
      sourceChanges.any(
        (name) =>
            !name.endsWith('.dart') ||
            !(name.startsWith('lib/') || name.startsWith('test/')),
      )) {
    return true;
  }
  try {
    for (final tree in [before, after]) {
      final script = tree[_uiProbeScript];
      if (script == null || !tree.containsKey(_generatedProbe)) return true;
      final corpora = RegExp(
        "<<'DART'\\n([\\s\\S]*?)\\nDART",
        multiLine: true,
      ).allMatches(script).map((match) => match.group(1)!).toList();
      if (corpora.isEmpty) return true;
      final graph = _Imports({...tree});
      final inputs = graph.closure(_generatedProbe);
      for (var index = 0; index < corpora.length; index++) {
        final name = 'tool/ui_probe_$index.dart';
        graph.files[name] = corpora[index];
        inputs.addAll(graph.closure(name));
      }
      if (inputs.any(sourceChanges.contains)) return true;
    }
    return false;
  } on Object {
    return true;
  }
}

/// Only narrows root unit/widget tests. Native, package, golden, integration,
/// analysis and contract gates retain their independent owners.
Map<String, Object> selectFlutterTests({
  required Map<String, String> before,
  required Map<String, String> after,
  required Set<String> changed,
  bool full = false,
  Set<String> ordinaryDocuments = const {},
}) {
  final all = after.keys.where(_testFile).toList()..sort();
  if (all.isEmpty) throw StateError('No root Flutter tests exist.');
  Map<String, Object> result(List<String> files, String reason) => {
    'mode': files.length == all.length ? 'full' : 'affected',
    'reason': reason,
    'totalTests': all.length,
    'selectedTests': files.length,
    'files': files,
  };
  final sourceChanges = changed.difference(ordinaryDocuments);
  if (full || sourceChanges.isEmpty) {
    return result(all, 'Full validation or no usable change window');
  }
  // Package resolution, toolchain, generated localizations, runner
  // configuration and bundled assets reach every test without an import.
  final global =
      sourceChanges
          .where(
            (name) =>
                _globalTestInput(name) ||
                _possiblyBundled(name, before) ||
                _possiblyBundled(name, after),
          )
          .toList()
        ..sort();
  if (global.isNotEmpty) {
    return result(
      all,
      'Toolchain, package, localization, runner or bundled asset input changed: ${global.join(', ')}',
    );
  }
  try {
    final oldGraph = _Imports(before);
    final newGraph = _Imports(after);
    final selected = <String>[];
    final coveredChanges = <String>{
      // Removed test files cannot execute at head. Their deletion does not
      // establish coverage for any changed production source.
      for (final name in sourceChanges)
        if (_testFile(name) &&
            before.containsKey(name) &&
            !after.containsKey(name))
          name,
      // Outside the root package and its bundle, a test can only read these
      // from disk. Every such reader is a retained filesystem probe below.
      ...sourceChanges.where(_probeOnlyInput),
    };
    for (final test in all) {
      final current = newGraph.testClosure(test);
      final previous = before.containsKey(test)
          ? oldGraph.testClosure(test)
          : <String>{};
      final impactedChanges = {
        ...current,
        ...previous,
      }.intersection(sourceChanges);
      coveredChanges.addAll(impactedChanges);
      final impacted = !before.containsKey(test) || impactedChanges.isNotEmpty;
      if (impacted ||
          current.contains(_Imports.fileSystemProbe) ||
          previous.contains(_Imports.fileSystemProbe)) {
        selected.add(test);
      }
    }
    // An untested source or an unsupported relationship must not turn the
    // required test gate into a green no-op.
    final uncovered = sourceChanges.difference(coveredChanges).toList()..sort();
    if (uncovered.isNotEmpty || selected.isEmpty) {
      return result(
        all,
        'No impacted test could be proven for: ${uncovered.join(', ')}; full fallback',
      );
    }
    return result(
      selected,
      'Union of base/head transitive imports, exports, parts and test configs; filesystem probes retained',
    );
  } on Object catch (error) {
    return result(all, 'Conservative fallback: $error');
  }
}

const _globalInputNames = {
  '.metadata',
  'analysis_options.yaml',
  'build.yaml',
  'dart_test.yaml',
  'l10n.yaml',
  'pubspec.lock',
  'pubspec.yaml',
  'pubspec_overrides.yaml',
};

// The Flutter CI job pins the SDK and runs the selected files.
const _globalInputPaths = {
  '.github/workflows/flutter-ci.yml',
  'tool/ci/toolchain.env',
};
const _globalInputDirectories = [
  '.github/actions/load-toolchain/',
  '.github/actions/setup-flutter/',
];

bool _globalTestInput(String name) =>
    _globalInputNames.contains(name.split('/').last) ||
    name.endsWith('.arb') ||
    _globalInputPaths.contains(name) ||
    _globalInputDirectories.any(name.startsWith);

// Surfaces outside the root package: backend, web, design, docs, tooling,
// infrastructure and CI sources, the JavaScript-only packages, other Flutter
// packages and apps, and golden/integration suites with their own gates. A root test reaches a Dart file here through the
// import graph, or reads a file here from disk as a filesystem probe. Any
// other path, including test fixtures, assets, native folders and new
// top-level roots, still needs import proof or keeps the full suite.
const _probeOnlyDirectories = [
  '.github/',
  'admin/',
  'analytics/',
  'apps/',
  'artifacts/',
  'contracts/',
  'copy/',
  'design/',
  'docs/',
  'extensions/',
  'fastlane/',
  'firebase/',
  'functions/',
  'infra/',
  'integration_test/',
  'operations/',
  'packages/brand/',
  'packages/web-config/',
  'packages/web-ui/',
  'test/goldens/',
  'test/integration/',
  'tool/',
  'website/',
  'widgetbook/',
];
const _probeOnlyFiles = {
  '.editorconfig',
  '.env.example',
  '.firebaserc',
  '.gitignore',
  'Gemfile',
  'Gemfile.lock',
  'firebase.json',
  'firestore.indexes.json',
  'firestore.rules',
  'package-lock.json',
  'package.json',
  'storage.rules',
};

bool _probeOnlyInput(String name) =>
    (name.endsWith('.md') &&
        !RegExp(r'(^|/)(assets|test|integration_test)/').hasMatch(name)) ||
    _probeOnlyFiles.contains(name) ||
    _probeOnlyDirectories.any(name.startsWith);

/// Whether any manifest's top-level `flutter:` section may bundle [name] as
/// an asset, font or shader. This scans tokens conservatively rather than
/// parsing YAML: every value is a possible file or directory relative to its
/// manifest, and escapes, anchors or aliases make the manifest opaque.
bool _possiblyBundled(String name, Map<String, String> tree) {
  for (final MapEntry(key: manifest, value: source) in tree.entries) {
    if (manifest != 'pubspec.yaml' && !manifest.endsWith('/pubspec.yaml')) {
      continue;
    }
    final root = manifest.substring(0, manifest.length - 'pubspec.yaml'.length);
    final section = StringBuffer();
    var inside = false;
    for (final line in source.split('\n')) {
      if (line.isNotEmpty && !line.startsWith(RegExp(r'[\s#]'))) {
        inside = line.startsWith('flutter:');
        if (inside) section.writeln(line.substring('flutter:'.length));
      } else if (inside) {
        section.writeln(line);
      }
    }
    final text = section.toString().replaceAll(
      RegExp(r'(^|\s)#.*$', multiLine: true),
      ' ',
    );
    if (RegExp(r'[\\*&]').hasMatch(text)) return true;
    tokens:
    for (var token in text.split(RegExp(r'''[\s,\[\]{}'"]+'''))) {
      if (token.startsWith('-')) token = token.substring(1);
      if (token.isEmpty || token.endsWith(':')) continue;
      if (token.startsWith('/')) return true;
      final segments = <String>[];
      for (final segment in '$root$token'.split('/')) {
        if (segment == '..') {
          if (segments.isEmpty) continue tokens; // Outside the repository.
          segments.removeLast();
        } else if (segment.isNotEmpty && segment != '.') {
          segments.add(segment);
        }
      }
      final target = segments.join('/');
      if (target.isEmpty || name == target || name.startsWith('$target/')) {
        return true;
      }
    }
  }
  return false;
}

class _Imports {
  _Imports(this.files) {
    for (final entry in files.entries) {
      if (entry.key != 'pubspec.yaml' && !entry.key.endsWith('/pubspec.yaml')) {
        continue;
      }
      final name = RegExp(
        r'^name:\s*([a-zA-Z_][a-zA-Z_0-9]*)\s*$',
        multiLine: true,
      ).firstMatch(entry.value)?.group(1);
      if (name == null) {
        throw StateError('Unsupported package declaration: ${entry.key}');
      }
      final root = entry.key.substring(
        0,
        entry.key.length - 'pubspec.yaml'.length,
      );
      if (packages.containsKey(name)) {
        throw StateError('Ambiguous package: $name');
      }
      packages[name] = '${root}lib/';
    }
  }
  static const fileSystemProbe = '@filesystem-probe';
  final Map<String, String> files;
  final packages = <String, String>{};
  final edges = <String, Set<String>>{};

  Set<String> closure(String start) {
    final visited = <String>{};
    void walk(String name) {
      if (!visited.add(name) || name == fileSystemProbe) return;
      for (final dependency in edges.putIfAbsent(name, () => imports(name))) {
        walk(dependency);
      }
    }

    walk(start);
    return visited;
  }

  /// `flutter test` wraps a test in a `flutter_test_config.dart` from its
  /// directory or an ancestor. Every ancestor config counts as an import.
  Set<String> testClosure(String test) {
    final result = closure(test);
    var directory = test;
    while (directory.contains('/')) {
      directory = directory.substring(0, directory.lastIndexOf('/'));
      final config = '$directory/flutter_test_config.dart';
      if (files.containsKey(config)) result.addAll(closure(config));
    }
    if (files.containsKey('flutter_test_config.dart')) {
      result.addAll(closure('flutter_test_config.dart'));
    }
    return result;
  }

  Set<String> imports(String name) {
    final source = files[name];
    if (source == null) throw StateError('Missing local Dart module: $name');
    final parsed = parseString(
      content: source,
      path: name,
      throwIfDiagnostics: false,
    );
    if (parsed.errors.isNotEmpty) {
      throw StateError('Cannot parse Dart module: $name');
    }
    final dependencies = <String>{};
    void add(StringLiteral literal) {
      final value = literal.stringValue;
      if (value == null) throw StateError('Nonliteral Dart URI in $name');
      final uri = Uri.parse(value);
      if (uri.scheme == 'dart') {
        if (value == 'dart:io' &&
            (name.startsWith('test/') || name.startsWith('tool/'))) {
          dependencies.add(fileSystemProbe);
        }
        return;
      }
      String target;
      if (uri.scheme == 'package') {
        final split = uri.path.indexOf('/');
        if (split < 1) throw StateError('Invalid package URI: $value');
        final package = uri.path.substring(0, split);
        final root = packages[package];
        if (root == null) {
          return; // External packages are bounded by the lockfile.
        }
        target = '$root${uri.path.substring(split + 1)}';
      } else if (uri.scheme.isEmpty && !uri.hasAbsolutePath) {
        target = Uri(path: name).resolveUri(uri).normalizePath().path;
      } else {
        throw StateError('Unsupported Dart URI: $value');
      }
      if (!files.containsKey(target)) {
        throw StateError('Missing local Dart module: $target');
      }
      dependencies.add(target);
    }

    for (final directive in parsed.unit.directives) {
      if (directive is UriBasedDirective) {
        add(directive.uri);
        if (directive is NamespaceDirective) {
          for (final conditional in directive.configurations) {
            add(conditional.uri);
          }
        }
      }
    }
    return dependencies;
  }
}

ProcessResult _git(List<String> arguments) {
  final result = Process.runSync(
    'git',
    arguments,
    stdoutEncoding: utf8,
    stderrEncoding: utf8,
  );
  if (result.exitCode != 0) {
    throw StateError('git ${arguments.first} failed: ${result.stderr}');
  }
  return result;
}

Future<Map<String, String>> _tree(
  String sha, {
  Set<String> includePaths = const {},
}) async {
  final listing = (_git(['ls-tree', '-rz', sha]).stdout as String)
      .split('\u0000')
      .where((entry) => entry.isNotEmpty);
  final entries = <(String, String)>[];
  for (final entry in listing) {
    final split = entry.indexOf('\t');
    final name = entry.substring(split + 1);
    if (!includePaths.contains(name) &&
        name != _componentGraph &&
        name != _uiProbeScript &&
        !name.endsWith('.dart') &&
        name != 'pubspec.yaml' &&
        !name.endsWith('/pubspec.yaml')) {
      continue;
    }
    final header = entry.substring(0, split).split(' ');
    if (header[1] != 'blob' || !['100644', '100755'].contains(header[0])) {
      throw StateError('Unsupported Git entry: $name');
    }
    entries.add((name, header[2]));
  }
  final process = await Process.start('git', ['cat-file', '--batch']);
  final bytesFuture = process.stdout.fold<List<int>>(
    [],
    (bytes, chunk) => bytes..addAll(chunk),
  );
  final errorsFuture = process.stderr.transform(utf8.decoder).join();
  process.stdin.write('${entries.map((entry) => entry.$2).join('\n')}\n');
  await process.stdin.close();
  final bytes = await bytesFuture;
  final errors = await errorsFuture;
  if (await process.exitCode != 0) {
    throw StateError('Cannot read committed sources: $errors');
  }
  var offset = 0;
  final result = <String, String>{};
  for (final (name, object) in entries) {
    final end = bytes.indexOf(10, offset);
    final header = utf8.decode(bytes.sublist(offset, end)).split(' ');
    if (header[0] != object || header[1] != 'blob') {
      throw StateError('Invalid Git object: $name');
    }
    final size = int.parse(header[2]);
    result[name] = utf8.decode(bytes.sublist(end + 1, end + 1 + size));
    offset = end + size + 2;
  }
  return result;
}

// Graphs and manifests come from the same exact Git snapshots as the Dart
// dependency graph. No caller-supplied path ignore list crosses the CLI boundary.
Future<Set<String>> _ordinaryDocuments(
  Map<String, String> before,
  Map<String, String> after,
  Set<String> changed,
) async {
  try {
    final helper = File.fromUri(
      Platform.script.resolve('flutter_document_selection.mjs'),
    ).path;
    final candidates = changed.where((name) => name.endsWith('.md')).toList();
    if (candidates.isEmpty) return {};
    final input = jsonEncode({
      'beforeGraph': jsonDecode(before[_componentGraph]!),
      'afterGraph': jsonDecode(after[_componentGraph]!),
      'changed': candidates,
      'manifests': [
        for (final tree in [before, after])
          {
            for (final entry in tree.entries)
              if (entry.key == 'pubspec.yaml' ||
                  entry.key.endsWith('/pubspec.yaml'))
                entry.key: entry.value,
          },
      ],
    });
    final process = await Process.start('node', [helper]);
    final output = process.stdout.transform(utf8.decoder).join();
    final errors = process.stderr.transform(utf8.decoder).join();
    process.stdin.write(input);
    await process.stdin.close();
    final text = await output;
    await errors;
    if (await process.exitCode != 0) return {};
    final parsed = (jsonDecode(text) as List).cast<String>().toSet();
    return parsed.every(candidates.contains) ? parsed : {};
  } on Object {
    return {}; // Missing Node, graph or unsupported ownership keeps full tests.
  }
}

Future<void> main(List<String> arguments) async {
  final args = <String, String>{};
  for (var i = 0; i < arguments.length; i += 2) {
    if (i + 1 >= arguments.length ||
        !arguments[i].startsWith('--') ||
        args.containsKey(arguments[i])) {
      throw ArgumentError('Expected unique --name value pairs');
    }
    args[arguments[i]] = arguments[i + 1];
  }
  if (args.keys.any(
    (key) => ![
      '--base',
      '--head',
      '--full',
      '--commit-window',
      '--output',
      '--github-output',
    ].contains(key),
  )) {
    throw ArgumentError('Unknown option');
  }
  final base = args['--base'] ?? '';
  final head = args['--head'] ?? '';
  for (final sha in [base, head]) {
    if (!RegExp(r'^[0-9a-f]{40}$').hasMatch(sha)) {
      throw ArgumentError('Exact Git SHAs required');
    }
    _git(['cat-file', '-e', '$sha^{commit}']);
  }
  _git(['merge-base', '--is-ancestor', base, head]);
  if (!['true', 'false'].contains(args['--full'] ?? 'false')) {
    throw ArgumentError('Invalid --full');
  }
  if (!['true', 'false'].contains(args['--commit-window'] ?? 'false')) {
    throw ArgumentError('Invalid --commit-window');
  }
  final commitWindow = args['--commit-window'] == 'true';
  final changed =
      (_git(
                commitWindow
                    ? [
                        'log',
                        '--format=',
                        '--name-only',
                        '--no-renames',
                        '-m',
                        '-z',
                        '$base..$head',
                        '--',
                      ]
                    : ['diff', '--name-only', '--no-renames', '-z', base, head],
              ).stdout
              as String)
          .split('\u0000')
          .where((name) => name.isNotEmpty)
          .toSet();
  final documents = changed.where((name) => name.endsWith('.md')).toSet();
  final before = await _tree(base, includePaths: documents);
  final after = await _tree(head, includePaths: documents);
  final ordinaryDocuments = await _ordinaryDocuments(before, after, changed);
  final plan = selectFlutterTests(
    before: before,
    after: after,
    changed: changed,
    full: args['--full'] == 'true',
    ordinaryDocuments: ordinaryDocuments,
  );
  plan['uiLintSmoke'] = needsUiLintSmoke(
    before: before,
    after: after,
    changed: changed,
    full: args['--full'] == 'true',
    ordinaryDocuments: ordinaryDocuments,
  );
  plan['ordinaryDocuments'] = ordinaryDocuments.toList()..sort();
  plan['commitWindow'] = commitWindow;
  final files = plan['files']! as List<String>;
  final count = math.min(4, files.length);
  final shards = List.generate(
    count,
    (index) => {
      'shard_index': index,
      'shard_label': index + 1,
      'shard_total': count,
      'files': [for (var i = index; i < files.length; i += count) files[i]],
    },
  );
  final output = args['--output'];
  if (output == null) throw ArgumentError('--output is required');
  File(output).parent.createSync(recursive: true);
  File(output).writeAsStringSync(
    '${const JsonEncoder.withIndent('  ').convert({...plan, 'baseSha': base, 'sourceSha': head, 'shards': shards})}\n',
  );
  final githubOutput = args['--github-output'];
  if (githubOutput != null) {
    final matrix = {
      'include': shards
          .map((shard) => Map.from(shard)..remove('files'))
          .toList(),
    };
    File(githubOutput).writeAsStringSync(
      'matrix=${jsonEncode(matrix)}\nshard_total=$count\nui_lint_smoke=${plan['uiLintSmoke']}\n',
      mode: FileMode.append,
    );
  }
  stdout.writeln(jsonEncode({...plan}..remove('files')));
}
