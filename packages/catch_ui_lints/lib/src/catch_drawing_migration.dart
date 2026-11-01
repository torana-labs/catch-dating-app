import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';

import 'migration_scope.dart';

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

/// Every drawing site in scope; an existing one takes a reasoned `// ignore:`.
List<DrawingMigrationSite> newDrawingMigrationSites(
  CompilationUnit unit,
  String path, {
  Set<String>? activeKinds,
}) {
  final root = migrationRepositoryRoot(path);
  if (root == null) return const [];
  final relative = path.substring(root.length + 1).replaceAll(r'\', '/');
  if (!migrationScope(relative)) return const [];
  return drawingMigrationSites(unit, activeKinds ?? activeDrawingKinds)
    ..sort((a, b) => a.node.offset.compareTo(b.node.offset));
}

final _drawingIgnore = RegExp(
  r'//\s*ignore:[^\n]*catch_ui_lints/catch_no_raw_surface_shell(\s*--\s*\S)?',
);

/// A drawing exception needs its reason and a live site, so none outlasts the
/// code it excused. Returns the offending comments.
List<({int offset, int length})> invalidDrawingIgnores(
  CompilationUnit unit,
  String source,
  Iterable<AstNode> reportedSites,
) {
  final lines = {
    for (final site in reportedSites)
      unit.lineInfo.getLocation(site.offset).lineNumber,
  };
  return [
    for (final match in _drawingIgnore.allMatches(source))
      if (match[1] == null || !lines.contains(_targetLine(unit, source, match)))
        (offset: match.start, length: match.end - match.start),
  ];
}

int _targetLine(CompilationUnit unit, String source, Match match) {
  final location = unit.lineInfo.getLocation(match.start);
  final before = source.substring(
    match.start - (location.columnNumber - 1),
    match.start,
  );
  return location.lineNumber + (before.trim().isEmpty ? 1 : 0);
}
