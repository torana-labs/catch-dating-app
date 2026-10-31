import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';

import 'flutter_test_selection.dart';

const fixture = {
  'pubspec.yaml': 'name: example\n',
  'lib/a.dart': 'const a = 1;',
  'lib/b.dart': "export 'a.dart';",
  'lib/c.dart': 'const c = 1;',
  'test/a_test.dart': "import 'package:example/b.dart'; void main() {}",
  'test/c_test.dart': "import '../lib/c.dart'; void main() {}",
};
List<String> selected(Map<String, Object> plan) =>
    plan['files']! as List<String>;
Map<String, Object> plan(
  Set<String> changed, {
  Map<String, String>? before,
  Map<String, String>? after,
  bool full = false,
  Set<String> ordinaryDocuments = const {},
}) => selectFlutterTests(
  before: before ?? fixture,
  after: after ?? fixture,
  changed: changed,
  full: full,
  ordinaryDocuments: ordinaryDocuments,
);

void main() {
  test('CLI binds document ownership and full fallback to committed trees', () {
    final root = Directory.systemTemp.createTempSync(
      'catch-flutter-selection-',
    );
    final selector = File(
      'tool/harness/lib/flutter_test_selection.dart',
    ).absolute.path;
    final packages = File('.dart_tool/package_config.json').absolute.path;
    String git(List<String> args) {
      final result = Process.runSync('git', args, workingDirectory: root.path);
      expect(result.exitCode, 0, reason: result.stderr as String);
      return (result.stdout as String).trim();
    }

    void write(String name, String text) {
      final file = File('${root.path}/$name');
      file.parent.createSync(recursive: true);
      file.writeAsStringSync(text);
    }

    String commit() {
      git(['add', '.']);
      git([
        '-c',
        'user.name=CI test',
        '-c',
        'user.email=ci@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'fixture',
      ]);
      return git(['rev-parse', 'HEAD']);
    }

    try {
      git(['init', '--quiet']);
      for (final entry in fixture.entries) {
        write(entry.key, entry.value);
      }
      write('test/probe_test.dart', "import 'dart:io'; void main() {}");
      write('docs/feature.md', 'Before');
      write(
        'tool/harness/component_graph.json',
        File('tool/harness/component_graph.json').readAsStringSync(),
      );
      write('.gitignore', 'plan.json\nbin/\n');
      final base = commit();
      write('lib/a.dart', 'const a = 2;');
      write('docs/feature.md', 'After');
      final head = commit();
      Map<String, dynamic> run({
        bool full = false,
        String? path,
        bool commitWindow = false,
        String? selectedBase,
        String? selectedHead,
      }) {
        final result = Process.runSync(
          Platform.resolvedExecutable,
          [
            '--packages=$packages',
            selector,
            '--base',
            selectedBase ?? base,
            '--head',
            selectedHead ?? head,
            '--full',
            '$full',
            '--commit-window',
            '$commitWindow',
            '--output',
            '${root.path}/plan.json',
          ],
          workingDirectory: root.path,
          environment: path == null ? null : {'PATH': path},
        );
        expect(result.exitCode, 0, reason: result.stderr as String);
        return jsonDecode(File('${root.path}/plan.json').readAsStringSync())
            as Map<String, dynamic>;
      }

      final selected = run();
      expect(selected['baseSha'], base);
      expect(selected['sourceSha'], head);
      expect(selected['mode'], 'affected');
      expect(selected['files'], ['test/a_test.dart', 'test/probe_test.dart']);
      expect(selected['ordinaryDocuments'], ['docs/feature.md']);
      expect(run(full: true)['selectedTests'], 3);
      // Prose is probe-only without the Node classifier. A missing classifier
      // runtime only loses the ordinary-document list; it never fails open.
      final bin = Directory('${root.path}/bin')..createSync();
      final gitPath = (Process.runSync('which', ['git']).stdout as String)
          .trim();
      Link('${bin.path}/git').createSync(gitPath);
      final withoutNode = run(path: bin.path);
      expect(withoutNode['ordinaryDocuments'], isEmpty);
      expect(withoutNode['files'], selected['files']);
      // An intermediate dependency edge is absent from both initial snapshots.
      // Its changed owner remains in the committed window, selecting the head
      // test that a finalized predecessor-based selector would require.
      write('lib/b.dart', "export 'c.dart';");
      final intermediate = commit();
      write('lib/b.dart', "export 'a.dart';");
      write('lib/c.dart', 'const c = 2;');
      final restored = commit();
      final endpoint = run(selectedBase: head, selectedHead: restored);
      expect(endpoint['files'], ['test/c_test.dart', 'test/probe_test.dart']);
      final window = run(
        selectedBase: head,
        selectedHead: restored,
        commitWindow: true,
      );
      expect(window['reason'], startsWith('Union of base/head'));
      expect(window['commitWindow'], true);
      expect(window['files'], [
        'test/a_test.dart',
        'test/c_test.dart',
        'test/probe_test.dart',
      ]);
      final finalized = run(selectedBase: intermediate, selectedHead: restored);
      expect(
        (window['files'] as List).toSet().containsAll(
          finalized['files'] as List,
        ),
        isTrue,
      );
      // A removed/renamed dependency also survives the window and never loses
      // the dependent test when the original name is restored.
      git(['mv', 'lib/a.dart', 'lib/renamed.dart']);
      write('lib/b.dart', "export 'renamed.dart';");
      commit();
      git(['mv', 'lib/renamed.dart', 'lib/a.dart']);
      write('lib/b.dart', "export 'a.dart';");
      final renamedBack = commit();
      final renamedWindow = run(
        selectedBase: restored,
        selectedHead: renamedBack,
        commitWindow: true,
      );
      expect((renamedWindow['files'] as List), contains('test/a_test.dart'));
      // Committed manifests decide bundling: an asset under a probe-only
      // directory still reaches every test without an import.
      write(
        'pubspec.yaml',
        'name: example\nflutter:\n  assets:\n    - design/brand/\n',
      );
      write('design/brand/logo.svg', '<svg/>');
      final declared = commit();
      write('design/brand/logo.svg', '<svg></svg>');
      final bundled = commit();
      final asset = run(selectedBase: declared, selectedHead: bundled);
      expect(asset['mode'], 'full');
      expect(asset['reason'], contains('design/brand/logo.svg'));
      write('design/screens.json', '{}');
      final unbundled = commit();
      expect(run(selectedBase: bundled, selectedHead: unbundled)['files'], [
        'test/probe_test.dart',
      ]);
    } finally {
      root.deleteSync(recursive: true);
    }
  });
  test('lint engine probes follow their API dependencies and fail closed', () {
    final tree = {
      ...fixture,
      'tool/check_catch_ui_lints.sh':
          "run_probe <<'DART'\nimport 'package:example/b.dart';\nDART\n",
      'packages/catch_ui_lints/probes/catch_ui_lint_probes.dart':
          'const probe = 1;',
    };
    bool needs(Set<String> changed) =>
        needsUiLintSmoke(before: tree, after: tree, changed: changed);
    expect(needs({'lib/c.dart'}), false);
    expect(
      needsUiLintSmoke(
        before: tree,
        after: tree,
        changed: {'lib/c.dart', 'docs/feature.md'},
        ordinaryDocuments: {'docs/feature.md'},
      ),
      false,
    );
    expect(
      needsUiLintSmoke(
        before: tree,
        after: tree,
        changed: {'lib/a.dart', 'docs/feature.md'},
        ordinaryDocuments: {'docs/feature.md'},
      ),
      true,
    );

    expect(needs({'test/c_test.dart'}), false);
    expect(needs({'lib/a.dart'}), true);
    expect(needs({'pubspec.lock'}), true);
    expect(needs({'packages/catch_ui_lints/lib/plugin.dart'}), true);
    expect(
      needsUiLintSmoke(before: {}, after: tree, changed: {'lib/c.dart'}),
      true,
    );
    expect(
      needsUiLintSmoke(
        before: tree,
        after: tree,
        changed: {'lib/c.dart'},
        full: true,
      ),
      true,
    );
  });
  test('ordinary prose does not broaden a proven source change', () {
    expect(
      selected(
        plan(
          {'lib/a.dart', 'docs/feature.md'},
          ordinaryDocuments: {'docs/feature.md'},
        ),
      ),
      ['test/a_test.dart'],
    );
    // Prose outside the bundle is probe-only even without the classifier.
    expect(selected(plan({'lib/a.dart', 'docs/feature.md'})), [
      'test/a_test.dart',
    ]);
    expect(
      plan({'docs/feature.md'}, ordinaryDocuments: {'docs/feature.md'})['mode'],
      'full',
    );
    expect(
      plan(
        {'lib/a.dart', 'docs/feature.md'},
        ordinaryDocuments: {'docs/feature.md'},
        full: true,
      )['mode'],
      'full',
    );
    final files = {
      ...fixture,
      'test/probe_test.dart': "import 'dart:io'; void main() {}",
    };
    expect(
      selected(
        plan(
          {'lib/a.dart', 'docs/feature.md'},
          before: files,
          after: files,
          ordinaryDocuments: {'docs/feature.md'},
        ),
      ),
      ['test/a_test.dart', 'test/probe_test.dart'],
    );
  });
  test('transitive exports select dependent tests only', () {
    expect(selected(plan({'lib/a.dart'})), ['test/a_test.dart']);
  });
  test('changed tests and imported test helpers are selected', () {
    expect(selected(plan({'test/c_test.dart'})), ['test/c_test.dart']);
    final files = {
      ...fixture,
      'test/helper.dart': 'const x = 1;',
      'test/a_test.dart': "import 'helper.dart'; void main() {}",
    };
    expect(selected(plan({'test/helper.dart'}, before: files, after: files)), [
      'test/a_test.dart',
    ]);
  });
  test('old dependency edges survive deletion and rename', () {
    final after = {...fixture}..remove('lib/a.dart');
    after['lib/b.dart'] = 'const b = 1;';
    expect(selected(plan({'lib/a.dart', 'lib/b.dart'}, after: after)), [
      'test/a_test.dart',
    ]);
  });
  test(
    'new tests and removed old tests are handled without an empty shard',
    () {
      final after = {...fixture, 'test/new_test.dart': 'void main() {}'}
        ..remove('test/c_test.dart');
      expect(
        selected(
          plan({'test/new_test.dart', 'test/c_test.dart'}, after: after),
        ),
        ['test/new_test.dart'],
      );
    },
  );
  test('each changed source needs impact proof, including mixed changes', () {
    for (final operation in ['addition', 'edit', 'deletion', 'rename']) {
      final before = {...fixture};
      final after = {...fixture};
      final changed = {'lib/a.dart'};
      if (operation != 'addition') {
        before['lib/uncovered.dart'] = 'const uncovered = 1;';
      }
      if (operation != 'deletion' && operation != 'rename') {
        after['lib/uncovered.dart'] = 'const uncovered = 2;';
      }
      changed.add('lib/uncovered.dart');
      if (operation == 'rename') {
        after['lib/renamed.dart'] = 'const uncovered = 1;';
        changed.add('lib/renamed.dart');
      }
      final result = plan(changed, before: before, after: after);
      expect(result['mode'], 'full', reason: operation);
      expect(result['reason'], contains('lib/uncovered.dart'));
    }
  });
  test('covered source rename retains narrow base and head closure', () {
    final after = {...fixture}..remove('lib/a.dart');
    after['lib/renamed.dart'] = 'const a = 2;';
    after['lib/b.dart'] = "export 'renamed.dart';";
    expect(
      selected(
        plan({'lib/a.dart', 'lib/renamed.dart', 'lib/b.dart'}, after: after),
      ),
      ['test/a_test.dart'],
    );
  });
  test('filesystem probes do not cover unrelated changed source', () {
    final before = {
      ...fixture,
      'test/probe_test.dart': "import 'dart:io'; void main() {}",
    };
    final after = {...before, 'lib/uncovered.dart': 'const value = 1;'};
    expect(
      plan(
        {'lib/a.dart', 'lib/uncovered.dart'},
        before: before,
        after: after,
      )['mode'],
      'full',
    );
  });
  test('conditional imports and part directives propagate impact', () {
    final files = {
      ...fixture,
      'lib/b.dart':
          "import 'a.dart' if (dart.library.io) 'conditional.dart'; part 'fragment.dart';",
      'lib/conditional.dart': 'const value = 1;',
      'lib/fragment.dart': "part of 'b.dart'; const fragment = 1;",
    };
    for (final changed in ['lib/conditional.dart', 'lib/fragment.dart']) {
      expect(selected(plan({changed}, before: files, after: files)), [
        'test/a_test.dart',
      ]);
    }
  });
  test('filesystem source probes always run', () {
    final files = {
      ...fixture,
      'test/probe_test.dart': "import 'dart:io'; void main() {}",
    };
    expect(selected(plan({'lib/c.dart'}, before: files, after: files)), [
      'test/c_test.dart',
      'test/probe_test.dart',
    ]);
    expect(
      plan(
        {'lib/untested.dart'},
        before: files,
        after: {...files, 'lib/untested.dart': 'const x = 1;'},
      )['mode'],
      'full',
      reason: 'Filesystem probes must not disguise an unproven dependency.',
    );
  });
  test('cycles terminate and imports in comments do not create edges', () {
    final files = {
      ...fixture,
      'lib/a.dart': "import 'b.dart'; // import 'c.dart';\nconst a = 1;",
    };
    expect(selected(plan({'lib/c.dart'}, before: files, after: files)), [
      'test/c_test.dart',
    ]);
  });
  test('external packages are opaque until dependencies change', () {
    final files = {
      ...fixture,
      'lib/a.dart': "import 'package:external/external.dart'; const a = 1;",
    };
    expect(selected(plan({'lib/a.dart'}, before: files, after: files)), [
      'test/a_test.dart',
    ]);
    expect(plan({'pubspec.lock'}, before: files, after: files)['mode'], 'full');
  });
  // A filesystem probe makes every non-full result below narrower than the
  // suite, so a missing rule shows up as an affected plan instead of full.
  final probed = {
    ...fixture,
    'test/support/reader.dart': "import 'dart:io'; const reader = 1;",
    'test/probe_test.dart': "import 'support/reader.dart'; void main() {}",
  };
  Map<String, Object> probedPlan(
    Set<String> changed, {
    Map<String, String> extra = const {},
  }) => plan(
    changed,
    before: {...probed, ...extra},
    after: {...probed, ...extra},
  );
  test('toolchain, package, localization and runner inputs keep full', () {
    for (final input in [
      'pubspec.yaml',
      'pubspec.lock',
      'pubspec_overrides.yaml',
      'apps/consumer/pubspec.yaml',
      'widgetbook/pubspec.yaml',
      'analysis_options.yaml',
      'tool/widget_dedupe/analysis_options.yaml',
      'dart_test.yaml',
      'build.yaml',
      'l10n.yaml',
      '.metadata',
      'lib/l10n/app_en.arb',
      'tool/ci/toolchain.env',
      '.github/workflows/flutter-ci.yml',
      '.github/actions/setup-flutter/action.yml',
      '.github/actions/load-toolchain/action.yml',
    ]) {
      for (final changed in [
        {input},
        {input, 'lib/a.dart'},
      ]) {
        final result = probedPlan(changed);
        expect(result['mode'], 'full', reason: input);
        expect(result['reason'], contains(input), reason: input);
      }
    }
  });
  test('assets any manifest may bundle keep full, even when probe-only', () {
    final manifests = {
      'pubspec.yaml':
          'name: example\n'
          'flutter:\n'
          '  assets:\n'
          '    - design/brand/\n'
          '    - path: docs/legal/terms.md\n'
          '  fonts:\n'
          '    - family: Brand # docs/comment/ is not a declaration\n'
          '      fonts:\n'
          '        - asset: tool/fonts/brand.ttf\n'
          'flutter_launcher_icons:\n'
          '  image_path: website/public/icon.png\n',
      'packages/ui/pubspec.yaml':
          'name: ui\nflutter:\n  assets: [../../functions/seed.json]\n',
    };
    for (final asset in [
      'design/brand/logo.png',
      'design/brand/nested/mark.svg',
      'docs/legal/terms.md',
      'tool/fonts/brand.ttf',
      'functions/seed.json',
    ]) {
      final result = probedPlan({asset, 'lib/a.dart'}, extra: manifests);
      expect(result['mode'], 'full', reason: asset);
      expect(result['reason'], contains(asset), reason: asset);
    }
    // Undeclared neighbours, comments and non-Flutter sections stay narrow.
    for (final input in [
      'design/brandmark.png',
      'docs/comment/readme.md',
      'website/public/icon.png',
      'functions/seed.ts',
    ]) {
      expect(selected(probedPlan({input, 'lib/a.dart'}, extra: manifests)), [
        'test/a_test.dart',
        'test/probe_test.dart',
      ], reason: input);
    }
    // Ancestor, alias and escaped declarations make the manifest opaque.
    for (final opaque in [
      {'pubspec.yaml': 'name: example\nflutter:\n  assets:\n    - ./\n'},
      {'packages/ui/pubspec.yaml': 'name: ui\nflutter:\n  assets: [../../]\n'},
      {
        'pubspec.yaml':
            'name: example\ndirs: &dirs [docs/]\nflutter:\n  assets: *dirs\n',
      },
      {'pubspec.yaml': 'name: example\nflutter:\n  assets: ["docs\\x2f"]\n'},
      {'pubspec.yaml': 'name: example\nflutter:\n  assets: [/abs/]\n'},
    ]) {
      expect(
        probedPlan({'docs/feature.md', 'lib/a.dart'}, extra: opaque)['mode'],
        'full',
        reason: '$opaque',
      );
    }
    // A declaration that leaves the repository cannot bundle a tracked file.
    expect(
      selected(
        probedPlan(
          {'docs/feature.md'},
          extra: {'pubspec.yaml': 'name: example\nflutter:\n  assets: [../]\n'},
        ),
      ),
      ['test/probe_test.dart'],
    );
  });
  test('probe-only inputs select the filesystem probes that can read them', () {
    final external = {
      'design/screens/catch.screens.json',
      'design/visual_baselines/admin/home.png',
      'functions/src/index.ts',
      'website/src/app/page.tsx',
      'admin/src/App.tsx',
      'operations/src/run.ts',
      'contracts/firestore/user.schema.json',
      'artifacts/marketing/hero.png',
      'docs/plans/spec.md',
      'lib/hosts/inbox/README.md',
      'tool/design/check.mjs',
      'tool/unimported.dart',
      '.github/workflows/ci.yml',
      'test/goldens/home.png',
      'test/goldens/home_golden_test.dart',
      'widgetbook/lib/main.dart',
      'apps/host/ios/Runner/Info.plist',
      'firestore.rules',
      'package-lock.json',
      'infra/firebase/terraform.tfvars',
      'fastlane/Fastfile',
      'Gemfile.lock',
      'packages/brand/brand.json',
      'packages/web-config/generated/catch-tokens.css',
      'packages/web-ui/src/components/CatchBadge.module.css',
    };
    expect(selected(probedPlan({...external, 'lib/a.dart'})), [
      'test/a_test.dart',
      'test/probe_test.dart',
    ]);
    for (final input in external) {
      final result = probedPlan({input});
      expect(result['mode'], 'affected', reason: input);
      expect(selected(result), ['test/probe_test.dart'], reason: input);
    }
    // With no test able to read the disk, nothing proves coverage.
    expect(plan({'design/screens/catch.screens.json'})['mode'], 'full');
  });
  test('Dart sources outside lib and test are covered by the import graph', () {
    final files = {
      ...probed,
      'tool/helper.dart': 'const helper = 1;',
      'packages/ui/pubspec.yaml': 'name: ui\n',
      'packages/ui/lib/widget.dart': 'const widget = 1;',
      'packages/ui/lib/unused.dart': 'const unused = 1;',
      'test/c_test.dart':
          "import '../tool/helper.dart'; import '../lib/c.dart'; void main() {}",
      'test/w_test.dart': "import 'package:ui/widget.dart'; void main() {}",
    };
    Map<String, Object> run(Set<String> changed) =>
        plan(changed, before: files, after: files);
    expect(selected(run({'tool/helper.dart'})), [
      'test/c_test.dart',
      'test/probe_test.dart',
    ]);
    expect(selected(run({'packages/ui/lib/widget.dart'})), [
      'test/probe_test.dart',
      'test/w_test.dart',
    ]);
    // Package sources are not probe-only: unimported ones need proof.
    expect(run({'packages/ui/lib/unused.dart'})['mode'], 'full');
  });
  test('test configs wrap every test beneath them', () {
    final files = {
      ...fixture,
      'test/support/fonts.dart': 'const fonts = 1;',
      'test/fonts_test.dart': "import 'support/fonts.dart'; void main() {}",
      'test/ui/flutter_test_config.dart':
          "import '../support/fonts.dart'; void testExecutable() {}",
      'test/ui/deep/screen_test.dart': 'void main() {}',
      'test/goldens/flutter_test_config.dart': 'void testExecutable() {}',
    };
    Map<String, Object> run(
      Set<String> changed, {
      Map<String, String> extra = const {},
    }) => plan(changed, before: files, after: {...files, ...extra});
    expect(selected(run({'test/support/fonts.dart'})), [
      'test/fonts_test.dart',
      'test/ui/deep/screen_test.dart',
    ]);
    expect(selected(run({'test/ui/flutter_test_config.dart'})), [
      'test/ui/deep/screen_test.dart',
    ]);
    // A config with no root test beneath it belongs to its own gate.
    expect(
      selected(run({'lib/a.dart', 'test/goldens/flutter_test_config.dart'})),
      ['test/a_test.dart'],
    );
    expect(
      run(
        {'test/flutter_test_config.dart'},
        extra: {'test/flutter_test_config.dart': 'void testExecutable() {}'},
      )['mode'],
      'full',
    );
  });
  test('fixtures, assets, native and unknown inputs retain full suite', () {
    for (final input in [
      'assets/font.ttf',
      'assets/branding/new_icon.png',
      'test/fixture.json',
      'test/chats/fixtures/README.md',
      'assets/audio/README.md',
      'packages/ui/test/notes.md',
      'test/chats/fixtures/thread.json',
      'test/flutter_test_config.dart',
      'lib/data/seed.json',
      'packages/ui/assets/mark.png',
      'ios/Runner/Info.plist',
      'android/app/build.gradle',
      'macos/Runner/AppDelegate.swift',
      'web/index.html',
      'new_root/input.txt',
      'Makefile',
    ]) {
      for (final changed in [
        {input},
        {input, 'lib/a.dart'},
      ]) {
        final result = probedPlan(changed);
        expect(result['mode'], 'full', reason: input);
      }
    }
    expect(plan({'lib/a.dart'}, full: true)['mode'], 'full');
    expect(plan({})['mode'], 'full');
  });
  test('unresolved, malformed and untested source fail conservatively', () {
    expect(
      plan(
        {'lib/a.dart'},
        after: {...fixture, 'lib/a.dart': "import 'missing.dart';"},
      )['mode'],
      'full',
    );
    expect(
      plan(
        {'lib/a.dart'},
        after: {...fixture, 'lib/a.dart': 'void broken('},
      )['mode'],
      'full',
    );
    expect(
      plan(
        {'lib/untested.dart'},
        after: {...fixture, 'lib/untested.dart': 'const x = 1;'},
      )['mode'],
      'full',
    );
    expect(
      () => selectFlutterTests(before: {}, after: {}, changed: {}),
      throwsStateError,
    );
  });
}
