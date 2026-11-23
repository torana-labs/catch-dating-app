part of 'flutter_test_selection.dart';

// Which changed paths reach every shard test without an import (global
// inputs), which only filesystem probes can read (probe-only inputs), and
// which a package manifest may bundle.

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
// The schema generator's outputs aren't tracked. Without its rendered output
// at both commits, these reach every test that imports one, and no import
// graph can show which. With it, they are probe-only like the rest of
// contracts/ and tool/, and the changed outputs need import proof instead.
bool _generatedContractInput(String name) =>
    (name.startsWith('contracts/') && name.endsWith('.json')) ||
    const {
      'tool/contracts/generate_schema_contracts.mjs',
      'tool/contracts/lib/schema_specs.mjs',
      'tool/contracts/schema_spec_exceptions.json',
      'tool/contracts/schema_spec_order.json',
    }.contains(name);

bool _untrackedGeneratedDart(String name) =>
    name.startsWith('packages/platform/lib/schema_contracts/generated/') ||
    RegExp(r'^lib/contexts/[^/]+/data/generated/').hasMatch(name);

const _globalInputDirectories = [
  '.github/actions/load-toolchain/',
  '.github/actions/setup-flutter/',
];

bool _globalTestInput(String name) =>
    _globalInputNames.contains(name.split('/').last) ||
    name.endsWith('.arb') ||
    _globalInputPaths.contains(name) ||
    _globalInputDirectories.any(name.startsWith);

// Surfaces outside the packages the shards test: backend, web, design, docs,
// tooling, infrastructure and CI sources, the JavaScript-only packages, other
// Flutter packages, and golden/integration suites with their own gates. A
// shard test reaches a Dart file here through the import graph, or reads a
// file here from disk as a filesystem probe. Any other path, including test
// fixtures, assets, native folders and new top-level roots, still needs
// import proof or keeps the full suite.
const _probeOnlyDirectories = [
  '.github/',
  'admin/',
  'analytics/',
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
  // The package job ("Kernel, Catch UI & Widgetbook package tests") owns these
  // suites, and the macOS goldens lane owns packages/catch_ui/test/goldens.
  // A root test that imports one still reaches it through the import graph.
  'packages/catch_ui/test/',
  'packages/kernel/test/',
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
    _probeOnlyDirectories.any(name.startsWith) ||
    _appProbeOnly(name);

// An app package's lib/ and test/ are sources the shards test, so they need
// import proof like the root package's. Its native folders, integration
// suites and goldens have their own gates. The shared test-support package's
// lib/ reaches shard tests through the import graph; nothing else in it does.
bool _appProbeOnly(String name) {
  if (name.startsWith('packages/catch_test_support/')) {
    return !name.startsWith(testSupportLib);
  }
  final rest = RegExp(r'^apps/[^/]+/(.*)$').firstMatch(name)?.group(1);
  return rest != null &&
      (rest.startsWith('test/goldens/') ||
          !(rest.startsWith('lib/') || rest.startsWith('test/')));
}

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
