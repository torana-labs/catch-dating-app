import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

const providerGraphSchemaVersion = 3;

const _providerConstructors = <String>{
  'Provider',
  'FutureProvider',
  'StreamProvider',
  'StateProvider',
  'NotifierProvider',
  'AsyncNotifierProvider',
  'StreamNotifierProvider',
  'ChangeNotifierProvider',
  'StateNotifierProvider',
};
const _refOperations = <String>{
  'watch',
  'read',
  'listen',
  'listenManual',
  'invalidate',
  'refresh',
};
const _reactiveOperations = <String>{'watch', 'listen', 'listenManual'};
final _providerReferencePattern = RegExp(
  r'\b([A-Za-z_][A-Za-z0-9_]*Provider)\b',
);
final _mutationReferencePattern = RegExp(
  r'\b([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\b',
);

final class ProviderGraphNode {
  const ProviderGraphNode({
    required this.name,
    required this.kind,
    required this.path,
    required this.line,
    required this.feature,
    required this.layer,
    required this.keepAlive,
    required this.isFamily,
    required this.returnType,
    required this.start,
    required this.end,
    this.readKinds = const [],
    this.lifetimes = const ['route'],
  });

  final String name;
  final String kind;
  final String path;
  final int line;
  final String feature;
  final String layer;
  final bool keepAlive;
  final bool isFamily;
  final String? returnType;
  final int start;
  final int end;

  /// What this provider reads itself, directly or through the repository
  /// methods it calls: `listener` (`.snapshots()`), `get` (a one-shot
  /// Firestore `.get()`) and `callable` (`httpsCallable`, `callHostCrm`).
  final List<String> readKinds;

  /// The lifetimes it declares: `route`, `timed`, `session`, `keepAlive` or
  /// `manual-keepalive`.
  final List<String> lifetimes;

  String get id => 'provider:$name';

  bool get isReadOwner => readKinds.isNotEmpty;

  ProviderGraphNode withCacheFacts({
    required List<String> readKinds,
    required List<String> lifetimes,
  }) => ProviderGraphNode(
    name: name,
    kind: kind,
    path: path,
    line: line,
    feature: feature,
    layer: layer,
    keepAlive: keepAlive,
    isFamily: isFamily,
    returnType: returnType,
    start: start,
    end: end,
    readKinds: readKinds,
    lifetimes: lifetimes,
  );

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'kind': kind,
    'path': path,
    'line': line,
    'feature': feature,
    'layer': layer,
    'keepAlive': keepAlive,
    'family': isFamily,
    if (returnType != null) 'returnType': returnType,
    'readOwner': isReadOwner,
    'readKinds': readKinds,
    'lifetime': lifetimes.join('+'),
  };
}

final class MutationGraphNode {
  const MutationGraphNode({
    required this.name,
    required this.path,
    required this.line,
    required this.feature,
    required this.layer,
  });

  final String name;
  final String path;
  final int line;
  final String feature;
  final String layer;

  String get id => 'mutation:$name';

  Map<String, Object?> toJson() => {
    'id': id,
    'name': name,
    'path': path,
    'line': line,
    'feature': feature,
    'layer': layer,
  };
}

final class ConsumerGraphNode {
  const ConsumerGraphNode({
    required this.id,
    required this.owner,
    required this.path,
    required this.line,
    required this.feature,
    required this.layer,
  });

  final String id;
  final String owner;
  final String path;
  final int line;
  final String feature;
  final String layer;

  Map<String, Object?> toJson() => {
    'id': id,
    'owner': owner,
    'path': path,
    'line': line,
    'feature': feature,
    'layer': layer,
  };
}

final class ProviderGraphEdge {
  const ProviderGraphEdge({
    required this.source,
    required this.sourceKind,
    required this.target,
    required this.targetKind,
    required this.operation,
    required this.path,
    required this.line,
  });

  final String source;
  final String sourceKind;
  final String target;
  final String targetKind;
  final String operation;
  final String path;
  final int line;

  bool get isProviderEdge =>
      sourceKind == 'provider' && targetKind == 'provider';

  Map<String, Object?> toJson() => {
    'source': source,
    'sourceKind': sourceKind,
    'target': target,
    'targetKind': targetKind,
    'operation': operation,
    'path': path,
    'line': line,
  };
}

final class ArchitectureCandidate {
  const ArchitectureCandidate({
    required this.id,
    required this.kind,
    required this.severity,
    required this.subject,
    required this.reason,
    required this.recommendation,
    this.source,
    this.target,
    this.metric,
    this.path,
    this.symbol,
    this.operation,
    this.line,
  });

  final String id;
  final String kind;
  final String severity;
  final String subject;
  final String reason;
  final String recommendation;
  final String? source;
  final String? target;
  final int? metric;
  final String? path;
  final String? symbol;
  final String? operation;
  final int? line;

  Map<String, Object?> toJson(Map<String, Object?>? review) => {
    'id': id,
    'kind': kind,
    'severity': severity,
    'subject': subject,
    'reason': reason,
    'recommendation': recommendation,
    if (source != null) 'source': source,
    if (target != null) 'target': target,
    if (metric != null) 'metric': metric,
    if (path != null) 'path': path,
    if (symbol != null) 'symbol': symbol,
    if (operation != null) 'operation': operation,
    if (line != null) 'line': line,
    'review': review,
  };
}

final class ProviderGraph {
  const ProviderGraph({
    required this.sourceFiles,
    required this.providers,
    required this.mutations,
    required this.consumers,
    required this.edges,
    required this.unresolvedReferences,
    required this.duplicateProviderNames,
    required this.danglingProviderTargets,
    required this.reactiveCycles,
    required this.allOperationCycles,
    required this.candidates,
    required this.reviewDecisions,
    required this.unreviewedCandidateIds,
    required this.staleReviewIds,
    this.cacheFindings = const [],
    this.unlistedCacheFindings = const [],
    this.staleCacheBaselineEntries = const [],
  });

  final int sourceFiles;
  final List<ProviderGraphNode> providers;
  final List<MutationGraphNode> mutations;
  final List<ConsumerGraphNode> consumers;
  final List<ProviderGraphEdge> edges;
  final List<Map<String, Object?>> unresolvedReferences;
  final List<String> duplicateProviderNames;
  final List<String> danglingProviderTargets;
  final List<List<String>> reactiveCycles;
  final List<List<String>> allOperationCycles;
  final List<ArchitectureCandidate> candidates;
  final Map<String, Map<String, Object?>> reviewDecisions;
  final List<String> unreviewedCandidateIds;
  final List<String> staleReviewIds;

  /// Every screen-data caching finding, report-only (see [cacheRuleIds]).
  final List<CacheFinding> cacheFindings;

  /// Findings the committed baseline does not list: the list grew.
  final List<CacheFinding> unlistedCacheFindings;

  /// Baseline entries that no longer occur and can be deleted.
  final List<CacheFinding> staleCacheBaselineEntries;

  Iterable<ProviderGraphEdge> get providerEdges =>
      edges.where((edge) => edge.isProviderEdge);
  Iterable<ProviderGraphEdge> get consumerEdges =>
      edges.where((edge) => edge.sourceKind == 'consumer');
  Iterable<ProviderGraphEdge> get mutationEdges =>
      edges.where((edge) => edge.targetKind == 'mutation');
  List<Map<String, Object?>> get unresolvedInsideProviders =>
      unresolvedReferences
          .where((reference) => reference['sourceKind'] == 'provider')
          .toList(growable: false);

  Map<String, Object?> get summary {
    final uniquePairs = <String>{};
    final crossFeaturePairs = <String>{};
    final byName = {for (final provider in providers) provider.name: provider};
    for (final edge in providerEdges) {
      final key = '${edge.source}\u0000${edge.target}';
      if (!uniquePairs.add(key)) continue;
      final source = byName[edge.source];
      final target = byName[edge.target];
      if (source != null &&
          target != null &&
          source.feature != target.feature) {
        crossFeaturePairs.add(key);
      }
    }
    return {
      'dartSourceFiles': sourceFiles,
      'providerNodes': providers.length,
      'generatedProviderNodes': providers
          .where((provider) => provider.kind.startsWith('generated'))
          .length,
      'manualProviderNodes': providers
          .where((provider) => provider.kind == 'manual')
          .length,
      'aliasProviderNodes': providers
          .where((provider) => provider.kind == 'alias')
          .length,
      'keepAliveNodes': providers
          .where((provider) => provider.keepAlive)
          .length,
      'familyNodes': providers.where((provider) => provider.isFamily).length,
      'mutationNodes': mutations.length,
      'consumerNodes': consumers.length,
      'providerToProviderCallsites': providerEdges.length,
      'uniqueProviderToProviderPairs': uniquePairs.length,
      'uniqueCrossFeatureProviderPairs': crossFeaturePairs.length,
      'consumerToStateCallsites': consumerEdges.length,
      'mutationReferenceCallsites': mutationEdges.length,
      'unresolvedRefOperations': unresolvedReferences.length,
      'unresolvedInsideProviders': unresolvedInsideProviders.length,
      'duplicateProviderNames': duplicateProviderNames.length,
      'danglingProviderTargets': danglingProviderTargets.length,
      'reactiveCycles': reactiveCycles.length,
      'allOperationCycles': allOperationCycles.length,
      'architectureCandidates': candidates.length,
      'unreviewedArchitectureCandidates': unreviewedCandidateIds.length,
      'staleArchitectureReviews': staleReviewIds.length,
      'ownershipCandidatesByKind': _countsBy(
        candidates
            .where((c) => c.kind.startsWith('ownership-'))
            .map((c) => c.kind),
      ),
      'ownershipReviewDispositions': _countsBy(
        candidates
            .where((c) => c.kind.startsWith('ownership-'))
            .map(
              (c) =>
                  reviewDecisions[c.id]?['status'] as String? ?? 'unreviewed',
            ),
      ),
      'readOwners': providers.where((provider) => provider.isReadOwner).length,
      'readOwnersByKind': _countsBy(
        providers.expand((provider) => provider.readKinds),
      ),
      'cacheFindingsByRule': {
        for (final rule in cacheRuleIds)
          rule: cacheFindings
              .where((finding) => finding.rule == rule)
              .fold<int>(0, (sum, finding) => sum + finding.count),
      },
      'unlistedCacheFindings': unlistedCacheFindings.length,
      'staleCacheBaselineEntries': staleCacheBaselineEntries.length,
    };
  }

  bool get isHealthy =>
      duplicateProviderNames.isEmpty &&
      danglingProviderTargets.isEmpty &&
      unresolvedInsideProviders.isEmpty &&
      reactiveCycles.isEmpty &&
      unreviewedCandidateIds.isEmpty &&
      staleReviewIds.isEmpty &&
      unlistedCacheFindings.isEmpty;

  Map<String, Object?> get health => {
    'healthy': isHealthy,
    'duplicateProviderNames': duplicateProviderNames,
    'danglingProviderTargets': danglingProviderTargets,
    'unresolvedInsideProviders': unresolvedInsideProviders,
    'reactiveCycles': reactiveCycles,
    'allOperationCycles': allOperationCycles,
    'unreviewedArchitectureCandidateIds': unreviewedCandidateIds,
    'staleArchitectureReviewIds': staleReviewIds,
    'unlistedCacheFindings': [
      for (final finding in unlistedCacheFindings) finding.toJson(),
    ],
  };

  Map<String, Object?> toJson() {
    final byName = {for (final provider in providers) provider.name: provider};
    final providerEdgeList = providerEdges.toList(growable: false);
    final featurePairs = <String, int>{};
    final layerPairs = <String, int>{};
    final uniquePairs = <String>{};
    for (final edge in providerEdgeList) {
      if (!uniquePairs.add('${edge.source}\u0000${edge.target}')) continue;
      final source = byName[edge.source];
      final target = byName[edge.target];
      if (source == null || target == null) continue;
      _increment(featurePairs, '${source.feature} -> ${target.feature}');
      _increment(layerPairs, '${source.layer} -> ${target.layer}');
    }
    return {
      'schemaVersion': providerGraphSchemaVersion,
      'sourceRoots': ['lib', 'packages/platform/lib', 'apps/*/lib'],
      'summary': summary,
      'health': health,
      'providersByFeature': _countsBy(
        providers.map((provider) => provider.feature),
      ),
      'providersByLayer': _countsBy(
        providers.map((provider) => provider.layer),
      ),
      'providerEdgesByOperation': _countsBy(
        providerEdgeList.map((edge) => edge.operation),
      ),
      'consumerEdgesByOperation': _countsBy(
        consumerEdges.map((edge) => edge.operation),
      ),
      'featurePairCounts': _sortedCounts(featurePairs),
      'layerPairCounts': _sortedCounts(layerPairs),
      'topUniqueFanOut': _topDegrees(
        providerEdgeList,
        field: 'source',
        uniqueNeighbors: true,
      ),
      'topUniqueFanIn': _topDegrees(
        providerEdgeList,
        field: 'target',
        uniqueNeighbors: true,
      ),
      'features': _featureGraph(providerEdgeList),
      'architectureReview': {
        'candidates': [
          for (final candidate in candidates)
            candidate.toJson(reviewDecisions[candidate.id]),
        ],
      },
      'cacheReview': {
        'mode': 'report-only',
        'baseline': cacheBaselinePath,
        'findings': [for (final finding in cacheFindings) finding.toJson()],
        'staleBaselineEntries': [
          for (final finding in staleCacheBaselineEntries) finding.toJson(),
        ],
      },
      'providers': providers.map((provider) => provider.toJson()).toList(),
      'mutations': mutations.map((mutation) => mutation.toJson()).toList(),
      'consumers': consumers.map((consumer) => consumer.toJson()).toList(),
      'providerEdges': providerEdgeList.map((edge) => edge.toJson()).toList(),
      'consumerEdges': consumerEdges.map((edge) => edge.toJson()).toList(),
      'mutationEdges': mutationEdges.map((edge) => edge.toJson()).toList(),
      'unresolvedReferences': unresolvedReferences,
    };
  }

