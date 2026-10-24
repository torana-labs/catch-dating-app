import 'dart:io';

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';

import 'migration_baseline.dart';

const drawingMigrationBaseline =
    'tool/architecture/catch_drawing_migration_baseline.json';

/// SDK drawing constructors and strategy bases (D18 / CAT-227).
/// Icon and Tooltip are inventoried now but stay dormant until CAT-226 ships.
const drawingMigrationKinds = <String>{
  'AnimatedContainer',
  'Container',
  'DecoratedBox',
  'ColoredBox',
  'Material',
  'Ink',
  'InkWell',
  'InkResponse',
  'GestureDetector',
  'Card',
  'ClipRect',
  'ClipRRect',
  'ClipRSuperellipse',
  'ClipOval',
  'ClipPath',
  'CustomPaint',
  'CustomPainter',
  'CustomClipper',
  'Decoration',
  'Opacity',
  'ShaderMask',
  'BackdropFilter',
  'Image',
  'CircleAvatar',
  'Divider',
  'VerticalDivider',
  'BoxDecoration',
  'ShapeDecoration',
  'BorderRadius',
  'BorderRadiusDirectional',
  'Radius',
  'Border',
  'BorderDirectional',
  'BorderSide',
  'ShapeBorder',
  'OutlinedBorder',
  'BoxBorder',
  'RoundedRectangleBorder',
  'RoundedSuperellipseBorder',
  'BeveledRectangleBorder',
  'ContinuousRectangleBorder',
  'CircleBorder',
  'OvalBorder',
  'StadiumBorder',
  'StarBorder',
  'LinearBorder',
  'OutlineInputBorder',
  'UnderlineInputBorder',
  'LinearGradient',
  'RadialGradient',
  'SweepGradient',
  'Gradient',
  'Icon',
  'Tooltip',
};

const unavailableDrawingKinds = <String>{'Icon', 'Tooltip'};
final activeDrawingKinds = Set<String>.unmodifiable(
  drawingMigrationKinds.difference(unavailableDrawingKinds),
);

typedef DrawingMigrationSite = ({AstNode node, String kind});

/// Resolved identities exclude similarly named app/third-party constructors.
List<DrawingMigrationSite> drawingMigrationSites(
  CompilationUnit unit,
  Set<String>? kinds,
) {
  final visitor = _DrawingCalls(kinds);
  unit.accept(visitor);
  return visitor.sites;
}

class _DrawingCalls extends RecursiveAstVisitor<void> {
  _DrawingCalls(this.kinds);
  final Set<String>? kinds;
  final sites = <DrawingMigrationSite>[];

  @override
  void visitClassDeclaration(ClassDeclaration node) {
    super.visitClassDeclaration(node);
    final type = node.extendsClause?.superclass.type;
    if (type is! InterfaceType) return;
    final kind = type.element.name;
    if (kind != null &&
        drawingMigrationKinds.contains(kind) &&
        (kinds == null || kinds!.contains(kind)) &&
        type.element.library.uri.toString().startsWith('package:flutter/')) {
      sites.add((node: node, kind: kind));
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    super.visitInstanceCreationExpression(node);
    final constructor = node.constructorName.element?.baseElement;
    final kind = constructor?.enclosingElement.name;
    final uri = constructor?.library.uri.toString();
    if (kind == null ||
        !drawingMigrationKinds.contains(kind) ||
        (kinds != null && !kinds!.contains(kind)) ||
        uri == null ||
        !(uri.startsWith('package:flutter/') || uri == 'dart:ui')) {
      return;
    }
    sites.add((node: node, kind: kind));
  }
}

final _cache = <String, ({DateTime modified, MigrationCounts counts})>{};

/// Parts own their file/family budgets, just as they own text-role budgets.
List<DrawingMigrationSite> newDrawingMigrationSites(
  CompilationUnit unit,
  String path, {
  Set<String>? activeKinds,
}) {
  final root = migrationRepositoryRoot(path);
  if (root == null) return const [];
  final relative = path.substring(root.length + 1).replaceAll(r'\', '/');
  if (!migrationScope(relative)) return const [];
  final baseline = File('$root/$drawingMigrationBaseline');
  final modified = baseline.statSync().modified;
  var input = _cache[root];
  if (input == null || input.modified != modified) {
    input = (
      modified: modified,
      counts: parseMigrationBaseline(
        baseline.readAsStringSync(),
        label: 'CatchDrawing',
      ),
    );
    _cache[root] = input;
  }
  final sites = drawingMigrationSites(unit, activeKinds ?? activeDrawingKinds)
    ..sort((a, b) => a.node.offset.compareTo(b.node.offset));
  final seen = <String, int>{};
  return [
    for (final site in sites)
      if (seen.update(site.kind, (n) => n + 1, ifAbsent: () => 1) >
          (input.counts[relative]?[site.kind] ?? 0))
        site,
  ];
}

// Internal mode of the registered lint-drift wrapper, not a new check registry.
Future<void> main(List<String> args) => runMigrationBaseline(
  args,
  label: 'CatchDrawing',
  baselinePath: drawingMigrationBaseline,
  optionName: 'drawing',
  activeKinds: (_) => activeDrawingKinds,
  kindsInUnit: (unit) =>
      drawingMigrationSites(unit, null).map((site) => site.kind),
  initialSources: const ['lib', 'apps', 'packages/catch_ui'],
  recordActiveKinds: true,
  countedUnit: 'sites',
);
