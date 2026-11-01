import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/ast/ast.dart';

import 'architecture_findings.dart';
import 'migration_scope.dart' show migrationRepositoryRoot;

const _contextMapPath = 'tool/architecture/context_map.json';

final _mapCache = <String, ({DateTime modified, ContextMap map})>{};

/// The context map at [absolutePath]'s repository root, reread when it changes.
ContextMap? contextMapFor(String absolutePath) {
  final root = migrationRepositoryRoot(absolutePath.replaceAll(r'\', '/'));
  if (root == null) return null;
  final file = File('$root/$_contextMapPath');
  if (!file.existsSync()) return null;
  final modified = file.statSync().modified;
  var cached = _mapCache[root];
  if (cached == null || cached.modified != modified) {
    cached = (
      modified: modified,
      map: ContextMap.parse(file.readAsStringSync()),
    );
    _mapCache[root] = cached;
  }
  return cached.map;
}

// Lower rank may be imported by higher rank. Contexts are also ordered among
// themselves by their declaration order in the map.
const _layerRank = <String, int>{
  'kernel': 0,
  'platform': 1,
  'context': 2,
  'pages': 3,
  'app': 4,
};

class ContextPlace {
  const ContextPlace(this.layer, this.context, {required this.legacy});

  final String layer;
  final String? context;
  final bool legacy;

  String get description => switch (layer) {
    'context' => 'the $context context',
    'app' => 'app screens',
    _ => 'the $layer layer',
  };
}

/// tool/architecture/context_map.json, the placement source of truth.
class ContextMap {
  ContextMap._(this.roots, this.contextRank, this.legacy, this.forbidLegacy);

  factory ContextMap.parse(String source) {
    final json = jsonDecode(source);
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Context map must be a JSON object');
    }
    final roots = (json['roots'] as Map<String, dynamic>)
        .cast<String, String>();
    final contextRank = <String, int>{};
    for (final context in (json['contexts'] as List<dynamic>).cast<Map>()) {
      contextRank[context['id'] as String] = contextRank.length;
    }
    final legacy =
        [
            for (final entry in (json['legacy'] as List<dynamic>).cast<Map>())
              (
                path: entry['path'] as String,
                layer: entry['layer'] as String?,
                context: entry['context'] as String?,
              ),
          ]
          // The longest matching prefix decides.
          ..sort((a, b) => b.path.length.compareTo(a.path.length));
    return ContextMap._(
      roots,
      contextRank,
      legacy,
      json['forbidLegacyContextFiles'] == true,
    );
  }

  final Map<String, String> roots;
  final Map<String, int> contextRank;
  final List<({String path, String? layer, String? context})> legacy;
  final bool forbidLegacy;

  /// Target roots win; otherwise the longest legacy prefix decides. Legacy UI
  /// under presentation/ and shared/ is app composition until it is redrawn.
  ContextPlace? place(String relativePath) {
    final contexts = roots['contexts']!;
    if (relativePath.startsWith(contexts)) {
      final context = relativePath.substring(contexts.length).split('/').first;
      return ContextPlace('context', context, legacy: false);
    }
    for (final layer in const ['pages', 'kernel', 'platform']) {
      if (relativePath.startsWith(roots[layer]!)) {
        return ContextPlace(layer, null, legacy: false);
      }
    }
    for (final entry in legacy) {
      if (!relativePath.startsWith(entry.path)) continue;
      final context = entry.context;
      if (context == null) {
        return ContextPlace(entry.layer!, null, legacy: true);
      }
      final isLegacyUi = RegExp(
        r'/(?:presentation|shared)/',
      ).hasMatch(relativePath);
      return ContextPlace(
        isLegacyUi ? 'app' : 'context',
        context,
        legacy: true,
      );
    }
    return null;
  }
}

/// The bounded-context rules: placement, layer order, context order and the
/// public API rule.
List<ArchitectureFinding> contextMapFindings({
  required String relativePath,
  required CompilationUnit unit,
  required ContextMap map,
}) {
  if (!relativePath.startsWith('lib/')) return const [];
  final fileHead = unit.beginToken;
  final from = map.place(relativePath);
  if (from == null) {
    return [
      ArchitectureFinding(
        ArchitectureCodes.unmappedFile,
        fileHead.offset,
        fileHead.length,
        'Place this file under a target root or add its folder to $_contextMapPath.',
      ),
    ];
  }
  if (from.layer == 'context' && !map.contextRank.containsKey(from.context)) {
    return [
      ArchitectureFinding(
        ArchitectureCodes.unknownContext,
        fileHead.offset,
        fileHead.length,
        '${from.context} is not a context declared in $_contextMapPath.',
      ),
    ];
  }
  final findings = <ArchitectureFinding>[
    if (map.forbidLegacy &&
        from.legacy &&
        from.layer == 'context' &&
        !isFeatureRootBarrel(relativePath))
      ArchitectureFinding(
        ArchitectureCodes.legacyContextFile,
        fileHead.offset,
        fileHead.length,
        'Domain and data code for ${from.context} lives under ${map.roots['contexts']}${from.context}/; legacy folders keep only screens and their barrel.',
      ),
  ];
  if (from.layer == 'app') return findings;

  for (final (:uri, :node) in [...importUris(unit), ...exportUris(unit)]) {
    final target = resolveLibPath(relativePath, uri);
    if (target == null) continue;
    final to = map.place(target);
    if (to == null) continue;
    if (_isOwnLegacyBarrelExport(relativePath, target, from, to)) continue;
    final violation = _classifyImport(from, to, target, map);
    if (violation == null) continue;
    findings.add(
      ArchitectureFinding(
        violation.code,
        node.offset,
        node.length,
        violation.reason,
      ),
    );
  }
  return findings;
}

({String code, String reason})? _classifyImport(
  ContextPlace from,
  ContextPlace to,
  String target,
  ContextMap map,
) {
  if (_layerRank[to.layer]! > _layerRank[from.layer]!) {
    return (
      code: ArchitectureCodes.upwardLayerImport,
      reason: '${from.description} must not import ${to.description}.',
    );
  }
  if (from.layer != 'context' || to.layer != 'context') return null;
  if (from.context == to.context) return null;
  final fromRank = map.contextRank[from.context];
  final toRank = map.contextRank[to.context];
  if (toRank == null || fromRank == null) return null;
  if (toRank > fromRank) {
    return (
      code: ArchitectureCodes.contextOrderImport,
      reason:
          '${from.context} is declared before ${to.context}, so it must not depend on it; combine them in the screen\'s view model or move the shared value down.',
    );
  }
  if (!from.legacy && !to.legacy) {
    final barrel = '${map.roots['contexts']}${to.context}/${to.context}.dart';
    if (target != barrel) {
      return (
        code: ArchitectureCodes.contextBarrelBypass,
        reason: 'Import ${to.context} through its public API $barrel.',
      );
    }
  }
  return null;
}

// Legacy feature barrels re-export their own screens until they are split.
bool _isOwnLegacyBarrelExport(
  String relativePath,
  String target,
  ContextPlace from,
  ContextPlace to,
) {
  if (!from.legacy || to.layer != 'app') return false;
  final match = RegExp(r'^lib/([^/]+)/([^/]+)\.dart$').firstMatch(relativePath);
  if (match == null || match[1] != match[2]) return false;
  return target.startsWith('lib/${match[1]}/');
}

final _ignoreComment = RegExp(
  r'//\s*ignore(_for_file)?:(.*)$',
  multiLine: true,
);
final _archCode = RegExp(r'\bcatch_ui_lints/(catch_arch_[a-z_]+)');

/// Reasoned `// ignore:` comments replace the old path-keyed baselines, and
/// keep what those baselines refused: file-wide exceptions, exceptions without
/// a reason, exceptions on hard-gate rules or under the bounded-context roots,
/// and exceptions that no longer match a live finding.
List<ArchitectureFinding> ignorePolicyFindings({
  required String relativePath,
  required String source,
  required CompilationUnit unit,
  required List<ArchitectureFinding> findings,
}) {
  final results = <ArchitectureFinding>[];
  final place = placeSource(relativePath);
  final inCleanRoot = place != null && place.root != 'legacy';
  for (final match in _ignoreComment.allMatches(source)) {
    final body = match[2]!;
    final codes = _archCode.allMatches(body).toList();
    if (codes.isEmpty) continue;
    void report(String reason) => results.add(
      ArchitectureFinding(
        ArchitectureCodes.invalidIgnore,
        match.start,
        match.end - match.start,
        reason,
      ),
    );
    if (match[1] != null) {
      report(
        'Architecture exceptions must sit next to the code, not apply to the whole file.',
      );
      continue;
    }
    if (!RegExp(r'^\s*--\s*\S').hasMatch(body.substring(codes.last.end))) {
      report(
        'Say why after the code: // ignore: catch_ui_lints/<code> -- <reason>.',
      );
    }
    final location = unit.lineInfo.getLocation(match.start);
    final ownLine = source
        .substring(match.start - (location.columnNumber - 1), match.start)
        .trim()
        .isEmpty;
    final targetLine = location.lineNumber + (ownLine ? 1 : 0);
    for (final code in codes) {
      final name = code[1]!;
      if (ArchitectureCodes.hardGates.contains(name)) {
        report('$name holds everywhere and cannot be ignored.');
      } else if (inCleanRoot) {
        report(
          'Code under lib/contexts, lib/pages, lib/kernel, lib/platform and app destinations carries no architecture exceptions.',
        );
      }
      final live = findings.any(
        (finding) =>
            finding.code == name &&
            unit.lineInfo.getLocation(finding.offset).lineNumber == targetLine,
      );
      if (!live) {
        report('Remove this stale exception: nothing reports $name here.');
      }
    }
  }
  return results;
}
