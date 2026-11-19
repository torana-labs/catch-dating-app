import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The fill and outline of the one button under [tester].
BoxDecoration _frame(WidgetTester tester) => tester
    .widgetList<DecoratedBox>(
      find.descendant(
        of: find.byType(CatchButton),
        matching: find.byType(DecoratedBox),
      ),
    )
    .map((box) => box.decoration)
    .whereType<BoxDecoration>()
    .first;

Future<void> _pump(WidgetTester tester, Widget child) => tester.pumpWidget(
  MaterialApp(
    home: CatchRoot(
      child: Scaffold(body: Center(child: child)),
    ),
  ),
);

const _button = CatchButton(
  label: 'Message guests',
  variant: CatchButtonVariant.secondary,
  onPressed: _noop,
);

void _noop() {}

void main() {
  testWidgets('a secondary button on the page keeps its outline', (
    tester,
  ) async {
    await _pump(tester, _button);
    final frame = _frame(tester);
    expect(frame.color, Colors.transparent);
    expect((frame.border! as Border).top.width, greaterThan(0));
  });

  testWidgets('on a format-colour spotlight it is a white pill', (
    tester,
  ) async {
    await _pump(
      tester,
      const CatchSurface(
        block: CatchSurfaceBlock.spotlight,
        color: CatchSurfaceColor.run,
        child: _button,
      ),
    );
    final frame = _frame(tester);
    expect(frame.color, CatchTokens.editorialWhite);
    expect((frame.border! as Border).top.color, Colors.transparent);
  });
}