  Map<String, Object?> _featureGraph(List<ProviderGraphEdge> providerEdgeList) {
    final byName = {for (final provider in providers) provider.name: provider};
    final names = <String>{
      ...providers.map((provider) => provider.feature),
      ...mutations.map((mutation) => mutation.feature),
      ...consumers.map((consumer) => consumer.feature),
    }.toList()..sort();
    final uniquePairs = <String>{};
    final aggregated = <String, Map<String, Object?>>{};
    for (final edge in providerEdgeList) {
      if (!uniquePairs.add('${edge.source}\u0000${edge.target}')) continue;
      final source = byName[edge.source];
      final target = byName[edge.target];
      if (source == null || target == null) continue;
      final key = '${source.feature}\u0000${target.feature}';
      final item = aggregated.putIfAbsent(
        key,
        () => {
          'source': source.feature,
          'target': target.feature,
          'uniqueProviderPairs': 0,
        },
      );
      item['uniqueProviderPairs'] = (item['uniqueProviderPairs'] as int) + 1;
    }
    final graphEdges = aggregated.values.toList()
      ..sort((a, b) {
        final source = (a['source'] as String).compareTo(b['source'] as String);
        if (source != 0) return source;
        return (a['target'] as String).compareTo(b['target'] as String);
      });
    return {
      'nodes': [
        for (final name in names)
          {
            'id': name,
            'providers': providers
                .where((provider) => provider.feature == name)
                .length,
            'mutations': mutations
                .where((mutation) => mutation.feature == name)
                .length,
            'consumers': consumers
                .where((consumer) => consumer.feature == name)
                .length,
          },
      ],
      'edges': graphEdges,
    };
  }
}

final class _ScannedFile {
  const _ScannedFile({
    required this.path,
    required this.unit,
    required this.lineFor,
    required this.providers,
    required this.lines,
  });

  final String path;
  final CompilationUnit unit;
  final int Function(int offset) lineFor;
  final List<ProviderGraphNode> providers;
  final List<String> lines;
}

Future<ProviderGraph> buildProviderGraph(Directory root) async {
  final absoluteRoot = root.absolute;
  final lib = Directory('${absoluteRoot.path}/lib');
  if (!lib.existsSync()) {
    throw StateError('Expected a lib directory under ${absoluteRoot.path}.');
  }
  final apps = Directory('${absoluteRoot.path}/apps');
  final platform = Directory('${absoluteRoot.path}/packages/platform/lib');
  final sourceRoots = [
    lib,
    if (platform.existsSync()) platform,
    if (apps.existsSync())
      for (final app in apps.listSync().whereType<Directory>())
        if (Directory('${app.path}/lib').existsSync())
          Directory('${app.path}/lib'),
  ];
  final files = [
    for (final sourceRoot in sourceRoots)
      ...sourceRoot
          .listSync(recursive: true, followLinks: false)
          .whereType<File>()
          .where(
            (file) =>
                file.path.endsWith('.dart') &&
                !file.path.endsWith('.g.dart') &&
                !file.path.endsWith('.freezed.dart'),
          ),
  ];
  files.sort((a, b) => a.path.compareTo(b.path));
  if (files.isEmpty) {
    throw StateError(
      'Provider graph cannot pass without handwritten lib Dart.',
    );
  }

  final providers = <ProviderGraphNode>[];
  final mutations = <MutationGraphNode>[];
  final scannedFiles = <_ScannedFile>[];
  final aliasEdges = <ProviderGraphEdge>[];

  for (final file in files) {
    final relativePath = _relativePath(absoluteRoot.path, file.path);
    final content = await file.readAsString();
    final parseResult = parseString(
      content: content,
      path: file.path,
      throwIfDiagnostics: false,
    );
    int lineFor(int offset) =>
        parseResult.lineInfo.getLocation(offset).lineNumber;
    final fileProviders = <ProviderGraphNode>[];

    for (final declaration in parseResult.unit.declarations) {
      if (declaration is FunctionDeclaration &&
          _hasRiverpodAnnotation(declaration.metadata)) {
        final parameterCount =
            declaration.functionExpression.parameters?.parameters.length ?? 0;
        fileProviders.add(
          ProviderGraphNode(
            name: _generatedProviderName(
              declaration.metadata,
              '${declaration.name.lexeme}Provider',
              relativePath,
              lineFor,
            ),
            kind: 'generated-function',
            path: relativePath,
            line: lineFor(declaration.offset),
            feature: _featureFor(relativePath),
            layer: _layerFor(relativePath),
            keepAlive: _isKeepAlive(declaration.metadata),
            isFamily: parameterCount > 1,
            returnType: declaration.returnType?.toSource(),
            start: declaration.offset,
            end: declaration.end,
          ),
        );
      } else if (declaration is ClassDeclaration &&
          _hasRiverpodAnnotation(declaration.metadata)) {
        final className = declaration.namePart.typeName.lexeme;
        final buildMethod = declaration.body.members
            .whereType<MethodDeclaration>()
            .where((method) => method.name.lexeme == 'build')
            .firstOrNull;
        fileProviders.add(
          ProviderGraphNode(
            name: _generatedProviderName(
              declaration.metadata,
              '${_lowerCamelClassName(className)}Provider',
              relativePath,
              lineFor,
            ),
            kind: 'generated-class',
            path: relativePath,
            line: lineFor(declaration.offset),
            feature: _featureFor(relativePath),
            layer: _layerFor(relativePath),
            keepAlive: _isKeepAlive(declaration.metadata),
            isFamily: (buildMethod?.parameters?.parameters.length ?? 0) > 0,
            returnType: buildMethod?.returnType?.toSource(),
            start: declaration.offset,
            end: declaration.end,
          ),
        );
      } else if (declaration is TopLevelVariableDeclaration) {
        for (final variable in declaration.variables.variables) {
          final name = variable.name.lexeme;
          final initializer = variable.initializer;
          if (initializer == null || !name.endsWith('Provider')) continue;
          final source = initializer.toSource().trim();
          final parts = source.split(RegExp(r'[<(]')).first.split('.');
          final first = parts.first;
          final prefixes = parseResult.unit.directives
              .whereType<ImportDirective>()
              .where(
                (import) => RegExp(
                  r'^package:(?:flutter_riverpod|hooks_riverpod|riverpod)/',
                ).hasMatch(import.uri.stringValue ?? ''),
              )
              .map((import) => import.prefix?.name)
              .whereType<String>()
              .toSet();
          final constructor = prefixes.contains(first) && parts.length > 1
              ? parts[1]
              : first;
          final isManual = _providerConstructors.contains(constructor);
          final isAlias = RegExp(
            r'^[A-Za-z_][A-Za-z0-9_]*Provider$',
          ).hasMatch(source);
          if (!isManual && !isAlias) continue;
          fileProviders.add(
            ProviderGraphNode(
              name: name,
              kind: isAlias ? 'alias' : 'manual',
              path: relativePath,
              line: lineFor(declaration.offset),
              feature: _featureFor(relativePath),
              layer: _layerFor(relativePath),
              keepAlive: isManual && !source.contains('autoDispose'),
              isFamily: source.contains('.family'),
              returnType: declaration.variables.type?.toSource(),
              start: declaration.offset,
              end: declaration.end,
            ),
          );
          if (isAlias) {
            aliasEdges.add(
              ProviderGraphEdge(
                source: name,
                sourceKind: 'provider',
                target: source,
                targetKind: 'provider',
                operation: 'alias',
                path: relativePath,
                line: lineFor(declaration.offset),
              ),
            );
          }
        }
      }
    }

    for (final declaration
        in parseResult.unit.declarations.whereType<ClassDeclaration>()) {
      final owner = declaration.namePart.typeName.lexeme;
      for (final field
          in declaration.body.members.whereType<FieldDeclaration>()) {
        for (final variable in field.fields.variables) {
          final initializer = variable.initializer?.toSource() ?? '';
          if (!RegExp(r'^Mutation(?:<|\()').hasMatch(initializer)) continue;
          mutations.add(
            MutationGraphNode(
              name: '$owner.${variable.name.lexeme}',
              path: relativePath,
              line: lineFor(variable.offset),
              feature: _featureFor(relativePath),
              layer: _layerFor(relativePath),
            ),
          );
        }
      }
    }
    providers.addAll(fileProviders);
    scannedFiles.add(
      _ScannedFile(
        path: relativePath,
        unit: parseResult.unit,
        lineFor: lineFor,
        providers: fileProviders,
        lines: content.split('\n'),
      ),
    );
  }

  providers.sort(_compareProviderNodes);
  mutations.sort((a, b) => a.name.compareTo(b.name));
  final providerNames = providers.map((provider) => provider.name).toSet();
  final mutationNames = mutations.map((mutation) => mutation.name).toSet();
  final consumers = <String, ConsumerGraphNode>{};
  final edges = <ProviderGraphEdge>[...aliasEdges];
  final unresolved = <Map<String, Object?>>[];
  for (final scanned in scannedFiles) {
    scanned.unit.accept(
      _ReferenceVisitor(
        path: scanned.path,
        lineFor: scanned.lineFor,
        fileProviders: scanned.providers,
        mutationNames: mutationNames,
        consumers: consumers,
        edges: edges,
        unresolved: unresolved,
      ),
    );
  }
  edges.sort(_compareEdges);
  final consumerList = consumers.values.toList()
    ..sort((a, b) => a.id.compareTo(b.id));
  unresolved.sort((a, b) {
    final path = (a['path'] as String).compareTo(b['path'] as String);
    return path != 0 ? path : (a['line'] as int).compareTo(b['line'] as int);
  });
  final duplicateCounts = <String, int>{};
  for (final provider in providers) {
    _increment(duplicateCounts, provider.name);
  }
  final duplicates =
      duplicateCounts.entries
          .where((entry) => entry.value > 1)
          .map((entry) => entry.key)
          .toList()
        ..sort();
  final danglingTargets =
      edges
          .where((edge) => edge.isProviderEdge)
          .where((edge) => !providerNames.contains(edge.target))
          .map((edge) => edge.target)
          .toSet()
          .toList()
        ..sort();
  final providerEdges = edges
      .where((edge) => edge.isProviderEdge)
      .toList(growable: false);
  final reactiveCycles = _stronglyConnectedComponents(
    providerEdges.where((edge) => _reactiveOperations.contains(edge.operation)),
  );
  final allCycles = _stronglyConnectedComponents(providerEdges);
  final candidates = [
    ..._architectureCandidates(providers, providerEdges),
    ..._ownershipCandidates(scannedFiles),
  ]..sort((a, b) => a.id.compareTo(b.id));
  final decisions = await _readReviewDecisions(absoluteRoot.path, files);
  final candidateIds = candidates.map((candidate) => candidate.id).toSet();
  final unreviewed =
      candidates
          .where((candidate) {
            final decision = decisions[candidate.id];
            if (decision == null) return true;
            // Ownership reviews bound the callsites they looked at.
            return candidate.kind.startsWith('ownership-') &&
                (decision['maxCallsites']! as int) < (candidate.metric ?? 1);
          })
          .map((candidate) => candidate.id)
          .toList()
        ..sort();
  final stale =
      decisions.keys.where((id) => !candidateIds.contains(id)).toList()..sort();
  final cache = _analyseCache(scannedFiles, providers, edges);
  final baseline = await readCacheBaseline(absoluteRoot);
  final cacheProviders = [
    for (final provider in providers)
      if (cache.facts[provider.name] case final facts?)
        provider.withCacheFacts(
          readKinds: facts.readKinds,
          lifetimes: facts.lifetimes,
        )
      else
        provider,
  ];
  return ProviderGraph(
    sourceFiles: files.length,
    providers: cacheProviders,
    mutations: mutations,
    consumers: consumerList,
    edges: edges,
    unresolvedReferences: unresolved,
    duplicateProviderNames: duplicates,
    danglingProviderTargets: danglingTargets,
    reactiveCycles: reactiveCycles,
    allOperationCycles: allCycles,
    candidates: candidates,
    reviewDecisions: decisions,
    unreviewedCandidateIds: unreviewed,
    staleReviewIds: stale,
    cacheFindings: cache.findings,
    unlistedCacheFindings: unlistedCacheFindings(cache.findings, baseline),
    staleCacheBaselineEntries: staleCacheBaselineEntries(
      cache.findings,
      baseline,
    ),
  );
}

