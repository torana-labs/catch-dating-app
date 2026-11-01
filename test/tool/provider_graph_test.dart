// ignore_for_file: avoid_relative_lib_imports

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../tool/architecture/provider_graph.dart';

void main() {
  test(
    'provider graph resolves providers, consumers, aliases, and mutations',
    () async {
      final root = await _fixtureRoot('''
import 'package:flutter_riverpod/experimental/mutation.dart';

@riverpod
int alpha(Ref ref) => 1;

@riverpod
int beta(Ref ref) => ref.watch(alphaProvider);

final manualProvider =
    FutureProvider.autoDispose.family<int, int>((ref, id) async => id);
final legacyProvider = manualProvider;

class Controller {
  static final saveMutation = Mutation<void>();
}

class Screen {
  void build(WidgetRef ref) {
    ref.watch(betaProvider);
    ref.watch(Controller.saveMutation);
  }
}
''');
      addTearDown(() => root.delete(recursive: true));

      final graph = await buildProviderGraph(root);

      expect(
        graph.providers.map((provider) => provider.name),
        containsAll([
          'alphaProvider',
          'betaProvider',
          'manualProvider',
          'legacyProvider',
        ]),
      );
      expect(graph.mutations.single.name, 'Controller.saveMutation');
      expect(
        graph.providerEdges,
        contains(
          isA<ProviderGraphEdge>()
              .having((edge) => edge.source, 'source', 'betaProvider')
              .having((edge) => edge.target, 'target', 'alphaProvider'),
        ),
      );
      expect(
        graph.consumerEdges,
        contains(
          isA<ProviderGraphEdge>()
              .having((edge) => edge.source, 'source', contains('Screen.build'))
              .having((edge) => edge.target, 'target', 'betaProvider'),
        ),
      );
      expect(graph.mutationEdges.single.target, 'Controller.saveMutation');
      expect(graph.unresolvedInsideProviders, isEmpty);
    },
  );

  test(
    'provider graph check failures match cycles and unresolved provider refs',
    () async {
      final root = await _fixtureRoot('''
@riverpod
int first(Ref ref) => ref.watch(secondProvider);

@riverpod
int second(Ref ref) {
  ref.watch(firstProvider);
  ref.watch(dynamicDependency);
  return 2;
}
''');
      addTearDown(() => root.delete(recursive: true));

      final graph = await buildProviderGraph(root);
      final failures = providerGraphCheckFailures(graph);

      expect(graph.reactiveCycles, [
        ['firstProvider', 'secondProvider'],
      ]);
      expect(graph.unresolvedInsideProviders, hasLength(1));
      expect(
        graph.unresolvedInsideProviders.single['reference'],
        'dynamicDependency',
      );
      expect(
        failures,
        contains('reactive cycle firstProvider -> secondProvider'),
      );
      expect(
        failures,
        contains(contains('unresolved provider ref secondProvider')),
      );
      expect(graph.isHealthy, isFalse);
      expect(failures, isNotEmpty);
    },
  );

  test(
    'provider graph honors literal function and class name overrides',
    () async {
      final root = await _fixtureRoot('''
@Riverpod(keepAlive: true, name: 'availableProvider')
bool capability(Ref ref) => true;

@Riverpod(name: r'customControllerProvider')
class Controller extends _\$Controller {
  int build() => ref.watch(availableProvider) ? 1 : 0;
}

@Riverpod(name: null)
int inferred(Ref ref) => ref.watch(customControllerProvider);

@Riverpod(name: null)
class DefaultController extends _\$DefaultController {
  int build() => ref.watch(inferredProvider);
}
''');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.providers.map((node) => node.name),
        unorderedEquals([
          'availableProvider',
          'customControllerProvider',
          'inferredProvider',
          'defaultControllerProvider',
        ]),
      );
      expect(
        graph.providers
            .singleWhere((node) => node.name == 'availableProvider')
            .keepAlive,
        isTrue,
      );
      expect(
        graph.providerEdges.map((edge) => (edge.source, edge.target)),
        unorderedEquals([
          ('customControllerProvider', 'availableProvider'),
          ('inferredProvider', 'customControllerProvider'),
          ('defaultControllerProvider', 'inferredProvider'),
        ]),
      );
      expect(graph.danglingProviderTargets, isEmpty);
      expect(graph.unresolvedInsideProviders, isEmpty);
    },
  );

  test(
    'custom provider names retain cycle and dangling target detection',
    () async {
      final root = await _fixtureRoot('''
@Riverpod(name: 'renamedFirstProvider')
int first(Ref ref) => ref.watch(renamedSecondProvider);

@Riverpod(name: 'renamedSecondProvider')
class Second extends _\$Second {
  int build() {
    ref.watch(renamedFirstProvider);
    return ref.watch(missingProvider);
  }
}
''');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(graph.reactiveCycles, [
        ['renamedFirstProvider', 'renamedSecondProvider'],
      ]);
      expect(graph.danglingProviderTargets, ['missingProvider']);
      expect(
        providerGraphCheckFailures(graph),
        containsAll([
          'reactive cycle renamedFirstProvider -> renamedSecondProvider',
          'dangling target missingProvider',
        ]),
      );
      expect(graph.isHealthy, isFalse);
    },
  );

  for (final nameExpression in [
    'customName',
    "'custom' + 'Provider'",
    r"'custom${suffix}Provider'",
  ]) {
    for (final declaration in [
      'int sample(Ref ref) => 1;',
      'class Sample { int build() => 1; }',
    ]) {
      test(
        'provider name expression fails closed: $nameExpression $declaration',
        () async {
          final root = await _fixtureRoot('''
@Riverpod(name: $nameExpression)
$declaration
''');
          addTearDown(() => root.delete(recursive: true));
          await expectLater(
            buildProviderGraph(root),
            throwsA(
              isA<FormatException>().having(
                (error) => error.message,
                'source location',
                contains(
                  'Unsupported Riverpod name at lib/sample/data/fixture.dart:1',
                ),
              ),
            ),
          );
        },
      );
    }
  }

  test('provider graph JSON and summary are deterministic', () async {
    final root = await _fixtureRoot('''
@riverpod
int sample(Ref ref) => 1;
''');
    addTearDown(() => root.delete(recursive: true));

    final graph = await buildProviderGraph(root);
    final first = renderProviderGraphJson(graph.toJson());
    final second = renderProviderGraphJson(
      (await buildProviderGraph(root)).toJson(),
    );
    final summary = renderProviderGraphJson(providerGraphSummaryPayload(graph));

    expect(second, first);
    expect(first.endsWith('\n'), isTrue);
    expect(summary.endsWith('\n'), isTrue);
    expect(jsonDecode(first), isA<Map<String, Object?>>());
    expect(
      (jsonDecode(first) as Map<String, Object?>)['schemaVersion'],
      providerGraphSchemaVersion,
    );
    expect(
      (jsonDecode(summary) as Map<String, Object?>)['health'],
      graph.health,
    );
  });

  test('provider graph CLI rejects retired and conflicting output flags', () {
    expect(
      () => parseProviderGraphCliOptions(['--write']),
      throwsFormatException,
    );
    expect(
      () => parseProviderGraphCliOptions(['--json', '--summary']),
      throwsFormatException,
    );
    expect(() => parseProviderGraphCliOptions([]), throwsFormatException);
    expect(
      () => parseProviderGraphCliOptions(['--root']),
      throwsFormatException,
    );

    final options = parseProviderGraphCliOptions([
      '--check',
      '--summary',
      '--root',
      '/tmp/provider-root',
    ]);
    expect(options.check, isTrue);
    expect(options.summary, isTrue);
    expect(options.json, isFalse);
    expect(options.root.path, '/tmp/provider-root');
  });

  test(
    'provider graph requires current architecture review decisions',
    () async {
      final root = await _fixtureRoot('''
final lookupProvider =
    FutureProvider.autoDispose.family<int, int>((ref, id) async => id);
''');
      addTearDown(() => root.delete(recursive: true));

      final unreviewed = await buildProviderGraph(root);
      expect(unreviewed.unreviewedCandidateIds, [
        'manual-provider:lookupProvider',
      ]);
      expect(
        providerGraphCheckFailures(unreviewed),
        contains(
          'unreviewed architecture candidate manual-provider:lookupProvider',
        ),
      );

      final reviewFile = File('${root.path}/lib/sample/review_notes.dart');
      await reviewFile.parent.create(recursive: true);
      await reviewFile.writeAsString('''
// provider-graph: manual-provider:lookupProvider planned TEST-DEBT-001 -- Known fixture debt.
''');
      final reviewed = await buildProviderGraph(root);
      expect(reviewed.unreviewedCandidateIds, isEmpty);
      expect(reviewed.staleReviewIds, isEmpty);
      expect(providerGraphCheckFailures(reviewed), isEmpty);

      await reviewFile.writeAsString('''
// provider-graph: manual-provider:lookupProvider planned TEST-DEBT-001 -- Known fixture debt.
// provider-graph: stale:decision accepted -- No matching candidate.
''');
      final stale = await buildProviderGraph(root);
      expect(stale.staleReviewIds, ['stale:decision']);
      expect(
        providerGraphCheckFailures(stale),
        contains('stale architecture review stale:decision'),
      );
    },
  );

  test(
    'provider graph rejects planned reviews without stable debt ids',
    () async {
      final root = await _fixtureRoot('''
final lookupProvider =
    FutureProvider.autoDispose.family<int, int>((ref, id) async => id);
''');
      addTearDown(() => root.delete(recursive: true));

      final reviewFile = File('${root.path}/lib/sample/review_notes.dart');
      await reviewFile.parent.create(recursive: true);
      await reviewFile.writeAsString('''
// provider-graph: manual-provider:lookupProvider planned -- Missing debt id.
''');

      await expectLater(
        buildProviderGraph(root),
        throwsA(
          isA<FormatException>().having(
            (error) => error.message,
            'message',
            contains('needs a stable debtId'),
          ),
        ),
      );
    },
  );

  test(
    'ownership graph follows imported ancestry without name collisions',
    () async {
      final root = await _fixtureRoot(r'''
import '../data/base.dart' as legacy show LegacyBase;
import '../data/collision.dart' as other;
class Actual extends legacy.LegacyBase {}
class WidgetInControllerFile extends ConsumerWidget {
  void build() { ref.read(itemsRepositoryProvider); }
}
''', path: 'lib/sample/presentation/owners_controller.dart');
      addTearDown(() => root.delete(recursive: true));
      await File(
        '${root.path}/lib/sample/data/base.dart',
      ).parent.create(recursive: true);
      await File(
        '${root.path}/lib/sample/data/base.dart',
      ).writeAsString('abstract class LegacyBase extends ChangeNotifier {}');
      await File(
        '${root.path}/lib/sample/data/collision.dart',
      ).writeAsString('class ConsumerWidget {} class LegacyBase {}');
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-listenable')
            .map((c) => c.symbol),
        unorderedEquals(['Actual', 'LegacyBase']),
      );
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-widget-repository')
            .single
            .symbol,
        'WidgetInControllerFile.build',
      );
    },
  );

  test(
    'ownership graph recognizes named construction and generated wrappers',
    () async {
      final root = await _fixtureRoot(r'''
class Legacy extends ChangeNotifier { Legacy.named(); }
class ItemsRepository { ItemsRepository.named(); static String format() => ''; }
@riverpod
Legacy wrapped(Ref ref) { Legacy.named(); return Legacy.named(); }
@riverpod
class GeneratedOwner extends _$GeneratedOwner {
  void build() {}
  void execute() { ItemsRepository.named(); ItemsRepository.format(); formatRepository(); }
}
''', path: 'lib/sample/presentation/owners_controller.dart');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      final wrapper = graph.candidates.singleWhere(
        (c) => c.kind == 'ownership-listenable-wrapper',
      );
      expect(wrapper.symbol, 'wrappedProvider');
      expect(wrapper.metric, 2);
      final construction = graph.candidates.singleWhere(
        (c) => c.kind == 'ownership-repository-construction',
      );
      expect(construction.operation, 'construct:ItemsRepository');
      expect(construction.metric, 1);
    },
  );

  test(
    'ownership graph separates factories and mechanics from business edges',
    () async {
      final root = await _fixtureRoot(r'''
class ItemsRepository {}
@riverpod
ItemsRepository itemsRepository(Ref ref) => ItemsRepository();
@riverpod
class Rows extends _$Rows {
  Future<List<String>> build() async => ref.watch(itemsRepositoryProvider).rows();
}
class EffectsService { void run() { ItemsRepository(); } }
class PureView extends StatelessWidget { void build() {} }
class LocalState extends State<PureView> {
  final text = TextEditingController();
  Future<void> animate() async { await Future<void>.delayed(Duration.zero); setState(() {}); }
}
class FencedView extends ConsumerWidget {
  bool build() => ref.read(firebaseAuthProvider).currentUser != null;
}
// class Fake extends ChangeNotifier { void run() { ItemsRepository(); } }
const example = 'class Fake extends ChangeNotifier {}';
''', path: 'lib/sample/presentation/owners_controller.dart');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates.where((c) => c.kind.startsWith('ownership-')),
        isEmpty,
      );
      expect(providerGraphCheckFailures(graph), isEmpty);
    },
  );

  test(
    'ownership graph detects aliases SDK access and delegated async callbacks',
    () async {
      final root = await _fixtureRoot(r'''
class Screen extends ConsumerStatefulWidget {
  final Future<void> Function() onSave;
}
class BusinessState extends ConsumerState<Screen> {
  Future<void> save() async {
    final controller = ref.read(itemsControllerProvider.notifier);
    await controller.submit();
    setState(() => _pending = false);
  }
  Future<void> callback() async { await widget.onSave.call(); setState(() {}); }
  Future<void> nullableCallback() async { await widget.onSave!(); setState(() {}); }
  Future<void> run(Future<void> Function() action) async { await action(); setState(() {}); }
  void backend() { ref.read(firebaseFunctionsProvider); }
}
''', path: 'lib/sample/presentation/owners_controller.dart');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-widget-async')
            .single
            .operation,
        'await:itemsControllerProvider.submit',
      );
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-widget-async-callback')
            .map((c) => c.operation),
        unorderedEquals([
          'await:widget.onSave',
          'await:widget.onSave',
          'await:action',
        ]),
      );
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-widget-backend')
            .single
            .symbol,
        'BusinessState.backend',
      );
    },
  );

  test(
    'ownership reviews reject new symbols same-count swaps and added callsites',
    () async {
      const path = 'lib/sample/presentation/owners_controller.dart';
      final root = await _fixtureRoot(
        'class Existing extends ChangeNotifier {}',
        path: path,
      );
      addTearDown(() => root.delete(recursive: true));
      var graph = await buildProviderGraph(root);
      await _reviewOwnership(root, graph, status: 'planned');
      expect(
        providerGraphCheckFailures(await buildProviderGraph(root)),
        isEmpty,
      );
      await _replaceCode(
        root,
        path,
        'class Replacement extends ChangeNotifier {}',
      );
      graph = await buildProviderGraph(root);
      expect(graph.unreviewedCandidateIds, hasLength(1));
      expect(graph.staleReviewIds, hasLength(1));
      await _replaceCode(
        root,
        path,
        'class Existing extends ChangeNotifier {} class Additional extends ChangeNotifier {}',
      );
      graph = await buildProviderGraph(root);
      expect(graph.unreviewedCandidateIds.single, contains('#Additional:'));

      await File('${root.path}/$path').writeAsString(
        r'@riverpod class Owner extends _$Owner { void build() {} void save() { ItemsRepository(); } }',
      );
      graph = await buildProviderGraph(root);
      await _reviewOwnership(root, graph, status: 'planned');
      await _replaceCode(
        root,
        path,
        r'@riverpod class Owner extends _$Owner { void build() {} void save() { ItemsRepository(); ItemsRepository(); } }',
      );
      graph = await buildProviderGraph(root);
      expect(
        graph.unreviewedCandidateIds.single,
        contains('#Owner.save:construct:ItemsRepository'),
      );
      expect(graph.candidates.single.metric, 2);
    },
  );

  test(
    'framework Listenable exceptions are exact reviewed decisions',
    () async {
      final root = await _fixtureRoot(
        'class RouterBridge extends ChangeNotifier {}',
      );
      addTearDown(() => root.delete(recursive: true));
      var graph = await buildProviderGraph(root);
      expect(graph.unreviewedCandidateIds, isNotEmpty);
      await _reviewOwnership(root, graph, status: 'accepted-exception');
      graph = await buildProviderGraph(root);
      expect(graph.isHealthy, isTrue);
      // A review reads against the file that holds it.
      final source = File('${root.path}/${graph.candidates.first.path}');
      final review = (await source.readAsLines()).first;
      await source.writeAsString(
        (await source.readAsString()).replaceFirst('$review\n', ''),
      );
      await File(
        '${root.path}/lib/sample/other.dart',
      ).writeAsString('$review\n');
      final moved = await buildProviderGraph(root);
      expect(moved.unreviewedCandidateIds, isNotEmpty);
      expect(moved.staleReviewIds, isNotEmpty);
    },
  );

  test(
    'prefixed manual families retain declaration and wrapper identity',
    () async {
      final root = await _fixtureRoot(r'''
import 'package:flutter_riverpod/flutter_riverpod.dart' as rp;
class Legacy extends ChangeNotifier {}
final legacyProvider = rp.Provider.autoDispose.family<Legacy, String>((ref, key) => Legacy());
''');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(graph.providers.single.kind, 'manual');
      expect(graph.providers.single.isFamily, isTrue);
      expect(
        graph.candidates.map((c) => c.kind),
        containsAll([
          'manual-provider',
          'ownership-listenable',
          'ownership-listenable-wrapper',
        ]),
      );
    },
  );

  test(
    'wrapped future operations cannot swap commands behind an unchanged count',
    () async {
      const path = 'lib/sample/presentation/owners_controller.dart';
      String source(String command) =>
          '''
class BusinessState extends ConsumerState<Screen> {
  Future<void> save() async {
    await Future.wait([ref.read(itemsControllerProvider.notifier).$command()]);
    setState(() {});
  }
}
''';
      final root = await _fixtureRoot(source('submit'), path: path);
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates.single.operation,
        'await:itemsControllerProvider.submit',
      );
      await _reviewOwnership(root, graph, status: 'watch');
      await _replaceCode(root, path, source('delete'));
      final swapped = await buildProviderGraph(root);
      expect(swapped.unreviewedCandidateIds.single, contains('.delete'));
      expect(swapped.staleReviewIds.single, contains('.submit'));
    },
  );

  test(
    'generated function result types expose factory-returned Listenables',
    () async {
      final root = await _fixtureRoot(r'''
class Legacy extends ChangeNotifier { static Legacy create() => Legacy(); }
@riverpod
Legacy wrapped(Ref ref) => Legacy.create();
''');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      final wrapper = graph.candidates.singleWhere(
        (c) => c.kind == 'ownership-listenable-wrapper',
      );
      expect(wrapper.operation, 'return-type:Legacy');
    },
  );

  test(
    'widget provider futures preserve direct and aliased read identity',
    () async {
      final root = await _fixtureRoot(r'''
class ViewState extends ConsumerState<Screen> {
  Future<void> direct() async { final rows = await ref.read(rowsProvider.future); setState(() {}); }
  Future<void> alias() async { final request = ref.read(rowsProvider.future); final rows = await request; setState(() {}); }
}
''', path: 'lib/sample/presentation/owners_controller.dart');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates.map((c) => c.operation),
        unorderedEquals([
          'await:rowsProvider.future',
          'await:rowsProvider.future',
        ]),
      );
    },
  );

  test(
    'URI part extensions keep widget responsibility and exact operation',
    () async {
      final root = await _fixtureRoot(r'''
part 'body.dart';
class PageState extends ConsumerState<Screen> {}
''', path: 'lib/sample/presentation/page.dart');
      addTearDown(() => root.delete(recursive: true));
      await File(
        '${root.path}/lib/sample/presentation/body.dart',
      ).writeAsString(r'''
part of 'page.dart';
extension PageBody on PageState {
  void open() { ItemsRepository.named(); ref.read(firebaseFunctionsProvider); }
}
''');
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates.map((c) => c.kind),
        containsAll([
          'ownership-repository-construction',
          'ownership-widget-backend',
        ]),
      );
      expect(graph.candidates.map((c) => c.path).toSet(), {
        'lib/sample/presentation/body.dart',
      });
      expect(graph.candidates.map((c) => c.symbol).toSet(), {'PageBody.open'});
    },
  );

  test(
    'class and local manual providers cannot inherit top-level shadow names',
    () async {
      final root = await _fixtureRoot(r'''
final legacyProvider = Provider<int>((ref) => 1);
class AnotherOwner {
  static final legacyProvider = Provider<int>((ref) => 2);
  void build() { final legacyProvider = Provider<int>((ref) => 3); }
}
''');
      addTearDown(() => root.delete(recursive: true));
      final graph = await buildProviderGraph(root);
      expect(
        graph.candidates
            .where((c) => c.kind == 'ownership-manual-provider')
            .map((c) => c.symbol),
        unorderedEquals([
          'AnotherOwner.legacyProvider',
          'AnotherOwner.build.legacyProvider',
        ]),
      );
      expect(
        graph.unreviewedCandidateIds.where(
          (id) => id.startsWith('ownership-manual-provider:'),
        ),
        hasLength(2),
      );
    },
  );

  test(
    'provider graph fails closed on empty handwritten source roots',
    () async {
      final root = await Directory.systemTemp.createTemp('empty_graph_');
      addTearDown(() => root.delete(recursive: true));
      await Directory('${root.path}/lib').create();
      await File('${root.path}/lib/only.g.dart').writeAsString('generated');
      await expectLater(buildProviderGraph(root), throwsStateError);
    },
  );
}

