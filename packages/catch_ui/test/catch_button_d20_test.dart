import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

// Blueprint D20: one shape, three heights, an unfilled outline and one state
// model for every labelled action.
void main() {
  Future<void> pump(
    WidgetTester tester,
    Widget button, {
    bool disableAnimations = false,
  }) {
    return tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: MediaQuery(
            data: MediaQueryData(disableAnimations: disableAnimations),
            child: Center(child: button),
          ),
        ),
      ),
    );
  }

  BoxDecoration buttonDecoration(WidgetTester tester) {
    final boxes = tester.widgetList<DecoratedBox>(
      find.descendant(
        of: find.byType(CatchButton),
        matching: find.byType(DecoratedBox),
      ),
    );
    return boxes.first.decoration as BoxDecoration;
  }

  Size buttonSize(WidgetTester tester) =>
      tester.getSize(find.byType(DecoratedBox).first);

  for (final mode in CatchButtonMode.values) {
    testWidgets('$mode draws 4px corners', (tester) async {
      await pump(
        tester,
        CatchButton(label: 'Continue', onPressed: () {}, mode: mode),
      );
      expect(
        buttonDecoration(tester).borderRadius,
        BorderRadius.circular(CatchButtonTokens.radius),
      );
    });
  }

  testWidgets('sizes draw the D20 heights', (tester) async {
    const expected = {
      CatchButtonSize.sm: CatchButtonTokens.mediumHeight,
      CatchButtonSize.md: CatchButtonTokens.largeHeight,
    };
    for (final entry in expected.entries) {
      await pump(
        tester,
        CatchButton(label: 'Continue', onPressed: () {}, size: entry.key),
      );
      expect(buttonSize(tester).height, entry.value, reason: '${entry.key}');
    }
  });

  testWidgets('secondary has no fill and the shared control outline', (
    tester,
  ) async {
    await pump(
      tester,
      CatchButton(
        label: 'Save draft',
        onPressed: () {},
        variant: CatchButtonVariant.secondary,
      ),
    );
    final decoration = buttonDecoration(tester);
    final tokens = CatchTokens.of(tester.element(find.byType(CatchButton)));
    expect(decoration.color, Colors.transparent);
    expect(
      (decoration.border! as Border).top.color,
      CatchBorder.resolve(tokens, CatchBorderRole.control).color,
    );
  });

  testWidgets('keyboard focus draws a ring outside without resizing', (
    tester,
  ) async {
    await pump(tester, CatchButton(label: 'Continue', onPressed: () {}));
    final restingSize = buttonSize(tester);
    FocusManager.instance.highlightStrategy =
        FocusHighlightStrategy.alwaysTraditional;
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pumpAndSettle();
    expect(buttonSize(tester), restingSize);
    final ring = find.byKey(const ValueKey('catch_button.focus_ring'));
    expect(ring, findsOneWidget);
    final decoration =
        tester.widget<DecoratedBox>(ring).decoration as BoxDecoration;
    expect(
      (decoration.border! as Border).top.width,
      CatchButtonTokens.focusRingWidth,
    );
    final buttonRect = tester.getRect(find.byType(DecoratedBox).first);
    expect(
      tester.getRect(ring),
      buttonRect.inflate(
        CatchButtonTokens.focusRingOffset + CatchButtonTokens.focusRingWidth,
      ),
    );
  });

  testWidgets('press does not scale under reduced motion', (tester) async {
    await pump(
      tester,
      CatchButton(label: 'Continue', onPressed: () {}),
      disableAnimations: true,
    );
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(CatchButton)),
    );
    await tester.pump();
    final scale = tester.widget<AnimatedScale>(find.byType(AnimatedScale));
    expect(scale.scale, 1);
    await gesture.up();
  });
}
