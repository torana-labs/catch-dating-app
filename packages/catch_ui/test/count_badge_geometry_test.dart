import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final tight in [false, true]) {
    testWidgets('count changes preserve child constraints (tight: $tight)', (
      tester,
    ) async {
      const childKey = ValueKey('badge-child');
      for (final count in [0, 1, 123]) {
        final badge = CatchCountBadge(
          count: count,
          child: const SizedBox(
            key: childKey,
            width: 80,
            height: 40,
            child: ColoredBox(color: Colors.blue),
          ),
        );
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            home: Scaffold(
              body: Center(
                child: tight ? SizedBox(width: 320, child: badge) : badge,
              ),
            ),
          ),
        );
        await tester.pump();
        expect(
          tester.getSize(find.byKey(childKey)),
          Size(tight ? 320 : 80, 40),
          reason: 'The count must not change the constraints of its child.',
        );
        if (count > 0) {
          final childRect = tester.getRect(find.byKey(childKey));
          final marker = find.ancestor(
            of: find.text(catchCountLabel(count)),
            matching: find.byType(CatchLegacySurface),
          );
          expect(
            tester.getRect(marker).right,
            closeTo(childRect.right - 2, 0.01),
            reason: 'The badge must stay attached to the painted child edge.',
          );
        }
      }
    });
  }
}