final class _ReferenceVisitor extends RecursiveAstVisitor<void> {
  _ReferenceVisitor({
    required this.path,
    required this.lineFor,
    required this.fileProviders,
    required this.mutationNames,
    required this.consumers,
    required this.edges,
    required this.unresolved,
  });

  final String path;
  final int Function(int offset) lineFor;
  final List<ProviderGraphNode> fileProviders;
  final Set<String> mutationNames;
  final Map<String, ConsumerGraphNode> consumers;
  final List<ProviderGraphEdge> edges;
  final List<Map<String, Object?>> unresolved;

  @override
  void visitMethodInvocation(MethodInvocation node) {
    final operation = node.methodName.name;
    final targetSource = node.realTarget?.toSource();
    if (_refOperations.contains(operation) && targetSource == 'ref') {
      final arguments = node.argumentList.arguments;
      _record(
        node,
        operation,
        arguments.isEmpty ? '' : arguments.first.toSource(),
      );
    } else if (operation.startsWith('overrideWith') &&
        targetSource != null &&
        _providerReferencePattern.hasMatch(targetSource)) {
      _record(node, 'override', targetSource);
    } else if (operation == 'run' &&
        targetSource != null &&
        mutationNames.contains(targetSource)) {
      _record(node, 'mutation-run', targetSource);
    }
    super.visitMethodInvocation(node);
  }

  void _record(MethodInvocation node, String operation, String reference) {
    final provider = _providerAt(node.offset, node.end);
    final sourceKind = provider == null ? 'consumer' : 'provider';
    final source = provider?.name ?? _consumerFor(node).id;
    final providerMatch = _providerReferencePattern.firstMatch(reference);
    final mutationMatch = _mutationReferencePattern.firstMatch(reference);
    if (providerMatch != null) {
      edges.add(
        ProviderGraphEdge(
          source: source,
          sourceKind: sourceKind,
          target: providerMatch.group(1)!,
          targetKind: 'provider',
          operation: operation,
          path: path,
          line: lineFor(node.offset),
        ),
      );
      return;
    }
    final mutationName = mutationMatch?.group(1);
    if (mutationName != null && mutationNames.contains(mutationName)) {
      edges.add(
        ProviderGraphEdge(
          source: source,
          sourceKind: sourceKind,
          target: mutationName,
          targetKind: 'mutation',
          operation: operation,
          path: path,
          line: lineFor(node.offset),
        ),
      );
      return;
    }
    unresolved.add({
      'source': source,
      'sourceKind': sourceKind,
      'operation': operation,
      'reference': reference,
      'path': path,
      'line': lineFor(node.offset),
    });
  }

  ProviderGraphNode? _providerAt(int start, int end) {
    ProviderGraphNode? result;
    for (final candidate in fileProviders) {
      if (candidate.start > start || end > candidate.end) continue;
      if (result == null ||
          candidate.end - candidate.start < result.end - result.start) {
        result = candidate;
      }
    }
    return result;
  }

  ConsumerGraphNode _consumerFor(AstNode node) {
    AstNode? cursor = node;
    var owner = '<top-level>';
    var ownerLine = lineFor(node.offset);
    while (cursor != null) {
      if (cursor is MethodDeclaration) {
        owner =
            '${_enclosingClassName(cursor) ?? '<extension>'}.${cursor.name.lexeme}';
        ownerLine = lineFor(cursor.offset);
        break;
      }
      if (cursor is ConstructorDeclaration) {
        final className = _enclosingClassName(cursor) ?? '<class>';
        final constructorName = cursor.name?.lexeme;
        owner = constructorName == null
            ? '$className.new'
            : '$className.$constructorName';
        ownerLine = lineFor(cursor.offset);
        break;
      }
      if (cursor is FunctionDeclaration) {
        owner = cursor.name.lexeme;
        ownerLine = lineFor(cursor.offset);
        break;
      }
      if (cursor is VariableDeclaration) {
        owner = cursor.name.lexeme;
        ownerLine = lineFor(cursor.offset);
      }
      cursor = cursor.parent;
    }
    final id = 'consumer:$path#$owner';
    return consumers.putIfAbsent(
      id,
      () => ConsumerGraphNode(
        id: id,
        owner: owner,
        path: path,
        line: ownerLine,
        feature: _featureFor(path),
        layer: _layerFor(path),
      ),
    );
  }
}

String? _enclosingClassName(AstNode node) {
  AstNode? cursor = node.parent;
  while (cursor != null) {
    if (cursor is ClassDeclaration) {
      return cursor.namePart.typeName.lexeme;
    }
    cursor = cursor.parent;
  }
  return null;
}

// Parsed source ownership, not resolved Dart types. Follow local/imported class
// ancestry without conflating unrelated classes with the same name. Unknown
// aliases, re-exported types and dynamic dispatch still need manual review.
final class _Owner {
  const _Owner(this.file, this.declaration, [this.extension]);
  final _ScannedFile file;
  final ClassDeclaration declaration;
  final ExtensionDeclaration? extension;
  String get name =>
      extension?.name?.lexeme ?? declaration.namePart.typeName.lexeme;
  Iterable<ClassMember> get members =>
      extension?.body.members ?? declaration.body.members;
  String get id => '${file.path}#$name';
  Iterable<NamedType> get parents => [
    if (declaration.extendsClause case final clause?) clause.superclass,
    ...?declaration.withClause?.mixinTypes,
    ...?declaration.implementsClause?.interfaces,
  ];
}

final class _OwnershipIndex {
  _OwnershipIndex(List<_ScannedFile> files)
    : owners = [
        for (final file in files)
          for (final type
              in file.unit.declarations.whereType<ClassDeclaration>())
            _Owner(file, type),
      ];
  final List<_Owner> owners;

  _Owner? resolve(_ScannedFile file, String name, {String? prefix}) {
    final localPaths = <String>{file.path};
    for (final partOf in file.unit.directives.whereType<PartOfDirective>()) {
      final uri = partOf.uri?.stringValue;
      if (uri != null) localPaths.add(Uri.parse(file.path).resolve(uri).path);
    }
    final local = owners.where(
      (owner) =>
          prefix == null &&
          localPaths.contains(owner.file.path) &&
          owner.name == name,
    );
    if (local.length == 1) return local.single;
    final imported = <String>{};
    for (final directive in file.unit.directives.whereType<ImportDirective>()) {
      final uri = directive.uri.stringValue;
      if (uri == null) continue;
      if (directive.prefix?.name != prefix) continue;
      if (directive.combinators.any(
        (combinator) => switch (combinator) {
          ShowCombinator() => !combinator.shownNames.any(
            (shown) => shown.name == name,
          ),
          HideCombinator() => combinator.hiddenNames.any(
            (hidden) => hidden.name == name,
          ),
        },
      )) {
        continue;
      }
      if (uri.startsWith('package:catch_dating_app/')) {
        imported.add(
          'lib/${uri.substring('package:catch_dating_app/'.length)}',
        );
      } else if (uri.startsWith('package:catch_platform/')) {
        imported.add(
          'packages/platform/lib/${uri.substring('package:catch_platform/'.length)}',
        );
      } else if (uri.startsWith('package:catch_host_app/')) {
        imported.add(
          'apps/host/lib/${uri.substring('package:catch_host_app/'.length)}',
        );
      } else if (uri.startsWith('package:catch_consumer_app/')) {
        imported.add(
          'apps/consumer/lib/${uri.substring('package:catch_consumer_app/'.length)}',
        );
      } else if (!uri.contains(':')) {
        imported.add(Uri.parse(file.path).resolve(uri).path);
      }
    }
    final matches = owners.where(
      (owner) => imported.contains(owner.file.path) && owner.name == name,
    );
    return matches.length == 1 ? matches.single : null;
  }

  bool descends(_Owner owner, Set<String> roots, [Set<String>? visited]) {
    final seen = visited ?? <String>{};
    if (!seen.add(owner.id)) return false;
    for (final parent in owner.parents) {
      final name = parent.name.lexeme;
      final local = resolve(
        owner.file,
        name,
        prefix: parent.importPrefix?.name.lexeme,
      );
      if (local != null) {
        if (descends(local, roots, seen)) return true;
      } else if (roots.contains(name)) {
        return true;
      }
    }
    return false;
  }
}

const _listenableTypes = {'ChangeNotifier', 'ValueNotifier'};
const _widgetTypes = {
  'State',
  'ConsumerState',
  'StatelessWidget',
  'StatefulWidget',
  'ConsumerWidget',
  'ConsumerStatefulWidget',
};

