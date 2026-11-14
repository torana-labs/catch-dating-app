import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:test/test.dart';

import 'flutter_test_reads.dart';

const _tree = {
  'contracts/catalogs/a.json',
  'contracts/shared/b.json',
  'test/fixtures/x.json',
  'test/fixtures/y.json',
  'packages/catch_ui/assets/fonts/a.ttf',
};

Set<String>? reads(String body, {Set<String> paths = _tree}) {
  final source = "import 'dart:io';\n$body";
  return fileReads(
    name: 'test/support/helper.dart',
    source: source,
    unit: parseString(content: source).unit,
    paths: paths,
  );
}

void main() {
  group('derived reads', () {
    test('literal paths and same-file constants bound the reads', () {
      expect(
        reads('''
const _root = 'test/fixtures';
final a = File('test/fixtures/x.json').readAsStringSync();
final b = File('\$_root/y.json');
final c = Directory(_root).listSync();
final d = FileSystemEntity.isFileSync('./contracts/shared/b.json');
'''),
        {
          'test/fixtures/x.json',
          'test/fixtures/y.json',
          'test/fixtures',
          'contracts/shared/b.json',
        },
      );
    });
    test('a conditional between literals reads both', () {
      expect(
        reads(
          "File(bool p) => File('test/\${p ? 'fixtures' : 'other'}/q.json');",
        ),
        {'test/fixtures/q.json', 'test/other/q.json'},
      );
    });
    test('a file importing dart:io that touches no path reads nothing', () {
      expect(reads("final env = Platform.environment['HOME'];"), isEmpty);
    });
    test('a name that shadows a top-level constant is computed', () {
      const root = "const _root = 'test/fixtures';\n";
      for (final body in [
        "File local() { final _root = Platform.environment['P']!; return File('\$_root/x.json'); }",
        'File parameter(String _root) => File(_root);',
        "void loop(List<String> roots) { for (final _root in roots) { File('\$_root/x.json'); } }",
        "void caught() { try {} catch (_root) { File('\$_root'); } }",
        'void pattern(Object o) { if (o case String _root) File(_root); }',
        'class C { final String _root; C(this._root); File f() => File(_root); }',
        "void nested() { String _root() => 'elsewhere'; File(_root()); }",
      ]) {
        expect(reads('$root$body'), isNull, reason: body);
      }
      // An unshadowed constant still bounds the read.
      expect(reads("${root}final f = File('\$_root/x.json');"), {
        'test/fixtures/x.json',
      });
    });
    test('a computed path without a declaration stays a probe', () {
      for (final body in [
        "final f = File(Platform.environment['P']!);",
        "String p = 'x'; final f = File('test/\$p');",
        "final f = File.fromUri(Uri.parse('file:///x'));",
        'final make = File.new;',
        'final type = File;',
        "final f = File('/etc/hosts');",
        "final f = File('../outside.json');",
        'final f = File();',
      ]) {
        expect(reads(body), isNull, reason: body);
      }
    });
    test('a prefixed or filtered dart:io import stays a probe', () {
      for (final source in [
        "import 'dart:io' as io; final f = io.File('test/fixtures/x.json');",
        "import 'dart:io' show File; final f = File('test/fixtures/x.json');",
      ]) {
        expect(
          fileReads(
            name: 'test/a.dart',
            source: source,
            unit: parseString(content: source).unit,
            paths: _tree,
          ),
          isNull,
          reason: source,
        );
      }
    });
    test('processes, the working directory and the script stay probes', () {
      for (final body in [
        "final r = Process.runSync('git', ['status']);",
        'final d = Directory.current;',
        'final s = Platform.script;',
      ]) {
        expect(reads(body), isNull, reason: body);
      }
    });
  });

  group('declared reads', () {
    test('trust computed paths within the declared roots', () {
      expect(
        reads('''
// test-selection-reads: contracts/, packages/catch_ui/assets/fonts/
const _root = 'contracts';
File schema(String source) => File('\$_root/\$source');
final root = Directory(_root);
File font(String name) => File(name);
final config = File('.dart_tool/package_config.json');
'''),
        {'contracts', 'packages/catch_ui/assets/fonts'},
      );
    });
    test('a literal or constant prefix outside the roots stays a probe', () {
      for (final body in [
        "// test-selection-reads: contracts/\nfinal f = File('test/fixtures/x.json');",
        "// test-selection-reads: contracts/\nconst r = 'test'; File f(String s) => File('\$r/\$s');",
        "// test-selection-reads: test/fixtures/\nFile f(String s) => File('test/\$s');",
      ]) {
        expect(reads(body), isNull, reason: body);
      }
    });
    test('a declared root absent from the tree stays a probe', () {
      expect(
        reads(
          '// test-selection-reads: contracts/missing/\nFile f(String s) => File(s);',
        ),
        isNull,
      );
    });
    test('an unbounded declared root stays a probe', () {
      for (final root in ['/etc', '../x', '', '.']) {
        expect(
          reads('// test-selection-reads: $root\nFile f(String s) => File(s);'),
          isNull,
          reason: root,
        );
      }
    });
    test('processes, the working directory and the script stay probes', () {
      for (final body in [
        "final r = Process.runSync('git', ['status']);",
        'final d = Directory.current;',
        'final s = Platform.script.resolve("x");',
      ]) {
        expect(
          reads('// test-selection-reads: contracts/\n$body'),
          isNull,
          reason: body,
        );
      }
    });
  });

  test('a changed path matches a read file or directory', () {
    final bounded = {'contracts', 'test/fixtures/x.json'};
    expect(readsPath(bounded, 'contracts/shared/b.json'), isTrue);
    expect(readsPath(bounded, 'test/fixtures/x.json'), isTrue);
    expect(readsPath(bounded, 'test/fixtures/y.json'), isFalse);
    expect(readsPath(bounded, 'contractsx/a.json'), isFalse);
  });
}
