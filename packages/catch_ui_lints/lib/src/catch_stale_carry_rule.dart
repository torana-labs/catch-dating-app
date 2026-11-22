import 'package:analyzer/analysis_rule/analysis_rule.dart';
import 'package:analyzer/analysis_rule/rule_context.dart';
import 'package:analyzer/analysis_rule/rule_visitor_registry.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/error/error.dart';

import 'architecture_findings.dart';
import 'catch_architecture_rules.dart';
import 'catch_ui_rules.dart';
import 'migration_scope.dart';

/// `catch_arch_stale_carry`: a file on `tool/architecture/carried_screens.json`
/// that would be clean under the new-root rules. The rule runs the screen and
/// architecture rules again in shadow, as if the library were not carried, and
/// reports each carried unit when no unit of the library would have a finding.
/// A library and its parts share one verdict, because the screen rules read
/// the library's own path. The Phase 4 codemod drops every entry this reports.
class CatchStaleCarryRule extends AnalysisRule {
  CatchStaleCarryRule()
    : super(
        name: ArchitectureCodes.staleCarry,
        description:
            'Reports a carried file that already meets the new-root rules.',
      );

  static const code = LintCode(
    ArchitectureCodes.staleCarry,
    'This file meets the new-root rules: remove its entry from '
    '$carriedScreensPath.',
    severity: DiagnosticSeverity.WARNING,
  );

  @override
  DiagnosticCode get diagnosticCode => code;

  @override
  bool get canUseParsedResult => false;

  @override
  void registerNodeProcessors(
    RuleVisitorRegistry registry,
    RuleContext context,
  ) {
    final path = context.definingUnit.file.path.replaceAll(r'\', '/');
    if (!carriedPath(path)) return;
    final visitor = _StaleCarryVisitor(context);
    registry.addCompilationUnit(this, visitor);
    registry.afterLibrary(this, visitor.report);
  }
}

class _StaleCarryVisitor extends SimpleAstVisitor<void> {
  _StaleCarryVisitor(this.context);

  final RuleContext context;
  final _carriedUnits = <RuleContextUnit>[];
  var _clean = true;

  @override
  void visitCompilationUnit(CompilationUnit node) {
    final unit = context.currentUnit;
    if (unit == null) return;
    final absolutePath = unit.file.path.replaceAll(r'\', '/');
    if (carriedPath(absolutePath)) _carriedUnits.add(unit);
    if (!_clean) return;
    if (newRootScreenRulesFire(context, node)) {
      _clean = false;
      return;
    }
    final relativePath = architectureRelativePath(absolutePath);
    if (relativePath == null) return;
    _clean = architectureFindings(
      absolutePath: absolutePath,
      relativePath: relativePath,
      source: unit.content,
      unit: node,
      carriedFrom: null,
    ).isEmpty;
  }

  void report() {
    if (!_clean) return;
    for (final unit in _carriedUnits) {
      final head = unit.unit.beginToken;
      unit.diagnosticReporter.atOffset(
        offset: head.offset,
        length: head.length,
        diagnosticCode: CatchStaleCarryRule.code,
      );
    }
  }
}
