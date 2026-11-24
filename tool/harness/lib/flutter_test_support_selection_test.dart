import 'package:test/test.dart';

import 'flutter_test_selection.dart';

// Selection through packages/catch_test_support: its lib/ is shared by the
// root and app suites, and its repoFile() reads repository paths.
const _probed = {
  'pubspec.yaml': 'name: example\n',
  'lib/a.dart': 'const a = 1;',
  'test/a_test.dart': "import '../lib/a.dart'; void main() {}",
  'test/support/reader.dart':
      "import 'dart:io'; final reader = File(Platform.environment['P']!);",
  'test/probe_test.dart': "import 'support/reader.dart'; void main() {}",
};

List<String> selected(Map<String, Object> plan) =>
    plan['files']! as List<String>;

void main() {
  group('shared test support', () {
    const support = 'packages/catch_test_support';
    final files = {
      ..._probed,
      'apps/host/pubspec.yaml': 'name: catch_host_app\n',
      '$support/pubspec.yaml': 'name: catch_test_support\n',
      // The real library walks up from the working directory; the selector
      // trusts it and reads its callers' arguments instead.
      '$support/lib/repo_file.dart':
          "import 'dart:io'; File repoFile(String p) => File('\${Directory.current.path}/\$p');",
      '$support/lib/designs.dart':
          "import 'package:catch_test_support/repo_file.dart'; final d = repoFile('design/a.json');",
      '$support/lib/widgetbook_check.dart':
          "import 'dart:io'; final w = File('lib/main.directories.g.dart').existsSync();",
      'test/design_test.dart':
          "import 'package:catch_test_support/designs.dart'; void main() {}",
      'apps/host/test/design_test.dart':
          "import 'package:catch_test_support/designs.dart'; void main() {}",
      'test/fixture_test.dart':
          "import 'package:catch_test_support/repo_file.dart'; final f = repoFile('test/fixtures/x.json'); void main() {}",
      'test/widgetbook_check_test.dart':
          "import 'package:catch_test_support/widgetbook_check.dart'; void main() {}",
    };
    final paths = {
      ...files.keys,
      'design/a.json',
      'test/fixtures/x.json',
      'test/fixtures/y.json',
    };
    Map<String, Object> supportPlan(Set<String> changed) => selectFlutterTests(
      before: files,
      after: files,
      beforePaths: paths,
      afterPaths: paths,
      changed: changed,
    );

    test('a repository read in a shared helper selects every package', () {
      expect(selected(supportPlan({'design/a.json'})), [
        'apps/host/test/design_test.dart',
        'test/design_test.dart',
        'test/probe_test.dart',
        'test/widgetbook_check_test.dart',
      ]);
    });
    test('a repoFile read needs no dart:io import to be bounded', () {
      final result = supportPlan({'test/fixtures/x.json'});
      expect(result['mode'], 'affected');
      expect(selected(result), [
        'test/fixture_test.dart',
        'test/probe_test.dart',
        'test/widgetbook_check_test.dart',
      ]);
      expect(supportPlan({'test/fixtures/y.json'})['mode'], 'full');
    });
    test('repo_file.dart itself keeps no reader a probe', () {
      expect(selected(supportPlan({'lib/a.dart'})), [
        'test/a_test.dart',
        'test/probe_test.dart',
        'test/widgetbook_check_test.dart',
      ]);
    });
    test(
      'its library needs import proof; nothing else in it reaches a shard',
      () {
        expect(selected(supportPlan({'$support/lib/designs.dart'})), [
          'apps/host/test/design_test.dart',
          'test/design_test.dart',
          'test/probe_test.dart',
          'test/widgetbook_check_test.dart',
        ]);
        final result = supportPlan({'$support/test/designs_test.dart'});
        expect(result['mode'], 'affected');
        expect(selected(result), [
          'test/probe_test.dart',
          'test/widgetbook_check_test.dart',
        ]);
      },
    );
  });
}