final class _OwnershipFacts extends RecursiveAstVisitor<void> {
  final calls = <MethodInvocation>[];
  final creations = <InstanceCreationExpression>[];
  final awaits = <AwaitExpression>[];
  final variables = <VariableDeclaration>[];
  final functionCalls = <FunctionExpressionInvocation>[];
  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    functionCalls.add(node);
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    variables.add(node);
    super.visitVariableDeclaration(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    calls.add(node);
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    creations.add(node);
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitAwaitExpression(AwaitExpression node) {
    awaits.add(node);
    super.visitAwaitExpression(node);
  }
}

String? _ownershipProviderReference(String argument, _OwnershipFacts facts) {
  final direct = _providerReferencePattern.firstMatch(argument)?.group(1);
  if (direct != null) return direct;
  final localName = argument.split('.').first;
  for (final variable in facts.variables) {
    if (variable.name.lexeme != localName) continue;
    return _providerReferencePattern
        .firstMatch(variable.initializer?.toSource() ?? '')
        ?.group(1);
  }
  return null;
}

Iterable<({AstNode node, String name, _Owner? owner})> _ownershipConstructions(
  _OwnershipFacts facts,
  _OwnershipIndex index,
  _ScannedFile file,
) sync* {
  for (final node in facts.creations) {
    final type = node.constructorName.type;
    yield (
      node: node,
      name: type.name.lexeme,
      owner: index.resolve(
        file,
        type.name.lexeme,
        prefix: type.importPrefix?.name.lexeme,
      ),
    );
  }
  for (final node in facts.calls) {
    String? name;
    String? prefix;
    final target = node.realTarget;
    if (target == null) {
      name = node.methodName.name;
    } else if (target is SimpleIdentifier) {
      if (RegExp(r'^_?[A-Z]').hasMatch(target.name)) {
        name = target.name;
      } else {
        prefix = target.name;
        name = node.methodName.name;
      }
    } else if (target is PropertyAccess &&
        target.realTarget is SimpleIdentifier) {
      prefix = target.realTarget.toSource();
      name = target.propertyName.name;
    }
    if (name == null || !RegExp(r'^_?[A-Z]').hasMatch(name)) {
      continue;
    }
    final owner = index.resolve(file, name, prefix: prefix);
    if (owner == null && !name.endsWith('Repository')) continue;
    if (owner != null &&
        target != null &&
        owner.declaration.body.members.whereType<MethodDeclaration>().any(
          (m) => m.isStatic && m.name.lexeme == node.methodName.name,
        )) {
      continue;
    }
    yield (node: node, name: name, owner: owner);
  }
}

String? _awaitedProviderOrigin(
  MethodInvocation call,
  _OwnershipFacts scopeFacts,
) {
  final target = call.realTarget;
  if (target is! SimpleIdentifier) return null;
  for (final variable in scopeFacts.variables) {
    if (variable.name.lexeme != target.name) continue;
    final initializer = variable.initializer;
    if (initializer is! MethodInvocation ||
        initializer.realTarget?.toSource() != 'ref' ||
        !{'read', 'watch'}.contains(initializer.methodName.name)) {
      continue;
    }
    return _ownershipProviderReference(
      initializer.argumentList.arguments.firstOrNull?.toSource() ?? '',
      scopeFacts,
    );
  }
  return null;
}

String? _callbackReference(AstNode node) {
  if (node is MethodInvocation) {
    if (node.methodName.name == 'call') {
      return node.realTarget?.toSource().replaceAll('!', '');
    }
    if (node.realTarget == null) return node.methodName.name;
    if (node.realTarget?.toSource() == 'widget') {
      return 'widget.${node.methodName.name}';
    }
  }
  if (node is FunctionExpressionInvocation) {
    return node.function.toSource().replaceAll('!', '');
  }
  return null;
}

List<ArchitectureCandidate> _ownershipCandidates(List<_ScannedFile> files) {
  final index = _OwnershipIndex(files);
  final findings = <String, ArchitectureCandidate>{};
  void add(
    _ScannedFile file,
    AstNode node,
    String kind,
    String symbol,
    String operation,
    String reason,
  ) {
    final id = '$kind:${file.path}#$symbol:$operation';
    final existing = findings[id];
    findings[id] = ArchitectureCandidate(
      id: id,
      kind: kind,
      severity: 'review',
      subject: symbol,
      path: file.path,
      symbol: symbol,
      operation: operation,
      line: existing?.line ?? file.lineFor(node.offset),
      metric: (existing?.metric ?? 0) + 1,
      reason: reason,
      recommendation:
          'Review the responsibility against the controller contract. Record exact CAT156 debt or a reasoned mechanical/service exception; do not approve a directory or filename.',
    );
  }

  final surfaces = [...index.owners];
  for (final file in files) {
    for (final extension
        in file.unit.declarations.whereType<ExtensionDeclaration>()) {
      final target = extension.onClause?.extendedType;
      if (target is! NamedType) continue;
      final owner = index.resolve(
        file,
        target.name.lexeme,
        prefix: target.importPrefix?.name.lexeme,
      );
      if (owner != null) {
        surfaces.add(_Owner(file, owner.declaration, extension));
      }
    }
  }
  for (final owner in surfaces) {
    final file = owner.file;
    final type = owner.declaration;
    final listenable = index.descends(owner, _listenableTypes);
    final widget = index.descends(owner, _widgetTypes);
    final generated = _hasRiverpodAnnotation(type.metadata);
    if (listenable && owner.extension == null) {
      add(
        file,
        type,
        'ownership-listenable',
        owner.name,
        'reactive-state',
        'ChangeNotifier/ValueNotifier ancestry publishes manually managed reactive state. Business ownership requires a generated notifier; framework bridges and local mechanics require a reviewed exception.',
      );
    }
    if (!widget && !generated && !listenable) continue;
    for (final member in owner.members) {
      final symbol = switch (member) {
        MethodDeclaration() => '${owner.name}.${member.name.lexeme}',
        ConstructorDeclaration() =>
          '${owner.name}.${member.name?.lexeme ?? 'new'}',
        FieldDeclaration() =>
          '${owner.name}.${member.fields.variables.map((v) => v.name.lexeme).join(',')}',
        _ => owner.name,
      };
      final facts = _OwnershipFacts();
      member.accept(facts);
      // Both explicit `new` and implicit constructors are represented in a
      // parsed AST; no textual matches in comments/string literals participate.
      for (final creation in _ownershipConstructions(facts, index, file)) {
        final name = creation.name;
        if (name.endsWith('Repository')) {
          add(
            file,
            creation.node,
            'ownership-repository-construction',
            symbol,
            'construct:$name',
            'A widget or reactive controller constructs a repository instead of consuming an overridable repository factory. Generated function factories and pure orchestration helpers are separate responsibilities.',
          );
        }
      }
      for (final call in facts.calls) {
        final name = call.methodName.name;
        if (!widget ||
            !_refOperations.contains(name) ||
            call.realTarget?.toSource() != 'ref') {
          continue;
        }
        final argument =
            call.argumentList.arguments.firstOrNull?.toSource() ?? '';
        final target = _ownershipProviderReference(argument, facts);
        if (target == null) continue;
        if (target.endsWith('RepositoryProvider')) {
          add(
            file,
            call,
            'ownership-widget-repository',
            symbol,
            '$name:$target',
            'A widget reads a repository provider rather than its feature controller/view-model seam, regardless of the containing filename.',
          );
        } else if ({
          'firebaseFunctionsProvider',
          'firestoreProvider',
          'firebaseFirestoreProvider',
          'firebaseStorageProvider',
        }.contains(target)) {
          add(
            file,
            call,
            'ownership-widget-backend',
            symbol,
            '$name:$target',
            'A widget reaches a backend SDK dependency. Mere Auth current-user checks are excluded because they may fence account currentness.',
          );
        }
      }
      if (!widget || member is! MethodDeclaration) continue;
      final ownsCompletion = facts.calls.any(
        (call) => call.methodName.name == 'setState',
      );
      if (!ownsCompletion) continue;
      for (final pending in facts.awaits) {
        final awaited = _OwnershipFacts();
        pending.expression.accept(awaited);
        for (final call in awaited.calls) {
          final argument =
              call.argumentList.arguments.firstOrNull?.toSource() ?? '';
          if (call.realTarget?.toSource() == 'ref' &&
              {'read', 'watch'}.contains(call.methodName.name) &&
              argument.endsWith('.future')) {
            final provider = _ownershipProviderReference(argument, facts);
            if (provider != null) {
              add(
                file,
                call,
                'ownership-widget-async',
                symbol,
                'await:$provider.future',
                'The widget awaits provider-owned async data and publishes a second local completion state; classify retained business data separately from UI mechanics.',
              );
            }
          }
          if ({
            'then',
            'catchError',
            'whenComplete',
            'timeout',
          }.contains(call.methodName.name)) {
            continue;
          }
          final providers = <String>{};
          final origin = _awaitedProviderOrigin(call, facts);
          if (origin != null) providers.add(origin);
          final receiverFacts = _OwnershipFacts();
          call.realTarget?.accept(receiverFacts);
          for (final read in receiverFacts.calls) {
            if (read.realTarget?.toSource() != 'ref' ||
                !{'read', 'watch'}.contains(read.methodName.name)) {
              continue;
            }
            final provider = _ownershipProviderReference(
              read.argumentList.arguments.firstOrNull?.toSource() ?? '',
              facts,
            );
            if (provider != null) providers.add(provider);
          }
          for (final provider in providers.where(
            (p) =>
                p.endsWith('ControllerProvider') ||
                p.endsWith('RepositoryProvider'),
          )) {
            add(
              file,
              call,
              'ownership-widget-async',
              symbol,
              'await:$provider.${call.methodName.name}',
              'The widget awaits a business seam and also publishes local completion state. Review which fields are business data/pending/error versus mechanical form feedback; delegated writes alone do not transfer lifecycle ownership.',
            );
          }
        }
        if (pending.expression is SimpleIdentifier) {
          final name = (pending.expression as SimpleIdentifier).name;
          for (final variable in facts.variables.where(
            (v) => v.name.lexeme == name,
          )) {
            final initializer = variable.initializer;
            if (initializer is! MethodInvocation ||
                initializer.realTarget?.toSource() != 'ref') {
              continue;
            }
            final argument =
                initializer.argumentList.arguments.firstOrNull?.toSource() ??
                '';
            if (!argument.endsWith('.future')) continue;
            final provider = _ownershipProviderReference(argument, facts);
            if (provider != null) {
              add(
                file,
                pending,
                'ownership-widget-async',
                symbol,
                'await:$provider.future',
                'An aliased provider future is copied into widget-owned completion state. Review retained business state versus temporary mechanics.',
              );
            }
          }
        }
        for (final call in <AstNode>[
          ...awaited.calls,
          ...awaited.functionCalls,
        ]) {
          final reference = _callbackReference(call);
          if (reference == null) continue;
          final name = reference.startsWith('widget.')
              ? reference.substring(7)
              : reference;
          final widgetType = owner.parents
              .expand(
                (parent) =>
                    parent.typeArguments?.arguments ?? <TypeAnnotation>[],
              )
              .whereType<NamedType>()
              .firstOrNull;
          final widgetOwner = widgetType == null
              ? null
              : index.resolve(file, widgetType.name.lexeme);
          final callback = widgetOwner?.declaration.body.members
              .whereType<FieldDeclaration>()
              .where(
                (field) =>
                    field.fields.variables.any((v) => v.name.lexeme == name) &&
                    field.fields.type?.toSource().contains('Future<') == true,
              )
              .firstOrNull;
          final parameter = member.parameters?.parameters
              .where(
                (p) =>
                    p.name?.lexeme == name && p.toSource().contains('Future<'),
              )
              .firstOrNull;
          if ((reference.startsWith('widget.') && callback == null) ||
              (!reference.startsWith('widget.') && parameter == null)) {
            continue;
          }
          add(
            file,
            pending,
            'ownership-widget-async-callback',
            symbol,
            'await:$reference',
            'The widget awaits an injected Future callback and publishes local completion state. Its injection may hide a server command; classify business state separately from temporary form/animation feedback.',
          );
        }
      }
    }
  }
  // A generated wrapper does not turn a mutable Listenable into a Riverpod
  // state owner. Detect constructors in manual or generated function providers.
  for (final file in files) {
    for (final provider in file.providers.where(
      (p) => p.kind != 'generated-class',
    )) {
      final declaration = file.unit.declarations
          .where((d) => d.offset == provider.start)
          .firstOrNull;
      if (declaration == null) continue;
      final facts = _OwnershipFacts();
      declaration.accept(facts);
      final wrappedTypes = <String>{};
      for (final creation in _ownershipConstructions(facts, index, file)) {
        final name = creation.name;
        final owner = creation.owner;
        if (owner != null && index.descends(owner, _listenableTypes)) {
          wrappedTypes.add(name);
          add(
            file,
            creation.node,
            'ownership-listenable-wrapper',
            provider.name,
            'construct:$name',
            'The provider constructs a ChangeNotifier/ValueNotifier owner. Code generation of the wrapper alone does not manage its manually published business state.',
          );
        }
      }
      if (declaration is FunctionDeclaration &&
          declaration.returnType is NamedType) {
        var returned = declaration.returnType! as NamedType;
        while ({
              'Future',
              'Stream',
              'FutureOr',
            }.contains(returned.name.lexeme) &&
            returned.typeArguments?.arguments.firstOrNull is NamedType) {
          returned = returned.typeArguments!.arguments.first as NamedType;
        }
        final name = returned.name.lexeme;
        final owner = index.resolve(
          file,
          name,
          prefix: returned.importPrefix?.name.lexeme,
        );
        if (!wrappedTypes.contains(name) &&
            owner != null &&
            index.descends(owner, _listenableTypes)) {
          add(
            file,
            declaration,
            'ownership-listenable-wrapper',
            provider.name,
            'return-type:$name',
            'The generated function returns a manually reactive Listenable owner through a factory or tear-off; wrapping it does not replace its business-state lifecycle.',
          );
        }
      }
    }
  }
  for (final file in files.where(
    (f) => !_isPlatformFeature(_featureFor(f.path)),
  )) {
    final facts = _OwnershipFacts();
    file.unit.accept(facts);
    for (final variable in facts.variables) {
      if (variable.parent?.parent is TopLevelVariableDeclaration &&
          variable.name.lexeme.endsWith('Provider')) {
        continue;
      }
      final source = variable.initializer?.toSource() ?? '';
      final parts = source.split(RegExp(r'[<(]')).first.split('.');
      final prefixes = file.unit.directives
          .whereType<ImportDirective>()
          .where(
            (import) => RegExp(
              r'^package:(?:flutter_riverpod|hooks_riverpod|riverpod)/',
            ).hasMatch(import.uri.stringValue ?? ''),
          )
          .map((import) => import.prefix?.name)
          .whereType<String>()
          .toSet();
      final first = prefixes.contains(parts.first) && parts.length > 1 ? 1 : 0;
      if (!_providerConstructors.contains(parts[first])) continue;
      final operation = parts.skip(first).join('.');
      AstNode? cursor = variable.parent;
      var symbol = variable.name.lexeme;
      while (cursor != null) {
        if (cursor is MethodDeclaration) {
          symbol =
              '${_enclosingClassName(cursor)}.${cursor.name.lexeme}.$symbol';
          break;
        }
        if (cursor is FunctionDeclaration) {
          symbol = '${cursor.name.lexeme}.$symbol';
          break;
        }
        if (cursor is ClassDeclaration) {
          symbol = '${cursor.namePart.typeName.lexeme}.$symbol';
          break;
        }
        cursor = cursor.parent;
      }
      add(
        file,
        variable,
        'ownership-manual-provider',
        symbol,
        operation,
        'A class/local handwritten provider bypasses uniform code generation and cannot inherit a same-name top-level provider exception. Review its exact declaration scope.',
      );
    }
  }
  return findings.values.toList();
}

List<ArchitectureCandidate> _architectureCandidates(
  List<ProviderGraphNode> providers,
  List<ProviderGraphEdge> providerEdges,
) {
  final byName = {for (final provider in providers) provider.name: provider};
  final uniquePairs = <String, ProviderGraphEdge>{};
  final outgoing = <String, Set<String>>{};
  for (final edge in providerEdges) {
    uniquePairs.putIfAbsent('${edge.source}\u0000${edge.target}', () => edge);
    outgoing.putIfAbsent(edge.source, () => <String>{}).add(edge.target);
  }
  final candidates = <ArchitectureCandidate>[];
  for (final entry in outgoing.entries.where(
    (entry) => entry.value.length >= 8,
  )) {
    candidates.add(
      ArchitectureCandidate(
        id: 'high-fan-out:${entry.key}',
        kind: 'high-fan-out',
        severity: entry.value.length >= 15 ? 'review' : 'watch',
        subject: entry.key,
        metric: entry.value.length,
        reason:
            'This provider coordinates ${entry.value.length} unique provider dependencies.',
        recommendation:
            'Confirm it is a cohesive route/read-model aggregate; otherwise split independent provider waves behind named seams.',
      ),
    );
  }
  for (final provider in providers.where(
    (provider) =>
        provider.kind == 'manual' && !_isPlatformFeature(provider.feature),
  )) {
    candidates.add(
      ArchitectureCandidate(
        id: 'manual-provider:${provider.name}',
        kind: 'manual-provider',
        severity: 'watch',
        subject: provider.name,
        reason:
            'A handwritten provider outside core bypasses Riverpod code generation and the uniform declaration contract.',
        recommendation:
            'Migrate when the owning feature is next edited, unless the manual family API has a documented compatibility reason.',
      ),
    );
  }
  for (final provider in providers.where(
    (provider) => provider.kind == 'alias',
  )) {
    candidates.add(
      ArchitectureCandidate(
        id: 'provider-alias:${provider.name}',
        kind: 'provider-alias',
        severity: 'review',
        subject: provider.name,
        reason:
            'A provider alias adds a second name to one state source and obscures the owning feature.',
        recommendation:
            'Remove the compatibility alias if callers can import the canonical provider directly.',
      ),
    );
  }
  for (final edge in uniquePairs.values) {
    final source = byName[edge.source];
    final target = byName[edge.target];
    if (source == null || target == null) continue;
    if (_isPlatformFeature(source.feature) &&
        !_isPlatformFeature(target.feature) &&
        target.layer == 'data') {
      candidates.add(
        ArchitectureCandidate(
          id: 'core-to-feature-data:${edge.source}->${edge.target}',
          kind: 'core-to-feature-data',
          severity: 'action',
          subject: '${edge.source} -> ${edge.target}',
          source: edge.source,
          target: edge.target,
          reason:
              'A core-owned provider depends on feature data, reversing the intended ownership direction.',
          recommendation:
              'Move the orchestration provider to the owning feature or invert the dependency through a feature-neutral contract.',
        ),
      );
    }
    if (source.feature != target.feature &&
        source.layer == 'presentation' &&
        target.layer == 'presentation') {
      candidates.add(
        ArchitectureCandidate(
          id: 'cross-feature-presentation:${edge.source}->${edge.target}',
          kind: 'cross-feature-presentation',
          severity: 'review',
          subject: '${edge.source} -> ${edge.target}',
          source: edge.source,
          target: edge.target,
          reason:
              'A presentation provider reaches another feature presentation provider.',
          recommendation:
              'Keep only sanctioned public controller/read-model seams; otherwise move the contract below presentation.',
        ),
      );
    }
    if (source.feature == 'routing' && target.layer == 'presentation') {
      candidates.add(
        ArchitectureCandidate(
          id: 'routing-to-presentation:${edge.source}->${edge.target}',
          kind: 'routing-to-presentation',
          severity: 'review',
          subject: '${edge.source} -> ${edge.target}',
          source: edge.source,
          target: edge.target,
          reason:
              'The router observes presentation state and therefore participates in that feature lifecycle.',
          recommendation:
              'Keep only app-gate state at this integration root and document why redirect refresh needs it.',
        ),
      );
    }
  }
  candidates.sort((a, b) => a.id.compareTo(b.id));
  return candidates;
}

final _reviewComment = RegExp(
  r'^[ \t]*//[ \t]*provider-graph:(.*)$',
  multiLine: true,
);
final _reviewBody = RegExp(
  r'^\s*(\S+)\s+(accepted-exception|accepted|watch|planned)'
  r'(?:\s+(?!max=|--)(\S+))?(?:\s+max=(\d+))?\s+--\s+(\S.*)$',
);

/// A review sits next to the code it reviews, so moving a file moves it:
///
///     // provider-graph: <candidate> <status> [debt id] [max=<callsites>] -- <why>
///
/// An ownership `<candidate>` is `<kind>:<symbol>:<operation>`, read in the
/// file holding it. Any other names its providers, such as
/// `manual-provider:lookupProvider`. A new symbol, a replaced operation or more
/// callsites than `max` (default 1) need a new review.
Future<Map<String, Map<String, Object?>>> _readReviewDecisions(
  String rootPath,
  List<File> files,
) async {
  final result = <String, Map<String, Object?>>{};
  for (final file in files) {
    final source = await file.readAsString();
    if (!source.contains('provider-graph:')) continue;
    final path = _relativePath(rootPath, file.path);
    for (final comment in _reviewComment.allMatches(source)) {
      final body = _reviewBody.firstMatch(comment[1]!);
      if (body == null) {
        throw FormatException(
          'Malformed provider graph review in $path: ${comment[0]!.trim()}',
        );
      }
      final key = body[1]!;
      final status = body[2]!;
      final debtId = body[3];
      if (status == 'planned' && debtId == null) {
        throw FormatException(
          'Planned provider graph review $key needs a stable debtId.',
        );
      }
      final id = key.startsWith('ownership-')
          ? key.replaceFirst(':', ':$path#')
          : key;
      if (result.containsKey(id)) {
        throw FormatException('Duplicate provider graph review id: $id');
      }
      result[id] = {
        'id': id,
        'status': status,
        'rationale': body[5],
        'debtId': ?debtId,
        'path': path,
        'maxCallsites': int.parse(body[4] ?? '1'),
      };
    }
  }
  return result;
}

Map<String, Object?> providerGraphSummaryPayload(ProviderGraph graph) => {
  'summary': graph.summary,
  'health': graph.health,
  'architectureCandidates': [
    for (final candidate in graph.candidates)
      candidate.toJson(graph.reviewDecisions[candidate.id]),
  ],
};

String renderProviderGraphJson(Object? payload) =>
    '${const JsonEncoder.withIndent('  ').convert(payload)}\n';

List<String> providerGraphCheckFailures(ProviderGraph graph) => [
  ...graph.duplicateProviderNames.map((name) => 'duplicate provider $name'),
  ...graph.danglingProviderTargets.map((name) => 'dangling target $name'),
  ...graph.unresolvedInsideProviders.map(
    (item) =>
        'unresolved provider ref ${item['source']} at '
        '${item['path']}:${item['line']} (${item['reference']})',
  ),
  ...graph.reactiveCycles.map(
    (cycle) => 'reactive cycle ${cycle.join(' -> ')}',
  ),
  ...graph.unreviewedCandidateIds.map(
    (id) => 'unreviewed architecture candidate $id',
  ),
  ...graph.staleReviewIds.map((id) => 'stale architecture review $id'),
  ...graph.unlistedCacheFindings.map(
    (finding) =>
        'unlisted cache finding ${finding.rule} ${finding.path}#'
        '${finding.symbol} ${finding.detail}'
        '${finding.count > 1 ? ' x${finding.count}' : ''} '
        '(fix it, or review it into $cacheBaselinePath)',
  ),
];

const providerGraphUsage =
    'Usage: dart run tool/architecture/provider_graph.dart '
    '[--check] [--json|--summary] [--write-cache-baseline] [--root PATH]';

final class ProviderGraphCliOptions {
  const ProviderGraphCliOptions({
    required this.root,
    required this.check,
    required this.json,
    required this.summary,
    this.writeCacheBaseline = false,
  });

