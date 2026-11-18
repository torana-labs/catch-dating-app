import 'package:analyzer/analysis_rule/analysis_rule.dart';
import 'package:analyzer/analysis_rule/rule_context.dart';
import 'package:analyzer/analysis_rule/rule_visitor_registry.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/error/error.dart';

/// Resolved ownership checks: aliases, prefixed imports and constructor tear-offs
/// obey the same boundaries as direct calls. This ships with the UI package.
class CatchRowOwnershipRules extends MultiAnalysisRule {
  CatchRowOwnershipRules()
    : super(
        name: 'catch_row_ownership_rules',
        description:
            'Keeps row content, Field interaction and Section geometry separate.',
      );

  static const internalGeometry = LintCode(
    'catch_row_geometry_is_internal',
    'Row paint, viewport and form-adapter internals may only be used by their exact Catch UI owners.',
    severity: DiagnosticSeverity.WARNING,
  );
  static const sectionContent = LintCode(
    'catch_section_content_is_passive',
    'Structured Fields require rows, containedRows or sliverRows. Non-row content cannot contain ordinary Fields.',
    severity: DiagnosticSeverity.WARNING,
  );
  static const outerInset = LintCode(
    'catch_row_section_fills_viewport',
    'Remove the outer row-section inset. Section owns its content gutter; use containedRows for a rounded inset group.',
    severity: DiagnosticSeverity.WARNING,
  );

  static const interactionOwner = LintCode(
    'catch_field_owns_row_interaction',
    'Field owns row input and state paint. Remove the external row recognizer or background.',
    severity: DiagnosticSeverity.WARNING,
  );

  @override
  bool get canUseParsedResult => false;
  @override
  List<DiagnosticCode> get diagnosticCodes => const [
    internalGeometry,
    sectionContent,
    outerInset,
    interactionOwner,
  ];
  @override
  void registerNodeProcessors(
    RuleVisitorRegistry registry,
    RuleContext context,
  ) {
    final path = context.definingUnit.file.path.replaceAll(r'\', '/');
    if (!path.contains('/lib/') ||
        path.endsWith('.g.dart') ||
        path.endsWith('.freezed.dart')) {
      return;
    }
    final visitor = _RowVisitor(this, path, context.libraryElement?.uri);
    registry.addInstanceCreationExpression(this, visitor);
    registry.addConstructorReference(this, visitor);
  }
}

class _RowVisitor extends SimpleAstVisitor<void> {
  _RowVisitor(this.rule, this.path, this.library);
  final CatchRowOwnershipRules rule;
  final String path;
  final Uri? library;
  bool owns(Set<String> owners) =>
      library?.scheme == 'package' &&
      library?.path.startsWith('catch_ui/') == true &&
      owners.any(path.endsWith);
  bool isUi(ConstructorElement? element, String type) =>
      element?.enclosingElement.name == type &&
      element?.library.uri.toString().startsWith('package:catch_ui/') == true;

  void checkInternal(AstNode node, ConstructorElement? element) {
    final allowed = switch (element?.enclosingElement.name) {
      'CatchRowPressSurface' => const {
        '/lib/src/components/catch_button.dart',
        '/lib/src/components/catch_choice_button.dart',
        '/lib/src/components/catch_field_row.dart',
        '/lib/src/components/catch_index_row.dart',
      },
      'CatchRowViewport' => const {
        '/lib/src/patterns/catch_scaffold.dart',
        '/lib/src/patterns/catch_navigation_viewport.dart',
        '/lib/src/patterns/catch_section_list.dart',
      },
      'CatchRowSection' || 'CatchDependentRowSection' => const {
        '/lib/src/components/catch_section.dart',
      },
      'CatchRowViewportScope' => const {
        '/lib/src/patterns/catch_row_viewport.dart',
      },
      'CatchSection' when element?.name == 'formRows' => const {
        '/lib/src/patterns/catch_form_list.dart',
      },
      _ => null,
    };
    if (allowed != null &&
        element?.library.uri.toString().startsWith('package:catch_ui/') ==
            true &&
        !owns(allowed)) {
      rule.reportAtNode(
        node,
        diagnosticCode: CatchRowOwnershipRules.internalGeometry,
      );
    }
  }

