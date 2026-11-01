import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:catch_ui_lints/src/architecture_findings.dart';
import 'package:catch_ui_lints/src/architecture_provider_free.dart';
import 'package:flutter_test/flutter_test.dart';

int _findings(String path, String source) => providerFreeFindings(
  relativePath: path,
  source: source,
  unit: parseString(content: source, throwIfDiagnostics: false).unit,
).where((f) => f.code == ArchitectureCodes.providerFreeBoundary).length;

void main() {
  const marked = 'lib/explore/presentation/widgets/explore_body.dart';
  const marker = '// architecture: provider-free\n';

  test('only state files, parts and marked files make the promise', () {
    const source = "import 'package:go_router/go_router.dart';\n";
    expect(_findings(marked, source), 0);
    expect(_findings(marked, '$marker$source'), 1);
    expect(_findings('lib/events/presentation/e_state.dart', source), 1);
    expect(_findings('lib/contexts/events/parts/row.dart', source), 1);
    // Screens named *_empty_state.dart are widgets, not display adapters.
    expect(
      _findings('lib/events/presentation/no_events_empty_state.dart', source),
      0,
    );
    // App destinations count as presentation.
    expect(_findings('apps/host/lib/today/today_state.dart', source), 1);
  });

  test('flags provider, routing, data and repository imports', () {
    for (final uri in const [
      'package:flutter_riverpod/flutter_riverpod.dart',
      'package:hooks_riverpod/hooks_riverpod.dart',
      'package:riverpod_annotation/riverpod_annotation.dart',
      'package:go_router/go_router.dart',
      'package:catch_dating_app/routing/go_router.dart',
      'package:catch_dating_app/events/data/event_repository.dart',
      // The old path regex stopped matching data folders after the context move.
      'package:catch_dating_app/contexts/events/data/event_dtos.dart',
      'package:catch_dating_app/contexts/events/domain/event_repository_types.dart',
    ]) {
      expect(_findings(marked, "$marker import '$uri';\n"), 1, reason: uri);
    }
    expect(
      _findings(
        'lib/sample/presentation/a.dart',
        "$marker import '../../routing/go_router.dart';\n",
      ),
      1,
    );
  });

  test('allows domain models, presentation helpers and Flutter', () {
    expect(
      _findings(marked, '''
$marker
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/explore/presentation/explore_state.dart';
import 'package:flutter/widgets.dart';
class Body extends StatelessWidget { const Body({super.key, required this.onTap}); final VoidCallback onTap; }
'''),
      0,
    );
  });

  test('flags Riverpod and navigation APIs in code only', () {
    for (final source in const [
      'class A extends ConsumerWidget {}',
      'class A extends ConsumerStatefulWidget {}',
      'void a(WidgetRef r) {}',
      'final s = ProviderScope(child: x);',
      'void a(Ref<int> r) {}',
      'void a(Ref ref) {}',
      'void a(dynamic ref) => ref.watch(p);',
      'void a(dynamic ref) => ref.invalidate(p);',
      'final GoRouter r = x;',
      'final GoRoute r = x;',
      'void a(dynamic context) => context.go(x);',
      'void a(dynamic context) => context.push(x);',
      'void a(dynamic context) => context.pop();',
    ]) {
      expect(_findings(marked, '$marker$source\n'), 1, reason: source);
    }
    expect(
      _findings(marked, """
$marker
// ref.watch(p) and context.go(x) in a comment
final text = 'WidgetRef ref.watch(p) GoRouter';
"""),
      0,
    );
  });

  test('state files and parts leave Riverpod to their own rules', () {
    for (final path in const [
      'lib/events/presentation/e_state.dart',
      'lib/contexts/events/parts/row.dart',
    ]) {
      expect(
        _findings(
          path,
          "import 'package:flutter_riverpod/flutter_riverpod.dart';\n",
        ),
        0,
        reason: path,
      );
      expect(
        _findings(path, 'void a(dynamic ref) => ref.watch(p);\n'),
        0,
        reason: path,
      );
    }
  });
}