Future<Directory> _fixtureRoot(
  String source, {
  String path = 'lib/sample/data/fixture.dart',
}) async {
  final root = await Directory.systemTemp.createTemp('provider_graph_test_');
  final file = File('${root.path}/$path');
  await file.parent.create(recursive: true);
  await file.writeAsString(source);
  return root;
}

/// Changes the code in a reviewed file and leaves its review comments in place.
Future<void> _replaceCode(Directory root, String path, String code) async {
  final file = File('${root.path}/$path');
  final reviews = RegExp(
    r'^// provider-graph:.*\n',
    multiLine: true,
  ).allMatches(await file.readAsString()).map((match) => match[0]).join();
  await file.writeAsString('$reviews$code');
}

Future<void> _reviewOwnership(
  Directory root,
  ProviderGraph graph, {
  required String status,
}) async {
  final debt = status == 'planned' ? ' CAT156' : '';
  final byPath = <String, List<ArchitectureCandidate>>{};
  for (final candidate in graph.candidates) {
    byPath.putIfAbsent(candidate.path!, () => []).add(candidate);
  }
  for (final MapEntry(key: path, value: candidates) in byPath.entries) {
    final file = File('${root.path}/$path');
    final reviews = candidates
        .map((candidate) {
          final key = candidate.id.replaceFirst('$path#', '');
          final max = candidate.metric ?? 1;
          return '// provider-graph: $key $status$debt max=$max -- '
              'Exact fixture responsibility reviewed.';
        })
        .join('\n');
    final source = (await file.readAsString()).replaceAll(
      RegExp(r'^// provider-graph:.*\n', multiLine: true),
      '',
    );
    await file.writeAsString('$reviews\n$source');
  }
}
