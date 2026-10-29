import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';

import 'migration_baseline.dart';

const textMigrationBaseline =
    'tool/architecture/catch_text_migration_baseline.json';
const _variantPath =
    'packages/catch_ui/lib/src/primitives/catch_text_variant.dart';
typedef TextMigrationSite = ({InstanceCreationExpression node, String role});
typedef TextMigrationCounts = Map<String, Map<String, int>>;

bool textMigrationScope(String relative) => migrationScope(relative);

/// Resolved role and canonical Material-slot calls CatchText can preserve.
List<TextMigrationSite> textMigrationSites(
  CompilationUnit unit,
  Set<String>? variants,
) {
  final bindings = _StyleBindings();
  unit.accept(bindings);
  final visitor = _TextCalls(variants, bindings.initializers);
  unit.accept(visitor);
  return visitor.sites;
}

class _StyleBindings extends RecursiveAstVisitor<void> {
  final initializers = <Object, Expression>{};

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    final element = node.declaredFragment?.element;
    if (element != null &&
        node.parent?.parent is VariableDeclarationStatement &&
        (node.parent! as VariableDeclarationList).isFinal &&
        node.initializer != null) {
      initializers[element] = node.initializer!;
    }
    super.visitVariableDeclaration(node);
  }
}

bool _styleMember(SimpleIdentifier name, String owner, String source) {
  final element = name.element?.baseElement;
  return element?.enclosingElement?.name == owner &&
      element?.library?.uri.toString() == source;
}

({Expression target, SimpleIdentifier name})? _styleProperty(Expression? node) {
  if (node is PropertyAccess && node.target != null) {
    return (target: node.target!, name: node.propertyName);
  }
  if (node is PrefixedIdentifier) {
    return (target: node.prefix, name: node.identifier);
  }
  return null;
}

// These slots are populated by CatchTextStyles.materialTextTheme. The
// titleSmall weight adopts existing supportingStrong (D21: 600 -> 500).
const _materialRoles = {
  'headlineSmall': 'titleL',
  'titleLarge': 'titleL',
  'titleMedium': 'sectionTitle',
  'titleSmall': 'supportingStrong',
  'bodyMedium': 'bodyM',
  'bodySmall': 'bodyS',
  'labelMedium': 'statusLabel',
};

class _TextCalls extends RecursiveAstVisitor<void> {
  _TextCalls(this.variants, this.bindings);
  final Set<String>? variants;
  final Map<Object, Expression> bindings;
  final sites = <TextMigrationSite>[];

  Expression? _binding(Expression? node, Set<Object> seen) {
    while (node is SimpleIdentifier && bindings.containsKey(node.element)) {
      if (!seen.add(node.element!)) return null;
      node = bindings[node.element];
    }
    return node;
  }

  String? _role(Expression? node) {
    final seen = <Object>{};
    node = _binding(node, seen);
    if (node is MethodInvocation &&
        _styleMember(
          node.methodName,
          'CatchTextStyles',
          'package:catch_ui/src/foundations/catch_text_styles.dart',
        )) {
      final contexts = node.argumentList.arguments
          .where((arg) => arg is! NamedExpression)
          .toList();
      if (contexts.length == 1 &&
          contexts.single.toSource() == 'context' &&
          node.argumentList.arguments.whereType<NamedExpression>().every(
            (arg) => arg.name.label.name == 'color',
          )) {
        return node.methodName.name;
      }
      return null;
    }
    // Only color overrides retain a canonical slot recipe. Public style/theme
    // parameters, mutable aliases and arbitrary copyWith changes stay out.
    if (node is MethodInvocation && node.methodName.name == 'copyWith') {
      if (node.argumentList.arguments.isEmpty ||
          node.argumentList.arguments.any(
            (arg) => arg is! NamedExpression || arg.name.label.name != 'color',
          )) {
        return null;
      }
      node = _binding(node.target, seen);
    }
    final slot = _styleProperty(node);
    if (slot == null ||
        !_materialRoles.containsKey(slot.name.name) ||
        !_styleMember(
          slot.name,
          'TextTheme',
          'package:flutter/src/material/text_theme.dart',
        )) {
      return null;
    }
    final theme = _styleProperty(_binding(slot.target, seen));
    if (theme == null ||
        theme.name.name != 'textTheme' ||
        !_styleMember(
          theme.name,
          'ThemeData',
          'package:flutter/src/material/theme_data.dart',
        )) {
      return null;
    }
    final lookup = theme.target;
    if (lookup is! MethodInvocation ||
        lookup.methodName.name != 'of' ||
        !_styleMember(
          lookup.methodName,
          'Theme',
          'package:flutter/src/material/theme.dart',
        ) ||
        lookup.argumentList.arguments.length != 1 ||
        lookup.argumentList.arguments.single.toSource() != 'context') {
      return null;
    }
    return _materialRoles[slot.name.name];
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    super.visitInstanceCreationExpression(node);
    final constructor = node.constructorName.element?.baseElement;
    if (constructor?.enclosingElement.name != 'Text' ||
        constructor?.library.uri.toString() !=
            'package:flutter/src/widgets/text.dart' ||
        node.constructorName.name != null) {
      return;
    }
    final named = {
      for (final arg
          in node.argumentList.arguments.whereType<NamedExpression>())
        arg.name.label.name: arg.expression,
    };
    final data = node.argumentList.arguments
        .where((arg) => arg is! NamedExpression)
        .toList();
    if (data.length != 1 ||
        named.keys.any(
          (name) => !{
            'key',
            'style',
            'maxLines',
            'overflow',
            'textAlign',
          }.contains(name),
        )) {
      return;
    }
    final role = _role(named['style']);
    if (role == null || (variants != null && !variants!.contains(role))) {
      return;
    }
    if (named.containsKey('maxLines')) {
      if (named['maxLines']?.staticType?.getDisplayString() != 'int' ||
          named['overflow']?.toSource() != 'TextOverflow.ellipsis') {
        return;
      }
    } else if (named.containsKey('overflow')) {
      return;
    }
    sites.add((node: node, role: role));
  }
}

