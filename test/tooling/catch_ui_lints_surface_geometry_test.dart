import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:catch_ui_lints/src/catch_ui_surface_geometry.dart';
import 'package:test/test.dart';

void main() {
  group('square surface geometry', () {
    for (final radius in ['CatchRadius.none', '0', '0.0']) {
      test('recognizes explicit zero radius $radius', () {
        expect(isCatchUiSquareSurface(_surface('radius: $radius')), isTrue);
        expect(isCatchUiDisplaySurface(_surface('radius: $radius')), isFalse);
      });
    }
    test('retains the rounded default', () {
      expect(isCatchUiSquareSurface(_surface('')), isFalse);
      expect(isCatchUiDisplaySurface(_surface('')), isTrue);
    });
    test('retains positive and unknown radii', () {
      for (final radius in ['CatchRadius.sm', '1', 'resolvedRadius']) {
        expect(isCatchUiSquareSurface(_surface('radius: $radius')), isFalse);
      }
    });
    test('zero token inside a nonzero expression does not bypass the rule', () {
      expect(
        isCatchUiSquareSurface(
          _surface('radius: CatchRadius.none + CatchRadius.sm'),
        ),
        isFalse,
      );
    });
    test('a borderRadius override keeps the rounded classification', () {
      expect(
        isCatchUiSquareSurface(
          _surface(
            'radius: CatchRadius.none, borderRadius: BorderRadius.circular(CatchRadius.sm)',
          ),
        ),
        isFalse,
      );
    });
    test('an explicit null override leaves zero radius square', () {
      expect(
        isCatchUiSquareSurface(
          _surface('radius: CatchRadius.none, borderRadius: null'),
        ),
        isTrue,
      );
    });
  });
}

InstanceCreationExpression _surface(String arguments) {
  final unit = parseString(
    content: 'Widget build() => const CatchSurface($arguments);',
  ).unit;
  final visitor = _Instances();
  unit.accept(visitor);
  return visitor.nodes.first;
}

class _Instances extends RecursiveAstVisitor<void> {
  final nodes = <InstanceCreationExpression>[];
  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    nodes.add(node);
    super.visitInstanceCreationExpression(node);
  }
}