  final Directory root;
  final bool check;
  final bool json;
  final bool summary;

  /// Rewrites the cache baseline from today's findings. Only for a reviewed
  /// reset; a migration PR deletes its own entries instead.
  final bool writeCacheBaseline;
}

ProviderGraphCliOptions parseProviderGraphCliOptions(
  List<String> args, {
  String? currentDirectory,
}) {
  var rootPath = currentDirectory ?? Directory.current.path;
  var rootSeen = false;
  var check = false;
  var json = false;
  var summary = false;
  var writeCacheBaseline = false;

  for (var index = 0; index < args.length; index++) {
    switch (args[index]) {
      case '--check':
        check = true;
      case '--write-cache-baseline':
        writeCacheBaseline = true;
      case '--json':
        json = true;
      case '--summary':
        summary = true;
      case '--root':
        if (rootSeen) {
          throw const FormatException('--root may only be specified once.');
        }
        if (index + 1 >= args.length || args[index + 1].startsWith('--')) {
          throw const FormatException('--root requires a value.');
        }
        rootPath = args[++index];
        rootSeen = true;
      default:
        throw FormatException('Unknown option: ${args[index]}');
    }
  }

  if (json && summary) {
    throw const FormatException('Choose either --json or --summary.');
  }
  if (!check && !json && !summary && !writeCacheBaseline) {
    throw const FormatException(
      'Choose --check, --json, --summary, --write-cache-baseline, or a '
      'compatible combination.',
    );
  }

  return ProviderGraphCliOptions(
    root: Directory(rootPath),
    check: check,
    json: json,
    summary: summary,
    writeCacheBaseline: writeCacheBaseline,
  );
}

Future<void> main(List<String> args) async {
  late final ProviderGraphCliOptions options;
  try {
    options = parseProviderGraphCliOptions(args);
  } on FormatException catch (error) {
    stderr.writeln(error.message);
    stderr.writeln(providerGraphUsage);
    exitCode = 64;
    return;
  }

  final graph = await buildProviderGraph(options.root);
  if (options.writeCacheBaseline) {
    await writeCacheBaseline(options.root, graph.cacheFindings);
    stdout.writeln(
      'Wrote ${graph.cacheFindings.length} cache findings to '
      '$cacheBaselinePath.',
    );
    if (!options.check && !options.json && !options.summary) return;
  }
  if (options.json) {
    stdout.write(renderProviderGraphJson(graph.toJson()));
  } else if (options.summary) {
    stdout.write(renderProviderGraphJson(providerGraphSummaryPayload(graph)));
  }

  if (!options.check) return;

  final failures = providerGraphCheckFailures(graph);
  if (failures.isNotEmpty) {
    stderr.writeln('Provider graph check failed:');
    for (final failure in failures) {
      stderr.writeln('- $failure');
    }
    exitCode = 1;
    return;
  }

  if (!options.json && !options.summary) {
    stdout.writeln(
      'Provider graph is healthy '
      '(${graph.providers.length} providers, '
      '${graph.providerEdges.length} provider callsites, '
      'no reactive cycles).',
    );
    stdout.writeln(
      'Screen-data caching rules (report-only): '
      '${graph.cacheFindings.fold<int>(0, (sum, f) => sum + f.count)} '
      'findings, all listed in $cacheBaselinePath.',
    );
    final stale = graph.staleCacheBaselineEntries;
    if (stale.isNotEmpty) {
      stdout.writeln(
        '${stale.length} cache baseline entries no longer occur; delete them:',
      );
      for (final finding in stale) {
        stdout.writeln(
          '- ${finding.rule} ${finding.path}#${finding.symbol} '
          '${finding.detail}',
        );
      }
    }
  }
}

bool _hasRiverpodAnnotation(List<Annotation> metadata) => metadata.any(
  (annotation) =>
      annotation.name.name == 'riverpod' || annotation.name.name == 'Riverpod',
);

String _generatedProviderName(
  List<Annotation> metadata,
  String inferredName,
  String path,
  int Function(int offset) lineFor,
) {
  for (final annotation in metadata) {
    if (annotation.name.name != 'Riverpod' &&
        annotation.name.name != 'riverpod') {
      continue;
    }
    for (final argument in annotation.arguments?.arguments ?? <Expression>[]) {
      if (argument is! NamedExpression || argument.name.label.name != 'name') {
        continue;
      }
      final expression = argument.expression;
      if (expression is NullLiteral) return inferredName;
      if (expression is StringLiteral && expression.stringValue != null) {
        return expression.stringValue!;
      }
      throw FormatException(
        'Unsupported Riverpod name at $path:${lineFor(expression.offset)}: '
        'expected a literal string or null, got ${expression.toSource()}.',
      );
    }
  }
  return inferredName;
}

bool _isKeepAlive(List<Annotation> metadata) => metadata.any(
  (annotation) =>
      annotation.name.name == 'Riverpod' &&
      (annotation.arguments?.toSource().contains('keepAlive: true') ?? false),
);

// packages/platform/lib/ holds the framework seams lib/core/ held; both may declare
// providers by hand and must not depend on feature data.
bool _isPlatformFeature(String feature) =>
    feature == 'core' || feature == 'platform';

String _featureFor(String relativePath) {
  final parts = relativePath.split('/');
  if (parts.length < 2) return 'root';
  if (parts.first == 'apps') return 'apps/${parts[1]}';
  final value = parts[1];
  return value.endsWith('.dart') ? 'app' : value;
}

String _layerFor(String relativePath) {
  final parts = relativePath.split('/');
  if (parts.first == 'apps') return 'presentation';
  for (final candidate in const ['domain', 'data', 'presentation', 'shared']) {
    if (parts.contains(candidate)) return candidate;
  }
  return _featureFor(relativePath);
}

String _lowerCamelClassName(String value) {
  if (value.isEmpty) return value;
  var index = 0;
  while (index < value.length && value[index] == '_') {
    index++;
  }
  if (index == value.length) return value;
  return '${value.substring(0, index)}'
      '${value[index].toLowerCase()}'
      '${value.substring(index + 1)}';
}

String _relativePath(String rootPath, String path) {
  final normalizedRoot = rootPath.endsWith(Platform.pathSeparator)
      ? rootPath
      : '$rootPath${Platform.pathSeparator}';
  return path.startsWith(normalizedRoot)
      ? path.substring(normalizedRoot.length)
      : path;
}

void _increment(Map<String, int> counts, String value) {
  counts.update(value, (count) => count + 1, ifAbsent: () => 1);
}

Map<String, int> _countsBy(Iterable<String> values) {
  final counts = <String, int>{};
  for (final value in values) {
    _increment(counts, value);
  }
  return _sortedCounts(counts);
}

Map<String, int> _sortedCounts(Map<String, int> counts) => Map.fromEntries(
  counts.entries.toList()..sort(
    (a, b) => b.value != a.value
        ? b.value.compareTo(a.value)
        : a.key.compareTo(b.key),
  ),
);

List<Map<String, Object>> _topDegrees(
  Iterable<ProviderGraphEdge> edges, {
  required String field,
  required bool uniqueNeighbors,
}) {
  final counts = <String, int>{};
  if (uniqueNeighbors) {
    final neighbors = <String, Set<String>>{};
    for (final edge in edges) {
      final key = field == 'source' ? edge.source : edge.target;
      final neighbor = field == 'source' ? edge.target : edge.source;
      neighbors.putIfAbsent(key, () => <String>{}).add(neighbor);
    }
    for (final entry in neighbors.entries) {
      counts[entry.key] = entry.value.length;
    }
  } else {
    for (final edge in edges) {
      _increment(counts, field == 'source' ? edge.source : edge.target);
    }
  }
  final entries = counts.entries.toList()
    ..sort(
      (a, b) => b.value != a.value
          ? b.value.compareTo(a.value)
          : a.key.compareTo(b.key),
    );
  return entries
      .take(20)
      .map((entry) => {'name': entry.key, 'degree': entry.value})
      .toList();
}

List<List<String>> _stronglyConnectedComponents(
  Iterable<ProviderGraphEdge> edges,
) {
  final adjacency = <String, Set<String>>{};
  for (final edge in edges) {
    adjacency.putIfAbsent(edge.source, () => <String>{}).add(edge.target);
    adjacency.putIfAbsent(edge.target, () => <String>{});
  }
  var index = 0;
  final indices = <String, int>{};
  final lowLinks = <String, int>{};
  final stack = <String>[];
  final onStack = <String>{};
  final components = <List<String>>[];

  void connect(String node) {
    indices[node] = index;
    lowLinks[node] = index;
    index++;
    stack.add(node);
    onStack.add(node);
    for (final neighbor in adjacency[node] ?? const <String>{}) {
      if (!indices.containsKey(neighbor)) {
        connect(neighbor);
        lowLinks[node] = lowLinks[node]!.compareTo(lowLinks[neighbor]!) <= 0
            ? lowLinks[node]!
            : lowLinks[neighbor]!;
      } else if (onStack.contains(neighbor)) {
        lowLinks[node] = lowLinks[node]!.compareTo(indices[neighbor]!) <= 0
            ? lowLinks[node]!
            : indices[neighbor]!;
      }
    }
    if (lowLinks[node] != indices[node]) return;
    final component = <String>[];
    while (true) {
      final member = stack.removeLast();
      onStack.remove(member);
      component.add(member);
      if (member == node) break;
    }
    final selfLoop =
        component.length == 1 &&
        (adjacency[component.single]?.contains(component.single) ?? false);
    if (component.length > 1 || selfLoop) {
      component.sort();
      components.add(component);
    }
  }

  for (final node in adjacency.keys.toList()..sort()) {
    if (!indices.containsKey(node)) connect(node);
  }
  components.sort((a, b) => a.join().compareTo(b.join()));
  return components;
}

int _compareProviderNodes(ProviderGraphNode a, ProviderGraphNode b) {
  final name = a.name.compareTo(b.name);
  if (name != 0) return name;
  final path = a.path.compareTo(b.path);
  return path != 0 ? path : a.line.compareTo(b.line);
}

int _compareEdges(ProviderGraphEdge a, ProviderGraphEdge b) {
  for (final comparison in [
    a.source.compareTo(b.source),
    a.target.compareTo(b.target),
    a.operation.compareTo(b.operation),
    a.path.compareTo(b.path),
    a.line.compareTo(b.line),
  ]) {
    if (comparison != 0) return comparison;
  }
  return 0;
}

// ── Screen-data caching rules (docs/screen_data_caching.md) ──────────────────
//
// A read owner is a provider whose own body, or a repository method it calls,
// reaches `.snapshots()`, a Firestore `.get()`, `httpsCallable` or
// `callHostCrm`. The seven rules run in report-only mode: today's findings
// are listed by exact path, symbol and detail in [cacheBaselinePath], and the
// check fails only when a finding is not listed there. Each migration PR
// deletes its entries, so the list only shrinks. Like the rest of the graph,
// this reads parsed source, not resolved types: it follows a repository call
// through the provider's declared return type, typed locals, fields and
// same-class helpers, and misses dynamic dispatch and untyped hand-offs.

const cacheBaselinePath = 'tool/architecture/provider_graph_baseline.json';

const cacheRuleIds = [
  'CACHE-LIFETIME-001',
  'CACHE-POLICY-001',
  'CACHE-ACCOUNT-001',
  'CACHE-KEY-001',
  'CACHE-INVALIDATE-001',
  'CACHE-LISTENER-001',
  'KEEPALIVE-MANUAL-001',
];

const _readKindListener = 'listener';
const _readKindGet = 'get';
const _readKindCallable = 'callable';

/// One report-only caching finding, keyed by rule, path, symbol and detail.
final class CacheFinding {
  const CacheFinding({
    required this.rule,
    required this.path,
    required this.symbol,
    required this.detail,
    this.count = 1,
  });