Set<String> textMigrationVariants(String root) =>
    parseString(content: File('$root/$_variantPath').readAsStringSync())
        .unit
        .declarations
        .whereType<EnumDeclaration>()
        .singleWhere(
          (node) => node.namePart.typeName.lexeme == 'CatchTextVariant',
        )
        .body
        .constants
        .map((node) => node.name.lexeme)
        .toSet();

TextMigrationCounts parseTextMigrationBaseline(String source) =>
    parseMigrationBaseline(source, label: 'CatchText');

List<String> textMigrationGrowth(
  TextMigrationCounts actual,
  TextMigrationCounts budget,
) => migrationGrowth(actual, budget);

TextMigrationCounts textMigrationRenamedBudget(
  TextMigrationCounts budget,
  Map<String, String> renames,
) => migrationRenamedBudget(budget, renames);

TextMigrationCounts textMigrationPrunedCounts(
  TextMigrationCounts actual,
  TextMigrationCounts? recorded,
  Set<String> variants,
) => migrationPrunedCounts(actual, recorded, variants);

String? _repositoryRoot(String path) => migrationRepositoryRoot(path);

final _cache =
    <
      String,
      ({String stamp, Set<String> variants, TextMigrationCounts counts})
    >{};

/// Existing counts are silent; newly added replaceable calls name their role.
List<TextMigrationSite> newTextMigrationSites(
  CompilationUnit unit,
  String path,
) {
  final root = _repositoryRoot(path);
  if (root == null) return const [];
  final relative = path.substring(root.length + 1).replaceAll(r'\', '/');
  if (!textMigrationScope(relative)) return const [];
  final baseline = File('$root/$textMigrationBaseline');
  final variant = File('$root/$_variantPath');
  final stamp =
      '${baseline.statSync().modified}:${variant.statSync().modified}';
  var inputs = _cache[root];
  if (inputs == null || inputs.stamp != stamp) {
    inputs = (
      stamp: stamp,
      variants: textMigrationVariants(root),
      counts: parseTextMigrationBaseline(baseline.readAsStringSync()),
    );
    _cache[root] = inputs;
  }
  final sites = textMigrationSites(unit, inputs.variants);
  // Baselines count in source order, not recursive visitor completion order.
  sites.sort((left, right) => left.node.offset.compareTo(right.node.offset));
  final seen = <String, int>{};
  return [
    for (final site in sites)
      if ((seen.update(site.role, (value) => value + 1, ifAbsent: () => 1)) >
          (inputs.counts[relative]?[site.role] ?? 0))
        site,
  ];
}

// Internal mode of the existing lint-drift wrapper, not another check registry.
Future<void> main(List<String> args) => runMigrationBaseline(
  args,
  label: 'CatchText',
  baselinePath: textMigrationBaseline,
  optionName: 'text',
  activeKinds: textMigrationVariants,
  kindsInUnit: (unit) =>
      textMigrationSites(unit, null).map((site) => site.role),
  initialSources: const [
    'lib',
    'apps',
    'packages/catch_ui/lib/src/foundations/catch_text_styles.dart',
    'packages/catch_ui/lib/src/primitives/catch_text_variant.dart',
  ],
);
