import 'package:analyzer/dart/ast/ast.dart';

import 'architecture_findings.dart';

final _marker = RegExp(
  r'^\s*//\s*architecture:\s*provider-free\b',
  multiLine: true,
);

const _reason =
    'Provider-free files take values and callbacks: no Riverpod, routing, data-layer or repository access.';

const _riverpodTypes = <String>{
  'ConsumerWidget',
  'ConsumerStatefulWidget',
  'WidgetRef',
  'ProviderScope',
};

const _refCalls = <String>{'watch', 'read', 'listen', 'invalidate'};
const _navigationCalls = <String>{'go', 'push', 'replace', 'pop'};

final _riverpodImport = RegExp(
  r'^package:(?:flutter_riverpod|hooks_riverpod|riverpod_annotation)(?:/|$)',
);
final _forbiddenImport = RegExp(
  r'^package:go_router(?:/|$)'
  r'|^package:catch_dating_app/routing/'
  r'|^package:catch_dating_app/(?:contexts/[^/]+|[^/]+)/data/'
  r'|^package:catch_dating_app/.*repository',
);

/// Files that promise to stay provider-free: display-state adapters by name,
/// context parts by folder, and anything marked `// architecture: provider-free`.
/// The promise is stated by the file, so it moves with the file.
List<ArchitectureFinding> providerFreeFindings({
  required String relativePath,
  required String source,
  required CompilationUnit unit,
}) {
  final layer = placeSource(relativePath)?.layer;
  final isStateFile =
      layer == 'presentation' &&
      relativePath.endsWith('_state.dart') &&
      !relativePath.endsWith('_empty_state.dart');
  final isParts = layer == 'parts';
  final isMarked = _marker.hasMatch(source);
  if (!isStateFile && !isParts && !isMarked) return const [];
  // Those rules already cover Riverpod imports and ref reads in these files.
  final coveredElsewhere =
      layer == 'parts' ||
      (layer == 'presentation' && relativePath.endsWith('_state.dart'));

  final findings = <ArchitectureFinding>[];
  void add(int offset, int length) => findings.add(
    ArchitectureFinding(
      ArchitectureCodes.providerFreeBoundary,
      offset,
      length,
      _reason,
    ),
  );

  for (final (:uri, :node) in importUris(unit)) {
    final target = resolveAppImport(relativePath, uri);
    if (_forbiddenImport.hasMatch(target) ||
        (!coveredElsewhere && _riverpodImport.hasMatch(target))) {
      add(node.offset, node.length);
    }
  }

  var token = unit.beginToken;
  while (!token.isEof) {
    final next = token.next!;
    final lexeme = token.lexeme;
    final isRefRead =
        !coveredElsewhere &&
        lexeme == 'ref' &&
        next.lexeme == '.' &&
        _refCalls.contains(next.next!.lexeme) &&
        next.next!.next!.lexeme == '(';
    final isNavigation =
        lexeme == 'context' &&
        next.lexeme == '.' &&
        _navigationCalls.contains(next.next!.lexeme) &&
        next.next!.next!.lexeme == '(';
    if (_riverpodTypes.contains(lexeme) ||
        (lexeme == 'Ref' && (next.lexeme == '<' || next.lexeme == 'ref')) ||
        lexeme == 'GoRouter' ||
        lexeme == 'GoRoute' ||
        isRefRead ||
        isNavigation) {
      add(token.offset, token.length);
    }
    token = next;
  }
  return findings;
}