  factory CacheFinding.fromJson(Map<String, Object?> json) => CacheFinding(
    rule: json['rule']! as String,
    path: json['path']! as String,
    symbol: json['symbol']! as String,
    detail: json['detail']! as String,
    count: json['count'] as int? ?? 1,
  );

  final String rule;
  final String path;
  final String symbol;
  final String detail;

  /// How many call sites share this key.
  final int count;

  String get key => '$rule\u0000$path\u0000$symbol\u0000$detail';

  CacheFinding withCount(int value) => CacheFinding(
    rule: rule,
    path: path,
    symbol: symbol,
    detail: detail,
    count: value,
  );

  Map<String, Object?> toJson() => {
    'rule': rule,
    'path': path,
    'symbol': symbol,
    'detail': detail,
    if (count > 1) 'count': count,
  };
}

int _compareCacheFindings(CacheFinding a, CacheFinding b) {
  for (final comparison in [
    a.rule.compareTo(b.rule),
    a.path.compareTo(b.path),
    a.symbol.compareTo(b.symbol),
    a.detail.compareTo(b.detail),
  ]) {
    if (comparison != 0) return comparison;
  }
  return 0;
}

/// The reviewed findings in [cacheBaselinePath]; empty when the file is
/// missing, so an unlisted finding fails closed.
Future<List<CacheFinding>> readCacheBaseline(Directory root) async {
  final file = File('${root.path}/$cacheBaselinePath');
  if (!file.existsSync()) return const [];
  final json = jsonDecode(await file.readAsString()) as Map<String, Object?>;
  return [
    for (final entry in json['findings']! as List<Object?>)
      CacheFinding.fromJson(entry! as Map<String, Object?>),
  ];
}

Future<void> writeCacheBaseline(
  Directory root,
  List<CacheFinding> findings,
) async {
  final file = File('${root.path}/$cacheBaselinePath');
  await file.writeAsString(renderCacheBaseline(findings));
}

String renderCacheBaseline(List<CacheFinding> findings) {
  final sorted = [...findings]..sort(_compareCacheFindings);
  return renderProviderGraphJson({
    'owner': 'app_architecture',
    'targetPhase':
        'docs/screen_data_caching.md'
        '#phase-2-context-migrations-empty-the-baseline',
    'version': 1,
    'doc': 'docs/screen_data_caching.md',
    'mode': 'report-only',
    'description':
        'Screen-data caching findings that existed when the rules landed, by '
        'exact rule, path, symbol and detail. The provider graph check fails '
        'only when a finding is not listed here (or occurs more often than '
        'its count). A context migration PR deletes the entries it fixes, so '
        'the list only shrinks; never add an entry to admit new code.',
    'countsByRule': {
      for (final rule in cacheRuleIds)
        rule: sorted
            .where((finding) => finding.rule == rule)
            .fold<int>(0, (sum, finding) => sum + finding.count),
    },
    'findings': [for (final finding in sorted) finding.toJson()],
  });
}

List<CacheFinding> unlistedCacheFindings(
  List<CacheFinding> findings,
  List<CacheFinding> baseline,
) {
  final allowed = {for (final entry in baseline) entry.key: entry.count};
  return [
    for (final finding in findings)
      if ((allowed[finding.key] ?? 0) < finding.count) finding,
  ];
}

List<CacheFinding> staleCacheBaselineEntries(
  List<CacheFinding> findings,
  List<CacheFinding> baseline,
) {
  final current = {for (final finding in findings) finding.key: finding.count};
  return [
    for (final entry in baseline)
      if ((current[entry.key] ?? 0) < entry.count) entry,
  ]..sort(_compareCacheFindings);
}

final class _ReadFacts {
  const _ReadFacts(this.readKinds, this.lifetimes);
  final List<String> readKinds;
  final List<String> lifetimes;
}

({Map<String, _ReadFacts> facts, List<CacheFinding> findings}) _analyseCache(
  List<_ScannedFile> files,
  List<ProviderGraphNode> providers,
  List<ProviderGraphEdge> edges,
) {
  final index = _ReadSiteIndex(files, providers);
  final providerNodes = <String, _ReadNode>{};
  final providerFiles = <String, _ScannedFile>{};
  for (final file in files) {
    for (final provider in file.providers) {
      providerFiles[provider.name] = file;
      final node = index.providerNode(file, provider);
      if (node != null) providerNodes[provider.name] = node;
    }
  }
  index.resolve();

  final byName = {for (final provider in providers) provider.name: provider};
  final facts = <String, _ReadFacts>{};
  final raw = <CacheFinding>[];
  void add(String rule, String path, String symbol, String detail) => raw.add(
    CacheFinding(rule: rule, path: path, symbol: symbol, detail: detail),
  );

  for (final provider in providers) {
    final node = providerNodes[provider.name];
    final file = providerFiles[provider.name];
    if (file == null) continue;
    final kinds = (node?.kinds.toList() ?? <String>[])..sort();
    final lifetimes = <String>{
      if (provider.keepAlive) 'keepAlive',
      ...?node?.lifetimes,
    };
    final declared = lifetimes.isEmpty
        ? ['route']
        : (lifetimes.toList()..sort());
    facts[provider.name] = _ReadFacts(kinds, declared);
    final readOwner = kinds.isNotEmpty;

    // CACHE-POLICY-001: only a CachePolicies member reaches a lifetime.
    for (final policy in node?.policyArguments ?? const <String>[]) {
      if (!RegExp(r'^CachePolicies\.[A-Za-z]\w*$').hasMatch(policy)) {
        add('CACHE-POLICY-001', provider.path, provider.name, 'policy:$policy');
      }
    }

    // KEEPALIVE-MANUAL-001: a kept-alive handwritten provider says why.
    if (provider.kind == 'manual' &&
        provider.keepAlive &&
        !_hasMarkerAbove(file, provider.start, _keepAliveMarker)) {
      add(
        'KEEPALIVE-MANUAL-001',
        provider.path,
        provider.name,
        'no-keepalive-marker',
      );
    }

    if (!readOwner) continue;

    // CACHE-LIFETIME-001: one lifetime; keepAlive only when account-free.
    if (declared.length > 1) {
      add(
        'CACHE-LIFETIME-001',
        provider.path,
        provider.name,
        'lifetimes:${declared.join('+')}',
      );
    }
    if (provider.keepAlive &&
        !_hasMarkerAbove(file, provider.start, _accountFreeMarker)) {
      add('CACHE-LIFETIME-001', provider.path, provider.name, 'keepAlive');
    }

    final cached = declared.contains('timed') || declared.contains('session');
    if (cached) {
      final key = index.familyKeyTypes(file, provider);
      // CACHE-ACCOUNT-001: a cached read of account data is keyed by session.
      if (node!.readsAccount && !key.contains('AuthenticatedSession')) {
        add(
          'CACHE-ACCOUNT-001',
          provider.path,
          provider.name,
          'no-session-key',
        );
      }
      // CACHE-KEY-001: time enters a key only as a CacheTimeBucket.
      if (key.contains('DateTime')) {
        add('CACHE-KEY-001', provider.path, provider.name, 'raw-datetime-key');
      }
    }

    // CACHE-LISTENER-001: a listener declares no tags for its documents.
    if (kinds.length == 1 &&
        kinds.single == _readKindListener &&
        node!.providesTags) {
      add(
        'CACHE-LISTENER-001',
        provider.path,
        provider.name,
        'tags-on-listener',
      );
    }
  }

  final readOwners = {
    for (final entry in facts.entries)
      if (entry.value.readKinds.isNotEmpty) entry.key,
  };
  final listenerOwners = {
    for (final entry in facts.entries)
      if (entry.value.readKinds.length == 1 &&
          entry.value.readKinds.single == _readKindListener)
        entry.key,
  };
  final composesReadOwner = _composesReadOwner(edges, readOwners);

  for (final file in files) {
    final layer = _layerFor(file.path);
    final presentation = layer == 'presentation';
    final sites = _InvalidationSites(file);
    file.unit.accept(sites);
    for (final site in sites.sites) {
      final target = site.target;
      if (!byName.containsKey(target)) continue;
      final detail = '${site.operation}:$target';
      // CACHE-INVALIDATE-001: presentation invalidates a read owner only in
      // a retry or pull-to-refresh, and a retry targets the read owner.
      if (presentation) {
        if (!site.inRetryOrRefresh && readOwners.contains(target)) {
          add('CACHE-INVALIDATE-001', file.path, site.symbol, detail);
        } else if (site.inRetryOrRefresh &&
            !readOwners.contains(target) &&
            composesReadOwner.contains(target)) {
          add(
            'CACHE-INVALIDATE-001',
            file.path,
            site.symbol,
            'retry-composition:$target',
          );
        }
      }
      // CACHE-LISTENER-001: a write never tears down a listener that would
      // deliver the write anyway.
      if (site.inWrite && listenerOwners.contains(target)) {
        add('CACHE-LISTENER-001', file.path, site.symbol, detail);
      }
    }
    // CACHE-POLICY-001: no policy is built outside the freshness table.
    if (file.path != 'packages/platform/lib/cache/cache_policies.dart' &&
        file.path != 'packages/platform/lib/cache/cache_policy.dart') {
      final constructions = _PolicyConstructions(file);
      file.unit.accept(constructions);
      for (final symbol in constructions.symbols) {
        add('CACHE-POLICY-001', file.path, symbol, 'inline-policy');
      }
    }
  }

  final merged = <String, CacheFinding>{};
  for (final finding in raw) {
    final existing = merged[finding.key];
    merged[finding.key] = existing == null
        ? finding
        : existing.withCount(existing.count + 1);
  }
  final findings = merged.values.toList()..sort(_compareCacheFindings);
  return (facts: facts, findings: findings);
}

/// Providers that are not read owners but reach one through reactive edges.
Set<String> _composesReadOwner(
  List<ProviderGraphEdge> edges,
  Set<String> readOwners,
) {
  final watches = <String, Set<String>>{};
  for (final edge in edges) {
    if (!edge.isProviderEdge || !_reactiveOperations.contains(edge.operation)) {
      continue;
    }
    watches.putIfAbsent(edge.source, () => <String>{}).add(edge.target);
  }
  final result = <String>{};
  for (final source in watches.keys) {
    final seen = <String>{source};
    final queue = [...watches[source]!];
    while (queue.isNotEmpty) {
      final next = queue.removeLast();
      if (!seen.add(next)) continue;
      if (readOwners.contains(next)) {
        result.add(source);
        break;
      }
      queue.addAll(watches[next] ?? const <String>{});
    }
  }
  return result;
}

final _keepAliveMarker = RegExp(r'//\s*keepalive:\s*\S');
final _accountFreeMarker = RegExp(
  r'//\s*keepalive:.*account-free',
  caseSensitive: false,
);

/// Whether one of the three lines above the declaration at [offset] (or
/// above its doc comment and annotations) matches [marker].
bool _hasMarkerAbove(_ScannedFile file, int offset, RegExp marker) {
  final declaration = file.unit.declarations
      .where((d) => d.offset == offset)
      .firstOrNull;
  final starts = <int>{
    file.lineFor(offset),
    if (declaration != null)
      file.lineFor(declaration.firstTokenAfterCommentAndMetadata.offset),
    if (declaration != null)
      for (final annotation in declaration.metadata)
        file.lineFor(annotation.offset),
  };
  for (final start in starts) {
    for (var line = start - 1; line >= start - 3 && line >= 1; line--) {
      if (marker.hasMatch(file.lines[line - 1])) return true;
    }
  }
  return false;
}

sealed class _CallRef {
  const _CallRef(this.method);
  final String method;
}

/// An implicit-`this` call inside a class, falling back to a top-level
/// function of the same name.
final class _SelfCall extends _CallRef {
  const _SelfCall(this.type, super.method);
  final String type;
}

final class _TypedCall extends _CallRef {
  const _TypedCall(this.type, super.method);
  final String type;
}

final class _ProviderCall extends _CallRef {
  const _ProviderCall(this.provider, super.method);
  final String provider;
}

final class _TopLevelCall extends _CallRef {
  const _TopLevelCall(super.method);
}

final class _ReadNode {
  final kinds = <String>{};
  final refs = <_CallRef>[];
  final lifetimes = <String>{};
  final policyArguments = <String>[];
  bool readsAccount = false;
  bool providesTags = false;
}

/// Read sites per method and top-level function, resolved to a fixpoint.
final class _ReadSiteIndex {
  _ReadSiteIndex(this.files, List<ProviderGraphNode> providers)
    : _returnTypes = {
        for (final provider in providers)
          provider.name: ?_coreType(provider.returnType),
      } {
    for (final file in files) {
      for (final declaration in file.unit.declarations) {
        switch (declaration) {
          case ClassDeclaration():
            final type = _typeKey(file, declaration.namePart.typeName.lexeme);
            _addSupertypes(file, type, [
              ?declaration.extendsClause?.superclass,
              ...?declaration.withClause?.mixinTypes,
              ...?declaration.implementsClause?.interfaces,
            ]);
            _indexMembers(file, type, declaration.body.members);
          case MixinDeclaration():
            final type = _typeKey(file, declaration.name.lexeme);
            _addSupertypes(file, type, [
              ...?declaration.onClause?.superclassConstraints,
              ...?declaration.implementsClause?.interfaces,
            ]);
            _indexMembers(file, type, declaration.body.members);
          case ExtensionDeclaration():
            final target = declaration.onClause?.extendedType;
            if (target is NamedType) {
              _indexMembers(
                file,
                _typeKey(file, target.name.lexeme),
                declaration.body.members,
              );
            }
          case FunctionDeclaration()
              when !_hasRiverpodAnnotation(declaration.metadata):
            final node = _ReadNode();
            _nodes.add(node);
            _topLevel.putIfAbsent(declaration.name.lexeme, () => []).add(node);
            declaration.accept(_ReadSiteVisitor(file, null, node, this));
          default:
        }
      }
    }
  }

