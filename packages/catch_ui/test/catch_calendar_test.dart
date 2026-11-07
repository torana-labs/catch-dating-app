import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('picks a day, refuses one before min, and steps months', (
    tester,
  ) async {
    final picked = <DateTime>[];
    await tester.pumpWidget(
      MaterialApp(
        home: CatchRoot(
          child: CatchCalendar(
            label: 'Pick a date',
            month: DateTime(2026, 11),
            min: DateTime(2026, 11, 5),
            onChanged: picked.add,
          ),
        ),
      ),
    );
    expect(find.text('November 2026'), findsOneWidget);
    await tester.tap(find.text('3'));
    await tester.tap(find.text('12'));
    expect(picked, [DateTime(2026, 11, 12)]);
    await tester.tap(find.byTooltip('Next month'));
    await tester.pump();
    expect(find.text('December 2026'), findsOneWidget);
  });

  testWidgets('a contained sheet reads its kicker and title', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: CatchRoot(
          child: CatchSheet.contained(
            kicker: 'Checked in',
            title: 'Dev Patel',
            tone: CatchSheetTone.success,
            scrim: false,
            child: Text('2 places'),
          ),
        ),
      ),
    );
    expect(find.text('Checked in'), findsOneWidget);
    expect(find.text('Dev Patel'), findsOneWidget);
    expect(find.byType(CatchSheetDragIndicator), findsNothing);
  });
}
