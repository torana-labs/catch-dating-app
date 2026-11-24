import 'package:analyzer/analysis_rule/analysis_rule.dart';
import 'package:analyzer/analysis_rule/rule_context.dart';
import 'package:analyzer/analysis_rule/rule_visitor_registry.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/error/error.dart';

import 'architecture_context_map.dart';
import 'architecture_findings.dart';
import 'architecture_firestore_boundary.dart';
import 'architecture_provider_free.dart';
import 'migration_scope.dart' show carriedFrom;

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
      name: LintCode(
        name,
        '{0}',
        severity: ArchitectureCodes.errors.contains(name)
            ? DiagnosticSeverity.ERROR
            : DiagnosticSeverity.WARNING,
      ),
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

/// Every architecture finding in one unit, the refused exceptions included.
/// A carried file ([carriedFrom]) keeps its legacy path's layer rules and
/// exceptions; placement in the map and the Firestore boundary read its real
/// path. `catch_arch_stale_carry` calls this with no [carriedFrom].
List<ArchitectureFinding> architectureFindings({
  required String absolutePath,
  required String relativePath,
  required String source,
  required CompilationUnit unit,
  required String? carriedFrom,
}) {
  final map = contextMapFor(absolutePath);
  final findings = [
    ...dependencyDirectionFindings(
      relativePath: relativePath,
      source: source,
      unit: unit,
      carriedFrom: carriedFrom,
    ),
    ...providerFreeFindings(
      relativePath: relativePath,
      source: source,
      unit: unit,
      carriedFrom: carriedFrom,
    ),
    ...firestoreBoundaryFindings(relativePath: relativePath, unit: unit),
    if (map != null)
      ...contextMapFindings(relativePath: relativePath, unit: unit, map: map),
  ];
  return [
    ...findings,
    ...ignorePolicyFindings(
      relativePath: relativePath,
      source: source,
      unit: unit,
      findings: findings,
      carriedFrom: carriedFrom,
    ),
  ];
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
    for (final finding in architectureFindings(
      absolutePath: absolutePath,
      relativePath: relativePath,
      source: unit.content,
      unit: node,
      carriedFrom: carriedFrom(absolutePath),
    )) {
      rule.reportAtOffset(
        finding.offset,
        finding.length,
        diagnosticCode: CatchArchitectureRules.codes[finding.code]!,
        arguments: [finding.reason],
      );
    }
  }
}
