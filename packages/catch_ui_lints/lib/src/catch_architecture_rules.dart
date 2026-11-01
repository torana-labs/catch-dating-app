import 'package:analyzer/analysis_rule/analysis_rule.dart';
import 'package:analyzer/analysis_rule/rule_context.dart';
import 'package:analyzer/analysis_rule/rule_visitor_registry.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/error/error.dart';

import 'architecture_context_map.dart';
import 'architecture_findings.dart';

/// Dependency direction, bounded-context placement and the provider-boundary
/// rules that go with them. An exception is a reasoned `// ignore:` next to the
/// code; see [ignorePolicyFindings] for the ones that are refused.
class CatchArchitectureRules extends MultiAnalysisRule {
  CatchArchitectureRules()
    : super(
        name: 'catch_architecture_rules',
        description:
            'Enforces dependency direction and bounded-context placement.',
      );

  static final Map<String, LintCode> codes = {
    for (final name in ArchitectureCodes.all)
      name: LintCode(name, '{0}', severity: DiagnosticSeverity.WARNING),
  };

  @override
  List<DiagnosticCode> get diagnosticCodes => codes.values.toList();

  @override
  void registerNodeProcessors(
    RuleVisitorRegistry registry,
    RuleContext context,
  ) {
    registry.addCompilationUnit(this, _ArchitectureVisitor(this, context));
  }
}

class _ArchitectureVisitor extends SimpleAstVisitor<void> {
  _ArchitectureVisitor(this.rule, this.context);

  final CatchArchitectureRules rule;
  final RuleContext context;

  @override
  void visitCompilationUnit(CompilationUnit node) {
    final unit = context.currentUnit;
    if (unit == null) return;
    final absolutePath = unit.file.path;
    final relativePath = architectureRelativePath(absolutePath);
    if (relativePath == null) return;
    final map = contextMapFor(absolutePath);
    final findings = [
      ...dependencyDirectionFindings(
        relativePath: relativePath,
        source: unit.content,
        unit: node,
      ),
      if (map != null)
        ...contextMapFindings(relativePath: relativePath, unit: node, map: map),
    ];
    for (final finding in [
      ...findings,
      ...ignorePolicyFindings(
        relativePath: relativePath,
        source: unit.content,
        unit: node,
        findings: findings,
      ),
    ]) {
      rule.reportAtOffset(
        finding.offset,
        finding.length,
        diagnosticCode: CatchArchitectureRules.codes[finding.code]!,
        arguments: [finding.reason],
      );
    }
  }
}
