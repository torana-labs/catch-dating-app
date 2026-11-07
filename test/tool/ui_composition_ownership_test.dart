import 'dart:io';

import 'package:test/test.dart';

import '../../tool/architecture/check_ui_composition_contracts.dart';

void main() {
  test('workspace roots govern every returned layout branch', () {
    const owner = <String, Object?>{
      'symbol': 'ExampleScreen',
      'family': 'root',
      'expression': 'CatchNavigationViewport',
      'bodyGeometry': 'full-bleed',
      'topEdge': 'safe-area',
    };
    expect(
      evaluateLayoutOwnerContract(
        screenId: 'screen.fixture',
        owner: owner,
        declarationSource: '''
class ExampleScreen {
  Object build() => CatchNavigationViewport(panes: panes);
}
''',
      ),
      isEmpty,
    );
    expect(
      evaluateLayoutOwnerContract(
        screenId: 'screen.fixture',
        owner: owner,
        declarationSource: '''
class ExampleScreen {
  Object build() => compact
      ? const SizedBox()
      : CatchNavigationViewport(panes: panes);
}
''',
      ),
      isNotEmpty,
    );
  });

  test('flags raw Scaffold ownership', () {
    final lines = rawScaffoldLines('''
class ExampleScreen {
  Object build() => Scaffold(body: Content());
}
''');

    expect(lines, <int>[2]);
  });

  test(
    'analyzer rejects prefixed, aliased, direct, and indirect Scaffold ownership',
    () async {
      final sdkPath = analysisDartSdkPath();
      expect(File('$sdkPath/bin/dart').existsSync(), isTrue);
      expect(
        Directory('$sdkPath/lib/_internal').existsSync(),
        isTrue,
        reason: 'resolved analyzer SDK: $sdkPath',
      );
      final failures = await resolveScaffoldOwnershipFailuresForFile(
        root: Directory.current.absolute.path,
        relativePath: 'test/tool/fixtures/scaffold_ownership_fixture.dart',
      );

      expect(failures, contains(contains('construction resolves')));
      expect(failures, contains(contains('type alias resolves')));
      expect(failures, contains(contains('constructor tear-off resolves')));
      expect(
        failures.where(
          (failure) => failure.contains('subclasses Flutter Scaffold'),
        ),
        hasLength(2),
      );
      expect(failures, everyElement(contains(screenScaffoldOwnershipCode)));
    },
  );

  test('analysis contexts own app and shared UI production sources', () {
    final failures = analysisContextMembershipFailures(
      root: Directory.current.absolute.path,
      relativePaths: const <String>[
        'lib/app.dart',
        'apps/consumer/lib/consumer_platform_app.dart',
        'apps/host/lib/host_platform_app.dart',
        'packages/catch_ui/lib/src/patterns/catch_scaffold.dart',
      ],
    );

    expect(failures, isEmpty);
  });

  test(
    'only the exact package scaffold owns the Material construction',
    () async {
      const source = 'packages/catch_ui/lib/src/patterns/catch_scaffold.dart';
      final root = Directory.current.absolute.path;
      expect(
        await resolveScaffoldOwnershipFailuresForFile(
          root: root,
          relativePath: source,
        ),
        isEmpty,
      );
      expect(
        await resolveScaffoldOwnershipFailuresForFile(
          root: root,
          relativePath: source,
          canonicalScaffoldPath: 'lib/core/widgets/catch_scaffold.dart',
        ),
        contains(contains(screenScaffoldOwnershipCode)),
      );
    },
  );

  group('resolved layout terminal traversal', () {
    late Directory fixtureRoot;

    setUpAll(() {
      fixtureRoot = Directory.systemTemp.createTempSync(
        'catch_layout_terminal_',
      );
      final fixture = File('${fixtureRoot.path}/lib/fixture.dart');
      fixture.parent.createSync(recursive: true);
      fixture.writeAsStringSync(_resolvedLayoutTerminalFixture);
    });

    tearDownAll(() {
      fixtureRoot.deleteSync(recursive: true);
    });

    test(
      'follows Widget constructors, createState, State.build, and Widget methods',
      () async {
        final valid = await resolvedLayoutOwnerOnEveryBranch(
          root: fixtureRoot.path,
          relativePath: 'lib/fixture.dart',
          symbol: 'ResolvedRootScreen',
          acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
        );

        expect(valid, isTrue);
      },
    );

    test('accepts an exact separately registered terminal owner', () async {
      final valid = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'RegisteredDelegateScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
        acceptedOwnerBindings: <DeclarationBinding>{
          const DeclarationBinding(
            file: 'lib/fixture.dart',
            symbol: 'RegisteredRootOwner',
          ),
        },
      );

      expect(valid, isTrue);
    });

    test('follows generic widget-builder wrappers', () async {
      final valid = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'GenericBuilderWrapperScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );

      expect(valid, isTrue);
    });

    test('rejects a rogue adapter branch', () async {
      final valid = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'RogueAdapterScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );

      expect(valid, isFalse);
    });

    test('rejects unresolved and external adapter terminals', () async {
      final unresolved = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'UnresolvedAdapterScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );
      final external = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'ExternalAdapterScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );

      expect(unresolved, isFalse);
      expect(external, isFalse);
    });

    test('rejects a mixed-family adapter terminal', () async {
      final valid = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'MixedFamilyScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );

      expect(valid, isFalse);
    });

    test('rejects cyclic Widget adapter graphs', () async {
      final valid = await resolvedLayoutOwnerOnEveryBranch(
        root: fixtureRoot.path,
        relativePath: 'lib/fixture.dart',
        symbol: 'CyclicAdapterScreen',
        acceptedSignatures: const <String>{'CatchRootScreenScaffold'},
      );

      expect(valid, isFalse);
    });
  });

  test('requires the registered top-bar expression', () {
    final screen = _screen();
    screen['topBar'] = <String, Object?>{
      'role': 'compact',
      'expression': 'CatchLegacyTopBar',
      'owner': 'CatchLegacyTopBar',
      'reason': 'fixture',
    };

    final result = evaluateSourceContract(screen, 'class ExampleScreen {}');

    expect(result, contains(contains(screenTopBarConformanceCode)));
  });

  test('rejects an owner outside the registered layout family', () {
    final failures = evaluateLayoutOwnerContract(
      screenId: 'screen.fixture',
      owner: <String, Object?>{
        'symbol': 'ExampleScreen',
        'family': 'root',
        'expression': 'CatchRouteScaffold',
        'bodyGeometry': 'standard',
        'topEdge': 'safe-area',
      },
      declarationSource:
          'class ExampleScreen { CatchRouteScaffold build() => const CatchRouteScaffold(body: SizedBox()); }',
    );

    expect(failures, contains(contains(screenLayoutFamilyCode)));
  });

  test('requires header-owned roots to declare their top edge', () {
    final failures = evaluateLayoutOwnerContract(
      screenId: 'screen.fixture',
      owner: <String, Object?>{
        'symbol': 'ExampleScreen',
        'family': 'root',
        'expression': 'CatchRootScreenScaffold.fullBleed',
        'bodyGeometry': 'full-bleed',
        'topEdge': 'header-owned',
      },
      declarationSource: '''
class ExampleScreen {
  Object build() => CatchRootScreenScaffold.fullBleed();
}
''',
    );

    expect(
      failures,
      contains(contains('CatchRootScreenScrollViewPlacement.headerOwned')),
    );
  });
}

