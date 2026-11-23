import 'package:catch_test_support/goldens/golden_pump.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'fit content ignores a horizontal workspace before a vertical page',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Column(
            children: [
              SizedBox(
                height: 100,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(width: 1200, height: 100),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(child: SizedBox(height: 1800)),
              ),
            ],
          ),
        ),
      );
      final owner = goldenVerticalScrollables(find.byType(MaterialApp));
      expect(owner, findsOneWidget);
      expect(tester.state<ScrollableState>(owner).position.axis, Axis.vertical);
    },
  );
  testWidgets(
    'fixed device fixtures with only a horizontal pane strip are not page-fitted',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SizedBox(width: 1200, height: 800),
          ),
        ),
      );
      expect(goldenVerticalScrollables(find.byType(MaterialApp)), findsNothing);
    },
  );
}