  final List<_ScannedFile> files;
  final Map<String, String> _returnTypes;
  final _nodes = <_ReadNode>[];
  final _methods = <String, Map<String, List<_ReadNode>>>{};
  final _fields = <String, Map<String, String>>{};
  final _supertypes = <String, List<String>>{};
  final _subtypes = <String, List<String>>{};
  final _topLevel = <String, List<_ReadNode>>{};

  /// Private types are library-local; public ones are keyed by name.
  static String _typeKey(_ScannedFile file, String name) =>
      name.startsWith('_') ? '${_libraryPath(file)}#$name' : name;

  /// A part file belongs to the library that names it.
  static String _libraryPath(_ScannedFile file) {
    for (final directive in file.unit.directives.whereType<PartOfDirective>()) {
      final uri = directive.uri?.stringValue;
      if (uri != null) return Uri.parse(file.path).resolve(uri).path;
    }
    return file.path;
  }

  void _addSupertypes(_ScannedFile file, String type, List<NamedType> parents) {
    for (final parent in parents) {
      final key = _typeKey(file, parent.name.lexeme);
      _supertypes.putIfAbsent(type, () => []).add(key);
      _subtypes.putIfAbsent(key, () => []).add(type);
    }
  }

  void _indexMembers(
    _ScannedFile file,
    String type,
    Iterable<ClassMember> members,
  ) {
    final methods = _methods.putIfAbsent(type, () => {});
    final fields = _fields.putIfAbsent(type, () => {});
    for (final member in members) {
      if (member is FieldDeclaration) {
        final declared = member.fields.type;
        if (declared is! NamedType) continue;
        for (final variable in member.fields.variables) {
          fields[variable.name.lexeme] = _typeKey(file, declared.name.lexeme);
        }
      } else if (member is MethodDeclaration) {
        final node = _ReadNode();
        _nodes.add(node);
        methods.putIfAbsent(member.name.lexeme, () => []).add(node);
        member.accept(_ReadSiteVisitor(file, type, node, this));
      }
    }
  }

  String? fieldType(String type, String field) {
    final seen = <String>{};
    final queue = [type];
    while (queue.isNotEmpty) {
      final next = queue.removeLast();
      if (!seen.add(next)) continue;
      final found = _fields[next]?[field];
      if (found != null) return found;
      queue.addAll(_supertypes[next] ?? const []);
    }
    return null;
  }

  String? returnTypeOf(String provider) => _returnTypes[provider];

  String typeKeyIn(_ScannedFile file, String name) => _typeKey(file, name);

  /// The read node of a provider's own body; for a generated class, its
  /// `build`, which reaches same-class helpers through self calls.
  _ReadNode? providerNode(_ScannedFile file, ProviderGraphNode provider) {
    final declaration = file.unit.declarations
        .where((d) => d.offset == provider.start)
        .firstOrNull;
    if (declaration == null || provider.kind == 'alias') return null;
    final node = _ReadNode();
    _nodes.add(node);
    if (declaration is ClassDeclaration) {
      final type = _typeKey(file, declaration.namePart.typeName.lexeme);
      final build = declaration.body.members
          .whereType<MethodDeclaration>()
          .where((m) => m.name.lexeme == 'build')
          .firstOrNull;
      build?.accept(_ReadSiteVisitor(file, type, node, this));
    } else {
      declaration.accept(_ReadSiteVisitor(file, null, node, this));
    }
    return node;
  }

  /// The type names in a provider's family key, including the field types
  /// of a query object declared in the scanned sources.
  Set<String> familyKeyTypes(_ScannedFile file, ProviderGraphNode provider) {
    final declaration = file.unit.declarations
        .where((d) => d.offset == provider.start)
        .firstOrNull;
    final names = <String>[];
    switch (declaration) {
      case FunctionDeclaration():
        final parameters =
            declaration.functionExpression.parameters?.parameters ??
            const <FormalParameter>[];
        names.addAll(parameters.skip(1).map(_parameterTypeName).nonNulls);
      case ClassDeclaration():
        final build = declaration.body.members
            .whereType<MethodDeclaration>()
            .where((m) => m.name.lexeme == 'build')
            .firstOrNull;
        names.addAll(
          (build?.parameters?.parameters ?? const <FormalParameter>[])
              .map(_parameterTypeName)
              .nonNulls,
        );
      default:
    }
    final result = <String>{};
    for (final name in names) {
      result.add(name);
      final fields = _fields[_typeKey(file, name)] ?? const {};
      result.addAll(fields.values.map((type) => type.split('#').last));
    }
    return result;
  }

  static String? _parameterTypeName(FormalParameter parameter) {
    final normal = switch (parameter) {
      DefaultFormalParameter(:final parameter) => parameter,
      _ => parameter,
    };
    if (normal is! SimpleFormalParameter) return null;
    final type = normal.type;
    return type is NamedType ? type.name.lexeme : null;
  }

  List<_ReadNode> _resolve(_CallRef ref) => switch (ref) {
    _SelfCall(:final type, :final method) =>
      _methodsOf(type, method).isNotEmpty
          ? _methodsOf(type, method)
          : _topLevel[method] ?? const [],
    _TypedCall(:final type, :final method) => _methodsOf(type, method),
    _ProviderCall(:final provider, :final method) =>
      switch (_returnTypes[provider]) {
        final type? => _methodsOf(type, method),
        null => const [],
      },
    _TopLevelCall(:final method) => _topLevel[method] ?? const [],
  };

  /// The methods a call on [type] may run: inherited ones, and the
  /// implementations an interface or base type dispatches to.
  List<_ReadNode> _methodsOf(String type, String method) {
    final result = <_ReadNode>[];
    for (final related in [_supertypes, _subtypes]) {
      final seen = <String>{};
      final queue = [type];
      while (queue.isNotEmpty) {
        final next = queue.removeLast();
        if (!seen.add(next)) continue;
        result.addAll(_methods[next]?[method] ?? const []);
        queue.addAll(related[next] ?? const []);
      }
    }
    return result;
  }

