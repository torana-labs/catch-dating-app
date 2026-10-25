import 'package:analyzer/dart/ast/ast.dart';

/// Whether the surface contributes a rounded display shell to its ancestors.
bool isCatchUiDisplaySurface(InstanceCreationExpression node) {
  if (isCatchUiSquareSurface(node)) return false;
  final constructorName = node.constructorName.name?.name;
  if (constructorName == 'tinted' || constructorName == 'message') return false;
  final tone = _arguments(node)['tone'];
  return tone == null ||
      !tone.toSource().contains('CatchSurfaceTone.transparent');
}

/// Explicit square fills do not create a second rounded rectangle.
/// A non-null borderRadius can override radius, so keep that case conservative.
bool isCatchUiSquareSurface(InstanceCreationExpression node) {
  final resolvedName = node.constructorName.element?.enclosingElement.name;
  final typeName =
      resolvedName ??
      node.constructorName.type.toSource().split('<').first.split('.').last;
  if (typeName != 'CatchSurface') return false;
  final arguments = _arguments(node);
  final borderRadius = arguments['borderRadius'];
  if (borderRadius != null && borderRadius is! NullLiteral) return false;
  return switch (arguments['radius']) {
    IntegerLiteral(:final value) => value == 0,
    DoubleLiteral(:final value) => value == 0,
    PrefixedIdentifier(:final prefix, :final identifier) =>
      prefix.name == 'CatchRadius' && identifier.name == 'none',
    _ => false,
  };
}

Map<String, Expression> _arguments(InstanceCreationExpression node) => {
  for (final argument
      in node.argumentList.arguments.whereType<NamedExpression>())
    argument.name.label.name: argument.expression,
};
