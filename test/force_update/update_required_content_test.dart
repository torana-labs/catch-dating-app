import 'package:catch_dating_app/force_update/presentation/update_required_keys.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_screen.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('UpdateRequiredBody renders copy and delegates CTA', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: UpdateRequiredBody(onUpdateNow: () => taps++),
      ),
    );

    expect(find.text('Update required'), findsOneWidget);
    expect(find.textContaining('Please update to continue'), findsOneWidget);
    expect(find.byKey(UpdateRequiredKeys.updateNowButton), findsOneWidget);

    await tester.tap(find.byKey(UpdateRequiredKeys.updateNowButton));
    await tester.pump();

    expect(taps, 1);
  });
}
