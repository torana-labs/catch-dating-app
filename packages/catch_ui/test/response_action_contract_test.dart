import 'dart:ui';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final dark in [false, true]) {
    // D20 folds dangerSecondary into secondary: the confirm step carries the
    // destructive meaning, and hover-only colour never reaches touch screens.
    testWidgets('secondary danger renders as secondary, dark=$dark', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: dark ? CatchTheme.dark : CatchTheme.light,
          home: Scaffold(
            body: Column(
              children: [
                CatchButton(
                  label: 'Waitlist',
                  variant: CatchButtonVariant.secondary,
                  onPressed: () {},
                ),
                CatchButton(
                  label: 'Decline',
                  variant: CatchButtonVariant.dangerSecondary,
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ),
      );
      final label = find.text('Decline');
      final tokens = CatchTokens.of(tester.element(label));
      expect(tester.widget<Text>(label).style?.color, tokens.ink);
      BoxDecoration decoration(String title) =>
          tester
                  .widget<DecoratedBox>(
                    find
                        .descendant(
                          of: find.widgetWithText(CatchButton, title),
                          matching: find.byType(DecoratedBox),
                        )
                        .first,
                  )
                  .decoration
              as BoxDecoration;
      expect(decoration('Decline').border, decoration('Waitlist').border);
      expect(decoration('Decline').color, decoration('Waitlist').color);
      final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      await mouse.moveTo(tester.getCenter(label));
      await tester.pumpAndSettle();
      expect(tester.widget<Text>(label).style?.color, tokens.ink);
      await mouse.removePointer();
    });
  }
  testWidgets('page action has no floating perimeter', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: Builder(
            builder: (context) =>
                const TextButton(onPressed: null, child: Text('Save')),
          ),
          bottomNavigationBar: CatchDock.pageAction(
            label: 'Open person',
            onPressed: () {},
          ),
        ),
      ),
    );
    expect(
      find.byKey(const ValueKey('catch_bottom_action.floating_chrome')),
      findsNothing,
    );
    expect(find.text('Open person').hitTestable(), findsOneWidget);
  });
}