  void resolve() {
    var changed = true;
    while (changed) {
      changed = false;
      for (final node in _nodes) {
        for (final ref in node.refs) {
          for (final target in _resolve(ref)) {
            if (identical(target, node)) continue;
            final before = node.kinds.length;
            node.kinds.addAll(target.kinds);
            if (node.kinds.length != before) changed = true;
          }
        }
      }
    }
  }
}

/// The type a provider hands out, unwrapping Future, Stream and AsyncValue.
String? _coreType(String? source) {
  if (source == null) return null;
  var type = source.replaceAll(' ', '');
  while (true) {
    final match = RegExp(
      r'^(?:Future|FutureOr|Stream|AsyncValue|Raw)<(.+)>\??$',
    ).firstMatch(type);
    if (match == null) break;
    type = match[1]!;
  }
  final name = RegExp(r'^[A-Za-z_]\w*').firstMatch(type)?[0];
  return name;
}

final class _ReadSiteVisitor extends RecursiveAstVisitor<void> {
  _ReadSiteVisitor(this.file, this.type, this.node, this.index);

  final _ScannedFile file;
  final String? type;
  final _ReadNode node;
  final _ReadSiteIndex index;
  final _locals = <String, _CallRef Function(String method)>{};

  static const _accountMarkers = {
    'uidProvider',
    'authenticatedSessionProvider',
    'requireSignedInUid',
    'currentUser',
  };

  @override
  void visitSimpleIdentifier(SimpleIdentifier identifier) {
    if (_accountMarkers.contains(identifier.name)) node.readsAccount = true;
    super.visitSimpleIdentifier(identifier);
  }

  @override
  void visitSimpleFormalParameter(SimpleFormalParameter parameter) {
    final declared = parameter.type;
    final name = parameter.name?.lexeme;
    if (name != null && declared is NamedType) {
      final typeKey = index.typeKeyIn(file, declared.name.lexeme);
      _locals[name] = (method) => _TypedCall(typeKey, method);
      if (const {'uid', 'userId', 'organizerId', 'session'}.contains(name)) {
        node.readsAccount = true;
      }
    }
    super.visitSimpleFormalParameter(parameter);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration variable) {
    final name = variable.name.lexeme;
    final declared = (variable.parent as VariableDeclarationList?)?.type;
    final initializer = variable.initializer;
    if (declared is NamedType) {
      final typeKey = index.typeKeyIn(file, declared.name.lexeme);
      _locals[name] = (method) => _TypedCall(typeKey, method);
    } else if (_providerRead(initializer) case final provider?) {
      _locals[name] = (method) => _ProviderCall(provider, method);
    } else if (initializer is InstanceCreationExpression) {
      final typeKey = index.typeKeyIn(
        file,
        initializer.constructorName.type.name.lexeme,
      );
      _locals[name] = (method) => _TypedCall(typeKey, method);
    }
    super.visitVariableDeclaration(variable);
  }

  @override
  void visitMethodInvocation(MethodInvocation invocation) {
    final name = invocation.methodName.name;
    final target = invocation.realTarget;
    final arguments = invocation.argumentList.arguments;
    if (name == 'snapshots' && target != null) {
      node.kinds.add(_readKindListener);
    } else if (name == 'get' && target != null && _isFirestoreGet(arguments)) {
      node.kinds.add(_readKindGet);
    } else if (name.startsWith('httpsCallable') || name == 'callHostCrm') {
      node.kinds.add(_readKindCallable);
    } else if (target != null && target.toSource() == 'ref') {
      _recordRefCall(name, arguments);
    } else {
      final ref = _callRef(name, target);
      if (ref != null) node.refs.add(ref);
    }
    super.visitMethodInvocation(invocation);
  }

  void _recordRefCall(String name, NodeList<Expression> arguments) {
    switch (name) {
      case 'retain':
        node.lifetimes.add('timed');
        if (arguments.isNotEmpty) {
          node.policyArguments.add(arguments.first.toSource());
        }
      case 'retainForSession':
        node.lifetimes.add('session');
        if (arguments.length > 1) {
          node.policyArguments.add(arguments[1].toSource());
        }
      case 'callableRead':
        final named = {
          for (final argument in arguments.whereType<NamedExpression>())
            argument.name.label.name: argument.expression.toSource(),
        };
        node.lifetimes.add(named.containsKey('session') ? 'session' : 'timed');
        if (named['policy'] case final policy?) {
          node.policyArguments.add(policy);
        }
      case 'keepAlive':
        node.lifetimes.add('manual-keepalive');
      case 'providesTags':
        node.providesTags = true;
      default:
    }
  }

  _CallRef? _callRef(String method, Expression? target) {
    if (target == null || target is ThisExpression) {
      final type = this.type;
      return type == null ? _TopLevelCall(method) : _SelfCall(type, method);
    }
    if (_providerRead(target) case final provider?) {
      return _ProviderCall(provider, method);
    }
    if (target is SimpleIdentifier) {
      final local = _locals[target.name];
      if (local != null) return local(method);
      final type = this.type;
      if (type != null) {
        final field = index.fieldType(type, target.name);
        if (field != null) return _TypedCall(field, method);
      }
      if (RegExp(r'^_?[A-Z]').hasMatch(target.name)) {
        return _TypedCall(index.typeKeyIn(file, target.name), method);
      }
    }
    if (target is PropertyAccess && target.target is ThisExpression) {
      final type = this.type;
      final field = type == null
          ? null
          : index.fieldType(type, target.propertyName.name);
      if (field != null) return _TypedCall(field, method);
    }
    return null;
  }

  /// The provider named by `ref.watch(x)` or `ref.read(x)`.
  static String? _providerRead(Expression? expression) {
    if (expression is! MethodInvocation) return null;
    if (expression.realTarget?.toSource() != 'ref') return null;
    if (!const {'watch', 'read'}.contains(expression.methodName.name)) {
      return null;
    }
    final argument = expression.argumentList.arguments.firstOrNull?.toSource();
    if (argument == null || argument.contains('.notifier')) return null;
    return _providerReferencePattern.firstMatch(argument)?.group(1);
  }

  /// Firestore's document and query `get` take no argument or `GetOptions`;
  /// `MutationTransaction.get`, `Transaction.get` and map-like getters take
  /// one value and are not screen reads.
  static bool _isFirestoreGet(NodeList<Expression> arguments) {
    if (arguments.isEmpty) return true;
    if (arguments.length != 1) return false;
    final argument = arguments.single;
    final source = argument is NamedExpression
        ? argument.expression.toSource()
        : argument.toSource();
    return RegExp(r'^(?:const\s+)?GetOptions\(').hasMatch(source);
  }
}

final class _InvalidationSite {
  const _InvalidationSite({
    required this.symbol,
    required this.operation,
    required this.target,
    required this.inRetryOrRefresh,
    required this.inWrite,
  });

  final String symbol;
  final String operation;
  final String target;
  final bool inRetryOrRefresh;
  final bool inWrite;
}

/// `ref.invalidate` and `ref.refresh` call sites with the context that
/// decides whether they are a retry, a pull-to-refresh or a write.
final class _InvalidationSites extends RecursiveAstVisitor<void> {
  _InvalidationSites(this.file);

  final _ScannedFile file;
  final sites = <_InvalidationSite>[];

  static final _retryName = RegExp(
    r'retry|refresh|reload',
    caseSensitive: false,
  );

  @override
  void visitMethodInvocation(MethodInvocation invocation) {
    final operation = invocation.methodName.name;
    if ((operation == 'invalidate' || operation == 'refresh') &&
        invocation.realTarget?.toSource() == 'ref') {
      final argument =
          invocation.argumentList.arguments.firstOrNull?.toSource() ?? '';
      final target = _providerReferencePattern.firstMatch(argument)?.group(1);
      if (target != null) {
        final retry = _inRetryOrRefresh(invocation);
        sites.add(
          _InvalidationSite(
            symbol: _ownerSymbol(invocation),
            operation: operation,
            target: target,
            inRetryOrRefresh: retry,
            inWrite: !retry && _inWrite(invocation),
          ),
        );
      }
    }
    super.visitMethodInvocation(invocation);
  }

  bool _inRetryOrRefresh(AstNode node) {
    for (
      AstNode? cursor = node.parent;
      cursor != null;
      cursor = cursor.parent
    ) {
      if (cursor is FunctionExpression &&
          _retryName.hasMatch(_namedArgumentOf(cursor) ?? '')) {
        return true;
      }
      if (cursor is MethodDeclaration) {
        return _retryName.hasMatch(cursor.name.lexeme);
      }
      if (cursor is FunctionDeclaration) {
        return _retryName.hasMatch(cursor.name.lexeme);
      }
    }
    return false;
  }

  bool _inWrite(AstNode node) {
    FunctionBody? body;
    for (
      AstNode? cursor = node.parent;
      cursor != null;
      cursor = cursor.parent
    ) {
      if (cursor is FunctionExpression) {
        final invocation = cursor.parent?.parent;
        if (invocation is MethodInvocation &&
            invocation.methodName.name == 'run') {
          return true;
        }
      }
      if (cursor is FunctionBody) body ??= cursor;
      if (cursor is MethodDeclaration) {
        final owner = cursor.parent?.parent;
        if (owner is ClassDeclaration &&
            _hasRiverpodAnnotation(owner.metadata) &&
            cursor.name.lexeme != 'build') {
          return true;
        }
        break;
      }
      if (cursor is FunctionDeclaration) break;
    }
    if (body == null) return false;
    final awaits = _AwaitsBefore(node.offset);
    body.accept(awaits);
    return awaits.found;
  }

  String _ownerSymbol(AstNode node) {
    ProviderGraphNode? provider;
    for (final candidate in file.providers) {
      if (candidate.start > node.offset || node.end > candidate.end) continue;
      if (provider == null ||
          candidate.end - candidate.start < provider.end - provider.start) {
        provider = candidate;
      }
    }
    if (provider != null) return provider.name;
    for (AstNode? cursor = node; cursor != null; cursor = cursor.parent) {
      if (cursor is MethodDeclaration) {
        return '${_enclosingTypeName(cursor)}.${cursor.name.lexeme}';
      }
      if (cursor is ConstructorDeclaration) {
        return '${_enclosingTypeName(cursor)}.'
            '${cursor.name?.lexeme ?? 'new'}';
      }
      if (cursor is FunctionDeclaration && cursor.parent is CompilationUnit) {
        return cursor.name.lexeme;
      }
    }
    return '<top-level>';
  }
}

/// The named argument a closure is passed as, through `cond ? a : b`,
/// `a ?? b` and parentheses.
String? _namedArgumentOf(FunctionExpression closure) {
  AstNode? cursor = closure.parent;
  while (cursor is ConditionalExpression ||
      cursor is ParenthesizedExpression ||
      cursor is BinaryExpression) {
    cursor = cursor!.parent;
  }
  return cursor is NamedExpression ? cursor.name.label.name : null;
}

/// The class, mixin or extension that declares [node].
String _enclosingTypeName(AstNode node) {
  for (AstNode? cursor = node.parent; cursor != null; cursor = cursor.parent) {
    switch (cursor) {
      case ClassDeclaration():
        return cursor.namePart.typeName.lexeme;
      case MixinDeclaration():
        return cursor.name.lexeme;
      case ExtensionDeclaration():
        return cursor.name?.lexeme ?? '<extension>';
      case EnumDeclaration():
        return cursor.namePart.typeName.lexeme;
      default:
    }
  }
  return '<top-level>';
}

final class _AwaitsBefore extends RecursiveAstVisitor<void> {
  _AwaitsBefore(this.offset);

  final int offset;
  bool found = false;

  @override
  void visitAwaitExpression(AwaitExpression node) {
    if (node.offset < offset) found = true;
    super.visitAwaitExpression(node);
  }
}

/// `CachePolicy(...)` constructions, which belong only in the table.
final class _PolicyConstructions extends RecursiveAstVisitor<void> {
  _PolicyConstructions(this.file);

  final _ScannedFile file;
  final symbols = <String>[];

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    if (node.constructorName.type.name.lexeme == 'CachePolicy') {
      symbols.add(_enclosing(node));
    }
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.realTarget == null && node.methodName.name == 'CachePolicy') {
      symbols.add(_enclosing(node));
    }
    super.visitMethodInvocation(node);
  }

  String _enclosing(AstNode node) {
    for (AstNode? cursor = node; cursor != null; cursor = cursor.parent) {
      if (cursor is MethodDeclaration) {
        return '${_enclosingTypeName(cursor)}.${cursor.name.lexeme}';
      }
      if (cursor is FunctionDeclaration) return cursor.name.lexeme;
      if (cursor is VariableDeclaration &&
          cursor.parent?.parent is TopLevelVariableDeclaration) {
        return cursor.name.lexeme;
      }
    }
    return '<top-level>';
  }
}