  @override
  void visitConstructorReference(ConstructorReference node) =>
      checkInternal(node, node.constructorName.element);
  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final element = node.constructorName.element;
    checkInternal(node, element);
    if (isUi(element, 'CatchField')) {
      final structured = node.argumentList.arguments
          .whereType<NamedArgument>()
          .any((argument) => argument.name.lexeme == 'content');
      var hasBoundary = owns(const {'/lib/src/components/catch_field.dart'});
      for (
        var ancestor = node.parent;
        ancestor != null;
        ancestor = ancestor.parent
      ) {
        if (ancestor is InstanceCreationExpression &&
            isUi(ancestor.constructorName.element, 'CatchSection')) {
          hasBoundary = true;
          final section = ancestor.constructorName.element?.name;
          if (section == 'content' ||
              structured &&
                  !const {
                    'rows',
                    'containedRows',
                    'dependentFieldRows',
                    'sliverRows',
                  }.contains(section)) {
            rule.reportAtNode(
              node,
              diagnosticCode: CatchRowOwnershipRules.sectionContent,
            );
          }
          break;
        }
        if (library?.path.startsWith('catch_ui/') != true &&
            ancestor is InstanceCreationExpression) {
          final parent = ancestor.constructorName.element;
          final type = parent?.enclosingElement.name;
          final flutter =
              parent?.library.uri.toString().startsWith('package:flutter/') ==
              true;
          final statePaint =
              const {'ColoredBox', 'DecoratedBox'}.contains(type) ||
              type == 'Container' &&
                  ancestor.argumentList.arguments
                      .whereType<NamedArgument>()
                      .any(
                        (a) => const {
                          'color',
                          'decoration',
                          'foregroundDecoration',
                        }.contains(a.name.lexeme),
                      );
          if (flutter &&
              (statePaint ||
                  const {
                    'GestureDetector',
                    'InkWell',
                    'InkResponse',
                    'MouseRegion',
                    'Listener',
                    'Focus',
                  }.contains(type))) {
            rule.reportAtNode(
              node,
              diagnosticCode: CatchRowOwnershipRules.interactionOwner,
            );
            break;
          }
        }
        if (ancestor is FunctionDeclaration || ancestor is MethodDeclaration) {
          final returnType = switch (ancestor) {
            FunctionDeclaration() =>
              ancestor.declaredFragment?.element.returnType,
            MethodDeclaration() =>
              ancestor.declaredFragment?.element.returnType,
            _ => null,
          };
          // Typed factories retain the closed row contract at their call site.
          hasBoundary =
              hasBoundary ||
              returnType is InterfaceType &&
                  returnType.element.name == 'CatchField' &&
                  returnType.element.library.uri.toString().startsWith(
                    'package:catch_ui/',
                  );
          break;
        }
      }
      if (structured && !hasBoundary) {
        rule.reportAtNode(
          node,
          diagnosticCode: CatchRowOwnershipRules.sectionContent,
        );
      }
    }
    if (isUi(element, 'CatchSection') &&
        const {'rows', 'sliverRows'}.contains(element?.name)) {
      for (
        var ancestor = node.parent;
        ancestor != null;
        ancestor = ancestor.parent
      ) {
        if (ancestor is InstanceCreationExpression) {
          final parent = ancestor.constructorName.element;
          final type = parent?.enclosingElement.name;
          if (isUi(parent, 'CatchSection') ||
              isUi(parent, 'CatchSectionList') ||
              isUi(parent, 'CatchNavigationViewport')) {
            break;
          }
          if (const {'Padding', 'SliverPadding'}.contains(type) &&
              parent?.library.uri.toString().startsWith('package:flutter/') ==
                  true) {
            final padding = ancestor.argumentList.arguments
                .whereType<NamedArgument>()
                .where((argument) => argument.name.lexeme == 'padding')
                .firstOrNull
                ?.argumentExpression;
            if (padding != null && !_verticalOnly(padding)) {
              rule.reportAtNode(
                node,
                diagnosticCode: CatchRowOwnershipRules.outerInset,
              );
              break;
            }
          }
        }
        if (ancestor is FunctionDeclaration || ancestor is MethodDeclaration) {
          break;
        }
      }
    }
  }

  bool _verticalOnly(Expression padding) {
    if (padding.toSource().endsWith('EdgeInsets.zero')) return true;
    if (padding is! InstanceCreationExpression) return false;
    final element = padding.constructorName.element;
    if (!const {
      'EdgeInsets',
      'EdgeInsetsDirectional',
    }.contains(element?.enclosingElement.name)) {
      return false;
    }
    if (!const {'only', 'symmetric'}.contains(element?.name)) return false;
    return padding.argumentList.arguments.whereType<NamedArgument>().every(
      (a) => const {'top', 'bottom', 'vertical'}.contains(a.name.lexeme),
    );
  }
}
