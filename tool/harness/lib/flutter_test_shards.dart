import 'dart:math' as math;

/// The directory of the package whose `flutter test` runs [name], or null
/// when the test shards do not run it.
///
/// The shards run the root package's unit and widget tests (`.`) and each app
/// package's (`apps/<app>`). Golden suites belong to the macOS goldens lane
/// and `test/integration/` to the app-shell journeys, so neither is a shard
/// test. Other packages' suites belong to the package-tests job.
String? testPackage(String name) {
  if (!name.endsWith('_test.dart')) return null;
  final app = RegExp(r'^apps/([^/]+)/test/').firstMatch(name);
  if (app != null) {
    return name.startsWith('${app[0]}goldens/') ? null : 'apps/${app[1]}';
  }
  if (!name.startsWith('test/') ||
      name.startsWith('test/goldens/') ||
      name.startsWith('test/integration/')) {
    return null;
  }
  return '.';
}

/// The package directory whose test runs a test-side file's relative reads
/// resolve against, or null for a file whose reads are not test reads: root
/// `test/` and `tool/` files belong to the root package, an app package's
/// `test/` files to that app, and the shared test-support package's `lib/`
/// files to whichever package's test runs them ([anyReadsPackage]).
String? readsPackage(String name) {
  if (name.startsWith('test/') || name.startsWith('tool/')) return '.';
  if (name.startsWith(testSupportLib)) return anyReadsPackage;
  return RegExp(r'^(apps/[^/]+)/test/').firstMatch(name)?.group(1);
}

/// [readsPackage] of a file that every package's tests may run, so it has no
/// one working directory: only its repository-path reads can be bounded.
const anyReadsPackage = '*';

/// The shared test-support package's library folder.
const testSupportLib = 'packages/catch_test_support/lib/';

/// The library whose `repoFile` and `repoDirectory` read files by repository
/// path. The selector reads their arguments in other files; the library
/// itself only walks up from the working directory to the root pubspec, a
/// global input.
const repoFileLibrary = '${testSupportLib}repo_file.dart';

/// How many of the shard tests [files] each package directory runs.
Map<String, int> packageCounts(List<String> files) {
  final counts = <String, int>{};
  for (final file in files) {
    counts.update(testPackage(file)!, (count) => count + 1, ifAbsent: () => 1);
  }
  return counts;
}

/// [name], a shard test, relative to the directory its `flutter test` runs in.
String packageRelative(String name) {
  final package = testPackage(name);
  if (package == null) throw ArgumentError('Not a shard test: $name');
  return package == '.' ? name : name.substring(package.length + 1);
}

/// Test files per shard. Measured on hosted runners: a shard's test step takes
/// about 35 s plus 2.4 s per file, and each shard also pays about 85 s of setup
/// and its own runner-queue wait, so 110 files keep the step near five minutes
/// without paying for idle shards.
const filesPerShard = 110;

/// How many shards [files] selected test files run in: one per
/// [filesPerShard] files, at least one when any test is selected, at most four.
int shardCount(int files) =>
    files <= 0 ? 0 : math.min(4, (files + filesPerShard - 1) ~/ filesPerShard);

/// The shard matrix for the selected [files], each shard's files grouped by
/// the package directory its `flutter test` runs in.
///
/// Shard sizes differ by at most one file. Every package group in a shard is
/// its own `flutter test` run, which pays a cold compile of the whole program
/// before its first test, so app-package tests fill the shards in order and
/// span as few as possible. Root tests then take the room left, each going to
/// the shard with the most room, so no shard holds one directory's tests.
List<Map<String, Object>> planShards(List<String> files) {
  final count = shardCount(files.length);
  final sizes = [
    for (var index = 0; index < count; index++)
      files.length ~/ count + (index < files.length % count ? 1 : 0),
  ];
  final shards = [for (var index = 0; index < count; index++) <String>[]];
  final ordered = [...files]..sort();
  var cursor = 0;
  for (final file in ordered.where((file) => testPackage(file) != '.')) {
    while (shards[cursor].length == sizes[cursor]) {
      cursor++;
    }
    shards[cursor].add(file);
  }
  for (final file in ordered.where((file) => testPackage(file) == '.')) {
    var roomiest = 0;
    for (var index = 1; index < count; index++) {
      if (sizes[index] - shards[index].length >
          sizes[roomiest] - shards[roomiest].length) {
        roomiest = index;
      }
    }
    shards[roomiest].add(file);
  }
  return [
    for (var index = 0; index < count; index++)
      {
        'shard_index': index,
        'shard_label': index + 1,
        'shard_total': count,
        'files': shards[index]..sort(),
        'groups': [
          for (final package in {
            for (final file in shards[index]) testPackage(file)!,
          })
            {
              'package': package,
              'files': [
                for (final file in shards[index])
                  if (testPackage(file) == package) packageRelative(file),
              ],
            },
        ],
      },
  ];
}
