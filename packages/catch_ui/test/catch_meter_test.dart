import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('a meter reads its label and value aloud', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: CatchRoot(
          child: CatchMeter(value: 19, max: 26, label: 'Checked in'),
        ),
      ),
    );
    expect(
      tester.getSemantics(find.byType(CatchMeter)),
      matchesSemantics(label: 'Checked in', value: '19 / 26'),
    );
  });

  testWidgets('a stack meter reads each share as a percentage', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: CatchRoot(
          child: CatchMeter(
            value: 100,
            variant: CatchMeterVariant.stack,
            label: 'Where bookings came from',
            parts: [
              CatchMeterPart(label: 'Instagram bio', value: 3),
              CatchMeterPart(label: 'Direct', value: 1),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Instagram bio · 75%'), findsOneWidget);
    expect(find.text('Direct · 25%'), findsOneWidget);
  });
}
