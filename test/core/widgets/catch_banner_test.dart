import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('inline Banner recipes retain intrinsic height and retry', (
    tester,
  ) async {
    var retries = 0;
    final recipes = <Widget>[
      const CatchBanner(title: 'A note', message: 'Booking updated.'),
      const CatchBanner.error(message: 'Could not save.'),
      CatchBanner.errorWithRetry(
        message: 'Could not save.',
        retryLabel: 'Retry',
        onRetry: () => retries++,
      ),
    ];
    for (final recipe in recipes) {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 340,
                child: IntrinsicHeight(child: recipe),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(tester.getSize(find.byWidget(recipe)).height, greaterThan(0));
    }
    await tester.tap(find.text('Retry'));
    expect(retries, 1);
  });
}
