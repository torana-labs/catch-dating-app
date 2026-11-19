import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, {double scale = 1}) =>
    tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: CatchRoot(
            child: Center(
              child: SizedBox(
                width: 72,
                child: CatchButton(
                  label: 'WhatsApp',
                  variant: CatchButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () {},
                ),
              ),
            ),
          ),
        ),
      ),
    );

void main() {
  testWidgets('a narrow button keeps its label on one line', (tester) async {
    await _pump(tester);
    final label = tester.widget<Text>(find.text('WhatsApp'));
    expect(label.maxLines, 1);
    expect(
      find.ancestor(
        of: find.text('WhatsApp'),
        matching: find.byType(FittedBox),
      ),
      findsOneWidget,
    );
  });

  testWidgets('at large text the label may wrap', (tester) async {
    await _pump(tester, scale: 2);
    final label = tester.widget<Text>(find.text('WhatsApp'));
    expect(label.maxLines, isNull);
    expect(
      find.ancestor(
        of: find.text('WhatsApp'),
        matching: find.byType(FittedBox),
      ),
      findsNothing,
    );
  });
}
