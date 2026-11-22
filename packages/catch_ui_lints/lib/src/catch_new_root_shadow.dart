part of 'catch_ui_rules.dart';

// The screen rules for one library, and the same rules run in shadow for
// catch_arch_stale_carry: as if a carried file had never been carried.

/// The layout visitor for the library at [path]. A carried file
/// ([carriedFrom], repository-relative) keeps the folder-shaped rules of the
/// legacy path it moved from; rules that name exact files read both paths, so
/// an entry the Phase 4 codemod rewrote and one it did not both still match.
_CatchUiLayoutVisitor _layoutVisitor(
  CatchUiLayoutRules rule,
  RuleContext context,
  String path, {
  required String? carriedFrom,
  required bool isZeroDrawingPath,
}) {
  final shape = carriedFrom == null ? path : '/$carriedFrom';
  return _CatchUiLayoutVisitor(
    rule,
    ruleContext: context,
    source: context.definingUnit.content,
    path: path,
    isEventDetailPath:
        rule._isEventDetailPath(path) || rule._isEventDetailPath(shape),
    isColorExemptPath: false,
    // Every screen rule holds under the D24 roots, whatever the folder is named.
    isFeaturePresentationPath:
        isZeroDrawingPath || rule._isFeaturePresentationPath(shape),
    isPresentationPath: isZeroDrawingPath || rule._isPresentationPath(shape),
    isSizingScannerPath: rule._isSizingScannerPath(path),
    isUiSystemScannerPath:
        isZeroDrawingPath || rule._isUiSystemScannerPath(shape),
    isZeroDrawingPath: isZeroDrawingPath,
    // The two screens that predate D24 are carried as their own path.
    keepsFirstScanDebt: carriedFrom != null && newRootPath(carriedFrom),
    allowRawControlConstructors:
        rule._isRawChromeExceptionPath(path) ||
        rule._isRawChromeExceptionPath(shape),
  );
}

final _shadowRule = CatchUiLayoutRules();

/// Whether the screen rules report anything in the current unit of [context]
/// when its library is held to the new-root rules instead of being carried.
/// Diagnostics go to a private listener, never to the analyzer.
bool newRootScreenRulesFire(RuleContext context, CompilationUnit unit) {
  final current = context.currentUnit;
  if (current == null) return false;
  final path = context.definingUnit.file.path.replaceAll(r'\', '/');
  if (!_shadowRule._isAppPath(path)) return false;
  final listener = BooleanDiagnosticListener();
  _shadowRule.reporter = DiagnosticReporter(
    listener,
    current.diagnosticReporter.source,
  );
  unit.accept(
    _NewRootShadowWalk(
      _layoutVisitor(
        _shadowRule,
        context,
        path,
        carriedFrom: null,
        isZeroDrawingPath: newRootSourcePath(path),
      ),
    ),
  );
  return listener.errorReported;
}

/// Visits every node in the order the analyzer does and hands the kinds
/// [CatchUiLayoutRules.registerNodeProcessors] registers to [visitor].
class _NewRootShadowWalk extends RecursiveAstVisitor<void> {
  _NewRootShadowWalk(this.visitor);

  final _CatchUiLayoutVisitor visitor;

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    visitor.visitInstanceCreationExpression(node);
    super.visitInstanceCreationExpression(node);
  }

  @override
  void visitNamedArgument(NamedArgument node) {
    visitor.visitNamedArgument(node);
    super.visitNamedArgument(node);
  }

  @override
  void visitBinaryExpression(BinaryExpression node) {
    visitor.visitBinaryExpression(node);
    super.visitBinaryExpression(node);
  }

  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    visitor.visitMethodDeclaration(node);
    super.visitMethodDeclaration(node);
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    visitor.visitFunctionDeclaration(node);
    super.visitFunctionDeclaration(node);
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    visitor.visitMethodInvocation(node);
    super.visitMethodInvocation(node);
  }

  @override
  void visitFunctionExpressionInvocation(FunctionExpressionInvocation node) {
    visitor.visitFunctionExpressionInvocation(node);
    super.visitFunctionExpressionInvocation(node);
  }

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    visitor.visitPrefixedIdentifier(node);
    super.visitPrefixedIdentifier(node);
  }

  @override
  void visitPropertyAccess(PropertyAccess node) {
    visitor.visitPropertyAccess(node);
    super.visitPropertyAccess(node);
  }

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    visitor.visitSimpleStringLiteral(node);
    super.visitSimpleStringLiteral(node);
  }

  @override
  void visitImportDirective(ImportDirective node) {
    visitor.visitImportDirective(node);
    super.visitImportDirective(node);
  }

  @override
  void visitCompilationUnit(CompilationUnit node) {
    visitor.visitCompilationUnit(node);
    super.visitCompilationUnit(node);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    visitor.visitVariableDeclaration(node);
    super.visitVariableDeclaration(node);
  }
}
