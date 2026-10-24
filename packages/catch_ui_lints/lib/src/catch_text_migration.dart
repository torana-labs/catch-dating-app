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

/// Only direct, resolved role calls whose arguments CatchText can preserve.
List<TextMigrationSite> textMigrationSites(
  CompilationUnit unit,
  Set<String>? variants,
) {
  final visitor = _TextCalls(variants);
  unit.accept(visitor);
  return visitor.sites;
}

class _TextCalls extends RecursiveAstVisitor<void> {
  _TextCalls(this.variants);
  final Set<String>? variants;
  final sites = <TextMigrationSite>[];

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
    final style = named['style'];
    if (style is! MethodInvocation) return;
    final method = style.methodName.element?.baseElement;
    final role = style.methodName.name;
    if (method?.enclosingElement?.name != 'CatchTextStyles' ||
        method?.library?.uri.toString() !=
            'package:catch_ui/src/foundations/catch_text_styles.dart' ||
        (variants != null && !variants!.contains(role))) {
      return;
    }
    final contexts = style.argumentList.arguments
        .where((arg) => arg is! NamedExpression)
        .toList();
    if (contexts.length != 1 ||
        contexts.single.toSource() != 'context' ||
        style.argumentList.arguments.whereType<NamedExpression>().any(
          (arg) => arg.name.label.name != 'color',
        )) {
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