const _resolvedLayoutTerminalFixture = r'''
abstract class Widget {}

abstract class StatelessWidget extends Widget {
  Widget build();
}

abstract class StatefulWidget extends Widget {
  State createState();
}

abstract class State extends Widget {
  Widget build();
}

class CatchRootScreenScaffold extends Widget {}
class CatchRouteScaffold extends Widget {}
class SizedBox extends Widget {}

class ResolvedRootScreen extends StatelessWidget {
  Widget build() => ResolvedStatefulAdapter();
}

class ResolvedStatefulAdapter extends StatefulWidget {
  State createState() => ResolvedStatefulAdapterState();
}

class ResolvedStatefulAdapterState extends State {
  Widget build() => _buildRoot();
  Widget _buildRoot() => CatchRootScreenScaffold();
}

class RegisteredDelegateScreen extends StatelessWidget {
  Widget build() => RegisteredRootOwner();
}

class RegisteredRootOwner extends Widget {}

class CatchAsyncBoundary<T> extends Widget {
  CatchAsyncBoundary({
    required Widget Function() loadingBuilder,
    required Widget Function(T) builder,
  });
}

class GenericBuilderWrapperScreen extends StatelessWidget {
  Widget build() => CatchAsyncBoundary<int>(
    loadingBuilder: () => CatchRootScreenScaffold(),
    builder: (_) => CatchRootScreenScaffold(),
  );
}

class RogueAdapterScreen extends StatelessWidget {
  Widget build() => RogueAdapter();
}

class RogueAdapter extends StatelessWidget {
  bool rogue = false;

  Widget build() => rogue
      ? CatchRootScreenScaffold()
      : SizedBox();
}

class UnresolvedAdapterScreen extends StatelessWidget {
  Widget build() => missingOwner();
}

class ExternalAdapterScreen extends StatelessWidget {
  Widget build() => Object() as dynamic;
}

class MixedFamilyScreen extends StatelessWidget {
  Widget build() => MixedFamilyAdapter();
}

class MixedFamilyAdapter extends StatelessWidget {
  Widget build() => CatchRouteScaffold();
}

class CyclicAdapterScreen extends StatelessWidget {
  Widget build() => CyclicAdapterA();
}

class CyclicAdapterA extends StatelessWidget {
  Widget build() => CyclicAdapterB();
}

class CyclicAdapterB extends StatelessWidget {
  Widget build() => CyclicAdapterA();
}
''';

Map<String, Object?> _screen() => <String, Object?>{
  'id': 'screen.fixture',
  'source': <String, Object?>{
    'file': 'lib/fixture.dart',
    'symbol': 'ExampleScreen',
  },
  'shell': <String, Object?>{
    'owner': 'consumer',
    'nestedScaffoldAllowed': false,
    'reason': 'fixture',
  },
  'topBar': <String, Object?>{
    'role': 'shell',
    'expression': 'shell-owned',
    'owner': 'AdaptiveTabScaffold',
    'reason': 'fixture',
  },
  'statePolicy': <String, Object?>{
    'requiredStates': <String>['data'],
    'owner': 'fixture',
  },
  'states': <Map<String, Object?>>[
    <String, Object?>{'kind': 'populated'},
  ],
};
