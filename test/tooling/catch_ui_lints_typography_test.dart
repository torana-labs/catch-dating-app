import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:catch_ui_lints/src/catch_ui_rules.dart';
import 'package:test/test.dart';

void main() {
  group('catch typography lint helpers', () {
    test('finds direct CatchFonts builder calls', () {
      final invocation = _methodInvocation('''
TextStyle buildStyle() {
  return CatchFonts.voice(fontSize: 24);
}
''');

      expect(isCatchUiDirectFontBuilderInvocation(invocation), isTrue);
    });

    test('does not flag semantic CatchTextStyles calls', () {
      final invocation = _methodInvocation('''
TextStyle buildStyle(BuildContext context) {
  return CatchTextStyles.titleL(context);
}
''');

      expect(isCatchUiDirectFontBuilderInvocation(invocation), isFalse);
    });

    test('finds literal and computed letter-spacing arguments', () {
      final arguments = _namedExpressions('''
TextStyle literal() => const TextStyle(letterSpacing: 0);
TextStyle computed(double size) => TextStyle(letterSpacing: size * .02);
''');

      expect(arguments, hasLength(2));
      expect(arguments.every(isCatchUiLetterSpacingArgument), isTrue);
    });
  });
}

MethodInvocation _methodInvocation(String source) {
  final unit = parseString(content: source).unit;
  final visitor = _MethodInvocationVisitor();
  unit.accept(visitor);
  final invocation = visitor.invocation;
  if (invocation == null) fail('Expected a method invocation.');
  return invocation;
}

List<NamedArgument> _namedExpressions(String source) {
  final unit = parseString(content: source).unit;
  final visitor = _NamedArgumentVisitor();
  unit.accept(visitor);
  return visitor.expressions;
}

class _MethodInvocationVisitor extends RecursiveAstVisitor<void> {
  MethodInvocation? invocation;

  @override
  void visitMethodInvocation(MethodInvocation node) {
    invocation ??= node;
    super.visitMethodInvocation(node);
  }
}

class _NamedArgumentVisitor extends RecursiveAstVisitor<void> {
  final expressions = <NamedArgument>[];

  @override
  void visitNamedArgument(NamedArgument node) {
    if (node.name.lexeme == 'letterSpacing') expressions.add(node);
    super.visitNamedArgument(node);
  }
}
