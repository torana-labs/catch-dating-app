part of 'catch_ui_rules.dart';

// D24: what `apps/*/lib` and `lib/pages` reject beyond what the rest of `lib/`
// rejects. Each list holds only sites no other rule reports, so one mistake
// gives one diagnostic.

const _rawTextConstructors = <String>{'Text', 'RichText', 'SelectableText'};
const _themeOwners = <String>{'Theme', 'CupertinoTheme'};

// `ignore_for_file` and any Catch code count, not only the reasoned drawing
// ignore the rest of `lib/` may carry. Analyzer ignores are case-insensitive.
final _newRootDebtPattern = RegExp(
  r'(?:alpha|breakpoint|color-sweep|control|icon-size|motion|radius|shadow|sizing|spacing|surface|token|typography|ui-system):allow:|ignore(?:_for_file)?:[^\n]*\bcatch_[a-z0-9_]+',
  caseSensitive: false,
);

class _NewRootSites extends RecursiveAstVisitor<void> {
  final themeReads = <MethodInvocation>[];
  final rawText = <InstanceCreationExpression>[];
  final spacingLiterals = <Literal>[];

  @override
  void visitMethodInvocation(MethodInvocation node) {
    super.visitMethodInvocation(node);
    final element = node.methodName.element?.baseElement;
    final owner = element?.enclosingElement?.name;
    if (_themeOwners.contains(owner) && _isFlutterElement(element)) {
      themeReads.add(node);
    }
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    super.visitInstanceCreationExpression(node);
    final constructor = node.constructorName.element?.baseElement;
    if (!_isFlutterElement(constructor)) return;
    final typeName = _constructorTypeName(node);
    if (_rawTextConstructors.contains(typeName)) rawText.add(node);
    if (typeName != 'SizedBox' && !_isNewRootInsetConstructor(typeName)) return;
    // Every number counts here, however small: EdgeInsets.zero and
    // SizedBox.shrink say nothing instead.
    for (final argument in node.argumentList.arguments) {
      final isNamed = argument is NamedArgument;
      if (isNamed && const {'key', 'child'}.contains(argument.name.lexeme)) {
        continue;
      }
      _collectNumbers(argument.argumentExpression, keepZero: true);
    }
  }

  @override
  void visitNamedArgument(NamedArgument node) {
    super.visitNamedArgument(node);
    if (!_spacingNamedArguments.contains(node.name.lexeme)) return;
    final owner = node.parent?.parent;
    final ownsItsNumbers =
        owner is InstanceCreationExpression &&
        (_constructorTypeName(owner) == 'SizedBox' ||
            _isNewRootInsetConstructor(_constructorTypeName(owner)));
    if (!ownsItsNumbers) {
      _collectNumbers(node.argumentExpression, keepZero: false);
    }
  }

  void _collectNumbers(Expression expression, {required bool keepZero}) {
    final numbers = _NumberLiterals();
    expression.accept(numbers);
    spacingLiterals.addAll(
      keepZero ? numbers.found : numbers.found.where(_isNotZero),
    );
  }
}

class _NumberLiterals extends RecursiveAstVisitor<void> {
  final found = <Literal>[];

  @override
  void visitIntegerLiteral(IntegerLiteral node) => found.add(node);

  @override
  void visitDoubleLiteral(DoubleLiteral node) => found.add(node);
}

// EdgeInsetsGeometry.all(8) is the same number by a third name.
bool _isNewRootInsetConstructor(String typeName) =>
    typeName.startsWith('EdgeInsets');

bool _isNotZero(Literal literal) => switch (literal) {
  IntegerLiteral(:final value) => value != 0,
  DoubleLiteral(:final value) => value != 0,
  _ => true,
};

bool _isFlutterElement(Element? element) =>
    element?.library?.uri.toString().startsWith('package:flutter/') ?? false;
